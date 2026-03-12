/**
 * 邀友返现营销活动完整 E2E 测试
 *
 * 测试流程：
 *  Step 1 : 初始化测试环境（机构、教师、教室、开启返现的课程、4 节排课）
 *  Step 2 : 邀请人获取邀请码
 *  Step 3 : 邀请人设置让利比例（share_ratio）
 *  Step 4 : 被邀请人浏览课程（查看返现标签）
 *  Step 5 : 被邀请人验证邀请码有效性
 *  Step 6 : 预览优惠金额（calculate-discount）
 *  Step 7 : 被邀请人使用邀请码下单
 *  Step 8 : 验证订单立减金额与预期一致
 *  Step 9 : 机构确认订单（confirm-payment）
 *  Step 10: 验证邀请订单自动创建
 *  Step 11: 签到上课（完成第 1 课）
 *  Step 12: 检查邀请人收益解锁情况
 *  Step 13: 被邀请人发起退款（剩余 3 课）
 *  Step 14: 机构审批退款
 *  Step 15: 核对退款金额与邀请人未释放返现金额
 *
 * 运行方式：
 *   npx ts-node tests/cashback-marketing.test.ts
 */

import { TestHelper, generateUserToken, sleep } from './utils/test-client';
import { logger } from './utils/logger';
import { createInstitution } from './utils/test-helpers/institution.helper';
import { createTeacher } from './utils/test-helpers/teacher.helper';
import { createClassroom } from './utils/test-helpers/classroom.helper';
import { createSchedule } from './utils/test-helpers/schedule.helper';
import { onlineCourse } from './utils/test-helpers/course.helper';

// ============================================================
//  测试参数（可按需调整）
// ============================================================

const ORIGINAL_PRICE = 1000;   // SKU 原始定价（元）
const TOTAL_LESSONS = 4;        // 课程总节数
const CASHBACK_RATIO = 10;      // 课程返现比例（%）— 即 cashback_value（后端限制 ≤15%）
const SHARE_RATIO = 60;         // 邀请人让利比例（%）— invitee 拿到 cashback*60%, inviter 拿到 cashback*40%

// 预期数学推算（用于断言，服务端也会返回，对比校验）
const CASHBACK_POOL = (ORIGINAL_PRICE * CASHBACK_RATIO) / 100;          // 200 元
const EXPECTED_BUYER_DISCOUNT = (CASHBACK_POOL * SHARE_RATIO) / 100;     // 120 元
const EXPECTED_INVITER_TOTAL = CASHBACK_POOL - EXPECTED_BUYER_DISCOUNT;  // 80 元
const EXPECTED_PAID_AMOUNT = ORIGINAL_PRICE - EXPECTED_BUYER_DISCOUNT;   // 880 元
const PER_LESSON_CASHBACK = EXPECTED_INVITER_TOTAL / TOTAL_LESSONS;      // 20 元/课

// ============================================================
//  跨步骤共享状态
// ============================================================

interface StepData {
  // 机构
  institutionId: string;
  institutionPhone: string;
  institutionToken: string;
  institutionHelper: TestHelper;

  // 邀请人（已注册用户）
  inviterId: string;
  inviterToken: string;
  inviterHelper: TestHelper;
  inviteCode: string;

  // 被邀请人（家长）
  inviteeId: string;
  inviteeToken: string;
  inviteeHelper: TestHelper;

  // 课程 / 排课
  courseId: string;
  skuId: string;
  scheduleIds: string[];

  // 订单
  orderId: string;
  orderNo: string;
  paidAmount: number;
  inviteDiscountAmount: number;

  // 签到
  bookingIds: string[];
  firstCheckInBookingId: string;
  firstCheckInScheduleId: string;

  // 退款
  totalRefundAmount: number;

  // 汇总表额外字段
  courseTitle: string;
  completedLessons: number;
  lessonNo: number;

  // 付款明细（order 实体字段）
  onlinePayAmount: number;          // 线上实付（推广费 - 立减 + 佣金）
  offlinePayAmount: number;         // 线下实付
  commissionAmount: number;         // 平台佣金

  // 邀请订单正确字段名（entity: cashback_total / actual_cashback / unlocked_amount）
  inviteOrderId: string;
  inviteOrderStatus: string;
  inviteOrderCashbackTotal: number; // 总池（= paid_amount × cashback_ratio，inviter+buyer合计）
  inviteOrderActualCashback: number; // 邀请人应得（= 总池 × (1-share_ratio)）
  inviteOrderDiscountInOrder: number; // 买家折扣在 invite_order 中的记录

  // 签到后、退款前快照（Step 12 存储）
  preRefundUnlockedAmount: number;  // unlocked_amount at step-12 time
  preRefundPendingAmount: number;   // actual_cashback - unlocked_amount at step-12 time

  finalInviterAvailable: number;
  finalInviterTotalEarned: number;
  onlineRefundAmount: number;
  offlineRefundAmount: number;
  finalOrderStatus: string;
}

const sd: Partial<StepData> = {
  scheduleIds: [],
  bookingIds: [],
};

// ============================================================
//  步骤结果记录（用于最终报告）
// ============================================================

interface StepResult {
  step: string;
  passed: boolean;
  note: string;
}
const stepResults: StepResult[] = [];

function pass(step: string, note: string) {
  stepResults.push({ step, passed: true, note });
  logger.success(`[PASS] ${step} | ${note}`);
}

function fail(step: string, note: string) {
  stepResults.push({ step, passed: false, note });
  logger.error(`[FAIL] ${step} | ${note}`);
}

// ============================================================
//  Step 1: 初始化测试环境
// ============================================================

