/**
 * 反馈CRUD测试
 *
 * 功能：
 * - 创建反馈（建议/Bug/其他）
 * - 查询我的反馈列表
 * - 管理员查询所有反馈（分页、状态筛选）
 * - 管理员回复反馈
 * - 管理员更新状态
 * - 管理员删除反馈
 * - 统计数据
 *
 * 使用方式：
 * 1. 独立运行：npx tsx tests/feedback.test.ts
 * 2. 流程测试：通过 run-all-tests.ts 传入共享数据
 */

import { TestHelper, generateUserToken } from './utils/test-client';
import { logger } from './utils/logger';

// 存储测试数据
const testData = {
  userToken: '',
  userId: '',
  adminToken: '',
  adminUserId: '',
  feedbackIds: [] as string[],
  suggestionId: '',
  bugId: '',
  otherId: '',
};

/**
 * 前置步骤：生成用户Token
 */
async function setupUsers(sharedData?: any) {
  logger.section('前置准备：生成用户Token');

  // 普通用户
  if (sharedData?.userToken) {
    testData.userToken = sharedData.userToken;
    testData.userId = sharedData.userId || `fb_user_${Date.now()}`;
    logger.info('📦 使用共享用户数据');
  } else {
    testData.userId = `fb_user_${Date.now()}`;
    testData.userToken = generateUserToken(
      testData.userId,
      `fb_openid_${Date.now()}`,
      '反馈测试用户',
    );
    logger.info('✓ 生成普通用户Token');
  }

  // 管理员（复用普通用户 token，因为反馈管理不区分角色，只需登录）
  testData.adminUserId = `fb_admin_${Date.now()}`;
  testData.adminToken = generateUserToken(
    testData.adminUserId,
    `fb_admin_openid_${Date.now()}`,
    '管理员',
  );
  logger.info('✓ 生成管理员Token');

  logger.success('✓ 用户准备完成\n');
}

// ==================== 测试用例 ====================

/**
 * 测试 1：创建建议类反馈
 */
async function testCreateSuggestion() {
  const helper = new TestHelper(testData.userToken);

  const feedbackId = await helper.post('/feedback', {
    content: '希望能增加课程收藏功能，方便后续查看',
    type: 'suggestion',
    contact: '13800001111',
    page_source: 'mine',
  });

  if (!feedbackId || typeof feedbackId !== 'string') {
    throw new Error(`创建建议反馈失败，返回值: ${feedbackId}`);
  }

  testData.suggestionId = feedbackId;
  testData.feedbackIds.push(feedbackId);
  logger.success(`✓ 创建建议反馈成功: ${feedbackId}`);
}

/**
 * 测试 2：创建Bug类反馈
 */
async function testCreateBug() {
  const helper = new TestHelper(testData.userToken);

  const feedbackId = await helper.post('/feedback', {
    content: '在课程详情页，点击预约按钮偶尔无响应，需要刷新页面后才能点击',
    type: 'bug',
    page_source: 'course-detail',
  });

  if (!feedbackId || typeof feedbackId !== 'string') {
    throw new Error(`创建Bug反馈失败，返回值: ${feedbackId}`);
  }

  testData.bugId = feedbackId;
  testData.feedbackIds.push(feedbackId);
  logger.success(`✓ 创建Bug反馈成功: ${feedbackId}`);
}

/**
 * 测试 3：创建其他类型反馈（无联系方式、无来源）
 */
async function testCreateOther() {
  const helper = new TestHelper(testData.userToken);

  const feedbackId = await helper.post('/feedback', {
    content: '整体使用体验很好，希望继续保持',
    type: 'other',
  });

  if (!feedbackId || typeof feedbackId !== 'string') {
    throw new Error(`创建其他反馈失败，返回值: ${feedbackId}`);
  }

  testData.otherId = feedbackId;
  testData.feedbackIds.push(feedbackId);
  logger.success(`✓ 创建其他反馈成功: ${feedbackId}`);
}

/**
 * 测试 4：创建反馈 - 内容为空应报错
 */
async function testCreateWithoutContent() {
  const helper = new TestHelper(testData.userToken);

  try {
    await helper.post('/feedback', {
      content: '',
      type: 'suggestion',
    });
    throw new Error('应该报错但未报错');
  } catch (error: any) {
    if (error.message === '应该报错但未报错') throw error;
    logger.success('✓ 空内容正确报错');
  }
}

