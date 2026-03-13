<template>
  <view v-if="isReady" class="mine-page">
    <!-- 1. 顶部用户信息背景区域 -->
    <view class="header-section" :style="{ paddingTop: safeAreaTop + 'px' }">
      <view class="user-card" @click="handleUserInfo">
        <AsyncImage 
          v-if="userInfo.avatar"
          :url="userInfo.avatar"
          width="120rpx" 
          height="120rpx"
          mode="aspectFill"
          custom-class="avatar"
        />
        <image 
          v-else
          class="avatar" 
          src="/static/default-avatar.png" 
          mode="aspectFill"
        />
        <view class="info-content">
          <view class="name-row">
            <text class="nickname">{{ userInfo.nickname || '点击登录' }}</text>
            <view class="vip-tag" v-if="userInfo.id">
              <text class="iconfont icon-vip-fill"></text>
              <text>普通会员</text>
            </view>
          </view>
          <text class="uid" v-if="userInfo.id">ID: {{ userInfo.id.slice(-8) }}</text>
          <text class="phone" v-else>登录发现更多精彩</text>
        </view>
        <view class="setting-btn" @click.stop="goToSettings">
          <text class="iconfont icon-settings"></text>
        </view>
      </view>

      <!-- 2. 数据统计栏（浮动感） -->
      <view class="stats-card">
        <view class="stat-item" @click="goToWallet">
          <text class="num">{{ income.toFixed(2) }}</text>
          <text class="label">累计收益(元)</text>
        </view>
        <view class="stat-item" @click="goToCourseHours">
          <text class="num">{{ totalHours }}</text>
          <text class="label">剩余课时</text>
        </view>
        <view class="stat-item" @click="goToChildren">
          <text class="num">{{ childCount || 0 }}</text>
          <text class="label">我的宝贝</text>
        </view>
      </view>
    </view>

    <view class="content-body">
      <!-- 3. 我的订单 -->
      <view class="section-card order-section">
        <view class="section-header" @click="goToOrders('all')">
          <text class="title">我的订单</text>
          <view class="more">
            <text>全部订单</text>
            <text class="iconfont icon-right"></text>
          </view>
        </view>
        <view class="order-menu">
          <view class="menu-item" @click="goToOrders('unpaid')">
            <view class="icon-wrap">
              <text class="iconfont icon-money-wallet" style="color: #ff4d4f;"></text>
              <view v-if="orderCount.unpaid > 0" class="badge">{{ orderCount.unpaid }}</view>
            </view>
            <text class="label">待付款</text>
          </view>
          <view class="menu-item" @click="goToOrders('pending_confirm')">
            <view class="icon-wrap">
              <text class="iconfont icon-time" style="color: #faad14;"></text>
              <view v-if="orderCount.pendingConfirm > 0" class="badge">{{ orderCount.pendingConfirm }}</view>
            </view>
            <text class="label">待确认</text>
          </view>
          <view class="menu-item" @click="goToOrders('confirmed')">
            <view class="icon-wrap">
              <text class="iconfont icon-success-fill" style="color: #52c41a;"></text>
              <view v-if="orderCount.confirmed > 0" class="badge">{{ orderCount.confirmed }}</view>
            </view>
            <text class="label">已确认</text>
          </view>
          <view class="menu-item" @click="goToOrders('refund')">
            <view class="icon-wrap">
              <text class="iconfont icon-money-red-packet" style="color: #1890ff;"></text>
              <view v-if="orderCount.refund > 0" class="badge">{{ orderCount.refund }}</view>
            </view>
            <text class="label">退款/售后</text>
          </view>
        </view>
      </view>

      <!-- 4. 邀请码卡片（增强视觉，放在中间） -->
      <view class="section-card invite-section" v-if="userInfo.id">
        <view class="invite-banner" @click="goToPromo">
          <view class="banner-left">
            <view class="banner-title">邀好友，赚现金</view>
            <view class="banner-desc">好友下单立减，你得现金返利</view>
          </view>
          <view class="banner-btn">去赚钱</view>
        </view>
        
        <view class="invite-code-container">
          <view class="code-box">
            <view class="code-main">
              <text class="label">邀请码</text>
              <text class="value">{{ inviteCodeInfo?.invite_code || '---' }}</text>
            </view>
            <view class="copy-btn" @click="copyInviteCode">复制</view>
          </view>
          <view class="divider"></view>
          <view class="share-info" @click="goToPromo">
            <text class="share-label">让利比例</text>
            <text class="share-value">{{ inviteCodeInfo?.share_ratio ?? 50 }}%</text>
            <text class="iconfont icon-right"></text>
          </view>
        </view>
      </view>

      <!-- 5. 常用服务 -->
      <view class="section-card service-section">
        <view class="section-header">
          <text class="title">常用服务</text>
        </view>
        <view class="service-list">
          <view class="service-cell" @click="goToBookings">
            <view class="cell-left">
              <text class="iconfont icon-calendar cell-icon" style="color: #597ef7;"></text>
              <text class="cell-label">我的预约</text>
            </view>
            <text class="iconfont icon-right"></text>
          </view>
          <view class="service-cell" @click="goToChildren">
            <view class="cell-left">
              <text class="iconfont icon-smile cell-icon" style="color: #ff7a45;"></text>
              <text class="cell-label">宝贝管理</text>
            </view>
            <text class="iconfont icon-right"></text>
          </view>
          <view class="service-cell" @click="goToWallet">
            <view class="cell-left">
              <text class="iconfont icon-money-wallet cell-icon" style="color: #ffc53d;"></text>
              <text class="cell-label">我的钱包</text>
            </view>
            <text class="iconfont icon-right"></text>
          </view>
          <view class="service-cell" @click="goToFavorites">
            <view class="cell-left">
              <text class="iconfont icon-favorites cell-icon" style="color: #f5222d;"></text>
              <text class="cell-label">我的收藏</text>
            </view>
            <text class="iconfont icon-right"></text>
          </view>
          <view class="service-cell" @click="openFeedback">
            <view class="cell-left">
              <text class="iconfont icon-edit cell-icon" style="color: #13c2c2;"></text>
              <text class="cell-label">意见反馈</text>
            </view>
            <text class="iconfont icon-right"></text>
          </view>
          <view class="service-cell" @click="goToHelp">
            <view class="cell-left">
              <text class="iconfont icon-help cell-icon" style="color: #73d13d;"></text>
              <text class="cell-label">使用帮助</text>
            </view>
            <text class="iconfont icon-right"></text>
          </view>
        </view>
      </view>
    </view>
    
    <FeedbackDialog ref="feedbackDialogRef" page-source="mine" />
    <view class="safe-area"></view>
    <view style="height: 120rpx;"></view>
    <CustomTabbar />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import { authApi } from '@/api/auth'
