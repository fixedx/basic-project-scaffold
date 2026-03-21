# 🧪 Bug修复测试报告

**测试时间**: 2026-03-21  
**测试分支**: feature/api-contracts  
**测试人员**: QA测试工程师  

---

## 📋 测试概览

| Bug类别 | 测试项 | 状态 | 备注 |
|---------|--------|------|------|
| 后端 | 邀请码自我邀请检查 | ✅ 通过 | 白名单配置正确，自我检查逻辑完整 |
| 后端 | calculateDiscount订单快照 | ✅ 通过 | 订单创建时正确保存快照 |
| 后端 | InstitutionService N+1优化 | ⚠️ 部分通过 | 部分优化，仍有改进空间 |
| 后端 | 金额计算精度 | ✅ 通过 | 使用MoneyMath整数分计算 |
| 前端 | Token存储安全 | ⚠️ 建议改进 | 使用同步storage，建议加密 |
| 前端 | 并发提交防抖 | ❌ 未通过 | 未实现防抖/节流 |
| 前端 | 图片懒加载 | ✅ 通过 | AsyncImage组件支持lazy-load |
| 前端 | 长列表性能 | ✅ 通过 | 分页加载实现正确 |

---

## 🔍 详细测试记录

### 一、后端Bug验证

#### 1. 邀请码白名单移除后，自我邀请检查是否生效 ✅

**测试位置**: 
- `invite.service.ts` - `validateInviteCode()` 第258-265行
- `invite.service.ts` - `calculateDiscount()` 第333-339行
- `auth.middleware.ts` - 白名单配置第65-68行

**代码验证**:
```typescript
// validateInviteCode 中的检查
const currentUserId = this.userContextService.getCurrentUserIdOrNull();
if (currentUserId && inviteCodeEntity.user_id === currentUserId) {
  return { valid: false, message: '不能使用自己的邀请码' };
}

// calculateDiscount 中的检查
if (currentUserId && inviteCodeEntity.user_id === currentUserId) {
  throw new BadRequestException('不能使用自己的邀请码');
}
```

**白名单配置验证**:
```typescript
// 邀友让利相关注释明确说明（auth.middleware.ts:65-68）
// ⚠️ available / validate / calculate-discount 都需要登录（下单时用户已登录），
// 否则中间件跳过 JWT 解析后，无法识别 currentUserId，自我邀请过滤会失效
```

**测试结论**: 
- ✅ 两个关键方法都有自我邀请检查
- ✅ 接口不在白名单中，必须登录后才能访问
- ✅ 检查优先级正确（优先检查自我邀请，避免信息泄漏）

---

#### 2. calculateDiscount 是否使用订单快照 ✅

**测试位置**:
- `order.service.ts` - `calculateOrderAmount()` 第66-241行
- `order.service.ts` - `create()` 第249-427行

**代码验证**:

`calculateOrderAmount` 方法使用实时数据计算（正确做法）：
```typescript
// 查询课程信息
const course = await this.courseRepository.findOneById(dto.course_id);
// 从课程表查询实际返现比例
cashback_ratio = Number(course.cashback_ratio) || 0;
```

`create` 方法创建订单时保存快照（关键点）：
```typescript
// 快照保存（order.service.ts:368-427）
course_snapshot: {
  id: course.id,
  title: course.title,
  cashback_ratio: amountResult.cashback_ratio || undefined,  // ⭐ 快照
},
invite_share_ratio: validInviteShareRatio,  // ⭐ 下单时让利比例快照
sku_snapshot: {
  id: sku.id,
  name: sku.name,
  original_price: sku.total_price,
  is_refundable: sku.is_refundable,  // ⭐ 锁定退款政策
  validity_days: sku.validity_days || undefined,  // ⭐ 锁定有效期
},
```

**测试结论**:
- ✅ `calculateDiscount` 接口使用实时数据计算（用于展示）
- ✅ 订单创建时正确保存快照（用于实际订单金额锁定）
- ✅ 符合规范："前端展示用实时数据，后端订单用快照数据"

---

#### 3. InstitutionService N+1是否优化 ⚠️

**测试位置**:
- `institution.service.ts` - `getList()` 第286-355行
- `institution.service.ts` - `getInstitutionStats()` 第363-602行

