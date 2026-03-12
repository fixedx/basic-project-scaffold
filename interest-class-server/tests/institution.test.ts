/**
 * 机构CRUD测试
 * 测试机构的创建、查询、更新、删除操作
 */

import {
  TestHelper,
  sleep,
  generateUserToken,
} from './utils/test-client';
import { logger } from './utils/logger';
import { TestInstitution, TestUsers, UniqueId } from './utils/test-data';

// 存储测试数据
export const testData = {
  userToken: '', // 用户token（用于创建机构）
  adminToken: '', // 机构管理员token（用于机构操作）
  institutionId: '',
  adminPhone: '', // 管理员手机号
  // 手机号登录相关
  phoneInstitutionId: '', // 手机号方式创建的机构ID
  phoneLoginToken: '', // 手机号登录后的token
  phoneAccounts: [ // 手机号账号列表（生成唯一手机号避免冲突）
    { phone: UniqueId.phone(), real_name: '张三', role: 'owner' },
    { phone: UniqueId.phone(), real_name: '李四', role: 'admin' },
  ],
};

/**
 * 运行所有CRUD测试
 * @param sharedData 共享测试数据（可选）
 */
export async function runCRUDTests(sharedData?: any) {
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  // 生成用户token（使用真实数据库用户）
  testData.userToken = generateUserToken(
    '260765341334900736', // 真实用户ID
    'oY4kG7pd0giF9yhYFRtVHXbYT7CE', // 真实openid
    '测试用户',
  );
  logger.info(`用户Token已生成: ${testData.userToken.substring(0, 30)}...`);

  const tests = [
    { name: '创建机构（艺术类）', fn: testCreateInstitution },
    { name: '机构用户登录', fn: testInstitutionUserLogin },
    { name: '机构入驻（手机号批量添加）', fn: testCreateInstitutionWithPhones },
    { name: '机构手机号登录', fn: testInstitutionPhoneLogin },
    { name: '查询草稿状态机构列表', fn: testListPendingInstitutions },
    { name: '查询已审核机构列表', fn: testListApprovedInstitutions },
    { name: '查询所有机构列表', fn: testListAllInstitutions },
    { name: '查询机构详情', fn: testGetInstitution },
    { name: '机构用户修改机构信息', fn: testInstitutionUserUpdate },
    { name: '测试敏感字段修改限制', fn: testSensitiveFieldsRestriction },
    { name: '查询我的机构', fn: testMyInstitutions },
    { name: '添加机构账号', fn: testAddAccount },
    { name: '更新机构状态', fn: testUpdateStatus },
    { name: '批量创建机构', fn: testBatchCreateInstitutions },
    { name: '并发创建机构测试', fn: testConcurrentCreateInstitutions },
    // 位置搜索相关测试
    { name: '查询附近机构', fn: testNearbyInstitutions },
    { name: '按区域搜索机构', fn: testSearchByArea },
    { name: '机构列表计算距离', fn: testInstitutionListWithDistance },
    { name: '机构距离筛选（maxDistance）', fn: testInstitutionDistanceFilter },
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
    title: '机构CRUD测试总结',
    total: tests.length,
    success: successCount,
    fail: failCount,
    duration,
  });

  logger.data('测试数据', testData);

  // 🔗 将关键ID写入sharedData（供后续测试使用）
  if (sharedData) {
    sharedData.institutionId = testData.institutionId;
    sharedData.institutionToken = testData.adminToken;
    sharedData.institutionPhone = testData.adminPhone;
    sharedData.userToken = testData.userToken;
    logger.info('✅ 已将机构数据写入共享数据');
  }

  return failCount === 0;
}

/**
 * 测试1: 创建机构（艺术类）- 无需登录
 */
