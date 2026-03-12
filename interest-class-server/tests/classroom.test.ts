/**
 * 教室CRUD测试
 * 使用helper方法，避免重复代码
 */

import { TestHelper, sleep, generateUserToken } from './utils/test-client';
import { logger } from './utils/logger';
import {
  createInstitution,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  getClassroom,
  getClassrooms,
  sortClassrooms,
} from './utils/test-helpers';

// 存储测试数据
export const testData = {
  userToken: '',
  institutionId: '',
  institutionToken: '',
  classroomIds: [] as string[],
  danceClassroomId: '',
  artClassroomId: '',
  musicClassroomId: '',
};

/**
 * 前置步骤：使用helper方法创建机构
 */
export async function setupInstitution(sharedData?: any) {
  // 🔗 检查是否传入了机构数据
  if (sharedData?.institutionId && sharedData?.institutionToken) {
    logger.info('📦 使用共享机构数据，跳过机构创建');
    testData.institutionId = sharedData.institutionId;
    testData.institutionToken = sharedData.institutionToken;
    testData.userToken = sharedData.userToken || generateUserToken(
      '260765341334900736',
      'test_openid',
      'test_user',
    );
    logger.info(`✓ 机构ID: ${testData.institutionId}`);
    return;
  }

  logger.section('前置准备：使用Helper创建机构');

  testData.userToken = generateUserToken(
    '260765341334900736',
    'test_openid',
    'test_user',
  );

  const userHelper = new TestHelper(testData.userToken);

  // 创建机构（自动审核通过）
  const institution = await createInstitution(userHelper, {
    name: '艺术培训中心',
    categoryIds: ['art'],
    autoApprove: true,
  });

  testData.institutionId = institution.institutionId;
  testData.institutionToken = institution.token;

  logger.info(`✓ 机构ID: ${institution.institutionId}`);
  logger.success('✓ 机构创建完成\n');
}

/**
 * 测试1：创建教室
 */
export async function testCreateClassroom() {
  const helper = new TestHelper(testData.institutionToken);

  // 创建舞蹈教室
  testData.danceClassroomId = await createClassroom(helper, {
    institutionId: testData.institutionId,
    name: '舞蹈教室A',
    area: 120,
    capacity: 25,
    floor: '3F',
  });
  testData.classroomIds.push(testData.danceClassroomId);
  logger.info(`创建舞蹈教室: ${testData.danceClassroomId}`);

  // 创建美术教室
  testData.artClassroomId = await createClassroom(helper, {
    institutionId: testData.institutionId,
    name: '美术教室B',
    area: 80,
    capacity: 20,
    floor: '2F',
  });
  testData.classroomIds.push(testData.artClassroomId);
  logger.info(`创建美术教室: ${testData.artClassroomId}`);

  // 创建音乐教室
  testData.musicClassroomId = await createClassroom(helper, {
    institutionId: testData.institutionId,
    name: '音乐教室C',
    area: 60,
    capacity: 15,
    floor: '1F',
  });
  testData.classroomIds.push(testData.musicClassroomId);
  logger.info(`创建音乐教室: ${testData.musicClassroomId}`);

  logger.success('✓ 创建教室测试通过');
}

/**
 * 测试2：查询教室详情
 */
async function testGetClassroom() {
  const helper = new TestHelper(testData.institutionToken);

  const classroom = await getClassroom(helper, testData.danceClassroomId);

  // 验证基本信息
  if (classroom.id !== testData.danceClassroomId) {
    throw new Error('教室ID不匹配');
  }
  if (classroom.name !== '舞蹈教室A') {
    throw new Error('教室名称不匹配');
  }
  if (classroom.capacity !== 25) {
    throw new Error('容纳人数不匹配');
  }

  logger.info('教室信息验证成功');
  logger.success('✓ 查询教室详情测试通过');
}

/**
 * 测试3：更新教室
 */
async function testUpdateClassroom() {
  const helper = new TestHelper(testData.institutionToken);

  await updateClassroom(helper, testData.danceClassroomId, {
    name: '舞蹈教室A-升级版',
    capacity: 30,
  });

  // 验证更新
  const updated = await getClassroom(helper, testData.danceClassroomId);
  if (updated.name !== '舞蹈教室A-升级版') {
    throw new Error('教室名称未正确更新');
  }
  if (updated.capacity !== 30) {
    throw new Error('容纳人数未正确更新');
  }

  logger.info('教室信息更新成功');
  logger.success('✓ 更新教室测试通过');
}

/**
 * 测试4：查询机构教室列表
 */
/**
 * 测试4：查询教室列表（不分页）
 */
async function testGetClassrooms() {
  const helper = new TestHelper(testData.institutionToken);

  const result = await getClassrooms(helper, {
    institutionId: testData.institutionId,
  });

  // 不分页模式返回数组
  if (!Array.isArray(result)) {
    throw new Error('不分页模式应该返回数组');
  }

  logger.info(`找到 ${result.length} 个教室`);

  if (result.length < 3) {
    throw new Error(`期望至少3个教室，实际${result.length}个`);
  }

  // 验证我们创建的教室都在列表中
  const ourClassroomIds = result.map((c: any) => c.id);
  const allFound = testData.classroomIds.every((id) =>
    ourClassroomIds.includes(id),
  );

  if (!allFound) {
    throw new Error('部分教室未在列表中找到');
  }

  logger.success('✓ 查询教室列表测试通过（不分页）');
}

/**
 * 测试5：按状态查询教室
 */
/**
 * 测试5：查询教室列表（分页）
 */
