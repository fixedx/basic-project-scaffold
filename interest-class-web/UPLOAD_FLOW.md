# 文件上传流程说明

## 概述

前端的机构入驻表单中的所有文件上传功能已修改为使用后端的 OSS 上传接口，而不是直接从前端上传到 OSS。

## 上传流程

### 1. 用户选择文件
用户在 `wd-upload` 组件中选择文件后，组件会触发 `before-upload` 钩子。

### 2. before-upload 处理
```typescript
const handleBeforeUpload = async (file: any) => {
  // 1. 获取文件的临时路径
  // 2. 生成唯一的存储路径（institutions/时间戳-随机数.扩展名）
  // 3. 调用后端 /api/oss/upload 接口上传
  // 4. 返回上传后的 URL
}
```

### 3. 后端处理
- **接口**: `POST /api/oss/upload`
- **参数**: 
  - `file`: 文件（multipart/form-data）
  - `filePath`: 自定义存储路径（可选）
  - `isPublic`: 是否公开访问（默认 true）
- **返回**: 
  ```json
  {
    "code": 200,
    "data": {
      "url": "https://...",
      "path": "institutions/...",
      "size": 123456
    }
  }
  ```

### 4. 成功回调
上传成功后，组件触发 `@success` 事件，在回调中将 URL 保存到表单数据：

```typescript
const handleLogoSuccess = (files: any) => {
  formData.value.logo = files[0]?.url || ''
}
```

### 5. 提交表单
提交表单时，只提交上传后的 URL 地址，不再处理文件上传。

## 涉及的文件

### 前端
1. **页面**: `src/pages/institution-settle/index.vue`
   - 所有 `wd-upload` 组件都使用了 `:before-upload="handleBeforeUpload"`
   - 实现了自定义上传逻辑

2. **API**: `src/api/oss.ts`
   - `ossApi.upload()` 方法调用后端上传接口

3. **工具类**: `src/utils/request.ts`
   - 新增 `upload()` 方法支持文件上传

### 后端
1. **控制器**: `src/modules/oss/oss.controller.ts`
   - `POST /oss/upload` 接口处理文件上传

2. **服务**: `src/modules/oss/oss.service.ts`
   - 调用 OSS 客户端完成实际上传

3. **OSS 工具**: `src/utils/oss/`
   - 支持多种 OSS 服务（阿里云、腾讯云、七牛、Cloudflare R2）

## 上传的文件类型

1. **机构 Logo** - 单张图片
2. **环境相册** - 最多 9 张图片
3. **营业执照** - 单张图片
4. **法人身份证正面** - 单张图片
5. **法人身份证反面** - 单张图片
6. **更多环境照片** - 最多 20 张图片

## 存储路径规则

所有文件统一存储在 `institutions/` 目录下，文件名格式：
```
institutions/{timestamp}-{randomStr}.{ext}
```

例如：`institutions/1703145678901-abc123.jpg`

## 注意事项

1. **文件大小限制**: 2MB（在组件的 `max-size` 属性中配置）
2. **文件类型限制**: 仅限图片（在组件的 `accept` 属性中配置为 `image`）
3. **H5 与小程序差异**: 代码中使用了条件编译处理不同平台的文件路径获取方式
4. **错误处理**: 上传失败时会显示 Toast 提示

## 环境配置

后端需要配置 OSS 相关的环境变量（以 Cloudflare R2 为例）：

```env
ACTIVE_OSS=cloudflare
CLOUDFLARE_ENDPOINT=https://your-endpoint.r2.cloudflarestorage.com
CLOUDFLARE_ACCESS_KEY_ID=xxx
CLOUDFLARE_SECRET_ACCESS_KEY=xxx
CLOUDFLARE_BUCKET_NAME=your-bucket
CLOUDFLARE_CUSTOM_DOMAIN=cdn.example.com
```

## 测试步骤

1. 启动后端服务
2. 启动前端应用（H5 或小程序）
3. 进入机构入驻页面
4. 选择图片上传
5. 观察网络请求是否正确发送到 `/api/oss/upload`
6. 检查上传成功后的 URL 是否正确显示
7. 提交表单，确认提交的是 URL 而不是文件
