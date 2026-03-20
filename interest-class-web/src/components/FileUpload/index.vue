<template>
  <view class="file-upload" :class="[customClass]">
    <!-- 头像上传模式 -->
    <view v-if="mode === 'avatar'" class="avatar-upload-container" @click="handleChooseFile">
      <view class="avatar-wrapper" :style="avatarStyle">
        <AsyncImage
          v-if="currentValue"
          :url="currentValue"
          mode="aspectFill"
          :width="avatarSize"
          :height="avatarSize"
          custom-class="avatar-image-round"
        />
        <view v-else class="avatar-placeholder" :style="avatarStyle">
          <text class="iconfont icon-camera"></text>
        </view>
        <view v-if="uploading" class="avatar-uploading" :style="avatarStyle">
          <Loading size="48rpx" color="#fff" />
        </view>
        <view v-if="!disabled" class="avatar-edit-btn">
          <text class="iconfont icon-edit"></text>
        </view>
      </view>
    </view>
    
    <!-- 图片预览列表 -->
    <view v-else-if="fileType === 'image'" class="image-upload-container">
      <view class="image-list">
        <view
          v-for="(file, index) in fileList"
          :key="file.uid"
          class="image-item"
        >
          <AsyncImage
            :url="file.path || file.url"
            mode="aspectFill"
            width="160rpx"
            height="160rpx"
            custom-style="border-radius: 12rpx;"
            @click="handlePreview(index)"
          />
          <view v-if="!disabled" class="remove-btn" @click.stop="handleRemoveFile(index)">
            <text class="iconfont icon-close" style="font-size: 32rpx; color: #fff;"></text>
          </view>
          <view v-if="file.status === 'uploading'" class="upload-mask">
            <Loading size="48rpx" color="#fff" />
            <text class="progress-text">{{ file.progress }}%</text>
          </view>
        </view>
        
        <!-- 上传按钮 -->
        <view
          v-if="fileList.length < limit && !disabled"
          class="upload-btn"
          @click="handleChooseFile"
        >
          <text class="iconfont icon-picture" style="font-size: 80rpx; color: #ccc;"></text>
          <text class="upload-text">上传图片</text>
        </view>
      </view>
    </view>
    
    <!-- 文件列表模式（使用原 wd-upload） -->
    <wd-upload
      v-else
      v-model:file-list="fileList"
      :limit="limit"
      :max-size="maxSize"
      :accept="accept"
      :file-type="fileType"
      :multiple="multiple"
      :disabled="disabled"
      :upload-method="customUpload"
      @success="handleSuccess"
      @remove="handleRemove"
      @fail="handleFail"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ossApi } from '@/api/oss'
import AsyncImage from '@/components/AsyncImage/index.vue'
import Loading from '@/components/Loading/index.vue'

/**
 * 组件 Props
 */
interface Props {
  /** v-model 绑定的 URL 数组或单个 URL */
  modelValue?: string | string[]
  /** 显示模式：default-默认网格 / avatar-头像模式 */
  mode?: 'default' | 'avatar'
  /** 最大上传数量 */
  limit?: number
  /** 单个文件最大大小（字节），默认 2MB */
  maxSize?: number
  /** 接受的文件类型：image/video/all */
  accept?: 'image' | 'video' | 'all'
  /** 文件显示类型：image-图片预览 / file-文件列表 */
  fileType?: 'image' | 'file'
  /** 是否支持多选 */
  multiple?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义上传路径前缀，默认 uploads */
  pathPrefix?: string
  /** 是否公开访问，默认 true */
  isPublic?: boolean
  /** 自定义样式类名 */
  customClass?: string
  /** 头像尺寸（仅 avatar 模式有效），默认 160rpx */
  avatarSize?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  mode: 'default',
  limit: 1,
  maxSize: 2 * 1024 * 1024, // 2MB
  accept: 'image',
  fileType: 'image',
  multiple: false,
  disabled: false,
  pathPrefix: 'uploads',
  isPublic: true,
  customClass: '',
  avatarSize: '160rpx'
})

/**
 * 组件 Emits
 */
interface Emits {
  (e: 'update:modelValue', value: string | string[]): void
  (e: 'success', urls: string[]): void
  (e: 'fail', error: any): void
}

const emit = defineEmits<Emits>()

/**
 * 文件列表（内部状态）
 */
const fileList = ref<any[]>([])

/**
 * 头像模式上传中状态
 */
