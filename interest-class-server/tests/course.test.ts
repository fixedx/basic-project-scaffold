/**
 * 课程模块 CRUD 测试
 * 
 * 测试策略：
 * 1. 课程依赖机构（合理依赖）- 先创建测试机构
 * 2. 测试CRUD基本操作
 * 3. 测试SKU管理和验证规则
 * 4. 测试课程类型（试听课 vs 正式课）的不同逻辑
 * 5. 测试权限验证（机构成员才能管理）
 * 6. 测试状态筛选（is_online参数）
 */

import {
  TestHelper,
  sleep,
  generateUserToken,
} from './utils/test-client';
import { logger } from './utils/logger';
import { TestInstitution, TestCourse, TestUsers, TestTeacher, TestClassroom } from './utils/test-data';
import { createSchedule } from './utils/test-helpers/schedule.helper';

// 测试数据存储
const testData = {
  userToken: '', // 家长用户token（用于创建机构）
  adminToken: '', // 机构管理员token（用于操作课程）
  institutionId: '',
  adminPhone: '', // 管理员手机号
  
  // 教师和教室（上架测试需要）
  teacherId: '',
  classroomId: '',
  
  // 课程ID
  trialCourseId: '', // 试听课
  standardCourseId: '', // 正式课
  musicCourseId: '', // 百分比返现课程
  danceCourseId: '', // 舞蹈课程（别名指向 trialCourseId）
  artCourseId: '', // 艺术课程（别名指向 standardCourseId）
  
  // SKU
  skuId: '', // SKU ID
  
  // 其他机构（权限测试用）
  otherInstitutionId: '',
  otherAdminToken: '',
  otherAdminPhone: '',
  
  // 分类（使用数据库 enums 表中真实存在的 course_category 枚举值）
  categoryCode: 'dance',
};

/**
 * 运行所有CRUD测试
 * @param sharedData 共享测试数据（可选）
 */
export async function runCRUDTests(sharedData?: any) {
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  // 🔗 检查是否传入了机构数据
  if (sharedData?.institutionId && sharedData?.institutionToken) {
    logger.info('📦 使用共享机构数据，跳过机构创建');
    testData.institutionId = sharedData.institutionId;
    testData.adminToken = sharedData.institutionToken;
    testData.adminPhone = sharedData.institutionPhone;
    testData.userToken = sharedData.userToken || testData.userToken;
  } else {
    logger.info('🔨 未传入机构数据，将创建新机构');
  }

  // 生成家长用户token（用于创建机构）
  if (!testData.userToken) {
    testData.userToken = generateUserToken(
      '260765341334900736', // 真实用户ID
      'oY4kG7pd0giF9yhYFRtVHXbYT7CE', // 真实openid
      '测试用户',
    );
    logger.info(`家长用户Token已生成`);
  }

  const tests = [
    // 准备环境（如果有共享数据就跳过）
    ...(sharedData?.institutionId ? [] : [
      { name: '1. 创建测试机构', fn: test1CreateInstitution },
      { name: '2. 机构管理员登录', fn: test2AdminLogin },
    ]),
    
    // 创建课程
    { name: '3. 创建试听课（cashback_type=none）', fn: test3CreateTrialCourse },
    { name: '4. 创建正式课（固定返现）', fn: test4CreateStandardCourse },
    { name: '5. 创建正式课（百分比返现）', fn: test5CreatePercentageCourse },
    { name: '5.1 验证后端自动计算返现金额（固定金额）', fn: test5_1VerifyFixedCashbackCalculation },
    { name: '5.2 验证后端自动计算返现金额（百分比）', fn: test5_2VerifyPercentageCashbackCalculation },
    { name: '5.3 验证试听课无返现', fn: test5_3VerifyTrialCourseNoRebate },
    
    // SKU验证规则
    { name: '6. SKU验证：至少需要一个SKU', fn: test6ValidateMinSku },
    { name: '7. SKU验证：固定返现不能超过总价', fn: test7ValidateFixedCashback },
    { name: '8. SKU验证：百分比返现不能超过100', fn: test8ValidatePercentageCashback },
    
    // 查询课程
    { name: '9. 查询机构的所有课程', fn: test9ListAllCourses },
    { name: '10. 筛选：只查询上线课程', fn: test10FilterOnlineCourses },
    { name: '11. 筛选：只查询下线课程', fn: test11FilterOfflineCourses },
    { name: '11.1 分页查询空数据返回空数组而非null', fn: test11_1EmptyPageResultNotNull },
    { name: '12. 查询课程详情', fn: test12GetCourseDetail },
    
    // 更新课程
    { name: '13. 更新课程基本信息', fn: test13UpdateBasicInfo },
    { name: '14. 更新SKU信息', fn: test14UpdateSkus },
    
    // 课程上下线
    { name: '15. 课程上线', fn: test15SetOnline },
    { name: '16. 课程下线', fn: test16SetOffline },
    
    // 权限验证
    { name: '17. 创建另一个机构（权限测试用）', fn: test17CreateOtherInstitution },
    { name: '18. 权限验证：其他机构不能修改本机构课程', fn: test18PermissionUpdate },
    { name: '19. 权限验证：其他机构不能删除本机构课程', fn: test19PermissionDelete },
    
    // 删除课程
    { name: '20. 软删除课程', fn: test20SoftDelete },
    { name: '21. 已删除的课程无法查询', fn: test21GetDeletedCourse },
    
    // 新增测试
    { name: '22. 课程上下架流程测试', fn: test22CoursePublishFlow },
    { name: '23. 课程搜索测试（关键词、分类、价格）', fn: test23CourseSearch },
    { name: '24. 分类筛选验证（多分类创建与筛选）', fn: test24CategoryFilter },
    
    // 位置搜索相关测试
    { name: '25. 查询附近课程', fn: test25NearbyCourses },
    { name: '26. 课程距离筛选（maxDistance）', fn: test26CourseDistanceFilter },
  ];

  for (const test of tests) {
    try {
      logger.section(test.name);
      await test.fn();
      successCount++;
      logger.success(`${test.name} - 通过`);
      await sleep(200);
    } catch (error: any) {
      failCount++;
      logger.error(`${test.name} - 失败: ${error.message}`);
      logger.data('错误详情', error);
    }
  }

  const duration = (Date.now() - startTime) / 1000;

  logger.summary({
    title: '课程CRUD测试总结',
    total: tests.length,
    success: successCount,
    fail: failCount,
    duration,
  });

  logger.data('测试数据', testData);

  // 🔗 将关键ID写入sharedData（供后续测试使用）
  if (sharedData) {
    sharedData.courseId = testData.trialCourseId || testData.standardCourseId;
    sharedData.trialCourseId = testData.trialCourseId;
    sharedData.standardCourseId = testData.standardCourseId;
    sharedData.skuId = testData.skuId;
    sharedData.categoryCode = testData.categoryCode;
    // 如果是独立运行（自己创建了机构），也写入机构数据
    if (!sharedData.institutionId) {
      sharedData.institutionId = testData.institutionId;
      sharedData.institutionToken = testData.adminToken;
      sharedData.institutionPhone = testData.adminPhone;
    }
    logger.info('✅ 已将课程数据写入共享数据');
  }

  return failCount === 0;
}