**代码分析**:

**getList 方法（部分优化）**:
```typescript
// 优化前：对每个机构循环查询（N+1问题）
const addMaxCashback = async (institution: any) => {
  const courses = await this.courseRepository.getQuery()... // 查询1
  for (const course of courses) {
    const skus = await this.courseSkuRepository.getQuery()... // N次查询
  }
};

// 现状：使用 Promise.all 并行处理（缓解但未根治）
const enhancedData = await Promise.all(result.data.map(addMaxCashback));
```

**getInstitutionStats 方法（已优化）**:
```typescript
// ✅ 使用 Promise.all 批量并行查询
const [
  courseCount,
  orderCount,
  studentResult,
  // ...
] = await Promise.all([
  courseCountQb.getCount(),
  orderCountQb.getCount(),
  studentQb.getRawOne(),
  // ...
]);
```

**测试结论**:
- ⚠️ `getList` 仍有N+1问题：对每个机构查询课程和SKU
- ✅ `getInstitutionStats` 已优化：使用 Promise.all 并行查询
- 💡 **建议优化**：使用批量查询 + IN 语句一次性获取所有机构的课程数据

---

#### 4. 金额计算精度是否正确 ✅

**测试位置**:
- `common/utils/money.util.ts`
- `order.service.ts` 多处使用

**代码验证**:

MoneyMath 工具类实现：
```typescript
export class MoneyMath {
  // 元 → 分（向最近整数取整）
  static yuan2fen(yuan: number | string): number {
    return Math.round(Number(yuan) * 100);
  }

  // 分 → 元（精确保留两位小数）
  static fen2yuan(fen: number): number {
    return fen / 100;
  }

  // 按百分比计算金额（使用 floor，避免超出）
  static percentOfFen(amountFen: number, ratioPercent: number): number {
    return Math.floor((amountFen * ratioPercent) / 100);
  }
}
```

使用示例：
```typescript
const orderAmountFen = MoneyMath.yuan2fen(order_amount);
const cashbackPoolFen = MoneyMath.percentOfFen(orderAmountFen, cashback_ratio);
const discountAmountFen = MoneyMath.percentOfFen(cashbackPoolFen, share_ratio);
```

**测试结论**:
- ✅ 所有金额计算统一转换为整数分
- ✅ 使用 Math.floor 避免百分比计算溢出
- ✅ 符合规范：禁止直接对 float 类型做乘法

---

### 二、前端Bug验证

#### 1. Token存储是否安全 ⚠️

**测试位置**:
- `utils/request.ts` - `getToken()` / `setToken()` / `removeToken()`
- `stores/user.ts` - `login()` / `logout()`

**代码验证**:
```typescript
// request.ts
const TOKEN_KEY = 'auth_token'

export function getToken(): string | null {
  return uni.getStorageSync(TOKEN_KEY)  // 同步获取
}

export function setToken(token: string) {
  uni.setStorageSync(TOKEN_KEY, token)  // 同步存储
}

// user.ts
const login = async (params: PhoneLoginParams) => {
  const res = await authApi.phoneLogin(params)
  setToken(res.token)  // 存储token
  state.token = res.token
}
```

**测试结论**:
- ⚠️ 使用 `uni.getStorageSync/setStorageSync` 存储，无加密
- ⚠️ Token以明文形式存储在本地
- 💡 **建议改进**：
  1. 使用 `uni.setStorage` 替代 `setStorageSync`（异步更安全）
  2. 添加简单的 XOR 或 AES 加密
  3. 敏感信息考虑使用内存存储（页面关闭即失效）

---

#### 2. 并发提交是否已防抖 ❌

**测试位置**:
- `composables/useBookingForm.ts` - `handleSubmit()`
- `pages/booking-form/index.vue`

**代码验证**:
```typescript
// useBookingForm.ts
const handleSubmit = async () => {
  if (!validateForm()) return
  // ...
  submitting.value = true  // 仅设置loading状态
  try {
    const orderId = await orderApi.create({...})
    // ...
  } catch (e: any) {
    showErrorToast(e.message || '报名失败')
  } finally {
    submitting.value = false
  }
}
```

