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
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { SortBannerDto } from './dto/sort-banner.dto';

@Controller('banner')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  /**
   * 创建Banner
   */
  @Post()
  async create(@Body() dto: CreateBannerDto): Promise<string> {
    return this.bannerService.create(dto);
  }

  /**
   * 获取Banner列表（平台级）
   */
  @Get()
  async findAll(@Query('status') status?: string) {
    return this.bannerService.findAll(status);
  }

  /**
   * 获取 Banner 详情
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.bannerService.findOne(id);
  }

  /**
   * 更新Banner
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
  ): Promise<boolean> {
    await this.bannerService.update(id, dto);
    return true;
  }

  /**
   * 删除Banner
   */
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<boolean> {
    await this.bannerService.remove(id);
    return true;
  }

  /**
   * 批量更新排序
   */
  @Post('sort')
  async updateSort(@Body() dto: SortBannerDto): Promise<boolean> {
    await this.bannerService.updateSort(dto);
    return true;
  }
}
