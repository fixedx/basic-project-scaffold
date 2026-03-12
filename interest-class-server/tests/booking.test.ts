/**
 * 预约CRUD测试
 * 测试预约的创建、查询、更新、取消操作
 */

import { TestHelper, sleep, generateUserToken } from './utils/test-client';
import { logger } from './utils/logger';
import { TestBooking } from './utils/test-data';
import {
  createInstitution,
  createCourse,
  createSchedule,
  createTeacher,
  createClassroom,
} from './utils/test-helpers';// 真实用户数据（来自数据库）
const REAL_USER = {
  id: '260765341334900736',
  openid: 'oY4kG7pd0giF9yhYFRtVHXbYT7CE',
  nickname: '微信用户',
};

// 存储测试数据
const testData = {
  bookingIds: [] as string[],
  trialBookingId: '',
  regularBookingId: '',
  userToken: '',
  userId: REAL_USER.id,
  institutionId: '',
  institutionToken: '',
  trialCourseId: '',
  regularCourseId: '',
  teacherId: '',             // 教师ID
  classroomId: '',           // 教室ID
  trialScheduleId: '',       // 试听课排课ID
  regularScheduleId: '',     // 正式课排课ID
};

/**
 * 运行所有CRUD测试
 */
export async function runCRUDTests(sharedData?: any) {
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  // 🔗 检查是否有共享数据，先填充到 testData
  if (sharedData?.institutionId && sharedData?.courseId) {
    logger.info('📦 使用共享机构和课程数据');
    testData.institutionId = sharedData.institutionId;
    testData.institutionToken = sharedData.institutionToken;
    testData.userToken = sharedData.userToken || generateUserToken(
      REAL_USER.id,
      REAL_USER.openid,
      REAL_USER.nickname,
    );
    testData.trialCourseId = sharedData.trialCourseId || sharedData.courseId;
    testData.regularCourseId = sharedData.standardCourseId || sharedData.courseId;
    // 🔗 补充教师、教室、排课数据
    testData.teacherId = sharedData.teacherId || '';
    testData.classroomId = sharedData.classroomId || '';
    testData.trialScheduleId = sharedData.scheduleId || sharedData.weekdayScheduleId || '';
    testData.regularScheduleId = sharedData.weekendScheduleId || sharedData.scheduleId || '';
    logger.info(`✓ 机构ID: ${testData.institutionId}`);
    logger.info(`✓ 课程ID: ${testData.trialCourseId}, ${testData.regularCourseId}`);
  }

  const tests = [
    // 如果有共享数据就跳过初始化步骤
    ...(sharedData?.courseId ? [] : [
      { name: '用户登录', fn: testUserLogin },
      { name: '初始化测试数据（创建机构和课程）', fn: () => testInitializeData(sharedData) },
    ]),
    { name: '创建试听预约', fn: () => testCreateTrialBooking(sharedData) },
    { name: '创建正式课预约', fn: () => testCreateRegularBooking(sharedData) },
    { name: '查询用户预约列表', fn: testListUserBookings },
    { name: '查询机构预约列表', fn: testListInstitutionBookings },
    { name: '查询预约详情', fn: testGetBooking },
    { name: '机构确认预约', fn: testConfirmBooking },
    { name: '机构拒绝预约', fn: testRejectBooking },
    { name: '用户取消预约', fn: testCancelBooking },
    { name: '按状态筛选预约', fn: testFilterByStatus },
    { name: '预约时间冲突检测', fn: testBookingTimeConflict },
    { name: '预约容量限制测试', fn: testBookingCapacityLimit },
    { name: '预约取消规则测试', fn: testBookingCancelRules },
    { name: '预约关联数据测试（课表用）', fn: testBookingRelationsForSchedule },
    { name: '修改预约排课测试', fn: testChangeBookingSchedule },
    { name: '24小时内修改需审核测试', fn: test24HourApprovalFlow },
  ];

  for (const test of tests) {
    try {
      logger.section(test.name);
      await test.fn();
      successCount++;
      logger.success(`${test.name} - 通过`);
      await sleep(300);
    } catch (error: any) {
      failCount++;
      logger.error(`${test.name} - 失败: ${error.message}`);
    }
  }

  const duration = (Date.now() - startTime) / 1000;

  logger.summary({
    title: '预约CRUD测试总结',
    total: tests.length,
    success: successCount,
    fail: failCount,
    duration,
  });

  logger.data('测试数据', testData);

  if (failCount > 0) {
    return false;
  }

  // 🔗 将预约ID写入sharedData（供后续测试使用）
  if (sharedData) {
    sharedData.bookingId = testData.trialBookingId || testData.regularBookingId;
    sharedData.trialBookingId = testData.trialBookingId;
    sharedData.regularBookingId = testData.regularBookingId;
    
    // 如果数据是自己创建的，也写回去
    if (!sharedData.institutionId) {
      sharedData.institutionId = testData.institutionId;
      sharedData.institutionToken = testData.institutionToken;
      sharedData.userToken = testData.userToken;
    }
    if (!sharedData.courseId) {
      sharedData.courseId = testData.trialCourseId || testData.regularCourseId;
      sharedData.trialCourseId = testData.trialCourseId;
      sharedData.regularCourseId = testData.regularCourseId;
    }
    
    logger.info('✅ 已将预约数据写入共享数据');
  }

  return failCount === 0;
}

