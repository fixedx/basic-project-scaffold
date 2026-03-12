<template>
  <view class="page">
    <!-- 订单详情组件 -->
    <OrderDetail
      :order="order"
      :loading="loading"
      role="parent"
      @course-click="handleCourseClick"
    />

    <!-- 底部操作栏 -->
    <PageFooter v-if="order && (canPay || canCancel || canRefund || canReview)">
      <view class="footer-actions">
        <!-- 次要操作 -->
        <wd-button v-if="canCancel" type="info" plain @click="handleCancel">
          取消订单
        </wd-button>
        <wd-button v-if="canRefund" type="warning" plain @click="refundDialogRef?.open(orderId)">
          申请退款
        </wd-button>
        
        <!-- 主要操作 -->
        <wd-button v-if="canReview" type="primary" @click="handleReview">
          评价课程
        </wd-button>
        <wd-button v-if="canPay" type="primary" @click="handlePay">
          立即支付
        </wd-button>
      </view>
    </PageFooter>

    <!-- 退款申请弹窗（公共组件） -->
    <RefundDialog ref="refundDialogRef" @success="loadOrderDetail" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad, onBackPress, onPullDownRefresh } from '@dcloudio/uni-app'
import { orderApi, type Order } from '@/api/order'
import OrderDetail from '@/components/OrderDetail/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import RefundDialog from '@/components/RefundDialog/index.vue'

const orderId = ref('')
const order = ref<Order | null>(null)
const loading = ref(false)

// 退款弹窗引用
const refundDialogRef = ref<InstanceType<typeof RefundDialog> | null>(null)

onLoad((options: any) => {
  if (options.id) {
    orderId.value = options.id
  }
})

onMounted(() => {
  loadOrderDetail()
})

// 下拉刷新
onPullDownRefresh(async () => {
  await loadOrderDetail()
  uni.stopPullDownRefresh()
})

// 拦截返回按钮，如果页面栈为空则跳转到个人中心
onBackPress(() => {
  const pages = getCurrentPages()
  if (pages.length <= 1) {
    uni.switchTab({
      url: '/pages/mine/index',
    })
    return true
  }
  return false
})

// 是否可以支付
const canPay = computed(() => {
  return order.value && order.value.status === 'pending'
})

// 是否可以取消
const canCancel = computed(() => {
  return order.value && order.value.status === 'pending'
})

// 是否可以退款
const canRefund = computed(() => {
  return order.value && (order.value.status === 'confirmed' || order.value.status === 'refund_rejected')
})

// 是否可以评价（已确认或已完成，且尚未评价）
const canReview = computed(() => {
  return order.value &&
    (order.value.status === 'confirmed' || order.value.status === 'completed') &&
    !order.value.is_reviewed
})

// 加载订单详情
const loadOrderDetail = async () => {
  if (!orderId.value) {
    uni.showToast({
      title: '缺少订单ID',
      icon: 'none',
    })
    return
  }

  loading.value = true
  try {
    order.value = await orderApi.getDetail(orderId.value)
  } catch (error: any) {
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

// 点击课程跳转
const handleCourseClick = (courseId: string) => {
  uni.navigateTo({
    url: `/pages/course-detail/index?id=${courseId}`,
  })
}

// 立即支付
const handlePay = () => {
  if (!order.value) return
  uni.navigateTo({
    url: `/pages/order-pay/index?id=${orderId.value}`,
  })
}

// 取消订单
const handleCancel = () => {
  uni.showModal({
    title: '提示',
    content: '确定要取消此订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await orderApi.cancel(orderId.value)
          uni.showToast({
            title: '取消成功',
            icon: 'success',
          })
          loadOrderDetail()
        } catch (error: any) {
          uni.showToast({
            title: error.message || '取消失败',
            icon: 'none',
          })
        }
      }
    },
  })
}

// 跳转评价页
const handleReview = () => {
  if (!order.value) return
  uni.navigateTo({
    url: `/pages/course-review/index?orderId=${order.value.id}&courseId=${order.value.course_id}`,
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.footer-actions {
  display: flex;
  gap: 24rpx;
  flex: 1;
  
  :deep(.wd-button) {
    flex: 1;
    margin: 0;
  }
}

</style>
