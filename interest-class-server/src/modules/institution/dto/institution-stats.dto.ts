export interface InstitutionStatsDto {
  // === 基础数据 ===
  courseCount: number; // 课程数量
  studentCount: number; // 学员数量
  orderCount: number; // 订单数量
  teacherCount: number; // 教师数量
  classroomCount: number; // 教室数量
  completionRate: number; // 完课率（百分比，0-100）

  // === 营收数据 ===
  totalRevenue: number; // 总营收
  thisMonthRevenue: number; // 时段营收（根据筛选时段变化）
  todayRevenue: number; // 今日收入
  totalCommission: number; // 总佣金支出（平台已确认）
  thisMonthCommission: number; // 时段佣金支出
  todayCommission: number; // 今日佣金支出

  // === 待处理事项（机构管理员最关心的） ===
  pendingOrderCount: number; // 待确认订单数
  refundingOrderCount: number; // 退款处理中订单数
  pendingCancelBookingCount: number; // 取消预约待审核数
  pendingChangeBookingCount: number; // 修改预约待审核数

  // === 评价数据 ===
  avgRating: number; // 平均评分
  reviewCount: number; // 评价数量
}
