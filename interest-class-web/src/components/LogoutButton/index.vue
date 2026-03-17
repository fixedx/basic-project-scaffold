<template>
  <view class="logout-button-wrap">
    <wd-button
      block
      type="error"
      plain
      custom-class="logout-button"
      @click="emit('click')"
    >
      {{ text }}
    </wd-button>
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
  margin-top: 64rpx;
  padding: 0 32rpx;
}

:deep(.logout-button) {
  height: 88rpx;
  border-radius: 16rpx !important;
  font-size: 30rpx !important;
  font-weight: 500;
}

:deep(.logout-button.is-plain) {
  background-color: $uni-bg-color;
}
</style>
