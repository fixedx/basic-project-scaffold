<template>
  <view v-if="isReady" class="dashboard-page">
    <!-- 顶部背景与机构信息区域 -->
    <view class="header-section" :style="{ paddingTop: `${safeAreaTop}px` }">
      <view class="header-content">
        <view class="user-info" @click="navigateTo('/pages/institution/profile/index')">
          <AsyncImage
            v-if="institutionInfo.logo"
            custom-class="avatar"
            :url="institutionInfo.logo"
            width="110rpx"
            height="110rpx"
            mode="aspectFill"
          />
          <image
            v-else
            class="default-logo avatar"
            src="/static/logo.png"
            mode="aspectFill"
          />
          <view class="info">
            <view class="name-row">
              <text class="name">{{ institutionInfo.name || '未命名机构' }}</text>
            </view>
            <view class="meta-row">
              <view class="status-tag" :class="'status-' + institutionInfo.audit_status">
                <text>{{ getStatusText(institutionInfo.audit_status) }}</text>
              </view>
              <view v-if="stats.avgRating > 0" class="rating-tag">
                <text class="iconfont icon-honor-fill"></text>
                <text>{{ formatRating(stats.avgRating) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 签约提示横幅（待签约/签约审核中/空状态/已审核未签约） -->
    <view
      v-if="needsContract || institutionInfo.audit_status === 'contract_review'"
      class="contract-banner"
      @click="goToContract"
    >
      <view class="contract-banner-left">
        <text class="iconfont icon-edit" style="font-size: 36rpx; color: #fa8c16; margin-right: 16rpx;"></text>
        <view class="contract-banner-text">
          <text class="contract-title">
            {{ needsContract ? '请完成入驻协议签署' : '签约凭证审核中' }}
          </text>
          <text class="contract-desc">
            {{ needsContract ? '审核已通过，签署协议后机构正式上线' : '平台正在审核您的签约凭证，请耐心等待' }}
          </text>
        </view>
      </view>
      <text class="iconfont icon-right" style="font-size: 28rpx; color: #fa8c16;"></text>
    </view>

    <!-- 核心数据卡片（叠在头部下方） -->
    <view class="core-stats-card">
      <!-- 时间筛选标签 -->
      <view class="period-filter">
        <scroll-view scroll-x class="period-scroll" :show-scrollbar="false">
          <view class="period-tags">
            <view
              v-for="item in periodOptions"
              :key="item.value"
              class="period-tag"
              :class="{ active: selectedPeriod === item.value }"
              @click="selectPeriod(item.value)"
            >
              <text>{{ item.label }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 自定义日期范围 -->
      <view v-if="selectedPeriod === 'custom'" class="custom-date-row">
        <picker mode="date" :value="customStartDate" @change="onStartDateChange">
          <view class="date-input" :class="{ 'has-value': customStartDate }">
            <text class="iconfont icon-calendar-fill date-icon"></text>
            <text>{{ customStartDate || '开始日期' }}</text>
          </view>
        </picker>
        <text class="date-sep">至</text>
        <picker mode="date" :value="customEndDate" @change="onEndDateChange">
          <view class="date-input" :class="{ 'has-value': customEndDate }">
            <text class="iconfont icon-calendar-fill date-icon"></text>
            <text>{{ customEndDate || '结束日期' }}</text>
          </view>
        </picker>
      </view>

      <!-- 收入数据 -->
      <view class="stats-row">
        <view class="stat-item" @click="goToRevenueOrders()">
          <text class="stat-value">&yen;{{ formatRevenue(stats.todayRevenue) }}</text>
          <text class="stat-label">今日收入</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item" @click="goToRevenueOrders()">
          <text class="stat-value">&yen;{{ formatRevenue(stats.thisMonthRevenue) }}</text>
          <text class="stat-label">{{ periodLabel }}收入</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item" @click="goToRevenueOrders()">
          <text class="stat-value">&yen;{{ formatRevenue(stats.totalRevenue) }}</text>
          <text class="stat-label">总营收</text>
        </view>
      </view>
    </view>

    <!-- 待处理事项 -->
    <view class="section-card todo-section">
      <view class="section-header">
        <text class="title">待处理事项</text>
        <view v-if="totalPendingCount > 0" class="pending-badge">
          <text>{{ totalPendingCount }}项待处理</text>
        </view>
      </view>
      <view class="todo-grid">
        <!-- 签约待完成（未签约机构才显示） -->
        <view v-if="needsContract" class="todo-item" @click="goToContract">
          <view class="todo-icon-wrap green">
            <text class="iconfont icon-edit"></text>
          </view>
          <view class="todo-info">
            <text class="todo-count has-pending">1</text>
            <text class="todo-label">签约待完成</text>
          </view>
          <view class="red-dot"></view>
        </view>

        <view class="todo-item" @click="navigateTo('/pages/institution/orders/index?status=pending_confirm')">
          <view class="todo-icon-wrap orange">
            <text class="iconfont icon-order-inspection-fill"></text>
          </view>
          <view class="todo-info">
            <text class="todo-count" :class="{ 'has-pending': stats.pendingOrderCount > 0 }">{{ stats.pendingOrderCount || 0 }}</text>
            <text class="todo-label">待确认订单</text>
          </view>
          <view v-if="stats.pendingOrderCount > 0" class="red-dot"></view>
        </view>

        <view class="todo-item" @click="navigateTo('/pages/institution/orders/index?status=refund_pending,refunding')">
          <view class="todo-icon-wrap red">
            <text class="iconfont icon-money-quick-refund-plan"></text>
          </view>
          <view class="todo-info">
            <text class="todo-count" :class="{ 'has-pending': stats.refundingOrderCount > 0 }">{{ stats.refundingOrderCount || 0 }}</text>
            <text class="todo-label">退款待处理</text>
          </view>
          <view v-if="stats.refundingOrderCount > 0" class="red-dot"></view>
        </view>

        <view class="todo-item" @click="navigateToBookingReview">
          <view class="todo-icon-wrap blue">
            <text class="iconfont icon-calendar-fill"></text>
          </view>
          <view class="todo-info">
            <text class="todo-count" :class="{ 'has-pending': (stats.pendingCancelBookingCount + stats.pendingChangeBookingCount) > 0 }">
              {{ (stats.pendingCancelBookingCount || 0) + (stats.pendingChangeBookingCount || 0) }}
            </text>
            <text class="todo-label">预约审核</text>
          </view>
          <view v-if="(stats.pendingCancelBookingCount || 0) + (stats.pendingChangeBookingCount || 0) > 0" class="red-dot"></view>
        </view>
      </view>
    </view>

    <!-- 数据概览 -->
    <view class="section-card">
      <view class="section-header">
        <text class="title">数据概览</text>
      </view>
      <view class="data-grid">
        <view class="data-item" @click="navigateWithPeriod('/pages/institution/courses/index')">
          <text class="iconfont icon-teaching data-icon" style="color: #1890ff;"></text>
          <text class="data-value">{{ stats.courseCount || 0 }}</text>
          <text class="data-label">课程</text>
        </view>
        <view class="data-item" @click="navigateWithPeriod('/pages/institution/student-list/index')">
          <text class="iconfont icon-connections data-icon" style="color: #52c41a;"></text>
          <text class="data-value">{{ stats.studentCount || 0 }}</text>
          <text class="data-label">学员</text>
        </view>
        <view class="data-item" @click="navigateWithPeriod('/pages/institution/orders/index')">
          <text class="iconfont icon-order data-icon" style="color: #fa8c16;"></text>
          <text class="data-value">{{ stats.orderCount || 0 }}</text>
          <text class="data-label">订单</text>
        </view>
        <view class="data-item" @click="navigateToTeachersWithPeriod">
          <text class="iconfont icon-vip data-icon" style="color: #722ed1;"></text>
          <text class="data-value">{{ stats.teacherCount || 0 }}</text>
          <text class="data-label">教师</text>
        </view>
        <view class="data-item" @click="navigateToClassroomsWithPeriod">
          <text class="iconfont icon-store data-icon" style="color: #13c2c2;"></text>
          <text class="data-value">{{ stats.classroomCount || 0 }}</text>
          <text class="data-label">教室</text>
        </view>
        <view class="data-item" @click="navigateTo('/pages/institution/review-list/index')">
          <text class="iconfont icon-honor-fill data-icon" style="color: #faad14;"></text>
          <text class="data-value">{{ stats.reviewCount || 0 }}</text>
          <text class="data-label">评价</text>
        </view>
        <view class="data-item" @click="navigateWithPeriod('/pages/institution/orders/index')">
          <text class="iconfont icon-teaching data-icon" style="color: #eb2f96;"></text>
          <text class="data-value">{{ stats.completionRate || 0 }}%</text>
          <text class="data-label">完课率</text>
        </view>
      </view>
    </view>

    <!-- 快捷功能 -->
    <view class="section-card">
      <view class="section-header">
        <text class="title">快捷功能</text>
      </view>
      <view class="action-list">
        <view class="action-item" @click="navigateToCourseEdit">
          <view class="action-left">
            <view class="action-icon blue">
              <text class="iconfont icon-add"></text>
            </view>
            <text class="action-text">发布课程</text>
          </view>
          <text class="iconfont icon-right action-arrow"></text>
        </view>
        <view class="action-item" @click="navigateTo('/pages/institution/courses/index')">
          <view class="action-left">
            <view class="action-icon purple">
              <text class="iconfont icon-catalog"></text>
            </view>
            <text class="action-text">课程管理</text>
          </view>
          <text class="iconfont icon-right action-arrow"></text>
        </view>
        <view class="action-item" @click="navigateTo('/pages/institution/orders/index')">
          <view class="action-left">
            <view class="action-icon orange">
              <text class="iconfont icon-order"></text>
            </view>
            <text class="action-text">订单管理</text>
          </view>
          <text class="iconfont icon-right action-arrow"></text>
        </view>
        <view class="action-item" @click="navigateTo('/pages/institution/profile/index')">
          <view class="action-left">
            <view class="action-icon teal">
              <text class="iconfont icon-home"></text>
            </view>
            <text class="action-text">机构信息</text>
          </view>
          <text class="iconfont icon-right action-arrow"></text>
        </view>
        <view class="action-item" @click="openFeedback">
          <view class="action-left">
            <view class="action-icon gray">
              <text class="iconfont icon-edit"></text>
            </view>
            <text class="action-text">意见反馈</text>
          </view>
          <text class="iconfont icon-right action-arrow"></text>
        </view>
      </view>
    </view>

    <!-- 意见反馈弹窗 -->
    <FeedbackDialog ref="feedbackDialogRef" page-source="institution-center" />

    <!-- 退出登录 -->
    <LogoutButton @click="handleLogout" />
    <view class="safe-area-bottom"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { institutionApi, type InstitutionStats } from '@/api/institution'
import { useAuthGuard } from '@/composables/useAuthGuard'
import AsyncImage from '@/components/AsyncImage/index.vue'
import FeedbackDialog from '@/components/FeedbackDialog/index.vue'
import LogoutButton from '@/components/LogoutButton/index.vue'
import { useUserStore } from '@/stores/user'

const { isReady } = useAuthGuard()
const userStore = useUserStore()
const safeAreaTop = ref(0)

// ===== 时间筛选 =====
const selectedPeriod = ref('thisMonth')
const customStartDate = ref('')
const customEndDate = ref('')

const periodOptions = [
  { label: '本月', value: 'thisMonth' },
  { label: '近三月', value: 'threeMonths' },
  { label: '半年', value: 'halfYear' },
  { label: '一年', value: 'oneYear' },
  { label: '全部', value: 'all' },
  { label: '自定义', value: 'custom' },
]

/** 根据选中时段返回对应中文标签 */
const periodLabel = computed(() => {
  const map: Record<string, string> = {
    thisMonth: '本月',
    threeMonths: '近三月',
    halfYear: '半年',
    oneYear: '年度',
    all: '累计',
    custom: '时段',
  }
  return map[selectedPeriod.value] || '本月'
})

const selectPeriod = (value: string) => {
  selectedPeriod.value = value
  if (value !== 'custom') {
    loadStats()
  }
}

const onStartDateChange = (e: any) => {
  customStartDate.value = e.detail.value
  if (customEndDate.value) loadStats()
}

const onEndDateChange = (e: any) => {
  customEndDate.value = e.detail.value
  if (customStartDate.value) loadStats()
}

interface InstitutionInfo {
  id?: string
  name?: string
  logo?: string
  audit_status?: string
}

const institutionInfo = ref<InstitutionInfo>({})
const stats = ref<InstitutionStats>({
  courseCount: 0,
  studentCount: 0,
  orderCount: 0,
  teacherCount: 0,
  classroomCount: 0,
  completionRate: 0,
  totalRevenue: 0,
  thisMonthRevenue: 0,
  todayRevenue: 0,
  pendingOrderCount: 0,
  refundingOrderCount: 0,
  pendingCancelBookingCount: 0,
  avgRating: 0,
  reviewCount: 0,
})

/**
 * 是否需要签约（未签约状态：空 / contract_signing / 已审核但未提交凭证）
 */
const needsContract = computed(() => {
  const status = institutionInfo.value.audit_status
  const hasSigned = !!institutionInfo.value.contract_screenshot
  return !status || status === 'contract_signing' || (status === 'approved' && !hasSigned)
})

/**
 * 待处理事项总数
 */
const totalPendingCount = computed(() => {
  return (needsContract.value ? 1 : 0) +
    (stats.value.pendingOrderCount || 0) +
    (stats.value.refundingOrderCount || 0) +
    (stats.value.pendingCancelBookingCount || 0) +
    (stats.value.pendingChangeBookingCount || 0)
})

/**
 * 格式化收入金额
 */
const formatRevenue = (value?: number) => {
  const num = Number(value) || 0
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toFixed(2)
}

/**
 * 格式化评分
 */
const formatRating = (value?: number) => {
  const num = Number(value) || 0
  return num.toFixed(1)
}

onLoad(() => {
  const systemInfo = uni.getSystemInfoSync()
  safeAreaTop.value = (systemInfo.statusBarHeight || 0)
  loadInstitutionInfo()
  loadStats()
})

onShow(() => {
  loadInstitutionInfo()
  loadStats()
})

onPullDownRefresh(async () => {
  await Promise.all([loadInstitutionInfo(), loadStats()])
  uni.stopPullDownRefresh()
})

const getStatusText = (status?: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    contract_signing: '待签约',
    contract_review: '签约审核中',
    approved: '已通过',
    rejected: '已拒绝',
    frozen: '已冻结',
  }
  return statusMap[status || 'contract_signing'] || '未知状态'
}

const loadInstitutionInfo = async () => {
  try {
    const result = await institutionApi.getCurrentInstitution()
    institutionInfo.value = result
  } catch (error: any) {
    console.error('加载机构信息失败', error)
  }
}

const loadStats = async () => {
  try {
    const params: Record<string, string> = {}
    if (selectedPeriod.value) {
      params.period = selectedPeriod.value
    }
    if (selectedPeriod.value === 'custom') {
      if (customStartDate.value) params.startDate = customStartDate.value
      if (customEndDate.value) params.endDate = customEndDate.value
    }
    // 教师数量默认只统计在职
    params.teacherStatus = 'active'
    const result = await institutionApi.getInstitutionStats(params as any)
    stats.value = result
  } catch (error: any) {
    console.error('加载统计数据失败:', error)
  }
}

const navigateTo = (url: string) => {
  uni.navigateTo({ url })
}

/**
 * 前往签约页面
 */
const goToContract = () => {
  uni.navigateTo({ url: '/pages/institution/contract/index' })
}

/**
 * 导航并附带当前时间范围参数
 */
const navigateWithPeriod = (baseUrl: string) => {
  const sep = baseUrl.includes('?') ? '&' : '?'
  let url = baseUrl
  if (selectedPeriod.value && selectedPeriod.value !== 'all') {
    url += `${sep}period=${selectedPeriod.value}`
    if (selectedPeriod.value === 'custom') {
      if (customStartDate.value) url += `&startDate=${customStartDate.value}`
      if (customEndDate.value) url += `&endDate=${customEndDate.value}`
    }
  }
  uni.navigateTo({ url })
}

const goToRevenueOrders = () => {
  navigateWithPeriod('/pages/institution/orders/index?revenueOnly=true')
}

const navigateToClassrooms = () => {
  const institutionId = institutionInfo.value.id || uni.getStorageSync('institutionId')
  if (!institutionId) {
    uni.showToast({ title: '未找到机构信息', icon: 'none' })
    return
  }
  navigateTo(`/pages/institution/classroom-list/index?institutionId=${institutionId}`)
}

const navigateToCourseEdit = () => {
  const institutionId = institutionInfo.value.id || uni.getStorageSync('institutionId')
  if (!institutionId) {
    uni.showToast({ title: '未找到机构信息', icon: 'none' })
    return
  }
  navigateTo(`/pages/institution/course-edit/index?institutionId=${institutionId}`)
}

const navigateToTeachers = () => {
  const institutionId = institutionInfo.value.id || uni.getStorageSync('institutionId')
  if (!institutionId) {
    uni.showToast({ title: '未找到机构信息', icon: 'none' })
    return
  }
  navigateTo(`/pages/institution/teacher-list/index?institutionId=${institutionId}`)
}

const navigateToTeachersWithPeriod = () => {
  const institutionId = institutionInfo.value.id || uni.getStorageSync('institutionId')
  if (!institutionId) {
    uni.showToast({ title: '未找到机构信息', icon: 'none' })
    return
  }
  navigateWithPeriod(`/pages/institution/teacher-list/index?institutionId=${institutionId}&status=active`)
}

const navigateToClassroomsWithPeriod = () => {
  const institutionId = institutionInfo.value.id || uni.getStorageSync('institutionId')
  if (!institutionId) {
    uni.showToast({ title: '未找到机构信息', icon: 'none' })
    return
  }
  navigateWithPeriod(`/pages/institution/classroom-list/index?institutionId=${institutionId}`)
}

const navigateToBookingReview = () => {
  const institutionId = institutionInfo.value.id || uni.getStorageSync('institutionId')
  if (!institutionId) {
    uni.showToast({ title: '未找到机构信息', icon: 'none' })
    return
  }
  uni.navigateTo({
    url: `/pages/institution/booking-list/index?institutionId=${institutionId}&tab=pending_review`,
  })
}

const feedbackDialogRef = ref<InstanceType<typeof FeedbackDialog> | null>(null)
const openFeedback = () => { feedbackDialogRef.value?.open() }

const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.reLaunch({ url: '/pages/login/index' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.dashboard-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  padding-bottom: env(safe-area-inset-bottom);
}

.header-section {
  background: linear-gradient(135deg, $uni-color-primary 0%, $uni-color-primary-dark 100%);
  padding-right: 32rpx;
  padding-bottom: 100rpx;
  padding-left: 32rpx;
  border-radius: 0 0 40rpx 40rpx;

  .header-content {
    display: flex;
    align-items: center;
  }
}

.user-info {
  display: flex;
  align-items: center;
  flex: 1;

  .default-logo {
    width: 110rpx;
    height: 110rpx;
    border-radius: 16rpx;
  }

  .info {
    flex: 1;

    .name-row {
      display: flex;
      align-items: center;
      margin-bottom: 12rpx;

      .name {
        font-size: 36rpx;
        font-weight: bold;
        color: #fff;
        max-width: 400rpx;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 12rpx;

      .status-tag {
        display: inline-flex;
        align-items: center;
        padding: 4rpx 16rpx;
        border-radius: 30rpx;
        background-color: rgba(255, 255, 255, 0.2);
        font-size: 22rpx;
        color: #fff;
        backdrop-filter: blur(4px);

        &.status-approved {
          background-color: rgba(82, 196, 26, 0.35);
        }

        &.status-pending {
          background-color: rgba(250, 173, 20, 0.35);
        }

        &.status-contract_signing {
          background-color: rgba(250, 140, 22, 0.35);
        }

        &.status-contract_review {
          background-color: rgba(24, 144, 255, 0.35);
        }

        &.status-rejected {
          background-color: rgba(245, 34, 45, 0.35);
        }
      }

      .rating-tag {
        display: inline-flex;
        align-items: center;
        padding: 4rpx 16rpx;
        border-radius: 30rpx;
        background-color: rgba(250, 173, 20, 0.35);
        font-size: 22rpx;
        color: #fff;

        .iconfont {
          font-size: 22rpx;
          margin-right: 4rpx;
        }
      }
    }
  }
}

/* ========== 签约提示横幅 ========== */
.contract-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -20rpx 24rpx 24rpx;
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #fff7e6, #ffe7ba);
  border-radius: 16rpx;
  position: relative;
  z-index: 1;
}

.contract-banner-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.contract-banner-text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.contract-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #d48806;
}

.contract-desc {
  font-size: 24rpx;
  color: #ad6800;
}

.core-stats-card {
  margin: -36rpx 24rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  position: relative;
  z-index: 1;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;

  .period-filter {
    padding: 24rpx 24rpx 0;

    .period-scroll {
      white-space: nowrap;
    }

    .period-tags {
      display: inline-flex;
      gap: 12rpx;

      .period-tag {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 8rpx 24rpx;
        border-radius: 20rpx;
        background: $uni-bg-color-grey;
        font-size: 24rpx;
        color: $uni-text-color-secondary;
        white-space: nowrap;
        transition: all 0.2s;

        &.active {
          background: $uni-color-primary-lighter;
          color: $uni-color-primary;
          font-weight: 500;
        }
      }
    }
  }

  .custom-date-row {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16rpx 24rpx 0;
    gap: 12rpx;

    .date-input {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14rpx 16rpx;
      background: $uni-bg-color-grey;
      border-radius: 8rpx;
      font-size: 24rpx;
      color: $uni-text-color-tertiary;

      &.has-value {
        color: $uni-text-color;
      }

      .date-icon {
        font-size: 26rpx;
        margin-right: 8rpx;
        color: $uni-color-primary;
      }
    }

    .date-sep {
      font-size: 24rpx;
      color: $uni-text-color-tertiary;
      flex-shrink: 0;
    }
  }

  .stats-row {
    display: flex;
    align-items: center;
    padding: 24rpx 0;
  }

  .stat-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;

    .stat-value {
      font-size: 36rpx;
      font-weight: bold;
      color: $uni-text-color;
      font-family: 'DIN Alternate', Arial, sans-serif;
      margin-bottom: 8rpx;
    }

    .stat-label {
      font-size: 24rpx;
      color: $uni-text-color-tertiary;
    }
  }

  .stat-divider {
    width: 1rpx;
    height: 60rpx;
    background-color: $uni-border-color-light;
  }
}

.section-card {
  margin: 0 24rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 28rpx 32rpx 20rpx;

    .title {
      font-size: 30rpx;
      font-weight: bold;
      color: $uni-text-color;
    }

    .pending-badge {
      padding: 4rpx 16rpx;
      background-color: rgba(245, 34, 45, 0.08);
      border-radius: 20rpx;

      text {
        font-size: 22rpx;
        color: $uni-color-error;
        font-weight: 500;
      }
    }
  }
}