export async function testCreateInstitution() {
  // 无需token，机构入驻不需要登录
  const helper = new TestHelper();

  // 创建管理员账号（使用手机号）
  const admin = TestUsers.institutionAdmin();
  testData.adminPhone = admin.phone;

  // 创建机构（艺术类）- 使用完整测试数据
  const institutionData = TestInstitution.art();
  
  const data = {
    accounts: [admin],
    ...institutionData,  // 使用完整字段（包括 id_card_imgs, bank_name, bank_account, account_holder, tags, latitude, longitude）
    // 机构展示内容（教师在机构创建后单独添加，不在入驻时填写）
    honors: [
      {
        title: '2024年度优秀培训机构',
        img_url: 'https://cdn.example.com/certificates/honor1.jpg',
        honor_date: '2024-12-01',
        sort_order: 1,
      },
      {
        title: '教学质量金奖',
        img_url: 'https://cdn.example.com/certificates/honor2.jpg',
        honor_date: '2024-06-15',
        sort_order: 2,
      },
      {
        title: '全国教育示范机构',
        img_url: 'https://cdn.example.com/certificates/honor3.jpg',
        honor_date: '2024-03-20',
        sort_order: 3,
      },
    ],
    showcases: [
      // 学员作品
      {
        title: '学员钢琴演奏',
        img_url: 'https://cdn.example.com/showcases/student1.jpg',
        type: 'student_work',
        description: '学员在音乐会上的精彩表演',
        sort_order: 1,
      },
      {
        title: '学员绘画作品',
        img_url: 'https://cdn.example.com/showcases/student2.jpg',
        type: 'student_work',
        description: '优秀的学员美术作品展示',
        sort_order: 2,
      },
      {
        title: '舞蹈汇演',
        img_url: 'https://cdn.example.com/showcases/student3.jpg',
        type: 'student_work',
        description: '学员年度舞蹈汇演',
        sort_order: 3,
      },
      // 活动照片
      {
        title: '年度音乐会',
        img_url: 'https://cdn.example.com/showcases/activity1.jpg',
        type: 'activity',
        description: '2024年度音乐会精彩瞬间',
        sort_order: 4,
      },
      {
        title: '春游活动',
        img_url: 'https://cdn.example.com/showcases/activity2.jpg',
        type: 'activity',
        description: '师生春游活动合影',
        sort_order: 5,
      },
      {
        title: '家长会',
        img_url: 'https://cdn.example.com/showcases/activity3.jpg',
        type: 'activity',
        description: '定期举办家长交流会',
        sort_order: 6,
      },
    ],
    // 教学环境
    teaching_environments: [
      {
        title: '舞蹈教室',
        img_url: 'https://cdn.example.com/showcases/classroom1.jpg',
        description: '200平米专业舞蹈教室，配备全身镜和专业把杆',
        sort_order: 1,
      },
      {
        title: '钢琴房',
        img_url: 'https://cdn.example.com/showcases/classroom2.jpg',
        description: '配备三角钢琴和多台立式钢琴，音质优良',
        sort_order: 2,
      },
      {
        title: '美术画室',
        img_url: 'https://cdn.example.com/showcases/classroom3.jpg',
        description: '充足的采光，专业的画架和画材',
        sort_order: 3,
      },
      {
        title: '休息区',
        img_url: 'https://cdn.example.com/showcases/classroom4.jpg',
        description: '家长等候区，提供WiFi和饮水',
        sort_order: 4,
      },
    ],
  };

  const result = await helper.post('/institution', data);
  testData.institutionId = result;

  logger.info(`机构ID: ${testData.institutionId}`);
  logger.info(`机构名称: ${data.name}`);
  logger.info(`管理员手机号: ${admin.phone}`);

  // 验证返回数据
  if (!result) {
    throw new Error('未返回机构ID');
  }
  
  // ✓ 机构创建成功，无需查询详情验证（详情查询需要登录，会在后续测试中验证）
}

/**
 * 测试2: 机构用户登录（手机号登录）
 */
async function testInstitutionUserLogin() {
  const helper = new TestHelper();

  // 使用创建机构时的手机号来计算 mock code
  // mock 逻辑会根据 code 生成手机号，所以需要反推 code
  // 简化：直接使用手机号作为 code 的一部分
  const mockCode = `phone_${testData.adminPhone}_${Date.now()}`;
  
  const result = await helper.post('/auth/phone-login', {
    code: mockCode,
    type: 'institution',
  });

  testData.adminToken = result.token;

  logger.info(`使用手机号: ${testData.adminPhone}`);
  logger.info(`Mock Code: ${mockCode}`);
  logger.info(`Token: ${testData.adminToken.substring(0, 30)}...`);

  if (!result.token) {
    throw new Error('未返回登录token');
  }
  
  logger.info('✓ 机构用户登录成功');
}

/**
 * 测试2.1: 机构入驻（手机号批量添加）
 */
