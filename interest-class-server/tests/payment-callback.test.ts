/**
 * 支付回调幂等测试
 *
 * 覆盖场景：
 * 1. 支付成功回调 — 体验课 → 自动确认（pending → confirmed）
 * 2. 支付成功回调 — 正式课 → 待确认（pending → pending_confirm）
 * 3. 支付成功回调 — 重复回调（幂等：已处理的订单不重复处理）
 * 4. 退款回调 SUCCESS — 订单在 refunding 状态，触发状态迁移和全套副作用
 * 5. 退款回调 SUCCESS — 订单已 refunded（processRefund 同步路径已处理），副作用不重复执行
 * 6. 退款回调 ABNORMAL — 退款异常，回退为 refunding
 * 7. 退款回调 CLOSED   — 退款关闭，回退为 refunding
 *
 * 前置条件：
 * - 服务器已启动（http://localhost:8888）
 * - PAYMENT_TEST_MODE=true（不调用真实微信API，支持 test_data 明文绕过）
 * - sharedData 中有 institutionToken / userToken / trialCourseId / standardCourseId
 */

import axios from 'axios';
import { TestHelper, generateUserToken, sleep } from './utils/test-client';
import { logger } from './utils/logger';
import { TestOrder } from './utils/test-data';
import { createInstitution, createCourse } from './utils/test-helpers';

// ==================== 测试状态 ====================
const testData = {
  userToken: '',
  userId: '260765341334900736',
  institutionToken: '',
  institutionId: '',
  trialCourseId: '',
  standardCourseId: '',

  // 测试中创建的订单
  trialOrderId: '',
  trialOrderNo: '',
  standardOrderId: '',
  standardOrderNo: '',
  refundOrderId: '',
  refundOrderNo: '',
};

// 回调端点不走标准 API 响应格式，需直接使用 axios
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8888/api';

/**
 * 调用支付回调端点（不需要 Bearer token，直接发送）
 */
async function callPaymentNotify(body: any) {
  const resp = await axios.post(`${BASE_URL}/payment/notify`, body, {
    headers: { 'Content-Type': 'application/json' },
    validateStatus: () => true, // 不抛 HTTP 错误，让测试代码自己判断
  });
  return resp.data as { code: string; message: string };
}

/**
 * 调用退款回调端点
 */
async function callRefundNotify(body: any) {
  const resp = await axios.post(`${BASE_URL}/payment/refund-notify`, body, {
    headers: { 'Content-Type': 'application/json' },
    validateStatus: () => true,
  });
  return resp.data as { code: string; message: string };
}

// ==================== 初始化 ====================

async function testInitialize(sharedData?: any) {
  if (sharedData?.trialCourseId && sharedData?.standardCourseId) {
    // 复用共享数据
    testData.institutionId = sharedData.institutionId;
    testData.institutionToken = sharedData.institutionToken;
    testData.userToken = sharedData.userToken || generateUserToken(
      testData.userId,
      'oY4kG7pd0giF9yhYFRtVHXbYT7CE',
      '测试用户',
    );
    testData.trialCourseId = sharedData.trialCourseId;
    testData.standardCourseId = sharedData.standardCourseId;
    logger.info(`📦 复用共享数据 — 机构: ${testData.institutionId}`);
    logger.info(`   体验课: ${testData.trialCourseId}`);
    logger.info(`   正式课: ${testData.standardCourseId}`);
    return;
  }

  // 自建测试数据
  testData.userToken = generateUserToken(
    testData.userId,
    'oY4kG7pd0giF9yhYFRtVHXbYT7CE',
    '支付回调测试用户',
  );
  const userHelper = new TestHelper(testData.userToken);

  const institution = await createInstitution(userHelper, {
    name: '支付回调测试机构',
    categoryIds: ['art'],
    autoApprove: true,
  });
  testData.institutionId = institution.institutionId;
  testData.institutionToken = institution.token;
  const adminHelper = new TestHelper(testData.institutionToken);

  testData.trialCourseId = await createCourse(adminHelper, {
    institutionId: testData.institutionId,
    title: '体验课（回调测试）',
    categoryCode: 'art_dance',
    type: 'trial',
    minAge: 4,
    maxAge: 12,
    autoOnline: true,
  });

  testData.standardCourseId = await createCourse(adminHelper, {
    institutionId: testData.institutionId,
    title: '正式课（回调测试）',
    categoryCode: 'art_painting',
    type: 'standard',
    minAge: 5,
    maxAge: 10,
    autoOnline: true,
  });

  logger.info(`✓ 机构: ${testData.institutionId}`);
  logger.info(`✓ 体验课: ${testData.trialCourseId}`);
  logger.info(`✓ 正式课: ${testData.standardCourseId}`);
}

