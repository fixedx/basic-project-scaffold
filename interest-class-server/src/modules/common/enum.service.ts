import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EnumRepository } from './repositories/enum.repository';
import { CreateEnumDto } from './dto/create-enum.dto';
import { EnumEntity } from './entities/enum.entity';
import { Transactional } from '@/common/decorators/transaction.decorator';

@Injectable()
export class EnumService implements OnModuleInit {
  private readonly logger = new Logger(EnumService.name);

  constructor(
    private readonly enumRepository: EnumRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 模块初始化时自动执行枚举初始化（查漏补缺）
   */
  async onModuleInit() {
    this.logger.log('🚀 开始初始化系统枚举数据...');
    try {
      await this.initDefaultEnums();
      this.logger.log('✅ 系统枚举数据初始化完成');
    } catch (error) {
      this.logger.error('❌ 系统枚举数据初始化失败:', error.message);
      // 注意：这里不抛出错误，避免阻塞应用启动
      // 枚举数据可以后续通过 POST /api/enums/init 手动初始化
    }
  }

  /**
   * 创建枚举
   */
  @Transactional()
  async create(dto: CreateEnumDto): Promise<string> {
    const enumEntity = this.enumRepository.create(dto);
    const saved = await this.enumRepository.save(enumEntity);
    return saved.id;
  }

  /**
   * 获取指定类型的枚举列表
   */
  async getByType(type: string): Promise<EnumEntity[]> {
    return this.enumRepository.findByType(type);
  }

  /**
   * 批量获取多种类型的枚举
   */
  async getByTypes(types: string[]): Promise<Record<string, EnumEntity[]>> {
    return this.enumRepository.findByTypes(types);
  }

  /**
   * 获取所有枚举（按类型分组）
   */
  async getAll(): Promise<Record<string, EnumEntity[]>> {
    const types = await this.enumRepository.getAllTypes();
    return this.enumRepository.findByTypes(types);
  }

  /**
   * 初始化默认枚举数据
   */
  @Transactional()
  async initDefaultEnums(): Promise<void> {
    const defaultEnums: CreateEnumDto[] = [
      // 课程类型
      {
        type: 'course_type',
        code: 'standard',
        label: '正式课',
        description: '需要交付完整课程服务的正式课程',
        sort_order: 10,
      },
      {
        type: 'course_type',
        code: 'trial',
        label: '试听课',
        description: '用户体验课程的试听课',
        sort_order: 5,
      },

      // 机构标签
      {
        type: 'institution_tag',
        code: 'professional_teachers',
        label: '专业师资',
        description: '拥有专业资质的教师团队',
        sort_order: 100,
        icon: '👨‍🏫',
      },
      {
        type: 'institution_tag',
        code: 'small_class',
        label: '小班教学',
        description: '小班制教学模式',
        sort_order: 95,
        icon: '👥',
      },
      {
        type: 'institution_tag',
        code: 'free_trial',
        label: '免费试听',
        description: '提供免费试听课程',
        sort_order: 90,
        icon: '🎧',
      },
      {
        type: 'institution_tag',
        code: 'nice_environment',
        label: '环境优美',
        description: '教学环境优雅舒适',
        sort_order: 85,
        icon: '🏡',
      },
      {
        type: 'institution_tag',
        code: 'convenient_transport',
        label: '交通便利',
        description: '地理位置优越，交通便利',
        sort_order: 80,
        icon: '🚇',
      },
      {
        type: 'institution_tag',
        code: 'brand_chain',
        label: '品牌连锁',
        description: '知名品牌连锁机构',
        sort_order: 75,
        icon: '🏢',
      },
      {
        type: 'institution_tag',
        code: 'certificate_training',
        label: '考级培训',
        description: '提供等级考试培训',
        sort_order: 70,
        icon: '📜',
      },
      {
        type: 'institution_tag',
        code: 'competition_training',
        label: '比赛培训',
        description: '提供参赛指导和培训',
        sort_order: 65,
        icon: '🏆',
      },
      {
        type: 'institution_tag',
        code: 'flexible_schedule',
        label: '灵活排课',
        description: '课程时间灵活可调',
        sort_order: 60,
        icon: '📅',
      },
      {
        type: 'institution_tag',
        code: 'parent_waiting',
        label: '家长休息区',
        description: '提供家长休息等候区域',
        sort_order: 55,
        icon: '☕',
      },

      // 机构类目
      {
        type: 'institution_category',
        code: 'art',
        label: '艺术类',
        description: '音乐、美术、舞蹈等艺术培训机构',
        sort_order: 100,
        icon: '🎨',
      },
      {
        type: 'institution_category',
        code: 'sports',
        label: '体育类',
        description: '篮球、足球、游泳等体育培训机构',
        sort_order: 90,
        icon: '⚽',
      },
      {
        type: 'institution_category',
        code: 'academic',
        label: '学科类',
        description: '语数外等学科辅导机构',
        sort_order: 80,
        icon: '📚',
      },
      {
        type: 'institution_category',
        code: 'stem',
        label: '科技类',
        description: '编程、机器人、创客等科技培训机构',
        sort_order: 70,
        icon: '🤖',
      },
      {
        type: 'institution_category',
        code: 'language',
        label: '语言类',
        description: '英语、小语种等语言培训机构',
        sort_order: 60,
        icon: '🗣️',
      },
      {
        type: 'institution_category',
        code: 'other',
        label: '其他',
        description: '其他类型培训机构',
        sort_order: 1,
        icon: '📋',
      },

      // 审核状态
      {
        type: 'audit_status',
        code: 'pending',
        label: '待审核',
        description: '等待平台审核',
        sort_order: 10,
      },
      {
        type: 'audit_status',
        code: 'approved',
        label: '已通过',
        description: '审核通过',
        sort_order: 5,
      },
      {
        type: 'audit_status',
        code: 'rejected',
        label: '已拒绝',
        description: '审核未通过',
        sort_order: 1,
      },

      // 返现类型
      {
        type: 'cashback_type',
        code: 'percentage',
        label: '按比例',
        description: '按课程总价的百分比返现',
        sort_order: 10,
      },
      {
        type: 'cashback_type',
        code: 'fixed',
        label: '固定金额',
        description: '固定金额返现',
        sort_order: 5,
      },
      {
        type: 'cashback_type',
        code: 'none',
        label: '无返现',
        description: '不参与返现',
        sort_order: 1,
      },

      // 课程类目
      {
        type: 'course_category',
        code: 'art_painting',
        label: '美术绘画',
        description: '素描、水彩、油画等',
        sort_order: 100,
        icon: '🎨',
      },
      {
        type: 'course_category',
        code: 'calligraphy',
        label: '书法',
        description: '毛笔字、硬笔字',
        sort_order: 99,
        icon: '✍️',
      },
      {
        type: 'course_category',
        code: 'music',
        label: '音乐',
        description: '声乐、器乐等',
        sort_order: 98,
        icon: '🎵',
      },
      {
        type: 'course_category',
        code: 'dance',
        label: '舞蹈',
        description: '芭蕾、民族舞、现代舞等',
        sort_order: 97,
        icon: '💃',
      },
      {
        type: 'course_category',
        code: 'ball_sports',
        label: '球类运动',
        description: '足球、篮球、羽毛球等',
        sort_order: 90,
        icon: '⚽',
      },
      {
        type: 'course_category',
        code: 'martial_arts',
        label: '武术',
        description: '跆拳道、空手道、武术等',
        sort_order: 89,
        icon: '🥋',
      },
      {
        type: 'course_category',
        code: 'swimming',
        label: '游泳',
        description: '游泳培训',
        sort_order: 88,
        icon: '🏊',
      },
      {
        type: 'course_category',
        code: 'fitness',
        label: '体能训练',
        description: '体适能、体能训练',
        sort_order: 87,
        icon: '💪',
      },
      {
        type: 'course_category',
        code: 'language',
        label: '语言培训',
        description: '英语、日语、其他外语',
        sort_order: 80,
        icon: '📚',
      },
      {
        type: 'course_category',
        code: 'math',
        label: '数学思维',
        description: '数学、思维训练',
        sort_order: 79,
        icon: '🔢',
      },
      {
        type: 'course_category',
        code: 'science',
        label: '科学探索',
        description: '科学实验、编程等',
        sort_order: 78,
        icon: '🔬',
      },
      {
        type: 'course_category',
        code: 'chess',
        label: '棋类',
        description: '围棋、象棋、国际象棋',
        sort_order: 70,
        icon: '♟️',
      },
      {
        type: 'course_category',
        code: 'handicraft',
        label: '手工制作',
        description: '手工DIY、陶艺等',
        sort_order: 69,
        icon: '✂️',
      },
      {
        type: 'course_category',
        code: 'other',
        label: '其他',
        description: '其他兴趣课程',
        sort_order: 1,
        icon: '📦',
      },

      // 课程标签
      {
        type: 'course_tag',
        code: 'beginner_friendly',
        label: '零基础',
        description: '适合零基础学员',
        sort_order: 100,
        icon: '🔰',
      },
      {
        type: 'course_tag',
        code: 'small_class',
        label: '小班教学',
        description: '小班制教学',
        sort_order: 90,
        icon: '👥',
      },
      {
        type: 'course_tag',
        code: 'one_on_one',
        label: '一对一',
        description: '一对一教学',
        sort_order: 89,
        icon: '👤',
      },
      {
        type: 'course_tag',
        code: 'exam_oriented',
        label: '考级',
        description: '可参加考级',
        sort_order: 80,
        icon: '📜',
      },
      {
        type: 'course_tag',
        code: 'competition',
        label: '比赛',
        description: '可参加比赛',
        sort_order: 79,
        icon: '🏆',
      },
      {
        type: 'course_tag',
        code: 'performance',
        label: '演出',
        description: '有演出机会',
        sort_order: 78,
        icon: '🎭',
      },
      {
        type: 'course_tag',
        code: 'outdoor',
        label: '户外',
        description: '户外活动',
        sort_order: 70,
        icon: '🏕️',
      },
      {
        type: 'course_tag',
        code: 'weekend',
        label: '周末班',
        description: '周末上课',
        sort_order: 60,
        icon: '📅',
      },
      {
        type: 'course_tag',
        code: 'summer_camp',
        label: '夏令营',
        description: '暑期夏令营',
        sort_order: 50,
        icon: '☀️',
      },
      {
        type: 'course_tag',
        code: 'certificate',
        label: '颁发证书',
        description: '结业颁发证书',
        sort_order: 40,
        icon: '🎓',
      },

      // 机构状态
      {
        type: 'institution_status',
        code: 'draft',
        label: '草稿',
        description: '机构信息未提交',
        sort_order: 50,
      },
      {
        type: 'institution_status',
        code: 'pending',
        label: '待审核',
        description: '等待平台审核',
        sort_order: 40,
      },
      {
        type: 'institution_status',
        code: 'approved',
        label: '已通过',
        description: '审核通过，正常运营',
        sort_order: 30,
      },
      {
        type: 'institution_status',
        code: 'contract_signing',
        label: '待签约',
        description: '审核通过，等待机构签署入驻协议',
        sort_order: 35,
      },
      {
        type: 'institution_status',
        code: 'contract_review',
        label: '签约审核中',
        description: '机构已提交签约凭证，等待管理员审核',
        sort_order: 33,
      },
      {
        type: 'institution_status',
        code: 'rejected',
        label: '已拒绝',
        description: '审核未通过',
        sort_order: 20,
      },
      {
        type: 'institution_status',
        code: 'frozen',
        label: '已冻结',
        description: '机构被平台冻结',
        sort_order: 10,
      },

      // 课程状态
      {
        type: 'course_status',
        code: 'draft',
        label: '草稿',
        description: '课程编辑中',
        sort_order: 40,
      },
      {
        type: 'course_status',
        code: 'online',
        label: '已上架',
        description: '课程正常售卖中',
        sort_order: 30,
      },
      {
        type: 'course_status',
        code: 'offline',
        label: '已下架',
        description: '课程暂停售卖',
        sort_order: 20,
      },
      {
        type: 'course_status',
        code: 'deleted',
        label: '已删除',
        description: '课程已删除',
        sort_order: 10,
      },
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const enumDto of defaultEnums) {
      const existing = await this.enumRepository.findByTypeAndCode(
        enumDto.type,
        enumDto.code,
      );

      if (!existing) {
        await this.create(enumDto);
        addedCount++;
      } else {
        skippedCount++;
      }
    }

    this.logger.log(
      `📊 枚举初始化统计: 总数=${defaultEnums.length}, 新增=${addedCount}, 跳过=${skippedCount}`,
    );
  }

  /**
   * 删除枚举
   */
  @Transactional()
  async remove(id: string): Promise<void> {
    await this.enumRepository.softRemoveById(id);
  }
}
