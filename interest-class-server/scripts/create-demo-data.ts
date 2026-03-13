/**
 * 创建完整演示数据脚本
 *
 * 功能：使用指定手机号创建机构，并创建教师、教室、课程及排课数据
 *
 * 使用方式：
 *   npx ts-node scripts/create-demo-data.ts
 *
 * 配置：修改下方 CONFIG 变量中的手机号
 */

import axios, { AxiosInstance } from 'axios';

// ================== 配置区域 - 修改这里 ==================
const CONFIG = {
  // 机构 owner 的手机号（用于入驻和登录）
  OWNER_PHONE: '13800138000', // ⬅️ 请修改为你的手机号

  // 教师固定手机号（用于 mock 登录，与 .env.development 中 MOCK_TEACHER_PHONES 对应）
  TEACHER_PHONE: '13900139000', // ⬅️ 第一个教师使用固定手机号

  // 家长手机号（用于体验完整预约→支付→评价流程）
  PARENT_PHONE: '13700137000', // ⬅️ 家长测试账号

  // 管理员账号（用于审核机构）
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',

  // API 地址
  API_BASE_URL: 'http://localhost:8888/api',
};
// ========================================================

/**
 * 颜色日志工具
 */
const logger = {
  info: (msg: string) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg: string) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg: string) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  section: (title: string) =>
    console.log(`\n\x1b[33m========== ${title} ==========\x1b[0m`),
  data: (label: string, data: any) =>
    console.log(`\x1b[35m[${label}]\x1b[0m`, JSON.stringify(data, null, 2)),
};

/**
 * API 响应类型
 */
interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

/**
 * HTTP 客户端类
 */
class ApiClient {
  private client: AxiosInstance;

  constructor(token?: string) {
    this.client = axios.create({
      baseURL: CONFIG.API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }

  setToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  async get<T = any>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    if (response.data.code !== 200) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    if (response.data.code !== 200) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  }

  async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    if (response.data.code !== 200) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  }
}

/**
 * 延迟函数
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 图片 URL 生成器
 */
const ImageUrls = {
  random: (width = 800, height = 600) =>
    `https://picsum.photos/${width}/${height}?random=${Date.now()}`,
  person: () => `https://picsum.photos/200/200?random=${Date.now()}`,
  certificate: () =>
    `https://picsum.photos/600/800?random=${Date.now()}`,
  classroom: () =>
    `https://picsum.photos/800/600?random=${Date.now()}`,
};

/**
 * 创建完整演示数据
 */
