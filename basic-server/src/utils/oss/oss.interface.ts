/**
 * OSS 上传配置
 */
export interface OssUploadConfig {
  /** 文件路径（相对路径） */
  filePath: string;
  /** 文件内容 */
  fileContent: Buffer | string;
  /** 文件 MIME 类型 */
  contentType?: string;
  /** 是否公开访问 */
  isPublic?: boolean;
}

/**
 * OSS 上传结果
 */
export interface OssUploadResult {
  /** 文件访问 URL */
  url: string;
  /** 文件路径 */
  path: string;
  /** 文件大小（字节） */
  size: number;
  /** ETag */
  etag?: string;
}

/**
 * OSS 临时 URL 配置
 */
export interface OssSignedUrlConfig {
  /** 文件路径 */
  filePath: string;
  /** 过期时间（秒），默认 3600 */
  expiresIn?: number;
  /** 下载文件名 */
  downloadFilename?: string;
}

/**
 * OSS 服务接口
 */
export interface IOssService {
  /**
   * 上传文件
   */
  upload(config: OssUploadConfig): Promise<OssUploadResult>;

  /**
   * 下载文件
   */
  download(filePath: string): Promise<Buffer>;

  /**
   * 删除文件
   */
  delete(filePath: string): Promise<void>;

  /**
   * 批量删除文件
   */
  batchDelete(filePaths: string[]): Promise<void>;

  /**
   * 检查文件是否存在
   */
  exists(filePath: string): Promise<boolean>;

  /**
   * 获取临时签名 URL（用于私有文件访问）
   */
  getSignedUrl(config: OssSignedUrlConfig): Promise<string>;

  /**
   * 获取公开访问 URL
   */
  getPublicUrl(filePath: string): string;

  /**
   * 复制文件
   */
  copy(sourcePath: string, destPath: string): Promise<void>;

  /**
   * 移动文件
   */
  move(sourcePath: string, destPath: string): Promise<void>;
}