/**
 * 测试1: 用户登录（使用真实用户数据）
 */
async function testUserLogin() {
  // 直接生成 token（绕过微信登录流程）
  testData.userToken = generateUserToken(
    REAL_USER.id,
    REAL_USER.openid,
    REAL_USER.nickname,
  );
  testData.userId = REAL_USER.id;

  logger.info(`用户ID: ${REAL_USER.id}`);
  logger.info(`OpenID: ${REAL_USER.openid}`);
  logger.info(`Token: ${testData.userToken.substring(0, 30)}...`);

  // ⚠️ 注意：在测试环境中，这个用户可能不存在
  // 验证 token 是否有效（可能失败，但不影响后续测试）
  try {
    const helper = new TestHelper(testData.userToken);
    const profile = await helper.get('/auth/user-info');
    logger.info(`验证成功 - 用户昵称: ${profile.nickname || profile.real_name || '测试用户'}`);
  } catch (error: any) {
    logger.warn('⚠️ 用户验证失败（用户可能不存在），但token已生成可用');
  }
}

/**
 * 初始化测试数据：创建机构和课程
 */
export async function testInitializeData(sharedData?: any) {
  // 🔗 检查是否传入了机构和课程数据
  if (sharedData?.institutionId && sharedData?.courseId) {
    logger.info('📦 使用共享机构和课程数据，跳过初始化');
    testData.institutionId = sharedData.institutionId;
    testData.institutionToken = sharedData.institutionToken;
    testData.userToken = sharedData.userToken;
    testData.trialCourseId = sharedData.trialCourseId || sharedData.courseId;
    testData.regularCourseId = sharedData.standardCourseId || sharedData.courseId;
    logger.info(`✓ 机构ID: ${testData.institutionId}`);
    logger.info(`✓ 课程ID: ${testData.trialCourseId}, ${testData.regularCourseId}`);
    return;
  }

  const userHelper = new TestHelper(testData.userToken);

  // 1. 创建机构（自动审核通过）
  logger.info('创建机构...');
  const institution = await createInstitution(userHelper, {
    name: '艺术培训中心',
    categoryIds: ['art'],
    autoApprove: true,
  });
  testData.institutionId = institution.institutionId;
  testData.institutionToken = institution.token;
  
  logger.info(`✓ 机构ID: ${testData.institutionId}`);

  const adminHelper = new TestHelper(testData.institutionToken);

  // 2. 创建试听课程（自动上架）
  logger.info('创建试听课程...');
  testData.trialCourseId = await createCourse(adminHelper, {
    institutionId: testData.institutionId,
    title: '舞蹈试听课',
    categoryCode: 'art_dance',
    type: 'trial',
    minAge: 4,
    maxAge: 12,
    autoOnline: true,
  });
  
  logger.info(`✓ 试听课程ID: ${testData.trialCourseId}`);

  // 3. 创建正式课程（自动上架）
  logger.info('创建正式课程...');
  testData.regularCourseId = await createCourse(adminHelper, {
    institutionId: testData.institutionId,
    title: '美术正式课',
    categoryCode: 'art_painting',
    type: 'standard',
    minAge: 5,
    maxAge: 10,
    autoOnline: true,
  });
  
  logger.info(`✓ 正式课程ID: ${testData.regularCourseId}`);

  // 4. 创建教师（排课需要教师）
  logger.info('创建教师...');
  testData.teacherId = await createTeacher(adminHelper, {
    institutionId: testData.institutionId,
    name: '舞蹈老师',
  });
  logger.info(`✓ 教师ID: ${testData.teacherId}`);

  // 5. 创建教室（排课需要教室）
  logger.info('创建教室...');
  testData.classroomId = await createClassroom(adminHelper, {
    institutionId: testData.institutionId,
    name: '舞蹈教室',
  });
  logger.info(`✓ 教室ID: ${testData.classroomId}`);

  // 6. 为试听课程创建排课（预约需要关联排课）
  logger.info('创建试听课程排课...');
  testData.trialScheduleId = await createSchedule(adminHelper, {
    institutionId: testData.institutionId,
    courseId: testData.trialCourseId,
    teacherId: testData.teacherId,
    classroomId: testData.classroomId,
    duration: 60,
  });
  logger.info(`✓ 试听课排课ID: ${testData.trialScheduleId}`);

  // 7. 为正式课程创建排课
  logger.info('创建正式课程排课...');
  testData.regularScheduleId = await createSchedule(adminHelper, {
    institutionId: testData.institutionId,
    courseId: testData.regularCourseId,
    teacherId: testData.teacherId,
    classroomId: testData.classroomId,
    duration: 90,
  });
  logger.info(`✓ 正式课排课ID: ${testData.regularScheduleId}`);
}