const uploading = ref(false)

/**
 * 当前值（头像模式使用）
 */
const currentValue = computed(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue[0] || ''
  }
  return props.modelValue || ''
})

/**
 * 头像样式
 */
const avatarStyle = computed(() => {
  return `width: ${props.avatarSize}; height: ${props.avatarSize};`
})

/**
 * 初始化文件列表
 */
const initFileList = async () => {
  const values = Array.isArray(props.modelValue) 
    ? props.modelValue 
    : props.modelValue ? [props.modelValue] : []
  
  // 过滤空值
  const paths = values.filter(Boolean)
  
  if (paths.length === 0) {
    fileList.value = []
    return
  }
  
  // 如果是私有文件，需要获取预览 URL
  if (!props.isPublic) {
    try {
      const filesWithUrls = await Promise.all(
        paths.map(async (path, index) => {
          // 如果已经是完整的 URL，直接使用
          if (path.startsWith('http://') || path.startsWith('https://')) {
            return {
              url: path,
              path: path,
              uid: `init-${Date.now()}-${index}`,
              status: 'success',
              name: path.split('/').pop() || 'file',
              type: props.fileType === 'image' ? 'image' : 'file'
            }
          }
          
          // 否则通过 path 获取预览 URL
          try {
            const result = await ossApi.getPreviewUrl(path, 3600)
            return {
              url: result.url,
              path: path,
              uid: `init-${Date.now()}-${index}`,
              status: 'success',
              name: path.split('/').pop() || 'file',
              type: props.fileType === 'image' ? 'image' : 'file'
            }
          } catch (error) {
            console.error('获取预览 URL 失败:', path, error)
            return {
              url: '',
              path: path,
              uid: `init-${Date.now()}-${index}`,
              status: 'fail',
              name: path.split('/').pop() || 'file',
              type: props.fileType === 'image' ? 'image' : 'file'
            }
          }
        })
      )
      
      fileList.value = filesWithUrls
    } catch (error) {
      console.error('初始化文件列表失败:', error)
      fileList.value = []
    }
  } else {
    // 公开文件直接使用 URL
    fileList.value = paths.map((url, index) => ({
      url,
      path: url,
      uid: `init-${Date.now()}-${index}`,
      status: 'success',
      name: url.split('/').pop() || 'file',
      type: props.fileType === 'image' ? 'image' : 'file'
    }))
  }
}

// 监听 modelValue 变化
watch(() => props.modelValue, () => {
  initFileList()
}, { immediate: true })

/**
 * 生成唯一的文件路径
 */
const generateFilePath = (fileName: string): string => {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const ext = fileName.split('.').pop() || 'jpg'
  return `${props.pathPrefix}/${timestamp}-${randomStr}.${ext}`
}

/**
 * 自定义上传方法
 */
const customUpload = (file: any, formData: any, options: any) => {
  console.log('customUpload，file:', file)
  console.log('formData:', formData)
  console.log('options:', options)
  
  // 获取文件路径
  const tempFilePath = file.url || file.path
  
  console.log('tempFilePath:', tempFilePath)
  
  if (!tempFilePath) {
    const error = { errMsg: '无法获取文件路径' }
    options.onError(error, file, formData)
    return
  }
  
  // 生成存储路径
  const fileName = file.name || 'file.jpg'
  const filePath = generateFilePath(fileName)
  
  console.log('准备上传，filePath:', filePath)
  
  // 模拟进度：从0到90%
  let progress = 0
  const progressInterval = setInterval(() => {
    if (progress < 90) {
      progress += 10
      // 更新进度
      options.onProgress({ progress }, file)
      console.log('上传进度:', progress + '%')
    }
  }, 100)
  
  // 上传到后端
  ossApi.upload(tempFilePath, filePath, props.isPublic)
    .then(async (result) => {
      // 清除进度定时器
      clearInterval(progressInterval)
      
      console.log('上传成功:', result)
      
      // AsyncImage 组件自动处理 OSS path → URL 转换，无需手动获取 URL
      const displayUrl = result.path
      console.log('上传完成，OSS path:', displayUrl)
      
      // 设置进度为100%
      options.onProgress({ progress: 100 }, file)
      console.log('上传完成，进度: 100%')
      
      // 标记上传成功，返回结果
      // 重要：需要将 path 直接设置到 file 对象上，这样 wot-design-uni 才能访问到
      const response = {
        data: {
          url: displayUrl,
          path: result.path,  // 这是服务器返回的实际存储路径
          size: result.size
        },
        statusCode: 200
      }
      
      // 同时更新 file 对象的 path 属性（确保后续能访问到）
      file.path = result.path
      file.serverUrl = displayUrl
      
      console.log('返回的 response:', response)
      console.log('更新后的 file:', file)
      
      options.onSuccess(response, file, formData)
    })
    .catch((error) => {
      // 清除进度定时器
      clearInterval(progressInterval)
      
      console.error('上传失败:', error)
      
      // 标记上传失败
      options.onError({ errMsg: error.message || '上传失败' }, file, formData)
    })
}

