/**
 * OSS 文件上传测试
 * 测试文件上传和预览URL生成
 */

import axios from 'axios';
import FormData from 'form-data';
import { generateUserToken } from './utils/test-client';
import { logger } from './utils/logger';

const BASE_URL = 'http://localhost:8888/api';

// 测试数据
const testData = {
  userToken: '',
  uploadedFiles: [] as string[], // 存储已上传文件的 path
};

/**
 * 前置：准备测试环境
 */
async function setup() {
  logger.step('开始 OSS 模块测试');
  
  // 生成用户 token
  testData.userToken = generateUserToken(
    '260765341334900736',
    'test_openid',
    '测试用户',
  );
  
  logger.success('测试环境准备完成\n');
}

/**
 * 测试1：上传图片文件
 */
async function testUploadImage() {
  logger.info('测试上传图片文件...');
  
  const form = new FormData();
  
  // 创建一个测试图片（1x1 像素的 PNG）
  const imageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
  
  form.append('file', imageBuffer, {
    filename: 'test-image.png',
    contentType: 'image/png',
  });
  
  try {
    const response = await axios.post(`${BASE_URL}/oss/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${testData.userToken}`,
      },
    });
    
    const result = response.data.data;
    
    // 验证返回数据
    if (!result.path || typeof result.path !== 'string') {
      throw new Error('未返回 path 字段');
    }
    
    if (!result.size || typeof result.size !== 'number') {
      throw new Error('未返回 size 字段');
    }
    
    logger.info(`✓ 文件上传成功`);
    logger.info(`  路径: ${result.path}`);
    logger.info(`  大小: ${result.size} bytes`);
    
    testData.uploadedFiles.push(result.path);
    
  } catch (error: any) {
    const message = error.response?.data?.message || error.message;
    logger.error(`✗ 上传失败: ${message}`);
    throw error;
  }
  
  logger.success('✓ 图片上传测试通过');
}

/**
 * 测试2：上传文本文件
 */
async function testUploadText() {
  logger.info('测试上传文本文件...');
  
  const form = new FormData();
  const textContent = Buffer.from('Hello, OSS Test!', 'utf-8');
  
  form.append('file', textContent, {
    filename: 'test.txt',
    contentType: 'text/plain',
  });
  
  try {
    const response = await axios.post(`${BASE_URL}/oss/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${testData.userToken}`,
      },
    });
    
    const result = response.data.data;
    
    if (!result.path) {
      throw new Error('未返回 path');
    }
    
    logger.info(`✓ 文件路径: ${result.path}`);
    testData.uploadedFiles.push(result.path);
    
  } catch (error: any) {
    const message = error.response?.data?.message || error.message;
    logger.error(`✗ 上传失败: ${message}`);
    throw error;
  }
  
  logger.success('✓ 文本文件上传测试通过');
}

/**
 * 测试3：获取预览URL
 */
async function testGetPreviewUrl() {
  logger.info('测试获取预览URL...');
  
  if (testData.uploadedFiles.length === 0) {
    logger.warn('⚠ 没有已上传的文件，跳过测试');
    return;
  }
  
  const filePath = testData.uploadedFiles[0];
  
  try {
    const response = await axios.get(`${BASE_URL}/oss/preview-url`, {
      params: { filePath },
      headers: {
        Authorization: `Bearer ${testData.userToken}`,
      },
    });
    
    const result = response.data.data;
    
    if (!result.url || typeof result.url !== 'string') {
      throw new Error('未返回有效的 URL');
    }
    
    if (!result.url.startsWith('http')) {
      throw new Error('URL 格式不正确');
    }
    
    logger.info(`✓ 预览URL: ${result.url.substring(0, 80)}...`);
    
  } catch (error: any) {
    const message = error.response?.data?.message || error.message;
    logger.error(`✗ 获取预览URL失败: ${message}`);
    throw error;
  }
  
  logger.success('✓ 预览URL测试通过');
}

/**
 * 测试4：检查文件是否存在
 */
async function testFileExists() {
  logger.info('测试检查文件是否存在...');
  
  if (testData.uploadedFiles.length === 0) {
    logger.warn('⚠ 没有已上传的文件，跳过测试');
    return;
  }
  
  const filePath = testData.uploadedFiles[0];
  
  try {
    const response = await axios.get(`${BASE_URL}/oss/exists`, {
      params: { filePath },
      headers: {
        Authorization: `Bearer ${testData.userToken}`,
      },
    });
    
    const result = response.data.data;
    
    if (typeof result.exists !== 'boolean') {
      throw new Error('返回结果不是布尔值');
    }
    
    if (!result.exists) {
      throw new Error('刚上传的文件不存在');
    }
    
    logger.info(`✓ 文件存在: ${result.exists}`);
    
  } catch (error: any) {
    const message = error.response?.data?.message || error.message;
    logger.error(`✗ 检查文件失败: ${message}`);
    throw error;
  }
  
  logger.success('✓ 文件存在检查测试通过');
}

