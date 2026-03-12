import { hashPassword, verifyPassword } from '../src/utils/crypto.util';

/**
 * 密码加密测试脚本
 * 使用方法：
 * cd interest-class-server
 * npx ts-node test/test-password-encryption.ts
 */

async function testPasswordEncryption() {
  const password = 'admin123456';

  console.log('密码加密测试');
  console.log('='.repeat(50));
  console.log();

  // 加密
  console.log(`原始密码: ${password}`);
  const hashedPassword = await hashPassword(password);
  console.log(`加密结果: ${hashedPassword}`);
  console.log();

  // 验证
  const isValid = await verifyPassword(
    password,
    '10:ddc4085a2fca65302772881b3307df9c:a0063766de6ac5ed96fe69add1230c7348926c2ec2a78d30ac2dd0115315705fd1a2d1c30e0b6f1af3996a3d1d1df848f5347118f8191fae61eb082c0dea5e6d',
  );
  console.log(`验证结果: ${isValid ? '✅ 成功' : '❌ 失败'}`);
}

// 运行测试
testPasswordEncryption().catch((error) => {
  console.error('测试失败:', error);
  process.exit(1);
});
