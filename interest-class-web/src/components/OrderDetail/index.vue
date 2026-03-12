<template>
  <view class="order-detail-component">
    <view v-if="loading" class="loading">
      <Loading text="加载中..." />
    </view>

    <view v-else-if="!order" class="empty">
      <wd-status-tip image="content" tip="订单不存在" />
    </view>

    <view v-else class="order-content">
      <!-- 状态卡片 -->
      <view class="status-card" :class="getStatusClass(order.status)">
        <text class="status-text">{{ getStatusLabel(order.status) }}</text>
        <text class="status-desc">{{ getStatusDesc(order.status) }}</text>
      </view>

      <!-- 订单信息 -->
      <view class="info-card">
        <view class="card-title">订单信息</view>
        <view class="info-list">
          <view class="info-item">
            <text class="label">订单号</text>
            <text class="value">{{ order.order_no }}</text>
          </view>
          <view class="info-item">
            <text class="label">创建时间</text>
            <text class="value">{{ formatTime(order.created_at) }}</text>
          </view>
          <view v-if="order.paid_at" class="info-item">
            <text class="label">支付时间</text>
            <text class="value">{{ formatTime(order.paid_at) }}</text>
          </view>
          <view class="info-item">
            <text class="label">支付方式</text>
            <text class="value">{{ getPaymentMethodLabel(order.payment_method) }}</text>
          </view>
        </view>
      </view>

      <!-- 课程信息 -->
      <view class="info-card">
        <view class="card-title">课程信息</view>
        <view class="info-list">
          <view class="info-item clickable" @click="handleCourseClick">
            <text class="label">课程名称</text>
            <text class="value link">{{ order.course_name }}</text>
            <text class="iconfont icon-right"></text>
          </view>
          <view class="info-item">
            <text class="label">规格</text>
            <text class="value">{{ order.sku_name }}</text>
          </view>
          <view class="info-item">
            <text class="label">数量</text>
            <text class="value">{{ order.quantity }}</text>
          </view>
        </view>
        
        <!-- 课时进度 -->
        <view v-if="showProgress" class="progress-section">
          <view class="progress-header">
            <text class="progress-label">上课进度</text>
            <text class="progress-value">{{ order.completed_lessons || 0 }}/{{ order.total_lessons || 0 }}课时</text>
          </view>
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: `${progressPercent}%` }"></view>
          </view>
        </view>
      </view>

      <!-- 学员信息 -->
      <view class="info-card">
        <view class="card-title">学员信息</view>
        <view class="info-list">
          <view class="info-item">
            <text class="label">学员姓名</text>
            <text class="value">{{ order.student_name || '未填写' }}</text>
          </view>
          <view v-if="order.student_phone" class="info-item">
            <text class="label">联系电话</text>
            <text class="value">{{ order.student_phone }}</text>
          </view>
        </view>
      </view>

      <!-- 金额信息 -->
      <view class="info-card">
        <view class="card-title">金额信息</view>
        <view class="info-list">
          <view class="info-item">
            <text class="label">原价</text>
            <text class="value">¥{{ formatPrice(order.original_price) }}</text>
          </view>
          <view v-if="order.discount_amount > 0" class="info-item">
            <text class="label">优惠金额</text>
            <text class="value discount">-¥{{ formatPrice(order.discount_amount) }}</text>
          </view>
          <view v-if="order.cashback_amount > 0" class="info-item">
            <text class="label">返现金额</text>
            <text class="value cashback">¥{{ formatPrice(order.cashback_amount) }}</text>
          </view>
          <view class="info-item">
            <text class="label">实付金额</text>
            <text class="value price">¥{{ formatPrice(order.paid_amount) }}</text>
          </view>
          <!-- 线上/线下支付明细 -->
          <view v-if="order.online_pay_amount > 0" class="info-item">
            <text class="label">线上支付</text>
            <text class="value">¥{{ formatPrice(order.online_pay_amount) }}</text>
          </view>
          <view v-if="order.offline_pay_amount > 0" class="info-item">
            <text class="label">线下支付</text>
            <text class="value">¥{{ formatPrice(order.offline_pay_amount) }}</text>
          </view>
          <!-- 管理员可见：平台佣金 -->
          <view v-if="role === 'admin' && (order.commission_amount ?? 0) > 0" class="info-item">
            <text class="label">平台佣金</text>
            <text class="value commission">¥{{ formatPrice(order.commission_amount) }}</text>
          </view>
        </view>
      </view>

      <!-- 退款信息 -->
      <view v-if="order.refund_reason || showRefundAmount" class="info-card">
        <view class="card-title">退款信息</view>
        <view class="info-list">
          <view v-if="order.refund_reason" class="info-item">
            <text class="label">退款原因</text>
            <text class="value">{{ order.refund_reason }}</text>
          </view>
          <!-- 退款金额明细 -->
          <view v-if="showRefundAmount" class="info-item">
            <text class="label">退款总额</text>
            <text class="value refund-amount">¥{{ formatPrice(order.refund_info?.total_refund_amount) }}</text>
          </view>
          <view v-if="showRefundAmount && (order.refund_info?.online_refund_amount ?? 0) > 0" class="info-item">
            <text class="label">线上退款</text>
            <text class="value refund-online">¥{{ formatPrice(order.refund_info?.online_refund_amount) }}（原路退回）</text>
          </view>
          <view v-if="showRefundAmount && (order.refund_info?.offline_refund_amount ?? 0) > 0" class="info-item">
            <text class="label">线下退款</text>
            <text class="value refund-offline">¥{{ formatPrice(order.refund_info?.offline_refund_amount) }}（到店退回）</text>
          </view>
          <view v-if="showRefundAmount" class="info-item">
            <text class="label">课时进度</text>
            <text class="value">已上 {{ order.refund_info?.completed_lessons || 0 }} / 共 {{ order.refund_info?.total_lessons || 0 }} 课时</text>
          </view>
          <view v-if="order.refunded_at" class="info-item">
            <text class="label">退款时间</text>
            <text class="value">{{ formatTime(order.refunded_at) }}</text>
          </view>
        </view>
      </view>

      <!-- 备注 -->
      <view v-if="order.remark" class="info-card">
        <view class="card-title">备注</view>
        <view class="remark-content">{{ order.remark }}</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Order } from '@/api/order'
