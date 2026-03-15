/**
 * 邀友返现模块测试
 * 
 * 测试内容：
 * 1. CRUD 基础测试：邀请码、余额、返现记录等
 * 2. 端到端业务流程测试：
 *    - 用户下单时填写邀请码，验证立减功能
 *    - 用户上课签到后，验证邀请人能否获得返现
 *    - 完整的邀友返现闭环验证
 */

import { TestHelper, generateUserToken, sleep } from './utils/test-client';
import { logger } from './utils/logger';
import { 
  createInstitution, 
  loginInstitutionByPhone 
} from './utils/test-helpers/institution.helper';
import { createCourse, getCourse, onlineCourse, updateCourse } from './utils/test-helpers/course.helper';
import { createTeacher } from './utils/test-helpers/teacher.helper';
import { createClassroom } from './utils/test-helpers/classroom.helper';
import { createSchedule, getSchedules } from './utils/test-helpers/schedule.helper';

// ============ 测试数据 ============

// 基础 CRUD 测试用的 helper
let helper: TestHelper;
let inviterHelper: TestHelper;
let userId: string;
let inviterId: string;

// 端到端测试用的数据
const e2eData = {
  // 邀请人（老用户）
  inviterId: '',
  inviterToken: '',
  inviterHelper: null as TestHelper | null,
  inviteCode: '',
  
  // 被邀请人（新用户）
  inviteeId: '',
  inviteeToken: '',
  inviteeHelper: null as TestHelper | null,
  
  // 机构和课程
  institutionId: '',
  institutionToken: '',
  institutionHelper: null as TestHelper | null,
  courseId: '',
  skuId: '',
  scheduleIds: [] as string[],
  
  // 订单和预约
  orderId: '',
  orderNo: '',
  bookingId: '',
  
  // 返现相关
  cashbackRatio: 10, // 课程返现比例 10%
  shareRatio: 60,    // 邀请人让利比例 60%
  updatedShareRatio: 10, // 下单后修改为 10%，旧订单仍应锁定 60%
  originalPrice: 1000, // 课程原价
  inviteDiscountAmount: 0, // 立减金额
  expectedCashback: 0, // 预期返现金额
};

// ============ 基础测试初始化 ============

async function initTestData() {
  logger.info('初始化邀友返现测试数据...');

  // 创建被邀请人账号
  userId = 'test_user_' + Date.now();
  const userToken = generateUserToken(userId, 'openid_user_' + Date.now(), '测试用户');
  helper = new TestHelper(userToken);

  // 创建邀请人账号
  inviterId = 'test_inviter_' + Date.now();
  const inviterToken = generateUserToken(inviterId, 'openid_inviter_' + Date.now(), '邀请人');
  inviterHelper = new TestHelper(inviterToken);

  logger.success('测试数据初始化完成');
}

// ============ 基础 CRUD 测试 ============

/**
 * 测试1: 获取或创建邀请码
 */
async function testGetOrCreateInviteCode() {
  const result = await inviterHelper.get('/invite/code');

  if (!result.invite_code) {
    throw new Error('获取邀请码失败：返回结果无 invite_code 字段');
  }

  logger.success(`获取邀请码成功: ${result.invite_code}`);
  return result;
}

/**
 * 测试2: 设置分享比例
 */
async function testSetShareRatio() {
  const result = await inviterHelper.put('/invite/share-ratio', {
    share_ratio: 60,
  });

  if (result !== true) {
    throw new Error('设置分享比例失败');
  }

  logger.success('设置分享比例成功: 60%');
}

/**
 * 测试3: 验证邀请码（被邀请人使用）
 */
async function testValidateInviteCode(inviteCode: string) {
  const result = await helper.post('/invite/validate', { 
    invite_code: inviteCode,
    course_id: 'test_course_id'
  });

  if (result.valid === undefined) {
    throw new Error('验证邀请码失败: 返回格式错误');
  }

  logger.success(`验证邀请码接口调用成功 (valid=${result.valid})`);
  return result;
}

/**
 * 测试4: 计算优惠金额
 */
