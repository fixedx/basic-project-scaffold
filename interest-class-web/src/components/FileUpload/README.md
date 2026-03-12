# FileUpload 文件上传组件

通用的文件上传组件，封装了后端上传逻辑，支持图片、视频等文件类型。

## 功能特性

- ✅ 支持单文件和多文件上传
- ✅ 自动调用后端 OSS 上传接口
- ✅ 支持 v-model 双向绑定
- ✅ 支持图片、视频等不同文件类型
- ✅ 支持自定义文件大小限制
- ✅ 支持自定义上传路径前缀
- ✅ 自动处理 H5 和小程序平台差异
- ✅ 内置加载提示和错误处理

## 基础用法

### 单文件上传

```vue
<template>
  <FileUpload v-model="logoUrl" :limit="1" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileUpload from '@/components/FileUpload/index.vue'

const logoUrl = ref('')
</script>
```

### 多文件上传

```vue
<template>
  <FileUpload 
    v-model="imageUrls" 
    :limit="9" 
    :multiple="true" 
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileUpload from '@/components/FileUpload/index.vue'

const imageUrls = ref<string[]>([])
</script>
```

## Props

| 参数 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| modelValue | v-model 绑定值，单文件为 string，多文件为 string[] | `string \| string[]` | `[]` |
| limit | 最大上传数量 | `number` | `1` |
| maxSize | 单个文件最大大小（字节） | `number` | `2097152` (2MB) |
| accept | 接受的文件类型 | `'image' \| 'video' \| 'all'` | `'image'` |
| fileType | 文件显示类型：image-图片预览，file-文件列表 | `'image' \| 'file'` | `'image'` |
| multiple | 是否支持多选 | `boolean` | `false` |
| disabled | 是否禁用 | `boolean` | `false` |
| pathPrefix | 自定义上传路径前缀 | `string` | `'uploads'` |
| isPublic | 是否公开访问 | `boolean` | `true` |

## Events

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| update:modelValue | v-model 更新事件 | `(value: string \| string[])` |
| success | 上传成功事件 | `(urls: string[])` |
| fail | 上传失败事件 | `(error: any)` |

## Slots

| 插槽名 | 说明 |
|--------|------|
| default | 自定义上传按钮内容 |

## 使用示例

### 示例 1：机构 Logo 上传

```vue
<template>
  <view class="form-group">
    <view class="form-label required">机构Logo</view>
    <FileUpload 
      v-model="form.logo" 
      :limit="1"
      :max-size="2 * 1024 * 1024"
      path-prefix="institutions/logos"
      @success="handleLogoSuccess"
    />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileUpload from '@/components/FileUpload/index.vue'

const form = ref({
  logo: ''
})

const handleLogoSuccess = (urls: string[]) => {
  console.log('Logo 上传成功:', urls[0])
}
</script>
```

### 示例 2：环境相册上传

```vue
<template>
  <view class="form-group">
    <view class="form-label">环境相册（最多9张）</view>
    <FileUpload 
      v-model="form.environmentImgs" 
      :limit="9"
      :multiple="true"
      path-prefix="institutions/environment"
    />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileUpload from '@/components/FileUpload/index.vue'

const form = ref({
  environmentImgs: [] as string[]
})
</script>
```

### 示例 3：身份证上传（多个独立组件）

```vue
<template>
  <view class="id-card-upload">
    <view class="upload-item">
      <text class="upload-label">正面</text>
      <FileUpload 
        v-model="form.idCardFront" 
        :limit="1"
        path-prefix="institutions/id-cards"
      />
    </view>
    <view class="upload-item">
      <text class="upload-label">反面</text>
      <FileUpload 
        v-model="form.idCardBack" 
        :limit="1"
        path-prefix="institutions/id-cards"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileUpload from '@/components/FileUpload/index.vue'

const form = ref({
  idCardFront: '',
  idCardBack: ''
})
</script>

<style lang="scss" scoped>
.id-card-upload {
  display: flex;
  gap: 32rpx;
}

.upload-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.upload-label {
  font-size: 28rpx;
  color: $uni-text-color-secondary;
}
</style>
```

