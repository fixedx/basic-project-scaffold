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
import { ReviewService } from './review.service';
import { CreateReviewDto, ReplyReviewDto, UpdateReplyDto } from './dto/review.dto';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  /**
   * 创建评价
   */
  @Post()
  async create(@Body() dto: CreateReviewDto) {
    const id = await this.reviewService.create(dto);
    return { id };
  }

  /**
   * 查询我的评价列表
   */
  @Get('my')
  async findMyReviews(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
  ) {
    return this.reviewService.findMyReviews(+page, +pageSize);
  }

  /**
   * 查询课程评价列表（分页兼容模式）
   */
  @Get('course/:courseId')
  async findByCourseId(
    @Param('courseId') courseId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('rating') rating?: number,
    @Query('min_rating') minRating?: number,
    @Query('sort_by') sortBy?: 'rating_desc' | 'created_at_desc',
  ) {
    return this.reviewService.findByCourseId(
      courseId,
      page ? +page : undefined,
      pageSize ? +pageSize : undefined,
      rating ? +rating : undefined,
      minRating ? +minRating : undefined,
      sortBy,
    );
  }

  /**
   * 查询课程平均评分
   */
  @Get('course/:courseId/average')
  async getAverageRating(@Param('courseId') courseId: string) {
    const average = await this.reviewService.getAverageRating(courseId);
    return { average };
  }

  /**
   * 查询课程平均评分（兼容路由）
   */
  @Get('course/:courseId/average-rating')
  async getAverageRatingCompat(@Param('courseId') courseId: string) {
    const averageRating = await this.reviewService.getAverageRating(courseId);
    const count = await this.reviewService.getReviewCount(courseId);
    return { averageRating, count };
  }

  /**
   * 查询机构评价列表（分页兼容模式）
   */
  @Get('institution/:institutionId')
  async findByInstitutionId(
    @Param('institutionId') institutionId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('sort_by') sortBy?: 'rating_desc' | 'created_at_desc',
  ) {
    return this.reviewService.findByInstitutionId(
      institutionId,
      page ? +page : undefined,
      pageSize ? +pageSize : undefined,
      sortBy,
    );
  }

  /**
   * 查询评价详情
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.reviewService.findOne(id);
  }

  /**
   * 回复评价（机构端）
   */
  @Put(':id/reply')
  async reply(@Param('id') id: string, @Body() dto: ReplyReviewDto) {
    await this.reviewService.reply(id, dto);
    return { message: '回复成功' };
  }

  /**
   * 编辑评价回复（24h 内可修改）
   */
  @Put(':id/reply/update')
  async updateReply(@Param('id') id: string, @Body() dto: UpdateReplyDto) {
    await this.reviewService.updateReply(id, dto);
    return { message: '修改回复成功' };
  }

  /**
   * 隐藏/显示评价
   */
  @Put(':id/toggle-visibility')
  async toggleVisibility(@Param('id') id: string) {
    await this.reviewService.toggleVisibility(id);
    return { message: '操作成功' };
  }

  /**
   * 删除评价
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.reviewService.remove(id);
    return { message: '删除成功' };
  }
}
