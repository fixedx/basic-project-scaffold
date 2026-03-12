import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transactional } from '@/common/decorators/transaction.decorator';
import { UserContextService } from '@/common/services/user-context.service';
import { ReviewRepository } from './repositories/review.repository';
import { CourseRepository } from '../course/repositories/course.repository';
import { CreateReviewDto, ReplyReviewDto, UpdateReplyDto } from './dto/review.dto';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    private reviewRepository: ReviewRepository,
    private courseRepository: CourseRepository,
    private userContextService: UserContextService,
    private dataSource: DataSource,
  ) {}

  /**
   * 重新计算机构的平均评分和评价数量
   * 在评价创建、删除、显隐切换后调用
   */
  private async recalculateInstitutionRating(
    institutionId: string,
  ): Promise<void> {
    try {
      const result = await this.dataSource.query(
        `SELECT 
           COALESCE(AVG(rating), 4.0) as avg_rating,
           COUNT(*)::int as review_count
         FROM reviews
         WHERE institution_id = $1
           AND is_delete = false
           AND is_visible = true`,
        [institutionId],
      );

      const avgRating = parseFloat(result[0]?.avg_rating) || 4.0;
      const reviewCount = parseInt(result[0]?.review_count, 10) || 0;

      // 如果没有评价，默认评分为4.0
      const finalRating = reviewCount > 0 ? Math.round(avgRating * 10) / 10 : 4.0;

      await this.dataSource.query(
        `UPDATE institutions SET avg_rating = $1, review_count = $2 WHERE id = $3`,
        [finalRating, reviewCount, institutionId],
      );

      this.logger.log(
        `📊 机构 ${institutionId} 评分更新: avg_rating=${finalRating}, review_count=${reviewCount}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ 重新计算机构评分失败 (institution_id=${institutionId}):`,
        error.message,
      );
    }
  }

  /**
   * 创建评价
   */
  @Transactional()
  async create(dto: CreateReviewDto): Promise<string> {
    const userId = this.userContextService.getCurrentUserId();

    // 验证课程是否存在
    const course = await this.courseRepository.findOneById(dto.course_id);
    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    // 防重复评价：同一订单不允许重复提交
    if (dto.order_id) {
      const existingReview = await this.dataSource.query(
        `SELECT id FROM reviews WHERE order_id = $1 AND is_delete = false LIMIT 1`,
        [dto.order_id],
      );
      if (existingReview.length > 0) {
        throw new BadRequestException('该订单已评价，不可重复提交');
      }

      // 校验订单归属：只有订单本人可以评价
      const orderRows = await this.dataSource.query(
        `SELECT id FROM orders WHERE id = $1 AND user_id = $2 AND is_delete = false LIMIT 1`,
        [dto.order_id, userId],
      );
      if (orderRows.length === 0) {
        throw new BadRequestException('订单不存在或无权评价');
      }
    }

    const review = this.reviewRepository.create({
      user_id: userId,
      institution_id: course.institution_id,
      course_id: dto.course_id,
      order_id: dto.order_id,
      rating: dto.rating,
      content: dto.content,
      images: dto.images,
      is_visible: true,
    });

    const saved = await this.reviewRepository.save(review);

    // 标记订单为已评价（防止重复评价，同时前端可据此展示"去评价"按钮状态）
    if (dto.order_id) {
      await this.dataSource.query(
        `UPDATE orders SET is_reviewed = true WHERE id = $1 AND is_delete = false`,
        [dto.order_id],
      );
    }

    // 重新计算机构评分
    await this.recalculateInstitutionRating(course.institution_id);

    return saved.id;
  }

  /**
   * 回复评价（机构端）
   */
  @Transactional()
  async reply(id: string, dto: ReplyReviewDto): Promise<void> {
    const review = await this.reviewRepository.findOneById(id);
    if (!review) {
      throw new NotFoundException('评价不存在');
    }

    if (review.reply) {
      throw new BadRequestException('已经回复过了，如需修改请在 24 小时内使用编辑功能');
    }

    review.reply = dto.reply;
    review.replied_at = new Date();

    await this.reviewRepository.save(review);
  }

  /**
   * 编辑评价回复（仅允许在首次回复 24 小时内修改）
   */
  @Transactional()
  async updateReply(id: string, dto: UpdateReplyDto): Promise<void> {
    const review = await this.reviewRepository.findOneById(id);
    if (!review) {
      throw new NotFoundException('评价不存在');
    }

    if (!review.reply || !review.replied_at) {
      throw new BadRequestException('该评价尚未回复，请使用回复接口');
    }

    // 检查是否在 24 小时内
    const EDIT_WINDOW_HOURS = 24;
    const repliedAt = new Date(review.replied_at);
    const diffMs = Date.now() - repliedAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours > EDIT_WINDOW_HOURS) {
      throw new ForbiddenException(`回复内容只能在首次回复的 ${EDIT_WINDOW_HOURS} 小时内修改`);
    }

    review.reply = dto.reply;
    // replied_at 保持不变（记录初次回复时间）

    await this.reviewRepository.save(review);
  }

  /**
   * 查询课程评价列表（分页兼容模式）
   */
  async findByCourseId(
    courseId: string,
    page?: number,
    pageSize?: number,
    rating?: number,
    minRating?: number,
    sortBy?: 'rating_desc' | 'created_at_desc',
  ) {
    return this.reviewRepository.findByCourseId(
      courseId,
      page,
      pageSize,
      rating,
      minRating,
      sortBy,
    );
  }

  /**
   * 查询机构评价列表（分页兼容模式）
   */
  async findByInstitutionId(
    institutionId: string,
    page?: number,
    pageSize?: number,
    sortBy?: 'rating_desc' | 'created_at_desc',
  ) {
    return this.reviewRepository.findByInstitutionId(
      institutionId,
      page,
      pageSize,
      sortBy,
    );
  }

  /**
   * 查询我的评价列表
   */
  async findMyReviews(page = 1, pageSize = 10) {
    const userId = this.userContextService.getCurrentUserId();
    return this.reviewRepository.findByUserId(userId, page, pageSize);
  }

  /**
   * 查询评价详情
   */
  async findOne(id: string) {
    const review = await this.reviewRepository.findOneById(id);
    if (!review) {
      throw new NotFoundException('评价不存在');
    }
    return review;
  }

  /**
   * 获取课程平均评分
   */
  async getAverageRating(courseId: string): Promise<number> {
    return this.reviewRepository.getAverageRating(courseId);
  }

  /**
   * 获取课程评价数量
   */
  async getReviewCount(courseId: string): Promise<number> {
    return this.reviewRepository.getReviewCount(courseId);
  }

  /**
   * 隐藏/显示评价
   */
  @Transactional()
  async toggleVisibility(id: string): Promise<void> {
    const review = await this.reviewRepository.findOneById(id);
    if (!review) {
      throw new NotFoundException('评价不存在');
    }

    review.is_visible = !review.is_visible;
    await this.reviewRepository.save(review);

    // 重新计算机构评分（显隐切换会影响评分）
    await this.recalculateInstitutionRating(review.institution_id);
  }

  /**
   * 删除评价（软删除）
   */
  @Transactional()
  async remove(id: string): Promise<void> {
    const userId = this.userContextService.getCurrentUserId();
    const review = await this.reviewRepository.findOneById(id);

    if (!review) {
      throw new NotFoundException('评价不存在');
    }

    if (review.user_id !== userId) {
      throw new BadRequestException('无权删除此评价');
    }

    await this.reviewRepository.softRemoveById(id);

    // 重新计算机构评分
    await this.recalculateInstitutionRating(review.institution_id);
  }
}