// ==================== 辅助：创建订单 ====================

async function createOrder(courseId: string, paymentMethod: 'wechat' | 'offline' = 'wechat') {
  const userHelper = new TestHelper(testData.userToken);
  const courseHelper = new TestHelper(testData.institutionToken);

  const course = await courseHelper.get(`/courses/${courseId}`);
  if (!course || !course.skus?.length) {
    throw new Error(`课程 ${courseId} 无 SKU`);
  }
  const sku = course.skus[0];

  const schedules = await userHelper.get(`/schedule/course/${courseId}`);
  if (!schedules || schedules.length === 0) {
    throw new Error(`课程 ${courseId} 无排课`);
  }

  const orderBase = paymentMethod === 'wechat' ? TestOrder.online() : TestOrder.offline();
  const orderId = await userHelper.post('/order', {
    ...orderBase,
    course_id: courseId,
    sku_id: sku.id,
    schedule_ids: [schedules[0].id],
  });

  if (!orderId || typeof orderId !== 'string') {
    throw new Error('订单创建失败：未返回ID');
  }

  const order = await userHelper.get(`/order/${orderId}`);
  return { id: orderId, order_no: order.order_no, status: order.status };
}

// ==================== 测试用例 ====================

/**
 * 测试1: 支付成功回调 — 体验课自动确认
 */
async function testPaymentNotify_trialOrder() {
  const order = await createOrder(testData.trialCourseId, 'wechat');
  testData.trialOrderId = order.id;
  testData.trialOrderNo = order.order_no;

  if (order.status !== 'pending') {
    throw new Error(`体验课订单初始状态应为 pending，实际: ${order.status}`);
  }

  // 发送支付成功回调
  const notifyResp = await callPaymentNotify({
    test_data: {
      out_trade_no: testData.trialOrderNo,
      transaction_id: `TEST_TX_TRIAL_${Date.now()}`,
    },
  });

  if (notifyResp.code !== 'SUCCESS') {
    throw new Error(`支付回调返回非成功: ${JSON.stringify(notifyResp)}`);
  }

  await sleep(300);

  // 验证订单状态变为 confirmed（体验课自动确认）
  const userHelper = new TestHelper(testData.userToken);
  const updated = await userHelper.get(`/order/${testData.trialOrderId}`);
  if (updated.status !== 'confirmed') {
    throw new Error(`体验课支付后状态应为 confirmed，实际: ${updated.status}`);
  }

  logger.info(`✓ 体验课订单已自动确认: ${testData.trialOrderNo}`);
}

/**
 * 测试2: 支付成功回调 — 正式课进入待确认
 */
async function testPaymentNotify_standardOrder() {
  const order = await createOrder(testData.standardCourseId, 'wechat');
  testData.standardOrderId = order.id;
  testData.standardOrderNo = order.order_no;

  if (order.status !== 'pending') {
    throw new Error(`正式课订单初始状态应为 pending，实际: ${order.status}`);
  }

  const notifyResp = await callPaymentNotify({
    test_data: {
      out_trade_no: testData.standardOrderNo,
      transaction_id: `TEST_TX_STD_${Date.now()}`,
    },
  });

  if (notifyResp.code !== 'SUCCESS') {
    throw new Error(`支付回调返回非成功: ${JSON.stringify(notifyResp)}`);
  }

  await sleep(300);

  const userHelper = new TestHelper(testData.userToken);
  const updated = await userHelper.get(`/order/${testData.standardOrderId}`);
  if (updated.status !== 'pending_confirm') {
    throw new Error(`正式课支付后状态应为 pending_confirm，实际: ${updated.status}`);
  }

  logger.info(`✓ 正式课订单进入待确认: ${testData.standardOrderNo}`);
}