.todo-grid {
  display: flex;
  padding: 0 24rpx 24rpx;
  gap: 16rpx;

  .todo-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24rpx 8rpx;
    background: $uni-bg-color-grey;
    border-radius: 12rpx;
    position: relative;

    &:active {
      background: darken(#f5f5f5, 3%);
    }

    .todo-icon-wrap {
      width: 64rpx;
      height: 64rpx;
      border-radius: 14rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12rpx;
      flex-shrink: 0;

      .iconfont {
        font-size: 32rpx;
        color: #fff;
      }

      &.orange { background: linear-gradient(135deg, #ffc069 0%, #fa8c16 100%); }
      &.red { background: linear-gradient(135deg, #ff85c0 0%, #eb2f96 100%); }
      &.blue { background: linear-gradient(135deg, #69c0ff 0%, #1890ff 100%); }
      &.green { background: linear-gradient(135deg, #95de64 0%, #52c41a 100%); }
      &.purple { background: linear-gradient(135deg, #b37feb 0%, #722ed1 100%); }
    }

    .todo-info {
      display: flex;
      flex-direction: column;
      align-items: center;

      .todo-count {
        font-size: 36rpx;
        font-weight: bold;
        color: $uni-text-color;
        line-height: 1.2;
        font-family: 'DIN Alternate', Arial, sans-serif;

        &.has-pending {
          color: $uni-color-error;
        }
      }

      .todo-label {
        font-size: 22rpx;
        color: $uni-text-color-tertiary;
        margin-top: 4rpx;
        white-space: nowrap;
      }
    }

    .red-dot {
      position: absolute;
      top: 12rpx;
      right: 12rpx;
      width: 16rpx;
      height: 16rpx;
      border-radius: 50%;
      background-color: $uni-color-error;
    }
  }
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 8rpx 16rpx 24rpx;

  .data-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20rpx 0;

    &:active {
      opacity: 0.7;
    }

    .data-icon {
      font-size: 48rpx;
      margin-bottom: 12rpx;
    }

    .data-value {
      font-size: 36rpx;
      font-weight: bold;
      color: $uni-text-color;
      margin-bottom: 6rpx;
      font-family: 'DIN Alternate', Arial, sans-serif;
    }

    .data-label {
      font-size: 24rpx;
      color: $uni-text-color-tertiary;
    }
  }
}

.action-list {
  .action-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28rpx 32rpx;
    border-bottom: 1rpx solid $uni-border-color-light;

    &:last-child {
      border-bottom: none;
    }

    &:active {
      background-color: $uni-bg-color-grey;
    }

    .action-left {
      display: flex;
      align-items: center;

      .action-icon {
        width: 64rpx;
        height: 64rpx;
        border-radius: 14rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 24rpx;

        .iconfont {
          font-size: 36rpx;
          color: #fff;
        }

        &.blue { background: linear-gradient(135deg, #69c0ff 0%, #1890ff 100%); }
        &.purple { background: linear-gradient(135deg, #b37feb 0%, #722ed1 100%); }
        &.orange { background: linear-gradient(135deg, #ffc069 0%, #fa8c16 100%); }
        &.teal { background: linear-gradient(135deg, #5cdbd3 0%, #13c2c2 100%); }
        &.gray { background: linear-gradient(135deg, #bfbfbf 0%, #8c8c8c 100%); }
      }

      .action-text {
        font-size: 30rpx;
        color: $uni-text-color;
      }
    }

    .action-arrow {
      font-size: 24rpx;
      color: $uni-text-color-disable;
    }
  }
}

.safe-area-bottom {
  height: env(safe-area-inset-bottom);
}
</style>