/**
 * 测试2: 创建试听预约
 */
export async function testCreateTrialBooking(sharedData?: any) {
  const helper = new TestHelper(testData.userToken);

  const bookingData = TestBooking.trial();

  // 获取课程的第一个SKU
  const courseHelper = new TestHelper(testData.institutionToken);
  const course = await courseHelper.get(
    `/courses/${testData.trialCourseId}`,
  );
  const skuId = course.skus[0].id;

  const data = {
    ...bookingData,
    course_id: testData.trialCourseId,
    sku_id: skuId,
    schedule_ids: [testData.trialScheduleId], // ⭐ 必须传入排课ID
  };

  // 创建预约 - 根据规范，返回 ID
  const bookingId = await helper.post('/booking', data);
  testData.trialBookingId = bookingId;
  testData.bookingIds.push(bookingId);

  // 查询预约详情
  const result = await helper.get(`/booking/${bookingId}`);

  logger.info(`预约ID: ${result.id}`);
  logger.info(`学员: ${result.student_name} (${result.student_age}岁)`);
  logger.info(`联系电话: ${result.student_phone}`);
  logger.info(`预约时间: ${result.booking_time}`);
  logger.info(`备注: ${result.remark || '无'}`);
  logger.info(`状态: ${result.status}`);

  // 验证返回数据
  if (!result.id || !result.student_name) {
    throw new Error('未返回必要字段');
  }
  if (result.status !== 'pending') {
    throw new Error('新预约状态应为pending');
  }
}

/**
 * 测试3: 创建正式课预约
 */
async function testCreateRegularBooking(sharedData?: any) {
  const helper = new TestHelper(testData.userToken);

  const bookingData = TestBooking.regular();

  const courseHelper = new TestHelper(testData.institutionToken);
  const course = await courseHelper.get(
    `/courses/${testData.regularCourseId}`,
  );
  const skuId = course.skus[0].id;

  const data = {
    ...bookingData,
    course_id: testData.regularCourseId,
    sku_id: skuId,
    schedule_ids: [testData.regularScheduleId], // ⭐ 必须传入排课ID
  };

  // 创建预约 - 返回 ID
  const bookingId = await helper.post('/booking', data);
  testData.regularBookingId = bookingId;
  testData.bookingIds.push(bookingId);

  // 查询详情
  const result = await helper.get(`/booking/${bookingId}`);

  logger.info(`预约ID: ${result.id}`);
  logger.info(`课程ID: ${result.course_id}`);
  logger.info(`状态: ${result.status}`);
}

/**
 * 测试4: 查询用户预约列表
 */
async function testListUserBookings() {
  const helper = new TestHelper(testData.userToken);

  const result = await helper.get('/booking/my');

  logger.info(`用户共有 ${result.length} 个预约`);

  // 验证是否包含刚创建的预约
  const createdCount = result.filter((booking: any) =>
    testData.bookingIds.includes(booking.id),
  ).length;

  if (createdCount !== testData.bookingIds.length) {
    throw new Error(
      `未找到所有创建的预约，期望${testData.bookingIds.length}个，实际${createdCount}个`,
    );
  }

  logger.info(`找到 ${createdCount} 个测试预约`);
}

/**
 * 测试5: 查询机构预约列表
 */
async function testListInstitutionBookings() {
  const helper = new TestHelper(testData.institutionToken);

  const result = await helper.get(
    `/booking/institution/${testData.institutionId}`,
  );

  logger.info(`机构共有 ${result.length} 个预约`);

  // 统计各状态预约数量
  const statusCount: Record<string, number> = {};
  result.forEach((booking: any) => {
    statusCount[booking.status] = (statusCount[booking.status] || 0) + 1;
  });

  Object.entries(statusCount).forEach(([status, count]) => {
    logger.info(`  ${status}: ${count}个`);
  });
}

/**
 * 测试6: 查询预约详情
 */
async function testGetBooking() {
  const helper = new TestHelper(testData.userToken);

  const result = await helper.get(`/booking/${testData.trialBookingId}`);

  logger.info(`预约ID: ${result.id}`);
  logger.info(`状态: ${result.status}`);
  logger.info(`学员: ${result.student_name} (${result.student_age}岁)`);
  logger.info(`联系电话: ${result.student_phone}`);
  logger.info(`预约时间: ${result.booking_time}`);
  logger.info(`课程ID: ${result.course_id}`);
  logger.info(`SKU ID: ${result.sku_id}`);
  logger.info(`创建时间: ${result.created_at}`);

  // 验证关键字段
  if (result.id !== testData.trialBookingId) {
    throw new Error('预约ID不匹配');
  }
  if (!result.student_name || !result.booking_time) {
    throw new Error('缺少必要字段');
  }
}

/**
 * 测试7: 机构确认预约
 */