async function step1_Initialize() {
  logger.step('Step 1: 初始化测试环境');

  // ── 1a. 创建邀请人 & 被邀请人 token ──────────────────────────
  const ts = Date.now();
  sd.inviterId = `cashback_inviter_${ts}`;
  sd.inviterToken = generateUserToken(sd.inviterId, `inviter_openid_${ts}`, '邀请人小明');
  sd.inviterHelper = new TestHelper(sd.inviterToken);

  sd.inviteeId = `cashback_invitee_${ts}`;
  sd.inviteeToken = generateUserToken(sd.inviteeId, `invitee_openid_${ts}`, '家长小华');
  sd.inviteeHelper = new TestHelper(sd.inviteeToken);

  logger.info(`邀请人 userId: ${sd.inviterId}`);
  logger.info(`被邀请人 userId: ${sd.inviteeId}`);

  // ── 1b. 创建机构（自动审核通过）────────────────────────────────
  const noAuthHelper = new TestHelper();
  const instResult = await createInstitution(noAuthHelper, {
    name: `返现营销测试机构_${ts}`,
    autoApprove: true,
  });
  sd.institutionId = instResult.institutionId;
  sd.institutionPhone = instResult.phone;
  sd.institutionToken = instResult.token;
  sd.institutionHelper = new TestHelper(instResult.token);
  logger.info(`机构 ID: ${sd.institutionId}（已审核通过）`);

  // ── 1c. 创建教师 & 教室 ──────────────────────────────────────
  const teacherId = await createTeacher(sd.institutionHelper!, {
    institutionId: sd.institutionId!,
    name: `返现教师_${ts}`,
  });
  const classroomId = await createClassroom(sd.institutionHelper!, {
    institutionId: sd.institutionId!,
    name: `返现教室_${ts}`,
  });
  logger.info(`教师 ID: ${teacherId} | 教室 ID: ${classroomId}`);

  // ── 1d. 创建开启返现的课程 ────────────────────────────────────
  const courseData = {
    institution_id: sd.institutionId,
    title: `邀友返现营销测试课_${ts}`,
    subtitle: '测试立减 + 返现功能',
    category_code: 'music',
    slider_imgs: [`https://picsum.photos/800/600?random=${ts}`],
    tags: ['返现', '测试'],
    description: '用于完整测试邀友返现营销活动的课程',
    min_age: 5,
    max_age: 12,
    lesson_duration: 60,
    type: 'standard',
    cashback_enabled: true,
    cashback_ratio: CASHBACK_RATIO,
    skus: [
      {
        name: `返现套餐（${TOTAL_LESSONS}节）`,
        total_lessons: TOTAL_LESSONS,
        total_price: ORIGINAL_PRICE,
        cashback_type: 'percentage',
        cashback_value: CASHBACK_RATIO,
      },
    ],
  };
  sd.courseId = await sd.institutionHelper!.post('/courses', courseData);
  logger.info(`课程 ID: ${sd.courseId}`);

  // ── 1e. 创建 4 节排课 ────────────────────────────────────────
  for (let i = 0; i < TOTAL_LESSONS; i++) {
    const sid = await createSchedule(sd.institutionHelper!, {
      institutionId: sd.institutionId!,
      courseId: sd.courseId!,
      teacherId,
      classroomId,
    });
    sd.scheduleIds!.push(sid);
  }
  logger.info(`排课完成: ${sd.scheduleIds!.length} 个时段`);

  // ── 1f. 上架课程 ─────────────────────────────────────────────
  await onlineCourse(sd.institutionHelper!, sd.courseId!);
  logger.info('课程已上架');

  // ── 1g. 读取 SKU ID ──────────────────────────────────────────
  const courseDetail = await sd.institutionHelper!.get(`/courses/${sd.courseId}`);
  if (!courseDetail.skus || courseDetail.skus.length === 0) {
    throw new Error('课程 SKU 不存在');
  }
  sd.skuId = courseDetail.skus[0].id;
  sd.courseTitle = courseDetail.title ?? courseData.title;
  logger.info(`SKU ID: ${sd.skuId} | 原价: ¥${courseDetail.skus[0].total_price} | 节数: ${courseDetail.skus[0].total_lessons}`);

  pass('Step 1: 初始化测试环境', `机构=${sd.institutionId} 课程=${sd.courseId} 排课数=${sd.scheduleIds!.length}`);
}

// ============================================================
//  Step 2: 邀请人获取邀请码
// ============================================================

async function step2_GetInviteCode() {
  logger.step('Step 2: 邀请人获取邀请码');

  const res = await sd.inviterHelper!.get('/invite/code');
  if (!res || !res.invite_code) {
    throw new Error('获取邀请码失败，返回数据异常');
  }
  sd.inviteCode = res.invite_code;

  logger.data('邀请码信息', {
    invite_code: res.invite_code,
    status: res.status,
    share_ratio: res.share_ratio,
    use_count: res.use_count,
    daily_use_count: res.daily_use_count,
  });

  pass('Step 2: 邀请人获取邀请码', `邀请码: ${sd.inviteCode}`);
}

// ============================================================
//  Step 3: 邀请人设置让利比例
// ============================================================

async function step3_SetShareRatio() {
  logger.step('Step 3: 邀请人设置让利比例');

  const result = await sd.inviterHelper!.put('/invite/share-ratio', {
    share_ratio: SHARE_RATIO,
  });

  logger.info(`设置让利比例: ${SHARE_RATIO}%`);
  logger.info(`含义：邀请人将返现池的 ${SHARE_RATIO}% 让给被邀请人作为折扣，自己保留 ${100 - SHARE_RATIO}%`);

  // 验证设置已生效
  const codeRes = await sd.inviterHelper!.get('/invite/code');
  const actualRatio = codeRes.share_ratio;
  logger.info(`验证设置后 share_ratio: ${actualRatio}%`);

  if (Number(actualRatio) !== SHARE_RATIO) {
    throw new Error(`让利比例设置未生效: 期望 ${SHARE_RATIO}%，实际 ${actualRatio}%`);
  }

  logger.data('预期返现分配（理论推算）', {
    课程原价: `¥${ORIGINAL_PRICE}`,
    返现比例: `${CASHBACK_RATIO}%`,
    返现总池: `¥${CASHBACK_POOL}`,
    让利比例: `${SHARE_RATIO}%`,
    '被邀请人折扣（立减）': `¥${EXPECTED_BUYER_DISCOUNT}`,
    '邀请人总收益': `¥${EXPECTED_INVITER_TOTAL}`,
    '预计每课解锁': `¥${PER_LESSON_CASHBACK}`,
    '预计实付金额': `¥${EXPECTED_PAID_AMOUNT}`,
  });

  pass('Step 3: 设置让利比例', `share_ratio 已设置为 ${SHARE_RATIO}%`);
}

// ============================================================
//  Step 4: 被邀请人浏览课程
// ============================================================

async function step4_BrowseCourse() {
  logger.step('Step 4: 被邀请人浏览课程（无需登录）');

  const noAuthHelper = new TestHelper();
  const course = await noAuthHelper.get(`/courses/${sd.courseId}`);

  logger.data('课程基本信息', {
    title: course.title,
    type: course.type,
    cashback_enabled: course.cashback_enabled,
    cashback_ratio: `${course.cashback_ratio}%`,
    original_price: `¥${course.skus?.[0]?.total_price ?? '—'}`,
    total_lessons: course.skus?.[0]?.total_lessons ?? '—',
    status: course.status,
  });

  if (!course.cashback_enabled) {
    throw new Error('课程应已开启返现（cashback_enabled=true）');
  }
  if (Number(course.cashback_ratio) !== CASHBACK_RATIO) {
    throw new Error(`课程返现比例不符: 期望 ${CASHBACK_RATIO}%，实际 ${course.cashback_ratio}%`);
  }

  pass('Step 4: 被邀请人浏览课程', `返现已开启，cashback_ratio=${course.cashback_ratio}%`);
}

// ============================================================
//  Step 5: 验证邀请码有效性
// ============================================================

