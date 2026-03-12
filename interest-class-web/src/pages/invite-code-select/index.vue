<template>
  <view class="page">
    <!-- 课程信息 -->
    <view class="course-info">
      <view class="course-info__title">{{ courseName }}</view>
      <view class="course-info__price">
        <text class="price-label">订单金额：</text>
        <text class="price-value">¥{{ orderAmount }}</text>
      </view>
      <view class="course-info__ratio">
        <text class="ratio-label">返现比例：</text>
        <text class="ratio-value">{{ cashbackRatio }}%</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <wd-loading />
      <text class="loading-text">加载邀请码中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="!inviteCodes.length" class="empty-container">
      <text class="iconfont icon-empty"></text>
      <text class="empty-text">暂无可用的邀请码</text>
      <text class="empty-tip">您可以手动输入邀请码</text>
    </view>

    <!-- 邀请码列表 -->
    <view v-else class="invite-list">
      <view class="list-title">
        <text class="iconfont icon-gift"></text>
        <text>可用邀请码（按立减金额排序）</text>
      </view>
      
      <view 
        v-for="(item, index) in inviteCodes" 
        :key="item.invite_code"
        class="invite-item"
        :class="{ 'invite-item--selected': selectedCode === item.invite_code }"
        @click="handleSelect(item)"
      >
        <view class="invite-item__left">
          <view class="invite-code">
            <text class="code-text">{{ item.invite_code }}</text>
            <view v-if="index === 0" class="best-tag">最优</view>
          </view>
          <view class="share-ratio">
            <text>让利比例：{{ item.share_ratio }}%</text>
          </view>
        </view>
        
        <view class="invite-item__right">
          <view class="discount-amount">
            <text class="discount-label">立减</text>
            <text class="discount-value">¥{{ item.discount_amount.toFixed(2) }}</text>
          </view>
          <view v-if="item.inviter_cashback > 0" class="cashback-amount">
            <text class="cashback-tip">邀请人获 ¥{{ item.inviter_cashback.toFixed(2) }}</text>
          </view>
        </view>
        
        <view class="invite-item__check">
          <text 
            class="iconfont" 
            :class="selectedCode === item.invite_code ? 'icon-check-circle-fill' : 'icon-circle'"
          ></text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="footer">
      <view v-if="selectedCode" class="footer-info">
        <text>已选：{{ selectedCode }}</text>
        <text class="footer-discount">立减 ¥{{ selectedDiscount.toFixed(2) }}</text>
      </view>
      <wd-button 
        type="primary" 
        block 
        :disabled="!selectedCode" 
        @click="handleConfirm"
      >
        确认选择
      </wd-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { inviteApi, type AvailableInviteCode } from '@/api/invite'
import { showErrorToast } from '@/utils/toast'

// 页面参数
const courseId = ref('')
const courseName = ref('')
const orderAmount = ref(0)
const cashbackRatio = ref(0)

// 状态
const loading = ref(false)
const inviteCodes = ref<AvailableInviteCode[]>([])
const selectedCode = ref('')
const selectedDiscount = ref(0)

onLoad((options) => {
  if (options?.courseId) {
    courseId.value = options.courseId
  }
  if (options?.courseName) {
    courseName.value = decodeURIComponent(options.courseName)
  }
  if (options?.orderAmount) {
    orderAmount.value = Number(options.orderAmount)
  }
  if (options?.cashbackRatio) {
    cashbackRatio.value = Number(options.cashbackRatio)
  }
})

onMounted(() => {
  loadInviteCodes()
})

// 加载可用邀请码列表
const loadInviteCodes = async () => {
  if (!orderAmount.value || !cashbackRatio.value) {
    return
  }
  
  loading.value = true
  try {
    const data = await inviteApi.getAvailableInviteCodes(
      orderAmount.value,
      cashbackRatio.value
    )
    inviteCodes.value = data
    
    // 自动选中第一个（最优惠）
    if (data.length > 0) {
      selectedCode.value = data[0].invite_code
      selectedDiscount.value = data[0].discount_amount
    }
  } catch (error: any) {
    console.error('加载邀请码失败:', error)
    showErrorToast(error.message || '加载邀请码失败')
  } finally {
    loading.value = false
  }
}

