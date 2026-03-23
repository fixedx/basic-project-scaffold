# Iconfont 使用说明（CDN 方式）

## 1. 配置步骤

### 1.1 在阿里 iconfont 官网操作
1. 访问 https://www.iconfont.cn/
2. 登录/注册账号
3. 创建新项目（或使用已有项目）
4. 在"图标库"中搜索并添加需要的图标到购物车
5. 点击购物车 → 添加至项目

### 1.2 获取 CDN 链接
1. 在项目页面，点击"Font class"标签
2. 点击"查看在线链接"
3. 复制类似 `//at.alicdn.com/t/c/font_xxxx.css` 的链接

### 1.3 更新本地配置
1. 打开 `src/static/iconfont/iconfont.css`
2. 将 `@import url('...')` 中的 URL 替换为你复制的链接
3. 已在 `App.vue` 中全局引入，无需额外操作

## 2. 使用方式

### 2.1 基本使用
```vue
<template>
  <text class="iconfont icon-home"></text>
</template>
```

### 2.2 自定义大小和颜色
```vue
<template>
  <text class="iconfont icon-home custom-icon"></text>
</template>

<style>
.custom-icon {
  font-size: 48rpx;
  color: #52c41a;
}
</style>
```

### 2.3 在组件中使用
```vue
<template>
  <view class="icon-wrapper">
    <text class="iconfont icon-phone"></text>
    <text>联系电话</text>
  </view>
</template>

<style>
.icon-wrapper {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
</style>
```

## 3. 更新图标

当需要添加新图标时：
1. 在 iconfont 项目中添加新图标
2. 重新下载项目文件
3. 替换本地的 `iconfont.css`、`iconfont.ttf`、`iconfont.woff`、`iconfont.woff2` 文件
4. 重启项目

## 4. 注意事项

1. **文件路径**：确保 `iconfont.css` 中的字体文件路径正确
2. **字体加载**：首次加载可能需要一点时间，建议在 App.vue 中提前引入
3. **图标名称**：使用时类名格式为 `icon-xxx`，其中 `xxx` 是图标名称
4. **跨平台兼容**：字体图标在 H5、小程序、App 中都能正常显示
5. **版本管理**：建议在 `iconfont.css` 的 URL 中添加时间戳参数，避免缓存问题

## 5. 常用图标清单

| 图标名称 | 类名 | 用途 |
|---------|------|------|
| 首页 | `icon-home` | 底部导航 |
| 搜索 | `icon-search` | 搜索功能 |
| 用户 | `icon-user` | 个人中心 |
| 课程 | `icon-course` | 课程相关 |
| 机构 | `icon-institution` | 机构相关 |
| 电话 | `icon-phone` | 联系方式 |
| 位置 | `icon-location` | 地址导航 |
| 时间 | `icon-time` | 时间显示 |
| 星星 | `icon-star` | 评分 |
| 箭头 | `icon-arrow-right` | 跳转提示 |

## 6. 故障排查

### 图标不显示？
1. 检查是否正确引入 CSS 文件
2. 检查类名是否正确（必须同时有 `iconfont` 和 `icon-xxx`）
3. 检查字体文件路径是否正确
4. 清除缓存并重新编译

### 图标显示为方框？
1. 字体文件未正确加载，检查网络请求
2. 字体文件路径错误，检查 `iconfont.css` 中的 URL
3. 图标 Unicode 码错误，重新下载最新文件

### 部分图标不显示？
1. 该图标可能未添加到项目中
2. 类名拼写错误
3. 重新下载并替换字体文件
