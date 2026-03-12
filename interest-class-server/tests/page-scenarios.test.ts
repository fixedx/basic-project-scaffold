/**
 * 前端页面场景测试（API-Flow 版）
 *
 * 策略：模拟每个前端页面在 onLoad / onMounted 中发起的 API 调用序列，
 * 直接对后端接口发请求，验证数据结构、字段合法性与业务逻辑完整性。
 *
 * 覆盖页面：
 *   1. 首页         (pages/index)                → homeApi.getData / banners / institutions
 *   2. 搜索页       (pages/search)               → courseApi.getList / institutionApi.getList
 *   3. 课程详情页   (pages/course-detail)        → courseApi.getDetail / reviewApi.getCourseTopReviews
 *   4. 机构详情页   (pages/institution-detail)   → institutionApi.getById / courseApi.getList / reviewApi
 *   5. 下单表单页   (pages/booking-form)         → childApi / scheduleApi / inviteApi / orderApi.calculateAmount
 *   6. 我的订单页   (pages/my-orders)            → orderApi.getMyList（各状态）
 *   7. 订单详情页   (pages/order-detail)         → orderApi.getDetail
 *   8. 我的预约页   (pages/my-bookings)          → bookingApi.getMyList
 *   9. 课表页       (pages/schedule)             → bookingApi.getMyList(confirmed + pending_change) / childApi
 *  10. 个人中心页   (pages/mine)                 → authApi.profile / orderApi.counts / childApi / inviteApi
 *  11. 邀请码页     (pages/invite-code-select)   → inviteApi.validateCode / calculateDiscount
 *  12. 邀请码管理页 (pages/institution/invite)   → inviteApi.getMyInviteCode / balance / orders / cashback
 *
 * 运行：
 *   npx tsx tests/run-all-tests.ts --module=page-scenarios
 */

import { TestHelper, generateUserToken, generateAdminToken } from './utils/test-client';
import { logger } from './utils/logger';

// ==================== 共享状态（跨测试传递 ID）====================

interface PageScenarioData {
  // tokens
  userToken: string;
  institutionToken: string;
  anonHelper: TestHelper;   // 无 token（模拟未登录）
  userHelper: TestHelper;
  institutionHelper: TestHelper;

  // 从已有数据查找
  firstCourseId: string;
  firstInstitutionId: string;
  firstScheduleId: string;
  firstSkuId: string;
  firstOrderId: string;
  firstBookingId: string;
  firstChildId: string;
}

const state: Partial<PageScenarioData> = {};

// ==================== 测试 1：首页 ====================

async function testHomePage() {
  logger.info('【首页】模拟 pages/index onMounted: homeApi.getData ...');

  const helper = state.anonHelper!;

  // 不带位置
  const data = await helper.get('/home', { page: 1, pageSize: 10 });
  if (!data || typeof data !== 'object') {
    throw new Error('首页数据格式错误');
  }

  // 验证必要字段
  if (!Array.isArray(data.banners)) {
    throw new Error('首页缺少 banners 字段');
  }
  if (!data.institutions || !Array.isArray(data.institutions.data)) {
    throw new Error('首页缺少 institutions.data 字段');
  }
  if (!data.courses || !Array.isArray(data.courses.data)) {
    throw new Error('首页缺少 courses.data 字段');
  }

  logger.info(
    `  banners=${data.banners.length}, institutions=${data.institutions.data.length}, courses=${data.courses.data.length}`,
  );

  // 缓存第一个课程/机构 ID，供后续页面测试使用
  if (data.courses.data.length > 0) {
    state.firstCourseId = data.courses.data[0].id;
    const sku0 = data.courses.data[0].skus?.[0];
    if (sku0) state.firstSkuId = sku0.id;
  }
  if (data.institutions.data.length > 0) {
    state.firstInstitutionId = data.institutions.data[0].id;
  }

  // 带位置（模拟北京中心）
  const dataWithLoc = await helper.get('/home', {
    page: 1,
    pageSize: 5,
    latitude: 39.9042,
    longitude: 116.4074,
  });
  if (!dataWithLoc.courses) throw new Error('带位置查询首页失败');
  logger.info(`  带位置查询: courses=${dataWithLoc.courses.data?.length || 0}`);

  // 测试加载更多（loadMoreCourses → homeApi.getRecommendedCourses → GET /home/recommended-courses）
  const moreCourses = await helper.get('/home/recommended-courses', { page: 2, pageSize: 5 });
  logger.info(`  第2页课程: ${moreCourses.data?.length ?? moreCourses.length ?? '?'} 条`);

  logger.success('✓ 首页场景测试通过');
}