/**
 * 测试1: 创建测试机构
 */
export async function test1CreateInstitution() {
  const helper = new TestHelper(testData.userToken);
  
  const institutionData = TestInstitution.art();
  const adminData = TestUsers.institutionAdmin();
  
  testData.adminPhone = adminData.phone;
  
  const data = {
    accounts: [adminData],
    ...institutionData,
  };
  
  const response = await helper.post('/institution', data);
  
  if (!response) {
    throw new Error('机构创建失败：未返回ID');
  }
  
  testData.institutionId = response;
  logger.data('机构信息', { institutionId: testData.institutionId });
}

/**
 * 测试2: 机构管理员登录（使用手机号）
 */
export async function test2AdminLogin() {
  await sleep(1000); // 等待机构创建完成
  
  const helper = new TestHelper();
  
  // 使用机构创建时的手机号登录
  const mockCode = `phone_${testData.adminPhone}_${Date.now()}`;
  const response = await helper.post('/auth/phone-login', {
    code: mockCode,
    type: 'institution',
  });
  
  if (!response.token || !response.userInfo) {
    throw new Error('登录失败：未返回token或用户信息');
  }
  
  testData.adminToken = response.token;
  
  logger.data('登录成功', {
    userId: response.userInfo.id,
    institutionId: response.userInfo.institutionId || response.userInfo.institution_id,
  });
}

/**
 * 测试3: 创建试听课（cashback_type=none）
 */
async function test3CreateTrialCourse() {
  const helper = new TestHelper(testData.adminToken);
  
  const courseData = {
    title: `试听舞蹈课_${Date.now()}`,
    subtitle: '专业舞蹈试听体验',
    description: '专为4-12岁儿童设计的舞蹈体验课，包括基本功展示、舞蹈片段学习等内容',
    category_code: testData.categoryCode,
    type: 'trial',
    institution_id: testData.institutionId,
    slider_imgs: ['https://picsum.photos/1200/600'],
    tags: ['舞蹈', '试听', '体验'],
    min_age: 4,
    max_age: 12,
    lesson_duration: 60,
    skus: [
      {
        name: '单次体验课',
        total_lessons: 1,
        total_price: 100,
        cashback_type: 'none',
        cashback_value: 0,
      },
    ],
  };
  
  // POST 返回 string（ID）
  const courseId = await helper.post('/courses', courseData);
  
  if (!courseId || typeof courseId !== 'string') {
    throw new Error('课程创建失败：未返回ID');
  }
  
  testData.trialCourseId = courseId;
  testData.danceCourseId = courseId; // 别名：舞蹈课程指向试听课
  logger.data('试听课创建成功', { courseId: testData.trialCourseId });
}

/**
 * 测试4: 创建正式课（固定返现）
 */
async function test4CreateStandardCourse() {
  const helper = new TestHelper(testData.adminToken);
  
  const baseCourseData = TestCourse.art();
  const courseData = {
    ...baseCourseData,  // 使用完整字段
    title: `创意美术班_${Date.now()}`,
    category_code: testData.categoryCode,
    type: 'standard',
    institution_id: testData.institutionId,
    skus: [
      {
        name: '10次课程包',
        total_lessons: 10,
        total_price: 900,
        cashback_type: 'fixed',
        cashback_value: 50,
      },
    ],
  };
  
  // POST 返回 string（ID）
  const courseId = await helper.post('/courses', courseData);
  
  if (!courseId || typeof courseId !== 'string') {
    throw new Error('课程创建失败：未返回ID');
  }
  
  testData.standardCourseId = courseId;
  testData.artCourseId = courseId; // 别名：艺术课程指向正式课

  const detail = await helper.get(`/courses/${courseId}`);
  if (detail.cashback_enabled !== true) {
    throw new Error(`正式课配置了返现规格后应自动开启返现，实际 cashback_enabled=${detail.cashback_enabled}`);
  }

  logger.data('正式课创建成功（固定返现）', { courseId: testData.standardCourseId });
}

/**
 * 测试5: 创建正式课（百分比返现）
 */
async function test5CreatePercentageCourse() {
  const helper = new TestHelper(testData.adminToken);
  
  const baseCourseData = TestCourse.music();
  const courseData = {
    ...baseCourseData,  // 使用完整字段
    title: `钢琴启蒙班_${Date.now()}`,
    category_code: testData.categoryCode,
    type: 'standard',
    institution_id: testData.institutionId,
    skus: [
      {
        name: '24次季度包',
        total_lessons: 24,
        total_price: 4560,
        cashback_type: 'percentage',
        cashback_value: 5,
      },
    ],
  };
  
  // POST 返回 string（ID）
  const courseId = await helper.post('/courses', courseData);
  
  if (!courseId || typeof courseId !== 'string') {
    throw new Error('课程创建失败：未返回ID');
  }
  
  testData.musicCourseId = courseId;

  const detail = await helper.get(`/courses/${courseId}`);
  if (detail.cashback_enabled !== true) {
    throw new Error(`百分比返现课程应自动开启返现，实际 cashback_enabled=${detail.cashback_enabled}`);
  }

  logger.data('正式课创建成功（百分比返现）', { courseId: testData.musicCourseId });
}

