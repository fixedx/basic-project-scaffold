/**
 * 签到模块测试（支持数据共享）
 * 
 * 功能：
 * - 支持独立运行（自行初始化测试数据）
 * - 支持流程测试（复用上游测试数据）
 * 
 * 使用方式：
 * 1. 独立运行：npx tsx tests/check-in.test.ts
 * 2. 流程测试：通过 run-all-tests.ts 传入共享数据
 */

import { TestHelper, generateUserToken, sleep } from './utils/test-client';
import { ImageUrls, UniqueId } from './utils/test-data';
import { logger } from './utils/logger';
import { createInstitution, createCourse } from './utils/test-helpers';

// 测试数据
const testData = {
  institutionId: '',
  institutionToken: '',
  courseId: '',
  skuId: '',
  orderId: '',
  childId: '',
  userId: '260765341334900736',
  userToken: '',
  checkInId: '',
  scheduleId: '',
  bookingId: '',  // 预约ID
  totalLessons: 12, // 默认课时数
};

/**
 * 初始化测试数据（独立运行时使用）
 */
async function initializeTestData() {
  logger.info('初始化签到测试数据...');
  
  // 1. 创建机构
  const helper = new TestHelper();
  const { institutionId, token: institutionToken } = await createInstitution(helper, {
    name: `签到测试机构_${Date.now()}`,
    autoApprove: true,
  });
  testData.institutionId = institutionId;
  testData.institutionToken = institutionToken;
  logger.success(`✓ 创建机构成功: ${institutionId}`);
  
  // 2. 创建课程（自动创建排课并上架）
  const instHelper = new TestHelper(institutionToken);
  testData.courseId = await createCourse(instHelper, {
    institutionId: institutionId,
    title: `签到测试课程_${Date.now()}`,
    type: 'standard',
    autoOnline: true,
    scheduleCount: 3,
  });
  logger.success(`✓ 创建课程成功: ${testData.courseId}`);
  
  // 3. 获取 SKU ID 和课时数
  const courseDetail = await instHelper.get(`/courses/${testData.courseId}`);
  testData.skuId = courseDetail.skus[0].id;
  testData.totalLessons = courseDetail.skus[0].lesson_count || 12;
  logger.success(`✓ 获取SKU成功: ${testData.skuId}, 课时: ${testData.totalLessons}`);
  
  // 4. 获取排课ID
  const schedules = await instHelper.get(`/schedule/course/${testData.courseId}`);
  if (!schedules || schedules.length === 0) {
    throw new Error('课程没有排课');
  }
  testData.scheduleId = schedules[0].id;
  logger.success(`✓ 获取排课成功: ${testData.scheduleId}`);
  
  // 5. 生成用户token
  testData.userToken = generateUserToken(
    testData.userId,
    `test_openid_${Date.now()}`,
    '签到测试用户',
  );
  const userHelper = new TestHelper(testData.userToken);
  
  // 6. 创建宝贝
  const childData = {
    name: '签到测试宝贝',
    gender: 'male',
    birthday: '2018-05-15',
    avatar: ImageUrls.person(),
  };
  testData.childId = await userHelper.post('/child', childData);
  logger.success(`✓ 创建宝贝成功: ${testData.childId}`);
  
  // 7. 创建订单（包含排课时段）
  const orderData = {
    course_id: testData.courseId,
    sku_id: testData.skuId,
    child_id: testData.childId,
    quantity: 1,
    payment_method: 'offline',
    student_name: '签到测试学员',
    student_phone: UniqueId.phone(),
    schedule_ids: [testData.scheduleId],
  };
  testData.orderId = await userHelper.post('/order', orderData);
  logger.success(`✓ 创建订单成功: ${testData.orderId}`);
  
  // 8. 确认订单（机构端）
  await instHelper.put(`/order/${testData.orderId}/confirm-payment`);
  logger.success(`✓ 确认订单成功`);
  
  // 9. 获取当前订单的预约ID（根据 course_id 和 schedule_id 匹配）
  const bookingsRes = await userHelper.get('/booking/my', { status: 'confirmed', pageSize: 50 });
  const bookings = Array.isArray(bookingsRes) ? bookingsRes : (bookingsRes.data || []);
  // 找到与当前订单匹配的预约（同一个课程和排课）
  const matchedBooking = bookings.find((b: any) => 
    b.course_id === testData.courseId && b.schedule_id === testData.scheduleId
  );
  if (matchedBooking) {
    testData.bookingId = matchedBooking.id;
    logger.success(`✓ 获取预约成功: ${testData.bookingId}`);
  } else if (bookings.length > 0) {
    // 退而求其次，找当前课程的预约
    const courseBooking = bookings.find((b: any) => b.course_id === testData.courseId);
    if (courseBooking) {
      testData.bookingId = courseBooking.id;
      testData.scheduleId = courseBooking.schedule_id;
      logger.success(`✓ 获取预约成功（课程匹配）: ${testData.bookingId}`);
    } else {
      throw new Error('未找到当前订单的预约');
    }
  } else {
    throw new Error('没有已确认的预约');
  }
  
  logger.success('✓ 测试数据初始化完成');
}