// ==================== 测试 2：搜索页 ====================

async function testSearchPage() {
  logger.info('【搜索页】模拟 pages/search onMounted: 搜索课程 + 机构 ...');

  const helper = state.anonHelper!;
  const keyword = ''; // 初始空搜索

  // 机构列表（无关键词，默认全量）
  const institutions = await helper.get('/institution/list', {
    keyword,
    page: 1,
    pageSize: 5,
  });
  const instList = Array.isArray(institutions)
    ? institutions
    : institutions.data || [];
  logger.info(`  institution.list: ${instList.length} 条`);

  // 课程列表（无关键词）
  const courses = await helper.get('/courses', {
    keyword,
    is_online: true,
    page: 1,
    pageSize: 5,
  });
  const courseList = Array.isArray(courses) ? courses : courses.data || [];
  logger.info(`  course.list(empty kw): ${courseList.length} 条`);

  // 有关键词搜索
  if (instList.length > 0) {
    const nameSnippet = instList[0].name?.slice(0, 2) || '培';
    const [instSearch, courseSearch] = await Promise.all([
      helper.get('/institution/list', { keyword: nameSnippet, page: 1, pageSize: 5 }),
      helper.get('/courses', { keyword: nameSnippet, is_online: true, page: 1, pageSize: 5 }),
    ]);
    logger.info(
      `  keyword="${nameSnippet}" → institutions=${(instSearch.data || instSearch).length || '?'}, courses=${(courseSearch.data || courseSearch).length || '?'}`,
    );
  }

  logger.success('✓ 搜索页场景测试通过');
}

// ==================== 测试 3：课程详情页 ====================

async function testCourseDetailPage() {
  logger.info('【课程详情页】模拟 pages/course-detail onMounted: getDetail + 评价 ...');

  if (!state.firstCourseId) {
    // 尝试从课程列表中找一个
    const helper = state.anonHelper!;
    const res = await helper.get('/courses', { is_online: true, page: 1, pageSize: 1 });
    const list = Array.isArray(res) ? res : res.data || [];
    if (list.length === 0) {
      logger.warn('⚠ 暂无可用课程，跳过课程详情页测试');
      return;
    }
    state.firstCourseId = list[0].id;
    state.firstSkuId = list[0].skus?.[0]?.id;
  }

  const helper = state.anonHelper!;
  const courseId = state.firstCourseId!;

  // Step 1: courseApi.getDetail
  const course = await helper.get(`/courses/${courseId}`);
  if (!course || !course.id) {
    throw new Error(`课程详情接口异常: id=${courseId}`);
  }
  logger.info(`  课程: "${course.title}", skus=${course.skus?.length ?? 0}`);

  // 检查 SKU 返现字段
  if (course.skus && course.skus.length > 0) {
    const sku = course.skus[0];
    state.firstSkuId = sku.id;
    const hasCashbackFields =
      sku.cashback_type !== undefined && sku.cashback_value !== undefined;
    if (!hasCashbackFields) {
      throw new Error('SKU 缺少 cashback_type / cashback_value 字段');
    }
    logger.info(
      `  首个SKU: "${sku.name}", cashback_type=${sku.cashback_type}, cashback_value=${sku.cashback_value}`,
    );
  }

  // Step 2: reviewApi.getCourseTopReviews → GET /review/course/:id (page: 1, pageSize: 5, sort_by: rating_desc)
  // 评价接口需要登录（根据白名单配置）
  const reviewHelper = state.userHelper!;
  let reviews: any[] = [];
  try {
    const reviewRes = await reviewHelper.get(`/review/course/${courseId}`, {
      page: 1,
      pageSize: 5,
      sort_by: 'rating_desc',
    });
    reviews = Array.isArray(reviewRes) ? reviewRes : reviewRes.data || [];
  } catch {
    // 评价接口需要登录，使用 anonHelper 时可能 401，这是预期行为
    logger.warn('  ⚠ 评价接口需要登录（白名单未放行）');
  }
  logger.info(`  评价: ${reviews.length} 条`);

  // 也验证匿名用户可以看到，若白名单已放行
  try {
    const anonReviewRes = await helper.get(`/review/course/${courseId}`, {
      page: 1, pageSize: 5,
    });
    logger.info(`  匿名评价: ${(anonReviewRes.data || anonReviewRes).length || 0} 条`);
  } catch {
    logger.info('  匿名用户不可访问评价（正常，评价接口需要登录）');
  }

  // 收藏状态（需登录）
  const favRes = await reviewHelper.get(`/favorite/check/course/${courseId}`);
  logger.info(`  收藏状态: isFavorited=${favRes?.isFavorited}`);

  logger.success('✓ 课程详情页场景测试通过');
}

