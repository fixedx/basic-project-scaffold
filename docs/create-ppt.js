const PptxGenJS = require('pptxgenjs');
const pres = new PptxGenJS();

// 配色方案 - 清新绿色
const COLORS = {
  primary: '4CAF50',    // 主绿色
  secondary: '8BC34A',  // 浅绿色
  accent: 'CDDC39',     //  accent绿
  dark: '2E7D32',       // 深绿色
  text: '333333',       // 正文色
  textLight: '666666',  // 浅正文
  white: 'FFFFFF',
  bgLight: 'F1F8E9',    // 浅绿背景
  border: 'C8E6C9'      // 边框绿
};

// 设置PPT尺寸
pres.layout = 'LAYOUT_16x9';

// ==================== 第一页：封面 ====================
const slide1 = pres.addSlide();

// 背景装饰 - 左侧绿色装饰条
slide1.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: 0.3, h: '100%',
  fill: { color: COLORS.primary }
});

// 顶部装饰圆
slide1.addShape(pres.shapes.OVAL, {
  x: 7.5, y: 0.5, w: 2, h: 2,
  fill: { color: COLORS.bgLight }
});

// 主标题
slide1.addText('稚小苗', {
  x: 1.5, y: 2.5, w: 8, h: 1.2,
  fontSize: 60,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.primary,
  align: 'center'
});

// 副标题
slide1.addText('兴趣教育智慧管理平台', {
  x: 1.5, y: 3.8, w: 8, h: 0.8,
  fontSize: 32,
  fontFace: 'Microsoft YaHei',
  color: COLORS.text,
  align: 'center'
});

// 分隔线
slide1.addShape(pres.shapes.LINE, {
  x: 3, y: 4.8, w: 4, h: 0,
  line: { color: COLORS.secondary, width: 3 }
});

// 定位语
slide1.addText('一个小程序，轻松管理兴趣培训机构的全流程教务', {
  x: 1.5, y: 5.2, w: 8, h: 0.6,
  fontSize: 18,
  fontFace: 'Microsoft YaHei',
  color: COLORS.textLight,
  align: 'center'
});

// 底部三大价值
const values = ['让教务管理更简单', '让家校沟通更高效', '让机构运营更轻松'];
values.forEach((val, idx) => {
  // 小圆点装饰
  slide1.addShape(pres.shapes.OVAL, {
    x: 2 + idx * 2.5, y: 6.3, w: 0.15, h: 0.15,
    fill: { color: COLORS.primary }
  });
  slide1.addText(val, {
    x: 1.5 + idx * 2.5, y: 6.5, w: 2.5, h: 0.5,
    fontSize: 14,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text,
    align: 'center'
  });
});

// ==================== 第二页：市场痛点分析 ====================
const slide2 = pres.addSlide();

// 页面标题
slide2.addText('行业痛点：三方困局亟待破解', {
  x: 0.5, y: 0.4, w: 9, h: 0.8,
  fontSize: 32,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.primary
});

// 分隔线
slide2.addShape(pres.shapes.LINE, {
  x: 0.5, y: 1.1, w: 9, h: 0,
  line: { color: COLORS.border, width: 2 }
});

// 三列布局
const columns = [
  { title: '家长之痛', color: COLORS.primary, x: 0.5 },
  { title: '机构之痛', color: COLORS.secondary, x: 3.5 },
  { title: '教师之痛', color: COLORS.accent, x: 6.5 }
];

columns.forEach(col => {
  // 列标题背景
  slide2.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: col.x, y: 1.4, w: 2.8, h: 0.6,
    fill: { color: col.color },
    rectRadius: 0.1
  });
  // 列标题
  slide2.addText(col.title, {
    x: col.x, y: 1.4, w: 2.8, h: 0.6,
    fontSize: 18,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.white,
    align: 'center',
    valign: 'middle'
  });
});

// 家长痛点内容
const parentPains = [
  { title: '信息碎片化', desc: '培训机构众多，查找课程信息困难' },
  { title: '决策成本高', desc: '不了解机构真实情况，难以做出选择' },
  { title: '预约体验差', desc: '预约试听流程繁琐，沟通成本高' },
  { title: '进度不透明', desc: '无法实时掌握孩子学习进度' }
];
parentPains.forEach((item, idx) => {
  const y = 2.2 + idx * 1.1;
  // 小圆点
  slide2.addShape(pres.shapes.OVAL, {
    x: 0.6, y: y + 0.15, w: 0.1, h: 0.1,
    fill: { color: COLORS.primary }
  });
  slide2.addText(item.title, {
    x: 0.8, y: y, w: 2.4, h: 0.4,
    fontSize: 13,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.text
  });
  slide2.addText(item.desc, {
    x: 0.8, y: y + 0.35, w: 2.4, h: 0.5,
    fontSize: 11,
    fontFace: 'Microsoft YaHei',
    color: COLORS.textLight
  });
});

// 机构痛点内容
const orgPains = [
  { title: '运营成本高', desc: '人工管理课程、教师、教室效率低下' },
  { title: '获客难度大', desc: '缺乏精准获客渠道，营销成本居高不下' },
  { title: '管理工具缺', desc: '排课冲突频发，资源调度混乱' },
  { title: '口碑难建立', desc: '缺乏有效的评价展示和口碑传播机制' }
];
orgPains.forEach((item, idx) => {
  const y = 2.2 + idx * 1.1;
  slide2.addShape(pres.shapes.OVAL, {
    x: 3.6, y: y + 0.15, w: 0.1, h: 0.1,
    fill: { color: COLORS.secondary }
  });
  slide2.addText(item.title, {
    x: 3.8, y: y, w: 2.4, h: 0.4,
    fontSize: 13,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.text
  });
  slide2.addText(item.desc, {
    x: 3.8, y: y + 0.35, w: 2.4, h: 0.5,
    fontSize: 11,
    fontFace: 'Microsoft YaHei',
    color: COLORS.textLight
  });
});

// 教师痛点内容
const teacherPains = [
  { title: '排课混乱', desc: '课程安排不透明，时间冲突频发' },
  { title: '考勤繁琐', desc: '学员签到统计耗时耗力' },
  { title: '沟通低效', desc: '与家长沟通缺乏统一渠道' }
];
teacherPains.forEach((item, idx) => {
  const y = 2.2 + idx * 1.1;
  slide2.addShape(pres.shapes.OVAL, {
    x: 6.6, y: y + 0.15, w: 0.1, h: 0.1,
    fill: { color: COLORS.accent }
  });
  slide2.addText(item.title, {
    x: 6.8, y: y, w: 2.4, h: 0.4,
    fontSize: 13,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.text
  });
  slide2.addText(item.desc, {
    x: 6.8, y: y + 0.35, w: 2.4, h: 0.5,
    fontSize: 11,
    fontFace: 'Microsoft YaHei',
    color: COLORS.textLight
  });
});