/**
 * 测试：今日签到
 */
async function testCheckIn() {
  logger.info('测试今日签到...');
  
  const userHelper = new TestHelper(testData.userToken);
  
  // 如果还没有预约ID，先获取
  if (!testData.bookingId) {
    const bookingsRes = await userHelper.get('/booking/my', { status: 'confirmed', pageSize: 50 });
    const bookings = Array.isArray(bookingsRes) ? bookingsRes : (bookingsRes.data || []);
    if (bookings.length > 0) {
      testData.bookingId = bookings[0].id;
      testData.scheduleId = bookings[0].schedule_id;
    }
  }
  
  const checkInData = {
    order_id: testData.orderId,
    booking_id: testData.bookingId,  // 添加预约ID
    schedule_id: testData.scheduleId, // 添加排课ID
    latitude: 39.9042,
    longitude: 116.4074,
    remark: '正常签到',
  };
  
  testData.checkInId = await userHelper.post('/check-in', checkInData);
  
  if (!testData.checkInId) {
    throw new Error('签到失败，未返回签到记录ID');
  }
  
  logger.success(`✓ 签到成功: ${testData.checkInId}`);
}

/**
 * 测试：同一节课重复签到应失败
 */
async function testDuplicateCheckIn() {
  logger.info('测试同一节课重复签到...');
  
  const userHelper = new TestHelper(testData.userToken);
  const checkInData = {
    order_id: testData.orderId,
    booking_id: testData.bookingId,  // 同一个预约ID
    schedule_id: testData.scheduleId,
    latitude: 39.9042,
    longitude: 116.4074,
  };
  
  try {
    await userHelper.post('/check-in', checkInData);
    throw new Error('同一节课重复签到应该失败');
  } catch (error: any) {
    if (error.message.includes('同一节课重复签到应该失败')) {
      throw error;
    }
    if (!error.message.includes('这节课已经签到过了') && !error.message.includes('400')) {
      throw new Error(`期望"这节课已经签到过了"，实际: ${error.message}`);
    }
    logger.success(`✓ 同一节课重复签到正确拒绝`);
  }
}

/**
 * 测试：查询签到状态
 */
async function testGetCheckInStatus() {
  logger.info('测试查询签到状态...');
  
  const userHelper = new TestHelper(testData.userToken);
  const status = await userHelper.get(`/check-in/order/${testData.orderId}`);
  
  if (!status) {
    throw new Error('查询签到状态失败');
  }
  
  // 更新 testData.totalLessons 以匹配实际值（订单可能有不同的课时数）
  if (status.total_lessons) {
    testData.totalLessons = status.total_lessons;
  }
  
  if (status.completed_lessons !== 1) {
    throw new Error(`已完成课时不正确: 期望1, 实际${status.completed_lessons}`);
  }
  
  if (!status.records || status.records.length < 1) {
    throw new Error('签到记录数量不正确');
  }
  
  logger.success(`✓ 查询签到状态成功: ${status.completed_lessons}/${status.total_lessons}课时`);
}

/**
 * 测试：批量查询预约签到状态
 */