/**
 * 测试 5：未登录创建反馈应报错
 */
async function testCreateWithoutAuth() {
  const helper = new TestHelper(); // 无 token

  try {
    await helper.post('/feedback', {
      content: '未登录反馈',
      type: 'suggestion',
    });
    throw new Error('应该报错但未报错');
  } catch (error: any) {
    if (error.message === '应该报错但未报错') throw error;
    logger.success('✓ 未登录创建反馈正确报错');
  }
}

/**
 * 测试 6：查询我的反馈列表
 */
async function testGetMyFeedbacks() {
  const helper = new TestHelper(testData.userToken);

  const list = await helper.get('/feedback/my');

  if (!Array.isArray(list)) {
    throw new Error(`返回值应为数组，实际: ${typeof list}`);
  }

  if (list.length < 3) {
    throw new Error(`应至少有3条反馈，实际: ${list.length}`);
  }

  // 验证数据结构
  const feedback = list[0];
  if (!feedback.id || !feedback.content || !feedback.type || !feedback.status) {
    throw new Error(`反馈数据结构不完整: ${JSON.stringify(feedback)}`);
  }

  logger.success(`✓ 查询我的反馈列表成功，共 ${list.length} 条`);
}

/**
 * 测试 7：管理员查询全部反馈（分页）
 */
async function testAdminGetAll() {
  const helper = new TestHelper(testData.adminToken);

  const result = await helper.get('/feedback', { page: 1, pageSize: 10 });

  if (!result.data || typeof result.total !== 'number') {
    throw new Error(`分页数据结构不完整: ${JSON.stringify(result)}`);
  }

  if (result.data.length === 0) {
    throw new Error('应至少有反馈数据');
  }

  logger.success(`✓ 管理员查询全部反馈成功，共 ${result.total} 条`);
}

/**
 * 测试 8：管理员按状态筛选
 */
async function testAdminFilterByStatus() {
  const helper = new TestHelper(testData.adminToken);

  const result = await helper.get('/feedback', {
    page: 1,
    pageSize: 10,
    status: 'pending',
  });

  if (!result.data) {
    throw new Error('筛选结果数据结构不完整');
  }

  // 所有结果的状态应该是 pending
  for (const item of result.data) {
    if (item.status !== 'pending') {
      throw new Error(`状态筛选错误，期望 pending，实际 ${item.status}`);
    }
  }

  logger.success(`✓ 按状态筛选成功，pending 共 ${result.data.length} 条`);
}

/**
 * 测试 9：管理员按类型筛选
 */
async function testAdminFilterByType() {
  const helper = new TestHelper(testData.adminToken);

  const result = await helper.get('/feedback', {
    page: 1,
    pageSize: 10,
    type: 'bug',
  });

  if (!result.data) {
    throw new Error('筛选结果数据结构不完整');
  }

  for (const item of result.data) {
    if (item.type !== 'bug') {
      throw new Error(`类型筛选错误，期望 bug，实际 ${item.type}`);
    }
  }

  logger.success(`✓ 按类型筛选成功，bug 共 ${result.data.length} 条`);
}

/**
 * 测试 10：获取反馈详情
 */
async function testGetDetail() {
  const helper = new TestHelper(testData.adminToken);

  const detail = await helper.get(`/feedback/${testData.suggestionId}`);

  if (!detail || detail.id !== testData.suggestionId) {
    throw new Error(`反馈详情查询失败: ${JSON.stringify(detail)}`);
  }

  if (detail.content !== '希望能增加课程收藏功能，方便后续查看') {
    throw new Error(`内容不匹配: ${detail.content}`);
  }

  if (detail.type !== 'suggestion') {
    throw new Error(`类型不匹配: ${detail.type}`);
  }

  logger.success('✓ 获取反馈详情成功');
}

/**
 * 测试 11：管理员回复反馈
 */