import Loading from '@/components/Loading/index.vue'

// Props
interface Props {
  order: Order | null
  loading?: boolean
  role?: 'parent' | 'institution' | 'admin'  // 区分家长端、机构端和管理端
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  role: 'parent',
})

// Emits
const emit = defineEmits<{
  (e: 'course-click', courseId: string): void
}>()

// 状态配置
const statusConfig: Record<string, { label: string; desc: string; class: string }> = {
  pending: { label: '待支付', desc: '请尽快完成支付', class: 'status-pending' },
  pending_confirm: { label: '待确认', desc: '等待机构确认', class: 'status-pending-confirm' },
  confirmed: { label: '已确认', desc: '订单已生效', class: 'status-confirmed' },
  refund_pending: { label: '退款审批中', desc: '等待机构审批退款', class: 'status-refunding' },
  refunding: { label: '退款中', desc: '正在处理退款', class: 'status-refunding' },
  refund_rejected: { label: '退款被拒绝', desc: '机构拒绝了您的退款申请', class: 'status-refund-rejected' },
  refunded: { label: '退款成功', desc: '退款已完成', class: 'status-refunded' },
  cancelled: { label: '已取消', desc: '订单已取消', class: 'status-cancelled' },
  completed: { label: '已完成', desc: '感谢您的信任', class: 'status-completed' },
}

const getStatusLabel = (status: string) => statusConfig[status]?.label || status
const getStatusDesc = (status: string) => statusConfig[status]?.desc || ''
const getStatusClass = (status: string) => statusConfig[status]?.class || ''

// 是否显示进度条（确认或完成状态，且有课时信息）
const showProgress = computed(() => {
  if (!props.order) return false
  const validStatus = ['confirmed', 'completed'].includes(props.order.status)
  const hasLessons = (props.order.total_lessons || 0) > 0
  return validStatus && hasLessons
})

// 是否显示退款金额（退款中、已退款状态均显示）
const showRefundAmount = computed(() => {
  if (!props.order?.refund_info) return false
  return ['refund_pending', 'refunding', 'refund_rejected', 'refunded'].includes(props.order.status)
})

// 进度百分比
const progressPercent = computed(() => {
  if (!props.order || !props.order.total_lessons) return 0
  return Math.round((props.order.completed_lessons || 0) / props.order.total_lessons * 100)
})

// 支付方式
const getPaymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    offline: '线下支付',
    wechat: '微信支付',
    alipay: '支付宝',
  }
  return labels[method] || method
}

// 格式化金额
const formatPrice = (price: any) => {
  const num = Number(price) || 0
  return num.toFixed(2)
}

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return ''
  const date = new Date(time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

// 点击课程
const handleCourseClick = () => {
  if (props.order) {
    emit('course-click', props.order.course_id)
  }
}
</script>

<style lang="scss" scoped>
.order-detail-component {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 200rpx; /* Space for footer */
}

.loading, .empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100rpx 0;
  min-height: 60vh;
}

.order-content {
  padding: 24rpx;
}