// ==================== 测试 4：机构详情页 ====================

async function testInstitutionDetailPage() {
  logger.info('【机构详情页】模拟 pages/institution-detail onMounted: getById + courses + reviews ...');

  if (!state.firstInstitutionId) {
    const helper = state.anonHelper!;
    const res = await helper.get('/institution/list', { page: 1, pageSize: 1 });
    const list = Array.isArray(res) ? res : res.data || [];
    if (list.length === 0) {
      logger.warn('⚠ 暂无可用机构，跳过机构详情页测试');
      return;
    }
    state.firstInstitutionId = list[0].id;
  }

  const helper = state.anonHelper!;
  const institutionId = state.firstInstitutionId!;

  // Promise.all — 与页面 onMounted 完全一致
  const [institution, coursesRes] = await Promise.all([
    helper.get(`/institution/${institutionId}`),
    helper.get('/courses', {
      institutionId,
      is_online: true,
      page: 1,
      pageSize: 8,
    }),
  ]);

  const userHelperForInst = state.userHelper!;

  if (!institution || !institution.id) {
    throw new Error(`机构详情接口异常: id=${institutionId}`);
  }
  logger.info(`  机构: "${institution.name}", audit_status=${institution.audit_status}`);

  const courses = Array.isArray(coursesRes) ? coursesRes : coursesRes.data || [];
  logger.info(`  在售课程: ${courses.length} 条`);

  let reviews: any[] = [];
  try {
    const reviewRes = await userHelperForInst.get(`/review/institution/${institutionId}`, {
      page: 1,
      pageSize: 5,
      sort_by: 'rating_desc',
    });
    reviews = Array.isArray(reviewRes) ? reviewRes : reviewRes.data || [];
  } catch {
    try {
      const reviewRes = await helper.get(`/review/institution/${institutionId}`, {
        page: 1, pageSize: 5,
      });
      reviews = Array.isArray(reviewRes) ? reviewRes : reviewRes.data || [];
    } catch {
      logger.warn('  ⚠ 机构评价接口不可访问');
    }
  }
  logger.info(`  评价: ${reviews.length} 条`);

  // 收藏状态（需登录）
  const favRes = await userHelperForInst.get(`/favorite/check/institution/${institutionId}`);
  logger.info(`  机构收藏状态: isFavorited=${favRes?.isFavorited}`);

  logger.success('✓ 机构详情页场景测试通过');
}

// ==================== 测试 5：下单表单页 ====================

