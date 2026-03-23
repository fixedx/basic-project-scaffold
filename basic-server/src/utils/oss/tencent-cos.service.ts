import COS = require('cos-nodejs-sdk-v5');
import {
  IOssService,
  OssUploadConfig,
  OssUploadResult,
  OssSignedUrlConfig,
} from './oss.interface';

/**
 * 腾讯云 COS 配置
 */
export interface TencentCosConfig {
  secretId: string;
  secretKey: string;
  bucket: string;
  region: string;
  /** 自定义域名（可选） */
  customDomain?: string;
}

/**
 * 腾讯云 COS 服务实现
 */
export class TencentCosService implements IOssService {
  private client: COS;
  private config: TencentCosConfig;

  constructor(config: TencentCosConfig) {
    this.config = config;
    this.client = new COS({
      SecretId: config.secretId,
      SecretKey: config.secretKey,
    });
  }

  async upload(config: OssUploadConfig): Promise<OssUploadResult> {
    return new Promise((resolve, reject) => {
      this.client.putObject(
        {
          Bucket: this.config.bucket,
          Region: this.config.region,
          Key: config.filePath,
          Body: config.fileContent,
          ContentType: config.contentType,
          ACL: config.isPublic ? 'public-read' : 'private',
        },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              url: this.getPublicUrl(config.filePath),
              path: config.filePath,
              size: 0, // COS 不直接返回大小
              etag: data.ETag,
            });
          }
        },
      );
    });
  }

  async download(filePath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.client.getObject(
        {
          Bucket: this.config.bucket,
          Region: this.config.region,
          Key: filePath,
        },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data.Body);
          }
        },
      );
    });
  }

  async delete(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.deleteObject(
        {
          Bucket: this.config.bucket,
          Region: this.config.region,
          Key: filePath,
        },
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });
  }

  async batchDelete(filePaths: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.deleteMultipleObject(
        {
          Bucket: this.config.bucket,
          Region: this.config.region,
          Objects: filePaths.map((key) => ({ Key: key })),
        },
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });
  }

  async exists(filePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client.headObject(
        {
          Bucket: this.config.bucket,
          Region: this.config.region,
          Key: filePath,
        },
        (err) => {
          if (err) {
            if (err.statusCode === 404) {
              resolve(false);
            } else {
              reject(err);
            }
          } else {
            resolve(true);
          }
        },
      );
    });
  }

  async getSignedUrl(config: OssSignedUrlConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.getObjectUrl(
        {
          Bucket: this.config.bucket,
          Region: this.config.region,
          Key: config.filePath,
          Sign: true,
          Expires: config.expiresIn || 3600,
          Query: config.downloadFilename
            ? {
                'response-content-disposition': `attachment; filename="${encodeURIComponent(config.downloadFilename)}"`,
              }
            : undefined,
        },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data.Url);
          }
        },
      );
    });
  }

  getPublicUrl(filePath: string): string {
    if (this.config.customDomain) {
      return `https://${this.config.customDomain}/${filePath}`;
    }
    return `https://${this.config.bucket}.cos.${this.config.region}.myqcloud.com/${filePath}`;
  }

  async copy(sourcePath: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.putObjectCopy(
        {
          Bucket: this.config.bucket,
          Region: this.config.region,
          Key: destPath,
          CopySource: `${this.config.bucket}.cos.${this.config.region}.myqcloud.com/${sourcePath}`,
        },
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });
  }

  async move(sourcePath: string, destPath: string): Promise<void> {
    await this.copy(sourcePath, destPath);
    await this.delete(sourcePath);
  }
}
