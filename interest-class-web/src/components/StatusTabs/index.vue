<template>
  <view class="status-tabs">
    <wd-tabs v-model="activeValue" @change="handleChange">
      <wd-tab
        v-for="tab in tabs"
        :key="tab.value"
        :title="tab.label"
        :name="tab.value"
      />
    </wd-tabs>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Tab {
  label: string
  value: string
  count?: number
}

interface Props {
  modelValue: string
  tabs: Tab[]
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// wd-tabs 需要绑定的值
const activeValue = computed({
  get: () => props.modelValue,
  set: (val: string) => emit('update:modelValue', val)
})

const handleChange = ({ name }: { name: string }) => {
  emit('update:modelValue', name)
  emit('change', name)
}
</script>

<style lang="scss" scoped>
.status-tabs {
  background-color: $uni-bg-color;
  position: sticky;
  top: 0;
  z-index: 10;
}
</style>
