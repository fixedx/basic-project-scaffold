import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OssService } from './oss.service';
import {
  GetPreviewUrlDto,
  DeleteFileDto,
  BatchDeleteFilesDto,
  CheckFileExistsDto,
} from './dto/oss.dto';

@Controller('oss')
export class OssController {
  constructor(private readonly ossService: OssService) {}

  /**
   * 上传文件
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('filePath') filePath?: string,
    @Body('isPublic') isPublic?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // 如果没有指定文件路径，自动生成
    const finalPath = filePath || `uploads/${Date.now()}-${file.originalname}`;

    const result = await this.ossService.upload(
      finalPath,
      file.buffer,
      file.mimetype,
      isPublic === 'true',
    );

    // 只返回 path，不返回完整 URL
    return {
      path: result.path,
      size: result.size,
    };
  }

  /**
   * 获取预览 URL（临时签名 URL）
   */
  @Get('preview-url')
  async getPreviewUrl(@Query() dto: GetPreviewUrlDto) {
    const url = await this.ossService.getSignedUrl(
      dto.filePath,
      dto.expiresIn,
      dto.downloadFilename,
    );

    return { url };
  }

  /**
   * 删除文件
   */
  @Delete('delete')
  async delete(@Body() dto: DeleteFileDto) {
    await this.ossService.delete(dto.filePath);
    return { message: 'File deleted successfully' };
  }

  /**
   * 批量删除文件
   */
  @Delete('batch-delete')
  async batchDelete(@Body() dto: BatchDeleteFilesDto) {
    await this.ossService.batchDelete(dto.filePaths);
    return { message: 'Files deleted successfully' };
  }

  /**
   * 检查文件是否存在
   */
  @Get('exists')
  async exists(@Query() dto: CheckFileExistsDto) {
    const exists = await this.ossService.exists(dto.filePath);
    return { exists };
  }

  /**
   * 下载文件
   */
  @Get('download')
  async download(@Query('filePath') filePath: string) {
    if (!filePath) {
      throw new BadRequestException('filePath is required');
    }

    const buffer = await this.ossService.download(filePath);
    return buffer;
  }
}
