import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  [key: string]: any;
}

export interface JwtOptions {
  secret?: string;
  expiresIn?: string | number;
  algorithm?: jwt.Algorithm;
}

/**
 * JWT 工具类
 */
@Injectable()
export class JwtUtil {
  private readonly defaultSecret: string;
  private readonly defaultExpiresIn: string;

  constructor() {
    this.defaultSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.defaultExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  /**
   * 生成 JWT Token
   * @param payload 载荷数据
   * @param options 选项
   */
  public sign(payload: JwtPayload, options?: JwtOptions): string {
    const secret = options?.secret || this.defaultSecret;
    const expiresIn = options?.expiresIn || this.defaultExpiresIn;
    const algorithm = options?.algorithm || 'HS256';

    return jwt.sign(payload, secret, {
      expiresIn: expiresIn,
      algorithm,
    } as jwt.SignOptions);
  }

  /**
   * 验证并解析 JWT Token
   * @param token JWT Token
   * @param secret 密钥（可选，默认使用环境变量）
   */
  public verify(token: string, secret?: string): JwtPayload {
    const secretKey = secret || this.defaultSecret;

    try {
      return jwt.verify(token, secretKey) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token 已过期');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('无效的 Token');
      }
      throw error;
    }
  }

  /**
   * 解析 JWT Token（不验证签名）
   * @param token JWT Token
   */
  public decode(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * 刷新 Token
   * @param token 旧的 Token
   * @param options 选项
   */
  public refresh(token: string, options?: JwtOptions): string {
    const payload = this.verify(token, options?.secret);

    // 移除 JWT 标准字段
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { iat, exp, nbf, ...newPayload } = payload;

    return this.sign(newPayload, options);
  }

  /**
   * 检查 Token 是否即将过期
   * @param token JWT Token
   * @param thresholdSeconds 阈值（秒），默认 300 秒（5 分钟）
   */
  public isExpiringSoon(
    token: string,
    thresholdSeconds: number = 300,
  ): boolean {
    try {
      const decoded = this.decode(token);
      if (!decoded || !decoded.exp) {
        return false;
      }

      const expirationTime = decoded.exp * 1000; // 转换为毫秒
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;

      return timeUntilExpiry > 0 && timeUntilExpiry < thresholdSeconds * 1000;
    } catch {
      return false;
    }
  }

  /**
   * 检查 Token 是否已过期
   * @param token JWT Token
   */
  public isExpired(token: string): boolean {
    try {
      const decoded = this.decode(token);
      if (!decoded || !decoded.exp) {
        return false;
      }

      const expirationTime = decoded.exp * 1000;
      return Date.now() > expirationTime;
    } catch {
      return true;
    }
  }

  /**
   * 获取 Token 剩余有效时间（秒）
   * @param token JWT Token
   */
  public getRemainingTime(token: string): number {
    try {
      const decoded = this.decode(token);
      if (!decoded || !decoded.exp) {
        return 0;
      }

      const expirationTime = decoded.exp * 1000;
      const remainingTime = expirationTime - Date.now();

      return Math.max(0, Math.floor(remainingTime / 1000));
    } catch {
      return 0;
    }
  }

  /**
   * 从 Authorization header 中提取 Token
   * @param authHeader Authorization header 值
   */
  public extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}

// 导出便捷实例
export const jwtUtil = new JwtUtil();
