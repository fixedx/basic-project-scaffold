<template>
  <view v-if="isReady" class="mine-page">
    <!-- 顶部背景与用户信息区域 -->
    <view class="header-section" :style="{ paddingTop: safeAreaTop + 'px' }">
      <!-- 顶部操作栏 -->
      <view class="header-top">
        <view class="user-info" @click="handleUserInfo">
          <AsyncImage 
            v-if="userInfo.avatar"
            :url="userInfo.avatar"
            width="100rpx" 
            height="100rpx"
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
            <text class="phone" v-if="!userInfo.id">登录后查看详情</text>
            <text class="phone" v-else>{{ userInfo.phone || '' }}</text>
          </view>
        </view>
      </view>

      <!-- 数据统计栏 (映射原有业务数据) -->
      <view class="stats-row">
        <view class="stat-item" @click="goToWallet">
          <text class="num">{{ income.toFixed(2) }}</text>
          <text class="label">累计收益</text>
        </view>
        <view class="stat-item" @click="goToCourseHours">
          <text class="num">{{ totalHours }}</text>
          <text class="label">课时资产</text>
        </view>
        <view class="stat-item" @click="goToChildren">
          <text class="num">{{ childCount || 0 }}</text>
          <text class="label">宝贝</text>
        </view>
      </view>

    </view>

    <!-- 我的订单 (保留原有业务逻辑) -->
    <view class="section-card">
      <view class="section-header" @click="goToOrders('all')">
        <text class="title">我的订单</text>
        <view class="more">
          <text>全部</text>
          <text class="iconfont icon-right"></text>
        </view>
      </view>
      <view class="grid-menu activity-menu">
        <view class="menu-item" @click="goToOrders('pending_confirm')">
           <view class="icon-wrap">
              <text class="iconfont icon-time" style="color: #faad14; font-size: 56rpx;"></text>
              <view v-if="orderCount.pendingConfirm > 0" class="badge">{{ orderCount.pendingConfirm }}</view>
           </view>
           <text class="label">待确认</text>
        </view>
        <view class="menu-item" @click="goToOrders('unpaid')">
           <view class="icon-wrap">
              <text class="iconfont icon-money-wallet" style="color: #ff4d4f; font-size: 56rpx;"></text>
              <view v-if="orderCount.unpaid > 0" class="badge">{{ orderCount.unpaid }}</view>
           </view>
           <text class="label">待付款</text>
        </view>
        <view class="menu-item" @click="goToOrders('confirmed')">
           <view class="icon-wrap">
              <text class="iconfont icon-success" style="color: #52c41a; font-size: 56rpx;"></text>
              <view v-if="orderCount.confirmed > 0" class="badge">{{ orderCount.confirmed }}</view>
           </view>
           <text class="label">已确认</text>
        </view>
        <view class="menu-item" @click="goToOrders('refund')">
           <view class="icon-wrap">
              <text class="iconfont icon-return" style="color: #1890ff; font-size: 56rpx;"></text>
              <view v-if="orderCount.refund > 0" class="badge">{{ orderCount.refund }}</view>
           </view>
           <text class="label">退款/售后</text>
        </view>
      </view>
      
      <!-- 广告Banner (保留推广入口) -->
      <view class="ad-banner" @click="goToPromo">
        <view class="ad-content">
          <view class="ad-text">
            <view>
              <text class="highlight">邀请有礼</text>
              <text class="highlight-red">赚收益</text>
            </view>
            <view class="go-btn">GO</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 核心服务 (Grid布局) -->
    <view class="section-card">
      <view class="section-header">
        <text class="title">我的服务</text>
      </view>
      <view class="service-grid">
         <!-- 第一行 -->
        <view class="service-item" @click="goToBookings">
          <text class="iconfont icon-order service-icon" style="color: #597ef7;"></text>
          <text class="label">我的预约</text>
        </view>
        <view class="service-item" @click="goToChildren">
          <text class="iconfont icon-smile service-icon" style="color: #ff7a45;"></text>
          <text class="label">宝贝管理</text>
        </view>
        <view class="service-item" @click="goToWallet">
          <text class="iconfont icon-money-wallet service-icon" style="color: #ffc53d;"></text>
          <text class="label">我的钱包</text>
        </view>
        
        <!-- 第二行 -->
        <view class="service-item" @click="goToHelp">
          <text class="iconfont icon-customer-service service-icon" style="color: #73d13d;"></text>
          <text class="label">帮助中心</text>
        </view>
        <view class="service-item" @click="goToSettings">
          <text class="iconfont icon-settings service-icon" style="color: #9254de;"></text>
          <text class="label">设置</text>
        </view>
        <view class="service-item" @click="goToFavorites">
          <text class="iconfont icon-favorites service-icon" style="color: #f5222d;"></text>
          <text class="label">我的收藏</text>
        </view>
        <view class="service-item" @click="openFeedback">
          <text class="iconfont icon-edit service-icon" style="color: #13c2c2;"></text>
          <text class="label">意见反馈</text>
        </view>
      </view>
    </view>
    
    <!-- 反馈弹窗 -->
    <FeedbackDialog ref="feedbackDialogRef" page-source="mine" />
    
    <!-- 安全区域 -->
    <view class="safe-area"></view>
    
    <!-- 底部 TabBar 占位 -->
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
    orderCount.value = { pendingConfirm: 0, unpaid: 0, confirmed: 0, refund: 0 }
    return
  }
  // 并行加载所有数据
  await Promise.all([
    getUserInfo(),
    loadIncome(),
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
  background-color: #f5f7fa;
  box-sizing: border-box;
  padding-bottom: env(safe-area-inset-bottom);
}

// 头部区域 (绿色背景)
.header-section {
  background: linear-gradient(135deg, #73d13d 0%, #52c41a 100%);
  padding-bottom: 32rpx;
  color: #fff;
  position: relative;
  z-index: 10;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx 32rpx;

  .user-info {
    display: flex;
    align-items: center;
    
    .avatar {
      width: 100rpx;
      height: 100rpx;
      border-radius: 50%;
      border: 4rpx solid rgba(255, 255, 255, 0.4);
      margin-right: 24rpx;
      background-color: #fff;
    }

    :deep(.avatar) {
      width: 100rpx !important;
      height: 100rpx !important;
      border-radius: 50% !important;
      border: 4rpx solid rgba(255, 255, 255, 0.4) !important;
      margin-right: 24rpx !important;
      overflow: hidden;
      
      image {
        border-radius: 50% !important;
      }
    }

    .info-content {
      display: flex;
      flex-direction: column;

      .name-row {
        display: flex;
        align-items: center;
        gap: 12rpx;
        margin-bottom: 8rpx;
      }

      .nickname {
        font-size: 34rpx;
        font-weight: 500;
      }
      
      .vip-tag {
        display: flex;
        align-items: center;
        background: rgba(0,0,0,0.2);
        padding: 2rpx 12rpx;
        border-radius: 20rpx;
        .iconfont { font-size: 20rpx; margin-right: 4rpx; color: #ffd700; }
        text { font-size: 20rpx; color: #ffd700; }
      }

      .phone {
        font-size: 26rpx;
        opacity: 0.9;
        font-family: monospace;
      }
    }
  }
}

// 统计数据栏
.stats-row {
  display: flex;
  justify-content: space-around;
  margin-bottom: 40rpx;

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;

    .num {
      font-size: 36rpx;
      font-weight: 500;
      margin-bottom: 8rpx;
    }

    .label {
      font-size: 24rpx;
      opacity: 0.8;
    }
  }
}

// 通用卡片样式
.section-card {
  margin: 0 0 20rpx; 
  background: #fff;
  padding: 32rpx 24rpx 24rpx;

  &:first-of-type {
    margin-top: 0; 
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    padding-left: 8rpx;

    .title {
      font-size: 30rpx;
      font-weight: bold;
      color: #333;
    }
    
    .more {
      display: flex;
      align-items: center;
      color: #999;
      font-size: 24rpx;
    }
  }
}

// 宫格菜单（我的活动 -> 改为我的订单状态）
.activity-menu {
  display: flex;
  justify-content: space-around;
  margin-bottom: 24rpx;

  .menu-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    flex: 1;

    .icon-wrap {
      margin-bottom: 12rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      
      .badge {
        position: absolute;
        top: -8rpx;
        right: -12rpx;
        background: #ff4d4f;
        color: #fff;
        font-size: 20rpx;
        padding: 0 8rpx;
        border-radius: 20rpx;
        border: 2rpx solid #fff;
        min-width: 32rpx;
        text-align: center;
      }
    }

    .label {
      font-size: 26rpx;
      color: #333;
    }
  }
}

// 服务网格（我的服务）
.service-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40rpx 0;

  .service-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 120rpx; // 占位

    .service-icon {
      font-size: 52rpx;
      margin-bottom: 16rpx;
    }

    .label {
      font-size: 24rpx;
      color: #666;
    }
  }
}

// 广告 Banner
.ad-banner {
  margin-top: 24rpx;
  height: 120rpx;
  border-radius: 50rpx;
  overflow: hidden;
  position: relative;
  background: linear-gradient(90deg, #ff7875 0%, #ff4d4f 100%); 

  .ad-content {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
    padding: 0 40rpx;
    display: flex;
    align-items: center;

    .ad-text {
      display: flex; 
      align-items: center;
      color: #fff;
      font-style: italic;
      justify-content: space-between;
      width: 100%;

      .highlight {
        font-size: 32rpx;
        font-weight: 900;
        margin-right: 12rpx;
      }

      .highlight-red {
        font-size: 40rpx;
        font-weight: 900;
        background: #fff;
        -webkit-background-clip: text;
        color: transparent;
        margin-right: 24rpx;
      }
      
      .go-btn {
        width: 60rpx;
        height: 60rpx;
        border-radius: 50%;
        background: linear-gradient(135deg, #ffec3d 0%, #faad14 100%);
        color: #fff;
        font-size: 24rpx;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4rpx 8rpx rgba(0,0,0,0.2);
        font-style: normal;
        margin-left: auto; 
      }
    }
  }
}

.safe-area {
  height: 48rpx;
}
</style>
