/**
 * 管理员统计数据响应
 */
export class AdminStatsDto {
  /**
   * 机构总数
   */
  totalInstitutions: number;

  /**
   * 待审核机构数
   */
  pendingReview: number;

  /**
   * 用户总数
   */
  totalUsers: number;

  /**
   * 已通过审核机构数
   */
  approvedInstitutions: number;

  /**
   * 已驳回机构数
   */
  rejectedInstitutions: number;

  /**
   * 课程总数
   */
  totalCourses: number;

  /**
   * 订单总数
   */
  totalOrders: number;

  /**
   * 预约总数
   */
  totalBookings: number;
}
