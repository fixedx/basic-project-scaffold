import { Injectable, BadRequestException } from '@nestjs/common';
import { AnnouncementRepository } from './repositories/announcement.repository';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementEntity } from './entities/announcement.entity';

@Injectable()
export class AnnouncementService {
  constructor(
    private readonly announcementRepository: AnnouncementRepository,
  ) {}

  /**
   * 创建公告
   */
  async create(dto: CreateAnnouncementDto): Promise<string> {
    const announcement = this.announcementRepository.create(dto);
    const saved = await this.announcementRepository.save(announcement);
    return (saved as any).id;
  }

  /**
   * 获取公告列表
   */
  async findAll(status?: string, type?: string): Promise<AnnouncementEntity[]> {
    return this.announcementRepository.findAll(status, type);
  }

  /**
   * 获取公告详情
   */
  async findOne(id: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementRepository.findOneById(id);
    if (!announcement) {
      throw new BadRequestException('公告不存在');
    }
    return announcement;
  }

  /**
   * 更新公告
   */
  async update(id: string, dto: UpdateAnnouncementDto): Promise<boolean> {
    const announcement = await this.announcementRepository.findOneById(id);
    if (!announcement) {
      throw new BadRequestException('公告不存在');
    }
    await this.announcementRepository.update(id, dto);
    return true;
  }

  /**
   * 删除公告（软删除）
   */
  async remove(id: string): Promise<boolean> {
    const announcement = await this.announcementRepository.findOneById(id);
    if (!announcement) {
      throw new BadRequestException('公告不存在');
    }
    await this.announcementRepository.softRemoveById(id);
    return true;
  }

  /**
   * 获取当前生效的公告（首页用）
   */
  async findActive(): Promise<AnnouncementEntity[]> {
    return this.announcementRepository.findActiveAnnouncements();
  }
}