async function testCreateInstitutionWithPhones() {
  const helper = new TestHelper(); // 无需认证

  // 生成新的手机号账号列表（添加延迟确保唯一性）
  const freshPhoneAccounts = [
    { phone: UniqueId.phone(), real_name: '张三', role: 'owner' },
  ];
  await new Promise(resolve => setTimeout(resolve, 2)); // 2毫秒延迟
  freshPhoneAccounts.push({ phone: UniqueId.phone(), real_name: '李四', role: 'admin' });
  
  testData.phoneAccounts = freshPhoneAccounts; // 更新到testData

  const institutionData = TestInstitution.art();
  
  const data = {
    ...institutionData,  // 使用完整字段
    // 覆盖部分字段
    accounts: freshPhoneAccounts,
    name: `${institutionData.name}_手机号_${Date.now()}`,
    license_no: `${institutionData.license_no}PHONE`,
    // 机构展示内容（教师在机构创建后单独添加，不在入驻时填写）
    honors: [
      {
        title: '最佳体育培训机构',
        img_url: 'https://cdn.example.com/certificates/honor3.jpg',
        honor_date: '2024-11-20',
        sort_order: 1,
      },
    ],
    teaching_environments: [
      {
        title: '篮球场',
        img_url: 'https://cdn.example.com/showcases/basketball.jpg',
        description: '标准室内篮球场',
        sort_order: 1,
      },
    ],
    showcases: [],
  };

  const result = await helper.post('/institution', data);
  testData.phoneInstitutionId = result;

  logger.info(`机构ID: ${testData.phoneInstitutionId}`);
  logger.info(`机构名称: ${data.name}`);
  logger.info(`添加了 ${testData.phoneAccounts.length} 个手机号账号:`);
  testData.phoneAccounts.forEach((account, index) => {
    logger.info(`  ${index + 1}. ${account.real_name} (${account.phone}) [${account.role}]`);
  });

  // 验证返回数据
  if (!result) {
    throw new Error('未返回机构ID');
  }
}

/**
 * 测试2.2: 机构手机号登录
 */
async function testInstitutionPhoneLogin() {
  const helper = new TestHelper();

  // 使用第一个账号的手机号进行登录
  const phoneAccount = testData.phoneAccounts[0];
  const mockCode = `phone_${phoneAccount.phone}_${Date.now()}`;
  
  const result = await helper.post('/auth/phone-login', {
    code: mockCode,
    type: 'institution',
  });

  testData.phoneLoginToken = result.token;

  logger.info(`使用手机号: ${phoneAccount.phone}`);
  logger.info(`Mock Code: ${mockCode}`);
  logger.info(`Token: ${testData.phoneLoginToken.substring(0, 30)}...`);
  logger.info(`用户昵称: ${result.userInfo?.nickname || '未知'}`);
  logger.info(`机构ID: ${result.userInfo?.institutionId || '无'}`);

  if (!result.token) {
    throw new Error('未返回登录token');
  }
  
  logger.info('✓ 机构手机号登录成功');
}

/**
 * 测试3: 查询草稿状态机构列表
 */
async function testListPendingInstitutions() {
  const helper = new TestHelper(testData.userToken);

  const result = await helper.get('/institution/list', {
    page: 1,
    pageSize: 10,
    status: 'draft', // 默认状态是 draft，不是 pending
  });

  logger.info(`查询到 ${result.total} 个草稿状态机构，当前页 ${result.data.length} 条`);

  // 验证是否包含刚创建的机构
  const myInstitution = result.data.find(
    (inst: any) => inst.id === testData.institutionId,
  );
  if (!myInstitution) {
    throw new Error('未找到刚创建的草稿机构');
  }

  logger.info(`✓ 找到草稿机构: ${myInstitution.name}`);
}

/**
 * 测试4: 查询已审核机构列表
 */
async function testListApprovedInstitutions() {
  const helper = new TestHelper(testData.userToken);

  const result = await helper.get('/institution/list', {
    page: 1,
    pageSize: 10,
    status: 'approved',
  });

  logger.info(`查询到 ${result.total} 个已审核通过的机构，当前页 ${result.data.length} 条`);

  // 刚创建的机构是草稿状态，不应该在已审核列表中
  const myInstitution = result.data.find(
    (inst: any) => inst.id === testData.institutionId,
  );
  if (myInstitution) {
    throw new Error('草稿状态的机构不应该出现在已审核列表中');
  }

  logger.info('✓ 已审核列表正确，不包含草稿状态的机构');
}

