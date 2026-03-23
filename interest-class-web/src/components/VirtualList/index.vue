<template>
  <view class="virtual-list-container">
    <!-- 使用 scroll-view 实现虚拟滚动效果 -->
    <scroll-view
      v-if="virtualScroll"
      class="virtual-scroll-view"
      scroll-y
      :style="{ height: scrollHeight }"
      @scroll="handleScroll"
      :scroll-top="scrollTop"
      :lower-threshold="100"
      @scrolltolower="handleLoadMore"
    >
      <!-- 占位区域，模拟总高度 -->
      <view class="virtual-placeholder" :style="{ height: totalHeight + 'px' }">
        <!-- 可视区域内容 -->
        <view class="virtual-content" :style="{ transform: `translateY(${offsetY}px)` }">
          <slot :visible-items="visibleItems" />
        </view>
      </view>
    </scroll-view>
    
    <!-- 普通列表（数据量较小时使用） -->
    <view v-else class="normal-list">
      <slot :visible-items="items" />
    </view>
    
    <!-- 加载更多状态 -->
    <view v-if="showLoadMore" class="load-more-status">
      <wd-loadmore :state="loadMoreState" @load="handleLoadMore" />
    </view>
  </view>
</template>

<script lang="ts">
export default {
  name: 'VirtualList',
  options: {
    virtualHost: true
  }
}
</script>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  /** 列表数据 */
  items: any[]
  /** 每项高度（像素） */
  itemHeight: number
  /** 可视区域高度 */
  scrollHeight: string
  /** 缓冲区大小（上下多渲染的项数） */
  bufferSize?: number
  /** 是否启用虚拟滚动（数据量大于 50 时建议开启） */
  enableVirtual?: boolean
  /** 是否显示加载更多 */
  showLoadMore?: boolean
  /** 加载更多状态 */
  loadMoreState?: 'loading' | 'finished' | 'error'
}

const props = withDefaults(defineProps<Props>(), {
  bufferSize: 5,
  enableVirtual: false,
  showLoadMore: false,
  loadMoreState: 'loading'
})

const emit = defineEmits<{
  (e: 'load-more'): void
  (e: 'scroll', scrollTop: number): void
}>()

// 是否启用虚拟滚动（数据量较小时自动关闭）
const virtualScroll = computed(() => {
  return props.enableVirtual && props.items.length > 30
})

// 总高度
const totalHeight = computed(() => {
  return props.items.length * props.itemHeight
})

// 可视区域起始索引
const startIndex = ref(0)
// 可视区域结束索引
const endIndex = ref(0)
// 偏移量
const offsetY = ref(0)
// 滚动位置
const scrollTop = ref(0)

// 计算可视区域的项目
const visibleItems = computed(() => {
  if (!virtualScroll.value) {
    return props.items
  }
  return props.items.slice(startIndex.value, endIndex.value + 1).map((item, index) => ({
    ...item,
    _originalIndex: startIndex.value + index,
    _offsetY: (startIndex.value + index) * props.itemHeight
  }))
})

// 计算可视区域范围
const calculateVisibleRange = (scrollTopValue: number) => {
  const visibleCount = Math.ceil(parseInt(props.scrollHeight) / props.itemHeight)
  const newStartIndex = Math.max(0, Math.floor(scrollTopValue / props.itemHeight) - props.bufferSize)
  const newEndIndex = Math.min(
    props.items.length - 1,
    newStartIndex + visibleCount + props.bufferSize * 2
  )
  
  startIndex.value = newStartIndex
  endIndex.value = newEndIndex
  offsetY.value = newStartIndex * props.itemHeight
}

// 处理滚动事件
let scrollTimer: ReturnType<typeof setTimeout> | null = null
const handleScroll = (e: any) => {
  const top = e.detail.scrollTop
  scrollTop.value = top
  
  // 节流处理
  if (scrollTimer) return
  
  scrollTimer = setTimeout(() => {
    calculateVisibleRange(top)
    emit('scroll', top)
    scrollTimer = null
  }, 16) // ~60fps
}

// 加载更多
const handleLoadMore = () => {
  emit('load-more')
}

// 监听数据变化，重置可视区域
watch(() => props.items.length, () => {
  if (virtualScroll.value && scrollTop.value === 0) {
    calculateVisibleRange(0)
  }
})

// 初始化
if (virtualScroll.value) {
  calculateVisibleRange(0)
}
</script>

<style lang="scss" scoped>
.virtual-list-container {
  width: 100%;
}

.virtual-scroll-view {
  width: 100%;
}

.virtual-placeholder {
  position: relative;
  width: 100%;
}

.virtual-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  will-change: transform;
}

.normal-list {
  width: 100%;
}

.load-more-status {
  padding: 32rpx 0;
}
</style>