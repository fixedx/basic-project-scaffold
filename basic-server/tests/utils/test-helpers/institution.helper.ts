/**
 * 机构测试辅助方法
 * 提供机构相关的原子性操作
 */

import { TestHelper } from '../test-client';
import { TestInstitution } from '../test-data';
import { generateAdminToken } from '../test-client';

export interface CreateInstitutionOptions {
  name?: string;
  latitude?: number;
  longitude?: number;
  province?: string;
  city?: string;
  district?: string;
  address?: string;
  logo?: string;
  categoryIds?: string[];
  autoSubmit?: boolean;  // 是否自动提交审核
  autoApprove?: boolean; // 是否自动通过审核
}

/**
 * 创建机构（包含账号）
 * @param helper - TestHelper实例
 * @param options - 创建选项
 * @returns { institutionId, phone, token }
 */
export async function createInstitution(
  helper: TestHelper,
  options: CreateInstitutionOptions = {},
): Promise<{ institutionId: string; phone: string; token: string }> {
  const timestamp = Date.now();
  const phone = `138${String(timestamp % 100000000).padStart(8, '0')}`;
  
  const institutionData = {
    ...TestInstitution.art(),
    name: options.name || `测试机构_${timestamp}`,
    latitude: options.latitude || 39.9289,
    longitude: options.longitude || 116.4354,
    province: options.province || '110000',
    city: options.city || '110100',
    district: options.district || '110105',
    address: options.address || '测试地址123号',
    logo: options.logo || `https://picsum.photos/200/200?random=${timestamp}`,
    category_ids: options.categoryIds || ['art'],
    id_card_imgs: [
      `https://picsum.photos/600/400?random=${timestamp}1`,
      `https://picsum.photos/600/400?random=${timestamp}2`,
    ],
    bank_name: '中国工商银行',
    bank_account: `622202${timestamp.toString().slice(-10)}`,
    account_holder: options.name || `测试机构_${timestamp}`,
    accounts: [
      {
        phone,
        real_name: '测试管理员',
        role: 'owner',
      },
    ],
  };

  const result = await helper.post('/institution', institutionData);
  const institutionId = result;

  // 获取机构token（使用手机号登录）
  const token = await loginInstitutionByPhone(phone);
  
  // 创建带token的helper用于后续操作
  const authHelper = new TestHelper(token);

  // 自动提交审核
  if (options.autoSubmit || options.autoApprove) {
    await submitInstitution(authHelper, institutionId);
  }

  // 自动通过审核
  if (options.autoApprove) {
    await approveInstitution(authHelper, institutionId);
  }

  return { institutionId, phone, token };
}

/**
 * 提交机构审核
 */
export async function submitInstitution(
  helper: TestHelper,
  institutionId: string,
): Promise<void> {
  await helper.post('/institution/submit', { institutionId });
}

/**
 * 审核通过机构（使用管理员token）
 */
export async function approveInstitution(
  _helper: TestHelper,
  institutionId: string,
): Promise<void> {
  // 审核接口需要 admin 角色，使用管理员 token
  const adminHelper = new TestHelper(generateAdminToken());
  await adminHelper.put(`/admin/audit/${institutionId}`, {
    auditStatus: 'approved',
  });
}

/**
 * 审核拒绝机构（使用管理员token）
 */
export async function rejectInstitution(
  _helper: TestHelper,
  institutionId: string,
  reason: string,
): Promise<void> {
  // 审核接口需要 admin 角色，使用管理员 token
  const adminHelper = new TestHelper(generateAdminToken());
  await adminHelper.put(`/admin/audit/${institutionId}`, {
    auditStatus: 'rejected',
    rejectReason: reason,
  });
}

/**
 * 更新机构信息
 */
export async function updateInstitution(
  helper: TestHelper,
  institutionId: string,
  data: any,
): Promise<void> {
  await helper.put(`/institution/${institutionId}`, data);
}

/**
 * 删除机构
 */
export async function deleteInstitution(
  helper: TestHelper,
  institutionId: string,
): Promise<void> {
  await helper.delete(`/institution/${institutionId}`);
}

/**
 * 获取机构详情
 */
export async function getInstitution(
  helper: TestHelper,
  institutionId: string,
): Promise<any> {
  return helper.get(`/institution/${institutionId}`);
}

/**
 * 获取机构列表（支持距离计算）
 */
/**
 * 获取机构列表（兼容分页和不分页）
 */
export async function getInstitutions(
  helper: TestHelper,
  options: {
    page?: number;
    pageSize?: number;
    status?: string;
    latitude?: number;
    longitude?: number;
  } = {},
) {
  const params: any = {};
  if (options.page !== undefined) params.page = options.page;
  if (options.pageSize !== undefined) params.pageSize = options.pageSize;
  if (options.status) params.status = options.status;
  if (options.latitude !== undefined) params.latitude = options.latitude;
  if (options.longitude !== undefined) params.longitude = options.longitude;
  
  return helper.get('/institution/list', params);
}

/**
 * 机构登录并返回token
 */
export async function loginInstitution(
  username: string,
  password: string = 'Test123456',
): Promise<string> {
  const loginHelper = new TestHelper();
  const result = await loginHelper.post('/auth/institution-login', {
    username,
    password,
  });
  return result.token;
}

/**
 * 机构手机号登录（使用mock code）
 */
export async function loginInstitutionByPhone(
  phone: string,
): Promise<string> {
  const loginHelper = new TestHelper();
  const mockCode = `phone_${phone}_${Date.now()}`;
  const result = await loginHelper.post('/auth/phone-login', {
    code: mockCode,
    type: 'institution',
  });
  return result.token;
}

/**
 * 查询附近机构
 */
export async function searchNearbyInstitutions(
  helper: TestHelper,
  options: {
    latitude: number;
    longitude: number;
    radius?: number; // 半径（km），默认10
    page?: number;
    pageSize?: number;
  },
) {
  return helper.get('/institution/nearby', {
    latitude: options.latitude,
    longitude: options.longitude,
    radius: options.radius || 10,
    page: options.page || 1,
    pageSize: options.pageSize || 10,
  });
}

/**
 * 按区域查询机构
 */
export async function searchInstitutionsByArea(
  helper: TestHelper,
  options: {
    province?: string;
    city?: string;
    district?: string;
    page?: number;
    pageSize?: number;
  },
) {
  return helper.get('/institution/search/area', {
    province: options.province,
    city: options.city,
    district: options.district,
    page: options.page || 1,
    pageSize: options.pageSize || 10,
  });
}
