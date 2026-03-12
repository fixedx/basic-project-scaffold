/**
 * 教室测试辅助方法
 * 提供教室相关的原子性操作
 */

import { TestHelper } from '../test-client';
import { TestClassroom } from '../test-data';

export interface CreateClassroomOptions {
  institutionId: string;
  name?: string;
  area?: number;
  capacity?: number;
  floor?: string;
  status?: 'available' | 'maintenance' | 'unavailable';
}

/**
 * 创建教室
 * @param helper - TestHelper实例（机构管理员token）
 * @param options - 创建选项
 * @returns 教室ID
 */
export async function createClassroom(
  helper: TestHelper,
  options: CreateClassroomOptions,
): Promise<string> {
  const timestamp = Date.now();
  const baseData = TestClassroom.dance(options.institutionId);

  const classroomData = {
    institution_id: options.institutionId,
    name: options.name || `测试教室_${timestamp}`,
    area: options.area || baseData.area,
    capacity: options.capacity || baseData.capacity,
    floor: options.floor || baseData.floor,
    facilities: baseData.facilities,
    status: options.status || 'available',
    description: baseData.description,
  };

  const classroomId = await helper.post('/classroom', classroomData);
  return classroomId;
}

/**
 * 更新教室
 */
export async function updateClassroom(
  helper: TestHelper,
  classroomId: string,
  data: any,
): Promise<void> {
  await helper.put(`/classroom/${classroomId}`, data);
}

/**
 * 删除教室
 */
export async function deleteClassroom(
  helper: TestHelper,
  classroomId: string,
): Promise<void> {
  await helper.delete(`/classroom/${classroomId}`);
}

/**
 * 获取教室详情
 */
export async function getClassroom(
  helper: TestHelper,
  classroomId: string,
): Promise<any> {
  return helper.get(`/classroom/${classroomId}`);
}

/**
 * 获取教室列表（兼容分页和不分页）
 */
export async function getClassrooms(
  helper: TestHelper,
  options: {
    institutionId?: string;
    keyword?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<any> {
  return helper.get('/classroom', options);
}

/**
 * 批量更新教室排序
 */
export async function sortClassrooms(
  helper: TestHelper,
  sortData: Array<{ id: string; sort_order: number }>,
): Promise<void> {
  await helper.post('/classroom/sort', sortData);
}
