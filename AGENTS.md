# Interest Class 项目开发规范

> **AI 代码生成指导文档**  
> 本文档为前后端分离项目的统一开发规范，用于指导 AI 生成符合项目标准的代码。

---

### 错误 49: phoneLogin JWT institutionId 与 GET /institution/my 返回不一致 ⚠️⚠️⚠️

**错误现象**：
```typescript
// 演示脚本 Step 14（确认线下支付）报 400 "无权访问此订单"
// order.institution_id = 旧机构A，JWT 的 institutionId = 新机构B
// assertOrderAccess: order.institution_id !== currentInstitutionId → 抛出 BadRequestException
```

**根本原因**：
- `auth.service.ts` 的 `phoneLogin` 通过 `findInstitutionsByUserId`（ORDER BY `created_at DESC`）取第一条，即**最新创建**的机构
- `institution.repository.ts` 的 `findByCurrentUser`（WHERE `created_by = userId`，无 ORDER BY）返回**最老的**机构
- 演示脚本多次运行后（幂等修复前）为同一手机号创建了多个机构，教师/订单数据都在老机构下
- JWT 的 `institutionId` = 新机构，但订单的 `institution_id` = 老机构 → `assertOrderAccess` 失败

**正确写法**：
```typescript
// user-institution.repository.ts — 改为 ASC 排序，始终使用最早（主）机构
const relations = await this.getQuery()
  .where('entity.user_id = :userId', { userId })
  .orderBy('entity.created_at', 'ASC')   // ✅ ASC = 取最早创建的机构
  .getMany();
// 原来是 DESC（取最新的），改为 ASC（取最老的/主机构）
```

```typescript
// 演示脚本 Step 0 — 直接使用 JWT 返回的 institutionId，而非 GET /institution/my
const existingLogin = await client.post<{ token: string; userInfo: any }>(
  '/auth/phone-login', { code: checkCode, type: 'institution' },
);
const jwtInstitutionId = existingLogin.userInfo?.institutionId;  // ✅ 从 JWT payload 取
// ❌ 不要用 GET /institution/my（按 created_by 查询，可能指向不同机构）
```

**规范**：
- `findInstitutionsByUserId` 使用 `ASC` 排序保证 JWT 始终指向用户的"主机构"（第一个创建的）
- 演示/测试脚本登录后，必须从登录响应的 `userInfo.institutionId` 获取机构 ID，不能用 `GET /institution/my`
- 创建订单/预约后，用于管理操作（确认支付、签到等）的 token 必须与订单的 `institution_id` 匹配

---

### 错误 50: 签到接口调用方与参数不完整 ⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：Step 15 用机构 client 且没有 booking_id
await client.post('/check-in', {
  order_id: createdData.orderId,  // 缺少 booking_id
});
// 报 400: "缺少预约信息，无法签到"
// 报 400: "无权操作此订单"（因为 order.user_id ≠ 机构 owner 的 userId）
```

**根本原因**：
- `check-in.service.ts` 验证 `orderData.user_id !== userId`：只有**下单的家长**才能签到
- `booking_id` 在 DTO 中是可选字段，但 service 内部强制要求（`if (!dto.booking_id) throw BadRequest`）

**正确写法**：
```typescript
// ✅ 签到必须用家长 token，且要传 booking_id
await parentClient.post('/check-in', {
  order_id: createdData.orderId,
  booking_id: createdData.bookingId,  // ← 必须传
});
```

**规范**：
- 签到接口调用方：`parentClient`（家长 token），不能用机构 token
- 签到必须传 `booking_id`（即使 DTO 中标注为 `@IsOptional()`）
- `booking_id` 来自创建预约步骤存储的 `createdData.bookingId`

---

### 错误 51: 下单后返现/邀请逻辑回查当前课程配置，导致历史订单被“穿透修改” ⚠️⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：订单创建后，确认支付/支付回调时重新查询 courses.cashback_ratio
const course = await this.courseRepository.findOneById(order.course_id);
await this.inviteService.createInviteOrder({
  order_id: order.id,
  order_amount: Number(order.original_price),
  cashback_ratio: Number(course.cashback_ratio) || 10,
});

// 结果：机构在订单创建后修改课程返现比例/开关，历史订单的邀请返现也跟着变
```

**根本原因**：
- 订单创建时已经把 `cashback_amount`、`original_price`、`paid_amount`、`course_snapshot.cashback_ratio` 锁定到 `orders`
- 但后续 `confirm-payment` / `payment notify` 创建邀请订单时，又重新读取了 `courses` 表当前配置
- 导致“历史订单”被课程后续编辑穿透影响，破坏订单快照语义

**正确写法**：
```typescript
// ✅ 正确：优先使用订单快照；快照缺失时，从订单自身锁定金额反推比例
private resolveOrderCashbackRatio(order: OrderEntity, baseAmount: number): number {
  const snapshotRatio = Number(order.course_snapshot?.cashback_ratio);
  if (Number.isFinite(snapshotRatio) && snapshotRatio > 0) {
    return snapshotRatio;
  }

  const lockedCashbackAmount = Number(order.cashback_amount) || 0;
  const lockedBaseAmount = Number(baseAmount) || 0;
  if (lockedCashbackAmount > 0 && lockedBaseAmount > 0) {
    return Number(((lockedCashbackAmount / lockedBaseAmount) * 100).toFixed(2));
  }

  return 0;
}

await this.inviteService.createInviteOrder({
  order_id: order.id,
  order_amount: Number(order.original_price),
  cashback_ratio: resolveOrderCashbackRatio(order, Number(order.original_price)),
});
```

**规范**：
- 订单创建之后的所有营销/返现/佣金/退款计算，必须优先使用 `orders` 表已锁定字段或快照字段
- 禁止在支付确认、支付回调、退款、解锁返现等后续链路中回查当前 `courses` / `course_skus` 配置来重算历史订单
- 若历史数据缺失快照，优先从订单自身金额字段反推，禁止回退到“当前课程配置”
- 必须补回归测试：下单后修改课程返现配置，旧订单结果保持不变

---

### 错误 52: 下单后修改邀请码让利比例，支付确认/回调仍回退到当前 share_ratio ⚠️⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：创建邀请订单时未传订单快照 share_ratio
await this.inviteService.createInviteOrder({
  invite_code: order.invite_code,
  order_id: order.id,
  order_amount: Number(order.original_price),
  cashback_ratio: resolveOrderCashbackRatio(order, Number(order.original_price)),
  // 缺少 share_ratio
});

// InviteService 会回退到邀请码当前 share_ratio
const share_ratio = data.share_ratio !== undefined
  ? data.share_ratio
  : inviteCodeEntity.share_ratio;