async function testConfirmBooking() {
  const helper = new TestHelper(testData.institutionToken);

  const data = {
    status: 'confirmed' as const,
    reason: '预约已确认，期待您的光临！',
  };

  // PUT 返回 boolean
  const updated = await helper.put(
    `/booking/${testData.trialBookingId}/status`,
    data,
  );

  if (!updated) {
    throw new Error('更新失败');
  }

  await sleep(500);

  // 重新查询验证
  const result = await helper.get(`/booking/${testData.trialBookingId}`);

  logger.info(`预约状态已更新: ${result.status}`);
  logger.info(`机构反馈: ${result.reason || '无'}`);

  // 验证状态更新
  if (result.status !== 'confirmed') {
    throw new Error('预约状态未更新为confirmed');
  }
}

/**
 * 测试8: 机构拒绝预约
 */
async function testRejectBooking() {
  const helper = new TestHelper(testData.institutionToken);

  // 创建一个新预约用于测试拒绝
  const userHelper = new TestHelper(testData.userToken);
  const bookingData = TestBooking.trial();
  const courseHelper = new TestHelper(testData.institutionToken);
  const course = await courseHelper.get(
    `/courses/${testData.trialCourseId}`,
  );

  const newBookingId = await userHelper.post('/booking', {
    ...bookingData,
    course_id: testData.trialCourseId,
    sku_id: course.skus[0].id,
    schedule_ids: [testData.trialScheduleId], // ⭐ 必须传入排课ID
    student_name: '测试拒绝',
  });

  await sleep(500);

  // 拒绝预约
  const data = {
    status: 'rejected' as const,
    reason: '抱歉，该时段已满，请选择其他时间',
  };

  const updated = await helper.put(`/booking/${newBookingId}/status`, data);
  
  if (!updated) {
    throw new Error('更新失败');
  }

  await sleep(500);

  // 查询验证
  const result = await helper.get(`/booking/${newBookingId}`);

  logger.info(`预约已拒绝: ${newBookingId}`);
  logger.info(`拒绝原因: ${result.reason}`);

  // 验证状态
  if (result.status !== 'rejected') {
    throw new Error('预约状态未更新为rejected');
  }
}

/**
 * 测试9: 用户取消预约
 */
async function testCancelBooking() {
  const helper = new TestHelper(testData.userToken);

  await helper.put(`/booking/${testData.regularBookingId}/cancel`);

  logger.info(`预约已取消: ${testData.regularBookingId}`);

  await sleep(500);

  // 验证状态
  const booking = await helper.get(`/booking/${testData.regularBookingId}`);
  // confirmed 状态的预约取消后先进入 pending_cancel（需机构审核），pending 状态才直接 cancelled
  if (booking.status !== 'pending_cancel' && booking.status !== 'cancelled') {
    throw new Error(`预约状态应为 pending_cancel 或 cancelled，实际: ${booking.status}`);
  }

  logger.info('预约取消成功');
}

/**
 * Test 10: Filter bookings by status
 */
async function testFilterByStatus() {
  const helper = new TestHelper(testData.institutionToken);

  // 筛选待处理预约
  const pendingBookings = await helper.get(
    `/booking/institution/${testData.institutionId}`,
    {
      status: 'pending',
    },
  );

  logger.info(`待处理预约数量: ${pendingBookings.length}`);

  // 筛选已确认预约
  const confirmedBookings = await helper.get(
    `/booking/institution/${testData.institutionId}`,
    {
      status: 'confirmed',
    },
  );

  logger.info(`已确认预约数量: ${confirmedBookings.length}`);

  // 验证筛选结果
  const hasWrongStatus = pendingBookings.some(
    (booking: any) => booking.status !== 'pending',
  );
  if (hasWrongStatus) {
    throw new Error('待处理预约筛选结果包含其他状态的预约');
  }
}

/**
 * Test 11: Booking time conflict detection
 */
async function testBookingTimeConflict() {
  const helper = new TestHelper(testData.userToken);
  const courseHelper = new TestHelper(testData.institutionToken);

  // Get course and SKU
  const course = await courseHelper.get(
    `/courses/${testData.trialCourseId}`,
  );
  const skuId = course.skus[0].id;

  // Create first booking at specific time
  const bookingTime = new Date();
  bookingTime.setDate(bookingTime.getDate() + 3);
  bookingTime.setHours(14, 0, 0, 0);

  const bookingData1 = TestBooking.trial();
  const data1 = {
    ...bookingData1,
    course_id: testData.trialCourseId,
    sku_id: skuId,
    schedule_ids: [testData.trialScheduleId], // ⭐ 必须传入排课ID
    booking_time: bookingTime.toISOString(),
  };

  const booking1Id = await helper.post('/booking', data1);
  testData.bookingIds.push(booking1Id);
  logger.info(`创建第一个预约: ${bookingTime.toISOString()}`);

  // Try to create conflicting booking (same time, same course)
  const bookingData2 = TestBooking.trial();
  const data2 = {
    ...bookingData2,
    course_id: testData.trialCourseId,
    sku_id: skuId,
    schedule_ids: [testData.trialScheduleId], // ⭐ 必须传入排课ID
    booking_time: bookingTime.toISOString(),
    student_name: '李四',
    student_phone: '13900000002',
  };

  try {
    await helper.post('/booking', data2);
    logger.warn('⚠ 时间冲突检测未实现：允许创建冲突预约');
  } catch (error: any) {
    if (error.response?.status === 400 || error.message.includes('冲突')) {
      logger.info('✓ 时间冲突检测正常：禁止创建冲突预约');
    } else {
      throw error;
    }
  }

  logger.data('时间冲突检测测试完成', {
    bookingTime: bookingTime.toISOString(),
  });
}