// ==================== 第三页：解决方案 ====================
const slide3 = pres.addSlide();

slide3.addText('我们的解决方案：一个小程序搞定一切', {
  x: 0.5, y: 0.4, w: 9, h: 0.8,
  fontSize: 32,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.primary
});

// 产品定位背景
slide3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 1.3, w: 9, h: 0.8,
  fill: { color: COLORS.bgLight },
  rectRadius: 0.1
});

slide3.addText('稚小苗 —— 专为3-12岁儿童兴趣培训行业打造的轻量化管理平台', {
  x: 0.5, y: 1.3, w: 9, h: 0.8,
  fontSize: 18,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.dark,
  align: 'center',
  valign: 'middle'
});

// 核心价值表格
slide3.addText('核心价值', {
  x: 0.5, y: 2.3, w: 9, h: 0.5,
  fontSize: 20,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

// 表格数据
const tableData = [
  [{ text: '维度', options: { bold: true, fill: COLORS.primary, color: COLORS.white } },
   { text: '解决方案', options: { bold: true, fill: COLORS.primary, color: COLORS.white } },
   { text: '价值体现', options: { bold: true, fill: COLORS.primary, color: COLORS.white } }],
  ['一键管理', '小程序端完成所有教务操作', '随时随地，手机搞定'],
  ['智能高效', '课程/教师/教室/排课一体化', '运营效率提升80%'],
  ['精准匹配', '基于位置的智能推荐', '就近选择，节省时间'],
  ['信任构建', '评价体系+荣誉展示', '真实口碑驱动转化'],
  ['裂变增长', '邀友返现营销系统', '低成本获客，社交裂变']
];

slide3.addTable(tableData, {
  x: 0.5, y: 2.8, w: 9, h: 2.5,
  fontSize: 12,
  fontFace: 'Microsoft YaHei',
  border: { type: 'solid', pt: 1, color: COLORS.border },
  colW: [1.5, 3.5, 4]
});

// 平台角色
slide3.addText('平台角色覆盖', {
  x: 0.5, y: 5.5, w: 9, h: 0.5,
  fontSize: 18,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const roles = ['家长端', '机构端', '教师端', '平台管理端'];
const roleColors = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.dark];
roles.forEach((role, idx) => {
  // 角色框
  slide3.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.8 + idx * 2.3, y: 6.1, w: 2, h: 0.6,
    fill: { color: roleColors[idx] },
    rectRadius: 0.1
  });
  slide3.addText(role, {
    x: 0.8 + idx * 2.3, y: 6.1, w: 2, h: 0.6,
    fontSize: 14,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.white,
    align: 'center',
    valign: 'middle'
  });
  // 连接箭头
  if (idx < 3) {
    slide3.addShape(pres.shapes.RIGHT_ARROW, {
      x: 2.7 + idx * 2.3, y: 6.25, w: 0.5, h: 0.3,
      fill: { color: COLORS.border }
    });
  }
});

// ==================== 第四页：核心优势 ====================
const slide4 = pres.addSlide();

slide4.addText('核心优势：一个手机，管理全流程', {
  x: 0.5, y: 0.4, w: 9, h: 0.8,
  fontSize: 32,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.primary
});

// 手机图标装饰
slide4.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 1.3, w: 0.4, h: 0.7,
  fill: { color: COLORS.primary },
  rectRadius: 0.05
});
slide4.addText('一部手机搞定所有教务', {
  x: 1.1, y: 1.3, w: 8, h: 0.7,
  fontSize: 20,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text,
  valign: 'middle'
});
slide4.addText('无需电脑，无需安装多个APP', {
  x: 1.1, y: 1.8, w: 8, h: 0.4,
  fontSize: 12,
  fontFace: 'Microsoft YaHei',
  color: COLORS.textLight
});

// 对比表格
const compareData = [
  [{ text: '功能', options: { bold: true, fill: COLORS.primary, color: COLORS.white } },
   { text: '传统方式', options: { bold: true, fill: COLORS.secondary, color: COLORS.white } },
   { text: '稚小苗方式', options: { bold: true, fill: COLORS.dark, color: COLORS.white } }],
  ['课程管理', '电脑+Excel表格', '手机小程序一键操作'],
  ['排课调度', '纸质日历+人工协调', '智能冲突检测，自动提醒'],
  ['学员签到', '纸质签到表', '手机扫码/一键签到'],
  ['家长沟通', '微信群消息轰炸', '平台内消息，有序管理'],
  ['财务对账', '手工记账', '自动统计，实时查看']
];

slide4.addTable(compareData, {
  x: 0.5, y: 2.4, w: 9, h: 2.2,
  fontSize: 11,
  fontFace: 'Microsoft YaHei',
  border: { type: 'solid', pt: 1, color: COLORS.border },
  colW: [1.8, 3.5, 3.7]
});

// 3分钟完成
slide4.addShape(pres.shapes.OVAL, {
  x: 0.5, y: 4.9, w: 0.4, h: 0.4,
  fill: { color: COLORS.accent }
});
slide4.addText('3分钟完成日常教务', {
  x: 1.1, y: 4.9, w: 8, h: 0.4,
  fontSize: 16,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text,
  valign: 'middle'
});

const quickTasks = ['发布课程：1分钟填写，即时上线', '排课操作：可视化日历，拖拽完成', '签到统计：一键生成报表'];
quickTasks.forEach((task, idx) => {
  slide4.addShape(pres.shapes.OVAL, {
    x: 1.1 + idx * 2.8, y: 5.5, w: 0.1, h: 0.1,
    fill: { color: COLORS.secondary }
  });
  slide4.addText(task, {
    x: 1.25 + idx * 2.8, y: 5.4, w: 2.6, h: 0.4,
    fontSize: 10,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text
  });
});

// 随时随地
slide4.addShape(pres.shapes.OVAL, {
  x: 0.5, y: 6, w: 0.4, h: 0.4,
  fill: { color: COLORS.secondary }
});
slide4.addText('随时随地处理事务', {
  x: 1.1, y: 6, w: 8, h: 0.4,
  fontSize: 16,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text,
  valign: 'middle'
});