/**
 * 测试3: 支付成功回调 — 重复回调幂等
 * 对已处理的订单再次发送支付回调，应返回成功但不重复处理
 */
async function testPaymentNotify_duplicate() {
  if (!testData.trialOrderNo) {
    throw new Error('需要先运行测试1（体验课支付回调）');
  }

  // trialOrderNo 已处于 confirmed 状态，再次发送回调
  const notifyResp = await callPaymentNotify({
    test_data: {
      out_trade_no: testData.trialOrderNo,
      transaction_id: `TEST_TX_DUP_${Date.now()}`,
    },
  });

  // 回调应返回 SUCCESS（不抛错，幂等处理）
  if (notifyResp.code !== 'SUCCESS') {
    throw new Error(`重复支付回调应返回 SUCCESS，实际: ${JSON.stringify(notifyResp)}`);
  }

  await sleep(200);

  // 订单状态不应被重置
  const userHelper = new TestHelper(testData.userToken);
  const order = await userHelper.get(`/order/${testData.trialOrderId}`);
  if (order.status !== 'confirmed') {
    throw new Error(`重复回调后订单状态被意外改变为: ${order.status}`);
  }

  logger.info(`✓ 重复支付回调已被幂等处理，订单状态保持 confirmed`);
}

/**
 * 测试4: 退款回调 SUCCESS — refunding → refunded（副作用首次执行）
 *
 * 流程：创建订单 → 支付 → 机构确认 → 申请退款（→ refunding）→ 发送退款成功回调
 */
async function testRefundNotify_successFromRefunding() {
  // 创建正式课订单，走完支付 + 机构确认 + 申请退款，使订单进入 refunding
  const order = await createOrder(testData.standardCourseId, 'wechat');
  testData.refundOrderId = order.id;
  testData.refundOrderNo = order.order_no;

  // Step1: 支付成功回调 → pending_confirm
  await callPaymentNotify({
    test_data: {
      out_trade_no: testData.refundOrderNo,
      transaction_id: `TEST_TX_REFUND_${Date.now()}`,
    },
  });
  await sleep(300);

  // Step2: 机构确认订单 → confirmed
  const institutionHelper = new TestHelper(testData.institutionToken);
  await institutionHelper.put(`/order/${testData.refundOrderId}/confirm`);
  await sleep(300);

  // Step3: 用户申请退款 → refunding
  const userHelper = new TestHelper(testData.userToken);
  await userHelper.put(`/order/${testData.refundOrderId}/apply-refund`, {
    refund_reason: '测试退款回调',
  });
  await sleep(300);

  // 验证当前状态为 refunding
  let currentOrder = await userHelper.get(`/order/${testData.refundOrderId}`);
  if (!['refunding', 'refund_pending'].includes(currentOrder.status)) {
    throw new Error(`申请退款后状态应为 refunding/refund_pending，实际: ${currentOrder.status}`);
  }

  logger.info(`✓ 订单已进入退款状态: ${currentOrder.status}`);

  // Step4: 发送退款成功回调 → refunded（副作用应执行一次）
  const refundNotifyResp = await callRefundNotify({
    test_data: {
      out_trade_no: testData.refundOrderNo,
      out_refund_no: `TEST_REFUND_${Date.now()}`,
      refund_status: 'SUCCESS',
    },
  });

  if (refundNotifyResp.code !== 'SUCCESS') {
    throw new Error(`退款回调返回非成功: ${JSON.stringify(refundNotifyResp)}`);
  }

  await sleep(500);

  currentOrder = await userHelper.get(`/order/${testData.refundOrderId}`);
  if (currentOrder.status !== 'refunded') {
    throw new Error(`退款成功回调后状态应为 refunded，实际: ${currentOrder.status}`);
  }

  const bookingIds = String(currentOrder.booking_id || '')
    .split(',')
    .map((id: string) => id.trim())
    .filter(Boolean);
  if (bookingIds.length === 0) {
    throw new Error('退款订单缺少 booking_id，无法验证预约取消副作用');
  }

  for (const bookingId of bookingIds) {
    const booking = await userHelper.get(`/booking/${bookingId}`);
    if (booking.status !== 'cancelled') {
      throw new Error(`退款成功后预约应为 cancelled，booking=${bookingId}, 实际=${booking.status}`);
    }
  }

  logger.info(`✓ 退款成功回调处理完毕，订单状态已变为 refunded`);
}

