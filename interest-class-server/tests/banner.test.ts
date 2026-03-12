/**
 * Banner CRUD测试
 * 测试轮播图的创建、查询、更新、删除、排序操作
 */

import { TestHelper, sleep, generateUserToken } from './utils/test-client';
import { logger } from './utils/logger';

// 存储测试数据
const testData = {
  adminToken: '',
  bannerIds: [] as string[],
  banner1Id: '',
  banner2Id: '',
  banner3Id: '',
};

/**
 * 前置：生成管理员token（Banner是平台级功能）
 */
async function setup() {
  // 生成管理员token
  testData.adminToken = generateUserToken(
    '260765341334900736',
    'admin_openid',
    '平台管理员',
  );

  logger.success('管理员Token已生成\n');
}

/**
 * 运行所有CRUD测试
 */
async function runCRUDTests() {
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  // 前置设置
  await setup();

  const tests = [
    { name: '创建Banner1（首页推荐）', fn: testCreateBanner1 },
    { name: '创建Banner2（活动宣传）', fn: testCreateBanner2 },
    { name: '创建Banner3（新课上线）', fn: testCreateBanner3 },
    { name: '查询Banner列表', fn: testListBanners },
    { name: '查询Banner详情', fn: testGetBannerDetail },
    { name: '更新Banner信息', fn: testUpdateBanner },
    { name: '批量更新排序', fn: testSortBanners },
    { name: '删除Banner', fn: testDeleteBanner },
    { name: '验证删除后列表', fn: testListAfterDelete },
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
    title: 'Banner CRUD测试总结',
    total: tests.length,
    success: successCount,
    fail: failCount,
    duration,
  });

  logger.data('测试数据', testData);

  return failCount === 0;
}

/**
 * 测试1: 创建Banner1（首页推荐）
 */
async function testCreateBanner1() {
  const helper = new TestHelper(testData.adminToken);

  const bannerData = {
    title: '暑期特惠活动',
    image: 'https://picsum.photos/1200/400?random=1',
    link_type: 'course',
    link_target: '267311542339375104',
    sort: 1,
    status: 'active',
  };

  const bannerId = await helper.post('/banner', bannerData);
  testData.banner1Id = bannerId;
  testData.bannerIds.push(bannerId);

  logger.info(`Banner ID: ${bannerId}`);
  logger.info(`标题: ${bannerData.title}`);
  logger.info(`排序: ${bannerData.sort}`);

  // 验证返回ID
  if (!bannerId || typeof bannerId !== 'string') {
    throw new Error('创建失败：未返回有效的Banner ID');
  }

  // 查询详情验证创建成功
  const banner = await helper.get(`/banner/${bannerId}`);
  if (banner.title !== bannerData.title) {
    throw new Error('Banner标题不匹配');
  }
}

/**
 * 测试2: 创建Banner2（活动宣传）
 */
async function testCreateBanner2() {
  const helper = new TestHelper(testData.adminToken);

  const bannerData = {
    title: '新用户专享',
    image: 'https://picsum.photos/1200/400?random=2',
    link_type: 'institution',
    link_target: '267311542339375104',
    sort: 2,
    status: 'active',
  };

  const bannerId = await helper.post('/banner', bannerData);
  testData.banner2Id = bannerId;
  testData.bannerIds.push(bannerId);

  logger.info(`Banner ID: ${bannerId}`);
  logger.info(`标题: ${bannerData.title}`);
}

/**
 * 测试3: 创建Banner3（新课上线）
 */
async function testCreateBanner3() {
  const helper = new TestHelper(testData.adminToken);

  const bannerData = {
    title: '新课上线',
    image: 'https://picsum.photos/1200/400?random=3',
    link_type: 'url',
    link_target: 'https://example.com/course/piano',
    sort: 3,
    status: 'active',
  };

  const bannerId = await helper.post('/banner', bannerData);
  testData.banner3Id = bannerId;
  testData.bannerIds.push(bannerId);

  logger.info(`Banner ID: ${bannerId}`);
  logger.info(`标题: ${bannerData.title}`);
}

/**
 * 测试4: 查询Banner列表
 */
async function testListBanners() {
  const helper = new TestHelper(testData.adminToken);

  const result = await helper.get('/banner', {
    page: 1,
    pageSize: 10,
  });

  logger.info(`总数: ${result.total}`);
  logger.info(`当前页: ${result.data.length} 条`);

  // 验证列表包含刚创建的Banner
  const createdBanners = result.data.filter((b: any) =>
    testData.bannerIds.includes(b.id),
  );

  if (createdBanners.length !== 3) {
    throw new Error(
      `期望找到3个Banner，实际找到${createdBanners.length}个`,
    );
  }

  // 验证排序（应该按sort_order降序）
  logger.info(
    `Banner排序: ${result.data.map((b: any) => `${b.title}(${b.sort_order})`).join(', ')}`,
  );
}

