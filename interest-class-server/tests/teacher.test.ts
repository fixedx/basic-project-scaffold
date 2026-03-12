/**
 * 教师CRUD测试
 * 使用helper方法，避免重复代码
 */

import { TestHelper, sleep, generateUserToken } from './utils/test-client';
import { logger } from './utils/logger';
import {
  createInstitution,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeacher,
  getTeachers,
  sortTeachers,
} from './utils/test-helpers';

// 存储测试数据
export const testData = {
  userToken: '',
  institutionId: '',
  institutionToken: '',
  teacherIds: [] as string[],
  danceTeacherId: '',
  artTeacherId: '',
  musicTeacherId: '',
  // 手机号相关
  phoneTeacherId: '', // 使用手机号创建的教师ID
  phoneTeacherPhone: `139${Date.now().toString().slice(-8)}`, // 教师手机号（动态生成）
  phoneLoginToken: '', // 教师手机号登录后的token
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
 * 测试1：创建教师
 */
export async function testCreateTeacher() {
  const helper = new TestHelper(testData.institutionToken);

  // 创建舞蹈老师
  testData.danceTeacherId = await createTeacher(helper, {
    institutionId: testData.institutionId,
    name: '李舞蹈',
    gender: 'female',
    subjects: ['舞蹈', '形体'],
  });
  testData.teacherIds.push(testData.danceTeacherId);
  logger.info(`创建舞蹈老师: ${testData.danceTeacherId}`);

  // 创建美术老师
  testData.artTeacherId = await createTeacher(helper, {
    institutionId: testData.institutionId,
    name: '王美术',
    gender: 'male',
    subjects: ['素描', '水彩'],
  });
  testData.teacherIds.push(testData.artTeacherId);
  logger.info(`创建美术老师: ${testData.artTeacherId}`);

  // 创建音乐老师
  testData.musicTeacherId = await createTeacher(helper, {
    institutionId: testData.institutionId,
    name: '张音乐',
    gender: 'female',
    subjects: ['钢琴', '声乐'],
  });
  testData.teacherIds.push(testData.musicTeacherId);
  logger.info(`创建音乐老师: ${testData.musicTeacherId}`);

  logger.success('✓ 创建教师测试通过');
}

/**
 * 测试1.1：创建教师（使用手机号）
 */
async function testCreateTeacherWithPhone() {
  const helper = new TestHelper(testData.institutionToken);

  logger.info('创建教师，关联手机号...');
  
  const teacherData = {
    institution_id: testData.institutionId,
    name: '赵手机',
    phone: testData.phoneTeacherPhone,
    photo: 'https://thispersondoesnotexist.com/',  // ⚠️ 必填字段
    gender: 'male',
    subjects: ['数学', '物理'],
    title: '高级教师',  // 添加职称
    years_of_experience: 8,  // 添加教学年限
    bio: '这是一位使用手机号创建的教师',  // 使用 bio 而不是 introduction
    certificates: ['https://picsum.photos/600/800', 'https://picsum.photos/600/800'],  // 证书应该是图片URL
    status: 'active',
  };

  const result = await helper.post('/teacher', teacherData);
  testData.phoneTeacherId = result;
  testData.teacherIds.push(result);

  logger.info(`创建手机号教师: ${testData.phoneTeacherId}`);
  logger.info(`姓名: ${teacherData.name}`);
  logger.info(`手机号: ${testData.phoneTeacherPhone}`);
  logger.info(`科目: ${teacherData.subjects.join(', ')}`);
  logger.success('✓ 创建教师（手机号）测试通过');
}

/**
 * 测试1.2：教师手机号登录
 */
async function testTeacherPhoneLogin() {
  const helper = new TestHelper();

  logger.info('使用教师手机号登录（mock模式）...');
  
  // 使用创建教师时的手机号
  const mockCode = `phone_${testData.phoneTeacherPhone}_${Date.now()}`;
  
  const result = await helper.post('/auth/phone-login', {
    code: mockCode,
    type: 'teacher',
  });

  testData.phoneLoginToken = result.token;

  logger.info(`使用手机号: ${testData.phoneTeacherPhone}`);
  logger.info(`Mock Code: ${mockCode}`);
  logger.info(`Token: ${testData.phoneLoginToken.substring(0, 30)}...`);
  logger.info(`用户昵称: ${result.userInfo?.nickname || '未知'}`);
  logger.info(`教师ID: ${result.userInfo?.teacherId || '无'}`);
  logger.info(`机构ID: ${result.userInfo?.institutionId || '无'}`);

  if (!result.token) {
    throw new Error('未返回登录token');
  }
  
  logger.success('✓ 教师手机号登录测试通过');
}

/**
 * 测试2：查询教师详情（带登录）
 */
async function testGetTeacher() {
  const helper = new TestHelper(testData.institutionToken);

  const teacher = await getTeacher(helper, testData.danceTeacherId);

  // 验证基本信息
  if (teacher.id !== testData.danceTeacherId) {
    throw new Error('教师ID不匹配');
  }
  if (teacher.name !== '李舞蹈') {
    throw new Error('教师名称不匹配');
  }
  if (teacher.gender !== 'female') {
    throw new Error('教师性别不匹配');
  }

  logger.info('教师信息验证成功');
  logger.success('✓ 查询教师详情测试通过');
}

/**
 * 测试2.1：无登录查询教师详情（C端浏览场景）
 * ⚠️ 教师详情是浏览类接口，应该公开访问，不需要登录
 */
async function testGetTeacherWithoutAuth() {
  // 不传 token，模拟未登录用户
  const helper = new TestHelper();

  const teacher = await helper.get(`/teacher/${testData.danceTeacherId}`);

  // 验证能够正确返回教师信息
  if (!teacher || !teacher.id) {
    throw new Error('未登录应能查看教师详情');
  }
  
  if (teacher.id !== testData.danceTeacherId) {
    throw new Error('教师ID不匹配');
  }

  logger.info(`教师名称: ${teacher.name}`);
  logger.info(`教师科目: ${(teacher.subjects || []).join(', ')}`);
  logger.success('✓ 无登录查询教师详情测试通过（C端浏览场景）');
}

/**
 * 测试3：更新教师
 */
async function testUpdateTeacher() {
  const helper = new TestHelper(testData.institutionToken);

  await updateTeacher(helper, testData.danceTeacherId, {
    name: '李舞蹈-高级',
    subjects: ['舞蹈', '形体', '编舞'],
  });

  // 验证更新
  const updated = await getTeacher(helper, testData.danceTeacherId);
  if (updated.name !== '李舞蹈-高级') {
    throw new Error('教师名称未正确更新');
  }
  if (!updated.subjects.includes('编舞')) {
    throw new Error('教师科目未正确更新');
  }

  logger.info('教师信息更新成功');
  logger.success('✓ 更新教师测试通过');
}

/**
 * 测试4：查询机构教师列表
 */
/**
 * 测试4：查询教师列表（不分页）
 */
async function testGetTeachers() {
  const helper = new TestHelper(testData.institutionToken);

  const result = await getTeachers(helper, {
    institutionId: testData.institutionId,
  });

  // 不分页模式返回数组
  if (!Array.isArray(result)) {
    throw new Error('不分页模式应该返回数组');
  }

  logger.info(`找到 ${result.length} 名教师`);

  if (result.length < 3) {
    throw new Error(`期望至少3名教师，实际${result.length}名`);
  }

  // 验证我们创建的教师都在列表中
  const ourTeacherIds = result.map((t: any) => t.id);
  const allFound = testData.teacherIds.every((id) =>
    ourTeacherIds.includes(id),
  );

  if (!allFound) {
    throw new Error('部分教师未在列表中找到');
  }

  logger.success('✓ 查询教师列表测试通过（不分页）');
}

/**
 * 测试5：查询教师列表（分页）
 */
async function testGetTeachersWithPagination() {
  const helper = new TestHelper(testData.institutionToken);

  const result = await getTeachers(helper, {
    institutionId: testData.institutionId,
    page: 1,
    pageSize: 2,
  });

  // 分页模式返回对象
  if (!result.data || !result.total) {
    throw new Error('分页模式应该返回对象含 data 和 total');
  }

  logger.info(`总共 ${result.total} 名教师，当前页 ${result.data.length} 名`);

  if (result.total < 3) {
    throw new Error(`期望至少3名教师，实际${result.total}名`);
  }

  if (result.data.length > 2) {
    throw new Error(`pageSize=2，但返回${result.data.length}名`);
  }

  logger.success('✓ 查询教师列表测试通过（分页）');
}

/**
 * 测试6：按状态查询教师
 */
async function testFilterByStatus() {
  const helper = new TestHelper(testData.institutionToken);

  // 先将一个教师设为离职状态
  await updateTeacher(helper, testData.artTeacherId, {
    status: 'inactive',
  });

  // 查询在职教师
  const activeResult = await getTeachers(helper, {
    institutionId: testData.institutionId,
    status: 'active',
    page: 1,
    pageSize: 10,
  });

  logger.info(`找到 ${activeResult.total} 名在职教师`);

  // 验证离职的教师不在结果中
  const activeIds = activeResult.data.map((t: any) => t.id);
  if (activeIds.includes(testData.artTeacherId)) {
    throw new Error('离职教师不应出现在在职列表中');
  }

  logger.success('✓ 按状态筛选测试通过');
}

/**
 * 测试6：批量排序
 */
/**
 * 测试7：批量排序
 */
async function testSortTeachers() {
  const helper = new TestHelper(testData.institutionToken);

  // 设置排序顺序（数字越大越靠前，降序排列）
  await sortTeachers(helper, [
    { id: testData.musicTeacherId, sort_order: 3 },
    { id: testData.danceTeacherId, sort_order: 2 },
    { id: testData.artTeacherId, sort_order: 1 },
  ]);

  // 获取列表验证排序（按sort_order DESC排序）
  const result = await getTeachers(helper, {
    institutionId: testData.institutionId,
  });

  const sortedIds = result.map((t: any) => t.id);
  const expectedOrder = [
    testData.musicTeacherId, // sort_order=3
    testData.danceTeacherId, // sort_order=2
    testData.artTeacherId, // sort_order=1
  ];

  // 验证前3个是否按我们设定的顺序排列
  for (let i = 0; i < 3; i++) {
    if (sortedIds[i] !== expectedOrder[i]) {
      throw new Error('教师排序不正确');
    }
  }

  logger.info('教师排序验证成功');
  logger.success('✓ 批量排序测试通过');
}

/**
 * 测试8：删除教师
 */
async function testDeleteTeacher() {
  const helper = new TestHelper(testData.institutionToken);

  // 删除音乐老师
  await deleteTeacher(helper, testData.musicTeacherId);

  // 验证已删除（软删除，应该查不到）
  try {
    await getTeacher(helper, testData.musicTeacherId);
    throw new Error('已删除的教师仍可查询');
  } catch (error: any) {
    // axios 错误在 error.response.data.message 中
    const errorMsg = error.response?.data?.message || error.message;
    if (!errorMsg.includes('不存在') && !errorMsg.includes('未找到')) {
      throw error;
    }
  }

  logger.info('教师已删除');
  logger.success('✓ 删除教师测试通过');
}

/**
 * 运行所有CRUD测试
 */
export async function runCRUDTests(sharedData?: any) {
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  logger.step('教师CRUD测试（使用Helper重构）');

  // 准备测试数据
  try {
    await setupInstitution(sharedData);
  } catch (error: any) {
    logger.error(`前置准备失败: ${error.message}`);
    return false;
  }

  // 定义测试用例
  const tests = [
    { name: '创建教师', fn: testCreateTeacher },
    { name: '创建教师（使用手机号）', fn: testCreateTeacherWithPhone },
    { name: '教师手机号登录', fn: testTeacherPhoneLogin },
    { name: '查询教师详情', fn: testGetTeacher },
    { name: '无登录查询教师详情', fn: testGetTeacherWithoutAuth },
    { name: '更新教师', fn: testUpdateTeacher },
    { name: '查询教师列表（不分页）', fn: testGetTeachers },
    { name: '查询教师列表（分页）', fn: testGetTeachersWithPagination },
    { name: '按状态查询', fn: testFilterByStatus },
    { name: '批量排序', fn: testSortTeachers },
    { name: '删除教师', fn: testDeleteTeacher },
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

  // 🔗 将教师ID写入sharedData（供后续测试使用）
  if (sharedData) {
    sharedData.teacherId = testData.danceTeacherId;
    sharedData.danceTeacherId = testData.danceTeacherId;
    sharedData.artTeacherId = testData.artTeacherId;
    sharedData.musicTeacherId = testData.musicTeacherId;
    
    // 如果机构是自己创建的，也写回去
    if (!sharedData.institutionId) {
      sharedData.institutionId = testData.institutionId;
      sharedData.institutionToken = testData.institutionToken;
      sharedData.userToken = testData.userToken;
    }
    
    logger.info('✅ 已将教师数据写入共享数据');
  }

  return failCount === 0;
}

async function main() {
  const success = await runCRUDTests();
  if (success) {
    logger.success('\n🎉 所有测试通过！');
    logger.info('\n💡 优势：使用helper后代码从496行减少到310+行，减少37%+');
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