const anytimeTasks = ['机构负责人：地铁上也能排课', '教师：课前手机查看课表', '家长：躺在床上就能预约课程'];
anytimeTasks.forEach((task, idx) => {
  slide4.addShape(pres.shapes.OVAL, {
    x: 1.1 + idx * 2.8, y: 6.6, w: 0.1, h: 0.1,
    fill: { color: COLORS.primary }
  });
  slide4.addText(task, {
    x: 1.25 + idx * 2.8, y: 6.5, w: 2.6, h: 0.4,
    fontSize: 10,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text
  });
});

// ==================== 第五页：核心功能-机构管理 ====================
const slide5 = pres.addSlide();

slide5.addText('核心功能 1：机构入驻与展示', {
  x: 0.5, y: 0.4, w: 9, h: 0.8,
  fontSize: 32,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.primary
});

// 入驻流程
slide5.addText('入驻流程简化', {
  x: 0.5, y: 1.3, w: 9, h: 0.5,
  fontSize: 18,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const flowSteps = ['提交资料', '快速审核', '即刻开业'];
flowSteps.forEach((step, idx) => {
  // 流程框
  slide5.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 1.5 + idx * 2.5, y: 1.9, w: 2, h: 0.7,
    fill: { color: idx === 2 ? COLORS.dark : COLORS.primary },
    rectRadius: 0.1
  });
  slide5.addText(step, {
    x: 1.5 + idx * 2.5, y: 1.9, w: 2, h: 0.7,
    fontSize: 14,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.white,
    align: 'center',
    valign: 'middle'
  });
  // 箭头
  if (idx < 2) {
    slide5.addShape(pres.shapes.RIGHT_ARROW, {
      x: 3.4 + idx * 2.5, y: 2.1, w: 0.7, h: 0.3,
      fill: { color: COLORS.secondary }
    });
  }
});

// 功能亮点
slide5.addText('功能亮点', {
  x: 0.5, y: 2.9, w: 4, h: 0.5,
  fontSize: 18,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const highlights = [
  '资质认证：营业执照+法人身份证审核，确保机构合规',
  '信息展示：Logo、简介、联系方式、经营类目完整呈现',
  '荣誉时刻：上传荣誉证书，增强家长信任',
  '精彩瞬间：教学环境、学员作品、活动照片展示',
  '教师团队：师资力量可视化，打造专业形象'
];

highlights.forEach((item, idx) => {
  const y = 3.5 + idx * 0.55;
  // 绿色勾选圆点
  slide5.addShape(pres.shapes.OVAL, {
    x: 0.6, y: y + 0.1, w: 0.2, h: 0.2,
    fill: { color: COLORS.primary }
  });
  // 对勾线条模拟
  slide5.addShape(pres.shapes.LINE, {
    x: 0.65, y: y + 0.18, w: 0.05, h: 0.05,
    line: { color: COLORS.white, width: 2 }
  });
  slide5.addText(item, {
    x: 0.9, y: y, w: 4, h: 0.4,
    fontSize: 11,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text
  });
});

// 位置服务
slide5.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 5.5, y: 2.9, w: 4, h: 3.5,
  fill: { color: COLORS.bgLight },
  rectRadius: 0.1
});

// 定位图标
slide5.addShape(pres.shapes.OVAL, {
  x: 5.7, y: 3.1, w: 0.4, h: 0.4,
  fill: { color: COLORS.primary }
});
slide5.addText('智能位置推荐', {
  x: 6.2, y: 3.1, w: 3, h: 0.4,
  fontSize: 16,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.dark,
  valign: 'middle'
});

const locationFeatures = [
  '支持5-20km半径搜索',
  '按距离排序展示附近机构',
  '省市区三级联动筛选'
];
locationFeatures.forEach((item, idx) => {
  slide5.addShape(pres.shapes.OVAL, {
    x: 5.8, y: 3.8 + idx * 0.5, w: 0.1, h: 0.1,
    fill: { color: COLORS.secondary }
  });
  slide5.addText(item, {
    x: 6, y: 3.7 + idx * 0.5, w: 3.3, h: 0.4,
    fontSize: 12,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text
  });
});

// ==================== 第六页：核心功能-课程管理 ====================
const slide6 = pres.addSlide();

slide6.addText('核心功能 2：课程管理与智能预约', {
  x: 0.5, y: 0.4, w: 9, h: 0.8,
  fontSize: 32,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.primary
});

// 左侧：课程发布
slide6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 1.3, w: 4.3, h: 3.2,
  fill: { color: COLORS.bgLight },
  rectRadius: 0.1
});

slide6.addText('课程发布', {
  x: 0.7, y: 1.5, w: 4, h: 0.5,
  fontSize: 18,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.dark
});

slide6.addText('多规格SKU管理', {
  x: 0.7, y: 2.1, w: 4, h: 0.4,
  fontSize: 13,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const skuItems = ['支持多课时包规格（如10课时/20课时/40课时）', '独立定价与库存管理', '适龄范围设置（3-12岁精准定位）'];
skuItems.forEach((item, idx) => {
  slide6.addShape(pres.shapes.OVAL, {
    x: 0.8, y: 2.5 + idx * 0.45, w: 0.1, h: 0.1,
    fill: { color: COLORS.primary }
  });
  slide6.addText(item, {
    x: 1, y: 2.4 + idx * 0.45, w: 3.6, h: 0.4,
    fontSize: 10,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text
  });
});

// 课程类型表格
slide6.addText('课程类型', {
  x: 0.7, y: 3.8, w: 4, h: 0.4,
  fontSize: 13,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const courseTypes = [
  { name: '试听课', desc: '免费/低价体验', feature: '支付自动确认，无需机构审核' },
  { name: '正式课', desc: '常规付费课程', feature: '机构确认后生效，支持退款' }
];

courseTypes.forEach((type, idx) => {
  const y = 4.2 + idx * 0.8;
  // 类型标签
  slide6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y: y, w: 1.2, h: 0.35,
    fill: { color: idx === 0 ? COLORS.secondary : COLORS.primary },
    rectRadius: 0.05
  });
  slide6.addText(type.name, {
    x: 0.8, y: y, w: 1.2, h: 0.35,
    fontSize: 11,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.white,
    align: 'center',
    valign: 'middle'
  });
  slide6.addText(type.desc, {
    x: 2.1, y: y, w: 1.5, h: 0.35,
    fontSize: 10,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text,
    valign: 'middle'
  });
  slide6.addText(type.feature, {
    x: 0.8, y: y + 0.35, w: 3.8, h: 0.35,
    fontSize: 9,
    fontFace: 'Microsoft YaHei',
    color: COLORS.textLight
  });
});

// 右侧：智能预约系统
slide6.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 5, y: 1.3, w: 4.5, h: 3.2,
  fill: { color: COLORS.white },
  line: { color: COLORS.border, width: 1 },
  rectRadius: 0.1
});

