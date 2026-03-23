/**
 * 测试HTTP客户端
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as jwt from 'jsonwebtoken';
import { logger } from './logger';

// 配置
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8888/api';
const TIMEOUT = 10000;

/**
 * 直接生成用户 token（绕过微信登录）
 * @param userId 用户ID
 * @param openid 用户openid
 * @param nickname 昵称
 */
export const generateUserToken = (
  userId: string,
  openid: string,
  nickname: string = '微信用户',
): string => {
  const payload = {
    userId,
    openid,
    username: nickname,
    roles: ['user'],
  };

  const secret = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

/**
 * 生成管理员 token（用于测试需要 admin 权限的接口）
 */
export const generateAdminToken = (): string => {
  const payload = {
    userId: 'admin_test_user',
    openid: 'admin_test_openid',
    username: '测试管理员',
    roles: ['admin'],
  };

  const secret = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

/**
 * 创建 axios 实例
 */
export const createClient = (token?: string): AxiosInstance => {
  return axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

/**
 * API响应类型
 */
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

/**
 * 处理API错误
 */
export const handleApiError = (error: any, context: string): never => {
  logger.error(`${context} 失败`);

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      console.error(`  状态码: ${axiosError.response.status}`);
      console.error(
        `  错误信息: ${JSON.stringify(axiosError.response.data, null, 2)}`,
      );
    } else if (axiosError.request) {
      console.error('  请求已发送，但未收到响应');
      console.error(`  ${axiosError.message}`);
    } else {
      console.error(`  ${axiosError.message}`);
    }
  } else {
    console.error(`  错误: ${error.message || error}`);
  }

  throw error;
};

/**
 * 延迟函数
 */
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 测试辅助类
 */
export class TestHelper {
  private client: AxiosInstance;
  private token?: string;

  constructor(token?: string) {
    this.token = token;
    this.client = createClient(token);
  }

  /**
   * 更新token
   */
  setToken(token: string) {
    this.token = token;
    this.client = createClient(token);
  }

  /**
   * GET请求
   */
  async get<T = any>(url: string, params?: any): Promise<T> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, { params });
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, `GET ${url}`);
    }
  }

  /**
   * POST请求
   */
  async post<T = any>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.client.post<ApiResponse<T>>(url, data);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, `POST ${url}`);
    }
  }

  /**
   * PUT请求
   */
  async put<T = any>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.client.put<ApiResponse<T>>(url, data);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, `PUT ${url}`);
    }
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(url: string): Promise<T> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(url);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, `DELETE ${url}`);
    }
  }
}
