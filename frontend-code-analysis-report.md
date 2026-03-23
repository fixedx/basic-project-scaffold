# 稚小苗兴趣班项目 - 前端代码分析报告

> 分析时间：2026-03-21
> 分析范围：`/workspace/projects/workspace/interest-class/interest-class-web/src/`
> 分支：feature/api-contracts

---

## 一、项目概览

### 1.1 技术栈
- **框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **UI库**: wot-design-uni (uni-app 组件库)
- **小程序**: 微信小程序 (uni-app 跨端)
- **状态管理**: 简单 reactive 对象 (非 Pinia/Vuex)
- **HTTP**: 封装 uni.request
- **日期处理**: dayjs

### 1.2 项目结构
```
src/
├── api/              # API 接口定义
├── components/       # 公共组件
├── composables/      # 组合式函数
├── pages/            # 页面
│   ├── index/        # 首页
│   ├── mine/         # 个人中心
│   ├── institution/  # 机构端
│   ├── teacher/      # 教师端
│   └── admin/        # 管理员端
├── stores/           # 状态管理
├── utils/            # 工具函数
├── App.vue           # 应用入口
└── pages.json        # 页面配置
```

### 1.3 多端角色
项目支持 **4种用户角色**，使用同一套代码通过路由区分：

| 角色 | 入口页面 | 特点 |
|------|----------|------|
| 家长端 | `pages/index/index` | 底部 Tab 导航，浏览课程、下单 |
| 机构端 | `pages/institution/center/index` | 机构管理后台，课程/订单/教师管理 |
| 教师端 | `pages/teacher/center/index` | 教师工作台，考勤/学员管理 |
| 管理员端 | `pages/admin/center/index` | 平台运营后台 |

---

## 二、家长端功能分析

### 2.1 页面清单（19个页面）

| 页面 | 路径 | 功能说明 |
|------|------|----------|
| 首页 | `pages/index/index` | Banner、分类导航、推荐机构和课程 |
| 课程列表 | `pages/course-list/index` | 筛选、排序、搜索课程 |
| 课程详情 | `pages/course-detail/index` | 课程信息、SKU选择、教师、评价 |
| 预约报名 | `pages/booking-form/index` | 选择宝贝、排课、使用邀请码 |
| 我的订单 | `pages/my-orders/index` | 订单列表、状态筛选 |
| 订单详情 | `pages/order-detail/index` | 订单详情、支付、退款、评价 |
| 订单支付 | `pages/order-pay/index` | 微信支付 |
| 我的预约 | `pages/my-bookings/index` | 预约列表、取消预约 |
| 宝贝管理 | `pages/child-list/index` | 添加/编辑宝贝信息 |
| 我的钱包 | `pages/mine/wallet/index` | 邀友返现余额、提现 |
| 邀请有礼 | `pages/mine/invite/index` | 邀请码、分享、收益统计 |
| 课表 | `pages/schedule/index` | 查看已预约的课程时间表 |
| 签到 | `pages/check-in-tab/index` | 扫码签到、签到记录 |
| 机构列表 | `pages/institution-list/index` | 查看附近机构 |
| 机构详情 | `pages/institution-detail/index` | 机构信息、课程列表 |
| 教师详情 | `pages/teacher-detail/index` | 教师信息 |
| 收藏 | `pages/my-favorites/index` | 收藏的课程 |
| 帮助中心 | `pages/help-center/index` | FAQ、使用帮助 |
| 设置 | `pages/settings/index` | 个人信息、登录管理 |

### 2.2 核心业务逻辑

#### 2.2.1 邀友返现系统
- **邀请码机制**: 每个用户有唯一邀请码，可设置让利比例 (0-100%)
- **立减优惠**: 被邀请人使用邀请码下单可立减
- **返现解锁**: 邀请人按被邀请人完课进度解锁返现
- **余额使用**: 余额可用于抵扣订单金额

#### 2.2.2 订单流程
```
创建订单 → 待支付 → 待确认 → 已确认 → 已完成
            ↓         ↓
         已取消    退款中 → 已退款
```

