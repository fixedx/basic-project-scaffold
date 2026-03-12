<template>
  <view class="notification-page">
    <!-- 空状态 -->
    <view class="empty-state">
      <text class="empty-icon iconfont icon-remind"></text>
      <text class="empty-title">暂无消息</text>
      <text class="empty-desc">消息通知功能即将上线，敬请期待</text>
    </view>
  </view>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
.notification-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 64rpx;
}

.empty-icon {
  font-size: 120rpx;
  color: $uni-text-color-disable;
  margin-bottom: 32rpx;
}

.empty-title {
  font-size: 32rpx;
  color: $uni-text-color;
  font-weight: 500;
  margin-bottom: 16rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: $uni-text-color-tertiary;
}
</style>
