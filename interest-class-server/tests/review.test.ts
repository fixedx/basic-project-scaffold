/**
 * 评价CRUD测试（支持数据共享）
 * 
 * 功能：
 * - 支持独立运行（自行初始化测试数据）
 * - 支持流程测试（复用上游测试数据）
 * 
 * 使用方式：
 * 1. 独立运行：npx tsx tests/review.test.ts
 * 2. 流程测试：通过 run-all-tests.ts 传入共享数据
 */

import { TestHelper, sleep, generateUserToken } from './utils/test-client';
import { logger } from './utils/logger';
import { TestReview, TestCourse, TestOrder } from './utils/test-data';
import { createInstitution } from './utils/test-helpers/institution.helper';
import { createCourse } from './utils/test-helpers/course.helper';

// 存储测试数据
const testData = {
  reviewIds: [] as string[],
  excellentReviewId: '',
  goodReviewId: '',
  averageReviewId: '',
  // 基础数据
  userToken: '',
  institutionToken: '',
  userId: '',
  institutionId: '',
  courseId: '',
  skuId: '',
  orderId: '',
};

/**
 * 初始化测试数据（独立运行时使用）
 */
async function initializeTestData() {
  logger.info('开始初始化评价测试数据...');
  
  // 1. 创建家长用户（使用 generateUserToken 生成普通用户token）
  const userId = `review_user_${Date.now()}`;
  testData.userToken = generateUserToken(
    userId,
    `review_openid_${Date.now()}`,
    '评价测试用户',
  );
  testData.userId = userId;
  logger.info(`✓ 家长用户Token已生成: ${testData.userId}`);

  // 2. 创建课程机构
  const institutionResult = await createInstitution(new TestHelper(), {
    name: '课程机构',
    autoApprove: true,
  });
  testData.institutionId = institutionResult.institutionId;
  testData.institutionToken = institutionResult.token;
  logger.info(`✓ 课程机构创建成功: ${testData.institutionId}`);

  await sleep(1000);

  // 3. 创建课程
  const instHelper = new TestHelper(testData.institutionToken);
  const courseData: any = TestCourse.dance();
  courseData.title = `舞蹈试听课_${Date.now()}`;
  courseData.type = 'trial';
  courseData.institution_id = testData.institutionId;
  testData.courseId = await instHelper.post('/courses', courseData);
  testData.skuId = (await instHelper.get(`/courses/${testData.courseId}`)).skus[0].id;
  logger.info(`✓ 课程创建成功: ${testData.courseId}`);

  await sleep(500);

  // 4. 创建订单
  const userHelper = new TestHelper(testData.userToken);
  const orderData = TestOrder.offline();
  testData.orderId = await userHelper.post('/order', {
    ...orderData,
    course_id: testData.courseId,
    sku_id: testData.skuId,
  });
  logger.info(`✓ 订单创建成功: ${testData.orderId}`);

  await sleep(500);

  // 7. 确认支付
  await instHelper.put(`/order/${testData.orderId}/confirm-payment`, {
    transaction_no: `TXN_REVIEW_${Date.now()}`,
  });
  logger.info('✓ 订单支付确认成功');

  await sleep(500);

  // 8. 完成订单
  await instHelper.put(`/order/${testData.orderId}/complete`);
  logger.info('✓ 订单已完成');

  await sleep(500);

  logger.success('评价测试数据初始化完成！');
}

/**
 * 运行所有评价测试
 * @param sharedData 共享的测试数据（来自上游测试）
 */
export async function runCRUDTests(sharedData?: any) {
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  // 如果提供了共享数据，则使用共享数据
  if (sharedData) {
    logger.info('🔗 使用共享测试数据（流程测试模式）');
    Object.assign(testData, sharedData);
    logger.data('共享数据', {
      institutionId: testData.institutionId,
      courseId: testData.courseId,
      orderId: testData.orderId,
      userId: testData.userId,
    });
  }

  const tests = sharedData 
    ? [
        // 流程测试：跳过初始化
        { name: '创建五星评价', fn: testCreateExcellentReview },
        { name: '创建四星评价', fn: testCreateGoodReview },
        { name: '创建三星评价', fn: testCreateAverageReview },
        { name: '查询课程评价列表', fn: testListCourseReviews },
        { name: '查询机构评价列表', fn: testListInstitutionReviews },
        { name: '查询评价详情', fn: testGetReview },
        { name: '机构回复评价', fn: testReplyReview },
        { name: '查询课程平均评分', fn: testGetAverageRating },
        { name: '按评分筛选评价', fn: testFilterByRating },
      ]
    : [
        // 独立测试：包含初始化
        { name: '初始化测试数据', fn: initializeTestData },
        { name: '创建五星评价', fn: testCreateExcellentReview },
        { name: '创建四星评价', fn: testCreateGoodReview },
        { name: '创建三星评价', fn: testCreateAverageReview },
        { name: '查询课程评价列表', fn: testListCourseReviews },
        { name: '查询机构评价列表', fn: testListInstitutionReviews },
        { name: '查询评价详情', fn: testGetReview },
        { name: '机构回复评价', fn: testReplyReview },
        { name: '查询课程平均评分', fn: testGetAverageRating },
        { name: '按评分筛选评价', fn: testFilterByRating },
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
    title: '评价CRUD测试总结',
    total: tests.length,
    success: successCount,
    fail: failCount,
    duration,
  });

  // 返回测试数据供下游使用
  if (sharedData) {
    Object.assign(sharedData, testData);
  }

  return failCount === 0;
}