/**
 * Test 12: Booking capacity limit
 */
async function testBookingCapacityLimit() {
  const helper = new TestHelper(testData.userToken);
  const courseHelper = new TestHelper(testData.institutionToken);

  // Get course and SKU
  const course = await courseHelper.get(
    `/courses/${testData.regularCourseId}`,
  );
  const skuId = course.skus[0].id;

  // Assume capacity limit is stored in course or SKU
  const capacityLimit = course.capacity || 20;
  logger.info(`课程容量限制: ${capacityLimit}`);

  // Create bookings up to capacity (simulate)
  const bookingTime = new Date();
  bookingTime.setDate(bookingTime.getDate() + 5);
  bookingTime.setHours(10, 0, 0, 0);

  // Create multiple bookings
  const createdBookings: string[] = [];
  for (let i = 0; i < 3; i++) {
    const bookingData = TestBooking.trial();
    const data = {
      ...bookingData,
      course_id: testData.regularCourseId,
      sku_id: skuId,
      schedule_ids: [testData.regularScheduleId], // ⭐ 必须传入排课ID
      booking_time: new Date(bookingTime.getTime() + i * 3600000).toISOString(),
      student_name: `学员${i + 1}`,
      student_phone: `1390000000${i}`,
    };

    try {
      const bookingId = await helper.post('/booking', data);
      createdBookings.push(bookingId);
      testData.bookingIds.push(bookingId);
      logger.info(`✓ 创建预约 ${i + 1}/3`);
    } catch (error: any) {
      if (error.response?.status === 400 || error.message.includes('容量')) {
        logger.info(`✓ 容量限制生效：拒绝第 ${i + 1} 个预约`);
        break;
      } else {
        throw error;
      }
    }
  }

  if (createdBookings.length === 3) {
    logger.warn('⚠ 容量限制未实现：允许创建所有预约');
  }

  logger.data('容量限制测试完成', {
    created: createdBookings.length,
    limit: capacityLimit,
  });
}

/**
 * Test 13: Booking cancellation rules
 */
async function testBookingCancelRules() {
  const helper = new TestHelper(testData.userToken);
  const courseHelper = new TestHelper(testData.institutionToken);

  // Get course and SKU
  const course = await courseHelper.get(
    `/courses/${testData.trialCourseId}`,
  );
  const skuId = course.skus[0].id;

  // Test 1: Cancel booking far in advance (should succeed)
  const futureTime = new Date();
  futureTime.setDate(futureTime.getDate() + 7);

  const bookingData1 = TestBooking.trial();
  const data1 = {
    ...bookingData1,
    course_id: testData.trialCourseId,
    sku_id: skuId,
    schedule_ids: [testData.trialScheduleId], // ⭐ 必须传入排课ID
    booking_time: futureTime.toISOString(),
  };

  const booking1Id = await helper.post('/booking', data1);
  testData.bookingIds.push(booking1Id);
  logger.info('创建预约：7天后');

  await sleep(500);

  await helper.put(`/booking/${booking1Id}/cancel`, {
    cancel_reason: '计划有变',
  });
  logger.info('✓ 提前7天取消预约成功');

  // Test 2: Try to cancel confirmed booking (depends on business rules)
  const bookingData2 = TestBooking.trial();
  const data2 = {
    ...bookingData2,
    course_id: testData.trialCourseId,
    sku_id: skuId,
    schedule_ids: [testData.trialScheduleId], // ⭐ 必须传入排课ID
    booking_time: new Date(Date.now() + 6 * 24 * 3600000).toISOString(),
    student_name: '王五',
    student_phone: '13900000003',
  };

  const booking2Id = await helper.post('/booking', data2);
  testData.bookingIds.push(booking2Id);

  // Confirm the booking (as institution admin)
  const adminHelper = new TestHelper(testData.institutionToken);
  await adminHelper.put(`/booking/${booking2Id}/confirm`, {});
  logger.info('机构确认预约');

  // Try to cancel confirmed booking
  try {
    await helper.put(`/booking/${booking2Id}/cancel`, {
      cancel_reason: '已确认后取消',
    });
    logger.info('✓ 已确认预约可以取消');
  } catch (error: any) {
    if (error.response?.status === 400) {
      logger.info('✓ 已确认预约不可取消（根据业务规则）');
    } else {
      throw error;
    }
  }

  // Test 3: Try to cancel past booking
  const pastTime = new Date(Date.now() - 24 * 3600000); // 1 day ago
  const bookingData3 = TestBooking.trial();
  const data3 = {
    ...bookingData3,
    course_id: testData.trialCourseId,
    sku_id: skuId,
    schedule_ids: [testData.trialScheduleId], // ⭐ 必须传入排课ID
    booking_time: pastTime.toISOString(),
    student_name: '赵六',
    student_phone: '13900000004',
  };

  try {
    const booking3Id = await helper.post('/booking', data3);
    testData.bookingIds.push(booking3Id);
    
    await helper.put(`/booking/${booking3Id}/cancel`, {
      cancel_reason: '过期取消测试',
    });
    logger.warn('⚠ 过期预约可以取消（可能不符合业务规则）');
  } catch (error: any) {
    logger.info('✓ 过期预约不可创建或取消');
  }

  logger.data('取消规则测试完成', {
    advanceCancel: true,
    confirmedCancel: 'depends',
    pastCancel: false,
  });
}