async function testBookingFormPage() {
  logger.info('【下单表单页】模拟 pages/booking-form onMounted: children + schedules + calculateAmount ...');

  if (!state.firstCourseId || !state.firstSkuId) {
    logger.warn('⚠ 无可用课程/SKU，跳过下单表单页测试');
    return;
  }

  const userHelper = state.userHelper!;
  const courseId = state.firstCourseId!;
  const skuId = state.firstSkuId!;

  // Step 1: childApi.getMyList
  const children = await userHelper.get('/child/my');
  const childList = Array.isArray(children) ? children : children.data || [];
  logger.info(`  宝贝列表: ${childList.length} 个`);
  if (childList.length > 0) {
    state.firstChildId = childList[0].id;
  }

  // Step 2: scheduleApi.getList (可用排课) — 前端 pages/booking-form 调用 GET /schedule/course/:courseId
  let scheduleList: any[] = [];
  try {
    const schedules = await userHelper.get(`/schedule/course/${courseId}`);
    scheduleList = Array.isArray(schedules) ? schedules : schedules.data || [];
    logger.info(`  可用排课(/schedule/course/:id): ${scheduleList.length} 条`);
  } catch {
    // 也尝试通用排课查询
    try {
      const schedules = await userHelper.get('/schedule', { course_id: courseId, page: 1, pageSize: 20 });
      scheduleList = Array.isArray(schedules) ? schedules : schedules.data || [];
      logger.info(`  可用排课(/schedule): ${scheduleList.length} 条`);
    } catch {
      logger.warn('  ⚠ 排课接口不可访问（跳过）');
    }
  }
  if (scheduleList.length > 0) {
    state.firstScheduleId = scheduleList[0].id;
  }

  // Step 3: orderApi.calculateAmount（不带邀请码）
  const amountResult = await userHelper.post('/order/calculate', {
    course_id: courseId,
    sku_id: skuId,
    quantity: 1,
  });

  const requiredAmountFields = [
    'original_price',
    'online_pay_amount',
    'offline_pay_amount',
    'paid_amount',
    'user_balance',
  ];
  for (const f of requiredAmountFields) {
    if (amountResult[f] === undefined) {
      throw new Error(`calculateAmount 缺少字段: ${f}`);
    }
  }
  logger.info(
    `  calculateAmount: original_price=¥${amountResult.original_price}, paid_amount=¥${amountResult.paid_amount}`,
  );

  // Step 4: 模拟切换"使用余额"
  const amountWithBalance = await userHelper.post('/order/calculate', {
    course_id: courseId,
    sku_id: skuId,
    quantity: 1,
    use_balance: true,
  });
  logger.info(`  use_balance=true: online_pay_amount=¥${amountWithBalance.online_pay_amount}`);

  logger.success('✓ 下单表单页场景测试通过');
}

// ==================== 测试 6：我的订单页 ====================

async function testMyOrdersPage() {
  logger.info('【我的订单页】模拟 pages/my-orders onLoad: orderApi.getMyList 各状态 ...');

  const userHelper = state.userHelper!;

  const statuses = ['', 'pending', 'confirmed', 'completed', 'cancelled', 'refund_pending,refunding'];
  for (const status of statuses) {
    const params: any = { page: 1, pageSize: 10 };
    if (status) params.status = status;

    const res = await userHelper.get('/order/my', params);

    if (!res || !Array.isArray(res.data)) {
      throw new Error(`orderApi.getMyList(status="${status}") 格式错误`);
    }

    logger.info(`  status="${status || '全部'}": ${res.total} 条订单`);

    if (res.data.length > 0 && !state.firstOrderId) {
      state.firstOrderId = res.data[0].id;
      // 也更新 bookingId
      if (res.data[0].booking_id) {
        state.firstBookingId = res.data[0].booking_id;
      }
    }
  }

  logger.success('✓ 我的订单页场景测试通过');
}

// ==================== 测试 7：订单详情页 ====================

async function testOrderDetailPage() {
  logger.info('【订单详情页】模拟 pages/order-detail onMounted: orderApi.getDetail ...');

  const userHelper = state.userHelper!;

  // 尝试获取一个订单
  if (!state.firstOrderId) {
    const res = await userHelper.get('/order/my', { page: 1, pageSize: 1 });
    if (res.data && res.data.length > 0) {
      state.firstOrderId = res.data[0].id;
    }
  }

  if (!state.firstOrderId) {
    logger.warn('⚠ 用户无订单，跳过订单详情页测试');
    return;
  }

  const orderId = state.firstOrderId!;
  const order = await userHelper.get(`/order/${orderId}`);

  if (!order || !order.id) {
    throw new Error(`orderApi.getDetail(${orderId}) 返回数据异常`);
  }

  const requiredOrderFields = [
    'id',
    'order_no',
    'status',
    'original_price',
    'paid_amount',
    'total_lessons',
    'completed_lessons',
    'institution_snapshot',
    'course_snapshot',
    'sku_snapshot',
  ];
  for (const f of requiredOrderFields) {
    if (order[f] === undefined) {
      logger.warn(`  ⚠ 订单详情缺少字段: ${f}`);
    }
  }

  logger.info(
    `  订单: ${order.order_no}, status=${order.status}, ${order.completed_lessons}/${order.total_lessons}节`,
  );

  // refund_info（已确认状态才有）
  if (order.status === 'confirmed') {
    const refundInfo = order.refund_info;
    if (refundInfo && refundInfo.total_refund_amount !== undefined) {
      logger.info(`  退款预估: ¥${refundInfo.total_refund_amount}`);
    }
  }

  logger.success('✓ 订单详情页场景测试通过');
}