async function testGetClassroomsWithPagination() {
  const helper = new TestHelper(testData.institutionToken);

  const result = await getClassrooms(helper, {
    institutionId: testData.institutionId,
    page: 1,
    pageSize: 2,
  });

  // 分页模式返回对象
  if (!result.data || !result.total) {
    throw new Error('分页模式应该返回对象含 data 和 total');
  }

  logger.info(`总共 ${result.total} 个教室，当前页 ${result.data.length} 个`);

  if (result.total < 3) {
    throw new Error(`期望至少3个教室，实际${result.total}个`);
  }

  if (result.data.length > 2) {
    throw new Error(`pageSize=2，但返回${result.data.length}个`);
  }

  logger.success('✓ 查询教室列表测试通过（分页）');
}

/**
 * 测试6：按状态筛选教室
 */
async function testFilterByStatus() {
  const helper = new TestHelper(testData.institutionToken);

  // 先将一个教室设为维护状态
  await updateClassroom(helper, testData.artClassroomId, {
    status: 'maintenance',
  });

  // 查询可用教室
  const availableResult = await getClassrooms(helper, {
    institutionId: testData.institutionId,
    status: 'available',
  });

  logger.info(`找到 ${availableResult.length} 个可用教室`);

  // 验证维护中的教室不在结果中
  const availableIds = availableResult.map((c: any) => c.id);
  if (availableIds.includes(testData.artClassroomId)) {
    throw new Error('维护中的教室不应出现在可用列表中');
  }

  logger.success('✓ 按状态筛选测试通过');
}

/**
 * 测试6：批量排序
 */
/**
 * 测试7：批量排序
 */
async function testSortClassrooms() {
  const helper = new TestHelper(testData.institutionToken);

  // 设置排序顺序（数字越大越靠前，降序排列）
  await sortClassrooms(helper, [
    { id: testData.musicClassroomId, sort_order: 3 },
    { id: testData.danceClassroomId, sort_order: 2 },
    { id: testData.artClassroomId, sort_order: 1 },
  ]);

  // 获取列表验证排序（按sort_order DESC排序）
  const result = await getClassrooms(helper, {
    institutionId: testData.institutionId,
  });

  const sortedIds = result.map((c: any) => c.id);
  const expectedOrder = [
    testData.musicClassroomId, // sort_order=3
    testData.danceClassroomId, // sort_order=2
    testData.artClassroomId, // sort_order=1
  ];

  // 验证前3个是否按我们设定的顺序排列
  for (let i = 0; i < 3; i++) {
    if (sortedIds[i] !== expectedOrder[i]) {
      throw new Error('教室排序不正确');
    }
  }

  logger.info('教室排序验证成功');
  logger.success('✓ 批量排序测试通过');
}

/**
 * 测试8：删除教室
 */
async function testDeleteClassroom() {
  const helper = new TestHelper(testData.institutionToken);

  // 删除音乐教室
  await deleteClassroom(helper, testData.musicClassroomId);

  // 验证已删除（软删除，应该查不到）
  try {
    await getClassroom(helper, testData.musicClassroomId);
    throw new Error('已删除的教室仍可查询');
  } catch (error: any) {
    // axios 错误在 error.response.data.message 中
    const errorMsg = error.response?.data?.message || error.message;
    if (!errorMsg.includes('不存在') && !errorMsg.includes('未找到')) {
      throw error;
    }
  }

  logger.info('教室已删除');
  logger.success('✓ 删除教室测试通过');
}

/**
 * 运行所有CRUD测试
 */
export async function runCRUDTests(sharedData?: any) {
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  logger.step('教室CRUD测试（使用Helper重构）');

  // 准备测试数据
  try {
    await setupInstitution(sharedData);
  } catch (error: any) {
    logger.error(`前置准备失败: ${error.message}`);
    return false;
  }

  // 定义测试用例
  const tests = [
    { name: '创建教室', fn: testCreateClassroom },
    { name: '查询教室详情', fn: testGetClassroom },
    { name: '更新教室', fn: testUpdateClassroom },
    { name: '查询教室列表（不分页）', fn: testGetClassrooms },
    { name: '查询教室列表（分页）', fn: testGetClassroomsWithPagination },
    { name: '按状态筛选教室', fn: testFilterByStatus },
    { name: '批量排序', fn: testSortClassrooms },
    { name: '删除教室', fn: testDeleteClassroom },
  ];

  // 执行测试
  for (const test of tests) {
    try {
      logger.section(test.name);
      await test.fn();
      successCount++;
      await sleep(200);
    } catch (error: any) {
      logger.error(`${test.name} 失败: ${error.message}`);
      failCount++;
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  logger.summary({
    title: '测试总结',
    total: tests.length,
    success: successCount,
    fail: failCount,
    duration,
  });

  if (failCount > 0) {
    return false;
  }

  // 🔗 将教室ID写入sharedData（供后续测试使用）
  if (sharedData) {
    sharedData.classroomId = testData.danceClassroomId;
    sharedData.danceClassroomId = testData.danceClassroomId;
    sharedData.artClassroomId = testData.artClassroomId;
    sharedData.musicClassroomId = testData.musicClassroomId;
    
    // 如果机构是自己创建的，也写回去
    if (!sharedData.institutionId) {
      sharedData.institutionId = testData.institutionId;
      sharedData.institutionToken = testData.institutionToken;
      sharedData.userToken = testData.userToken;
    }
    
    logger.info('✅ 已将教室数据写入共享数据');
  }

  return failCount === 0;
}

async function main() {
  const success = await runCRUDTests();
  if (success) {
    logger.success('\n🎉 所有测试通过！');
    logger.info('\n💡 优势：使用helper后代码从462行减少到310+行，减少35%+');
  } else {
    logger.error('\n❌ 部分测试失败');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    logger.error(`执行出错: ${error.message}`);
    process.exit(1);
  });
}