/**
 * 测试5: 退款回调 SUCCESS — 订单已 refunded（幂等保护，副作用不重复执行）
 *
 * 在测试4之后，再次发送同一笔订单的退款成功回调。
 * 由于 processRefund 同步路径或上一个回调已将订单置为 refunded，
 * wasTransitioned 将为 false，跳过所有副作用。
 */
async function testRefundNotify_successAlreadyRefunded() {
  if (!testData.refundOrderNo) {
    throw new Error('需要先运行测试4（退款回调 SUCCESS from refunding）');
  }

  // 验证订单已为 refunded
  const userHelper = new TestHelper(testData.userToken);
  const before = await userHelper.get(`/order/${testData.refundOrderId}`);
  if (before.status !== 'refunded') {
    throw new Error(`测试前置条件失败：订单应为 refunded，实际: ${before.status}`);
  }

  // 再次发送退款成功回调
  const notifyResp = await callRefundNotify({
    test_data: {
      out_trade_no: testData.refundOrderNo,
      out_refund_no: `TEST_REFUND_DUP_${Date.now()}`,
      refund_status: 'SUCCESS',
    },
  });

  if (notifyResp.code !== 'SUCCESS') {
    throw new Error(`重复退款回调应返回 SUCCESS，实际: ${JSON.stringify(notifyResp)}`);
  }

  await sleep(300);

  // 订单状态应保持 refunded，不被重置
  const after = await userHelper.get(`/order/${testData.refundOrderId}`);
  if (after.status !== 'refunded') {
    throw new Error(`重复退款回调后状态被意外改变为: ${after.status}`);
  }

  logger.info(`✓ 重复退款回调已被幂等处理（wasTransitioned=false），订单状态保持 refunded`);
}

/**
 * 测试6: 退款回调 ABNORMAL — 退款异常，状态回退为 refunding
 */
async function testRefundNotify_abnormal() {
  // 创建一个新订单，让它进入 refunding 状态
  const order = await createOrder(testData.standardCourseId, 'wechat');

  // 支付成功
  await callPaymentNotify({
    test_data: {
      out_trade_no: order.order_no,
      transaction_id: `TEST_TX_ABN_${Date.now()}`,
    },
  });
  await sleep(300);

  // 机构确认
  const instHelper = new TestHelper(testData.institutionToken);
  await instHelper.put(`/order/${order.id}/confirm`);
  await sleep(200);

  // 申请退款
  const userHelper = new TestHelper(testData.userToken);
  await userHelper.put(`/order/${order.id}/apply-refund`, { refund_reason: '测试ABNORMAL回调' });
  await sleep(300);

  // 发送 ABNORMAL 退款回调
  const notifyResp = await callRefundNotify({
    test_data: {
      out_trade_no: order.order_no,
      out_refund_no: `TEST_REFUND_ABN_${Date.now()}`,
      refund_status: 'ABNORMAL',
    },
  });

  if (notifyResp.code !== 'SUCCESS') {
    throw new Error(`退款ABNORMAL回调应返回 SUCCESS，实际: ${JSON.stringify(notifyResp)}`);
  }

  await sleep(300);

  const updated = await userHelper.get(`/order/${order.id}`);
  // ABNORMAL 时，若订单已是 refunded 才会回退为 refunding；
  // 若订单当前就是 refunding/refund_pending，状态不变
  if (!['refunding', 'refund_pending', 'refunded'].includes(updated.status)) {
    throw new Error(`退款ABNORMAL后状态异常: ${updated.status}`);
  }
  // 确认 refund_status 字段记录了异常
  if (updated.refund_status && updated.refund_status !== 'abnormal') {
    throw new Error(`refund_status 应为 abnormal，实际: ${updated.refund_status}`);
  }

  logger.info(`✓ 退款ABNORMAL回调处理完毕，订单状态: ${updated.status}, refund_status: ${updated.refund_status}`);
}