- **体验课**: 全额线上支付
- **正式课**: 线上支付定金 + 线下支付尾款

#### 2.2.3 预约与排课
- 下单时选择排课时段
- 支持课前24小时以上自主修改时段
- 课前24小时内修改需机构审核

---

## 三、机构端功能分析

### 3.1 页面清单（15个页面）

| 页面 | 路径 | 功能说明 |
|------|------|----------|
| 机构中心 | `pages/institution/center/index` | 数据看板、待处理事项 |
| 机构登录 | `pages/institution/login/index` | 微信手机号一键登录 |
| 机构入驻 | `pages/institution/settle/index` | 提交资质、等待审核 |
| 签约协议 | `pages/institution/contract/index` | 上传签约凭证 |
| 机构信息 | `pages/institution/profile/index` | 编辑机构资料 |
| 课程管理 | `pages/institution/courses/index` | 课程列表、上架/下架 |
| 课程编辑 | `pages/institution/course-edit/index` | 创建/编辑课程 |
| 订单管理 | `pages/institution/orders/index` | 订单列表、确认订单 |
| 订单详情 | `pages/institution/order-detail/index` | 订单详情、处理退款 |
| 预约管理 | `pages/institution/booking-list/index` | 预约审核、确认/拒绝 |
| 教师管理 | `pages/institution/teacher-list/index` | 教师列表、添加教师 |
| 教师编辑 | `pages/institution/teacher-edit/index` | 编辑教师信息 |
| 教室管理 | `pages/institution/classroom-list/index` | 教室列表 |
| 排课管理 | `pages/institution/schedule-list/index` | 排课列表、批量排课 |
| 学员管理 | `pages/institution/student-list/index` | 学员列表、进度查看 |

### 3.2 核心业务逻辑

#### 3.2.1 入驻流程
```
提交入驻资料 → 资质审核 → 签约审核 → 正式上线
      ↓              ↓           ↓
   草稿/拒绝     待审核/拒绝   签约材料审核
```

#### 3.2.2 订单确认流程
- 家长下单 → 机构确认 → 家长支付 → 课程开始
- 支持线下收款后确认

#### 3.2.3 数据看板
- 营收统计（今日/本月/总计）
- 待处理事项（待确认订单、退款、预约审核）
- 数据概览（课程数、学员数、订单数、完课率）

---

## 四、教师端功能分析

### 4.1 页面清单（7个页面）

| 页面 | 路径 | 功能说明 |
|------|------|----------|
| 教师中心 | `pages/teacher/center/index` | 个人中心入口 |
| 教师登录 | `pages/teacher/login/index` | 微信手机号登录 |
| 教师课表 | `pages/teacher/schedule/index` | 查看授课时间表 |
| 考勤管理 | `pages/teacher/attendance/index` | 课程考勤列表 |
| 考勤详情 | `pages/teacher/attendance-detail/index` | 签到/补签 |
| 授课课程 | `pages/teacher/courses/index` | 我的课程列表 |
| 我的学员 | `pages/teacher/students/index` | 学员列表 |

### 4.2 核心业务逻辑

- **考勤管理**: 按课程维度查看考勤，支持签到和补签
- **学员管理**: 查看所教课程的学员列表

---

## 五、管理员端功能分析

### 5.1 页面清单（13个页面）

| 页面 | 路径 | 功能说明 |
|------|------|----------|
| 管理中心 | `pages/admin/center/index` | 平台数据看板 |
| 管理员登录 | `pages/admin/login/index` | 账号密码登录 |
| 机构管理 | `pages/admin/institutions/index` | 机构列表、详情 |
| 审核中心 | `pages/admin/reviews/index` | 资质审核、签约审核 |
| 订单管理 | `pages/admin/orders/index` | 全平台订单 |
| 用户管理 | `pages/admin/users/index` | 用户列表 |
| 横幅管理 | `pages/admin/banners/index` | 首页Banner管理 |
| 公告管理 | `pages/admin/announcements/index` | 系统公告 |
| 反馈管理 | `pages/admin/feedback-list/index` | 用户反馈处理 |
| 财务结算 | `pages/admin/finance/index` | 平台佣金统计 |

