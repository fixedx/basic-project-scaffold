# Interest Class Web 开发规范

## 项目概述

基于 uni-app + Vue 3 + TypeScript + UnoCSS 的跨平台前端应用，支持 H5、小程序等多端运行。

## 技术栈

- **框架**: uni-app 3.x
- **前端框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **CSS 方案**: SCSS + uni.scss
- **UI 组件库**: wot-design-uni
- **构建工具**: Vite 5.x
- **包管理**: pnpm

---

## 核心开发规范

### 1. 目录结构规范

```
src/
├── api/                        # API 接口定义
│   ├── auth.ts                # 认证API（登录、注册）
│   ├── category.ts            # 分类API
│   ├── classroom.ts           # 教室管理API ⭐
│   ├── course.ts              # 课程管理API
│   ├── enum.ts                # 枚举API
│   ├── institution.ts         # 机构管理API
│   ├── oss.ts                 # 文件上传API
│   ├── teacher.ts             # 教师管理API ⭐
│   └── index.ts               # API 模块导出
├── components/                 # 公共组件（强制）
│   ├── AsyncImage/            # 异步图片组件（加载状态、占位图）⭐
│   ├── EnumsTag/              # 枚举标签选择器 ⭐
│   └── FileUpload/            # 文件上传组件（支持多种OSS）
├── pages/                      # 页面目录
│   ├── admin/                 # 管理后台页面
│   ├── file-upload-demo/      # 文件上传示例
│   ├── index/                 # 首页
│   │   └── index.vue
│   ├── institution/           # 机构端页面
│   │   ├── center/           # 机构个人中心
│   │   ├── classroom-edit/   # 教室编辑页 ⭐
│   │   ├── classroom-list/   # 教室列表页 ⭐
│   │   ├── course-edit/      # 课程编辑页
│   │   ├── courses/          # 课程列表页
│   │   ├── login/            # 机构登录页
│   │   ├── settle/           # 机构入驻页
│   │   ├── teacher-edit/     # 教师编辑页 ⭐
│   │   └── teacher-list/     # 教师列表页 ⭐
│   ├── login/                 # 家长登录页
│   └── mine/                  # 家长个人中心
├── static/                     # 静态资源
│   ├── images/                # 图片资源
│   └── fonts/                 # 字体资源
├── stores/                     # 状态管理（如使用 Pinia）
│   └── [module].ts            # 状态模块
├── utils/                      # 工具函数（强制）
│   ├── request.ts             # 请求封装（统一拦截、错误处理）
│   └── toast.ts               # 提示封装
├── App.vue                     # 应用入口组件
├── main.ts                     # 应用入口文件
├── manifest.json               # uni-app 配置文件
├── pages.json                  # 页面路由配置
└── uni.scss                    # 全局样式变量（主题色定义）
```

## 已实现功能模块

### 1. 认证模块
- **页面**: `pages/login/index.vue`, `pages/institution/login/index.vue`
- **功能**: 微信登录、手机号登录

### 2. 机构管理模块
- **页面**: `pages/institution/settle/index.vue`, `pages/institution/center/index.vue`
- **功能**: 
  - 机构入驻申请（14个预设分类）
  - 机构信息管理
  - 机构个人中心（统计数据）

### 3. 课程管理模块
- **页面**: `pages/institution/courses/index.vue`, `pages/institution/course-edit/index.vue`
- **功能**:
  - 课程列表展示（分类筛选）
  - 课程发布与编辑
  - SKU规格管理（价格、库存、有效期）
  - 年龄范围、课时时长设置

### 4. 教室管理模块 ⭐
- **页面**: `pages/institution/classroom-list/index.vue`, `pages/institution/classroom-edit/index.vue`
- **功能**:
  - 教室列表（搜索、状态筛选）
  - 教室创建与编辑
  - 设施设备管理（12种预设设施）
  - 教室状态管理（可用、维护中、已停用）
  - 容量、面积、楼层信息管理

### 5. 教师管理模块 ⭐
- **页面**: `pages/institution/teacher-list/index.vue`, `pages/institution/teacher-edit/index.vue`
- **功能**:
  - 教师列表（搜索、状态筛选、头像展示）
  - 教师创建与编辑
  - 教授科目管理（17种预设科目 + 自定义）
  - 资格证书管理（动态添加）
  - 教师状态管理（在职、休假、离职）
  - 职称、教龄、简介等信息

### 6. 文件上传模块
- **组件**: `components/FileUpload/index.vue`
- **页面**: `pages/file-upload-demo/index.vue`
- **功能**:
  - 图片/视频上传
  - 多种OSS支持（阿里云、腾讯云、七牛云、Cloudflare R2）
  - 上传进度显示
  - 预览与删除