/**
 * 测试5: 查询所有机构列表（不带status参数）
 */
async function testListAllInstitutions() {
  const helper = new TestHelper(testData.userToken);

  const result = await helper.get('/institution/list', {
    page: 1,
    pageSize: 10,
  });

  logger.info(`查询到 ${result.total} 个机构（所有状态），当前页 ${result.data.length} 条`);

  // 应该能找到刚创建的机构
  const myInstitution = result.data.find(
    (inst: any) => inst.id === testData.institutionId,
  );
  if (!myInstitution) {
    throw new Error('未在全部列表中找到刚创建的机构');
  }

  logger.info(`✓ 在全部列表中找到机构: ${myInstitution.name}`);
}

/**
 * 测试6: 查询机构详情
 */
async function testGetInstitution() {
  const helper = new TestHelper(testData.userToken);

  const result = await helper.get(`/institution/${testData.institutionId}`);

  logger.info(`机构ID: ${result.id}`);
  logger.info(`机构名称: ${result.name}`);
  logger.info(`简介: ${result.introduction}`);
  logger.info(`营业执照号: ${result.license_no}`);
  logger.info(`营业执照图: ${result.license_img}`);
  logger.info(`法人: ${result.legal_person}`);
  logger.info(`联系电话: ${result.contact_phone}`);
  logger.info(`省市区: ${result.province} ${result.city} ${result.district}`);
  logger.info(`详细地址: ${result.address}`);
  logger.info(`营业时间: ${result.business_start_time || '未设置'} - ${result.business_end_time || '未设置'}`);
  logger.info(`审核状态: ${result.audit_status}`);

  // 验证所有必填字段
  const requiredFields = [
    'id', 'name', 'introduction', 'license_no', 'license_img',
    'legal_person', 'contact_phone', 'province', 'city', 
    'district', 'address', 'audit_status'
  ];

  for (const field of requiredFields) {
    if (!result[field]) {
      throw new Error(`缺少必填字段: ${field}`);
    }
  }

  // 验证 ID 匹配
  if (result.id !== testData.institutionId) {
    throw new Error('机构ID不匹配');
  }
  
  // 验证审核状态
  if (result.audit_status !== 'draft') {
    throw new Error('审核状态应该是draft');
  }

  // 验证 created_by 字段（应该是 owner 的 user_id）
  if (!result.created_by) {
    throw new Error('缺少 created_by 字段');
  }
  logger.info(`创建者ID (created_by): ${result.created_by}`);

  // 验证 showcases 字段（学员风采，不再包含教学环境）
  if (!Array.isArray(result.showcases)) {
    throw new Error('showcases 应该是数组');
  }
  logger.info(`学员风采数量: ${result.showcases.length}`);
  if (result.showcases.length > 0) {
    const showcase = result.showcases[0];
    logger.info(`  风采示例: ${showcase.title} (${showcase.type})`);
    if (!showcase.img_url || !showcase.type) {
      throw new Error('showcase 字段不完整');
    }
    // 确保没有 classroom 类型
    const hasClassroom = result.showcases.some((s: any) => s.type === 'classroom');
    if (hasClassroom) {
      throw new Error('showcases 不应包含 classroom 类型，教学环境应在 teaching_environments 中');
    }
  }

  // 验证 teaching_environments 字段
  if (!Array.isArray(result.teaching_environments)) {
    throw new Error('teaching_environments 应该是数组');
  }
  logger.info(`教学环境数量: ${result.teaching_environments.length}`);
  if (result.teaching_environments.length > 0) {
    const env = result.teaching_environments[0];
    logger.info(`  教学环境示例: ${env.title}`);
    if (!env.img_url) {
      throw new Error('teaching_environment 字段不完整');
    }
  }

  // 验证 honors 字段
  if (!Array.isArray(result.honors)) {
    throw new Error('honors 应该是数组');
  }
  logger.info(`机构荣誉数量: ${result.honors.length}`);
  if (result.honors.length > 0) {
    const honor = result.honors[0];
    logger.info(`  荣誉示例: ${honor.title}`);
    if (!honor.title || !honor.img_url) {
      throw new Error('honor 字段不完整');
    }
  }

  logger.info('✓ 所有字段验证通过（包括 created_by、showcases、honors）');
}

