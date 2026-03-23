/**
 * 课程测试辅助方法
 * 提供课程相关的原子性操作
 */

import { TestHelper } from '../test-client';
import { createSchedule } from './schedule.helper';
import { createTeacher } from './teacher.helper';
import { createClassroom } from './classroom.helper';

export interface CreateCourseOptions {
  institutionId: string;
  title?: string;
  subtitle?: string;
  categoryCode?: string;
  type?: 'standard' | 'trial';
  minAge?: number;
  maxAge?: number;
  lessonDuration?: number;
  autoOnline?: boolean; // 是否自动上架（需要先创建排课）
  scheduleCount?: number; // 自动创建的排课数量（默认2）
  teacherId?: string; // 可选：指定教师ID，不传则自动创建
  classroomId?: string; // 可选：指定教室ID，不传则自动创建
}

/**
 * 创建课程
 * @param helper - TestHelper实例（机构管理员token）
 * @param options - 创建选项
 * @returns 课程ID
 */
export async function createCourse(
  helper: TestHelper,
  options: CreateCourseOptions,
): Promise<string> {
  const timestamp = Date.now();

  const courseData = {
    institution_id: options.institutionId,
    title: options.title || `测试课程_${timestamp}`,
    subtitle: options.subtitle || '专业教师授课',
    category_code: options.categoryCode || 'music',
    slider_imgs: [`https://picsum.photos/800/600?random=${timestamp}`],
    tags: ['测试', '优质'],
    description: '这是一个测试课程，内容丰富，适合各年龄段学员',
    min_age: options.minAge || 5,
    max_age: options.maxAge || 12,
    lesson_duration: options.lessonDuration || 60,
    type: options.type || 'standard',
    skus: [
      {
        name: '标准班（12节）',
        total_lessons: 12,
        total_price: 2400,
        cashback_type: 'percentage',
        cashback_value: 20,
      },
    ],
  };

  const courseId = await helper.post('/courses', courseData);

  // 自动上架（需要先创建排课，排课需要教师和教室）
  if (options.autoOnline) {
    // 获取或创建教师
    let teacherId = options.teacherId;
    if (!teacherId) {
      teacherId = await createTeacher(helper, {
        institutionId: options.institutionId,
        name: `测试教师_${timestamp}`,
      });
    }

    // 获取或创建教室
    let classroomId = options.classroomId;
    if (!classroomId) {
      classroomId = await createClassroom(helper, {
        institutionId: options.institutionId,
        name: `测试教室_${timestamp}`,
      });
    }

    // 创建排课（默认2个时段，避免测试时排课不足）
    const scheduleCount = options.scheduleCount ?? 2;
    for (let i = 0; i < scheduleCount; i++) {
      await createSchedule(helper, {
        institutionId: options.institutionId,
        courseId: courseId,
        teacherId: teacherId,
        classroomId: classroomId,
      });
    }
    // 然后上架
    await onlineCourse(helper, courseId);
  }

  return courseId;
}

/**
 * 上架课程
 */
export async function onlineCourse(
  helper: TestHelper,
  courseId: string,
): Promise<void> {
  await helper.put(`/courses/${courseId}/online`);
}

/**
 * 下架课程
 */
export async function offlineCourse(
  helper: TestHelper,
  courseId: string,
): Promise<void> {
  await helper.put(`/courses/${courseId}/offline`);
}

/**
 * 更新课程
 */
export async function updateCourse(
  helper: TestHelper,
  courseId: string,
  data: any,
): Promise<void> {
  await helper.put(`/courses/${courseId}`, data);
}

/**
 * 删除课程
 */
export async function deleteCourse(
  helper: TestHelper,
  courseId: string,
): Promise<void> {
  await helper.delete(`/courses/${courseId}`);
}

/**
 * 获取课程详情
 */
export async function getCourse(
  helper: TestHelper,
  courseId: string,
): Promise<any> {
  return helper.get(`/courses/${courseId}`);
}

/**
 * 获取课程列表
 */
/**
 * 获取课程列表（兼容分页和不分页）
 */
export async function getCourses(
  helper: TestHelper,
  options: {
    institutionId?: string;
    type?: string;
    is_online?: boolean;
    keyword?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<any> {
  return helper.get('/courses', options);
}

/**
 * 添加课程SKU
 */
export async function addCourseSku(
  helper: TestHelper,
  courseId: string,
  skuData: any,
): Promise<string> {
  return helper.post(`/courses/${courseId}/skus`, skuData);
}

/**
 * 更新课程SKU
 */
export async function updateCourseSku(
  helper: TestHelper,
  courseId: string,
  skuId: string,
  skuData: any,
): Promise<void> {
  await helper.put(`/courses/${courseId}/skus/${skuId}`, skuData);
}

/**
 * 删除课程SKU
 */
export async function deleteCourseSku(
  helper: TestHelper,
  courseId: string,
  skuId: string,
): Promise<void> {
  await helper.delete(`/courses/${courseId}/skus/${skuId}`);
}

/**
 * 查询附近课程
 */
export async function searchNearbyCourses(
  helper: TestHelper,
  options: {
    latitude: number;
    longitude: number;
    radius?: number; // 半径（km），默认10
    page?: number;
    pageSize?: number;
  },
) {
  return helper.get('/courses/nearby', {
    latitude: options.latitude,
    longitude: options.longitude,
    radius: options.radius || 10,
    page: options.page || 1,
    pageSize: options.pageSize || 10,
  });
}
