# 测试目录结构说明

> 更新时间：2026-01-18  
> 测试文件总数：13 个

## 📁 目录结构

```
tests/
├── run-all-tests.ts            # 🎯 统一测试运行器（推荐）
├── run-business-flow.ts        # 🔄 完整业务流程测试（推荐）
├── run-all-crud.ts             # 旧版测试运行器（保留）
├── *.test.ts                   # 模块测试文件（13个）
├── test-password-encryption.ts # 密码加密测试
├── TEST_COVERAGE.md            # 测试覆盖分析
├── README.md                   # 本文件
└── utils/                      # 测试工具
    ├── logger.ts              # 日志工具
    ├── test-client.ts         # HTTP测试客户端
    ├── test-data.ts           # 测试数据定义
    └── test-helpers/          # 测试辅助方法
        ├── index.ts           # 导出入口
        ├── classroom.helper.ts
        ├── course.helper.ts
        ├── institution.helper.ts
        ├── schedule.helper.ts
        └── teacher.helper.ts
```

## 📋 测试文件列表

### 已实现的完整测试

| 文件名 | 测试模块 | 测试用例数 | 状态 |
|--------|---------|-----------|------|
| `enum.test.ts` | 枚举管理 | 6 | ✅ 通过 |
| `oss.test.ts` | 文件上传 | 7 | ✅ 通过 |
| `auth.test.ts` | 认证授权 | 7 | ⚠️ 5/7 通过 |
| `institution.test.ts` | 机构管理 | 10+ | ✅ 通过 |
| `classroom.test.ts` | 教室管理 | 8 | ✅ 100% 通过 |
| `teacher.test.ts` | 教师管理 | 8 | ✅ 100% 通过 |
| `course.test.ts` | 课程管理 | 27 | ✅ 通过 |
| `schedule.test.ts` | 排课管理 | 10 | ✅ 100% 通过 |
| `banner.test.ts` | 轮播图管理 | 8+ | ✅ 通过 |
| `home.test.ts` | 首页聚合 | 5 | ✅ 通过 |
| `booking.test.ts` | 预约管理 | 10+ | ✅ 通过 |
| `order.test.ts` | 订单管理 | 12+ | ✅ 通过 |
| `review.test.ts` | 评价管理 | 10 | ✅ 通过 |

## 🚀 快速开始

### 1️⃣ 推荐方式：运行业务流程测试

模拟真实用户场景，一条数据走完整个流程：

```bash
npx tsx tests/run-business-flow.ts
```

**流程说明**：
```
🏢 机构入驻
    ↓
🏫 创建教室和教师
    ↓
📚 发布课程
    ↓
👨‍👩‍👧 家长浏览并预约
    ↓
💳 确认预约并支付
    ↓
⭐ 家长评价课程
```

### 2️⃣ 运行所有模块测试

按依赖顺序执行所有测试模块：

```bash
npx tsx tests/run-all-tests.ts
```

**模块执行顺序**：
```
基础设施 → 核心业务 → 前台业务 → 订单流程
 (枚举、OSS、认证) → (机构、教室、教师、课程、排课) 
   → (轮播图、首页) → (预约、订单、评价)
```

### 3️⃣ 运行单个模块测试

```bash
# 使用运行器
npx tsx tests/run-all-tests.ts --module=course

# 独立运行
npx tsx tests/course.test.ts
```

## 🎯 测试运行方式

### 运行单个模块测试

```bash
# 在 interest-class-server 目录下

# 运行教室测试
npx tsx tests/classroom.test.ts

# 运行教师测试
npx tsx tests/teacher.test.ts

# 运行课程测试
npx tsx tests/course.test.ts

# 运行评价测试
npx tsx tests/review.test.ts
```

### 运行所有测试

```bash
# 方式1: 运行业务流程测试（推荐）
npx tsx tests/run-business-flow.ts

# 方式2: 运行所有模块测试
npx tsx tests/run-all-tests.ts

# 方式3: 使用旧版运行器
npx tsx tests/run-all-crud.ts
```

## 🔧 高级用法

### 并行执行测试

```bash
npx tsx tests/run-all-tests.ts --parallel
```

### 详细日志模式

```bash
npx tsx tests/run-all-tests.ts --verbose
```

### 失败后继续执行

```bash
npx tsx tests/run-all-tests.ts --continue-on-error
```

### 失败重试

```bash
npx tsx tests/run-all-tests.ts --retry
```

## 📊 测试覆盖情况

| 模块类别 | 覆盖模块 | 状态 |
|---------|---------|------|
| 基础设施 | 枚举、OSS、认证 | ✅ |
| 核心业务 | 机构、教室、教师、课程、排课 | ✅ |
| 前台业务 | 轮播图、首页 | ✅ |
| 订单流程 | 预约、订单、评价 | ✅ |

## 🎨 测试数据生成

所有测试数据通过 `utils/test-data.ts` 统一生成，包括：

- **用户数据**：机构管理员、员工、微信用户
- **机构数据**：艺术类、体育类机构
- **资源数据**：教室、教师
- **课程数据**：舞蹈、绘画、篮球等
- **订单数据**：线上支付、线下支付
- **评价数据**：五星、四星、三星评价

## 📝 注意事项

1. **运行前确认**：确保后端服务运行在 `http://localhost:8888`
2. **数据库状态**：测试会创建真实数据，建议使用测试数据库
3. **Token管理**：测试使用真实用户ID生成token
4. **并发限制**：并行模式仅适用于无依赖的模块