### 5.2 核心业务逻辑

- **机构审核**: 资质审核、签约材料审核
- **佣金管理**: 设置机构佣金比例、查看平台佣金收入
- **数据看板**: 全平台数据统计（机构/用户/订单/课程/佣金）

---

## 六、组件结构分析

### 6.1 公共组件（18个）

| 组件 | 路径 | 功能 |
|------|------|------|
| AsyncImage | `components/AsyncImage/index.vue` | 异步图片加载，带占位图 |
| BookingCard | `components/BookingCard/index.vue` | 预约卡片 |
| CourseCard | `components/CourseCard/index.vue` | 课程卡片（家长/机构双模式）|
| CustomTabbar | `components/CustomTabbar/index.vue` | 自定义底部导航 |
| EmptyState | `components/EmptyState/index.vue` | 空状态占位 |
| EnumsTag | `components/EnumsTag/index.vue` | 枚举标签展示 |
| FeedbackDialog | `components/FeedbackDialog/index.vue` | 意见反馈弹窗 |
| FileUpload | `components/FileUpload/index.vue` | 文件上传 |
| InstitutionCard | `components/InstitutionCard/index.vue` | 机构卡片 |
| InstitutionShowcase | `components/InstitutionShowcase/index.vue` | 机构展示 |
| Loading | `components/Loading/index.vue` | 加载动画 |
| LogoutButton | `components/LogoutButton/index.vue` | 退出登录按钮 |
| OrderCard | `components/OrderCard/index.vue` | 订单卡片 |
| OrderDetail | `components/OrderDetail/index.vue` | 订单详情 |
| PageFooter | `components/PageFooter/index.vue` | 底部操作栏 |
| RefundDialog | `components/RefundDialog/index.vue` | 退款申请弹窗 |
| StatusTabs | `components/StatusTabs/index.vue` | 状态筛选标签 |

### 6.2 业务组件（5个）

| 组件 | 路径 | 父页面 |
|------|------|--------|
| ChildSelector | `pages/booking-form/components/ChildSelector.vue` | booking-form |
| CourseInfoCard | `pages/booking-form/components/CourseInfoCard.vue` | booking-form |
| DiscountSection | `pages/booking-form/components/DiscountSection.vue` | booking-form |
| FeeDetail | `pages/booking-form/components/FeeDetail.vue` | booking-form |
| ScheduleSelector | `pages/booking-form/components/ScheduleSelector.vue` | booking-form |

---

## 七、Composables 分析

| Composable | 路径 | 功能 |
|------------|------|------|
| useAuthGuard | `composables/useAuthGuard.ts` | 登录状态守卫，自动跳转登录 |
| useBookingForm | `composables/useBookingForm.ts` | 预约报名表单逻辑 |
| useEnums | `composables/useEnums.ts` | 枚举数据管理 |
| useScheduleEndDate | `composables/useScheduleEndDate.ts` | 排课结束日期计算 |

---

## 八、API 模块分析

### 8.1 API 文件列表（19个）

| API | 功能范围 |
|-----|----------|
| auth.ts | 登录、用户信息 |
| booking.ts | 预约管理 |
| check-in.ts | 签到记录 |
| child.ts | 宝贝管理 |
| course.ts | 课程管理 |
| favorite.ts | 收藏 |
| feedback.ts | 意见反馈 |
| home.ts | 首页数据 |
| institution.ts | 机构管理 |
| invite.ts | 邀友返现 |
| order.ts | 订单管理 |
| payment.ts | 支付 |
| review.ts | 评价 |
| schedule.ts | 排课管理 |
| teacher.ts | 教师管理 |
| admin.ts | 管理员接口 |
| banner.ts | Banner管理 |
| announcement.ts | 公告 |
| enum.ts | 枚举数据 |

