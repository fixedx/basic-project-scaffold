import { get, post, put } from '@/utils/request'

export interface InviteCodeInfo {
  id: string
  user_id: string
  invite_code: string
  share_ratio: number
  status: 'active' | 'frozen' | 'disabled'
  use_count: number
  daily_use_count: number
  total_pending_cashback: number
  total_unlocked_cashback: number
  created_at: string
}

export interface InviteOrder {
  id: string
  invite_code_id: string
  inviter_id: string
  invitee_id: string
  order_id: string
  course_id: string
  institution_id: string
  cashback_ratio: number
  share_ratio: number
  order_amount: number
  cashback_total: number
  discount_amount: number
  actual_cashback: number
  total_lessons: number
  completed_lessons: number
  unlock_ratio: number
  unlocked_amount: number
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
}

export interface BalanceInfo {
  available: number
  frozen: number
  total_earned: number
  total_withdrawn: number
  total_used: number
  can_withdraw: boolean
  withdraw_min_amount: number
}

export interface InviteStats {
  inviteCode: {
    code: string
    status: string
    share_ratio: number
    use_count: number
  } | null
  stats: {
    totalInvites: number
    totalCashback: number
    pendingCashback: number
    unlockedCashback: number
  }
  balance: {
    available: number
    frozen: number
    total_earned: number
    total_withdrawn: number
    total_used: number
  }
}

export interface CashbackRecord {
  id: string
  user_id: string
  invite_order_id?: string
  amount: number
  balance_before: number
  balance_after: number
  type: 'unlock' | 'withdraw' | 'deduct' | 'refund'
  remark?: string
  created_at: string
}

export interface WithdrawRecord {
  id: string
  user_id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed'
  reject_reason?: string
  completed_at?: string
  created_at: string
}

export interface ValidateResult {
  valid: boolean
  message?: string
  inviteCode?: InviteCodeInfo
}

export interface DiscountResult {
  cashback_ratio: number
  share_ratio: number
  cashback_total: number
  discount_amount: number
  actual_cashback: number
}

export interface AvailableInviteCode {
  invite_code: string
  share_ratio: number
  discount_amount: number
  inviter_cashback: number
}

export const inviteApi = {
  /**
   * 获取我的邀请码
   */
  getMyInviteCode() {
    return get<InviteCodeInfo>('/invite/code')
  },

  /**
   * 设置让利比例
   */
  setShareRatio(share_ratio: number) {
    return put<boolean>('/invite/share-ratio', { share_ratio })
  },

  /**
   * 冻结邀请码
   */
  freezeInviteCode() {
    return post<boolean>('/invite/code/freeze')
  },

  /**
   * 解冻邀请码
   */
  unfreezeInviteCode() {
    return post<boolean>('/invite/code/unfreeze')
  },

  /**
   * 重置邀请码
   */
  resetInviteCode() {
    return post<InviteCodeInfo>('/invite/code/reset')
  },

  /**
   * 获取可用邀请码列表（按立减金额排序）
   */
  getAvailableInviteCodes(order_amount: number, cashback_ratio: number) {
    return get<AvailableInviteCode[]>('/invite/available', {
      order_amount,
      cashback_ratio,
    })
  },

  /**
   * 验证邀请码有效性（公开接口）
   */
  validateInviteCode(invite_code: string, course_id: string) {
    return post<ValidateResult>('/invite/validate', { invite_code, course_id })
  },

  /**
   * 计算立减金额（公开接口）
   */
  calculateDiscount(invite_code: string, order_amount: number) {
    return post<DiscountResult>('/invite/calculate-discount', {
      invite_code,
      order_amount,
    })
  },

  /**
   * 获取邀请统计
   */
  getInviteStats() {
    return get<InviteStats>('/invite/stats')
  },

  /**
   * 获取邀请订单列表
   */
  getInviteOrders(params?: { status?: string; page?: number; pageSize?: number }) {
    return get<{ data: InviteOrder[]; total: number }>('/invite/orders', params)
  },

  /**
   * 获取我的余额
   */
  getBalance() {
    return get<BalanceInfo>('/invite/balance')
  },

  /**
   * 申请提现
   */
  applyWithdraw(amount: number) {
    return post<string>('/invite/withdraw', { amount })
  },

  /**
   * 获取流水记录
   */
  getCashbackRecords(params?: { page?: number; pageSize?: number; type?: string }) {
    return get<{ data: CashbackRecord[]; total: number }>('/invite/cashback-records', params)
  },

  /**
   * 获取提现记录
   */
  getWithdrawRecords(params?: { page?: number; pageSize?: number; status?: string }) {
    return get<{ data: WithdrawRecord[]; total: number }>('/invite/withdraw-records', params)
  },

  /**
   * 余额抵扣
   */
  deductBalance(amount: number, order_id: string, remark?: string) {
    return post<boolean>('/invite/deduct', { amount, order_id, remark })
  },
}