### 7. 公共组件
- **AsyncImage**: 异步图片加载（加载状态、占位图、错误处理）
- **EnumsTag**: 枚举标签选择器（单选、多选、自动加载枚举数据）
- **FileUpload**: 文件上传组件（支持多种文件类型和OSS）

```

**重要说明**：
- **公共组件**：所有可复用的组件必须放在 `src/components/` 目录下
- **页面组件**：仅在特定页面使用的组件必须放在 `pages/[page-name]/components/` 目录下
- **工具函数**：所有公共工具函数必须放在 `src/utils/` 目录下

### 2. 命名规范

| 类型 | 规范 | 示例 |
|-----|------|------|
| 页面目录 | kebab-case | `user-profile/`, `my-orders/` |
| 页面文件 | index.vue | `pages/user-profile/index.vue` |
| 组件目录 | PascalCase | `UserCard/`, `ProductItem/` |
| 组件文件 | index.vue | `components/UserCard/index.vue` |
| TypeScript 文件 | kebab-case | `request.ts`, `user-api.ts` |
| 工具函数 | camelCase | `formatDate()`, `getUserInfo()` |
| 常量 | UPPER_SNAKE_CASE | `BASE_URL`, `TOKEN_KEY` |
| CSS 类名 | kebab-case 或 UnoCSS | `user-card`, `flex-center` |

### 4. 文件组织强制规范

以下规范为**强制要求**，必须严格遵守：

#### 3.1 组件存放规范

```typescript
// ✅ 正确：公共组件放在 src/components/
src/components/UserCard/index.vue
src/components/ProductItem/index.vue
src/components/LoadingSpinner/index.vue

// ✅ 正确：页面组件放在对应页面的 components 目录
src/pages/user-profile/components/ProfileHeader.vue
src/pages/user-profile/components/ProfileStats.vue
src/pages/product-list/components/ProductFilter.vue

// ❌ 错误：页面组件不要放在公共组件目录
src/components/ProfileHeader.vue  // 应该放在 pages/user-profile/components/

// ❌ 错误：公共组件不要放在页面目录
src/pages/user-profile/components/UserCard.vue  // 应该放在 src/components/
```

**判断标准**：
- 如果组件在多个页面中使用 → 放在 `src/components/`
- 如果组件仅在单个页面中使用 → 放在 `pages/[page-name]/components/`

#### 3.2 工具函数存放规范

```typescript
// ✅ 正确：所有工具函数放在 src/utils/
src/utils/format.ts
src/utils/validate.ts
src/utils/storage.ts
src/utils/date.ts

// ❌ 错误：不要在其他位置创建工具文件
src/pages/user-profile/utils.ts  // 应该放在 src/utils/
src/helpers/format.ts  // 应该放在 src/utils/
```

#### 3.3 样式编写规范

**使用 SCSS 编写样式，必须使用 uni.scss 中定义的主题变量**：

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
- **必须使用** uni.scss 中定义的主题变量（如 `$uni-color-primary`）
- 使用 BEM 命名规范组织类名
- 使用 `scoped` 避免样式污染

#### 3.4 图片组件使用规范 ⭐

**在前端遇到图片展示时，优先使用 `asyncimage` 组件**：

```vue
<!-- ✅ 正确：使用 asyncimage 组件 -->
<template>
  <asyncimage 
    :src="imageUrl" 
    width="200rpx" 
    height="200rpx"
    mode="aspectFill"
  />
</template>

<!-- ❌ 避免：直接使用 image 组件 -->
<template>
  <image :src="imageUrl" />
</template>
```

**asyncimage 组件优势**：
- 自动处理图片加载状态（loading、error）
- 内置占位图和错误图
- 更好的性能优化
- 统一的图片展示效果

#### 3.5 文件长度规范 ⭐

**单个文件的代码不要超过 500 行**：

```typescript
// ✅ 正确：文件保持在 500 行以内
// UserProfile.vue - 350 行

