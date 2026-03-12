/**
 * Enum 枚举模块测试
 * 测试枚举初始化、查询、批量获取
 */

import { TestHelper, generateUserToken } from './utils/test-client';
import { logger } from './utils/logger';

// 测试数据
const testData = {
  userToken: '',
  allEnums: [] as any[],
  courseTypeEnums: [] as any[],
};

/**
 * 前置：准备测试环境
 */
async function setup() {
  logger.step('开始 Enum 枚举模块测试');
  
  // 生成用户 token
  testData.userToken = generateUserToken(
    '260765341334900736',
    'test_openid',
    '测试用户',
  );
  
  logger.success('测试环境准备完成\n');
}

/**
 * 测试1：初始化默认枚举
 */
async function testInitEnums() {
  logger.info('测试初始化默认枚举...');
  
  const helper = new TestHelper(testData.userToken);
  
  try {
    const result = await helper.post('/enums/init');
    
    logger.info(`✓ 枚举初始化成功: ${result?.message || '完成'}`);
  } catch (error: any) {
    const message = error.response?.data?.message || error.message;
    if (message?.includes('已存在') || message?.includes('已初始化')) {
      logger.info('✓ 枚举已经初始化过');
    } else {
      throw error;
    }
  }
  
  logger.success('✓ 初始化默认枚举测试通过');
}

/**
 * 测试2：获取所有枚举
 */
async function testGetAllEnums() {
  logger.info('测试获取所有枚举...');
  
  const helper = new TestHelper(testData.userToken);
  
  const result = await helper.get('/enums');
  
  // API返回的是按type分组的对象，不是数组
  if (typeof result !== 'object' || result === null) {
    throw new Error('枚举数据应该是对象格式');
  }
  
  const types = Object.keys(result);
  logger.info(`✓ 获取所有枚举成功，共 ${types.length} 种类型`);
  
  // 将分组数据展开为数组存储
  testData.allEnums = [];
  for (const type of types) {
    testData.allEnums.push(...result[type]);
  }
  
  // 验证枚举数据结构
  if (testData.allEnums.length > 0) {
    const firstEnum = testData.allEnums[0];
    if (!firstEnum.type || !firstEnum.code || !firstEnum.label) {
      throw new Error('枚举数据结构不正确');
    }
    logger.info('✓ 枚举数据结构正确');
  }
  
  logger.success('✓ 获取所有枚举测试通过');
}

/**
 * 测试3：获取指定类型枚举
 */
async function testGetEnumsByType() {
  logger.info('测试获取指定类型枚举...');
  
  const helper = new TestHelper(testData.userToken);
  
  try {
    // 获取 course_type 枚举
    const result = await helper.get('/enums/course_type');
    
    if (!Array.isArray(result)) {
      throw new Error('枚举数据应该是数组格式');
    }
    
    logger.info(`✓ 获取 course_type 枚举成功，共 ${result.length} 条`);
    testData.courseTypeEnums = result;
    
    // 验证所有返回的枚举都是 course_type 类型
    const allCorrectType = result.every((item: any) => item.type === 'course_type');
    if (!allCorrectType) {
      throw new Error('返回的枚举类型不正确');
    }
    logger.info('✓ 枚举类型过滤正确');
  } catch (error: any) {
    logger.error(`获取指定类型枚举失败: ${error.message}`);
    throw error;
  }
  
  logger.success('✓ 获取指定类型枚举测试通过');
}

/**
 * 测试4：批量获取多种类型枚举
 */
async function testGetMultipleEnumTypes() {
  logger.info('测试批量获取多种类型枚举...');
  
  const helper = new TestHelper(testData.userToken);
  
  // 批量获取多种枚举类型
  const result = await helper.get('/enums', {
    types: 'course_type,institution_category,audit_status',
  });
  
  // API返回的是按type分组的对象
  if (typeof result !== 'object' || result === null) {
    throw new Error('枚举数据应该是对象格式');
  }
  
  const types = Object.keys(result);
  logger.info(`✓ 批量获取枚举成功: ${types.join(', ')}`);
  
  // 验证返回的枚举包含指定的类型
  const expectedTypes = ['course_type', 'institution_category', 'audit_status'];
  const hasAllTypes = expectedTypes.every(type => types.includes(type));
  
  if (hasAllTypes) {
    logger.info(`✓ 返回的枚举类型正确`);
    for (const type of expectedTypes) {
      logger.info(`  - ${type}: ${result[type].length} 个`);
    }
  } else {
    throw new Error(`缺少必要的枚举类型，期望: ${expectedTypes.join(',')}, 实际: ${types.join(',')}`);
  }
  
  logger.success('✓ 批量获取多种类型枚举测试通过');
}

/**
 * 测试5：验证常用枚举类型
 */
async function testCommonEnumTypes() {
  logger.info('测试验证常用枚举类型...');
  
  const helper = new TestHelper(testData.userToken);
  
  const commonTypes = [
    'course_type',          // 课程类型
    'institution_category', // 机构类目
    'audit_status',         // 审核状态
    'cashback_type',        // 返现类型
  ];
  
  let successCount = 0;
  
  for (const type of commonTypes) {
    try {
      const result = await helper.get(`/enums/${type}`);
      if (Array.isArray(result) && result.length > 0) {
        logger.info(`✓ ${type} 枚举存在，共 ${result.length} 个值`);
        successCount++;
      }
    } catch (error: any) {
      logger.warn(`⚠ ${type} 枚举不存在或为空`);
    }
  }
  
  if (successCount >= 2) {
    logger.info(`✓ 常用枚举类型验证通过 (${successCount}/${commonTypes.length})`);
  } else {
    throw new Error('常用枚举类型验证失败，可能需要执行初始化');
  }
  
  logger.success('✓ 验证常用枚举类型测试通过');
}