async function createDemoData() {
  const client = new ApiClient();
  const createdData = {
    institutionId: '',
    token: '',
    teacherIds: [] as string[],
    classroomIds: [] as string[],
    courseIds: [] as string[],
    scheduleIds: [] as string[],
    // 新增字段
    skuId: '',           // 第一个课程的第一个 SKU ID
    parentToken: '',     // 家长端 token
    childId: '',         // 宝贝 ID
    bookingId: '',       // 预约 ID
    orderId: '',         // 订单 ID
    reviewId: '',        // 评价 ID
    bannerId: '',        // Banner ID
    announcementId: '',  // 公告 ID
  };

  // 标记是否找到已有数据（用于跳过创建步骤）
  let isExistingData = false;

  try {
    // ==================== 0. 检查是否已有演示数据（幂等支持）====================
    logger.section('0. 检查已有演示数据');

    try {
      const checkCode = `phone_${CONFIG.OWNER_PHONE}_${Date.now()}`;
      const existingLogin = await client.post<{ token: string; userInfo: any }>(
        '/auth/phone-login',
        { code: checkCode, type: 'institution' },
      );
      createdData.token = existingLogin.token;
      client.setToken(createdData.token);

      // ⚠️ 关键：直接使用 JWT 中的 institutionId，确保与 token 完全一致
      // 不用 GET /institution/my（它按 created_by 查询，多次运行后可能与 JWT 不同机构）
      const jwtInstitutionId = existingLogin.userInfo?.institutionId;
      if (jwtInstitutionId) {
        createdData.institutionId = jwtInstitutionId;
        isExistingData = true;
        const myInstitution = await client.get<any>(`/institution/${jwtInstitutionId}`).catch(() => null);
        logger.info(`检测到已有机构: ${jwtInstitutionId} (${myInstitution?.name || ''})`);

        // 加载已有教师
        try {
          const teachers = await client.get<any[]>('/teacher', { institutionId: jwtInstitutionId });
          if (Array.isArray(teachers) && teachers.length > 0) {
            createdData.teacherIds = teachers.map((t: any) => t.id);
            logger.info(`已有教师: ${createdData.teacherIds.length} 位`);
          }
        } catch (e) { /* 忽略 */ }

        // 加载已有教室
        try {
          const classrooms = await client.get<any[]>('/classroom', { institutionId: jwtInstitutionId });
          if (Array.isArray(classrooms) && classrooms.length > 0) {
            createdData.classroomIds = classrooms.map((c: any) => c.id);
            logger.info(`已有教室: ${createdData.classroomIds.length} 间`);
          }
        } catch (e) { /* 忽略 */ }

        // 加载已有课程
        try {
          const coursesResult = await client.get<any>('/courses', {
            institutionId: jwtInstitutionId,
            page: 1,
            pageSize: 20,
          });
          const courseList = coursesResult?.data || coursesResult;
          if (Array.isArray(courseList) && courseList.length > 0) {
            createdData.courseIds = courseList.map((c: any) => c.id);
            logger.info(`已有课程: ${createdData.courseIds.length} 门`);

            // 获取第一个课程的 SKU
            try {
              const firstCourse = await client.get<any>(`/courses/${createdData.courseIds[0]}`);
              if (firstCourse?.skus?.length > 0) {
                createdData.skuId = firstCourse.skus[0].id;
                logger.info(`已有 SKU: ${createdData.skuId}`);
              }
            } catch (e) { /* 忽略 */ }

            // 获取第一个课程的排课
            try {
              const schedules = await client.get<any[]>(`/schedule/course/${createdData.courseIds[0]}`);
              if (Array.isArray(schedules) && schedules.length > 0) {
                createdData.scheduleIds = schedules.map((s: any) => s.id);
                logger.info(`已有排课: ${createdData.scheduleIds.length} 条`);
              }
            } catch (e) { /* 忽略 */ }
          }
        } catch (e) { /* 忽略 */ }

        logger.success('找到已有演示数据，机构/教师/教室/课程创建步骤将跳过');
      }
    } catch (e) {
      logger.info('未找到已有数据，将从头创建新演示数据');
    }

    // ==================== 1. 创建机构 ====================
    if (createdData.institutionId) {
      logger.section('1. 创建机构 [已跳过 - 使用已有机构]');
      logger.info(`复用机构: ${createdData.institutionId}`);
    } else {
      logger.section('1. 创建机构');
    }

    const institutionData = {
      accounts: [
        {
          phone: CONFIG.OWNER_PHONE,
          real_name: '张老师',
          role: 'owner',
        },
      ],
      name: `优艺培训中心_${Date.now()}`,
      logo: ImageUrls.random(200, 200),
      introduction:
        '专业的艺术培训机构，提供舞蹈、绘画、音乐、钢琴等多种课程。拥有10年教学经验，培养了众多优秀学员。',
      tags: '少儿艺术,专业师资,小班教学,优质环境',
      license_no: `LICENSE_${Date.now()}`,
      license_img: ImageUrls.certificate(),
      legal_person: '张老师',
      id_card_imgs: {
        front: ImageUrls.certificate(),
        back: ImageUrls.certificate(),
      },
      bank_name: '中国工商银行',
      bank_account: `622202${Date.now().toString().slice(-10)}`,
      account_holder: '优艺培训中心',
      province: '北京市',
      city: '北京市',
      district: '朝阳区',
      address: '朝阳路88号艺术大厦3层',
      latitude: 39.921489,
      longitude: 116.443108,
      contact_phone: CONFIG.OWNER_PHONE,
      category_ids: [],
      honors: [
        {
          title: '2024年度优秀培训机构',
          img_url: ImageUrls.certificate(),
          honor_date: '2024-12-01',
          sort_order: 1,
        },
        {
          title: '最受欢迎艺术教育品牌',
          img_url: ImageUrls.certificate(),
          honor_date: '2024-06-15',
          sort_order: 2,
        },
        {
          title: '全国艺术教育示范单位',
          img_url: ImageUrls.certificate(),
          honor_date: '2024-03-20',
          sort_order: 3,
        },
      ],
      showcases: [
        {
          title: '专业舞蹈教室',
          img_url: ImageUrls.classroom(),
          type: 'classroom',
          description: '200平米专业舞蹈教室，配备全身镜和专业把杆',
          sort_order: 1,
        },
        {
          title: '钢琴房',
          img_url: ImageUrls.classroom(),
          type: 'classroom',
          description: '配备三角钢琴和多台立式钢琴，隔音效果好',
          sort_order: 2,
        },
        {
          title: '学员演出',
          img_url: ImageUrls.random(800, 600),
          type: 'activity',
          description: '学员在年度汇演中的精彩表现',
          sort_order: 3,
        },
        {
          title: '学员绘画作品',
          img_url: ImageUrls.random(800, 600),
          type: 'student_work',
          description: '优秀学员的绘画作品展示',
          sort_order: 4,
        },
      ],
    };

    if (!createdData.institutionId) {
      createdData.institutionId = await client.post('/institution', institutionData);
      logger.success(`机构创建成功: ${createdData.institutionId}`);
      logger.info(`机构名称: ${institutionData.name}`);
      logger.info(`Owner手机号: ${CONFIG.OWNER_PHONE}`);
      await sleep(500);
    }

    // ==================== 2. 手机号登录 ====================
    if (createdData.token) {
      logger.section('2. 机构登录 [已跳过 - 已在检查阶段登录]');
    } else {
      logger.section('2. 机构登录');
      const mockCode = `phone_${CONFIG.OWNER_PHONE}_${Date.now()}`;
      const loginResult = await client.post<{ token: string }>(
        '/auth/phone-login',
        {
          code: mockCode,
          type: 'institution',
        },
      );
      createdData.token = loginResult.token;
      client.setToken(createdData.token);
      logger.success(`登录成功，Token已设置`);
      await sleep(300);
    }

    // ==================== 3. 机构签约与审核流程 ====================
    logger.section('3. 机构签约与审核流程');

    // 管理员登录
    const adminLoginResult = await client.post<{ token: string }>(
      '/auth/admin-login',
      {
        username: CONFIG.ADMIN_USERNAME,
        password: CONFIG.ADMIN_PASSWORD,
      },
    );
    const adminToken = adminLoginResult.token;
    logger.success(`管理员登录成功`);
    const adminClient = new ApiClient(adminToken);

    // 查询机构当前审核状态
    const institutionDetail = await client.get<{ audit_status: string }>(
      `/institution/${createdData.institutionId}`,
    );
    let effectiveStatus = institutionDetail.audit_status;
    logger.info(`机构当前审核状态: ${effectiveStatus}`);

    // 3a: 机构提交审核申请（draft/rejected → pending）
    if (['draft', 'rejected'].includes(effectiveStatus)) {
      await client.post(
        '/institution/submit',
        { institutionId: createdData.institutionId },
      );
      effectiveStatus = 'pending';
      logger.success('3a. 机构提交审核申请 → 待审核(pending)');
      await sleep(200);
    } else {
      logger.info(`3a. 跳过提交审核（当前状态: ${effectiveStatus}）`);
    }

    // 3b: 管理员审核机构（pending → contract_signing）
    if (effectiveStatus === 'pending') {
      await adminClient.put(
        `/admin/audit/${createdData.institutionId}`,
        { auditStatus: 'approved' },
      );
      effectiveStatus = 'contract_signing';
      logger.success('3b. 管理员审核通过 → 待签约(contract_signing)');
      await sleep(200);
    } else {
      logger.info(`3b. 跳过审核（当前状态: ${effectiveStatus}）`);
    }

    // 3c: 机构提交签约凭证（contract_signing → contract_review）
    if (effectiveStatus === 'contract_signing') {
      await client.put(
        `/institution/${createdData.institutionId}/submit-contract`,
        { contract_screenshot: ImageUrls.certificate() },
      );
      effectiveStatus = 'contract_review';
      logger.success('3c. 机构提交签约凭证 → 签约审核中(contract_review)');
      await sleep(200);
    } else {
      logger.info(`3c. 跳过提交签约（当前状态: ${effectiveStatus}）`);
    }

    // 3d: 管理员审核通过签约（contract_review → approved）
    if (effectiveStatus === 'contract_review') {
      await adminClient.put(
        `/admin/contract/${createdData.institutionId}`,
        { status: 'approved' },
      );
      effectiveStatus = 'approved';
      logger.success('3d. 管理员签约审核通过 → 机构正式上线(approved)');
      await sleep(200);
    } else {
      logger.info(`3d. 跳过签约审核（当前状态: ${effectiveStatus}）`);
    }

    if (effectiveStatus !== 'approved') {
      throw new Error(`机构审核流程未完成，当前状态: ${effectiveStatus}，请检查后重试`);
    }
    logger.success(`✅ 机构已正式上线，可上架课程、接受家长浏览下单`);
    await sleep(300);

    // ==================== 4. 创建教师 ====================
    if (createdData.teacherIds.length > 0) {
      logger.section('4. 创建教师 [已跳过 - 使用已有教师]');
      logger.info(`复用已有教师: ${createdData.teacherIds.length} 位`);
    } else {
      logger.section('4. 创建教师');

    const teachers = [
      {
        institution_id: createdData.institutionId,
        name: '李芳',
        gender: 'female',
        phone: CONFIG.TEACHER_PHONE, // ⭐ 使用固定手机号，用于 mock 登录
        photo: ImageUrls.person(),
        subjects: ['中国舞', '芭蕾舞', '现代舞'],
        title: '国家一级舞蹈教师',
        years_of_experience: 12,
        bio: '毕业于北京舞蹈学院，拥有12年专业舞蹈教学经验。擅长少儿舞蹈启蒙和基本功训练，多次带队参加全国舞蹈比赛并获奖。',
        certificates: [ImageUrls.certificate(), ImageUrls.certificate()],
        status: 'active',
      },
      {
        institution_id: createdData.institutionId,
        name: '王明',
        gender: 'male',
        phone: `139${Date.now().toString().slice(-8)}`,
        photo: ImageUrls.person(),
        subjects: ['素描', '水彩', '油画', '创意美术'],
        title: '中央美术学院学士',
        years_of_experience: 8,
        bio: '毕业于中央美术学院，职业画家。擅长写实绘画和创意美术教学，作品多次参加全国美术展览。',
        certificates: [ImageUrls.certificate()],
        status: 'active',
      },
      {
        institution_id: createdData.institutionId,
        name: '陈雨',
        gender: 'female',
        phone: `137${Date.now().toString().slice(-8)}`,
        photo: ImageUrls.person(),
        subjects: ['钢琴', '声乐', '乐理'],
        title: '中央音乐学院硕士',
        years_of_experience: 10,
        bio: '毕业于中央音乐学院，拥有深厚的音乐理论基础和丰富的教学经验。指导学员通过钢琴十级考试，多次举办学生音乐会。',
        certificates: [ImageUrls.certificate(), ImageUrls.certificate()],
        status: 'active',
      },
    ];

    for (const teacher of teachers) {
      await sleep(100);
      const teacherId = await client.post<string>('/teacher', teacher);
      createdData.teacherIds.push(teacherId);
      logger.success(`教师 "${teacher.name}" 创建成功: ${teacherId}`);
    }
    } // end else (创建教师)

    // ==================== 5. 创建教室 ====================
    if (createdData.classroomIds.length > 0) {
      logger.section('5. 创建教室 [已跳过 - 使用已有教室]');
      logger.info(`复用已有教室: ${createdData.classroomIds.length} 间`);
    } else {
      logger.section('5. 创建教室');

    const classrooms = [
      {
        institution_id: createdData.institutionId,
        name: '舞蹈教室A',
        area: 150,
        capacity: 25,
        floor: '3F',
        facilities: ['落地镜', '把杆', '专业地板', '音响设备', '空调', '新风系统'],
        status: 'available',
        description: '宽敞明亮的专业舞蹈教室，配备进口地板和专业把杆，适合各类舞蹈课程教学。',
      },
      {
        institution_id: createdData.institutionId,
        name: '绘画教室',
        area: 80,
        capacity: 15,
        floor: '2F',
        facilities: ['画架', '画板', '静物台', '自然采光', '储物柜', '洗手池'],
        status: 'available',
        description: '采光良好的美术教室，配备专业绘画设备，适合素描、水彩等各类美术课程。',
      },
      {
        institution_id: createdData.institutionId,
        name: '钢琴教室',
        area: 40,
        capacity: 6,
        floor: '4F',
        facilities: ['三角钢琴', '立式钢琴', '隔音设备', '空调', '谱架'],
        status: 'available',
        description: '专业隔音的钢琴教室，配备一台三角钢琴和多台立式钢琴，适合钢琴课程教学。',
      },
      {
        institution_id: createdData.institutionId,
        name: '综合教室',
        area: 100,
        capacity: 20,
        floor: '2F',
        facilities: ['投影仪', '白板', '空调', '桌椅', '音响'],
        status: 'available',
        description: '多功能综合教室，适合理论课程和小组活动。',
      },
    ];

    for (const classroom of classrooms) {
      await sleep(100);
      const classroomId = await client.post<string>('/classroom', classroom);
      createdData.classroomIds.push(classroomId);
      logger.success(`教室 "${classroom.name}" 创建成功: ${classroomId}`);
    }
    } // end else (创建教室)

    // ==================== 6. 创建课程 ====================
    if (createdData.courseIds.length > 0) {
      logger.section('6. 创建课程 [已跳过 - 使用已有课程]');
      logger.info(`复用已有课程: ${createdData.courseIds.length} 门`);
    } else {
      logger.section('6. 创建课程');

    const courses = [
      {
        institution_id: createdData.institutionId,
        title: '少儿芭蕾舞启蒙班',
        subtitle: '专业舞蹈培训，启蒙艺术之美',
        category_code: 'dance',
        slider_imgs: [
          ImageUrls.random(1200, 600),
          ImageUrls.random(1200, 600),
          ImageUrls.random(1200, 600),
        ],
        tags: ['舞蹈', '少儿', '芭蕾', '形体'],
        description:
          '专为4-8岁儿童设计的芭蕾舞基础课程，包括基本功训练、形体训练、舞蹈组合练习等内容。通过系统的训练，帮助孩子建立优美的形体，培养艺术气质和自信心。',
        min_age: 4,
        max_age: 8,
        lesson_duration: 60,
        type: 'standard',
        skus: [
          {
            name: '体验课（1节）',
            total_lessons: 1,
            total_price: 68,
            cashback_type: 'fixed',
            cashback_value: 10,
          },
          {
            name: '月度课程包（8节）',
            total_lessons: 8,
            total_price: 480,
            cashback_type: 'fixed',
            cashback_value: 30,
          },
          {
            name: '季度课程包（24节）',
            total_lessons: 24,
            total_price: 1280,
            cashback_type: 'percentage',
            cashback_value: 5,
          },
        ],
        // 用于创建排课
        _teacherIndex: 0, // 对应李芳老师
        _classroomIndex: 0, // 对应舞蹈教室A
      },
      {
        institution_id: createdData.institutionId,
        title: '创意美术班',
        subtitle: '激发想象力，培养创造力',
        category_code: 'art_painting',
        slider_imgs: [ImageUrls.random(1200, 600), ImageUrls.random(1200, 600)],
        tags: ['美术', '绘画', '创意', '少儿'],
        description:
          '针对5-10岁儿童设计的创意美术课程，通过多种绘画技法和创意活动，激发孩子的想象力和创造力。课程内容包括线描、水彩、创意手工等多种形式。',
        min_age: 5,
        max_age: 10,
        lesson_duration: 90,
        type: 'standard',
        skus: [
          {
            name: '体验课（1节）',
            total_lessons: 1,
            total_price: 58,
            cashback_type: 'fixed',
            cashback_value: 8,
          },
          {
            name: '12节课程包',
            total_lessons: 12,
            total_price: 580,
            cashback_type: 'percentage',
            cashback_value: 3,
          },
        ],
        _teacherIndex: 1, // 对应王明老师
        _classroomIndex: 1, // 对应绘画教室
      },
      {
        institution_id: createdData.institutionId,
        title: '钢琴启蒙班',
        subtitle: '音乐启蒙，从这里开始',
        category_code: 'music',
        slider_imgs: [ImageUrls.random(1200, 600)],
        tags: ['钢琴', '音乐', '启蒙', '少儿'],
        description:
          '专为4-8岁儿童设计的钢琴启蒙课程，采用趣味教学法，让孩子在快乐中学习音乐，掌握钢琴基本技能。课程包括乐理知识、指法训练和简单曲目演奏。',
        min_age: 4,
        max_age: 8,
        lesson_duration: 45,
        type: 'standard',
        skus: [
          {
            name: '体验课（1节）',
            total_lessons: 1,
            total_price: 88,
            cashback_type: 'fixed',
            cashback_value: 15,
          },
          {
            name: '月度课程包（4节）',
            total_lessons: 4,
            total_price: 320,
            cashback_type: 'fixed',
            cashback_value: 20,
          },
          {
            name: '季度课程包（12节）',
            total_lessons: 12,
            total_price: 880,
            cashback_type: 'percentage',
            cashback_value: 5,
          },
        ],
        _teacherIndex: 2, // 对应陈雨老师
        _classroomIndex: 2, // 对应钢琴教室
      },
      {
        institution_id: createdData.institutionId,
        title: '中国舞基础班',
        subtitle: '传承经典，舞动青春',
        category_code: 'dance',
        slider_imgs: [ImageUrls.random(1200, 600), ImageUrls.random(1200, 600)],
        tags: ['中国舞', '民族舞', '少儿', '形体'],
        description:
          '专为6-12岁儿童设计的中国舞基础课程，包括基本功训练、民族民间舞元素学习、成品舞蹈排练等。通过学习传统舞蹈，培养孩子对中国文化的热爱。',
        min_age: 6,
        max_age: 12,
        lesson_duration: 75,
        type: 'standard',
        skus: [
          {
            name: '体验课（1节）',
            total_lessons: 1,
            total_price: 78,
            cashback_type: 'fixed',
            cashback_value: 10,
          },
          {
            name: '季度课程包（24节）',
            total_lessons: 24,
            total_price: 1680,
            cashback_type: 'percentage',
            cashback_value: 5,
          },
        ],
        _teacherIndex: 0, // 对应李芳老师
        _classroomIndex: 0, // 对应舞蹈教室A
      },
    ];

    for (const course of courses) {
      await sleep(200);
      const { _teacherIndex, _classroomIndex, ...courseData } = course;
      const courseId = await client.post<string>('/courses', courseData);
      createdData.courseIds.push(courseId);
      logger.success(`课程 "${course.title}" 创建成功: ${courseId}`);

      // 为每个课程创建排课
      const teacherId = createdData.teacherIds[_teacherIndex];
      const classroomId = createdData.classroomIds[_classroomIndex];

      // 根据课程索引使用不同的时间段，避免同一教师/教室冲突
      const courseIndex = createdData.courseIds.length - 1;
      const baseHourOffset = courseIndex * 3; // 每个课程错开3小时
      
      // 创建未来一周的排课（每周2次）
      const scheduleTemplates = [
        { dayOffset: 1, hour: 9 + baseHourOffset }, // 明天
        { dayOffset: 3, hour: 9 + baseHourOffset }, // 3天后
        { dayOffset: 5, hour: 9 + baseHourOffset }, // 5天后
        { dayOffset: 7, hour: 9 + baseHourOffset }, // 7天后
      ];

      for (const template of scheduleTemplates) {
        await sleep(100);
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + template.dayOffset);
        startTime.setHours(template.hour, 0, 0, 0);
        
        const endTime = new Date(
          startTime.getTime() + course.lesson_duration * 60000,
        );

        const dayOfWeek = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ][startTime.getDay()];

        const scheduleData = {
          course_id: courseId,
          teacher_id: teacherId,
          classroom_id: classroomId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          day_of_week: dayOfWeek,
          max_students: 15,
        };

        try {
          const scheduleId = await client.post<string>('/schedule', scheduleData);
          createdData.scheduleIds.push(scheduleId);
          logger.info(
            `  排课创建: ${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString()} (${scheduleId})`,
          );
        } catch (error: any) {
          logger.error(`  排课创建失败: ${error.message}`);
        }
      }

      // 上架课程
      try {
        await client.put(`/courses/${courseId}/online`);
        logger.success(`  课程已上架`);
      } catch (error: any) {
        logger.error(`  课程上架失败: ${error.message}`);
      }
    }

    // 获取第一个课程的 SKU ID（供后续订单流程使用）
    if (!createdData.skuId) {
      try {
        await sleep(200);
        const firstCourseDetail = await client.get<any>(`/courses/${createdData.courseIds[0]}`);
        if (firstCourseDetail.skus && firstCourseDetail.skus.length > 0) {
          createdData.skuId = firstCourseDetail.skus[0].id;
          logger.info(`获取到课程 SKU ID: ${createdData.skuId}`);
        }
      } catch (error: any) {
        logger.error(`获取课程 SKU 失败: ${error.message}`);
      }
    }
    } // end else (创建课程)

    // ==================== 7. 验证教师登录 ====================
    logger.section('7. 验证教师登录');

    try {
      const teacherMockCode = `phone_${CONFIG.TEACHER_PHONE}_${Date.now()}`;
      const teacherLoginResult = await client.post<{ token: string }>(
        '/auth/phone-login',
        {
          code: teacherMockCode,
          type: 'teacher',
        },
      );
      logger.success(`教师登录成功！Token已获取`);
      logger.info(`教师手机号: ${CONFIG.TEACHER_PHONE}`);
    } catch (error: any) {
      logger.error(`教师登录验证失败: ${error.message}`);
    }

    await sleep(300);

    // ==================== 8. 家长用户登录 ====================
    logger.section('8. 家长用户登录');

    const parentClient = new ApiClient();
    try {
      const parentLoginResult = await parentClient.post<{ token: string }>(
        '/auth/parent-phone-login',
        {
          phone: CONFIG.PARENT_PHONE,
        },
      );
      parentClient.setToken(parentLoginResult.token);
      createdData.parentToken = parentLoginResult.token;
      logger.success(`家长登录成功！手机号: ${CONFIG.PARENT_PHONE}`);
    } catch (error: any) {
      logger.error(`家长登录失败: ${error.message}`);
    }

    await sleep(300);

    // ==================== 9. 添加宝贝 ====================
    logger.section('9. 添加宝贝');

    try {
      const childId = await parentClient.post<string>('/child', {
        name: '小明',
        gender: 'male',
        age: 6,
        birthday: '2018-03-15',
      });
      createdData.childId = childId;
      logger.success(`宝贝添加成功: ${childId}`);
    } catch (error: any) {
      logger.error(`添加宝贝失败: ${error.message}`);
    }

    await sleep(200);

    // ==================== 10. 收藏课程 ====================
    logger.section('10. 收藏课程');

    try {
      await parentClient.post('/favorite/toggle', {
        target_type: 'course',
        target_id: createdData.courseIds[0],
      });
      logger.success(`收藏课程成功: ${createdData.courseIds[0]}`);
    } catch (error: any) {
      logger.error(`收藏课程失败: ${error.message}`);
    }

    await sleep(200);

    // ==================== 11. 获取课程SKU并创建预约 ====================
    logger.section('11. 创建试听预约');

    // 获取第一个课程的 SKU ID
    try {
      const firstCourseDetail = await client.get<any>(`/courses/${createdData.courseIds[0]}`);
      if (firstCourseDetail.skus && firstCourseDetail.skus.length > 0) {
        createdData.skuId = firstCourseDetail.skus[0].id;
        logger.info(`课程第一个 SKU ID: ${createdData.skuId}`);
      } else {
        logger.error('课程没有 SKU，跳过预约和订单流程');
      }
    } catch (error: any) {
      logger.error(`获取课程详情失败: ${error.message}`);
    }

    // 使用第一个排课作为预约时段
    const firstScheduleId = createdData.scheduleIds[0];

    if (createdData.childId && firstScheduleId) {
      try {
        const bookingId = await parentClient.post<string>('/booking', {
          course_id: createdData.courseIds[0],
          schedule_id: firstScheduleId,
          child_id: createdData.childId,
          student_name: '小明',
          student_age: 6,
          student_phone: CONFIG.PARENT_PHONE,
        });
        createdData.bookingId = bookingId;
        logger.success(`试听预约创建成功: ${bookingId}`);
      } catch (error: any) {
        logger.error(`创建预约失败: ${error.message}`);
      }
    } else {
      logger.info('缺少宝贝ID或排课ID，跳过预约创建');
    }

    await sleep(300);

    // ==================== 12. 机构确认预约 ====================
    logger.section('12. 机构确认预约');

    if (createdData.bookingId) {
      try {
        await client.put(`/booking/${createdData.bookingId}/confirm`);
        logger.success('预约已由机构确认');
      } catch (error: any) {
        logger.error(`确认预约失败: ${error.message}`);
      }
    } else {
      logger.info('无预约ID，跳过确认预约');
    }

    await sleep(200);

    // ==================== 13. 创建订单（线下支付）====================
    logger.section('13. 创建订单');

    if (createdData.skuId && createdData.childId && firstScheduleId) {
      try {
        const orderId = await parentClient.post<string>('/order', {
          course_id: createdData.courseIds[0],
          sku_id: createdData.skuId,
          student_name: '小明',
          child_id: createdData.childId,
          schedule_ids: [firstScheduleId],
          payment_method: 'offline',
        });
        createdData.orderId = orderId;
        logger.success(`订单创建成功: ${orderId}`);
      } catch (error: any) {
        logger.error(`创建订单失败: ${error.message}`);
      }
    } else {
      logger.info('缺少必要信息（SKU/宝贝/排课），跳过订单创建');
    }

    await sleep(300);

    // ==================== 14. 机构确认线下支付 ====================
    logger.section('14. 机构确认线下支付');

    if (createdData.orderId) {
      try {
        await client.put(`/order/${createdData.orderId}/confirm-payment`);
        logger.success('线下支付已确认，订单状态: confirmed');
      } catch (error: any) {
        logger.error(`确认支付失败: ${error.message}`);
      }
    } else {
      logger.info('无订单ID，跳过支付确认');
    }

    await sleep(200);

    // ==================== 15. 上课签到 ====================
    logger.section('15. 上课签到');

    if (createdData.orderId && createdData.bookingId) {
      try {
        await parentClient.post('/check-in', {
          order_id: createdData.orderId,
          booking_id: createdData.bookingId,
        });
        logger.success('签到成功，已扣减一节课时');
      } catch (error: any) {
        logger.error(`签到失败: ${error.message}`);
      }
    } else {
      logger.info('无订单ID或预约ID，跳过签到');
    }

    await sleep(200);

    // ==================== 16. 完成订单 ====================
    logger.section('16. 完成订单');

    if (createdData.orderId) {
      try {
        await client.put(`/order/${createdData.orderId}/complete`);
        logger.success('订单已标记为完成');
      } catch (error: any) {
        logger.info(`完成订单提示: ${error.message}（可能课时未全部完成，属正常现象）`);
      }
    }

    await sleep(200);

    // ==================== 17. 家长发表评价 ====================
    logger.section('17. 发表评价');

    if (createdData.orderId) {
      try {
        const reviewResult = await parentClient.post<{ id: string }>('/review', {
          course_id: createdData.courseIds[0],
          order_id: createdData.orderId,
          rating: 5,
          content: '课程质量非常好！老师很专业，教学方法生动有趣，孩子每次都很期待上课。形体和气质都有明显改善，强烈推荐！',
          images: [ImageUrls.random(800, 600)],
        });
        createdData.reviewId = reviewResult.id;
        logger.success(`评价发表成功: ${reviewResult.id}`);
      } catch (error: any) {
        logger.error(`发表评价失败: ${error.message}`);
      }
    } else {
      logger.info('无订单ID，跳过评价');
    }

    await sleep(200);

    // ==================== 18. 机构回复评价 ====================
    logger.section('18. 机构回复评价');

    if (createdData.reviewId) {
      try {
        await client.put(`/review/${createdData.reviewId}/reply`, {
          reply: '感谢您的认可！很高兴小朋友喜欢我们的课程。我们会继续努力提供高质量的教学服务，期待下次课程继续陪伴孩子成长！',
        });
        logger.success('评价回复成功');
      } catch (error: any) {
        logger.error(`回复评价失败: ${error.message}`);
      }
    }

    await sleep(200);

    // ==================== 19. 管理员创建 Banner ====================
    logger.section('19. 创建 Banner');

    try {
      const bannerId = await adminClient.post<string>('/banner', {
        title: '艺术启蒙，从这里开始',
        image: ImageUrls.random(1200, 600),
        link_type: 'none',
        sort: 1,
        status: 'active',
      });
      createdData.bannerId = bannerId;
      logger.success(`Banner 创建成功: ${bannerId}`);
    } catch (error: any) {
      logger.error(`创建 Banner 失败: ${error.message}`);
    }

    await sleep(200);

    // ==================== 20. 管理员发布公告 ====================
    logger.section('20. 发布系统公告');

    try {
      const announcementId = await adminClient.post<string>('/announcement', {
        title: '平台正式上线公告',
        content: '欢迎使用兴趣班平台！我们汇聚了众多优质培训机构，为孩子的成长提供专业支持。目前已有芭蕾舞、绘画、钢琴等多种课程可供预约，欢迎体验！如有问题请联系客服。',
        type: 'system',
        status: 'active',
        priority: 1,
      });
      createdData.announcementId = announcementId;
      logger.success(`公告发布成功: ${announcementId}`);
    } catch (error: any) {
      logger.error(`发布公告失败: ${error.message}`);
    }

    await sleep(200);

    // ==================== 21. 家长提交反馈 ====================
    logger.section('21. 提交用户反馈');

    if (createdData.parentToken) {
      try {
        await parentClient.post<string>('/feedback', {
          content: '课程体验很棒！建议增加家长观摩日活动，让家长也能看到孩子的成长。另外希望可以提供录像回放服务，方便孩子课后复习。',
          type: 'suggestion',
          contact: CONFIG.PARENT_PHONE,
        });
        logger.success('反馈提交成功');
      } catch (error: any) {
        logger.error(`提交反馈失败: ${error.message}`);
      }
    }

    await sleep(200);

    // ==================== 22. 输出汇总 ====================
    logger.section('数据创建完成');

    console.log('\n📋 创建数据汇总:');
    console.log('─'.repeat(60));
    console.log(`🏢 机构ID:      ${createdData.institutionId}`);
    console.log(`📱 Owner手机号: ${CONFIG.OWNER_PHONE}`);
    console.log(`👨‍🏫 教师数量:    ${createdData.teacherIds.length}`);
    console.log(`🏫 教室数量:    ${createdData.classroomIds.length}`);
    console.log(`📚 课程数量:    ${createdData.courseIds.length}`);
    console.log(`📅 排课数量:    ${createdData.scheduleIds.length}`);
    console.log('─'.repeat(60));
    console.log(`👨‍👩‍👦 家长手机号:  ${CONFIG.PARENT_PHONE}`);
    console.log(`🧒 宝贝ID:      ${createdData.childId || '未创建'}`);
    console.log(`📌 预约ID:      ${createdData.bookingId || '未创建'}`);
    console.log(`🧾 订单ID:      ${createdData.orderId || '未创建'}`);
    console.log(`⭐ 评价ID:      ${createdData.reviewId || '未创建'}`);
    console.log('─'.repeat(60));
    console.log(`🖼️  Banner ID:  ${createdData.bannerId || '未创建'}`);
    console.log(`📢 公告ID:      ${createdData.announcementId || '未创建'}`);
    console.log('─'.repeat(60));

    console.log('\n📝 详细ID列表:');
    console.log(`教师IDs:  ${createdData.teacherIds.join(', ')}`);
    console.log(`教室IDs:  ${createdData.classroomIds.join(', ')}`);
    console.log(`课程IDs:  ${createdData.courseIds.join(', ')}`);

    console.log('\n✅ 演示数据创建成功！完整业务流程已模拟：');
    console.log('  1️⃣  机构入驻 → 2️⃣  管理员审核 → 3️⃣  创建教师/教室/课程');
    console.log('  4️⃣  家长登录 → 5️⃣  添加宝贝 → 6️⃣  收藏课程');
    console.log('  7️⃣  创建预约 → 8️⃣  机构确认 → 9️⃣  下单付款');
    console.log('  🔟  机构收款 → 1️⃣1️⃣ 上课签到 → 1️⃣2️⃣ 发表评价');
    console.log('  1️⃣3️⃣ 机构回复 → 1️⃣4️⃣ 发布Banner/公告 → 1️⃣5️⃣ 用户反馈\n');

    console.log(`💡 登录提示:`);
    console.log(`  🏢 机构登录: 手机号 ${CONFIG.OWNER_PHONE}，code 传 phone_${CONFIG.OWNER_PHONE}_xxx`);
    console.log(`  👩‍🏫 教师登录: 手机号 ${CONFIG.TEACHER_PHONE}，code 传 phone_${CONFIG.TEACHER_PHONE}_xxx，type=teacher`);
    console.log(`  👨‍👩‍👦 家长登录: 手机号 ${CONFIG.PARENT_PHONE}，密码 66666666`);

    return createdData;
  } catch (error: any) {
    logger.error(`创建失败: ${error.message}`);
    if (error.response?.data) {
      logger.data('错误详情', error.response.data);
    }
    throw error;
  }
}

// 执行脚本
createDemoData()
  .then(() => {
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
