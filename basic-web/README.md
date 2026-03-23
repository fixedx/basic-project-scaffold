# 兴趣班项目脚手架

> 基于 Vue3 + TypeScript + Vite + wot-design-uni 的微信小程序/H5 双端脚手架

## 技术栈

- **前端框架**: Vue3 + TypeScript
- **构建工具**: Vite
- **UI 组件库**: wot-design-uni
- **跨端方案**: 微信小程序 + H5
- **状态管理**: Vue Composition API (reactive)
- **网络请求**: uni-app request (Axios-like)

## 目录结构

```
interest-class-web/
├── src/
│   ├── api/                 # API 接口（业务模块导出入口）
│   │   └── index.ts        # API 导出框架
│   ├── assets/              # 静态资源（需配置）
│   ├── components/          # 通用组件
│   │   ├── AsyncImage/     # 异步图片加载
│   │   ├── EmptyState/     # 空状态
│   │   ├── Loading/        # 加载组件
│   │   └── PageFooter/     # 页面底部
│   ├── composables/         # Composition API 封装
│   │   ├── useAuthGuard.ts   # 登录状态守卫（框架）
│   │   └── useEnums.ts       # 枚举类型（框架）
│   ├── pages/               # 页面目录（已清空，待开发）
│   │   ├── index/          # 首页
│   │   ├── mine/           # 我的
│   │   ├── institution/    # 机构端
│   │   ├── teacher/        # 教师端
│   │   └── admin/          # 管理端
│   ├── static/              # 静态资源
│   │   ├── iconfont/       # iconfont 图标
│   │   └── tabbar/         # tabbar 图标
│   ├── stores/              # 状态管理
│   │   └── user.ts         # 用户状态（框架）
│   ├── utils/               # 工具函数
│   │   ├── auth.ts         # 认证工具
│   │   ├── request.ts      # 网络请求封装
│   │   ├── toast.ts        # 轻提示
│   │   └── throttle.ts     # 节流/防抖
│   ├── App.vue             # 根组件
│   └── main.ts             # 入口文件
├── index.html              # HTML 入口
├── vite.config.ts          # Vite 配置
└── package.json            # 依赖配置
```

## 快速开始

### 安装依赖

```bash
cd interest-class-web
npm install
# 或使用 pnpm
pnpm install
```

### 开发模式

```bash
# H5 开发
npm run dev:h5

# 微信小程序开发
npm run dev:mp-weixin

# H5 生产构建
npm run build:h5

# 微信小程序生产构建
npm run build:mp-weixin
```

## 脚手架特性

### ✅ 已有的基础设施

1. **网络请求封装** (`src/utils/request.ts`)
   - 请求/响应拦截器
   - Token 自动注入
   - 错误统一处理

2. **认证工具** (`src/utils/auth.ts`)
   - Token 存取
   - 用户类型判断

3. **轻提示** (`src/utils/toast.ts`)
   - 成功/失败/加载提示

4. **通用组件**
   - AsyncImage: 异步图片加载（带占位符）
   - EmptyState: 空状态展示
   - Loading: 加载动画
   - PageFooter: 页面底部

5. **登录状态守卫** (`src/composables/useAuthGuard.ts`)
   - Token 检测
   - 未登录自动跳转

6. **用户状态管理** (`src/stores/user.ts`)
   - 状态定义框架
   - 登录/登出方法占位

### 🚧 待开发

- 各端页面开发
- 业务 API 接口对接
- 业务组件开发

## 开发规范

### 目录命名

- 页面目录: `kebab-case` (如 `course-list`)
- 组件目录: `PascalCase` (如 `CourseCard`)
- 工具函数: `kebab-case` (如 `throttle.ts`)

### API 封装

参考 `src/utils/request.ts` 封装业务 API：

```ts
// src/api/course.ts
import request from '@/utils/request'

export const courseApi = {
  list: (params: any) => request.get('/course/list', { params }),
  detail: (id: string) => request.get(`/course/${id}`),
  create: (data: any) => request.post('/course', data),
  update: (id: string, data: any) => request.put(`/course/${id}`, data),
  delete: (id: string) => request.delete(`/course/${id}`),
}
```

### 页面开发

```vue
<template>
  <div class="page">
    <!-- 页面内容 -->
  </div>
</template>

<script setup lang="ts">
// 页面逻辑
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
}
</style>
```

## 常见问题

### Q: 如何添加新的页面？
A: 在 `src/pages/` 下创建目录，添加 `index.vue` 文件，并在 `pages.json` 中配置路由。

### Q: 如何添加新的 API？
A: 在 `src/api/` 下创建 `*.ts` 文件，封装 API 方法，然后在 `index.ts` 中导出。

### Q: 如何使用通用组件？
A: 在页面中直接 import 使用，如 `<EmptyState />`

## License

MIT