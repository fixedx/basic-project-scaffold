import { http } from '@/utils/request';

/**
 * 荣誉记录（子表）
 */
export interface HonorItem {
  id?: string;
  title: string;
  img_url: string;
  honor_date?: string;
  sort_order?: number;
}

/**
 * 学员风采（子表）
 */
export interface ShowcaseItem {
  id?: string;
  title?: string;
  img_url: string;
  type?: 'student_work' | 'activity';
  description?: string;
  sort_order?: number;
}

/**
 * 教学环境（子表）
 */
export interface TeachingEnvItem {
  id?: string;
  title?: string;
  img_url: string;
  description?: string;
  sort_order?: number;
}

/**
 * 机构基础信息
 */
export interface InstitutionBaseInfo {
  name: string;
  logo?: string;
  introduction?: string;
  tags?: string;
  province?: string;
  city?: string;
  district?: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_phone: string;
  category_ids?: string[];
}

/**
 * 机构资质信息
 */
export interface InstitutionQualification {
  license_no?: string;
  license_img?: string;
  legal_person?: string;
  id_card_imgs?: {
    front: string;
    back: string;
  };
}

/**
 * 机构财务信息
 */
export interface InstitutionFinance {
  bank_name?: string;
  bank_account?: string;
  account_holder?: string;
}

/**
 * 完整机构信息
 */
export interface Institution {
  id: string
  name: string
  logo?: string
  introduction?: string
  tags?: string
  province?: string
  city?: string
  district?: string
  address: string
  latitude: number
  longitude: number
  contact_phone: string
  category_ids?: string[]
  honors?: HonorItem[]
  showcases?: ShowcaseItem[]
  teaching_environments?: TeachingEnvItem[]
  audit_status?: string
  /** 距离（米或公里，取决于后端返回） */
  distance?: number | string | null
  /** 最高立减金额 */
  max_discount_amount?: number
  /** 最高返现金额 */
  max_cashback_amount?: number
  /** 平均评分（默认4.0） */
  avg_rating?: number
  /** 评价数量 */
  review_count?: number
  created_at: string
  updated_at: string
}

export interface InstitutionInfo
  extends InstitutionBaseInfo,
    InstitutionQualification,
    InstitutionFinance {
  id: string;
  audit_status: string;
  reject_reason?: string;
  commission_type: string;
  commission_value: number;
  balance: number;
  honors?: HonorItem[];
  showcases?: ShowcaseItem[];
  teaching_environments?: TeachingEnvItem[];
  /** 签约凭证截图URL */
  contract_screenshot?: string;
  /** 签约时间 */
  contract_signed_at?: string;
  /** 平均评分（默认4.0） */
  avg_rating?: number;
  /** 评价数量 */
  review_count?: number;
  /** 距离（后端动态计算） */
  distance?: number | string | null;
  /** 最高立减金额（后端动态计算） */
  max_discount_amount?: number;
  /** 最高返现金额（后端动态计算） */
  max_cashback_amount?: number;
  created_at: string;
  updated_at: string;
}

/**
 * 账号信息
 */
export interface AccountInfo {
  username: string;
  password: string;
  real_name?: string;
  role?: string;
  remark?: string;
}

/**
 * 创建机构参数
 */
export type CreateInstitutionParams = InstitutionBaseInfo &
  Partial<InstitutionQualification> &
  Partial<InstitutionFinance> & {
    // 账号数组（至少一个）
    accounts: AccountInfo[];
    // 品牌宣传子表
    honors?: HonorItem[];
    showcases?: ShowcaseItem[];
    teaching_environments?: TeachingEnvItem[];
  };

/**
 * 更新机构参数
 */
export type UpdateInstitutionParams = Partial<CreateInstitutionParams>;

/**
 * 机构统计数据
 */
export interface InstitutionStats {
  // 基础数据
  courseCount: number;
  studentCount: number;
  orderCount: number;
  teacherCount: number;
  classroomCount: number;
  completionRate: number;
  // 营收数据
  totalRevenue: number;
  thisMonthRevenue: number;
  todayRevenue: number;
  // 待处理事项
  pendingOrderCount: number;
  refundingOrderCount: number;
  pendingCancelBookingCount: number;
  // 评价数据
  avgRating: number;
  reviewCount: number;
}

/**
 * 学员课程进度
 */