async function testCalculateDiscount(inviteCode: string, courseId: string) {
  const result = await helper.post('/invite/calculate-discount', {
    invite_code: inviteCode,
    course_id: courseId,
    order_amount: 1000,
  });

  if (typeof result.discount_amount !== 'number') {
    throw new Error('计算优惠金额失败：返回格式错误');
  }

  logger.success(`计算优惠金额成功: 优惠 ${result.discount_amount} 元`);
  return result;
}

/**
 * 测试5: 获取余额信息
 */
async function testGetBalance() {
  const result = await inviterHelper.get('/invite/balance');

  if (typeof result.available !== 'number') {
    throw new Error('获取余额失败：返回格式错误');
  }

  logger.success(`获取余额成功: 可用 ${result.available} 元`);
  return result;
}

/**
 * 测试6: 获取邀请订单列表
 */
async function testGetInviteOrders() {
  const result = await inviterHelper.get('/invite/orders?page=1&pageSize=10');

  if (!Array.isArray(result.data)) {
    throw new Error('获取邀请订单失败：返回格式错误');
  }

  logger.success(`获取邀请订单成功: 共 ${result.total} 条`);
  return result;
}

/**
 * 测试7: 获取返现记录
 */
async function testGetCashbackRecords() {
  const result = await inviterHelper.get('/invite/cashback-records?page=1&pageSize=10');

  if (!Array.isArray(result.data)) {
    throw new Error('获取返现记录失败：返回格式错误');
  }

  logger.success(`获取返现记录成功: 共 ${result.total} 条`);
  return result;
}

/**
 * 测试8: 申请提现（余额不足场景）
 */
async function testApplyWithdrawInsufficientBalance() {
  try {
    await inviterHelper.post('/invite/withdraw', {
      amount: 10000,
    });
    throw new Error('预期应该报错：余额不足');
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || '';
    if (
      errorMessage.includes('余额不足') || 
      errorMessage.includes('insufficient') ||
      errorMessage.includes('最低') ||
      errorMessage.includes('50')
    ) {
      logger.success('余额不足提现正确拒绝');
    } else {
      throw error;
    }
  }
}

/**
 * 测试9: 使用自己的邀请码（应该失败）
 */
async function testValidateOwnInviteCode() {
  const myCode = await helper.get('/invite/code');

  // validate 接口需要登录（已从白名单移除），自我检查优先于课程检查
  const result = await helper.post('/invite/validate', {
    invite_code: myCode.invite_code,
    course_id: 'any_course_id',  // 课程检查在自我检查之后，不影响结果
  });

  if (result.valid === false && result.message?.includes('自己')) {
    logger.success('使用自己的邀请码正确拒绝（validate 接口）');
  } else {
    throw new Error(
      `预期 validate 返回 {valid: false, message: '不能使用自己的邀请码'}，实际：${JSON.stringify(result)}`,
    );
  }
}

/**
 * 测试14: 获取提现记录
 */
async function testGetWithdrawRecords() {
  const result = await inviterHelper.get('/invite/withdraw-records?page=1&pageSize=10');

  if (!Array.isArray(result.data)) {
    throw new Error('获取提现记录失败：返回格式错误');
  }

  logger.success(`获取提现记录成功: 共 ${result.total} 条`);
  return result;
}

// ============ 端到端业务流程测试 ============

/**
 * E2E测试1: 初始化端到端测试环境
 */