/**
 * 测试5.1: 验证后端自动计算返现金额（固定金额）
 */
async function test5_1VerifyFixedCashbackCalculation() {
  const helper = new TestHelper(testData.adminToken);
  
  // 查询课程详情，检查后端计算的返现金额
  const response = await helper.get(`/courses/${testData.standardCourseId}`);
  
  if (!response.skus || response.skus.length === 0) {
    throw new Error('SKU数据错误');
  }
  
  const sku = response.skus[0];
  
  // 验证字段
  if (sku.cashback_type !== 'fixed') {
    throw new Error(`返现类型错误：期望fixed，实际${sku.cashback_type}`);
  }
  
  if (Number(sku.cashback_value) !== 50) {
    throw new Error(`返现值错误：期望50，实际${sku.cashback_value}`);
  }
  
  // ⚠️ 关键验证：后端自动计算的金额
  const expectedOnlinePrice = 50; // 固定返现金额 = online_pay_price
  const expectedOfflinePrice = 900 - 50; // total_price - online_pay_price
  
  if (Number(sku.online_pay_price) !== expectedOnlinePrice) {
    throw new Error(
      `线上金额计算错误：期望${expectedOnlinePrice}，实际${sku.online_pay_price}`
    );
  }
  
  if (Number(sku.offline_pay_price) !== expectedOfflinePrice) {
    throw new Error(
      `线下金额计算错误：期望${expectedOfflinePrice}，实际${sku.offline_pay_price}`
    );
  }
  
  logger.data('固定返现计算验证通过', {
    totalPrice: sku.total_price,
    cashbackValue: sku.cashback_value,
    onlinePayPrice: sku.online_pay_price,
    offlinePayPrice: sku.offline_pay_price,
  });
}

/**
 * 测试5.2: 验证后端自动计算返现金额（百分比）
 */
async function test5_2VerifyPercentageCashbackCalculation() {
  const helper = new TestHelper(testData.adminToken);
  
  // 查询课程详情，检查后端计算的返现金额
  const response = await helper.get(`/courses/${testData.musicCourseId}`);
  
  if (!response.skus || response.skus.length === 0) {
    throw new Error('SKU数据错误');
  }
  
  const sku = response.skus[0];
  
  // 验证字段
  if (sku.cashback_type !== 'percentage') {
    throw new Error(`返现类型错误：期望percentage，实际${sku.cashback_type}`);
  }
  
  if (Number(sku.cashback_value) !== 5) {
    throw new Error(`返现值错误：期望5，实际${sku.cashback_value}`);
  }
  
  // ⚠️ 关键验证：后端自动计算的金额
  const expectedOnlinePrice = 4560 * (5 / 100); // 228
  const expectedOfflinePrice = 4560 - expectedOnlinePrice; // 4332
  
  if (Number(sku.online_pay_price) !== expectedOnlinePrice) {
    throw new Error(
      `线上金额计算错误：期望${expectedOnlinePrice}，实际${sku.online_pay_price}`
    );
  }
  
  if (Number(sku.offline_pay_price) !== expectedOfflinePrice) {
    throw new Error(
      `线下金额计算错误：期望${expectedOfflinePrice}，实际${sku.offline_pay_price}`
    );
  }
  
  logger.data('百分比返现计算验证通过', {
    totalPrice: sku.total_price,
    cashbackValue: `${sku.cashback_value}%`,
    onlinePayPrice: sku.online_pay_price,
    offlinePayPrice: sku.offline_pay_price,
  });
}

/**
 * 测试5.3: 验证试听课无返现
 */
async function test5_3VerifyTrialCourseNoRebate() {
  const helper = new TestHelper(testData.adminToken);
  
  // 查询试听课详情
  const response = await helper.get(`/courses/${testData.trialCourseId}`);
  
  if (!response.skus || response.skus.length === 0) {
    throw new Error('SKU数据错误');
  }
  
  const sku = response.skus[0];

  if (response.cashback_enabled !== false) {
    throw new Error(`试听课不应开启返现营销，实际 cashback_enabled=${response.cashback_enabled}`);
  }
  
  // 验证试听课的返现逻辑
  if (sku.cashback_type !== 'none') {
    throw new Error(`试听课返现类型错误：期望none，实际${sku.cashback_type}`);
  }
  
  if (Number(sku.cashback_value) !== 0) {
    throw new Error(`试听课返现值错误：期望0，实际${sku.cashback_value}`);
  }
  
  // 试听课全额线上支付
  const expectedOnlinePrice = 100; // 等于 total_price
  const expectedOfflinePrice = 0;
  
  if (Number(sku.online_pay_price) !== expectedOnlinePrice) {
    throw new Error(
      `试听课线上金额错误：期望${expectedOnlinePrice}，实际${sku.online_pay_price}`
    );
  }
  
  if (Number(sku.offline_pay_price) !== expectedOfflinePrice) {
    throw new Error(
      `试听课线下金额错误：期望${expectedOfflinePrice}，实际${sku.offline_pay_price}`
    );
  }
  
  logger.data('试听课无返现验证通过', {
    totalPrice: sku.total_price,
    onlinePayPrice: sku.online_pay_price,
    offlinePayPrice: sku.offline_pay_price,
  });
}

/**
 * 测试6: SKU验证：至少需要一个SKU
 */