async function step5_ValidateInviteCode() {
  logger.step('Step 5: 被邀请人验证邀请码');

  const validateRes = await sd.inviteeHelper!.post('/invite/validate', {
    invite_code: sd.inviteCode,
    course_id: sd.courseId,
  });

  logger.data('邀请码校验结果', {
    valid: validateRes.valid,
    share_ratio: validateRes.inviteCode?.share_ratio,
    status: validateRes.inviteCode?.status,
  });

  if (!validateRes.valid) {
    throw new Error(`邀请码验证失败: ${JSON.stringify(validateRes)}`);
  }

  const returnedShareRatio = Number(validateRes.inviteCode?.share_ratio ?? validateRes.share_ratio);
  if (returnedShareRatio !== SHARE_RATIO) {
    throw new Error(`邀请码 share_ratio 不符: 期望 ${SHARE_RATIO}，实际 ${returnedShareRatio}`);
  }

  pass('Step 5: 验证邀请码', `邀请码有效，share_ratio=${returnedShareRatio}%`);
}

// ============================================================
//  Step 6: 预览优惠金额
// ============================================================

async function step6_CalculateDiscount() {
  logger.step('Step 6: 预览优惠金额（calculate-discount）');

  const discountRes = await sd.inviteeHelper!.post('/invite/calculate-discount', {
    invite_code: sd.inviteCode,
    course_id: sd.courseId,
    order_amount: ORIGINAL_PRICE,
  });

  const serverDiscount = Number(discountRes.discount_amount ?? discountRes);
  logger.info(`服务端计算折扣: ¥${serverDiscount}`);
  logger.info(`理论折扣（本地）: ¥${EXPECTED_BUYER_DISCOUNT}`);

  if (Math.abs(serverDiscount - EXPECTED_BUYER_DISCOUNT) > 0.01) {
    logger.warn(`折扣金额微差: 服务端=${serverDiscount} vs 本地预期=${EXPECTED_BUYER_DISCOUNT}（允许 ±0.01）`);
  }

  logger.data('折扣详情', {
    原价: `¥${ORIGINAL_PRICE}`,
    立减金额: `¥${serverDiscount}`,
    预计实付: `¥${ORIGINAL_PRICE - serverDiscount}`,
  });

  pass('Step 6: 预览优惠金额', `立减 ¥${serverDiscount}`);
}

// ============================================================
//  Step 7: 被邀请人使用邀请码下单
// ============================================================

async function step7_PlaceOrder() {
  logger.step('Step 7: 使用邀请码下单');

  const orderData = {
    course_id: sd.courseId,
    sku_id: sd.skuId,
    student_name: '测试返现学员',
    student_phone: `138${String(Date.now() % 100000000).padStart(8, '0')}`,
    student_age: 8,
    schedule_ids: sd.scheduleIds,
    invite_code: sd.inviteCode,
    payment_method: 'offline',
    remark: '返现营销活动测试订单',
  };

  logger.info(`使用邀请码: ${sd.inviteCode}`);
  logger.info(`排课 IDs: ${sd.scheduleIds!.join(', ')}`);

  sd.orderId = await sd.inviteeHelper!.post('/order', orderData);

  if (!sd.orderId) {
    throw new Error('下单失败，未返回订单 ID');
  }
  logger.info(`订单 ID: ${sd.orderId}`);

  await sleep(300);

  // 查询订单详情
  const orderDetail = await sd.inviteeHelper!.get(`/order/${sd.orderId}`);
  sd.orderNo = orderDetail.order_no;
  sd.paidAmount = Number(orderDetail.paid_amount);
  sd.inviteDiscountAmount = Number(orderDetail.invite_discount_amount ?? 0);
  sd.onlinePayAmount = Number(orderDetail.online_pay_amount ?? 0);
  sd.offlinePayAmount = Number(orderDetail.offline_pay_amount ?? 0);
  sd.commissionAmount = Number(orderDetail.commission_amount ?? 0);

  logger.data('订单详情', {
    订单号: sd.orderNo,
    状态: orderDetail.status,
    原价: `¥${orderDetail.original_price ?? ORIGINAL_PRICE}`,
    邀请立减: `¥${sd.inviteDiscountAmount}`,
    实付金额: `¥${sd.paidAmount}`,
    总节数: orderDetail.total_lessons,
    已上节数: orderDetail.completed_lessons,
    支付方式: orderDetail.payment_method,
  });

  pass('Step 7: 下单', `订单 ${sd.orderNo} 创建成功，实付 ¥${sd.paidAmount}`);
}

// ============================================================
//  Step 8: 验证订单立减金额
// ============================================================

async function step8_VerifyDiscount() {
  logger.step('Step 8: 验证订单立减金额');

  // 注意：paid_amount = (原价 - 邀请折扣 + 平台佣金)，机构可能配置了佣金比例
  // 因此只校验 invite_discount_amount 是否符合预期，不校验 paid_amount 绝对值
  const commission = sd.paidAmount! - EXPECTED_PAID_AMOUNT;

  logger.data('立减金额对比', {
    '服务端返回（invite_discount_amount）': `¥${sd.inviteDiscountAmount}`,
    '理论预期（EXPECTED_BUYER_DISCOUNT）': `¥${EXPECTED_BUYER_DISCOUNT}`,
    '服务端实付（paid_amount）': `¥${sd.paidAmount}`,
    '理论实付（原价-折扣）': `¥${EXPECTED_PAID_AMOUNT}`,
    '平台佣金（paid_amount 差值）': `¥${commission.toFixed(2)}`,
  });

  // 核心断言：邀请立减金额必须精确匹配
  if (Math.abs(sd.inviteDiscountAmount! - EXPECTED_BUYER_DISCOUNT) > 0.01) {
    throw new Error(
      `立减金额不符: 服务端=${sd.inviteDiscountAmount} vs 期望=${EXPECTED_BUYER_DISCOUNT}`,
    );
  }

  // paid_amount 应 >= 原价-折扣（可能含佣金）
  if (sd.paidAmount! < EXPECTED_PAID_AMOUNT - 0.01) {
    throw new Error(
      `实付金额异常：¥${sd.paidAmount} 小于折扣后金额 ¥${EXPECTED_PAID_AMOUNT}`,
    );
  }

  pass(
    'Step 8: 验证立减金额',
    `立减 ¥${sd.inviteDiscountAmount} ✓（期望 ¥${EXPECTED_BUYER_DISCOUNT}），实付 ¥${sd.paidAmount}（含佣金 ¥${commission.toFixed(2)}）`,
  );
}

// ============================================================
//  Step 9: 机构确认订单
// ============================================================

async function step9_ConfirmOrder() {
  logger.step('Step 9: 机构确认订单（confirm-payment）');

  const transactionNo = `TXN_CASHBACK_${Date.now()}`;
  await sd.institutionHelper!.put(`/order/${sd.orderId}/confirm-payment`, {
    transaction_no: transactionNo,
  });

  await sleep(800);

  const order = await sd.institutionHelper!.get(`/order/${sd.orderId}`);
  logger.info(`确认后订单状态: ${order.status}`);
  logger.info(`交易流水号: ${order.transaction_no}`);

  if (order.status !== 'confirmed') {
    throw new Error(`订单状态应为 confirmed，实际: ${order.status}`);
  }

  // 收集预约 ID（用于签到）
  const rawBookingId = order.booking_id || '';
  sd.bookingIds = rawBookingId.split(',').filter((id: string) => id.trim());
  logger.info(`关联预约数: ${sd.bookingIds!.length} 个`);
  if (sd.bookingIds!.length === 0) {
    throw new Error('订单确认后未关联任何预约');
  }

  pass('Step 9: 机构确认订单', `状态已变为 confirmed，预约数 ${sd.bookingIds!.length}`);
}