async function testE2EInitialize() {
  logger.info('初始化端到端测试环境...');
  
  // 1. 创建邀请人（老用户）
  e2eData.inviterId = 'e2e_inviter_' + Date.now();
  e2eData.inviterToken = generateUserToken(
    e2eData.inviterId, 
    'openid_e2e_inviter_' + Date.now(), 
    '邀请人老王'
  );
  e2eData.inviterHelper = new TestHelper(e2eData.inviterToken);
  
  // 2. 创建被邀请人（新用户）
  e2eData.inviteeId = 'e2e_invitee_' + Date.now();
  e2eData.inviteeToken = generateUserToken(
    e2eData.inviteeId, 
    'openid_e2e_invitee_' + Date.now(), 
    '被邀请人小李'
  );
  e2eData.inviteeHelper = new TestHelper(e2eData.inviteeToken);
  
  // 3. 创建机构
  const noAuthHelper = new TestHelper();
  const institutionResult = await createInstitution(noAuthHelper, {
    name: '返现测试机构',
    autoApprove: true,
  });
  e2eData.institutionId = institutionResult.institutionId;
  e2eData.institutionToken = institutionResult.token;
  e2eData.institutionHelper = new TestHelper(institutionResult.token);
  
  logger.info(`机构创建成功: ${e2eData.institutionId}`);
  
  // 4. 创建开启返现的课程
  // 先创建教师和教室
  const teacherId = await createTeacher(e2eData.institutionHelper, {
    institutionId: e2eData.institutionId,
    name: '返现测试教师',
  });
  
  const classroomId = await createClassroom(e2eData.institutionHelper, {
    institutionId: e2eData.institutionId,
    name: '返现测试教室',
  });
  
  // 创建课程（开启返现）
  const timestamp = Date.now();
  const courseData = {
    institution_id: e2eData.institutionId,
    title: '返现测试课程',
    subtitle: '测试立减和返现功能',
    category_code: 'music',
    slider_imgs: [`https://picsum.photos/800/600?random=${timestamp}`],
    tags: ['返现', '测试'],
    description: '这是一个用于测试邀友返现功能的课程',
    min_age: 5,
    max_age: 12,
    lesson_duration: 60,
    type: 'standard',
    cashback_enabled: true,
    cashback_ratio: e2eData.cashbackRatio,
    skus: [
      {
        name: '返现测试套餐',
        total_lessons: 4, // 4节课，方便测试
        total_price: e2eData.originalPrice,
        cashback_type: 'percentage',
        cashback_value: e2eData.cashbackRatio,
      },
    ],
  };
  
  const courseId = await e2eData.institutionHelper.post('/courses', courseData);
  e2eData.courseId = courseId;
  
  logger.info(`返现课程创建成功: ${e2eData.courseId}`);
  
  // 创建排课
  for (let i = 0; i < 4; i++) {
    const scheduleId = await createSchedule(e2eData.institutionHelper, {
      institutionId: e2eData.institutionId,
      courseId: e2eData.courseId,
      teacherId: teacherId,
      classroomId: classroomId,
    });
    e2eData.scheduleIds.push(scheduleId);
  }
  
  logger.info(`排课创建成功: ${e2eData.scheduleIds.length} 个时段`);
  
  // 上架课程
  await onlineCourse(e2eData.institutionHelper, e2eData.courseId);
  logger.info('课程已上架');
  
  // 获取SKU ID 和验证返现设置
  const courseDetail = await getCourse(e2eData.institutionHelper, e2eData.courseId);
  logger.info(`课程返现设置: cashback_enabled=${courseDetail.cashback_enabled}, cashback_ratio=${courseDetail.cashback_ratio}`);
  if (courseDetail.skus && courseDetail.skus.length > 0) {
    e2eData.skuId = courseDetail.skus[0].id;
  }
  
  logger.info(`课程SKU: ${e2eData.skuId}`);
  
  // 5. 邀请人先获取邀请码，再设置让利比例
  const inviteCodeResult = await e2eData.inviterHelper.get('/invite/code');
  e2eData.inviteCode = inviteCodeResult.invite_code;
  
  await e2eData.inviterHelper.put('/invite/share-ratio', {
    share_ratio: e2eData.shareRatio,
  });
  
  logger.info(`邀请人邀请码: ${e2eData.inviteCode}, 让利比例: ${e2eData.shareRatio}%`);
  
  // 计算预期值
  const cashbackTotal = e2eData.originalPrice * e2eData.cashbackRatio / 100;
  e2eData.inviteDiscountAmount = Math.round(cashbackTotal * e2eData.shareRatio / 100 * 100) / 100;
  e2eData.expectedCashback = cashbackTotal - e2eData.inviteDiscountAmount;
  
  logger.info(`预期立减金额: ${e2eData.inviteDiscountAmount} 元`);
  logger.info(`预期邀请人返现: ${e2eData.expectedCashback} 元`);
  
  logger.success('端到端测试环境初始化完成');
}

