import { Injectable } from '@nestjs/common';
import { get_oss_client } from '@/utils/oss/get-client';
import { IOssService } from '@/utils/oss/oss.interface';

@Injectable()
export class OssService {
  private ossClient: IOssService;

  constructor() {
    this.ossClient = get_oss_client();
  }

  /**
   * 上传文件
   */
  async upload(
    filePath: string,
    fileContent: Buffer,
    contentType?: string,
    isPublic: boolean = true,
  ) {
    return this.ossClient.upload({
      filePath,
      fileContent,
      contentType,
      isPublic,
    });
  }

  /**
   * 下载文件
   */
  async download(filePath: string) {
    return this.ossClient.download(filePath);
  }

  /**
   * 删除文件
   */
  async delete(filePath: string) {
    return this.ossClient.delete(filePath);
  }

  /**
   * 批量删除文件
   */
  async batchDelete(filePaths: string[]) {
    return this.ossClient.batchDelete(filePaths);
  }

  /**
   * 检查文件是否存在
   */
  async exists(filePath: string) {
    return this.ossClient.exists(filePath);
  }

  /**
   * 获取临时签名 URL
   */
  async getSignedUrl(
    filePath: string,
    expiresIn?: number,
    downloadFilename?: string,
  ) {
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    return this.ossClient.getSignedUrl({
      filePath,
      expiresIn,
      downloadFilename,
    });
  }

  /**
   * 复制文件
   */
  async copy(sourcePath: string, destPath: string) {
    return this.ossClient.copy(sourcePath, destPath);
  }

  /**
   * 移动文件
   */
  async move(sourcePath: string, destPath: string) {
    return this.ossClient.move(sourcePath, destPath);
  }
}
