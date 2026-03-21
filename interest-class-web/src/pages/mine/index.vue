<template>
  <view v-if="isReady" class="mine-page">
    <!-- 1. 顶部用户信息背景区域 -->
    <view class="header-section" :style="{ paddingTop: statusBarHeight + 'px' }">
      <!-- 胶囊按钮左侧的个人信息 -->
      <view class="compact-header" :style="{ height: navBarHeight + 'px' }">
        <view class="header-left" @click="handleUserInfo">
          <AsyncImage 
            v-if="userInfo.avatar"
            :url="userInfo.avatar"
            width="64rpx" 
            height="64rpx"
            mode="aspectFill"
            custom-class="avatar"
          />
          <AsyncImage 
            v-else
            url="/static/images/default-avatar.png"
            width="100rpx"
            height="100rpx"
            mode="aspectFill"
            custom-class="avatar"
          />
          <view class="user-meta">
            <text class="nickname">{{ userInfo.nickname || (getToken() ? '未设置昵称' : '点击登录') }}</text>
          </view>
        </view>
      </view>

      <!-- 数据统计栏（浮动感） -->
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
      <!-- 官方赚取/让利 核心控制面板 - 新风格 -->
      <view class="profit-box" v-if="userInfo.id && inviteCodeInfo">
        <view class="profit-main">
          <view class="profit-header">
            <view class="title-tip">推荐有礼</view>
            <view class="invite-code" @click="copyInviteCode">
              <text>邀请码 {{ inviteCodeInfo?.invite_code }}</text>
              <text class="iconfont icon-copy"></text>
            </view>
          </view>
          
          <view class="distribution-area">
            <view class="dist-card mine" :class="{ 'dist-active': inviteCodeInfo?.share_ratio < 50 }">
              <view class="dist-label">我赚收益</view>
              <view class="dist-value">
                <text class="num">{{ 100 - (inviteCodeInfo?.share_ratio || 0) }}</text>
                <text class="unit">%</text>
              </view>
            </view>
            <view class="dist-connector">
              <view class="dots"></view>
              <view class="iconfont icon-share"></view>
            </view>
            <view class="dist-card friend" :class="{ 'dist-active': inviteCodeInfo?.share_ratio >= 50 }">
              <view class="dist-label">友得优惠</view>
              <view class="dist-value">
                <text class="num">{{ inviteCodeInfo?.share_ratio || 0 }}</text>
                <text class="unit">%</text>
              </view>
            </view>
          </view>

          <!-- 分配机制说明 -->
          <view class="ratio-hint">
            <text class="iconfont icon-info"></text>
            <text class="hint-text">好友每报一节课，课程返现按此比例分配：左边是好友立减金额，右边是你的到账收益</text>
          </view>

          <view class="slider-box">
            <slider 
              :value="inviteCodeInfo?.share_ratio" 
              @changing="onRatioChanging"
              @change="onShareRatioChange"
              activeColor="#52c41a"
              backgroundColor="#f0f0f0"
              block-size="20"
              block-color="#52c41a"
              :step="1"
            />
          </view>
        </view>
        
        <view class="profit-footer">
          <view class="footer-btn" @click="goToPromo">
            <text class="iconfont icon-share"></text>
            <text>立即分享</text>
          </view>
          <view class="footer-btn secondary" @click="goToWallet">
            <text class="iconfont icon-money-rmb"></text>
            <text>收益详情</text>
          </view>
        </view>
      </view>

      <!-- 常用服务 -->
      <view class="section-card service-section">
        <view class="section-header">
          <text class="title">常用服务</text>
        </view>
        <view class="grid-services">
          <view class="grid-item" @click="goToOrders('all')">
            <view class="grid-icon-wrap" style="background: rgba(82, 196, 26, 0.1);">
              <text class="iconfont icon-order" style="color: #52c41a;"></text>
            </view>
            <text class="grid-label">我的订单</text>
          </view>
          <view class="grid-item" @click="goToBookings">
            <view class="grid-icon-wrap" style="background: rgba(89, 126, 247, 0.1);">
              <text class="iconfont icon-calendar" style="color: #597ef7;"></text>
            </view>
            <text class="grid-label">我的预约</text>
          </view>
          <view class="grid-item" @click="goToChildren">
            <view class="grid-icon-wrap" style="background: rgba(255, 122, 69, 0.1);">
              <text class="iconfont icon-smile" style="color: #ff7a45;"></text>
            </view>
            <text class="grid-label">宝贝管理</text>
          </view>
          <view class="grid-item" @click="goToWallet">
            <view class="grid-icon-wrap" style="background: rgba(255, 197, 61, 0.1);">
              <text class="iconfont icon-money-wallet" style="color: #ffc53d;"></text>
            </view>
            <text class="grid-label">我的钱包</text>
          </view>
          <view class="grid-item" @click="goToFavorites">
            <view class="grid-icon-wrap" style="background: rgba(245, 34, 45, 0.1);">
              <text class="iconfont icon-favorites" style="color: #f5222d;"></text>
            </view>
            <text class="grid-label">我的收藏</text>
          </view>
          <view class="grid-item" @click="openFeedback">
            <view class="grid-icon-wrap" style="background: rgba(19, 194, 194, 0.1);">
              <text class="iconfont icon-edit" style="color: #13c2c2;"></text>
            </view>
            <text class="grid-label">意见反馈</text>
          </view>
          <view class="grid-item" @click="goToCashbackGuide">
            <view class="grid-icon-wrap" style="background: rgba(250, 140, 22, 0.1);">
              <text class="iconfont icon-money-red-packet" style="color: #fa8c16;"></text>
            </view>
            <text class="grid-label">返现攻略</text>
          </view>
          <view class="grid-item" @click="goToHelp">
            <view class="grid-icon-wrap" style="background: rgba(115, 209, 61, 0.1);">
              <text class="iconfont icon-help" style="color: #73d13d;"></text>
            </view>
            <text class="grid-label">使用帮助</text>
          </view>
          <view class="grid-item" @click="goToSettings">
            <view class="grid-icon-wrap" style="background: rgba(102, 102, 102, 0.1);">
              <text class="iconfont icon-settings" style="color: #666;"></text>
            </view>
            <text class="grid-label">系统设置</text>
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
import { onShow, onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { getShareContent, getTimelineContent } from '@/utils/share'
import { authApi } from '@/api/auth'
import { childApi } from '@/api/child'
import { inviteApi } from '@/api/invite'
import { orderApi } from '@/api/order'
import { getToken } from '@/utils/auth'
import { useUserStore } from '@/stores/user'
import AsyncImage from '@/components/AsyncImage/index.vue'
import CustomTabbar from '@/components/CustomTabbar/index.vue'
import FeedbackDialog from '@/components/FeedbackDialog/index.vue'
import { useAuthGuard } from '@/composables/useAuthGuard'

const { isReady } = useAuthGuard()
const userStore = useUserStore()
const userInfo = ref<any>({})
const inviteCodeInfo = ref<any>(null)
const savedShareRatio = ref<number | null>(null) // 记录服务器端已保存的让利比例，用于正确触发保存

// ⚠️ 必须在页面 <script setup> 中直接调用，不能放在 composable 里
// uni-app 编译器扫描本文件来决定是否把 onShareAppMessage 写进 Page({})，
// 在 composable 内部调用时编译器感知不到，导致微信菜单项灰色
onShareAppMessage(() => getShareContent(inviteCodeInfo.value?.invite_code))
onShareTimeline(() => getTimelineContent(inviteCodeInfo.value?.invite_code))
const income = ref(0)
const totalHours = ref(0) 
const childCount = ref(0)
const statusBarHeight = ref(0)
const navBarHeight = ref(44)
const orderCount = ref({
  pendingConfirm: 0,
  unpaid: 0,
  confirmed: 0,
  refund: 0
})

onLoad(() => {
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0
  
  // #ifdef MP-WEIXIN
  const menuButton = uni.getMenuButtonBoundingClientRect()
  navBarHeight.value = (menuButton.top - statusBarHeight.value) * 2 + menuButton.height
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
    savedShareRatio.value = inviteCodeInfo.value?.share_ratio ?? null
  } catch (error) {
    console.error('获取邀请码失败:', error)
  }
}

/**
 * 获取课时资产（进行中订单的剩余课时总和，兼容历史 refund_rejected）
 */
const loadCourseHours = async () => {
  if (!getToken()) return
  try {
    const res = await orderApi.getMyList({ page: 1, pageSize: 100, status: 'confirmed,refund_rejected' })
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
      orderApi.getMyList({ page: 1, pageSize: 1, status: 'confirmed,refund_rejected' }),
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
  uni.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] })
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
 * 更新让利比例时的实时预览
 */