### 示例 4：视频上传

```vue
<template>
  <view class="form-group">
    <view class="form-label">宣传视频</view>
    <FileUpload 
      v-model="form.videoUrl" 
      :limit="1"
      accept="video"
      :max-size="50 * 1024 * 1024"
      path-prefix="institutions/videos"
    />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileUpload from '@/components/FileUpload/index.vue'

const form = ref({
  videoUrl: ''
})
</script>
```

### 示例 5：自定义上传按钮

```vue
<template>
  <FileUpload v-model="form.logo" :limit="1">
    <view class="custom-upload-btn">
      <wd-icon name="add" size="48rpx" />
      <text>上传图片</text>
    </view>
  </FileUpload>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileUpload from '@/components/FileUpload/index.vue'

const form = ref({
  logo: ''
})
</script>

<style lang="scss" scoped>
.custom-upload-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 200rpx;
  height: 200rpx;
  background-color: $uni-bg-color-grey;
  border-radius: 16rpx;
  color: $uni-text-color-tertiary;
  font-size: 24rpx;
}
</style>
```

## 注意事项

1. **文件路径**: 组件会自动生成唯一的文件路径，格式为 `{pathPrefix}/{timestamp}-{random}.{ext}`
2. **平台差异**: 组件内部已处理 H5 和小程序的文件路径获取差异
3. **错误处理**: 上传失败时会自动显示 Toast 提示
4. **加载提示**: 上传过程中会显示 "上传中..." 的加载提示
5. **v-model 类型**: 
   - 当 `limit=1` 时，modelValue 为 `string`
   - 当 `limit>1` 时，modelValue 为 `string[]`

## 与原生 wd-upload 的区别

| 特性 | wd-upload | FileUpload |
|------|-----------|------------|
| 上传方式 | 需要手动实现 | 自动调用后端接口 |
| 路径管理 | 需要手动生成 | 自动生成唯一路径 |
| 平台兼容 | 需要手动处理 | 自动处理差异 |
| v-model | 不支持 | 支持双向绑定 URL |
| 加载提示 | 需要手动添加 | 内置 |
| 错误处理 | 需要手动添加 | 内置 |

## 完整表单示例

```vue
<template>
  <view class="form-wrapper">
    <view class="form-group">
      <view class="form-label required">机构Logo</view>
      <FileUpload 
        v-model="form.logo" 
        :limit="1"
        path-prefix="institutions/logos"
      />
    </view>

    <view class="form-group">
      <view class="form-label">环境相册（最多9张）</view>
      <FileUpload 
        v-model="form.environmentImgs" 
        :limit="9"
        :multiple="true"
        path-prefix="institutions/environment"
      />
    </view>

    <view class="form-group">
      <view class="form-label required">营业执照</view>
      <FileUpload 
        v-model="form.licenseImg" 
        :limit="1"
        path-prefix="institutions/licenses"
      />
    </view>

    <wd-button type="primary" @click="handleSubmit" block>
      提交
    </wd-button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileUpload from '@/components/FileUpload/index.vue'

const form = ref({
  logo: '',
  environmentImgs: [] as string[],
  licenseImg: ''
})

const handleSubmit = () => {
  console.log('表单数据:', form.value)
  // 提交表单，所有字段都是 URL 字符串
}
</script>

<style lang="scss" scoped>
.form-wrapper {
  padding: 32rpx;
}

.form-group {
  margin-bottom: 32rpx;
}

.form-label {
  font-size: 28rpx;
  color: $uni-text-color;
  margin-bottom: 16rpx;
  
  &.required::before {
    content: '*';
    color: $uni-color-error;
    margin-right: 8rpx;
  }
}
</style>
```
