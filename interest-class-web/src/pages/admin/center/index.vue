<template>
  <view v-if="isReady" class="admin-center-page">
    <!-- 顶部 Header -->
    <view class="header">
      <view class="header-content">
        <view class="user-info">
          <view class="avatar">
            <text class="iconfont icon-settings avatar-icon"></text>
          </view>
          <view class="info">
            <view class="name-row">
              <text class="name">{{ userInfo?.nickname || '管理员' }}</text>
              <view class="admin-badge">
                <text class="iconfont icon-user"></text>
                <text>系统管理员</text>
              </view>
            </view>
            <text class="account">账号：{{ (userInfo as any)?.username || '-' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 核心数据看板 -->
    <view class="stats-panel">
      <view class="panel-title">
        <view class="title-left">
          <text class="iconfont icon-catalog"></text>
          <text>数据概览</text>
        </view>
        <text class="update-time">{{ updateTime }}</text>
      </view>

      <!-- 时间筛选 -->
      <view class="period-selector">
        <view
          v-for="p in periodOptions"
          :key="p.value"
          class="period-tag"
          :class="{ active: selectedPeriod === p.value }"
          @click="changePeriod(p.value)"
        >{{ p.label }}</view>
      </view>

      <!-- 佣金高亮行 -->
      <view class="commission-row" @click="goToCommissionOrders">
        <view class="commission-block">
          <view class="commission-label">
            <text class="iconfont icon-money-rmb"></text>
            <text>{{ periodLabel }}佣金</text>
          </view>
          <text class="commission-value period">¥{{ formatAmount(stats.periodPlatformCommission) }}</text>
        </view>
        <view class="commission-divider"></view>
        <view class="commission-block">
          <view class="commission-label">
            <text class="iconfont icon-money-wallet"></text>
            <text>累计佣金</text>
          </view>
          <text class="commission-value total">¥{{ formatAmount(stats.totalPlatformCommission) }}</text>
        </view>
      </view>

      <view class="stats-grid">
        <view class="stat-card" @click="goTo('institutions')">
          <view class="stat-main">
            <text class="stat-value">{{ isAllPeriod ? stats.totalInstitutions : stats.periodInstitutions }}</text>
            <text class="stat-label">{{ isAllPeriod ? '机构总数' : periodLabel + '新增机构' }}</text>
          </view>
          <view class="stat-footer">
            <text class="stat-sub">已签约</text>
            <text class="stat-sub-value success">{{ stats.contractSignedCount || 0 }}</text>
          </view>
        </view>

        <view class="stat-card">
          <view class="stat-main">
            <text class="stat-value">{{ isAllPeriod ? stats.totalUsers : stats.periodUsers }}</text>
            <text class="stat-label">{{ isAllPeriod ? '用户总数' : periodLabel + '新增用户' }}</text>
          </view>
          <view class="stat-footer">
            <text class="stat-sub">{{ isAllPeriod ? '预约总数' : periodLabel + '新增预约' }}</text>
            <text class="stat-sub-value">{{ isAllPeriod ? stats.totalBookings : stats.periodBookings }}</text>
          </view>
        </view>

        <view class="stat-card" @click="goTo('orders')">
          <view class="stat-main">
            <text class="stat-value">{{ isAllPeriod ? stats.totalOrders : stats.periodOrders }}</text>
            <text class="stat-label">{{ isAllPeriod ? '累计订单' : periodLabel + '新增订单' }}</text>
          </view>
          <view class="stat-footer">
            <text class="stat-sub">{{ isAllPeriod ? '课程总数' : periodLabel + '新增课程' }}</text>
            <text class="stat-sub-value">{{ isAllPeriod ? stats.totalCourses : stats.periodCourses }}</text>
          </view>
        </view>

        <view class="stat-card" @click="goTo('feedbacks-pending')">
          <view class="stat-main">
            <text class="stat-value">{{ feedbackCount || 0 }}</text>
            <text class="stat-label">待办反馈</text>
          </view>
          <view class="stat-footer">
            <text class="stat-sub">待审核</text>
            <text class="stat-sub-value" :class="{ warning: (stats.pendingAuditCount || 0) > 0 }">
              {{ (stats.pendingAuditCount || 0) + (stats.contractReviewCount || 0) }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 审核进度监控 -->
    <view class="section">
      <view class="section-header">
        <view class="header-left">
          <text class="iconfont icon-security"></text>
          <text class="section-title">入驻审核监控</text>
        </view>
        <view class="section-action" @click="goTo('reviews')">
          <text>审核中心</text>
          <text class="iconfont icon-right"></text>
        </view>
      </view>
      <view class="audit-dashboard">
        <!-- 资质审核待处理 -->
        <view class="audit-box pending-audit" @click="goToReviews('pending')">
          <view class="box-icon"><text class="iconfont icon-time"></text></view>
          <view class="count-wrap">
            <text class="box-count">{{ stats.pendingAuditCount || 0 }}</text>
            <view v-if="(stats.pendingAuditCount || 0) > 0" class="mini-badge">新</view>
          </view>
          <text class="box-label">资质待审</text>
        </view>
        <!-- 签约材料审核中 -->
        <view class="audit-box contract-review" @click="goToReviews('contract_review')">
          <view class="box-icon"><text class="iconfont icon-edit"></text></view>
          <view class="count-wrap">
            <text class="box-count">{{ stats.contractReviewCount || 0 }}</text>
            <view v-if="(stats.contractReviewCount || 0) > 0" class="mini-badge">新</view>
          </view>
          <text class="box-label">签约审核</text>
        </view>
        <!-- 已签约 -->
        <view class="audit-box signed" @click="goToReviews('approved')">
          <view class="box-icon"><text class="iconfont icon-success"></text></view>
          <text class="box-count">{{ stats.contractSignedCount || 0 }}</text>
          <text class="box-label">已签约</text>
        </view>
        <!-- 已驳回 -->
        <view class="audit-box rejected" @click="goToReviews('rejected')">
          <view class="box-icon"><text class="iconfont icon-error"></text></view>
          <text class="box-count">{{ stats.rejectedInstitutions || 0 }}</text>
          <text class="box-label">已驳回</text>
        </view>
      </view>
    </view>

    <!-- 运营管理工具 -->
    <view class="section">
      <view class="section-header">
        <view class="header-left">
          <text class="iconfont icon-tool"></text>
          <text class="section-title">运营管理工具</text>
        </view>
      </view>
      <view class="tool-grid">
        <view class="tool-item" @click="goTo('institutions')">
          <view class="tool-icon-wrap purple">
            <text class="iconfont icon-store"></text>
          </view>
          <text class="tool-name">机构管理</text>
        </view>
        <view class="tool-item" @click="goTo('reviews')">
          <view class="tool-icon-wrap orange">
            <text class="iconfont icon-order"></text>
            <view v-if="(stats.pendingAuditCount || 0) + (stats.contractReviewCount || 0) > 0" class="tool-badge"></view>
          </view>
          <text class="tool-name">审核中心</text>
        </view>
        <view class="tool-item" @click="goTo('banners')">
          <view class="tool-icon-wrap blue">
            <text class="iconfont icon-picture"></text>
          </view>
          <text class="tool-name">横幅管理</text>
        </view>
        <view class="tool-item" @click="goTo('feedbacks')">
          <view class="tool-icon-wrap green">
            <text class="iconfont icon-edit"></text>
            <view v-if="feedbackCount > 0" class="tool-badge"></view>
          </view>
          <text class="tool-name">反馈中心</text>
        </view>
        <view class="tool-item" @click="goTo('orders')">
          <view class="tool-icon-wrap blue">
            <text class="iconfont icon-order-fill"></text>
          </view>
          <text class="tool-name">订单管理</text>
        </view>
        <view class="tool-item" @click="goTo('users')">
          <view class="tool-icon-wrap teal">
            <text class="iconfont icon-customer"></text>
          </view>
          <text class="tool-name">用户管理</text>
        </view>
        <view class="tool-item" @click="goTo('finance')">
          <view class="tool-icon-wrap red">
            <text class="iconfont icon-money-rmb"></text>
          </view>
          <text class="tool-name">财务结算</text>
        </view>
        <view class="tool-item" @click="goTo('announcements')">
          <view class="tool-icon-wrap pink">
            <text class="iconfont icon-notice"></text>
          </view>
          <text class="tool-name">公告发布</text>
        </view>
      </view>
    </view>

    <!-- 退出登录 -->
    <LogoutButton @click="handleLogout" />

    <view class="footer">
      <text>Interest Class Admin v1.0.0</text>
      <text>© 2026 项目运营管理系统</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { authApi, type UserInfo } from '@/api/auth'
import { adminApi, type AdminStats, type AdminStatsParams } from '@/api/admin'
import { feedbackApi } from '@/api/feedback'
import LogoutButton from '@/components/LogoutButton/index.vue'
import { removeToken } from '@/utils/request'
import { useAuthGuard } from '@/composables/useAuthGuard'

const { isReady } = useAuthGuard('admin')
const userInfo = ref<UserInfo | null>(null)
const stats = ref<AdminStats>({
  totalInstitutions: 0,
  pendingAuditCount: 0,
  contractReviewCount: 0,
  contractSignedCount: 0,
  rejectedInstitutions: 0,
  totalUsers: 0,
  totalCourses: 0,
  totalOrders: 0,
  totalBookings: 0,
  periodInstitutions: 0,
  periodUsers: 0,
  periodCourses: 0,
  periodOrders: 0,
  periodBookings: 0,
  totalPlatformCommission: 0,
  periodPlatformCommission: 0,
  pendingReview: 0,
  approvedInstitutions: 0,
})

const feedbackCount = ref(0)
const lastUpdateTime = ref(new Date())
const selectedPeriod = ref<AdminStatsParams['period']>('thisMonth')

const periodOptions: { label: string; value: AdminStatsParams['period'] }[] = [
  { label: '本月', value: 'thisMonth' },
  { label: '三个月', value: 'threeMonths' },
  { label: '半年', value: 'halfYear' },
  { label: '一年', value: 'oneYear' },
  { label: '全部', value: 'all' },
]

const isAllPeriod = computed(() => selectedPeriod.value === 'all')

const periodLabel = computed(() => {
  return periodOptions.find(p => p.value === selectedPeriod.value)?.label || '期间'
})

const updateTime = computed(() => {
  const h = lastUpdateTime.value.getHours().toString().padStart(2, '0')
  const m = lastUpdateTime.value.getMinutes().toString().padStart(2, '0')
  return `更新：${h}:${m}`
})

const formatAmount = (val: number | undefined) => {
  const num = Number(val) || 0
  if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万'
  }
  return num.toFixed(2)
}

const loadUserInfo = async () => {
  try {
    const res = await authApi.getUserInfo()
    userInfo.value = res
  } catch (error) {
    console.error('获取管理员信息失败:', error)
  }
}

const loadStats = async () => {
  try {
    const res = await adminApi.getStats({
      period: selectedPeriod.value,
    })
    stats.value = res
    lastUpdateTime.value = new Date()
  } catch (error) {
    console.error('获取管理员统计失败:', error)
  }
}

const changePeriod = (period: AdminStatsParams['period']) => {
  if (selectedPeriod.value === period) return
  selectedPeriod.value = period
  loadStats()
}

const goToCommissionOrders = () => {
  uni.navigateTo({
    url: `/pages/admin/orders/index?commissionOnly=true&period=${selectedPeriod.value}`,
  })
}

const loadFeedbackCount = async () => {
  try {
    const res = await feedbackApi.getStats()
    feedbackCount.value = res?.pending || 0
  } catch (error) {
    console.error('获取反馈统计失败:', error)
  }
}

const goTo = (type: string) => {
  const routes: Record<string, string> = {
    institutions: '/pages/admin/institutions/index',
    reviews: '/pages/admin/reviews/index',
    banners: '/pages/admin/banners/index',
    feedbacks: '/pages/admin/feedback-list/index',
    orders: '/pages/admin/orders/index',
    users: '/pages/admin/users/index',
    announcements: '/pages/admin/announcements/index',
    'feedbacks-pending': '/pages/admin/feedback-list/index?status=pending',
    finance: '/pages/admin/finance/index',
  }
  if (routes[type]) {
    uni.navigateTo({ url: routes[type] })
  } else {
    uni.showToast({ title: '功能开发中', icon: 'none' })
  }
}

/** 跳转到审核中心，按状态筛选 */
const goToReviews = (status: string) => {
  uni.navigateTo({ url: `/pages/admin/reviews/index?status=${status}` })
}

const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        removeToken()
        uni.removeStorageSync('userType')
        uni.removeStorageSync('institutionId')
        uni.removeStorageSync('teacherId')
        uni.reLaunch({ url: '/pages/login/index' })
      }
    }
  })
}

