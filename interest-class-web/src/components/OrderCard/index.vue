<template>
  <view class="order-card" @click="handleClick">
    <!-- 订单头部 -->
    <view class="card-header">
      <view class="order-info">
        <text class="order-no">订单号：{{ order.order_no }}</text>
        <text class="course-name" @click.stop="handleCourseClick">
          {{ order.course_name }}
          <text class="iconfont icon-right"></text>
        </text>
      </view>
      <view class="status-badge" :class="statusClass">
        {{ statusLabel }}
      </view>
    </view>

    <!-- 订单内容 -->
    <view class="card-body">
      <view class="sku-info">
        <text class="sku-name">{{ order.sku_name }}</text>
        <text class="quantity">x{{ order.quantity }}</text>
      </view>
      
      <view class="info-row" v-if="role === 'institution' || role === 'admin'">
        <text class="label">学员：</text>
        <text class="value">{{ order.student_name || '未填写' }}</text>
      </view>
      
      <!-- 课时进度 - 只在确认/完成状态显示 -->
      <view class="progress-section" v-if="showProgress">
        <view class="progress-header">
          <text class="progress-label">上课进度</text>
          <text class="progress-value">{{ order.completed_lessons || 0 }}/{{ order.total_lessons || 0 }}课时</text>
        </view>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: `${progressPercent}%` }"></view>
        </view>
      </view>
      
      <view class="price-info">
        <view class="price-row">
          <text class="label">订单金额：</text>
          <text class="amount">¥{{ formatPrice(order.paid_amount) }}</text>
        </view>
        <view class="price-row" v-if="order.cashback_amount > 0">
          <text class="label">返现：</text>
          <text class="cashback">¥{{ formatPrice(order.cashback_amount) }}</text>
        </view>
        <view class="price-row" v-if="(role === 'admin' || role === 'institution') && (order.recognized_commission_amount ?? 0) > 0">
          <text class="label">已确认佣金：</text>
          <text class="commission">¥{{ formatPrice(order.recognized_commission_amount) }}</text>
        </view>
        <view class="price-row" v-else-if="(role === 'admin' || role === 'institution') && (order.commission_amount ?? 0) > 0">
          <text class="label">平台佣金：</text>
          <text class="commission">¥{{ formatPrice(order.commission_amount) }}</text>
        </view>
      </view>
    </view>

    <!-- 订单底部 -->
    <view class="card-footer">
      <text class="create-time">{{ formatTime(order.created_at) }}</text>
      <view class="actions" @click.stop>
        <!-- 家长端操作 -->
        <template v-if="role === 'parent'">
          <wd-button v-if="order.status === 'pending'" size="small" type="primary" @click="emit('action', 'pay', order)">
            立即支付
          </wd-button>
          <wd-button v-if="order.status === 'pending'" size="small" type="error" @click="emit('action', 'cancel', order)">
            取消订单
          </wd-button>
          <view v-if="order.status === 'pending_confirm'" class="status-tip">
            等待机构确认中...
          </view>
          <wd-button v-if="order.status === 'confirmed' || order.status === 'refund_rejected'" size="small" type="warning" @click="emit('action', 'refund', order)">
            申请退款
          </wd-button>
          <wd-button v-if="(order.status === 'confirmed' || order.status === 'completed') && !order.is_reviewed" size="small" type="primary" @click="emit('action', 'review', order)">
            评价
          </wd-button>
        </template>

        <!-- 机构端操作 -->
        <template v-if="role === 'institution'">
          <wd-button v-if="order.status === 'pending_confirm'" size="small" type="primary" @click="emit('action', 'confirm', order)">
            确认订单
          </wd-button>
          <template v-if="order.status === 'refund_pending'">
            <wd-button size="small" type="error" @click="emit('action', 'reject-refund', order)">
              拒绝退款
            </wd-button>
            <wd-button size="small" type="success" @click="emit('action', 'approve-refund', order)" custom-style="margin-left: 12rpx;">
              同意退款
            </wd-button>
          </template>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Order } from '@/api/order'

interface Props {
  order: Order
  role?: 'parent' | 'institution' | 'admin'
}

interface Emits {
  (e: 'click', order: Order): void
  (e: 'course-click', courseId: string): void
  (e: 'action', action: string, order: Order): void
}

const props = withDefaults(defineProps<Props>(), {
  role: 'parent',
})

const emit = defineEmits<Emits>()

// 状态配置
const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: '待支付', class: 'status-pending' },
  pending_confirm: { label: '待确认', class: 'status-pending-confirm' },
  confirmed: { label: '已确认', class: 'status-confirmed' },
  refund_pending: { label: '退款审批中', class: 'status-refunding' },
  refunding: { label: '退款中', class: 'status-refunding' },
  refund_rejected: { label: '退款被拒绝', class: 'status-refund-rejected' },
  refunded: { label: '退款成功', class: 'status-refunded' },
  cancelled: { label: '已取消', class: 'status-cancelled' },
  completed: { label: '已完成', class: 'status-completed' },
}

