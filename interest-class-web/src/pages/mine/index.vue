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
          round
          custom-class="avatar"
        />
        <image 
          v-else
          class="avatar" 
          src="/static/images/default-avatar.png" 
          mode="aspectFill"
        />
        <view class="info-content">
          <view class="name-row">
            <text class="nickname">{{ userInfo.nickname || (getToken() ? '未设置昵称' : '点击登录') }}</text>
            <view class="vip-tag" v-if="userInfo.id">
              <text class="iconfont icon-vip-fill"></text>
              <text>成长会员</text>
            </view>
          </view>
          <text class="uid" v-if="userInfo.id">ID: {{ userInfo.id.slice(-8) }}</text>
          <text class="phone" v-else>登录发现更多精彩</text>
        </view>
        <view class="setting-btn" @click.stop="goToSettings">
          <text class="iconfont icon-settings-fill"></text>
        </view>
      </view>

      <!-- 2. 数据统计栏（浮动感） -->
      <view class="stats-card">
        <view class="stat-item" @click="goToWallet">
          <view class="num-wrap">
            <text class="unit">¥</text>
            <text class="num">{{ income.toFixed(2) }}</text>
          </view>
          <text class="label">累计赚取</text>
        </view>
        <view class="stat-item" @click="goToCourseHours">
          <view class="num-wrap">
            <text class="num">{{ totalHours }}</text>
            <text class="unit">节</text>
          </view>
          <text class="label">课时资产</text>
        </view>
        <view class="stat-item" @click="goToChildren">
          <view class="num-wrap">
            <text class="num">{{ childCount || 0 }}</text>
            <text class="unit">人</text>
          </view>
          <text class="label">我的宝贝</text>
        </view>
      </view>
    </view>

    <view class="content-body">
      <!-- 官方赚取/让利 核心控制面板 -->
      <view class="section-card profit-panel" v-if="userInfo.id && inviteCodeInfo">
        <view class="panel-header">
          <view class="title-group">
            <text class="iconfont icon-money-wallet-fill theme-icon"></text>
            <text class="title">邀友返现 · 让利设置</text>
          </view>
          <view class="invite-code-pill" @click="copyInviteCode">
            <text class="label">我的邀请码:</text>
            <text class="value">{{ inviteCodeInfo?.invite_code || '---' }}</text>
            <text class="iconfont icon-copy"></text>
          </view>
        </view>

        <view class="slider-container">
          <view class="slider-labels">
            <view class="label-item">
              <text class="role">我赚 (邀友)</text>
              <text class="percent">{{ 100 - (inviteCodeInfo?.share_ratio || 0) }}%</text>
            </view>
            <view class="label-item text-right">
              <text class="role">友得 (让利)</text>
              <text class="percent">{{ inviteCodeInfo?.share_ratio || 0 }}%</text>
            </view>
          </view>
          
          <view class="slider-wrapper">
            <slider 
              :value="inviteCodeInfo?.share_ratio" 
              @change="onShareRatioChange"
              activeColor="#52c41a"
              backgroundColor="#f0f0f0"
              block-size="24"
              block-color="#52c41a"
              :step="5"
            />
          </view>
          
          <view class="slider-tips">
            <text class="iconfont icon-info"></text>
            <text>拖动滑块调整分配比例，让利越多邀友成功率越高哦</text>
          </view>
        </view>

        <view class="profit-actions">
          <view class="action-item" @click="goToPromo">
            <text class="iconfont icon-share"></text>
            <text>立即邀友</text>
          </view>
          <view class="divider"></view>
          <view class="action-item" @click="goToWallet">
            <text class="iconfont icon-money-rmb"></text>
            <text>收益提现</text>
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
          <view class="service-cell" @click="goToCashbackGuide">
            <view class="cell-left">
              <text class="iconfont icon-money-red-packet cell-icon" style="color: #fa8c16;"></text>
              <text class="cell-label">返现与让利</text>
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

/**
 * 更新让利比例
 */
