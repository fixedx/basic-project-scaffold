/**
 * 测试辅助方法统一导出
 * 提供所有实体的原子性操作
 */

// 机构相关
export * from './institution.helper';

// 课程相关
export * from './course.helper';

// 教室相关
export * from './classroom.helper';

// 教师相关
export * from './teacher.helper';

// 排课相关
export * from './schedule.helper';

/**
 * 使用示例：
 * 
 * import { 
 *   createInstitution, 
 *   createCourse,
 *   createClassroom 
 * } from './utils/test-helpers';
 * 
 * // 创建机构并自动审核通过
 * const institutionId = await createInstitution(userHelper, {
 *   name: '测试机构',
 *   autoApprove: true
 * });
 * 
 * // 使用机构token创建课程
 * const adminToken = await loginInstitution('inst_12345678');
 * const adminHelper = new TestHelper(adminToken);
 * const courseId = await createCourse(adminHelper, {
 *   institutionId,
 *   title: '钢琴课',
 *   autoOnline: true
 * });
 */
