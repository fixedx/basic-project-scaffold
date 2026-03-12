<template>
  <view class="async-image" :class="customClass" :style="computedContainerStyle">
    <image
      v-if="previewUrl"
      :src="previewUrl"
      :mode="mode"
      :lazy-load="lazyLoad"
      :fade-show="fadeShow"
      :webp="webp"
      :show-menu-by-longpress="showMenuByLongpress"
      :draggable="draggable"
      :style="computedImageStyle"
      class="async-image__img"
      @load="handleLoad"
      @error="handleError"
      @click="handleClick"
      @longpress="handleLongpress"
      @longtap="handleLongtap"
    />
    <view v-else-if="loading" class="loading-placeholder" :style="placeholderStyle">
      <Loading size="24px" />
    </view>
    <view v-else-if="error" class="error-placeholder" :style="placeholderStyle">
      <text class="iconfont icon-picture" style="font-size: 64rpx; color: #d9d9d9;"></text>
      <text class="error-text">加载失败</text>
    </view>
  </view>
</template>

<script lang="ts">
export default {
  name: 'AsyncImage',
  options: {
    virtualHost: true
  }
}
</script>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ossApi } from '@/api/oss'
import Loading from '@/components/Loading/index.vue'

interface Props {
  /** 图片路径（OSS路径或完整URL） - 替代原生 src */
  url: string
  /** 图片裁剪、缩放的模式 */
  mode?: 'scaleToFill' | 'aspectFit' | 'aspectFill' | 'widthFix' | 'heightFix' | 'top' | 'bottom' | 'center' | 'left' | 'right' | 'top left' | 'top right' | 'bottom left' | 'bottom right'
  /** 图片宽度 */
  width?: string | number
  /** 图片高度 */
  height?: string | number
  /** 自定义样式类名 - 应用到容器 */
  customClass?: string
  /** 图片懒加载，在即将进入一定范围（上下三屏）时才开始加载 */
  lazyLoad?: boolean
  /** 图片显示动画效果 */
  fadeShow?: boolean
  /** 默认不解析 webP 格式，只支持网络资源 */
  webp?: boolean
  /** 开启长按图片显示识别小程序码菜单 */
  showMenuByLongpress?: boolean
  /** 是否可拖拽图片 */
  draggable?: boolean
  /** 自定义样式 - 应用到容器 */
  customStyle?: string
  /** 是否自动加载 */
  autoLoad?: boolean
  /** 预览URL过期时间（秒），默认3600秒 */
  expiresIn?: number
  /** 加载中占位符样式 */
  placeholderStyle?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'aspectFill',
  width: '',
  height: '',
  lazyLoad: false,
  fadeShow: false,
  webp: false,
  showMenuByLongpress: false,
  draggable: true,
  customStyle: '',
  autoLoad: true,
  expiresIn: 3600,
  placeholderStyle: ''
})

interface Emits {
  (e: 'load', event: any): void
  (e: 'error', event: any): void
  (e: 'click', event: any): void
  (e: 'longpress', event: any): void
  (e: 'longtap', event: any): void
}

const emit = defineEmits<Emits>()

const loading = ref(false)
const error = ref(false)
const previewUrl = ref('')

/**
 * 计算容器样式
 */
const computedContainerStyle = computed(() => {
  let style = props.customStyle || ''
  
  // 如果定义了宽高，应用到容器
  if (props.width) {
    const widthValue = typeof props.width === 'number' ? `${props.width}rpx` : props.width
    style += `width: ${widthValue};`
  }
  if (props.height) {
    const heightValue = typeof props.height === 'number' ? `${props.height}rpx` : props.height
    style += `height: ${heightValue};`
  }
  
  return style
})

/**
 * 计算图片样式
 */
const computedImageStyle = computed(() => {
  let style = ''
  
  // 如果定义了宽高，应用到图片
  if (props.width) {
    const widthValue = typeof props.width === 'number' ? `${props.width}rpx` : props.width
    style += `width: ${widthValue};`
  }
  if (props.height) {
    const heightValue = typeof props.height === 'number' ? `${props.height}rpx` : props.height
    style += `height: ${heightValue};`
  }
  
  return style
})

/**
 * 判断是否为完整URL
 */
const isFullUrl = (url: string) => {
  return url.startsWith('http://') || url.startsWith('https://')
}

/**
 * 获取预览URL
 */
const loadPreviewUrl = async () => {
  if (!props.url) {
    error.value = true
    return
  }

  // 如果已经是完整URL，直接使用
  if (isFullUrl(props.url)) {
    previewUrl.value = props.url
    return
  }

  try {
    loading.value = true
    error.value = false

    const res = await ossApi.getPreviewUrl(props.url, props.expiresIn)
    previewUrl.value = res.url
  } catch (err) {
    console.error('获取图片预览URL失败:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

/**
 * 图片加载完成
 */
const handleLoad = (event: any) => {
  emit('load', event)
}

/**
 * 图片加载失败
 */
const handleError = (event: any) => {
  error.value = true
  emit('error', event)
}

/**
 * 点击图片
 */
const handleClick = (event: any) => {
  emit('click', event)
}

/**
 * 长按图片
 */
const handleLongpress = (event: any) => {
  emit('longpress', event)
}

/**
 * 长按图片（兼容写法）
 */
const handleLongtap = (event: any) => {
  emit('longtap', event)
}

/**
 * 监听URL变化，重新加载
 */
watch(() => props.url, () => {
  previewUrl.value = ''
  if (props.autoLoad) {
    loadPreviewUrl()
  }
}, { immediate: true })

/**
 * 暴露方法供外部调用
 */
defineExpose({
  reload: loadPreviewUrl
})
</script>

<style lang="scss" scoped>
.async-image {
  display: inline-block;
  position: relative;
  overflow: hidden;
  
  &__img {
    display: block;
  }
}

.loading-placeholder,
.error-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: $uni-bg-color-grey;
  width: 100%;
  height: 100%;
  min-height: 200rpx;
}

.error-placeholder {
  gap: 16rpx;
}

.error-text {
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
}
</style>