/**
 * 测试7: 机构用户修改机构信息（普通字段）
 */
async function testInstitutionUserUpdate() {
  const helper = new TestHelper(testData.adminToken);

  const updateData = {
    introduction: '【机构用户已更新】' + TestInstitution.art().introduction,
    contact_phone: UniqueId.phone(),
  };

  await helper.put(
    `/institution/${testData.institutionId}`,
    updateData,
  );

  logger.info('✓ 机构用户修改成功');

  // 重新查询验证更新
  const updated = await helper.get(`/institution/${testData.institutionId}`);
  
  logger.info(`更新后的简介: ${updated.introduction?.substring(0, 50)}...`);
  logger.info(`更新后的联系电话: ${updated.contact_phone}`);

  if (!updated.introduction?.includes('【机构用户已更新】')) {
    throw new Error('简介未更新');
  }
  if (updated.contact_phone !== updateData.contact_phone) {
    throw new Error('联系电话未更新');
  }
}

/**
 * 测试8: 测试敏感字段修改限制
 */
async function testSensitiveFieldsRestriction() {
  const helper = new TestHelper(testData.adminToken);

  // 测试1：草稿状态可以修改敏感字段
  logger.info('测试1: 草稿状态修改敏感字段');
  const updateSensitive1 = {
    license_no: '新营业执照号_' + UniqueId.timestamp(),
    introduction: '可以同时修改普通字段',
  };

  try {
    await helper.put(
      `/institution/${testData.institutionId}`,
      updateSensitive1,
    );
    logger.info('✓ 草稿状态允许修改敏感字段');
  } catch (error: any) {
    if (error.message.includes('不允许修改')) {
      throw new Error('草稿状态应该允许修改敏感字段');
    }
    throw error;
  }

  // 测试2：已审核通过状态不能修改敏感字段
  logger.info('测试2: 已审核通过状态不能修改敏感字段（需要先审核通过）');
  logger.info('⚠ 此测试需要手动审核通过机构后再测试');
}

/**
 * 测试9: 查询我的机构
 */
async function testMyInstitutions() {
  const helper = new TestHelper(testData.adminToken);

  const result = await helper.get('/auth/my-institutions');

  logger.info(`我管理的机构数量: ${result.length}`);

  const myInstitution = result.find(
    (inst: any) => inst.id === testData.institutionId,
  );
  if (!myInstitution) {
    throw new Error('未找到当前机构');
  }

  logger.info(`机构名称: ${myInstitution.name}`);
  logger.info(`我的角色: ${myInstitution.role}`);
}

/**
 * 测试10: 添加机构账号
 */
async function testAddAccount() {
  const helper = new TestHelper(testData.adminToken);

  const newAccount = TestUsers.institutionStaff();
  const result = await helper.post(`/institution/${testData.institutionId}/accounts`, {
    ...newAccount,
    role: 'staff',
  });
  
  if (!result) {
    throw new Error('添加账号失败：未返回结果');
  }
  
  logger.info('✓ 添加账号成功');
}

/**
 * 测试11: 更新机构状态
 */
async function testUpdateStatus() {
  const helper = new TestHelper(testData.adminToken);

  const result = await helper.put(`/institution/${testData.institutionId}/status`, {
    status: 'active',
  });
  
  if (!result) {
    throw new Error('更新状态失败：未返回结果');
  }
  
  // 验证状态确实更新了
  const updated = await helper.get(`/institution/${testData.institutionId}`);
  if (updated.is_active !== true) {
    throw new Error('状态更新失败：is_active应为true');
  }
  
  logger.info('✓ 更新状态成功');
}

/**
 * Test 12: Batch create institutions
 */
