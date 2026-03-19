# AsyncImage 组件

异步加载 OSS 图片的组件，自动处理预览 URL 的获取和授权。

## 功能特性

- ✅ 自动获取 OSS 文件的预览 URL（带签名）
- ✅ 支持完整 URL 直接显示（跳过预览 URL 获取）
- ✅ 加载中状态显示
- ✅ 加载失败占位符
- ✅ 自定义过期时间
- ✅ 支持所有 uni-app image 组件的 mode
- ✅ 事件透传（load、error、click）
- ✅ 可选内置点击预览（自动处理 OSS path → 预览 URL）
- ✅ 暴露 reload 方法支持手动重新加载

## 基本使用

```vue
<template>
  <async-image 
    url="uploads/images/2024/12/example.jpg"
    mode="aspectFill"
    custom-class="my-image"
  />
</template>

<script setup>
import AsyncImage from '@/components/AsyncImage/index.vue'
</script>
```

## Props

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| url | string | - | 图片路径（OSS路径）或完整URL |
| mode | string | 'aspectFill' | 图片裁剪模式，同 uni-app image 组件 |
| customClass | string | '' | 自定义样式类名 |
| customStyle | string | '' | 自定义内联样式 |
| autoLoad | boolean | true | 是否自动加载 |
| expiresIn | number | 3600 | 预览URL过期时间（秒） |
| placeholderStyle | string | '' | 占位符样式 |
| enablePreview | boolean | false | 是否启用内置点击预览 |
| previewUrls | string[] | [] | 预览图片列表，不传则默认预览当前 url |
| previewCurrent | number \| string | '' | 预览当前项，支持索引或具体 URL |

## Events

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| load | 图片加载完成 | event |
| error | 图片加载失败 | event |
| click | 点击图片 | event |

## 使用场景

### 1. 机构 LOGO 显示

```vue
<async-image
  :url="institution.logo"
  mode="aspectFit"
  custom-class="logo-img"
  custom-style="width: 200rpx; height: 200rpx; border-radius: 16rpx;"
/>
```

### 2. 单图点击预览

```vue
<async-image
  :url="licenseImg"
  width="100%"
  height="400rpx"
  mode="aspectFit"
  :enable-preview="true"
/>
```

### 3. 多图点击预览

```vue
<template>
  <async-image
    v-for="(img, index) in images"
    :key="index"
    :url="img"
    mode="aspectFill"
    custom-class="grid-img"
    :enable-preview="true"
    :preview-urls="images"
    :preview-current="index"
  />
</template>

<script setup>
const images = ref([
  'uploads/teaching/img1.jpg',
  'uploads/teaching/img2.jpg'
])
</script>
```

### 4. 自定义占位符样式

```vue
<async-image
  :url="certUrl"
  mode="aspectFit"
  placeholder-style="min-height: 400rpx;"
  custom-style="width: 100%; height: 400rpx;"
/>
```

### 5. 手动控制加载

```vue
<template>
  <async-image
    ref="imageRef"
    :url="imageUrl"
    :auto-load="false"
  />
  <button @click="loadImage">加载图片</button>
</template>

<script setup>
import { ref } from 'vue'

const imageRef = ref()
const imageUrl = ref('uploads/image.jpg')

const loadImage = () => {
  imageRef.value?.reload()
}
</script>
```

### 6. 监听加载状态

```vue
<async-image
  :url="imageUrl"
  @load="handleImageLoad"
  @error="handleImageError"
/>

<script setup>
const handleImageLoad = (e) => {
  console.log('图片加载成功', e)
}

const handleImageError = (e) => {
  console.log('图片加载失败', e)
  uni.showToast({
    title: '图片加载失败',
    icon: 'none'
  })
}
</script>
```

### 7. 完整 URL 直接显示

```vue
<!-- 已经是完整 URL，不会调用预览接口 -->
<async-image
  url="https://example.com/image.jpg"
  mode="aspectFill"
/>
```

## 高级用法

### 替换现有的 image 标签

**原代码：**
```vue
<image 
  :src="institution.logo" 
  class="logo" 
  mode="aspectFill" 
/>
```

**替换为：**
```vue
<async-image 
  :url="institution.logo" 
  class="logo" 
  mode="aspectFill" 
/>
```

### 批量替换示例

在机构详情页面中：

**之前：**
```vue
<image 
  v-if="institution.license_img" 
  :src="institution.license_img" 
  class="cert-img" 
  mode="aspectFit"
  @click="previewImage(institution.license_img)"
/>
```

**之后：**
```vue
<async-image 
  v-if="institution.license_img" 
  :url="institution.license_img" 
  custom-class="cert-img" 
  mode="aspectFit"
  @click="previewImage(institution.license_img)"
/>
```

## 性能优化建议

1. **列表场景使用图片懒加载**：配合 `intersection-observer` 实现
2. **列表预览优先使用内置预览**：`enablePreview + previewUrls + previewCurrent` 即可覆盖大多数场景
3. **设置合理的过期时间**：根据业务场景调整 `expiresIn`
4. **图片列表批量获取**：先批量获取所有预览 URL，再渲染

## 注意事项

1. 组件会自动判断 `url` 是否为完整 URL，如果是则直接使用，不会调用预览接口
2. 预览 URL 是有时效性的，默认 1 小时，可通过 `expiresIn` 调整
3. 启用内置预览后，组件会在点击时自动把 OSS path 转为可访问预览 URL
4. 如果图片路径不存在或网络错误，会显示错误占位符
5. 建议在 `components.d.ts` 中添加类型声明以获得更好的开发体验

## 类型声明

在项目的 `components.d.ts` 中添加：

```typescript
declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    AsyncImage: typeof import('./components/AsyncImage/index.vue')['default']
  }
}
```

这样就可以在任何页面直接使用 `<async-image>` 而无需手动导入。
