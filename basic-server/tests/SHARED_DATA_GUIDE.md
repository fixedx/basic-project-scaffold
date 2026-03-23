# 测试数据串联使用指南

## 概述

测试框架现在支持**数据串联模式**，可以在 `run-all-tests.ts` 执行时复用前面测试创建的数据，避免重复创建，形成完整的业务链路。

## 核心原理

1. **run-all-tests.ts** 维护一个 `sharedData` 对象
2. 执行每个测试模块时，将 `sharedData` 作为参数传入
3. 测试模块从 `sharedData` 获取依赖数据（如机构ID、课程ID）
4. 如果有就用，没有就自己创建
5. 测试完成后，将创建的关键ID写回 `sharedData`

## SharedTestData 接口

```typescript
interface SharedTestData {
  // 用户相关
  userToken?: string;
  userId?: string;
  
  // 机构相关
  institutionId?: string;
  institutionToken?: string;
  institutionPhone?: string;
  
  // 课程相关
  courseId?: string;
  trialCourseId?: string;
  standardCourseId?: string;
  skuId?: string;
  
  // 教室相关
  classroomId?: string;
  
  // 教师相关
  teacherId?: string;
  
  // 排课相关
  scheduleId?: string;
  
  // 预约相关
  bookingId?: string;
  
  // 订单相关
  orderId?: string;
  
  // 评价相关
  reviewId?: string;
}
```

## 修改测试文件步骤

### 1. 修改函数签名

```typescript
// ❌ 旧版本
export async function runCRUDTests() {
  // ...
}

// ✅ 新版本
export async function runCRUDTests(sharedData?: any) {
  // ...
}
```

### 2. 检查并使用共享数据

```typescript
export async function runCRUDTests(sharedData?: any) {
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  // 🔗 检查是否传入了依赖数据
  if (sharedData?.institutionId && sharedData?.institutionToken) {
    logger.info('📦 使用共享机构数据，跳过机构创建');
    testData.institutionId = sharedData.institutionId;
    testData.adminToken = sharedData.institutionToken;
  } else {
    logger.info('🔨 未传入机构数据，将创建新机构');
  }

  if (sharedData?.courseId) {
    logger.info('📦 使用共享课程数据，跳过课程创建');
    testData.courseId = sharedData.courseId;
  }

  // 根据是否有共享数据，动态调整测试列表
  const tests = [
    // 如果有共享数据，跳过依赖创建步骤
    ...(sharedData?.institutionId ? [] : [
      { name: '创建测试机构', fn: testCreateInstitution },
    ]),
    ...(sharedData?.courseId ? [] : [
      { name: '创建测试课程', fn: testCreateCourse },
    ]),
    
    // 核心测试
    { name: '创建预约', fn: testCreateBooking },
    // ...
  ];

  // 执行测试...
}
```

### 3. 写回关键数据

```typescript
export async function runCRUDTests(sharedData?: any) {
  // ... 测试执行 ...

  // 🔗 将关键ID写入sharedData（供后续测试使用）
  if (sharedData) {
    sharedData.bookingId = testData.bookingId;
    
    // 如果是独立运行（自己创建了依赖），也写回
    if (!sharedData.institutionId) {
      sharedData.institutionId = testData.institutionId;
      sharedData.institutionToken = testData.adminToken;
    }
    if (!sharedData.courseId) {
      sharedData.courseId = testData.courseId;
    }
    
    logger.info('✅ 已将预约数据写入共享数据');
  }

  return failCount === 0;
}
```

## 依赖关系示例

### 课程测试（依赖机构）

```typescript
export async function runCRUDTests(sharedData?: any) {
  // 检查机构数据
  if (sharedData?.institutionId && sharedData?.institutionToken) {
    logger.info('📦 使用共享机构数据');
    testData.institutionId = sharedData.institutionId;
    testData.adminToken = sharedData.institutionToken;
  } else {
    // 自己创建机构
  }

  const tests = [
    ...(sharedData?.institutionId ? [] : [
      { name: '创建测试机构', fn: testCreateInstitution },
    ]),
    { name: '创建课程', fn: testCreateCourse },
  ];

  // 写回数据
  if (sharedData) {
    sharedData.courseId = testData.courseId;
    if (!sharedData.institutionId) {
      sharedData.institutionId = testData.institutionId;
    }
  }
}
```

### 订单测试（依赖机构、课程、预约）

```typescript
export async function runCRUDTests(sharedData?: any) {
  // 检查依赖
  const hasInstitution = sharedData?.institutionId && sharedData?.institutionToken;
  const hasCourse = sharedData?.courseId;
  const hasBooking = sharedData?.bookingId;

  if (hasInstitution) {
    logger.info('📦 使用共享机构数据');
    testData.institutionId = sharedData.institutionId;
  }
  
  if (hasCourse) {
    logger.info('📦 使用共享课程数据');
    testData.courseId = sharedData.courseId;
  }
  
  if (hasBooking) {
    logger.info('📦 使用共享预约数据');
    testData.bookingId = sharedData.bookingId;
  }

  const tests = [
    ...(hasInstitution ? [] : [{ name: '创建机构', fn: testCreateInstitution }]),
    ...(hasCourse ? [] : [{ name: '创建课程', fn: testCreateCourse }]),
    ...(hasBooking ? [] : [{ name: '创建预约', fn: testCreateBooking }]),
    { name: '创建订单', fn: testCreateOrder },
  ];

  // 写回数据
  if (sharedData) {
    sharedData.orderId = testData.orderId;
    // 补充缺失的依赖数据
    if (!hasInstitution) sharedData.institutionId = testData.institutionId;
    if (!hasCourse) sharedData.courseId = testData.courseId;
    if (!hasBooking) sharedData.bookingId = testData.bookingId;
  }
}
```

## 测试验证

### 独立运行（不使用共享数据）

```bash
npx tsx tests/course.test.ts
# 输出: 🔨 未传入机构数据，将创建新机构
```

### 通过 run-all-tests 运行（使用共享数据）

```bash
pnpm run test:all
# 输出:
# [3/13] 机构管理
#   ✅ 已将机构数据写入共享数据
# 
# [6/13] 课程管理  
#   📦 使用共享机构数据，跳过机构创建
#   ✅ 已将课程数据写入共享数据
```

## 优势

1. **减少数据冗余**：不再重复创建机构、课程等基础数据
2. **形成完整链路**：一次运行产生一条从机构→课程→预约→订单→评价的完整业务数据
3. **提高测试效率**：跳过重复的准备步骤，测试运行更快
4. **兼容独立运行**：每个测试仍可独立运行，自动创建所需依赖

## 注意事项

1. **测试顺序很重要**：run-all-tests.ts 中的 `priority` 字段确保依赖顺序
2. **独立运行仍需支持**：即使有共享数据，也要保证独立运行时能创建所需依赖
3. **数据清理**：共享数据在一次 run-all-tests 执行中有效，下次执行重新开始

## 修改清单

已修改文件：
- ✅ run-all-tests.ts - 支持数据串联
- ✅ institution.test.ts - 写出机构数据
- ✅ course.test.ts - 读取机构数据，写出课程数据

待修改文件：
- ⏳ classroom.test.ts - 读取机构数据
- ⏳ teacher.test.ts - 读取机构数据
- ⏳ schedule.test.ts - 读取机构/课程/教室/教师数据
- ⏳ booking.test.ts - 读取课程数据
- ⏳ order.test.ts - 读取预约数据
- ⏳ review.test.ts - 已支持（读取订单数据）