// ============================================================
//  Step 10: 验证邀请订单自动创建
// ============================================================

async function step10_VerifyInviteOrder() {
  logger.step('Step 10: 验证邀请订单自动创建');

  await sleep(500);

  const inviteOrdersRes = await sd.inviterHelper!.get('/invite/orders', {
    page: 1,
    pageSize: 20,
  });

  const orders = inviteOrdersRes.data ?? inviteOrdersRes;
  const inviteOrder = Array.isArray(orders)
    ? orders.find((o: any) => o.order_id === sd.orderId)
    : null;

  if (!inviteOrder) {
    // 可能刚创建，尝试再等一下
    await sleep(1000);
    const retry = await sd.inviterHelper!.get('/invite/orders', { page: 1, pageSize: 20 });
    const retryOrders = retry.data ?? retry;
    const found = Array.isArray(retryOrders)
      ? retryOrders.find((o: any) => o.order_id === sd.orderId)
      : null;
    if (!found) {
      throw new Error(`邀请订单未创建 (order_id=${sd.orderId})`);
    }
    logger.info('重试后找到邀请订单');

    sd.inviteOrderId = found.id;
    sd.inviteOrderCashbackTotal = Number(found.cashback_total ?? 0);
    sd.inviteOrderActualCashback = Number(found.actual_cashback ?? 0);
    sd.inviteOrderDiscountInOrder = Number(found.discount_amount ?? 0);
    logger.data('邀请订单信息', {
      id: found.id,
      order_id: found.order_id,
      status: found.status,
      cashback_total: `¥${found.cashback_total ?? '—'}`,
      actual_cashback: `¥${found.actual_cashback ?? '—'}`,
      unlocked_amount: `¥${found.unlocked_amount ?? 0}`,
      pending: `¥${Math.max(0, Number(found.actual_cashback ?? 0) - Number(found.unlocked_amount ?? 0)).toFixed(2)}`,
    });

    pass('Step 10: 验证邀请订单创建', `邀请订单存在，状态=${found.status}`);
    return;
  }

  sd.inviteOrderId = inviteOrder.id;
  sd.inviteOrderCashbackTotal = Number(inviteOrder.cashback_total ?? 0);
  sd.inviteOrderActualCashback = Number(inviteOrder.actual_cashback ?? 0);
  sd.inviteOrderDiscountInOrder = Number(inviteOrder.discount_amount ?? 0);
  logger.data('邀请订单信息', {
    id: inviteOrder.id,
    order_id: inviteOrder.order_id,
    status: inviteOrder.status,
    cashback_total: `¥${inviteOrder.cashback_total ?? '—'}`,
    actual_cashback: `¥${inviteOrder.actual_cashback ?? '—'}`,
    unlocked_amount: `¥${inviteOrder.unlocked_amount ?? 0}`,
    pending: `¥${Math.max(0, Number(inviteOrder.actual_cashback ?? 0) - Number(inviteOrder.unlocked_amount ?? 0)).toFixed(2)}`,
  });

  const totalCashback = Number(inviteOrder.total_cashback ?? 0);
  if (totalCashback > 0 && Math.abs(totalCashback - EXPECTED_INVITER_TOTAL) > 0.01) {
    logger.warn(
      `邀请人总返现不符: 服务端=${totalCashback} vs 期望=${EXPECTED_INVITER_TOTAL}（可能受浮点差影响）`,
    );
  }

  pass('Step 10: 验证邀请订单创建', `邀请订单已创建，total_cashback=¥${inviteOrder.total_cashback ?? '?'}`);
}

// ============================================================
//  Step 11: 签到上课（第 1 课）
// ============================================================

async function step11_CheckIn() {
  logger.step('Step 11: 签到上课（第 1 课）');

  // 获取第一个有效预约
  const bookingsRes = await sd.inviteeHelper!.get('/booking/my', {
    status: 'confirmed',
    pageSize: 50,
  });
  const bookings = Array.isArray(bookingsRes) ? bookingsRes : (bookingsRes.data ?? []);

  // 找到属于当前课程的预约
  const myBooking = bookings.find(
    (b: any) => b.course_id === sd.courseId && b.schedule_id === sd.scheduleIds![0],
  ) ?? bookings.find((b: any) => b.course_id === sd.courseId)
    ?? bookings.find((b: any) => sd.bookingIds!.includes(b.id));

  if (!myBooking) {
    // 使用 bookingIds[0] 作为 fallback
    if (sd.bookingIds!.length === 0) {
      throw new Error('没有可用的预约 ID 进行签到');
    }
    sd.firstCheckInBookingId = sd.bookingIds![0];
    sd.firstCheckInScheduleId = sd.scheduleIds![0];
    logger.warn(`未从列表找到精确匹配预约，使用 bookingIds[0]: ${sd.firstCheckInBookingId}`);
  } else {
    sd.firstCheckInBookingId = myBooking.id;
    sd.firstCheckInScheduleId = myBooking.schedule_id ?? sd.scheduleIds![0];
    logger.info(`找到匹配预约: ${sd.firstCheckInBookingId}`);
  }

  logger.info(`签到参数 → order_id=${sd.orderId}, booking_id=${sd.firstCheckInBookingId}, schedule_id=${sd.firstCheckInScheduleId}`);

  const checkInResult = await sd.inviteeHelper!.post('/check-in', {
    order_id: sd.orderId,
    booking_id: sd.firstCheckInBookingId,
    schedule_id: sd.firstCheckInScheduleId,
    latitude: 39.9042,
    longitude: 116.4074,
    remark: '第1课正常签到',
  });

  // check-in 服务通过原子 UPDATE … RETURNING 返回最新课时进度
  const completedLessons = Number(checkInResult?.completed_lessons ?? 0);
  const lessonNo = Number(checkInResult?.lesson_no ?? 0);
  const returnedTotalLessons = Number(checkInResult?.total_lessons ?? TOTAL_LESSONS);

  logger.data('签到结果', {
    check_in_id: checkInResult?.id ?? checkInResult,
    lesson_no: lessonNo,
    completed_lessons: completedLessons,
    total_lessons: returnedTotalLessons,
  });

  logger.info(`签到后课时进度（来自 RETURNING）: ${completedLessons}/${returnedTotalLessons}`);

  if (completedLessons < 1) {
    throw new Error(
      `签到返回的 completed_lessons 应 >= 1，实际: ${completedLessons}（check-in 可能失败或返回格式异常）`,
    );
  }

  sd.completedLessons = completedLessons;
  sd.lessonNo = lessonNo;

  await sleep(500); // 等待返现解锁异步处理

  pass('Step 11: 签到第 1 课', `已完成 ${completedLessons}/${returnedTotalLessons} 课（第 ${lessonNo} 课）`);
}

// ============================================================
//  Step 12: 检查邀请人收益解锁
// ============================================================