slide6.addText('智能预约系统', {
  x: 5.2, y: 1.5, w: 4, h: 0.5,
  fontSize: 18,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.dark
});

// 家长端流程
slide6.addShape(pres.shapes.RECTANGLE, {
  x: 5.2, y: 2.1, w: 0.5, h: 0.3,
  fill: { color: COLORS.primary }
});
slide6.addText('家长端', {
  x: 5.8, y: 2.1, w: 1.5, h: 0.3,
  fontSize: 12,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text,
  valign: 'middle'
});

const parentFlow = ['浏览课程', '选择时段', '一键预约', '等待确认'];
parentFlow.forEach((step, idx) => {
  // 流程圆点
  slide6.addShape(pres.shapes.OVAL, {
    x: 5.3 + idx * 1, y: 2.55, w: 0.2, h: 0.2,
    fill: { color: COLORS.primary }
  });
  slide6.addText((idx + 1).toString(), {
    x: 5.3 + idx * 1, y: 2.55, w: 0.2, h: 0.2,
    fontSize: 10,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.white,
    align: 'center',
    valign: 'middle'
  });
  if (idx < 3) {
    slide6.addShape(pres.shapes.LINE, {
      x: 5.5 + idx * 1, y: 2.65, w: 0.7, h: 0,
      line: { color: COLORS.border, width: 2, endArrowType: 'arrow' }
    });
  }
  slide6.addText(step, {
    x: 5.2 + idx * 1, y: 2.8, w: 0.8, h: 0.4,
    fontSize: 9,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text,
    align: 'center'
  });
});

// 机构端功能
slide6.addShape(pres.shapes.RECTANGLE, {
  x: 5.2, y: 3.4, w: 0.5, h: 0.3,
  fill: { color: COLORS.secondary }
});
slide6.addText('机构端', {
  x: 5.8, y: 3.4, w: 1.5, h: 0.3,
  fontSize: 12,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text,
  valign: 'middle'
});

const orgFeatures = ['可视化排课日历', '智能冲突检测（教师/教室/时间）', '24小时灵活改约'];
orgFeatures.forEach((item, idx) => {
  slide6.addShape(pres.shapes.OVAL, {
    x: 5.3, y: 3.85 + idx * 0.4, w: 0.1, h: 0.1,
    fill: { color: COLORS.secondary }
  });
  slide6.addText(item, {
    x: 5.5, y: 3.8 + idx * 0.4, w: 3.8, h: 0.35,
    fontSize: 10,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text
  });
});

// ==================== 第七页：核心功能-订单与签到 ====================
const slide7 = pres.addSlide();

slide7.addText('核心功能 3：订单管理与智能签到', {
  x: 0.5, y: 0.4, w: 9, h: 0.8,
  fontSize: 32,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.primary
});

// 订单流程
slide7.addText('订单流程', {
  x: 0.5, y: 1.3, w: 9, h: 0.5,
  fontSize: 18,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const orderFlow = ['下单', '支付', '机构确认', '上课签到', '完成评价'];
orderFlow.forEach((step, idx) => {
  // 流程框
  slide7.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5 + idx * 1.8, y: 1.9, w: 1.5, h: 0.6,
    fill: { color: idx % 2 === 0 ? COLORS.primary : COLORS.secondary },
    rectRadius: 0.1
  });
  slide7.addText(step, {
    x: 0.5 + idx * 1.8, y: 1.9, w: 1.5, h: 0.6,
    fontSize: 12,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.white,
    align: 'center',
    valign: 'middle'
  });
  // 箭头
  if (idx < 4) {
    slide7.addShape(pres.shapes.RIGHT_ARROW, {
      x: 1.9 + idx * 1.8, y: 2.05, w: 0.5, h: 0.3,
      fill: { color: COLORS.border }
    });
  }
});

// 支付方式
slide7.addText('支付方式', {
  x: 0.5, y: 2.8, w: 4, h: 0.5,
  fontSize: 16,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const payMethods = [
  { name: '微信支付', desc: '线上购买', feature: '一键支付，自动确认（试听课）' },
  { name: '线下支付', desc: '到店付款', feature: '机构确认收款后生效' }
];

payMethods.forEach((method, idx) => {
  const y = 3.3 + idx * 0.9;
  // 支付图标
  slide7.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: y, w: 0.4, h: 0.4,
    fill: { color: idx === 0 ? COLORS.primary : COLORS.secondary },
    rectRadius: 0.05
  });
  slide7.addText(method.name, {
    x: 1.1, y: y, w: 1.5, h: 0.4,
    fontSize: 13,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.text,
    valign: 'middle'
  });
  slide7.addText(method.desc, {
    x: 2.5, y: y, w: 1.5, h: 0.4,
    fontSize: 11,
    fontFace: 'Microsoft YaHei',
    color: COLORS.textLight,
    valign: 'middle'
  });
  slide7.addText(method.feature, {
    x: 1.1, y: y + 0.4, w: 3.5, h: 0.35,
    fontSize: 10,
    fontFace: 'Microsoft YaHei',
    color: COLORS.textLight
  });
});

// 手机签到系统
slide7.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 5, y: 2.8, w: 4.5, h: 2.5,
  fill: { color: COLORS.bgLight },
  rectRadius: 0.1
});

// 签到图标
slide7.addShape(pres.shapes.OVAL, {
  x: 5.2, y: 3, w: 0.4, h: 0.4,
  fill: { color: COLORS.primary }
});
slide7.addText('上课打卡', {
  x: 5.7, y: 3, w: 3, h: 0.4,
  fontSize: 16,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.dark,
  valign: 'middle'
});

const signinFeatures = [
  '圆形签到按钮，一键打卡',
  '显示上课进度：已上 X 课 / 共 Y 课',
  '支持历史补卡（需填写原因）',
  '课前24小时内可签到'
];
signinFeatures.forEach((item, idx) => {
  slide7.addShape(pres.shapes.OVAL, {
    x: 5.3, y: 3.55 + idx * 0.45, w: 0.1, h: 0.1,
    fill: { color: COLORS.primary }
  });
  slide7.addText(item, {
    x: 5.5, y: 3.5 + idx * 0.45, w: 3.8, h: 0.4,
    fontSize: 11,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text
  });
});

// 退款保障
slide7.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 5, y: 5.5, w: 4.5, h: 1.5,
  fill: { color: COLORS.white },
  line: { color: COLORS.secondary, width: 2 },
  rectRadius: 0.1
});

slide7.addText('退款保障', {
  x: 5.2, y: 5.7, w: 4, h: 0.4,
  fontSize: 16,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.dark
});

