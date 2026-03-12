/**
 * 测试日志工具
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

export const logger = {
  info: (msg: string) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg: string) =>
    console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  step: (msg: string) =>
    console.log(
      `\n${colors.cyan}${colors.bright}━━━ ${msg} ━━━${colors.reset}\n`,
    ),
  section: (msg: string) =>
    console.log(`\n${colors.magenta}${colors.bright}▸ ${msg}${colors.reset}`),

  /**
   * 打印测试摘要
   */
  summary: (data: {
    title: string;
    total: number;
    success: number;
    fail: number;
    duration: number;
  }) => {
    console.log('\n' + '='.repeat(60));
    console.log(
      `${colors.bright}${colors.cyan}    ${data.title}    ${colors.reset}`,
    );
    console.log('='.repeat(60) + '\n');

    logger.info(`总测试数: ${data.total}`);
    logger.success(`成功: ${data.success}`);
    if (data.fail > 0) {
      logger.error(`失败: ${data.fail}`);
    }
    logger.info(`耗时: ${data.duration.toFixed(2)}秒`);

    console.log('\n' + '='.repeat(60) + '\n');

    if (data.fail === 0) {
      logger.success('🎉 所有测试通过！');
    } else {
      logger.error('❌ 部分测试失败，请检查错误日志');
    }
  },

  /**
   * 打印测试数据
   */
  data: (title: string, data: Record<string, any>) => {
    console.log(`\n${colors.bright}${title}:${colors.reset}`);
    Object.entries(data).forEach(([key, value]) => {
      if (value && typeof value === 'string' && value.length > 50) {
        console.log(`  ${key}: ${value.substring(0, 50)}...`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    });
  },
};
