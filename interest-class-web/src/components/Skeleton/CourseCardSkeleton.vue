<template>
  <!-- 课程卡片骨架屏 -->
  <view class="skeleton-card" :class="{ animate: animate }">
    <!-- 头部：标题和价格 -->
    <view class="skeleton-header">
      <view class="skeleton-title"></view>
      <view class="skeleton-price"></view>
    </view>
    
    <!-- 机构信息 -->
    <view class="skeleton-row">
      <view class="skeleton-text short"></view>
    </view>
    
    <!-- 副标题 -->
    <view class="skeleton-row">
      <view class="skeleton-text medium"></view>
    </view>
    
    <!-- 标签区域 -->
    <view class="skeleton-tags">
      <view class="skeleton-tag"></view>
      <view class="skeleton-tag"></view>
      <view class="skeleton-tag"></view>
    </view>
    
    <!-- 底部信息 -->
    <view class="skeleton-footer">
      <view class="skeleton-text tiny"></view>
    </view>
  </view>
</template>

<script lang="ts">
export default {
  name: 'CourseCardSkeleton',
  options: {
    virtualHost: true
  }
}
</script>

<script setup lang="ts">
interface Props {
  /** 是否显示动画 */
  animate?: boolean
}

withDefaults(defineProps<Props>(), {
  animate: true
})
</script>

<style lang="scss" scoped>
.skeleton-card {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  
  &.animate {
    .skeleton-title,
    .skeleton-price,
    .skeleton-text,
    .skeleton-tag {
      background: linear-gradient(
        90deg,
        #f0f0f0 25%,
        #e6e6e6 50%,
        #f0f0f0 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
  }
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.skeleton-title {
  flex: 1;
  height: 36rpx;
  background-color: #f0f0f0;
  border-radius: 6rpx;
  margin-right: 20rpx;
}

.skeleton-price {
  width: 120rpx;
  height: 36rpx;
  background-color: #f0f0f0;
  border-radius: 6rpx;
  flex-shrink: 0;
}

.skeleton-row {
  margin-bottom: 12rpx;
}

.skeleton-text {
  height: 26rpx;
  background-color: #f0f0f0;
  border-radius: 4rpx;
  
  &.short {
    width: 40%;
  }
  
  &.medium {
    width: 60%;
  }
  
  &.tiny {
    width: 30%;
  }
}

.skeleton-tags {
  display: flex;
  gap: 12rpx;
  margin: 16rpx 0;
}

.skeleton-tag {
  width: 100rpx;
  height: 32rpx;
  background-color: #f0f0f0;
  border-radius: 6rpx;
}

.skeleton-footer {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f5f5f5;
}
</style>