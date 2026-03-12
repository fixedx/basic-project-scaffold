<template>
  <view class="demo-page">
    <view class="demo-section">
      <view class="section-title">iconfont 使用示例</view>
      
      <!-- 基本使用 -->
      <view class="demo-item">
        <text class="label">基本使用：</text>
        <text class="iconfont icon-home"></text>
        <text class="iconfont icon-search"></text>
        <text class="iconfont icon-customer"></text>
      </view>
      
      <!-- 自定义大小 -->
      <view class="demo-item">
        <text class="label">自定义大小：</text>
        <text class="iconfont icon-home" style="font-size: 48rpx;"></text>
        <text class="iconfont icon-search" style="font-size: 64rpx;"></text>
        <text class="iconfont icon-customer" style="font-size: 80rpx;"></text>
      </view>
      
      <!-- 自定义颜色 -->
      <view class="demo-item">
        <text class="label">自定义颜色：</text>
        <text class="iconfont icon-phone" style="color: #52c41a;"></text>
        <text class="iconfont icon-location" style="color: #1890ff;"></text>
        <text class="iconfont icon-star" style="color: #faad14;"></text>
      </view>
      
      <!-- 组合使用 -->
      <view class="demo-item">
        <text class="label">组合使用：</text>
        <view class="icon-text-group">
          <text class="iconfont icon-phone"></text>
          <text>联系电话</text>
        </view>
        <view class="icon-text-group">
          <text class="iconfont icon-location"></text>
          <text>地址导航</text>
        </view>
      </view>
      
      <!-- 按钮中使用 -->
      <view class="demo-item">
        <text class="label">按钮中使用：</text>
        <button class="icon-button">
          <text class="iconfont icon-search"></text>
          <text>搜索</text>
        </button>
        <button class="icon-button primary">
          <text class="iconfont icon-phone"></text>
          <text>拨打电话</text>
        </button>
      </view>
    </view>
    
    <view class="usage-tips">
      <view class="tips-title">使用提示</view>
      <view class="tips-content">
        <text>1. 必须同时使用 iconfont 和 icon-xxx 两个类名</text>
        <text>2. 通过 style 或 class 自定义大小、颜色</text>
        <text>3. 可以像普通文字一样使用，支持所有文本样式</text>
        <text>4. 详细说明请查看 src/static/iconfont/README.md</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// iconfont 已在 App.vue 中全局引入，无需额外导入
</script>

<style lang="scss" scoped>
.demo-page {
  padding: 32rpx;
  background-color: $uni-bg-color-grey;
  min-height: 100vh;
}

.demo-section {
  padding: 32rpx;
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 36rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-bottom: 32rpx;
}

.demo-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid $uni-border-color-light;
  
  &:last-child {
    border-bottom: none;
  }
}

.label {
  min-width: 180rpx;
  font-size: 28rpx;
  color: $uni-text-color-secondary;
}

.icon-text-group {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background-color: $uni-bg-color-grey;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.icon-button {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background-color: $uni-bg-color-grey;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: $uni-text-color;
  
  &.primary {
    background-color: $uni-color-primary;
    color: $uni-text-color-inverse;
  }
}

.usage-tips {
  padding: 32rpx;
  background-color: $uni-color-primary-lighter;
  border-radius: 16rpx;
  border-left: 8rpx solid $uni-color-primary;
}

.tips-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-color-primary;
  margin-bottom: 16rpx;
}

.tips-content {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  
  text {
    font-size: 26rpx;
    color: $uni-text-color-secondary;
    line-height: 1.6;
  }
}
</style>