onMounted(() => {
  loadUserInfo()
  loadStats()
  loadFeedbackCount()
})

onShow(() => {
  if (isReady.value) {
    loadStats()
    loadFeedbackCount()
  }
})

onPullDownRefresh(async () => {
  await Promise.all([
    loadUserInfo(),
    loadStats(),
    loadFeedbackCount(),
  ])
  uni.stopPullDownRefresh()
})
</script>

<style lang="scss" scoped>
.admin-center-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  padding-bottom: calc(48rpx + env(safe-area-inset-bottom));
}

/* 顶部 Header */
.header {
  background: linear-gradient(135deg, $uni-color-primary 0%, #389e0d 100%);
  padding: 80rpx 32rpx 100rpx;
  border-radius: 0 0 40rpx 40rpx;
}

.header-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.user-info {
  display: flex;
  align-items: center;
}

.avatar {
  width: 110rpx;
  height: 110rpx;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  margin-right: 24rpx;

  .avatar-icon {
    font-size: 56rpx;
    color: #fff;
  }
}

.name-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;

  .name {
    font-size: 40rpx;
    font-weight: 600;
    color: #fff;
    margin-right: 16rpx;
  }
}

.admin-badge {
  display: flex;
  align-items: center;
  padding: 4rpx 12rpx;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 40rpx;
  color: #fff;
  font-size: 20rpx;

  .iconfont {
    font-size: 20rpx;
    margin-right: 4rpx;
  }
}