/* 状态卡片 - 新设计 */
.status-card {
  padding: 48rpx 32rpx;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  background-color: #fff;
  border: 1rpx solid transparent;
  
  .status-text {
    display: block;
    font-size: 44rpx;
    font-weight: bold;
    margin-bottom: 12rpx;
  }
  
  .status-desc {
    display: block;
    font-size: 26rpx;
    opacity: 0.9;
  }
  
  /* 状态颜色变体 */
  /* 待支付: 橙色 */
  &.status-pending {
    background: #fff7e6;
    border-color: #ffd591;
    .status-text, .status-desc { color: #faad14; }
  }
  
  /* 待确认: 蓝色 */
  &.status-pending-confirm {
    background: #e6f7ff;
    border-color: #91d5ff;
    .status-text, .status-desc { color: #1890ff; }
  }
  
  /* 已确认/已完成: 绿色 (主色) */
  &.status-confirmed, &.status-completed {
    background: #f6ffed;
    border-color: #b7eb8f;
    .status-text, .status-desc { color: #52c41a; }
  }
  
  /* 退款中: 红色 */
  &.status-refunding {
    background: #fff1f0;
    border-color: #ffccc7;
    .status-text, .status-desc { color: #f5222d; }
  }
  
  /* 退款被拒绝: 深红色 */
  &.status-refund-rejected {
    background: #fff1f0;
    border-color: #ffa39e;
    .status-text, .status-desc { color: #cf1322; }
  }
  
  /* 已取消/已退款: 灰色 */
  &.status-cancelled, &.status-refunded {
    background: #f5f5f5;
    border-color: #d9d9d9;
    .status-text, .status-desc { color: #999; }
  }
}

.info-card {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  .card-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #333;
    padding-bottom: 24rpx;
    margin-bottom: 24rpx;
    border-bottom: 1rpx solid #f0f0f0;
    display: flex;
    align-items: center;

    &::before {
      content: '';
      display: block;
      width: 6rpx;
      height: 28rpx;
      background-color: #52c41a;
      border-radius: 4rpx;
      margin-right: 16rpx;
    }
  }

  .info-list {
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start; /* 名字较长时顶部对齐 */
      padding: 12rpx 0;
      line-height: 1.5;
      
      &.clickable {
        padding: 20rpx;
        margin: 0 -20rpx;
        border-radius: 12rpx;
        transition: background-color 0.2s;
        
        &:active {
          background-color: #f5f5f5;
        }

        .value.link {
          font-weight: 500;
          color: #333;
        }
      }
      
      .label {
        font-size: 28rpx;
        color: #999;
        min-width: 140rpx;
      }
      
      .value {
        font-size: 28rpx;
        color: #333;
        flex: 1;
        text-align: right;
        font-weight: 500;
        
        &.price {
          color: #f5222d;
          font-size: 34rpx;
          font-family: 'DINAlternate-Bold', sans-serif;
        }
        
        &.discount {
          color: #52c41a;
          font-family: 'DINAlternate-Bold', sans-serif;
        }
        
        &.cashback {
          color: #faad14;
          font-family: 'DINAlternate-Bold', sans-serif;
        }

        &.commission {
          color: #1890ff;
          font-family: 'DINAlternate-Bold', sans-serif;
        }

        &.refund-amount {
          color: #f5222d;
          font-size: 34rpx;
          font-weight: bold;
          font-family: 'DINAlternate-Bold', sans-serif;
        }

        &.refund-online, &.refund-offline {
          color: #666;
          font-family: 'DINAlternate-Bold', sans-serif;
        }

        /* 订单号字体 */
        &:not(.price):not(.discount):not(.cashback) {
           /* 若内容是纯数字/英文如订单号，可稍微调整字体，这里保持默认以免中文混排奇怪 */
        }
      }

      .iconfont {
        font-size: 24rpx;
        color: #ccc;
        margin-left: 8rpx;
        margin-top: 4rpx;
      }
    }
  }
}

.progress-section {
  margin-top: 32rpx;
  padding-top: 24rpx;
  border-top: 1rpx dashed #f0f0f0;

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
  }
  
  .progress-label {
    font-size: 26rpx;
    color: #666;
  }
  
  .progress-value {
    font-size: 28rpx;
    color: #52c41a;
    font-family: 'DINAlternate-Bold', sans-serif;
  }
  
  .progress-bar {
    height: 12rpx;
    background-color: #f5f5f5;
    border-radius: 100rpx;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: #52c41a;
    border-radius: 100rpx;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

.remark-content {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  background-color: #f9f9f9;
  padding: 20rpx;
  border-radius: 12rpx;
}
</style>