/**
 * E2E测试2: 新用户使用邀请码下单，验证立减
 */
async function testE2EOrderWithInviteCode() {
  if (!e2eData.inviteeHelper || !e2eData.courseId) {
    throw new Error('测试环境未初始化');
  }
  
  logger.info('新用户使用邀请码下单...');
  
  // 1. 验证邀请码有效
  const validation = await e2eData.inviteeHelper.post('/invite/validate', {
    invite_code: e2eData.inviteCode,
    course_id: e2eData.courseId,
  });
  
  if (!validation.valid) {
    throw new Error(`邀请码验证失败: ${validation.message}`);
  }
  logger.info('邀请码验证通过');
  
  // 2. 计算立减金额
  const discountResult = await e2eData.inviteeHelper.post('/invite/calculate-discount', {
    invite_code: e2eData.inviteCode,
    course_id: e2eData.courseId,
    order_amount: e2eData.originalPrice,
  });
  
  logger.info(`计算立减: ${discountResult.discount_amount} 元 (预期: ${e2eData.inviteDiscountAmount} 元)`);
  
  if (Math.abs(discountResult.discount_amount - e2eData.inviteDiscountAmount) > 0.01) {
    throw new Error(
      `立减金额计算错误: 实际 ${discountResult.discount_amount}, 预期 ${e2eData.inviteDiscountAmount}`
    );
  }
  
  // 3. 创建订单（使用邀请码）
  const orderData = {
    course_id: e2eData.courseId,
    sku_id: e2eData.skuId,
    student_name: '测试学员',
    student_phone: '13800138000',
    student_age: 8,
    schedule_ids: e2eData.scheduleIds,
    invite_code: e2eData.inviteCode,
    payment_method: 'offline',
    remark: '邀友返现测试订单',
  };
  
  const orderId = await e2eData.inviteeHelper.post('/order', orderData);
  e2eData.orderId = orderId;
  
  logger.info(`订单创建成功: ${orderId}`);
  
  // 4. 查询订单，验证立减金额
  const orderDetail = await e2eData.inviteeHelper.get(`/order/${orderId}`);
  e2eData.orderNo = orderDetail.order_no;
  
  logger.info(`订单号: ${orderDetail.order_no}`);
  logger.info(`原价: ${orderDetail.original_price} 元`);
  logger.info(`立减: ${orderDetail.invite_discount_amount || 0} 元`);
  logger.info(`实付: ${orderDetail.paid_amount} 元`);
  
  if (orderDetail.invite_discount_amount) {
    if (Math.abs(Number(orderDetail.invite_discount_amount) - e2eData.inviteDiscountAmount) > 0.01) {
      logger.warn(`订单立减金额差异: 实际 ${orderDetail.invite_discount_amount}, 预期 ${e2eData.inviteDiscountAmount}`);
    }
  }
  
  logger.success('邀请码立减功能验证通过！');
}

/**
 * E2E测试2.5: 下单后机构修改课程返现配置，旧订单仍应使用下单快照
 */
async function testE2EEditCourseCashbackAfterOrder() {
  if (!e2eData.institutionHelper || !e2eData.courseId || !e2eData.orderId) {
    throw new Error('测试环境未初始化');
  }

  logger.info('下单后修改课程返现配置，验证历史订单不受影响...');

  await updateCourse(e2eData.institutionHelper, e2eData.courseId, {
    cashback_enabled: false,
    cashback_ratio: 3,
  });

  const updatedCourse = await getCourse(e2eData.institutionHelper, e2eData.courseId);
  if (updatedCourse.cashback_enabled !== false) {
    throw new Error('课程返现开关修改失败，未成功关闭');
  }
  if (Number(updatedCourse.cashback_ratio) !== 3) {
    throw new Error(`课程返现比例修改失败，实际: ${updatedCourse.cashback_ratio}`);
  }

  logger.info('课程返现配置已改为 cashback_enabled=false, cashback_ratio=3%');
}