async function testBatchCreateInstitutions() {
  const helper = new TestHelper(testData.userToken);

  const batchSize = 3;
  const createdIds: string[] = [];

  logger.info(`准备批量创建 ${batchSize} 个机构...`);

  for (let i = 0; i < batchSize; i++) {
    const admin = TestUsers.institutionAdmin();
    const institutionData = TestInstitution.art();
    
    const data = {
      ...institutionData,  // 使用完整字段
      accounts: [admin],
      name: `${institutionData.name}_批量${i + 1}`,
      license_no: `${institutionData.license_no}${i}`,
    };

    const response = await helper.post('/institution', data);
    createdIds.push(response);  // 直接是ID字符串
    
    logger.info(`✓ 机构${i + 1}创建成功: ${response}`);
    await sleep(100);
  }

  // 验证批量创建的机构
  const listResponse = await helper.get('/institution/list');
  const createdInstitutions = Array.isArray(listResponse)
    ? listResponse.filter((inst: any) => createdIds.includes(inst.id))
    : listResponse.data.filter((inst: any) => createdIds.includes(inst.id));

  if (createdInstitutions.length !== batchSize) {
    throw new Error(`批量创建验证失败：期望 ${batchSize} 个，实际 ${createdInstitutions.length} 个`);
  }

  logger.data('批量创建结果', {
    total: batchSize,
    created: createdIds.length,
    verified: createdInstitutions.length,
  });

  // 验证权限控制：尝试用非owner账号删除机构（应该被拒绝）
  logger.info('验证删除权限控制...');
  const cleanupHelper = new TestHelper(testData.userToken);
  for (const id of createdIds) {
    try {
      await cleanupHelper.delete(`/institution/${id}`);
      throw new Error('权限控制失败：非owner账号不应能删除机构');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      if (message.includes('只有机构所有者可以删除') || message.includes('无权限')) {
        logger.info(`✓ 权限控制正确：${id} 拒绝非owner删除`);
      } else {
        throw error; // 其他错误需要抛出
      }
    }
  }
  
  logger.info(`✓ 批量创建的 ${batchSize} 个机构权限验证通过`);
}

/**
 * Test 13: Concurrent create institutions
 */
async function testConcurrentCreateInstitutions() {
  const helper = new TestHelper(testData.userToken);

  const concurrentCount = 5;
  logger.info(`准备并发创建 ${concurrentCount} 个机构...`);

  // 预先生成所有测试数据（添加微小延迟确保时间戳不同）
  const testDataList: any[] = [];
  for (let i = 0; i < concurrentCount; i++) {
    const admin = TestUsers.institutionAdmin();
    const institutionData = TestInstitution.art();
    
    testDataList.push({
      ...institutionData,  // 使用完整字段
      accounts: [admin],
      name: `${institutionData.name}_并发${i + 1}`,
      license_no: `${institutionData.license_no}${i}00`,
    });
    
    // 添加1毫秒延迟，确保Date.now()不同
    await new Promise(resolve => setTimeout(resolve, 1));
  }

  // 创建并发请求
  const createPromises = testDataList.map((data) => {
    return helper.post('/institution', data).catch(error => ({
      error: true,
      message: error.message,
      status: error.response?.status,
    }));
  });

  // 等待所有请求完成
  const startTime = Date.now();
  const results = await Promise.all(createPromises);
  const duration = Date.now() - startTime;

  // 统计结果
  const successResults = results.filter((r: any) => !r.error);
  const failResults = results.filter((r: any) => r.error);

  logger.data('并发创建结果', {
    total: concurrentCount,
    success: successResults.length,
    fail: failResults.length,
    duration: `${duration}ms`,
    avgTime: `${(duration / concurrentCount).toFixed(0)}ms/个`,
  });

  if (failResults.length > 0) {
    logger.warn(`部分并发请求失败: ${JSON.stringify(failResults)}`);
  }

  // 验证所有成功创建的机构ID是否唯一
  const successIds = successResults.map((r: any) => r);  // 直接返回ID字符串，不是对象
  const uniqueIds = new Set(successIds);
  
  if (uniqueIds.size !== successIds.length) {
    throw new Error('并发创建产生了重复ID！');
  }

  logger.info(`✓ ID唯一性验证通过: ${successIds.length} 个唯一ID`);

  // 验证权限控制：尝试用非owner账号删除机构（应该被拒绝）
  logger.info('验证并发创建机构的权限控制...');
  const cleanupHelper = new TestHelper(testData.userToken);
  let permissionCheckPassed = 0;
  for (const id of successIds) {
    try {
      await cleanupHelper.delete(`/institution/${id}`);
      throw new Error('权限控制失败：非owner账号不应能删除机构');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      if (message.includes('只有机构所有者可以删除') || message.includes('无权限')) {
        permissionCheckPassed++;
      } else {
        throw error; // 其他错误需要抛出
      }
    }
  }
  
  logger.info(`✓ ${permissionCheckPassed}/${successIds.length} 个机构的权限控制验证通过`);

  // 至少一半的请求应该成功
  if (successResults.length < concurrentCount / 2) {
    throw new Error(`并发创建成功率过低: ${successResults.length}/${concurrentCount}`);
  }
}