## 🔄 测试数据共享

### 独立运行模式

每个测试文件独立创建测试数据：

```bash
npx tsx tests/review.test.ts  # 自动创建机构、课程、订单
```

### 流程测试模式

通过 `run-business-flow.ts` 共享数据：

```typescript
// 流程1: 创建机构
const institutionId = await createInstitution();

// 流程2: 使用该机构创建课程
const courseId = await createCourse(institutionId);

// 流程3: 用户预约该课程
const orderId = await bookCourse(courseId);

// 流程4: 用户评价
await reviewCourse(orderId);
```

# 运行位置搜索测试
pnpm ts-node tests/location-search.test.ts
```

## 📊 测试统计

**总体覆盖情况**：
- 模块总数：13 个
- 已测试模块：12 个
- 测试文件数：12 个
- 测试用例总数：约 100+
- 平均执行时间：2-3 秒/模块

**测试覆盖率**：约 92%

## ✅ 测试特点

### 1. 统一的测试模式
- 所有测试都遵循 `setup → tests → teardown` 结构
- 使用统一的 logger 输出格式
- 使用 TestHelper 封装 HTTP 请求

### 2. Helper 方法封装
- 每个模块都有对应的 helper 方法
- 提供原子性操作函数（create, get, update, delete 等）
- 便于测试复用和维护

### 3. 测试数据管理
- 使用 testData 对象存储测试过程中生成的数据
- 支持测试间的数据共享
- 自动清理测试数据

### 4. 分页兼容测试
- 所有列表接口都测试分页和不分页两种模式
- 验证返回格式的正确性
- 确保前端可以灵活选择使用方式

## 🔧 测试工具说明

### TestHelper
**位置**：`tests/utils/test-client.ts`

**主要方法**：
```typescript
const helper = new TestHelper(token);

// HTTP 请求
await helper.get('/api/endpoint');
await helper.post('/api/endpoint', data);
await helper.put('/api/endpoint', data);
await helper.delete('/api/endpoint');

// Token 生成
const token = generateUserToken(userId, openid, nickname);
```

### Logger
**位置**：`tests/utils/logger.ts`

**可用方法**：
```typescript
logger.info('信息');
logger.success('成功');
logger.error('错误');
logger.warn('警告');
logger.step('步骤标题');
logger.section('章节标题');
```

### Helper 方法
**位置**：`tests/utils/test-helpers/`

**使用示例**：
```typescript
import { createClassroom, getClassroom, updateClassroom, deleteClassroom } from './test-helpers';

const classroomId = await createClassroom(helper, {
  name: '音乐教室',
  capacity: 20,
});

const classroom = await getClassroom(helper, classroomId);
```

## 📝 测试规范

### 测试文件命名
- 格式：`{module}.test.ts`
- 示例：`classroom.test.ts`, `teacher.test.ts`

### 测试函数命名
- 格式：`test{Action}{Module}`
- 示例：`testCreateClassroom()`, `testGetTeacherList()`

### 测试用例组织
```typescript
async function testCreateXxx() {
  logger.info('测试创建...');
  // 测试逻辑
  logger.success('✓ 创建测试通过');
}

async function runCRUDTests() {
  const tests = [
    { name: '创建', fn: testCreateXxx },
    { name: '查询', fn: testGetXxx },
    // ...
  ];
  
  for (const test of tests) {
    try {
      logger.step(`▸ ${test.name}`);
      await test.fn();
      successCount++;
    } catch (error) {
      logger.error(`✗ ${test.name}失败: ${error.message}`);
      failCount++;
    }
  }
}
```

## 🐛 测试注意事项

### 1. Token 使用
- 家长用户使用 `generateUserToken()`
- 机构管理员需要从数据库获取真实 token
- 每个测试应该使用正确的权限 token

### 2. 测试顺序
- 机构测试必须最先运行（其他测试依赖机构 token）
- 依赖关系：Institution → Classroom/Teacher/Course → Schedule → Booking → Order → Review

### 3. 数据清理
- 测试使用软删除，不会真正删除数据
- 可以通过 SQL 清理测试数据：`DELETE FROM table WHERE created_by LIKE 'test_%'`

### 4. 环境变量
- 确保 `.env` 配置正确
- 数据库连接信息
- OSS 配置（可选）
- JWT Secret

## 🚀 后续改进计划

### 短期（本周）
- [ ] 修复 auth.test.ts 中的2个失败用例
- [ ] 完善 oss.test.ts 的测试覆盖
- [ ] 添加 enum.test.ts
- [ ] 添加 home.test.ts

### 中期（本月）
- [ ] 增加并发测试
- [ ] 增加性能测试
- [ ] 增加错误边界测试
- [ ] 提高测试覆盖率到 95%+

### 长期
- [ ] 集成 CI/CD 自动化测试
- [ ] 添加压力测试
- [ ] 添加安全性测试
- [ ] 生成测试报告

## 📚 相关文档

- [TEST_COVERAGE.md](./TEST_COVERAGE.md) - 测试覆盖分析
- [AGENTS.md](../AGENTS.md) - 开发规范
- [PROJECT_FEATURES.md](../PROJECT_FEATURES.md) - 项目功能清单

---

**最后更新**：2026-01-08  
**维护者**：Interest Class Team
