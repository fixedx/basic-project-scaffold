/**
 * 测试数据生成器
 */

/**
 * 图片URL生成器
 */
export const ImageUrls = {
  /**
   * 随机图片（通用）
   * @param width 宽度
   * @param height 高度
   */
  random: (width = 800, height = 600) =>
    `https://picsum.photos/${width}/${height}`,

  /**
   * 人物头像（教师、用户等）
   */
  person: () => 'https://thispersondoesnotexist.com/',

  /**
   * 课程封面
   */
  courseCover: () => ImageUrls.random(800, 600),

  /**
   * 轮播图
   */
  slider: () => ImageUrls.random(1200, 600),

  /**
   * 证书图片
   */
  certificate: () => ImageUrls.random(600, 800),

  /**
   * 教室图片
   */
  classroom: () => ImageUrls.random(800, 600),
};

/**
 * 唯一ID生成器
 */
export const UniqueId = {
  timestamp: () => Date.now(),
  username: (prefix = 'user') => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).slice(-4);
    return `${prefix}_${timestamp}${random}`;
  },
  phone: () => {
    // 使用时间戳最后6位 + 随机2位，确保11位手机号且唯一
    // 138 (3位) + 时间戳6位 + 随机2位 = 11位
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `138${timestamp}${random}`;
  },
  email: (prefix = 'test') => `${prefix}_${Date.now()}@example.com`,
};

/**
 * 测试用户数据
 */
export const TestUsers = {
  /**
   * 机构管理员（使用手机号）
   */
  institutionAdmin: () => ({
    phone: UniqueId.phone(),
    real_name: '张三',
    role: 'owner' as const,
  }),

  /**
   * 机构员工（使用手机号）
   */
  institutionStaff: () => ({
    phone: UniqueId.phone(),
    real_name: '李四',
    role: 'staff' as const,
  }),

  /**
   * 微信用户
   */
  wechatUser: () => ({
    code: UniqueId.username('wx'),
    nickname: '测试家长',
    avatar: ImageUrls.person(),
  }),
};

/**
 * 测试机构数据
 */
export const TestInstitution = {
  /**
   * 艺术类机构
   */
  art: () => ({
    name: `艺术培训中心_${Date.now()}`,
    logo: ImageUrls.random(200, 200),
    introduction: '专业的艺术培训机构，提供舞蹈、绘画、音乐等多种课程',
    tags: 'small_class,professional_teachers,free_trial',
    license_no: `LICENSE_${Date.now()}`,
    license_img: ImageUrls.certificate(),
    legal_person: '王经理',
    id_card_imgs: {
      front: ImageUrls.certificate(),
      back: ImageUrls.certificate(),
    },
    bank_name: '中国工商银行',
    bank_account: `622202${Date.now().toString().slice(-10)}`,
    account_holder: '艺术培训中心',
    province: '北京市',
    city: '北京市',
    district: '朝阳区',
    address: '朝阳路88号艺术大厦',
    latitude: 39.921489,
    longitude: 116.443108,
    contact_phone: UniqueId.phone(),
    category_ids: [],
    honors: [
      {
        title: '2024年度优秀培训机构',
        img_url: ImageUrls.certificate(),
        honor_date: '2024-12-01',
        sort_order: 1,
      },
      {
        title: '最受欢迎艺术机构奖',
        img_url: ImageUrls.certificate(),
        honor_date: '2024-06-15',
        sort_order: 2,
      },
    ],
    teaching_environments: [
      {
        title: '专业舞蹈教室',
        img_url: ImageUrls.classroom(),
        description: '200平米专业舞蹈教室，配备全身镜和专业把杆',
        sort_order: 1,
      },
    ],
    showcases: [
      {
        title: '学员舞蹈作品展示',
        img_url: ImageUrls.random(800, 600),
        type: 'student_work',
        description: '学员参加市级舞蹈比赛获奖作品',
        sort_order: 1,
      },
      {
        title: '年度汇报演出',
        img_url: ImageUrls.random(800, 600),
        type: 'activity',
        description: '2024年度学员汇报演出精彩瞬间',
        sort_order: 2,
      },
    ],
  }),

  /**
   * 体育类机构
   */
  sports: () => ({
    name: `体育训练中心_${Date.now()}`,
    logo: ImageUrls.random(200, 200),
    introduction: '专业的体育培训机构，提供篮球、足球、游泳等多种课程',
    tags: 'competition_training,professional_teachers,nice_environment',
    license_no: `LICENSE_${Date.now()}`,
    license_img: ImageUrls.certificate(),
    legal_person: '刘教练',
    id_card_imgs: {
      front: ImageUrls.certificate(),
      back: ImageUrls.certificate(),
    },
    bank_name: '中国建设银行',
    bank_account: `622280${Date.now().toString().slice(-10)}`,
    account_holder: '体育训练中心',
    province: '北京市',
    city: '北京市',
    district: '海淀区',
    address: '中关村大街100号体育中心',
    latitude: 39.983424,
    longitude: 116.318177,
    contact_phone: UniqueId.phone(),
    category_ids: [],
    honors: [
      {
        title: '青少年体育训练示范基地',
        img_url: ImageUrls.certificate(),
        honor_date: '2024-09-10',
        sort_order: 1,
      },
      {
        title: '体育培训行业标杆单位',
        img_url: ImageUrls.certificate(),
        honor_date: '2024-03-20',
        sort_order: 2,
      },
    ],
    teaching_environments: [
      {
        title: '室内篮球馆',
        img_url: ImageUrls.classroom(),
        description: '标准室内篮球场，专业地板和灯光设备',
        sort_order: 1,
      },
    ],
    showcases: [
      {
        title: '学员训练成果',
        img_url: ImageUrls.random(800, 600),
        type: 'student_work',
        description: '学员在区级篮球比赛中夺冠',
        sort_order: 1,
      },
      {
        title: '暑期训练营',
        img_url: ImageUrls.random(800, 600),
        type: 'activity',
        description: '2024年暑期篮球训练营圆满结束',
        sort_order: 2,
      },
    ],
  }),
};