const refundItems = ['未上课全额退款', '已上课按比例退款', '48小时审核机制'];
refundItems.forEach((item, idx) => {
  slide7.addShape(pres.shapes.OVAL, {
    x: 5.3, y: 6.15 + idx * 0.35, w: 0.1, h: 0.1,
    fill: { color: COLORS.secondary }
  });
  slide7.addText(item, {
    x: 5.5, y: 6.1 + idx * 0.35, w: 3.8, h: 0.35,
    fontSize: 11,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text
  });
});

// ==================== 第八页：核心功能-课表与宝贝 ====================
const slide8 = pres.addSlide();

slide8.addText('核心功能 4：智能课表与成长档案', {
  x: 0.5, y: 0.4, w: 9, h: 0.8,
  fontSize: 32,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.primary
});

// 左侧：智能课表
slide8.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 1.3, w: 4.5, h: 4.8,
  fill: { color: COLORS.bgLight },
  rectRadius: 0.1
});

slide8.addText('智能课表', {
  x: 0.7, y: 1.5, w: 4, h: 0.5,
  fontSize: 20,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.dark
});

slide8.addText('三大视图模式', {
  x: 0.7, y: 2.1, w: 4, h: 0.4,
  fontSize: 14,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const viewModes = [
  { name: '月视图', desc: '日历展示，课程日期圆点标记' },
  { name: '周视图', desc: '七天卡片，课程数量一目了然' },
  { name: '日视图', desc: '时间轴展示，课程时段精准定位' }
];

viewModes.forEach((mode, idx) => {
  const y = 2.5 + idx * 0.7;
  // 视图标签
  slide8.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y: y, w: 1.2, h: 0.4,
    fill: { color: COLORS.primary },
    rectRadius: 0.05
  });
  slide8.addText(mode.name, {
    x: 0.8, y: y, w: 1.2, h: 0.4,
    fontSize: 12,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.white,
    align: 'center',
    valign: 'middle'
  });
  slide8.addText(mode.desc, {
    x: 2.1, y: y, w: 2.8, h: 0.4,
    fontSize: 11,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text,
    valign: 'middle'
  });
});

slide8.addText('功能亮点', {
  x: 0.7, y: 4.7, w: 4, h: 0.4,
  fontSize: 14,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const scheduleFeatures = [
  '多宝贝切换查看',
  '全部孩子综合课表',
  '快速返回今天',
  '点击课程直达预约详情'
];
scheduleFeatures.forEach((item, idx) => {
  slide8.addShape(pres.shapes.OVAL, {
    x: 0.8, y: 5.1 + idx * 0.35, w: 0.1, h: 0.1,
    fill: { color: COLORS.secondary }
  });
  slide8.addText(item, {
    x: 1, y: 5.05 + idx * 0.35, w: 3.8, h: 0.35,
    fontSize: 10,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text
  });
});

// 右侧：宝贝管理
slide8.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 5.2, y: 1.3, w: 4.3, h: 4.8,
  fill: { color: COLORS.white },
  line: { color: COLORS.border, width: 1 },
  rectRadius: 0.1
});

// 宝宝图标
slide8.addShape(pres.shapes.OVAL, {
  x: 5.4, y: 1.5, w: 0.5, h: 0.5,
  fill: { color: COLORS.secondary }
});
slide8.addText('宝贝管理', {
  x: 6, y: 1.5, w: 3, h: 0.5,
  fontSize: 20,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.dark,
  valign: 'middle'
});

slide8.addText('专属成长档案', {
  x: 5.4, y: 2.2, w: 4, h: 0.4,
  fontSize: 14,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const babyFeatures = [
  '支持添加最多10个宝贝',
  '头像/姓名/性别/年龄/兴趣标签',
  '预约课程时快速选择',
  '课表与宝贝自动关联'
];

babyFeatures.forEach((item, idx) => {
  const y = 2.7 + idx * 0.6;
  // 编号圆圈
  slide8.addShape(pres.shapes.OVAL, {
    x: 5.5, y: y, w: 0.35, h: 0.35,
    fill: { color: COLORS.primary }
  });
  slide8.addText((idx + 1).toString(), {
    x: 5.5, y: y, w: 0.35, h: 0.35,
    fontSize: 12,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.white,
    align: 'center',
    valign: 'middle'
  });
  slide8.addText(item, {
    x: 6, y: y, w: 3.3, h: 0.35,
    fontSize: 12,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text,
    valign: 'middle'
  });
});

// ==================== 第九页：邀友返现 ====================
const slide9 = pres.addSlide();

slide9.addText('核心营销：邀友让利返现系统', {
  x: 0.5, y: 0.4, w: 9, h: 0.8,
  fontSize: 32,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.primary
});

// 营销模式
slide9.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 1.3, w: 9, h: 0.8,
  fill: { color: COLORS.bgLight },
  rectRadius: 0.1
});

slide9.addText('邀请好友，双方受益 —— 社交裂变驱动增长', {
  x: 0.5, y: 1.3, w: 9, h: 0.8,
  fontSize: 18,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.dark,
  align: 'center',
  valign: 'middle'
});

// 流程图
slide9.addText('营销模式概览', {
  x: 0.5, y: 2.2, w: 9, h: 0.5,
  fontSize: 16,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const inviteFlow = [
  { text: '邀请人生成邀请码', color: COLORS.primary },
  { text: '新用户用码立减', color: COLORS.secondary },
  { text: '邀请人按完课进度返现', color: COLORS.dark }
];

inviteFlow.forEach((step, idx) => {
  // 流程框
  slide9.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.8 + idx * 3, y: 2.8, w: 2.4, h: 0.7,
    fill: { color: step.color },
    rectRadius: 0.1
  });
  slide9.addText(step.text, {
    x: 0.8 + idx * 3, y: 2.8, w: 2.4, h: 0.7,
    fontSize: 12,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.white,
    align: 'center',
    valign: 'middle'
  });
  // 箭头
  if (idx < 2) {
    slide9.addShape(pres.shapes.RIGHT_ARROW, {
      x: 3.1 + idx * 3, y: 3, w: 0.8, h: 0.3,
      fill: { color: COLORS.border }
    });
  }
});

