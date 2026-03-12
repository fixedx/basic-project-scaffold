/**
 * 完整测试套件运行器
 * 
 * 功能：
 * - 串联所有测试模块
 * - 支持按顺序或并行执行
 * - 支持完整业务流程测试
 * - 生成详细的测试报告
 * - 支持失败重试
 * 
 * 使用方式：
 * npx tsx tests/run-all-tests.ts                # 运行所有模块测试
 * npx tsx tests/run-all-tests.ts --parallel     # 并行执行（部分模块）
 * npx tsx tests/run-all-tests.ts --module=auth  # 只运行指定模块
 * npx tsx tests/run-all-tests.ts --verbose      # 详细日志
 */

import { logger } from './utils/logger';

// ==================== 测试模块导入 ====================
import { runCRUDTests as runAuthTests } from './auth.test';
import { runCRUDTests as runInstitutionTests } from './institution.test';
import { runCRUDTests as runClassroomTests } from './classroom.test';
import { runCRUDTests as runTeacherTests } from './teacher.test';
import { runCRUDTests as runCourseTests } from './course.test';
import { runCRUDTests as runScheduleTests } from './schedule.test';
import { runCRUDTests as runBannerTests } from './banner.test';
import { runCRUDTests as runBookingTests } from './booking.test';
import { runCRUDTests as runOrderTests } from './order.test';
import { runCRUDTests as runReviewTests } from './review.test';
import { runCRUDTests as runEnumTests } from './enum.test';
import { runCRUDTests as runHomeTests } from './home.test';
import { runCRUDTests as runOssTests } from './oss.test';
import { runCRUDTests as runChildTests } from './child.test';
import { runCRUDTests as runCheckInTests } from './check-in.test';
import { runInviteTests } from './invite.test';
import { runCRUDTests as runFavoriteTests } from './favorite.test';
import { runCRUDTests as runFeedbackTests } from './feedback.test';
import { runCRUDTests as runPaymentCallbackTests } from './payment-callback.test';

// ==================== 类型定义 ====================
/**
 * 共享测试数据结构（用于模块间数据串联）
 */
interface SharedTestData {
  // 用户相关
  userToken?: string;
  userId?: string;
  
  // 机构相关
  institutionId?: string;
  institutionToken?: string;
  institutionPhone?: string;
  
  // 课程相关
  courseId?: string;
  trialCourseId?: string;
  standardCourseId?: string;
  skuId?: string;
  categoryCode?: string;
  
  // 教室相关
  classroomId?: string;
  
  // 教师相关
  teacherId?: string;
  
  // 排课相关
  scheduleId?: string;
  
  // 预约相关
  bookingId?: string;
  trialBookingId?: string;
  regularBookingId?: string;
  
  // 订单相关
  orderId?: string;
  offlineOrderId?: string;
  onlineOrderId?: string;
  
  // 评价相关
  reviewId?: string;
  excellentReviewId?: string;
  
  // Banner相关
  bannerId?: string;
  
  // 宝贝相关
  childIds?: string[];
  boyChildId?: string;
  girlChildId?: string;
  
  // 其他
  [key: string]: any;
}

interface TestModule {
  name: string;
  displayName: string;
  fn: (sharedData?: SharedTestData) => Promise<boolean>;
  dependencies?: string[]; // 依赖的模块名称
  category: 'foundation' | 'business' | 'integration' | 'utility';
  priority: number; // 执行优先级（越小越先执行）
}

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  totalDuration: number;
  results: TestResult[];
}

// ==================== 配置 ====================
const CONFIG = {
  verbose: process.argv.includes('--verbose'),
  parallel: process.argv.includes('--parallel'),
  module: process.argv.find(arg => arg.startsWith('--module='))?.split('=')[1],
  retry: process.argv.includes('--retry') ? 3 : 0,
  continueOnError: process.argv.includes('--continue-on-error'),
  skipCleanup: process.argv.includes('--skip-cleanup'),
};