async function testAdminReply() {
  const helper = new TestHelper(testData.adminToken);

  await helper.put(`/feedback/${testData.suggestionId}/reply`, {
    reply: '感谢您的建议，我们已收到并将在后续版本中考虑加入收藏功能。',
    status: 'processing',
  });

  // 验证回复已保存
  const detail = await helper.get(`/feedback/${testData.suggestionId}`);
  if (!detail.reply) {
    throw new Error('回复内容未保存');
  }
  if (detail.status !== 'processing') {
    throw new Error(`状态未更新，期望 processing，实际 ${detail.status}`);
  }

  logger.success('✓ 管理员回复反馈成功');
}

/**
 * 测试 12：管理员更新状态为已解决
 */
async function testAdminResolve() {
  const helper = new TestHelper(testData.adminToken);

  await helper.put(`/feedback/${testData.bugId}/reply`, {
    reply: '该问题已在最新版本修复，请更新后重试。',
    status: 'resolved',
  });

  const detail = await helper.get(`/feedback/${testData.bugId}`);
  if (detail.status !== 'resolved') {
    throw new Error(`状态未更新为 resolved，实际 ${detail.status}`);
  }

  logger.success('✓ 管理员标记已解决成功');
}

/**
 * 测试 13：获取统计数据
 */
async function testGetStats() {
  const helper = new TestHelper(testData.adminToken);

  const stats = await helper.get('/feedback/stats');

  if (typeof stats.total !== 'number') {
    throw new Error(`统计数据结构不完整: ${JSON.stringify(stats)}`);
  }
  if (typeof stats.pending !== 'number') {
    throw new Error(`缺少 pending 统计`);
  }
  if (typeof stats.processing !== 'number') {
    throw new Error(`缺少 processing 统计`);
  }
  if (typeof stats.resolved !== 'number') {
    throw new Error(`缺少 resolved 统计`);
  }

  logger.success(`✓ 获取统计数据成功: 总${stats.total} 待处理${stats.pending} 处理中${stats.processing} 已解决${stats.resolved}`);
}

/**
 * 测试 14：管理员删除反馈
 */
async function testAdminDelete() {
  const helper = new TestHelper(testData.adminToken);

  await helper.delete(`/feedback/${testData.otherId}`);

  // 验证已删除（查询应报错或返回空）
  try {
    await helper.get(`/feedback/${testData.otherId}`);
    throw new Error('删除后仍能查到，删除失败');
  } catch (error: any) {
    if (error.message === '删除后仍能查到，删除失败') throw error;
    logger.success('✓ 管理员删除反馈成功');
  }
}

// ==================== 测试执行器 ====================

const tests = [
  { name: '创建建议反馈', fn: testCreateSuggestion },
  { name: '创建Bug反馈', fn: testCreateBug },
  { name: '创建其他反馈', fn: testCreateOther },
  { name: '空内容应报错', fn: testCreateWithoutContent },
  { name: '未登录应报错', fn: testCreateWithoutAuth },
  { name: '查询我的反馈', fn: testGetMyFeedbacks },
  { name: '管理员查询全部', fn: testAdminGetAll },
  { name: '按状态筛选', fn: testAdminFilterByStatus },
  { name: '按类型筛选', fn: testAdminFilterByType },
  { name: '获取反馈详情', fn: testGetDetail },
  { name: '管理员回复反馈', fn: testAdminReply },
  { name: '管理员标记已解决', fn: testAdminResolve },
  { name: '获取统计数据', fn: testGetStats },
  { name: '管理员删除反馈', fn: testAdminDelete },
];

export async function runCRUDTests(sharedData?: any): Promise<boolean> {
  logger.step('反馈管理测试');
  const startTime = Date.now();
  let success = 0;
  let fail = 0;

  try {
    await setupUsers(sharedData);
  } catch (error) {
    logger.error('前置准备失败，跳过全部测试');
    return false;
  }

  for (const test of tests) {
    try {
      await test.fn();
      success++;
    } catch (error: any) {
      fail++;
      logger.error(`✗ ${test.name} 失败: ${error.message}`);
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  logger.summary({
    title: '反馈管理测试',
    total: tests.length,
    success,
    fail,
    duration,
  });

  return fail === 0;
}

// 独立运行
const isRunDirectly = require.main === module ||
  process.argv[1]?.includes('feedback.test');

if (isRunDirectly) {
  runCRUDTests()
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch(() => process.exit(1));
}
