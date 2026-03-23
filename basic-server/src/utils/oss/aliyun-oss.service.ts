import * as OSS from 'ali-oss';
import {
  IOssService,
  OssUploadConfig,
  OssUploadResult,
  OssSignedUrlConfig,
} from './oss.interface';

/**
 * 阿里云 OSS 配置
 */
export interface AliyunOssConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  /** 自定义域名（可选） */
  customDomain?: string;
  /** 是否使用内网访问 */
  internal?: boolean;
}

/**
 * 阿里云 OSS 服务实现
 */
export class AliyunOssService implements IOssService {
  private client: OSS;
  private config: AliyunOssConfig;

  constructor(config: AliyunOssConfig) {
    this.config = config;
    this.client = new OSS({
      region: config.region,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      bucket: config.bucket,
      internal: config.internal,
    });
  }

  async upload(config: OssUploadConfig): Promise<OssUploadResult> {
    const result = await this.client.put(config.filePath, config.fileContent, {
      headers: config.contentType
        ? { 'Content-Type': config.contentType }
        : undefined,
    });

    // 设置 ACL
    if (config.isPublic) {
      await this.client.putACL(config.filePath, 'public-read');
    }

    return {
      url: this.getPublicUrl(config.filePath),
      path: config.filePath,
      size: result.res.size,
      etag: result.etag,
    };
  }

  async download(filePath: string): Promise<Buffer> {
    const result = await this.client.get(filePath);
    return result.content as Buffer;
  }

  async delete(filePath: string): Promise<void> {
    await this.client.delete(filePath);
  }

  async batchDelete(filePaths: string[]): Promise<void> {
    await this.client.deleteMulti(filePaths);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await this.client.head(filePath);
      return true;
    } catch (error: any) {
      if (error.code === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  async getSignedUrl(config: OssSignedUrlConfig): Promise<string> {
    const options: any = {
      expires: config.expiresIn || 3600,
    };

    if (config.downloadFilename) {
      options.response = {
        'content-disposition': `attachment; filename="${encodeURIComponent(config.downloadFilename)}"`,
      };
    }

    return this.client.signatureUrl(config.filePath, options);
  }

  getPublicUrl(filePath: string): string {
    if (this.config.customDomain) {
      return `https://${this.config.customDomain}/${filePath}`;
    }
    return `https://${this.config.bucket}.${this.config.region}.aliyuncs.com/${filePath}`;
  }

  async copy(sourcePath: string, destPath: string): Promise<void> {
    await this.client.copy(destPath, sourcePath);
  }

  async move(sourcePath: string, destPath: string): Promise<void> {
    await this.copy(sourcePath, destPath);
    await this.delete(sourcePath);
  }
}