.account {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.header-action {
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 30rpx;
  color: #fff;
  font-size: 24rpx;

  .iconfont {
    font-size: 24rpx;
    margin-right: 8rpx;
  }
}

/* 统计面板 */
.stats-panel {
  margin: -60rpx 32rpx 32rpx;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.05);
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;

  .title-left {
    display: flex;
    align-items: center;
    font-size: 30rpx;
    font-weight: 600;
    color: $uni-text-color;

    .iconfont {
      color: $uni-color-primary;
      margin-right: 12rpx;
      font-size: 34rpx;
    }
  }

  .update-time {
    font-size: 22rpx;
    color: $uni-text-color-tertiary;
  }
}

/* 时间筛选 */
.period-selector {
  display: flex;
  gap: 12rpx;
  margin-bottom: 24rpx;
  flex-wrap: wrap;

  .period-tag {
    padding: 8rpx 24rpx;
    font-size: 24rpx;
    border-radius: 30rpx;
    background-color: $uni-bg-color-grey;
    color: $uni-text-color-secondary;
    transition: all 0.2s;

    &.active {
      background-color: $uni-color-primary-lighter;
      color: $uni-color-primary;
      font-weight: 600;
    }
  }
}

/* 佣金高亮行 */
.commission-row {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #f6ffed, #d9f7be);
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid $uni-color-primary-lighter;
}

