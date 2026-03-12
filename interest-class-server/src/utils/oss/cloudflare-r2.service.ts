import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  IOssService,
  OssUploadConfig,
  OssUploadResult,
  OssSignedUrlConfig,
} from './oss.interface';

/**
 * Cloudflare R2 配置
 */
export interface CloudflareR2Config {
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  /** S3 API endpoint */
  endpoint: string;
}

/**
 * Cloudflare R2 服务实现（兼容 S3 API）
 */
export class CloudflareR2Service implements IOssService {
  private client: S3Client;
  private config: CloudflareR2Config;

  constructor(config: CloudflareR2Config) {
    this.config = config;

    this.client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async upload(config: OssUploadConfig): Promise<OssUploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: config.filePath,
      Body: config.fileContent,
      ContentType: config.contentType,
      // R2 不支持 ACL，移除
    });

    const result = await this.client.send(command);

    return {
      url: '', // R2 不返回公开 URL，前端使用 path + preview-url 接口
      path: config.filePath,
      size: Buffer.isBuffer(config.fileContent)
        ? config.fileContent.length
        : Buffer.from(config.fileContent).length,
      etag: result.ETag,
    };
  }

  async download(filePath: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucketName,
      Key: filePath,
    });

    const result = await this.client.send(command);
    const stream = result.Body as any;

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async delete(filePath: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucketName,
      Key: filePath,
    });

    await this.client.send(command);
  }

  async batchDelete(filePaths: string[]): Promise<void> {
    const command = new DeleteObjectsCommand({
      Bucket: this.config.bucketName,
      Delete: {
        Objects: filePaths.map((key) => ({ Key: key })),
      },
    });

    await this.client.send(command);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: filePath,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  async getSignedUrl(config: OssSignedUrlConfig): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucketName,
      Key: config.filePath,
      ResponseContentDisposition: config.downloadFilename
        ? `attachment; filename="${encodeURIComponent(config.downloadFilename)}"`
        : undefined,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: config.expiresIn || 3600,
    });
  }

  getPublicUrl(filePath: string): string {
    // Cloudflare R2 不支持直接公开访问，返回空字符串
    // 前端应使用 /oss/preview-url 接口获取临时访问链接
    return '';
  }

  async copy(sourcePath: string, destPath: string): Promise<void> {
    const command = new CopyObjectCommand({
      Bucket: this.config.bucketName,
      CopySource: `${this.config.bucketName}/${sourcePath}`,
      Key: destPath,
    });

    await this.client.send(command);
  }

  async move(sourcePath: string, destPath: string): Promise<void> {
    await this.copy(sourcePath, destPath);
    await this.delete(sourcePath);
  }
}