// ❌ 错误：文件超过 500 行需要拆分
// UserProfile.vue - 800 行 → 需要拆分为多个组件
```

**如果文件过大，考虑以下拆分方式**：

1. **提取子组件**：
```typescript
// 原始文件：UserProfile.vue (800 行)
// 拆分后：
// - UserProfile.vue (200 行 - 主组件)
// - components/ProfileHeader.vue (150 行)
// - components/ProfileInfo.vue (200 行)
// - components/ProfileActivity.vue (250 行)
```

2. **提取 Composables**：
```typescript
// 原始文件：UserProfile.vue (600 行)
// 拆分后：
// - UserProfile.vue (300 行 - UI 部分)
// - composables/useUserProfile.ts (200 行 - 逻辑部分)
// - composables/useUserStats.ts (100 行 - 统计逻辑)
```

3. **提取工具函数**：
```typescript
// 原始文件：UserProfile.vue (550 行)
// 拆分后：
// - UserProfile.vue (400 行)
// - utils/user-format.ts (150 行 - 格式化函数)
```

**拆分原则**：
- 保持单一职责原则
- 提高代码可维护性
- 便于代码复用
- 降低测试复杂度

#### 3.6 枚举选择器规范 ⭐

**对于页面中的可枚举的单选和多选，都使用 tag 的方式布局**：

```vue
<!-- ✅ 正确：使用 tag 方式 -->
<template>
  <view class="form-group">
    <view class="form-label">角色</view>
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
  </view>
</template>

<style lang="scss" scoped>
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
</style>

<!-- ❌ 避免：使用 radio/checkbox 组件 -->
<template>
  <wd-radio-group v-model="role">
    <wd-radio value="admin">管理员</wd-radio>
    <wd-radio value="staff">普通员工</wd-radio>
  </wd-radio-group>
</template>
```

**tag 方式的优势**：
- 更直观的视觉展示
- 更好的触摸体验（移动端）
- 支持多选时可以清晰看到已选项
- 统一的 UI 风格
- 更灵活的样式定制

**适用场景**：
- 角色选择（管理员、员工等）
- 类型选择（课程类型、机构类型等）
- 状态筛选（进行中、已完成等）
- 标签选择（兴趣爱好、技能等）

**⚠️ 重要：优先使用系统 enums 表**

在开发过程中遇到下拉选项时，**优先考虑使用系统已有的 `enums` 表来维护**，而不要自己新建一个 entity 来维护。

**⚠️ 强制：使用 EnumsTag 组件展示枚举**

**涉及到使用 tag 方式展示枚举值时，必须使用封装好的 `EnumsTag` 组件**，不要手动编写 tag 结构。

```vue
<!-- ✅ 正确：使用 EnumsTag 组件 -->
<script setup>
import { useEnums } from '@/composables/useEnums'
const { loadEnumsByTypes, ENUM_TYPES } = useEnums()

const courseTypeEnums = ref([])
await loadEnumsByTypes([ENUM_TYPES.COURSE_TYPE])
courseTypeEnums.value = data[ENUM_TYPES.COURSE_TYPE] || []

const selectedType = ref('standard')
</script>

<template>
  <!-- 单选 -->
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
  
  <!-- 禁用 -->
  <EnumsTag
    v-model="selectedType"
    enum-type="course_type"
    :enum-items="courseTypeEnums"
    disabled
  />
</template>

<!-- ❌ 错误：手动编写 tag 结构 -->
<view class="tag-group">
  <view v-for="item in enums" class="tag-item">{{ item.label }}</view>
</view>
```

**EnumsTag 组件特性**：
- ✅ 自动处理单选/多选逻辑
- ✅ 统一的样式和交互
- ✅ 支持图标显示
- ✅ 支持禁用状态
- ✅ 自动维护选中状态

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
  <view 
    v-for="item in enums.course_category" 
    :key="item.code"
    class="tag-item"
    :class="{ 'tag-active': selected === item.code }"
    @click="selected = item.code"
  >
    {{ item.label }}
  </view>
</view>

// ❌ 错误：新建 entity 维护简单选项
// 不要为课程类目、机构类型等创建单独的表
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

#### 3.7 表单布局规范 ⭐

**所有表单都使用垂直布局方式**：

```vue
<!-- ✅ 正确：使用垂直布局 -->
<template>
  <view class="form-container">
    <view class="form-group">
      <view class="form-label">课程名称</view>
      <wd-input v-model="form.name" placeholder="请输入课程名称" />
    </view>
    
    <view class="form-group">
      <view class="form-label">课程价格</view>
      <wd-input v-model="form.price" type="number" placeholder="请输入价格" />
    </view>
    
    <view class="form-group">
      <view class="form-label">课程描述</view>
      <wd-textarea v-model="form.description" placeholder="请输入描述" />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.form-container {
  padding: 32rpx;
}