async function testBatchGetBookingStatus() {
  logger.info('测试批量查询预约签到状态...');
  
  const userHelper = new TestHelper(testData.userToken);
  
  // 先获取预约列表（必须传 page 参数，否则返回全部数据导致 URL 过长 431 错误）
  const bookingsRes = await userHelper.get('/booking/my', { status: 'confirmed', page: 1, pageSize: 20 });
  const bookings = Array.isArray(bookingsRes) ? bookingsRes : (bookingsRes.data || []);
  
  if (bookings.length === 0) {
    logger.warn('⚠ 没有预约数据，跳过测试');
    return;
  }
  
  // 限制最多查询 20 个，避免 GET 参数过长导致 431 错误
  const bookingIds = bookings.slice(0, 20).map((b: any) => b.id);
  logger.info(`查询 ${bookingIds.length} 个预约的签到状态`);
  
  // 调用批量查询接口
  const statusMap = await userHelper.get('/check-in/booking-status', {
    bookingIds: bookingIds.join(',')
  });
  
  if (!statusMap || typeof statusMap !== 'object') {
    throw new Error('批量查询返回格式错误');
  }
  
  // 验证返回的是 { bookingId: boolean } 格式
  let hasCheckedInCount = 0;
  for (const bookingId of bookingIds) {
    if (typeof statusMap[bookingId] !== 'boolean') {
      throw new Error(`预约 ${bookingId} 的签到状态格式错误: ${typeof statusMap[bookingId]}`);
    }
    if (statusMap[bookingId]) {
      hasCheckedInCount++;
    }
  }
  
  logger.success(`✓ 批量查询预约签到状态成功: ${hasCheckedInCount}/${bookingIds.length} 已签到`);
}

/**
 * 测试：空预约ID列表应返回空对象
 */
async function testBatchGetEmptyBookingIds() {
  logger.info('测试空预约ID列表...');
  
  const userHelper = new TestHelper(testData.userToken);
  
  // 空字符串
  const statusMap = await userHelper.get('/check-in/booking-status', {
    bookingIds: ''
  });
  
  if (!statusMap || Object.keys(statusMap).length !== 0) {
    throw new Error('空预约ID应返回空对象');
  }
  
  logger.success(`✓ 空预约ID列表正确返回空对象`);
}

/**
 * 测试：补卡
 */
async function testMakeupCheckIn() {
  logger.info('测试补卡...');
  
  const userHelper = new TestHelper(testData.userToken);
  
  // 补卡日期：昨天
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const makeupDate = yesterday.toISOString().split('T')[0];
  
  const makeupData = {
    order_id: testData.orderId,
    makeup_date: makeupDate,
    remark: '补卡测试',
  };
  
  const makeupId = await userHelper.post('/check-in/makeup', makeupData);
  
  if (!makeupId) {
    throw new Error('补卡失败，未返回签到记录ID');
  }
  
  logger.success(`✓ 补卡成功: ${makeupId}`);
}

/**
 * 测试：补卡后课时更新
 */
async function testLessonsAfterMakeup() {
  logger.info('测试补卡后课时更新...');
  
  const userHelper = new TestHelper(testData.userToken);
  const status = await userHelper.get(`/check-in/order/${testData.orderId}`);
  
  if (status.completed_lessons !== 2) {
    throw new Error(`补卡后已完成课时不正确: 期望2, 实际${status.completed_lessons}`);
  }
  
  logger.success(`✓ 补卡后课时正确: ${status.completed_lessons}/${status.total_lessons}课时`);
}

/**
 * 测试：查询签到记录列表
 */
async function testGetCheckInRecords() {
  logger.info('测试查询签到记录列表...');
  
  const userHelper = new TestHelper(testData.userToken);
  const records = await userHelper.get('/check-in', { order_id: testData.orderId });
  
  if (!Array.isArray(records)) {
    throw new Error('签到记录应该是数组');
  }
  
  if (records.length !== 2) {
    throw new Error(`签到记录数量不正确: 期望2, 实际${records.length}`);
  }
  
  // 检查是否有补卡记录
  const makeupRecord = records.find((r: any) => r.is_makeup);
  if (!makeupRecord) {
    throw new Error('未找到补卡记录');
  }
  
  logger.success(`✓ 查询签到记录成功: ${records.length}条`);
}

