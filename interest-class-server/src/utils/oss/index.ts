import { IOssService } from './oss.interface';
import { AliyunOssService, AliyunOssConfig } from './aliyun-oss.service';
import { TencentCosService, TencentCosConfig } from './tencent-cos.service';
import { QiniuKodoService, QiniuKodoConfig } from './qiniu-kodo.service';
import {
  CloudflareR2Service,
  CloudflareR2Config,
} from './cloudflare-r2.service';

/**
 * OSS 服务类型
 */
export enum OssProvider {
  ALIYUN = 'aliyun',
  TENCENT = 'tencent',
  QINIU = 'qiniu',
  CLOUDFLARE = 'cloudflare',
}

/**
 * OSS 配置联合类型
 */
export type OssConfig =
  | { provider: OssProvider.ALIYUN; config: AliyunOssConfig }
  | { provider: OssProvider.TENCENT; config: TencentCosConfig }
  | { provider: OssProvider.QINIU; config: QiniuKodoConfig }
  | { provider: OssProvider.CLOUDFLARE; config: CloudflareR2Config };

/**
 * OSS 工厂类
 */
export class OssFactory {
  /**
   * 创建 OSS 服务实例
   */
  static create(ossConfig: OssConfig): IOssService {
    switch (ossConfig.provider) {
      case OssProvider.ALIYUN:
        return new AliyunOssService(ossConfig.config);

      case OssProvider.TENCENT:
        return new TencentCosService(ossConfig.config);

      case OssProvider.QINIU:
        return new QiniuKodoService(ossConfig.config);

      case OssProvider.CLOUDFLARE:
        return new CloudflareR2Service(ossConfig.config);

      default:
        throw new Error(
          `Unsupported OSS provider: ${(ossConfig as any).provider}`,
        );
    }
  }

  /**
   * 从环境变量创建 OSS 服务实例
   */
  static createFromEnv(): IOssService {
    const provider = process.env.ACTIVE_OSS as OssProvider;

    if (!provider) {
      throw new Error('ACTIVE_OSS environment variable is not set');
    }

    switch (provider) {
      case OssProvider.ALIYUN:
        return new AliyunOssService({
          region: process.env.ALIYUN_OSS_REGION!,
          accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID!,
          accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET!,
          bucket: process.env.ALIYUN_OSS_BUCKET!,
          customDomain: process.env.ALIYUN_OSS_CUSTOM_DOMAIN,
          internal: process.env.ALIYUN_OSS_INTERNAL === 'true',
        });

      case OssProvider.TENCENT:
        return new TencentCosService({
          secretId: process.env.TENCENT_COS_SECRET_ID!,
          secretKey: process.env.TENCENT_COS_SECRET_KEY!,
          bucket: process.env.TENCENT_COS_BUCKET!,
          region: process.env.TENCENT_COS_REGION!,
          customDomain: process.env.TENCENT_COS_CUSTOM_DOMAIN,
        });

      case OssProvider.QINIU:
        return new QiniuKodoService({
          accessKey: process.env.QINIU_ACCESS_KEY!,
          secretKey: process.env.QINIU_SECRET_KEY!,
          bucket: process.env.QINIU_BUCKET!,
          zone: process.env.QINIU_ZONE as any,
          domain: process.env.QINIU_DOMAIN!,
          useHttps: process.env.QINIU_USE_HTTPS !== 'false',
        });

      case OssProvider.CLOUDFLARE:
        return new CloudflareR2Service({
          accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
          secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
          bucketName: process.env.CLOUDFLARE_BUCKET_NAME!,
          endpoint: process.env.CLOUDFLARE_ENDPOINT!,
        });

      default:
        throw new Error(`Unsupported OSS provider: ${provider}`);
    }
  }

  /**
   * 获取当前激活的 OSS 客户端（从 ACTIVE_OSS 环境变量读取）
   */
  static getActiveClient(): IOssService {
    return this.createFromEnv();
  }
}

/**
 * 默认导出
 */
export * from './oss.interface';
export * from './aliyun-oss.service';
export * from './tencent-cos.service';
export * from './qiniu-kodo.service';
export * from './cloudflare-r2.service';