const onShareRatioChange = async (e: any) => {
  const value = e.detail.value
  if (value === inviteCodeInfo.value?.share_ratio) return
  
  uni.showLoading({ title: '更新中...' })
  try {
    await inviteApi.updateMyInviteCodeRatio(value)
    inviteCodeInfo.value.share_ratio = value
    uni.showToast({ title: '设置已生效', icon: 'success' })
  } catch (error) {
    console.error('更新让利比例失败:', error)
    uni.showToast({ title: '更新失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
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

const goToCashbackGuide = () => {
  uni.navigateTo({ url: '/pages/help-center/detail?categoryId=invite&articleId=invite-1' })
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
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  padding: 0 32rpx 100rpx;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: -60rpx;
    right: -60rpx;
    width: 240rpx;
    height: 240rpx;
    background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%);
    border-radius: 50%;
  }
}

.user-card {
  display: flex;
  align-items: center;
  padding: 40rpx 0 30rpx;
  position: relative;
  z-index: 2;

  .avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 60rpx;
    border: 4rpx solid rgba(255, 255, 255, 0.4);
    background-color: #fff;
    overflow: hidden;
  }

  :deep(.avatar) {
    width: 120rpx !important;
    height: 120rpx !important;
    border-radius: 60rpx !important;
    overflow: hidden;
    
    image {
      border-radius: 60rpx !important;
    }
  }

  .info-content {
    margin-left: 24rpx;
    flex: 1;

    .name-row {
      display: flex;
      align-items: center;
      gap: 12rpx;
      margin-bottom: 8rpx;

      .nickname {
        font-size: 38rpx;
        font-weight: 600;
        color: #fff;
      }

      .vip-tag {
        background: rgba(255, 255, 255, 0.2);
        padding: 4rpx 16rpx;
        border-radius: 20rpx;
        display: flex;
        align-items: center;
        gap: 6rpx;

        .iconfont {
          font-size: 24rpx;
          color: #ffeb3b;
        }

        text {
          font-size: 22rpx;
          color: #fff;
          font-weight: 500;
        }
      }
    }

    .uid {
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.8);
      display: block;
    }

    .phone {
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.8);
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
  padding: 36rpx 0;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.04);
  margin-top: 32rpx;
  position: relative;
  z-index: 10;

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
      top: 50%;
      transform: translateY(-50%);
      height: 40rpx;
      width: 1rpx;
      background-color: #f0f0f0;
    }

    &:last-child::after {
      display: none;
    }

    .num-wrap {
      display: flex;
      align-items: baseline;
      margin-bottom: 6rpx;

      .num {
        font-size: 40rpx;
        font-weight: 800;
        color: #333;
        font-family: 'DIN Alternate', 'Helvetica Neue', Helvetica, sans-serif;
      }

      .unit {
        font-size: 20rpx;
        color: #999;
        margin-left: 4rpx;
        font-weight: 400;
      }
    }

    .label {
      font-size: 22rpx;
      color: #bbbbbb;
      font-weight: 400;
    }
  }
}

.content-body {
  padding: 0 24rpx;
  margin-top: -80rpx;
  position: relative;
  z-index: 11;
}

.profit-panel {
  padding: 32rpx 28rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24rpx;

    .title-group {
      display: flex;
      align-items: center;
      gap: 12rpx;
      flex-shrink: 0;

      .theme-icon {
        font-size: 40rpx;
        color: #ffa940;
      }

      .title {
        font-size: 30rpx;
        font-weight: 700;
        color: #1a1a1a;
        letter-spacing: 0.5rpx;
        white-space: nowrap;
      }
    }

    .invite-code-pill {
      display: flex;
      align-items: center;
      gap: 8rpx;
      background: #fbfbfb;
      padding: 8rpx 16rpx;
      border-radius: 30rpx;
      border: 1rpx solid #f0f0f0;
      flex-shrink: 1;
      max-width: 240rpx;
      overflow: hidden;

      .label {
        font-size: 20rpx;
        color: #bbbbbb;
        white-space: nowrap;
      }

      .value {
        font-size: 24rpx;
        font-weight: 700;
        color: #333;
        font-family: 'DIN Alternate', sans-serif;
        white-space: nowrap;
      }

      .icon-copy {
        font-size: 24rpx;
        color: $uni-color-primary;
        flex-shrink: 0;
      }
    }
  }

  .slider-container {
    background: #ffffff;
    border: 1rpx solid #f6f6f6;
    border-radius: 20rpx;
    padding: 32rpx 24rpx;
    margin-bottom: 32rpx;
    position: relative;

    .slider-labels {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16rpx;

      .label-item {
        display: flex;
        flex-direction: column;
        flex: 1;

        .role {
          font-size: 22rpx;
          color: #999;
          margin-bottom: 4rpx;
          white-space: nowrap;
        }

        .percent {
          font-size: 40rpx;
          font-weight: 800;
          color: #333;
          font-family: 'DIN Alternate', sans-serif;
        }

        &.text-right {
          text-align: right;

          .percent {
            color: $uni-color-primary;
          }
        }
      }
    }

    .slider-wrapper {
      padding: 12rpx 0;
      
      :deep(slider) {
        margin: 0;
      }
    }

    .slider-tips {
      display: flex;
      align-items: flex-start;
      gap: 12rpx;
      margin-top: 24rpx;
      padding: 16rpx 20rpx;
      background: #fffbe6;
      border-radius: 12rpx;
      
      .icon-info {
        font-size: 24rpx;
        color: #faad14;
        margin-top: 4rpx;
      }

      text {
        font-size: 22rpx;
        color: #d48806;
        line-height: 1.5;
        font-weight: 400;
      }
    }
  }

  .profit-actions {
    display: flex;
    align-items: center;
    border-top: 1rpx solid #f8f8f8;
    padding-top: 32rpx;

    .action-item {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12rpx;
      
      .iconfont {
        font-size: 34rpx;
        color: #444;
      }

      text {
        font-size: 28rpx;
        color: #333;
        font-weight: 600;
        white-space: nowrap;
      }

      &:active {
        opacity: 0.6;
        background: #fcfcfc;
      }
    }

    .divider {
      width: 1rpx;
      height: 32rpx;
      background: #f0f0f0;
    }
  }
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
    padding: 36rpx 0;
    border-bottom: 1rpx solid #fafafa;

    &:last-child {
      border-bottom: none;
    }

    .cell-left {
      display: flex;
      align-items: center;

      .cell-icon {
        font-size: 40rpx;
        margin-right: 28rpx;
      }

      .cell-label {
        font-size: 30rpx;
        font-weight: 500;
        color: #333;
      }
    }

    .iconfont.icon-right {
      font-size: 24rpx;
      color: #999;
      opacity: 0.4;
    }

    &:active {
      opacity: 0.6;
    }
  }
}

.safe-area {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