// 结果：邀请人下单后把让利比例从 60% 改成 10%，旧订单确认支付时
// invite_order.share_ratio / discount_amount / actual_cashback 都被新比例污染
```

**根本原因**：
- 订单创建时已经把 `invite_share_ratio` 锁定在 `orders` 表
- 但后续 `confirm-payment` / `payment notify` 若漏传 `share_ratio`，`InviteService.createInviteOrder()` 会回退到邀请码当前比例
- 导致历史订单的立减金额、邀请人收益被事后修改，破坏订单快照语义

**正确写法**：
```typescript
await this.inviteService.createInviteOrder({
  invite_code: order.invite_code,
  invitee_id: order.user_id,
  order_id: order.id,
  course_id: order.course_id,
  institution_id: order.institution_id || '',
  order_amount: Number(order.original_price),
  cashback_ratio: resolveOrderCashbackRatio(order, Number(order.original_price)),
  share_ratio: order.invite_share_ratio !== undefined
    ? Number(order.invite_share_ratio)
    : undefined,
});
```

**规范**：
- 所有创建 `invite_order` 的链路，必须显式传入 `orders.invite_share_ratio`
- 禁止依赖 `InviteService.createInviteOrder()` 的“回退到当前邀请码比例”来处理历史订单
- 回归测试必须覆盖：下单后修改邀请码 `share_ratio`，旧订单的 `invite_order.share_ratio`、`discount_amount`、`actual_cashback` 保持不变

---



**错误现象**：
```sql
-- 通过 migrations/*.sql 手动 CREATE UNIQUE INDEX，每次服务器重启后索引消失
-- 导致 INSERT ... ON CONFLICT (user_id) WHERE is_delete = false DO NOTHING 报错：
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- 进一步导致 @Transactional() 事务处于 aborted 状态，后续所有 SQL 都报：
-- "current transaction is aborted, commands ignored until end of transaction block"
```

**根本原因**：
- TypeORM `synchronize: true` 会在每次启动时根据 Entity 定义同步表结构
- 对于带 `WHERE` 子句的部分唯一索引（partial unique index），TypeORM 无法在 `@Index` 装饰器中声明
- 因此每次同步时，TypeORM 不知道此索引，但也不会主动删除它（不是 TypeORM 管理的）
- **真正的问题**：如果 `synchronize: true` 在 `CREATE TABLE` 时重新建表，或者 Docker 容器重置，索引就消失了

**正确写法**：在依赖该索引的 Service 的 `onModuleInit` 中用 `CREATE UNIQUE INDEX IF NOT EXISTS` 确保索引总是存在：

```typescript
// invite.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class InviteService implements OnModuleInit {
  /**
   * 模块初始化：确保 user_balances 的部分唯一索引存在
   * TypeORM synchronize 不管理带 WHERE 子句的部分索引，需手动保证
   */
  async onModuleInit() {
    try {
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_user_balances_user_id_active
          ON user_balances(user_id)
          WHERE is_delete = false
      `);
      this.logger.log('✅ user_balances 部分唯一索引已就绪');
    } catch (error: any) {
      this.logger.error(`❌ 创建 user_balances 唯一索引失败: ${error.message}`);
    }
  }
}
```

**规范**：
- 所有 `INSERT ... ON CONFLICT ... WHERE ...` 依赖的部分唯一索引，必须在对应 Service 的 `onModuleInit` 中用 `CREATE ... IF NOT EXISTS` 保证存在
- 迁移 SQL 文件只做初始化，不能作为唯一保障
- `IF NOT EXISTS` 确保幂等，重复执行无副作用

---

### 错误 47: TypeORM 0.3.28 UPDATE/DELETE RETURNING 返回 `[rows, rowCount]` 二元组 ⚠️⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：把 UPDATE RETURNING 的返回值当成一维 rows 数组
const updateResult = await dataSource.query(
  `UPDATE orders SET completed_lessons = completed_lessons + 1
   WHERE id = $1 RETURNING completed_lessons, total_lessons`,
  [orderId],
);
// 期望：updateResult[0] = { completed_lessons: 1, total_lessons: 4 }
// 实际：updateResult[0] = [{ completed_lessons: 1, total_lessons: 4 }]（rows数组！）
const row = updateResult[0];
const completedLessons = Number(row.completed_lessons); // ❌ NaN！row 是数组，无此属性
```

**根本原因**：
- TypeORM 0.3.28 的 `PostgresQueryRunner.js` 中，对 UPDATE/DELETE 类型的查询特殊处理：
  ```javascript
  case "UPDATE":
  case "DELETE":
      result.raw = [raw.rows, raw.rowCount]; // ← 二元组！[rows数组, 影响行数]
  ```
- 而 SELECT/INSERT 类型则直接返回 `raw.rows`（一维数组）
- `dataSource.query()` 最终返回 `result.raw`，因此 UPDATE/DELETE 返回的是 `[rows, rowCount]`

**证据**（调试文件内容）：
```json
{"updateResultLength":2,"updatedRowKeys":["0"],"updatedRowVals":[{"completed_lessons":1,"total_lessons":4}]}
```
- `updateResultLength: 2` → 返回的是 `[rows数组, rowCount数字]`
- `updatedRowKeys: ["0"]` → `updateResult[0]` 本身是数组（key 为 "0"），不是 row 对象
- 正确的行数据在 `updateResult[0][0]` 即 `updatedRowVals[0]`

**正确写法**：
```typescript
// ✅ 正确：使用 Array.isArray 检测并规范化
const updateResult = await dataSource.query(
  `UPDATE orders SET completed_lessons = completed_lessons + 1
   WHERE id = $1 AND completed_lessons < total_lessons AND is_delete = false
   RETURNING completed_lessons, total_lessons`,
  [orderId],
);
// TypeORM 0.3.28 UPDATE/DELETE 返回 [rows, rowCount]，需规范化
const updatedRows = Array.isArray(updateResult[0]) ? updateResult[0] : updateResult;
if (!updatedRows || updatedRows.length === 0) {
  throw new BadRequestException('课时已全部用完');
}
const updatedRow = updatedRows[0];
const completedLessons = Number(updatedRow.completed_lessons); // ✅ 正确
```

**规范**：
- 所有使用 `dataSource.query()` 执行 **UPDATE … RETURNING** 或 **DELETE … RETURNING** 的地方，必须用 `Array.isArray(result[0]) ? result[0] : result` 规范化后再取行数据
- SELECT 和 INSERT 不受此影响（仍直接返回 rows 数组）
- 受影响场景：签到课时更新、CAS 状态机跃迁、余额原子扣减、库存扣减等所有 UPDATE/DELETE RETURNING

---

### 错误 45: TypeORM `dataSource.query()` 返回值形态误判（把一维 rows 当二维）⚠️⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：把 query() 返回结果当成 [rows, meta]
const result = await dataSource.query(`UPDATE ... RETURNING id`, [id]);
if (!result[0]?.length) {
  throw new BadRequestException('更新失败');
}

const row = result[0][0]; // ❌ 实际上 result[0] 就是第一行
```

**问题后果**：
- CAS 已成功更新，但代码误判为失败，导致流程提前返回
- 典型后果：支付回调状态已变更，但预约确认/销量/返现副作用未执行

**正确写法**：
```typescript
// ✅ 正确：PostgreSQL 下 query() 返回 rows 数组
const rows = await dataSource.query(`UPDATE ... RETURNING id`, [id]);
if (!rows || rows.length === 0) {
  throw new BadRequestException('更新失败');
}

const row = rows[0];
```

**规范**：
- 所有 `RETURNING` 语句统一使用 `if (!rows || rows.length === 0)` 判定
- 禁止使用 `rows[0]?.length` 或 `rows[0][0]` 这种二维数组写法
- 关键链路（支付回调、退款、库存、签到）必须统一自检该模式

---

## ⚠️ 元规则 - 文档维护规范

**核心原则**：**对于每次的错误修改，都总结成一条规则，放入到本文档（AGENTS.md）里面。**

**执行要求**：
1. 每次遇到编译错误、运行时错误或代码问题时，必须：
   - 分析错误的根本原因
   - 总结成一条清晰的规则
   - 添加到本文档的"AI 生成代码常见错误及解决方案"章节
   
2. 规则编写规范：
   - 包含错误现象（代码示例）
   - 包含错误信息（实际报错）
   - 包含正确写法（代码示例）
   - 包含原因说明和规范

3. 持续改进：
   - 每个新错误都是改进文档的机会
   - 避免重复犯同样的错误
   - 让 AI 生成的代码质量不断提升

**目标**：通过不断积累错误案例和解决方案，使本文档成为项目开发的完整知识库，让 AI 能够生成越来越准确的代码。

---

## ⭐⭐⭐⭐⭐⭐ 新增功能前必须扫描现有系统 - 最高优先级 ⭐⭐⭐⭐⭐⭐

**核心原则**：**在新增任何功能、页面、组件之前，必须先全面扫描系统中是否已存在相同或类似的实现。发现可复用的代码必须复用，严禁重复造轮子。**

**这是本项目优先级最高的规范**，违反此规范将导致：
- ❌ 代码库中出现大量重复代码，维护成本指数级增长
- ❌ UI/UX 不一致，同一个功能在不同端展示效果不同
- ❌ Bug 修复需要改多处，极易遗漏
- ❌ 浪费开发时间重写已有的成熟代码

### 强制执行流程

**每次接到新功能需求时，必须按以下顺序执行**：

#### 第 1 步：扫描公共组件（`src/components/`）
```bash
# 检查是否已有可复用的公共组件
ls src/components/
# 逐个查看组件的 Props 和功能
```
- 查看已有组件是否能满足需求（直接用或加 prop 扩展）
- 已有公共组件列表见"组件复用"章节

#### 第 2 步：扫描现有页面
```bash
# 搜索类似功能的页面
grep -r "关键词" src/pages/ --include="*.vue" -l
```
- 其他端（家长端/机构端/管理端）是否已有类似页面？
- 页面中的 UI 模块能否抽取为公共组件？

#### 第 3 步：扫描 Composables 和工具函数
```bash
# 搜索已有的逻辑复用
ls src/composables/
grep -r "函数名" src/utils/ --include="*.ts"
```
- 是否已有类似的业务逻辑封装？
- 是否已有相关的工具函数？

#### 第 4 步：扫描 API 层
```bash
# 检查接口是否已定义
grep -r "接口路径" src/api/ --include="*.ts"
```
- 是否已有调用相同后端接口的 API 函数？

### 决策规则

| 扫描结果 | 行动 |
|---------|------|
| 已有完全相同的组件/页面 | **直接使用**，不做任何重复开发 |
| 已有类似组件，差异 < 30% | **扩展现有组件**（通过 Props/Slots 适配差异） |
| 已有类似页面，可拆出公共部分 | **先拆组件再复用**（先重构，再在新功能中使用） |
| 完全没有类似实现 | 允许新建，但要考虑未来复用性 |

### 典型反面案例

```vue
<!-- ❌ 错误：管理端机构详情页手写了一堆 label-value 表格 -->
<!-- 而 C 端已经有精美的机构详情页，完全可以复用展示组件 -->
<view class="info-item">
  <text class="label">机构名称</text>
  <text class="value">{{ institution.name }}</text>
</view>
<!-- 重复写了 500 行... -->

<!-- ✅ 正确：直接使用从 C 端抽取的公共组件 -->
<InstitutionInfoCard :institution="institution" />
<InstitutionShowcase :showcases="showcases" :honors="honors" />
<InstitutionCourses :courses="courses" />
```

### 检查清单（每次开发前必查）

- [ ] 已扫描 `src/components/` 目录
- [ ] 已搜索其他端是否有类似页面
- [ ] 已检查 `src/composables/` 是否有可复用逻辑
- [ ] 已确认 `src/api/` 中的接口定义
- [ ] 如果发现可复用代码 → 复用而非重写
- [ ] 如果需要新建 → 设计时考虑未来多端复用

**违反后果**：写出的代码会被要求全部推翻重写，浪费双倍时间。

---

## ⭐⭐⭐ 自我检查与质量保证规范 ⭐⭐⭐

**核心原则**：**在编写代码后，必须进行严格的自我检查（Self-Review），发现错误立即修正，直到代码逻辑正确、无编译错误且符合规范为止。**

**执行要求**：

1. **后端修改（Server）**：
   - **逻辑验证**：修改业务逻辑后，**必须同步编写或更新对应的测试用例**。
   - **测试覆盖**：新增接口必须添加测试，修改接口必须更新测试。
   - **运行验证**：修改完成后，必须运行 `run-all-tests.ts` 或对应模块的测试，确保全部通过。

2. **前端修改（Web）**：
   - **编译检查**：修改 Vue/TS/SCSS 文件后，必须检查是否存在语法错误、悬空样式、未闭合标签等。
   - **合理性检查**：
     - 是否引入了未定义的变量？
     - 是否留下了无用的代码（如悬空的 CSS 闭合括号）？
     - 布局是否符合移动端规范？
   - **自我修正**：在提交或回答用户之前，**必须先自己 review 一遍代码**，不要把显而易见的编译错误留给用户。

3. **心态要求**：
   - **不要依赖用户报错**：尽量在向用户展示代码前发现并解决问题。
   - **一次做对**：追求"Zero Shot"正确率，如果第一次不对，至少要自己发现并改对。

---

## ⭐⭐⭐⭐⭐ 组件复用 - 最高优先级规范 ⭐⭐⭐⭐⭐

**核心原则**：**在多端应用（家长端、机构端、管理端）中，功能相似的 UI 模块必须抽取为公共组件，严禁在各端重复编写相同功能的代码。**

**这是本项目最重要的规范**，违反此规范会导致：
- ❌ 代码冗余，维护成本高
- ❌ 样式不一致，用户体验差
- ❌ Bug 修复需要多处修改，容易遗漏
- ❌ 新功能开发效率低

### 执行要求

**1. 开发前检查**（强制）：
- [ ] 是否已存在类似功能的公共组件？
- [ ] 现有页面是否有可复用的 UI 模块？
- [ ] 这个功能是否会在其他端使用？

**2. 必须抽取为公共组件的场景**：
| 场景 | 说明 | 组件示例 |
|-----|------|---------|
| 列表项卡片 | 订单卡片、预约卡片、课程卡片等 | `OrderCard`, `BookingCard`, `CourseCard` |
| 详情展示 | 订单详情、预约详情等 | `OrderDetail`, `BookingDetail` |
| 状态筛选 | 各种状态 Tab 切换 | `StatusTabs` |
| 空状态 | 无数据时的占位展示 | `EmptyState` |
| 表单组件 | 通用表单输入组合 | `AddressForm`, `StudentForm` |
| 底部操作栏 | 固定在底部的操作按钮 | `PageFooter` |

**3. 公共组件开发规范**：

```vue
<!-- 组件位置：/src/components/[ComponentName]/index.vue -->
<template>
  <!-- 组件模板 -->
</template>

<script setup lang="ts">
/**
 * 公共组件命名规范：PascalCase
 * Props 设计原则：
 * 1. 核心数据通过 props 传入
 * 2. 业务逻辑通过 emit 事件通知父组件
 * 3. 使用 role 属性区分不同端的展示差异
 */
interface Props {
  data: DataType          // 核心数据
  loading?: boolean       // 加载状态
  role?: 'parent' | 'institution' | 'admin'  // 用户角色
}

interface Emits {
  (e: 'click', id: string): void
  (e: 'action', action: string, id: string): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  role: 'parent',
})

const emit = defineEmits<Emits>()
</script>
```

**4. 组件使用示例**：
```vue
<!-- 家长端订单列表 -->
<OrderCard
  v-for="order in orders"
  :key="order.id"
  :order="order"
  role="parent"
  @click="goToDetail(order.id)"
  @action="handleAction"
/>

<!-- 机构端订单列表 -->
<OrderCard
  v-for="order in orders"
  :key="order.id"
  :order="order"
  role="institution"
  @click="goToDetail(order.id)"
  @action="handleAction"
/>
```

**5. 已有公共组件列表**：
| 组件 | 用途 | 位置 |
|-----|------|-----|
| `AsyncImage` | 异步图片加载 | `/components/AsyncImage/` |
| `FileUpload` | 文件上传 | `/components/FileUpload/` |
| `EnumsTag` | 枚举标签选择 | `/components/EnumsTag/` |
| `PageFooter` | 页面底部操作栏 | `/components/PageFooter/` |
| `OrderDetail` | 订单详情展示 | `/components/OrderDetail/` |
| `Loading` | 加载状态 | `/components/Loading/` |
| `OrderCard` | 订单卡片 | `/components/OrderCard/` |
| `BookingCard` | 预约卡片 | `/components/BookingCard/` |
| `CourseCard` | 课程卡片 | `/components/CourseCard/` |
| `StatusTabs` | 状态筛选标签 | `/components/StatusTabs/` |
| `EmptyState` | 空状态展示 | `/components/EmptyState/` |
| `RefundDialog` | 退款申请弹窗 | `/components/RefundDialog/` |

**6. 禁止行为**：
```vue
<!-- ❌ 错误：在两个页面中写几乎相同的代码 -->
<!-- pages/my-orders/index.vue -->
<view class="order-item">
  <text>{{ order.order_no }}</text>
  <!-- 100 行相似代码 -->
</view>

<!-- pages/institution/orders/index.vue -->
<view class="order-card">
  <text>{{ order.order_no }}</text>
  <!-- 100 行相似代码 -->
</view>

<!-- ✅ 正确：使用公共组件 -->
<OrderCard :order="order" role="parent" />
<OrderCard :order="order" role="institution" />
```

**7. 何时可以不抽取组件**：
- 功能仅在单一页面使用，且未来不会复用
- UI 差异巨大（超过 50%），强行合并会增加复杂度
- 临时性功能，后续会删除

**8. 检查清单**（每次开发前必查）：
- [ ] 查看 `/components/` 目录是否有可复用组件
- [ ] 查看其他端是否有类似页面
- [ ] 新建页面前评估是否需要先创建公共组件
- [ ] 代码 Review 时检查是否存在重复代码

**9. 逻辑复用优先组件化** ⭐⭐⭐：

**核心规则**：**对于能够复用的逻辑或 UI，优先考虑使用组件的方式封装，然后在不同的地方进行调用，严禁在多个页面中重复编写相同逻辑。**

```vue
<!-- ❌ 错误：订单列表和订单详情中各写一份退款弹窗逻辑 -->
<!-- pages/my-orders/index.vue 里有 80 行退款弹窗代码 -->
<!-- pages/order-detail/index.vue 里又有 80 行一模一样的退款弹窗代码 -->

<!-- ✅ 正确：抽取为公共组件，两处各一行调用 -->
<RefundDialog ref="refundDialogRef" @success="onRefundSuccess" />

<!-- 使用方式：refundDialogRef.value?.open(orderId) -->
```

**10. 单文件组件超过 500 行必须拆分** ⭐⭐：

**核心规则**：**当单文件组件（.vue）的代码行数超过 500 行时，必须进行组件化拆分。即使拆出的子组件不会在其他地方复用，也需要拆分出去，让页面文件只做组件拼接。**

**拆分方式**：
1. **UI 拆分**：将页面区块提取为子组件到 `pages/[page-name]/components/`
2. **逻辑拆分**：将复杂逻辑提取为 composable 到 `composables/`（如 `useOrderRefund.ts`）
3. **工具拆分**：将纯函数提取到 `utils/`

**原则**：保持单一职责、提高可读性、降低认知负荷

---

## ⭐⭐⭐ wot-design-uni 组件使用强制规范 ⭐⭐⭐

**核心规则**：**使用任何 wot-design-uni 组件前，必须先查阅官方文档 https://wot-ui.cn/**

**执行要求**：
1. **查阅文档顺序**：
   - 访问 https://wot-ui.cn/component/[组件名].html
   - 查看"基础用法"示例代码
   - 确认数据结构（特别是 options 的格式：label/value 还是 text/value）
   - 确认 v-model 绑定的数据类型（string/number/boolean）
   - 查看完整的 Attributes 列表

2. **常见错误及对照**：

| 组件 | ❌ 错误用法 | ✅ 正确用法 | 文档地址 |
|------|-----------|-----------|---------|
| wd-drop-menu-item | `v-model="''"`<br>`{ text: '标签', value: '' }` | `v-model="ref<number>(0)"`<br>`{ label: '标签', value: 0 }` | https://wot-ui.cn/component/drop-menu.html |
| wd-picker | `v-model="showPicker"`<br>`columns=[{values, labelKey}]` | `v-model="selectedValue"`<br>`columns=[{label,value}]`<br>`:label-key` `:value-key` | https://wot-ui.cn/component/picker.html |

3. **wd-picker 使用规范** ⚠️⚠️：
```typescript
// ✅ 正确：v-model 绑定选中值，columns 是对象数组
const selectedId = ref('')
const columns = computed(() => list.value)  // [{id, name}, ...]

// 模板
<wd-picker 
  v-model="selectedId" 
  :columns="columns"
  label="选择项"
  label-key="name"   // 指定显示字段
  value-key="id"     // 指定值字段
  @confirm="handleConfirm"
/>

// ❌ 错误：v-model 绑定显示状态、错误的 columns 格式
const showPicker = ref(false)  // 错误！
const columns = computed(() => [{
  values: list.value,
  labelKey: 'name',  // 错误！应该用组件属性
  valueKey: 'id',
}])
```

4. **wd-drop-menu 使用规范** ⚠️：
```typescript
// ✅ 正确：使用 number 类型，label 字段，value 从 0 开始
const selected = ref<number>(0)
const options = ref([
  { label: '不限', value: 0 },
  { label: '选项1', value: 1 },
  { label: '选项2', value: 2 },
])

// ❌ 错误：使用 string 类型，text 字段
const selected = ref('')
const options = ref([
  { text: '不限', value: '' },  // 错误的字段名和类型
])
```

5. **数据映射策略**：
- 组件内部：使用 number 索引（0, 1, 2...）
- API 传递：通过数组映射获取真实值
```typescript
const values = ref(['', 'value1', 'value2'])  // 真实值数组
const selectedIndex = ref(0)  // 组件绑定的索引

// API 调用时
if (selectedIndex.value > 0) {
  params.field = values.value[selectedIndex.value]
}
```

6. **金额/评分等数值处理规范** ⚠️：
```typescript
// ✅ 正确：先转数字再调用 toFixed
const formatPrice = (price: any) => {
  const num = Number(price) || 0
  return num.toFixed(2)
}

// 模板中使用
<text>¥{{ formatPrice(order.paid_amount) }}</text>

// ❌ 错误：直接调用 toFixed（可能是字符串或 null）
<text>¥{{ order.paid_amount.toFixed(2) }}</text>  // 报错！

// ⚠️ 特别注意：PostgreSQL 的 decimal/numeric 类型返回的是字符串（如 "4.0"），
// 字符串是 truthy 值，所以 || 默认值 不会触发回退！
// ❌ 错误：("4.0" || 4.0).toFixed(1)  → "4.0".toFixed is not a function
// ✅ 正确：Number("4.0" || 4.0).toFixed(1)  → "4.0"
```

7. **强制检查清单**：
- [ ] 已访问组件的官方文档页面
- [ ] 已查看"基础用法"完整示例
- [ ] 已确认 options 的数据结构（字段名和类型）
- [ ] 已确认 v-model 的数据类型
- [ ] 已测试初始值能正确显示
- [ ] 已测试选项能正确展开和选择
- [ ] 金额字段使用 formatPrice 函数处理

**违反后果**：不查文档直接编码 = 100% 出错率

---

## ⭐⭐⭐ 系统启动自动初始化规范 ⭐⭐⭐

**核心规则**：**系统启动时自动执行枚举数据的查漏补缺，无需手动干预**

**实现方式**：
1. **使用 NestJS 生命周期钩子**：在 Service 中实现 `OnModuleInit` 接口
2. **在 `onModuleInit()` 方法中调用初始化逻辑**
3. **添加日志记录**：启动日志、统计日志、错误日志
4. **幂等性保证**：初始化方法应支持重复执行，已存在的数据跳过，不覆盖不重复

**枚举初始化示例**：

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class EnumService implements OnModuleInit {
  private readonly logger = new Logger(EnumService.name);

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
      // 注意：不抛出错误，避免阻塞应用启动
    }
  }

  @Transactional()
  async initDefaultEnums(): Promise<void> {
    const defaultEnums: CreateEnumDto[] = [
      // ... 枚举数据定义
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
}
```

**适用场景**：
- ✅ 枚举数据的初始化（课程类型、机构类目、审核状态等）
- ✅ 系统配置的初始化
- ✅ 默认数据的预置
- ❌ 大量业务数据的导入（应使用独立的数据迁移脚本）

**错误处理策略**：
- **捕获异常但不抛出**：避免初始化失败导致整个应用无法启动
- **记录详细错误日志**：便于排查问题
- **保留手动初始化接口**：作为备用方案（POST /api/enums/init）

**日志规范**：
- 使用 emoji 提高可读性：🚀 启动、✅ 成功、❌ 失败、📊 统计
- 包含关键指标：总数、新增、跳过
- 区分日志级别：log（正常）、error（错误）

**验证方法**：
```bash
# 启动服务器，观察日志
cd interest-class-server
pnpm run start:dev

# 应该看到类似日志：
# [EnumService] 🚀 开始初始化系统枚举数据...
# [EnumService] 📊 枚举初始化统计: 总数=85, 新增=0, 跳过=85
# [EnumService] ✅ 系统枚举数据初始化完成

# 重启多次，确认幂等性（新增=0，跳过=全部）
```

**优势**：
- ✅ 零运维成本：无需手动执行初始化命令
- ✅ 环境一致性：开发、测试、生产环境自动保持数据一致
- ✅ 容错性强：初始化失败不阻塞应用启动
- ✅ 可观测性好：日志清晰展示初始化过程
- ✅ 查漏补缺：自动添加缺失的枚举，不影响已有数据

---

## 项目架构

```
interest-class/
├── interest-class-server/    # 后端服务（NestJS + PostgreSQL）
└── interest-class-web/        # 前端应用（uni-app + Vue 3）
```

---

## ⭐⭐⭐ 测试数据全字段规范 ⭐⭐⭐

**核心规则**：**所有测试数据生成器必须包含实体的全部字段（包括可选字段）**

**执行要求**：
1. **对比实体定义**：编写测试数据生成器前，必须查看对应的Entity文件
2. **包含所有字段**：
   - 必填字段：必须提供合理的测试值
   - 可选字段：提供合理的默认值（不要留空）
   - 关联字段：通过参数传入或使用假数据
   - **排除服务端自动设置的字段**：如`status`（默认pending）、`order_no`（自动生成）、快照字段（Service自动填充）
3. **使用辅助工具**：
   - `ImageUrls.*` - 生成图片URL
   - `UniqueId.*` - 生成唯一标识（手机号、邮箱等）

**为什么需要全字段**：
- ✅ **更好的测试覆盖**：遗漏字段在测试中不会被验证
- ✅ **更好的UI呈现**：完整数据让页面展示更真实
- ✅ **更早发现问题**：字段验证、格式问题在开发阶段就能暴露

**正确示例**（TestInstitution）：

```typescript
export const TestInstitution = {
  art: () => ({
    // ✅ 必填字段
    name: `艺术培训中心_${Date.now()}`,
    introduction: '专业的艺术培训机构，提供舞蹈、绘画、音乐等多种课程',
    license_no: `LICENSE_${Date.now()}`,
    license_img: ImageUrls.certificate(),
    legal_person: '王经理',
    province: '北京市',
    city: '北京市',
    district: '朝阳区',
    address: '朝阳路88号艺术大厦',
    contact_phone: UniqueId.phone(),
    
    // ✅ 可选字段（也要填充）
    logo: ImageUrls.random(200, 200),
    tags: '少儿艺术,专业师资,小班教学',
    latitude: 39.921489,
    longitude: 116.443108,
    category_ids: [],
  }),
}
```

**错误示例**（遗漏字段）：

```typescript
// ❌ 错误：遗漏了 logo, tags, latitude, longitude, category_ids
export const TestInstitution = {
  art: () => ({
    name: `艺术培训中心_${Date.now()}`,
    introduction: '...',
    license_no: `LICENSE_${Date.now()}`,
    // ... 其他必填字段
    // ❌ 遗漏可选字段
  }),
}
```

**快速检查清单**：
- [ ] 已查看对应的Entity文件
- [ ] 已确认所有 `@Column` 装饰器的字段
- [ ] 必填字段都有合理的测试值
- [ ] 可选字段提供了默认值（不为null/undefined）
- [ ] 使用了 ImageUrls/UniqueId 辅助工具
- [ ] 测试运行后页面展示效果良好
- [ ] **测试用例使用 `...TestData.xxx()` 展开语法，不手动拼凑字段** ⭐⭐⭐

**⚠️ 测试用例使用规范** - **禁止手动拼凑字段**：

```typescript
// ❌ 错误：手动拼凑字段，容易遗漏
const data = {
  accounts: [admin],
  name: institutionData.name,
  introduction: institutionData.introduction,
  // ... 手动列举每个字段，容易遗漏 id_card_imgs, bank_name 等
};

// ✅ 正确：使用展开语法，包含全部字段
const institutionData = TestInstitution.art();
const data = {
  ...institutionData,  // 包含全部字段
  accounts: [admin],   // 覆盖/添加特定字段
  name: `${institutionData.name}_特殊标记`,  // 可覆盖部分字段
};
```

**历史问题教训**（2026-01-20）：
- ❌ 测试用例手动拼凑字段，遗漏了 `id_card_imgs`, `bank_name`, `bank_account`, `account_holder`, `tags`, `latitude`, `longitude`
- ❌ 数据库中大量 NULL 字段，影响测试真实性
- ✅ 修复后使用 `...TestInstitution.art()` 展开语法，确保字段完整
- ✅ 测试通过（15/15），数据库字段全部填充

---

## ⭐⭐⭐ 测试用例组织规范 ⭐⭐⭐

**核心规则**：**测试用例必须集成在各自模块的测试文件中，禁止为每个功能单独创建测试文件**

**执行要求**：
1. **按模块组织测试文件**：
   - 机构相关测试 → `institution.test.ts`
   - 课程相关测试 → `course.test.ts`
   - 认证相关测试 → `auth.test.ts`
   - 以此类推...

2. **测试文件结构**：
```
tests/
├── institution.test.ts    # 机构模块所有测试（CRUD、搜索、距离筛选等）
├── course.test.ts         # 课程模块所有测试
├── auth.test.ts           # 认证模块所有测试
├── run-all-tests.ts       # 统一运行入口
└── utils/                 # 测试工具
    ├── test-client.ts     # HTTP 客户端
    ├── test-data.ts       # 测试数据生成器
    └── test-helpers/      # 模块级 helper
```

3. **禁止行为**：
   - ❌ 为每个功能创建单独的测试文件（如 `location-search.test.ts`）
   - ❌ 跨模块的功能测试散落在多个文件中
   - ❌ 测试文件名不体现所属模块

4. **正确做法**：
```typescript
// institution.test.ts
const tests = [
  // CRUD 测试
  { name: '创建机构', fn: testCreateInstitution },
  { name: '查询机构列表', fn: testListInstitutions },
  // 位置搜索测试（集成在同一文件）
  { name: '查询附近机构', fn: testNearbyInstitutions },
  { name: '机构距离筛选', fn: testDistanceFilter },
  { name: '按区域搜索机构', fn: testSearchByArea },
];
```

**优势**：
- ✅ 测试文件与后端模块一一对应，便于查找
- ✅ 减少文件数量，降低维护成本
- ✅ 相关测试集中管理，便于了解模块功能覆盖
- ✅ `run-all-tests.ts` 可统一运行所有测试

---

# 后端规范（Server）

## 技术栈

- **框架**: NestJS v10+
- **数据库**: PostgreSQL
- **ORM**: TypeORM
- **认证**: JWT + nestjs-cls
- **包管理**: pnpm

## 强制性规范

### 0. 枚举数据管理 ⭐

**所有枚举类型数据必须存储在 `enums` 表中**，禁止硬编码：

**枚举类型**：
- `course_type` - 课程类型（standard-正式课, trial-试听课）
- `institution_category` - 机构类目（art-艺术类, sports-体育类等）
- `audit_status` - 审核状态（pending-待审核, approved-已通过, rejected-已拒绝）
- `cashback_type` - 返现类型（percentage-比例, fixed-固定, none-无）

**后端使用**：
```typescript
// 查询枚举列表
GET /enums                    // 获取所有枚举
GET /enums/:type             // 获取指定类型
GET /enums?types=type1,type2 // 批量获取

// 手动初始化默认枚举（备用方案，系统启动时会自动执行）
POST /enums/init
```

**系统启动自动初始化**：
- ✅ 系统启动时自动执行 `initDefaultEnums()`
- ✅ 查漏补缺：只添加缺失的枚举，不影响已有数据
- ✅ 日志记录：启动日志中可看到初始化统计信息
- ✅ 容错处理：初始化失败不阻塞应用启动
- 📝 手动触发：仍可通过 POST /enums/init 端点手动执行

**前端使用**：
```typescript
import { useEnums } from '@/composables/useEnums'

const { loadEnumsByTypes, getEnumLabel, ENUM_TYPES } = useEnums()

// 加载枚举
await loadEnumsByTypes([ENUM_TYPES.COURSE_TYPE])

// 获取标签
const label = getEnumLabel(ENUM_TYPES.COURSE_TYPE, 'standard') // "正式课"
```

### 1. 路径别名

**必须使用 `@` 路径别名**，禁止相对路径：

```typescript
// ✅ 正确
import { BaseEntity } from '@/common/entities/base.entity';
import { UserContextService } from '@/common/services/user-context.service';

// ❌ 错误
import { BaseEntity } from '../../../common/entities/base.entity';
```

### 2. 实体类规范

**所有实体必须继承 BaseEntity**：

```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('demo')
export class DemoEntity extends BaseEntity {
  @Column({ type: 'text', comment: '标题' })
  title: string;
  
  @Column({ type: 'jsonb', nullable: true, comment: '元数据' })
  metadata?: Record<string, any>;
}
```

**BaseEntity 自动提供的字段**：
- `id` - 16位雪花ID（自动生成）
- `is_active` - 是否激活（默认true）
- `created_by` - 创建人ID（自动填充）
- `created_at` - 创建时间（UTC，自动填充）
- `updated_by` - 更新人ID（自动填充）
- `updated_at` - 更新时间（UTC，自动填充）
- `is_delete` - 软删除标记（默认false）

**字段类型规范**：

| 类型 | TypeORM 类型 | 说明 |
|------|-------------|------|
| 字符串 | `text` | 统一使用 text，不用 varchar |
| 时间 | `timestamp with time zone` | UTC时间 |
| JSON | `jsonb` | 支持索引和查询 |
| 布尔 | `boolean` | - |
| 数字 | `integer`/`bigint`/`decimal` | 按需选择 |

### 3. Repository 规范

**所有 Repository 必须继承 BaseRepository**：

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { DemoEntity } from '../entities/demo.entity';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class DemoRepository extends BaseRepository<DemoEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
  ) {
    super(DemoEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);  // ⚠️ 必须调用
  }

  // 自定义查询
  async findByTitle(title: string) {
    return this.getQuery()
      .where('entity.title = :title', { title })
      .getMany();
  }
}
```

**BaseRepository 常用方法**（默认按ID降序、自动过滤软删除）：

- `getQuery()` - 基础查询（过滤软删除）
- `getQueryWithActive()` - 查询激活记录
- `getQueryWithMyData()` - 查询当前用户创建的数据
- `findAllActive()` - 查询所有激活记录
- `findOneById(id)` - 根据ID查询
- `paginate(page, pageSize, options?)` - 分页查询
- `softRemoveById(id)` - 软删除
- `restoreById(id)` - 恢复软删除

### 4. 用户上下文规范

**禁止手动传递 userId 参数**，使用 UserContextService：

```typescript
import { Injectable } from '@nestjs/common';
import { UserContextService } from '@/common/services/user-context.service';

@Injectable()
export class DemoService {
  constructor(
    private userContextService: UserContextService,
  ) {}

  async doSomething() {
    // 获取当前用户ID（必存在）
    const userId = this.userContextService.getCurrentUserId();
    
    // 获取当前用户ID（可为null）
    const userIdOrNull = this.userContextService.getCurrentUserIdOrNull();
    
    // 权限检查
    const hasAdmin = this.userContextService.hasRole('admin');
  }
}
```

**⚠️ 重要架构变更（2025-12-25）：统一用户表**

**背景**：之前存在 `institution_accounts` 和 `user_institutions` 两个表管理机构账号，造成冗余和混淆。

**新架构**：
- **users 表**：存储所有用户（家长用户 + 机构用户）
  - 家长用户：通过微信登录，使用 `openid` 字段
  - 机构用户：通过用户名密码登录，使用 `username` 和 `password` 字段
- **user_institutions 表**：管理用户与机构的关联关系和权限
- **废弃 institution_accounts 表**：不再使用

**机构入驻流程**：
1. 前端提交包含 `username`, `password`, `real_name` 的机构信息
2. 后端在 `users` 表创建账号记录（密码加密）
3. 在 `user_institutions` 表建立关联（role='owner'）

**机构登录流程**：
1. 使用 `username` 查询 `users` 表
2. 验证 `password`
3. 通过 `user_institutions` 获取关联的机构ID
4. 生成JWT token（包含 institutionId）

**数据迁移**：
- 执行 `migrations/migrate-institution-accounts-to-users.sql`
- 将现有 `institution_accounts` 数据迁移到 `users` 和 `user_institutions`
- 确认无误后可删除 `institution_accounts` 表

### 5. 事务管理

使用 `@Transactional()` 装饰器：

```typescript
import { Transactional } from '@/common/decorators/transaction.decorator';

@Injectable()
export class DemoService {
  constructor(
    private demoRepository: DemoRepository,
    private dataSource: DataSource,  // ⚠️ 必须注入
  ) {}

  @Transactional()
  async create(dto: CreateDemoDto): Promise<string> {
    const demo = this.demoRepository.create(dto);
    const saved = await this.demoRepository.save(demo);
    return saved.id;
  }
}
```

### 6. 响应格式

Controller 直接返回数据，拦截器自动包装为：

```json
{
  "code": 200,
  "data": { "id": "1234567890123456" },
  "message": "success"
}
```

**API 返回值规范** ⭐：
- **新增（CREATE）**：返回 `string`（资源ID）
- **修改（UPDATE）**：返回 `boolean`（true 表示成功）
- **删除（DELETE）**：返回 `boolean`（true 表示成功）
- **查询（GET）**：返回实体对象或数组

```typescript
// ✅ 正确示例
@Post()
async create(@Body() dto: CreateDto): Promise<string> {
  return this.service.create(dto); // 返回 "267293442025984000"
}

@Put(':id')
async update(@Param('id') id: string, @Body() dto: UpdateDto): Promise<boolean> {
  return this.service.update(id, dto); // 返回 true
}

@Delete(':id')
async remove(@Param('id') id: string): Promise<boolean> {
  return this.service.remove(id); // 返回 true
}

@Get(':id')
async findOne(@Param('id') id: string): Promise<DemoEntity> {
  return this.service.findOne(id); // 返回完整实体对象
}
```

### 7. 目录结构

```
src/
├── common/                      # 公共模块
│   ├── decorators/             # @Transactional等
│   ├── entities/               # BaseEntity
│   ├── repositories/           # BaseRepository
│   └── services/               # UserContextService等
├── config/                     # 配置文件
├── modules/                    # 业务模块
│   ├── auth/                  # 认证模块（用户、JWT）
│   ├── classroom/             # 教室管理 ⭐
│   ├── course/                # 课程管理（课程、SKU、分类）
│   ├── demo/                  # 示例模块
│   ├── institution/           # 机构管理
│   ├── oss/                   # 文件上传
│   └── teacher/               # 教师管理 ⭐
└── utils/                      # 工具类（雪花ID、加密、OSS）
```

**已实现功能模块**：
- ✅ 认证模块（微信登录、JWT）
- ✅ 机构模块（入驻、审核）
- ✅ 课程模块（发布、SKU、分类、年龄范围）
- ✅ 教室模块（创建、编辑、设施管理、状态管理）
- ✅ 教师模块（创建、编辑、科目管理、证书管理、状态管理）
- ✅ OSS模块（多云存储支持）
- ✅ 枚举模块（统一枚举管理）

```

### 8. 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 类名 | PascalCase | `DemoEntity`, `DemoService` |
| 文件名 | kebab-case | `demo.entity.ts` |
| 变量/方法 | camelCase | `userId`, `findAll()` |
| 数据库表/字段 | snake_case | `demo`, `user_id` |

---

# 前端规范（Web）

## 技术栈

- **框架**: uni-app 3.x
- **前端框架**: Vue 3 Composition API
- **语言**: TypeScript
- **样式**: SCSS + uni.scss
- **UI组件**: wot-design-uni
- **构建**: Vite 5.x
- **包管理**: pnpm

## 强制性规范

### 1. 样式规范 ⭐

**使用 SCSS 编写样式，通过 uni.scss 中的主题变量保持一致性**：

```vue
<!-- ✅ 正确：使用 SCSS 和主题变量 -->
<template>
  <view class="container">
    <text class="title">标题</text>
    <text class="subtitle">副标题</text>
  </view>
</template>

<style lang="scss" scoped>
.container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  background-color: $uni-bg-color;
  border-radius: 16rpx;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: $uni-text-color;
}

.subtitle {
  font-size: 28rpx;
  color: $uni-text-color-secondary;
}
</style>
```

**样式编写要点**：
- 必须使用 uni.scss 中定义的主题变量
- 使用 BEM 命名规范
- 使用 scoped 避免样式污染
- 合理使用 SCSS 的嵌套和混入

### 1.0.1 图标使用规范 ⭐⭐

**所有图标优先使用 iconfont 图标**，而不是 wot-design-uni 的 wd-icon 组件：

```vue
<!-- ✅ 正确：使用 iconfont -->
<text class="iconfont icon-search"></text>
<text class="iconfont icon-location"></text>
<text class="iconfont icon-arrow-right"></text>

<!-- ❌ 避免：使用 wd-icon -->
<wd-icon name="search" />
<wd-icon name="location" />
```

**使用方法**：
1. 图标库地址：`src/static/iconfont/` 目录
2. 使用方式：`<text class="iconfont icon-xxx"></text>`
3. 可通过 CSS 设置颜色和大小：
```scss
.iconfont {
  font-size: 32rpx;
  color: $uni-text-color-secondary;
}
```

**优势**：
- ✅ 更小的包体积（iconfont 只加载需要的图标）
- ✅ 更灵活的样式控制
- ✅ 统一的图标风格
- ✅ 避免 wd-icon 在小程序端的兼容问题

**适用场景**：搜索图标、位置图标、箭头图标、关闭图标等常用UI图标

**⚠️⚠️⚠️ 强制要求：使用 iconfont 前必须先确认图标名存在**

**核心规则**：**在代码中使用任何 `icon-xxx` 类名之前，必须先在 `src/static/iconfont/iconfont.css` 文件中查找确认该图标名存在**。不要凭记忆或猜测填写图标名！

**执行方法**：
```bash
# 在 iconfont.css 中搜索图标名
grep "icon-setting" src/static/iconfont/iconfont.css
# 如果没有结果，说明不存在！需要搜索类似的：
grep "icon-set" src/static/iconfont/iconfont.css
# 发现实际名称是 icon-settings（有 s）
```

**常见易错图标名**：
| ❌ 错误名 | ✅ 正确名 | 说明 |
|----------|----------|------|
| `icon-setting` | `icon-settings` | 设置图标，注意有 **s** |
| `icon-arrow-right` | `icon-right` 或 `icon-right-arrow` | 右箭头 |
| `icon-arrow-left` | `icon-left` 或 `icon-left-arrow` | 左箭头 |
| `icon-user` | `icon-customer` | 用户图标 |
| `icon-star` | `icon-favorites` | 收藏/星标 |

**常用图标速查表**（已确认存在于 iconfont.css 中）：
| 类别 | 图标名 | 用途 |
|------|--------|------|
| 导航 | `icon-home` / `icon-home-fill` | 首页 |
| 导航 | `icon-left` / `icon-right` | 左右箭头 |
| 导航 | `icon-up` / `icon-down` | 上下箭头 |
| 导航 | `icon-left-arrow` / `icon-right-arrow` | 左右箭头（线型） |
| 导航 | `icon-return` | 返回 |
| 操作 | `icon-search` | 搜索 |
| 操作 | `icon-add` / `icon-add-btn` | 添加 |
| 操作 | `icon-edit` | 编辑 |
| 操作 | `icon-delete` / `icon-delete-fill` | 删除 |
| 操作 | `icon-close` | 关闭 |
| 操作 | `icon-filter` / `icon-filter-fill` | 筛选 |
| 操作 | `icon-share` | 分享 |
| 操作 | `icon-copy` | 复制 |
| 操作 | `icon-scan` | 扫码 |
| 操作 | `icon-download` / `icon-upload` | 下载/上传 |
| 操作 | `icon-save` / `icon-save-fill` | 保存 |
| 操作 | `icon-print` / `icon-print-fill` | 打印 |
| 状态 | `icon-success` / `icon-success-fill` | 成功 |
| 状态 | `icon-error` / `icon-error-fill` | 错误 |
| 状态 | `icon-warning` / `icon-warning-fill` | 警告 |
| 状态 | `icon-info` / `icon-info-fill` | 信息 |
| 状态 | `icon-help` / `icon-help-fill` | 帮助 |
| 状态 | `icon-loading` | 加载中 |
| 用户 | `icon-customer` / `icon-customer-fill` | 用户 |
| 用户 | `icon-customer-group` / `icon-customer-group-fill` | 用户组 |
| 用户 | `icon-customer-service` / `icon-customer-service-fill` | 客服 |
| 用户 | `icon-customer-add` / `icon-customer-add-fill` | 添加用户 |
| 商品 | `icon-goods` / `icon-goods-fill` | 商品 |
| 商品 | `icon-cart-full` / `icon-cart-full-fill` | 购物车 |
| 商品 | `icon-store` / `icon-store-fill` | 店铺 |
| 商品 | `icon-order` / `icon-order-fill` | 订单 |
| 位置 | `icon-location` / `icon-location-fill` | 定位 |
| 位置 | `icon-earth` | 地球 |
| 位置 | `icon-global` / `icon-global-fill` | 全球 |
| 媒体 | `icon-camera` / `icon-camera-fill` | 相机 |
| 媒体 | `icon-picture` / `icon-picture-fill` | 图片 |
| 媒体 | `icon-video` / `icon-video-fill` | 视频 |
| 媒体 | `icon-play` / `icon-play-fill` | 播放 |
| 媒体 | `icon-volume` / `icon-volume-fill` | 音量 |
| 媒体 | `icon-mute` / `icon-mute-fill` | 静音 |
| 系统 | `icon-settings` / `icon-settings-fill` | 设置 |
| 系统 | `icon-security` / `icon-security-fill` | 安全 |
| 系统 | `icon-lock` / `icon-lock-fill` | 锁定 |
| 系统 | `icon-unlock` / `icon-unlock-fill` | 解锁 |
| 系统 | `icon-tool` / `icon-tool-fill` | 工具 |
| 系统 | `icon-code` | 代码 |
| 系统 | `icon-qr-code` | 二维码 |
| 时间 | `icon-time` / `icon-time-fill` | 时间 |
| 时间 | `icon-calendar` / `icon-calendar-fill` | 日历 |
| 时间 | `icon-time-history` | 历史 |
| 通知 | `icon-notice` / `icon-notice-fill` | 通知 |
| 通知 | `icon-remind` / `icon-remind-fill` | 提醒 |
| 通知 | `icon-email` / `icon-email-fill` | 邮件 |
| 通知 | `icon-phone` / `icon-phone-fill` | 电话 |
| 评价 | `icon-good` / `icon-good-fill` | 点赞 |
| 评价 | `icon-bad` / `icon-bad-fill` | 差评 |
| 评价 | `icon-smile` / `icon-smile-fill` | 微笑 |
| 评价 | `icon-favorites` / `icon-favorites-fill` | 收藏 |
| 评价 | `icon-honor` / `icon-honor-fill` | 荣誉 |
| 财务 | `icon-money-rmb` / `icon-money-rmb-fill` | 人民币 |
| 财务 | `icon-money-wallet` / `icon-money-wallet-fill` | 钱包 |
| 财务 | `icon-money-red-packet` / `icon-money-red-packet-fill` | 红包 |
| 财务 | `icon-money-bank` / `icon-money-bank-fill` | 银行 |
| 财务 | `icon-money-dollar` | 美元 |
| 其他 | `icon-more` | 更多 |
| 其他 | `icon-view` / `icon-view-fill` | 查看 |
| 其他 | `icon-hide` | 隐藏 |
| 其他 | `icon-link` | 链接 |
| 其他 | `icon-pin` / `icon-pin-fill` | 图钉/固定 |
| 其他 | `icon-lable` | 标签 |
| 其他 | `icon-catalog` / `icon-catalog-fill` | 目录 |
| 其他 | `icon-teaching` | 教学 |
| 其他 | `icon-training` / `icon-training-fill` | 培训 |
| 其他 | `icon-vip` / `icon-vip-fill` | VIP |
| 其他 | `icon-selected` | 已选中 |
| 其他 | `icon-confirm` | 确认 |

**历史错误**（2026-03-07）：
- ❌ 三个登录页使用 `icon-setting`（不存在），图标不显示
- ✅ 正确名称是 `icon-settings`（带 s）
- 根因：未在 iconfont.css 中确认图标名就直接使用

### 1.1 图片组件使用规范 ⭐

**前端遇到图片展示时，优先使用 `AsyncImage` 组件**：

```vue
<!-- ✅ 正确 -->
<AsyncImage 
  :url="imageUrl" 
  width="200rpx" 
  height="200rpx"
  mode="aspectFill"
  custom-class="my-image-class"
/>

<!-- ❌ 避免 -->
<image :src="imageUrl" />
```

**AsyncImage 组件属性**：
- `url` - 图片路径（OSS路径或完整URL）⭐ 注意是 `url` 不是 `src`
- `width` - 图片宽度（支持 rpx 或数字）
- `height` - 图片高度（支持 rpx 或数字）
- `mode` - 图片裁剪模式（aspectFill/aspectFit 等）
- `lazyLoad` - 是否懒加载
- `customClass` - 自定义样式类（用于扩展样式，如圆形头像）
- `customStyle` - 自定义内联样式

**优势**：
- ✅ 自动处理加载状态、占位图、错误处理
- ✅ **自动处理 OSS 路径转预览 URL**（无需手动调用 `ossApi.getPreviewUrl`）
- ✅ 支持完整 URL 和 OSS path 两种格式

### 1.1.1 文件上传规范 ⭐⭐⭐

**前端遇到文件/图片上传时，必须使用 `FileUpload` 组件**：

```vue
<!-- ✅ 正确：使用 FileUpload 组件 -->
<!-- 头像上传（圆形头像模式） -->
<FileUpload
  v-model="form.avatar"
  mode="avatar"
  path-prefix="avatars"
  :is-public="true"
  avatar-size="160rpx"
/>

<!-- 多图上传（默认网格模式） -->
<FileUpload
  v-model="form.images"
  :limit="9"
  path-prefix="uploads"
  :is-public="true"
/>

<!-- ❌ 错误：手动调用 ossApi 上传 -->
const uploadRes = await ossApi.upload(tempFilePath, path, true)
const urlRes = await ossApi.getPublicUrl(uploadRes.path)
form.avatar = urlRes.url
```

**FileUpload 组件属性**：
- `v-model` - 绑定的 URL（单个或数组）
- `mode` - 显示模式：`default`（网格）/ `avatar`（头像）
- `limit` - 最大上传数量（默认 1）
- `pathPrefix` - 上传路径前缀（如 `avatars`、`covers`）
- `isPublic` - 是否公开访问（默认 true）
- `avatarSize` - 头像尺寸（仅 avatar 模式，默认 160rpx）
- `customClass` - 自定义样式类
- `accept` - 接受的文件类型（image/video/all）
- `maxSize` - 单个文件最大大小（默认 2MB）

**优势**：
- ✅ 封装了完整的上传逻辑（选择、上传、获取URL）
- ✅ 自动处理上传进度、成功/失败状态
- ✅ 内部使用 AsyncImage 展示图片
- ✅ 支持多种模式（头像、多图网格）

### 1.2 文件长度规范 ⭐

**单个文件代码不要超过 500 行，超过需要拆分**：

**拆分方式**：
1. 提取子组件到 `components/` 目录
2. 提取逻辑到 `composables/` (如 `useUserProfile.ts`)
3. 提取工具函数到 `utils/` 目录

**原则**：保持单一职责、提高可维护性、便于复用和测试

### 1.3 枚举选择器规范 ⭐

**对于页面中的可枚举的单选和多选，都使用 tag 的方式布局**：

```vue
<!-- ✅ 正确：使用 tag 方式 -->
<view class="tag-group">
  <view 
    class="tag-item"
    :class="{ 'tag-active': role === 'admin' }"
    @click="role = 'admin'"
  >
    管理员
  </view>
  <view 
    class="tag-item"
    :class="{ 'tag-active': role === 'staff' }"
    @click="role = 'staff'"
  >
    普通员工
  </view>
</view>

<!-- ❌ 避免：使用 radio/checkbox 组件 -->
<wd-radio-group v-model="role">
  <wd-radio value="admin">管理员</wd-radio>
</wd-radio-group>
```

**样式模板**：
```scss
.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-item {
  padding: 12rpx 32rpx;
  font-size: 28rpx;
  border-radius: 8rpx;
  background-color: $uni-bg-color-grey;
  color: $uni-text-color-secondary;
  transition: all 0.3s;
  
  &.tag-active {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
    border: 1rpx solid $uni-color-primary;
  }
}
```

**优势**：更直观、更好的触摸体验、统一UI风格、灵活样式  
**适用场景**：角色选择、类型选择、状态筛选、标签选择

**⚠️ 重要：优先使用系统 enums 表**

在开发过程中遇到下拉选项时，**优先考虑使用系统已有的 `enums` 表来维护**，而不要自己新建一个 entity 来维护。

**⚠️ 强制：使用 EnumsTag 组件**

**涉及到使用 tag 方式展示枚举值时，必须使用封装好的 `EnumsTag` 组件**，不要手动编写 tag 结构。

```vue
<!-- ✅ 正确：使用 EnumsTag 组件 -->
<EnumsTag
  v-model="selectedType"
  enum-type="course_type"
  :enum-items="courseTypeEnums"
/>

<!-- 多选 -->
<EnumsTag
  v-model="selectedCategories"
  enum-type="institution_category"
  :enum-items="categoryEnums"
  multiple
/>

<!-- ❌ 错误：手动编写 tag 结构 -->
<view class="tag-group">
  <view class="tag-item">标签</view>
</view>
```

**使用 enums 的判断标准**：
- ✅ 条目数量较少（一般不超过 20 个）
- ✅ 数据相对固定，不频繁变化
- ✅ 不需要复杂的关联关系
- ✅ 主要用于展示和筛选
- ❌ 需要用户自定义添加（如机构创建自己的课程分类）
- ❌ 有复杂的层级结构（超过 2 层）
- ❌ 需要关联大量其他数据

**前端展示方式选择**：
- **条目不多（≤5 个）**: 统一使用 **EnumsTag 组件**
- **条目较多（6-20 个）**: 可以考虑使用 **picker 选择器**
- **条目很多（>20 个）**: 使用 **搜索 + 列表** 方式

### 1.4 表单布局规范 ⭐

**所有表单都使用垂直布局方式**：

```vue
<!-- ✅ 正确：垂直布局 -->
<view class="form-group">
  <view class="form-label">课程名称</view>
  <wd-input v-model="form.name" placeholder="请输入课程名称" />
</view>

<!-- ❌ 避免：水平布局 -->
<wd-input v-model="form.name" label="课程名称" />
```

**样式模板**：
```scss
.form-container {
  padding: 32rpx;
}

.form-group {
  margin-bottom: 32rpx;
}

.form-label {
  font-size: 28rpx;
  color: $uni-text-color;
  margin-bottom: 16rpx;
  
  &.required::before {
    content: '*';
    color: $uni-color-error;
    margin-right: 8rpx;
  }
}
```

**优势**：更清晰的视觉层级、适合移动端触摸、便于添加必填标记和提示、更灵活的排列

### 1.5 页面 Footer 规范 ⭐

**所有页面底部操作栏必须使用 `PageFooter` 组件**：

```vue
<!-- ✅ 正确：使用 PageFooter 组件，注意层级关系 -->
<template>
  <view class="page">
    <view class="form-container">
      <!-- 页面内容 -->
    </view>
    
    <!-- ⚠️ 重要：PageFooter 必须在最外层容器内，与内容容器同级 -->
    <PageFooter>
      <wd-button type="primary" block @click="handleSubmit">
        提交
      </wd-button>
    </PageFooter>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.form-container {
  // ⚠️ 必须设置底部内边距，为 PageFooter 留出空间
  padding: 24rpx 32rpx 160rpx; // 底部留出 160rpx
}
</style>
```

```vue
<!-- ❌ 错误：PageFooter 在滚动容器内部 -->
<template>
  <view class="page">
    <view class="form-container">
      <!-- 页面内容 -->
      
      <!-- ❌ 错误：在 form-container 内部，会跟随滚动 -->
      <PageFooter>
        <wd-button type="primary" block @click="handleSubmit">
          提交
        </wd-button>
      </PageFooter>
    </view>
  </view>
</template>
```

```vue
<!-- ✅ 正确：复杂布局（带多个按钮） -->
<PageFooter>
  <view class="save-draft" @click="saveDraft">
    <wd-icon name="edit" />
    <text>草稿</text>
  </view>
  
  <view class="action-group">
    <wd-button @click="prevStep">上一步</wd-button>
    <wd-button type="primary" @click="nextStep">下一步</wd-button>
  </view>
</PageFooter>

<style lang="scss" scoped>
// 使用 :deep() 自定义内部布局
:deep(.page-footer) {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
```

```vue
<!-- ❌ 错误：手动编写 footer 结构 -->
<view class="footer-buttons">
  <wd-button type="primary" block @click="handleSubmit">
    提交
  </wd-button>
</view>

<style lang="scss" scoped>
.footer-buttons {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  background-color: $uni-bg-color;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.1);
}
</style>
```

**PageFooter 组件特点**：
- ✅ 统一的固定定位和布局
- ✅ 统一的内边距和阴影
- ✅ 合理的 z-index（100）- 既能覆盖页面内容，又不会遮挡 picker 等弹出层
- ✅ 自动处理安全区域（safe-area-inset-bottom）
- ✅ 支持通过 slot 自定义内容
- ✅ 支持通过 :deep() 自定义内部布局

**使用场景**：
- 表单提交页面（创建、编辑）
- 多步骤流程页面
- 需要底部固定操作按钮的页面

**优势**：统一样式、减少重复代码、统一 z-index 管理、便于全局调整

### 1.6 主题色配置（清新绿色系） ⭐

项目采用**清新绿色**作为主题色，所有颜色变量定义在 `uni.scss` 中，配色体系如下：

**主题色变量（SCSS）**：

| 颜色层级 | SCSS 变量 | 色值 | 用途 |
|---------|-----------|------|------|
| 主题绿 | `$uni-color-primary` | #52c41a | 主要按钮、重点内容 |
| 浅绿 | `$uni-color-primary-light` | #95de64 | hover 状态 |
| 更浅绿 | `$uni-color-primary-lighter` | #d9f7be | 背景色、标签 |
| 深绿 | `$uni-color-primary-dark` | #389e0d | active 状态 |
| 更深绿 | `$uni-color-primary-darker` | #237804 | 强调 |

**辅助色变量**：

| 类型 | SCSS 变量 | 色值 | 用途 |
|------|-----------|------|------|
| 成功 | `$uni-color-success` | #52c41a | 成功提示 |
| 警告 | `$uni-color-warning` | #faad14 | 警告提示 |
| 错误 | `$uni-color-error` | #f5222d | 错误提示 |
| 信息 | `$uni-color-info` | #1890ff | 一般信息 |

**文本颜色变量**：

| 类型 | SCSS 变量 | 色值 | 用途 |
|------|-----------|------|------|
| 主要文本 | `$uni-text-color` | #333333 | 标题、重要内容 |
| 次要文本 | `$uni-text-color-secondary` | #666666 | 正文、描述 |
| 辅助文本 | `$uni-text-color-tertiary` | #999999 | 提示、说明 |
| 禁用文本 | `$uni-text-color-disable` | #d9d9d9 | 禁用状态 |
| 白色文本 | `$uni-text-color-inverse` | #ffffff | 按钮文字、深色背景 |

**背景颜色变量**：

| 类型 | SCSS 变量 | 色值 | 用途 |
|------|-----------|------|------|
| 主背景 | `$uni-bg-color` | #ffffff | 页面主背景 |
| 次背景 | `$uni-bg-color-grey` | #f5f5f5 | 区域划分背景 |
| 三级背景 | `$uni-bg-color-tertiary` | #fafafa | 卡片、面板背景 |
| 遮罩 | `$uni-bg-color-mask` | rgba(0,0,0,0.6) | 弹窗遮罩 |

**边框颜色变量**：

| 类型 | SCSS 变量 | 色值 | 用途 |
|------|-----------|------|------|
| 主边框 | `$uni-border-color` | #d9d9d9 | 输入框、卡片边框 |
| 次边框 | `$uni-border-color-secondary` | #e8e8e8 | 分割线 |
| 浅边框 | `$uni-border-color-light` | #f0f0f0 | 淡分割线 |

**颜色使用示例**：

```vue
<template>
  <view class="container">
    <button class="btn-primary">主要按钮</button>
    <view class="tag">标签</view>
    <text class="title">主标题</text>
    <text class="subtitle">副标题</text>
  </view>
</template>

<style lang="scss" scoped>
.container {
  background-color: $uni-bg-color-grey;
  padding: 32rpx;
}

.btn-primary {
  background-color: $uni-color-primary;
  color: $uni-text-color-inverse;
  
  &:active {
    background-color: $uni-color-primary-dark;
  }
}

.tag {
  background-color: $uni-color-primary-lighter;
  color: $uni-color-primary;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

.title {
  color: $uni-text-color;
  font-size: 36rpx;
  font-weight: bold;
}

.subtitle {
  color: $uni-text-color-secondary;
  font-size: 28rpx;
}
</style>
```

**颜色使用规范 ⚠️**：

```vue
<!-- ✅ 正确：使用 SCSS 变量 -->
<style lang="scss" scoped>
.button {
  background-color: $uni-color-primary;
  color: $uni-text-color-inverse;
  
  &:hover {
    background-color: $uni-color-primary-light;
  }
  
  &:active {
    background-color: $uni-color-primary-dark;
  }
}
</style>

<!-- ❌ 错误：硬编码颜色值 -->
<style lang="scss" scoped>
.button {
  background-color: #52c41a; /* 禁止硬编码 */
  color: #ffffff;
}
</style>
```

### 2. 文件组织规范 ⭐

**公共组件**：必须放在 `src/components/`

```
src/components/UserCard/index.vue     ✅
src/components/LoadingSpinner/index.vue ✅
```

**页面组件**：必须放在 `pages/[page-name]/components/`

```
src/pages/user-profile/components/ProfileHeader.vue  ✅
src/pages/product-list/components/ProductFilter.vue  ✅
```

**判断标准**：
- 多个页面使用 → `src/components/`
- 单个页面使用 → `pages/[page-name]/components/`

**工具函数**：必须放在 `src/utils/`

```
src/utils/format.ts    ✅
src/utils/validate.ts  ✅
```

### 3. 目录结构

```
src/
├── api/                        # API接口定义
│   ├── auth.ts                # 认证
│   ├── category.ts            # 分类
│   ├── classroom.ts           # 教室 ⭐
│   ├── course.ts              # 课程
│   ├── enum.ts                # 枚举
│   ├── institution.ts         # 机构
│   ├── oss.ts                 # 文件上传
│   ├── teacher.ts             # 教师 ⭐
│   └── index.ts
├── components/                 # 公共组件（强制）
│   ├── AsyncImage/            # 异步图片 ⭐
│   ├── EnumsTag/              # 枚举标签 ⭐
│   └── FileUpload/            # 文件上传
├── pages/                      # 页面
│   ├── index/                 # 首页
│   ├── institution/           # 机构端
│   │   ├── center/           # 个人中心
│   │   ├── classroom-list/   # 教室列表 ⭐
│   │   ├── classroom-edit/   # 教室编辑 ⭐
│   │   ├── courses/          # 课程列表
│   │   ├── course-edit/      # 课程编辑
│   │   ├── login/            # 登录
│   │   ├── settle/           # 入驻
│   │   ├── teacher-list/     # 教师列表 ⭐
│   │   └── teacher-edit/     # 教师编辑 ⭐
│   ├── login/                 # 家长登录
│   └── mine/                  # 家长个人中心
├── static/                     # 静态资源
├── stores/                     # 状态管理
├── utils/                      # 工具函数（强制）
└── uni.scss                    # 主题变量
```

**已实现功能模块**：
- ✅ 认证模块（微信登录、手机登录）
- ✅ 机构管理（入驻申请、个人中心）
- ✅ 课程管理（列表、发布、编辑、SKU管理）
- ✅ 教室管理（列表、创建、编辑、设施管理、状态管理）
- ✅ 教师管理（列表、创建、编辑、科目管理、证书管理、状态管理）
- ✅ 文件上传（多OSS支持、进度显示）
- ✅ 公共组件（AsyncImage、EnumsTag、FileUpload）

```

### 4. 组件开发规范

```vue
<template>
  <view class="user-card">
    <text class="user-card__name">{{ name }}</text>
  </view>
</template>

<script setup lang="ts">
// Props
interface Props {
  name: string
  age?: number
}
const props = withDefaults(defineProps<Props>(), {
  age: 0
})

// Emits
interface Emits {
  (e: 'click', id: string): void
}
const emit = defineEmits<Emits>()

// 方法
const handleClick = () => {
  emit('click', '123')
}
</script>

<style lang="scss" scoped>
// 仅在必要时使用（使用BEM命名）
.user-card {
  &__name { }
}
</style>
```

### 5. API 请求规范

**模块化管理**：

```typescript
// api/user.ts
import { get, post } from '@/utils/request'

export const userApi = {
  login(data: { username: string; password: string }) {
    return post<{ token: string }>('/api/login', data, {
      showLoading: true,
      showError: true
    })
  },
  
  getUserInfo(id: string) {
    return get<UserInfo>(`/api/user/${id}`)
  }
}

// api/index.ts
export * from './user'
export * from './product'
```

**类型定义**：

```typescript
// types/user.ts
export interface UserInfo {
  id: string
  username: string
  avatar: string
}

export interface PageResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
```

### 6. 页面开发规范

```vue
<template>
  <view class="flex-col-center p-4">
    <!-- 使用 UnoCSS -->
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const title = ref('页面标题')

onLoad((options) => {
  console.log('页面参数:', options)
})

onMounted(() => {
  // 初始化
})
</script>

<style lang="scss" scoped>
// 仅在必要时添加
</style>
```

### 7. 路由导航

```typescript
// 跳转页面
uni.navigateTo({ url: '/pages/detail/index?id=123' })

// 替换当前页
uni.redirectTo({ url: '/pages/login/index' })

// 重启到首页
uni.reLaunch({ url: '/pages/home/index' })

// 返回
uni.navigateBack({ delta: 1 })
```

### 8. 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 页面目录 | kebab-case | `user-profile/` |
| 组件目录 | PascalCase | `UserCard/` |
| 文件名 | kebab-case | `user-api.ts` |
| 函数 | camelCase | `formatDate()` |

---

## AI 代码生成要点

### Server 端生成模块

```
请创建一个 [模块名] 模块：

实体字段：
- name: string - 名称
- status: string - 状态
- config: jsonb - 配置（可选）

要求：
1. 继承 BaseEntity
2. 使用 @ 路径别名
3. Repository 继承 BaseRepository 并调用 setUserContextService
4. Service 使用 UserContextService 获取当前用户
5. 使用 @Transactional 装饰器
6. Controller 直接返回数据
```

### Web 端生成页面

```
请创建一个 [页面名] 页面：

功能：
- 列表展示
- 搜索筛选
- 分页加载

要求：
1. 优先使用 UnoCSS 编写样式
2. 页面私有组件放在 pages/[page-name]/components/
3. 使用 TypeScript 定义类型
4. 使用 userApi 调用接口
5. 使用 wot-design-uni 组件库
```

---

## 快速参考

### Server 端工具

- **雪花ID**: `generateSnowflakeId()` - 生成16位ID
- **JWT**: `JwtUtil` - Token签发/验证
- **加密**: `CryptoUtil` - AES加密/密码哈希

### Web 端工具

- **提示**: `showSuccessToast()`, `showErrorToast()`
- **加载**: `showLoading()`, `hideLoading()`
- **存储**: `uni.setStorageSync()`, `uni.getStorageSync()`

### 环境变量

**Server (.env)**:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=interest_class
JWT_SECRET=your-secret-key
```

**Web (manifest.json)**: 配置小程序appid、H5域名等

---

## 项目启动

### ⚠️ 重要配置信息

**后端服务地址**: `http://localhost:8888` ⭐  
**数据库**: Docker 容器，容器名称 `postgres` ⭐

### 环境变量配置 ⭐

在 `.env` 和 `.env.development` 中有一个 `ENV` 环境变量，用于控制开发模式的特殊行为：

| ENV 值 | 说明 | 特殊行为 |
|--------|------|---------|
| `production` | 生产环境 | 正常业务逻辑 |
| `development` | 开发环境 | 1. Mock手机号登录 2. 签到无24小时限制 |

**配置方式**：
```dotenv
# .env（默认生产环境）
ENV=production

# .env.development（开发环境）
ENV=development
```

**开发模式特殊行为**：
1. **Mock手机号登录**：机构登录时使用 `MOCK_INSTITUTION_PHONES` 配置的手机号
2. **签到无24小时限制**：签到页面跳过"上课前24小时可签到"的时间限制

**前端获取配置**：
```typescript
import { homeApi } from '@/api'

const config = await homeApi.getConfig()
if (config.isDevelopment) {
  // 开发模式下的逻辑
}
```

### Server
```bash
cd interest-class-server
pnpm install

# 启动开发服务器
pnpm run start:dev
# ✅ 服务运行在 http://localhost:8888

# 初始化枚举数据（必须）
curl -X POST http://localhost:8888/api/enums/init

# 执行数据库迁移（使用 Docker 容器）
docker exec -i postgres psql -U postgres -d interest_class -f /path/to/migrations/create-classrooms-table.sql
# 或从宿主机传入 SQL 文件
docker exec -i postgres psql -U postgres -d interest_class < migrations/create-classrooms-table.sql
```

### Web
```bash
cd interest-class-web
pnpm install
pnpm run dev:h5          # H5开发
pnpm run dev:mp-weixin   # 微信小程序开发
pnpm run build:h5        # H5生产构建
```

### 数据库初始化

```bash
# 1. 创建数据库（使用 Docker 容器）
docker exec -i postgres psql -U postgres -c "CREATE DATABASE interest_class;"

# 2. 启动服务器（自动创建表结构）
cd interest-class-server
pnpm run start:dev
# ✅ 服务运行在 http://localhost:8888

# 3. 初始化枚举数据（必须执行）
curl -X POST http://localhost:8888/api/enums/init

# 4. 执行额外的迁移脚本（使用 Docker）
docker exec -i postgres psql -U postgres -d interest_class < migrations/create-classrooms-table.sql
docker exec -i postgres psql -U postgres -d interest_class < migrations/create-teachers-table.sql
```

### 数据库查询（Docker 方式）

```bash
# 进入 Docker 容器的 psql
docker exec -it postgres psql -U postgres -d interest_class

# 或直接执行查询
docker exec -i postgres psql -U postgres -d interest_class -c "SELECT * FROM institutions LIMIT 5;"
```

### ⚠️ 终端使用规范

**由于前后端都在同一个目录，运行命令时必须新开终端**：

```bash
# ❌ 错误：在后端运行的终端中执行新命令
# Terminal 1: 后端正在运行
pnpm run start:dev       # 后端启动中...

# 然后在同一个终端执行其他命令会中断后端
curl http://localhost:3000  # 这会导致后端停止！

# ✅ 正确：使用不同的终端
# Terminal 1: 后端服务
cd interest-class-server
pnpm run start:dev       # 保持运行

# Terminal 2: 前端服务
cd interest-class-web
pnpm run dev:h5

# Terminal 3: 测试命令
curl http://localhost:3000
psql -U postgres -d interest_class
```

**最佳实践**：
- Terminal 1: 专门运行后端服务（`pnpm run start:dev`）
- Terminal 2: 专门运行前端服务（`pnpm run dev:h5`）
- Terminal 3: 执行测试、数据库查询等临时命令
- 避免在服务运行的终端中执行其他命令

---

## API接口列表

### 认证相关
- `POST /api/auth/wechat-login` - 微信登录
- `GET /api/auth/profile` - 获取用户信息

### 机构相关
- `POST /api/institution` - 创建机构（入驻）
- `GET /api/institution` - 获取机构列表
- `GET /api/institution/:id` - 获取机构详情
- `PUT /api/institution/:id` - 更新机构信息

### 课程相关
- `POST /api/course` - 创建课程
- `GET /api/course` - 获取课程列表
- `GET /api/course/:id` - 获取课程详情
- `PUT /api/course/:id` - 更新课程
- `DELETE /api/course/:id` - 删除课程
- `PUT /api/course/:id/online` - 课程上架 ⚠️ **需要先创建排课**
- `PUT /api/course/:id/offline` - 课程下架
- `GET /api/course/category` - 获取课程分类

**⚠️ 课程上架业务规则**：
- 没有排课的课程，**不能上架**
- 没有上架的课程，**不会出现在C端用户可见的列表中**（`is_online = true` 筛选）
- 上架前必须至少创建一条排课记录

### 教室相关 ⭐
- `POST /api/classroom` - 创建教室
- `GET /api/classroom?institutionId=xxx&status=available` - 获取教室列表
- `GET /api/classroom/:id` - 获取教室详情
- `PUT /api/classroom/:id` - 更新教室
- `DELETE /api/classroom/:id` - 删除教室（软删除）
- `POST /api/classroom/sort` - 批量更新排序

### 教师相关 ⭐
- `POST /api/teacher` - 创建教师
- `GET /api/teacher?institutionId=xxx&status=active` - 获取教师列表
- `GET /api/teacher/:id` - 获取教师详情
- `PUT /api/teacher/:id` - 更新教师
- `DELETE /api/teacher/:id` - 删除教师（软删除）
- `POST /api/teacher/sort` - 批量更新排序

### 枚举相关
- `GET /api/enums` - 获取所有枚举
- `GET /api/enums/:type` - 获取指定类型枚举
- `POST /api/enums/init` - 初始化默认枚举

### 宝贝相关 ⭐
- `POST /api/child` - 添加宝贝
- `GET /api/child/my` - 获取我的宝贝列表
- `GET /api/child/:id` - 获取宝贝详情
- `PUT /api/child/:id` - 更新宝贝信息
- `DELETE /api/child/:id` - 删除宝贝（软删除）

**业务规则**：
- 每个用户最多添加 10 个宝贝
- 宝贝信息仅本人可见
- 删除宝贝不影响已有的预约和订单

### 预约相关 ⭐
- `POST /api/booking` - 创建预约
- `GET /api/booking/my` - 获取我的预约列表
- `GET /api/booking/:id` - 获取预约详情
- `GET /api/booking/institution/:institutionId` - 获取机构预约列表
- `PUT /api/booking/:id/status` - 更新预约状态（机构端）
- `PUT /api/booking/:id/cancel` - 取消预约（用户端）
- `PUT /api/booking/:id/change-schedule` - 修改预约排课（用户端）⭐
- `PUT /api/booking/:id/review-change` - 审核修改请求（机构端）⭐

**⚠️ 预约状态流程**：
```
预约状态枚举:
- pending         - 待确认（新建预约）
- confirmed       - 已确认（机构确认后生效）
- rejected        - 已拒绝
- cancelled       - 已取消
- completed       - 已完成
- pending_change  - 待审核修改（24小时内修改需机构审核）

修改预约流程:
1. 用户进入预约详情 → 点击"修改预约"
2. 选择新的排课时段
3. 判断24小时规则:
   - 距离上课 ≥ 24小时: 直接修改成功
   - 距离上课 < 24小时: 状态变为 pending_change，等待机构审核
4. 机构审核:
   - 同意: pending_change → confirmed，排课更新
   - 拒绝: pending_change → confirmed，保持原排课
```

### 订单相关 ⭐
- `POST /api/order` - 创建订单（同时创建预约）
- `GET /api/order/my` - 获取我的订单列表
- `GET /api/order/:id` - 获取订单详情
- `PUT /api/order/:id/confirm-payment` - 线下支付确认（机构端）
- `PUT /api/order/:id/confirm` - 机构确认订单（待确认→已确认）
- `PUT /api/order/:id/cancel` - 取消订单（用户端）
- `PUT /api/order/:id/apply-refund` - 申请退款（用户端）
- `PUT /api/order/:id/process-refund` - 处理退款（机构端）
- `PUT /api/order/:id/complete` - 完成订单（机构端）

**⚠️ 订单状态流程**：
```
订单状态枚举:
- pending        - 待支付
- pending_confirm - 待确认（线上支付成功后，等待机构确认）
- confirmed      - 已确认（机构确认后订单生效，用户可在课表看到课程）
- refunding      - 退款中
- refunded       - 已退款
- cancelled      - 已取消
- completed      - 已完成

状态流转:
1. 用户下单 → pending
2. 线上支付成功:
   - 体验课(trial): pending → confirmed（自动确认，预约也自动确认）
   - 正式课(standard): pending → pending_confirm
3. 机构确认订单: pending_confirm → confirmed（预约自动确认）
4. 用户申请退款: confirmed → refunding
5. 机构处理退款:
   - 同意: refunding → refunded
   - 拒绝: refunding → confirmed
6. 课程完成: confirmed → completed
7. 用户取消订单: pending → cancelled

注意:
- 线下支付确认(confirm-payment): pending → confirmed（直接生效）
- 只有 confirmed 状态才能申请退款
- 只有 confirmed 状态才能完成订单
- 订单确认后预约自动变为 confirmed
```

### 签到相关 ⭐
- `POST /api/check-in` - 上课签到（扣除课时）
- `POST /api/check-in/makeup` - 补卡签到（过去日期）
- `GET /api/check-in` - 查询签到记录列表
- `GET /api/check-in/order/:orderId` - 查询订单签到状态

**⚠️ 签到业务规则**：
```
签到规则:
- 每个订单每天只能签到一次
- 只有 confirmed 状态的订单可以签到
- 签到后 completed_lessons + 1
- 当 completed_lessons = total_lessons 时，订单自动变为 completed

补卡规则:
- 只能补过去日期的签到
- 未来日期不可补卡
- 已签到日期不可重复补卡
- 补卡需填写备注说明原因

课时进度:
- 订单列表/详情显示进度条
- 格式: "已上 X 课 / 共 Y 课"
```

### 邀友返现相关 ⭐
- `GET /api/invite/my-code` - 获取或创建我的邀请码
- `PUT /api/invite/my-code/share-ratio` - 设置分享比例
- `PUT /api/invite/my-code/freeze` - 冻结邀请码
- `PUT /api/invite/my-code/unfreeze` - 解冻邀请码
- `POST /api/invite/my-code/reset` - 重置邀请码
- `GET /api/invite/validate?code=xxx` - 验证邀请码（公开接口）
- `GET /api/invite/calculate-discount?code=xxx&courseId=xxx&orderAmount=xxx` - 计算优惠金额（公开接口）
- `GET /api/invite/balance` - 获取余额信息
- `GET /api/invite/orders` - 获取邀请订单列表
- `GET /api/invite/cashback-records` - 获取返现记录
- `GET /api/invite/withdraw-records` - 获取提现记录
- `POST /api/invite/withdraw` - 申请提现

**⚠️ 邀友返现业务规则**：
```
邀请码规则:
- 每个用户只能有一个邀请码
- 邀请码可冻结/解冻/重置
- 分享比例范围：0-100%（默认50%）
- 不能使用自己的邀请码
- 每个邀请码每日最多使用50次

返现规则:
- 课程需开启返现（cashback_enabled = true）
- 返现比例范围：3-15%（默认10%）
- 返现分配 = 返现金额 × 分享比例（给邀请人） + 剩余（给被邀请人）
- 返现按课程进度解锁（上课后解锁对应比例）

提现规则:
- 最低提现金额：50元
- 提现需人工审核
- 审核通过后转入微信零钱

数据库表:
- user_invite_codes - 用户邀请码
- user_balances - 用户余额
- invite_orders - 邀请订单
- cashback_records - 返现记录
- withdraw_records - 提现记录
```

### 文件上传
- `POST /api/oss/generate-upload-token` - 生成上传凭证

---

## 常见问题

**Q: Server 端为什么使用 UserContextService？**  
A: 自动从请求上下文获取用户信息，无需手动传递userId，代码更简洁安全。

**Q: Web 端为什么强制使用 SCSS？**  
A: 通过 uni.scss 主题变量保持UI一致性，便于后期主题切换。

**Q: 如何处理多端差异？**  
A: 使用条件编译 `#ifdef H5` / `#ifdef MP-WEIXIN` 或运行时判断。

**Q: BaseRepository 的查询方法能自定义排序吗？**  
A: 可以，调用时传入 `order` 选项覆盖默认的 ID DESC。

**Q: 前端API调用报错 Cannot GET /api/api/xxx？**  
A: API定义时不要加 `/api` 前缀，request.ts会自动添加。使用 `/classroom` 而不是 `/api/classroom`。

---

## AI 生成代码常见错误及解决方案 ⚠️

### 错误 1: CommonModule 导入路径错误

**错误现象**：
```typescript
// ❌ 错误
import { CommonModule } from '@/common/common.module';
```

**错误信息**：
```
Cannot find module '@/common/common.module' or its corresponding type declarations.
```

**正确写法**：
```typescript
// ✅ 正确
import { CommonModule } from '@/modules/common/common.module';
```

**原因**: `common.module.ts` 位于 `src/modules/common/` 目录，不是 `src/common/`。

---

### 错误 2: Repository 缺少自定义查询方法

**错误现象**：
```typescript
// Service 中调用了不存在的方法
const institution = await this.institutionRepository.findOneByUserId(userId);
```

**错误信息**：
```
Property 'findOneByUserId' does not exist on type 'InstitutionRepository'.
```

**解决方案**: 在对应的 Repository 中添加自定义查询方法：

```typescript
// ✅ 在 InstitutionRepository 中添加
/**
 * 根据用户ID查询机构（通过created_by字段）
 */
async findOneByUserId(userId: string): Promise<InstitutionEntity | null> {
  return this.getQuery()
    .where('entity.created_by = :userId', { userId })
    .getOne();
}
```

**规范**: 
- 所有自定义查询方法都应在 Repository 中实现
- 使用 `getQuery()` 作为基础查询（自动过滤软删除）
- 方法命名清晰，说明查询条件和返回类型

---

### 错误 3: paginate 方法参数类型错误

**错误现象**：
```typescript
// ❌ 错误：尝试将 queryBuilder 传给 paginate
const queryBuilder = this.repository.getQuery()
  .where('...')
  .andWhere('...');
  
return this.repository.paginate(page, pageSize, { queryBuilder });
```

**错误信息**：
```
Object literal may only specify known properties, and 'queryBuilder' does not exist in type 'FindManyOptions<Entity>'.
```

**正确写法**：
```typescript
// ✅ 正确：直接在 queryBuilder 上使用 skip/take 和 getManyAndCount
const queryBuilder = this.repository.getQuery()
  .where('...')
  .andWhere('...');

const skip = (page - 1) * pageSize;
const [data, total] = await queryBuilder
  .skip(skip)
  .take(pageSize)
  .getManyAndCount();

return {
  data,
  total,
  page,
  pageSize,
  totalPages: Math.ceil(total / pageSize),
};
```

**原因**: 
- `BaseRepository.paginate()` 方法接受 `FindManyOptions` 参数，不能传入 `queryBuilder`
- 当需要复杂查询时，应该直接使用 `QueryBuilder` 的分页方法

**使用场景**：
- **使用 paginate()**: 简单查询，只需要 where 条件
- **使用 QueryBuilder**: 需要 leftJoin、复杂 where、子查询等

---

### 错误 4: 模块导入时忘记导出 Repository

**错误现象**：
```typescript
// module.ts 中没有导出 Repository
@Module({
  imports: [...],
  providers: [Service, Repository],
  exports: [Service],  // ❌ 忘记导出 Repository
})
```

**问题**: 其他模块无法注入该 Repository。

**正确写法**：
```typescript
// ✅ 导出 Repository 以供其他模块使用
@Module({
  imports: [...],
  providers: [Service, Repository],
  exports: [Service, Repository],
})
```

**⚠️ 特别注意**: 如果模块中包含 UserContextService 等被其他模块依赖的服务，**必须导出**：
```typescript
// ✅ CommonModule 必须导出 UserContextService
@Module({
  imports: [TypeOrmModule.forFeature([EnumEntity])],
  providers: [EnumService, EnumRepository, UserContextService],
  exports: [EnumService, EnumRepository, UserContextService],  // 必须导出
})
export class CommonModule {}
```

**常见依赖注入错误**：
```
UnknownDependenciesException: Nest can't resolve dependencies of the XxxService (..., UserContextService, ...)
```
**原因**: UserContextService 虽然在 CommonModule 的 providers 中声明，但未在 exports 中导出。
**解决**: 在 CommonModule 的 exports 数组中添加 UserContextService。

---

### 错误 5: Entity 中忘记添加 @Entity 装饰器的表名

**错误现象**：
```typescript
// ❌ 未指定表名，会使用类名作为表名
@Entity()
export class ScheduleEntity extends BaseEntity {
  // ...
}
```

**正确写法**：
```typescript
// ✅ 明确指定表名（使用 snake_case）
@Entity('schedules')
export class ScheduleEntity extends BaseEntity {
  // ...
}
```

**规范**: 
- 表名使用 snake_case（例如：`schedules`, `user_institutions`）
- Entity 类名使用 PascalCase + Entity 后缀（例如：`ScheduleEntity`）

---

### 错误 6: 关联查询时忘记使用别名

**错误现象**：
```typescript
// ❌ 没有使用正确的别名
queryBuilder
  .leftJoinAndSelect('course', 'course')  // 错误
  .where('course_id = :courseId', { courseId });
```

**正确写法**：
```typescript
// ✅ 使用 entity 作为主表别名，关联表使用有意义的别名
queryBuilder
  .leftJoinAndSelect('entity.course', 'course')
  .leftJoinAndSelect('entity.teacher', 'teacher')
  .leftJoinAndSelect('entity.classroom', 'classroom')
  .where('entity.course_id = :courseId', { courseId });
```

**规范**:
- 主表别名固定使用 `entity`（BaseRepository 已设定）
- 关联表使用关系属性名作为别名
- where 条件中使用 `entity.字段名`

---

### 错误 7: DTO 验证装饰器使用不当

**错误现象**：
```typescript
// ❌ 忘记导入验证装饰器
export class CreateDto {
  @IsNotEmpty()  // 未导入
  name: string;
}
```

**正确写法**：
```typescript
// ✅ 从 class-validator 导入所需的装饰器
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateDto {
  @IsNotEmpty({ message: '名称不能为空' })
  @IsString({ message: '名称必须是字符串' })
  name: string;

  @IsOptional()
  @IsString({ message: '描述必须是字符串' })
  description?: string;
}
```

**规范**:
- 必填字段使用 `@IsNotEmpty()`
- 可选字段使用 `@IsOptional()`
- 添加中文错误提示信息

---

### 错误 8: Module 中声明的 Provider 未导出 ⚠️⚠️

**错误现象**：
```typescript
// ❌ CommonModule 中声明了 UserContextService，但未导出
@Module({
  imports: [TypeOrmModule.forFeature([EnumEntity])],
  providers: [EnumService, EnumRepository, UserContextService],
  exports: [EnumService, EnumRepository],  // ❌ 忘记导出 UserContextService
})
export class CommonModule {}

// ❌ 其他模块导入 CommonModule，但无法使用 UserContextService
@Module({
  imports: [CommonModule, ...],  // 虽然导入了 CommonModule
  providers: [ScheduleService],   // ScheduleService 依赖 UserContextService
})
export class ScheduleModule {}
```

**错误信息**：
```
UnknownDependenciesException [Error]: Nest can't resolve dependencies of the ScheduleService 
(ScheduleRepository, InstitutionRepository, ?, DataSource). 
Please make sure that the argument UserContextService at index [2] is available in the ScheduleModule context.

Potential solutions:
- If UserContextService is exported from a separate @Module, is that module imported within ScheduleModule?
```

**正确写法**：
```typescript
// ✅ CommonModule 必须导出 UserContextService
@Module({
  imports: [TypeOrmModule.forFeature([EnumEntity])],
  providers: [EnumService, EnumRepository, UserContextService],
  exports: [EnumService, EnumRepository, UserContextService],  // ✅ 必须导出
})
export class CommonModule {}

// ✅ 现在 ScheduleModule 可以正常使用 UserContextService
@Module({
  imports: [CommonModule, ...],  // 导入 CommonModule
  providers: [ScheduleService],   // ScheduleService 可以注入 UserContextService
})
export class ScheduleModule {}
```

**核心规则**：
1. **Provider 声明 vs 导出的区别**：
   - `providers`: 在当前模块内部可用
   - `exports`: 在导入此模块的其他模块中可用
   
2. **什么时候需要导出**：
   - 如果该 Provider 会被其他模块的 Service/Controller 依赖注入
   - 如果该 Provider 是基础服务（如 UserContextService、Repository 等）
   
3. **常见需要导出的 Provider**：
   - `UserContextService` - 几乎所有业务模块都需要
   - `Repository` - 当其他模块需要直接访问数据时
   - `XxxService` - 当作为公共服务被其他模块使用时

**快速检查方法**：
如果看到依赖注入错误提示 `"? at index [X]"`，说明该依赖无法解析，检查：
1. 提供该依赖的模块是否在 imports 中
2. 该模块的 exports 数组是否包含这个依赖

---

### 错误 9: TypeORM DELETE 语句中使用别名 ⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：delete() 后继续使用 createQueryBuilder 设置的别名
async deleteByInstitutionId(institutionId: string): Promise<void> {
  await this.createQueryBuilder('entity')
    .delete()
    .where('entity.institution_id = :institutionId', { institutionId })
    .execute();
}
```

**错误信息**：
```
QueryFailedError: missing FROM-clause entry for table "entity"
```

**正确写法**：
```typescript
// ✅ 正确：delete() 后使用 .from() 指定表名，where 条件不使用别名
async deleteByInstitutionId(institutionId: string): Promise<void> {
  await this.createQueryBuilder()
    .delete()
    .from('institution_teachers')  // 使用实际表名
    .where('institution_id = :institutionId', { institutionId })  // 不使用别名
    .execute();
}

// ✅ 或者使用 Repository 的 delete 方法
async deleteByInstitutionId(institutionId: string): Promise<void> {
  await this.delete({ institution_id: institutionId });
}
```

**原因**: 
- `.delete()` 方法会清除 QueryBuilder 的 FROM 子句
- 调用 `.delete()` 后，之前通过 `createQueryBuilder('entity')` 设置的别名失效
- 必须使用 `.from('table_name')` 重新指定表，且 WHERE 条件不能再使用别名

**规范**:
- DELETE 操作使用 `.from('table_name')` 而不是别名
- WHERE 条件直接使用字段名，不加别名前缀
- 简单删除优先使用 `Repository.delete()` 方法

---

### 错误 10: 权限检查使用 created_by 而非关联表 ⚠️

**错误现象**：
```typescript
// ❌ 错误：只检查创建者，忽略了机构成员关系
async update(id: string, dto: UpdateDto): Promise<void> {
  const entity = await this.repository.findOneById(id);
  
  const userId = this.userContextService.getCurrentUserId();
  if (entity.created_by !== userId) {
    throw new BadRequestException('无权限修改');
  }
  // ...
}
```

**问题场景**：
- 机构由**家长用户**创建（created_by = 家长ID）
- 机构**管理员账号**尝试修改机构信息
- 管理员 ID ≠ created_by，导致权限检查失败

**正确写法**：
```typescript
// ✅ 正确：检查用户是否在关联表中（是否有权限）
async update(id: string, dto: UpdateDto): Promise<void> {
  const entity = await this.repository.findOneById(id);
  
  const userId = this.userContextService.getCurrentUserId();
  
  // 检查用户是否是该机构的成员
  const hasPermission = await this.userInstitutionRepository.hasInstitution(
    userId,
    id,
  );
  if (!hasPermission) {
    throw new BadRequestException('无权限修改');
  }
  // ...
}
```

**规范**:
- **多对多关系场景**：权限检查应基于关联表（如 user_institutions）
- **created_by 仅用于记录创建人**：不应作为唯一的权限判断依据
- **优先使用关联关系**：`hasInstitution()`, `hasRole()` 等方法
- **场景判断**：
  - 个人资源（如笔记、收藏）→ 可以使用 created_by
  - 组织资源（如机构、课程）→ 应该用关联表

---

### 错误 11: 列表接口缺少筛选参数 ⚠️

**错误现象**：
```typescript
// ❌ 错误：固定返回某种状态，不够灵活
@Get()
async getApprovedList(
  @Query('page') page: number = 1,
  @Query('pageSize') pageSize: number = 10,
) {
  return this.institutionService.getApprovedList(page, pageSize);
}

// Service 中
async getApprovedList(page: number, pageSize: number) {
  return this.repository.findApprovedInstitutions(page, pageSize);
}

// Repository 中
async findApprovedInstitutions(page: number, pageSize: number) {
  return this.paginate(page, pageSize, {
    where: { audit_status: 'approved' }, // 固定只返回已审核
    order: { created_at: 'DESC' },
  });
}
```

**问题**：
- 刚创建的草稿机构无法在列表中查询到
- 用户无法筛选不同状态的数据
- 接口灵活性差，需求变化时要改代码

**正确写法**：
```typescript
// ✅ 正确：支持可选的status参数
@Get()
async getList(
  @Query('page') page: number = 1,
  @Query('pageSize') pageSize: number = 10,
  @Query('status') status?: string, // 可选参数
) {
  return this.institutionService.getList(page, pageSize, status);
}

// Service 中
async getList(page: number, pageSize: number, status?: string) {
  return this.repository.findInstitutions(page, pageSize, status);
}

// Repository 中
async findInstitutions(page: number, pageSize: number, status?: string) {
  const whereCondition = status ? { audit_status: status } : {}; // 动态条件
  return this.paginate(page, pageSize, {
    where: whereCondition,
    order: { created_at: 'DESC' },
  });
}
```

**规范**：
- 列表接口应支持常用的筛选参数（status、type、category等）
- 参数设为可选，不传则返回全部
- 这样可以满足多种查询场景：
  - `?status=draft` - 查询草稿
  - `?status=approved` - 查询已审核
  - 不传 - 查询全部

---

### 错误 12: 敏感字段修改未限制 ⚠️

**错误现象**：
```typescript
// ❌ 错误：已审核通过后，不允许修改任何字段
async update(id: string, dto: UpdateDto): Promise<void> {
  const entity = await this.repository.findOneById(id);
  
  if (['approved', 'frozen'].includes(entity.audit_status)) {
    throw new BadRequestException('该状态下不允许修改机构信息');
  }
  
  await this.repository.update(id, dto);
}
```

**问题**：
- 过度限制：审核通过后完全不能修改
- 不够灵活：有些字段（如简介、电话）应该允许修改
- 资质字段（营业执照）应该严格限制

**正确写法**：
```typescript
// ✅ 正确：区分敏感字段和普通字段
async update(id: string, dto: UpdateDto): Promise<void> {
  const entity = await this.repository.findOneById(id);
  
  // 敏感字段列表（资质相关字段）
  const sensitiveFields = [
    'license_no',      // 营业执照号
    'license_img',     // 营业执照图片
    'legal_person',    // 法人
  ];

  // 已审核通过或冻结时，不允许修改敏感字段
  if (['approved', 'frozen'].includes(entity.audit_status)) {
    const hasSensitiveChange = sensitiveFields.some(
      (field) => dto[field] !== undefined,
    );
    if (hasSensitiveChange) {
      throw new BadRequestException(
        '已审核通过的机构不允许修改营业执照、法人等资质信息',
      );
    }
  }
  
  // 普通字段可以修改
  await this.repository.update(id, dto);
}
```

**测试用例**：
```typescript
// 测试1：草稿状态可以修改敏感字段
const updateSensitive = {
  license_no: '新营业执照号',
  introduction: '同时修改普通字段',
};
await helper.put(`/institution/${id}`, updateSensitive); // ✓ 成功

// 测试2：已审核通过不能修改敏感字段
// (需要先通过审核)
const updateSensitive2 = {
  license_no: '新营业执照号',
};
await helper.put(`/institution/${id}`, updateSensitive2); // ✗ 报错

// 测试3：已审核通过可以修改普通字段
const updateNormal = {
  introduction: '更新简介',
  contact_phone: '新电话',
};
await helper.put(`/institution/${id}`, updateNormal); // ✓ 成功
```

**规范**：
- 区分敏感字段（资质）和普通字段（业务信息）
- 审核通过后：
  - ✅ 允许修改：简介、电话、地址、营业时间等业务信息
  - ❌ 禁止修改：营业执照、法人、注册资本等资质信息
- 提供清晰的错误提示

---

### 错误 12: 列表接口缺少分页兼容性 ⚠️

**错误现象**：
```typescript
// ❌ 错误：列表接口只支持一种模式
export class QueryDto {
  institutionId?: string;
  // 没有分页参数
}

async findAll(query: QueryDto) {
  return this.repository.find(); // 总是返回数组
}
```

**问题**：
- 缺乏灵活性：前端无法选择分页或不分页
- 大数据量时性能问题
- 前端不同场景需求不同（下拉选择 vs 列表展示）

**正确写法**：
```typescript
// ✅ 正确：支持分页兼容模式
export class QueryDto {
  @IsString() @IsOptional() institutionId?: string;
  
  // 可选分页参数
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}

async findAll(query: QueryDto) {
  // 查询数据
  const filtered = await this.getFilteredData(query);
  
  // 分页兼容模式：有分页参数就分页，否则返回数组
  if (query.page && query.pageSize) {
    const total = filtered.length;
    const start = (query.page - 1) * query.pageSize;
    const data = filtered.slice(start, start + query.pageSize);
    return {
      data,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }
  
  // 无分页参数，直接返回数组
  return filtered;
}
```

**测试覆盖**：
```typescript
// 测试1：不分页模式
const result1 = await getList({ institutionId: 'xxx' });
if (!Array.isArray(result1)) throw new Error('应返回数组');

// 测试2：分页模式
const result2 = await getList({ institutionId: 'xxx', page: 1, pageSize: 10 });
if (!result2.data || !result2.total) throw new Error('应返回分页对象');
```

**规范**：
- **所有列表接口**都应支持分页兼容模式
- **DTO默认值**：不要设置page/pageSize默认值（会强制分页）
- **前端选择**：
  - 下拉选择、标签选择 → 不分页（`getList({})`）
  - 列表展示、数据浏览 → 分页（`getList({ page: 1, pageSize: 20 })`）
- **返回格式**：
  - 不分页：直接返回 `T[]`
  - 分页：返回 `{ data: T[], total: number, page: number, pageSize: number, totalPages: number }`

---

### 错误 13: getQuery() 后使用 where 而非 andWhere ⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：where 会覆盖 getQuery() 设置的 is_delete 过滤
async findOne(id: string) {
  return this.repository
    .getQuery()  // 设置了 WHERE is_delete = false
    .where('entity.id = :id', { id })  // ❌ 覆盖了前面的条件！
    .getOne();
}
```

**错误结果**：
- 软删除的数据仍然可以查询到
- 实际执行的SQL：`WHERE entity.id = 'xxx'`（缺少 is_delete = false）

**正确写法**：
```typescript
// ✅ 正确：使用 andWhere 追加条件
async findOne(id: string) {
  return this.repository
    .getQuery()  // WHERE is_delete = false
    .andWhere('entity.id = :id', { id })  // AND entity.id = 'xxx'
    .getOne();
}
```

**核心规则**：
- **getQuery() 后永远使用 andWhere**
- `.where()` 会**覆盖**之前的所有 WHERE 条件
- `.andWhere()` 会**追加** AND 条件
- BaseRepository 的 `getQuery()` 已经设置了 `WHERE is_delete = false`

**常见场景**：
```typescript
// ✅ 正确示例：查询详情
findOne(id: string) {
  return this.repository
    .getQuery()
    .andWhere('entity.id = :id', { id })  // AND
    .getOne();
}

// ✅ 正确示例：复杂查询
findByFilters(filters) {
  const qb = this.repository.getQuery();
  
  if (filters.name) {
    qb.andWhere('entity.name LIKE :name', { name: `%${filters.name}%` });
  }
  if (filters.status) {
    qb.andWhere('entity.status = :status', { status: filters.status });
  }
  
  return qb.getMany();
}

// ❌ 错误：第一个条件就用 where
findByFilters(filters) {
  const qb = this.repository.getQuery();
  qb.where('entity.name = :name', { name });  // ❌ 覆盖了 is_delete = false
  return qb.getMany();
}
```

**检测方法**：
- 软删除测试失败 → 立即检查是否用了 `.where()`
- 搜索代码：`getQuery().*.where(` → 应该改为 `andWhere`

---

### 测试图片Mock工具 ⭐

**在编写测试用例时，使用以下工具生成Mock图片URL**：

```typescript
// 测试数据生成器示例（tests/utils/test-data.ts）
export const ImageUrls = {
  /**
   * 随机图片（通用） - 使用 Picsum Photos
   * @param width 宽度
   * @param height 高度
   */
  random: (width = 800, height = 600) =>
    `https://picsum.photos/${width}/${height}`,

  /**
   * 人物头像（教师、用户等） - 使用 This Person Does Not Exist
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
```

**推荐工具**：

1. **Picsum Photos** (https://picsum.photos/)
   - 用途：生成随机图片
   - 格式：`https://picsum.photos/{width}/{height}`
   - 示例：`https://picsum.photos/800/600`
   - 特点：每次请求返回不同的随机图片

2. **This Person Does Not Exist** (https://thispersondoesnotexist.com/)
   - 用途：生成不存在的人物头像（AI生成）
   - 格式：`https://thispersondoesnotexist.com/`
   - 特点：适合用于教师、用户头像等场景

**使用场景**：
- 课程封面、轮播图 → `ImageUrls.random()`
- 教师头像、用户头像 → `ImageUrls.person()`
- 教室环境照片 → `ImageUrls.classroom()`
- 荣誉证书 → `ImageUrls.certificate()`

---

### 错误 14: Entity 中使用 ORM 关联装饰器 ⚠️⚠️⚠️

**架构约定**：**禁止在 Entity 之间使用 ORM 关联装饰器**（`@OneToMany`, `@ManyToOne`, `@OneToOne`, `@ManyToMany`），所有关联关系在应用层手动处理。

**错误现象**：
```typescript
// ❌ 错误：使用 ORM 关联
@Entity('schedules')
export class ScheduleEntity extends BaseEntity {
  @Column({ type: 'text', comment: '课程ID' })
  course_id: string;
  
  @ManyToOne(() => CourseEntity)  // ❌ 禁止
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity;
}
```

**正确写法**：
```typescript
// ✅ 正确：只保留外键字段，不使用关联装饰器
@Entity('schedules')
export class ScheduleEntity extends BaseEntity {
  @Column({ type: 'text', comment: '课程ID' })
  course_id: string;
  
  // ⚠️ 如果需要，可以声明可选字段供应用层填充
  course?: any;  // 应用层手动加载
}
```

**应用层手动加载示例**：参见错误 14.1。

### 错误 14.1: 移除 ORM 关联后忘记手动加载关联数据 ⚠️⚠️

**背景**：项目采用**应用层关联**策略，不使用 TypeORM 的 `@OneToMany`/`@ManyToOne` 装饰器。

**错误现象**：
```typescript
// ❌ 错误：移除了关联装饰器，但没有手动加载数据
// Entity
@Entity('courses')
export class CourseEntity extends BaseEntity {
  // ❌ 移除了 @OneToMany 但没有添加手动加载逻辑
  skus?: any[];  // 期望有数据，但永远为空
}

// Service - 直接使用，期望有 skus 数据
const course = await this.courseRepository.findOneById(id);
const sku = course.skus?.find(s => s.id === skuId);  // ❌ skus 为 undefined
```

**错误原因**：
- TypeORM 不会自动加载关联数据（因为没有装饰器）
- 必须在 Repository 中手动查询和组装数据

**正确写法**：

**1. Entity 定义**（只保留字段，不用装饰器）：
```typescript
// ✅ 正确：明确标注需要手动加载
@Entity('courses')
export class CourseEntity extends BaseEntity {
  @Column({ type: 'text', comment: '课程标题' })
  title: string;
  
  // ⚠️ skus 不再作为 ORM 关联，需要在应用层手动查询和组装
  skus?: any[];  // 可选字段，Repository 中手动填充
}

@Entity('course_skus')
export class CourseSkuEntity extends BaseEntity {
  @Column({ type: 'text', comment: '课程ID' })
  course_id: string;  // 外键字段保留
  
  // ⚠️ 不再使用 @ManyToOne 关联
}
```

**2. Repository 手动加载**（单条记录）：
```typescript
// ✅ 正确：Repository 中手动查询和组装
@Injectable()
export class CourseRepository extends BaseRepository<CourseEntity> {
  constructor(
    private dataSource: DataSource,
    private userCtx: UserContextService,
    private courseSkuRepository: CourseSkuRepository,  // 注入关联 Repository
  ) {
    super(CourseEntity, dataSource.createEntityManager());
    this.setUserContextService(userCtx);
  }

  /**
   * 查询课程详情（包含 SKU）
   */
  async findByIdWithSkus(id: string): Promise<CourseEntity | null> {
    // 1. 查询主记录
    const course = await this.getQuery()
      .andWhere('entity.id = :id', { id })
      .getOne();
    
    if (!course) return null;
    
    // 2. 手动查询关联 SKU
    const skus = await this.courseSkuRepository
      .getQuery()
      .andWhere('entity.course_id = :courseId', { courseId: id })
      .getMany();
    
    // 3. 组装数据
    course.skus = skus;
    
    return course;
  }
}
```

**3. Repository 批量加载**（防止 N+1 查询）：
```typescript
// ✅ 正确：批量加载优化，一次查询加载所有 SKU
async findByInstitutionId(institutionId: string) {
  // 1. 查询所有课程
  const courses = await this.getQuery()
    .andWhere('entity.institution_id = :institutionId', { institutionId })
    .getMany();
  
  if (!courses || courses.length === 0) return [];
  
  // 2. 批量加载 SKU（一次查询）
  await this.loadSkusForCourses(courses);
  
  return courses;
}

/**
 * 批量加载 SKU（防止 N+1 查询）
 */
private async loadSkusForCourses(courses: CourseEntity[]) {
  if (!courses || courses.length === 0) return;
  
  // 收集所有课程 ID
  const courseIds = courses.map(c => c.id);
  
  // 一次查询获取所有 SKU
  const allSkus = await this.courseSkuRepository
    .getQuery()
    .andWhere('entity.course_id IN (:...courseIds)', { courseIds })
    .getMany();
  
  // 按 course_id 分组
  const skusByCourseId = new Map<string, any[]>();
  for (const sku of allSkus) {
    if (!skusByCourseId.has(sku.course_id)) {
      skusByCourseId.set(sku.course_id, []);
    }
    skusByCourseId.get(sku.course_id)!.push(sku);
  }
  
  // 组装到各个课程
  for (const course of courses) {
    course.skus = skusByCourseId.get(course.id) || [];
  }
}
```

**4. Service 直接查询关联表**：
```typescript
// ✅ 正确：Service 中需要 SKU 时，直接查询 SKU 表
@Injectable()
export class OrderService {
  constructor(
    private courseRepository: CourseRepository,
    private courseSkuRepository: CourseSkuRepository,  // 直接注入 SKU Repository
  ) {}

  async create(dto: CreateOrderDto) {
    // 验证课程存在
    const course = await this.courseRepository.findOneById(dto.course_id);
    if (!course) throw new NotFoundException('课程不存在');
    
    // ✅ 直接查询 SKU 表
    const sku = await this.courseSkuRepository.findOneById(dto.sku_id);
    if (!sku || sku.course_id !== dto.course_id) {
      throw new NotFoundException('SKU不存在或不属于该课程');
    }
    
    // 使用 SKU 数据创建订单...
  }
}
```

**5. Module 导出配置**：
```typescript
// ✅ 必须导出关联 Repository，供其他模块使用
@Module({
  imports: [TypeOrmModule.forFeature([CourseEntity, CourseSkuEntity])],
  providers: [CourseService, CourseRepository, CourseSkuRepository],
  controllers: [CourseController],
  exports: [CourseService, CourseRepository, CourseSkuRepository],  // ⚠️ 必须导出 SKU Repository
})
export class CourseModule {}
```

**性能对比**：
```typescript
// ❌ N+1 查询问题（逐个加载）
for (const course of courses) {
  const skus = await skuRepo.find({ course_id: course.id });  // N 次查询
  course.skus = skus;
}

// ✅ 批量加载（1 次查询）
const courseIds = courses.map(c => c.id);
const allSkus = await skuRepo.find({ course_id: In(courseIds) });  // 1 次查询
// 按 course_id 分组后分配...
```

**测试验证**：
```typescript
// Order 测试：从 2/15 提升到 12/15 (80%)
// - "SKU不存在" 错误已解决 ✅
// - 直接查询 SKU 表，验证 course_id 匹配

// Course 测试：保持 26/26 (100%)
// - 手动加载 SKU 数据正常 ✅
// - 批量加载优化生效 ✅
```

**规范总结**：
- **Entity**: 不使用 `@OneToMany`/`@ManyToOne`，关联字段标记为可选 `field?: any[]`
- **Repository**: 必须提供手动加载方法（`findByIdWithXxx`）和批量加载方法（`loadXxxForYyy`）
- **Service**: 需要关联数据时，直接注入并查询关联 Repository
- **Module**: 必须导出所有被其他模块使用的 Repository
- **性能**: 批量查询时使用 `IN` 操作符，避免 N+1 查询

**优势**：
- ✅ 显式的数据加载，易于理解和调试
- ✅ 灵活的查询优化（可选择是否加载关联）
- ✅ 避免意外的级联查询影响性能
- ✅ 更容易进行单元测试（mock Repository）

---

### 错误 15: 多租户架构中 created_by 字段未使用 owner 的 user_id ⚠️⚠️

**背景**：项目采用**多租户架构**，一个用户可以关联多个机构。

**错误现象**：
```typescript
// ❌ 错误：创建机构时不填充 created_by，或使用当前登录用户
const institution = this.institutionRepository.create({
  ...institutionData,
  audit_status: 'draft',
  // created_by 未填充或使用错误的用户ID
});
```

**业务场景问题**：
- 机构入驻时用户未登录（无 current user）
- accounts 数组中的 owner 才是机构的真正创建者
- created_by 应该记录 owner 的 user_id，而非当前请求用户

**正确写法**：

**1. DTO 校验**（accounts 必须有 owner）：
```typescript
// ✅ 在 Service 中添加校验
async create(dto: CreateInstitutionDto): Promise<string> {
  // 验证至少有一个账号
  if (!dto.accounts || dto.accounts.length === 0) {
    throw new BadRequestException('请至少提供一个管理账号');
  }

  // ⚠️ 校验：必须有一个 owner 角色
  const ownerAccount = dto.accounts.find(acc => acc.role === 'owner');
  if (!ownerAccount) {
    throw new BadRequestException('账号列表中必须包含一个 owner 角色');
  }
  
  // ... 继续处理
}
```

**2. 先创建 owner 用户**：
```typescript
// ✅ 先创建/查询 owner 用户，获取 user_id
let ownerUser = await this.userRepository.findByPhone(ownerAccount.phone);
if (!ownerUser) {
  const crypto = require('crypto');
  const uniqueId = crypto.randomUUID();
  ownerUser = this.userRepository.create({
    username: ownerAccount.phone,
    phone: ownerAccount.phone,
    nickname: ownerAccount.real_name || ownerAccount.phone,
    openid: `institution_phone_${ownerAccount.phone}_${uniqueId}`,
  });
  const savedUser = (await this.userRepository.save(ownerUser)) as any;
  ownerUser = savedUser;
}

if (!ownerUser || !ownerUser.id) {
  throw new BadRequestException(`创建 owner 用户失败: ${ownerAccount.phone}`);
}
```

**3. 使用 owner 的 user_id 填充 created_by**：
```typescript
// ✅ 创建机构时使用 owner 的 user_id
const { accounts, ...institutionData } = dto;
const institution = this.institutionRepository.create({
  ...institutionData,
  audit_status: 'draft',
  created_by: ownerUser.id, // ⚠️ 使用 owner 的 user_id
});

const saved = await this.institutionRepository.save(institution);
const institutionId = saved.id;
```

**4. 支持多租户**（一个用户可关联多个机构）：
```typescript
// ✅ 为每个账号创建或关联用户记录
for (const account of dto.accounts) {
  let user: any;
  
  // owner 已经在前面创建了，直接复用
  if (account.phone === ownerAccount.phone) {
    user = ownerUser;
  } else {
    // 查找或创建其他账号的用户
    user = await this.userRepository.findByPhone(account.phone);
    if (!user) {
      // 创建新用户...
    }
  }

  // 建立用户-机构关联（一个用户可以关联多个机构）
  const role = account.role || 'admin';
  
  // 检查该用户是否已关联此机构
  const existingRelation = await this.userInstitutionRepository.findOne({
    where: {
      user_id: user.id,
      institution_id: institutionId,
      is_delete: false,
    },
  });
  
  if (!existingRelation) {
    await this.userInstitutionRepository.addUserInstitution(
      user.id,
      institutionId,
      role,
    );
  }
}
```

**错误的限制**（多租户场景应移除）：
```typescript
// ❌ 错误：禁止用户关联多个机构
const institutions = await this.userInstitutionRepository.findInstitutionsByUserId(
  existingUser.id,
);
if (institutions.length > 0) {
  throw new BadRequestException(
    `手机号 ${account.phone} 已属于其他机构，一个用户只能属于一个机构`,
  );
}
```

**测试验证**：
```typescript
// 测试1：无 owner 角色应报错
const dataWithoutOwner = {
  accounts: [
    { phone: '13800138000', real_name: '张三', role: 'admin' }, // 无 owner
  ],
  // ...
};
await helper.post('/institution', dataWithoutOwner); 
// ✗ 应报错: "账号列表中必须包含一个 owner 角色"

// 测试2：验证 created_by 正确填充
const ownerPhone = '13800138001';
const data = {
  accounts: [
    { phone: ownerPhone, real_name: '李四', role: 'owner' },
  ],
  // ...
};
const institutionId = await helper.post('/institution', data);

// 查询数据库验证 created_by
const institution = await institutionRepository.findOneById(institutionId);
const ownerUser = await userRepository.findByPhone(ownerPhone);
expect(institution.created_by).toBe(ownerUser.id); // ✓ 应该相等

// 测试3：多租户支持
const userPhone = '13800138002';
const institution1 = await createInstitution({ 
  accounts: [{ phone: userPhone, role: 'owner' }] 
});
const institution2 = await createInstitution({ 
  accounts: [{ phone: userPhone, role: 'admin' }] 
});
// ✓ 同一用户可以关联多个机构
```

**规范总结**：
- **校验规则**：accounts 数组必须包含一个 role='owner' 的账号
- **创建顺序**：先创建 owner 用户 → 获取 user_id → 填充 created_by → 创建机构
- **多租户支持**：移除"一个用户只能属于一个机构"的限制
- **关联检查**：创建用户-机构关联前，检查是否已存在，避免重复
- **BaseEntity 兼容**：created_by 不会被 BaseRepository 自动填充（因为请求无认证），需手动设置

**优势**：
- ✅ 明确机构所有权归属（owner 的 user_id）
- ✅ 支持多租户架构（一人多机构）
- ✅ 数据审计清晰（created_by 指向真正的创建者）
- ✅ 权限控制准确（owner 权限最高）

---

### 错误 16: 浏览类接口错误地要求用户登录 ⚠️⚠️⚠️

**背景**：预约类APP的正确业务逻辑是"浏览不需要登录，下单才需要登录"。

**错误现象1 - 白名单配置错误**：
```typescript
// ❌ 错误：路由名称不匹配实际Controller
const AUTH_WHITELIST_PREFIXES = [
  '/api/institutions',   // ❌ Controller是 @Controller('institution') 单数
  '/api/courses',        // ✓ Controller是 @Controller('courses') 复数
  '/api/reviews',        // ❌ Controller是 @Controller('review') 单数
];

// ❌ 错误：使用 req.baseUrl 无法获取完整路径
const requestPath = req.baseUrl; // 可能只包含 /api，不包含具体路径
```

**错误现象2 - Service 中的权限检查**：
```typescript
// ❌ 错误：浏览课程详情也要求权限
async findOne(id: string) {
  const userId = this.userContextService.getCurrentUserId(); // ❌ 未登录会报错
  const course = await this.courseRepository.findByIdWithSkus(id);
  
  // ❌ 浏览场景不应该检查权限
  const hasInstitution = await this.userInstitutionRepository.hasInstitution(
    userId,
    course.institution_id,
  );
  if (!hasInstitution) {
    throw new ForbiddenException('无权访问该课程');
  }
  
  return course;
}
```

**正确写法**：

**1. 中间件白名单配置**：
```typescript
/**
 * 白名单路径前缀（前缀匹配）
 * ⚠️ 重要：路由名称必须与 @Controller() 装饰器中的名称完全一致
 */
const AUTH_WHITELIST_PREFIXES = [
  '/api/home',           // 首页相关
  '/api/banner',         // 轮播图
  '/api/institution',    // ✓ 机构相关 - @Controller('institution') 单数
  '/api/courses',        // ✓ 课程相关 - @Controller('courses') 复数
  '/api/review',         // ✓ 评价相关 - @Controller('review') 单数
  '/api/categories',     // ✓ 分类列表 - @Controller('categories') 复数
];

// 修正路径获取方式
async use(req: Request, res: Response, next: NextFunction) {
  // ✓ 使用 baseUrl + path 获取完整路径
  const requestPath = req.baseUrl + req.path;
  
  // 前缀匹配
  const isWhitelistPrefix = AUTH_WHITELIST_PREFIXES.some(prefix => 
    requestPath.startsWith(prefix)
  );
  if (isWhitelistPrefix) {
    return next();
  }
  
  // ... 其他逻辑
}
```

**2. Service 浏览方法去除权限检查**：
```typescript
// ✓ 正确：浏览场景不检查权限
async findOne(id: string) {
  // 查询课程详情（浏览场景，不需要登录）
  const course = await this.courseRepository.findByIdWithSkus(id);

  if (!course) {
    throw new BadRequestException('课程不存在');
  }

  // ⚠️ 浏览课程详情不需要权限检查，任何人都可以查看
  // 只有修改、删除等操作才需要验证机构成员身份

  return course;
}
```

**3. 业务逻辑区分**：
```typescript
// 浏览类接口（公开访问）：
// - GET /api/home                              首页
// - GET /api/institution/list                  机构列表
// - GET /api/institution/:id                   机构详情
// - GET /api/courses                           课程列表  
// - GET /api/courses/:id                       课程详情
// - GET /api/review/course/:courseId           课程评价
// - GET /api/review/institution/:institutionId 机构评价

// 操作类接口（需要登录）：
// - POST /api/booking                          创建预约
// - POST /api/order                            创建订单
// - POST /api/review                           发表评价
// - PUT  /api/courses/:id                      修改课程（机构成员）
// - DELETE /api/courses/:id                    删除课程（机构成员）
```

**测试验证**：
```bash
# 测试浏览类接口（无需登录）
curl -X GET http://localhost:8888/api/home
curl -X GET http://localhost:8888/api/institution/list?page=1&pageSize=5
curl -X GET http://localhost:8888/api/institution/271113110184529920
curl -X GET http://localhost:8888/api/courses?page=1&pageSize=5
curl -X GET http://localhost:8888/api/courses/270901054424485888
curl -X GET http://localhost:8888/api/review/course/270901054424485888

# 所有请求应返回 {"code":200, ...} 而不是 {"code":401, "message":"未提供认证令牌"}
```

**规范总结**：
- **白名单配置**：路由名称必须与 `@Controller()` 中的名称完全一致（注意单复数）
- **路径获取**：使用 `req.baseUrl + req.path` 获取完整路径，而非 `req.baseUrl`
- **权限检查**：浏览类方法（findOne, findAll）不应检查用户权限
- **业务区分**：查询类接口公开，修改类接口需要权限，下单类接口需要登录
- **测试覆盖**：确保所有浏览类接口都可以无需 token 访问

**优势**：
- ✅ 符合预约类APP的用户体验（浏览自由，下单才登录）
- ✅ 降低用户门槛，提升转化率
- ✅ SEO友好（搜索引擎可以抓取公开内容）
- ✅ 权限控制精确（该公开的公开，该保护的保护）

---

### 错误 17: Auth 白名单不区分 HTTP 方法 ⚠️⚠️⚠️

**背景**：预约类APP需要"浏览公开、操作需登录"的策略，白名单必须精确区分 GET/POST/PUT/DELETE。

**错误现象1 - 正则过于宽泛**：
```typescript
// ❌ 错误：所有 HTTP 方法都匹配
const AUTH_WHITELIST_PATTERNS: RegExp[] = [
  /^\/api\/courses\/[^\/]+\/?$/,         // ❌ 匹配 GET、POST、PUT、DELETE 全部！
  /^\/api\/institution\/[^\/]+\/?$/,     // ❌ 删除机构也不需要登录了
];

// 结果：DELETE /api/institution/:id 绕过认证
// 错误信息：No user context found. User must be authenticated.
```

**错误现象2 - 缺乏方法过滤**：
```typescript
// ❌ 错误：只能基于路径，无法限制方法
async use(req: Request, res: Response, next: NextFunction) {
  const requestPath = req.baseUrl + req.path;
  
  const isWhitelisted = AUTH_WHITELIST_PATTERNS.some(pattern => 
    pattern.test(requestPath)  // ❌ 无法判断是 GET 还是 DELETE
  );
  
  if (isWhitelisted) {
    return next();  // ❌ DELETE 请求也放行了！
  }
}
```

**正确写法**：

**1. 白名单规则支持方法过滤**：
```typescript
/**
 * 白名单配置：{ pattern: 正则表达式, methods?: 允许的HTTP方法列表 }
 * - 如果不指定 methods，则所有 HTTP 方法都放行
 * - 如果指定 methods，只有匹配的方法才放行
 */
const AUTH_WHITELIST_RULES: Array<{ pattern: RegExp; methods?: string[] }> = [
  // ==================== 认证相关（所有方法） ====================
  { pattern: /^\/api\/auth\/wechat-login\/?$/ },
  { pattern: /^\/api\/auth\/phone-login\/?$/ },
  
  // ==================== 机构相关 ====================
  { pattern: /^\/api\/institution\/?$/ },                // POST入驻、GET列表 - 都公开
  { pattern: /^\/api\/institution\/[^\/]+\/?$/, methods: ['GET'] }, // ✅ 仅GET详情公开
  
  // ==================== 课程相关 ====================
  { pattern: /^\/api\/courses\/[^\/]+\/?$/, methods: ['GET'] },     // ✅ 仅GET详情公开
  
  // ==================== 浏览类接口（所有方法） ====================
  { pattern: /^\/api\/home(\/.*)?\/?$/ },
  { pattern: /^\/api\/banner(\/.*)?\/?$/ },
  { pattern: /^\/api\/review(\/.*)?\/?$/ },
];
```

**2. 中间件检查方法匹配**：
```typescript
async use(req: Request, res: Response, next: NextFunction) {
  const requestPath = req.baseUrl + req.path;
  const requestMethod = req.method.toUpperCase(); // ✅ 获取 HTTP 方法
  
  // ✅ 检查路径和方法双重匹配
  const isWhitelisted = AUTH_WHITELIST_RULES.some(rule => {
    // 先检查路径是否匹配
    if (!rule.pattern.test(requestPath)) {
      return false;
    }
    // 如果指定了方法限制，检查方法是否匹配
    if (rule.methods && rule.methods.length > 0) {
      return rule.methods.includes(requestMethod);
    }
    // 未指定方法限制，所有方法都放行
    return true;
  });
  
  if (isWhitelisted) {
    return next();
  }
  
  // 需要认证...
}
```

**3. 业务场景对应**：
```typescript
// ✅ 正确：区分浏览和操作
GET    /api/institution/:id       → 公开（白名单，methods: ['GET']）
PUT    /api/institution/:id       → 需要登录（不在白名单）
DELETE /api/institution/:id       → 需要登录（不在白名单）

GET    /api/courses/:id           → 公开（白名单，methods: ['GET']）
POST   /api/courses               → 需要登录（不在白名单）
PUT    /api/courses/:id           → 需要登录（不在白名单）
DELETE /api/courses/:id           → 需要登录（不在白名单）

POST   /api/institution           → 公开（入驻申请，白名单不限制方法）
GET    /api/institution           → 公开（机构列表，白名单不限制方法）
```

**测试验证**：
```bash
# ✅ GET 请求应该公开
curl -X GET http://localhost:8888/api/institution/123456
# → {"code":200, ...}

# ✅ DELETE 请求需要登录
curl -X DELETE http://localhost:8888/api/institution/123456
# → {"code":401, "message":"未提供认证令牌"}

# ✅ GET 课程详情公开
curl -X GET http://localhost:8888/api/courses/123456
# → {"code":200, ...}

# ✅ POST 课程需要登录
curl -X POST http://localhost:8888/api/courses -d '{...}'
# → {"code":401, "message":"未提供认证令牌"}
```

**规范总结**：
- **白名单结构**：使用 `{ pattern: RegExp, methods?: string[] }` 格式
- **方法限制**：浏览类接口必须指定 `methods: ['GET']`
- **全方法放行**：认证类、入驻类接口不指定 `methods`（或 `methods: undefined`）
- **中间件实现**：同时检查 `requestPath` 和 `requestMethod` 双重匹配
- **测试覆盖**：分别测试 GET（应公开）和 POST/PUT/DELETE（应需要登录）

**常见错误检测**：
- ❌ 正则匹配 `/api/xxx/:id` 但未限制方法 → DELETE 也能绕过认证
- ❌ 测试时只用 GET 请求 → 没发现 DELETE 可以绕过
- ❌ "No user context found" 错误 → 可能是白名单过于宽泛

**优势**：
- ✅ 精确控制：GET 公开、POST/PUT/DELETE 需登录
- ✅ 符合预约类APP业务逻辑（浏览自由、操作需权限）
- ✅ 安全性提升：操作类接口必须认证
- ✅ 可维护性好：白名单规则清晰易懂

---

### 错误 18: 接口修改后未维护测试用例 ⚠️⚠️⚠️

**核心规则**：**对于每次的接口修改，都需要在对应模块的测试用例里面维护测试用例**

**执行要求**：
1. 任何后端接口的修改（新增、删除、修改逻辑），必须同步更新对应模块的测试文件
2. 测试用例应覆盖：
   - 新功能的正向测试
   - 边界条件测试
   - 错误场景测试
3. 修改完成后，直接运行 `run-all-tests.ts` 验证

**强制流程**：
```bash
# 1. 修改接口代码
# 2. 更新对应测试文件 tests/xxx.test.ts
# 3. 运行全部测试
cd interest-class-server && npx ts-node tests/run-all-tests.ts
```

**常见错误场景**：

| 修改类型 | 必须添加的测试 |
|---------|---------------|
| 新增接口 | 正向测试 + 参数校验测试 |
| 修改接口逻辑 | 覆盖修改点的测试 |
| 修改权限控制 | 有权限/无权限两种场景 |
| 浏览类接口 | 无登录访问测试 |

**错误示例**：
```typescript
// ❌ 错误：修改了 findOne 逻辑但未更新测试
// teacher.service.ts 移除了权限检查
// 但 teacher.test.ts 中没有添加无登录访问的测试用例
```

**正确示例**：
```typescript
// ✅ 正确：同步维护测试用例
// 1. teacher.service.ts 移除了 findOne 的权限检查
// 2. teacher.test.ts 添加：
async function testGetTeacherWithoutAuth() {
  const helper = new TestHelper(); // 无 token
  const teacher = await helper.get(`/teacher/${teacherId}`);
  if (!teacher.id) throw new Error('未登录应能查看教师详情');
  logger.success('✓ 无登录查询教师详情测试通过');
}
```

**优势**：
- ✅ 确保修改不破坏原有功能（回归测试）
- ✅ 验证新功能正确性
- ✅ 文档化接口行为（测试即文档）
- ✅ 持续集成保障

---

### 错误 19: 机构 location 字段未自动更新 ⚠️⚠️

**背景**：机构表使用 PostGIS 的 `geography` 类型存储位置信息，用于距离排序和附近搜索。

**错误现象**：
```typescript
// ❌ 错误：创建/更新机构时只保存 latitude 和 longitude，没有同步更新 location 字段
const institution = this.institutionRepository.create({
  ...dto,
  latitude: dto.latitude,
  longitude: dto.longitude,
  // location 字段没有设置！
});
await this.institutionRepository.save(institution);
```

**问题结果**：
- 机构有 `latitude` 和 `longitude` 值
- 但 `location` 字段为 NULL
- 首页查询使用 `WHERE location IS NOT NULL` 条件
- 导致机构不会出现在列表中

**正确写法**：
```typescript
// ✅ 正确：在 create/update 后手动更新 location 字段
// InstitutionService 中添加私有方法
private async updateLocationField(
  institutionId: string,
  latitude?: number,
  longitude?: number,
): Promise<void> {
  if (latitude && longitude) {
    await this.dataSource.query(
      `UPDATE institutions 
       SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
       WHERE id = $3`,
      [longitude, latitude, institutionId], // 注意：PostGIS 是 lng, lat 顺序
    );
  }
}

// 在 create 方法末尾调用
await this.updateLocationField(institutionId, dto.latitude, dto.longitude);

// 在 update 方法中调用（需要合并原有值）
const updatedLatitude = dto.latitude ?? institution.latitude;
const updatedLongitude = dto.longitude ?? institution.longitude;
await this.updateLocationField(id, updatedLatitude, updatedLongitude);
```

**PostGIS 关键点**：
- `ST_MakePoint(lng, lat)` - **经度在前，纬度在后**
- `ST_SetSRID(..., 4326)` - 使用 WGS84 坐标系（GPS标准）
- `::geography` - 转换为地理类型，支持米为单位的距离计算

**修复已有数据**：
```sql
UPDATE institutions 
SET location = ST_SetSRID(ST_MakePoint(longitude::float, latitude::float), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;
```

**规范总结**：
- 机构创建/更新时，必须同步更新 `location` 字段
- 不依赖数据库触发器，在应用层显式处理
- PostGIS 函数参数顺序：**经度在前，纬度在后**

---

### 错误 20: Auth 白名单使用 `[^\/]+` 匹配 ID 导致匹配非 ID 路由 ⚠️⚠️⚠️

**背景**：白名单需要放行 `/api/institution/:id` 等详情页，但不应匹配 `/api/institution/current`、`/api/institution/my` 等需要认证的路由。

**错误现象**：
```typescript
// ❌ 错误：[^\/]+ 会匹配任何非斜杠字符，包括 current, my, stats
const AUTH_WHITELIST_RULES = [
  { pattern: /^\/api\/institution\/[^\/]+\/?$/, methods: ['GET'] },
];

// 结果：/api/institution/current 被错误地放行，跳过认证
// 导致 userContextService.get('institutionId') 返回 undefined
```

**问题结果**：
- `/api/institution/current` 返回 `{"code":400,"message":"未找到机构信息"}`
- 原因：请求被白名单放行，中间件跳过了 JWT 解析，CLS 上下文未设置
- JWT token 中明确包含 `institutionId`，但未被提取到上下文

**正确写法**：
```typescript
// ✅ 正确：使用 \d+ 只匹配纯数字 ID（雪花ID）
const AUTH_WHITELIST_RULES = [
  // 机构公开接口
  { pattern: /^\/api\/institution\/?$/ },             // 列表
  { pattern: /^\/api\/institution\/list\/?$/, methods: ['GET'] },
  { pattern: /^\/api\/institution\/nearby\/?$/, methods: ['GET'] },
  { pattern: /^\/api\/institution\/\d+\/?$/, methods: ['GET'] }, // ✅ 只匹配数字ID
  
  // 课程公开接口
  { pattern: /^\/api\/courses\/?$/, methods: ['GET'] },
  { pattern: /^\/api\/courses\/\d+\/?$/, methods: ['GET'] }, // ✅ 只匹配数字ID
  
  // 教师公开接口
  { pattern: /^\/api\/teacher\/?$/, methods: ['GET'] },
  { pattern: /^\/api\/teacher\/\d+\/?$/, methods: ['GET'] }, // ✅ 只匹配数字ID
];
```

**验证测试**：
```javascript
const patterns = [
  /^\/api\/institution\/[^\/]+\/?$/, // ❌ 错误：匹配 current
  /^\/api\/institution\/\d+\/?$/,    // ✅ 正确：不匹配 current
];

const testPaths = [
  '/api/institution/current',           // 应该不匹配（需要认证）
  '/api/institution/my',                // 应该不匹配（需要认证）
  '/api/institution/275909964432674816', // 应该匹配（公开详情）
];

patterns.forEach((p, i) => {
  console.log(`Pattern ${i}:`);
  testPaths.forEach(path => {
    console.log(`  ${path} => ${p.test(path)}`);
  });
});
// Pattern 0 (错误):  current => true, my => true
// Pattern 1 (正确):  current => false, my => false
```

**规范总结**：
- **使用 `\d+` 匹配 ID**：雪花 ID 是纯数字，用 `\d+` 精确匹配
- **禁止使用 `[^\/]+`**：会匹配任意字符串，包括路由名如 current, my, stats
- **需要认证的路由**：`/current`, `/my`, `/stats`, `/admin/*` 等
- **可以公开的路由**：`/list`, `/nearby`, `/search/*`, `/:id`（纯数字）

**检测方法**：
- 如果 `userContextService.get('xxx')` 返回 undefined，先检查白名单是否误匹配
- 使用正则调试工具验证路由匹配结果

---

### 错误 48: 邀友返现基数错误地使用 paid_amount（含佣金）而非 original_price ⚠️⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：createInviteOrderIfNeeded 使用含佣金的 paid_amount 作为返现基数
await this.inviteService.createInviteOrder({
  order_amount: Number(order.paid_amount),  // ¥1040 = 原价¥1000 - 立减¥60 + 佣金¥100
  cashback_ratio: Number(course.cashback_ratio),
  // ...
});
// 结果：cashback_total = ¥1040 × 10% = ¥104（应为 ¥100）
// 邀请人每课解锁 ¥10.40（应为 ¥10.00）
// invite_order 中 discount_amount 记录为 ¥62.40（应为 ¥60.00）
```

**根本原因**：
- `paid_amount` = 线上实付 + 线下实付 = (推广费基础 - 立减 + **佣金**) + 线下实付
- 平台佣金属于平台收入，不应参与返现金额的计算
- 返现比例（如 10%）是基于课程**原价**设计的，佣金已从支付结构中分离

**正确写法**：
```typescript
// ✅ 正确：使用 original_price（课程原价）作为返现基数，不含佣金
await this.inviteService.createInviteOrder({
  // 返现基数使用课程原价，不含平台佣金；佣金按课程进度在退款中单独处理
  order_amount: Number(order.original_price),  // ¥1000（不含佣金）
  cashback_ratio: Number(course.cashback_ratio),
  // ...
});
// 结果：cashback_total = ¥1000 × 10% = ¥100 ✓
// 邀请人每课解锁 ¥10.00 ✓
// invite_order 中 discount_amount 记录为 ¥60.00 ✓（与实际立减一致）
```

**退款中佣金的处理**：
- 佣金（`commission_amount`）已嵌入 `online_pay_amount` 中存储
- 退款时 `online_refund_amount = online_pay_amount × remaining_ratio` 自然包含佣金的按比例退还
- 例：线上实付 ¥140（推广费¥100 - 立减¥60 + 佣金¥100），退 3/4 = ¥105（含佣金退还 ¥75）
- **无需对退款逻辑做任何修改**，现有实现已正确处理

**返现金额体系（修正后）**：
```
课程原价 ¥1000
  × cashback_ratio 10%
  = 返现总池 ¥100
    × share_ratio 60%  → 买家立减 ¥60（与实际立减完全一致）
    × (1 - share_ratio) 40% → 邀请人总收益 ¥40
      ÷ total_lessons 4  = 每课解锁 ¥10

paid_amount ¥1040 = (¥100推广费 - ¥60立减 + ¥100佣金) + ¥900线下
  → 退款时按课程进度，佣金部分按比例归还，与返现计算完全分离
```

**规范**：
- `createInviteOrderIfNeeded` 中必须使用 `order.original_price` 而非 `order.paid_amount`
- `calculateDiscount` 接口从前端接收 `order_amount` 时，前端应传课程 SKU 价格（original_price），不含佣金
- 佣金对返现计算透明，对退款计算自动生效

---



在生成新模块时，请检查以下内容：

- [ ] 模块导入路径正确（`@/modules/xxx` 而非 `@/xxx`）
- [ ] Repository 中实现了所有 Service 需要的查询方法
- [ ] 复杂查询使用 QueryBuilder + getManyAndCount，不传给 paginate
- [ ] Module 正确导出了 Service 和 Repository
- [ ] **CommonModule 必须导出 UserContextService** ⭐
- [ ] Entity 指定了正确的表名（snake_case）
- [ ] 关联查询使用了正确的别名（entity.xxx）
- [ ] DTO 导入了所有验证装饰器
- [ ] Repository 构造函数中调用了 `setUserContextService()`
- [ ] **DELETE 语句使用 .from() 而非别名** ⭐
- [ ] **权限检查使用关联表而非 created_by（多对多场景）** ⭐
- [ ] **所有列表接口支持分页兼容模式（可选page/pageSize参数）** ⭐
- [ ] **DTO中不设置page/pageSize默认值** ⭐
- [ ] **测试用例覆盖分页和不分页两种场景** ⭐
- [ ] **getQuery() 后必须使用 andWhere，禁止使用 where** ⭐⭐
- [ ] **不使用 ORM 关联装饰器，所有关联数据在应用层手动加载** ⭐⭐⭐
- [ ] **Repository 提供批量加载方法，避免 N+1 查询** ⭐⭐⭐
- [ ] **多租户场景：accounts 必须有 owner，created_by 使用 owner 的 user_id** ⭐⭐⭐
- [ ] **浏览类接口（列表、详情）不需要登录，白名单路由名称与 @Controller() 完全匹配** ⭐⭐⭐
- [ ] **Auth 白名单必须区分 HTTP 方法（GET 公开，POST/PUT/DELETE 需登录）** ⭐⭐⭐
- [ ] **Auth 白名单使用 `\d+` 匹配 ID，禁止使用 `[^\/]+`** ⭐⭐⭐
- [ ] **接口修改必须同步更新对应模块的测试用例** ⭐⭐⭐
- [ ] **修改完成后运行 run-all-tests.ts 验证** ⭐⭐⭐
- [ ] **课程上架前必须有排课，未上架课程不显示在C端列表** ⭐⭐⭐
- [ ] **机构创建/更新时必须同步更新 PostGIS location 字段** ⭐⭐⭐
- [ ] **前端字段名必须与后端 DTO 字段名完全一致，以后端为准** ⭐⭐⭐
- [ ] **非原生 tabBar 页面禁止调用 uni.hideTabBar，CustomTabbar 中按条件判断** ⭐⭐
- [ ] **后端 update() 方法必须分离子表字段（honors/showcases/teachers/accounts）再更新实体** ⭐⭐⭐
- [ ] **距离计算统一使用 distance_km() 数据库函数，禁止直接写 ST_Distance/1000.0** ⭐⭐⭐
- [ ] **前端提交数据必须白名单方式逐字段构造，禁止 ...form 展开或黑名单排除** ⭐⭐⭐
- [ ] **booked_count 必须在创建时 +1，在拒绝/取消/退款时 -1（使用 GREATEST 防负数）** ⭐⭐⭐
- [ ] **余额扣减、库存扣减等并发操作必须用原子 UPDATE ... RETURNING，禁止先读后写** ⭐⭐⭐
- [ ] **下单扣 SKU 库存，取消/退款/超时关闭必须归还 SKU 库存（restoreSkuStock 成对出现）** ⭐⭐⭐
- [ ] **退款申请时必须记录 refund_applied_at，并有 48h 自动审批定时任务** ⭐⭐
- [ ] **评价创建后必须更新 order.is_reviewed = true，且必须防重复评价** ⭐⭐
- [ ] **课表页面只加载 confirmed + pending_change，历史记录页加载 completed/cancelled/rejected** ⭐⭐
- [ ] **退款/取消/超时订单必须同步调用 cancelInviteOrder（三处：processRefund、cancel、handleExpiredOrders）** ⭐⭐⭐
- [ ] **微信退款异步回调 handleRefundNotify SUCCESS 分支必须补全所有副作用（余额归还、预约取消、库存归还、cancelInviteOrder）** ⭐⭐⭐
- [ ] **管理端必须有机构冻结/解冻端点（PUT /admin/institutions/:id/freeze|unfreeze）** ⭐⭐
- [ ] **提现 approved 状态必须有补偿定时任务（InviteTasksService EVERY_10_MINUTES）防止卡单** ⭐⭐⭐

---

### 错误 37: 签到/课时更新使用快照值而非原子增量 ⚠️⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：先读取 completed_lessons，再 SET completed_lessons = $snapshot
const order = await repo.findOneById(orderId); // 读取快照
order.completed_lessons = order.completed_lessons + 1;
await dataSource.query(
  `UPDATE orders SET completed_lessons = $1 WHERE id = $2`,
  [order.completed_lessons, orderId], // ← 并发时会丢失更新
);
// 同时若 completed_lessons 已达 total_lessons，再单独 UPDATE status
```

**并发问题**：两个并发签到请求同时读取 `completed_lessons=4`，各自 +1 写入 5，实际只计了一次。

**正确写法**（原子 SQL + 条件 RETURNING）：
```typescript
const result = await dataSource.query(
  `UPDATE orders
   SET
     completed_lessons = completed_lessons + 1,
     status = CASE
       WHEN completed_lessons + 1 >= total_lessons THEN 'completed'
       ELSE status
     END,
     completed_at = CASE
       WHEN completed_lessons + 1 >= total_lessons THEN NOW()
       ELSE completed_at
     END,
     updated_at = NOW()
   WHERE id = $1
     AND completed_lessons < total_lessons
     AND is_delete = false
   RETURNING completed_lessons, total_lessons`,
  [orderId],
);
if (!result[0]?.length) throw new BadRequestException('课时已用完');
```

**规范**：
- 所有计数器增量（课时、销量、使用次数）必须用 `SET col = col + 1` 原子 SQL
- WHERE 子句加 `col < max` 做边界保护，0 行返回表示已到上限
- 禁止先读取快照再 SET 绝对值

---

### 错误 38: 微信支付回调未使用 CAS 导致并发重复处理 ⚠️⚠️⚠️

**背景**：微信支付/退款回调可能因网络抖动被重复推送（2-5 次），需保证幂等。

**错误现象**：
```typescript
// ❌ 错误：先检查状态再保存 —— 两次并发回调均通过 status='pending' 检查
if (order.status !== 'pending') return { success: true };
order.status = 'confirmed';
order.transaction_no = transactionId;
await this.orderRepository.save(order); // 两次并发各自保存，副作用执行两次
// 结果：销量计两次、返现创建两次、预约确认两次...
```

**正确写法**（CAS UPDATE … WHERE status='pending' RETURNING）：
```typescript
const casResult = await this.dataSource.query(
  `UPDATE orders
   SET status = $1, transaction_no = $2, paid_at = NOW()
   WHERE order_no = $3 AND status = 'pending' AND is_delete = false
   RETURNING id`,
  [newStatus, transactionId, orderNo],
);
if (!casResult[0]?.length) {
  return { success: true, message: '订单已处理（幂等）' }; // 第 2..N 次回调静默返回
}
// 只有第 1 次 CAS 成功才执行副作用
await incrementSalesCount(courseId);
await createInviteOrderIfNeeded(order);
```

**规范**：
- 所有外部系统回调（支付/退款/退款通知）必须使用 CAS（Compare-And-Swap）UPDATE
- CAS 条件：`WHERE … AND status = '期望旧状态'`，保证只有一次状态机跃迁成功
- 副作用（销量、邀请、通知）必须在 CAS 成功后才执行

---

### 错误 39: 支付回调/退款回调缺少签名验证 ⚠️⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：退款回调路径跳过了签名验证
async handleRefundNotify(body: any, headers: any) {
  if (this.config.testMode) { ... }
  // else 分支直接解密数据，未调用 verifyNotifySignature！
  const resource = body.resource;
  const decryptedData = this.decryptResource(resource);
}

// ❌ 另一个错误：证书未配置时在生产环境直接 return true
if (!this.config.platformCert) {
  return true; // 生产环境无证书时也当验证通过 → 任意伪造数据可入库
}
```

**正确写法**：
```typescript
// 退款回调必须先验签
const isValid = this.verifyNotifySignature(body, headers);
if (!isValid) throw new BadRequestException('退款回调签名验证失败');

// verifyNotifySignature：无证书时区分 testMode
if (!this.config.platformCert) {
  if (this.config.testMode) {
    this.logger.warn('跳过签名验证（仅测试模式）');
    return true;
  }
  this.logger.error('生产环境未配置平台证书，签名验证失败');
  return false; // ← 生产环境必须失败
}
```

**规范**：
- 所有来自微信的回调（支付、退款）必须在数据处理前先验签
- `verifyNotifySignature()` 必须在生产环境无证书时返回 `false`，不允许跳过
- testMode 豁免仅限 `ENV=development` 环境

---

### 错误 40: processRefund 将 WeChat HTTP 调用包裹在 @Transactional() 内 ⚠️⚠️⚠️

**背景**：`@Transactional()` 会持有数据库连接直到方法返回。若方法内包含网络 I/O（HTTP），连接将在整个 HTTP 等待期间被占用，高并发下会耗尽连接池导致服务不可用。

**错误现象**：
```typescript
@Transactional()  // ← DB 连接在整个方法期间被持有
async processRefund(id: string, approved: boolean): Promise<void> {
  const order = await repo.findOneById(id);
  order.status = 'refunding';
  // ... 其他 DB 操作 ...
  const refundResult = await this.paymentService.createRefund(order, amount); // ← HTTP 调用！
  // 微信超时 30s → DB 连接占用 30s
  order.status = 'refunded';
  await repo.save(order);
}
```

**正确写法**（三阶段拆分）：
```typescript
// ❌ 移除 @Transactional() 装饰器
async processRefund(id, approved, reason) {
  // Phase-1（快速事务）: CAS refund_pending → refunding
  const cas = await dataSource.query(
    `UPDATE orders SET status='refunding', ... WHERE id=$1 AND status='refund_pending' RETURNING id`,
    [id],
  );
  if (!cas[0]?.length) throw new BadRequestException('状态已变更，请刷新重试');

  // Phase-2（无事务）: WeChat HTTP — DB 连接已归还
  const refundResult = await paymentService.createRefund(freshOrder, amount);
  if (!refundResult.success) {
    // 回滚 CAS
    await dataSource.query(`UPDATE orders SET status='refund_pending' WHERE id=$1`, [id]);
    throw new BadRequestException(refundResult.message);
  }

  // Phase-3（快速事务）: refunding → refunded + 副作用
  await _finalizeApprovedRefund(id, order, wechatRefundId);
}
```

**规范**：
- **含 HTTP 的方法禁止加 `@Transactional()`**
- 拆分为：快速事务（CAS）→ HTTP → 快速事务（收尾）
- HTTP 失败时必须回滚 CAS，避免订单卡在中间状态

---

### 错误 41: getOrCreate 非原子写入导致并发重复记录 ⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：先查询后创建，并发时两个请求均通过"不存在"检查
async getOrCreate(userId: string) {
  let record = await this.findByUserId(userId); // 两个并发请求都读到 null
  if (!record) {
    record = this.create({ user_id: userId, ... });
    await this.save(record); // 两个并发均执行，产生重复行
  }
  return record;
}
```

**正确写法**（INSERT ON CONFLICT DO NOTHING）：
```typescript
// ✅ 需先创建部分唯一索引（见 migrations/add-user-balances-unique-constraint.sql）
// CREATE UNIQUE INDEX ux_user_balances_user_id_active ON user_balances(user_id) WHERE is_delete=false;

async getOrCreate(userId: string) {
  await this.dataSource.query(
    `INSERT INTO user_balances (id, user_id, balance, ...)
     VALUES ($1, $2, 0, ...)
     ON CONFLICT (user_id) WHERE is_delete = false DO NOTHING`,
    [generateSnowflakeId(), userId],
  );
  return this.findByUserId(userId);
}
```

**规范**：
- 所有"查无则建"场景必须用 `INSERT … ON CONFLICT DO NOTHING`
- 需要在数据库层保证唯一性（部分唯一索引或唯一约束）
- 如果表无法添加约束，使用 advisory lock 或 `SERIALIZABLE` 事务

---

### 错误 42: 计数器更新非原子导致并发下计数丢失 ⚠️⚠️

**错误现象**（incrementUseCount 举例）：
```typescript
// ❌ 错误：读取 inviteCode.daily_use_count，应用层 +1，再写回
const inviteCode = await repo.findOneById(id); // 并发时读到相同旧值
await repo.update(id, {
  daily_use_count: inviteCode.daily_use_count + 1, // 两个并发同时 +1 → 只加了 1 次
});
```

**正确写法**（含日重置逻辑的原子 SQL）：
```typescript
await dataSource.query(
  `UPDATE user_invite_codes
   SET
     use_count       = use_count + 1,
     daily_use_count = CASE
       WHEN daily_use_reset_at IS NULL OR daily_use_reset_at < $1
       THEN 1
       ELSE daily_use_count + 1
     END,
     daily_use_reset_at = NOW(),
     updated_at         = NOW()
   WHERE id = $2 AND is_delete = false`,
  [todayMidnight, id],
);
```

**规范**：
- 所有需要"带条件重置"的计数器都应在 SQL 中用 `CASE WHEN` 表达
- 禁止读取计数器值后在应用层做计算再写回

---

### 错误 43: 金额计算使用浮点数运算 ⚠️⚠️

**背景**：IEEE 754 浮点数在十进制小数运算中存在精度误差。

**错误现象**：
```typescript
// ❌ 错误：直接用浮点乘法
const cashback = order.paid_amount * 0.1; // 0.30000000000000004
const refund = online_paid + use_balance;  // 浮点累加误差
```

**正确写法**（使用 MoneyMath 整数分运算）：
```typescript
import { MoneyMath } from '@/common/utils/money.util';

// 元 → 分 → 计算 → 分 → 元
const cashbackFen = MoneyMath.percentOfFen(MoneyMath.yuan2fen(order.paid_amount), 10);
const cashback = MoneyMath.fen2yuan(cashbackFen); // 精确

const refundFen = MoneyMath.yuan2fen(online_paid) + MoneyMath.yuan2fen(use_balance);
const refund = MoneyMath.fen2yuan(refundFen);
```

**规范**：
- 所有金额乘法（百分比、分成）必须走 `MoneyMath.percentOfFen()` / `MoneyMath.ratioOfFen()`
- 多个金额相加使用 `MoneyMath.addYuan(a, b, c)` 而非直接 `a + b + c`
- `MoneyMath` 位于 `src/common/utils/money.util.ts`

---

### 错误 44: 超时订单处理循环无事务包裹，中途失败造成数据不一致 ⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：逐步执行，任意步骤抛出异常后后续步骤跳过
order.status = 'cancelled';
await repo.save(order);       // ← 订单已标记为 cancelled
await cancelBookings(bid);    // ← 此处抛出，预约未取消
await restoreSkuStock(skuId); // ← 未执行，库存未归还
```

**正确写法**（关键 DB 操作用 dataSource.transaction 包裹 + HTTP 在外）：
```typescript
// HTTP（关闭微信订单）在事务外执行，避免占用 DB 连接
const closeResult = await paymentService.closeWechatOrder(order.order_no);
if (!closeResult.canCancelOrder) { skipped++; continue; }

// DB 操作：CAS 状态更新 + 余额归还 放在同一事务
await dataSource.transaction(async () => {
  const cas = await dataSource.query(
    `UPDATE orders SET status='cancelled', cancelled_at=NOW()
     WHERE id=$1 AND status='pending' RETURNING id`,
    [order.id],
  );
  if (!cas[0]?.length) return; // 已被并发处理
  if (balance > 0) {
    await dataSource.query(
      `UPDATE user_balances SET balance=balance+$1 WHERE user_id=$2 AND is_delete=false`,
      [balance, userId],
    );
  }
});

// 副作用（容忍单项失败）
await cancelBookings(...);
await restoreSkuStock(...);
```

**规范**：
- 定时任务循环内，每条记录的 DB 操作必须独立事务，防止一条失败回滚影响其他
- HTTP 调用（关闭微信订单、发起退款）必须在事务外执行
- 使用 CAS（WHERE status='期望状态'）防止并发重复处理

---

### 错误 21: 前端字段名与后端 DTO 不一致 ⚠️⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：前端使用了后端不存在的字段名
const updateData = {
  teaching_environment: formData.value.teaching_environment,  // 后端无此字段
  honor_moments: formData.value.honor_moments,                // 后端使用 honors（子表）
  student_showcase: formData.value.student_showcase,           // 后端使用 showcases（子表）
}
```

**错误信息**：
```
property teaching_environment should not exist, property honor_moments should not exist, property student_showcase should not exist
```

**正确写法**：
```typescript
// ✅ 正确：字段名与后端 DTO 完全一致
const updateData = {
  honors: honorImages.value.map((url, i) => ({
    title: '',
    img_url: url,
    sort_order: i,
  })),
  showcases: [
    ...teachingEnvImages.value.map((url, i) => ({
      img_url: url,
      type: 'classroom' as const,
      sort_order: i,
    })),
    ...studentImages.value.map((url, i) => ({
      img_url: url,
      type: 'student_work' as const,
      sort_order: i + 100,
    })),
  ],
}
```

**规范**：
- **以后端 DTO 为准**：前端字段名必须与后端 CreateDto/UpdateDto 的字段名完全一致
- **子表数据**：后端使用子表（如 institution_honors、institution_showcases）的字段是对象数组，前端不能用字符串数组
- **新建前端字段前先查后端**：在 api 类型定义中添加字段前，必须先确认后端 DTO 中存在该字段
- **数据转换**：前端 FileUpload 组件使用 string[]，提交时需转换为后端期望的对象数组格式

---

### 错误 22: 非 tabBar 页面调用 uni.hideTabBar 报错 ⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：在非原生 tabBar 页面调用 hideTabBar
onShow(() => {
  uni.hideTabBar({ animation: false })  // 机构中心、教师页面不是 tabBar 页面！
})
```

**错误信息**：
```
MiniProgramError: hideTabBar:fail not TabBar page
```

**❌ 错误的修复方式（try-catch 是自欺欺人）**：
```typescript
// ❌ 自欺欺人：uni.hideTabBar 使用异步回调报错，try-catch 根本捕获不到！
onShow(() => {
  try {
    uni.hideTabBar({ animation: false })
  } catch (e) {
    // 实际上这里永远不会执行
  }
})
```

**✅ 正确的根本修复**：

**1. 非 tabBar 页面不要调用 hideTabBar**（教师页面、机构中心等）：
```typescript
// ✅ 正确：非 tabBar 页面根本不需要调用 hideTabBar
// 因为这些页面本来就没有原生 tabBar，不需要隐藏
// 直接删除 onShow 中的 hideTabBar 调用即可
```

**2. CustomTabbar 组件中按条件调用**：
```typescript
// ✅ 正确：只在原生 tabBar 页面才调用 hideTabBar
const NATIVE_TAB_PATHS = ['/pages/index/index', '/pages/schedule/index', '/pages/mine/index']

onMounted(() => {
  const pages = getCurrentPages()
  if (pages.length > 0) {
    const path = '/' + pages[pages.length - 1].route
    if (NATIVE_TAB_PATHS.includes(path)) {
      uni.hideTabBar({ animation: false })
    }
  }
})
```

**根因分析**：
- `uni.hideTabBar()` 只能在 pages.json 中 `tabBar.list` 声明的页面调用
- 非 tabBar 页面（机构中心、教师课表等）本来就不显示原生 tabBar，无需隐藏
- `uni.hideTabBar` 的错误是通过异步回调（`fail` 回调）报告的，同步 try-catch 无法捕获
- **正确方案是不在非 tabBar 页面调用**，而不是试图吞掉错误

---

### 错误 23: 后端 update 方法未分离子表字段导致 TypeORM 报错 ⚠️⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：DTO 包含子表字段（honors, showcases, teachers），直接传给 repository.update()
async update(id: string, dto: UpdateInstitutionDto): Promise<void> {
  // ...
  await this.institutionRepository.update(id, dto);  // ❌ dto 中有 honors/showcases 等非实体列
  // ...
}
```

**错误信息**：
```
Property "honors" was not found in "InstitutionEntity"
```

**正确写法**：
```typescript
// ✅ 正确：先从 DTO 中分离出子表字段，再更新主表
async update(id: string, dto: UpdateInstitutionDto): Promise<void> {
  // ...
  // 从 DTO 中分离出子表字段（accounts, teachers, honors, showcases 不是实体列）
  const { accounts, teachers, honors, showcases, ...entityData } = dto as any;

  // 更新主表（只传实体列字段）
  await this.institutionRepository.update(id, entityData);

  // 更新 PostGIS location 字段
  await this.updateLocationField(id, updatedLatitude, updatedLongitude);

  // 删除旧的子表数据并重新保存
  await this.honorRepository.deleteByInstitutionId(id);
  await this.showcaseRepository.deleteByInstitutionId(id);
  await this.saveSubTables(id, dto);  // 原始 dto 传给 saveSubTables，它需要 honors/showcases
}
```

**根因分析**：
- **DTO 设计**：`CreateInstitutionDto` 包含主表字段 + 子表字段（`honors`, `showcases`, `teachers`, `accounts`）
- **TypeORM `update()` 严格模式**：`repository.update(id, data)` 会尝试将 data 中所有属性映射为 SQL SET 子句，遇到非实体列直接报错
- **TypeORM `create()` + `save()` 宽松模式**：`create()` 忽略未知属性，所以 create 方法不报错
- **解决方案**：调用 `update()` 前用解构分离子表字段；子表数据通过 `saveSubTables()` 单独处理

**规范**：
- **DTO 包含子表数据时，Service 必须在调用 `repository.update()` 前分离出非实体字段**
- 子表字段列表：`accounts`, `teachers`, `honors`, `showcases`
- 实体列字段：参考 Entity 文件中 `@Column` 装饰器定义的字段
- `repository.update()` 只接受实体列字段
- `saveSubTables()` 负责处理子表数据

---

### 错误 24: wd-button 的 @getphonenumber 事件参数已解包 ⚠️⚠️⚠️

**背景**：`wd-button` 组件的 `open-type="getPhoneNumber"` 回调事件与原生 `<button>` 的事件结构不同。

**错误现象**：
```typescript
// ❌ 错误：e.detail 在 wd-button 中为 undefined
const handleGetPhoneNumber = async (e: any) => {
  const detail = e?.detail || {}   // e.detail = undefined → 回退到 {}
  const errMsg = detail.errMsg || '' // ''
  const code = detail.code           // undefined

  if (!code && !errMsg.includes('ok')) {
    uni.showToast({ title: '您取消了授权', icon: 'none' }) // 永远进入这里！
    return
  }
}
```

**错误信息**：
- 用户点击"允许"授权，但页面显示"您取消了授权"

**根因分析**：

`wd-button` 源码中已经对原生事件做了解包：
```js
// wd-button.vue 内部
function handleGetphonenumber(event: any) {
  emit('getphonenumber', event.detail)  // 发出的是 event.detail，不是 event
}
```

所以 `@getphonenumber="handleGetPhoneNumber"` 中收到的 `e` 已经是 `{ code, errMsg }` 对象：
- 原生 `<button>`：`e = { detail: { code, errMsg } }`
- `wd-button`：`e = { code, errMsg }`（已解包）

**正确写法**：
```typescript
// ✅ 正确：兼容原生 button 和 wd-button 两种事件结构
const handleGetPhoneNumber = async (e: any) => {
  // wd-button 已解包 event.detail，e 直接是 detail 对象
  const detail = e?.detail || e || {}
  const errMsg = detail.errMsg || ''
  const code = detail.code

  if (!code && !errMsg.includes('ok')) {
    uni.showToast({ title: '您取消了授权', icon: 'none' })
    return
  }

  // 使用 code 进行登录...
}
```

**规范**：
- **使用 `e?.detail || e || {}`**：优先尝试 `e.detail`（兼容原生），回退到 `e` 本身（适配 wd-button）
- **所有使用 wd-button open-type 能力的回调**都需要注意此问题（getphonenumber, getuserinfo, contact 等）
- **wd-button Events 文档**明确写了事件参数是 `detail` 而非 `event`

---

### 错误 25: PostGIS 距离计算单位不一致 ⚠️⚠️⚠️

**背景**：`ST_Distance(geography, geography)` 返回 **米**，前端期望接收 **公里**。多处代码各自手写 `/1000.0`，容易遗漏导致距离显示异常。

**错误现象**：
```typescript
// ❌ 错误：9 处 SQL 各自写 ST_Distance(...) / 1000.0，有人忘了除就出 bug
const dataQuery = `
  SELECT i.*,
    ST_Distance(
      i.location,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    ) / 1000.0 AS distance           -- 容易忘记 / 1000.0
  FROM institutions i ...
`;
```

**正确写法**：
```typescript
// ✅ 正确：使用数据库函数 distance_km()，内部封装了 / 1000.0
const dataQuery = `
  SELECT i.*,
    distance_km(i.location, ${lng}, ${lat}) AS distance
  FROM institutions i ...
`;

// ✅ 参数化查询
const dataQuery = `
  SELECT i.*,
    distance_km(i.location, $2::float8, $1::float8) AS distance
  FROM institutions i ...
`;
```

**架构方案**：

**PostgreSQL 数据库函数** `distance_km()`（见 `migrations/create-distance-km-function.sql`）：
- `distance_km(geography, float8, float8)` — 位置列 + 经度 + 纬度 → 公里
- `distance_km(geography, geography)` — 两个 geography → 公里
- 标记为 `IMMUTABLE STRICT`，可被索引和缓存
- SQL 中直接调用：`distance_km(i.location, ${lng}, ${lat}) AS distance`

**规范**：
- **禁止在业务代码中直接写 `ST_Distance()`**
- **所有距离计算统一使用 `distance_km()` 数据库函数**
- **后端接口返回的距离单位统一为公里（km）**
- **前端 `formatDistance()` 接收公里数，负责格式化为 "500m" / "1.2km" 等**
- **新增距离查询时必须使用 `distance_km()`，不得自行拼接 ST_Distance/1000.0**

**检测方法**：
```bash
# 搜索是否有遗漏的 ST_Distance 直接调用
grep -rn "ST_Distance(" src/ --include="*.ts" | grep -v "distance.util.ts" | grep -v "//"
# 应该返回 0 条结果
```

---

### 错误 26: 前端提交数据包含后端 DTO 未定义的字段 ⚠️⚠️⚠️

**背景**：NestJS 全局启用了 `whitelist: true` + `forbidNonWhitelisted: true`，任何不在 DTO 中声明的字段都会被拒绝。

**错误现象**：
```typescript
// ❌ 错误：前端 SKU 对象包含展示用字段，直接提交
const submitData = {
  ...form,
  skus: form.skus,  // SKU 中有 online_pay_price、offline_pay_price 等后端不接受的字段
}
await courseApi.create(submitData)

// ❌ 错误：黑名单排除方式，只排除已知的多余字段，容易遗漏
skus: form.skus.map(({ online_pay_price, offline_pay_price, ...rest }) => rest)
// 编辑模式下 rest 还包含 id、course_id、is_refundable、created_at 等！
```

**错误信息**：
```
skus.0.property online_pay_price should not exist
skus.0.property offline_pay_price should not exist
```

**正确写法**：
```typescript
// ✅ 正确：白名单方式——只提取后端 DTO 声明的字段
const submitData = {
  institution_id: form.institution_id,
  title: form.title,
  subtitle: form.subtitle || undefined,
  category_code: form.category_code,
  tags: form.tags,
  description: form.description || undefined,
  min_age: form.min_age,
  max_age: form.max_age,
  lesson_duration: form.lesson_duration,
  type: form.type,
  skus: form.skus.map(sku => ({
    name: sku.name,
    type: sku.type,
    total_lessons: sku.total_lessons,
    total_price: sku.total_price,
    cashback_type: sku.cashback_type,
    cashback_value: sku.cashback_value,
    stock: sku.stock,
  })),
}
```

**核心规则**：
- **提交数据必须用白名单方式**：逐字段列出后端 DTO 接受的字段，禁止用 `...form` 展开或仅排除部分字段
- **黑名单方式（解构排除）不可靠**：编辑模式下从后端加载的数据包含大量额外字段（`id`, `course_id`, `created_at`, `updated_at`, `is_active`, `is_delete`, `is_refundable` 等），逐个排除极易遗漏
- **前端展示用字段与提交字段分离**：`online_pay_price`、`offline_pay_price` 等仅用于页面实时展示的字段，绝不能提交到后端
- **对照后端 DTO 文件**：提交前必须打开后端 `create-xxx.dto.ts`，逐字段确认前端发送的字段在 DTO 中有对应的装饰器声明

**检测方法**：
```typescript
// 提交前在控制台打印，肉眼检查是否有多余字段
console.log('submitData:', JSON.stringify(submitData, null, 2))
```

---

### 错误 27: booked_count 未在拒绝/取消场景递减 ⚠️⚠️⚠️

**背景**：`schedules.booked_count` 只在创建预约时 +1，但在拒绝/退款/取消等释放名额的场景未做 -1，导致名额持续累积，真实可用名额越来越少。

**错误现象**：
```typescript
// ❌ 错误：updateStatus 拒绝时只改预约状态，未归还名额
case 'rejected':
  booking.status = 'rejected';
  await this.bookingRepository.save(booking);
  break;  // ← 遗漏 booked_count - 1
```

**正确写法**：
```typescript
// ✅ 所有"释放名额"路径都要执行 GREATEST(booked_count - 1, 0)
// 1. 拒绝预约
case 'rejected':
  booking.status = 'rejected';
  await this.bookingRepository.save(booking);
  await this.dataSource.query(
    `UPDATE schedules SET booked_count = GREATEST(booked_count - 1, 0) WHERE id = $1`,
    [booking.schedule_id],
  );
  break;

// 2. 同意取消申请（reviewCancel approve）
await this.dataSource.query(
  `UPDATE schedules SET booked_count = GREATEST(booked_count - 1, 0) WHERE id = $1`,
  [booking.schedule_id],
);

// 3. 订单取消 cancelOrderBookings — 先收集唯一 schedule_id，再批量递减
const uniqueIds = [...new Set(rows.map((r: any) => r.schedule_id))];
for (const sid of uniqueIds) {
  await this.dataSource.query(
    `UPDATE schedules SET booked_count = GREATEST(booked_count - 1, 0) WHERE id = $1`,
    [sid],
  );
}
```

**规范**：
- **所有改变预约状态为"终止"的路径（rejected / cancelled / pending_change→cancel）都必须递减 booked_count**
- 使用 `GREATEST(booked_count - 1, 0)` 防止负数
- 对同一排课下多条预约的批量操作，先 distinct schedule_id 再统一递减一次（避免多扣）

---

### 错误 28: 余额/库存操作未使用原子 SQL ⚠️⚠️⚠️

**背景**：高并发场景下，先读后写会产生竞态条件（TOCTOU），导致超卖或余额透支。

**错误现象**：
```typescript
// ❌ 错误：三步走，存在并发间隙
const balance = await this.getBalance(userId);
if (balance.balance < amount) throw new Error('余额不足');
balance.balance -= amount;
await this.save(balance);  // 两个请求同时通过检查，均成功扣款 → 余额变负
```

**正确写法**：
```typescript
// ✅ 正确：单条 SQL 原子扣款，WHERE 含余额条件
const result = await this.dataSource.query(
  `UPDATE user_balances
   SET balance = balance - $1, frozen_balance = frozen_balance + $1
   WHERE user_id = $2 AND balance >= $1 AND is_delete = false
   RETURNING id`,
  [amount, userId],
);
if (!result[0]?.length) {
  throw new BadRequestException('余额不足，无法冻结');
}

// ✅ 同理：SKU 库存扣减
const stockResult = await this.dataSource.query(
  `UPDATE course_skus SET stock = stock - 1 WHERE id = $1 AND stock > 0 RETURNING id`,
  [skuId],
);
if (!stockResult[0]?.length) {
  throw new BadRequestException('该规格课程库存不足，无法下单');
}
```

**规范**：
- **余额扣减、库存扣减等并发敏感操作，必须用带 WHERE 条件的原子 UPDATE … RETURNING 实现**
- 判断受影响行数（`RETURNING id` 返回空 → 条件不满足）
- 禁止先 SELECT 再 UPDATE 的两步写法

---

### 错误 29: 订单取消/退款未归还 SKU 库存 ⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：下单时扣库存，但取消/退款/过期时未归还
async cancel(orderId: string) {
  order.status = 'cancelled';
  await this.orderRepository.save(order);
  await this.cancelOrderBookings(orderId);
  // ← 漏掉归还 SKU 库存
}
```

**正确写法**：
```typescript
// ✅ 所有终止订单路径都要归还库存
private async restoreSkuStock(skuId: string): Promise<void> {
  await this.dataSource.query(
    `UPDATE course_skus SET stock = stock + 1 WHERE id = $1 AND stock >= 0`,
    [skuId],
  );
}

// cancel / processRefund(refunded) / handleExpiredOrders 中均需调用：
await this.restoreSkuStock(order.sku_id);
```

**规范**：
- **扣库存和归还库存必须成对出现**
- 终止订单的三条路径：取消(`cancel`)、退款成功(`processRefund` status=refunded)、超时关闭(`handleExpiredOrders`)
- 使用 `stock >= 0` 保护防止负数

---

### 错误 30: 退款申请未记录时间，无法实现 48h 自动审批 ⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：申请退款时未保存时间戳
async applyRefund(orderId: string) {
  order.status = 'refund_pending';
  await this.orderRepository.save(order);
  // ← refund_applied_at 从未设置
}
```

**正确写法**：
```typescript
// ✅ 正确：申请时记录时间
order.status = 'refund_pending';
order.refund_applied_at = new Date();  // 记录申请时间
await this.orderRepository.save(order);

// 定时任务：每 5 分钟扫描超 48h 未处理的退款申请
@Cron(CronExpression.EVERY_5_MINUTES)
async handleExpiredRefunds() {
  const orders = await this.orderRepository.findExpiredRefundPendingOrders(); // refund_applied_at < now()-48h
  for (const order of orders) {
    await this.orderService.processRefund(order.id, true, '系统自动审批（超过48小时未处理）');
  }
}
```

**规范**：
- `OrderEntity` 需包含 `refund_applied_at?: Date` 字段（nullable）
- `OrderRepository` 提供 `findExpiredRefundPendingOrders()` 方法
- 定时任务注册在 `OrderTasksService` 中

---

### 错误 31: 评价接口未防重复提交 & 未更新 is_reviewed 字段 ⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：可以对同一订单重复提交评价，且 order.is_reviewed 永远为 false
async create(dto: CreateReviewDto): Promise<string> {
  const review = this.reviewRepository.create({ ... });
  await this.reviewRepository.save(review);
  return review.id;
}
```

**正确写法**：
```typescript
// ✅ 正确：先防重，再创建，后更新 is_reviewed
async create(dto: CreateReviewDto): Promise<string> {
  // 1. 防重复评价
  if (dto.order_id) {
    const existing = await this.dataSource.query(
      `SELECT id FROM reviews WHERE order_id = $1 AND is_delete = false LIMIT 1`,
      [dto.order_id],
    );
    if (existing.length > 0) throw new BadRequestException('该订单已评价，不可重复提交');

    // 2. 校验订单归属
    const orderRows = await this.dataSource.query(
      `SELECT id FROM orders WHERE id = $1 AND user_id = $2 AND is_delete = false LIMIT 1`,
      [dto.order_id, userId],
    );
    if (orderRows.length === 0) throw new BadRequestException('订单不存在或无权评价');
  }

  const saved = await this.reviewRepository.save(review);

  // 3. 标记订单已评价
  if (dto.order_id) {
    await this.dataSource.query(
      `UPDATE orders SET is_reviewed = true WHERE id = $1 AND is_delete = false`,
      [dto.order_id],
    );
  }

  return saved.id;
}
```

**规范**：
- `OrderEntity` 需包含 `is_reviewed: boolean`（default false）
- 评价创建后立即更新 `is_reviewed = true`，前端据此控制"去评价"按钮可见性
- 防重校验和归属校验在创建 review 之前执行（`@Transactional()` 包裹保证原子性）

---

### 错误 32: 课表页面加载了 completed 预约，漏掉 pending_change 预约 ⚠️⚠️

**错误现象**：
```typescript
// ❌ 错误：加载 completed 预约（应只在历史记录中展示）
const [res1, res2] = await Promise.all([
  bookingApi.getMyList({ status: 'confirmed' }),
  bookingApi.getMyList({ status: 'completed' }),  // ❌ 已完成课程不需显示在课表
])
// 同时遗漏了 pending_change（待审核修改）状态的预约
```

**正确写法**：
```typescript
// ✅ 正确：课表只加载"进行中"的预约（confirmed + pending_change）
const [res1, res2] = await Promise.all([
  bookingApi.getMyList({ status: 'confirmed' }),
  bookingApi.getMyList({ status: 'pending_change' }),  // 待审核修改也需在课表中展示
])

// ✅ statusMap 补充 pending_change
const statusMap: Record<string, string> = {
  confirmed: '已确认',
  pending_change: '待审核修改',
  // completed / cancelled 等在历史记录页展示
}

// ✅ CSS 同步添加
&.status-pending_change {
  background-color: #f6ffed;
  border-left-color: #52c41a;
  .block-time { color: #389e0d; }
}
```

**规范**：
- **课表页面**：只加载 `confirmed` + `pending_change`（当前进行中的预约）
- **历史记录页**：加载 `completed` + `cancelled` + `rejected`
- `pending_change` 状态需要在 statusMap、CSS class 中同步添加展示样式

---
### 错误 33: 退款/取消订单未同步撤回邀请返现 ⚠️⚠️⚠️

**背景**：邀请返现系统在订单确认支付后创建 `invite_orders`，记录返现权益。当订单发生退款或取消时，必须同步撤回这些权益，否则邀请人会保留/持续解锁不合法的返现。

**错误现象**：
```typescript
// ❌ 错误：processRefund / cancel / handleExpiredOrders 中只归还库存、取消预约
// 但从未调用 inviteService.cancelInviteOrder(orderId)
if (order.status === 'refunded') {
  await this.decrementSalesCount(order.course_id);
  await this.cancelOrderBookings(order.booking_id);
  await this.restoreSkuStock(order.sku_id);
  // ← 遗漏 cancelInviteOrder！
}
```

**后果**：
- 用户退款后，邀请人仍保留/继续获得返现（资金损失）
- `invite_orders` 表数据与实际订单状态不一致

**正确写法**：
```typescript
// ✅ 所有"订单终止"路径（processRefund / cancel / handleExpiredOrders）都要调用
if (order.status === 'refunded') {
  await this.decrementSalesCount(order.course_id);
  await this.cancelOrderBookings(order.booking_id);
  await this.restoreSkuStock(order.sku_id);
  // ✅ 撤回邀请返现权益
  try {
    await this.inviteService.cancelInviteOrder(order.id);
  } catch (e) {
    this.logger.warn(`取消邀请订单失败（不影响退款主流程）: ${e.message}`);
  }
}
```

**规范**：
- **所有订单终止路径都必须调用 `cancelInviteOrder`**：`processRefund`、`cancel`、`handleExpiredOrders` 三处
- **try-catch 包裹**：撤回失败不影响主流程（幂等操作，可人工补偿）
- **检查方法**：`grep -n "restoreSkuStock" order.service.ts` → 每一处后面必须有 `cancelInviteOrder`

---

### 错误 34: 微信退款异步回调未补全副作用 ⚠️⚠️⚠️

**背景**：微信退款有两条路径：
1. **同步路径**：`processRefund()` 调用微信退款 API → `PROCESSING` → 再调用 `cancelInviteOrder`、`restoreSkuStock`、`cancelOrderBookings`
2. **异步路径**：微信通过回调 `handleRefundNotify()` 推送最终结果 `SUCCESS`

原始 `handleRefundNotify()` 只更新订单状态，不执行副作用，导致异步路径走完后邀请返现未撤、SKU 库存未还、预约未取消、余额未归还。

**错误现象**：
```typescript
// ❌ 错误：handleRefundNotify SUCCESS 分支只改状态
if (refundStatus === 'SUCCESS') {
  order.status = 'refunded';
  order.refunded_at = new Date();
  await this.orderRepository.save(order);
  // ← 缺少余额归还、预约取消、库存归还、inviteOrder 取消
}
```

**正确写法**：在 `handleRefundNotify` SUCCESS 分支中补全所有副作用：
```typescript
// ✅ SUCCESS 后依次执行：
// 1. 归还余额（如果使用了余额支付）
// 2. 取消关联预约 + 归还排课 booked_count
// 3. 归还 SKU 库存
// 4. 取消邀请订单
```

**注意事项**：
- `PaymentService` 需注入 `DataSource`（用于直接执行 SQL 副作用）
- 各副作用均用 try-catch 包裹，单项失败只记 error 日志，不影响回调返回
- ABNORMAL / CLOSED 分支：只回退 order.status → `refunding`，**不执行**库存/余额/邀请单副作用（等待人工处理）

---

### 错误 35: 管理端缺少机构冻结/解冻端点 ⚠️⚠️

**背景**：PRD 要求平台管理员可冻结异常机构（停止对外展示、无法接单），解冻后恢复正常。原始代码 `admin.service.ts` + `admin.controller.ts` 中无相关实现。

**正确实现**：
```typescript
// admin.service.ts
@Transactional()
async freezeInstitution(id: string): Promise<void> {
  this.assertAdmin();
  const institution = await this.institutionRepository.findOneById(id);
  if (!institution) throw new BadRequestException('机构不存在');
  if (institution.audit_status === 'frozen') throw new BadRequestException('已处于冻结状态');
  if (!['approved', 'contract_review', 'contract_signing'].includes(institution.audit_status)) {
    throw new BadRequestException('只有已审核通过的机构才能被冻结');
  }
  await this.institutionRepository.update(id, { audit_status: 'frozen' } as any);
}

@Transactional()
async unfreezeInstitution(id: string): Promise<void> {
  this.assertAdmin();
  const institution = await this.institutionRepository.findOneById(id);
  if (!institution) throw new BadRequestException('机构不存在');
  if (institution.audit_status !== 'frozen') throw new BadRequestException('该机构未处于冻结状态');
  await this.institutionRepository.update(id, { audit_status: 'approved' } as any);
}

// admin.controller.ts
@Put('institutions/:id/freeze')
async freezeInstitution(@Param('id') id: string): Promise<boolean> { ... }

@Put('institutions/:id/unfreeze')
async unfreezeInstitution(@Param('id') id: string): Promise<boolean> { ... }
```

**规范**：
- 冻结路由格式：`PUT /admin/institutions/:id/freeze`
- 解冻路由格式：`PUT /admin/institutions/:id/unfreeze`
- 冻结后机构在 C 端不可见（查询时需过滤 `audit_status != 'frozen'`）

---

### 错误 36: 提现 approved 状态无补偿机制，资金可能永久卡单 ⚠️⚠️⚠️

**背景**：`reviewWithdraw` 审核通过后，先将状态更新为 `approved`，再调用 `paymentService.createTransfer()`。若此时服务崩溃、网络超时，提现记录将永久停留在 `approved`，用户余额冻结却无法到账。

**错误现象**：
```typescript
// ❌ 问题：approved 状态无任何自动补偿，人工介入才能解卡
await this.withdrawRecordRepository.update(id, { status: 'approved', ... });
const transferResult = await this.paymentService.createTransfer(...);
// ← 如果此处崩溃，下次没有任何任务会重试
```

**正确实现**：
1. **`InviteService.retryApprovedWithdrawals()`**：查询 `status = 'approved' AND reviewed_at < NOW() - 10min`，重新发起微信转账；失败则回退为 `pending`
2. **`InviteTasksService`**（新文件）：`@Cron(EVERY_10_MINUTES)` 调用上述方法
3. **`invite.module.ts`**：注册 `InviteTasksService` 到 `providers`

```typescript
// invite-tasks.service.ts
@Injectable()
export class InviteTasksService {
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleStuckWithdrawals() {
    const result = await this.inviteService.retryApprovedWithdrawals();
    if (result.retried > 0 || result.failed > 0) {
      this.logger.log(`提现卡单补偿: 重试 ${result.retried}, 失败回退 ${result.failed}`);
    }
  }
}
```

**规范**：
- 所有"先标记状态、再调外部 API"的操作都必须配备补偿任务
- 补偿任务扫描超时阈值建议为 API 超时时间的 3-5 倍（如 API 30s 超时 → 补偿阈值 10min）
- 回退为 `pending` 而非 `failed`，允许管理员重新审核

---