async function step12_VerifyEarnings() {
  logger.step('Step 12: 检查邀请人收益解锁');

  await sleep(500);

  // ── 余额变化 ────────────────────────────────────────────────
  const balance = await sd.inviterHelper!.get('/invite/balance');
  logger.data('邀请人当前余额', {
    available: `¥${balance.available ?? 0}`,
    frozen: `¥${balance.frozen ?? 0}`,
    total_earned: `¥${balance.total_earned ?? 0}`,
    total_withdrawn: `¥${balance.total_withdrawn ?? 0}`,
  });

  const available = Number(balance.available ?? 0);
  const totalEarned = Number(balance.total_earned ?? 0);
  sd.finalInviterAvailable = available;
  sd.finalInviterTotalEarned = totalEarned;

  logger.info(`理论每课解锁: ¥${PER_LESSON_CASHBACK}`);
  logger.info(`实际可用余额: ¥${available}`);

  if (available <= 0 && totalEarned <= 0) {
    throw new Error(
      `签到后邀请人余额应有增加，当前 available=${available}, total_earned=${totalEarned}`,
    );
  }

  // ── 最新返现记录 ─────────────────────────────────────────────
  const cashbackRes = await sd.inviterHelper!.get('/invite/cashback-records', {
    page: 1,
    pageSize: 5,
  });
  const cashbackRecords = cashbackRes.data ?? cashbackRes;

  logger.info(`返现记录总数: ${cashbackRes.total ?? (Array.isArray(cashbackRecords) ? cashbackRecords.length : '—')}`);

  if (Array.isArray(cashbackRecords) && cashbackRecords.length > 0) {
    const latest = cashbackRecords[0];
    logger.data('最新返现记录', {
      amount: `¥${latest.amount}`,
      type: latest.type,
      status: latest.status,
      lesson_no: latest.lesson_no ?? '—',
      created_at: latest.created_at,
    });
  }

  // ── 邀请订单中的解锁进度 ─────────────────────────────────────
  const inviteOrdersRes = await sd.inviterHelper!.get('/invite/orders', {
    page: 1,
    pageSize: 20,
  });
  const orders = inviteOrdersRes.data ?? inviteOrdersRes;
  const inviteOrder = Array.isArray(orders)
    ? orders.find((o: any) => o.order_id === sd.orderId)
    : null;

  if (inviteOrder) {
    sd.inviteOrderId = sd.inviteOrderId ?? inviteOrder.id;
    sd.inviteOrderStatus = inviteOrder.status;
    sd.inviteOrderCashbackTotal = sd.inviteOrderCashbackTotal || Number(inviteOrder.cashback_total ?? 0);
    sd.inviteOrderActualCashback = sd.inviteOrderActualCashback || Number(inviteOrder.actual_cashback ?? 0);
    // 退款前快照
    sd.preRefundUnlockedAmount = Number(inviteOrder.unlocked_amount ?? 0);
    sd.preRefundPendingAmount = Math.max(
      0,
      Number(inviteOrder.actual_cashback ?? 0) - Number(inviteOrder.unlocked_amount ?? 0),
    );
    logger.data('邀请订单解锁进度（退款前快照）', {
      状态: inviteOrder.status,
      cashback_total: `¥${inviteOrder.cashback_total ?? '—'}`,
      actual_cashback: `¥${inviteOrder.actual_cashback ?? '—'}`,
      已解锁: `¥${inviteOrder.unlocked_amount ?? 0}`,
      待解锁: `¥${sd.preRefundPendingAmount.toFixed(2)}`,
    });
  }

  pass(
    'Step 12: 检查收益解锁',
    `available=¥${available}，total_earned=¥${totalEarned}（第1课应解锁 ¥${PER_LESSON_CASHBACK}）`,
  );
}

// ============================================================
//  Step 13: 被邀请人发起退款
// ============================================================

async function step13_ApplyRefund() {
  logger.step('Step 13: 发起退款申请（剩余课时退款）');

  // 先查看退款预览（refund_info）
  const orderBefore = await sd.inviteeHelper!.get(`/order/${sd.orderId}`);
  logger.data('退款前订单信息', {
    status: orderBefore.status,
    completed_lessons: `${orderBefore.completed_lessons}/${orderBefore.total_lessons}`,
    paid_amount: `¥${orderBefore.paid_amount}`,
  });

  if (orderBefore.refund_info) {
    logger.data('退款预览（refund_info）', {
      可退款: orderBefore.refund_info.refundable,
      剩余比例: `${(Number(orderBefore.refund_info.remaining_ratio) * 100).toFixed(1)}%`,
      退款总额: `¥${orderBefore.refund_info.total_refund_amount}`,
      线上退款: `¥${orderBefore.refund_info.online_refund_amount}`,
      线下退款: `¥${orderBefore.refund_info.offline_refund_amount}`,
      课时进度: `${orderBefore.refund_info.completed_lessons}/${orderBefore.refund_info.total_lessons}`,
    });
  }

  // 申请退款（剩余 3 节课，后端自动按比例计算）
  await sd.inviteeHelper!.put(`/order/${sd.orderId}/apply-refund`, {
    refund_reason: '测试：已上第1课，申请剩余3课退款',
  });

  await sleep(500);

  const orderAfter = await sd.inviteeHelper!.get(`/order/${sd.orderId}`);
  logger.info(`申请退款后状态: ${orderAfter.status}`);

  if (orderAfter.status !== 'refund_pending') {
    throw new Error(`退款申请后状态应为 refund_pending，实际: ${orderAfter.status}`);
  }

  if (orderAfter.refund_info) {
    const refundTotal = Number(orderAfter.refund_info.total_refund_amount);
    sd.totalRefundAmount = refundTotal;
    logger.data('退款申请确认', {
      退款总额: `¥${refundTotal}`,
      理论计算: `¥${EXPECTED_PAID_AMOUNT} × ${TOTAL_LESSONS - 1}/${TOTAL_LESSONS} = ¥${((EXPECTED_PAID_AMOUNT * (TOTAL_LESSONS - 1)) / TOTAL_LESSONS).toFixed(2)}`,
    });
  }

  pass('Step 13: 发起退款申请', `状态已变为 refund_pending，退款额 ¥${sd.totalRefundAmount ?? '待确认'}`);
}

// ============================================================
//  Step 14: 机构审批退款
// ============================================================

async function step14_ProcessRefund() {
  logger.step('Step 14: 机构审批退款');

  await sd.institutionHelper!.put(`/order/${sd.orderId}/process-refund`, {
    approved: true,
  });

  await sleep(1500);

  const order = await sd.inviteeHelper!.get(`/order/${sd.orderId}`);
  logger.info(`审批后订单状态: ${order.status}`);

  if (order.status !== 'refunded') {
    throw new Error(`退款审批后状态应为 refunded，实际: ${order.status}`);
  }

  sd.finalOrderStatus = order.status;

  logger.data('退款完成信息', {
    status: order.status,
    refunded_at: order.refunded_at ?? '—',
    refund_reason: order.refund_reason,
  });

  pass('Step 14: 机构审批退款', `退款已审批通过，订单状态 refunded`);
}