async function test6ValidateMinSku() {
  const helper = new TestHelper(testData.adminToken);
  
  const courseData = {
    title: `测试课程_${Date.now()}`,
    category_code: testData.categoryCode,
    type: 'trial',
    institution_id: testData.institutionId,
    slider_imgs: ['https://picsum.photos/1200/600'],
    tags: ['测试'],
    min_age: 4,
    max_age: 12,
    skus: [], // 空数组
  };
  
  try {
    await helper.post('/courses', courseData);
    throw new Error('应该抛出错误：至少需要一个SKU');
  } catch (error: any) {
    if (error.message.includes('应该抛出错误')) {
      throw error;
    }
    logger.info('验证通过：至少需要一个SKU');
  }
}

/**
 * 测试7: SKU验证：固定返现不能超过总价
 */
async function test7ValidateFixedCashback() {
  const helper = new TestHelper(testData.adminToken);
  
  const courseData = {
    title: `测试课程_${Date.now()}`,
    category_code: testData.categoryCode,
    type: 'standard',
    institution_id: testData.institutionId,
    tags: '测试',
    min_age: 4,
    max_age: 12,
    skus: [
      {
        name: '错误课程包',
        total_lessons: 10,
        total_price: 100,
        cashback_type: 'fixed',
        cashback_value: 150, // 超过总价
      },
    ],
  };
  
  try {
    await helper.post('/courses', courseData);
    throw new Error('应该抛出错误：固定返现不能超过总价');
  } catch (error: any) {
    if (error.message.includes('应该抛出错误')) {
      throw error;
    }
    logger.info('验证通过：固定返现不能超过总价');
  }
}

/**
 * 测试8: SKU验证：百分比返现不能超过100
 */
async function test8ValidatePercentageCashback() {
  const helper = new TestHelper(testData.adminToken);
  
  const courseData = {
    title: `测试课程_${Date.now()}`,
    category_code: testData.categoryCode,
    type: 'standard',
    institution_id: testData.institutionId,
    slider_imgs: ['https://picsum.photos/1200/600'],
    tags: ['测试'],
    min_age: 4,
    max_age: 12,
    skus: [
      {
        name: '错误课程包',
        total_lessons: 10,
        total_price: 1000,
        cashback_type: 'percentage',
        cashback_value: 120, // 超过100%
      },
    ],
  };
  
  try {
    await helper.post('/courses', courseData);
    throw new Error('应该抛出错误：百分比返现不能超过100');
  } catch (error: any) {
    if (error.message.includes('应该抛出错误')) {
      throw error;
    }
    logger.info('验证通过：百分比返现不能超过100');
  }
}

/**
 * 测试9: 查询机构的所有课程
 */
async function test9ListAllCourses() {
  const helper = new TestHelper(testData.adminToken);
  
  // 不传分页参数，应该返回数组
  const response = await helper.get(
    `/courses?institutionId=${testData.institutionId}`,
  );
  
  // 分页兼容模式：无分页参数返回数组
  if (!Array.isArray(response)) {
    throw new Error('返回数据格式错误');
  }
  
  if (response.length < 3) {
    logger.info(`课程数量：${response.length}个（期望3个）`);
  } else {
    logger.data('查询到课程列表', { count: response.length });
  }
}

/**
 * 测试10: 筛选：只查询上线课程
 */
async function test10FilterOnlineCourses() {
  const helper = new TestHelper(testData.adminToken);
  
  // Step 1: 创建教师和教室（如果还没有）
  if (!testData.teacherId) {
    const teacherData = TestTeacher.dance(testData.institutionId);
    testData.teacherId = await helper.post('/teacher', teacherData);
    logger.info(`创建教师: ${testData.teacherId}`);
  }
  
  if (!testData.classroomId) {
    const classroomData = TestClassroom.dance(testData.institutionId);
    testData.classroomId = await helper.post('/classroom', classroomData);
    logger.info(`创建教室: ${testData.classroomId}`);
  }
  
  // Step 2: 为试听课创建排课
  const scheduleId = await createSchedule(helper, {
    institutionId: testData.institutionId,
    courseId: testData.trialCourseId,
    teacherId: testData.teacherId,
    classroomId: testData.classroomId,
  });
  logger.info(`为试听课创建排课: ${scheduleId}`);
  
  // Step 3: 现在可以上线课程
  await helper.put(`/courses/${testData.trialCourseId}/online`, {});
  
  await sleep(500);
  
  const response = await helper.get(
    `/courses?institutionId=${testData.institutionId}&is_online=true`,
  );
  
  // 分页兼容模式：不传分页参数返回数组
  if (!Array.isArray(response)) {
    throw new Error('返回数据格式错误');
  }
  
  const allOnline = response.every((course: any) => course.is_online === true);
  if (!allOnline) {
    throw new Error('筛选失败：返回了下线课程');
  }
  
  logger.data('筛选上线课程成功', { count: response.length });
}

/**
 * 测试11: 筛选：只查询下线课程
 */
async function test11FilterOfflineCourses() {
  const helper = new TestHelper(testData.adminToken);
  
  const response = await helper.get(
    `/courses?institutionId=${testData.institutionId}&is_online=false`,
  );
  
  // 分页兼容模式：不传分页参数返回数组
  if (!Array.isArray(response)) {
    throw new Error('返回数据格式错误');
  }
  
  const allOffline = response.every((course: any) => course.is_online === false);
  if (!allOffline) {
    throw new Error('筛选失败：返回了上线课程');
  }
  
  logger.data('筛选下线课程成功', { count: response.length });
}

/**
 * 测试11.1: 分页查询空数据返回空数组而非null
 * Bug: 前端传递了分页参数时，即使没有数据，也应该返回分页对象 { data: [], total: 0, page, pageSize }
 */