const statusLabel = computed(() => statusConfig[props.order.status]?.label || props.order.status)
const statusClass = computed(() => statusConfig[props.order.status]?.class || '')

// 是否显示进度条（确认或完成状态，且有课时信息）
const showProgress = computed(() => {
  const validStatus = ['confirmed', 'refund_rejected', 'completed'].includes(props.order.status)
  const hasLessons = props.order.total_lessons > 0
  return validStatus && hasLessons
})

// 进度百分比
const progressPercent = computed(() => {
  if (!props.order.total_lessons) return 0
  return Math.round((props.order.completed_lessons || 0) / props.order.total_lessons * 100)
})

const formatPrice = (price: any) => {
  const num = Number(price) || 0
  return num.toFixed(2)
}

const formatTime = (time: string) => {
  if (!time) return ''
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

const handleClick = () => {
  emit('click', props.order)
}

const handleCourseClick = () => {
  emit('course-click', props.order.course_id)
}
</script>

<style lang="scss" scoped>
.order-card {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.order-info {
  flex: 1;
  
  .order-no {
    display: block;
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
    margin-bottom: 8rpx;
    font-family: monospace;
  }
  
  .course-name {
    display: flex;
    align-items: center;
    font-size: 30rpx;
    font-weight: 600;
    color: $uni-text-color;
    
    .iconfont {
      font-size: 24rpx;
      color: $uni-text-color-tertiary;
      margin-left: 8rpx;
    }
  }
}

.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  font-weight: 500;
  
  &.status-pending {
    background-color: #fff7e6;
    color: #fa8c16;
  }
  
  &.status-pending-confirm {
    background-color: #e6f7ff;
    color: #1890ff;
  }
  
  &.status-confirmed {
    background-color: #f6ffed;
    color: #52c41a;
  }
  
  &.status-refunding {
    background-color: #fff1f0;
    color: #f5222d;
  }
  
  &.status-refund-rejected {
    background-color: #fff1f0;
    color: #cf1322;
  }
  
  &.status-refunded,
  &.status-cancelled {
    background-color: #f5f5f5;
    color: #999;
  }
  
  &.status-completed {
    background-color: #f6ffed;
    color: #389e0d;
  }
}

.card-body {
  margin-bottom: 24rpx;
}

.sku-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  
  .sku-name {
    font-size: 28rpx;
    color: #333;
    background-color: #f9f9f9;
    padding: 6rpx 16rpx;
    border-radius: 8rpx;
  }
  
  .quantity {
    font-size: 28rpx;
    color: $uni-text-color-secondary;
  }
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
  
  .label {
    font-size: 26rpx;
    color: $uni-text-color-tertiary;
  }
  
  .value {
    font-size: 26rpx;
    color: $uni-text-color;
  }
}

.progress-section {
  margin: 20rpx 0;
  
  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;
  }
  
  .progress-label {
    font-size: 24rpx;
    color: $uni-text-color-secondary;
  }
  
  .progress-value {
    font-size: 24rpx;
    color: #52c41a;
    font-weight: 500;
  }
  
  .progress-bar {
    height: 12rpx;
    background-color: #f5f5f5;
    border-radius: 100rpx;
    overflow: hidden;
    
    .progress-fill {
      height: 100%;
      background-color: #52c41a;
      border-radius: 100rpx;
      transition: width 0.3s ease;
    }
  }
}

.price-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  border-top: 1rpx solid #f5f5f5;
  padding-top: 20rpx;
  margin-top: 20rpx;

  .price-row {
    display: flex;
    align-items: baseline;
    margin-bottom: 8rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .label {
      font-size: 24rpx;
      color: $uni-text-color-secondary;
      margin-right: 8rpx;
    }
    
    .amount {
      font-size: 36rpx;
      font-weight: 700;
      color: $uni-text-color;
      font-family: DINAlternate-Bold, sans-serif;
    }
    
    .cashback {
      font-size: 28rpx;
      color: #f5222d;
      font-weight: 500;
      font-family: DINAlternate-Bold, sans-serif;
    }

    .commission {
      font-size: 28rpx;
      color: #1890ff;
      font-weight: 500;
      font-family: DINAlternate-Bold, sans-serif;
    }
  }
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 24rpx;
  border-top: 1rpx dashed #f0f0f0;
  
  .create-time {
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
  }
  
  .actions {
    display: flex;
    gap: 16rpx;

    :deep(.wd-button) {
      min-width: 140rpx;
    }
  }
}

.status-tip {
  font-size: 24rpx;
  color: #1890ff;
  background-color: #e6f7ff;
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
}
</style>
