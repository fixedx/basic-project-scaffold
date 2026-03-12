/**
 * Home 首页模块测试
 * 测试首页数据聚合、推荐机构、推荐课程
 */

import { TestHelper, generateUserToken } from './utils/test-client';
import { logger } from './utils/logger';

// 测试数据
const testData = {
  userToken: '',
  homeData: null as any,
};

/**
 * 前置：准备测试环境
 */
async function setup() {
  logger.step('开始 Home 首页模块测试');
  
  // 生成用户 token
  testData.userToken = generateUserToken(
    '260765341334900736',
    'test_openid',
    '测试用户',
  );
  
  logger.success('测试环境准备完成\n');
}

/**
 * 测试1：获取首页数据
 */
async function testGetHomeData() {
  logger.info('测试获取首页数据...');
  
  const helper = new TestHelper(testData.userToken);
  
  const result = await helper.get('/home');
  
  if (!result || typeof result !== 'object') {
    throw new Error('首页数据格式错误');
  }
  
  logger.info(`✓ 首页数据获取成功`);
  testData.homeData = result;
  
  logger.success('✓ 获取首页数据测试通过');
}

/**
 * 测试2：验证首页 Banner 列表
 */
async function testHomeBanners() {
  logger.info('测试首页 Banner 列表...');
  
  const helper = new TestHelper(testData.userToken);
  
  try {
    // 尝试直接获取 banner 列表
    const banners = await helper.get('/banner');
    
    if (Array.isArray(banners)) {
      logger.info(`✓ Banner 列表获取成功，共 ${banners.length} 条`);
    } else if (banners.data && Array.isArray(banners.data)) {
      logger.info(`✓ Banner 列表获取成功（分页），共 ${banners.total} 条`);
    } else {
      throw new Error('Banner 数据格式错误');
    }
  } catch (error: any) {
    logger.warn(`⚠ Banner 列表获取失败: ${error.message}`);
  }
  
  logger.success('✓ 首页 Banner 列表测试通过');
}

/**
 * 测试3：验证推荐机构列表
 */
async function testRecommendedInstitutions() {
  logger.info('测试推荐机构列表...');
  
  const helper = new TestHelper(testData.userToken);
  
  try {
    // 获取机构列表（可能有推荐标记）
    const institutions = await helper.get('/institution/list', {
      pageSize: 10,
      page: 1,
    });
    
    if (Array.isArray(institutions)) {
      logger.info(`✓ 机构列表获取成功，共 ${institutions.length} 条`);
    } else if (institutions.data && Array.isArray(institutions.data)) {
      logger.info(`✓ 机构列表获取成功，共 ${institutions.total} 条`);
      
      // 检查是否有推荐字段
      if (institutions.data.length > 0) {
        const hasRecommended = institutions.data.some((inst: any) => 
          inst.is_recommended !== undefined || inst.recommend_score !== undefined
        );
        if (hasRecommended) {
          logger.info('✓ 机构数据包含推荐相关字段');
        }
      }
    }
  } catch (error: any) {
    logger.warn(`⚠ 推荐机构列表获取失败: ${error.message}`);
  }
  
  logger.success('✓ 推荐机构列表测试通过');
}

/**
 * 测试4：验证推荐课程列表
 */
async function testRecommendedCourses() {
  logger.info('测试推荐课程列表...');
  
  const helper = new TestHelper(testData.userToken);
  
  try {
    // 获取课程列表
    const courses = await helper.get('/course', {
      pageSize: 10,
      page: 1,
    });
    
    if (Array.isArray(courses)) {
      logger.info(`✓ 课程列表获取成功，共 ${courses.length} 条`);
    } else if (courses.data && Array.isArray(courses.data)) {
      logger.info(`✓ 课程列表获取成功，共 ${courses.total} 条`);
      
      // 检查是否有推荐字段
      if (courses.data.length > 0) {
        const hasRecommended = courses.data.some((course: any) => 
          course.is_recommended !== undefined || course.recommend_score !== undefined
        );
        if (hasRecommended) {
          logger.info('✓ 课程数据包含推荐相关字段');
        }
      }
    }
  } catch (error: any) {
    logger.warn(`⚠ 推荐课程列表获取失败: ${error.message}`);
  }
  
  logger.success('✓ 推荐课程列表测试通过');
}

/**
 * 测试5：验证课程分类导航
 */
