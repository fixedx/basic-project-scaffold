import { Injectable, BadRequestException, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transactional } from '@/common/decorators/transaction.decorator';
import { UserContextService } from '@/common/services/user-context.service';
import { generateSnowflakeId } from '@/utils/snowflake.util';
import { PaymentService } from '@/modules/payment/payment.service';
import { NotificationService } from '@/modules/notification/notification.service';
import { UserRepository } from '@/modules/auth/repositories/user.repository';
import {
  UserInviteCodeRepository,
  InviteOrderRepository,
  UserBalanceRepository,
  CashbackRecordRepository,
  WithdrawRecordRepository,
} from './repositories';
import { UserInviteCodeEntity } from './entities/user-invite-code.entity';
import { InviteOrderEntity } from './entities/invite-order.entity';
import {
  SetShareRatioDto,
  ValidateInviteCodeDto,
  CalculateDiscountDto,
  QueryInviteOrdersDto,
  ApplyWithdrawDto,
  ReviewWithdrawDto,
  DeductBalanceDto,
} from './dto';
import { MoneyMath } from '@/common/utils/money.util';

@Injectable()
export class InviteService implements OnModuleInit {
  private readonly logger = new Logger(InviteService.name);

  /**
   * 模块初始化：确保 user_balances 的部分唯一索引存在
   * TypeORM synchronize 不管理带 WHERE 子句的部分索引，需手动保证
   */
  async onModuleInit() {
    try {
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_user_balances_user_id_active
          ON user_balances(user_id)
          WHERE is_delete = false
      `);
      this.logger.log('✅ user_balances 部分唯一索引已就绪');
    } catch (error: any) {
      this.logger.error(`❌ 创建 user_balances 唯一索引失败: ${error.message}`);
    }
  }

  /**
   * 生成商户转账批次号（提现幂等键）
   */
  private generateTransferBatchNo(): string {
    return `WD${generateSnowflakeId()}`;
  }

  /**
   * 从 platform_configs 表读取数字型配置项
   * 若记录不存在或查询失败，回退到 defaultValue
   */
  private async getConfigValue(key: string, defaultValue: number): Promise<number> {
    try {
      const rows = await this.dataSource.query(
        `SELECT config_value FROM platform_configs
         WHERE config_key = $1 AND is_delete = false LIMIT 1`,
        [key],
      );
      if (rows && rows.length > 0) {
        const val = Number(rows[0].config_value);
        return isNaN(val) ? defaultValue : val;
      }
    } catch {
      // 表不存在或查询失败时使用默认值
    }
    return defaultValue;
  }

  /**
   * 生成商户转账明细号（提现幂等键）
   */
  private generateTransferDetailNo(withdrawId: string): string {
    return `D${withdrawId}`;
  }

  constructor(
    private dataSource: DataSource,
    private userContextService: UserContextService,
    private userInviteCodeRepository: UserInviteCodeRepository,
    private inviteOrderRepository: InviteOrderRepository,
    private userBalanceRepository: UserBalanceRepository,
    private cashbackRecordRepository: CashbackRecordRepository,
    private withdrawRecordRepository: WithdrawRecordRepository,
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService,
    private userRepository: UserRepository,
    private notificationService: NotificationService,
  ) {}

  /**
   * 生成8位邀请码
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 获取或创建用户邀请码
   * 用户登录后自动生成
   */
  @Transactional()
  async getOrCreateInviteCode(
    userId: string,
  ): Promise<UserInviteCodeEntity> {
    // 检查是否已有邀请码
    let inviteCode = await this.userInviteCodeRepository.findByUserId(userId);
    if (inviteCode) {
      return inviteCode;
    }

    // 生成唯一邀请码
    let code: string = this.generateInviteCode();
    let exists = await this.userInviteCodeRepository.existsByInviteCode(code);
    let attempts = 1;
    while (exists && attempts < 10) {
      code = this.generateInviteCode();
      exists = await this.userInviteCodeRepository.existsByInviteCode(code);
      attempts++;
    }
    if (exists) {
      throw new BadRequestException('生成邀请码失败，请重试');
    }

    // 创建邀请码记录
    inviteCode = this.userInviteCodeRepository.create({
      id: generateSnowflakeId(),
      user_id: userId,
      invite_code: code,
      share_ratio: 50, // 默认让利50%
      status: 'active',
      use_count: 0,
      daily_use_count: 0,
      total_pending_cashback: 0,
      total_unlocked_cashback: 0,
    });

    await this.userInviteCodeRepository.save(inviteCode);
    this.logger.log(`用户 ${userId} 生成邀请码 ${code}`);

    return inviteCode;
  }

  /**
   * 获取当前用户的邀请码信息
   */
  async getMyInviteCode(): Promise<UserInviteCodeEntity | null> {
    const userId = this.userContextService.getCurrentUserId();
    return this.getOrCreateInviteCode(userId);
  }

  /**
   * 设置让利比例
   */
  @Transactional()
  async setShareRatio(dto: SetShareRatioDto): Promise<boolean> {
    const userId = this.userContextService.getCurrentUserId();
    const inviteCode = await this.userInviteCodeRepository.findByUserId(userId);

    if (!inviteCode) {
      throw new BadRequestException('邀请码不存在');
    }

    await this.userInviteCodeRepository.update(inviteCode.id, {
      share_ratio: dto.share_ratio,
    });

    this.logger.log(`用户 ${userId} 设置让利比例为 ${dto.share_ratio}%`);
    return true;
  }

  /**
   * 获取可用邀请码列表（按立减金额排序）
   * @param order_amount 订单金额
   * @param cashback_ratio 课程返现比例
   */
  async getAvailableInviteCodes(
    order_amount: number,
    cashback_ratio: number,
  ): Promise<{
    invite_code: string;
    share_ratio: number;
    discount_amount: number;
    inviter_cashback: number;
  }[]> {
    // 获取当前用户ID（排除自己的邀请码）
    const currentUserId = this.userContextService.getCurrentUserIdOrNull();
    
    // 获取所有有效邀请码
    const inviteCodes = await this.userInviteCodeRepository.findAllActiveInviteCodes(currentUserId || undefined);
    
    // 计算每个邀请码的立减金额
    const results = inviteCodes.map(code => {
      const orderAmountFen = MoneyMath.yuan2fen(order_amount);
      // 返现池 = 订单金额 × 返现比例
      const cashbackPoolFen = MoneyMath.percentOfFen(orderAmountFen, cashback_ratio);
      // 立减金额 = 返现池 × 让利比例（给被邀请人）
      const discountAmountFen = MoneyMath.percentOfFen(cashbackPoolFen, code.share_ratio);
      // 邀请人返现 = 返现池 - 立减
      const inviterCashbackFen = cashbackPoolFen - discountAmountFen;
      
      return {
        invite_code: code.invite_code,
        share_ratio: code.share_ratio,
        discount_amount: MoneyMath.fen2yuan(discountAmountFen),
        inviter_cashback: MoneyMath.fen2yuan(inviterCashbackFen),
      };
    });
    
    // 按立减金额从高到低排序
    return results.sort((a, b) => b.discount_amount - a.discount_amount);
  }

  /**
   * 验证邀请码有效性
   * 校验3点：归属平台用户、未冻结、课程是返现课程
   */
  async validateInviteCode(
    dto: ValidateInviteCodeDto,
  ): Promise<{ valid: boolean; message?: string; inviteCode?: UserInviteCodeEntity }> {
    const { invite_code, course_id } = dto;

    // 1. 检查邀请码是否存在
    const inviteCodeEntity =
      await this.userInviteCodeRepository.findByInviteCode(invite_code);
    if (!inviteCodeEntity) {
      return { valid: false, message: '邀请码无效' };
    }

    // 2. 检查当日使用次数是否超限
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let dailyCount = inviteCodeEntity.daily_use_count;
    if (
      !inviteCodeEntity.daily_use_reset_at ||
      new Date(inviteCodeEntity.daily_use_reset_at) < today
    ) {
      dailyCount = 0;
    }
    const dailyLimit = await this.getConfigValue('invite_daily_use_limit', 50);
    // dailyLimit = -1 表示不限制
    if (dailyLimit !== -1 && dailyCount >= dailyLimit) {
      return { valid: false, message: '该邀请码今日使用次数已达上限' };
    }

    // 4. 检查课程是否为返现课程（必须在此验证）
    if (course_id) {
      const courseRows = await this.dataSource.query(
        `SELECT cashback_enabled FROM courses WHERE id = $1 AND is_delete = false LIMIT 1`,
        [course_id],
      );
      if (!courseRows || courseRows.length === 0) {
        return { valid: false, message: '课程不存在，邀请码无效' };
      }
      if (!courseRows[0].cashback_enabled) {
        return { valid: false, message: '该课程未开启返现功能，邀请码无效' };
      }
    }

    // 5. 检查不能使用自己的邀请码
    const currentUserId = this.userContextService.getCurrentUserIdOrNull();
    if (currentUserId && inviteCodeEntity.user_id === currentUserId) {
      return { valid: false, message: '不能使用自己的邀请码' };
    }

    return { valid: true, inviteCode: inviteCodeEntity };
  }

  /**
   * 计算立减金额
   */
  async calculateDiscount(dto: CalculateDiscountDto): Promise<{
    cashback_ratio: number;
    share_ratio: number;
    cashback_total: number;
    discount_amount: number;
    actual_cashback: number;
  }> {
    const { invite_code, order_amount, course_id } = dto;

    // 获取邀请码信息
    const inviteCodeEntity =
      await this.userInviteCodeRepository.findActiveByInviteCode(invite_code);
    if (!inviteCodeEntity) {
      throw new BadRequestException('邀请码无效');
    }

    // 从课程表查询实际返现比例（同时校验课程是否开启了返现）
    let cashback_ratio = 0;
    if (course_id) {
      const courseRows = await this.dataSource.query(
        `SELECT cashback_ratio, cashback_enabled FROM courses WHERE id = $1 AND is_delete = false`,
        [course_id],
      );
      if (!courseRows || courseRows.length === 0) {
        throw new BadRequestException('课程不存在');
      }
      const course = courseRows[0];
      if (!course.cashback_enabled) {
        throw new BadRequestException('该课程未开启返现功能，邀请码无效');
      }
      cashback_ratio = Number(course.cashback_ratio) || 0;
    }

    const share_ratio = inviteCodeEntity.share_ratio;
    const orderAmountFen = MoneyMath.yuan2fen(order_amount);
    const cashbackTotalFen = MoneyMath.percentOfFen(orderAmountFen, cashback_ratio);
    const discountAmountFen = MoneyMath.percentOfFen(cashbackTotalFen, share_ratio);
    const actualCashbackFen = cashbackTotalFen - discountAmountFen;

    return {
      cashback_ratio,
      share_ratio,
      cashback_total: MoneyMath.fen2yuan(cashbackTotalFen),
      discount_amount: MoneyMath.fen2yuan(discountAmountFen),
      actual_cashback: MoneyMath.fen2yuan(actualCashbackFen),
    };
  }

  /**
   * 创建邀请订单（支付成功后调用）
   */
  @Transactional()
  async createInviteOrder(data: {
    invite_code: string;
    invitee_id: string;
    order_id: string;
    course_id: string;
    institution_id: string;
    order_amount: number;
    cashback_ratio: number;
    total_lessons: number;
    /** 下单时快照的让利比例（优先使用，避免事后修改影响已有订单） */
    share_ratio?: number;
  }): Promise<InviteOrderEntity> {
    const {
      invite_code,
      invitee_id,
      order_id,
      course_id,
      institution_id,
      order_amount,
      cashback_ratio,
      total_lessons,
    } = data;

    // 获取邀请码信息
    const inviteCodeEntity =
      await this.userInviteCodeRepository.findActiveByInviteCode(invite_code);
    if (!inviteCodeEntity) {
      throw new BadRequestException('邀请码无效');
    }

    // 检查不能自己邀请自己
    if (inviteCodeEntity.user_id === invitee_id) {
      throw new BadRequestException('不能使用自己的邀请码');
    }

    // 防重：同一个订单只能创建一条邀请订单（幂等保护，防止回调重复触发）
    const existing = await this.inviteOrderRepository.findByOrderId(order_id);
    if (existing) {
      this.logger.warn(`邀请订单已存在，跳过重复创建: order_id=${order_id}`);
      return existing;
    }

    // 计算返现金额
    // ⭐ 优先使用下单时快照的让利比例，防止邀请人事后修改比例影响已有订单
    const share_ratio = data.share_ratio !== undefined ? data.share_ratio : inviteCodeEntity.share_ratio;
    const orderAmountFen = MoneyMath.yuan2fen(order_amount);
    const cashbackTotalFen = MoneyMath.percentOfFen(orderAmountFen, cashback_ratio);
    const discountAmountFen = MoneyMath.percentOfFen(cashbackTotalFen, share_ratio);
    const actualCashbackFen = cashbackTotalFen - discountAmountFen;

    // 创建邀请订单
    const inviteOrder = this.inviteOrderRepository.create({
      id: generateSnowflakeId(),
      invite_code_id: inviteCodeEntity.id,
      inviter_id: inviteCodeEntity.user_id,
      invitee_id,
      order_id,
      course_id,
      institution_id,
      cashback_ratio,
      share_ratio,
      order_amount: MoneyMath.fen2yuan(orderAmountFen),
      cashback_total: MoneyMath.fen2yuan(cashbackTotalFen),
      discount_amount: MoneyMath.fen2yuan(discountAmountFen),
      actual_cashback: MoneyMath.fen2yuan(actualCashbackFen),
      total_lessons,
      completed_lessons: 0,
      unlock_ratio: 0,
      unlocked_amount: 0,
      status: 'pending',
    });

    await this.inviteOrderRepository.save(inviteOrder);

    // 更新邀请码统计
    await this.userInviteCodeRepository.incrementUseCount(inviteCodeEntity.id);
    await this.userInviteCodeRepository.updatePendingCashback(
      inviteCodeEntity.id,
      inviteOrder.actual_cashback,
      true,
    );

    this.logger.log(
      `创建邀请订单：邀请人=${inviteCodeEntity.user_id}, 被邀请人=${invitee_id}, 订单=${order_id}, 实际返现=${MoneyMath.fen2yuan(actualCashbackFen)}`,
    );

    // 通知邀请人：有人使用了你的邀请码
    try {
      const inviterUser = await this.userRepository.findOneById(inviteCodeEntity.user_id);
      const courseRows = await this.dataSource.query(
        `SELECT title FROM courses WHERE id = $1 AND is_delete = false LIMIT 1`,
        [course_id],
      );
      await this.notificationService.notifyInviteOrder({
        inviterUserId: inviteCodeEntity.user_id,
        inviteeNickname: inviterUser?.nickname || '小明',
        courseName: courseRows?.[0]?.title || '课程',
        discountAmount: inviteOrder.discount_amount,
      });
    } catch { /* 通知失败不影响主流程 */ }

    return inviteOrder;
  }

  /**
   * 更新完课进度并解锁返现（签到后调用）
   */
  @Transactional()
  async updateCompletionAndUnlock(
    orderId: string,
    completedLessons: number,
  ): Promise<void> {
    // 查找邀请订单
    const inviteOrder =
      await this.inviteOrderRepository.findByOrderId(orderId);
    if (!inviteOrder) {
      // 没有邀请订单，跳过
      return;
    }

    // 如果已完成或已取消，跳过
    if (
      inviteOrder.status === 'completed' ||
      inviteOrder.status === 'cancelled'
    ) {
      return;
    }

    // 更新完课进度
    const { newUnlockAmount, inviteOrder: updatedOrder } =
      await this.inviteOrderRepository.updateCompletionProgress(
        inviteOrder.id,
        completedLessons,
      );

    // 如果有新解锁金额，增加邀请人余额
    if (newUnlockAmount > 0) {
      const inviterId = inviteOrder.inviter_id;
      const balanceBefore = await this.userBalanceRepository.getOrCreate(
        inviterId,
      );
      const beforeAmount = Number(balanceBefore.balance);

      await this.userBalanceRepository.addBalance(inviterId, newUnlockAmount);

      // 记录流水
      await this.cashbackRecordRepository.createRecord({
        user_id: inviterId,
        invite_order_id: inviteOrder.id,
        amount: newUnlockAmount,
        balance_before: beforeAmount,
        balance_after: beforeAmount + newUnlockAmount,
        type: 'unlock',
        remark: `订单 ${orderId} 完课解锁`,
      });

      // 更新邀请码统计
      await this.userInviteCodeRepository.updatePendingCashback(
        inviteOrder.invite_code_id,
        newUnlockAmount,
        false,
      );
      await this.userInviteCodeRepository.updateUnlockedCashback(
        inviteOrder.invite_code_id,
        newUnlockAmount,
      );

      this.logger.log(
        `解锁返现：邀请人=${inviterId}, 订单=${orderId}, 解锁金额=${newUnlockAmount}`,
      );

      // 通知邀请人：完课返现解锁
      try {
        const courseRows = await this.dataSource.query(
          `SELECT title FROM courses WHERE id = $1 AND is_delete = false LIMIT 1`,
          [inviteOrder.course_id],
        );
        await this.notificationService.notifyCashbackUnlock({
          userId: inviterId,
          cashbackAmount: newUnlockAmount,
          courseName: courseRows?.[0]?.title || '课程',
          role: '邀请人',
        });
      } catch { /* 通知失败不影响主流程 */ }
    }
  }

  /**
   * 取消邀请订单（退课时调用）
   */
  @Transactional()
  async cancelInviteOrder(orderId: string): Promise<void> {
    const inviteOrder =
      await this.inviteOrderRepository.findByOrderId(orderId);
    if (!inviteOrder) {
      return;
    }

    // 计算未解锁的返现
    const unlockedAmount = Number(inviteOrder.unlocked_amount);
    const actualCashback = Number(inviteOrder.actual_cashback);
    const pendingAmount = actualCashback - unlockedAmount;

    // 更新邀请订单状态
    await this.inviteOrderRepository.update(inviteOrder.id, {
      status: 'cancelled',
    });

    // 更新邀请码统计（减少待解锁金额）
    if (pendingAmount > 0) {
      await this.userInviteCodeRepository.updatePendingCashback(
        inviteOrder.invite_code_id,
        pendingAmount,
        false,
      );
    }

    this.logger.log(`取消邀请订单：订单=${orderId}, 未解锁金额=${pendingAmount}`);
  }

  /**
   * 获取邀请订单列表
   */
  async getInviteOrders(dto: QueryInviteOrdersDto) {
    const userId = this.userContextService.getCurrentUserId();
    const { status, page = 1, pageSize = 10 } = dto;

    return this.inviteOrderRepository.findByInviterIdPaginated(
      userId,
      page,
      pageSize,
      status,
    );
  }

  /**
   * 获取邀请统计数据
   */
  async getInviteStats() {
    const userId = this.userContextService.getCurrentUserId();
    const inviteCode = await this.userInviteCodeRepository.findByUserId(userId);
    const stats = await this.inviteOrderRepository.getInviterStats(userId);
    const balance = await this.userBalanceRepository.getOrCreate(userId);

    return {
      inviteCode: inviteCode
        ? {
            code: inviteCode.invite_code,
            status: inviteCode.status,
            share_ratio: inviteCode.share_ratio,
            use_count: inviteCode.use_count,
          }
        : null,
      stats,
      balance: {
        available: Number(balance.balance),
        frozen: Number(balance.frozen_balance),
        total_earned: Number(balance.total_earned),
        total_withdrawn: Number(balance.total_withdrawn),
        total_used: Number(balance.total_used),
      },
    };
  }

  /**
   * 获取用户余额
   */
  async getBalance() {
    const userId = this.userContextService.getCurrentUserId();
    const balance = await this.userBalanceRepository.getOrCreate(userId);
    const withdrawMin = await this.getConfigValue('withdraw_min_amount', 50);
    return {
      available: Number(balance.balance),
      frozen: Number(balance.frozen_balance),
      total_earned: Number(balance.total_earned),
      total_withdrawn: Number(balance.total_withdrawn),
      total_used: Number(balance.total_used),
      can_withdraw: Number(balance.balance) >= withdrawMin,
      withdraw_min_amount: withdrawMin,
    };
  }

  /**
   * 申请提现（无需审核，直接发起微信转账，实时到账）
   */
  async applyWithdraw(dto: ApplyWithdrawDto): Promise<string> {
    const userId = this.userContextService.getCurrentUserId();
    const { amount } = dto;

    const withdrawMin = await this.getConfigValue('withdraw_min_amount', 50);
    if (amount < withdrawMin) {
      throw new BadRequestException(
        `提现金额最低${withdrawMin}元`,
      );
    }

    // 获取余额
    const balance = await this.userBalanceRepository.getOrCreate(userId);
    if (Number(balance.balance) < amount) {
      throw new BadRequestException('余额不足');
    }

    // 获取用户的微信 openid（转账时需要）
    const user = await this.userRepository.findOneById(userId);
    const wxOpenid = user?.openid || '';

    // Phase-1（快速事务）: 冻结余额 + 创建提现记录（status=approved，直接跳过 pending 审核）
    const withdrawId = generateSnowflakeId();
    const outBatchNo = this.generateTransferBatchNo();
    const outDetailNo = this.generateTransferDetailNo(withdrawId);

    await this.dataSource.transaction(async () => {
      // 原子冻结余额
      await this.userBalanceRepository.freezeBalance(userId, amount);

      // 创建提现记录（直接为 approved 状态，等待转账）
      const withdraw = this.withdrawRecordRepository.create({
        id: withdrawId,
        user_id: userId,
        amount,
        status: 'approved',
        wx_openid: wxOpenid,
        out_batch_no: outBatchNo,
        out_detail_no: outDetailNo,
        reviewed_at: new Date(),
      });
      await this.withdrawRecordRepository.save(withdraw);

      // 记录流水
      await this.cashbackRecordRepository.createRecord({
        user_id: userId,
        amount: -amount,
        balance_before: Number(balance.balance),
        balance_after: Number(balance.balance) - amount,
        type: 'withdraw',
        remark: '提现申请',
      });
    });

    this.logger.log(`用户 ${userId} 申请提现 ${amount} 元, openid=${wxOpenid || '无'}, withdrawId=${withdrawId}`);

    // Phase-2（无事务）: 发起微信转账（DB 连接已归还）
    const transferResult = await this.paymentService.createTransfer(
      withdrawId,
      wxOpenid,
      amount,
      '余额提现',
      { outBatchNo, outDetailNo },
    );

    if (transferResult.success) {
      // Phase-3（快速事务）: approved -> completed + 余额扣减 + 通知
      const finalizeRows = await this.dataSource.query(
        `UPDATE withdraw_records
         SET status = 'completed',
             wx_transaction_id = COALESCE(wx_transaction_id, $2),
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1 AND status = 'approved' AND is_delete = false
         RETURNING id`,
        [withdrawId, transferResult.batch_id || outBatchNo],
      );

      if (finalizeRows && finalizeRows.length > 0) {
        await this.userBalanceRepository.completeWithdraw(userId, amount);
      }

      try {
        await this.notificationService.notifyWithdrawDone({
          userId,
          withdrawAmount: amount,
          withdrawNo: withdrawId,
        });
      } catch { /* 通知失败不影响主流程 */ }

      this.logger.log(`提现转账成功：ID=${withdrawId}, 金额=${amount}, 批次=${transferResult.batch_id}`);
    } else {
      // 转账失败：保持 approved 状态，由 retryApprovedWithdrawals 定时任务补偿
      this.logger.error(`提现转账失败（将由定时任务重试）：ID=${withdrawId}, 原因=${transferResult.message}`);
    }

    return withdrawId;
  }

  /**
   * 审核提现（管理端）
   */
  async reviewWithdraw(id: string, dto: ReviewWithdrawDto): Promise<boolean> {
    const reviewerId = this.userContextService.getCurrentUserId();

    if (dto.action === 'approve') {
      const draftOutBatchNo = this.generateTransferBatchNo();
      const draftOutDetailNo = this.generateTransferDetailNo(id);

      // Phase-1: CAS pending -> approved（并固化幂等键）
      const casRows = await this.dataSource.query(
        `UPDATE withdraw_records
         SET status = 'approved',
             reviewed_by = $2,
             reviewed_at = NOW(),
             out_batch_no = COALESCE(out_batch_no, $3),
             out_detail_no = COALESCE(out_detail_no, $4),
             updated_at = NOW()
         WHERE id = $1 AND status = 'pending' AND is_delete = false
         RETURNING user_id, amount, wx_openid, out_batch_no, out_detail_no`,
        [id, reviewerId, draftOutBatchNo, draftOutDetailNo],
      );
      if (!casRows || casRows.length === 0) {
        throw new BadRequestException('该提现记录已处理');
      }

      const approvedRow = casRows[0];
      const outBatchNo = approvedRow.out_batch_no;
      const outDetailNo = approvedRow.out_detail_no;

      // Phase-2: 外部 HTTP 调用（事务外）
      let openid = approvedRow.wx_openid;
      if (!openid) {
        const user = await this.userRepository.findOneById(approvedRow.user_id);
        openid = user?.openid || '';
      }

      const transferResult = await this.paymentService.createTransfer(
        id,
        openid,
        Number(approvedRow.amount),
        '余额提现',
        { outBatchNo, outDetailNo },
      );

      if (transferResult.success) {
        // Phase-3: CAS approved -> completed（快速收尾）
        const finalizeRows = await this.dataSource.query(
          `UPDATE withdraw_records
           SET status = 'completed',
               wx_transaction_id = COALESCE(wx_transaction_id, $2),
               completed_at = NOW(),
               updated_at = NOW()
           WHERE id = $1 AND status = 'approved' AND is_delete = false
           RETURNING id`,
          [id, transferResult.batch_id || outBatchNo],
        );

        // 仅 CAS 成功时执行余额扣减，避免和转账回调并发时重复扣减
        if (finalizeRows && finalizeRows.length > 0) {
          await this.userBalanceRepository.completeWithdraw(
            approvedRow.user_id,
            Number(approvedRow.amount),
          );
        }

        // 通知用户：提现到账
        try {
          await this.notificationService.notifyWithdrawDone({
            userId: approvedRow.user_id,
            withdrawAmount: Number(approvedRow.amount),
            withdrawNo: id,
          });
        } catch { /* 通知失败不影响主流程 */ }

        this.logger.log(
          `提现审核通过并转账成功：ID=${id}, 金额=${approvedRow.amount}, 微信批次=${transferResult.batch_id}`,
        );
      } else {
        // 转账失败：回滚 approved -> pending，等待后续重试
        await this.dataSource.query(
          `UPDATE withdraw_records
           SET status = 'pending',
               reviewed_by = NULL,
               reviewed_at = NULL,
               updated_at = NOW()
           WHERE id = $1 AND status = 'approved' AND is_delete = false`,
          [id],
        );

        this.logger.error(
          `提现转账失败：ID=${id}, 原因=${transferResult.message}`,
        );

        throw new BadRequestException(
          `微信转账失败：${transferResult.message}，请稍后重试`,
        );
      }
    } else {
      await this.dataSource.transaction(async () => {
        // CAS pending -> rejected
        const casRows = await this.dataSource.query(
          `UPDATE withdraw_records
           SET status = 'rejected',
               reject_reason = $2,
               reviewed_by = $3,
               reviewed_at = NOW(),
               updated_at = NOW()
           WHERE id = $1 AND status = 'pending' AND is_delete = false
           RETURNING user_id, amount`,
          [id, dto.reject_reason || '审核不通过', reviewerId],
        );
        if (!casRows || casRows.length === 0) {
          throw new BadRequestException('该提现记录已处理');
        }

        const rejectedRow = casRows[0];

        // 解冻余额
        await this.userBalanceRepository.unfreezeBalance(
          rejectedRow.user_id,
          Number(rejectedRow.amount),
        );

        // 记录流水（退回）
        const balance = await this.userBalanceRepository.findByUserId(
          rejectedRow.user_id,
        );
        await this.cashbackRecordRepository.createRecord({
          user_id: rejectedRow.user_id,
          amount: Number(rejectedRow.amount),
          balance_before: Number(balance!.balance) - Number(rejectedRow.amount),
          balance_after: Number(balance!.balance),
          type: 'refund',
          remark: `提现被拒绝：${dto.reject_reason || '审核不通过'}`,
        });
      });

      this.logger.log(
        `提现审核拒绝：ID=${id}, 原因=${dto.reject_reason}`,
      );
    }

    return true;
  }

  /**
   * 余额抵扣
   */
  @Transactional()
  async deductBalance(dto: DeductBalanceDto): Promise<boolean> {
    const userId = this.userContextService.getCurrentUserId();
    const { amount, order_id, remark } = dto;

    const balance = await this.userBalanceRepository.getOrCreate(userId);
    if (Number(balance.balance) < amount) {
      throw new BadRequestException('余额不足');
    }

    await this.userBalanceRepository.deductBalance(userId, amount);

    // 记录流水
    await this.cashbackRecordRepository.createRecord({
      user_id: userId,
      amount: -amount,
      balance_before: Number(balance.balance),
      balance_after: Number(balance.balance) - amount,
      type: 'deduct',
      remark: remark || `订单 ${order_id} 抵扣`,
    });

    this.logger.log(`用户 ${userId} 余额抵扣 ${amount} 元`);

    return true;
  }

  /**
   * 获取流水记录
   */
  async getCashbackRecords(page: number = 1, pageSize: number = 10, type?: string) {
    const userId = this.userContextService.getCurrentUserId();
    return this.cashbackRecordRepository.findByUserIdPaginated(
      userId,
      page,
      pageSize,
      type,
    );
  }

  /**
   * 获取提现记录
   */
  async getWithdrawRecords(page: number = 1, pageSize: number = 10, status?: string) {
    const userId = this.userContextService.getCurrentUserId();
    return this.withdrawRecordRepository.findByUserIdPaginated(
      userId,
      page,
      pageSize,
      status,
    );
  }

  /**
   * 获取待审核提现列表（管理端）
   */
  async getPendingWithdraws(page: number = 1, pageSize: number = 10) {
    return this.withdrawRecordRepository.findAllPaginated(
      page,
      pageSize,
      'pending',
    );
  }

  /**
   * 重试卡在 approved 状态超过 10 分钟的提现记录
   * 由定时任务 InviteTasksService 每 10 分钟调用一次
   * 场景：reviewWithdraw 通过后调用微信转账 API 超时 / 进程崩溃，
   *       导致 withdraw_records.status 停留在 approved 而未推进到 completed/failed
   */
  async retryApprovedWithdrawals(): Promise<{ retried: number; failed: number }> {
    // 查询卡单：approved 且 reviewed_at 超过 10 分钟
    const stuckRows: any[] = await this.dataSource.query(
      `SELECT wr.*, u.openid
       FROM withdraw_records wr
       LEFT JOIN users u ON u.id = wr.user_id AND u.is_delete = false
       WHERE wr.status = 'approved'
         AND wr.reviewed_at < NOW() - INTERVAL '10 minutes'
         AND wr.is_delete = false
       ORDER BY wr.reviewed_at ASC
       LIMIT 20`,
    );

    let retried = 0;
    let failed = 0;

    for (const row of stuckRows) {
      try {
        const openid = row.openid || row.wx_openid;
        if (!openid) {
          this.logger.warn(`提现补偿：用户 ${row.user_id} 无 openid，跳过 id=${row.id}`);
          failed++;
          continue;
        }

        this.logger.log(`提现补偿：重试卡单 id=${row.id}, 金额=${row.amount}`);

        const outBatchNo = row.out_batch_no || this.generateTransferBatchNo();
        const outDetailNo = row.out_detail_no || this.generateTransferDetailNo(row.id);
        if (!row.out_batch_no || !row.out_detail_no) {
          await this.withdrawRecordRepository.update(row.id, {
            out_batch_no: outBatchNo,
            out_detail_no: outDetailNo,
          });
        }

        const transferResult = await this.paymentService.createTransfer(
          row.id,
          openid,
          Number(row.amount),
          '余额提现（补偿重试）',
          { outBatchNo, outDetailNo },
        );

        if (transferResult.success) {
          await this.withdrawRecordRepository.update(row.id, {
            status: 'completed',
            wx_transaction_id: transferResult.batch_id || '',
            completed_at: new Date(),
          });
          await this.userBalanceRepository.completeWithdraw(
            row.user_id,
            Number(row.amount),
          );
          this.logger.log(`提现补偿成功：id=${row.id}`);
          retried++;
        } else {
          // 转账仍然失败：回退为 pending，让管理员重新审核
          await this.withdrawRecordRepository.update(row.id, {
            status: 'pending',
            reviewed_by: undefined as any,
            reviewed_at: undefined as any,
          });
          this.logger.error(`提现补偿转账失败：id=${row.id}, 原因=${transferResult.message}`);
          failed++;
        }
      } catch (e) {
        this.logger.error(`提现补偿处理异常：id=${row.id}`, e);
        failed++;
      }
    }

    return { retried, failed };
  }
}