import { childApi } from '@/api/child'
import { inviteApi } from '@/api/invite'
import { orderApi } from '@/api/order'
import { getToken } from '@/utils/request'
import { useUserStore } from '@/stores/user'
import AsyncImage from '@/components/AsyncImage/index.vue'
import CustomTabbar from '@/components/CustomTabbar/index.vue'
import FeedbackDialog from '@/components/FeedbackDialog/index.vue'
import { useAuthGuard } from '@/composables/useAuthGuard'

const { isReady } = useAuthGuard()
const userStore = useUserStore()
const userInfo = ref<any>({})
const income = ref(0)
const totalHours = ref(0) 
const childCount = ref(0)
const safeAreaTop = ref(0)
const inviteCodeInfo = ref<any>(null)
const orderCount = ref({
  pendingConfirm: 0,
  unpaid: 0,
  confirmed: 0,
  refund: 0
})

onLoad(() => {
  const systemInfo = uni.getSystemInfoSync()
  // #ifdef MP-WEIXIN
  const menuButton = uni.getMenuButtonBoundingClientRect()
  safeAreaTop.value = menuButton.bottom + 12
  // #endif

  // #ifndef MP-WEIXIN
  safeAreaTop.value = (systemInfo.statusBarHeight || 0) + 12
  // #endif
})

/**
 * 刷新用户信息
 */
const getUserInfo = async () => {
  if (!getToken()) return
  try {
    const res = await authApi.getUserInfo()
    userInfo.value = res
    userStore.setUserInfo(res)
  } catch (error) {
    console.error('获取用户信息失败', error)
  }
}

/**
 * 获取累积收益（从邀友返现余额接口）
 */
const loadIncome = async () => {
  if (!getToken()) return
  try {
    const balance = await inviteApi.getBalance()
    income.value = Number(balance?.total_earned) || 0
  } catch (error) {
    console.error('获取收益信息失败:', error)
  }
}

/**
 * 加载邀请码信息
 */
const loadInviteCode = async () => {
  if (!getToken()) return
  try {
    inviteCodeInfo.value = await inviteApi.getMyInviteCode()
  } catch (error) {
    console.error('获取邀请码失败:', error)
  }
}

/**
 * 获取课时资产（已确认订单的剩余课时总和）
 */
const loadCourseHours = async () => {
  if (!getToken()) return
  try {
    const res = await orderApi.getMyList({ page: 1, pageSize: 100, status: 'confirmed' })
    const orders = res?.data || []
    let remaining = 0
    for (const order of orders) {
      remaining += (order.total_lessons || 0) - (order.completed_lessons || 0)
    }
    totalHours.value = remaining
  } catch (error) {
    console.error('获取课时资产失败:', error)
  }
}