### 8.2 请求封装特点
- 统一的错误处理 (401跳转登录)
- 支持显示/隐藏 loading
- 支持文件上传 (H5/小程序兼容)
- Token 自动注入
- 环境判断 (开发/体验/正式)

---

## 九、发现的潜在问题

### 9.1 代码规范问题

#### P1: 递归调用风险
**文件**: `pages/course-detail/index.vue`
**问题**: 
```typescript
const goToInvite = () => {
  goToInvite()  // 无限递归！
}
```
**建议**: 修改为 `uni.navigateTo({ url: '/pages/mine/invite/index' })`

#### P2: 类型定义不一致
**文件**: `api/order.ts`
**问题**: `Order` 接口中 `status` 字段的类型定义和实际使用可能不一致，缺少部分状态值如 `refund_rejected`
**建议**: 统一状态枚举，确保前后端一致

### 9.2 业务逻辑问题

#### P3: 金额计算逻辑分散
**问题**: 前端多处有金额计算逻辑（course-detail、booking-form 等），虽然主要计算在服务端，但展示逻辑分散
**建议**: 统一金额格式化函数，已在 `useBookingForm` 中有 `formatPrice`，建议全局使用

#### P4: 缺少防抖处理
**文件**: `pages/course-list/index.vue`
**问题**: 筛选条件变化时立即触发请求，快速切换时可能造成多次请求
**建议**: 添加防抖处理

### 9.3 性能问题

#### P5: 图片加载未优化
**问题**: 课程列表、Banner 等使用 AsyncImage，但未看到懒加载配置
**建议**: 长列表图片添加懒加载

#### P6: 数据缓存不足
**问题**: 枚举数据有缓存，但课程详情、机构信息等没有本地缓存
**建议**: 考虑添加页面级数据缓存

### 9.4 用户体验问题

#### P7: 错误提示不够友好
**文件**: `utils/request.ts`
**问题**: 网络错误统一提示"网络请求失败"，缺少具体错误信息
**建议**: 根据错误码展示更友好的提示

#### P8: 表单验证分散
**问题**: 各页面表单验证逻辑分散，缺少统一验证工具
**建议**: 考虑引入表单验证库或统一封装

### 9.5 安全问题

#### P9: 敏感信息打印
**文件**: `App.vue`
**问题**: 
```typescript
console.log('Token:', token ? '存在' : '无');
console.log('UserType:', userType);
```
**建议**: 生产环境移除敏感信息日志

### 9.6 兼容性问题

#### P10: H5 兼容性
**问题**: 多处使用 `#ifdef MP-WEIXIN` 条件编译，H5 支持可能不完善
**建议**: 检查 H5 场景的功能完整性

---

## 十、亮点总结

### 10.1 架构设计亮点
1. **多端共用一套代码**: 通过路由和角色区分，减少维护成本
2. **Composition API 规范**: 逻辑清晰，复用性强
3. **API 契约先行**: 接口定义清晰，前后端协作顺畅

### 10.2 业务功能亮点
1. **邀友返现系统完整**: 邀请码、立减、返现解锁、提现全链路
2. **签到系统**: 支持定位和补签
3. **分端数据看板**: 各端都有完善的数据统计

### 10.3 代码质量亮点
1. **类型定义完善**: TypeScript 类型覆盖度高
2. **组件化程度高**: 公共组件复用性强
3. **工具函数封装**: toast、request 等工具函数封装完善

---

## 十一、建议改进项

### 11.1 短期优化
1. 修复 `course-detail/index.vue` 中的递归调用 Bug
2. 统一金额格式化，避免精度问题
3. 添加列表页的防抖处理

### 11.2 中期优化
1. 引入表单验证库 (如 vee-validate)
2. 添加图片懒加载
3. 优化错误提示体验

### 11.3 长期优化
1. 考虑引入 Pinia 替代简单 reactive
2. 添加单元测试
3. 完善 H5 端功能支持

---

*报告生成完毕*
