import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Controller('announcement')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  /**
   * 创建公告
   */
  @Post()
  async create(@Body() dto: CreateAnnouncementDto): Promise<string> {
    return this.announcementService.create(dto);
  }

  /**
   * 获取公告列表
   */
  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.announcementService.findAll(status, type);
  }

  /**
   * 获取当前生效的公告（首页公开接口）
   */
  @Get('active')
  async findActive() {
    return this.announcementService.findActive();
  }

  /**
   * 获取公告详情
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.announcementService.findOne(id);
  }

  /**
   * 更新公告
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ): Promise<boolean> {
    return this.announcementService.update(id, dto);
  }

  /**
   * 删除公告
   */
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<boolean> {
    return this.announcementService.remove(id);
  }
}