// ==================== 测试 8：我的预约页 ====================

async function testMyBookingsPage() {
  logger.info('【我的预约页】模拟 pages/my-bookings onLoad: bookingApi.getMyList ...');

  const userHelper = state.userHelper!;

  const statuses = ['', 'confirmed', 'pending', 'completed', 'cancelled', 'pending_change'];
  for (const status of statuses) {
    const params: any = { page: 1, pageSize: 10 };
    if (status) params.status = status;

    const res = await userHelper.get('/booking/my', params);

    if (!res || !Array.isArray(res.data)) {
      throw new Error(`bookingApi.getMyList(status="${status}") 格式错误`);
    }

    logger.info(`  status="${status || '全部'}": ${res.total} 条预约`);

    if (res.data.length > 0 && !state.firstBookingId) {
      state.firstBookingId = res.data[0].id;
    }
  }

  logger.success('✓ 我的预约页场景测试通过');
}

// ==================== 测试 9：课表页 ====================

async function testSchedulePage() {
  logger.info('【课表页】模拟 pages/schedule onMounted: confirmed + pending_change 预约 + childApi ...');

  const userHelper = state.userHelper!;

  // 与页面完全一致：Promise.all 加载两种状态
  const [confirmedRes, pendingChangeRes, childrenRes] = await Promise.all([
    userHelper.get('/booking/my', { status: 'confirmed', page: 1, pageSize: 100 }),
    userHelper.get('/booking/my', { status: 'pending_change', page: 1, pageSize: 100 }),
    userHelper.get('/child/my'),
  ]);

  const confirmed = confirmedRes.data || [];
  const pendingChange = pendingChangeRes.data || [];
  const children = Array.isArray(childrenRes) ? childrenRes : childrenRes.data || [];

  logger.info(
    `  confirmed预约: ${confirmed.length}, pending_change预约: ${pendingChange.length}, 宝贝: ${children.length}`,
  );

  // 验证 pending_change 预约中包含修改信息
  for (const b of pendingChange) {
    if (!b.pending_change_schedule_id) {
      logger.warn(`  ⚠ pending_change 预约 ${b.id} 缺少 pending_change_schedule_id`);
    }
  }

  // 合并所有预约，按日期分组（模拟日历渲染逻辑）
  const allBookings = [...confirmed, ...pendingChange];
  const dateGroups: Record<string, number> = {};
  for (const b of allBookings) {
    const d = b.booking_time?.slice(0, 10) || 'no-date';
    dateGroups[d] = (dateGroups[d] || 0) + 1;
  }
  logger.info(`  日期分组: ${Object.keys(dateGroups).length} 天有课`);

  logger.success('✓ 课表页场景测试通过');
}

// ==================== 测试 10：个人中心页 ====================