/**
 * 测试1: 创建五星评价
 */
async function testCreateExcellentReview() {
  const helper = new TestHelper(testData.userToken);

  const reviewData = TestReview.excellent();

  const data = {
    ...reviewData,
    course_id: testData.courseId,
    order_id: testData.orderId,
  };

  const result = await helper.post('/review', data);
  testData.excellentReviewId = result.id;
  testData.reviewIds.push(result.id);

  logger.info(`评价ID: ${result.id}`);

  // 验证返回数据（只返回id）
  if (!result.id || typeof result.id !== 'string') {
    throw new Error('未返回评价ID');
  }
}

/**
 * 测试2: 创建四星评价（不绑定订单，测试纯课程评价）
 */
async function testCreateGoodReview() {
  const helper = new TestHelper(testData.userToken);

  const reviewData = TestReview.good();

  // ⚠️ 不传 order_id：每个订单只能评价一次，四星/三星评价测试纯课程评价路径
  const data = {
    ...reviewData,
    course_id: testData.courseId,
  };

  const result = await helper.post('/review', data);
  testData.goodReviewId = result.id;
  testData.reviewIds.push(result.id);

  logger.info(`评价ID: ${result.id}`);
}

/**
 * 测试3: 创建三星评价（不绑定订单，测试纯课程评价）
 */
async function testCreateAverageReview() {
  const helper = new TestHelper(testData.userToken);

  const reviewData = TestReview.average();

  // ⚠️ 不传 order_id：每个订单只能评价一次，四星/三星评价测试纯课程评价路径
  const result = await helper.post('/review', {
    ...reviewData,
    course_id: testData.courseId,
  });

  testData.averageReviewId = result.id;
  testData.reviewIds.push(result.id);

  logger.info(`评价ID: ${result.id}`);
}

/**
 * 测试4: 查询课程评价列表
 */
async function testListCourseReviews() {
  const helper = new TestHelper();

  const result = await helper.get(
    `/review/course/${testData.courseId}`,
  );

  logger.info(`课程评价数量: ${result.length}`);

  if (!Array.isArray(result)) {
    throw new Error('返回数据格式错误');
  }

  // 验证是否包含刚创建的评价
  const createdCount = result.filter((review: any) =>
    testData.reviewIds.includes(review.id),
  ).length;

  logger.info(`找到已创建的评价数: ${createdCount}/${testData.reviewIds.length}`);
}

/**
 * 测试5: 查询机构评价列表
 */
async function testListInstitutionReviews() {
  const helper = new TestHelper();

  const result = await helper.get(
    `/review/institution/${testData.institutionId}`,
  );

  logger.info(`机构评价数量: ${result.length}`);

  if (!Array.isArray(result)) {
    throw new Error('返回数据格式错误');
  }
}

/**
 * 测试6: 查询评价详情
 */
async function testGetReview() {
  const helper = new TestHelper();

  const result = await helper.get(`/review/${testData.excellentReviewId}`);

  logger.info(`评价ID: ${result.id}`);
  logger.info(`评分: ${result.rating}星`);
  logger.info(`内容: ${result.content}`);

  if (result.id !== testData.excellentReviewId) {
    throw new Error('评价ID不匹配');
  }
}

/**
 * 测试7: 机构回复评价
 */
async function testReplyReview() {
  const helper = new TestHelper(testData.institutionToken);

  const reply = '感谢您的评价，期待您的再次光临！';

  await helper.put(`/review/${testData.excellentReviewId}/reply`, {
    reply,
  });

  await sleep(500);

  // 查询验证
  const result = await helper.get(`/review/${testData.excellentReviewId}`);

  logger.info(`机构回复: ${result.reply}`);

  if (result.reply !== reply) {
    throw new Error('回复内容不匹配');
  }
}

/**
 * 测试8: 查询课程平均评分
 */
async function testGetAverageRating() {
  const helper = new TestHelper();

  const result = await helper.get(
    `/review/course/${testData.courseId}/average-rating`,
  );

  logger.info(`平均评分: ${result.averageRating}星`);
  logger.info(`评价数量: ${result.count}个`);

  if (result.averageRating === undefined || result.count === undefined) {
    throw new Error('未返回必要字段');
  }
}

/**
 * 测试9: 按评分筛选评价
 */
async function testFilterByRating() {
  const helper = new TestHelper();

  // 测试筛选5星评价
  const result5 = await helper.get(
    `/review/course/${testData.courseId}?rating=5`,
  );

  logger.info(`5星评价数量: ${result5.length}`);

  // 验证筛选结果
  if (result5.length > 0) {
    const hasOther = result5.some((r: any) => r.rating !== 5);
    if (hasOther) {
      throw new Error('筛选结果包含非5星评价');
    }
  }
}

// 独立运行此文件
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
