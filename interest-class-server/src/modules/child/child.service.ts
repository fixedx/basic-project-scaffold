import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transactional } from '@/common/decorators/transaction.decorator';
import { UserContextService } from '@/common/services/user-context.service';
import { ChildRepository } from './repositories/child.repository';
import { CreateChildDto, UpdateChildDto } from './dto/child.dto';

@Injectable()
export class ChildService {
  // 每个用户最多可添加的宝贝数量
  private readonly MAX_CHILDREN_PER_USER = 10;

  constructor(
    private childRepository: ChildRepository,
    private userContextService: UserContextService,
    private dataSource: DataSource,
  ) {}

  /**
   * 创建宝贝
   */
  @Transactional()
  async create(dto: CreateChildDto): Promise<string> {
    const userId = this.userContextService.getCurrentUserId();

    // 检查宝贝数量限制
    const count = await this.childRepository.countByUserId(userId);
    if (count >= this.MAX_CHILDREN_PER_USER) {
      throw new BadRequestException(
        `最多只能添加 ${this.MAX_CHILDREN_PER_USER} 个宝贝`,
      );
    }

    const child = this.childRepository.create({
      user_id: userId,
      name: dto.name,
      avatar: dto.avatar,
      gender: dto.gender,
      birthday: dto.birthday ? new Date(dto.birthday) : undefined,
      age: dto.age,
      phone: dto.phone,
      interests: dto.interests,
      remark: dto.remark,
      sort_order: count, // 新添加的排在最后
    });

    const saved = await this.childRepository.save(child);
    return Array.isArray(saved) ? saved[0].id : saved.id;
  }

  /**
   * 查询我的宝贝列表
   */
  async findMyChildren() {
    const userId = this.userContextService.getCurrentUserId();
    return this.childRepository.findByUserId(userId);
  }

  /**
   * 查询宝贝详情
   */
  async findOne(id: string) {
    const userId = this.userContextService.getCurrentUserId();
    const child = await this.childRepository.findByUserIdAndId(userId, id);

    if (!child) {
      throw new NotFoundException('宝贝不存在');
    }

    return child;
  }

  /**
   * 更新宝贝
   */
  @Transactional()
  async update(id: string, dto: UpdateChildDto): Promise<boolean> {
    const userId = this.userContextService.getCurrentUserId();
    const child = await this.childRepository.findByUserIdAndId(userId, id);

    if (!child) {
      throw new NotFoundException('宝贝不存在');
    }

    const updateData: Partial<typeof child> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar;
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.birthday !== undefined)
      updateData.birthday = new Date(dto.birthday);
    if (dto.age !== undefined) updateData.age = dto.age;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.interests !== undefined) updateData.interests = dto.interests;
    if (dto.remark !== undefined) updateData.remark = dto.remark;
    if (dto.sort_order !== undefined) updateData.sort_order = dto.sort_order;

    await this.childRepository.update(id, updateData);
    return true;
  }

  /**
   * 删除宝贝
   */
  @Transactional()
  async remove(id: string): Promise<boolean> {
    const userId = this.userContextService.getCurrentUserId();
    const child = await this.childRepository.findByUserIdAndId(userId, id);

    if (!child) {
      throw new NotFoundException('宝贝不存在');
    }

    await this.childRepository.softRemoveById(id);
    return true;
  }

  /**
   * 批量更新排序
   */
  @Transactional()
  async updateSort(ids: string[]): Promise<boolean> {
    const userId = this.userContextService.getCurrentUserId();

    for (let i = 0; i < ids.length; i++) {
      const child = await this.childRepository.findByUserIdAndId(userId, ids[i]);
      if (child) {
        await this.childRepository.update(ids[i], { sort_order: i });
      }
    }

    return true;
  }
}
