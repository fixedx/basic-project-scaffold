<template>
  <view class="page">
    <!-- 订单详情组件 -->
    <OrderDetail
      :order="order"
      :loading="loading"
      role="institution"
      @course-click="handleCourseClick"
    />

    <!-- 底部操作栏 -->
    <PageFooter v-if="order && showActions">
      <!-- 待确认状态 -->
      <template v-if="order.status === 'pending_confirm'">
        <wd-button type="primary" block @click="handleConfirmOrder">
          确认订单
        </wd-button>
      </template>

      <!-- 退款审批中状态 -->
      <template v-else-if="order.status === 'refund_pending'">
        <wd-button type="primary" block @click="openRefundAudit">
          处理退款
        </wd-button>
      </template>
    </PageFooter>

    <!-- 退款审批弹窗 -->
    <RefundAuditDialog ref="refundAuditRef" @success="loadOrder" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { orderApi, type Order } from '@/api/order'
import OrderDetail from '@/components/OrderDetail/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import RefundAuditDialog from '@/components/RefundAuditDialog/index.vue'
const refundAuditRef = ref<InstanceType<typeof RefundAuditDialog>>()

const loading = ref(true)
const order = ref<Order | null>(null)
const orderId = ref('')

// 是否显示操作按钮（只在待确认和退款中状态显示）
const showActions = computed(() => {
  if (!order.value) return false
  return ['pending_confirm', 'refund_pending'].includes(order.value.status)
})

// 加载订单详情
const loadOrder = async () => {
  if (!orderId.value) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    order.value = await orderApi.getDetail(orderId.value)
  } catch (error) {
    console.error('加载订单详情失败:', error)
  } finally {
    loading.value = false
  }
}

// 点击课程跳转（机构端跳转到课程编辑页）
const handleCourseClick = (courseId: string) => {
  uni.navigateTo({
    url: `/pages/institution/course-edit/index?id=${courseId}`,
  })
}

// 确认订单（在线支付后）
const handleConfirmOrder = async () => {
  uni.showModal({
    title: '确认订单',
    content: '确认接受该订单吗？确认后学员可以开始上课。',
    success: async (res) => {
      if (res.confirm) {
        try {
          await orderApi.confirm(orderId.value)
          uni.showToast({ title: '订单已确认', icon: 'success' })
          loadOrder()
        } catch (error: any) {
          uni.showToast({ title: error.message || '操作失败', icon: 'none' })
        }
      }
    }
  })
}

// 打开退款审批弹窗
const openRefundAudit = () => {
  if (!orderId.value) return
  refundAuditRef.value?.open(orderId.value)
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