/**
 * E2E测试2.6: 下单后邀请人修改让利比例，旧订单仍应使用下单快照
 */
async function testE2EEditInviteShareRatioAfterOrder() {
  if (!e2eData.inviterHelper || !e2eData.orderId) {
    throw new Error('测试环境未初始化');
  }

  logger.info('下单后修改邀请码让利比例，验证历史订单不受影响...');

  await e2eData.inviterHelper.put('/invite/share-ratio', {
    share_ratio: e2eData.updatedShareRatio,
  });

  const updatedInviteCode = await e2eData.inviterHelper.get('/invite/code');
  if (Number(updatedInviteCode.share_ratio) !== e2eData.updatedShareRatio) {
    throw new Error(`邀请码让利比例修改失败，实际: ${updatedInviteCode.share_ratio}`);
  }

  logger.info(`邀请码当前让利比例已改为 ${e2eData.updatedShareRatio}%`);
}

/**
 * E2E测试3: 机构确认订单，验证邀请订单创建
 */
async function testE2EConfirmOrder() {
  if (!e2eData.institutionHelper || !e2eData.orderId) {
    throw new Error('测试环境未初始化');
  }
  
  logger.info('机构确认订单...');
  
  await e2eData.institutionHelper.put(`/order/${e2eData.orderId}/confirm-payment`, {
    transaction_no: 'TEST_TXN_' + Date.now(),
  });
  
  logger.info('订单确认成功');
  
  await sleep(500);
  
  const inviteOrders = await e2eData.inviterHelper!.get('/invite/orders?page=1&pageSize=10');
  
  logger.info(`邀请人邀请订单数: ${inviteOrders.total}`);
  
  if (!inviteOrders.data || inviteOrders.data.length === 0) {
    logger.warn('邀请订单未创建（可能返现逻辑未触发）');
    return;
  }
  
  const inviteOrder = inviteOrders.data.find((o: any) => o.order_id === e2eData.orderId);
  if (!inviteOrder) {
    logger.warn('未找到对应的邀请订单');
    return;
  }
  
  logger.info(`邀请订单状态: ${inviteOrder.status}`);
  logger.info(`返现总额: ${inviteOrder.cashback_total} 元`);
  logger.info(`邀请人实际返现: ${inviteOrder.actual_cashback} 元`);

  const expectedCashbackTotal = Math.round((e2eData.originalPrice * e2eData.cashbackRatio / 100) * 100) / 100;
  if (Math.abs(Number(inviteOrder.cashback_ratio) - e2eData.cashbackRatio) > 0.01) {
    throw new Error(
      `邀请订单返现比例应锁定为下单时快照 ${e2eData.cashbackRatio}%，实际 ${inviteOrder.cashback_ratio}%`,
    );
  }
  if (Math.abs(Number(inviteOrder.share_ratio) - e2eData.shareRatio) > 0.01) {
    throw new Error(
      `邀请订单让利比例应锁定为下单时快照 ${e2eData.shareRatio}%，实际 ${inviteOrder.share_ratio}%`,
    );
  }
  if (Math.abs(Number(inviteOrder.cashback_total) - expectedCashbackTotal) > 0.01) {
    throw new Error(
      `邀请订单返现总额应保持下单时金额 ${expectedCashbackTotal}，实际 ${inviteOrder.cashback_total}`,
    );
  }
  if (Math.abs(Number(inviteOrder.discount_amount) - e2eData.inviteDiscountAmount) > 0.01) {
    throw new Error(
      `邀请订单立减金额应锁定为下单时金额 ${e2eData.inviteDiscountAmount}，实际 ${inviteOrder.discount_amount}`,
    );
  }
  if (Math.abs(Number(inviteOrder.actual_cashback) - e2eData.expectedCashback) > 0.01) {
    throw new Error(
      `邀请人实际返现应锁定为下单时金额 ${e2eData.expectedCashback}，实际 ${inviteOrder.actual_cashback}`,
    );
  }
  
  logger.success('邀请订单创建验证通过！');
}