// ==================== 测试模块定义 ====================
const TEST_MODULES: TestModule[] = [
  // 基础设施测试（必须最先执行）
  {
    name: 'enum',
    displayName: '枚举管理',
    fn: runEnumTests,
    category: 'foundation',
    priority: 1,
  },
  {
    name: 'oss',
    displayName: 'OSS文件上传',
    fn: runOssTests,
    category: 'utility',
    priority: 2,
  },
  {
    name: 'auth',
    displayName: '认证授权',
    fn: runAuthTests,
    category: 'foundation',
    priority: 3,
  },

  // 核心业务测试（机构是其他业务的基础）
  {
    name: 'institution',
    displayName: '机构管理',
    fn: runInstitutionTests,
    dependencies: ['auth'],
    category: 'business',
    priority: 10,
  },
  {
    name: 'classroom',
    displayName: '教室管理',
    fn: runClassroomTests,
    dependencies: ['institution'],
    category: 'business',
    priority: 11,
  },
  {
    name: 'teacher',
    displayName: '教师管理',
    fn: runTeacherTests,
    dependencies: ['institution'],
    category: 'business',
    priority: 12,
  },
  {
    name: 'course',
    displayName: '课程管理',
    fn: runCourseTests,
    dependencies: ['institution'],
    category: 'business',
    priority: 13,
  },
  {
    name: 'schedule',
    displayName: '排课管理',
    fn: runScheduleTests,
    dependencies: ['course', 'teacher', 'classroom'],
    category: 'business',
    priority: 14,
  },

  // 前台业务测试
  {
    name: 'banner',
    displayName: '轮播图管理',
    fn: runBannerTests,
    dependencies: ['institution'],
    category: 'business',
    priority: 20,
  },
  {
    name: 'child',
    displayName: '宝贝管理',
    fn: runChildTests,
    dependencies: ['auth'],
    category: 'business',
    priority: 21,
  },
  {
    name: 'favorite',
    displayName: '收藏管理',
    fn: runFavoriteTests,
    dependencies: ['auth'],
    category: 'business',
    priority: 21.5,
  },
  {
    name: 'feedback',
    displayName: '反馈管理',
    fn: runFeedbackTests,
    dependencies: ['auth'],
    category: 'business',
    priority: 21.6,
  },
  {
    name: 'home',
    displayName: '首页聚合',
    fn: runHomeTests,
    dependencies: ['institution', 'course', 'banner'],
    category: 'integration',
    priority: 22,
  },

  // 订单流程测试
  {
    name: 'booking',
    displayName: '预约管理',
    fn: runBookingTests,
    dependencies: ['course', 'schedule'],
    category: 'business',
    priority: 30,
  },
  {
    name: 'order',
    displayName: '订单管理',
    fn: runOrderTests,
    dependencies: ['booking'],
    category: 'business',
    priority: 31,
  },
  {
    name: 'review',
    displayName: '评价管理',
    fn: runReviewTests,
    dependencies: ['order'],
    category: 'business',
    priority: 32,
  },
  {
    name: 'check-in',
    displayName: '签到管理',
    fn: runCheckInTests,
    dependencies: ['order'],
    category: 'business',
    priority: 33,
  },
  {
    name: 'invite',
    displayName: '邀友返现',
    fn: async () => {
      const result = await runInviteTests();
      return result.failed === 0;
    },
    dependencies: ['auth'],
    category: 'business',
    priority: 34,
  },
  {
    name: 'payment-callback',
    displayName: '支付回调幂等',
    fn: runPaymentCallbackTests,
    dependencies: ['order'],
    category: 'integration',
    priority: 35,
  },
];