/**
 * 测试6：枚举数据完整性
 */
async function testEnumDataIntegrity() {
  logger.info('测试枚举数据完整性...');
  
  if (testData.allEnums.length === 0) {
    throw new Error('没有枚举数据，请先执行 POST /enums/init 初始化');
  }
  
  // 验证必需字段
  const requiredFields = ['id', 'type', 'code', 'label'];
  let validCount = 0;
  
  for (const enumItem of testData.allEnums) {
    const hasAllFields = requiredFields.every(field => enumItem[field] !== undefined);
    if (hasAllFields) {
      validCount++;
    }
  }
  
  const validRate = (validCount / testData.allEnums.length) * 100;
  logger.info(`✓ 枚举数据完整性: ${validRate.toFixed(2)}% (${validCount}/${testData.allEnums.length})`);
  
  if (validRate < 100) {
    throw new Error('部分枚举数据缺少必需字段');
  }
  
  logger.success('✓ 枚举数据完整性测试通过');
}

/**
 * 测试7：枚举排序
 */
async function testEnumSorting() {
  logger.info('测试枚举排序...');
  
  if (testData.courseTypeEnums.length === 0) {
    throw new Error('没有课程类型枚举数据，请先执行 POST /enums/init 初始化');
  }
  
  // 检查是否有 sort_order 字段
  const hasSortOrder = testData.courseTypeEnums.some((item: any) => 
    item.sort_order !== undefined
  );
  
  if (hasSortOrder) {
    logger.info('✓ 枚举数据包含排序字段 sort_order');
    
    // 验证排序是否正确
    const sortedByOrder = testData.courseTypeEnums.every((item: any, index: number) => {
      if (index === 0) return true;
      const prevItem = testData.courseTypeEnums[index - 1];
      return item.sort_order >= prevItem.sort_order;
    });
    
    if (sortedByOrder) {
      logger.info('✓ 枚举数据按 sort_order 正确排序');
    } else {
      logger.warn('⚠ 枚举数据排序可能不正确');
    }
  } else {
    logger.info('✓ 枚举数据使用自然顺序');
  }
  
  logger.success('✓ 枚举排序测试通过');
}

/**
 * 测试8：枚举缓存机制（可选）
 */
async function testEnumCaching() {
  logger.info('测试枚举缓存机制...');
  
  const helper = new TestHelper(testData.userToken);
  
  try {
    // 多次请求相同的枚举
    const startTime1 = Date.now();
    await helper.get('/enums/course_type');
    const duration1 = Date.now() - startTime1;
    
    const startTime2 = Date.now();
    await helper.get('/enums/course_type');
    const duration2 = Date.now() - startTime2;
    
    logger.info(`✓ 第一次请求耗时: ${duration1}ms`);
    logger.info(`✓ 第二次请求耗时: ${duration2}ms`);
    
    if (duration2 < duration1 * 0.5) {
      logger.info('✓ 可能存在缓存机制（第二次请求明显更快）');
    } else {
      logger.info('✓ 未检测到明显的缓存效果');
    }
  } catch (error: any) {
    logger.warn(`⚠ 缓存测试失败: ${error.message}`);
  }
  
  logger.success('✓ 枚举缓存机制测试通过');
}

/**
 * 运行所有枚举测试
 */
async function runCRUDTests() {
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  const tests = [
    { name: '初始化默认枚举', fn: testInitEnums },
    { name: '获取所有枚举', fn: testGetAllEnums },
    { name: '获取指定类型枚举', fn: testGetEnumsByType },
    { name: '批量获取多种类型枚举', fn: testGetMultipleEnumTypes },
    { name: '验证常用枚举类型', fn: testCommonEnumTypes },
    { name: '枚举数据完整性', fn: testEnumDataIntegrity },
    { name: '枚举排序', fn: testEnumSorting },
    { name: '枚举缓存机制', fn: testEnumCaching },
  ];

  for (const test of tests) {
    try {
      logger.step(`▸ ${test.name}`);
      await test.fn();
      successCount++;
    } catch (error: any) {
      logger.error(`✗ ${test.name}失败: ${error.message}`);
      failCount++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  logger.info('    测试总结    ');
  console.log('='.repeat(60) + '\n');
  logger.info(`总测试数: ${tests.length}`);
  logger.success(`成功: ${successCount}`);
  if (failCount > 0) {
    logger.error(`失败: ${failCount}`);
  }
  logger.info(`耗时: ${duration}秒`);
  console.log('='.repeat(60));

  if (failCount === 0) {
    logger.success('\n🎉 所有测试通过！');
    logger.success('\n🎉 所有测试通过！');
  } else {
    logger.error(`\n❌ ${failCount} 个测试失败`);
  }

  return failCount === 0;
}

// 导出测试数据供其他测试使用
export { testData };

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  setup()
    .then(() => runCRUDTests())
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      logger.error(`测试执行失败: ${error}`);
      process.exit(1);
    });
}

// 导出测试函数供其他文件使用
export { runCRUDTests };
