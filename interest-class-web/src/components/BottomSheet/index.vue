<template>
  <wd-popup
    v-model="visible"
    position="bottom"
    :close-on-click-modal="closeOnMask"
    :z-index="zIndex"
    custom-style="border-radius: 32rpx 32rpx 0 0;"
    @close="onClose"
  >
    <view class="bottom-sheet">
      <!-- 顶部拖拽指示条 -->
      <view class="bottom-sheet__indicator" />

      <!-- 标题栏 -->
      <view class="bottom-sheet__header">
        <!-- 左侧插槽（可选） -->
        <view class="bottom-sheet__header-left">
          <slot name="header-left" />
        </view>

        <!-- 标题 -->
        <text class="bottom-sheet__title">{{ title }}</text>

        <!-- 右侧：默认关闭按钮，可通过 header-right 插槽覆盖 -->
        <view class="bottom-sheet__header-right">
          <slot name="header-right">
            <view class="bottom-sheet__close" @click="onClose">
              <text class="iconfont icon-close" />
            </view>
          </slot>
        </view>
      </view>

      <!-- 主体内容插槽 -->
      <view class="bottom-sheet__body" :style="bodyStyle">
        <slot />
      </view>

      <!-- 底部操作插槽（可选） -->
      <view v-if="$slots.footer" class="bottom-sheet__footer">
        <slot name="footer" />
      </view>
    </view>
  </wd-popup>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** 是否显示（v-model） */
  modelValue: boolean
  /** 标题文字 */
  title?: string
  /** 点击遮罩是否关闭 */
  closeOnMask?: boolean
  /** z-index */
  zIndex?: number
  /** body 区域最大高度，超出滚动 */
  maxHeight?: string
  /** body 区域自定义内边距 */
  bodyPadding?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  closeOnMask: true,
  zIndex: 1000,
  maxHeight: '80vh',
  bodyPadding: '0 32rpx 32rpx',
})

interface Emits {
  (e: 'update:modelValue', val: boolean): void
  (e: 'close'): void
}
const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const bodyStyle = computed(() => ({
  maxHeight: props.maxHeight,
  padding: props.bodyPadding,
  overflowY: 'auto' as const,
}))

function onClose() {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<style lang="scss" scoped>
.bottom-sheet {
  background-color: $uni-bg-color;
  padding-bottom: env(safe-area-inset-bottom);

  /* 拖拽指示条 */
  &__indicator {
    width: 80rpx;
    height: 8rpx;
    background-color: #e8e8e8;
    border-radius: 4rpx;
    margin: 20rpx auto 0;
  }

  /* 标题栏 */
  &__header {
    display: flex;
    align-items: center;
    padding: 32rpx 32rpx 24rpx;
    position: relative;

    &-left {
      min-width: 60rpx;
    }

    &-right {
      min-width: 60rpx;
      display: flex;
      justify-content: flex-end;
    }
  }

  &__title {
    flex: 1;
    text-align: center;
    font-size: 34rpx;
    font-weight: 700;
    color: $uni-text-color;
  }

  &__close {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: $uni-bg-color-grey;

    .iconfont {
      font-size: 28rpx;
      color: $uni-text-color-secondary;
    }
  }

  /* 主体内容 */
  &__body {
    box-sizing: border-box;
  }

  /* 底部操作区 */
  &__footer {
    padding: 16rpx 32rpx 16rpx;
    border-top: 2rpx solid $uni-border-color-light;
  }
}
</style>