.commission-block {
  flex: 1;
  display: flex;
  flex-direction: column;

  .commission-label {
    display: flex;
    align-items: center;
    font-size: 22rpx;
    color: $uni-text-color-secondary;
    margin-bottom: 8rpx;

    .iconfont {
      font-size: 22rpx;
      color: $uni-color-primary;
      margin-right: 6rpx;
    }
  }

  .commission-value {
    font-size: 36rpx;
    font-weight: 700;

    &.period {
      color: $uni-color-primary;
    }

    &.total {
      color: $uni-text-color;
    }
  }
}

.commission-divider {
  width: 2rpx;
  height: 56rpx;
  background-color: rgba($uni-color-primary, 0.25);
  margin: 0 24rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}

.stat-card {
  padding: 24rpx;
  background-color: $uni-bg-color-tertiary;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
}

.stat-main {
  display: flex;
  flex-direction: column;
  margin-bottom: 16rpx;

  .stat-value {
    font-size: 44rpx;
    font-weight: 700;
    color: $uni-text-color;
    line-height: 1.2;
  }

  .stat-label {
    font-size: 24rpx;
    color: $uni-text-color-secondary;
    margin-top: 4rpx;
  }
}

.stat-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid $uni-border-color-light;

  .stat-sub {
    font-size: 20rpx;
    color: $uni-text-color-tertiary;
  }

  .stat-sub-value {
    font-size: 22rpx;
    color: $uni-text-color-secondary;
    font-weight: 500;

    &.warning { color: $uni-color-warning; font-weight: 800; }
    &.success { color: $uni-color-success; font-weight: 800; }
  }
}

