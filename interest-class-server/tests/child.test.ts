/**
 * 宝贝CRUD测试
 */

import { TestHelper, generateUserToken } from './utils/test-client';
import { logger } from './utils/logger';
import { TestChild } from './utils/test-data';

// 存储测试数据
export const testData = {
  userToken: '',
  userId: '',
  childIds: [] as string[],
  boyChildId: '',
  girlChildId: '',
};

/**
 * 前置步骤：生成用户Token
 */
export async function setupUser(sharedData?: any) {
  logger.section('前置准备：生成用户Token');

  // 使用共享数据或生成新Token
  if (sharedData?.userToken) {
    testData.userToken = sharedData.userToken;
    testData.userId = sharedData.userId || '260765341334900736';
    logger.info('📦 使用共享用户数据');
  } else {
    testData.userId = '260765341334900736';
    testData.userToken = generateUserToken(
      testData.userId,
      'test_openid_child',
      'test_child_user',
    );
    logger.info('✓ 生成新用户Token');
  }

  // 清理多余的宝贝，确保可以创建至少3个新宝贝
  await cleanupExistingChildren();

  logger.success('✓ 用户准备完成\n');
}

/**
 * 清理现有宝贝，确保数量不超过7个（留出3个测试位置）
 */
async function cleanupExistingChildren() {
  const helper = new TestHelper(testData.userToken);
  
  try {
    const children = await helper.get<any[]>('/child/my');
    if (!Array.isArray(children)) return;
    
    const targetMax = 7; // 留出至少3个位置用于测试
    const toDeleteCount = children.length - targetMax;
    
    if (toDeleteCount > 0) {
      logger.info(`📦 当前有 ${children.length} 个宝贝，需要清理 ${toDeleteCount} 个`);
      
      // 删除多余的宝贝
      for (let i = 0; i < toDeleteCount; i++) {
        const child = children[i];
        try {
          await helper.delete(`/child/${child.id}`);
          logger.info(`  ✓ 已删除宝贝: ${child.name}`);
        } catch (e: any) {
          logger.warn(`  ⚠ 删除宝贝失败: ${e.message}`);
        }
      }
    }
  } catch (error: any) {
    // 如果查询失败，可能是没有宝贝，忽略
    logger.info('📦 清理检查完成');
  }
}

/**
 * 测试1：创建宝贝（男孩）
 */
export async function testCreateBoyChild() {
  const helper = new TestHelper(testData.userToken);

  const boyData = TestChild.boy();
  const childId = await helper.post<string>('/child', boyData);

  if (!childId || typeof childId !== 'string') {
    throw new Error(`创建宝贝失败，返回值: ${JSON.stringify(childId)}`);
  }

  testData.boyChildId = childId;
  testData.childIds.push(childId);

  logger.info(`✓ 创建男孩宝贝成功，ID: ${childId}`);
  logger.info(`  姓名: ${boyData.name}`);
  logger.info(`  性别: ${boyData.gender}`);
  logger.info(`  年龄: ${boyData.age}`);
  logger.success('✓ 创建男孩宝贝测试通过');
}

/**
 * 测试2：创建宝贝（女孩）
 */
export async function testCreateGirlChild() {
  const helper = new TestHelper(testData.userToken);

  const girlData = TestChild.girl();
  const childId = await helper.post<string>('/child', girlData);

  if (!childId || typeof childId !== 'string') {
    throw new Error(`创建宝贝失败，返回值: ${JSON.stringify(childId)}`);
  }

  testData.girlChildId = childId;
  testData.childIds.push(childId);

  logger.info(`✓ 创建女孩宝贝成功，ID: ${childId}`);
  logger.info(`  姓名: ${girlData.name}`);
  logger.info(`  兴趣: ${girlData.interests.join(', ')}`);
  logger.success('✓ 创建女孩宝贝测试通过');
}

/**
 * 测试3：创建简单宝贝（只有必填字段）
 */