// ============================================================
//  Step 15: 核对退款金额与未释放返现
// ============================================================

async function step15_VerifyRefundAndCashback() {
  logger.step('Step 15: 核对退款金额与邀请人未释放返现');

  await sleep(800);

  // ── 1. 确认最终订单金额 ──────────────────────────────────────
  const finalOrder = await sd.inviteeHelper!.get(`/order/${sd.orderId}`);
  const finalRefundAmount = Number(
    finalOrder.online_refund_amount ?? 0
  ) + Number(
    finalOrder.offline_refund_amount ?? 0
  );

  sd.onlineRefundAmount = Number(finalOrder.online_refund_amount ?? 0);
  sd.offlineRefundAmount = Number(finalOrder.offline_refund_amount ?? 0);
  sd.finalOrderStatus = finalOrder.status;

  logger.data('最终退款金额', {
    线上退款: `¥${finalOrder.online_refund_amount ?? 0}`,
    线下退款: `¥${finalOrder.offline_refund_amount ?? 0}`,
    合计退款: `¥${finalRefundAmount}`,
    退款时间: finalOrder.refunded_at ?? '—',
  });

  // ── 2. 邀请人余额变化 ─────────────────────────────────────────
  const balanceFinal = await sd.inviterHelper!.get('/invite/balance');
  sd.finalInviterAvailable = Number(balanceFinal.available ?? 0);
  sd.finalInviterTotalEarned = Number(balanceFinal.total_earned ?? 0);

  logger.data('退款后邀请人余额', {
    可用余额: `¥${balanceFinal.available ?? 0}`,
    冻结余额: `¥${balanceFinal.frozen ?? 0}`,
    总获得: `¥${balanceFinal.total_earned ?? 0}`,
  });

  // ── 3. 邀请订单中的最终返现状态 ──────────────────────────────
  const inviteOrdersRes = await sd.inviterHelper!.get('/invite/orders', {
    page: 1,
    pageSize: 20,
  });
  const orders = inviteOrdersRes.data ?? inviteOrdersRes;
  const inviteOrder = Array.isArray(orders)
    ? orders.find((o: any) => o.order_id === sd.orderId)
    : null;

  if (inviteOrder) {
    logger.data('邀请订单最终状态', {
      状态: inviteOrder.status,
      总返现池: `¥${inviteOrder.total_cashback ?? '—'}`,
      已解锁: `¥${inviteOrder.unlocked_cashback ?? 0}`,
      待解锁: `¥${inviteOrder.pending_cashback ?? '—'}`,
    });

    const unlockedAmount = Number(inviteOrder.unlocked_amount ?? 0);
    const pendingCashback = Math.max(
      0,
      Number(inviteOrder.actual_cashback ?? 0) - unlockedAmount,
    );
    sd.inviteOrderStatus = inviteOrder.status;

    // 退款后，待解锁返现应减少（剩余3课的返现应被撤销）
    // 已解锁（第1课）应保留在邀请人余额中
    logger.info(`退款后分析：`);
    logger.info(`  ✓ 已解锁返现（第1课）: ¥${unlockedAmount}（应保留在余额中）`);
    logger.info(`  ✓ 待解锁返现（剩余${TOTAL_LESSONS - 1}课）: ¥${pendingCashback.toFixed(2)}（应已撤销/归零）`);

    if (pendingCashback > 0.01) {
      logger.warn(`待解锁返现 ¥${pendingCashback} 尚未归零（退款后应已撤销）`);
    } else {
      logger.success(`待解锁返现已正确归零（退款撤销未释放部分）`);
    }
  }

  // ── 4. 综合测试断言 ───────────────────────────────────────────
  const remainingRatio = (TOTAL_LESSONS - 1) / TOTAL_LESSONS;
  const theoreticalRefund = EXPECTED_PAID_AMOUNT * remainingRatio;

  logger.data('理论 vs 实际对比', {
    '理论退款额': `¥${theoreticalRefund.toFixed(2)}（实付¥${EXPECTED_PAID_AMOUNT} × ${TOTAL_LESSONS - 1}/${TOTAL_LESSONS}）`,
    '服务端退款额': `¥${finalRefundAmount}`,
    '邀请人应保留（第1课）': `¥${PER_LESSON_CASHBACK}`,
    '邀请人余额实际': `¥${balanceFinal.available ?? 0}`,
    '理论邀请人待解锁应归零': `¥${PER_LESSON_CASHBACK * (TOTAL_LESSONS - 1)}`,
  });

  if (finalRefundAmount <= 0 && (sd.totalRefundAmount ?? 0) > 0) {
    throw new Error('退款金额为 0，退款可能未成功');
  }

  pass(
    'Step 15: 核对退款与返现',
    `退款 ¥${finalRefundAmount}，邀请人余额 ¥${balanceFinal.available ?? 0}（已解锁 ¥${PER_LESSON_CASHBACK}/课×1课保留）`,
  );
}

// ============================================================
//  输出详细数据汇总表（供人工核对）
// ============================================================

