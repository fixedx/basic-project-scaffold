import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { ReviewEntity } from '../entities/review.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class ReviewRepository extends BaseRepository<ReviewEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(ReviewEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据课程ID查询评价列表（分页兼容模式）
   * @param sortBy 排序方式：'rating_desc'(评分降序) | 'created_at_desc'(时间降序，默认)
   */
  async findByCourseId(
    courseId: string,
    page?: number,
    pageSize?: number,
    rating?: number,
    minRating?: number,
    sortBy?: 'rating_desc' | 'created_at_desc',
  ) {
    const query = this.getQuery()
      .andWhere('entity.course_id = :courseId', { courseId })
      .andWhere('entity.is_visible = :isVisible', { isVisible: true });

    // 评分筛选：精确评分
    if (rating !== undefined) {
      query.andWhere('entity.rating = :rating', { rating });
    }

    // 评分筛选：最低评分
    if (minRating !== undefined) {
      query.andWhere('entity.rating >= :minRating', { minRating });
    }

    // 排序方式
    if (sortBy === 'rating_desc') {
      query.orderBy('entity.rating', 'DESC').addOrderBy('entity.created_at', 'DESC');
    } else {
      query.orderBy('entity.created_at', 'DESC');
    }

    // 分页兼容模式：有分页参数就分页，否则返回数组
    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await query
        .skip(skip)
        .take(pageSize)
        .getManyAndCount();

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    // 无分页参数，直接返回数组
    return query.getMany();
  }

  /**
   * 根据机构ID查询评价列表（分页兼容模式）
   * @param sortBy 排序方式：'rating_desc'(评分降序) | 'created_at_desc'(时间降序，默认)
   */
  async findByInstitutionId(
    institutionId: string,
    page?: number,
    pageSize?: number,
    sortBy?: 'rating_desc' | 'created_at_desc',
  ) {
    const query = this.getQuery()
      .andWhere('entity.institution_id = :institutionId', { institutionId })
      .andWhere('entity.is_visible = :isVisible', { isVisible: true });

    // 排序方式
    if (sortBy === 'rating_desc') {
      query.orderBy('entity.rating', 'DESC').addOrderBy('entity.created_at', 'DESC');
    } else {
      query.orderBy('entity.created_at', 'DESC');
    }

    // 分页兼容模式
    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [data, total] = await query
        .skip(skip)
        .take(pageSize)
        .getManyAndCount();

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    return query.getMany();
  }

  /**
   * 根据用户ID查询评价列表
   */
  async findByUserId(userId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;
    const [data, total] = await this.getQuery()
      .where('entity.user_id = :userId', { userId })
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取课程平均评分
   */
  async getAverageRating(courseId: string): Promise<number> {
    const result = await this.createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .where('review.course_id = :courseId', { courseId })
      .andWhere('review.is_visible = true')
      .andWhere('review.is_delete = false')
      .getRawOne();

    return parseFloat(result?.average || '0');
  }

  /**
   * 获取课程评价数量
   */
  async getReviewCount(courseId: string): Promise<number> {
    return this.getQuery()
      .andWhere('entity.course_id = :courseId', { courseId })
      .andWhere('entity.is_visible = :isVisible', { isVisible: true })
      .getCount();
  }
}
