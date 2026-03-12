# OSS 多云存储工具

支持多个云存储服务商的统一接口工具，使用接口多态设计模式实现。

## 支持的云服务商

- ✅ 阿里云 OSS (Aliyun OSS)
- ✅ 腾讯云 COS (Tencent COS)
- ✅ 七牛云 Kodo (Qiniu Kodo)
- ✅ Cloudflare R2 (兼容 S3 API)

## 功能特性

- 📤 文件上传
- 📥 文件下载
- 🗑️ 文件删除（单个/批量）
- 🔍 文件存在性检查
- 🔗 临时签名 URL 生成
- 🌐 公开访问 URL 获取
- 📋 文件复制
- 🔄 文件移动

## 安装依赖

```bash
# 阿里云 OSS
pnpm add ali-oss

# 腾讯云 COS
pnpm add cos-nodejs-sdk-v5

# 七牛云 Kodo
pnpm add qiniu

# Cloudflare R2 (AWS SDK)
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## 使用示例

### 1. 使用工厂模式创建实例

```typescript
import { OssFactory, OssProvider } from '@/utils/oss';

// 阿里云 OSS
const ossService = OssFactory.create({
  provider: OssProvider.ALIYUN,
  config: {
    region: 'oss-cn-hangzhou',
    accessKeyId: 'your-access-key-id',
    accessKeySecret: 'your-access-key-secret',
    bucket: 'your-bucket-name',
    customDomain: 'cdn.example.com', // 可选
  },
});

// 腾讯云 COS
const ossService = OssFactory.create({
  provider: OssProvider.TENCENT,
  config: {
    secretId: 'your-secret-id',
    secretKey: 'your-secret-key',
    bucket: 'your-bucket-name',
    region: 'ap-guangzhou',
  },
});

// 七牛云 Kodo
const ossService = OssFactory.create({
  provider: OssProvider.QINIU,
  config: {
    accessKey: 'your-access-key',
    secretKey: 'your-secret-key',
    bucket: 'your-bucket-name',
    zone: 'z0',
    domain: 'cdn.example.com', // 必填
  },
});

// Cloudflare R2
const ossService = OssFactory.create({
  provider: OssProvider.CLOUDFLARE,
  config: {
    accountId: 'your-account-id',
    accessKeyId: 'your-access-key-id',
    secretAccessKey: 'your-secret-access-key',
    bucketName: 'your-bucket-name',
  },
});
```

### 2. 从环境变量创建实例

```typescript
// .env 文件配置
ACTIVE_OSS=aliyun
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_ACCESS_KEY_ID=your-key
ALIYUN_OSS_ACCESS_KEY_SECRET=your-secret
ALIYUN_OSS_BUCKET=your-bucket

// 代码中使用
const ossService = OssFactory.createFromEnv();
// 或使用 get_oss_client() 快捷方法
import { get_oss_client } from '@/utils/oss/get-client';
const oss = get_oss_client();
```

### 3. 上传文件

```typescript
const result = await ossService.upload({
  filePath: 'images/avatar.jpg',
  fileContent: buffer, // Buffer 或 string
  contentType: 'image/jpeg',
  isPublic: true,
});

console.log(result.url); // 访问 URL
console.log(result.path); // 文件路径
console.log(result.size); // 文件大小
```

### 4. 下载文件

```typescript
const buffer = await ossService.download('images/avatar.jpg');
```

### 5. 删除文件

```typescript
// 单个删除
await ossService.delete('images/avatar.jpg');

// 批量删除
await ossService.batchDelete([
  'images/avatar1.jpg',
  'images/avatar2.jpg',
]);
```

### 6. 获取临时签名 URL

```typescript
const url = await ossService.getSignedUrl({
  filePath: 'documents/private.pdf',
  expiresIn: 3600, // 1小时后过期
  downloadFilename: '下载文件名.pdf',
});
```

### 7. 获取公开访问 URL

```typescript
const url = ossService.getPublicUrl('images/avatar.jpg');
```

### 8. 文件操作

```typescript
// 复制文件
await ossService.copy('source/file.jpg', 'dest/file.jpg');

// 移动文件
await ossService.move('old/path.jpg', 'new/path.jpg');

// 检查文件是否存在
const exists = await ossService.exists('images/avatar.jpg');
```

## 环境变量配置

### 阿里云 OSS

```env
ACTIVE_OSS=aliyun
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_ACCESS_KEY_ID=your-key
ALIYUN_OSS_ACCESS_KEY_SECRET=your-secret
ALIYUN_OSS_BUCKET=your-bucket
ALIYUN_OSS_CUSTOM_DOMAIN=cdn.example.com  # 可选
ALIYUN_OSS_INTERNAL=false  # 可选，是否使用内网
```

### 腾讯云 COS

```env
ACTIVE_OSS=tencent
TENCENT_COS_SECRET_ID=your-secret-id
TENCENT_COS_SECRET_KEY=your-secret-key
TENCENT_COS_BUCKET=your-bucket
TENCENT_COS_REGION=ap-guangzhou
TENCENT_COS_CUSTOM_DOMAIN=cdn.example.com  # 可选
```

### 七牛云 Kodo

```env
ACTIVE_OSS=qiniu
QINIU_ACCESS_KEY=your-access-key
QINIU_SECRET_KEY=your-secret-key
QINIU_BUCKET=your-bucket
QINIU_ZONE=z0  # z0/z1/z2/na0/as0
QINIU_DOMAIN=cdn.example.com  # 必填
QINIU_USE_HTTPS=true  # 可选
```

### Cloudflare R2

```env
ACTIVE_OSS=cloudflare
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_ACCESS_KEY_ID=your-access-key-id
CLOUDFLARE_SECRET_ACCESS_KEY=your-secret-access-key
CLOUDFLARE_BUCKET_NAME=your-bucket
CLOUDFLARE_CUSTOM_DOMAIN=cdn.example.com  # 可选
```

## 在 NestJS 中使用

```typescript
import { Injectable } from '@nestjs/common';
import { IOssService, OssFactory } from '@/utils/oss';

@Injectable()
export class UploadService {
  private ossService: IOssService;

  constructor() {
    this.ossService = OssFactory.createFromEnv();
  }

  async uploadFile(file: Express.Multer.File) {
    const filePath = `uploads/${Date.now()}-${file.originalname}`;
    
    const result = await this.ossService.upload({
      filePath,
      fileContent: file.buffer,
      contentType: file.mimetype,
      isPublic: true,
    });

    return result;
  }
}
```

## 注意事项

1. **七牛云**：必须配置自定义域名才能访问文件
2. **Cloudflare R2**：使用 AWS S3 兼容 API
3. **临时 URL**：不同云服务商的签名 URL 有效期限制不同
4. **文件大小**：注意各云服务商的单文件大小限制

## 扩展新的云服务商

实现 `IOssService` 接口即可：

```typescript
import { IOssService } from './oss.interface';

export class CustomOssService implements IOssService {
  async upload(config: OssUploadConfig): Promise<OssUploadResult> {
    // 实现上传逻辑
  }
  
  // 实现其他接口方法...
}
```
