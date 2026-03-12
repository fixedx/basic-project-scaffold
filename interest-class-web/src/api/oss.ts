import { http } from '@/utils/request';

/**
 * 上传结果
 */
export interface UploadResult {
  url: string;
  path: string;
  size: number;
}

/**
 * OSS API
 */
export const ossApi = {
  /**
   * 上传文件
   */
  async upload(filePath: string | File, customPath?: string, isPublic: boolean = true) {
    const formData: Record<string, any> = {
      isPublic: String(isPublic)
    };
    
    if (customPath) {
      formData.filePath = customPath;
    }

    return http.upload<UploadResult>('/oss/upload', filePath, 'file', formData);
  },

  /**
   * 获取预览 URL（临时签名 URL）
   */
  getPreviewUrl(
    filePath: string,
    expiresIn?: number,
    downloadFilename?: string,
  ) {
    return http.get<{ url: string }>('/oss/preview-url', {
      filePath,
      expiresIn,
      downloadFilename,
    });
  },

  /**
   * 获取公开访问 URL（复用 preview-url 接口）
   */
  getPublicUrl(filePath: string) {
    return http.get<{ url: string }>('/oss/preview-url', {
      filePath,
    });
  },

  /**
   * 删除文件
   */
  delete(filePath: string) {
    return http.delete<{ message: string }>('/oss/delete', {
      filePath,
    });
  },

  /**
   * 批量删除文件
   */
  batchDelete(filePaths: string[]) {
    return http.delete<{ message: string }>('/oss/batch-delete', {
      filePaths,
    });
  },

  /**
   * 检查文件是否存在
   */
  exists(filePath: string) {
    return http.get<{ exists: boolean }>('/oss/exists', {
      filePath,
    });
  },
};
