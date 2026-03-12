/**
 * 管理员统计数据响应
 */
export class AdminStatsDto {
  /** 机构总数 */
  totalInstitutions: number;

  /** 资质审核待处理数（status=pending） */
  pendingAuditCount: number;

  /** 签约材料审核中（status=contract_review） */
  contractReviewCount: number;

  /** 已签约正式运营（status=approved） */
  contractSignedCount: number;

  /** 已驳回机构数 */
  rejectedInstitutions: number;

  /** 用户总数 */
  totalUsers: number;

  /** 课程总数 */
  totalCourses: number;

  /** 订单总数 */
  totalOrders: number;

  /** 预约总数 */
  totalBookings: number;

  /** 平台累计佣金（所有时间） */
  totalPlatformCommission: number;

  /** 期间佣金（按时间筛选） */
  periodPlatformCommission: number;

  /** 期间新增机构数 */
  periodInstitutions: number;

  /** 期间新增用户数 */
  periodUsers: number;

  /** 期间新增课程数 */
  periodCourses: number;

  /** 期间新增订单数 */
  periodOrders: number;

  /** 期间新增预约数 */
  periodBookings: number;

  /** @deprecated 兼容旧字段 = pendingAuditCount + contractReviewCount */
  pendingReview: number;

  /** @deprecated 兼容旧字段 = contractSignedCount */
  approvedInstitutions: number;
}