// ==================== 工具函数 ====================
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function printHeader() {
  const width = 80;
  console.log('\n' + '='.repeat(width));
  console.log('  Interest Class - 完整测试套件'.padStart(width / 2 + 15));
  console.log('='.repeat(width) + '\n');
  
  if (CONFIG.module) {
    logger.info(`▶ 运行模式: 单模块测试 (${CONFIG.module})`);
  } else if (CONFIG.parallel) {
    logger.info('▶ 运行模式: 并行执行');
  } else {
    logger.info('▶ 运行模式: 顺序执行');
  }
  
  if (CONFIG.continueOnError) {
    logger.info('⚠️  失败继续: 启用');
  }
  if (CONFIG.retry > 0) {
    logger.info(`🔄 重试次数: ${CONFIG.retry}`);
  }
  console.log('');
}

function printModuleInfo(module: TestModule, index: number, total: number) {
  const prefix = `[${index + 1}/${total}]`;
  const category = {
    foundation: '🏗️ ',
    business: '💼',
    integration: '🔗',
    utility: '🛠️ ',
  }[module.category];
  
  logger.section(`${prefix} ${category} ${module.displayName}`);
  
  if (CONFIG.verbose && module.dependencies?.length) {
    logger.info(`   依赖: ${module.dependencies.join(', ')}`);
  }
}

function printTestResult(result: TestResult) {
  const status = result.success ? '✅' : '❌';
  const duration = result.duration.toFixed(2);
  console.log(`   ${status} ${result.name} (${duration}s)`);
  
  if (!result.success && result.error && CONFIG.verbose) {
    console.log(`      错误: ${result.error}`);
  }
}

function printFinalSummary(summary: TestSummary) {
  const width = 80;
  console.log('\n' + '='.repeat(width));
  console.log('  测试总结'.padStart(width / 2 + 5));
  console.log('='.repeat(width));
  
  const passRate = summary.total > 0 
    ? ((summary.passed / summary.total) * 100).toFixed(1) 
    : '0.0';
  
  console.log(`
  总测试数: ${summary.total}
  ✅ 通过: ${summary.passed}
  ❌ 失败: ${summary.failed}
  ⏭️  跳过: ${summary.skipped}
  📊 通过率: ${passRate}%
  ⏱️  总耗时: ${summary.totalDuration.toFixed(2)}s
  `);
  
  if (summary.failed > 0) {
    console.log('失败的测试模块:');
    summary.results
      .filter(r => !r.success)
      .forEach(r => console.log(`  ❌ ${r.name}`));
    console.log('');
  }
  
  console.log('='.repeat(width) + '\n');
}

// ==================== 执行逻辑 ====================
async function runSingleModule(
  module: TestModule,
  sharedData: SharedTestData,
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // 传递共享数据给测试模块
    const success = await module.fn(sharedData);
    const duration = (Date.now() - startTime) / 1000;
    
    // 打印数据流转日志（仅在verbose模式下）
    if (CONFIG.verbose && Object.keys(sharedData).length > 0) {
      logger.info(`   📦 共享数据已更新: ${Object.keys(sharedData).filter(k => sharedData[k]).join(', ')}`);
    }
    
    return {
      name: module.displayName,
      success,
      duration,
    };
  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000;
    logger.error(`${module.displayName}执行出错: ${error.message}`);
    
    return {
      name: module.displayName,
      success: false,
      duration,
      error: error.message,
    };
  }
}

async function runModuleWithRetry(
  module: TestModule,
  sharedData: SharedTestData,
): Promise<TestResult> {
  let lastResult: TestResult | null = null;
  
  for (let attempt = 0; attempt <= CONFIG.retry; attempt++) {
    if (attempt > 0) {
      logger.info(`   🔄 重试第 ${attempt} 次...`);
      await sleep(2000); // 等待2秒后重试
    }
    
    lastResult = await runSingleModule(module, sharedData);
    
    if (lastResult.success) {
      return lastResult;
    }
  }
  
  return lastResult!;
}

