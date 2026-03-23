#!/usr/bin/env ts-node
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { EnumEntity } from '../src/modules/common/entities/enum.entity';

/**
 * 初始化枚举数据脚本
 * 运行方式：pnpm run script:init-enums
 */
async function initEnums() {
  // 创建数据库连接
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'interest_class',
    entities: [EnumEntity],
    synchronize: false,
  });

  try {
    console.log('🔗 正在连接数据库...');
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');

    const enumRepository = dataSource.getRepository(EnumEntity);

    console.log('📝 开始初始化枚举数据...');

    // 默认枚举数据
    const defaultEnums = [
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

    // 逐个检查并插入
    let insertedCount = 0;
    let skippedCount = 0;

    for (const enumData of defaultEnums) {
      // 检查 type + code 组合是否已存在
      const existing = await enumRepository.findOne({
        where: {
          type: enumData.type,
          code: enumData.code,
        },
      });

      if (existing) {
        skippedCount++;
        console.log(`⏭️  跳过已存在: ${enumData.type}.${enumData.code} - ${enumData.label}`);
      } else {
        const enumEntity = enumRepository.create(enumData);
        await enumRepository.save(enumEntity);
        insertedCount++;
        console.log(`✅ 已插入: ${enumData.type}.${enumData.code} - ${enumData.label}`);
      }
    }

    console.log('\n📊 执行结果：');
    console.log(`   ✅ 成功插入: ${insertedCount} 个枚举`);
    console.log(`   ⏭️  已跳过: ${skippedCount} 个枚举`);
    console.log(`   📝 总计: ${defaultEnums.length} 个枚举`);

    await dataSource.destroy();
    console.log('🎉 初始化完成！');
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

// 执行初始化
initEnums();
