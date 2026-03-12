<template>
  <view class="page">
    <!-- 状态筛选 -->
    <StatusTabs
      v-model="currentStatus"
      :tabs="statusTabs"
      @change="handleStatusChange"
    />

    <!-- 预约列表 -->
    <view class="booking-list">
      <!-- 加载中 -->
      <view v-if="loading && bookingList.length === 0" class="loading">
        <Loading text="加载中..." />
      </view>

      <!-- 预约卡片 -->
      <BookingCard
        v-for="booking in bookingList"
        :key="booking.id"
        :booking="booking"
        role="parent"
        @click="goToDetail(booking)"
        @action="handleAction"
      />

      <!-- 加载更多 -->
      <view class="load-more" v-if="bookingList.length > 0">
        <text v-if="loading">加载中...</text>
        <text v-else-if="noMore">没有更多了</text>
      </view>

      <!-- 空状态 -->
      <EmptyState
        v-if="!loading && bookingList.length === 0"
        icon="icon-calendar"
        text="暂无预约记录"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onReachBottom, onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { bookingApi, type Booking } from '@/api/booking'
import StatusTabs from '@/components/StatusTabs/index.vue'
import BookingCard from '@/components/BookingCard/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import Loading from '@/components/Loading/index.vue'

// 状态标签
const statusTabs = [
  { label: '全部', value: '' },
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已取消', value: 'cancelled' },
  { label: '已完成', value: 'completed' },
]

const currentStatus = ref('')
const bookingList = ref<Booking[]>([])
const loading = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = ref(10)
const noMore = ref(false)

// 每次显示页面时重新加载
onShow(() => {
  refreshData()
})

// 下拉刷新
onPullDownRefresh(async () => {
  refreshing.value = true
  await refreshData()
  uni.stopPullDownRefresh()
  refreshing.value = false
})

// 触底加载
onReachBottom(() => {
  if (noMore.value || loading.value) return
  page.value++
  loadBookings(true)
})

// 刷新数据（重置分页并重新加载）
const refreshData = async () => {
  page.value = 1
  noMore.value = false
  await loadBookings()
}

// 加载预约列表
const loadBookings = async (isLoadMore = false) => {
  if (loading.value) return

  loading.value = true
  try {
    const params: any = {
      page: page.value,
      pageSize: pageSize.value,
    }

    if (currentStatus.value) {
      params.status = currentStatus.value
    }

    const res = await bookingApi.getMyList(params)

    // 过滤掉已退款的预约（confirmed 状态但关联订单已退款，order_id 为 null）
    const filteredData = (res.data || []).filter((b: any) => {
      if (b.status === 'confirmed' && !b.order_id) return false
      return true
    })

    if (isLoadMore) {
      bookingList.value = [...bookingList.value, ...filteredData]
    } else {
      bookingList.value = filteredData
    }

    noMore.value = bookingList.value.length >= res.total
  } catch (error: any) {
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

// 状态切换
const handleStatusChange = (status: string) => {
  page.value = 1
  noMore.value = false
  loadBookings()
}

// 跳转详情
const goToDetail = (booking: Booking) => {
  uni.navigateTo({
    url: `/pages/booking-detail/index?id=${booking.id}`,
  })
}

// 处理操作
const handleAction = async (action: string, booking: Booking) => {
  if (action === 'cancel') {
    handleCancel(booking)
  }
}

// 取消预约
const handleCancel = (booking: Booking) => {
  uni.showModal({
    title: '提示',
    content: '确定要取消此预约吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await bookingApi.cancel(booking.id)
          uni.showToast({
            title: '取消成功',
            icon: 'success',
          })
          refreshData()
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
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.booking-list {
  padding: 24rpx;
}

.loading {
  padding: 100rpx 0;
  display: flex;
  justify-content: center;
}

.load-more {
  text-align: center;
  padding: 32rpx;
  font-size: 26rpx;
  color: $uni-text-color-tertiary;
}
</style>