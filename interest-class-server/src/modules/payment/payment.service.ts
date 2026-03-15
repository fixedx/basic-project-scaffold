import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { OrderRepository } from '../order/repositories/order.repository';
import { UserRepository } from '../auth/repositories/user.repository';
import { BookingRepository } from '../booking/repositories/booking.repository';
import { WithdrawRecordRepository } from '../invite/repositories/withdraw-record.repository';
import { InviteService } from '../invite/invite.service';
import { NotificationService } from '@/modules/notification/notification.service';
import { PrepayDto, PrepayResult } from './dto/payment.dto';
import { MoneyMath } from '@/common/utils/money.util';

/**
 * 微信支付配置
 * 实际使用时需要从环境变量或配置服务获取
 */
interface WechatPayConfig {
  appId: string; // 小程序 AppID
  mchId: string; // 商户号
  apiKey: string; // API 密钥（V3）
  serialNo: string; // 证书序列号
  privateKey: string; // 商户私钥
  platformCert: string; // 微信平台证书（用于验证回调签名）
  notifyUrl: string; // 支付回调地址
  refundNotifyUrl: string; // 退款回调地址
  testMode: boolean; // 测试模式（金额固定为 0.1 元）
}

/**
 * 关闭微信支付订单返回结果
 */
export interface CloseOrderResult {
  success: boolean;
  code?: string; // ORDER_CLOSED, ORDER_PAID, NETWORK_ERROR 等
  message?: string;
  canCancelOrder: boolean; // 是否可以取消本地订单
}

/**
 * 微信退款返回结果
 */
export interface WechatRefundResult {
  success: boolean;
  refund_id?: string; // 微信退款单号
  status?: string; // 退款状态: SUCCESS, PROCESSING, ABNORMAL, CLOSED
  message?: string; // 错误信息
}

/**
 * 微信商家转账返回结果
 */
export interface WechatTransferResult {
  success: boolean;
  batch_id?: string; // 微信批次ID
  out_batch_no?: string; // 商户批次号
  status?: string; // ACCEPTED, PROCESSING, FINISHED, CLOSED
  message?: string; // 错误信息
}

/**
 * 从文件路径读取配置内容
 * @param filePath 文件路径（支持绝对路径和相对于项目根目录的路径）
 */