/**
 * 测试教室数据
 */
export const TestClassroom = {
  /**
   * 舞蹈教室
   */
  dance: (institutionId: string) => ({
    institution_id: institutionId,
    name: `舞蹈教室_${Date.now()}`,
    area: 120,
    capacity: 25,
    floor: '3F',
    facilities: ['落地镜', '把杆', '专业地板', '音响设备', '空调'],
    status: 'available' as const,
    description: '配备专业舞蹈地板和落地镜，适合各类舞蹈课程教学',
  }),

  /**
   * 绘画教室
   */
  art: (institutionId: string) => ({
    institution_id: institutionId,
    name: `绘画教室_${Date.now()}`,
    area: 80,
    capacity: 15,
    floor: '2F',
    facilities: ['画架', '画板', '静物台', '自然光', '储物柜'],
    status: 'available' as const,
    description: '采光良好，配备专业绘画设备，适合各类美术课程',
  }),

  /**
   * 音乐教室
   */
  music: (institutionId: string) => ({
    institution_id: institutionId,
    name: `音乐教室_${Date.now()}`,
    area: 60,
    capacity: 10,
    floor: '4F',
    facilities: ['钢琴', '吉他', '架子鼓', '隔音设备', '音响系统'],
    status: 'available' as const,
    description: '专业隔音，配备多种乐器，适合器乐课程教学',
  }),
};

/**
 * 测试教师数据
 */
export const TestTeacher = {
  /**
   * 舞蹈教师
   */
  dance: (institutionId: string) => ({
    institution_id: institutionId,
    name: '李舞蹈',
    gender: 'female' as const,
    phone: UniqueId.phone(),
    photo: ImageUrls.person(),
    subjects: ['中国舞', '芭蕾舞', '现代舞'],
    title: '国家一级舞蹈教师',
    years_of_experience: 10,
    bio: '毕业于北京舞蹈学院，拥有10年专业舞蹈教学经验，擅长少儿舞蹈启蒙和基本功训练。多次带队参加全国舞蹈比赛并获奖，培养学员考入专业艺术院校。',
    certificates: [ImageUrls.certificate(), ImageUrls.certificate()],
    status: 'active' as const,
  }),

  /**
   * 美术教师
   */
  art: (institutionId: string) => ({
    institution_id: institutionId,
    name: '王画家',
    gender: 'male' as const,
    phone: UniqueId.phone(),
    photo: ImageUrls.person(),
    subjects: ['素描', '水彩', '油画'],
    title: '中央美术学院学士',
    years_of_experience: 12,
    bio: '毕业于中央美术学院，职业画家，擅长写实绘画和创意美术教学。作品多次参加全国美术展览，指导学员作品获得省级奖项。',
    certificates: [ImageUrls.certificate(), ImageUrls.certificate()],
    status: 'active' as const,
  }),

  /**
   * 音乐教师
   */
  music: (institutionId: string) => ({
    institution_id: institutionId,
    name: '陈音乐',
    gender: 'female' as const,
    phone: UniqueId.phone(),
    photo: ImageUrls.person(),
    subjects: ['钢琴', '声乐', '乐理'],
    title: '中央音乐学院硕士',
    years_of_experience: 8,
    bio: '毕业于中央音乐学院，拥有深厚的音乐理论基础和丰富的教学经验。指导学员通过钢琴十级考试，多次举办学生音乐会。',
    certificates: [ImageUrls.certificate(), ImageUrls.certificate()],
    status: 'active' as const,
  }),
};

