<template>
  <view class="page">
    <!-- 加载状态 -->
    <view class="loading-state" v-if="loading">
      <Loading text="加载中..." />
    </view>

    <!-- 订单过期状态 -->
    <view class="expire-state" v-else-if="isExpired">
      <view class="expire-icon">
        <text class="iconfont icon-warning" style="font-size: 160rpx; color: #faad14;"></text>
      </view>
      <text class="expire-title">订单已过期</text>
      <text class="expire-desc">该订单支付时间已过期，请重新下单</text>
      <wd-button type="primary" @click="goBack">返回</wd-button>
    </view>

    <!-- 支付内容 -->
    <view class="pay-container" v-else-if="order">
      <!-- 倒计时卡片 -->
      <view class="countdown-card">
        <view class="countdown-header">
          <text class="iconfont icon-time"></text>
          <text class="countdown-title">支付剩余时间</text>
        </view>
        <view class="countdown-time">
          <text class="time-number">{{ countdownMinutes }}</text>
          <text class="time-separator">:</text>
          <text class="time-number">{{ countdownSeconds }}</text>
        </view>
        <text class="countdown-tip">请在规定时间内完成支付，超时订单将自动取消</text>
      </view>

      <!-- 订单信息 -->
      <view class="order-card">
        <view class="card-title">订单信息</view>
        <view class="order-info">
          <view class="info-row">
            <text class="label">订单号</text>
            <text class="value">{{ order.order_no }}</text>
          </view>
          <view class="info-row">
            <text class="label">课程名称</text>
            <text class="value">{{ order.course_name }}</text>
          </view>
          <view class="info-row">
            <text class="label">套餐</text>
            <text class="value">{{ order.sku_name }}</text>
          </view>
          <view class="info-row">
            <text class="label">数量</text>
            <text class="value">x{{ order.quantity }}</text>
          </view>
        </view>
      </view>

      <!-- 学员信息 -->
      <view class="order-card" v-if="order.student_name">
        <view class="card-title">学员信息</view>
        <view class="order-info">
          <view class="info-row">
            <text class="label">学员姓名</text>
            <text class="value">{{ order.student_name }}</text>
          </view>
          <view class="info-row" v-if="order.student_phone">
            <text class="label">联系电话</text>
            <text class="value">{{ order.student_phone }}</text>
          </view>
        </view>
      </view>

      <!-- 价格信息 -->
      <view class="price-card">
        <view class="price-row" v-if="order.discount_amount > 0">
          <text class="price-label">商品金额</text>
          <text class="price-value">¥{{ order.original_price }}</text>
        </view>
        <view class="price-row" v-if="order.discount_amount > 0">
          <text class="price-label">优惠金额</text>
          <text class="price-value discount">-¥{{ order.discount_amount }}</text>
        </view>
        <view class="price-row">
          <text class="price-label">订单总额</text>
          <text class="price-value">¥{{ order.paid_amount }}</text>
        </view>
        <!-- 线上/线下支付金额 -->
        <view class="price-divider"></view>
        <view class="price-row">
          <text class="price-label">
            <text class="iconfont icon-wechat" style="color: #07c160; margin-right: 8rpx;"></text>
            线上支付（微信）
          </text>
          <text class="price-value amount">¥{{ order.online_pay_amount || 0 }}</text>
        </view>
        <view class="price-row" v-if="order.offline_pay_amount > 0">
          <text class="price-label">
            <text class="iconfont icon-store" style="color: #faad14; margin-right: 8rpx;"></text>
            线下支付（到店）
          </text>
          <text class="price-value offline">¥{{ order.offline_pay_amount }}</text>
        </view>
      </view>

      <!-- 支付方式 -->
      <view class="payment-method">
        <view class="method-title">支付方式</view>
        <view class="method-list">
          <view 
            class="method-item active"
          >
            <text class="iconfont icon-wechat" style="color: #07c160;"></text>
            <text class="method-name">微信支付</text>
            <text class="iconfont icon-check"></text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <EmptyState 
      v-else-if="!loading" 
      icon="icon-order" 
      text="订单不存在" 
    />

    <!-- 底部支付栏 -->
    <PageFooter v-if="order && !isExpired">
      <view class="footer-content">
        <view class="footer-price">
          <text class="price-label">微信支付：</text>
          <text class="price-value">¥{{ order.online_pay_amount || order.paid_amount }}</text>
        </view>
        <wd-button 
          type="primary" 
          size="large"
          custom-class="pay-btn"
          :loading="paying"
          @click="handlePay"
        >
          立即支付
        </wd-button>
      </view>
    </PageFooter>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { orderApi, type Order } from '@/api/order'