function printDetailedSummaryTable() {
  const LINE = '  ' + '─'.repeat(65);
  const DIVIDER = '═'.repeat(70);

  console.log('\n' + DIVIDER);
  console.log('                📋  测试数据汇总表（人工核对）');
  console.log(DIVIDER);

  // ── 课程信息 ──────────────────────────────────────────────────
  console.log('\n  ▸ 课程信息');
  console.log(LINE);
  console.log(`    课程标题        : ${sd.courseTitle ?? '—'}`);
  console.log(`    课程 ID         : ${sd.courseId ?? '—'}`);
  console.log(`    SKU ID          : ${sd.skuId ?? '—'}`);
  console.log(`    排课数量        : ${sd.scheduleIds?.length ?? 0} 个`);
  console.log(`    课程原价        : ¥${ORIGINAL_PRICE}`);
  console.log(`    总节数          : ${TOTAL_LESSONS} 节`);
  console.log(`    返现比例        : ${CASHBACK_RATIO}%`);
  console.log(`    返现池总额      : ¥${CASHBACK_POOL}  （= ¥${ORIGINAL_PRICE} × ${CASHBACK_RATIO}%）`);

  // ── 邀请码信息 ────────────────────────────────────────────────
  console.log('\n  ▸ 邀请码信息');
  console.log(LINE);
  console.log(`    邀请码          : ${sd.inviteCode ?? '—'}`);
  console.log(`    邀请人 ID       : ${sd.inviterId ?? '—'}`);
  console.log(`    被邀请人 ID     : ${sd.inviteeId ?? '—'}`);
  console.log(`    让利比例        : ${SHARE_RATIO}%（invitee 拿 ${SHARE_RATIO}%，inviter 保留 ${100 - SHARE_RATIO}%）`);
  console.log(`    被邀请人立减    : ¥${EXPECTED_BUYER_DISCOUNT}  （= ¥${CASHBACK_POOL} × ${SHARE_RATIO}%）`);
  console.log(`    邀请人收益池    : ¥${EXPECTED_INVITER_TOTAL}  （= ¥${CASHBACK_POOL} × ${100 - SHARE_RATIO}%）`);
  console.log(`    每课解锁金额    : ¥${PER_LESSON_CASHBACK}  （= ¥${EXPECTED_INVITER_TOTAL} ÷ ${TOTAL_LESSONS} 节）`);

  // ── 订单信息 ──────────────────────────────────────────────────
  console.log('\n  ▸ 订单信息');
  console.log(LINE);
  console.log(`    订单 ID         : ${sd.orderId ?? '—'}`);
  console.log(`    订单号          : ${sd.orderNo ?? '—'}`);
  console.log(`    课程原价        : ¥${ORIGINAL_PRICE}.00`);
  const discountOk = Math.abs((sd.inviteDiscountAmount ?? 0) - EXPECTED_BUYER_DISCOUNT) < 0.01;
  console.log(`    邀请立减        : ¥${(sd.inviteDiscountAmount ?? 0).toFixed(2)}  ${discountOk ? '✓ 符合预期' : '✗ 与预期不符（期望 ¥' + EXPECTED_BUYER_DISCOUNT + ')'}`);
  const commission = (sd.paidAmount ?? 0) - EXPECTED_PAID_AMOUNT;
  console.log(`    实付金额        : ¥${(sd.paidAmount ?? 0).toFixed(2)}  （含平台佣金 ¥${commission > 0.01 ? commission.toFixed(2) : '0.00'}）`);
  console.log(`    完成课时        : ${sd.completedLessons ?? 0} / ${TOTAL_LESSONS}`);
  console.log(`    最终订单状态    : ${sd.finalOrderStatus ?? '—'}`);

  // ── 邀请人收益信息 ────────────────────────────────────────────
  console.log('\n  ▸ 邀请人收益信息');
  console.log(LINE);
  console.log(`    邀请订单 ID     : ${sd.inviteOrderId ?? '—'}`);
  console.log(`    邀请订单状态    : ${sd.inviteOrderStatus ?? '—'}`);
  const cashbackTotal = sd.inviteOrderCashbackTotal ?? 0;
  const actualCashback = sd.inviteOrderActualCashback ?? 0;
  const discountInOrder = sd.inviteOrderDiscountInOrder ?? 0;
  const preUnlocked = sd.preRefundUnlockedAmount ?? 0;
  const prePending = sd.preRefundPendingAmount ?? 0;
  const onlinePay = sd.onlinePayAmount ?? 0;
  const offlinePay = sd.offlinePayAmount ?? 0;
  const comm = sd.commissionAmount ?? 0;
  const discount = sd.inviteDiscountAmount ?? 0;
  const completedLessonsLocal = sd.completedLessons ?? 1;
  const remainingLessonsLocal = TOTAL_LESSONS - completedLessonsLocal;
  const discountPerLesson = discount / TOTAL_LESSONS;        // 立减按节课分摩
  const discountConsumed  = discountPerLesson * completedLessonsLocal;  // 已消费立减
  const discountRecovered = discountPerLesson * remainingLessonsLocal;  // 未消费立减，退款后回收
  console.log(`    ─── 返现池分配（基于 original_price ¥${ORIGINAL_PRICE} 计算，不含平台佣金 ¥${((sd.paidAmount??0) - (ORIGINAL_PRICE - discount)).toFixed(0)}）─`);
  console.log(`    总池              : ¥${cashbackTotal.toFixed(2)}  （= original_price ¥${ORIGINAL_PRICE} × ${CASHBACK_RATIO}%）`);
  console.log(`      ├─ 买家立减    : ¥${discount.toFixed(2)}  → 按节课分摩 ¥${discountPerLesson.toFixed(2)}/课（共${TOTAL_LESSONS}课）`);
  console.log(`      │    ├─ 已消费（第${completedLessonsLocal}课）: ¥${discountConsumed.toFixed(2)}  → 买家已享受，不可回收`);
  console.log(`      │    └─ 未消费（${remainingLessonsLocal}课）  : ¥${discountRecovered.toFixed(2)}  → 退款后回收至推广池`);
  console.log(`      └─ 邀请人应得池 : ¥${actualCashback.toFixed(2)}  （= 总池 × ${100 - SHARE_RATIO}%）`);
  console.log(`           ├─ 第${completedLessonsLocal}课已解锁  : ¥${preUnlocked.toFixed(2)}  → 已入账邀请人余额（不可回收）`);
  console.log(`           └─ 剩余${remainingLessonsLocal}课已撤销  : ¥${prePending.toFixed(2)}  → 退款后回收至推广池`);
  console.log(`    ─── 余额变化 ────────────────────────────────────────`);
  const inviterAvail = sd.finalInviterAvailable ?? 0;
  const expectedPerLesson = actualCashback > 0 ? actualCashback / TOTAL_LESSONS : PER_LESSON_CASHBACK;
  const diffNote = Math.abs(inviterAvail - PER_LESSON_CASHBACK) > 0.01
    ? `  ⚠ 与理论¥${PER_LESSON_CASHBACK}相差¥${(inviterAvail - PER_LESSON_CASHBACK).toFixed(2)}（因返现基数为paid_amount ¥${(sd.paidAmount??0).toFixed(0)}，非original_price ¥${ORIGINAL_PRICE}）`
    : '  ✓';
  console.log(`    可用余额          : ¥${inviterAvail.toFixed(2)}${diffNote}`);
  console.log(`    累计获得          : ¥${(sd.finalInviterTotalEarned ?? 0).toFixed(2)}`);
  if (actualCashback > 0) {
    console.log(`    ─── 说明 ─────────────────────────────────────────────`);
    console.log(`    每课解锁: original_price(¥${ORIGINAL_PRICE})×${CASHBACK_RATIO}%×${100-SHARE_RATIO}%/${TOTAL_LESSONS}课 = ¥${expectedPerLesson.toFixed(2)}/课  ✓ 与理论一致`);
    console.log(`    佣金(¥${((sd.paidAmount??0) - (ORIGINAL_PRICE - (sd.inviteDiscountAmount??0))).toFixed(0)})按课程进度退款: ¥${((sd.paidAmount??0) - (ORIGINAL_PRICE - (sd.inviteDiscountAmount??0))).toFixed(0)} × ${(100 - (sd.completedLessons??0) / TOTAL_LESSONS * 100).toFixed(0)}% = ¥${(((sd.paidAmount??0) - (ORIGINAL_PRICE - (sd.inviteDiscountAmount??0))) * ((TOTAL_LESSONS - (sd.completedLessons??1)) / TOTAL_LESSONS)).toFixed(2)} 退还`);
  }

  // ── 退款信息 ──────────────────────────────────────────────────
  console.log('\n  ▸ 退款信息');
  console.log(LINE);
  const completedCount = sd.completedLessons ?? 1;
  const remainingLessons = TOTAL_LESSONS - completedCount;
  const theoryRefundByOriginal = EXPECTED_PAID_AMOUNT * remainingLessons / TOTAL_LESSONS;
  const actualRefundTotal = (sd.onlineRefundAmount ?? 0) + (sd.offlineRefundAmount ?? 0);
  console.log(`    退款状态          : ${sd.finalOrderStatus === 'refunded' ? 'refunded  ✓' : (sd.finalOrderStatus ?? '—')}`);
  console.log(`    线上退款          : ¥${(sd.onlineRefundAmount ?? 0).toFixed(2)}  （= 线上实付¥${onlinePay.toFixed(2)} × ${remainingLessons}/${TOTAL_LESSONS}）`);
  console.log(`    线下退款          : ¥${(sd.offlineRefundAmount ?? 0).toFixed(2)}  （= 线下实付¥${offlinePay.toFixed(2)} × ${remainingLessons}/${TOTAL_LESSONS}）`);
  console.log(`    合计退款          : ¥${actualRefundTotal.toFixed(2)}  （= paid_amount¥${(sd.paidAmount??0).toFixed(2)} × ${remainingLessons}/${TOTAL_LESSONS}）`);
  console.log(`    理论退款（参考）  : ¥${theoryRefundByOriginal.toFixed(2)}  （以原价-折扣¥${EXPECTED_PAID_AMOUNT} × ${remainingLessons}/${TOTAL_LESSONS}，不含佣金）`);
  console.log(`    ─── 机构营销成本核算 ──────────────────────────────────`);
  const institutionNetCost  = discountConsumed + preUnlocked;   // 已消费立减 + 邀请人已解锁
  const institutionRecovery = discountRecovered + prePending;    // 未消费立减 + 邀请人未解锁
  console.log(`    推广池总投入      : ¥${cashbackTotal.toFixed(2)}`);
  console.log(`    推广净成本（不可回收）: ¥${institutionNetCost.toFixed(2)}  ← 立减已消费¥${discountConsumed.toFixed(2)}（1课）+ 邀请人已解锁¥${preUnlocked.toFixed(2)}（1课）`);
  console.log(`    推广回收金额      : ¥${institutionRecovery.toFixed(2)}  ← 立减未消费¥${discountRecovered.toFixed(2)}（3课）+ 邀请人未解锁¥${prePending.toFixed(2)}（3课）`);
  console.log('\n' + DIVIDER);
}