// 核心规则表格
slide9.addText('核心规则', {
  x: 0.5, y: 3.7, w: 4.5, h: 0.5,
  fontSize: 18,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const ruleData = [
  [{ text: '要素', options: { bold: true, fill: COLORS.primary, color: COLORS.white } },
   { text: '说明', options: { bold: true, fill: COLORS.primary, color: COLORS.white } }],
  ['通用邀请码', '微信登录即生成，全平台通用'],
  ['返现比例', '机构设置3%-15%（默认10%）'],
  ['让利比例', '邀请人设置0%-100%（默认50%）'],
  ['解锁机制', '按完课进度解锁，100%完课解锁全额']
];

slide9.addTable(ruleData, {
  x: 0.5, y: 4.2, w: 4.5, h: 2,
  fontSize: 10,
  fontFace: 'Microsoft YaHei',
  border: { type: 'solid', pt: 1, color: COLORS.border },
  colW: [1.5, 3]
});

// 三方收益
slide9.addText('三方收益', {
  x: 5.3, y: 3.7, w: 4.2, h: 0.5,
  fontSize: 18,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const benefits = [
  { role: '邀请人', benefit: '好友完课解锁返现，可提现或抵扣', color: COLORS.primary },
  { role: '新用户', benefit: '输入邀请码立减学费（最高全额返现）', color: COLORS.secondary },
  { role: '机构', benefit: '低成本获客，社交裂变传播', color: COLORS.dark }
];

benefits.forEach((item, idx) => {
  const y = 4.2 + idx * 0.7;
  // 角色标签
  slide9.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.3, y: y, w: 1.2, h: 0.5,
    fill: { color: item.color },
    rectRadius: 0.05
  });
  slide9.addText(item.role, {
    x: 5.3, y: y, w: 1.2, h: 0.5,
    fontSize: 12,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.white,
    align: 'center',
    valign: 'middle'
  });
  slide9.addText(item.benefit, {
    x: 6.6, y: y, w: 2.9, h: 0.5,
    fontSize: 11,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text,
    valign: 'middle'
  });
});

// ==================== 第十页：邀友返现案例 ====================
const slide10 = pres.addSlide();

slide10.addText('邀友返现实战案例', {
  x: 0.5, y: 0.4, w: 9, h: 0.8,
  fontSize: 32,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.primary
});

// 案例场景
slide10.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 1.3, w: 9, h: 0.7,
  fill: { color: COLORS.bgLight },
  rectRadius: 0.1
});

slide10.addText('机构A：少儿美术基础课，原价2000元，返现比例10%', {
  x: 0.5, y: 1.3, w: 9, h: 0.7,
  fontSize: 16,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.dark,
  align: 'center',
  valign: 'middle'
});

// 案例描述
slide10.addShape(pres.shapes.RECTANGLE, {
  x: 0.5, y: 2.2, w: 0.4, h: 0.3,
  fill: { color: COLORS.primary }
});
slide10.addText('非获客用户邀请案例', {
  x: 1, y: 2.2, w: 8, h: 0.3,
  fontSize: 14,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text,
  valign: 'middle'
});

slide10.addText('用户甲（未报任何课程）邀请新用户丙报名', {
  x: 1, y: 2.6, w: 8, h: 0.4,
  fontSize: 12,
  fontFace: 'Microsoft YaHei',
  color: COLORS.textLight
});

// 计算过程
slide10.addText('计算过程：', {
  x: 0.5, y: 3.1, w: 9, h: 0.4,
  fontSize: 14,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const calcSteps = [
  '返现总额 = 2000 x 10% = 200元',
  '用户甲设置让利50%，新用户立减 = 200 x 50% = 100元',
  '新用户丙实付 = 2000 - 100 = 1900元',
  '用户甲实际返现 = 200 - 100 = 100元'
];

calcSteps.forEach((step, idx) => {
  const y = 3.5 + idx * 0.5;
  slide10.addShape(pres.shapes.OVAL, {
    x: 0.7, y: y + 0.1, w: 0.15, h: 0.15,
    fill: { color: COLORS.primary }
  });
  slide10.addText((idx + 1).toString(), {
    x: 0.7, y: y + 0.05, w: 0.15, h: 0.2,
    fontSize: 10,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.white,
    align: 'center'
  });
  slide10.addText(step, {
    x: 1, y: y, w: 8, h: 0.4,
    fontSize: 12,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text
  });
});

// 解锁过程
slide10.addText('解锁过程：', {
  x: 0.5, y: 5.6, w: 9, h: 0.4,
  fontSize: 14,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const unlockSteps = [
  { percent: '50%', amount: '50元', note: '（达到50元提现门槛）' },
  { percent: '100%', amount: '50元', note: '（剩余金额）' }
];

unlockSteps.forEach((step, idx) => {
  const x = 0.8 + idx * 4;
  // 进度框
  slide10.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: x, y: 6, w: 3.5, h: 0.8,
    fill: { color: idx === 0 ? COLORS.secondary : COLORS.primary },
    rectRadius: 0.1
  });
  slide10.addText(`完课${step.percent}`, {
    x: x, y: 6, w: 1.5, h: 0.8,
    fontSize: 14,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.white,
    align: 'center',
    valign: 'middle'
  });
  slide10.addText(`解锁${step.amount}`, {
    x: x + 1.5, y: 6, w: 2, h: 0.5,
    fontSize: 16,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.white,
    align: 'center',
    valign: 'middle'
  });
  slide10.addText(step.note, {
    x: x + 1.5, y: 6.45, w: 2, h: 0.35,
    fontSize: 9,
    fontFace: 'Microsoft YaHei',
    color: COLORS.white,
    align: 'center',
    valign: 'middle'
  });
});

// 累计提现
slide10.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 3, y: 7, w: 4, h: 0.6,
  fill: { color: COLORS.dark },
  rectRadius: 0.1
});
slide10.addText('累计可提现 100元', {
  x: 3, y: 7, w: 4, h: 0.6,
  fontSize: 16,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.white,
  align: 'center',
  valign: 'middle'
});

// ==================== 第十一页：产品亮点总结 ====================
const slide11 = pres.addSlide();

slide11.addText('为什么选择稚小苗？', {
  x: 0.5, y: 0.4, w: 9, h: 0.8,
  fontSize: 36,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.primary,
  align: 'center'
});

// 四大亮点
const highlights2 = [
  {
    title: '一站式解决方案',
    desc: '一个平台，覆盖兴趣培训全场景',
    items: ['机构入驻 · 课程管理 · 智能排课', '在线预约 · 订单管理 · 签到统计', '评价系统 · 营销推广 · 数据分析'],
    color: COLORS.primary,
    y: 1.4
  },
  {
    title: '极致便捷体验',
    desc: '无需电脑，手机搞定一切',
    items: ['机构负责人：随时随地管理教务', '教师：课前查看课表，课后一键签到', '家长：躺在床上就能预约课程'],
    color: COLORS.secondary,
    y: 3.8
  },
  {
    title: '低成本获客',
    desc: '邀友返现，社交裂变',
    items: ['零成本获客渠道', '真实完课保障', '三方共赢模式'],
    color: COLORS.accent,
    y: 1.4,
    x: 5
  },
  {
    title: '快速上线',
    desc: '极简入驻流程',
    items: ['提交资料 → 快速审核 → 即刻开业', '3分钟完成日常教务操作', '无需培训，上手即用'],
    color: COLORS.dark,
    y: 3.8,
    x: 5
  }
];

