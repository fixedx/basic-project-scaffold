import * as crypto from 'crypto';

/**
 * 加解密工具类
 */
export class CryptoUtil {
  private static instance: CryptoUtil;

  // 默认算法
  private readonly algorithm = 'aes-256-cbc';

  // 密钥长度
  private readonly keyLength = 32;

  // IV 长度
  private readonly ivLength = 16;

  // 默认密钥（从环境变量获取）
  private readonly defaultSecret: string;

  private constructor() {
    this.defaultSecret =
      process.env.CRYPTO_SECRET || 'your-crypto-secret-key-change-this';
  }

  public static getInstance(): CryptoUtil {
    if (!CryptoUtil.instance) {
      CryptoUtil.instance = new CryptoUtil();
    }
    return CryptoUtil.instance;
  }

  /**
   * 生成密钥（基于密码）
   */
  private generateKey(secret: string): Buffer {
    return crypto.scryptSync(secret, 'salt', this.keyLength);
  }

  /**
   * AES 加密
   * @param text 明文
   * @param secret 密钥（可选）
   */
  public encrypt(text: string, secret?: string): string {
    try {
      const key = this.generateKey(secret || this.defaultSecret);
      const iv = crypto.randomBytes(this.ivLength);

      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // 将 IV 和加密后的数据组合在一起
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      throw new Error(`加密失败: ${message}`);
    }
  }

  /**
   * AES 解密
   * @param encryptedText 密文
   * @param secret 密钥（可选）
   */
  public decrypt(encryptedText: string, secret?: string): string {
    try {
      const key = this.generateKey(secret || this.defaultSecret);

      // 分离 IV 和加密数据
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        throw new Error('无效的加密文本格式');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      throw new Error(`解密失败: ${message}`);
    }
  }

  /**
   * MD5 哈希
   * @param text 文本
   */
  public md5(text: string): string {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  /**
   * SHA256 哈希
   * @param text 文本
   */
  public sha256(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * SHA512 哈希
   * @param text 文本
   */
  public sha512(text: string): string {
    return crypto.createHash('sha512').update(text).digest('hex');
  }

  /**
   * HMAC-SHA256 签名
   * @param text 文本
   * @param secret 密钥
   */
  public hmacSha256(text: string, secret?: string): string {
    const key = secret || this.defaultSecret;
    return crypto.createHmac('sha256', key).update(text).digest('hex');
  }

  /**
   * 生成随机字符串
   * @param length 长度
   */
  public randomString(length: number = 32): string {
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  /**
   * 生成随机数字
   * @param min 最小值
   * @param max 最大值
   */
  public randomNumber(min: number = 0, max: number = 1000000): number {
    return crypto.randomInt(min, max + 1);
  }

  /**
   * Base64 编码
   * @param text 文本
   */
  public base64Encode(text: string): string {
    return Buffer.from(text, 'utf8').toString('base64');
  }

  /**
   * Base64 解码
   * @param encodedText Base64 编码的文本
   */
  public base64Decode(encodedText: string): string {
    return Buffer.from(encodedText, 'base64').toString('utf8');
  }

  /**
   * 密码哈希（使用 bcrypt 风格，但这里用 scrypt）
   * @param password 密码
   * @param saltRounds 盐的轮次（可选）
   */
  public async hashPassword(
    password: string,
    saltRounds: number = 10,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');

      crypto.scrypt(
        password,
        salt,
        64,
        { N: Math.pow(2, saltRounds) },
        (err, derivedKey) => {
          if (err) reject(err);
          // 格式：saltRounds:salt:hash
          resolve(saltRounds + ':' + salt + ':' + derivedKey.toString('hex'));
        },
      );
    });
  }

  /**
   * 验证密码
   * @param password 密码
   * @param hash 哈希值（格式：saltRounds:salt:hash）
   */
  public async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const parts = hash.split(':');

      // 兼容旧格式（salt:hash）和新格式（saltRounds:salt:hash）
      let saltRounds: number;
      let salt: string;
      let key: string;

      if (parts.length === 3) {
        // 新格式：saltRounds:salt:hash
        saltRounds = parseInt(parts[0], 10);
        salt = parts[1];
        key = parts[2];
      } else if (parts.length === 2) {
        // 旧格式：salt:hash（使用默认 saltRounds）
        saltRounds = 10;
        salt = parts[0];
        key = parts[1];
      } else {
        reject(new Error('无效的哈希格式'));
        return;
      }

      crypto.scrypt(
        password,
        salt,
        64,
        { N: Math.pow(2, saltRounds) },
        (err, derivedKey) => {
          if (err) reject(err);
          resolve(key === derivedKey.toString('hex'));
        },
      );
    });
  }

  /**
   * 生成 UUID
   */
  public uuid(): string {
    return crypto.randomUUID();
  }
}

// 导出便捷实例
export const cryptoUtil = CryptoUtil.getInstance();

// 导出便捷方法
export const encrypt = (text: string, secret?: string) =>
  cryptoUtil.encrypt(text, secret);
export const decrypt = (text: string, secret?: string) =>
  cryptoUtil.decrypt(text, secret);
export const md5 = (text: string) => cryptoUtil.md5(text);
export const sha256 = (text: string) => cryptoUtil.sha256(text);
export const sha512 = (text: string) => cryptoUtil.sha512(text);
export const randomString = (length?: number) =>
  cryptoUtil.randomString(length);
export const randomNumber = (min?: number, max?: number) =>
  cryptoUtil.randomNumber(min, max);
export const uuid = () => cryptoUtil.uuid();
export const hashPassword = (password: string, saltRounds?: number) =>
  cryptoUtil.hashPassword(password, saltRounds);
export const verifyPassword = (password: string, hash: string) =>
  cryptoUtil.verifyPassword(password, hash);
