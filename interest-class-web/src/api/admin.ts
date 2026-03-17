import { http } from '@/utils/request';
import type { InstitutionInfo, UpdateInstitutionParams } from './institution';
import type { Order } from './order';

/**
 * 平台管理员统计数据
 */
export interface AdminStats {
  totalInstitutions: number;
  /** 资质审核待处理（status=pending） */
  pendingAuditCount: number;
  /** 签约材料审核中（status=contract_review） */
  contractReviewCount: number;
  /** 已签约正式运营（status=approved） */
  contractSignedCount: number;
  rejectedInstitutions: number;
  totalUsers: number;
  totalCourses: number;
  totalOrders: number;
  totalBookings: number;
  /** 平台累计佣金 */
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
  /** @deprecated 兼容旧字段 */
  pendingReview: number;
  /** @deprecated 兼容旧字段 */
  approvedInstitutions: number;
}

/**
 * 获取统计数据参数
 */
export interface AdminStatsParams {
  period?: 'today' | 'thisWeek' | 'thisMonth' | 'threeMonths' | 'halfYear' | 'oneYear' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
}

/**
 * 审核机构参数
 */
export interface AuditInstitutionParams {
  auditStatus: 'approved' | 'rejected';
  rejectReason?: string;
}

/**
 * 审核签约参数
 */
export interface ReviewContractParams {
  status: 'approved' | 'rejected';
  rejectReason?: string;
}

/**
 * 设置佣金参数
 */
export interface SetCommissionParams {
  commissionType: 'percentage' | 'fixed_amount';
  commissionValue: number;
}

/**
 * 管理员 API
 */
export const adminApi = {
  /**
   * 获取平台统计数据（支持时间筛选）
   */
  getStats(params?: AdminStatsParams) {
    return http.get<AdminStats>('/admin/stats', params);
  },

  /**
   * 获取机构列表（带筛选和分页）
   */
  getInstitutionList(page: number = 1, pageSize: number = 10, auditStatus?: string) {
    return http.get<{
      data: InstitutionInfo[];
      total: number;
      page: number;
      pageSize: number;
    }>('/admin/institutions', { page, pageSize, auditStatus });
  },

  /**
   * 审核机构
   */
  audit(id: string, data: AuditInstitutionParams) {
    return http.put<{ message: string }>(`/admin/audit/${id}`, data);
  },

  /**
   * 编辑机构信息
   */
  updateInstitution(id: string, data: UpdateInstitutionParams) {
    return http.put<boolean>(`/admin/institution/${id}`, data);
  },

  /**
   * 审核签约凭证
   */
  reviewContract(id: string, data: ReviewContractParams) {
    return http.put<{ message: string }>(`/admin/contract/${id}`, data);
  },

  /**
   * 设置机构佣金
   */
  setCommission(id: string, data: SetCommissionParams) {
    return http.put<boolean>(`/admin/commission/${id}`, data);
  },

  /**
   * 获取所有订单列表（管理员）
   */
  getOrders(params?: {
    page?: number
    pageSize?: number
    status?: string
    period?: string
    startDate?: string
    endDate?: string
    commissionOnly?: boolean
  }) {
    return http.get<{
      data: Order[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }>('/admin/orders', params);
  },

  /**
   * 获取订单详情（管理员）
   */
  getOrderDetail(id: string) {
    return http.get<Order>(`/admin/orders/${id}`);
  },

  /**
   * 获取用户列表（管理员）
   */
  getUsers(params?: { page?: number; pageSize?: number; keyword?: string }) {
    return http.get<{
      data: any[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }>('/admin/users', params);
  },
};
