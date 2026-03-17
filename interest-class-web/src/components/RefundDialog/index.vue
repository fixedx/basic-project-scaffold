<template>
  <!-- 退款申请弹窗 -->
  <wd-popup v-model="visible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0;">
    <view class="refund-dialog">
      <view class="refund-dialog__header">
        <text class="refund-dialog__title">申请退款</text>
        <text class="iconfont icon-close refund-dialog__close" @click="close"></text>
      </view>

      <!-- 退款金额信息 -->
      <view v-if="loading" class="refund-dialog__loading">
        <wd-loading />
        <text>计算退款金额中...</text>
      </view>
      <view v-else-if="refundInfo" class="refund-dialog__amount">
        <view class="refund-amount-item">
          <text class="refund-amount-label">课时进度</text>
          <text class="refund-amount-value">
            已上 {{ refundInfo.completed_lessons }} 课 / 共 {{ refundInfo.total_lessons }} 课
          </text>
        </view>
        <view class="refund-amount-item refund-amount-item--total">
          <text class="refund-amount-label">退款总额</text>
          <text class="refund-amount-value refund-amount-value--total">
            ¥{{ formatPrice(refundInfo.total_refund_amount) }}
          </text>
        </view>
        <view v-if="refundInfo.online_refund_amount > 0" class="refund-amount-item">
          <text class="refund-amount-label">线上退款</text>
          <text class="refund-amount-value">
            ¥{{ formatPrice(refundInfo.online_refund_amount) }}
            <text class="refund-amount-tip">（原路退回）</text>
          </text>
        </view>
        <view v-if="refundInfo.offline_refund_amount > 0" class="refund-amount-item">
          <text class="refund-amount-label">线下退款</text>
          <text class="refund-amount-value">
            ¥{{ formatPrice(refundInfo.offline_refund_amount) }}
            <text class="refund-amount-tip">（到店退回）</text>
          </text>
        </view>
        <view v-if="!refundInfo.refundable" class="refund-dialog__warning">
          <text class="iconfont icon-warning"></text>
          <text>课程已全部完成，无法退款</text>
        </view>
      </view>

      <!-- 退款原因 -->
      <view class="refund-dialog__reason">
        <view class="refund-reason-label">退款原因</view>
        <wd-textarea
          v-model="reason"
          placeholder="请输入退款原因"
          :maxlength="200"
          :show-word-limit="true"
          :auto-height="true"
        />
      </view>

      <!-- 操作按钮 -->
      <view class="refund-dialog__footer">
        <wd-button type="info" plain block custom-class="flex-1" @click="close">取消</wd-button>
        <wd-button
          type="warning"
          block
          custom-class="flex-1"
          :disabled="!refundInfo?.refundable || !reason.trim() || submitting"
          :loading="submitting"
          @click="handleSubmit"
        >
          确认申请
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>

<script setup lang="ts">
/**
 * RefundDialog - 退款申请弹窗公共组件
 *
 * 功能：
 * 1. 打开时自动调用后端获取退款金额信息
 * 2. 展示课时进度、退款总额、线上/线下退款明细
 * 3. 支持输入退款原因
 * 4. 提交退款申请
 *
 * 使用方式：
 * <RefundDialog ref="refundDialogRef" @success="onRefundSuccess" />
 * refundDialogRef.value?.open(orderId)
 */
import { ref } from 'vue'
import { orderApi, type RefundInfo } from '@/api/order'

interface Emits {
  (e: 'success'): void
}

const emit = defineEmits<Emits>()

// 弹窗状态
const visible = ref(false)
const loading = ref(false)
const submitting = ref(false)
const refundInfo = ref<RefundInfo | null>(null)
const reason = ref('')
const currentOrderId = ref('')

const formatPrice = (price: any) => {
  const num = Number(price) || 0
  return num.toFixed(2)
}

/**
 * 打开退款弹窗（由父组件调用）
 * @param orderId 订单ID
 */
const open = async (orderId: string) => {
  currentOrderId.value = orderId
  reason.value = ''
  refundInfo.value = null
  visible.value = true
  loading.value = true

  try {
    const detail = await orderApi.getDetail(orderId)
    refundInfo.value = detail.refund_info || null
  } catch (error: any) {
    uni.showToast({ title: error.message || '获取退款信息失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/** 关闭弹窗 */
const close = () => {
  visible.value = false
}

/** 提交退款申请 */
const handleSubmit = async () => {
  if (!reason.value.trim()) {
    uni.showToast({ title: '请输入退款原因', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await orderApi.applyRefund(currentOrderId.value, { refund_reason: reason.value })
    visible.value = false
    uni.showToast({ title: '申请已提交', icon: 'success' })
    emit('success')
  } catch (error: any) {
    uni.showToast({ title: error.message || '申请失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

// 暴露 open 方法给父组件
defineExpose({ open })
</script>

<style lang="scss" scoped>
.refund-dialog {
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32rpx;
  }

  &__title {
    font-size: 34rpx;
    font-weight: bold;
    color: $uni-text-color;
  }

  &__close {
    font-size: 36rpx;
    color: $uni-text-color-tertiary;
    padding: 8rpx;
  }

  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
    padding: 48rpx 0;
    color: $uni-text-color-tertiary;
    font-size: 26rpx;
  }

  &__amount {
    background-color: $uni-bg-color-grey;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 32rpx;
  }

  &__warning {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-top: 16rpx;
    padding: 16rpx;
    border-radius: 8rpx;
    background-color: rgba(245, 34, 45, 0.06);
    color: $uni-color-error;
    font-size: 26rpx;

    .iconfont {
      font-size: 28rpx;
    }
  }

  &__reason {
    margin-bottom: 32rpx;
  }

  &__footer {
    display: flex;
    gap: 24rpx;
  }
}

.refund-amount-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;

  &:not(:last-child) {
    border-bottom: 1rpx solid $uni-border-color-light;
  }

  &--total {
    padding: 16rpx 0;
  }
}

.refund-amount-label {
  font-size: 28rpx;
  color: $uni-text-color-secondary;
}

.refund-amount-value {
  font-size: 28rpx;
  color: $uni-text-color;

  &--total {
    font-size: 36rpx;
    font-weight: bold;
    color: $uni-color-error;
  }
}

.refund-amount-tip {
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
  margin-left: 4rpx;
}

.refund-reason-label {
  font-size: 28rpx;
  color: $uni-text-color;
  margin-bottom: 16rpx;
}
</style>