/**
 * 选择文件（图片模式）
 */
const handleChooseFile = () => {
  if (props.disabled) return
  
  uni.chooseImage({
    count: props.mode === 'avatar' ? 1 : (props.multiple ? props.limit - fileList.value.length : 1),
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const tempFiles = res.tempFilePaths || []
      tempFiles.forEach((tempPath) => {
        if (props.mode === 'avatar') {
          uploadAvatarFile(tempPath)
        } else {
          uploadFile(tempPath)
        }
      })
    },
    fail: (error) => {
      console.error('选择文件失败:', error)
      uni.showToast({
        title: '选择文件失败',
        icon: 'none'
      })
    }
  })
}

/**
 * 上传头像文件（avatar 模式专用）
 */
const uploadAvatarFile = async (tempPath: string) => {
  // 检查文件大小
  const fileInfo = await uni.getFileInfo({ filePath: tempPath }).catch(() => null)
  if (fileInfo && fileInfo.size > props.maxSize) {
    uni.showToast({
      title: `文件大小不能超过 ${(props.maxSize / 1024 / 1024).toFixed(1)}MB`,
      icon: 'none'
    })
    return
  }

  uploading.value = true
  
  // 生成存储路径
  const fileName = tempPath.split('/').pop() || 'avatar.jpg'
  const filePath = generateFilePath(fileName)
  
  try {
    // 上传到 OSS
    const result = await ossApi.upload(tempPath, filePath, props.isPublic)
    
    // AsyncImage 组件自动处理 OSS path → URL 转换，无需手动获取 URL
    
    // 更新 modelValue — 存储 OSS path 而非完整 URL
    emit('update:modelValue', result.path)
    emit('success', [result.path])
    
    uni.showToast({
      title: '上传成功',
      icon: 'success'
    })
  } catch (error: any) {
    console.error('上传失败:', error)
    uni.showToast({
      title: error.message || '上传失败',
      icon: 'none'
    })
    emit('fail', error)
  } finally {
    uploading.value = false
  }
}

/**
 * 上传文件
 */
const uploadFile = async (tempPath: string) => {
  // 检查文件大小
  const fileInfo = await uni.getFileInfo({ filePath: tempPath }).catch(() => null)
  if (fileInfo && fileInfo.size > props.maxSize) {
    uni.showToast({
      title: `文件大小不能超过 ${(props.maxSize / 1024 / 1024).toFixed(1)}MB`,
      icon: 'none'
    })
    return
  }

  // 生成唯一标识
  const uid = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  
  // 添加到文件列表
  const file = {
    uid,
    url: tempPath,
    path: tempPath,
    status: 'uploading',
    progress: 0,
    name: tempPath.split('/').pop() || 'image.jpg'
  }
  
  fileList.value.push(file)
  
  // 生成存储路径
  const fileName = file.name
  const filePath = generateFilePath(fileName)
  
  try {
    // 上传到 OSS
    const result = await ossApi.upload(tempPath, filePath, props.isPublic)
    
    // AsyncImage 组件自动处理 OSS path → URL 转换，无需手动获取 URL
    const displayUrl = result.path
    
    // 更新文件状态
    const index = fileList.value.findIndex(f => f.uid === uid)
    if (index !== -1) {
      fileList.value[index] = {
        ...fileList.value[index],
        status: 'success',
        progress: 100,
        path: result.path,
        url: displayUrl
      }
      
      // 触发成功事件
      emitValues()
    }
  } catch (error) {
    console.error('上传失败:', error)
    
    // 更新文件状态为失败
    const index = fileList.value.findIndex(f => f.uid === uid)
    if (index !== -1) {
      fileList.value[index].status = 'fail'
    }
    
    uni.showToast({
      title: '上传失败',
      icon: 'none'
    })
    
    emit('fail', error)
  }
}