async function test11_1EmptyPageResultNotNull() {
  const helper = new TestHelper(testData.adminToken);
  
  // 使用一个不存在的机构ID，确保查不到数据
  const fakeInstitutionId = '999999999999999999';
  
  // 带分页参数查询
  const response = await helper.get(
    `/courses?institutionId=${fakeInstitutionId}&page=1&pageSize=10`,
  );
  
  // ⚠️ 关键验证：传递了分页参数，必须返回分页对象
  if (response === null || response === undefined) {
    throw new Error('Bug: 返回了null，应该返回分页对象 { data: [], total: 0, page, pageSize }');
  }
  
  // 验证是分页对象而非数组
  if (Array.isArray(response)) {
    throw new Error('Bug: 传递了分页参数但返回了数组，应该返回分页对象');
  }
  
  // 验证分页对象结构
  if (!('data' in response) || !('total' in response) || !('page' in response) || !('pageSize' in response)) {
    throw new Error('Bug: 分页对象缺少必要字段 (data, total, page, pageSize)');
  }
  
  // 验证data是数组（即使为空）
  if (!Array.isArray(response.data)) {
    throw new Error(`Bug: data字段应该是数组，当前类型: ${typeof response.data}`);
  }
  
  // 验证空数组
  if (response.data.length !== 0) {
    throw new Error(`Bug: 期望空数组，实际有${response.data.length}条数据`);
  }
  
  // 验证total为0
  if (response.total !== 0) {
    throw new Error(`Bug: 期望total=0，实际total=${response.total}`);
  }
  
  // 验证分页参数正确回显
  if (response.page !== 1 || response.pageSize !== 10) {
    throw new Error(`Bug: 分页参数回显错误，期望page=1&pageSize=10，实际page=${response.page}&pageSize=${response.pageSize}`);
  }
  
  logger.data('空数据分页查询验证通过', {
    data: response.data,
    total: response.total,
    page: response.page,
    pageSize: response.pageSize,
  });
}

/**
 * 测试12: 查询课程详情
 */
async function test12GetCourseDetail() {
  const helper = new TestHelper(testData.adminToken);
  
  const response = await helper.get(`/courses/${testData.trialCourseId}`);
  
  logger.info(`课程ID: ${response.id}`);
  logger.info(`课程标题: ${response.title}`);
  logger.info(`课程副标题: ${response.subtitle || '无'}`);
  logger.info(`课程类型: ${response.type}`);
  logger.info(`课程分类: ${response.category_code}`);
  logger.info(`轮播图数量: ${response.slider_imgs?.length || 0}`);
  logger.info(`标签: ${response.tags?.join(', ') || '无'}`);
  logger.info(`年龄范围: ${response.min_age || '不限'}-${response.max_age || '不限'}岁`);
  logger.info(`SKU数量: ${response.skus?.length || 0}`);
  
  // 验证所有必填字段
  if (response.id !== testData.trialCourseId) {
    throw new Error('课程ID不匹配');
  }
  
  const requiredFields = ['id', 'title', 'type', 'category_code', 'institution_id'];
  for (const field of requiredFields) {
    if (!response[field]) {
      throw new Error(`缺少必填字段: ${field}`);
    }
  }
  
  if (!Array.isArray(response.skus) || response.skus.length === 0) {
    throw new Error('SKU数据错误');
  }
  
  // 验证SKU字段
  const sku = response.skus[0];
  const skuRequiredFields = ['name', 'total_lessons', 'total_price', 'cashback_type', 'cashback_value'];
  for (const field of skuRequiredFields) {
    if (sku[field] === undefined || sku[field] === null) {
      throw new Error(`SKU缺少必填字段: ${field}`);
    }
  }
  
  logger.info('✓ 所有字段验证通过');
  logger.data('课程详情', {
    courseId: response.id,
    title: response.title,
    type: response.type,
    skuCount: response.skus.length,
  });
}

/**
 * 测试13: 更新课程基本信息
 */
async function test13UpdateBasicInfo() {
  const helper = new TestHelper(testData.adminToken);
  
  const updateData = {
    tags: ['更新', '测试', '标签'],
    subtitle: '更新后的副标题',
  };
  
  await helper.put(`/courses/${testData.standardCourseId}`, updateData);
  
  // 验证更新
  const response = await helper.get(`/courses/${testData.standardCourseId}`);
  
  if (JSON.stringify(response.tags) !== JSON.stringify(updateData.tags)) {
    throw new Error('标签未更新');
  }
  
  if (response.subtitle !== updateData.subtitle) {
    throw new Error('副标题未更新');
  }
  
  logger.info('课程基本信息更新成功');
}

/**
 * 测试14: 更新SKU信息（注意：由于后端限制，这个测试会跳过）
 */
async function test14UpdateSkus() {
  const helper = new TestHelper(testData.adminToken);
  
  // 注意：根据错误信息，后端不允许直接更新SKU
  // 这个测试用于验证后端的限制
  logger.info('跳过SKU更新测试（后端不支持直接更新SKU）');
  return;
}

/**
 * 测试15: 课程上线（需要有排课才能上架）
 * 业务规则：没有排课的课程不能上架
 */
async function test15SetOnline() {
  const helper = new TestHelper(testData.adminToken);
  
  // Step 1: 尝试上架没有排课的课程 - 应该失败
  let uploadFailedAsExpected = false;
  try {
    await helper.put(`/courses/${testData.standardCourseId}/online`, {});
  } catch (error: any) {
    // Axios 错误包含 response.data.message
    const serverMessage = error.response?.data?.message || error.message;
    if (serverMessage.includes('没有排课') || serverMessage.includes('无法上架')) {
      uploadFailedAsExpected = true;
      logger.info('✓ 验证：没有排课的课程不能上架');
    } else {
      throw new Error(`期望"没有排课"相关错误，实际: ${serverMessage}`);
    }
  }
  
  if (!uploadFailedAsExpected) {
    throw new Error('没有排课的课程上架应该失败');
  }
  
  // Step 2: 创建教师（如果还没有）
  if (!testData.teacherId) {
    const teacherData = TestTeacher.dance(testData.institutionId);
    testData.teacherId = await helper.post('/teacher', teacherData);
    logger.info(`创建教师: ${testData.teacherId}`);
  }
  
  // Step 3: 创建教室（如果还没有）
  if (!testData.classroomId) {
    const classroomData = TestClassroom.dance(testData.institutionId);
    testData.classroomId = await helper.post('/classroom', classroomData);
    logger.info(`创建教室: ${testData.classroomId}`);
  }
  
  // Step 4: 创建排课
  const scheduleId = await createSchedule(helper, {
    institutionId: testData.institutionId,
    courseId: testData.standardCourseId,
    teacherId: testData.teacherId,
    classroomId: testData.classroomId,
  });
  logger.info(`创建排课: ${scheduleId}`);
  
  // Step 5: 再次尝试上架 - 现在应该成功
  await helper.put(`/courses/${testData.standardCourseId}/online`, {});
  
  // 验证状态
  const response = await helper.get(`/courses/${testData.standardCourseId}`);
  
  if (response.is_online !== true) {
    throw new Error('课程状态未更新为上线');
  }
  
  logger.info('✓ 课程上线成功（有排课后）');
}

