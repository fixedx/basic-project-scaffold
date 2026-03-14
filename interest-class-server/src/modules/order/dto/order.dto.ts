import { IsNotEmpty, IsString, IsInt, IsOptional, IsArray, ArrayMinSize, IsNumber, Min, IsBoolean } from 'class-validator';

/**
 * 计算订单金额 DTO（前端调用，获取费用明细）
 */
export class CalculateOrderAmountDto {
  @IsNotEmpty({ message: '课程ID不能为空' })
  @IsString({ message: '课程ID必须是字符串' })
  course_id: string;

  @IsNotEmpty({ message: 'SKU ID不能为空' })
  @IsString({ message: 'SKU ID必须是字符串' })
  sku_id: string;

  @IsOptional()
  @IsInt({ message: '数量必须是整数' })
  quantity?: number;

  @IsOptional()
  @IsString({ message: '邀请码必须是字符串' })
  invite_code?: string;

  @IsOptional()
  @IsBoolean({ message: '是否使用余额必须是布尔值' })
  use_balance?: boolean;
}

/**
 * 金额计算结果（后端统一返回给前端展示）
 */
export interface OrderAmountResult {
  /** 是否体验课 */
  is_trial: boolean;
  /** 课程总价 */
  original_price: number;
  /** 用户展示价格（原价 + 平台佣金），前端直接展示此字段 */
  display_price: number;
  /** 返现比例 */
  cashback_ratio: number;
  /** 线上定金基数（课程总价 × 返现比例） */
  online_pay_base: number;
  /** 邀请码优惠金额 */
  invite_discount: number;
  /** 余额抵扣金额 */
  balance_deduct: number;
  /** 总优惠金额 */
  total_discount: number;
  /** 线上实际支付金额（定金 - 邀请优惠 - 余额抵扣） */
  online_pay_amount: number;
  /** 线下支付金额（尾款） */
  offline_pay_amount: number;
  /** 实付金额（线上 + 线下） */
  paid_amount: number;
  /** 用户可用余额 */
  user_balance: number;
  /** SKU 返现金额（课程总价 × 返现比例） */
  max_cashback_amount: number;
  /** SKU 立减金额（返现 × 最高让利比例） */
  max_discount_amount: number;
  /** 最高让利比例 */
  max_share_ratio: number;
  /** 平台服务费金额 */
  commission_amount: number;
}

/**
 * 创建订单 DTO
 * 用户报名课程时创建订单，同时会自动创建关联的预约记录
 */
export class CreateOrderDto {
  @IsNotEmpty({ message: '课程ID不能为空' })
  @IsString({ message: '课程ID必须是字符串' })
  course_id: string;

  @IsNotEmpty({ message: 'SKU ID不能为空' })
  @IsString({ message: 'SKU ID必须是字符串' })
  sku_id: string;

  @IsOptional()
  @IsInt({ message: '数量必须是整数' })
  quantity?: number;  // 默认为 1

  // ===== 预约信息（创建订单时自动创建预约）=====
  
  @IsOptional()
  @IsString({ message: '宝贝ID必须是字符串' })
  child_id?: string;

  @IsNotEmpty({ message: '学员姓名不能为空' })
  @IsString({ message: '学员姓名必须是字符串' })
  student_name: string;

  @IsOptional()
  @IsString({ message: '学员手机号必须是字符串' })
  student_phone?: string;

  @IsOptional()
  @IsInt({ message: '学员年龄必须是整数' })
  student_age?: number;

  @IsOptional()
  @IsArray({ message: '排课ID列表必须是数组' })
  @IsString({ each: true, message: '排课ID必须是字符串' })
  @ArrayMinSize(1, { message: '至少选择一个上课时段' })
  schedule_ids?: string[];

  // ===== 其他订单信息 =====

  @IsOptional()
  @IsString({ message: '优惠券ID必须是字符串' })
  coupon_id?: string;

  @IsOptional()
  @IsString({ message: '支付方式必须是字符串' })
  payment_method?: 'offline' | 'wechat' | 'alipay';  // 默认为 offline

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  remark?: string;

  // ===== 邀友让利相关 =====

  @IsOptional()
  @IsString({ message: '邀请码必须是字符串' })
  invite_code?: string;

  @IsOptional()
  @IsNumber({}, { message: '余额抵扣金额必须是数字' })
  @Min(0, { message: '余额抵扣金额不能为负数' })
  use_balance_amount?: number;
}

/**
 * 退款金额计算结果
 */
export interface RefundInfo {
  /** 是否可退款 */
  refundable: boolean;
  /** 剩余课时比例 (0-1) */
  remaining_ratio: number;
  /** 退款总金额 */
  total_refund_amount: number;
  /** 线上退款金额（原路退回微信） */
  online_refund_amount: number;
  /** 线下退款金额（到店退回） */
  offline_refund_amount: number;
  /** 已完成课时数 */
  completed_lessons: number;
  /** 总课时数 */
  total_lessons: number;
}

/**
 * 确认支付 DTO
 */
export class ConfirmPaymentDto {
  @IsOptional()
  @IsString({ message: '交易号必须是字符串' })
  transaction_no?: string;
}

/**
 * 申请退款 DTO
 */
export class RefundDto {
  @IsNotEmpty({ message: '退款原因不能为空' })
  @IsString({ message: '退款原因必须是字符串' })
  refund_reason: string;
}
