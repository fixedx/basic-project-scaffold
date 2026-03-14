<template>
  <view class="page-footer" :style="customStyle">
    <slot></slot>
  </view>
</template>

<script setup lang="ts">
interface Props {
  customStyle?: string
}

withDefaults(defineProps<Props>(), {
  customStyle: ''
})
</script>

<style lang="scss" scoped>
.page-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 16rpx;
  padding: 16rpx 32rpx;
  background-color: $uni-bg-color;
  border-top: 1rpx solid $uni-border-color-light;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  z-index: 99;
  
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));

  :deep(wd-button),
  :deep(.wd-button) {
    flex: 1;
    width: 100%;
    
    // 强制内部元素也沾满
    .wd-button {
      width: 100%;
    }
  }
}
</style>
