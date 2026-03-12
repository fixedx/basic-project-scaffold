/**
 * 收藏模块CRUD测试
 */

import { TestHelper, generateUserToken } from './utils/test-client';
import { logger } from './utils/logger';

// 存储测试数据
export const testData = {
  userToken: '',
  userId: '',
  // 用于收藏的目标（使用共享数据或模拟ID）
  courseId: '',
  institutionId: '',
};

/**
 * 前置步骤：准备用户和测试目标
 */
export async function setup(sharedData?: any) {
  logger.section('前置准备：生成用户Token & 获取测试目标');

  // 使用共享数据或生成新Token
  if (sharedData?.userToken) {
    testData.userToken = sharedData.userToken;
    testData.userId = sharedData.userId || '260765341334900736';
    logger.info('📦 使用共享用户数据');
  } else {
    testData.userId = '260765341334900736';
    testData.userToken = generateUserToken(
      testData.userId,
      'test_openid_favorite',
      'test_favorite_user',
    );
    logger.info('✓ 生成新用户Token');
  }

  // 获取测试目标ID
  if (sharedData?.courseId) {
    testData.courseId = sharedData.courseId;
    logger.info(`📦 使用共享课程ID: ${testData.courseId}`);
  }
  if (sharedData?.institutionId) {
    testData.institutionId = sharedData.institutionId;
    logger.info(`📦 使用共享机构ID: ${testData.institutionId}`);
  }

  // 如果没有共享数据，尝试从API获取真实数据
  if (!testData.courseId || !testData.institutionId) {
    const helper = new TestHelper(testData.userToken);
    try {
      // 尝试获取课程列表
      if (!testData.courseId) {
        const courses = await helper.get<any>('/courses', { page: 1, pageSize: 1 });
        const courseList = courses?.data || courses;
        if (Array.isArray(courseList) && courseList.length > 0) {
          testData.courseId = courseList[0].id;
          logger.info(`✓ 从API获取课程ID: ${testData.courseId}`);
        }
      }
      // 尝试获取机构列表
      if (!testData.institutionId) {
        const institutions = await helper.get<any>('/institution/list', { page: 1, pageSize: 1 });
        const instList = institutions?.data || institutions;
        if (Array.isArray(instList) && instList.length > 0) {
          testData.institutionId = instList[0].id;
          logger.info(`✓ 从API获取机构ID: ${testData.institutionId}`);
        }
      }
    } catch (e: any) {
      logger.warn(`⚠ 获取测试目标失败: ${e.message}`);
    }
  }

  // 兜底：使用模拟ID
  if (!testData.courseId) {
    testData.courseId = 'test-course-fav-001';
    logger.info(`⚠ 使用模拟课程ID: ${testData.courseId}`);
  }
  if (!testData.institutionId) {
    testData.institutionId = 'test-inst-fav-001';
    logger.info(`⚠ 使用模拟机构ID: ${testData.institutionId}`);
  }

  // 清理可能遗留的测试收藏
  await cleanupFavorites();

  logger.success('✓ 前置准备完成\n');
}

/**
 * 清理测试用的收藏数据
 */
async function cleanupFavorites() {
  const helper = new TestHelper(testData.userToken);
  try {
    // 尝试取消收藏测试课程
    await helper.post('/favorite/toggle', {
      target_type: 'course',
      target_id: testData.courseId,
    });
  } catch {}
  try {
    // 尝试取消收藏测试机构
    await helper.post('/favorite/toggle', {
      target_type: 'institution',
      target_id: testData.institutionId,
    });
  } catch {}

  // 再检查一下状态，确保都是未收藏
  try {
    const courseCheck = await helper.get<{ isFavorited: boolean }>(
      `/favorite/check/course/${testData.courseId}`,
    );
    if (courseCheck.isFavorited) {
      // 再 toggle 一次取消
      await helper.post('/favorite/toggle', {
        target_type: 'course',
        target_id: testData.courseId,
      });
    }

    const instCheck = await helper.get<{ isFavorited: boolean }>(
      `/favorite/check/institution/${testData.institutionId}`,
    );
    if (instCheck.isFavorited) {
      await helper.post('/favorite/toggle', {
        target_type: 'institution',
        target_id: testData.institutionId,
      });
    }
  } catch {}

  logger.info('📦 清理测试收藏数据完成');
}

// ==================== 测试用例 ====================

/**
 * 测试1：收藏课程
 */