import { paymentApi } from '@/api/payment'
import { showErrorToast, showSuccessToast } from '@/utils/toast'
import Loading from '@/components/Loading/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'

const orderId = ref('')
const order = ref<Order | null>(null)
const loading = ref(false)
const paying = ref(false)
const paymentMethod = ref<'wechat' | 'offline'>('wechat')

// 倒计时
const remainingSeconds = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

// 是否过期
const isExpired = computed(() => {
  return remainingSeconds.value <= 0 && order.value?.status === 'pending'
})

// 倒计时分钟
const countdownMinutes = computed(() => {
  return String(Math.floor(remainingSeconds.value / 60)).padStart(2, '0')
})

// 倒计时秒数
const countdownSeconds = computed(() => {
  return String(remainingSeconds.value % 60).padStart(2, '0')
})

onLoad((options: any) => {
  if (options.id) {
    orderId.value = options.id
  }
})

onMounted(() => {
  loadOrderDetail()
})

onUnmounted(() => {
  // 清理倒计时
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})

// 加载订单详情
const loadOrderDetail = async () => {
  if (!orderId.value) {
    showErrorToast('缺少订单ID')
    return
  }

  loading.value = true
  try {
    // 获取订单详情
    order.value = await orderApi.getDetail(orderId.value)
    
    // 如果订单已支付，跳转到订单详情
    if (order.value.status !== 'pending') {
      uni.redirectTo({
        url: `/pages/order-detail/index?id=${orderId.value}`,
      })
      return
    }

    // 设置支付方式
    if (order.value.payment_method) {
      paymentMethod.value = order.value.payment_method === 'offline' ? 'offline' : 'wechat'
    }

    // 获取支付状态（包含剩余时间）
    const status = await paymentApi.queryStatus(orderId.value)
    if (status.remainingSeconds !== undefined) {
      remainingSeconds.value = status.remainingSeconds
      startCountdown()
    }
  } catch (error: any) {
    showErrorToast(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// 开始倒计时
const startCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
  
  countdownTimer = setInterval(() => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value--
    } else {
      if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }
  }, 1000)
}

// 处理支付
const handlePay = async () => {
  // 防抖：如果正在支付中，直接返回
  if (paying.value) {
    console.warn('支付中，请勿重复点击')
    return
  }
  
  if (!order.value) return

  if (isExpired.value) {
    showErrorToast('订单已过期，请重新下单')
    return
  }

  paying.value = true
  try {
    // 微信支付
    await callWechatPay()
  } catch (error: any) {
    showErrorToast(error.message || '支付失败')
  } finally {
    paying.value = false
  }
}

// 调用微信支付
const callWechatPay = async () => {
  try {
    // 获取预支付参数
    const prepayResult = await paymentApi.prepay({
      order_id: orderId.value,
    })

    // 调用微信支付
    // #ifdef MP-WEIXIN
    await new Promise<void>((resolve, reject) => {
      uni.requestPayment({
        provider: 'wxpay',
        timeStamp: prepayResult.timeStamp,
        nonceStr: prepayResult.nonceStr,
        package: prepayResult.package,
        signType: prepayResult.signType,
        paySign: prepayResult.paySign,
        success: () => {
          resolve()
        },
        fail: (err) => {
          if (err.errMsg?.includes('cancel')) {
            reject(new Error('取消支付'))
          } else {
            reject(new Error('支付失败'))
          }
        },
      })
    })
    // #endif

    // #ifdef H5
    // H5 环境提示
    uni.showModal({
      title: '提示',
      content: '微信支付仅支持小程序环境，请在小程序中完成支付',
      showCancel: false,
    })
    return
    // #endif

    // 支付成功
    showSuccessToast('支付成功')
    
    // 跳转到订单详情
    setTimeout(() => {
      uni.redirectTo({
        url: `/pages/order-detail/index?id=${orderId.value}`,
      })
    }, 1500)
  } catch (error: any) {
    throw error
  }
}

