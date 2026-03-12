import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { DataSource } from 'typeorm';
import { MoneyMath } from '@/common/utils/money.util';

/**
 * 微信订阅消息通知服务
 *
 * 依赖以下环境变量：
 *   WECHAT_APP_ID        - 小程序 AppID
 *   WECHAT_APP_SECRET    - 小程序 AppSecret
 *   NOTIFY_INVITE_ORDER_TPL_ID   - 邀请码下单模板ID
 *   NOTIFY_PAY_SUCCESS_TPL_ID    - 支付成功模板ID
 *   NOTIFY_CASHBACK_UNLOCK_TPL_ID - 完课返现解锁模板ID
 *   NOTIFY_WITHDRAW_DONE_TPL_ID  - 提现到账模板ID
 *
 * 若模板 ID 未配置则跳过通知，不影响主业务。
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly dataSource: DataSource) {}

  // ─────────────────────────────────────────────
  // 公开方法：各事件触发入口
  // ─────────────────────────────────────────────

  /**
   * 事件1：使用邀请码下单成功
   * 通知邀请人：有人用了你的邀请码
   */
  async notifyInviteOrder(params: {
    inviterUserId: string;   // 邀请人 user_id
    inviteeNickname: string; // 被邀请人昵称
    courseName: string;      // 课程名称
    discountAmount: number;  // 被邀请人享受的折扣金额
  }): Promise<void> {
    const tplId = process.env.NOTIFY_INVITE_ORDER_TPL_ID;
    if (!tplId) return;

    const openid = await this.getUserOpenid(params.inviterUserId);
    if (!openid) return;

    await this.send(openid, tplId, {
      thing1: { value: params.courseName.slice(0, 20) },
      name2: { value: params.inviteeNickname.slice(0, 20) },
      amount3: { value: `¥${MoneyMath.format(params.discountAmount)}` },
      time4: { value: this.formatNow() },
    });
  }

  /**
   * 事件2：订单支付成功
   * 通知买家
   */
  async notifyPaySuccess(params: {
    userId: string;
    orderNo: string;
    courseName: string;
    paidAmount: number;
  }): Promise<void> {
    const tplId = process.env.NOTIFY_PAY_SUCCESS_TPL_ID;
    if (!tplId) return;

    const openid = await this.getUserOpenid(params.userId);
    if (!openid) return;

    await this.send(openid, tplId, {
      character_string1: { value: params.orderNo },
      thing2: { value: params.courseName.slice(0, 20) },
      amount3: { value: `¥${MoneyMath.format(params.paidAmount)}` },
      time4: { value: this.formatNow() },
    });
  }

  /**
   * 事件3：完课返现解锁
   * 通知邀请人和被邀请人
   */
  async notifyCashbackUnlock(params: {
    userId: string;           // 收到返现的用户
    cashbackAmount: number;
    courseName: string;
    role: '邀请人' | '被邀请人';
  }): Promise<void> {
    const tplId = process.env.NOTIFY_CASHBACK_UNLOCK_TPL_ID;
    if (!tplId) return;

    const openid = await this.getUserOpenid(params.userId);
    if (!openid) return;

    await this.send(openid, tplId, {
      thing1: { value: params.courseName.slice(0, 20) },
      amount2: { value: `¥${MoneyMath.format(params.cashbackAmount)}` },
      phrase3: { value: params.role },
      time4: { value: this.formatNow() },
    });
  }

  /**
   * 事件4：提现到账
   * 通知提现用户
   */
  async notifyWithdrawDone(params: {
    userId: string;
    withdrawAmount: number;
    withdrawNo?: string;
  }): Promise<void> {
    const tplId = process.env.NOTIFY_WITHDRAW_DONE_TPL_ID;
    if (!tplId) return;

    const openid = await this.getUserOpenid(params.userId);
    if (!openid) return;

    await this.send(openid, tplId, {
      amount1: { value: `¥${MoneyMath.format(params.withdrawAmount)}` },
      character_string2: { value: params.withdrawNo || '' },
      time3: { value: this.formatNow() },
      phrase4: { value: '已到账' },
    });
  }

  // ─────────────────────────────────────────────
  // 内部工具方法
  // ─────────────────────────────────────────────

  /**
   * 获取用户的 openid
   */
  private async getUserOpenid(userId: string): Promise<string | null> {
    try {
      const rows = await this.dataSource.query(
        `SELECT openid FROM users WHERE id = $1 AND is_delete = false LIMIT 1`,
        [userId],
      );
      return rows[0]?.openid || null;
    } catch {
      return null;
    }
  }

  /**
   * 获取小程序 access_token
   */
  private accessToken: string | null = null;
  private accessTokenExpireAt: number = 0;

  private async getAccessToken(): Promise<string | null> {
    const appId = process.env.WECHAT_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;
    if (!appId || !appSecret) return null;

    if (this.accessToken && Date.now() < this.accessTokenExpireAt) {
      return this.accessToken;
    }

    try {
      const res = await axios.get<{ access_token: string; expires_in: number; errcode?: number }>(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`,
      );
      if (res.data.errcode) {
        this.logger.warn(`获取 access_token 失败: ${JSON.stringify(res.data)}`);
        return null;
      }
      this.accessToken = res.data.access_token;
      this.accessTokenExpireAt = Date.now() + (res.data.expires_in - 60) * 1000;
      return this.accessToken;
    } catch (e) {
      this.logger.warn(`获取 access_token 异常: ${e.message}`);
      return null;
    }
  }

  /**
   * 发送微信订阅消息
   */
  private async send(
    openid: string,
    templateId: string,
    data: Record<string, { value: string }>,
  ): Promise<void> {
    const token = await this.getAccessToken();
    if (!token) return;

    try {
      const res = await axios.post<{ errcode: number; errmsg: string }>(
        `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`,
        {
          touser: openid,
          template_id: templateId,
          data,
        },
      );
      if (res.data.errcode !== 0) {
        this.logger.warn(`发送微信通知失败 (openid=${openid}): ${JSON.stringify(res.data)}`);
      } else {
        this.logger.log(`✅ 微信通知发送成功 (openid=${openid}, tpl=${templateId})`);
      }
    } catch (e) {
      this.logger.warn(`发送微信通知异常: ${e.message}`);
    }
  }

  private formatNow(): string {
    return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  }
}