export async function testToggleFavoriteCourse() {
  const helper = new TestHelper(testData.userToken);

  const result = await helper.post<{ isFavorited: boolean }>('/favorite/toggle', {
    target_type: 'course',
    target_id: testData.courseId,
  });

  if (!result || result.isFavorited !== true) {
    throw new Error(`收藏课程失败，返回值: ${JSON.stringify(result)}`);
  }

  logger.info(`✓ 收藏课程成功，课程ID: ${testData.courseId}`);
  logger.success('✓ 收藏课程测试通过');
}

/**
 * 测试2：检查课程收藏状态
 */
export async function testCheckFavoriteCourse() {
  const helper = new TestHelper(testData.userToken);

  const result = await helper.get<{ isFavorited: boolean }>(
    `/favorite/check/course/${testData.courseId}`,
  );

  if (!result || result.isFavorited !== true) {
    throw new Error(`检查收藏状态失败，期望 true，返回值: ${JSON.stringify(result)}`);
  }

  logger.info(`✓ 课程收藏状态正确: isFavorited = true`);
  logger.success('✓ 检查课程收藏状态测试通过');
}

/**
 * 测试3：收藏机构
 */
export async function testToggleFavoriteInstitution() {
  const helper = new TestHelper(testData.userToken);

  const result = await helper.post<{ isFavorited: boolean }>('/favorite/toggle', {
    target_type: 'institution',
    target_id: testData.institutionId,
  });

  if (!result || result.isFavorited !== true) {
    throw new Error(`收藏机构失败，返回值: ${JSON.stringify(result)}`);
  }

  logger.info(`✓ 收藏机构成功，机构ID: ${testData.institutionId}`);
  logger.success('✓ 收藏机构测试通过');
}

/**
 * 测试4：查询我的收藏列表（全部）
 */
export async function testGetMyFavorites() {
  const helper = new TestHelper(testData.userToken);

  const result = await helper.get<any[]>('/favorite/my');

  if (!Array.isArray(result)) {
    throw new Error(`查询收藏列表失败，期望数组，返回值: ${JSON.stringify(result)}`);
  }

  if (result.length < 2) {
    throw new Error(`收藏列表数量不对，期望至少2个，实际: ${result.length}`);
  }

  // 验证列表中包含我们收藏的课程和机构
  const hasCourse = result.some(
    (f) => f.target_type === 'course' && f.target_id === testData.courseId,
  );
  const hasInstitution = result.some(
    (f) => f.target_type === 'institution' && f.target_id === testData.institutionId,
  );

  if (!hasCourse) {
    throw new Error('收藏列表中未找到课程收藏');
  }
  if (!hasInstitution) {
    throw new Error('收藏列表中未找到机构收藏');
  }

  logger.info(`✓ 查询收藏列表成功，共 ${result.length} 条`);
  logger.info(`  包含课程: ✓`);
  logger.info(`  包含机构: ✓`);
  logger.success('✓ 查询收藏列表测试通过');
}

/**
 * 测试5：按类型筛选收藏列表（课程）
 */
export async function testGetFavoritesByType() {
  const helper = new TestHelper(testData.userToken);

  const result = await helper.get<any[]>('/favorite/my', {
    target_type: 'course',
  });

  if (!Array.isArray(result)) {
    throw new Error(`按类型筛选收藏列表失败，返回值: ${JSON.stringify(result)}`);
  }

  // 验证返回的都是课程类型
  const allCourses = result.every((f) => f.target_type === 'course');
  if (!allCourses) {
    throw new Error('筛选结果中包含非课程类型的收藏');
  }

  logger.info(`✓ 按类型筛选收藏成功，课程收藏 ${result.length} 条`);
  logger.success('✓ 按类型筛选收藏测试通过');
}

/**
 * 测试6：分页查询收藏列表
 */
export async function testGetFavoritesWithPagination() {
  const helper = new TestHelper(testData.userToken);

  const result = await helper.get<any>('/favorite/my', {
    page: 1,
    pageSize: 10,
  });

  if (!result || !result.data || typeof result.total !== 'number') {
    throw new Error(`分页查询收藏列表失败，返回值: ${JSON.stringify(result)}`);
  }

  if (result.total < 2) {
    throw new Error(`分页总数不对，期望至少2个，实际: ${result.total}`);
  }

  logger.info(`✓ 分页查询收藏成功，总数: ${result.total}，当前页: ${result.data.length} 条`);
  logger.info(`  page: ${result.page}, pageSize: ${result.pageSize}, totalPages: ${result.totalPages}`);
  logger.success('✓ 分页查询收藏测试通过');
}