highlights2.forEach(hl => {
  const x = hl.x || 0.5;
  // 卡片背景
  slide11.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: x, y: hl.y, w: 4.3, h: 2.1,
    fill: { color: COLORS.bgLight },
    rectRadius: 0.1
  });
  
  // 标题条
  slide11.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: x, y: hl.y, w: 4.3, h: 0.5,
    fill: { color: hl.color },
    rectRadius: 0.1
  });
  
  slide11.addText(hl.title, {
    x: x, y: hl.y, w: 4.3, h: 0.5,
    fontSize: 16,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.white,
    align: 'center',
    valign: 'middle'
  });
  
  slide11.addText(hl.desc, {
    x: x + 0.2, y: hl.y + 0.6, w: 3.9, h: 0.35,
    fontSize: 11,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.dark
  });
  
  hl.items.forEach((item, idx) => {
    slide11.addShape(pres.shapes.OVAL, {
      x: x + 0.3, y: hl.y + 1.05 + idx * 0.35, w: 0.1, h: 0.1,
      fill: { color: hl.color }
    });
    slide11.addText(item, {
      x: x + 0.5, y: hl.y + 1 + idx * 0.35, w: 3.6, h: 0.35,
      fontSize: 10,
      fontFace: 'Microsoft YaHei',
      color: COLORS.text
    });
  });
});

// ==================== 第十二页：商业模式 ====================
const slide12 = pres.addSlide();

slide12.addText('商业模式：多方共赢的生态系统', {
  x: 0.5, y: 0.4, w: 9, h: 0.8,
  fontSize: 32,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.primary
});

// 盈利模式
slide12.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 1.3, w: 4.5, h: 3.5,
  fill: { color: COLORS.bgLight },
  rectRadius: 0.1
});

slide12.addText('盈利模式', {
  x: 0.7, y: 1.5, w: 4, h: 0.5,
  fontSize: 20,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.dark
});

const profitModes = [
  { name: '交易佣金', desc: '课程成交金额按比例抽成' },
  { name: '增值服务', desc: '高级管理工具、数据分析报告' },
  { name: '广告推广', desc: 'Banner展示、精准推荐位' },
  { name: '支付通道', desc: '支付手续费分成' }
];

profitModes.forEach((mode, idx) => {
  const y = 2.1 + idx * 0.65;
  // 图标
  slide12.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y: y, w: 0.4, h: 0.4,
    fill: { color: COLORS.primary },
    rectRadius: 0.05
  });
  slide12.addText(mode.name, {
    x: 1.3, y: y, w: 1.8, h: 0.4,
    fontSize: 13,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.text,
    valign: 'middle'
  });
  slide12.addText(mode.desc, {
    x: 1.3, y: y + 0.35, w: 3.5, h: 0.3,
    fontSize: 10,
    fontFace: 'Microsoft YaHei',
    color: COLORS.textLight
  });
});

// 成本结构
slide12.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 5.2, y: 1.3, w: 4.3, h: 3.5,
  fill: { color: COLORS.white },
  line: { color: COLORS.border, width: 1 },
  rectRadius: 0.1
});

slide12.addText('成本结构', {
  x: 5.4, y: 1.5, w: 4, h: 0.5,
  fontSize: 20,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.dark
});

const costs = [
  { name: '技术研发', percent: '40%', color: COLORS.primary },
  { name: '市场推广', percent: '30%', color: COLORS.secondary },
  { name: '运营服务', percent: '20%', color: COLORS.accent },
  { name: '其他', percent: '10%', color: COLORS.dark }
];

costs.forEach((cost, idx) => {
  const y = 2.1 + idx * 0.65;
  // 进度条背景
  slide12.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.4, y: y + 0.05, w: 3, h: 0.3,
    fill: { color: COLORS.border },
    rectRadius: 0.05
  });
  // 进度条
  const barWidth = parseInt(cost.percent) / 100 * 3;
  slide12.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.4, y: y + 0.05, w: barWidth, h: 0.3,
    fill: { color: cost.color },
    rectRadius: 0.05
  });
  slide12.addText(cost.name, {
    x: 5.4, y: y + 0.35, w: 2, h: 0.3,
    fontSize: 12,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text
  });
  slide12.addText(cost.percent, {
    x: 8.5, y: y, w: 0.8, h: 0.4,
    fontSize: 12,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: cost.color,
    align: 'right',
    valign: 'middle'
  });
});

// ==================== 第十三页：市场前景 ====================
const slide13 = pres.addSlide();

slide13.addText('市场前景：万亿级素质教育赛道', {
  x: 0.5, y: 0.4, w: 9, h: 0.8,
  fontSize: 32,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.primary
});

// 市场规模
slide13.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 1.3, w: 9, h: 1.5,
  fill: { color: COLORS.bgLight },
  rectRadius: 0.1
});

// 图表图标
slide13.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.5, w: 0.5, h: 0.5,
  fill: { color: COLORS.primary }
});
slide13.addText('素质教育市场持续增长', {
  x: 1.4, y: 1.5, w: 5, h: 0.5,
  fontSize: 18,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.dark,
  valign: 'middle'
});

const marketData = [
  '2024年素质教育市场规模突破 5000亿元',
  '年复合增长率 15%+',
  '3-12岁儿童兴趣培训渗透率持续提升'
];

marketData.forEach((item, idx) => {
  slide13.addShape(pres.shapes.OVAL, {
    x: 1, y: 2.1 + idx * 0.35, w: 0.12, h: 0.12,
    fill: { color: COLORS.primary }
  });
  slide13.addText(item, {
    x: 1.2, y: 2.05 + idx * 0.35, w: 8, h: 0.4,
    fontSize: 13,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text
  });
});

