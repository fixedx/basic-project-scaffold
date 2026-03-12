/**
 * 排课测试辅助方法
 * 提供排课相关的原子性操作
 */

import { TestHelper } from '../test-client';

export interface CreateScheduleOptions {
  institutionId: string;
  courseId: string;
  teacherId?: string;
  classroomId?: string;
  startTime?: Date;
  duration?: number; // 分钟
}

// 用于生成不同时间的计数器
let scheduleTimeOffset = 0;

/**
 * 创建排课
 * @param helper - TestHelper实例（机构管理员token）
 * @param options - 创建选项
 * @returns 排课ID
 */
export async function createSchedule(
  helper: TestHelper,
  options: CreateScheduleOptions,
): Promise<string> {
  // 每次调用增加时间偏移，避免时间冲突
  // 明天开始，每次增加 2 小时
  const timeOffset = scheduleTimeOffset * 2 * 60 * 60 * 1000; // 2小时增量
  scheduleTimeOffset++;
  
  const startTime = options.startTime || new Date(Date.now() + 86400000 + timeOffset); // 默认明天 + 偏移
  const duration = options.duration || 60;
  const endTime = new Date(startTime.getTime() + duration * 60000);

  // 计算星期几（0-6，0是周日）
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    startTime.getDay()
  ];

  const scheduleData = {
    course_id: options.courseId,
    teacher_id: options.teacherId,
    classroom_id: options.classroomId,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    day_of_week: dayOfWeek,
    max_students: 20,
  };

  const scheduleId = await helper.post('/schedule', scheduleData);
  return scheduleId;
}

/**
 * 更新排课
 */
export async function updateSchedule(
  helper: TestHelper,
  scheduleId: string,
  data: any,
): Promise<void> {
  await helper.put(`/schedule/${scheduleId}`, data);
}

/**
 * 删除排课
 */
export async function deleteSchedule(
  helper: TestHelper,
  scheduleId: string,
): Promise<void> {
  await helper.delete(`/schedule/${scheduleId}`);
}

/**
 * 获取排课详情
 */
export async function getSchedule(
  helper: TestHelper,
  scheduleId: string,
): Promise<any> {
  return helper.get(`/schedule/${scheduleId}`);
}

/**
 * 获取排课列表
 */
/**
 * 获取排课列表（兼容分页和不分页）
 */
export async function getSchedules(
  helper: TestHelper,
  options: {
    institution_id?: string;
    course_id?: string;
    teacher_id?: string;
    classroom_id?: string;
    day_of_week?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<any> {
  return helper.get('/schedule', options);
}

/**
 * 取消排课
 */
export async function cancelSchedule(
  helper: TestHelper,
  scheduleId: string,
): Promise<void> {
  await helper.put(`/schedule/${scheduleId}`, { status: 'cancelled' });
}
