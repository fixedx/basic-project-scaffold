import * as qiniu from 'qiniu';
import {
  IOssService,
  OssUploadConfig,
  OssUploadResult,
  OssSignedUrlConfig,
} from './oss.interface';

/**
 * 七牛云 Kodo 配置
 */
export interface QiniuKodoConfig {
  accessKey: string;
  secretKey: string;
  bucket: string;
  /** 存储区域 */
  zone: 'z0' | 'z1' | 'z2' | 'na0' | 'as0';
  /** 自定义域名（必填，七牛云需要绑定域名才能访问） */
  domain: string;
  /** 是否使用 HTTPS */
  useHttps?: boolean;
}

/**
 * 七牛云 Kodo 服务实现
 */
export class QiniuKodoService implements IOssService {
  private config: QiniuKodoConfig;
  private mac: qiniu.auth.digest.Mac;
  private bucketManager: qiniu.rs.BucketManager;

  constructor(config: QiniuKodoConfig) {
    this.config = config;
    this.mac = new qiniu.auth.digest.Mac(config.accessKey, config.secretKey);

    const qiniuConfig = new qiniu.conf.Config();
    // @ts-ignore
    qiniuConfig.zone = qiniu.zone[`Zone_${config.zone}`];

    this.bucketManager = new qiniu.rs.BucketManager(this.mac, qiniuConfig);
  }

  async upload(config: OssUploadConfig): Promise<OssUploadResult> {
    const options: any = {
      scope: `${this.config.bucket}:${config.filePath}`,
    };

    const putPolicy = new qiniu.rs.PutPolicy(options);
    const uploadToken = putPolicy.uploadToken(this.mac);

    const qiniuConfig = new qiniu.conf.Config();
    // @ts-ignore
    qiniuConfig.zone = qiniu.zone[`Zone_${this.config.zone}`];

    const formUploader = new qiniu.form_up.FormUploader(qiniuConfig);
    const putExtra = new qiniu.form_up.PutExtra();

    return new Promise((resolve, reject) => {
      formUploader.put(
        uploadToken,
        config.filePath,
        config.fileContent,
        putExtra,
        (err, body, info) => {
          if (err) {
            reject(err);
          } else if (info.statusCode === 200) {
            resolve({
              url: this.getPublicUrl(config.filePath),
              path: config.filePath,
              size: body.fsize || 0,
              etag: body.hash,
            });
          } else {
            reject(new Error(`Upload failed with status ${info.statusCode}`));
          }
        },
      );
    });
  }

  async download(filePath: string): Promise<Buffer> {
    const url = await this.getSignedUrl({ filePath });
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bucketManager.delete(
        this.config.bucket,
        filePath,
        (err, respBody, respInfo) => {
          if (err) {
            reject(err);
          } else if (respInfo.statusCode === 200) {
            resolve();
          } else {
            reject(
              new Error(`Delete failed with status ${respInfo.statusCode}`),
            );
          }
        },
      );
    });
  }

  async batchDelete(filePaths: string[]): Promise<void> {
    const deleteOps = filePaths.map((key) =>
      qiniu.rs.deleteOp(this.config.bucket, key),
    );

    return new Promise((resolve, reject) => {
      this.bucketManager.batch(deleteOps, (err, respBody, respInfo) => {
        if (err) {
          reject(err);
        } else if (respInfo.statusCode === 200) {
          resolve();
        } else {
          reject(
            new Error(`Batch delete failed with status ${respInfo.statusCode}`),
          );
        }
      });
    });
  }

  async exists(filePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.bucketManager.stat(
        this.config.bucket,
        filePath,
        (err, respBody, respInfo) => {
          if (err) {
            reject(err);
          } else if (respInfo.statusCode === 200) {
            resolve(true);
          } else if (respInfo.statusCode === 612) {
            // 文件不存在
            resolve(false);
          } else {
            reject(new Error(`Stat failed with status ${respInfo.statusCode}`));
          }
        },
      );
    });
  }

  async getSignedUrl(config: OssSignedUrlConfig): Promise<string> {
    const deadline = Math.floor(Date.now() / 1000) + (config.expiresIn || 3600);
    const privateDownloadUrl = this.bucketManager.privateDownloadUrl(
      this.config.domain,
      config.filePath,
      deadline,
    );
    return privateDownloadUrl;
  }

  getPublicUrl(filePath: string): string {
    const protocol = this.config.useHttps !== false ? 'https' : 'http';
    return `${protocol}://${this.config.domain}/${filePath}`;
  }

  async copy(sourcePath: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bucketManager.copy(
        this.config.bucket,
        sourcePath,
        this.config.bucket,
        destPath,
        { force: true },
        (err, respBody, respInfo) => {
          if (err) {
            reject(err);
          } else if (respInfo.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Copy failed with status ${respInfo.statusCode}`));
          }
        },
      );
    });
  }

  async move(sourcePath: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bucketManager.move(
        this.config.bucket,
        sourcePath,
        this.config.bucket,
        destPath,
        { force: true },
        (err, respBody, respInfo) => {
          if (err) {
            reject(err);
          } else if (respInfo.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Move failed with status ${respInfo.statusCode}`));
          }
        },
      );
    });
  }
}