.form-group {
  margin-bottom: 32rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
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
</style>

<!-- ❌ 避免：使用水平布局 -->
<template>
  <wd-cell-group>
    <wd-input v-model="form.name" label="课程名称" />
    <wd-input v-model="form.price" label="课程价格" />
  </wd-cell-group>
</template>
```

**垂直布局的优势**：
- 更清晰的视觉层级
- 适合移动端的触摸操作
- 便于添加必填标记和提示信息
- 更灵活的表单项排列
- 更好的错误提示显示空间

**布局原则**：
- 标签在上，输入框在下
- 每个表单项独立成组
- 使用统一的间距（32rpx）
- 必填项使用红色星号标记
- 支持长文本标签自动换行

#### 3.8 工具函数存放规范
```

2. **提取 Composables**：
```typescript
// 原始文件：UserProfile.vue (600 行)
// 拆分后：
// - UserProfile.vue (300 行 - UI 部分)
// - composables/useUserProfile.ts (200 行 - 逻辑部分)
// - composables/useUserStats.ts (100 行 - 统计逻辑)
```

3. **提取工具函数**：
```typescript
// 原始文件：UserProfile.vue (550 行)
// 拆分后：
// - UserProfile.vue (400 行)
// - utils/user-format.ts (150 行 - 格式化函数)
```

**拆分原则**：
- 保持单一职责原则
- 提高代码可维护性
- 便于代码复用
- 降低测试复杂度

#### 3.7 样式编写最佳实践

- 合理使用 SCSS 的嵌套、变量和混入功能
- **禁止硬编码颜色值**，必须使用主题变量

### 4. 页面开发规范

#### 页面文件结构

```vue
<template>
  <view class="page-container">
    <!-- 页面内容 -->
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

// 响应式数据
const title = ref('页面标题')

// 页面加载时触发
onLoad((options) => {
  console.log('页面参数:', options)
})

// 生命周期
onMounted(() => {
  // 初始化逻辑
})

// 方法定义
const handleClick = () => {
  // 处理逻辑
}
</script>

<style lang="scss" scoped>
.page-container {
  // 样式
}
</style>
```

#### 页面注册（pages.json）

```json
{
  "pages": [
    {
      "path": "pages/user-profile/index",
      "style": {
        "navigationBarTitleText": "用户资料",
        "navigationBarBackgroundColor": "#FFFFFF",
        "navigationBarTextStyle": "black"
      }
    }
  ]
}
```

---

## 组件开发规范

### 5. 组件定义规范

```vue
<template>
  <view class="user-card">
    <text class="user-card__name">{{ name }}</text>
    <text class="user-card__desc">{{ description }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Props 定义
interface Props {
  name: string
  age?: number
  description?: string
}

const props = withDefaults(defineProps<Props>(), {
  age: 0,
  description: '暂无描述'
})

// Emits 定义
interface Emits {
  (e: 'click', id: string): void
  (e: 'update', data: any): void
}

const emit = defineEmits<Emits>()

// 计算属性
const displayName = computed(() => `${props.name}(${props.age}岁)`)

// 方法
const handleClick = () => {
  emit('click', '123')
}
</script>

<style lang="scss" scoped>
.user-card {
  padding: 20rpx;
  
  &__name {
    font-size: 32rpx;
    font-weight: bold;
  }
  
  &__desc {
    font-size: 28rpx;
    color: #999;
  }
}
</style>
```

### 6. 组件使用 BEM 命名规范

```scss
// Block（块）
.user-card { }

// Element（元素）- 使用 __
.user-card__header { }
.user-card__body { }
.user-card__footer { }

// Modifier（修饰符）- 使用 --
.user-card--active { }
.user-card--disabled { }

// 组合使用
.user-card__title--large { }
```

---

## UnoCSS 使用规范

### 7. UnoCSS 原子类优先

**优先使用 UnoCSS 原子类**，减少自定义样式：

```vue
<template>
  <!-- ✅ 推荐：使用 UnoCSS -->
  <view class="flex items-center justify-between p-4 bg-white rounded-lg">
    <text class="text-lg font-bold text-gray-800">标题</text>
    <text class="text-sm text-gray-500">副标题</text>
  </view>

  <!-- ❌ 避免：过度自定义样式 -->
  <view class="custom-container">
    <text class="custom-title">标题</text>
  </view>
</template>
```

### 8. UnoCSS 快捷方式（Shortcuts）

项目已预定义常用快捷方式（`uno.config.ts`）：

| 快捷类名 | 说明 | 等价原子类 |
|---------|------|-----------|
| `flex-center` | 水平垂直居中 | `flex justify-center items-center` |
| `flex-between` | 两端对齐 | `flex justify-between items-center` |
| `flex-col-center` | 垂直居中布局 | `flex flex-col justify-center items-center` |
| `btn-primary` | 主按钮样式 | `px-4 py-2 rounded bg-blue-500 text-white` |
| `card` | 卡片样式 | `bg-white rounded-lg shadow-md p-4` |
| `text-ellipsis` | 单行省略 | `overflow-hidden text-ellipsis whitespace-nowrap` |

```vue
<template>
  <!-- 使用快捷类 -->
  <view class="flex-center">
    <text>居中内容</text>
  </view>

  <view class="card">
    <text class="text-ellipsis">这是一段很长的文本...</text>
  </view>
</template>
```

### 9. UnoCSS 主题色配置 ⭐

项目采用**绿色**作为主题色，完整配色体系如下：

#### 主题色（绿色系）

| 颜色层级 | UnoCSS 类 | SCSS 变量 | 色值 | 用途 |
|---------|----------|-----------|------|------|
| 主题绿 | `bg-primary` / `text-primary` | `$uni-color-primary` | #52c41a | 主要按钮、重点内容 |
| 浅绿 | `bg-primary-light` / `text-primary-light` | `$uni-color-primary-light` | #95de64 | hover 状态 |
| 更浅绿 | `bg-primary-lighter` / `text-primary-lighter` | `$uni-color-primary-lighter` | #d9f7be | 背景色、标签 |
| 深绿 | `bg-primary-dark` / `text-primary-dark` | `$uni-color-primary-dark` | #389e0d | active 状态 |
| 更深绿 | `bg-primary-darker` / `text-primary-darker` | `$uni-color-primary-darker` | #237804 | 强调、深色 |

#### 辅助色

| 类型 | UnoCSS 类 | SCSS 变量 | 色值 | 用途 |
|------|----------|-----------|------|------|
| 成功 | `bg-success` / `text-success` | `$uni-color-success` | #52c41a | 成功提示 |
| 警告 | `bg-warning` / `text-warning` | `$uni-color-warning` | #faad14 | 警告提示 |
| 危险 | `bg-danger` / `text-danger` | `$uni-color-error` | #f5222d | 错误、危险操作 |
| 信息 | `bg-info` / `text-info` | `$uni-color-info` | #1890ff | 一般信息提示 |

#### 文本颜色

| 类型 | UnoCSS 类 | SCSS 变量 | 色值 | 用途 |
|------|----------|-----------|------|------|
| 主要文本 | `text-text-primary` | `$uni-text-color` | #333333 | 标题、重要内容 |
| 次要文本 | `text-text-secondary` | `$uni-text-color-secondary` | #666666 | 正文、描述 |
| 辅助文本 | `text-text-tertiary` | `$uni-text-color-tertiary` | #999999 | 提示、说明 |
| 禁用文本 | `text-text-disabled` | `$uni-text-color-disable` | #c0c0c0 | 禁用状态 |
| 白色文本 | `text-text-white` | `$uni-text-color-inverse` | #ffffff | 按钮文字、深色背景 |

#### 背景颜色

| 类型 | UnoCSS 类 | SCSS 变量 | 色值 | 用途 |
|------|----------|-----------|------|------|
| 主背景 | `bg-bg-primary` | `$uni-bg-color` | #ffffff | 页面主背景 |
| 次背景 | `bg-bg-secondary` | `$uni-bg-color-grey` | #f5f5f5 | 区域划分背景 |
| 三级背景 | `bg-bg-tertiary` | - | #fafafa | 卡片、面板背景 |
| 遮罩 | `bg-bg-mask` | `$uni-bg-color-mask` | rgba(0,0,0,0.6) | 弹窗遮罩 |

#### 边框颜色

| 类型 | UnoCSS 类 | SCSS 变量 | 色值 | 用途 |
|------|----------|-----------|------|------|
| 主边框 | `border-border-primary` | `$uni-border-color` | #d9d9d9 | 输入框、卡片边框 |
| 次边框 | `border-border-secondary` | `$uni-border-color-secondary` | #e8e8e8 | 分割线 |
| 浅边框 | `border-border-light` | `$uni-border-color-light` | #f0f0f0 | 淡分割线 |

#### 颜色使用示例

```vue
<template>
  <!-- 主题色按钮 -->
  <button class="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark active:bg-primary-darker">
    确定
  </button>
  
  <!-- 标签 -->
  <view class="bg-primary-lighter text-primary px-2 py-1 rounded text-xs inline-block">
    成功标签
  </view>
  
  <!-- 文本颜色 -->
  <text class="text-text-primary">主标题</text>
  <text class="text-text-secondary">副标题</text>
  <text class="text-text-tertiary">辅助信息</text>
  
  <!-- 背景色 -->
  <view class="bg-bg-secondary p-4">
    <view class="bg-bg-primary p-4 rounded">
      内容区域
    </view>
  </view>
  
  <!-- 边框 -->
  <input class="border border-border-primary rounded px-3 py-2" />
</template>

<style lang="scss" scoped>
// SCSS 变量使用
.custom-button {
  background: $uni-color-primary;
  
  &:hover {
    background: $uni-color-primary-dark;
  }
  
  &:active {
    background: $uni-color-primary-darker;
  }
}

.custom-card {
  border: 1px solid $uni-border-color;
  background: $uni-bg-color;
  
  &:hover {
    border-color: $uni-color-primary;
  }
}
</style>
```

#### 颜色使用规范 ⚠️

```vue
<!-- ✅ 正确：使用颜色变量 -->
<button class="bg-primary text-white px-4 py-2 rounded">
  确定
</button>

<view class="bg-primary-lighter text-primary px-2 py-1 rounded">
  标签
</view>

<!-- SCSS 中使用 -->
<style lang="scss" scoped>
.custom-button {
  background: $uni-color-primary;
  &:hover {
    background: $uni-color-primary-dark;
  }
}
</style>

<!-- ❌ 错误：硬编码颜色值 -->
<button class="bg-[#52c41a]">不要这样</button>

<style lang="scss" scoped>
.button {
  background: #52c41a; /* 禁止硬编码 */
}
</style>
```

**重要提示**：
1. **必须使用颜色变量**，禁止硬编码颜色值
2. **保持一致性**，相同功能使用相同颜色
3. **语义化使用**，success 用于成功、danger 用于错误
4. **优先使用 UnoCSS 类**，减少自定义样式

---

### 10. UnoCSS 响应式设计

```vue
  <view class="text-info bg-info">信息色</view>
</template>
```

主题色定义：
- `primary`: #007aff
- `success`: #4cd964
- `warning`: #f0ad4e
- `danger`: #dd524d
- `info`: #909399

### 10. 安全区域适配

使用自定义规则处理刘海屏等安全区域：

```vue
<template>
  <!-- 顶部安全区域 -->
  <view class="safe-area-top bg-white">
    <text>顶部内容</text>
  </view>

  <!-- 底部安全区域 -->
  <view class="safe-area-bottom bg-white">
    <text>底部内容</text>
  </view>
</template>
```

### 11. 响应式单位

uni-app 使用 rpx 作为响应式单位（750rpx = 屏幕宽度）：

```vue
<template>
  <!-- rpx 单位在 class 中使用需要自定义 -->
  <view class="w-[200rpx] h-[200rpx]">固定尺寸</view>
  
  <!-- 或使用 style -->
  <view :style="{ width: '200rpx', height: '200rpx' }">固定尺寸</view>
  
  <!-- UnoCSS 的单位（自动转换） -->
  <view class="w-20 h-20 text-4xl">使用 UnoCSS</view>
</template>
```

---

## API 请求规范

### 12. 请求封装使用规范

统一使用 `utils/request.ts` 封装的请求方法：

```typescript
import { get, post, put, del } from '@/utils/request'

// GET 请求
const getUserInfo = () => {
  return get<UserInfo>('/api/user/info')
}

// POST 请求
const login = (data: LoginParams) => {
  return post<LoginResult>('/api/login', data, {
    showLoading: true,  // 显示加载提示
    showError: true,    // 显示错误提示
  })
}

// PUT 请求
const updateUser = (data: UpdateUserParams) => {
  return put('/api/user/update', data)
}

// DELETE 请求
const deleteUser = (id: string) => {
  return del(`/api/user/${id}`)
}
```

### 13. API 模块化管理

按业务模块组织 API（`api/` 目录）：

```typescript
// api/user.ts
import { get, post } from '@/utils/request'

export const userApi = {
  // 登录
  login(data: { username: string; password: string }) {
    return post<{ token: string; userInfo: UserInfo }>('/api/login', data)
  },

  // 获取用户信息
  getUserInfo(id: string) {
    return get<UserInfo>(`/api/user/${id}`)
  },

  // 更新用户信息
  updateUserInfo(data: Partial<UserInfo>) {
    return post('/api/user/update', data)
  },
}

// api/product.ts
export const productApi = {
  getList(params: { page: number; pageSize: number }) {
    return get<PageResult<Product>>('/api/product/list', params)
  },
}

// api/index.ts - 统一导出
export * from './user'
export * from './product'
```

### 14. 类型定义规范

为 API 请求和响应定义 TypeScript 类型：

```typescript
// types/user.ts
export interface UserInfo {
  id: string
  username: string
  avatar: string
  role: string[]
  createdAt: string
}

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  userInfo: UserInfo
}

// types/common.ts
export interface PageResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
```

### 15. Token 管理

```typescript
import { setToken, clearToken } from '@/utils/request'

// 登录成功后设置 token
const handleLogin = async () => {
  const { token } = await userApi.login({ username, password })
  setToken(token)
  uni.navigateTo({ url: '/pages/home/index' })
}

// 退出登录清除 token
const handleLogout = () => {
  clearToken()
  uni.reLaunch({ url: '/pages/login/index' })
}
```

---

## 样式开发规范

### 16. 样式优先级

**强制规范**：优先使用 UnoCSS 编写样式，如非必要，不要手动编写样式。

样式使用优先级：
1. **优先使用 UnoCSS 原子类**（强制优先）
2. 使用 UnoCSS Shortcuts（快捷类）
3. 组件内 scoped 样式（BEM 命名）- 仅在 UnoCSS 无法实现时使用
4. 全局样式（uni.scss）- 仅用于全局变量

```vue
<template>
  <!-- 1. 优先：UnoCSS 原子类 -->
  <view class="flex items-center p-4 bg-white">
    
    <!-- 2. 其次：UnoCSS Shortcuts -->
    <view class="flex-center card">
      
      <!-- 3. 最后：自定义类（BEM） -->
      <view class="user-card__header">
        <text>内容</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
// 自定义样式使用 BEM
.user-card {
  &__header {
    // 特殊样式
  }
}
</style>
```

### 17. 全局样式变量（uni.scss）

定义全局 SCSS 变量供所有组件使用：

```scss
// uni.scss
$primary-color: #007aff;
$success-color: #4cd964;
$warning-color: #f0ad4e;
$danger-color: #dd524d;

$border-radius: 8rpx;
$spacing-sm: 10rpx;
$spacing-md: 20rpx;
$spacing-lg: 30rpx;
```

组件中使用：

```vue
<style lang="scss" scoped>
.custom-button {
  background-color: $primary-color;
  border-radius: $border-radius;
  padding: $spacing-md;
}
</style>
```

---

## 状态管理规范

### 18. Pinia 使用规范（推荐）

```typescript
// stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // State
  const userInfo = ref<UserInfo | null>(null)
  const token = ref('')

  // Getters
  const isLogin = computed(() => !!token.value)
  const userName = computed(() => userInfo.value?.username || '未登录')

  // Actions
  const setUserInfo = (info: UserInfo) => {
    userInfo.value = info
  }

  const setToken = (newToken: string) => {
    token.value = newToken
  }

  const logout = () => {
    userInfo.value = null
    token.value = ''
  }

  return {
    userInfo,
    token,
    isLogin,
    userName,
    setUserInfo,
    setToken,
    logout,
  }
})
```

在组件中使用：

```vue
<script setup lang="ts">
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 访问状态
console.log(userStore.userName)

// 修改状态
userStore.setUserInfo({ id: '1', username: 'admin' })
</script>
```

---

## 路由导航规范

### 19. 路由跳转

```typescript
// 保留当前页面，跳转到新页面
uni.navigateTo({
  url: '/pages/detail/index?id=123'
})

// 关闭当前页面，跳转到新页面
uni.redirectTo({
  url: '/pages/login/index'
})

// 关闭所有页面，打开到应用内的某个页面
uni.reLaunch({
  url: '/pages/home/index'
})

// 跳转到 tabBar 页面
uni.switchTab({
  url: '/pages/home/index'
})

// 返回上一页
uni.navigateBack({
  delta: 1
})
```

### 20. 页面参数传递

```typescript
// 传递参数（URL 编码）
const id = '123'
const name = '张三'
uni.navigateTo({
  url: `/pages/detail/index?id=${id}&name=${encodeURIComponent(name)}`
})

// 接收参数
import { onLoad } from '@dcloudio/uni-app'

onLoad((options) => {
  const id = options.id
  const name = decodeURIComponent(options.name || '')
  console.log('接收参数:', id, name)
})
```

---

## 组件库使用规范

### 21. wot-design-uni 组件库

项目集成了 wot-design-uni 组件库，已配置自动导入。

```vue
<template>
  <!-- 直接使用，无需手动导入 -->
  <wd-button type="primary" @click="handleClick">按钮</wd-button>
  
  <wd-cell-group>
    <wd-cell title="单元格" value="内容" />
  </wd-cell-group>
  
  <wd-toast ref="toast" />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const toast = ref()

const handleClick = () => {
  toast.value.show('点击成功')
}
</script>
```

**常用组件**：
- `wd-button` - 按钮
- `wd-cell` / `wd-cell-group` - 单元格
- `wd-toast` - 提示
- `wd-dialog` - 对话框
- `wd-loading` - 加载中
- `wd-input` - 输入框
- `wd-picker` - 选择器

---

## 工具函数规范

### 22. Toast 提示封装

使用 `utils/toast.ts` 统一管理提示：

```typescript
import {
  showSuccessToast,
  showErrorToast,
  showLoading,
  hideLoading
} from '@/utils/toast'

// 成功提示
showSuccessToast('操作成功')

// 错误提示
showErrorToast('操作失败')

// 显示加载
showLoading('加载中...')

// 隐藏加载
hideLoading()
```

### 23. 工具函数组织

按功能模块组织工具函数：

```typescript
// utils/format.ts - 格式化相关
export const formatDate = (date: Date | string, format = 'YYYY-MM-DD') => {
  // 实现
}

export const formatMoney = (amount: number) => {
  return `¥${amount.toFixed(2)}`
}

// utils/validate.ts - 验证相关
export const isPhone = (phone: string) => {
  return /^1[3-9]\d{9}$/.test(phone)
}

export const isEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
```

---

## 性能优化规范

### 24. 图片优化

```vue
<template>
  <!-- 使用合适的图片模式 -->
  <image 
    :src="imageUrl" 
    mode="aspectFill"
    lazy-load
    class="w-full h-[300rpx]"
  />
</template>
```

**图片模式**：
- `scaleToFill` - 缩放填充
- `aspectFit` - 保持宽高比，完整显示
- `aspectFill` - 保持宽高比，裁剪填充
- `widthFix` - 宽度不变，高度自适应

### 25. 列表优化

长列表使用虚拟滚动：

```vue
<template>
  <scroll-view 
    scroll-y 
    class="h-screen"
    @scrolltolower="loadMore"
  >
    <view 
      v-for="item in list" 
      :key="item.id"
      class="list-item"
    >
      {{ item.name }}
    </view>
  </scroll-view>
</template>
```

---

## TypeScript 规范

### 26. 类型定义

```typescript
// 接口定义
interface User {
  id: string
  name: string
  age?: number
}

// 类型别名
type Status = 'pending' | 'success' | 'error'

// 联合类型
type ID = string | number

// 泛型
interface ApiResponse<T> {
  code: number
  data: T
  message: string
}
```

### 27. 类型导出

```typescript
// types/index.ts - 统一导出类型
export * from './user'
export * from './product'
export * from './common'

// 在组件中使用
import type { User, Product } from '@/types'
```

---

## 代码注释规范

### 28. 文件注释

```typescript
/**
 * 用户相关 API
 * @author yourname
 * @date 2025-12-15
 */
```

### 29. 函数注释

```typescript
/**
 * 格式化日期
 * @param date - 日期对象或字符串
 * @param format - 格式化模板，默认 'YYYY-MM-DD'
 * @returns 格式化后的日期字符串
 */
export const formatDate = (date: Date | string, format = 'YYYY-MM-DD'): string => {
  // 实现
}
```

---

## 常见问题

### Q: 为什么使用 UnoCSS 而不是传统 CSS？
A: UnoCSS 提供原子化 CSS，减少样式冗余，提高开发效率，且与 Tailwind CSS 语法兼容。

### Q: rpx 和 UnoCSS 的单位如何选择？
A: 固定尺寸使用 rpx（如 `width: 200rpx`），响应式布局优先使用 UnoCSS 的相对单位。

### Q: 组件库自动导入如何配置？
A: 已在 `vite.config.ts` 中配置 `@uni-helper/vite-plugin-uni-components`，无需手动导入。

### Q: 如何处理多端差异？
A: 使用条件编译 `#ifdef H5` / `#ifdef MP-WEIXIN` 或运行时判断 `uni.getSystemInfoSync().platform`。

---

## 快速开始

### 安装依赖
```bash
pnpm install
```

### 运行项目
```bash
# H5
pnpm run dev:h5

# 微信小程序
pnpm run dev:mp-weixin

# 支付宝小程序
pnpm run dev:mp-alipay
```

### 构建项目
```bash
# 构建 H5
pnpm run build:h5

# 构建微信小程序
pnpm run build:mp-weixin
```

---

## 页面路由列表

### 公共页面
- `/pages/index/index` - 首页
- `/pages/login/index` - 家长端登录
- `/pages/mine/index` - 家长个人中心

### 机构端页面
- `/pages/institution/login/index` - 机构登录
- `/pages/institution/settle/index` - 机构入驻申请
- `/pages/institution/center/index` - 机构个人中心
- `/pages/institution/courses/index` - 课程列表
- `/pages/institution/course-edit/index` - 课程编辑
- `/pages/institution/classroom-list/index` - 教室列表 ⭐
- `/pages/institution/classroom-edit/index` - 教室编辑 ⭐
- `/pages/institution/teacher-list/index` - 教师列表 ⭐
- `/pages/institution/teacher-edit/index` - 教师编辑 ⭐

### 演示页面
- `/pages/file-upload-demo/index` - 文件上传演示

---

## 更新日志

- **2025-12-25**: 新增教室管理、教师管理模块，新增AsyncImage、EnumsTag组件
- **2025-12-15**: 初始版本，建立核心开发规范