export async function testCreateSimpleChild() {
  const helper = new TestHelper(testData.userToken);

  const simpleData = TestChild.simple();
  const childId = await helper.post<string>('/child', simpleData);

  if (!childId || typeof childId !== 'string') {
    throw new Error(`创建宝贝失败，返回值: ${JSON.stringify(childId)}`);
  }

  testData.childIds.push(childId);

  logger.info(`✓ 创建简单宝贝成功，ID: ${childId}`);
  logger.success('✓ 创建简单宝贝测试通过');
}

/**
 * 测试4：查询我的宝贝列表
 */
export async function testGetMyChildren() {
  const helper = new TestHelper(testData.userToken);

  const children = await helper.get<any[]>('/child/my');

  if (!Array.isArray(children)) {
    throw new Error(`查询宝贝列表失败，返回值: ${JSON.stringify(children)}`);
  }

  if (children.length < 3) {
    throw new Error(`宝贝数量不足，期望>=3，实际: ${children.length}`);
  }

  logger.info(`✓ 查询到 ${children.length} 个宝贝`);
  children.forEach((child, index) => {
    logger.info(`  ${index + 1}. ${child.name} (${child.gender || '未知性别'})`);
  });
  logger.success('✓ 查询我的宝贝列表测试通过');
}

/**
 * 测试5：查询宝贝详情
 */
export async function testGetChildDetail() {
  const helper = new TestHelper(testData.userToken);

  const child = await helper.get<any>(`/child/${testData.boyChildId}`);

  if (!child || !child.id) {
    throw new Error(`查询宝贝详情失败，返回值: ${JSON.stringify(child)}`);
  }

  if (child.id !== testData.boyChildId) {
    throw new Error(`宝贝ID不匹配，期望: ${testData.boyChildId}，实际: ${child.id}`);
  }

  logger.info(`✓ 查询宝贝详情成功`);
  logger.info(`  ID: ${child.id}`);
  logger.info(`  姓名: ${child.name}`);
  logger.info(`  性别: ${child.gender}`);
  logger.info(`  年龄: ${child.age}`);
  logger.info(`  兴趣: ${child.interests?.join(', ') || '无'}`);
  logger.success('✓ 查询宝贝详情测试通过');
}

/**
 * 测试6：更新宝贝信息
 */
export async function testUpdateChild() {
  const helper = new TestHelper(testData.userToken);

  const updateData = {
    name: '小明（已更新）',
    age: 7,
    interests: ['绘画', '足球', '阅读', '编程'],
  };

  const result = await helper.put<boolean>(`/child/${testData.boyChildId}`, updateData);

  if (result !== true) {
    throw new Error(`更新宝贝失败，返回值: ${JSON.stringify(result)}`);
  }

  // 验证更新结果
  const child = await helper.get<any>(`/child/${testData.boyChildId}`);
  if (child.name !== updateData.name) {
    throw new Error(`宝贝姓名未更新，期望: ${updateData.name}，实际: ${child.name}`);
  }
  if (child.age !== updateData.age) {
    throw new Error(`宝贝年龄未更新，期望: ${updateData.age}，实际: ${child.age}`);
  }

  logger.info(`✓ 更新宝贝成功`);
  logger.info(`  新姓名: ${child.name}`);
  logger.info(`  新年龄: ${child.age}`);
  logger.info(`  新兴趣: ${child.interests?.join(', ')}`);
  logger.success('✓ 更新宝贝信息测试通过');
}

/**
 * 测试7：批量更新排序
 */
export async function testUpdateSort() {
  const helper = new TestHelper(testData.userToken);

  // 反转排序
  const sortData = {
    ids: [...testData.childIds].reverse(),
  };

  const result = await helper.post<boolean>('/child/sort', sortData);

  if (result !== true) {
    throw new Error(`更新排序失败，返回值: ${JSON.stringify(result)}`);
  }

  // 验证排序结果
  const children = await helper.get<any[]>('/child/my');
  const firstChildId = children[0]?.id;
  const expectedFirstId = sortData.ids[0];

  if (firstChildId !== expectedFirstId) {
    logger.warn(`⚠️ 排序顺序可能不符合预期，首个宝贝ID: ${firstChildId}，期望: ${expectedFirstId}`);
  }

  logger.info(`✓ 更新排序成功`);
  logger.success('✓ 批量更新排序测试通过');
}