/**
 * 测试7：获取收藏数量
 */
export async function testGetFavoriteCount() {
  const helper = new TestHelper(testData.userToken);

  const count = await helper.get<number>('/favorite/count');

  if (typeof count !== 'number' || count < 2) {
    throw new Error(`获取收藏数量失败，期望至少2，返回值: ${JSON.stringify(count)}`);
  }

  logger.info(`✓ 收藏总数: ${count}`);
  logger.success('✓ 获取收藏数量测试通过');
}

/**
 * 测试8：按类型获取收藏数量
 */
export async function testGetFavoriteCountByType() {
  const helper = new TestHelper(testData.userToken);

  const courseCount = await helper.get<number>('/favorite/count', {
    target_type: 'course',
  });
  const instCount = await helper.get<number>('/favorite/count', {
    target_type: 'institution',
  });

  if (typeof courseCount !== 'number' || courseCount < 1) {
    throw new Error(`课程收藏数量错误，期望至少1，实际: ${courseCount}`);
  }
  if (typeof instCount !== 'number' || instCount < 1) {
    throw new Error(`机构收藏数量错误，期望至少1，实际: ${instCount}`);
  }

  logger.info(`✓ 课程收藏数: ${courseCount}`);
  logger.info(`✓ 机构收藏数: ${instCount}`);
  logger.success('✓ 按类型获取收藏数量测试通过');
}

/**
 * 测试9：批量检查收藏状态
 */
export async function testCheckFavoritesBatch() {
  const helper = new TestHelper(testData.userToken);

  const fakeId = 'non-existent-id-12345';
  const result = await helper.post<Record<string, boolean>>('/favorite/check-batch', {
    target_type: 'course',
    target_ids: [testData.courseId, fakeId],
  });

  if (!result || typeof result !== 'object') {
    throw new Error(`批量检查收藏状态失败，返回值: ${JSON.stringify(result)}`);
  }

  if (result[testData.courseId] !== true) {
    throw new Error(
      `已收藏课程状态错误，期望 true，实际: ${result[testData.courseId]}`,
    );
  }
  if (result[fakeId] !== false) {
    throw new Error(
      `未收藏课程状态错误，期望 false，实际: ${result[fakeId]}`,
    );
  }

  logger.info(`✓ 批量检查结果:`);
  logger.info(`  ${testData.courseId}: ${result[testData.courseId]} (已收藏)`);
  logger.info(`  ${fakeId}: ${result[fakeId]} (未收藏)`);
  logger.success('✓ 批量检查收藏状态测试通过');
}

/**
 * 测试10：取消收藏课程
 */
export async function testUnfavoriteCourse() {
  const helper = new TestHelper(testData.userToken);

  // 取消收藏
  const result = await helper.post<{ isFavorited: boolean }>('/favorite/toggle', {
    target_type: 'course',
    target_id: testData.courseId,
  });

  if (!result || result.isFavorited !== false) {
    throw new Error(`取消收藏课程失败，返回值: ${JSON.stringify(result)}`);
  }

  // 验证取消后状态
  const check = await helper.get<{ isFavorited: boolean }>(
    `/favorite/check/course/${testData.courseId}`,
  );
  if (check.isFavorited !== false) {
    throw new Error(`取消后收藏状态仍为 true`);
  }

  logger.info(`✓ 取消收藏课程成功`);
  logger.info(`  取消后状态: isFavorited = false`);
  logger.success('✓ 取消收藏课程测试通过');
}

/**
 * 测试11：取消收藏后数量减少
 */
export async function testCountAfterUnfavorite() {
  const helper = new TestHelper(testData.userToken);

  const courseCount = await helper.get<number>('/favorite/count', {
    target_type: 'course',
  });

  // 取消收藏课程后，课程收藏数应该为0（测试中只收藏了1个）
  if (courseCount !== 0) {
    throw new Error(`取消收藏后课程数量错误，期望 0，实际: ${courseCount}`);
  }

  // 机构收藏还在
  const instCount = await helper.get<number>('/favorite/count', {
    target_type: 'institution',
  });
  if (instCount < 1) {
    throw new Error(`机构收藏数量不应减少，期望至少1，实际: ${instCount}`);
  }

  logger.info(`✓ 取消收藏后课程收藏数: ${courseCount}`);
  logger.info(`✓ 机构收藏数不受影响: ${instCount}`);
  logger.success('✓ 取消收藏后数量验证测试通过');
}

/**
 * 测试12：重新收藏课程（验证取消后可再次收藏）
 */
