import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { CourseEntity } from '../entities/course.entity';
import { UserContextService } from '@/common/services/user-context.service';
import { CourseSkuRepository } from './course-sku.repository';
import { InstitutionRepository } from '@/modules/institution/repositories/institution.repository';
import { TeacherRepository } from '@/modules/teacher/repositories/teacher.repository';

@Injectable()
export class CourseRepository extends BaseRepository<CourseEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
    private courseSkuRepository: CourseSkuRepository,
    private institutionRepository: InstitutionRepository,
    private teacherRepository: TeacherRepository,
  ) {
    super(CourseEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据机构ID查询课程列表
   */
  async findByInstitutionId(
    institutionId: string,
    options?: {
      isOnline?: boolean;
      type?: string;
      keyword?: string;
      categoryCode?: string;
      minPrice?: number;
      maxPrice?: number;
      page?: number;
      pageSize?: number;
    },
  ) {
    // ⚠️ 必须使用 andWhere 而不是 where，否则会覆盖 getQuery() 的 is_delete 过滤
    const query = this.getQuery()
      .andWhere('entity.institution_id = :institutionId', {
        institutionId,
      });

    if (options?.isOnline !== undefined) {
      query.andWhere('entity.is_online = :isOnline', {
        isOnline: options.isOnline,
      });
    }

    if (options?.type) {
      query.andWhere('entity.type = :type', { type: options.type });
    }

    // 关键字搜索（课程标题）
    if (options?.keyword) {
      query.andWhere('entity.title ILIKE :keyword', {
        keyword: `%${options.keyword}%`,
      });
    }

    // 分类筛选
    if (options?.categoryCode) {
      query.andWhere('entity.category_code = :categoryCode', {
        categoryCode: options.categoryCode,
      });
    }

    // 价格区间筛选（基于最低SKU价格）
    if (options?.minPrice !== undefined || options?.maxPrice !== undefined) {
      // 子查询：获取每个课程的最低价格（直接查询 course_skus 表）
      const subQuery = this.dataSource
        .createQueryBuilder()
        .select('MIN(sku.total_price)', 'min_price')
        .from('course_skus', 'sku')
        .where('sku.course_id = entity.id')
        .andWhere('sku.is_delete = false')
        .getQuery();

      if (options?.minPrice !== undefined) {
        query.andWhere(`(${subQuery}) >= :minPrice`, {
          minPrice: options.minPrice,
        });
      }
      if (options?.maxPrice !== undefined) {
        query.andWhere(`(${subQuery}) <= :maxPrice`, {
          maxPrice: options.maxPrice,
        });
      }
    }

    query.orderBy('entity.id', 'DESC');

    // ⚠️ 修复：分页查询
    if (options?.page && options?.pageSize) {
      const [data, total] = await query
        .skip((options.page - 1) * options.pageSize)
        .take(options.pageSize)
        .getManyAndCount();

      // 手动加载所有课程的 SKU
      await this.loadSkusForCourses(data);

      // 确保返回正确的分页格式
      return {
        data: data || [],  // 确保data不为null
        total: total || 0,
        page: options.page,
        pageSize: options.pageSize,
      };
    }

    // ⚠️ 修复：非分页查询 - 确保始终返回数组
    const result = await query.getMany();
    
    // getMany()应该总是返回数组，但为了安全起见，做null检查
    if (!result || !Array.isArray(result)) {
      console.error('[CourseRepository] getMany()返回了非数组值:', result);
      return [];
    }
    
    // 手动加载所有课程的 SKU
    await this.loadSkusForCourses(result);
    
    return result;
  }

  /**
   * 通用课程查询方法（支持有或无 institutionId，支持距离筛选）
   * 当提供 maxDistance 时，使用 PostGIS 进行空间查询
   */
  async findCourses(
    options?: {
      institutionId?: string;
      isOnline?: boolean;
      type?: string;
      keyword?: string;
      categoryCode?: string;
      minPrice?: number;
      maxPrice?: number;
      page?: number;
      pageSize?: number;
      latitude?: number;      // 用户纬度（用于计算距离）
      longitude?: number;     // 用户经度（用于计算距离）
      maxDistance?: number;   // 最大距离（公里），用于距离筛选
      period?: string;
      startDate?: string;
      endDate?: string;
      sortBy?: 'default' | 'price_asc' | 'price_desc' | 'sales' | 'rating' | 'distance';
    },
  ) {
    // 如果有距离筛选条件，需要使用原生 SQL 查询关联 institutions 表
    if (options?.latitude && options?.longitude && options?.maxDistance) {
      return this.findCoursesWithDistanceFilter({
        ...options,
        latitude: options.latitude,  // 明确类型为 number
        longitude: options.longitude,
        maxDistance: options.maxDistance,
      });
    }
    
    const query = this.getQuery();

    // 机构ID筛选（可选）
    if (options?.institutionId) {
      query.andWhere('entity.institution_id = :institutionId', {
        institutionId: options.institutionId,
      });
    }

    // 默认只查询上线课程（C端浏览场景）
    // 如果明确传了 isOnline 参数则使用传入的值
    if (options?.isOnline !== undefined) {
      query.andWhere('entity.is_online = :isOnline', {
        isOnline: options.isOnline,
      });
    } else if (!options?.institutionId) {
      // 无机构ID时（C端浏览），默认只查询上线课程
      query.andWhere('entity.is_online = :isOnline', {
        isOnline: true,
      });
    }

    if (options?.type) {
      query.andWhere('entity.type = :type', { type: options.type });
    }

    // 关键字搜索（课程标题）
    if (options?.keyword) {
      query.andWhere('entity.title ILIKE :keyword', {
        keyword: `%${options.keyword}%`,
      });
    }

    // 分类筛选
    if (options?.categoryCode) {
      query.andWhere('entity.category_code = :categoryCode', {
        categoryCode: options.categoryCode,
      });
    }

    // 价格区间筛选（基于最低SKU价格）
    if (options?.minPrice !== undefined || options?.maxPrice !== undefined) {
      const subQuery = this.dataSource
        .createQueryBuilder()
        .select('MIN(sku.total_price)', 'min_price')
        .from('course_skus', 'sku')
        .where('sku.course_id = entity.id')
        .andWhere('sku.is_delete = false')
        .getQuery();

      if (options?.minPrice !== undefined) {
        query.andWhere(`(${subQuery}) >= :minPrice`, {
          minPrice: options.minPrice,
        });
      }
      if (options?.maxPrice !== undefined) {
        query.andWhere(`(${subQuery}) <= :maxPrice`, {
          maxPrice: options.maxPrice,
        });
      }
    }

    // 时间过滤
    this.applyPeriodFilter(query, options?.period, options?.startDate, options?.endDate);

    // 排序逻辑
    switch (options?.sortBy) {
      case 'price_asc':
        // 按最低 SKU 价格升序（子查询方式）
        query.orderBy(
          `(SELECT MIN(sku.total_price) FROM course_skus sku WHERE sku.course_id = entity.id AND sku.is_delete = false)`,
          'ASC',
        );
        break;
      case 'price_desc':
        query.orderBy(
          `(SELECT MIN(sku.total_price) FROM course_skus sku WHERE sku.course_id = entity.id AND sku.is_delete = false)`,
          'DESC',
        );
        break;
      case 'sales':
        // 按销量（booked_count 之和或订单数）降序 - 用订单完成数近似
        query.orderBy(
          `(SELECT COUNT(*) FROM orders o WHERE o.course_id = entity.id AND o.status NOT IN ('cancelled','refunded') AND o.is_delete = false)`,
          'DESC',
        );
        break;
      case 'rating':
        // 按机构平均评分降序（课程维度暂无评分，使用机构评分）
        query
          .leftJoin('institution', 'inst', 'inst.id = entity.institution_id AND inst.is_delete = false')
          .orderBy('inst.avg_rating', 'DESC');
        break;
      case 'distance':
        // 距离排序需要坐标，fallback 到默认排序
        query.orderBy('entity.id', 'DESC');
        break;
      default:
        query.orderBy('entity.id', 'DESC');
    }

    // 分页查询
    if (options?.page && options?.pageSize) {
      const [data, total] = await query
        .skip((options.page - 1) * options.pageSize)
        .take(options.pageSize)
        .getManyAndCount();

      await this.loadSkusForCourses(data);
      await this.loadInstitutionsForCourses(data, options.latitude, options.longitude);

      return {
        data: data || [],
        total: total || 0,
        page: options.page,
        pageSize: options.pageSize,
      };
    }

    // 非分页查询
    const result = await query.getMany();
    
    if (!result || !Array.isArray(result)) {
      return [];
    }
    
    await this.loadSkusForCourses(result);
    await this.loadInstitutionsForCourses(result, options?.latitude, options?.longitude);
    
    return result;
  }

  /**
   * 使用 PostGIS 进行距离筛选的课程查询
   * 通过 ST_DWithin 利用 GiST 索引高效过滤
   */
  private async findCoursesWithDistanceFilter(options: {
    institutionId?: string;
    isOnline?: boolean;
    type?: string;
    keyword?: string;
    categoryCode?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    pageSize?: number;
    latitude: number;
    longitude: number;
    maxDistance: number;  // 公里
  }) {
    const maxDistanceMeters = options.maxDistance * 1000;
    
    // 构建动态条件
    const conditions: string[] = [
      'c.is_delete = false',
      'i.is_delete = false',
      'i.location IS NOT NULL',
      // 使用 PostGIS ST_DWithin 进行距离筛选（利用 GiST 索引）
      `ST_DWithin(
        i.location,
        ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography,
        $3::float8
      )`,
    ];
    const params: any[] = [options.latitude, options.longitude, maxDistanceMeters];
    let paramIndex = 4;

    // 默认只查询上线课程
    if (options.isOnline !== undefined) {
      conditions.push(`c.is_online = $${paramIndex}`);
      params.push(options.isOnline);
      paramIndex++;
    } else if (!options.institutionId) {
      conditions.push('c.is_online = true');
    }

    if (options.institutionId) {
      conditions.push(`c.institution_id = $${paramIndex}`);
      params.push(options.institutionId);
      paramIndex++;
    }

    if (options.type) {
      conditions.push(`c.type = $${paramIndex}`);
      params.push(options.type);
      paramIndex++;
    }

    if (options.keyword) {
      conditions.push(`c.title ILIKE $${paramIndex}`);
      params.push(`%${options.keyword}%`);
      paramIndex++;
    }

    if (options.categoryCode) {
      conditions.push(`c.category_code = $${paramIndex}`);
      params.push(options.categoryCode);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // 分页查询
    if (options.page && options.pageSize) {
      const offset = (options.page - 1) * options.pageSize;

      const dataQuery = `
        SELECT 
          c.*,
          distance_km(i.location, $2::float8, $1::float8) AS distance_meters,
          json_build_object(
            'id', i.id,
            'name', i.name,
            'logo', i.logo,
            'address', i.address,
            'province', i.province,
            'city', i.city,
            'district', i.district,
            'latitude', i.latitude,
            'longitude', i.longitude
          ) AS institution
        FROM courses c
        INNER JOIN institutions i ON c.institution_id = i.id
        WHERE ${whereClause}
        ORDER BY distance_meters ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(options.pageSize, offset);

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

      // 处理返回数据格式
      const formattedData = data.map((item: any) => ({
        ...item,
        distance: item.distance_meters,
        institution: item.institution,
      }));

      // 加载 SKU
      await this.loadSkusForCourses(formattedData);

      return {
        data: formattedData,
        total,
        page: options.page,
        pageSize: options.pageSize,
      };
    }

    // 非分页查询
    const dataQuery = `
      SELECT 
        c.*,
        distance_km(i.location, $2::float8, $1::float8) AS distance_meters,
        json_build_object(
          'id', i.id,
          'name', i.name,
          'logo', i.logo,
          'address', i.address
        ) AS institution
      FROM courses c
      INNER JOIN institutions i ON c.institution_id = i.id
      WHERE ${whereClause}
      ORDER BY distance_meters ASC
    `;

    const data = await this.dataSource.query(dataQuery, params);

    const formattedData = data.map((item: any) => ({
      ...item,
      distance: item.distance_meters,
      institution: item.institution,
    }));

    await this.loadSkusForCourses(formattedData);

    return formattedData;
  }

  /**
   * 批量加载课程的机构信息（性能优化）
   * 使用 PostGIS ST_Distance 计算距离（需要传入用户经纬度）
   */
  private async loadInstitutionsForCourses(
    courses: CourseEntity[],
    userLatitude?: number,
    userLongitude?: number,
  ) {
    if (!courses || courses.length === 0) {
      return;
    }

    // 收集所有机构ID（去重）
    const institutionIds = [...new Set(courses.map(c => c.institution_id))];
    
    let institutions: any[];
    
    // 如果有用户位置，使用 PostGIS 直接计算距离
    if (userLatitude && userLongitude) {
      const query = `
        SELECT 
          i.*,
          distance_km(i.location, $2::float8, $1::float8) AS distance_meters
        FROM institutions i
        WHERE i.id = ANY($3)
          AND i.is_delete = false
      `;
      
      institutions = await this.dataSource.query(query, [
        userLatitude,
        userLongitude,
        institutionIds,
      ]);
    } else {
      // 没有用户位置，普通查询
      institutions = await this.institutionRepository
        .getQuery()
        .andWhere('entity.id IN (:...institutionIds)', { institutionIds })
        .getMany();
    }
    
    // 按ID建立映射
    const institutionMap = new Map(institutions.map((i: any) => [i.id, i]));
    
    // 组装到每个课程对象中
    for (const course of courses) {
      const institution = institutionMap.get(course.institution_id);
      if (institution) {
        (course as any).institution = {
          id: institution.id,
          name: institution.name,
          logo: institution.logo,
          address: institution.address,
          province: institution.province,
          city: institution.city,
          district: institution.district,
          latitude: institution.latitude,
          longitude: institution.longitude,
        };
        // 距离（PostGIS 返回的是米，保持单位一致）
        (course as any).distance = institution.distance_meters ?? null;
      } else {
        (course as any).institution = null;
        (course as any).distance = null;
      }
    }
  }

  /**
   * 批量加载课程的 SKU（性能优化）
   */
  private async loadSkusForCourses(courses: CourseEntity[]) {
    if (!courses || courses.length === 0) {
      return;
    }

    const courseIds = courses.map(c => c.id);
    
    // 一次性查询所有相关的 SKU
    const allSkus = await this.courseSkuRepository
      .getQuery()
      .andWhere('entity.course_id IN (:...courseIds)', { courseIds })
      .getMany();
    
    // 按 course_id 分组
    const skusByCourseId = new Map<string, any[]>();
    for (const sku of allSkus) {
      if (!skusByCourseId.has(sku.course_id)) {
        skusByCourseId.set(sku.course_id, []);
      }
      skusByCourseId.get(sku.course_id)!.push(sku);
    }
    
    // 组装到每个课程对象中
    for (const course of courses) {
      course.skus = skusByCourseId.get(course.id) || [];
    }
  }

  /**
   * 根据ID查询课程详情（包含SKU、机构、教师）
   * ❗️ 应用层手动加载关联数据，不使用数据库关联
   */
  async findByIdWithSkus(id: string) {
    // 1. 查询课程基本信息
    const course = await this.getQuery()
      .andWhere('entity.id = :id', { id })
      .getOne();
    
    if (!course) {
      return null;
    }

    // 2. 手动查询该课程的 SKU
    const skus = await this.courseSkuRepository
      .getQuery()
      .andWhere('entity.course_id = :courseId', { courseId: id })
      .getMany();
    
    // 3. 手动加载机构信息
    const institution = await this.institutionRepository.findOneById(course.institution_id);
    
    // 4. 手动加载该机构的教师列表（只取前4个在职教师）
    let teachers: any[] = [];
    if (course.institution_id) {
      teachers = await this.teacherRepository
        .getQuery()
        .andWhere('entity.institution_id = :institutionId', { institutionId: course.institution_id })
        .andWhere('entity.status = :status', { status: 'active' })
        .orderBy('entity.sort_order', 'ASC')
        .limit(4)
        .getMany();
    }
    
    // 5. 组装数据
    (course as any).skus = skus;
    (course as any).institution = institution ? {
      id: institution.id,
      name: institution.name,
      logo: institution.logo,
      address: institution.address,
      contact_phone: institution.contact_phone,
    } : null;
    (course as any).teachers = teachers.map(t => ({
      id: t.id,
      name: t.name,
      photo: t.photo,
      title: t.title,
      subjects: t.subjects,
    }));
    
    return course;
  }

  /**
   * 查询附近机构的课程（基于机构位置）
   * @param latitude - 用户纬度
   * @param longitude - 用户经度
   * @param radiusKm - 搜索半径（公里）
   * @param options - 筛选条件
   */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    options?: {
      type?: string;
      categoryCode?: string;
      keyword?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // 构建 WHERE 条件
    const conditions: string[] = [
      'c.is_delete = false',
      'c.is_online = true',
      'i.audit_status = $3',
      'i.latitude IS NOT NULL',
      'i.longitude IS NOT NULL',
    ];
    const params: any[] = [latitude, longitude, 'approved'];
    let paramIndex = 4;

    if (options?.type) {
      conditions.push(`c.type = $${paramIndex}`);
      params.push(options.type);
      paramIndex++;
    }

    if (options?.categoryCode) {
      conditions.push(`c.category_code = $${paramIndex}`);
      params.push(options.categoryCode);
      paramIndex++;
    }

    if (options?.keyword) {
      conditions.push(`c.title ILIKE $${paramIndex}`);
      params.push(`%${options.keyword}%`);
      paramIndex++;
    }

    // 距离子查询
    const distanceFormula = `
      (
        6371 * acos(
          cos(radians($1)) * cos(radians(i.latitude::numeric)) *
          cos(radians(i.longitude::numeric) - radians($2)) +
          sin(radians($1)) * sin(radians(i.latitude::numeric))
        )
      )
    `;

    conditions.push(`${distanceFormula} <= ${radiusKm}`);

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM courses c
      INNER JOIN institutions i ON c.institution_id = i.id
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await this.dataSource.query(countQuery, params);
    const total = parseInt(countResult[0]?.total || '0');

    // 查询数据
    const dataQuery = `
      SELECT 
        c.*,
        i.name as institution_name,
        i.logo as institution_logo,
        i.province,
        i.city,
        i.district,
        i.address,
        ${distanceFormula} as distance
      FROM courses c
      INNER JOIN institutions i ON c.institution_id = i.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY distance ASC, c.id DESC
      LIMIT ${pageSize} OFFSET ${skip}
    `;

    const data = await this.dataSource.query(dataQuery, params);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 按区域搜索课程（支持距离排序）
   */
  async findByArea(
    province?: string,
    city?: string,
    district?: string,
    userLatitude?: number,
    userLongitude?: number,
    options?: {
      type?: string;
      categoryCode?: string;
      keyword?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // 构建 WHERE 条件
    const conditions: string[] = [
      'c.is_delete = false',
      'c.is_online = true',
      'i.audit_status = $1',
    ];
    const params: any[] = ['approved'];
    let paramIndex = 2;

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
    if (district) {
      conditions.push(`i.district = $${paramIndex}`);
      params.push(district);
      paramIndex++;
    }

    if (options?.type) {
      conditions.push(`c.type = $${paramIndex}`);
      params.push(options.type);
      paramIndex++;
    }
    if (options?.categoryCode) {
      conditions.push(`c.category_code = $${paramIndex}`);
      params.push(options.categoryCode);
      paramIndex++;
    }
    if (options?.keyword) {
      conditions.push(`c.title ILIKE $${paramIndex}`);
      params.push(`%${options.keyword}%`);
      paramIndex++;
    }

    // 距离计算
    let orderClause = 'c.id DESC';
    let distanceSelect = 'NULL as distance';
    
    if (userLatitude && userLongitude) {
      distanceSelect = `
        (
          6371 * acos(
            cos(radians(${userLatitude})) * cos(radians(i.latitude::numeric)) *
            cos(radians(i.longitude::numeric) - radians(${userLongitude})) +
            sin(radians(${userLatitude})) * sin(radians(i.latitude::numeric))
          )
        ) as distance
      `;
      orderClause = 'distance ASC, c.id DESC';
    }

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM courses c
      INNER JOIN institutions i ON c.institution_id = i.id
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await this.dataSource.query(countQuery, params);
    const total = parseInt(countResult[0]?.total || '0');

    // 查询数据
    const dataQuery = `
      SELECT 
        c.*,
        i.name as institution_name,
        i.logo as institution_logo,
        i.province,
        i.city,
        i.district,
        i.address,
        ${distanceSelect}
      FROM courses c
      INNER JOIN institutions i ON c.institution_id = i.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderClause}
      LIMIT ${pageSize} OFFSET ${skip}
    `;

    const data = await this.dataSource.query(dataQuery, params);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
