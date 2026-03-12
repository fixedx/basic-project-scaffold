<template>
  <view class="page">
    <!-- 订单详情组件 -->
    <OrderDetail
      :order="order"
      :loading="loading"
      role="admin"
      @course-click="handleCourseClick"
    />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { adminApi } from '@/api/admin'
import type { Order } from '@/api/order'
import OrderDetail from '@/components/OrderDetail/index.vue'

const loading = ref(true)
const order = ref<Order | null>(null)
const orderId = ref('')

// 加载订单详情
const loadOrder = async () => {
  if (!orderId.value) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    order.value = await adminApi.getOrderDetail(orderId.value)
  } catch (error) {
    console.error('加载订单详情失败:', error)
  } finally {
    loading.value = false
  }
}

// 点击课程
const handleCourseClick = (courseId: string) => {
  uni.navigateTo({ url: `/pages/course-detail/index?id=${courseId}` })
}

onLoad((options) => {
  if (options?.id) {
    orderId.value = options.id
  }
})

onShow(() => {
  if (orderId.value) {
    loadOrder()
  }
})

// 下拉刷新
onPullDownRefresh(async () => {
  await loadOrder()
  uni.stopPullDownRefresh()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}
</style>