/* 通用 Section */
.section {
  margin: 32rpx;
  padding: 32rpx;
  background-color: #fff;
  border-radius: 24rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;

  .header-left {
    display: flex;
    align-items: center;

    .iconfont {
      font-size: 32rpx;
      color: $uni-color-primary;
      margin-right: 12rpx;
    }
  }

  .section-title {
    font-size: 30rpx;
    font-weight: 600;
    color: $uni-text-color;
  }

  .section-action {
    display: flex;
    align-items: center;
    font-size: 24rpx;
    color: $uni-text-color-tertiary;

    .iconfont {
      font-size: 24rpx;
      margin-left: 4rpx;
    }
  }
}

/* 审核仪表盘 - 4列 */
.audit-dashboard {
  display: flex;
  justify-content: space-between;
  gap: 12rpx;
}

.audit-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 4rpx;
  border-radius: 16rpx;
  transition: all 0.2s;

  &:active {
    opacity: 0.8;
  }

  .box-icon {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 10rpx;

    .iconfont {
      font-size: 28rpx;
    }
  }

  &.pending-audit {
    background-color: rgba(250, 173, 20, 0.08);
    .box-icon { background-color: rgba(250, 173, 20, 0.15); .iconfont { color: $uni-color-warning; } }
    .box-count { color: $uni-color-warning; }
  }

  &.contract-review {
    background-color: rgba(24, 144, 255, 0.08);
    .box-icon { background-color: rgba(24, 144, 255, 0.15); .iconfont { color: #1890ff; } }
    .box-count { color: #1890ff; }
  }

  &.signed {
    background-color: rgba($uni-color-success, 0.08);
    .box-icon { background-color: rgba($uni-color-success, 0.15); .iconfont { color: $uni-color-success; } }
    .box-count { color: $uni-color-success; }
  }

  &.rejected {
    background-color: rgba($uni-color-error, 0.08);
    .box-icon { background-color: rgba($uni-color-error, 0.15); .iconfont { color: $uni-color-error; } }
    .box-count { color: $uni-color-error; }
  }

  .count-wrap {
    display: flex;
    align-items: flex-start;
  }

  .box-count {
    font-size: 32rpx;
    font-weight: 700;
    margin-bottom: 6rpx;
  }

  .mini-badge {
    background-color: $uni-color-error;
    color: #fff;
    font-size: 14rpx;
    padding: 2rpx 6rpx;
    border-radius: 4rpx;
    margin-left: 4rpx;
    margin-top: -2rpx;
  }

  .box-label {
    font-size: 22rpx;
    color: $uni-text-color-secondary;
  }
}

/* 管理工具网格 */
.tool-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32rpx 0;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;

  &:active { opacity: 0.7; }

  .tool-icon-wrap {
    width: 88rpx;
    height: 88rpx;
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12rpx;
    position: relative;

    .iconfont {
      font-size: 44rpx;
      color: #fff;
    }

    &.purple { background: linear-gradient(135deg, #722ed1, #9254de); }
    &.orange { background: linear-gradient(135deg, #fa8c16, #ffa940); }
    &.blue { background: linear-gradient(135deg, #1890ff, #40a9ff); }
    &.green { background: linear-gradient(135deg, #52c41a, #73d13d); }
    &.teal { background: linear-gradient(135deg, #13c2c2, #36cfc9); }
    &.red { background: linear-gradient(135deg, #f5222d, #ff4d4f); }
    &.pink { background: linear-gradient(135deg, #eb2f96, #f759ab); }
  }

  .tool-badge {
    position: absolute;
    top: -4rpx;
    right: -4rpx;
    width: 16rpx;
    height: 16rpx;
    background-color: $uni-color-error;
    border: 2rpx solid #fff;
    border-radius: 50%;
  }

  .tool-name {
    font-size: 24rpx;
    color: $uni-text-color;
  }
}

.footer {
  padding: 48rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: $uni-text-color-tertiary;
  font-size: 22rpx;

  text:last-child {
    margin-top: 8rpx;
  }
}
</style>
