<template>
  <view class="enums-tag">
    <view v-if="enumItems && enumItems.length > 0" class="tag-group">
      <view
        v-for="item in enumItems"
        :key="item.code"
        class="tag-item"
        :class="{ 
          'tag-active': isSelected(item.code),
          'tag-disabled': disabled
        }"
        @click="handleSelect(item.code)"
      >
        <text v-if="item.icon" class="tag-icon">{{ item.icon }}</text>
        <text class="tag-label">{{ item.label }}</text>
      </view>
    </view>
    <view v-else class="empty-tip">暂无选项</view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EnumItem } from '@/api/enum'

interface Props {
  /** 枚举类型 */
  enumType: string
  /** 枚举数据 */
  enumItems: EnumItem[]
  /** 当前选中值（单选时传字符串，多选时传数组） */
  modelValue: string | string[]
  /** 是否多选 */
  multiple?: boolean
  /** 是否禁用 */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  multiple: false,
  disabled: false,
})

interface Emits {
  (e: 'update:modelValue', value: string | string[]): void
  (e: 'change', value: string | string[]): void
}

const emit = defineEmits<Emits>()

/**
 * 判断是否选中
 */
const isSelected = (code: string): boolean => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.includes(code)
  }
  return props.modelValue === code
}

/**
 * 处理选择
 */
const handleSelect = (code: string) => {
  if (props.disabled) return

  let newValue: string | string[]

  if (props.multiple) {
    // 多选模式
    const currentValue = Array.isArray(props.modelValue) ? props.modelValue : []
    if (currentValue.includes(code)) {
      // 取消选中
      newValue = currentValue.filter((v) => v !== code)
    } else {
      // 添加选中
      newValue = [...currentValue, code]
    }
  } else {
    // 单选模式
    newValue = code
  }

  emit('update:modelValue', newValue)
  emit('change', newValue)
}
</script>

<style lang="scss" scoped>
.enums-tag {
  width: 100%;
}

.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-item {
  display: flex;
  align-items: center;
  padding: 5rpx 20rpx;
  font-size: 24rpx;
  border-radius: 8rpx;
  background-color: $uni-bg-color-grey;
  color: $uni-text-color-secondary;
  border: 1rpx solid transparent;
  transition: all 0.3s;

  &.tag-active {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
    border-color: $uni-color-primary;
  }

  &.tag-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.tag-icon {
  margin-right: 8rpx;
  font-size: 32rpx;
}

.tag-label {
  line-height: 1;
}

.empty-tip {
  font-size: 28rpx;
  color: $uni-text-color-tertiary;
  padding: 16rpx 0;
}
</style>
