#!/usr/bin/env ts-node
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { CategoryEntity } from '../src/modules/course/entities/category.entity';

/**
 * 初始化类目数据脚本
 * 运行方式：pnpm run script:init-categories
 */
async function initCategories() {
  // 创建数据库连接
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'interest_class',
    entities: [CategoryEntity],
    synchronize: false,
  });

  try {
    console.log('🔗 正在连接数据库...');
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');

    const categoryRepository = dataSource.getRepository(CategoryEntity);

    // 检查是否已有数据
    const count = await categoryRepository.count();
    if (count > 0) {
      console.log(`⚠️  类目表已有 ${count} 条数据，跳过初始化`);
      await dataSource.destroy();
      return;
    }

    console.log('📝 开始初始化类目数据...');

    // 默认类目数据
    const defaultCategories = [
      // 艺术类
      {
        name: '美术绘画',
        sort_order: 100,
        icon: '🎨',
        description: '素描、水彩、油画等',
      },
      {
        name: '书法',
        sort_order: 99,
        icon: '✍️',
        description: '毛笔字、硬笔字',
      },
      {
        name: '音乐',
        sort_order: 98,
        icon: '🎵',
        description: '声乐、器乐等',
      },
      {
        name: '舞蹈',
        sort_order: 97,
        icon: '💃',
        description: '芭蕾、民族舞、现代舞等',
      },

      // 体育类
      {
        name: '球类运动',
        sort_order: 90,
        icon: '⚽',
        description: '足球、篮球、羽毛球等',
      },
      {
        name: '武术',
        sort_order: 89,
        icon: '🥋',
        description: '跆拳道、空手道、武术等',
      },
      {
        name: '游泳',
        sort_order: 88,
        icon: '🏊',
        description: '游泳培训',
      },
      {
        name: '体能训练',
        sort_order: 87,
        icon: '💪',
        description: '体适能、体能训练',
      },

      // 学科类
      {
        name: '语言培训',
        sort_order: 80,
        icon: '📚',
        description: '英语、日语、其他外语',
      },
      {
        name: '数学思维',
        sort_order: 79,
        icon: '🔢',
        description: '数学、思维训练',
      },
      {
        name: '科学探索',
        sort_order: 78,
        icon: '🔬',
        description: '科学实验、编程等',
      },

      // 兴趣类
      {
        name: '棋类',
        sort_order: 70,
        icon: '♟️',
        description: '围棋、象棋、国际象棋',
      },
      {
        name: '手工制作',
        sort_order: 69,
        icon: '✂️',
        description: '手工DIY、陶艺等',
      },
      {
        name: '其他',
        sort_order: 1,
        icon: '📦',
        description: '其他兴趣课程',
      },
    ];

    // 批量插入
    const categories = categoryRepository.create(defaultCategories);
    await categoryRepository.save(categories);

    console.log(`✅ 成功初始化 ${categories.length} 个类目`);
    console.log('📋 初始化的类目：');
    categories.forEach((cat, index) => {
      console.log(
        `   ${index + 1}. ${cat.icon} ${cat.name} - ${cat.description}`,
      );
    });

    await dataSource.destroy();
    console.log('🎉 初始化完成！');
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

// 执行初始化
initCategories();