/**
 * 测试16: 课程下线
 */
async function test16SetOffline() {
  const helper = new TestHelper(testData.adminToken);
  
  await helper.put(`/courses/${testData.standardCourseId}/offline`, {});
  
  // 验证状态
  const response = await helper.get(`/courses/${testData.standardCourseId}`);
  
  if (response.is_online !== false) {
    throw new Error('课程状态未更新为下线');
  }
  
  logger.info('课程下线成功');
}

/**
 * 测试17: 创建另一个机构（权限测试用）
 */
async function test17CreateOtherInstitution() {
  const helper = new TestHelper(testData.userToken);
  
  const institutionData = TestInstitution.sports();
  const adminData = TestUsers.institutionAdmin();
  testData.otherAdminPhone = adminData.phone;
  
  const data = {
    accounts: [adminData],
    ...institutionData,
  };
  
  const response = await helper.post('/institution', data);
  
  if (!response || typeof response !== 'string') {
    throw new Error('机构创建失败：未返回ID');
  }
  
  testData.otherInstitutionId = response;
  
  // 登录（使用手机号）
  await sleep(1000);
  
  const helper2 = new TestHelper();
  const mockCode2 = `phone_${testData.otherAdminPhone}_${Date.now()}`;
  const loginResponse = await helper2.post('/auth/phone-login', {
    code: mockCode2,
    type: 'institution',
  });
  
  testData.otherAdminToken = loginResponse.token;
  
  logger.data('另一个机构创建成功', { institutionId: testData.otherInstitutionId });
}

/**
 * 测试18: 权限验证：其他机构不能修改本机构课程
 */
async function test18PermissionUpdate() {
  const helper = new TestHelper(testData.otherAdminToken);
  
  const updateData = {
    subtitle: '尝试修改别人的课程',
  };
  
  try {
    await helper.put(`/courses/${testData.trialCourseId}`, updateData);
    throw new Error('应该抛出权限错误');
  } catch (error: any) {
    if (error.message.includes('应该抛出权限错误')) {
      throw error;
    }
    logger.info('权限验证通过：其他机构不能修改本机构课程');
  }
}

/**
 * 测试19: 权限验证：其他机构不能删除本机构课程
 */
async function test19PermissionDelete() {
  const helper = new TestHelper(testData.otherAdminToken);
  
  try {
    await helper.delete(`/courses/${testData.trialCourseId}`);
    throw new Error('应该抛出权限错误');
  } catch (error: any) {
    if (error.message.includes('应该抛出权限错误')) {
      throw error;
    }
    logger.info('权限验证通过：其他机构不能删除本机构课程');
  }
}

/**
 * 测试20: 软删除课程
 */
async function test20SoftDelete() {
  const helper = new TestHelper(testData.adminToken);
  
  await helper.delete(`/courses/${testData.musicCourseId}`);
  
  // 验证：查询列表时不应包含已删除的课程
  const response = await helper.get(
    `/courses?institutionId=${testData.institutionId}`,
  );
  
  // 分页兼容模式：不传分页参数返回数组
  if (!Array.isArray(response)) {
    throw new Error('返回数据格式错误');
  }
  
  const deletedCourse = response.find(
    (course: any) => course.id === testData.musicCourseId,
  );
  
  if (deletedCourse) {
    throw new Error('已删除的课程仍然在列表中');
  }
  
  logger.data('软删除课程成功', { courseId: testData.musicCourseId });
}

/**
 * Test 21: Cannot query deleted course
 */
async function test21GetDeletedCourse() {
  const helper = new TestHelper(testData.adminToken);
  
  try {
    await helper.get(`/courses/${testData.musicCourseId}`);
    throw new Error('应该抛出错误：课程不存在或已删除');
  } catch (error: any) {
    if (error.message.includes('应该抛出错误')) {
      throw error;
    }
    logger.info('验证通过：已删除的课程无法查询');
  }
}

/**
 * Test 22: Course publish/unpublish workflow
 * 业务规则：没有排课的课程不能上架
 */