export async function testReFavoriteCourse() {
  const helper = new TestHelper(testData.userToken);

  // 重新收藏
  const result = await helper.post<{ isFavorited: boolean }>('/favorite/toggle', {
    target_type: 'course',
    target_id: testData.courseId,
  });

  if (!result || result.isFavorited !== true) {
    throw new Error(`重新收藏课程失败，返回值: ${JSON.stringify(result)}`);
  }

  // 验证状态
  const check = await helper.get<{ isFavorited: boolean }>(
    `/favorite/check/course/${testData.courseId}`,
  );
  if (check.isFavorited !== true) {
    throw new Error('重新收藏后状态不正确');
  }

  logger.info(`✓ 重新收藏课程成功`);
  logger.success('✓ 重新收藏课程测试通过');
}

/**
 * 测试13：其他用户无法看到我的收藏
 */
export async function testOtherUserCannotSeeMyFavorites() {
  const otherToken = generateUserToken(
    '999999999999999999',
    'other_openid_fav',
    'other_fav_user',
  );
  const helper = new TestHelper(otherToken);

  const result = await helper.get<any[]>('/favorite/my');

  if (!Array.isArray(result)) {
    throw new Error(`查询失败，返回值: ${JSON.stringify(result)}`);
  }

  // 其他用户的列表不应包含我们的收藏
  const hasOurCourse = result.some(
    (f) => f.target_id === testData.courseId && f.user_id === testData.userId,
  );
  if (hasOurCourse) {
    throw new Error('其他用户不应能看到我的收藏');
  }

  logger.info(`✓ 其他用户收藏列表: ${result.length} 条（不包含我的数据）`);
  logger.success('✓ 其他用户无法看到我的收藏测试通过');
}

/**
 * 测试14：清理 - 取消所有测试收藏
 */
export async function testCleanup() {
  const helper = new TestHelper(testData.userToken);

  // 取消收藏课程
  try {
    const courseCheck = await helper.get<{ isFavorited: boolean }>(
      `/favorite/check/course/${testData.courseId}`,
    );
    if (courseCheck.isFavorited) {
      await helper.post('/favorite/toggle', {
        target_type: 'course',
        target_id: testData.courseId,
      });
    }
  } catch {}

  // 取消收藏机构
  try {
    const instCheck = await helper.get<{ isFavorited: boolean }>(
      `/favorite/check/institution/${testData.institutionId}`,
    );
    if (instCheck.isFavorited) {
      await helper.post('/favorite/toggle', {
        target_type: 'institution',
        target_id: testData.institutionId,
      });
    }
  } catch {}

  // 验证清理结果
  const count = await helper.get<number>('/favorite/count');
  logger.info(`✓ 清理完成，剩余收藏数: ${count}`);
  logger.success('✓ 清理测试数据完成');
}

// ==================== 测试列表 ====================
const tests = [
  { name: '收藏课程', fn: testToggleFavoriteCourse },
  { name: '检查课程收藏状态', fn: testCheckFavoriteCourse },
  { name: '收藏机构', fn: testToggleFavoriteInstitution },
  { name: '查询我的收藏列表', fn: testGetMyFavorites },
  { name: '按类型筛选收藏', fn: testGetFavoritesByType },
  { name: '分页查询收藏', fn: testGetFavoritesWithPagination },
  { name: '获取收藏数量', fn: testGetFavoriteCount },
  { name: '按类型获取收藏数量', fn: testGetFavoriteCountByType },
  { name: '批量检查收藏状态', fn: testCheckFavoritesBatch },
  { name: '取消收藏课程', fn: testUnfavoriteCourse },
  { name: '取消后数量验证', fn: testCountAfterUnfavorite },
  { name: '重新收藏课程', fn: testReFavoriteCourse },
  { name: '其他用户隔离验证', fn: testOtherUserCannotSeeMyFavorites },
  { name: '清理测试数据', fn: testCleanup },
];

/**
 * 运行所有测试
 */
export async function runCRUDTests(sharedData?: any) {
  logger.section('收藏模块CRUD测试');

  await setup(sharedData);

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

  logger.section(`收藏模块测试结果: ${passCount}/${tests.length} 通过`);

  return failCount === 0;
}

async function main() {
  const success = await runCRUDTests();
  if (success) {
    logger.success('\n🎉 收藏模块所有测试通过！');
  } else {
    logger.error('\n❌ 收藏模块部分测试失败');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    logger.error(`执行出错: ${error.message}`);
    process.exit(1);
  });
}