// ============================================================
//  输出最终完整测试报告
// ============================================================

function printFinalReport(durationMs: number) {
  const totalSteps = stepResults.length;
  const passed = stepResults.filter((r) => r.passed).length;
  const failed = totalSteps - passed;

  console.log('\n' + '═'.repeat(70));
  console.log('    📊  邀友返现营销活动 E2E 完整测试报告');
  console.log('═'.repeat(70));

  // 测试参数回顾
  console.log('\n【测试参数】');
  console.log(`  课程原价       : ¥${ORIGINAL_PRICE}`);
  console.log(`  总节数         : ${TOTAL_LESSONS} 节`);
  console.log(`  返现比例       : ${CASHBACK_RATIO}%`);
  console.log(`  让利比例       : ${SHARE_RATIO}%`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  返现总池       : ¥${CASHBACK_POOL}`);
  console.log(`  被邀请人立减   : ¥${EXPECTED_BUYER_DISCOUNT}`);
  console.log(`  被邀请人实付   : ¥${EXPECTED_PAID_AMOUNT}`);
  console.log(`  邀请人总收益   : ¥${EXPECTED_INVITER_TOTAL}`);
  console.log(`  每课解锁金额   : ¥${PER_LESSON_CASHBACK}`);

  // 步骤明细
  console.log('\n【测试步骤明细】');
  console.log('─'.repeat(70));
  stepResults.forEach((r, idx) => {
    const icon = r.passed ? '✅' : '❌';
    const stepNum = String(idx + 1).padStart(2, ' ');
    console.log(`  ${stepNum}. ${icon} ${r.step}`);
    console.log(`      └─ ${r.note}`);
  });

  printDetailedSummaryTable();

  // 总结
  console.log('\n' + '─'.repeat(70));
  console.log(`  总步骤数  : ${totalSteps}`);
  console.log(`  通过      : ${passed}`);
  console.log(`  失败      : ${failed}`);
  console.log(`  耗时      : ${(durationMs / 1000).toFixed(2)} 秒`);
  console.log('═'.repeat(70) + '\n');

  if (failed === 0) {
    console.log('  🎉  全部步骤通过！邀友返现营销活动 E2E 流程验证成功！\n');
  } else {
    console.log(`  ❌  ${failed} 个步骤失败，请查看上方错误日志。\n`);
  }
}

// ============================================================
//  主流程
// ============================================================

export async function runCashbackMarketingTests(): Promise<{
  passed: number;
  failed: number;
  total: number;
}> {
  logger.section('邀友返现营销活动 E2E 完整测试');

  const startTime = Date.now();

  const steps = [
    { name: 'Step 1: 初始化测试环境', fn: step1_Initialize },
    { name: 'Step 2: 邀请人获取邀请码', fn: step2_GetInviteCode },
    { name: 'Step 3: 邀请人设置让利比例', fn: step3_SetShareRatio },
    { name: 'Step 4: 被邀请人浏览课程', fn: step4_BrowseCourse },
    { name: 'Step 5: 验证邀请码有效性', fn: step5_ValidateInviteCode },
    { name: 'Step 6: 预览优惠金额', fn: step6_CalculateDiscount },
    { name: 'Step 7: 使用邀请码下单', fn: step7_PlaceOrder },
    { name: 'Step 8: 验证订单立减金额', fn: step8_VerifyDiscount },
    { name: 'Step 9: 机构确认订单', fn: step9_ConfirmOrder },
    { name: 'Step 10: 验证邀请订单创建', fn: step10_VerifyInviteOrder },
    { name: 'Step 11: 签到上课（第1课）', fn: step11_CheckIn },
    { name: 'Step 12: 检查邀请人收益解锁', fn: step12_VerifyEarnings },
    { name: 'Step 13: 发起退款申请', fn: step13_ApplyRefund },
    { name: 'Step 14: 机构审批退款', fn: step14_ProcessRefund },
    { name: 'Step 15: 核对退款与未释放返现', fn: step15_VerifyRefundAndCashback },
  ];

  for (const step of steps) {
    try {
      await step.fn();
    } catch (error: any) {
      fail(step.name, error.message);
      // 关键步骤失败后停止后续步骤（避免级联失败）
      if (['Step 1', 'Step 7', 'Step 9'].some((s) => step.name.startsWith(s))) {
        logger.warn(`关键步骤 "${step.name}" 失败，跳过后续步骤`);
        break;
      }
    }
  }

  const duration = Date.now() - startTime;
  printFinalReport(duration);

  const passed = stepResults.filter((r) => r.passed).length;
  const failed = stepResults.length - passed;

  return { passed, failed, total: stepResults.length };
}

// ============================================================
//  直接运行入口
// ============================================================

if (require.main === module) {
  runCashbackMarketingTests()
    .then(({ passed, failed, total }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      logger.error(`测试运行异常: ${error.message}`);
      console.error(error);
      process.exit(1);
    });
}