// 选择邀请码
const handleSelect = (item: AvailableInviteCode) => {
  selectedCode.value = item.invite_code
  selectedDiscount.value = item.discount_amount
}

// 确认选择
const handleConfirm = () => {
  if (!selectedCode.value) {
    showErrorToast('请选择邀请码')
    return
  }
  
  // 获取事件总线，将选中的邀请码传回上一页
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const eventChannel = currentPage?.getOpenerEventChannel?.()
  if (eventChannel) {
    eventChannel.emit('selectInviteCode', {
      inviteCode: selectedCode.value,
      discountAmount: selectedDiscount.value,
    })
  }
  
  // 返回上一页
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  padding-bottom: 140rpx;
}

.course-info {
  background-color: $uni-bg-color;
  padding: 32rpx;
  margin-bottom: 24rpx;

  &__title {
    font-size: 32rpx;
    font-weight: bold;
    color: $uni-text-color;
    margin-bottom: 16rpx;
    line-height: 1.4;
  }

  &__price,
  &__ratio {
    display: flex;
    align-items: center;
    margin-top: 8rpx;
    font-size: 28rpx;
  }

  .price-label,
  .ratio-label {
    color: $uni-text-color-secondary;
  }

  .price-value {
    color: $uni-color-error;
    font-weight: bold;
  }

  .ratio-value {
    color: $uni-color-primary;
    font-weight: bold;
  }
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;

  .loading-text,
  .empty-text {
    margin-top: 24rpx;
    font-size: 28rpx;
    color: $uni-text-color-secondary;
  }

  .empty-tip {
    margin-top: 8rpx;
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
  }

  .iconfont {
    font-size: 120rpx;
    color: $uni-text-color-disable;
  }
}

.invite-list {
  padding: 0 24rpx;

  .list-title {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 28rpx;
    color: $uni-text-color-secondary;
    padding: 16rpx 0;

    .iconfont {
      font-size: 32rpx;
      color: $uni-color-primary;
    }
  }
}

.invite-item {
  display: flex;
  align-items: center;
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;

  &--selected {
    border-color: $uni-color-primary;
    background-color: $uni-color-primary-lighter;
  }

  &__left {
    flex: 1;

    .invite-code {
      display: flex;
      align-items: center;
      gap: 12rpx;

      .code-text {
        font-size: 32rpx;
        font-weight: bold;
        color: $uni-text-color;
        font-family: monospace;
      }

      .best-tag {
        font-size: 20rpx;
        color: $uni-bg-color;
        background: linear-gradient(135deg, $uni-color-primary, $uni-color-primary-light);
        padding: 4rpx 12rpx;
        border-radius: 16rpx;
      }
    }

    .share-ratio {
      margin-top: 8rpx;
      font-size: 24rpx;
      color: $uni-text-color-tertiary;
    }
  }

  &__right {
    text-align: right;
    margin-right: 16rpx;

    .discount-amount {
      display: flex;
      align-items: baseline;
      gap: 4rpx;

      .discount-label {
        font-size: 24rpx;
        color: $uni-color-error;
      }

      .discount-value {
        font-size: 36rpx;
        font-weight: bold;
        color: $uni-color-error;
      }
    }

    .cashback-amount {
      margin-top: 4rpx;

      .cashback-tip {
        font-size: 22rpx;
        color: $uni-text-color-tertiary;
      }
    }
  }

  &__check {
    .iconfont {
      font-size: 44rpx;
      color: $uni-text-color-disable;
    }

    .icon-check-circle-fill {
      color: $uni-color-primary;
    }
  }
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: $uni-bg-color;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.05);

  .footer-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
    font-size: 26rpx;
    color: $uni-text-color-secondary;

    .footer-discount {
      color: $uni-color-error;
      font-weight: bold;
    }
  }
}
</style>
