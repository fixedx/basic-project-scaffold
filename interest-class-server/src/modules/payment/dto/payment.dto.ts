import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

/**
 * 获取预支付订单参数
 */
export class PrepayDto {
  @IsNotEmpty({ message: '订单ID不能为空' })
  @IsString({ message: '订单ID必须是字符串' })
  order_id: string;

  @IsOptional()
  @IsString({ message: 'openid必须是字符串' })
  openid?: string;
}

/**
 * 微信支付回调参数（由微信服务器发送）
 */
export class WechatNotifyDto {
  // 微信支付回调的原始数据由控制器处理
}

/**
 * 预支付订单返回参数（用于前端调用 uni.requestPayment）
 */
export interface PrepayResult {
  // 小程序支付参数
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: 'RSA' | 'MD5';
  paySign: string;
  // 订单信息
  orderId: string;
  orderNo: string;
  amount: number;
}