/**
 * 获取宝贝数量
 */
const getChildCount = async () => {
  if (!getToken()) return
  try {
    const children = await childApi.getMyList()
    childCount.value = children.length
  } catch (error) {
    console.error('获取宝贝数量失败:', error)
  }
}

/**
 * 获取各状态订单数量（用于角标展示）
 */
const loadOrderCounts = async () => {
  if (!getToken()) return
  try {
    // 并行查询各状态订单数量
    const [pending, pendingConfirm, confirmed, refunding] = await Promise.all([
      orderApi.getMyList({ page: 1, pageSize: 1, status: 'pending' }),
      orderApi.getMyList({ page: 1, pageSize: 1, status: 'pending_confirm' }),
      orderApi.getMyList({ page: 1, pageSize: 1, status: 'confirmed' }),
      orderApi.getMyList({ page: 1, pageSize: 1, status: 'refund_pending,refunding' }),
    ])
    orderCount.value = {
      unpaid: pending?.total || 0,
      pendingConfirm: pendingConfirm?.total || 0,
      confirmed: confirmed?.total || 0,
      refund: refunding?.total || 0,
    }
  } catch (error) {
    console.error('获取订单数量失败:', error)
  }
}

const handleInstitutionSettle = () => {
  uni.navigateTo({ url: '/pages/institution/settle/index' })
}

const handleUserInfo = () => {
  if (!getToken()) {
    uni.navigateTo({ url: '/pages/login/index?from=' + encodeURIComponent('/pages/mine/index') })
  } else {
    uni.navigateTo({ url: '/pages/settings/profile' })
  }
}

const goToOrders = (status: string) => {
  // 原有的逻辑跳转到 /pages/my-orders/index?type=xxx
  // 或者新路由 /pages/order/list?status=xxx 
  // 根据之前的备份代码，原逻辑跳转的是 /pages/my-orders/index?type=xxx
  // 我们保持原有的逻辑适配
  uni.navigateTo({
    url: `/pages/my-orders/index?type=${status}`
  })
}

const goToPromo = () => {
  uni.navigateTo({ url: '/pages/mine/invite/index' })
}

const copyInviteCode = () => {
  if (!inviteCodeInfo.value?.invite_code) return
  uni.setClipboardData({
    data: inviteCodeInfo.value.invite_code,
    success: () => {
      uni.showToast({ title: '邀请码已复制', icon: 'success' })
    },
  })
}

const goToWallet = () => {
  uni.navigateTo({ url: '/pages/mine/wallet/index' })
}

const goToChildren = () => {
  uni.navigateTo({ url: '/pages/child-list/index' }) // 原路径
}

const goToBookings = () => {
  uni.navigateTo({ url: '/pages/my-bookings/index' }) // 原路径
}

const goToCourseHours = () => {
  uni.navigateTo({ url: '/pages/course-hours/index' })
}

const goToHelp = () => {
  uni.navigateTo({ url: '/pages/help-center/index' })
}

const goToSettings = () => {
  uni.navigateTo({ url: '/pages/settings/index' })
}

const goToFavorites = () => {
  uni.navigateTo({ url: '/pages/my-favorites/index' })
}

// 意见反馈
const feedbackDialogRef = ref<InstanceType<typeof FeedbackDialog> | null>(null)
const openFeedback = () => {
  feedbackDialogRef.value?.open()
}

const loadPageData = async () => {
  const token = getToken()
  if (!token) {
    userInfo.value = {}
    income.value = 0
    totalHours.value = 0
    childCount.value = 0
    inviteCodeInfo.value = null
    orderCount.value = { pendingConfirm: 0, unpaid: 0, confirmed: 0, refund: 0 }
    return
  }
  // 并行加载所有数据
  await Promise.all([
    getUserInfo(),
    loadIncome(),
    loadInviteCode(),
    loadCourseHours(),
    getChildCount(),
    loadOrderCounts(),
  ])
}

onShow(() => {
  uni.hideTabBar({ animation: false })
  loadPageData()
})
</script>

<style lang="scss" scoped>
.mine-page {
  min-height: 100vh;
  background-color: #f8f8f8;
}

