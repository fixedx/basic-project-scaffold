import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CategoryRepository } from './repositories/category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryEntity } from './entities/category.entity';
import { Transactional } from '@/common/decorators/transaction.decorator';

export interface CategoryTree {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  icon: string | null;
  description: string | null;
  children?: CategoryTree[];
}

@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 创建类目
   */
  @Transactional()
  async create(dto: CreateCategoryDto): Promise<string> {
    const category = this.categoryRepository.create(dto);
    const saved = await this.categoryRepository.save(category);
    return saved.id;
  }

  /**
   * 获取所有类目（扁平列表）
   */
  async findAll(): Promise<CategoryEntity[]> {
    return this.categoryRepository.findAllTree();
  }

  /**
   * 获取类目树
   */
  async findTree(): Promise<CategoryTree[]> {
    const allCategories = await this.categoryRepository.findAllTree();
    return this.buildTree(allCategories);
  }

  /**
   * 获取一级类目
   */
  async findTopLevel(): Promise<CategoryEntity[]> {
    return this.categoryRepository.findTopLevel();
  }

  /**
   * 获取指定父类目的子类目
   */
  async findChildren(parentId: string): Promise<CategoryEntity[]> {
    return this.categoryRepository.findByParentId(parentId);
  }

  /**
   * 构建树形结构
   */
  private buildTree(categories: CategoryEntity[]): CategoryTree[] {
    const map = new Map<string, CategoryTree>();
    const roots: CategoryTree[] = [];

    // 第一遍：创建所有节点
    categories.forEach((category) => {
      map.set(category.id, {
        id: category.id,
        name: category.name,
        parent_id: category.parent_id,
        sort_order: category.sort_order,
        icon: category.icon,
        description: category.description,
        children: [],
      });
    });

    // 第二遍：建立父子关系
    categories.forEach((category) => {
      const node = map.get(category.id);
      if (!node) return;

      if (category.parent_id) {
        const parent = map.get(category.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /**
   * 根据ID查询
   */
  async findOne(id: string): Promise<CategoryEntity | null> {
    return this.categoryRepository.findOneById(id);
  }

  /**
   * 删除类目
   */
  @Transactional()
  async remove(id: string): Promise<void> {
    // 检查是否有子类目
    const children = await this.categoryRepository.findByParentId(id);
    if (children.length > 0) {
      throw new Error('该类目下还有子类目，无法删除');
    }

    await this.categoryRepository.softRemoveById(id);
  }

  /**
   * 初始化默认类目
   */
  @Transactional()
  async initDefaultCategories(): Promise<void> {
    // 检查是否已有数据
    const existing = await this.categoryRepository.findAllTree();
    if (existing.length > 0) {
      return;
    }

    // 默认类目数据
    const defaultCategories = [
      // 艺术类
      {
        name: '美术绘画',
        parent_id: undefined,
        sort_order: 100,
        icon: '🎨',
        description: '素描、水彩、油画等',
      },
      {
        name: '书法',
        parent_id: undefined,
        sort_order: 99,
        icon: '✍️',
        description: '毛笔字、硬笔字',
      },
      {
        name: '音乐',
        parent_id: undefined,
        sort_order: 98,
        icon: '🎵',
        description: '声乐、器乐等',
      },
      {
        name: '舞蹈',
        parent_id: undefined,
        sort_order: 97,
        icon: '💃',
        description: '芭蕾、民族舞、现代舞等',
      },

      // 体育类
      {
        name: '球类运动',
        parent_id: undefined,
        sort_order: 90,
        icon: '⚽',
        description: '足球、篮球、羽毛球等',
      },
      {
        name: '武术',
        parent_id: undefined,
        sort_order: 89,
        icon: '🥋',
        description: '跆拳道、空手道、武术等',
      },
      {
        name: '游泳',
        parent_id: undefined,
        sort_order: 88,
        icon: '🏊',
        description: '游泳培训',
      },
      {
        name: '体能训练',
        parent_id: undefined,
        sort_order: 87,
        icon: '💪',
        description: '体适能、体能训练',
      },

      // 学科类
      {
        name: '语言培训',
        parent_id: undefined,
        sort_order: 80,
        icon: '📚',
        description: '英语、日语、其他外语',
      },
      {
        name: '数学思维',
        parent_id: undefined,
        sort_order: 79,
        icon: '🔢',
        description: '数学、思维训练',
      },
      {
        name: '科学探索',
        parent_id: undefined,
        sort_order: 78,
        icon: '🔬',
        description: '科学实验、编程等',
      },

      // 兴趣类
      {
        name: '棋类',
        parent_id: undefined,
        sort_order: 70,
        icon: '♟️',
        description: '围棋、象棋、国际象棋',
      },
      {
        name: '手工制作',
        parent_id: undefined,
        sort_order: 69,
        icon: '✂️',
        description: '手工DIY、陶艺等',
      },
      {
        name: '其他',
        parent_id: undefined,
        sort_order: 1,
        icon: '📦',
        description: '其他兴趣课程',
      },
    ];

    // 批量创建
    for (const categoryData of defaultCategories) {
      const category = this.categoryRepository.create(categoryData);
      await this.categoryRepository.save(category);
    }
  }
}