/**
 * 测试7: 退款回调 CLOSED — 退款关闭，状态回退为 refunding
 */
async function testRefundNotify_closed() {
  // 创建一个新订单，让它进入 refunding 状态
  const order = await createOrder(testData.standardCourseId, 'wechat');

  // 支付成功
  await callPaymentNotify({
    test_data: {
      out_trade_no: order.order_no,
      transaction_id: `TEST_TX_CLS_${Date.now()}`,
    },
  });
  await sleep(300);

  // 机构确认
  const instHelper = new TestHelper(testData.institutionToken);
  await instHelper.put(`/order/${order.id}/confirm`);
  await sleep(200);

  // 申请退款
  const userHelper = new TestHelper(testData.userToken);
  await userHelper.put(`/order/${order.id}/apply-refund`, { refund_reason: '测试CLOSED回调' });
  await sleep(300);

  // 发送 CLOSED 退款回调
  const notifyResp = await callRefundNotify({
    test_data: {
      out_trade_no: order.order_no,
      out_refund_no: `TEST_REFUND_CLS_${Date.now()}`,
      refund_status: 'CLOSED',
    },
  });

  if (notifyResp.code !== 'SUCCESS') {
    throw new Error(`退款CLOSED回调应返回 SUCCESS，实际: ${JSON.stringify(notifyResp)}`);
  }

  await sleep(300);

  const updated = await userHelper.get(`/order/${order.id}`);
  if (!['refunding', 'refund_pending', 'refunded'].includes(updated.status)) {
    throw new Error(`退款CLOSED后状态异常: ${updated.status}`);
  }
  if (updated.refund_status && updated.refund_status !== 'closed') {
    throw new Error(`refund_status 应为 closed，实际: ${updated.refund_status}`);
  }

  logger.info(`✓ 退款CLOSED回调处理完毕，订单状态: ${updated.status}, refund_status: ${updated.refund_status}`);
}

/**
 * 测试8: 不存在的订单号 — 回调应返回 SUCCESS（幂等，不抛错）
 */
async function testPaymentNotify_nonExistentOrder() {
  const notifyResp = await callPaymentNotify({
    test_data: {
      out_trade_no: 'NON_EXISTENT_ORDER_99999999',
      transaction_id: 'TEST_TX_NONE',
    },
  });

  // 服务端对不存在的订单应返回成功（避免微信无限重试）
  if (notifyResp.code !== 'SUCCESS') {
    throw new Error(`不存在订单号的回调应返回 SUCCESS，实际: ${JSON.stringify(notifyResp)}`);
  }

  logger.info(`✓ 不存在订单号的回调已幂等处理，返回 SUCCESS`);
}

// ==================== 主函数 ====================

export async function runCRUDTests(sharedData?: any): Promise<boolean> {
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  const tests = [
    { name: '初始化测试数据', fn: () => testInitialize(sharedData) },
    { name: '支付回调 — 体验课自动确认', fn: testPaymentNotify_trialOrder },
    { name: '支付回调 — 正式课待确认', fn: testPaymentNotify_standardOrder },
    { name: '支付回调 — 重复回调幂等', fn: testPaymentNotify_duplicate },
    { name: '退款回调 SUCCESS — refunding→refunded（副作用首次执行）', fn: testRefundNotify_successFromRefunding },
    { name: '退款回调 SUCCESS — 已refunded（wasTransitioned=false，副作用跳过）', fn: testRefundNotify_successAlreadyRefunded },
    { name: '退款回调 ABNORMAL — 退款异常处理', fn: testRefundNotify_abnormal },
    { name: '退款回调 CLOSED — 退款关闭处理', fn: testRefundNotify_closed },
    { name: '支付回调 — 不存在订单幂等处理', fn: testPaymentNotify_nonExistentOrder },
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
    title: '支付回调幂等测试总结',
    total: tests.length,
    success: successCount,
    fail: failCount,
    duration,
  });

  return failCount === 0;
}