function readFileContent(filePath: string): string {
  if (!filePath) return '';
  
  try {
    // 处理相对路径（相对于项目根目录）
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);
    
    return fs.readFileSync(absolutePath, 'utf-8').trim();
  } catch (error) {
    console.warn(`读取配置文件失败: ${filePath}`, error.message);
    return '';
  }
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private config: WechatPayConfig;

  /**
   * 解析订单应使用的返现比例。
   * 优先使用下单快照；若历史脏数据缺少快照，则根据订单自身已锁定金额反推，
   * 严禁回查当前课程配置，避免机构事后修改影响历史订单。
   */
  private resolveOrderCashbackRatio(order: any, baseAmount: number): number {
    const snapshotRatio = Number(order?.course_snapshot?.cashback_ratio);
    if (Number.isFinite(snapshotRatio) && snapshotRatio > 0) {
      return snapshotRatio;
    }

    const lockedCashbackAmount = Number(order?.cashback_amount) || 0;
    const lockedBaseAmount = Number(baseAmount) || 0;
    if (lockedCashbackAmount > 0 && lockedBaseAmount > 0) {
      return Number(((lockedCashbackAmount / lockedBaseAmount) * 100).toFixed(2));
    }

    return 0;
  }

  constructor(
    private orderRepository: OrderRepository,
    private userRepository: UserRepository,
    private bookingRepository: BookingRepository,
    @Inject(forwardRef(() => WithdrawRecordRepository))
    private withdrawRecordRepository: WithdrawRecordRepository,
    @Inject(forwardRef(() => InviteService))
    private inviteService: InviteService,
    private notificationService: NotificationService,
    private dataSource: DataSource,
  ) {
    // 从环境变量加载配置
    // 私钥从文件路径读取，API v3 密钥直接从环境变量读取
    this.config = {
      appId: process.env.WECHAT_APP_ID || '',
      mchId: process.env.WECHAT_MCH_ID || '',
      apiKey: process.env.WECHAT_MCH_API_V3_KEY || '',
      serialNo: process.env.WECHAT_MCH_SERIAL_NO || '',
      privateKey: readFileContent(process.env.WECHAT_MCH_PRIVATE_KEY_PATH || ''),
      platformCert: readFileContent(process.env.WECHAT_PLATFORM_CERT_PATH || ''),
      notifyUrl:
        process.env.WECHAT_NOTIFY_URL ||
        `${process.env.DOMAIN || 'https://your-domain.com'}/api/payment/notify`,
      refundNotifyUrl:
        process.env.WECHAT_REFUND_NOTIFY_URL ||
        `${process.env.DOMAIN || 'https://your-domain.com'}/api/payment/refund-notify`,
      testMode: process.env.PAYMENT_TEST_MODE === 'true',
    };

    // 记录配置加载状态
    if (this.config.appId && this.config.mchId) {
      this.logger.log('微信支付配置已加载');
      this.logger.log(`AppID: ${this.config.appId}`);
      this.logger.log(`商户号: ${this.config.mchId}`);
      this.logger.log(`证书序列号: ${this.config.serialNo}`);
      this.logger.log(`私钥长度: ${this.config.privateKey.length}`);
      this.logger.log(`API密钥长度: ${this.config.apiKey.length}`);
      this.logger.log(`测试模式: ${this.config.testMode}`);
      if (!this.config.apiKey) {
        this.logger.warn('WECHAT_API_KEY_PATH 未配置或文件读取失败');
      }
      if (!this.config.privateKey) {
        this.logger.warn('WECHAT_PRIVATE_KEY_PATH 未配置或文件读取失败');
      }
    } else {
      this.logger.warn('微信支付未配置，将使用模拟数据');
    }
  }

  /**
   * 创建预支付订单
   * 返回前端调用 uni.requestPayment 所需的参数
   */
  async createPrepayOrder(dto: PrepayDto): Promise<PrepayResult> {
    // 查询订单
    const order = await this.orderRepository.findOneById(dto.order_id);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('订单状态不正确，无法支付');
    }

    // 检查是否过期
    if (order.expire_at && new Date() > new Date(order.expire_at)) {
      throw new BadRequestException('订单已过期，请重新下单');
    }

    // 获取用户的真实 openid
    let openid = dto.openid;
    if (!openid) {
      // 通过 user_id 查询用户获取 openid
      const user = await this.userRepository.findOneById(order.user_id);
      if (user && user.openid && !user.openid.startsWith('institution_phone_')) {
        // 只有真实的微信 openid 才能用于支付
        openid = user.openid;
      }
    }

    if (!openid) {
      throw new BadRequestException('无法获取用户 openid，请使用微信登录后再支付');
    }

    // 检查配置是否完整
    if (!this.config.appId || !this.config.mchId) {
      this.logger.warn('微信支付未配置，返回模拟数据');
      // 返回模拟数据用于开发测试
      return this.getMockPrepayResult(order);
    }

    try {
      // 调用微信支付统一下单接口
      const prepayId = await this.callWechatPrepay(order, openid);

      // 保存 prepay_id 到订单
      order.wechat_prepay_id = prepayId;
      await this.orderRepository.save(order);

      // 生成小程序支付参数
      return this.generatePayParams(prepayId, order);
    } catch (error) {
      this.logger.error('创建预支付订单失败', error);
      throw new BadRequestException('创建支付订单失败，请稍后重试');
    }
  }

  /**
   * 调用微信支付统一下单接口（JSAPI 下单）
   */
  private async callWechatPrepay(
    order: any,
    openid?: string,
  ): Promise<string> {
    const url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi';

    // 构建请求体
    const requestBody = {
      appid: this.config.appId,
      mchid: this.config.mchId,
      description: `${order.course_name} - ${order.sku_name}`,
      out_trade_no: order.order_no,
      time_expire: order.expire_at
        ? new Date(order.expire_at).toISOString()
        : undefined,
      notify_url: this.config.notifyUrl,
      amount: {
        // 测试模式下固定 0.1 元（10 分），否则使用线上支付金额
        // 线上支付金额 = 用户通过微信支付的部分，线下支付金额用户到店支付
        total: this.config.testMode 
          ? 10 
          : MoneyMath.yuan2fen(order.online_pay_amount || order.paid_amount),
        currency: 'CNY',
      },
      payer: {
        openid: openid || order.user_id, // 需要用户的 openid
      },
    };

    // 生成签名
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();
    const bodyStr = JSON.stringify(requestBody);
    
    // 调试日志
    this.logger.debug(`签名参数: method=POST, url=/v3/pay/transactions/jsapi, timestamp=${timestamp}, nonceStr=${nonceStr}`);
    this.logger.debug(`请求体长度: ${bodyStr.length}`);
    
    const signature = this.generateSignature(
      'POST',
      '/v3/pay/transactions/jsapi',
      timestamp,
      nonceStr,
      bodyStr,
    );
    
    this.logger.debug(`生成的签名: ${signature.substring(0, 50)}...`);

    // 发送请求
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${this.config.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.config.serialNo}"`,
      },
      body: bodyStr,
    });

    const result = await response.json();

    if (!response.ok) {
      this.logger.error('微信支付下单失败', result);
      throw new Error(result.message || '微信支付下单失败');
    }

    return result.prepay_id;
  }

  /**
   * 生成小程序支付参数
   */
  private generatePayParams(prepayId: string, order: any): PrepayResult {
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();
    const packageStr = `prepay_id=${prepayId}`;

    // 生成支付签名
    const message = `${this.config.appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
    const paySign = this.signWithPrivateKey(message);

    return {
      timeStamp,
      nonceStr,
      package: packageStr,
      signType: 'RSA',
      paySign,
      orderId: order.id,
      orderNo: order.order_no,
      amount: order.paid_amount,
    };
  }

  /**
   * 处理微信支付回调
   */
  async handleNotify(
    body: any,
    headers: Record<string, string>,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 测试模式：允许直接传递明文数据，跳过签名验证和解密
      let decryptedData: any;
      if (this.config.testMode && body.test_data) {
        decryptedData = body.test_data;
      } else {
        // 验证签名（使用微信平台证书验证）
        const isValid = this.verifyNotifySignature(body, headers);
        if (!isValid) {
          throw new BadRequestException('签名验证失败');
        }

        // 解密回调数据
        const resource = body.resource;
        if (!resource) {
          throw new BadRequestException('回调数据格式错误');
        }

        // 使用 API v3 密钥解密
        decryptedData = this.decryptResource(resource);
      }

      const orderNo = decryptedData.out_trade_no;
      const transactionId = decryptedData.transaction_id;

      // 查询订单
      const order = await this.orderRepository.findByOrderNo(orderNo);
      if (!order) {
        this.logger.warn(`回调订单不存在: ${orderNo}`);
        return { success: true, message: '订单不存在' };
      }

      // 幂等快速路径（防止重复执行副作用）
      if (order.status !== 'pending') {
        return { success: true, message: '订单已处理（幂等）' };
      }

      // 根据课程类型判断目标状态：体验课自动确认，正式课待确认
      const courseType = order.course_snapshot?.type || 'standard';
      const isTrialCourse = courseType === 'trial';
      const newStatus = isTrialCourse ? 'confirmed' : 'pending_confirm';

      // ⚠️ CAS 原子操作：WHERE status='pending' 确保并发回调只有一个成功写入
      // 防止微信重试回调或网络抖动导致的双重处理（订单确认、预约确认、邀请返现等副作用重复执行）
      const casResult = await this.dataSource.query(
        `UPDATE orders
         SET status = $1, transaction_no = $2, paid_at = NOW()
         WHERE order_no = $3 AND status = 'pending' AND is_delete = false
         RETURNING id`,
        [newStatus, transactionId, orderNo],
      );
      if (!casResult || casResult.length === 0) {
        this.logger.warn(`支付回调幂等保护触发，订单已被并发处理: ${orderNo}`);
        return { success: true, message: '订单已处理（幂等）' };
      }

      if (isTrialCourse) {
        // 体验课：DB 状态已由 CAS 置为 confirmed，以下均为副作用

        // 更新课程销量
        await this.orderRepository.manager.query(
          `UPDATE courses SET sales_count = sales_count + 1 WHERE id = $1 AND is_delete = false`,
          [order.course_id],
        );

        // 自动确认关联的预约
        if (order.booking_id) {
          const bookingIds = order.booking_id.split(',').filter((id: string) => id.trim());
          for (const bookingId of bookingIds) {
            await this.bookingRepository.updateStatus(bookingId, 'confirmed');
          }
        }

        // 触发邀请返现逻辑（如果订单使用了邀请码）
        if (order.invite_code) {
          try {
            const inviteOrderAmount = Number(order.original_price);
            const cashbackRatio = this.resolveOrderCashbackRatio(
              order,
              inviteOrderAmount,
            );
            if (cashbackRatio <= 0) {
              this.logger.warn(`体验课订单 ${orderNo} 未找到有效返现快照，跳过邀请订单创建`);
            } else {
              const totalLessons =
                Number(order.sku_snapshot?.class_count) ||
                1;

              await this.inviteService.createInviteOrder({
                invite_code: order.invite_code,
                invitee_id: order.user_id,
                order_id: order.id,
                course_id: order.course_id,
                institution_id: order.institution_id || '',
                order_amount: inviteOrderAmount,
                cashback_ratio: cashbackRatio,
                total_lessons: totalLessons,
                share_ratio: order.invite_share_ratio !== undefined
                  ? Number(order.invite_share_ratio)
                  : undefined,
              });
              this.logger.log(`体验课邀请返现已创建: 订单=${orderNo}`);
            }
          } catch (inviteError) {
            // 邀请返现失败不影响主流程
            this.logger.warn(`体验课邀请返现创建失败 (不影响订单): ${inviteError?.message}`);
          }
        }

        // 通知买家支付成功
        try {
          await this.notificationService.notifyPaySuccess({
            userId: order.user_id,
            orderNo,
            courseName: String(order.course_snapshot?.title || ''),
            paidAmount: Number(order.paid_amount),
          });
        } catch { /* 通知失败不影响主流程 */ }

        this.logger.log(`体验课订单自动确认: ${orderNo}`);
      } else {
        // 正式课：DB 状态已由 CAS 置为 pending_confirm，以下均为副作用

        // 通知买家支付成功
        try {
          await this.notificationService.notifyPaySuccess({
            userId: order.user_id,
            orderNo,
            courseName: String(order.course_snapshot?.title || ''),
            paidAmount: Number(order.paid_amount),
          });
        } catch { /* 通知失败不影响主流程 */ }

        this.logger.log(`正式课订单待确认: ${orderNo}`);
      }

      return { success: true, message: '处理成功' };
    } catch (error) {
      this.logger.error('处理支付回调失败', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 生成随机字符串
   */
  private generateNonceStr(length = 32): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成请求签名
   */
  private generateSignature(
    method: string,
    url: string,
    timestamp: string,
    nonceStr: string,
    body: string,
  ): string {
    const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
    return this.signWithPrivateKey(message);
  }

  /**
   * 使用私钥签名
   */
  private signWithPrivateKey(message: string): string {
    if (!this.config.privateKey) {
      return 'mock_signature';
    }

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    return sign.sign(this.config.privateKey, 'base64');
  }

  /**
   * 验证微信回调通知签名
   * 使用微信平台证书公钥验证签名，防止伪造回调
   */
  private verifyNotifySignature(
    body: any,
    headers: Record<string, string>,
  ): boolean {
    // 如果未配置平台证书，仅开发测试模式允许跳过验证
    if (!this.config.platformCert) {
      if (this.config.testMode) {
        this.logger.warn('未配置微信平台证书，跳过签名验证（仅开发测试模式允许）');
        return true;
      }
      this.logger.error('生产环境未配置微信平台证书（WECHAT_PLATFORM_CERT_PATH），签名验证失败');
      return false;
    }

    try {
      const timestamp = headers['wechatpay-timestamp'];
      const nonce = headers['wechatpay-nonce'];
      const signature = headers['wechatpay-signature'];

      if (!timestamp || !nonce || !signature) {
        this.logger.warn('回调缺少必要的签名头信息');
        return false;
      }

      // 构造验签消息：${timestamp}\n${nonce}\n${body}\n
      const bodyStr =
        typeof body === 'string' ? body : JSON.stringify(body);
      const message = `${timestamp}\n${nonce}\n${bodyStr}\n`;

      // 使用平台证书公钥验证签名
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(message);
      const signatureBuffer = Buffer.from(signature, 'base64');
      return verify.verify(this.config.platformCert, signatureBuffer);
    } catch (error) {
      this.logger.error('签名验证异常', error);
      return false;
    }
  }

  /**
   * 解密回调数据
   */
  private decryptResource(resource: any): any {
    const { ciphertext, nonce, associated_data } = resource;

    if (!this.config.apiKey) {
      // 开发环境模拟
      return {};
    }

    // 使用 AEAD_AES_256_GCM 解密
    const key = Buffer.from(this.config.apiKey, 'utf8');
    const iv = Buffer.from(nonce, 'utf8');
    const ciphertextBuffer = Buffer.from(ciphertext, 'base64');
    const authTag = ciphertextBuffer.slice(-16);
    const data = ciphertextBuffer.slice(0, -16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    if (associated_data) {
      decipher.setAAD(Buffer.from(associated_data, 'utf8'));
    }

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  }

  /**
   * 获取模拟的预支付参数（开发测试用）
   */
  private getMockPrepayResult(order: any): PrepayResult {
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();

    return {
      timeStamp,
      nonceStr,
      package: 'prepay_id=mock_prepay_id_' + order.order_no,
      signType: 'RSA',
      paySign: 'mock_pay_sign',
      orderId: order.id,
      orderNo: order.order_no,
      amount: order.paid_amount,
    };
  }

  /**
   * 生成退款单号
   */
  private generateRefundNo(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `REF${timestamp}${random}`;
  }

  /**
   * 申请微信退款
   * 调用微信支付 V3 退款接口
   * @param order 订单信息
   * @param onlineRefundAmount 线上退款金额（元）
   * @returns WechatRefundResult
   */
  async createRefund(
    order: any,
    onlineRefundAmount: number,
    outRefundNo?: string,
  ): Promise<WechatRefundResult> {
    // 检查配置是否完整
    if (!this.config.appId || !this.config.mchId) {
      this.logger.warn('微信支付未配置，模拟退款成功');
      return {
        success: true,
        refund_id: 'mock_refund_' + Date.now(),
        status: 'SUCCESS',
      };
    }

    // 测试模式下模拟退款成功（避免用测试数据调用真实微信API）
    if (this.config.testMode) {
      this.logger.log(`[测试模式] 模拟退款成功: 订单=${order.order_no}, 金额=${onlineRefundAmount}`);
      return {
        success: true,
        refund_id: 'test_refund_' + Date.now(),
        status: 'SUCCESS',
      };
    }

    // 线上退款金额为 0 或无微信交易号，无需调用微信退款
    if (onlineRefundAmount <= 0 || !order.transaction_no) {
      this.logger.log(`订单 ${order.order_no} 无需微信退款（线上退款金额=${onlineRefundAmount}，交易号=${order.transaction_no || '无'}）`);
      return {
        success: true,
        refund_id: '',
        status: 'SUCCESS',
      };
    }

    const url = 'https://api.mch.weixin.qq.com/v3/refund/domestic/refunds';
    // ⚠️ 使用外部传入的持久化退款单号（order.refund_no）作为幂等键，禁止每次重试重新生成
    // 避免网络抖动/超时导致同一退款业务向微信发起多笔不同 out_refund_no 请求。
    const refundNo = outRefundNo || order.refund_no || this.generateRefundNo();

    // 原订单支付金额（分）
    // 测试模式下原订单支付了 10 分（0.1元），退款也只退 10 分
    const originalPayAmountFen = this.config.testMode
      ? 10
      : MoneyMath.yuan2fen(Number(order.online_pay_amount) || 0);

    // 退款金额（分）
    // 测试模式下固定退 10 分（0.1元），正常模式按实际计算
    const refundAmountFen = this.config.testMode
      ? 10
      : MoneyMath.yuan2fen(onlineRefundAmount);

    // 构建请求体
    const requestBody: Record<string, any> = {
      transaction_id: order.transaction_no, // 微信支付交易号
      out_refund_no: refundNo, // 商户退款单号
      reason: order.refund_reason || '用户申请退款',
      notify_url: this.config.refundNotifyUrl,
      amount: {
        refund: refundAmountFen,
        total: originalPayAmountFen,
        currency: 'CNY',
      },
    };

    this.logger.log(
      `发起微信退款: 订单号=${order.order_no}, 退款单号=${refundNo}, ` +
      `原支付金额=${originalPayAmountFen}分, 退款金额=${refundAmountFen}分, ` +
      `测试模式=${this.config.testMode}`,
    );

    try {
      // 生成签名
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = this.generateNonceStr();
      const bodyStr = JSON.stringify(requestBody);

      const signature = this.generateSignature(
        'POST',
        '/v3/refund/domestic/refunds',
        timestamp,
        nonceStr,
        bodyStr,
      );

      // 发送请求
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${this.config.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.config.serialNo}"`,
        },
        body: bodyStr,
      });

      const result = await response.json();

      if (!response.ok) {
        this.logger.error(`微信退款失败: ${JSON.stringify(result)}`);
        return {
          success: false,
          message: result.message || '微信退款请求失败',
        };
      }

      this.logger.log(
        `微信退款请求成功: 退款单号=${refundNo}, 微信退款ID=${result.refund_id}, 状态=${result.status}`,
      );

      return {
        success: true,
        refund_id: result.refund_id,
        status: result.status, // SUCCESS, PROCESSING, ABNORMAL, CLOSED
      };
    } catch (error) {
      this.logger.error(`调用微信退款接口异常: ${order.order_no}`, error);
      return {
        success: false,
        message: '微信退款接口调用异常，请稍后重试',
      };
    }
  }

  /**
   * 处理微信退款回调
   */
  async handleRefundNotify(
    body: any,
    headers: Record<string, string>,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 测试模式：允许直接传递明文数据，跳过解密
      let decryptedData: any;
      if (this.config.testMode && body.test_data) {
        decryptedData = body.test_data;
      } else {
        // ⚠️ 验证微信平台签名（防止伪造退款回调）
        const isValid = this.verifyNotifySignature(body, headers);
        if (!isValid) {
          throw new BadRequestException('退款回调签名验证失败');
        }
        // 解密回调数据
        const resource = body.resource;
        if (!resource) {
          throw new BadRequestException('回调数据格式错误');
        }
        decryptedData = this.decryptResource(resource);
      }

      const orderNo = decryptedData.out_trade_no;
      const refundNo = decryptedData.out_refund_no;
      const refundStatus = decryptedData.refund_status; // SUCCESS, ABNORMAL, CLOSED

      this.logger.log(
        `收到退款回调: 订单号=${orderNo}, 退款单号=${refundNo}, 状态=${refundStatus}`,
      );

      // 查询订单
      const order = await this.orderRepository.findByOrderNo(orderNo);
      if (!order) {
        this.logger.warn(`退款回调订单不存在: ${orderNo}`);
        return { success: true, message: '订单不存在' };
      }

      // 根据退款状态更新订单
      if (refundStatus === 'SUCCESS') {
        order.refund_status = 'success';
        // ⚠️ 幂等保护：只有当订单当前在 refunding/refund_pending 时才触发状态迁移和副作用
        // 若已经是 refunded（processRefund 同步路径已处理），则跳过所有副作用，避免双重执行
        const wasTransitioned = ['refunding', 'refund_pending'].includes(order.status);
        if (wasTransitioned) {
          order.status = 'refunded';
          order.refunded_at = new Date();
        }
        await this.orderRepository.save(order);

        // 异步退款回调成功：仅在「本回调触发状态迁移」时才执行副作用
        // 若 processRefund 同步路径已将状态置为 refunded，则跳过，防止余额/库存/预约重复操作
        if (wasTransitioned) {
          // 1. 如果订单使用了余额支付，归还余额
          if (Number(order.use_balance_amount) > 0) {
            try {
              await this.dataSource.query(
                `UPDATE user_balances
                 SET balance = balance + $1
                 WHERE user_id = $2 AND is_delete = false`,
                [Number(order.use_balance_amount), order.user_id],
              );
              this.logger.log(
                `退款回调：归还余额 ${order.use_balance_amount} 元 给用户 ${order.user_id}`,
              );
            } catch (e) {
              this.logger.error(`退款回调归还余额失败: ${e.message}`);
            }
          }

          // 2. 取消关联预约
          try {
            if (order.booking_id) {
              const bookingIds = order.booking_id.split(',').map((id: string) => id.trim()).filter(Boolean);
              if (bookingIds.length > 0) {
                await this.dataSource.query(
                  `UPDATE bookings
                   SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = '退款成功'
                   WHERE id = ANY($1::text[]) AND status IN ('pending','confirmed','pending_change') AND is_delete = false`,
                  [bookingIds],
                );
                // 归还排课预订人数
                for (const bid of bookingIds) {
                  await this.dataSource.query(
                    `UPDATE schedules
                     SET booked_count = GREATEST(booked_count - 1, 0)
                     WHERE id = (
                       SELECT schedule_id FROM bookings WHERE id = $1 AND is_delete = false LIMIT 1
                     )`,
                    [bid],
                  );
                }
              }
            }
          } catch (e) {
            this.logger.error(`退款回调取消预约失败: ${e.message}`);
          }

          // 3. 归还 SKU 库存
          try {
            if (order.sku_id) {
              await this.dataSource.query(
                `UPDATE course_skus SET stock = stock + 1 WHERE id = $1 AND stock >= 0 AND is_delete = false`,
                [order.sku_id],
              );
            }
          } catch (e) {
            this.logger.error(`退款回调归还库存失败: ${e.message}`);
          }

          // 4. 取消邀请订单（撤回返现）
          try {
            await this.inviteService.cancelInviteOrder(order.id);
          } catch (e) {
            this.logger.warn(`退款回调取消邀请订单失败: ${e.message}`);
          }
        }

        this.logger.log(`退款成功: 订单号=${orderNo}`);
      } else if (refundStatus === 'ABNORMAL') {
        order.refund_status = 'abnormal';
        // 退款异常，回退订单状态为 refunding，等待人工处理
        if (order.status === 'refunded') {
          order.status = 'refunding';
          order.refunded_at = undefined;
        }
        this.logger.warn(`退款异常: 订单号=${orderNo}, 已回退状态为 refunding，需要人工处理`);
        await this.orderRepository.save(order);
      } else if (refundStatus === 'CLOSED') {
        order.refund_status = 'closed';
        // 退款关闭，回退订单状态为 refunding，需要重新处理
        if (order.status === 'refunded') {
          order.status = 'refunding';
          order.refunded_at = undefined;
        }
        this.logger.warn(`退款关闭: 订单号=${orderNo}, 已回退状态为 refunding`);
        await this.orderRepository.save(order);
      }

      return { success: true, message: '处理成功' };
    } catch (error) {
      this.logger.error('处理退款回调失败', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 关闭微信支付订单
   * 当用户取消订单或订单超时时调用
   * @param orderNo 商户订单号
   * @returns CloseOrderResult 包含是否成功和是否可以取消本地订单
   */
  async closeWechatOrder(orderNo: string): Promise<CloseOrderResult> {
    // 检查配置是否完整
    if (!this.config.appId || !this.config.mchId) {
      this.logger.warn('微信支付未配置，跳过关单操作');
      return { success: true, canCancelOrder: true };
    }

    const url = `https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/${orderNo}/close`;

    // 构建请求体
    const requestBody = {
      mchid: this.config.mchId,
    };

    // 生成签名
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();
    const bodyStr = JSON.stringify(requestBody);

    const signature = this.generateSignature(
      'POST',
      `/v3/pay/transactions/out-trade-no/${orderNo}/close`,
      timestamp,
      nonceStr,
      bodyStr,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${this.config.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.config.serialNo}"`,
        },
        body: bodyStr,
      });

      // 关单成功返回 204 No Content
      if (response.status === 204 || response.ok) {
        this.logger.log(`微信订单关闭成功: ${orderNo}`);
        return { success: true, canCancelOrder: true };
      }

      const result = await response.json();
      
      // ORDER_CLOSED: 订单已关闭，可以取消本地订单
      if (result.code === 'ORDER_CLOSED') {
        this.logger.log(`微信订单已关闭: ${orderNo}`);
        return { success: true, code: 'ORDER_CLOSED', canCancelOrder: true };
      }
      
      // ORDER_PAID: 订单已支付，不能取消本地订单！
      if (result.code === 'ORDER_PAID') {
        this.logger.warn(`微信订单已支付，不能取消: ${orderNo}`);
        return { 
          success: false, 
          code: 'ORDER_PAID', 
          message: '订单已支付，无法取消',
          canCancelOrder: false 
        };
      }

      this.logger.error(`微信订单关闭失败: ${orderNo}`, result);
      return { 
        success: false, 
        code: result.code, 
        message: result.message,
        canCancelOrder: false 
      };
    } catch (error) {
      this.logger.error(`调用微信关单接口异常: ${orderNo}`, error);
      return { 
        success: false, 
        code: 'NETWORK_ERROR', 
        message: '网络异常，请稍后重试',
        canCancelOrder: false 
      };
    }
  }

  /**
   * 根据订单ID关闭微信支付
   * @param orderId 订单ID
   * @returns CloseOrderResult 包含是否成功和是否可以取消本地订单
   */
  async closeOrderById(orderId: string): Promise<{ success: boolean; canCancelOrder: boolean; message?: string }> {
    const order = await this.orderRepository.findOneById(orderId);
    if (!order) {
      this.logger.warn(`关单失败，订单不存在: ${orderId}`);
      return { success: false, canCancelOrder: false, message: '订单不存在' };
    }

    // 如果没有创建过微信支付订单，无需关闭，可以直接取消
    if (!order.wechat_prepay_id) {
      this.logger.log(`订单未创建微信支付，无需关单: ${orderId}`);
      return { success: true, canCancelOrder: true };
    }

    return this.closeWechatOrder(order.order_no);
  }

  /**
   * 查询订单支付状态
   */
  async queryPaymentStatus(orderId: string): Promise<{
    status: string;
    paid: boolean;
    expireAt?: string;
    remainingSeconds?: number;
  }> {
    const order = await this.orderRepository.findOneById(orderId);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    let remainingSeconds: number | undefined;
    if (order.expire_at && order.status === 'pending') {
      const expireTime = new Date(order.expire_at).getTime();
      const now = Date.now();
      remainingSeconds = Math.max(0, Math.floor((expireTime - now) / 1000));
    }

    return {
      status: order.status,
      // 判断是否已支付：pending_confirm 或 confirmed 或更高状态都算已支付
      paid: ['pending_confirm', 'confirmed', 'refund_pending', 'refunding', 'refund_rejected', 'refunded', 'completed'].includes(order.status),
      expireAt: order.expire_at?.toISOString(),
      remainingSeconds,
    };
  }

  /**
   * 生成商户批次号（提现转账用）
   */
  private generateBatchNo(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `WD${timestamp}${random}`;
  }

  /**
   * 商家转账到零钱（提现）
   * 调用微信支付 V3 商家转账接口
   * @param withdrawId 提现记录ID（用作明细单号）
   * @param openid 用户微信 openid
   * @param amount 转账金额（元）
   * @param remark 转账备注
   * @returns WechatTransferResult
   */
  async createTransfer(
    withdrawId: string,
    openid: string,
    amount: number,
    remark: string = '提现到零钱',
    options?: { outBatchNo?: string; outDetailNo?: string },
  ): Promise<WechatTransferResult> {
    // 检查配置是否完整
    if (!this.config.appId || !this.config.mchId) {
      this.logger.warn('微信支付未配置，模拟转账成功');
      const mockOutBatchNo = options?.outBatchNo || this.generateBatchNo();
      return {
        success: true,
        batch_id: 'mock_batch_' + Date.now(),
        out_batch_no: mockOutBatchNo,
        status: 'ACCEPTED',
      };
    }

    if (!openid || openid.startsWith('institution_phone_')) {
      this.logger.error(`无效的 openid: ${openid}，无法转账`);
      return {
        success: false,
        message: '用户未绑定微信，无法转账到零钱',
      };
    }

    const url = 'https://api.mch.weixin.qq.com/v3/transfer/batches';
    // ⚠️ 使用外部持久化幂等键，重试必须复用同一批次号/明细号，禁止每次重新生成
    const outBatchNo = options?.outBatchNo || this.generateBatchNo();
    const outDetailNo = options?.outDetailNo || `D${withdrawId}`;

    // 转账金额（分）
    // 测试模式下固定 10 分（0.1元），正常模式按实际金额
    const transferAmountFen = this.config.testMode
      ? 10
      : Math.round(amount * 100);

    // 构建请求体
    const requestBody = {
      appid: this.config.appId,
      out_batch_no: outBatchNo,
      batch_name: '用户提现',
      batch_remark: remark,
      total_amount: transferAmountFen,
      total_num: 1,
      transfer_detail_list: [
        {
          out_detail_no: outDetailNo,
          transfer_amount: transferAmountFen,
          transfer_remark: remark,
          openid: openid,
        },
      ],
    };

    this.logger.log(
      `发起微信转账: 批次号=${outBatchNo}, 明细号=${outDetailNo}, ` +
      `openid=${openid}, 金额=${transferAmountFen}分, ` +
      `测试模式=${this.config.testMode}`,
    );

    try {
      // 生成签名
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = this.generateNonceStr();
      const bodyStr = JSON.stringify(requestBody);

      const signature = this.generateSignature(
        'POST',
        '/v3/transfer/batches',
        timestamp,
        nonceStr,
        bodyStr,
      );

      // 发送请求
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${this.config.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.config.serialNo}"`,
        },
        body: bodyStr,
      });

      const result = await response.json();

      if (!response.ok) {
        this.logger.error(`微信转账失败: ${JSON.stringify(result)}`);
        return {
          success: false,
          message: result.message || '微信转账请求失败',
        };
      }

      this.logger.log(
        `微信转账请求成功: 批次号=${outBatchNo}, 微信批次ID=${result.batch_id}, 状态=${result.batch_status}`,
      );

      return {
        success: true,
        batch_id: result.batch_id,
        out_batch_no: outBatchNo,
        status: result.batch_status, // ACCEPTED, PROCESSING, FINISHED, CLOSED
      };
    } catch (error) {
      this.logger.error(`调用微信转账接口异常: ${outBatchNo}`, error);
      return {
        success: false,
        message: '微信转账接口调用异常，请稍后重试',
      };
    }
  }

  /**
   * 处理微信商家转账回调（提现到账通知）
   * 注意：微信商家转账V3的回调通知需要商户在开通转账产品时配置回调地址
   * 此方法处理转账结果通知，更新提现记录状态
   */
  async handleTransferNotify(
    body: any,
    headers: Record<string, string>,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 测试模式：允许直接传递明文数据
      let decryptedData: any;
      if (this.config.testMode && body.test_data) {
        decryptedData = body.test_data;
      } else {
        // ⚠️ 验证微信平台签名（防止伪造转账回调）
        const isValid = this.verifyNotifySignature(body, headers);
        if (!isValid) {
          throw new BadRequestException('转账回调签名验证失败');
        }

        const resource = body.resource;
        if (!resource) {
          throw new BadRequestException('回调数据格式错误');
        }
        decryptedData = this.decryptResource(resource);
      }
      const outBatchNo = decryptedData.out_batch_no;
      const batchStatus = decryptedData.batch_status; // FINISHED, CLOSED

      this.logger.log(
        `收到转账回调: 批次号=${outBatchNo}, 状态=${batchStatus}`,
      );

      // 解析转账明细，提取提现记录ID并更新状态
      const detailList = decryptedData.transfer_detail_list || [];
      for (const detail of detailList) {
        const outDetailNo: string = detail.out_detail_no || '';
        const detailStatus: string = detail.detail_status || '';

        // out_detail_no 格式为 D{withdrawId}
        if (!outDetailNo.startsWith('D')) {
          this.logger.warn(`转账明细号格式异常: ${outDetailNo}`);
          continue;
        }

        const withdrawId = outDetailNo.substring(1);
        const withdrawRecord =
          await this.withdrawRecordRepository.findOneById(withdrawId);

        if (!withdrawRecord) {
          this.logger.warn(`提现记录不存在: ${withdrawId}`);
          continue;
        }

        // SUCCESS → completed, FAIL → failed, WAIT → processing
        let newStatus: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
        if (detailStatus === 'SUCCESS') {
          newStatus = 'completed';
        } else if (detailStatus === 'FAIL') {
          newStatus = 'failed';
        } else {
          // WAIT 等待中，暂不更新
          continue;
        }

        // ⚠️ CAS 幂等更新：仅允许 approved -> completed/failed
        if (newStatus === 'completed') {
          const casResult = await this.dataSource.query(
            `UPDATE withdraw_records
             SET status = 'completed',
                 wx_transaction_id = COALESCE(wx_transaction_id, $2),
                 completed_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1 AND status = 'approved' AND is_delete = false
             RETURNING id`,
            [withdrawId, outBatchNo || null],
          );
          if (!casResult || casResult.length === 0) {
            this.logger.warn(`提现回调幂等命中或状态不匹配: id=${withdrawId}`);
            continue;
          }

          // 提现到账：从冻结余额扣减，累计已提现（仅在 CAS 成功后执行一次）
          await this.dataSource.query(
            `UPDATE user_balances
             SET frozen_balance = GREATEST(frozen_balance - $1, 0),
                 total_withdrawn = total_withdrawn + $1,
                 updated_at = NOW()
             WHERE user_id = $2 AND is_delete = false`,
            [Number(withdrawRecord.amount), withdrawRecord.user_id],
          );
        } else {
          const casResult = await this.dataSource.query(
            `UPDATE withdraw_records
             SET status = 'failed',
                 updated_at = NOW()
             WHERE id = $1 AND status = 'approved' AND is_delete = false
             RETURNING id`,
            [withdrawId],
          );
          if (!casResult || casResult.length === 0) {
            this.logger.warn(`提现失败回调幂等命中或状态不匹配: id=${withdrawId}`);
            continue;
          }

          // 提现失败：解冻余额回可用余额（仅在 CAS 成功后执行一次）
          await this.dataSource.query(
            `UPDATE user_balances
             SET balance = balance + $1,
                 frozen_balance = GREATEST(frozen_balance - $1, 0),
                 updated_at = NOW()
             WHERE user_id = $2 AND is_delete = false`,
            [Number(withdrawRecord.amount), withdrawRecord.user_id],
          );
        }

        this.logger.log(`提现记录已更新: id=${withdrawId}, 状态=${newStatus}`);
      }

      // 转账批次状态处理（兜底处理整批失败的情况）
      if (batchStatus === 'FINISHED') {
        this.logger.log(`转账批次完成: ${outBatchNo}`);
      } else if (batchStatus === 'CLOSED') {
        this.logger.warn(`转账批次关闭: ${outBatchNo}，可能存在转账失败的明细`);
      }

      return { success: true, message: '处理成功' };
    } catch (error) {
      this.logger.error('处理转账回调失败', error);
      return { success: false, message: error.message };
    }
  }
}