/**
 * 移除文件（图片模式）
 */
const handleRemoveFile = (index: number) => {
  fileList.value.splice(index, 1)
  emitValues()
}

/**
 * 预览图片
 */
const handlePreview = async (index: number) => {
  try {
    // 获取所有图片的预览 URL
    const urls = await Promise.all(
      fileList.value
        .filter(f => f.status === 'success')
        .map(async (f) => {
          if (props.isPublic || f.url.startsWith('http')) {
            return f.url
          }
          const res = await ossApi.getPreviewUrl(f.path || f.url)
          return res.url
        })
    )
    
    uni.previewImage({
      urls,
      current: index
    })
  } catch (error) {
    console.error('预览失败:', error)
  }
}

/**
 * 触发值更新
 */
const emitValues = () => {
  const values = fileList.value
    .filter(f => f.status === 'success')
    .map(f => f.path || f.url)
    .filter(Boolean)
  
  if (props.limit === 1) {
    emit('update:modelValue', values[0] || '')
  } else {
    emit('update:modelValue', values)
  }
  
  emit('success', values)
}

/**
 * 上传成功（由 wd-upload 组件触发）
 */
const handleSuccess = ({ fileList: files }: any) => {
  console.log('handleSuccess，files:', files)
  
  // 提取 path（私有桶）或 url（公开桶）
  // wot-design-uni 的 fileList 中的文件对象结构：
  // { url, response: { data: { path, url } } }
  const values = files.map((f: any) => {
    // 优先从 response.data 中获取 path（上传后的服务器路径）
    if (f.response?.data?.path) {
      return f.response.data.path
    }
    // 其次尝试从 file 对象本身获取 path
    if (f.path && !f.path.startsWith('http://tmp/') && !f.path.includes('wxfile://')) {
      return f.path
    }
    // 最后使用 url（公开桶的情况）
    if (f.url && !f.url.startsWith('http://tmp/') && !f.url.includes('wxfile://')) {
      return f.url
    }
    // 如果都没有，尝试从 response.data.url 获取
    if (f.response?.data?.url) {
      return f.response.data.url
    }
    return null
  }).filter(Boolean)
  
  console.log('提取的值:', values)
  
  // 根据 limit 决定返回单个还是数组
  if (props.limit === 1) {
    emit('update:modelValue', values[0] || '')
  } else {
    emit('update:modelValue', values)
  }
  
  emit('success', values)
}

/**
 * 删除文件
 */
const handleRemove = ({ file, fileList: files }: any) => {
  console.log('handleRemove，file:', file)
  console.log('handleRemove，剩余文件:', files)
  
  // 提取剩余文件的 path 或 url
  const values = files.map((f: any) => {
    // 优先从 response.data 中获取 path
    if (f.response?.data?.path) {
      return f.response.data.path
    }
    // 其次尝试从 file 对象本身获取 path
    if (f.path && !f.path.startsWith('http://tmp/') && !f.path.includes('wxfile://')) {
      return f.path
    }
    // 最后使用 url
    if (f.url && !f.url.startsWith('http://tmp/') && !f.url.includes('wxfile://')) {
      return f.url
    }
    // 尝试从 response.data.url 获取
    if (f.response?.data?.url) {
      return f.response.data.url
    }
    return null
  }).filter(Boolean)
  
  if (props.limit === 1) {
    emit('update:modelValue', '')
  } else {
    emit('update:modelValue', values)
  }
}

/**
 * 上传失败
 */
const handleFail = (error: any) => {
  emit('fail', error)
}
</script>

<style lang="scss" scoped>
.file-upload {
  width: 100%;
}

.image-upload-container {
  width: 100%;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.image-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background-color: $uni-bg-color-grey;
}

.preview-image {
  width: 100%;
  height: 100%;
}

.remove-btn {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  z-index: 10;
}

.upload-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  gap: 8rpx;
}

.progress-text {
  font-size: 24rpx;
  color: #fff;
}

.upload-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 160rpx;
  height: 160rpx;
  background-color: $uni-bg-color-grey;
  border: 2rpx dashed $uni-border-color;
  border-radius: 12rpx;
}

.upload-icon {
  font-size: 60rpx;
  color: $uni-text-color-tertiary;
  line-height: 1;
}

.upload-text {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
}

// ==================== 头像模式样式 ====================
</style>