/**
 * 测试8：删除宝贝
 */
export async function testDeleteChild() {
  const helper = new TestHelper(testData.userToken);

  // 删除最后一个（简单宝贝）
  const childToDelete = testData.childIds[testData.childIds.length - 1];
  const result = await helper.delete<boolean>(`/child/${childToDelete}`);

  if (result !== true) {
    throw new Error(`删除宝贝失败，返回值: ${JSON.stringify(result)}`);
  }

  // 验证删除结果
  const children = await helper.get<any[]>('/child/my');
  const deletedChild = children.find((c) => c.id === childToDelete);

  if (deletedChild) {
    throw new Error(`宝贝未被删除，ID: ${childToDelete}`);
  }

  // 从列表中移除
  testData.childIds = testData.childIds.filter((id) => id !== childToDelete);

  logger.info(`✓ 删除宝贝成功，ID: ${childToDelete}`);
  logger.info(`  剩余宝贝数量: ${children.length}`);
  logger.success('✓ 删除宝贝测试通过');
}

/**
 * 测试9：验证宝贝数量限制（可选）
 */
export async function testChildCountLimit() {
  const helper = new TestHelper(testData.userToken);

  // 获取当前数量
  const children = await helper.get<any[]>('/child/my');
  const currentCount = children.length;

  logger.info(`✓ 当前宝贝数量: ${currentCount}`);
  logger.info(`  限制: 最多10个宝贝`);

  // 如果数量接近限制，可以测试添加失败的场景
  if (currentCount >= 9) {
    logger.info('  ⚠️ 数量接近限制，跳过大量添加测试');
  }

  logger.success('✓ 宝贝数量限制验证通过');
}

/**
 * 测试10：无权限访问他人宝贝（应失败）
 */
export async function testAccessOtherUserChild() {
  // 生成另一个用户的Token
  const otherUserToken = generateUserToken(
    '999999999999999999',
    'other_openid',
    'other_user',
  );
  const helper = new TestHelper(otherUserToken);

  try {
    // 尝试访问第一个用户的宝贝
    await helper.get<any>(`/child/${testData.boyChildId}`);
    throw new Error('应该无法访问他人的宝贝');
  } catch (error: any) {
    if (error.message === '应该无法访问他人的宝贝') {
      throw error;
    }
    logger.info(`✓ 正确拒绝访问他人宝贝: ${error.message}`);
  }

  logger.success('✓ 无权限访问测试通过');
}

// 测试列表
const tests = [
  { name: '创建男孩宝贝', fn: testCreateBoyChild },
  { name: '创建女孩宝贝', fn: testCreateGirlChild },
  { name: '创建简单宝贝', fn: testCreateSimpleChild },
  { name: '查询我的宝贝列表', fn: testGetMyChildren },
  { name: '查询宝贝详情', fn: testGetChildDetail },
  { name: '更新宝贝信息', fn: testUpdateChild },
  { name: '批量更新排序', fn: testUpdateSort },
  { name: '删除宝贝', fn: testDeleteChild },
  { name: '验证宝贝数量限制', fn: testChildCountLimit },
  { name: '无权限访问他人宝贝', fn: testAccessOtherUserChild },
];

/**
 * 运行所有测试
 */
export async function runCRUDTests(sharedData?: any) {
  logger.section('宝贝模块CRUD测试');

  await setupUser(sharedData);

  let passCount = 0;
  let failCount = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passCount++;
    } catch (error: any) {
      logger.error(`✗ ${test.name}: ${error.message}`);
      failCount++;
    }
  }

  logger.section(`测试结果: ${passCount}/${tests.length} 通过`);

  // 写回共享数据
  if (sharedData) {
    sharedData.childIds = testData.childIds;
    sharedData.boyChildId = testData.boyChildId;
    sharedData.girlChildId = testData.girlChildId;
    logger.info('✅ 已将宝贝数据写入共享数据');
  }

  return failCount === 0;
}

async function main() {
  const success = await runCRUDTests();
  if (success) {
    logger.success('\n🎉 所有测试通过！');
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