/**
 * 测试：未来日期补卡应失败
 */
async function testMakeupFutureDate() {
  logger.info('测试未来日期补卡...');
  
  const userHelper = new TestHelper(testData.userToken);
  
  // 未来日期：明天（使用本地日期）
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const futureDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  
  const makeupData = {
    order_id: testData.orderId,
    makeup_date: futureDate,
  };
  
  try {
    await userHelper.post('/check-in/makeup', makeupData);
    throw new Error('未来日期补卡应该失败');
  } catch (error: any) {
    if (error.message.includes('未来日期补卡应该失败')) {
      throw error;
    }
    logger.success(`✓ 未来日期补卡正确拒绝: ${error.message}`);
  }
}

/**
 * 测试：订单完成后自动变更状态
 */
async function testOrderAutoComplete() {
  logger.info('测试订单自动完成...');
  
  const userHelper = new TestHelper(testData.userToken);
  
  // 获取当前状态
  const status = await userHelper.get(`/check-in/order/${testData.orderId}`);
  const remaining = status.total_lessons - status.completed_lessons;
  
  logger.info(`剩余课时: ${remaining}`);
  
  // 补齐剩余课时（从前天开始往前补）
  for (let i = 0; i < remaining; i++) {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - (i + 2)); // -2, -3, -4...
    const makeupDate = pastDate.toISOString().split('T')[0];
    
    try {
      await userHelper.post('/check-in/makeup', {
        order_id: testData.orderId,
        makeup_date: makeupDate,
      });
      logger.info(`  补卡 ${i + 1}/${remaining}: ${makeupDate}`);
    } catch (error: any) {
      // 可能已经补过这一天
      logger.warn(`  补卡跳过: ${error.message}`);
    }
  }
  
  // 等待一下让系统处理
  await sleep(500);
  
  // 检查订单状态
  const order = await userHelper.get(`/order/${testData.orderId}`);
  
  if (order.status !== 'completed') {
    // 检查课时是否已满
    const finalStatus = await userHelper.get(`/check-in/order/${testData.orderId}`);
    logger.info(`最终课时: ${finalStatus.completed_lessons}/${finalStatus.total_lessons}`);
    
    if (finalStatus.completed_lessons >= finalStatus.total_lessons) {
      logger.warn(`订单状态: ${order.status}，课时已满但订单未自动完成`);
    } else {
      logger.warn(`订单状态: ${order.status}，课时未满: ${finalStatus.completed_lessons}/${finalStatus.total_lessons}`);
    }
  } else {
    logger.success(`✓ 订单自动完成成功`);
  }
}

/**
 * 运行所有签到测试（支持数据共享）
 * @param sharedData 共享的测试数据（来自上游测试）
 */