async function testMinePage() {
  logger.info('【个人中心页】模拟 pages/mine onMounted: profile + orders count + children + invite ...');

  const userHelper = state.userHelper!;

  // authApi.getUserInfo → GET /auth/user-info
  // 注意：该接口要求用户在数据库中真实存在，独立运行时测试用户可能不在库中
  try {
    const profile = await userHelper.get('/auth/user-info');
    if (!profile || !profile.id) {
      throw new Error('authApi.getUserInfo 返回数据异常');
    }
    logger.info(`  用户: "${profile.nickname || profile.username}", id=${profile.id}`);
  } catch (e: any) {
    if (e.response?.status === 401 && e.response?.data?.message?.includes('用户不存在')) {
      logger.warn('  ⚠ 当前测试用户不在数据库中（独立运行时正常），跳过 getUserInfo 验证');
    } else {
      throw e;
    }
  }

  // 订单状态数量（多个并发请求）
  const [pendingRes, confirmedRes, pendingConfirmRes, refundRes] = await Promise.all([
    userHelper.get('/order/my', { page: 1, pageSize: 1, status: 'pending' }),
    userHelper.get('/order/my', { page: 1, pageSize: 1, status: 'confirmed' }),
    userHelper.get('/order/my', { page: 1, pageSize: 1, status: 'pending_confirm' }),
    userHelper.get('/order/my', { page: 1, pageSize: 1, status: 'refund_pending,refunding' }),
  ]);
  logger.info(
    `  订单统计: pending=${pendingRes.total}, pending_confirm=${pendingConfirmRes.total}, confirmed=${confirmedRes.total}, refund=${refundRes.total}`,
  );

  // 宝贝列表
  const children = await userHelper.get('/child/my');
  const childList = Array.isArray(children) ? children : children.data || [];
  logger.info(`  宝贝: ${childList.length} 个`);

  // 邀请统计（inviteApi）
  try {
    const inviteStats = await userHelper.get('/invite/stats');
    logger.info(
      `  邀请统计: totalInvites=${inviteStats.stats?.totalInvites ?? '?'}, available=${inviteStats.balance?.available ?? '?'}`,
    );
  } catch {
    logger.warn('  ⚠ 邀请统计接口调用失败（可能未初始化邀请码）');
  }

  logger.success('✓ 个人中心页场景测试通过');
}

// ==================== 测试 11：邀请码选择页 ====================

async function testInviteCodeSelectPage() {
  logger.info('【邀请码选择页】模拟 pages/invite-code-select: validateCode + calculateDiscount ...');

  const userHelper = state.userHelper!;

  // 先获取用户自己的邀请码
  let myInviteCode: string | null = null;
  try {
    const codeInfo = await userHelper.get('/invite/code');
    myInviteCode = codeInfo?.invite_code || null;
    logger.info(`  我的邀请码: ${myInviteCode || '（未创建）'}`);
  } catch {
    logger.warn('  ⚠ 获取邀请码失败');
  }

  if (!myInviteCode || !state.firstCourseId || !state.firstSkuId) {
    logger.warn('⚠ 无邀请码或无课程信息，跳过邀请码计算验证');
    logger.success('✓ 邀请码选择页场景测试通过（部分跳过）');
    return;
  }

  // 验证邀请码有效性（前端调用 inviteApi.validateInviteCode → POST /invite/validate）
  const validateRes = await userHelper.post('/invite/validate', {
    invite_code: myInviteCode,
    course_id: state.firstCourseId,
  });
  logger.info(`  validate: valid=${validateRes?.valid}`);

  // 获取可用的邀请码列表（invite-code-select 页面的核心）
  try {
    const availableCodes = await userHelper.get('/invite/available-codes', {
      courseId: state.firstCourseId,
      orderAmount: state.firstSkuId,
    });
    const codes = Array.isArray(availableCodes) ? availableCodes : availableCodes.data || [];
    logger.info(`  可用邀请码: ${codes.length} 个`);
  } catch {
    // 接口可能不存在
    logger.warn('  ⚠ available-codes 接口不可用（跳过）');
  }

  // calculateDiscount → POST /invite/calculate-discount
  try {
    const discountRes = await userHelper.post('/invite/calculate-discount', {
      invite_code: myInviteCode,
      course_id: state.firstCourseId,
      order_amount: 1000,
    });
    if (discountRes?.discount_amount !== undefined) {
      logger.info(
        `  calculateDiscount: cashback_total=¥${discountRes.cashback_total}, discount_amount=¥${discountRes.discount_amount}`,
      );
    }
  } catch (e: any) {
    logger.warn(`  ⚠ calculate-discount: ${e.response?.data?.message || e.message}`);
  }

  logger.success('✓ 邀请码选择页场景测试通过');
}

