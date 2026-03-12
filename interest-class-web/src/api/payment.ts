import { get, post } from '@/utils/request'

/**
 * 预支付订单参数
 */
export interface PrepayParams {
  order_id: string
  openid?: string
}

/**
 * 预支付订单返回（用于调用 uni.requestPayment）
 */
export interface PrepayResult {
  timeStamp: string
  nonceStr: string
  package: string
  signType: 'RSA' | 'MD5'
  paySign: string
  orderId: string
  orderNo: string
  amount: number
}

/**
 * 支付状态查询结果
 */
export interface PaymentStatusResult {
  status: string
  paid: boolean
  expireAt?: string
  remainingSeconds?: number
}

/**
 * 支付相关 API
 */
export const paymentApi = {
  /**
   * 创建预支付订单
   */
  prepay(params: PrepayParams): Promise<PrepayResult> {
    return post<PrepayResult>('/payment/prepay', params)
  },

  /**
   * 查询支付状态
   */
  queryStatus(orderId: string): Promise<PaymentStatusResult> {
    return get<PaymentStatusResult>(`/payment/status/${orderId}`)
  },
}
