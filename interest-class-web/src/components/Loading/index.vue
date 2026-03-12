<template>
  <view class="loading-container" :style="containerStyle">
    <view class="loading-spinner" :style="spinnerStyle"></view>
    <text v-if="text" class="loading-text" :style="textStyle">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

interface Props {
  size?: string | number
  color?: string
  text?: string
  vertical?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: '48rpx',
  color: '#52c41a',
  text: '',
  vertical: true
})

const containerStyle = computed((): CSSProperties => ({
  flexDirection: props.vertical ? 'column' : 'row',
}))

const spinnerStyle = computed((): CSSProperties => {
  const size = typeof props.size === 'number' ? `${props.size}rpx` : props.size
  return {
    width: size,
    height: size,
    borderColor: `${props.color} transparent transparent transparent`,
  }
})

const textStyle = computed((): CSSProperties => ({
  color: props.color,
  marginTop: props.vertical ? '16rpx' : '0',
  marginLeft: props.vertical ? '0' : '16rpx',
}))
</script>

<style lang="scss" scoped>
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  border: 4rpx solid;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 28rpx;
}
</style>
