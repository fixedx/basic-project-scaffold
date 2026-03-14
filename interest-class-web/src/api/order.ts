import { get, post, put } from '@/utils/request'

/**
 * 计算订单金额参数
 */
export interface CalculateOrderAmountParams {
  course_id: string
  sku_id: string
  quantity?: number
  invite_code?: string
  use_balance?: boolean
}

/**
 * 金额计算结果（后端统一返回给前端展示）
 */
export interface OrderAmountResult {
  /** 是否体验课 */
  is_trial: boolean
  /** 课程总价 */
  original_price: number
  /** 用户展示价格（原价 + 平台佣金），前端直接展示此字段 */
  display_price: number
  /** 返现比例 */
  cashback_ratio: number
  /** 线上定金基数（课程总价 × 返现比例） */
  online_pay_base: number
  /** 邀请码优惠金额 */
  invite_discount: number
  /** 余额抵扣金额 */
  balance_deduct: number
  /** 总优惠金额 */
  total_discount: number
  /** 线上实际支付金额（定金 - 邀请优惠 - 余额抵扣） */
  online_pay_amount: number
  /** 线下支付金额（尾款） */
  offline_pay_amount: number
  /** 实付金额（线上 + 线下） */
  paid_amount: number
  /** 用户可用余额 */
  user_balance: number
  /** SKU 返现金额 */
  max_cashback_amount: number
  /** SKU 立减金额 */
  max_discount_amount: number
  /** 最高让利比例 */
  max_share_ratio: number
  /** 平台服务费 */
  commission_amount: number
}

/**
 * 机构快照
 */
export interface InstitutionSnapshot {
  id: string
  name: string
  contact_phone?: string
  address?: string
  business_hours?: string
}

/**
 * 课程快照
 */
export interface CourseSnapshot {
  id: string
  title: string
  subtitle?: string
  cover_img?: string
  type?: string  // trial-试听课, standard-正式课
  age_range_min?: number
  age_range_max?: number
}

/**
 * SKU快照
 */
export interface SkuSnapshot {
  id: string
  name: string
  original_price: number
  class_count: number
  class_duration: number
  cashback_type: string
  cashback_value: number
}

/**
 * 退款金额计算结果
 */
export interface RefundInfo {
  /** 是否可退款 */
  refundable: boolean
  /** 剩余课时比例 (0-1) */
  remaining_ratio: number
  /** 退款总金额 */
  total_refund_amount: number
  /** 线上退款金额（原路退回微信） */
  online_refund_amount: number
  /** 线下退款金额（到店退回） */
  offline_refund_amount: number
  /** 已完成课时数 */
  completed_lessons: number
  /** 总课时数 */
  total_lessons: number
}

/**
 * 订单信息接口
 */
export interface Order {
  id: string
  order_no: string
  user_id: string
  institution_id: string
  course_id: string
  sku_id: string
  booking_id?: string
  course_name: string
  sku_name: string
  quantity: number
  total_lessons: number      // 总课时数
  completed_lessons: number  // 已完成课时数
  original_price: number
  paid_amount: number
  discount_amount: number
  cashback_amount: number
  online_pay_amount: number   // 线上支付金额（微信支付）
  offline_pay_amount: number  // 线下支付金额（到店支付）
  commission_amount?: number  // 平台佣金金额
  status: 'pending' | 'pending_confirm' | 'confirmed' | 'refund_pending' | 'refunding' | 'refund_rejected' | 'refunded' | 'cancelled' | 'completed'
  payment_method: 'offline' | 'wechat' | 'alipay'
  transaction_no?: string
  paid_at?: string
  refunded_at?: string
  cancelled_at?: string
  completed_at?: string
  expire_at?: string  // 支付过期时间
  student_name?: string
  student_phone?: string
  remark?: string
  refund_reason?: string
  // 快照字段
  institution_snapshot?: InstitutionSnapshot
  course_snapshot?: CourseSnapshot
  sku_snapshot?: SkuSnapshot
  refund_info?: RefundInfo
  created_at: string
  updated_at: string
}

/**
 * 创建订单参数
 * 创建订单时会同时创建关联的预约记录
 */
export interface CreateOrderParams {
  course_id: string
  sku_id: string
  quantity?: number  // 默认为 1
  
  // 预约信息
  child_id?: string
  student_name: string
  student_phone?: string
  student_age?: number
  schedule_ids?: string[]  // 选择的排课时段
  
  // 其他订单信息
  payment_method?: 'offline' | 'wechat' | 'alipay'  // 默认为 offline
  remark?: string

  // 邀友让利相关
  invite_code?: string           // 邀请码
  use_balance_amount?: number    // 余额抵扣金额
}

/**
 * 确认支付参数
 */
export interface ConfirmPaymentParams {
  transaction_no?: string
}

/**
 * 申请退款参数
 */
export interface RefundParams {
  refund_reason: string
}

/**
 * 订单API
 */
export const orderApi = {
  /**
   * 计算订单金额（后端统一计算，前端不做任何金额计算）
   */
  calculateAmount(data: CalculateOrderAmountParams) {
    return post<OrderAmountResult>('/order/calculate', data)
  },

  /**
   * 创建订单
   */
  create(data: CreateOrderParams) {
    return post<{ id: string }>('/order', data)
  },

  /**
   * 查询我的订单列表
   */
  getMyList(params?: { page?: number; pageSize?: number; status?: string }) {
    return get<{
      data: Order[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }>('/order/my', params)
  },

  /**
   * 查询机构订单列表
   */
  getInstitutionList(
    institutionId: string,
    params?: { page?: number; pageSize?: number; status?: string; period?: string; startDate?: string; endDate?: string }
  ) {
    return get<{
      data: Order[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }>(`/order/institution/${institutionId}`, params)
  },

  /**
   * 查询机构收入统计
   */
  getInstitutionRevenue(institutionId: string) {
    return get<{ revenue: number }>(`/order/institution/${institutionId}/revenue`)
  },

  /**
   * 根据订单号查询
   */
  getByOrderNo(orderNo: string) {
    return get<Order>(`/order/order-no/${orderNo}`)
  },

  /**
   * 查询订单详情
   */
  getDetail(id: string) {
    return get<Order>(`/order/${id}`)
  },

  /**
   * 确认支付（机构端）
   */
  confirmPayment(id: string, data?: ConfirmPaymentParams) {
    return put(`/order/${id}/confirm-payment`, data || {})
  },

  /**
   * 机构确认订单（将待确认变为已确认）
   */
  confirm(id: string) {
    return put(`/order/${id}/confirm`)
  },

  /**
   * 申请退款（用户端）
   */
  applyRefund(id: string, data: RefundParams) {
    return put(`/order/${id}/apply-refund`, data)
  },

  /**
   * 处理退款（机构端）
   */
  processRefund(id: string, approved: boolean, reason?: string) {
    return put(`/order/${id}/process-refund`, { approved, reason })
  },

  /**
   * 取消订单（用户端）
   */
  cancel(id: string) {
    return put(`/order/${id}/cancel`)
  },

  /**
   * 完成订单（机构端）
   */
  complete(id: string) {
    return put(`/order/${id}/complete`)
  },
}
