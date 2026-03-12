import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCourseDto } from './dto/query-course.dto';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  /**
   * 创建课程
   */
  @Post()
  async create(@Body() dto: CreateCourseDto): Promise<string> {
    return this.courseService.create(dto);
  }

  /**
   * 查询课程列表
   */
  @Get()
  async findAll(@Query() query: QueryCourseDto) {
    return this.courseService.findAll(query);
  }

  /**
   * 查询附近的课程（基于机构位置）
   * ⚠️ 必须放在 :id 路由之前，避免被捕获
   */
  @Get('nearby')
  async getNearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radius') radius?: string,
    @Query('type') type?: string,
    @Query('categoryCode') categoryCode?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusKm = radius ? parseFloat(radius) : 10;

    if (isNaN(lat) || isNaN(lng)) {
      throw new BadRequestException('请提供有效的经纬度');
    }

    return this.courseService.findNearby(lat, lng, radiusKm, {
      type,
      categoryCode,
      keyword,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
    });
  }

  /**
   * 按区域搜索课程（支持距离排序）
   * ⚠️ 必须放在 :id 路由之前
   */
  @Get('search/area')
  async searchByArea(
    @Query('province') province?: string,
    @Query('city') city?: string,
    @Query('district') district?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('type') type?: string,
    @Query('categoryCode') categoryCode?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const lat = latitude ? parseFloat(latitude) : undefined;
    const lng = longitude ? parseFloat(longitude) : undefined;

    return this.courseService.findByArea(
      province,
      city,
      district,
      lat,
      lng,
      {
        type,
        categoryCode,
        keyword,
        page: page ? parseInt(page) : 1,
        pageSize: pageSize ? parseInt(pageSize) : 20,
      },
    );
  }

  /**
   * 查询课程详情
   * ⚠️ 此路由必须在具体路径之后，避免捕获 nearby、search 等路径
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.courseService.findOne(id);
  }

  /**
   * 更新课程
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCourseDto): Promise<boolean> {
    await this.courseService.update(id, dto);
    return true;
  }

  /**
   * 删除课程
   */
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<boolean> {
    await this.courseService.remove(id);
    return true;
  }

  /**
   * 上架课程
   */
  @Put(':id/online')
  async online(@Param('id') id: string): Promise<boolean> {
    await this.courseService.toggleOnline(id, true);
    return true;
  }

  /**
   * 下架课程
   */
  @Put(':id/offline')
  async offline(@Param('id') id: string): Promise<boolean> {
    await this.courseService.toggleOnline(id, false);
    return true;
  }
}