.header-section {
  background: linear-gradient(180deg, $uni-color-primary 0%, #73d13d 100%);
  padding: 0 32rpx 100rpx;
}

.user-card {
  display: flex;
  align-items: center;
  padding: 40rpx 0 20rpx;
  position: relative;

  .avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 60rpx;
    border: 4rpx solid rgba(255, 255, 255, 0.6);
    background-color: #fff;
    overflow: hidden;
  }

  :deep(.avatar) {
    width: 120rpx !important;
    height: 120rpx !important;
    border-radius: 60rpx !important;
    border: 4rpx solid rgba(255, 255, 255, 0.6) !important;
    overflow: hidden;
    
    image {
      border-radius: 60rpx !important;
    }
  }

  .info-content {
    margin-left: 24rpx;
    flex: 1;

    .nickname {
      font-size: 38rpx;
      font-weight: 600;
      color: #fff;
      display: block;
      margin-bottom: 8rpx;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 16rpx;

      .phone {
        font-size: 26rpx;
        color: rgba(255, 255, 255, 0.9);
      }

      .vip-tag {
        background: rgba(255, 255, 255, 0.2);
        padding: 4rpx 16rpx;
        border-radius: 20rpx;
        display: flex;
        align-items: center;
        gap: 4rpx;

        .iconfont {
          font-size: 24rpx;
          color: #ffeb3b;
        }

        text {
          font-size: 22rpx;
          color: #fff;
        }
      }
    }
  }

  .setting-btn {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 32rpx;

    .iconfont {
      color: #fff;
      font-size: 36rpx;
    }
  }
}

.stats-card {
  display: flex;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx 0;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
  margin-top: 20rpx;

  .stat-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      right: 0;
      top: 20%;
      height: 60%;
      width: 1rpx;
      background-color: #eee;
    }

    &:last-child::after {
      display: none;
    }

    .num {
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 8rpx;
    }

    .label {
      font-size: 24rpx;
      color: #999;
    }
  }
}

.content-body {
  padding: 0 32rpx;
  margin-top: -60rpx;
}

.section-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.02);

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32rpx;

    .title {
      font-size: 32rpx;
      font-weight: 600;
      color: #333;
    }

    .more {
      display: flex;
      align-items: center;
      font-size: 26rpx;
      color: #999;

      .iconfont {
        font-size: 24rpx;
        margin-left: 4rpx;
      }
    }
  }
}

.order-menu {
  display: flex;
  justify-content: space-between;

  .menu-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;

    .icon-wrap {
      position: relative;
      margin-bottom: 12rpx;

      .iconfont {
        font-size: 52rpx;
      }

      .badge {
        position: absolute;
        top: -10rpx;
        right: -10rpx;
        background: #ff4d4f;
        color: #fff;
        font-size: 20rpx;
        padding: 0 8rpx;
        height: 28rpx;
        line-height: 28rpx;
        border-radius: 14rpx;
        min-width: 28rpx;
        text-align: center;
        border: 2rpx solid #fff;
      }
    }

    .label {
      font-size: 24rpx;
      color: #666;
    }
  }
}

.invite-section {
  padding: 0;
  overflow: hidden;

  .invite-banner {
    background: linear-gradient(90deg, #fff2e8 0%, #fff7e6 100%);
    padding: 24rpx 32rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .banner-title {
      font-size: 30rpx;
      font-weight: 600;
      color: #ff7a45;
      margin-bottom: 4rpx;
    }

    .banner-desc {
      font-size: 22rpx;
      color: #fa8c16;
    }

    .banner-btn {
      background: #fa8c16;
      color: #fff;
      font-size: 24rpx;
      padding: 8rpx 24rpx;
      border-radius: 30rpx;
    }
  }

  .invite-code-container {
    padding: 32rpx;
    display: flex;
    align-items: center;

    .code-box {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #fdfdfd;
      border: 1rpx dashed #d9d9d9;
      padding: 16rpx 24rpx;
      border-radius: 12rpx;

      .code-main {
        display: flex;
        align-items: center;
        gap: 16rpx;

        .label {
          font-size: 24rpx;
          color: #999;
        }

        .value {
          font-size: 32rpx;
          font-weight: bold;
          color: #333;
          letter-spacing: 2rpx;
        }
      }

      .copy-btn {
        font-size: 24rpx;
        color: $uni-color-primary;
        font-weight: 500;
      }
    }

    .divider {
      width: 1rpx;
      height: 60rpx;
      background: #eee;
      margin: 0 32rpx;
    }

    .share-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4rpx;

      .share-label {
        font-size: 22rpx;
        color: #999;
      }

      .share-value {
        font-size: 28rpx;
        color: #333;
        font-weight: 600;
      }
      
      .iconfont {
        font-size: 20rpx;
        color: #ccc;
      }
    }
  }
}

.service-section {
  padding-bottom: 12rpx;
}

.service-list {
  .service-cell {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 32rpx 0;
    border-bottom: 1rpx solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }

    .cell-left {
      display: flex;
      align-items: center;

      .cell-icon {
        font-size: 44rpx;
        margin-right: 24rpx;
      }

      .cell-label {
        font-size: 28rpx;
        color: #333;
      }
    }

    .iconfont.icon-right {
      font-size: 24rpx;
      color: #ccc;
    }
  }
}

.safe-area {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
