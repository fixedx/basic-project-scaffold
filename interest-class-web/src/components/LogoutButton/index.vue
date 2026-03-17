<template>
  <view class="logout-button-wrap">
    <view class="logout-button" @click="emit('click')">
      <text class="iconfont icon-return logout-button__icon"></text>
      <text class="logout-button__text">{{ text }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
interface Props {
  text?: string
}

withDefaults(defineProps<Props>(), {
  text: '退出登录',
})

const emit = defineEmits<{
  (e: 'click'): void
}>()
</script>

<style lang="scss" scoped>
.logout-button-wrap {
  padding: 16rpx 32rpx 32rpx;
}

.logout-button {
  height: 88rpx;
  border-radius: 44rpx;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  color: $uni-color-error;
  box-shadow: 0 6rpx 18rpx rgba(245, 34, 45, 0.08);

  &:active {
    background-color: rgba(245, 34, 45, 0.06);
  }

  &__icon {
    font-size: 28rpx;
    color: $uni-color-error;
  }

  &__text {
    font-size: 30rpx;
    font-weight: 500;
    color: $uni-color-error;
  }
}
</style>
