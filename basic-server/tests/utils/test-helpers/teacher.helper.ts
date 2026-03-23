/**
 * 教师测试辅助方法
 * 提供教师相关的原子性操作
 */

import { TestHelper } from '../test-client';
import { TestTeacher } from '../test-data';

export interface CreateTeacherOptions {
  institutionId: string;
  name?: string;
  gender?: 'male' | 'female';
  subjects?: string[];
  status?: 'active' | 'inactive';
}

/**
 * 创建教师
 * @param helper - TestHelper实例（机构管理员token）
 * @param options - 创建选项
 * @returns 教师ID
 */
export async function createTeacher(
  helper: TestHelper,
  options: CreateTeacherOptions,
): Promise<string> {
  const timestamp = Date.now();
  const baseData = TestTeacher.dance(options.institutionId);

  const teacherData = {
    institution_id: options.institutionId,
    name: options.name || `测试教师_${timestamp}`,
    gender: options.gender || baseData.gender,
    phone: `138${timestamp.toString().slice(-8)}`,
    photo: baseData.photo,
    subjects: options.subjects || baseData.subjects,
    title: baseData.title,
    years_of_experience: baseData.years_of_experience,
    bio: baseData.bio,
    certificates: baseData.certificates,
    status: options.status || 'active',
  };

  const teacherId = await helper.post('/teacher', teacherData);
  return teacherId;
}

/**
 * 更新教师
 */
export async function updateTeacher(
  helper: TestHelper,
  teacherId: string,
  data: any,
): Promise<void> {
  await helper.put(`/teacher/${teacherId}`, data);
}

/**
 * 删除教师
 */
export async function deleteTeacher(
  helper: TestHelper,
  teacherId: string,
): Promise<void> {
  await helper.delete(`/teacher/${teacherId}`);
}

/**
 * 获取教师详情
 */
export async function getTeacher(
  helper: TestHelper,
  teacherId: string,
): Promise<any> {
  return helper.get(`/teacher/${teacherId}`);
}

/**
 * 获取教师列表（兼容分页和不分页）
 */
export async function getTeachers(
  helper: TestHelper,
  options: {
    institutionId?: string;
    keyword?: string;
    status?: string;
    subject?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<any> {
  return helper.get('/teacher', options);
}

/**
 * 批量更新教师排序
 */
export async function sortTeachers(
  helper: TestHelper,
  sortData: Array<{ id: string; sort_order: number }>,
): Promise<void> {
  await helper.post('/teacher/sort', sortData);
}