// 目标市场
slide13.addText('目标市场', {
  x: 0.5, y: 3.1, w: 4.5, h: 0.5,
  fontSize: 18,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const targetData = [
  { label: '目标用户', value: '25-45岁家长，3-12岁儿童' },
  { label: '目标机构', value: '艺术、体育、科技、语言类培训机构' },
  { label: '首期覆盖', value: '一二线城市，逐步下沉' }
];

const targetTable = [
  [{ text: '维度', options: { bold: true, fill: COLORS.primary, color: COLORS.white } },
   { text: '数据', options: { bold: true, fill: COLORS.primary, color: COLORS.white } }]
];
targetData.forEach(item => targetTable.push([item.label, item.value]));

slide13.addTable(targetTable, {
  x: 0.5, y: 3.6, w: 4.5, h: 1.8,
  fontSize: 10,
  fontFace: 'Microsoft YaHei',
  border: { type: 'solid', pt: 1, color: COLORS.border },
  colW: [1.3, 3.2]
});

// 竞争优势
slide13.addText('竞争优势', {
  x: 5.2, y: 3.1, w: 4.3, h: 0.5,
  fontSize: 18,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const advantages = [
  '差异化定位：专注素质教育垂直领域',
  '全流程覆盖：从获客到上课到评价完整闭环',
  '极致便捷：一个小程序搞定所有教务',
  '社交裂变：邀友返现降低获客成本'
];

advantages.forEach((item, idx) => {
  const y = 3.6 + idx * 0.5;
  slide13.addShape(pres.shapes.OVAL, {
    x: 5.3, y: y + 0.1, w: 0.2, h: 0.2,
    fill: { color: COLORS.primary }
  });
  slide13.addText(item, {
    x: 5.6, y: y, w: 3.8, h: 0.4,
    fontSize: 11,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text
  });
});

// ==================== 第十四页：联系我们 ====================
const slide14 = pres.addSlide();

slide14.addText('合作联系', {
  x: 0.5, y: 0.4, w: 9, h: 0.8,
  fontSize: 36,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.primary,
  align: 'center'
});

// 寻找的合作伙伴
slide14.addText('我们寻找的合作伙伴', {
  x: 0.5, y: 1.4, w: 9, h: 0.5,
  fontSize: 18,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

const partners = [
  { type: '培训机构', desc: '希望提升运营效率、降低获客成本的素质教育机构', color: COLORS.primary },
  { type: '渠道代理', desc: '有教育机构资源的城市合伙人', color: COLORS.secondary },
  { type: '投资方', desc: '关注素质教育赛道、认可平台价值的投资者', color: COLORS.dark }
];

partners.forEach((partner, idx) => {
  const x = 0.5 + idx * 3.1;
  // 图标
  slide14.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: x, y: 1.95, w: 0.5, h: 0.5,
    fill: { color: partner.color },
    rectRadius: 0.05
  });
  slide14.addText(partner.type, {
    x: x + 0.6, y: 1.95, w: 2.3, h: 0.5,
    fontSize: 14,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.text,
    valign: 'middle'
  });
  slide14.addText(partner.desc, {
    x: x, y: 2.5, w: 2.9, h: 0.8,
    fontSize: 10,
    fontFace: 'Microsoft YaHei',
    color: COLORS.textLight
  });
});

// 联系方式
slide14.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 0.5, y: 3.5, w: 9, h: 3,
  fill: { color: COLORS.bgLight },
  rectRadius: 0.1
});

slide14.addText('联系方式', {
  x: 0.7, y: 3.7, w: 8.5, h: 0.5,
  fontSize: 18,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.dark
});

const contacts = [
  { label: '商务合作', value: 'business@zhixiaomiao.com' },
  { label: '客服热线', value: '400-XXX-XXXX' },
  { label: '官方网站', value: 'www.zhixiaomiao.com' },
  { label: '公司地址', value: '[待填写]' }
];

contacts.forEach((contact, idx) => {
  const y = 4.3 + idx * 0.5;
  // 标签
  slide14.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.9, y: y, w: 1.5, h: 0.4,
    fill: { color: COLORS.primary },
    rectRadius: 0.05
  });
  slide14.addText(contact.label, {
    x: 0.9, y: y, w: 1.5, h: 0.4,
    fontSize: 11,
    fontFace: 'Microsoft YaHei',
    bold: true,
    color: COLORS.white,
    align: 'center',
    valign: 'middle'
  });
  slide14.addText(contact.value, {
    x: 2.5, y: y, w: 6.5, h: 0.4,
    fontSize: 12,
    fontFace: 'Microsoft YaHei',
    color: COLORS.text,
    valign: 'middle'
  });
});

// 关注我们
slide14.addText('关注我们', {
  x: 0.7, y: 5.7, w: 8.5, h: 0.4,
  fontSize: 14,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.text
});

slide14.addText('微信公众号：稚小苗平台    抖音号：@稚小苗', {
  x: 0.9, y: 6.1, w: 8, h: 0.4,
  fontSize: 11,
  fontFace: 'Microsoft YaHei',
  color: COLORS.textLight
});

// ==================== 第十五页：结尾 ====================
const slide15 = pres.addSlide();

// 背景装饰
slide15.addShape(pres.shapes.OVAL, {
  x: -1, y: -1, w: 4, h: 4,
  fill: { color: COLORS.bgLight }
});
slide15.addShape(pres.shapes.OVAL, {
  x: 7, y: 4, w: 4, h: 4,
  fill: { color: COLORS.bgLight }
});

// 主标题
slide15.addText('让兴趣教育更简单', {
  x: 0.5, y: 2, w: 9, h: 0.8,
  fontSize: 42,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.primary,
  align: 'center'
});

// 品牌名
slide15.addText('稚小苗', {
  x: 0.5, y: 3, w: 9, h: 1,
  fontSize: 56,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.dark,
  align: 'center'
});

// 副标题
slide15.addText('一个小程序，管理全流程', {
  x: 0.5, y: 4.1, w: 9, h: 0.6,
  fontSize: 24,
  fontFace: 'Microsoft YaHei',
  color: COLORS.text,
  align: 'center'
});

// 分隔线
slide15.addShape(pres.shapes.LINE, {
  x: 3, y: 4.9, w: 4, h: 0,
  line: { color: COLORS.secondary, width: 3 }
});

// 感谢语
slide15.addText('感谢聆听', {
  x: 0.5, y: 5.3, w: 9, h: 0.6,
  fontSize: 28,
  fontFace: 'Microsoft YaHei',
  bold: true,
  color: COLORS.primary,
  align: 'center'
});

slide15.addText('期待与您携手，共创素质教育美好未来！', {
  x: 0.5, y: 6, w: 9, h: 0.5,
  fontSize: 14,
  fontFace: 'Microsoft YaHei',
  color: COLORS.textLight,
  align: 'center'
});

// 保存文件
const outputPath = '/workspace/projects/workspace/interest-class/docs/稚小苗-宣讲PPT-v2.pptx';
pres.writeFile({ fileName: outputPath })
  .then(() => {
    console.log('PPT生成成功！');
    console.log('文件路径：' + outputPath);
  })
  .catch(err => {
    console.error('PPT生成失败：', err);
  });