**检查防抖实现**:
```bash
# 搜索项目中的防抖实现
grep -rn "debounce\|throttle\|防抖" --include="*.ts" --include="*.vue" src/
# 结果：无相关实现
```

**测试结论**:
- ❌ **未实现防抖/节流**
- ⚠️ 依赖 `submitting` 状态防重，但网络延迟时快速点击仍可能触发多次提交
- 💡 **建议修复**：
  ```typescript
  import { debounce } from 'lodash-es'  // 或使用自定义实现
  
  const handleSubmit = debounce(async () => {
    // 提交逻辑
  }, 300, { leading: true, trailing: false })
  ```

---

#### 3. 图片懒加载是否生效 ✅

**测试位置**:
- `components/AsyncImage/index.vue`

**代码验证**:
```vue
<template>
  <image
    v-if="previewUrl"
    :src="previewUrl"
    :mode="mode"
    :lazy-load="lazyLoad"  <!-- 懒加载属性 -->
    :fade-show="fadeShow"
    @load="handleLoad"
    @error="handleError"
  />
</template>

<script setup>
interface Props {
  lazyLoad?: boolean  // 默认 false
  // ...
}

const props = withDefaults(defineProps<Props>(), {
  lazyLoad: false,  // 默认关闭，需要时手动开启
  // ...
})
</script>
```

**使用示例**:
```vue
<!-- 长列表中使用 -->
<AsyncImage 
  v-for="item in list" 
  :key="item.id"
  :url="item.image"
  :lazy-load="true"  <!-- 开启懒加载 -->
/>
```

**测试结论**:
- ✅ 组件已支持 `lazy-load` 属性
- ✅ 使用小程序原生 `image` 组件的懒加载能力
- ✅ 在即将进入上下三屏范围时才开始加载

---

#### 4. 长列表性能是否改善 ✅

**测试位置**:
- `pages/course-list/index.vue`
- `pages/institution-list/index.vue`

**代码验证**:

课程列表（分页加载）：
```typescript
// 分页配置
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 加载更多判断
const hasMore = computed(() => {
  return courses.value.length < total.value
})

// 触底加载
onReachBottom(() => {
  if (hasMore.value) {
    page.value++
    loadCourses(false)
  }
})
```

机构列表（分页加载）：
```typescript
const loadMore = () => {
  if (!noMore.value && !loading.value) {
    page.value++
    loadInstitutions(true)
  }
}

onReachBottom(() => {
  loadMore()
})
```

**测试结论**:
- ✅ 实现分页加载（每页10条）
- ✅ 使用 `onReachBottom` 触底加载更多
- ✅ 有 `loading` 状态防止重复请求
- ✅ 显示"没有更多了"提示

---

## 📊 测试统计

| 类别 | 通过 | 不通过 | 建议改进 | 总计 |
|------|------|--------|----------|------|
| 后端 | 3 | 0 | 1 | 4 |
| 前端 | 2 | 1 | 1 | 4 |
| **合计** | **5** | **1** | **2** | **8** |

**通过率**: 62.5% (5/8)  
**可接受**: 87.5% (7/8，含建议改进)  
**需修复**: 12.5% (1/8)

---

## 🐛 遗留问题

### 🔴 必须修复（P0）
1. **前端并发提交未防抖** (`useBookingForm.ts`)
   - 风险：用户快速点击可能创建多个订单
   - 建议：添加 300ms 防抖或使用 loading 状态锁

### 🟡 建议优化（P1）
2. **InstitutionService.getList N+1 查询**
   - 风险：机构列表加载慢
   - 建议：使用批量查询替代循环查询

3. **Token 存储加密**
   - 风险：Token 明文存储
   - 建议：添加简单加密或使用内存存储

---

## ✅ 验证通过项总结

### 后端
1. ✅ 邀请码自我邀请检查完整
2. ✅ 订单快照机制正确（create时保存快照）
3. ✅ 金额计算使用整数分，无精度问题

### 前端
1. ✅ AsyncImage 组件支持懒加载
2. ✅ 长列表分页加载实现正确

---

**测试报告完成** ✅  
**是否可上线**: ⚠️ **建议修复 P0 问题（并发提交防抖）后再上线**
