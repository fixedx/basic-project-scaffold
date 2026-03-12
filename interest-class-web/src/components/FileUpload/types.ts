/**
 * 文件上传组件类型定义
 */

/**
 * 文件上传组件 Props
 */
export interface FileUploadProps {
  /** v-model 绑定的 URL 数组或单个 URL */
  modelValue?: string | string[]
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
}

/**
 * 文件上传组件 Emits
 */
export interface FileUploadEmits {
  (e: 'update:modelValue', value: string | string[]): void
  (e: 'success', urls: string[]): void
  (e: 'fail', error: any): void
}

/**
 * 上传文件信息
 */
export interface UploadFileInfo {
  uid: string
  url: string
  path?: string
  size?: number
  status: 'uploading' | 'success' | 'fail'
  name?: string
}