// ==================== 测试 12：邀请/返现管理页 ====================

async function testInviteManagementPage() {
  logger.info('【邀请返现管理页】模拟 pages/mine 邀请模块: balance + orders + cashback + withdraw ...');

  const userHelper = state.userHelper!;

  // 余额
  const balance = await userHelper.get('/invite/balance');
  const requiredBalanceFields = ['available', 'frozen', 'total_earned', 'total_withdrawn'];
  for (const f of requiredBalanceFields) {
    if (balance[f] === undefined) {
      throw new Error(`balance 缺少字段: ${f}`);
    }
  }
  logger.info(`  余额: available=¥${balance.available}, frozen=¥${balance.frozen}`);

  // 邀请订单列表
  const inviteOrders = await userHelper.get('/invite/orders', { page: 1, pageSize: 10 });
  const orderList = Array.isArray(inviteOrders) ? inviteOrders : inviteOrders.data || [];
  logger.info(`  邀请订单: ${inviteOrders.total ?? orderList.length} 条`);

  // 返现记录
  const cashbackRecords = await userHelper.get('/invite/cashback-records', {
    page: 1,
    pageSize: 10,
  });
  const cbList = Array.isArray(cashbackRecords) ? cashbackRecords : cashbackRecords.data || [];
  logger.info(`  返现记录: ${cashbackRecords.total ?? cbList.length} 条`);

  // 提现记录
  const withdrawRecords = await userHelper.get('/invite/withdraw-records', {
    page: 1,
    pageSize: 10,
  });
  const wdList = Array.isArray(withdrawRecords) ? withdrawRecords : withdrawRecords.data || [];
  logger.info(`  提现记录: ${withdrawRecords.total ?? wdList.length} 条`);

  // 提现金额不足时的友好错误
  try {
    await userHelper.post('/invite/withdraw', { amount: 999999 });
    logger.warn('  ⚠ 余额不足时应报错，但接口返回成功');
  } catch (err: any) {
    logger.info(`  提现余额不足错误拦截: ${err.message?.slice(0, 60) || 'OK'}`);
  }

  logger.success('✓ 邀请返现管理页场景测试通过');
}

// ==================== 测试 13：课程列表页 / 机构列表页 ====================

async function testListPages() {
  logger.info('【列表页】模拟 pages/course-list + pages/institution-list ...');

  const helper = state.anonHelper!;

  // 课程列表（分页 + 筛选）
  const [coursePage1, coursePage2, trialCourses] = await Promise.all([
    helper.get('/courses', { is_online: true, page: 1, pageSize: 10 }),
    helper.get('/courses', { is_online: true, page: 2, pageSize: 10 }),
    helper.get('/courses', { is_online: true, type: 'trial', page: 1, pageSize: 5 }),
  ]);
  logger.info(
    `  课程列表: 第1页=${(coursePage1.data || coursePage1).length || '?'}条, 第2页=${(coursePage2.data || coursePage2).length || '?'}条`,
  );
  logger.info(`  试听课: ${(trialCourses.data || trialCourses).length || '?'}条`);

  // 机构列表
  const institutions = await helper.get('/institution/list', { page: 1, pageSize: 10 });
  const instList = Array.isArray(institutions) ? institutions : institutions.data || [];
  logger.info(`  机构列表: ${institutions.total ?? instList.length} 条`);

  // 附近机构（带坐标）
  const nearby = await helper.get('/institution/list', {
    latitude: 39.9042,
    longitude: 116.4074,
    page: 1,
    pageSize: 5,
  });
  const nearbyList = Array.isArray(nearby) ? nearby : nearby.data || [];
  logger.info(`  附近机构: ${nearbyList.length} 条`);
  if (nearbyList.length > 0 && nearbyList[0].distance !== undefined) {
    logger.info(`  首条距离: ${nearbyList[0].distance} km`);
  }

  logger.success('✓ 列表页场景测试通过');
}

// ==================== 测试 14：收藏页 ====================

