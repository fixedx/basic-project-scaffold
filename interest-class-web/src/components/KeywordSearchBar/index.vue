<template>
  <view class="keyword-search-bar">
    <wd-search
      v-model="keywordValue"
      :placeholder="placeholder"
      :hide-cancel="hideCancel"
      @search="emit('search')"
      @clear="handleClear"
    />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: string
  placeholder?: string
  hideCancel?: boolean
  light?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请输入关键词',
  hideCancel: true,
  light: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'search'): void
  (e: 'clear'): void
}>()

const keywordValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<style lang="scss" scoped>
.keyword-search-bar {
  padding: 8rpx 0;
  border-bottom: 1rpx solid $uni-border-color-light;
  background-color: $uni-bg-color;
}

:deep(.wd-search) {
  background: transparent !important;
  padding: 0 32rpx;
}

:deep(.wd-search__search) {
  background-color: $uni-bg-color-grey !important;
  border-radius: 16rpx !important;
}

:deep(.wd-search__search-input) {
  font-size: 28rpx !important;
  color: $uni-text-color !important;
}

:deep(.wd-search__search-icon),
:deep(.wd-search__clear) {
  color: $uni-text-color-tertiary !important;
}
</style>