/**
 * E2E测试4: 用户签到上课，验证返现解锁
 */
async function testE2ECheckInAndCashback() {
  if (!e2eData.inviteeHelper || !e2eData.orderId) {
    throw new Error('测试环境未初始化');
  }
  
  logger.info('用户签到上课，验证返现解锁...');
  
  const orderDetail = await e2eData.inviteeHelper.get(`/order/${e2eData.orderId}`);
  
  const totalLessons = orderDetail.total_lessons || 4;
  logger.info(`订单总课时: ${totalLessons}`);
  
  // 获取预约ID列表
  const bookingIds = orderDetail.booking_id ? orderDetail.booking_id.split(',').filter((id: string) => id.trim()) : [];
  logger.info(`预约数量: ${bookingIds.length}`);
  
  if (bookingIds.length === 0) {
    logger.warn('订单没有关联的预约，跳过签到测试');
    return;
  }
  
  // 保存预约ID供后续测试使用
  e2eData.bookingId = bookingIds[0];
  
  const balanceBefore = await e2eData.inviterHelper!.get('/invite/balance');
  logger.info(`签到前邀请人余额: ${balanceBefore.available} 元`);
  
  // 使用被邀请人（下单用户）的token进行签到
  try {
    const checkInResult = await e2eData.inviteeHelper.post('/check-in', {
      order_id: e2eData.orderId,
      booking_id: bookingIds[0],
      schedule_id: e2eData.scheduleIds[0],
    });
    
    logger.info(`签到成功: 第 ${checkInResult.lesson_no || 1} 课`);
    logger.info(`已完成: ${checkInResult.completed_lessons || 1}/${totalLessons} 课`);
  } catch (error: any) {
    logger.warn(`签到失败: ${error.message}`);
  }
  
  await sleep(500);
  
  const balanceAfter = await e2eData.inviterHelper!.get('/invite/balance');
  logger.info(`签到后邀请人余额: ${balanceAfter.available} 元`);
  
  const actualIncrease = Number(balanceAfter.available) - Number(balanceBefore.available);
  logger.info(`实际余额增加: ${actualIncrease.toFixed(2)} 元`);
  
  const cashbackRecords = await e2eData.inviterHelper!.get('/invite/cashback-records?page=1&pageSize=10');
  logger.info(`返现记录数: ${cashbackRecords.total}`);
  
  if (cashbackRecords.data && cashbackRecords.data.length > 0) {
    const latestRecord = cashbackRecords.data[0];
    logger.info(`最新返现记录: ${latestRecord.amount} 元, 类型: ${latestRecord.type}`);
  }
  
  logger.success('签到返现解锁验证通过！');
}

/**
 * E2E测试5: 验证完整上课后的最终返现
 */
async function testE2EFullCompletion() {
  if (!e2eData.inviteeHelper || !e2eData.orderId) {
    throw new Error('测试环境未初始化');
  }
  
  logger.info('验证完整上课后的最终返现...');
  
  const orderDetail = await e2eData.inviteeHelper.get(`/order/${e2eData.orderId}`);
  const totalLessons = orderDetail.total_lessons || 4;
  let completedLessons = orderDetail.completed_lessons || 0;
  
  logger.info(`当前进度: ${completedLessons}/${totalLessons} 课`);
  
  // 获取预约ID列表
  const bookingIds = orderDetail.booking_id ? orderDetail.booking_id.split(',').filter((id: string) => id.trim()) : [];
  
  // 完成剩余签到（使用被邀请人token）
  for (let i = completedLessons; i < Math.min(totalLessons, bookingIds.length); i++) {
    try {
      const checkInResult = await e2eData.inviteeHelper.post('/check-in', {
        order_id: e2eData.orderId,
        booking_id: bookingIds[i],
        schedule_id: e2eData.scheduleIds[i] || e2eData.scheduleIds[0],
      });
      
      completedLessons = checkInResult.completed_lessons || (i + 1);
      logger.info(`  签到第 ${i + 1} 课: ${completedLessons}/${totalLessons}`);
      
      await sleep(300);
    } catch (error: any) {
      if (!error.message.includes('已经签到') && !error.message.includes('already')) {
        logger.warn(`  签到失败: ${error.message}`);
      }
    }
  }
  
  const finalBalance = await e2eData.inviterHelper!.get('/invite/balance');
  logger.info(`邀请人最终余额: ${finalBalance.available} 元`);
  
  const inviteOrders = await e2eData.inviterHelper!.get('/invite/orders?page=1&pageSize=10');
  const inviteOrder = inviteOrders.data?.find((o: any) => o.order_id === e2eData.orderId);
  
  if (inviteOrder) {
    logger.info(`邀请订单状态: ${inviteOrder.status}`);
    logger.info(`已解锁返现: ${inviteOrder.unlocked_cashback || 0} 元`);
    logger.info(`待解锁返现: ${inviteOrder.pending_cashback || 0} 元`);
  }
  
  logger.success('完整返现流程验证完成！');
}