const onRatioChanging = (e: any) => {
  if (inviteCodeInfo.value) {
    inviteCodeInfo.value.share_ratio = e.detail.value;
  }
}

/**
 * 更新让利比例
 */
const onShareRatioChange = async (e: any) => {
  const value = e.detail.value
  // 与服务器已保存的值对比，而非实时展示值（实时展示值已被 onRatioChanging 修改过）
  if (savedShareRatio.value !== null && value === savedShareRatio.value) return
  
  uni.showLoading({ title: '更新中...' })
  try {
    await inviteApi.setShareRatio(value)
    savedShareRatio.value = value // 更新已保存值
    inviteCodeInfo.value.share_ratio = value
    uni.showToast({ title: '设置已生效', icon: 'success' })
  } catch (error) {
    console.error('更新让利比例失败:', error)
    // 保存失败时回滚展示值
    if (savedShareRatio.value !== null) {
      inviteCodeInfo.value.share_ratio = savedShareRatio.value
    }
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
  background: linear-gradient(180deg, $uni-color-primary-lighter 0%, #f8f8f8 100%);
  padding: 0 32rpx 32rpx;

  .compact-header {
    display: flex;
    align-items: center;
    justify-content: flex-start; /* 强制左对齐 */
    width: 100%;
    box-sizing: border-box;
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 16rpx;
      max-width: 400rpx; /* 限制宽度，防止钻入右侧胶囊按钮区域 */

      .user-meta {
        display: flex;
        flex-direction: column;
        overflow: hidden; /* 防止文字溢出 */

        .nickname {
          font-size: 30rpx;
          font-weight: 600;
          color: #333;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis; /* 文字过长显示省略号 */
        }

        .vip-badge {
          display: flex;
          align-items: center;
          margin-top: 4rpx;
          .iconfont {
            font-size: 24rpx;
            color: #faad14;
          }
        }
      }
    }
  }

  .stats-card {
    display: flex;
    background: #fff;
    border-radius: 24rpx;
    padding: 32rpx 0;
    margin-top: 40rpx;
    box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.03);

    .stat-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      
      .num-wrap {
        margin-bottom: 8rpx;
        display: flex;
        align-items: baseline;
        .num { font-size: 36rpx; font-weight: bold; color: #333; font-family: 'DIN Alternate', sans-serif; }
        .unit { font-size: 20rpx; color: #999; margin-left: 2rpx; }
      }

      .label { font-size: 24rpx; color: #999; }

      &:not(:last-child) { border-right: 1rpx solid #f5f5f5; }
    }
  }
}

.content-body {
  padding: 0 32rpx;
}

.profit-box {
  background: #fff;
  border-radius: 32rpx;
  overflow: hidden;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.02);

  .profit-main {
    padding: 32rpx;
    background: linear-gradient(135deg, #ffffff 0%, #f6ffed 100%);

    .profit-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40rpx;

      .title-tip {
        background: $uni-color-primary;
        color: #fff;
        font-size: 20rpx;
        padding: 4rpx 12rpx;
        border-radius: 8rpx;
        font-weight: 500;
      }

      .invite-code {
        display: flex;
        align-items: center;
        gap: 8rpx;
        font-size: 24rpx;
        color: #999;
        background: rgba(255, 255, 255, 0.8);
        padding: 8rpx 20rpx;
        border-radius: 30rpx;
        border: 1rpx solid #f0f0f0;
        .iconfont { font-size: 24rpx; color: $uni-color-primary; }
      }
    }

    .distribution-area {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20rpx;
      margin-bottom: 40rpx;

      .dist-card {
        width: 180rpx;
        height: 130rpx;
        background: #fff;
        border-radius: 20rpx;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 2rpx solid #eee;
        transition: all 0.3s;
        
        &.dist-active {
          border-color: $uni-color-primary;
          box-shadow: 0 8rpx 20rpx rgba(82, 196, 26, 0.1);
          transform: translateY(-4rpx);
          .dist-label { color: $uni-color-primary; font-weight: 600; }
          .dist-value .num { color: $uni-color-primary; }
        }

        .dist-label { font-size: 22rpx; color: #999; margin-bottom: 8rpx; }
        .dist-value {
          display: flex;
          align-items: baseline;
          .num { font-size: 36rpx; font-weight: bold; color: #333; }
          .unit { font-size: 18rpx; color: #999; margin-left: 2rpx; }
        }
      }

      .dist-connector {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8rpx;
        .dots { width: 40rpx; height: 2rpx; background-color: #eee; }
        .iconfont { font-size: 28rpx; color: #ccc; }
      }
    }

    .slider-box {
      .slider-marks {
        display: flex;
        justify-content: space-between;
        margin-top: 10rpx;
        padding: 0 10rpx;
        text { font-size: 20rpx; color: #ccc; }
      }
    }

    .ratio-hint {
      display: flex;
      align-items: flex-start;
      gap: 10rpx;
      background: rgba(82, 196, 26, 0.08);
      border-radius: 12rpx;
      padding: 16rpx 20rpx;
      margin-bottom: 24rpx;

      .iconfont {
        font-size: 24rpx;
        color: $uni-color-primary;
        flex-shrink: 0;
        margin-top: 2rpx;
      }

      .hint-text {
        font-size: 22rpx;
        color: #52873a;
        line-height: 1.6;
      }
    }
  }

  .profit-footer {
    display: flex;
    border-top: 1rpx solid #f0f0f0;
    .footer-btn {
      flex: 1;
      height: 88rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12rpx;
      font-size: 28rpx;
      color: $uni-color-primary;
      font-weight: 500;
      &.secondary { color: #666; border-left: 1rpx solid #f0f0f0; }
      &:active { background: #fafafa; }
    }
  }
}

.section-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;

  .section-header {
    margin-bottom: 32rpx;
    .title { font-size: 30rpx; font-weight: 600; color: #333; }
  }
}

.grid-services {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32rpx 0;
  .grid-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12rpx;
    .grid-icon-wrap {
      width: 84rpx;
      height: 84rpx;
      border-radius: 24rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      .iconfont { font-size: 40rpx; }
    }
    .grid-label { font-size: 24rpx; color: #666; }
    &:active { opacity: 0.7; }
  }
}

.safe-area {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

</style>
