import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DemoEntity } from './entities/demo.entity';
import { CreateDemoDto } from './dto/create-demo.dto';
import { UpdateDemoDto } from './dto/update-demo.dto';
import { Transactional } from '@/common/decorators/transaction.decorator';
import { DemoRepository } from './repositories/demo.repository';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class DemoService {
  constructor(
    private demoRepository: DemoRepository,
    private dataSource: DataSource,
    private userContextService: UserContextService,
  ) {}

  /**
   * 创建 Demo
   * @returns 返回新创建记录的 ID
   */
  @Transactional()
  async create(createDemoDto: CreateDemoDto): Promise<string> {
    // 可以直接在 Service 中获取当前用户ID
    const currentUserId = this.userContextService.getCurrentUserIdOrNull();
    if (currentUserId && !createDemoDto.created_by) {
      createDemoDto.created_by = currentUserId;
    }

    const demo = this.demoRepository.create(createDemoDto);
    const savedDemo = await this.demoRepository.save(demo);
    return (savedDemo as any).id;
  }

  /**
   * 查询所有 Demo（自动排除已删除的）
   */
  async findAll(): Promise<DemoEntity[]> {
    return await this.demoRepository.findAllActive({
      order: { created_at: 'DESC' },
    });
  }

  /**
   * 根据 ID 查询单个 Demo（自动排除已删除的）
   */
  async findOne(id: string): Promise<DemoEntity> {
    const demo = await this.demoRepository.findOneById(id);

    if (!demo) {
      throw new NotFoundException(`Demo #${id} not found`);
    }

    return demo;
  }

  /**
   * 更新 Demo
   * @returns 返回是否更新成功
   */
  @Transactional()
  async update(id: string, updateDemoDto: UpdateDemoDto): Promise<boolean> {
    const demo = await this.findOne(id);

    Object.assign(demo, updateDemoDto);

    const result = await this.demoRepository.save(demo);

    return !!result;
  }

  /**
   * 删除 Demo（软删除）
   * @returns 返回是否删除成功
   */
  @Transactional()
  async remove(id: string): Promise<boolean> {
    return await this.demoRepository.softRemoveById(id);
  }

  /**
   * 物理删除 Demo
   * @returns 返回是否删除成功
   */
  @Transactional()
  async hardRemove(id: string): Promise<boolean> {
    const demo = await this.findOne(id);

    const result = await this.demoRepository.remove(demo);

    return !!result;
  }

  /**
   * 批量创建示例（演示事务嵌套）
   * @returns 返回创建的 ID 列表
   */
  @Transactional()
  async batchCreate(createDemoDtos: CreateDemoDto[]): Promise<string[]> {
    const ids: string[] = [];

    for (const dto of createDemoDtos) {
      // 这里调用 create 方法，create 方法也有 @Transactional()
      // 但由于嵌套事务处理，只有最外层的事务会生效
      const id = await this.create(dto);
      ids.push(id);
    }

    return ids;
  }

  /**
   * 分页查询
   */
  async paginate(page: number = 1, pageSize: number = 10) {
    return await this.demoRepository.paginate(page, pageSize, {
      order: { created_at: 'DESC' },
    });
  }

  /**
   * 查询当前用户创建的数据
   */
  async findMyData(): Promise<DemoEntity[]> {
    return await this.demoRepository.findMyData({
      order: { created_at: 'DESC' },
    });
  }

  /**
   * 查询激活的数据
   */
  async findAllActive(): Promise<DemoEntity[]> {
    return await this.demoRepository.findAllActiveAndEnabled({
      order: { created_at: 'DESC' },
    });
  }

  /**
   * 根据名称查询
   */
  async findByName(name: string): Promise<DemoEntity[]> {
    return await this.demoRepository.findByName(name);
  }

  /**
   * 根据状态查询
   */
  async findByStatus(status: string): Promise<DemoEntity[]> {
    return await this.demoRepository.findByStatus(status);
  }

  /**
   * 恢复软删除的数据
   */
  @Transactional()
  async restore(id: string): Promise<boolean> {
    return await this.demoRepository.restoreById(id);
  }

  /**
   * 批量软删除
   */
  @Transactional()
  async batchRemove(ids: string[]): Promise<boolean> {
    return await this.demoRepository.softRemoveByIds(ids);
  }
}