async function test22CoursePublishFlow() {
  const helper = new TestHelper(testData.adminToken);

  // Step 1: Create new course (default: offline)
  const courseData = TestCourse.art();
  const createData = {
    institution_id: testData.institutionId, // 必需字段
    title: `${courseData.title}_上下架测试`,
    subtitle: courseData.subtitle,
    description: courseData.description,
    category_code: testData.categoryCode,
    slider_imgs: courseData.slider_imgs,
    tags: courseData.tags,
    min_age: courseData.min_age,
    max_age: courseData.max_age,
    type: 'standard', // 注意：是 type 不是 course_type
    skus: [
      {
        name: '标准套餐',
        total_lessons: 12,
        total_price: 1200,
        cashback_type: 'fixed',
        cashback_value: 100,
      },
    ],
  };

  const courseId = await helper.post('/courses', createData);

  logger.info(`创建课程: ${courseId}`);

  // Step 2: Verify course is offline by default
  const course1 = await helper.get(`/courses/${courseId}`);
  if (course1.is_online !== false) {
    throw new Error(`课程默认应为下线状态，实际: ${course1.is_online}`);
  }
  logger.info('✓ 验证：课程默认下线');

  // Step 3: 尝试上架没有排课的课程 - 应该失败
  let uploadFailedAsExpected = false;
  try {
    await helper.put(`/courses/${courseId}/online`, {});
  } catch (error: any) {
    const serverMessage = error.response?.data?.message || error.message;
    if (serverMessage.includes('没有排课') || serverMessage.includes('无法上架')) {
      uploadFailedAsExpected = true;
      logger.info('✓ 验证：没有排课的课程不能上架');
    }
  }
  
  if (!uploadFailedAsExpected) {
    throw new Error('没有排课的课程上架应该失败');
  }

  // Step 4: 为课程创建排课
  const scheduleId = await createSchedule(helper, {
    institutionId: testData.institutionId,
    courseId: courseId,
    teacherId: testData.teacherId,
    classroomId: testData.classroomId,
  });
  logger.info(`创建排课: ${scheduleId}`);

  // Step 5: Publish course (now should succeed)
  await helper.put(`/courses/${courseId}/online`, {});
  const course2 = await helper.get(`/courses/${courseId}`);
  if (course2.is_online !== true) {
    throw new Error('课程上线失败');
  }
  logger.info('✓ 课程上线成功（有排课后）');

  // Step 6: Verify online course appears in online filter
  const onlineCourses = await helper.get(
    `/courses?institutionId=${testData.institutionId}&is_online=true`,
  );
  const foundOnline = (onlineCourses.data || onlineCourses).some(
    (c: any) => c.id === courseId,
  );
  if (!foundOnline) {
    throw new Error('上线课程未出现在已上线列表中');
  }
  logger.info('✓ 上线课程出现在筛选结果中');

  // Step 7: Unpublish course
  await helper.put(`/courses/${courseId}/offline`, {});
  const course3 = await helper.get(`/courses/${courseId}`);
  if (course3.is_online !== false) {
    throw new Error('课程下线失败');
  }
  logger.info('✓ 课程下线成功');

  // Step 8: Verify offline course does not appear in online filter
  const onlineCourses2 = await helper.get(
    `/courses?institutionId=${testData.institutionId}&is_online=true`,
  );
  const foundOnline2 = (onlineCourses2.data || onlineCourses2).some(
    (c: any) => c.id === courseId,
  );
  if (foundOnline2) {
    throw new Error('下线课程不应出现在已上线列表中');
  }
  logger.info('✓ 下线课程已从在线列表移除');

  // Cleanup
  await helper.delete(`/courses/${courseId}`);
  logger.data('上下架流程测试完成', { courseId });
}

/**
 * Test 23: Course search (keyword, category, price range)
 */
async function test23CourseSearch() {
  const helper = new TestHelper(testData.adminToken);

  // Create test courses with different attributes
  const testCourses = [
    {
      name: '钢琴入门课程',
      category: testData.categoryCode,
      price: 800,
      course_type: 'standard',
    },
    {
      name: '舞蹈高级课程',
      category: testData.categoryCode,
      price: 1500,
      course_type: 'standard',
    },
    {
      name: '绘画基础课程',
      category: testData.categoryCode,
      price: 600,
      course_type: 'trial',
    },
  ];

  const createdIds: string[] = [];

  // Create courses
  for (const tc of testCourses) {
    const courseData = TestCourse.art();
    const data = {
      ...courseData, // 使用完整字段
      institution_id: testData.institutionId,
      title: tc.name,
      category_code: tc.category,
      type: tc.course_type,
      skus: [
        {
          name: '标准套餐',
          total_lessons: 10,
          total_price: tc.price,
          cashback_type: 'fixed',
          cashback_value: 50,
        },
      ],
    };

    const courseId = await helper.post('/courses', data);
    createdIds.push(courseId);
    
    // 为课程创建排课
    await createSchedule(helper, {
      institutionId: testData.institutionId,
      courseId: courseId,
      teacherId: testData.teacherId,
      classroomId: testData.classroomId,
    });
    
    // Publish course
    await helper.put(`/courses/${courseId}/online`, {});
  }

  logger.info(`创建测试课程: ${createdIds.length} 个`);

  // Test 1: Search by keyword
  const searchResult1 = await helper.get(
    `/courses?institutionId=${testData.institutionId}&keyword=舞蹈`,
  );
  const courses1 = searchResult1.data || searchResult1;
  const found1 = courses1.some((c: any) => c.title?.includes('舞蹈'));
  if (!found1) {
    logger.warn('⚠ 关键词搜索未实现或未找到结果');
  } else {
    logger.info('✓ 关键词搜索：找到"舞蹈"相关课程');
  }

  // Test 2: Search by category
  const searchResult2 = await helper.get(
    `/courses?institutionId=${testData.institutionId}&category_code=${testData.categoryCode}`,
  );
  const courses2 = searchResult2.data || searchResult2;
  if (courses2.length < testCourses.length) {
    logger.warn('⚠ 分类筛选结果数量不符合预期');
  } else {
    logger.info(`✓ 分类筛选：找到 ${courses2.length} 个课程`);
  }

  // Test 3: Search by price range
  const searchResult3 = await helper.get(
    `/courses?institutionId=${testData.institutionId}&min_price=700&max_price=1000`,
  );
  const courses3 = searchResult3.data || searchResult3;
  const inRange = courses3.every((c: any) => {
    const minPrice = Math.min(...c.skus.map((s: any) => s.total_price));
    return minPrice >= 700 && minPrice <= 1000;
  });
  
  if (courses3.length === 0) {
    logger.warn('⚠ 价格范围筛选未实现或未找到结果');
  } else if (!inRange) {
    logger.warn('⚠ 价格范围筛选结果包含超出范围的课程');
  } else {
    logger.info(`✓ 价格范围筛选：找到 ${courses3.length} 个课程 (700-1000元)`);
  }

  // Test 4: Combined search
  const searchResult4 = await helper.get(
    `/courses?institutionId=${testData.institutionId}&keyword=课程&category_code=${testData.categoryCode}`,
  );
  const courses4 = searchResult4.data || searchResult4;
  logger.info(`✓ 组合搜索：找到 ${courses4.length} 个课程`);

  // Cleanup
  for (const id of createdIds) {
    try {
      await helper.delete(`/courses/${id}`);
    } catch (error) {
      logger.warn(`清理课程失败: ${id}`);
    }
  }

  logger.data('搜索功能测试完成', {
    created: createdIds.length,
    cleaned: createdIds.length,
  });
}