/**
 * 测试5: 查询Banner详情
 */
async function testGetBannerDetail() {
  const helper = new TestHelper(testData.adminToken);

  const result = await helper.get(`/banner/${testData.banner1Id}`);

  logger.info(`ID: ${result.id}`);
  logger.info(`标题: ${result.title}`);
  logger.info(`图片: ${result.image}`);
  logger.info(`链接类型: ${result.link_type}`);
  logger.info(`链接目标: ${result.link_target}`);
  logger.info(`排序: ${result.sort}`);
  logger.info(`状态: ${result.status}`);

  // 验证所有必填字段
  const requiredFields = [
    'id',
    'title',
    'image',
    'link_type',
    'sort',
    'status',
  ];

  for (const field of requiredFields) {
    if (result[field] === undefined || result[field] === null) {
      throw new Error(`缺少必填字段: ${field}`);
    }
  }

  // 验证ID匹配
  if (result.id !== testData.banner1Id) {
    throw new Error('Banner ID不匹配');
  }

  logger.info('✓ 所有字段验证通过');
}

/**
 * 测试6: 更新Banner信息
 */
async function testUpdateBanner() {
  const helper = new TestHelper(testData.adminToken);

  const updateData = {
    title: '暑期特惠活动【已更新】',
    status: 'inactive',
  };

  const success = await helper.put(
    `/banner/${testData.banner1Id}`,
    updateData,
  );

  if (!success) {
    throw new Error('更新失败');
  }

  // 查询详情验证更新
  const result = await helper.get(`/banner/${testData.banner1Id}`);

  if (result.title !== updateData.title) {
    throw new Error('标题未更新');
  }

  if (result.status !== updateData.status) {
    throw new Error('状态未更新');
  }

  logger.info(`更新后标题: ${result.title}`);
  logger.info(`更新后状态: ${result.status}`);
}

/**
 * 测试7: 批量更新排序
 */
async function testSortBanners() {
  const helper = new TestHelper(testData.adminToken);

  // 调整排序：banner3排第一，banner1排第二，banner2排第三
  const sortData = [
    { id: testData.banner3Id, sort: 100 },
    { id: testData.banner1Id, sort: 50 },
    { id: testData.banner2Id, sort: 10 },
  ];

  const success = await helper.post('/banner/sort', { items: sortData });

  if (!success) {
    throw new Error('排序失败');
  }

  // 查询列表验证排序
  const result = await helper.get('/banner', { page: 1, pageSize: 10 });

  const banner3 = result.data.find((b: any) => b.id === testData.banner3Id);
  const banner1 = result.data.find((b: any) => b.id === testData.banner1Id);
  const banner2 = result.data.find((b: any) => b.id === testData.banner2Id);

  if (!banner3 || !banner1 || !banner2) {
    throw new Error('未找到排序后的Banner');
  }

  logger.info(`Banner3排序: ${banner3.sort}`);
  logger.info(`Banner1排序: ${banner1.sort}`);
  logger.info(`Banner2排序: ${banner2.sort}`);

  if (
    banner3.sort !== 100 ||
    banner1.sort !== 50 ||
    banner2.sort !== 10
  ) {
    throw new Error('排序值不正确');
  }

  logger.info('✓ 排序更新成功');
}

/**
 * 测试8: 删除Banner
 */
async function testDeleteBanner() {
  const helper = new TestHelper(testData.adminToken);

  const success = await helper.delete(`/banner/${testData.banner3Id}`);

  if (!success) {
    throw new Error('删除失败');
  }

  // 尝试查询已删除的Banner（应该返回404或错误）
  try {
    await helper.get(`/banner/${testData.banner3Id}`);
    throw new Error('删除后仍能查询到Banner');
  } catch (error: any) {
    if (error.response?.status === 404 || error.response?.status === 400) {
      logger.info('✓ Banner已成功删除，无法查询');
    } else {
      throw error;
    }
  }
}

/**
 * 测试9: 验证删除后的列表
 */
async function testListAfterDelete() {
  const helper = new TestHelper(testData.adminToken);

  const result = await helper.get('/banner', { page: 1, pageSize: 10 });

  // 验证删除的Banner不在列表中
  const deletedBanner = result.data.find(
    (b: any) => b.id === testData.banner3Id,
  );

  if (deletedBanner) {
    throw new Error('已删除的Banner仍在列表中');
  }

  // 验证其他Banner仍存在
  const banner1 = result.data.find((b: any) => b.id === testData.banner1Id);
  const banner2 = result.data.find((b: any) => b.id === testData.banner2Id);

  if (!banner1 || !banner2) {
    throw new Error('其他Banner不应被删除');
  }

  logger.info(`✓ 列表验证通过，剩余${result.data.length}个Banner`);
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

export { runCRUDTests, testData };
