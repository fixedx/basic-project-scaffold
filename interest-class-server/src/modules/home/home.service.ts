import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import axios from 'axios';
import { BannerRepository } from '../banner/repositories/banner.repository';
import { CourseRepository } from '../course/repositories/course.repository';
import { CourseService } from '../course/course.service';
import { InstitutionRepository } from '../institution/repositories/institution.repository';
import { UserInviteCodeRepository } from '../invite/repositories/user-invite-code.repository';
import { GetHomeDataDto } from '../common/dto/get-home-data.dto';

@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  constructor(
    private bannerRepository: BannerRepository,
    private courseRepository: CourseRepository,
    private courseService: CourseService,
    private institutionRepository: InstitutionRepository,
    private userInviteCodeRepository: UserInviteCodeRepository,
    private dataSource: DataSource,  // 用于原生 PostGIS 查询
  ) {}

  /**
   * 根据经纬度获取城市名称（反向地理编码）
   * 使用 BigDataCloud 免费服务（无需 API Key，国内可访问）
   * 优先使用 axios 请求，超时后降级为 curl 调用
   */
  async getCityByLocation(latitude: number, longitude: number): Promise<string> {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=zh`;

    try {
      const response = await axios.get(url, { timeout: 5000 });
      const city = response.data?.city || response.data?.locality || '';
      return city.replace(/市$/, '');
    } catch {
      this.logger.warn('反向地理编码失败，返回空字符串');
      return '';
    }
  }

  /**
   * 获取首页数据（Banner、推荐课程、推荐机构）
   */
  async getHomeData(dto: GetHomeDataDto) {
    const page = dto.page || 1;
    const pageSize = dto.pageSize || 10;

    // 获取全平台最高让利比例（用于计算立减金额）
    const maxShareRatio = await this.userInviteCodeRepository.getMaxShareRatio();

    // 并行获取数据
    const [banners, courses, institutions] = await Promise.all([
      this.getBanners(dto.province, dto.city),
      this.getRecommendedCourses(page, pageSize, dto.province, dto.city, dto.latitude, dto.longitude, maxShareRatio),
      this.getRecommendedInstitutions(1, 5, dto.province, dto.city, dto.latitude, dto.longitude, maxShareRatio),
    ]);

    return {
      banners,
      courses,
      institutions,
      maxShareRatio,
    };
  }

  /**
   * 获取首页 Banner 列表（只返回启用的、当前有效期内的）
   */
  async getBanners(province?: string, city?: string) {
    const query = this.bannerRepository
      .getQuery()
      .andWhere('entity.status = :status', { status: 'active' })
      .andWhere('(entity.start_time IS NULL OR entity.start_time <= :now)', {
        now: new Date(),
      })
      .andWhere('(entity.end_time IS NULL OR entity.end_time >= :now)', {
        now: new Date(),
      })
      .orderBy('entity.sort', 'ASC')
      .addOrderBy('entity.id', 'DESC')
      .limit(5);

    // 如果指定了地区，先查询符合条件的机构ID
    let validInstitutionIds: string[] | undefined;
    if (province || city) {
      const institutionQuery = this.institutionRepository.getQuery();
      if (province) {
        institutionQuery.andWhere('entity.province = :province', { province });
      }
      if (city) {
        institutionQuery.andWhere('entity.city = :city', { city });
      }
      const institutions = await institutionQuery.getMany();
      validInstitutionIds = institutions.map(i => i.id);
      
      // 如果没有符合条件的机构，返回空数组
      if (validInstitutionIds.length === 0) {
        return [];
      }
      
      // Banner 必须属于这些机构（或者是平台级 Banner，institution_id 为 null）
      query.andWhere(
        '(entity.institution_id IN (:...institutionIds) OR entity.institution_id IS NULL)',
        { institutionIds: validInstitutionIds }
      );
    }

    return query.getMany();
  }

  /**
   * 获取推荐课程（已上架）
   * 如果有用户位置，使用 PostGIS 计算机构距离
   * 按最高返现金额排序（优先展示返现多的课程）
   */
  async getRecommendedCourses(
    page: number = 1,
    pageSize: number = 10,
    province?: string,
    city?: string,
    userLatitude?: number,
    userLongitude?: number,
    maxShareRatio: number = 50,
  ) {
    // 如果有用户位置，使用 PostGIS 原生查询（性能更好）
    if (userLatitude && userLongitude) {
      // 安全处理坐标值（确保是数字）
      const lat = parseFloat(String(userLatitude));
      const lng = parseFloat(String(userLongitude));
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('无效的坐标参数');
      }

      const conditions: string[] = [
        'c.is_delete = false',
        'c.is_online = true',
        'i.is_delete = false',
        "i.audit_status = 'approved'",
        'i.location IS NOT NULL',
      ];
      const params: any[] = [];
      let paramIndex = 1;

      if (province) {
        conditions.push(`i.province = $${paramIndex}`);
        params.push(province);
        paramIndex++;
      }
      if (city) {
        conditions.push(`i.city = $${paramIndex}`);
        params.push(city);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');
      const offset = (page - 1) * pageSize;

      // 计算课程的最高立减和返现金额
      // 最高返现 = 最高SKU价格 × 课程返现比例
      // 最高立减 = 最高返现 × 最高让利比例
      // 注意：体验课(trial)不参与返现
      const dataQuery = `
        SELECT 
          c.*,
          distance_km(i.location, ${lng}, ${lat}) AS distance,
          json_build_object(
            'id', i.id,
            'name', i.name,
            'logo', i.logo,
            'address', i.address,
            'province', i.province,
            'city', i.city,
            'district', i.district
          ) AS institution,
          COALESCE(sku_info.min_price, 0) AS min_price,
          COALESCE(sku_info.max_price, 0) AS max_price,
          CASE 
            WHEN c.cashback_enabled = true AND c.type != 'trial' AND COALESCE(sku_info.max_price, 0) > 0 
            THEN ROUND(COALESCE(sku_info.max_price, 0) * COALESCE(c.cashback_ratio, 10) / 100 * ${maxShareRatio} / 100, 2)
            ELSE 0
          END AS max_discount_amount,
          CASE 
            WHEN c.cashback_enabled = true AND c.type != 'trial' AND COALESCE(sku_info.max_price, 0) > 0 
            THEN ROUND(COALESCE(sku_info.max_price, 0) * COALESCE(c.cashback_ratio, 10) / 100, 2)
            ELSE 0
          END AS max_cashback_amount
        FROM courses c
        INNER JOIN institutions i ON c.institution_id = i.id
        LEFT JOIN (
          SELECT course_id, MIN(total_price) as min_price, MAX(total_price) as max_price
          FROM course_skus
          WHERE is_delete = false
          GROUP BY course_id
        ) sku_info ON sku_info.course_id = c.id
        WHERE ${whereClause}
        ORDER BY max_discount_amount DESC, c.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(pageSize, offset);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM courses c
        INNER JOIN institutions i ON c.institution_id = i.id
        WHERE ${whereClause}
      `;

      const [data, countResult] = await Promise.all([
        this.dataSource.query(dataQuery, params),
        this.dataSource.query(countQuery, params.slice(0, -2)),
      ]);

      const total = parseInt(countResult[0]?.total || '0', 10);

      // 统一通过 CourseService 添加含佣金的展示价格（佣金计算逻辑集中在 CourseService.addDisplayPricesToCourses）
      await this.courseService.addDisplayPricesToCourses(data);

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    // 无用户位置的查询逻辑
    let institutionIds: string[] | undefined;
    let institutionMap: Map<string, any> | undefined;

    // 如果有地区筛选，先查询符合条件的机构
    if (province || city) {
      const institutions = await this.institutionRepository
        .getQuery()
        .andWhere('entity.audit_status = :auditStatus', {
          auditStatus: 'approved',
        });

      if (province) {
        institutions.andWhere('entity.province = :province', { province });
      }
      if (city) {
        institutions.andWhere('entity.city = :city', { city });
      }

      const result = await institutions.getMany();
      institutionIds = result.map((i) => i.id);
      institutionMap = new Map(result.map(i => [i.id, i]));

      if (institutionIds.length === 0) {
        return { data: [], total: 0, page, pageSize };
      }
    } else {
      // 没有地区筛选，获取所有审核通过的机构用于填充课程信息
      const allInstitutions = await this.institutionRepository
        .getQuery()
        .andWhere('entity.audit_status = :auditStatus', { auditStatus: 'approved' })
        .getMany();
      institutionMap = new Map(allInstitutions.map(i => [i.id, i]));
    }

    // 无位置时使用原生 SQL 来获取课程及其最高返现金额
    const conditions: string[] = [
      'c.is_delete = false',
      'c.is_online = true',
    ];
    const params: any[] = [];
    let paramIndex = 1;

    if (institutionIds && institutionIds.length > 0) {
      // 使用 ANY 数组操作符
      conditions.push(`c.institution_id = ANY($${paramIndex})`);
      params.push(institutionIds);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * pageSize;

    const dataQuery = `
      SELECT 
        c.*,
        COALESCE(sku_info.min_price, 0) AS min_price,
        COALESCE(sku_info.max_price, 0) AS max_price,
        CASE 
          WHEN c.cashback_enabled = true AND c.type != 'trial' AND COALESCE(sku_info.max_price, 0) > 0 
          THEN ROUND(COALESCE(sku_info.max_price, 0) * COALESCE(c.cashback_ratio, 10) / 100 * ${maxShareRatio} / 100, 2)
          ELSE 0
        END AS max_discount_amount,
        CASE 
          WHEN c.cashback_enabled = true AND c.type != 'trial' AND COALESCE(sku_info.max_price, 0) > 0 
          THEN ROUND(COALESCE(sku_info.max_price, 0) * COALESCE(c.cashback_ratio, 10) / 100, 2)
          ELSE 0
        END AS max_cashback_amount
      FROM courses c
      LEFT JOIN (
        SELECT course_id, MIN(total_price) as min_price, MAX(total_price) as max_price
        FROM course_skus
        WHERE is_delete = false
        GROUP BY course_id
      ) sku_info ON sku_info.course_id = c.id
      WHERE ${whereClause}
      ORDER BY max_discount_amount DESC, c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(pageSize, offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM courses c
      WHERE ${whereClause}
    `;

    const [data, countResult] = await Promise.all([
      this.dataSource.query(dataQuery, params),
      this.dataSource.query(countQuery, params.slice(0, -2)),
    ]);

    const total = parseInt(countResult[0]?.total || '0', 10);

    // 为每个课程添加机构信息
    const coursesWithInfo = data.map((course: any) => {
      const institution = institutionMap?.get(course.institution_id);

      return {
        ...course,
        institution: institution ? {
          id: institution.id,
          name: institution.name,
          logo: institution.logo,
          address: institution.address,
          province: institution.province,
          city: institution.city,
          district: institution.district,
        } : null,
        distance: null,  // 无用户位置时距离为 null
      };
    });

    // 统一通过 CourseService 添加含佣金的展示价格（佣金计算逻辑集中在 CourseService.addDisplayPricesToCourses）
    await this.courseService.addDisplayPricesToCourses(coursesWithInfo);

    return {
      data: coursesWithInfo,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取推荐机构（已审核通过）
   * 如果有用户位置，使用 PostGIS 计算距离并按距离排序
   * 按最高返现金额排序（优先展示返现多的机构）
   */
  async getRecommendedInstitutions(
    page: number = 1,
    pageSize: number = 5,
    province?: string,
    city?: string,
    userLatitude?: number,
    userLongitude?: number,
    maxShareRatio: number = 50,
  ) {
    // 如果有用户位置，使用 PostGIS 原生查询
    if (userLatitude && userLongitude) {
      // 安全处理坐标值（确保是数字）
      const lat = parseFloat(String(userLatitude));
      const lng = parseFloat(String(userLongitude));
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('无效的坐标参数');
      }

      const conditions: string[] = [
        'i.is_delete = false',
        "i.audit_status = 'approved'",
        'i.location IS NOT NULL',
      ];
      const params: any[] = [];
      let paramIndex = 1;

      if (province) {
        conditions.push(`i.province = $${paramIndex}`);
        params.push(province);
        paramIndex++;
      }
      if (city) {
        conditions.push(`i.city = $${paramIndex}`);
        params.push(city);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');
      const offset = (page - 1) * pageSize;

      // 使用子查询计算机构的最高立减和返现金额
      // 最高返现 = 机构所有非体验课中最高的（最高SKU价格 × 返现比例）
      // 最高立减 = 最高返现 × 最高让利比例
      const dataQuery = `
        SELECT 
          i.*,
          distance_km(i.location, ${lng}, ${lat}) AS distance,
          COALESCE(course_discount.max_discount, 0) AS max_discount_amount,
          COALESCE(course_discount.max_cashback, 0) AS max_cashback_amount
        FROM institutions i
        LEFT JOIN (
          SELECT 
            c.institution_id,
            MAX(
              CASE 
                WHEN c.cashback_enabled = true AND c.type != 'trial' AND COALESCE(sku_info.max_price, 0) > 0 
                THEN ROUND(COALESCE(sku_info.max_price, 0) * COALESCE(c.cashback_ratio, 10) / 100 * ${maxShareRatio} / 100, 2)
                ELSE 0
              END
            ) as max_discount,
            MAX(
              CASE 
                WHEN c.cashback_enabled = true AND c.type != 'trial' AND COALESCE(sku_info.max_price, 0) > 0 
                THEN ROUND(COALESCE(sku_info.max_price, 0) * COALESCE(c.cashback_ratio, 10) / 100, 2)
                ELSE 0
              END
            ) as max_cashback
          FROM courses c
          LEFT JOIN (
            SELECT course_id, MAX(total_price) as max_price
            FROM course_skus
            WHERE is_delete = false
            GROUP BY course_id
          ) sku_info ON sku_info.course_id = c.id
          WHERE c.is_delete = false AND c.is_online = true AND c.type != 'trial'
          GROUP BY c.institution_id
        ) course_discount ON course_discount.institution_id = i.id
        WHERE ${whereClause}
        ORDER BY max_discount_amount DESC, distance ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(pageSize, offset);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM institutions i
        WHERE ${whereClause}
      `;

      const [data, countResult] = await Promise.all([
        this.dataSource.query(dataQuery, params),
        this.dataSource.query(countQuery, params.slice(0, -2)),
      ]);

      const total = parseInt(countResult[0]?.total || '0', 10);

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    // 无用户位置，使用原生 SQL 查询（包含最高返现金额）
    const conditions: string[] = [
      'i.is_delete = false',
      "i.audit_status = 'approved'",
    ];
    const params: any[] = [];
    let paramIndex = 1;

    if (province) {
      conditions.push(`i.province = $${paramIndex}`);
      params.push(province);
      paramIndex++;
    }
    if (city) {
      conditions.push(`i.city = $${paramIndex}`);
      params.push(city);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * pageSize;

    const dataQuery = `
      SELECT 
        i.*,
        NULL AS distance,
        COALESCE(course_discount.max_discount, 0) AS max_discount_amount,
        COALESCE(course_discount.max_cashback, 0) AS max_cashback_amount
      FROM institutions i
      LEFT JOIN (
        SELECT 
          c.institution_id,
          MAX(
            CASE 
              WHEN c.cashback_enabled = true AND c.type != 'trial' AND COALESCE(sku_info.max_price, 0) > 0 
              THEN ROUND(COALESCE(sku_info.max_price, 0) * COALESCE(c.cashback_ratio, 10) / 100 * ${maxShareRatio} / 100, 2)
              ELSE 0
            END
          ) as max_discount,
          MAX(
            CASE 
              WHEN c.cashback_enabled = true AND c.type != 'trial' AND COALESCE(sku_info.max_price, 0) > 0 
              THEN ROUND(COALESCE(sku_info.max_price, 0) * COALESCE(c.cashback_ratio, 10) / 100, 2)
              ELSE 0
            END
          ) as max_cashback
        FROM courses c
        LEFT JOIN (
          SELECT course_id, MAX(total_price) as max_price
          FROM course_skus
          WHERE is_delete = false
          GROUP BY course_id
        ) sku_info ON sku_info.course_id = c.id
        WHERE c.is_delete = false AND c.is_online = true AND c.type != 'trial'
        GROUP BY c.institution_id
      ) course_discount ON course_discount.institution_id = i.id
      WHERE ${whereClause}
      ORDER BY max_discount_amount DESC, i.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(pageSize, offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM institutions i
      WHERE ${whereClause}
    `;

    const [data, countResult] = await Promise.all([
      this.dataSource.query(dataQuery, params),
      this.dataSource.query(countQuery, params.slice(0, -2)),
    ]);

    const total = parseInt(countResult[0]?.total || '0', 10);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