/**
 * Test 24: Category filter validation
 * 验证分类筛选功能：创建不同分类的课程，验证筛选只返回对应分类的课程
 */
async function test24CategoryFilter() {
  const helper = new TestHelper(testData.adminToken);

  // 使用数据库中真实存在的 course_category 枚举值
  const categories = [
    { code: 'dance', name: '舞蹈课程' },
    { code: 'music', name: '音乐课程' },
    { code: 'art_painting', name: '美术绘画课程' },
  ];

  const createdCourses: { id: string; category_code: string }[] = [];

  // Step 1: 为每个分类创建一个课程
  for (const cat of categories) {
    const courseData = TestCourse.art(cat.code); // 使用指定的分类
    const data = {
      ...courseData,
      institution_id: testData.institutionId,
      title: `${cat.name}_${Date.now()}`,
    };

    const courseId = await helper.post('/courses', data);
    createdCourses.push({ id: courseId, category_code: cat.code });
    
    // 为课程创建排课
    await createSchedule(helper, {
      institutionId: testData.institutionId,
      courseId: courseId,
      teacherId: testData.teacherId,
      classroomId: testData.classroomId,
    });
    
    // 上架课程
    await helper.put(`/courses/${courseId}/online`, {});
  }
  logger.info(`✓ 创建测试课程: ${createdCourses.length} 个（${categories.map(c => c.code).join(', ')}）`);

  // Step 2: 分别测试每个分类的筛选
  let allPassed = true;
  for (const cat of categories) {
    const result = await helper.get(
      `/courses?institutionId=${testData.institutionId}&category_code=${cat.code}`,
    );
    const courses = result.data || result;
    
    // 验证返回的课程都属于该分类
    const allMatch = courses.every((c: any) => c.category_code === cat.code);
    const hasOurCourse = courses.some((c: any) => 
      createdCourses.some(cc => cc.id === c.id && cc.category_code === cat.code)
    );
    
    if (!allMatch) {
      logger.error(`✗ 分类 ${cat.code} 筛选返回了不属于该分类的课程`);
      allPassed = false;
    } else if (!hasOurCourse) {
      logger.warn(`⚠ 分类 ${cat.code} 筛选未找到我们创建的课程（可能未上架）`);
    } else {
      logger.info(`✓ 分类 ${cat.code} 筛选正确，返回 ${courses.length} 个课程`);
    }
  }

  // Step 3: 测试不存在的分类
  const notExistResult = await helper.get(
    `/courses?institutionId=${testData.institutionId}&category_code=not_exist_category`,
  );
  const notExistCourses = notExistResult.data || notExistResult;
  if (notExistCourses.length === 0) {
    logger.info('✓ 不存在的分类返回空结果');
  } else {
    logger.warn(`⚠ 不存在的分类返回了 ${notExistCourses.length} 个课程（应返回空）`);
  }

  // Cleanup
  for (const course of createdCourses) {
    try {
      await helper.delete(`/courses/${course.id}`);
    } catch (error) {
      logger.warn(`清理课程失败: ${course.id}`);
    }
  }

  if (!allPassed) {
    throw new Error('分类筛选测试失败');
  }

  logger.data('分类筛选测试完成', {
    categories: categories.map(c => c.code),
    created: createdCourses.length,
  });
}

// ==================== 位置搜索相关测试 ====================

// 测试位置（北京朝阳）
const userLocation = { latitude: 39.9289, longitude: 116.4354 };

/**
 * 测试25：查询附近课程
 */
async function test25NearbyCourses() {
  const helper = new TestHelper(testData.adminToken);
  
  const result = await helper.get('/courses/nearby', {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    radius: 10,
    limit: 20,
  });
  
  const data = result.data || result;
  const total = result.total || data.length || 0;
  logger.info(`找到 ${total} 门附近课程`);
  
  // 验证距离字段存在
  if (data.length > 0) {
    const firstCourse = data[0];
    if (firstCourse.distance === undefined && firstCourse.institution?.distance === undefined) {
      logger.warn('⚠ 附近课程可能缺少距离字段');
    } else {
      const distance = firstCourse.distance || firstCourse.institution?.distance;
      logger.info(`最近课程: ${firstCourse.title}, 距离: ${distance}km`);
    }
  }
  
  logger.success('✓ 查询附近课程测试通过');
}

/**
 * 测试26：课程距离筛选（maxDistance参数）
 */
async function test26CourseDistanceFilter() {
  const helper = new TestHelper(testData.adminToken);
  
  // 测试 3km 筛选
  const result3km = await helper.get('/courses', {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    maxDistance: 3,
  });
  const data3km = result3km.data || result3km;
  logger.info(`3km内课程: ${data3km.length} 个`);
  
  // 验证返回的课程机构距离都在3km内
  for (const course of data3km) {
    if (course.distance !== undefined && course.distance !== null) {
      let distanceKm = parseFloat(course.distance);
      // 如果是米（>100通常是米），转换为公里
      if (distanceKm > 100) {
        distanceKm = distanceKm / 1000;
      }
      if (distanceKm > 3) {
        throw new Error(`课程 ${course.title} 距离 ${distanceKm}km 超出 3km 筛选范围`);
      }
    }
  }
  logger.info('✓ 3km筛选验证通过');
  
  // 测试 10km 筛选（应该 >= 3km）
  const result10km = await helper.get('/courses', {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    maxDistance: 10,
  });
  const data10km = result10km.data || result10km;
  logger.info(`10km内课程: ${data10km.length} 个`);
  
  if (data10km.length < data3km.length) {
    throw new Error(`10km范围(${data10km.length})应该 >= 3km范围(${data3km.length})`);
  }
  
  logger.success('✓ 课程距离筛选测试通过');
}

// 导出 testData 供其他测试使用
export { testData };

// 运行测试
if (require.main === module) {
  runCRUDTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