/**
 * 测试课程数据
 */
export const TestCourse = {
  /**
   * 舞蹈课程
   */
  dance: (categoryCode = 'dance') => ({
    title: `少儿芭蕾舞班_${Date.now()}`,
    subtitle: '专业舞蹈培训，启蒙艺术之美',
    category_code: categoryCode,
    slider_imgs: [ImageUrls.slider(), ImageUrls.slider(), ImageUrls.slider()],
    tags: ['舞蹈', '少儿', '芭蕾', '形体'],
    description:
      '专为4-12岁儿童设计的芭蕾舞基础课程，包括基本功训练、形体训练、舞蹈组合练习等内容。通过系统的训练，帮助孩子建立优美的形体，培养艺术气质。',
    min_age: 4,
    max_age: 12,
    lesson_duration: 60,
    type: 'standard' as const,
    skus: [
      {
        name: '单次体验课',
        total_lessons: 1,
        total_price: 100,
        cashback_type: 'fixed' as const,
        cashback_value: 10,
      },
      {
        name: '10次课程包',
        total_lessons: 10,
        total_price: 900,
        cashback_type: 'fixed' as const,
        cashback_value: 50,
      },
      {
        name: '30次课程包',
        total_lessons: 30,
        total_price: 2400,
        cashback_type: 'percentage' as const,
        cashback_value: 5,
      },
    ],
  }),

  /**
   * 美术课程
   */
  art: (categoryCode = 'art_painting') => ({
    title: `创意美术班_${Date.now()}`,
    subtitle: '激发想象力，培养创造力',
    category_code: categoryCode,
    slider_imgs: [ImageUrls.slider(), ImageUrls.slider()],
    tags: ['美术', '绘画', '创意', '少儿'],
    description:
      '针对5-10岁儿童设计的创意美术课程，通过多种绘画技法和创意活动，激发孩子的想象力和创造力。课程内容包括线描、水彩、手工等多种形式。',
    min_age: 5,
    max_age: 10,
    lesson_duration: 90,
    type: 'standard' as const,
    skus: [
      {
        name: '体验课',
        total_lessons: 1,
        total_price: 80,
        cashback_type: 'fixed' as const,
        cashback_value: 10,
      },
      {
        name: '12次季度包',
        total_lessons: 12,
        total_price: 960,
        cashback_type: 'fixed' as const,
        cashback_value: 80,
      },
    ],
  }),

  /**
   * 音乐课程
   */
  music: (categoryCode = 'music') => ({
    title: `钢琴启蒙班_${Date.now()}`,
    subtitle: '音乐启蒙，从这里开始',
    category_code: categoryCode,
    slider_imgs: [ImageUrls.slider()],
    tags: ['钢琴', '音乐', '启蒙', '少儿'],
    description:
      '专为4-8岁儿童设计的钢琴启蒙课程，采用趣味教学法，让孩子在快乐中学习音乐，掌握钢琴基本技能。',
    min_age: 4,
    max_age: 8,
    lesson_duration: 45,
    type: 'standard' as const,
    skus: [
      {
        name: '8次月度包',
        total_lessons: 8,
        total_price: 1600,
        cashback_type: 'percentage' as const,
        cashback_value: 3,
      },
      {
        name: '24次季度包',
        total_lessons: 24,
        total_price: 4560,
        cashback_type: 'percentage' as const,
        cashback_value: 5,
      },
    ],
  }),
};

/**
 * 测试排课数据
 */
