import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { InstitutionEntity } from '../entities/institution.entity';
import { UserContextService } from '@/common/services/user-context.service';
import { MoneyMath } from '@/common/utils/money.util';

@Injectable()
export class InstitutionRepository extends BaseRepository<InstitutionEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(InstitutionEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 根据当前用户查询机构（单个，保留用于向后兼容）
   */
  async findByCurrentUser(): Promise<InstitutionEntity | null> {
    const userId = this.userCtx.getCurrentUserId();
    return this.getQuery()
      .where('entity.created_by = :userId', { userId })
      .getOne();
  }

  /**
   * 根据当前用户查询所有机构
   */
  async findAllByCurrentUser(): Promise<InstitutionEntity[]> {
    const userId = this.userCtx.getCurrentUserId();
    return this.getQuery()
      .where('entity.created_by = :userId', { userId })
      .orderBy('entity.created_at', 'DESC')
      .getMany();
  }

  /**
   * 根据审核状态查询机构列表
   */
  async findByAuditStatus(status: string) {
    return this.getQuery()
      .where('entity.audit_status = :status', { status })
      .getMany();
  }

  /**
   * 根据用户ID查询机构（通过created_by字段）
   */
  async findOneByUserId(userId: string): Promise<InstitutionEntity | null> {
    return this.getQuery()
      .where('entity.created_by = :userId', { userId })
      .getOne();
  }

  /**
   * 查询机构列表（分页，支持状态筛选、距离计算和距离筛选）
   * 使用 PostGIS ST_Distance 和 ST_DWithin 进行地理空间查询
   * @param page - 页码
   * @param pageSize - 每页数量
   * @param status - 审核状态筛选条件，不传则返回所有
   * @param userLatitude - 用户纬度（可选，用于距离计算）
   * @param userLongitude - 用户经度（可选，用于距离计算）
   * @param maxDistanceKm - 最大距离筛选（公里），可选
   */
  async findInstitutions(
    page?: number,
    pageSize?: number,
    status?: string,
    userLatitude?: number,
    userLongitude?: number,
    maxDistanceKm?: number,
    keyword?: string,
  ) {
    // 如果提供了用户位置，使用 PostGIS 原生查询
    if (userLatitude && userLongitude) {
      const maxDistanceMeters = maxDistanceKm ? maxDistanceKm * 1000 : null;
      
      // 安全地转换数值参数（防止 SQL 注入）
      const lat = Number(userLatitude);
      const lng = Number(userLongitude);
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Invalid latitude or longitude');
      }
      
      // ─────────────────────────────────────────────────────────
      // 参数设计说明：
      // - coordParams：仅包含坐标 [lng, lat]，用于 SELECT 中的 distance_km()
      //   对应 $1, $2 占位符（仅在 dataQuery 的 SELECT 子句中使用）
      // - filterParams：仅包含过滤条件参数（status、keyword、maxDistance）
      //   对应 $1, $2, ... 占位符（在 whereClause 和 countQuery 中使用）
      // - dataQuery 合并两个参数数组：[...coordParams, ...filterParams, pageSize, offset]
      //   其中 distance_km 引用 $1, $2，filter 条件引用 $3, $4...，LIMIT/OFFSET 在最后
      // ─────────────────────────────────────────────────────────
      const coordParams: any[] = [lng, lat]; // $1=lng, $2=lat（仅 dataQuery SELECT 用）
      const filterParams: any[] = [];         // $1, $2... in countQuery / whereClause

      // 构建 WHERE 条件（filterParams 参数从 $1 开始）
      const conditions: string[] = [
        'i.is_delete = false',
        'i.location IS NOT NULL',
      ];

      // 状态筛选 - 验证合法值，防止 SQL 注入
      if (status) {
        const validStatuses = ['draft', 'pending', 'approved', 'rejected', 'frozen'];
        if (!validStatuses.includes(status)) {
          throw new Error('Invalid status value');
        }
        filterParams.push(status);
        conditions.push(`i.audit_status = $${filterParams.length}`);
      }

      // 关键词搜索（名称、简介模糊匹配）
      if (keyword) {
        filterParams.push(`%${keyword}%`);
        const idx = filterParams.length;
        conditions.push(`(i.name ILIKE $${idx} OR i.introduction ILIKE $${idx})`);
      }
      
      // 添加距离筛选条件（引用 coordParams 中的 $1, $2 via OFFSET）
      // 注意：在 countQuery 中 whereClause 参数是 filterParams，但 ST_DWithin 需要坐标
      // 所以 maxDistance 条件使用内联字面量而非参数（已经验证过是数字，不存在注入风险）
      if (maxDistanceMeters) {
        conditions.push(`ST_DWithin(
          i.location,
          ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography,
          ${maxDistanceMeters}::float8
        )`);
      }

      const whereClause = conditions.join(' AND ');

      // 分页模式
      if (page && pageSize) {
        const offset = (page - 1) * pageSize;

        // dataQuery: $1=lng, $2=lat (coordParams), $3.. are filterParams, 最后是 LIMIT/OFFSET
        const filterOffset = coordParams.length; // filterParams 在 dataQuery 中的偏移量
        // 重新构建 dataQuery 版本的 whereClause（filterParams 编号需要 +filterOffset）
        const dataConditions: string[] = [
          'i.is_delete = false',
          'i.location IS NOT NULL',
        ];
        let fIdx = 0;
        if (status) {
          fIdx++;
          dataConditions.push(`i.audit_status = $${filterOffset + fIdx}`);
        }
        if (keyword) {
          fIdx++;
          const dIdx = filterOffset + fIdx;
          dataConditions.push(`(i.name ILIKE $${dIdx} OR i.introduction ILIKE $${dIdx})`);
        }
        if (maxDistanceMeters) {
          dataConditions.push(`ST_DWithin(
            i.location,
            ST_SetSRID(ST_MakePoint($1::float8, $2::float8), 4326)::geography,
            ${maxDistanceMeters}::float8
          )`);
        }
        const dataWhereClause = dataConditions.join(' AND ');
        const allDataParams = [...coordParams, ...filterParams];

        // 查询数据（带距离）
        const dataQuery = `
          SELECT 
            i.*,
            distance_km(i.location, $1::float8, $2::float8) AS distance
          FROM institutions i
          WHERE ${dataWhereClause}
          ORDER BY distance ASC
          LIMIT $${allDataParams.length + 1} OFFSET $${allDataParams.length + 2}
        `;

        // 查询总数（使用 filterParams + whereClause，无需坐标参数）
        const countQuery = `
          SELECT COUNT(*) as total
          FROM institutions i
          WHERE ${whereClause}
        `;
        
        const [data, countResult] = await Promise.all([
          this.dataSource.query(dataQuery, [...allDataParams, pageSize, offset]),
          this.dataSource.query(countQuery, filterParams),
        ]);

        const total = parseInt(countResult[0]?.total || '0', 10);

        return {
          data: data.map((item: any) => ({
            ...item,
            distance: MoneyMath.format(item.distance),
          })),
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        };
      } else {
        // 不分页 dataQuery 同样需要重建 whereClause（filterParams 偏移）
        const filterOffset = coordParams.length;
        const dataConditions: string[] = [
          'i.is_delete = false',
          'i.location IS NOT NULL',
        ];
        let fIdx = 0;
        if (status) {
          fIdx++;
          dataConditions.push(`i.audit_status = $${filterOffset + fIdx}`);
        }
        if (keyword) {
          fIdx++;
          const dIdx = filterOffset + fIdx;
          dataConditions.push(`(i.name ILIKE $${dIdx} OR i.introduction ILIKE $${dIdx})`);
        }
        if (maxDistanceMeters) {
          dataConditions.push(`ST_DWithin(
            i.location,
            ST_SetSRID(ST_MakePoint($1::float8, $2::float8), 4326)::geography,
            ${maxDistanceMeters}::float8
          )`);
        }
        const dataWhereClause = dataConditions.join(' AND ');

        // 不分页，返回所有结果
        const dataQuery = `
          SELECT 
            i.*,
            distance_km(i.location, $1::float8, $2::float8) AS distance
          FROM institutions i
          WHERE ${dataWhereClause}
          ORDER BY distance ASC
        `;
        
        const data = await this.dataSource.query(dataQuery, [...coordParams, ...filterParams]);
        return data.map((item: any) => ({
          ...item,
          distance: MoneyMath.format(item.distance),
        }));
      }
    } else {
      // 没有位置信息，使用 TypeORM 查询
      const query = this.getQuery();

      if (status) {
        query.andWhere('entity.audit_status = :status', { status });
      }

      // 关键词搜索（名称、简介模糊匹配）
      if (keyword) {
        query.andWhere(
          '(entity.name ILIKE :keyword OR entity.introduction ILIKE :keyword)',
          { keyword: `%${keyword}%` },
        );
      }

      query.orderBy('entity.created_at', 'DESC');

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
      } else {
        // 不分页，返回数组
        return query.getMany();
      }
    }
  }

  /**
   * 根据ID列表批量查询机构
   */
  async findByIds(ids: string[]): Promise<InstitutionEntity[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    return this.getQuery()
      .whereInIds(ids)
      .orderBy('entity.created_at', 'DESC')
      .getMany();
  }

  /**
   * 查询附近的机构（使用 PostGIS ST_DWithin 和 ST_Distance）
   * @param latitude - 用户纬度
   * @param longitude - 用户经度
   * @param radiusKm - 搜索半径（公里），默认10公里
   * @param limit - 返回数量限制，默认20
   * @param auditStatus - 审核状态筛选，默认 'approved'
   */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    limit: number = 20,
    auditStatus: string = 'approved',
  ): Promise<Array<InstitutionEntity & { distance: number }>> {
    // 使用 PostGIS 函数：
    // - distance_km(location, lng, lat) 计算距离（返回公里）- 封装了 ST_Distance/1000.0
    // - ST_DWithin(location, point, distance_meters) 筛选指定半径内的记录（使用 GiST 索引）
    const radiusMeters = radiusKm * 1000;

    const query = `
      SELECT 
        i.*,
        distance_km(i.location, $2::float8, $1::float8) AS distance
      FROM institutions i
      WHERE 
        i.is_delete = false
        AND i.audit_status = $3
        AND i.location IS NOT NULL
        AND ST_DWithin(
          i.location,
          ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography,
          $4::float8
        )
      ORDER BY distance ASC
      LIMIT $5
    `;

    const results = await this.dataSource.query(query, [
      latitude,
      longitude,
      auditStatus,
      radiusMeters,
      limit,
    ]);

    return results;
  }

  /**
   * 按区域搜索机构（省市区筛选 + 距离排序 + 距离筛选）
   * 使用 PostGIS ST_Distance 和 ST_DWithin 进行地理空间查询
   * @param province - 省份
   * @param city - 城市
   * @param district - 区县（可选）
   * @param userLatitude - 用户纬度（可选，用于距离排序）
   * @param userLongitude - 用户经度（可选，用于距离排序）
   * @param maxDistanceKm - 最大距离筛选（公里），可选
   * @param page - 页码
   * @param pageSize - 每页数量
   */
  async findByArea(
    province?: string,
    city?: string,
    district?: string,
    userLatitude?: number,
    userLongitude?: number,
    maxDistanceKm?: number,
    page: number = 1,
    pageSize: number = 20,
  ) {
    // 如果提供了用户位置，使用 PostGIS 原生查询（性能更好，支持距离筛选）
    if (userLatitude && userLongitude) {
      const maxDistanceMeters = maxDistanceKm ? maxDistanceKm * 1000 : null;
      
      // 构建动态条件
      const conditions: string[] = [
        'i.is_delete = false',
        "i.audit_status = 'approved'",
        'i.location IS NOT NULL',
      ];
      const params: any[] = [userLatitude, userLongitude];
      let paramIndex = 3;

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
      
      // 添加距离筛选条件（使用 GiST 索引优化）
      if (maxDistanceMeters) {
        conditions.push(`ST_DWithin(
          i.location,
          ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography,
          $${paramIndex}::float8
        )`);
        params.push(maxDistanceMeters);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');
      const offset = (page - 1) * pageSize;

      // 查询数据（带距离）
      const dataQuery = `
        SELECT 
          i.*,
          distance_km(i.location, $2::float8, $1::float8) AS distance
        FROM institutions i
        WHERE ${whereClause}
        ORDER BY distance ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(pageSize, offset);

      // 查询总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM institutions i
        WHERE ${whereClause}
      `;
      
      const [data, countResult] = await Promise.all([
        this.dataSource.query(dataQuery, params),
        this.dataSource.query(countQuery, params.slice(0, -2)), // 去掉 LIMIT 和 OFFSET 参数
      ]);

      const total = parseInt(countResult[0]?.total || '0', 10);

      return {
        data: data.map((item: any) => ({
          ...item,
          distance: MoneyMath.format(item.distance),
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } else {
      // 无用户位置，使用普通查询
      const query = this.getQuery().andWhere('entity.audit_status = :status', {
        status: 'approved',
      });

      if (province) {
        query.andWhere('entity.province = :province', { province });
      }
      if (city) {
        query.andWhere('entity.city = :city', { city });
      }
      if (district) {
        query.andWhere('entity.district = :district', { district });
      }

      query.orderBy('entity.created_at', 'DESC');
      
      const skip = (page - 1) * pageSize;
      const [data, total] = await query.skip(skip).take(pageSize).getManyAndCount();

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }
  }
}