// ==================== 位置搜索相关测试 ====================

// 测试位置（北京朝阳）
const userLocation = { latitude: 39.9289, longitude: 116.4354 };

/**
 * 测试：查询附近机构
 */
async function testNearbyInstitutions() {
  const helper = new TestHelper(testData.userToken);
  
  const result = await helper.get('/institution/nearby', {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    radius: 10,
    limit: 20,
  });
  
  logger.info(`找到 ${result.length || 0} 个附近机构`);
  
  // 验证距离字段存在
  if (result.length > 0) {
    const firstInst = result[0];
    if (firstInst.distance === undefined) {
      throw new Error('附近机构缺少距离字段');
    }
    logger.info(`最近机构: ${firstInst.name}, 距离: ${firstInst.distance}km`);
  }
  
  logger.success('✓ 查询附近机构测试通过');
}

/**
 * 测试：按区域搜索机构
 */
async function testSearchByArea() {
  const helper = new TestHelper(testData.userToken);
  
  const result = await helper.get('/institution/search/area', {
    city: '110100',
    page: 1,
    pageSize: 10,
  });
  
  const total = result.total || result.length || 0;
  logger.info(`区域搜索找到 ${total} 个机构`);
  
  logger.success('✓ 按区域搜索机构测试通过');
}

/**
 * 测试：机构列表计算距离
 */
async function testInstitutionListWithDistance() {
  const helper = new TestHelper(testData.userToken);
  
  const result = await helper.get('/institution/list', {
    page: 1,
    pageSize: 20,
    status: 'approved',
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
  });
  
  const data = result.data || result;
  logger.info(`获取到 ${data.length} 个机构`);
  
  // 验证距离字段存在
  if (data.length > 0) {
    const hasDistance = data.every((inst: any) => inst.distance !== undefined);
    if (!hasDistance) {
      throw new Error('部分机构缺少距离字段');
    }
    
    // 验证按距离排序
    const distances = data.map((inst: any) => parseFloat(inst.distance));
    for (let i = 0; i < distances.length - 1; i++) {
      if (distances[i] > distances[i + 1]) {
        throw new Error('机构列表未按距离排序');
      }
    }
    logger.info('✓ 距离字段存在且按距离排序');
  }
  
  logger.success('✓ 机构列表距离计算测试通过');
}

/**
 * 测试：机构距离筛选（maxDistance参数）
 */
async function testInstitutionDistanceFilter() {
  const helper = new TestHelper(testData.userToken);
  
  // 测试 2km 筛选
  const result2km = await helper.get('/institution/list', {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    maxDistance: 2,
  });
  const data2km = result2km.data || result2km;
  logger.info(`2km内机构: ${data2km.length} 个`);
  
  // 验证所有返回的机构都在2km内
  for (const inst of data2km) {
    const distance = parseFloat(inst.distance);
    if (distance > 2) {
      throw new Error(`机构 ${inst.name} 距离 ${distance}km 超出 2km 筛选范围`);
    }
  }
  
  // 测试 5km 筛选（应该 >= 2km）
  const result5km = await helper.get('/institution/list', {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    maxDistance: 5,
  });
  const data5km = result5km.data || result5km;
  logger.info(`5km内机构: ${data5km.length} 个`);
  
  if (data5km.length < data2km.length) {
    throw new Error(`5km范围(${data5km.length})应该 >= 2km范围(${data2km.length})`);
  }
  
  // 测试 10km 筛选
  const result10km = await helper.get('/institution/list', {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    maxDistance: 10,
  });
  const data10km = result10km.data || result10km;
  logger.info(`10km内机构: ${data10km.length} 个`);
  
  logger.success('✓ 机构距离筛选测试通过');
}

// 运行测试
if (require.main === module) {
  runCRUDTests()
    .then((success) => {
      if (success) {
        logger.success('✓ 🎉 所有测试通过！');
        process.exit(0);
      } else {
        logger.error('✗ ❌ 部分测试失败，请检查错误日志');
        process.exit(1);
      }
    })
    .catch((error) => {
      logger.error(`测试运行异常: ${error.message}`);
      process.exit(1);
    });
}
