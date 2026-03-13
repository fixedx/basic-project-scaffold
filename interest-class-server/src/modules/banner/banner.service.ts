import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BannerRepository } from './repositories/banner.repository';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { SortBannerDto } from './dto/sort-banner.dto';
import { UserContextService } from '@/common/services/user-context.service';
import { Transactional } from '@/common/decorators/transaction.decorator';

@Injectable()
export class BannerService {
  constructor(
    private bannerRepository: BannerRepository,
    private userContextService: UserContextService,
    private dataSource: DataSource,
  ) {}

  /**
   * 仅管理员可操作
   */
  private assertAdmin(): void {
    const roles = this.userContextService.get<string[]>('roles') || [];
    if (!roles.includes('admin')) {
      throw new ForbiddenException('需要管理员权限');
    }
  }

  /**
   * 创建 Banner（仅管理员）
   */
  @Transactional()
  async create(dto: CreateBannerDto): Promise<string> {
    this.assertAdmin();
    const banner = this.bannerRepository.create({
      ...dto,
      status: dto.status || 'active',
      sort: dto.sort ?? 0,
    });

    const saved = await this.bannerRepository.save(banner);
    return saved.id;
  }

  /**
   * 获取 Banner 列表（平台级，返回所有记录）
   */
  async findAll(status?: string) {
    const data = await this.bannerRepository.findAll(status);
    return {
      data,
      total: data.length,
      page: 1,
      pageSize: data.length,
    };
  }

  /**
   * 获取 Banner 详情
   */
  async findOne(id: string) {
    const banner = await this.bannerRepository.findOneById(id);
    if (!banner) {
      throw new NotFoundException('Banner不存在');
    }
    return banner;
  }

  /**
   * 更新 Banner（仅管理员）
   */
  @Transactional()
  async update(id: string, dto: UpdateBannerDto): Promise<void> {
    this.assertAdmin();
    const banner = await this.bannerRepository.findOneById(id);
    if (!banner) {
      throw new NotFoundException('Banner不存在');
    }

    await this.bannerRepository.update(id, dto);
  }

  /**
   * 删除 Banner（仅管理员，软删除）
   */
  @Transactional()
  async remove(id: string): Promise<void> {
    this.assertAdmin();
    const banner = await this.bannerRepository.findOneById(id);
    if (!banner) {
      throw new NotFoundException('Banner不存在');
    }

    await this.bannerRepository.softRemoveById(id);
  }

  /**
   * 批量更新排序（仅管理员）
   */
  @Transactional()
  async updateSort(dto: SortBannerDto): Promise<void> {
    this.assertAdmin();
    await this.bannerRepository.updateSortBatch(dto.items);
  }
}