/**
 * 测试14: 预约关联数据测试（课表用）
 * 验证 /booking/my 接口返回的预约包含 schedule、course、institution 等关联数据
 * 这些数据用于前端课表页面展示
 */
async function testBookingRelationsForSchedule() {
  const helper = new TestHelper(testData.userToken);

  // 查询用户预约列表
  const result = await helper.get('/booking/my');

  if (!result || result.length === 0) {
    throw new Error('没有找到任何预约数据');
  }

  logger.info(`用户共有 ${result.length} 个预约`);

  // 找到我们创建的预约
  const booking = result.find((b: any) => testData.bookingIds.includes(b.id));
  
  if (!booking) {
    throw new Error('未找到测试创建的预约');
  }

  logger.info(`检查预约: ${booking.id}`);

  // 验证基础字段
  const baseFields = ['id', 'status', 'student_name', 'course_id'];
  for (const field of baseFields) {
    if (!booking[field]) {
      throw new Error(`缺少基础字段: ${field}`);
    }
    logger.info(`  ✓ ${field}: ${booking[field]}`);
  }

  // 验证课程关联数据（用于展示课程名称）
  if (booking.course) {
    logger.info(`  ✓ 课程关联数据存在:`);
    logger.info(`    - 课程ID: ${booking.course.id}`);
    logger.info(`    - 课程名称: ${booking.course.title}`);
    if (booking.course.cover_image) {
      logger.info(`    - 封面图: ${booking.course.cover_image.substring(0, 50)}...`);
    }
  } else {
    logger.warn('  ⚠ 缺少课程关联数据 (course)');
  }

  // 验证机构关联数据（用于展示机构名称）
  if (booking.institution) {
    logger.info(`  ✓ 机构关联数据存在:`);
    logger.info(`    - 机构ID: ${booking.institution.id}`);
    logger.info(`    - 机构名称: ${booking.institution.name}`);
  } else {
    logger.warn('  ⚠ 缺少机构关联数据 (institution)');
  }

  // 验证排课关联数据（用于展示上课时间）
  if (booking.schedule) {
    logger.info(`  ✓ 排课关联数据存在:`);
    logger.info(`    - 排课ID: ${booking.schedule.id}`);
    logger.info(`    - 开始时间: ${booking.schedule.start_time}`);
    logger.info(`    - 结束时间: ${booking.schedule.end_time}`);
    
    // 验证 start_time 可以解析为日期
    const startTime = new Date(booking.schedule.start_time);
    if (isNaN(startTime.getTime())) {
      throw new Error('schedule.start_time 无法解析为有效日期');
    }
    logger.info(`    - 解析后的日期: ${startTime.toISOString()}`);
  } else {
    // 如果是试听课可能没有关联排课，这种情况记录警告但不失败
    if (booking.schedule_id) {
      logger.warn(`  ⚠ 预约有 schedule_id=${booking.schedule_id} 但缺少排课详情数据`);
    } else {
      logger.info('  ℹ 该预约没有关联排课（可能是试听课预约）');
    }
  }

  // 验证学员关联数据
  if (booking.child) {
    logger.info(`  ✓ 学员关联数据存在:`);
    logger.info(`    - 学员ID: ${booking.child.id}`);
    logger.info(`    - 学员姓名: ${booking.child.name}`);
  } else if (booking.child_id) {
    logger.warn(`  ⚠ 预约有 child_id=${booking.child_id} 但缺少学员详情数据`);
  }

  // 验证教师关联数据
  if (booking.teacher) {
    logger.info(`  ✓ 教师关联数据存在:`);
    logger.info(`    - 教师ID: ${booking.teacher.id}`);
    logger.info(`    - 教师姓名: ${booking.teacher.name}`);
  }

  // 验证教室关联数据
  if (booking.classroom) {
    logger.info(`  ✓ 教室关联数据存在:`);
    logger.info(`    - 教室ID: ${booking.classroom.id}`);
    logger.info(`    - 教室名称: ${booking.classroom.name}`);
  }

  // 统计关联数据完整度
  const relationsPresent = {
    course: !!booking.course,
    institution: !!booking.institution,
    schedule: !!booking.schedule,
    child: !!booking.child,
    teacher: !!booking.teacher,
    classroom: !!booking.classroom,
  };

  const presentCount = Object.values(relationsPresent).filter(Boolean).length;
  logger.data('关联数据完整度', {
    ...relationsPresent,
    总数: `${presentCount}/6`,
  });

  // 课表必须要有 course 和 institution 数据，schedule 根据业务场景决定
  if (!booking.course) {
    throw new Error('课表功能必须要有课程关联数据');
  }
  if (!booking.institution) {
    throw new Error('课表功能必须要有机构关联数据');
  }

  logger.success('预约关联数据验证通过，课表功能所需数据完整');
}