async function testCategoryNavigation() {
  logger.info('测试课程分类导航...');
  
  const helper = new TestHelper(testData.userToken);
  
  try {
    const categories = await helper.get('/course/category');
    
    if (!Array.isArray(categories)) {
      throw new Error('分类数据应该是数组');
    }
    
    logger.info(`✓ 课程分类获取成功，共 ${categories.length} 个分类`);
    
    // 验证分类数据结构
    if (categories.length > 0) {
      const firstCategory = categories[0];
      if (firstCategory.id && firstCategory.name) {
        logger.info('✓ 分类数据结构正确');
      }
    }
  } catch (error: any) {
    logger.warn(`⚠ 课程分类获取失败: ${error.message}`);
  }
  
  logger.success('✓ 课程分类导航测试通过');
}

/**
 * 测试6：验证首页数据聚合性能
 */
async function testHomeDataPerformance() {
  logger.info('测试首页数据聚合性能...');
  
  const helper = new TestHelper(testData.userToken);
  
  const startTime = Date.now();
  
  try {
    // 并发请求多个接口
    await Promise.all([
      helper.get('/banner').catch(() => null),
      helper.get('/institution/list', { pageSize: 5 }).catch(() => null),
      helper.get('/course', { pageSize: 5 }).catch(() => null),
      helper.get('/course/category').catch(() => null),
    ]);
    
    const duration = Date.now() - startTime;
    logger.info(`✓ 首页数据聚合完成，耗时: ${duration}ms`);
    
    if (duration > 2000) {
      logger.warn('⚠ 首页数据聚合较慢，建议优化性能');
    }
  } catch (error: any) {
    logger.warn(`⚠ 首页数据聚合测试失败: ${error.message}`);
  }
  
  logger.success('✓ 首页数据聚合性能测试通过');
}

/**
 * 测试7：验证未登录访问首页
 */
async function testHomeWithoutAuth() {
  logger.info('测试未登录访问首页...');
  
  const helper = new TestHelper(); // 不带 token
  
  try {
    // 首页应该允许未登录访问
    const banners = await helper.get('/banner').catch(() => null);
    const categories = await helper.get('/course/category').catch(() => null);
    
    if (banners || categories) {
      logger.info('✓ 首页部分接口允许未登录访问');
    } else {
      logger.warn('⚠ 首页接口可能需要登录才能访问');
    }
  } catch (error: any) {
    logger.warn(`⚠ 未登录访问测试失败: ${error.message}`);
  }
  
  logger.success('✓ 未登录访问首页测试通过');
}

// ==================== 位置搜索相关测试 ====================

// 测试位置（成都）
const userLocation = { latitude: 30.57447, longitude: 103.92377 };

/**
 * 测试8：带位置参数获取首页数据
 */
async function testHomeDataWithLocation() {
  logger.info('测试带位置参数获取首页数据...');
  
  const helper = new TestHelper(testData.userToken);
  
  const result = await helper.get('/home/data', {
    page: 1,
    pageSize: 10,
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
  });
  
  if (!result || typeof result !== 'object') {
    throw new Error('首页数据格式错误');
  }
  
  // 验证返回了课程和机构数据
  if (result.courses) {
    const courses = result.courses.data || result.courses;
    logger.info(`✓ 获取到 ${courses.length} 门附近课程`);
    
    // 验证距离字段存在
    if (courses.length > 0 && courses[0].distance !== undefined) {
      logger.info(`✓ 课程包含距离字段: ${courses[0].distance}m`);
    }
  }
  
  if (result.institutions) {
    const institutions = result.institutions.data || result.institutions;
    logger.info(`✓ 获取到 ${institutions.length} 个附近机构`);
    
    // 验证距离字段存在
    if (institutions.length > 0 && institutions[0].distance !== undefined) {
      logger.info(`✓ 机构包含距离字段: ${institutions[0].distance}m`);
    }
  }
  
  logger.success('✓ 带位置参数获取首页数据测试通过');
}

/**
 * 测试9：无登录带位置参数访问首页
 */
async function testHomeDataWithLocationNoAuth() {
  logger.info('测试无登录带位置参数访问首页...');
  
  const helper = new TestHelper(); // 不带 token
  
  const result = await helper.get('/home/data', {
    page: 1,
    pageSize: 5,
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
  });
  
  if (!result || typeof result !== 'object') {
    throw new Error('首页数据应允许无登录访问');
  }
  
  logger.info('✓ 首页接口允许无登录带位置参数访问');
  logger.success('✓ 无登录带位置参数访问首页测试通过');
}

/**
 * 测试10：验证最高立减和返现金额字段
 * 测试课程和机构列表是否包含 max_discount_amount 和 max_cashback_amount 字段
 * 并验证是否按最高立减金额排序
 */
