import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 上传文件 DTO
 */
export class UploadFileDto {
  @IsString()
  filePath: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

/**
 * 获取预览 URL DTO
 */
export class GetPreviewUrlDto {
  @IsString()
  filePath: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  expiresIn?: number;

  @IsOptional()
  @IsString()
  downloadFilename?: string;
}

/**
 * 删除文件 DTO
 */
export class DeleteFileDto {
  @IsString()
  filePath: string;
}

/**
 * 批量删除文件 DTO
 */
export class BatchDeleteFilesDto {
  @IsString({ each: true })
  filePaths: string[];
}

/**
 * 检查文件存在 DTO
 */
export class CheckFileExistsDto {
  @IsString()
  filePath: string;
}