export interface StudentCourseProgress {
  orderId: string;
  courseId: string;
  courseName: string;
  skuName: string;
  totalLessons: number;
  completedLessons: number;
  orderStatus: string;
  paidAmount: number;
  createdAt: string;
}

/**
 * 学员信息
 */
export interface StudentInfo {
  childId: string | null;
  name: string;
  avatar: string | null;
  gender: string | null;
  birthday: string | null;
  age: number | null;
  phone: string | null;
  parentUserId: string;
  totalCourses: number;
  totalLessons: number;
  completedLessons: number;
  courses: StudentCourseProgress[];
}

/**
 * 机构账号
 */
export interface InstitutionAccount {
  id?: string;
  institution_id: string;
  username: string;
  password?: string;
  real_name?: string;
  role?: string;
  remark?: string;
  is_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * 创建机构账号参数
 */
export interface CreateInstitutionAccountParams {
  institution_id: string;
  username: string;
  password: string;
  real_name?: string;
  role?: string;
  remark?: string;
  is_enabled?: boolean;
}

/**
 * 更新机构账号参数
 */
export interface UpdateInstitutionAccountParams {
  username?: string;
  password?: string;
  real_name?: string;
  role?: string;
  remark?: string;
  is_enabled?: boolean;
}

/**
 * 机构API
 */
export const institutionApi = {
  /**
   * 创建机构（草稿）
   * 后端返回 string 类型的机构ID
   */
  create(data: CreateInstitutionParams) {
    return http.post<string>('/institution', data);
  },

  /**
   * 更新机构信息
   */
  update(id: string, data: UpdateInstitutionParams) {
    return http.put<{ message: string }>(`/institution/${id}`, data);
  },

  /**
   * 提交审核
   */
  submit(institutionId: string) {
    return http.post<{ message: string }>('/institution/submit', {
      institutionId,
    });
  },

  /**
   * 提交签约凭证
   */
  submitContract(id: string, data: { contract_screenshot: string }) {
    return http.put<{ message: string }>(`/institution/${id}/submit-contract`, data);
  },

  /**
   * 获取我的机构（单个，向后兼容）
   */
  getMyInstitution() {
    return http.get<InstitutionInfo | null>('/institution/my');
  },

  /**
   * 获取我的所有机构列表
   */
  getMyInstitutions() {
    return http.get<InstitutionInfo[]>('/institution/my-list');
  },

  /**
   * 获取当前机构信息（机构端使用）
   */
  getCurrentInstitution() {
    return http.get<InstitutionInfo>('/institution/current');
  },

  /**
   * 获取机构统计数据（机构端使用）
   * @param params 可选的时间筛选参数
   */
  getInstitutionStats(params?: {
    period?: 'thisMonth' | 'threeMonths' | 'halfYear' | 'oneYear' | 'all' | 'custom';
    startDate?: string;
    endDate?: string;
    teacherStatus?: string;
  }) {
    return http.get<InstitutionStats>('/institution/stats', params);
  },

  /**
   * 获取机构学员列表
   */
  getStudentList(params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return http.get<{
      data: StudentInfo[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>('/institution/students', params);
  },

  /**
   * 根据ID获取机构详情
   */
  getById(id: string) {
    return http.get<InstitutionInfo>(`/institution/${id}`);
  },

  /**
   * 获取机构列表（支持筛选）
   */
  getList(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    category?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  }) {
    return http.get<{
      data: InstitutionInfo[];
      total: number;
      page: number;
      pageSize: number;
    }>('/institution/list', params);
  },

  /**
   * 获取已审核通过的机构列表
   */
  getApprovedList(page: number = 1, pageSize: number = 10) {
    return http.get<{
      data: InstitutionInfo[];
      total: number;
      page: number;
      pageSize: number;
    }>('/institution', { page, pageSize });
  },

  /**
   * 创建机构账号
   */
  createAccount(data: CreateInstitutionAccountParams) {
    return http.post<{ id: string }>('/institution/account', data);
  },

  /**
   * 更新机构账号
   */
  updateAccount(id: string, data: UpdateInstitutionAccountParams) {
    return http.put<{ message: string }>(`/institution/account/${id}`, data);
  },

  /**
   * 删除机构账号
   */
  deleteAccount(id: string) {
    return http.delete<{ message: string }>(`/institution/account/${id}`);
  },

  /**
   * 获取机构账号列表
   */
  getAccountsByInstitutionId(institutionId: string) {
    return http.get<InstitutionAccount[]>(`/institution/account/list/${institutionId}`);
  },
};