async function runSequential(modules: TestModule[]): Promise<TestSummary> {
  const results: TestResult[] = [];
  const startTime = Date.now();
  let skipped = 0;
  
  // 🔗 创建共享数据对象（用于模块间数据串联）
  const sharedData: SharedTestData = {};
  
  logger.info('🔗 数据串联模式: 启用');
  logger.info('   测试模块将共享创建的数据，避免重复创建\n');
  
  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    printModuleInfo(module, i, modules.length);
    
    // 检查依赖是否成功
    if (module.dependencies?.length) {
      const depsFailed = module.dependencies.some(dep => {
        const depResult = results.find(r => {
          const depModule = modules.find(m => m.name === dep);
          return depModule && r.name === depModule.displayName && !r.success;
        });
        return !!depResult;
      });
      
      if (depsFailed) {
        logger.warn(`   ⏭️  跳过（依赖测试失败）`);
        skipped++;
        continue;
      }
    }
    
    const result = await runModuleWithRetry(module, sharedData);
    results.push(result);
    printTestResult(result);
    
    // 失败处理
    if (!result.success && !CONFIG.continueOnError) {
      logger.error('   ⛔ 测试失败，停止执行（使用 --continue-on-error 继续执行）');
      break;
    }
    
    // 间隔等待
    if (i < modules.length - 1) {
      await sleep(500);
    }
  }
  
  // 打印数据流转摘要
  if (Object.keys(sharedData).length > 0) {
    logger.info('\n📊 数据流转摘要:');
    const dataKeys = Object.keys(sharedData).filter(k => sharedData[k]);
    dataKeys.forEach(key => {
      const value = sharedData[key];
      const displayValue = typeof value === 'string' && value.length > 20 
        ? value.substring(0, 17) + '...' 
        : value;
      logger.info(`   ${key}: ${displayValue}`);
    });
    console.log('');
  }
  
  const totalDuration = (Date.now() - startTime) / 1000;
  
  return {
    total: modules.length,
    passed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    skipped,
    totalDuration,
    results,
  };
}

async function runParallel(modules: TestModule[]): Promise<TestSummary> {
  logger.info('⚠️  并行模式：仅执行无依赖的模块\n');
  logger.warn('   注意: 并行模式下数据串联功能受限\n');
  
  // 只运行无依赖的模块
  const independentModules = modules.filter(m => !m.dependencies?.length);
  
  if (independentModules.length === 0) {
    logger.error('没有可并行执行的模块');
    return {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: modules.length,
      totalDuration: 0,
      results: [],
    };
  }
  
  logger.info(`可并行执行的模块: ${independentModules.map(m => m.displayName).join(', ')}\n`);
  
  // 并行模式下，每个模块使用独立的sharedData
  const startTime = Date.now();
  const promises = independentModules.map((module, index) => {
    printModuleInfo(module, index, independentModules.length);
    const sharedData: SharedTestData = {};
    return runSingleModule(module, sharedData);
  });
  
  const results = await Promise.all(promises);
  const totalDuration = (Date.now() - startTime) / 1000;
  
  results.forEach(printTestResult);
  
  return {
    total: modules.length,
    passed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    skipped: modules.length - independentModules.length,
    totalDuration,
    results,
  };
}

// ==================== 主函数 ====================
async function main() {
  printHeader();
  
  try {
    // 过滤模块
    let modules = TEST_MODULES.sort((a, b) => a.priority - b.priority);
    
    if (CONFIG.module) {
      const targetModule = modules.find(m => m.name === CONFIG.module);
      if (!targetModule) {
        logger.error(`模块 "${CONFIG.module}" 不存在`);
        logger.info(`可用模块: ${modules.map(m => m.name).join(', ')}`);
        process.exit(1);
      }
      modules = [targetModule];
    }
    
    // 执行测试
    const summary = CONFIG.parallel
      ? await runParallel(modules)
      : await runSequential(modules);
    
    // 打印总结
    printFinalSummary(summary);
    
    // 退出码
    const exitCode = summary.failed > 0 ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error: any) {
    logger.error(`测试套件执行失败: ${error.message}`);
    if (CONFIG.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

// ==================== 执行 ====================
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { main as runAllTests };