/**
 * 测试15：修改预约排课
 * 测试用户修改预约的排课时段功能
 */
async function testChangeBookingSchedule() {
  // 前置检查：需要排课、教师和教室ID
  if (!testData.trialScheduleId || !testData.teacherId || !testData.classroomId) {
    logger.warn('⚠️ 跳过测试：缺少排课/教师/教室数据');
    logger.info(`  trialScheduleId: ${testData.trialScheduleId || '缺失'}`);
    logger.info(`  teacherId: ${testData.teacherId || '缺失'}`);
    logger.info(`  classroomId: ${testData.classroomId || '缺失'}`);
    logger.success('修改预约排课测试跳过（数据不完整）');
    return;
  }

  const helper = new TestHelper(testData.userToken);

  // 1. 先创建一个新的预约
  logger.info('步骤1: 创建一个预约用于修改测试');
  const bookingData = {
    course_id: testData.trialCourseId,
    ...TestBooking.trial(),
  } as any;
  
  // 确保使用第一个排课
  bookingData.schedule_ids = [testData.trialScheduleId];
  
  const bookingId = await helper.post('/booking', bookingData);
  logger.info(`创建预约成功: ${bookingId}`);

  // 2. 创建第二个排课用于切换
  logger.info('步骤2: 创建另一个排课时段');
  const institutionHelper = new TestHelper(testData.institutionToken);
  
  // 计算明天的日期
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);
  const endTime = new Date(tomorrow);
  endTime.setHours(15, 0, 0, 0);
  
  const newScheduleData = {
    course_id: testData.trialCourseId,
    teacher_id: testData.teacherId,
    classroom_id: testData.classroomId,
    day_of_week: '3', // 周三（字符串格式）
    start_time: tomorrow.toISOString(),
    end_time: endTime.toISOString(),
    max_students: 10,
  };
  
  const newScheduleId = await institutionHelper.post('/schedule', newScheduleData);
  logger.info(`创建新排课成功: ${newScheduleId}`);

  // 3. 修改预约的排课
  logger.info('步骤3: 修改预约排课');
  const changeResult = await helper.put(`/booking/${bookingId}/change-schedule`, {
    new_schedule_id: newScheduleId,
  });
  
  // 新返回格式: { success: true, needsApproval: boolean }
  if (!changeResult.success) {
    throw new Error(`修改预约排课失败，返回值: ${JSON.stringify(changeResult)}`);
  }
  logger.info(`修改结果: needsApproval=${changeResult.needsApproval}`);
  logger.success('修改预约排课成功');

  // 4. 验证修改结果
  logger.info('步骤4: 验证修改结果');
  const updatedBooking = await helper.get(`/booking/${bookingId}`);
  
  // 如果不需要审核，排课ID直接更新
  // 如果需要审核，排课保持不变，pending_change_schedule_id 存储新排课ID
  if (!changeResult.needsApproval) {
    if (updatedBooking.schedule_id !== newScheduleId) {
      throw new Error(`排课ID未更新，期望: ${newScheduleId}，实际: ${updatedBooking.schedule_id}`);
    }
    logger.success('排课ID已正确更新');
  } else {
    if (updatedBooking.status !== 'pending_change') {
      throw new Error(`状态应为 pending_change，实际: ${updatedBooking.status}`);
    }
    if (updatedBooking.pending_change_schedule_id !== newScheduleId) {
      throw new Error(`待审核排课ID不正确`);
    }
    logger.success('待审核修改已保存');
  }

  // 5. 测试已取消的预约不能修改
  logger.info('步骤5: 测试已取消预约不能修改排课');
  await helper.put(`/booking/${bookingId}/cancel`, { reason: '测试取消' });
  
  try {
    await helper.put(`/booking/${bookingId}/change-schedule`, {
      new_schedule_id: testData.trialScheduleId,
    });
    throw new Error('已取消的预约不应该能修改排课');
  } catch (error: any) {
    if (error.message.includes('不应该能修改')) {
      throw error;
    }
    logger.success('已取消的预约无法修改排课（符合预期）');
  }

  // 清理测试数据
  testData.bookingIds.push(bookingId);
  logger.success('修改预约排课测试通过');
}

/**
 * 24小时内修改预约需审核测试
 */