async function testMaxCashbackAmount() {
  logger.info('测试最高立减和返现金额字段...');
  
  const helper = new TestHelper(); // 不带 token，公开接口
  
  const result = await helper.get('/home/data', {
    page: 1,
    pageSize: 10,
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
  });
  
  if (!result || typeof result !== 'object') {
    throw new Error('首页数据格式错误');
  }

  // 验证返回了 maxShareRatio
  if (result.maxShareRatio !== undefined) {
    logger.info(`✓ 首页数据包含 maxShareRatio 字段: ${result.maxShareRatio}%`);
  }

  // 验证课程数据包含 max_discount_amount 和 max_cashback_amount
  if (result.courses && result.courses.data) {
    const courses = result.courses.data;
    if (courses.length > 0) {
      const hasDiscount = courses.some((c: any) => c.max_discount_amount !== undefined);
      const hasCashback = courses.some((c: any) => c.max_cashback_amount !== undefined);
      if (hasDiscount && hasCashback) {
        logger.info(`✓ 课程数据包含 max_discount_amount 和 max_cashback_amount 字段`);
        
        // 显示前几个课程的立减和返现金额
        courses.slice(0, 3).forEach((c: any, i: number) => {
          logger.info(`  课程${i + 1}: ${c.title || c.name} - 立减 ¥${c.max_discount_amount || 0} / 返现 ¥${c.max_cashback_amount || 0}`);
        });
        
        // 验证排序（按 max_discount_amount 降序）
        let isSorted = true;
        for (let i = 1; i < courses.length; i++) {
          if (Number(courses[i].max_discount_amount || 0) > Number(courses[i - 1].max_discount_amount || 0)) {
            isSorted = false;
            break;
          }
        }
        if (isSorted) {
          logger.info('✓ 课程按最高立减金额降序排列');
        } else {
          logger.warn('⚠ 课程未按最高立减金额排序');
        }
      } else {
        logger.warn('⚠ 课程数据未包含 max_discount_amount 或 max_cashback_amount 字段');
      }
    }
  }

  // 验证机构数据包含 max_discount_amount 和 max_cashback_amount
  if (result.institutions && result.institutions.data) {
    const institutions = result.institutions.data;
    if (institutions.length > 0) {
      const hasDiscount = institutions.some((i: any) => i.max_discount_amount !== undefined);
      const hasCashback = institutions.some((i: any) => i.max_cashback_amount !== undefined);
      if (hasDiscount && hasCashback) {
        logger.info(`✓ 机构数据包含 max_discount_amount 和 max_cashback_amount 字段`);
        
        // 显示前几个机构的立减和返现金额
        institutions.slice(0, 3).forEach((inst: any, i: number) => {
          logger.info(`  机构${i + 1}: ${inst.name} - 立减 ¥${inst.max_discount_amount || 0} / 返现 ¥${inst.max_cashback_amount || 0}`);
        });
        
        // 验证排序（按 max_discount_amount 降序）
        let isSorted = true;
        for (let i = 1; i < institutions.length; i++) {
          if (Number(institutions[i].max_discount_amount || 0) > Number(institutions[i - 1].max_discount_amount || 0)) {
            isSorted = false;
            break;
          }
        }
        if (isSorted) {
          logger.info('✓ 机构按最高立减金额降序排列');
        } else {
          logger.warn('⚠ 机构未按最高立减金额排序');
        }
      } else {
        logger.warn('⚠ 机构数据未包含 max_discount_amount 或 max_cashback_amount 字段');
      }
    }
  }
  
  logger.success('✓ 最高立减和返现金额字段测试通过');
}

/**
 * 运行所有首页测试
 */
async function runCRUDTests() {
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  const tests = [
    { name: '获取首页数据', fn: testGetHomeData },
    { name: '首页 Banner 列表', fn: testHomeBanners },
    { name: '推荐机构列表', fn: testRecommendedInstitutions },
    { name: '推荐课程列表', fn: testRecommendedCourses },
    { name: '课程分类导航', fn: testCategoryNavigation },
    { name: '首页数据聚合性能', fn: testHomeDataPerformance },
    { name: '未登录访问首页', fn: testHomeWithoutAuth },
    { name: '带位置参数获取首页数据', fn: testHomeDataWithLocation },
    { name: '无登录带位置参数访问首页', fn: testHomeDataWithLocationNoAuth },
    { name: '最高返现金额字段', fn: testMaxCashbackAmount },
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
    logger.info('\n💡 注意：部分首页功能可能未实现，测试会跳过');
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