// 返回
const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.redirectTo({
        url: '/pages/my-orders/index',
      })
    },
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.expire-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 64rpx;
  
  .expire-icon {
    margin-bottom: 32rpx;
  }
  
  .expire-title {
    font-size: 36rpx;
    font-weight: bold;
    color: $uni-text-color;
    margin-bottom: 16rpx;
  }
  
  .expire-desc {
    font-size: 28rpx;
    color: $uni-text-color-secondary;
    margin-bottom: 48rpx;
    text-align: center;
  }
}

.pay-container {
  padding: 24rpx 32rpx 200rpx;
}

// 倒计时卡片
.countdown-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx;
  background: linear-gradient(135deg, $uni-color-primary 0%, $uni-color-primary-dark 100%);
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  
  .countdown-header {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 24rpx;
    
    .iconfont {
      font-size: 36rpx;
      color: rgba(255, 255, 255, 0.9);
    }
    
    .countdown-title {
      font-size: 28rpx;
      color: rgba(255, 255, 255, 0.9);
    }
  }
  
  .countdown-time {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 24rpx;
    
    .time-number {
      width: 100rpx;
      height: 100rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 16rpx;
      font-size: 56rpx;
      font-weight: bold;
      color: #fff;
    }
    
    .time-separator {
      font-size: 48rpx;
      font-weight: bold;
      color: #fff;
    }
  }
  
  .countdown-tip {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.7);
  }
}

// 订单卡片
.order-card {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  
  .card-title {
    font-size: 30rpx;
    font-weight: bold;
    color: $uni-text-color;
    margin-bottom: 24rpx;
  }
  
  .order-info {
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16rpx 0;
      
      &:not(:last-child) {
        border-bottom: 1rpx solid $uni-border-color-light;
      }
      
      .label {
        font-size: 28rpx;
        color: $uni-text-color-secondary;
        flex-shrink: 0;
      }
      
      .value {
        font-size: 28rpx;
        color: $uni-text-color;
        text-align: right;
        margin-left: 24rpx;
      }
    }
  }
}

// 价格卡片
.price-card {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  
  .price-divider {
    height: 1rpx;
    background-color: $uni-border-color-light;
    margin: 20rpx 0;
  }
  
  .price-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12rpx 0;
    
    .price-label {
      font-size: 28rpx;
      color: $uni-text-color-secondary;
      display: flex;
      align-items: center;
    }
    
    .price-value {
      font-size: 28rpx;
      color: $uni-text-color;
      
      &.discount {
        color: $uni-color-success;
      }
      
      &.amount {
        font-size: 36rpx;
        font-weight: bold;
        color: $uni-color-error;
      }
      
      &.offline {
        font-size: 32rpx;
        font-weight: bold;
        color: $uni-text-color;
      }
    }
    
    &.total {
      padding-top: 24rpx;
      margin-top: 12rpx;
      border-top: 1rpx solid $uni-border-color-light;
    }
  }
}

// 支付方式
.payment-method {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 32rpx;
  
  .method-title {
    font-size: 30rpx;
    font-weight: bold;
    color: $uni-text-color;
    margin-bottom: 24rpx;
  }
  
  .method-list {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }
  
  .method-item {
    display: flex;
    align-items: center;
    padding: 24rpx;
    background-color: $uni-bg-color-grey;
    border-radius: 12rpx;
    border: 2rpx solid transparent;
    transition: all 0.3s;
    
    &.active {
      background-color: $uni-color-primary-lighter;
      border-color: $uni-color-primary;
    }
    
    .iconfont {
      font-size: 48rpx;
      margin-right: 20rpx;
    }
    
    .method-name {
      flex: 1;
      font-size: 30rpx;
      color: $uni-text-color;
    }
    
    .icon-check {
      font-size: 36rpx;
      color: $uni-color-primary;
    }
  }
}

// 底部支付栏
.footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  
  .footer-price {
    display: flex;
    align-items: baseline;
    
    .price-label {
      font-size: 28rpx;
      color: $uni-text-color-secondary;
    }
    
    .price-value {
      font-size: 44rpx;
      font-weight: bold;
      color: $uni-color-error;
    }
  }
  
  :deep(.pay-btn) {
    min-width: 280rpx;
  }
}
</style>