async function testFavoritePage() {
  logger.info('【收藏页】模拟 pages/my-favorites: 课程收藏 + 机构收藏 ...');

  const userHelper = state.userHelper!;

  const [courseFavs, instFavs] = await Promise.all([
    userHelper.get('/favorite/my', { target_type: 'course', page: 1, pageSize: 10 }),
    userHelper.get('/favorite/my', { target_type: 'institution', page: 1, pageSize: 10 }),
  ]);

  const courseList = Array.isArray(courseFavs) ? courseFavs : courseFavs.data || [];
  const instList = Array.isArray(instFavs) ? instFavs : instFavs.data || [];
  logger.info(`  收藏课程: ${courseFavs.total ?? courseList.length} 条, 收藏机构: ${instFavs.total ?? instList.length} 条`);

  // 收藏 / 取消收藏 toggle
  if (state.firstCourseId) {
    const toggleRes = await userHelper.post('/favorite/toggle', {
      target_type: 'course',
      target_id: state.firstCourseId,
    });
    logger.info(`  toggle course 收藏: isFavorited=${toggleRes?.isFavorited}`);
    // 复原
    await userHelper.post('/favorite/toggle', {
      target_type: 'course',
      target_id: state.firstCourseId,
    });
  }

  logger.success('✓ 收藏页场景测试通过');
}

// ==================== 入口 ====================

export async function runCRUDTests(sharedData?: any): Promise<boolean> {
  logger.section('前端页面场景测试（API-Flow）');

  let passed = 0;
  let failed = 0;

  // ---- 初始化 helpers ----
  const userId = sharedData?.userId || '260765341334900736';
  const userToken =
    sharedData?.userToken || generateUserToken(userId, 'test_openid', '页面测试用户');

  // 机构 token（用于某些需要机构身份的查询）
  const institutionToken =
    sharedData?.institutionToken ||
    generateUserToken(
      sharedData?.institutionUserId || 'inst_test_user_id',
      'inst_openid',
      '机构测试账号',
    );

  state.userToken = userToken;
  state.institutionToken = institutionToken;
  state.anonHelper = new TestHelper(); // 无 token
  state.userHelper = new TestHelper(userToken);
  state.institutionHelper = new TestHelper(institutionToken);

  // 从 sharedData 中继承已创建的 ID
  if (sharedData?.courseId) state.firstCourseId = sharedData.courseId;
  if (sharedData?.skuId) state.firstSkuId = sharedData.skuId;
  if (sharedData?.institutionId) state.firstInstitutionId = sharedData.institutionId;
  if (sharedData?.scheduleId) state.firstScheduleId = sharedData.scheduleId;
  if (sharedData?.orderId) state.firstOrderId = sharedData.orderId;
  if (sharedData?.bookingId) state.firstBookingId = sharedData.bookingId;

  // ---- 测试列表 ----
  const tests: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: '首页', fn: testHomePage },
    { name: '搜索页', fn: testSearchPage },
    { name: '课程详情页', fn: testCourseDetailPage },
    { name: '机构详情页', fn: testInstitutionDetailPage },
    { name: '下单表单页', fn: testBookingFormPage },
    { name: '我的订单页', fn: testMyOrdersPage },
    { name: '订单详情页', fn: testOrderDetailPage },
    { name: '我的预约页', fn: testMyBookingsPage },
    { name: '课表页', fn: testSchedulePage },
    { name: '个人中心页', fn: testMinePage },
    { name: '邀请码选择页', fn: testInviteCodeSelectPage },
    { name: '邀请返现管理页', fn: testInviteManagementPage },
    { name: '列表页', fn: testListPages },
    { name: '收藏页', fn: testFavoritePage },
  ];

  for (const { name, fn } of tests) {
    const start = Date.now();
    try {
      await fn();
      passed++;
      logger.success(`[${name}] ✓ (${Date.now() - start}ms)\n`);
    } catch (err: any) {
      failed++;
      logger.error(`[${name}] ✗ ${err.message}`);
      logger.info('');
    }
  }

  // ---- 汇总 ----
  logger.section('页面场景测试结果');
  logger.info(`总计: ${passed + failed} 个页面, ✓ ${passed} 通过, ✗ ${failed} 失败`);

  if (failed > 0) {
    logger.error(`${failed} 个页面场景测试失败`);
    return false;
  }

  logger.success('所有前端页面场景测试通过！');
  return true;
}
