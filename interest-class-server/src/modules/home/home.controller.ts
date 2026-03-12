import { Controller, Get, Query } from '@nestjs/common';
import { HomeService } from './home.service';
import { GetHomeDataDto } from '../common/dto/get-home-data.dto';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  /**
   * 获取应用配置（公开接口）
   * 返回当前环境配置，用于前端判断是否为开发模式
   */
  @Get('config')
  async getConfig() {
    const env = process.env.ENV || 'production';
    return {
      env,
      isDevelopment: env === 'development',
    };
  }

  /**
   * 根据经纬度获取城市名称（反向地理编码）
   * 代理 Nominatim API，避免小程序域名白名单问题
   */
  @Get('geocode/city')
  async getCityByLocation(
    @Query('latitude') latitude?: number,
    @Query('longitude') longitude?: number,
  ) {
    if (!latitude || !longitude) {
      return { city: '' };
    }
    const city = await this.homeService.getCityByLocation(
      Number(latitude),
      Number(longitude),
    );
    return { city };
  }

  /**
   * 获取首页聚合数据（简化版）
   */
  @Get()
  async getHome(@Query() dto: GetHomeDataDto) {
    return this.homeService.getHomeData(dto);
  }

  /**
   * 获取首页数据（Banner、推荐课程、推荐机构）
   */
  @Get('data')
  async getHomeData(@Query() dto: GetHomeDataDto) {
    return this.homeService.getHomeData(dto);
  }

  /**
   * 获取首页 Banner 列表
   */
  @Get('banners')
  async getBanners(
    @Query('province') province?: string,
    @Query('city') city?: string,
  ) {
    return this.homeService.getBanners(province, city);
  }

  /**
   * 获取推荐课程
   */
  @Get('recommended-courses')
  async getRecommendedCourses(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('province') province?: string,
    @Query('city') city?: string,
  ) {
    return this.homeService.getRecommendedCourses(
      Number(page),
      Number(pageSize),
      province,
      city,
    );
  }

  /**
   * 获取推荐机构
   */
  @Get('recommended-institutions')
  async getRecommendedInstitutions(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('province') province?: string,
    @Query('city') city?: string,
  ) {
    return this.homeService.getRecommendedInstitutions(
      Number(page),
      Number(pageSize),
      province,
      city,
    );
  }
}