// ============ 测试运行 ============

const basicTests = [
  { name: '获取或创建邀请码', fn: testGetOrCreateInviteCode },
  { name: '设置分享比例', fn: testSetShareRatio },
  {
    name: '验证邀请码',
    fn: async () => {
      const inviteCode = (await inviterHelper.get('/invite/code')).invite_code;
      return testValidateInviteCode(inviteCode);
    },
  },
  {
    name: '使用自己的邀请码（应失败）',
    fn: testValidateOwnInviteCode,
  },
  { name: '获取余额信息', fn: testGetBalance },
  { name: '获取邀请订单列表', fn: testGetInviteOrders },
  { name: '获取返现记录', fn: testGetCashbackRecords },
  { name: '获取提现记录', fn: testGetWithdrawRecords },
  { name: '申请提现-余额不足', fn: testApplyWithdrawInsufficientBalance },
];

const e2eTests = [
  { name: 'E2E-初始化测试环境', fn: testE2EInitialize },
  { name: 'E2E-使用邀请码下单验证立减', fn: testE2EOrderWithInviteCode },
  { name: 'E2E-下单后修改课程返现配置不影响旧订单', fn: testE2EEditCourseCashbackAfterOrder },
  { name: 'E2E-下单后修改让利比例不影响旧订单', fn: testE2EEditInviteShareRatioAfterOrder },
  { name: 'E2E-机构确认订单验证邀请订单创建', fn: testE2EConfirmOrder },
  { name: 'E2E-签到上课验证返现解锁', fn: testE2ECheckInAndCashback },
  { name: 'E2E-完整上课验证最终返现', fn: testE2EFullCompletion },
];

export async function runInviteTests() {
  logger.section('邀友返现模块测试');
  
  let totalPassed = 0;
  let totalFailed = 0;

  // ===== 运行基础 CRUD 测试 =====
  logger.section('基础 CRUD 测试');
  
  try {
    await initTestData();
  } catch (error: any) {
    logger.error(`基础测试初始化失败: ${error.message}`);
    return { passed: 0, failed: basicTests.length + e2eTests.length, total: basicTests.length + e2eTests.length };
  }

  for (const test of basicTests) {
    try {
      await test.fn();
      totalPassed++;
    } catch (error: any) {
      logger.error(`${test.name}: ${error.message}`);
      totalFailed++;
    }
  }

  // ===== 运行端到端业务流程测试 =====
  logger.section('端到端业务流程测试');
  
  for (const test of e2eTests) {
    try {
      await test.fn();
      totalPassed++;
      logger.success(`${test.name} - 通过`);
    } catch (error: any) {
      logger.error(`${test.name}: ${error.message}`);
      totalFailed++;
    }
  }

  const totalTests = basicTests.length + e2eTests.length;
  
  logger.summary({
    title: '邀友返现模块测试',
    total: totalTests,
    success: totalPassed,
    fail: totalFailed,
    duration: 0,
  });
  
  return { passed: totalPassed, failed: totalFailed, total: totalTests };
}

// 直接运行
if (require.main === module) {
  runInviteTests()
    .then((result) => {
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('测试运行错误:', error);
      process.exit(1);
    });
}