/**
 * 测试5：删除文件
 */
async function testDeleteFile() {
  logger.info('测试删除文件...');
  
  if (testData.uploadedFiles.length === 0) {
    logger.warn('⚠ 没有已上传的文件，跳过测试');
    return;
  }
  
  const filePath = testData.uploadedFiles[0];
  
  try {
    const response = await axios.delete(`${BASE_URL}/oss/delete`, {
      data: { filePath },
      headers: {
        Authorization: `Bearer ${testData.userToken}`,
      },
    });
    
    if (response.data.code !== 200) {
      throw new Error('删除失败');
    }
    
    logger.info(`✓ 文件已删除: ${filePath}`);
    
    // 验证文件确实被删除
    const existsResponse = await axios.get(`${BASE_URL}/oss/exists`, {
      params: { filePath },
      headers: {
        Authorization: `Bearer ${testData.userToken}`,
      },
    });
    
    if (existsResponse.data.data.exists) {
      throw new Error('文件删除后仍然存在');
    }
    
  } catch (error: any) {
    const message = error.response?.data?.message || error.message;
    logger.error(`✗ 删除文件失败: ${message}`);
    throw error;
  }
  
  logger.success('✓ 文件删除测试通过');
}

/**
 * 测试6：批量删除文件
 */
async function testBatchDelete() {
  logger.info('测试批量删除文件...');
  
  if (testData.uploadedFiles.length < 2) {
    logger.warn('⚠ 文件数量不足，跳过批量删除测试');
    return;
  }
  
  const filePaths = testData.uploadedFiles.slice(1); // 跳过第一个（已删除）
  
  try {
    const response = await axios.delete(`${BASE_URL}/oss/batch-delete`, {
      data: { filePaths },
      headers: {
        Authorization: `Bearer ${testData.userToken}`,
      },
    });
    
    if (response.data.code !== 200) {
      throw new Error('批量删除失败');
    }
    
    logger.info(`✓ 批量删除 ${filePaths.length} 个文件`);
    
  } catch (error: any) {
    const message = error.response?.data?.message || error.message;
    logger.error(`✗ 批量删除失败: ${message}`);
    throw error;
  }
  
  logger.success('✓ 批量删除测试通过');
}

/**
 * 测试7：未认证也可上传文件（机构入驻场景）
 */
async function testAuthProtection() {
  logger.info('测试未认证上传文件（白名单接口）...');
  
  const form = new FormData();
  form.append('file', Buffer.from('test-no-auth'), {
    filename: 'test-noauth.txt',
  });
  
  const response = await axios.post(`${BASE_URL}/oss/upload`, form, {
    headers: form.getHeaders(),
    // 不提供 Authorization —— OSS upload 已在白名单中（机构入驻时未登录也需要上传）
  });
  
  if (response.status === 200 || response.status === 201) {
    logger.info('✓ 未认证上传成功（白名单接口正常）');
    // 清理上传的测试文件
    if (response.data?.data?.path) {
      try {
        await axios.delete(`${BASE_URL}/oss/delete`, {
          data: { path: response.data.data.path },
          headers: { Authorization: `Bearer ${testData.userToken}` },
        });
      } catch (_) {}
    }
  } else {
    throw new Error(`上传应成功，实际状态码: ${response.status}`);
  }
  
  logger.success('✓ 白名单上传测试通过');
}

/**
 * 运行所有测试
 */
export async function runCRUDTests() {
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  
  const tests = [
    { name: '准备测试环境', fn: setup },
    { name: '上传图片文件', fn: testUploadImage },
    { name: '上传文本文件', fn: testUploadText },
    { name: '获取预览URL', fn: testGetPreviewUrl },
    { name: '检查文件存在', fn: testFileExists },
    { name: '删除文件', fn: testDeleteFile },
    { name: '批量删除文件', fn: testBatchDelete },
    { name: '未认证上传（白名单）', fn: testAuthProtection },
  ];
  
  for (const test of tests) {
    try {
      logger.section(test.name);
      await test.fn();
      successCount++;
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error: any) {
      failCount++;
      logger.error(`${test.name} - 失败: ${error.message}`);
    }
  }
  
  const duration = (Date.now() - startTime) / 1000;
  
  logger.summary({
    title: 'OSS 测试总结',
    total: tests.length,
    success: successCount,
    fail: failCount,
    duration,
  });
  
  return failCount === 0;
}

// 如果直接运行此文件
if (require.main === module) {
  runCRUDTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      logger.error('测试执行出错');
      console.error(error);
      process.exit(1);
    });
}

export { testData };