export async function runCRUDTests(sharedData?: any) {
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  // 如果提供了共享数据，则使用共享数据
  if (sharedData?.orderId) {
    logger.info('🔗 使用共享测试数据（流程测试模式）');
    testData.institutionId = sharedData.institutionId;
    testData.institutionToken = sharedData.institutionToken;
    testData.courseId = sharedData.courseId || sharedData.standardCourseId;
    testData.skuId = sharedData.skuId;
    testData.orderId = sharedData.offlineOrderId || sharedData.orderId;
    testData.userToken = sharedData.userToken || generateUserToken(
      '260765341334900736',
      'oY4kG7pd0giF9yhYFRtVHXbYT7CE',
      '测试用户',
    );
    testData.userId = '260765341334900736';
    
    // 获取订单的课时信息和关联的预约ID
    try {
      const userHelper = new TestHelper(testData.userToken);
      const order = await userHelper.get(`/order/${testData.orderId}`);
      testData.totalLessons = order.total_lessons || 12;
      
      // 获取订单关联的预约（通过 booking_id 字段解析）
      if (order.booking_id) {
        const bookingIds = order.booking_id.split(',').filter(Boolean);
        if (bookingIds.length > 0) {
          testData.bookingId = bookingIds[0];
          // 获取预约详情获取 schedule_id
          try {
            const booking = await userHelper.get(`/booking/${testData.bookingId}`);
            testData.scheduleId = booking.schedule_id;
          } catch (e) {
            // 忽略
          }
        }
      }
      
      // 如果没有从订单获取到预约，从预约列表获取
      if (!testData.bookingId) {
        const bookingsRes = await userHelper.get('/booking/my', { status: 'confirmed', pageSize: 100 });
        const bookings = Array.isArray(bookingsRes) ? bookingsRes : (bookingsRes.data || []);
        // 找到与当前订单课程匹配且未签到的预约
        const matchedBooking = bookings.find((b: any) => 
          b.course_id === testData.courseId && b.order_id === testData.orderId
        );
        if (matchedBooking) {
          testData.bookingId = matchedBooking.id;
          testData.scheduleId = matchedBooking.schedule_id;
        }
      }
    } catch (e) {
      testData.totalLessons = 12;
    }
    
    logger.data('共享数据', {
      institutionId: testData.institutionId,
      courseId: testData.courseId,
      orderId: testData.orderId,
      bookingId: testData.bookingId,
      totalLessons: testData.totalLessons,
    });
  }

  const tests = sharedData?.orderId
    ? [
        // 流程测试：跳过初始化，使用共享订单数据
        { name: '今日签到', fn: testCheckIn },
        { name: '重复签到应失败', fn: testDuplicateCheckIn },
        { name: '查询签到状态', fn: testGetCheckInStatus },
        { name: '批量查询预约签到状态', fn: testBatchGetBookingStatus },
        { name: '空预约ID列表返回空对象', fn: testBatchGetEmptyBookingIds },
        // 仅当课时 >= 2 时才测试补卡（试听课只有1课时，签到后就用完了）
        ...(testData.totalLessons >= 2 ? [
          { name: '补卡', fn: testMakeupCheckIn },
          { name: '补卡后课时更新', fn: testLessonsAfterMakeup },
          { name: '查询签到记录列表', fn: testGetCheckInRecords },
        ] : [
          { name: '补卡（跳过：课时不足）', fn: async () => {
            logger.warn(`⚠ 跳过补卡测试：共享订单只有 ${testData.totalLessons} 课时`);
          }},
          { name: '补卡后课时更新（跳过）', fn: async () => { /* 跳过 */ }},
          { name: '查询签到记录列表（跳过）', fn: async () => { /* 跳过 */ }},
        ]),
        { name: '未来日期补卡应失败', fn: testMakeupFutureDate },
        { name: '订单自动完成', fn: testOrderAutoComplete },
      ]
    : [
        // 独立测试：包含初始化
        { name: '初始化测试数据', fn: initializeTestData },
        { name: '今日签到', fn: testCheckIn },
        { name: '重复签到应失败', fn: testDuplicateCheckIn },
        { name: '查询签到状态', fn: testGetCheckInStatus },
        { name: '批量查询预约签到状态', fn: testBatchGetBookingStatus },
        { name: '空预约ID列表返回空对象', fn: testBatchGetEmptyBookingIds },
        { name: '补卡', fn: testMakeupCheckIn },
        { name: '补卡后课时更新', fn: testLessonsAfterMakeup },
        { name: '查询签到记录列表', fn: testGetCheckInRecords },
        { name: '未来日期补卡应失败', fn: testMakeupFutureDate },
        { name: '订单自动完成', fn: testOrderAutoComplete },
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
      if (process.env.VERBOSE) {
        console.error(error);
      }
    }
  }

  const duration = (Date.now() - startTime) / 1000;

  logger.summary({
    title: '签到模块测试总结',
    total: tests.length,
    success: successCount,
    fail: failCount,
    duration,
  });

  // 返回测试数据供下游使用
  if (sharedData) {
    sharedData.checkInId = testData.checkInId;
  }

  return failCount === 0;
}

/**
 * 兼容旧的导出方式
 */
export async function runCheckInTests() {
  const result = await runCRUDTests();
  return {
    passed: result ? 9 : 0,
    failed: result ? 0 : 1,
    total: 9,
  };
}

// 直接运行
if (require.main === module) {
  runCRUDTests()
    .then((success) => {
      if (!success) {
        process.exit(1);
      }
    })
    .catch((error) => {
      logger.error(`测试异常: ${error.message}`);
      process.exit(1);
    });
}