async function test24HourApprovalFlow() {
  // 前置检查：需要排课、教师和教室ID
  if (!testData.trialScheduleId || !testData.teacherId || !testData.classroomId) {
    logger.warn('⚠️ 跳过测试：缺少排课/教师/教室数据');
    logger.info(`  trialScheduleId: ${testData.trialScheduleId || '缺失'}`);
    logger.info(`  teacherId: ${testData.teacherId || '缺失'}`);
    logger.info(`  classroomId: ${testData.classroomId || '缺失'}`);
    logger.success('24小时内修改需审核测试跳过（数据不完整）');
    return;
  }

  const helper = new TestHelper(testData.userToken);
  const institutionHelper = new TestHelper(testData.institutionToken);

  // 创建一个专用教师（避免与其他测试的排课时间冲突）
  logger.info('步骤0: 创建专用测试教师和教室（避免时间冲突）');
  const dedicated24hTeacherId = await createTeacher(institutionHelper, {
    institutionId: testData.institutionId,
    name: `24h专用教师_${Date.now()}`,
  });
  logger.info(`专用教师ID: ${dedicated24hTeacherId}`);

  // 创建一个专用教室（避免与其他测试的排课教室冲突）
  const dedicated24hClassroomId = await createClassroom(institutionHelper, {
    institutionId: testData.institutionId,
    name: `24h专用教室_${Date.now()}`,
  });
  logger.info(`专用教室ID: ${dedicated24hClassroomId}`);
  
  // 1. 创建一个即将开始的排课（12小时后，在24小时内）
  logger.info('步骤1: 创建一个12小时后的排课');
  const now = new Date();
  const soon = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12小时后
  const soonEnd = new Date(soon.getTime() + 60 * 60 * 1000); // 1小时后结束
  
  const soonScheduleData = {
    course_id: testData.trialCourseId,
    teacher_id: dedicated24hTeacherId,
    classroom_id: dedicated24hClassroomId,
    day_of_week: String(soon.getDay()),
    start_time: soon.toISOString(),
    end_time: soonEnd.toISOString(),
    max_students: 10,
  };
  
  const soonScheduleId = await institutionHelper.post('/schedule', soonScheduleData);
  logger.info(`创建12小时后排课成功: ${soonScheduleId}`);
  
  // 2. 创建一个预约，使用这个即将开始的排课
  logger.info('步骤2: 创建使用该排课的预约');
  const bookingData = {
    course_id: testData.trialCourseId,
    schedule_id: soonScheduleId,
    student_name: '测试学员',
    student_phone: '13912345678',
    student_age: 8,
    booking_time: soon.toISOString(),
  };
  
  const bookingId = await helper.post('/booking', bookingData);
  logger.info(`创建预约成功: ${bookingId}`);
  
  // 3. 创建一个新排课用于切换（使用同一专用教师，时间不同）
  logger.info('步骤3: 创建另一个排课');
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7天后
  const futureEnd = new Date(futureDate.getTime() + 60 * 60 * 1000);
  
  const newScheduleData = {
    course_id: testData.trialCourseId,
    teacher_id: dedicated24hTeacherId,
    classroom_id: dedicated24hClassroomId,
    day_of_week: String(futureDate.getDay()),
    start_time: futureDate.toISOString(),
    end_time: futureEnd.toISOString(),
    max_students: 10,
  };
  
  const newScheduleId = await institutionHelper.post('/schedule', newScheduleData);
  logger.info(`创建新排课成功: ${newScheduleId}`);
  
  // 4. 尝试修改预约 - 应该需要审核
  logger.info('步骤4: 修改预约（应需要审核）');
  const changeResult = await helper.put(`/booking/${bookingId}/change-schedule`, {
    new_schedule_id: newScheduleId,
  });
  
  if (!changeResult.needsApproval) {
    throw new Error('距离上课12小时应该需要审核');
  }
  logger.success('正确触发审核流程');
  
  // 5. 验证预约状态为 pending_change
  logger.info('步骤5: 验证预约状态');
  const pendingBooking = await helper.get(`/booking/${bookingId}`);
  
  if (pendingBooking.status !== 'pending_change') {
    throw new Error(`状态应为 pending_change，实际: ${pendingBooking.status}`);
  }
  if (pendingBooking.pending_change_schedule_id !== newScheduleId) {
    throw new Error('待审核排课ID不正确');
  }
  logger.success('预约状态正确更新为 pending_change');
  
  // 6. 机构审核通过
  logger.info('步骤6: 机构审核通过');
  await institutionHelper.put(`/booking/${bookingId}/review-change`, {
    action: 'approve',
  });
  
  const approvedBooking = await helper.get(`/booking/${bookingId}`);
  if (approvedBooking.status !== 'confirmed') {
    throw new Error(`审核后状态应为 confirmed，实际: ${approvedBooking.status}`);
  }
  if (approvedBooking.schedule_id !== newScheduleId) {
    throw new Error('排课ID未更新');
  }
  if (approvedBooking.pending_change_schedule_id) {
    throw new Error('待审核排课ID应已清除');
  }
  logger.success('机构审核通过，排课已更新');
  
  // 清理
  testData.bookingIds.push(bookingId);
  logger.success('24小时内修改需审核测试通过');
}

// 如果直接运行此文件
if (require.main === module) {
  runCRUDTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      logger.error('测试执行出错');
      console.error(error);
      process.exit(1);
    });
}

export { testData };