export const TestSchedule = {
  /**
   * 周末班排课
   */
  weekend: () => {
    const nextSaturday = new Date();
    nextSaturday.setDate(
      nextSaturday.getDate() + ((6 - nextSaturday.getDay() + 7) % 7),
    );
    nextSaturday.setHours(10, 0, 0, 0);

    return {
      start_time: nextSaturday.toISOString(),
      end_time: new Date(nextSaturday.getTime() + 90 * 60000).toISOString(),
      max_students: 15,
      current_students: 0,
      status: 'available' as const,
      remark: '周末班，适合上班族家长',
    };
  },

  /**
   * 平日班排课
   */
  weekday: () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(16, 0, 0, 0);

    return {
      start_time: tomorrow.toISOString(),
      end_time: new Date(tomorrow.getTime() + 60 * 60000).toISOString(),
      max_students: 20,
      current_students: 0,
      status: 'available' as const,
      remark: '平日放学后时段',
    };
  },

  /**
   * 工作日早班排课
   */
  weekdayMorning: () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    return {
      start_time: tomorrow.toISOString(),
      end_time: new Date(tomorrow.getTime() + 90 * 60000).toISOString(),
      max_students: 12,
      current_students: 0,
      status: 'available' as const,
      remark: '工作日早班，9:00-10:30',
    };
  },

  /**
   * 工作日下午班排课
   */
  weekdayAfternoon: () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    return {
      start_time: tomorrow.toISOString(),
      end_time: new Date(tomorrow.getTime() + 120 * 60000).toISOString(),
      max_students: 15,
      current_students: 0,
      status: 'available' as const,
      remark: '工作日下午班，14:00-16:00',
    };
  },
};

/**
 * 测试预约数据
 */
export const TestBooking = {
  /**
   * 试听预约
   */
  trial: () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    return {
      student_name: '小明',
      student_phone: UniqueId.phone(),
      student_age: 6,
      booking_time: tomorrow.toISOString(),
      remark: '希望安排在周末，孩子喜欢舞蹈',
    };
  },

  /**
   * 正式课预约
   */
  regular: () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(10, 0, 0, 0);

    return {
      student_name: '小红',
      student_phone: UniqueId.phone(),
      student_age: 7,
      booking_time: nextWeek.toISOString(),
      remark: '已购买课程包，预约第一次课',
    };
  },
};

/**
 * 测试订单数据
 * 新业务流程：创建订单时同时创建预约
 */
export const TestOrder = {
  /**
   * 线下支付订单（包含预约信息）
   */
  offline: () => ({
    quantity: 1,
    student_name: '小刚',
    student_phone: UniqueId.phone(),
    student_age: 6,
    payment_method: 'offline' as const,
    remark: '到店支付',
  }),

  /**
   * 在线支付订单（包含预约信息）
   */
  online: () => ({
    quantity: 1,
    student_name: '小美',
    student_phone: UniqueId.phone(),
    student_age: 7,
    payment_method: 'wechat' as const,
    remark: '微信支付',
  }),
};

/**
 * 测试评价数据
 */
export const TestReview = {
  /**
   * 五星好评
   */
  excellent: () => ({
    rating: 5,
    content:
      '非常棒的课程！老师很专业，孩子很喜欢。教室环境也很好，会继续学习的。强烈推荐给其他家长！',
    images: [ImageUrls.random(800, 600), ImageUrls.random(800, 600)],
  }),

  /**
   * 四星好评
   */
  good: () => ({
    rating: 4,
    content: '整体不错，老师很负责，孩子有进步。如果教室能再大一点就更好了。',
    images: [ImageUrls.random(800, 600)],
  }),

  /**
   * 三星中评
   */
  average: () => ({
    rating: 3,
    content: '一般般吧，课程内容还行，但是感觉性价比不是很高。',
    images: [],
  }),
};

/**
 * 测试宝贝数据
 */
export const TestChild = {
  /**
   * 男孩
   */
  boy: () => ({
    name: `小明_${Date.now().toString().slice(-6)}`,
    avatar: ImageUrls.random(200, 200),
    gender: 'male' as const,
    birthday: '2018-05-15',
    age: 6,
    phone: UniqueId.phone(),
    interests: ['绘画', '足球', '阅读'],
    remark: '活泼好动，喜欢运动',
  }),

  /**
   * 女孩
   */
  girl: () => ({
    name: `小红_${Date.now().toString().slice(-6)}`,
    avatar: ImageUrls.random(200, 200),
    gender: 'female' as const,
    birthday: '2019-08-20',
    age: 5,
    phone: UniqueId.phone(),
    interests: ['舞蹈', '钢琴', '绘画'],
    remark: '文静乖巧，喜欢艺术',
  }),

  /**
   * 简单信息（只有必填字段）
   */
  simple: () => ({
    name: `宝贝_${Date.now().toString().slice(-6)}`,
  }),
};
