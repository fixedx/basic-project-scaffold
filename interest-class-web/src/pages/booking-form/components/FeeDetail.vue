<template>
  <view class="fee-detail-section">
    <view class="section-title">费用明细</view>
    <view class="fee-detail">
      <!-- 课程总价（含平台服务费）-->
      <view class="fee-row">
        <text class="fee-label">课程总价</text>
        <text class="fee-value">￥{{ formatPrice(displayPrice || selectedSku.total_price) }}</text>
      </view>

      <!-- 体验课：全额线上支付（onlinePayBase 已含服务费）-->
      <template v-if="isTrialSku">
        <view class="fee-row" v-if="modelUseBalance && balanceDeductAmount > 0">
          <text class="fee-label">余额抵扣</text>
          <text class="fee-value discount">-￥{{ formatPrice(balanceDeductAmount) }}</text>
        </view>
        <view class="fee-divider"></view>
        <view class="fee-row highlight">
          <text class="fee-label">线上支付</text>
          <text class="fee-value price">￥{{ formatPrice(onlinePayAmount) }}</text>
        </view>
        <view class="fee-tip">体验课需全额线上支付</view>
      </template>

      <!-- 正式课：拆分线上/线下（onlinePayBase 已含服务费）-->
      <template v-else>
        <view class="fee-row">
          <text class="fee-label">线上定金</text>
          <text class="fee-value">￥{{ formatPrice(onlinePayBase) }}</text>
        </view>
        <view class="fee-row" v-if="inviteDiscount > 0">
          <text class="fee-label">邀请码优惠</text>
          <text class="fee-value discount">-￥{{ formatPrice(inviteDiscount) }}</text>
        </view>
        <view class="fee-row" v-if="modelUseBalance && balanceDeductAmount > 0">
          <text class="fee-label">余额抵扣</text>
          <text class="fee-value discount">-￥{{ formatPrice(balanceDeductAmount) }}</text>
        </view>
        <view class="fee-divider"></view>
        <view class="fee-row highlight">
          <text class="fee-label">线上支付（定金）</text>
          <text class="fee-value price">￥{{ formatPrice(onlinePayAmount) }}</text>
        </view>
        <view class="fee-row">
          <text class="fee-label">线下支付（尾款）</text>
          <text class="fee-value">￥{{ formatPrice(offlinePayAmount) }}</text>
        </view>
        <view class="fee-tip">线上支付含定金，线下尾款请到店支付给机构</view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { CourseSku } from '@/api'
import type { Course } from '@/api'

interface Props {
  selectedSku: CourseSku
  isTrialSku: boolean
  course: Course
  displayPrice: number
  inviteDiscount: number
  modelUseBalance: boolean
  balanceDeductAmount: number
  onlinePayBase: number
  onlinePayAmount: number
  offlinePayAmount: number
  formatPrice: (val: number | string) => string
}

defineProps<Props>()
</script>

<style lang="scss" scoped>
.fee-detail-section {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
  padding-left: 20rpx;
  position: relative;
  margin-bottom: 24rpx;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 6rpx;
    height: 28rpx;
    background: linear-gradient(to bottom, #52c41a, #95de64);
    border-radius: 4rpx;
  }
}

.fee-detail {
  .fee-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16rpx 0;

    .fee-label {
      font-size: 28rpx;
      color: #666;
    }

    .fee-value {
      font-size: 28rpx;
      color: #333;

      &.discount { color: #52c41a; }

      &.price {
        font-size: 32rpx;
        font-weight: 600;
        color: #f5222d;
      }
    }

    &.highlight .fee-label {
      color: #333;
      font-weight: 500;
    }
  }

  .fee-divider {
    height: 1rpx;
    background-color: #f0f0f0;
    margin: 8rpx 0;
  }

  .fee-tip {
    font-size: 24rpx;
    color: #999;
    margin-top: 8rpx;
    padding-bottom: 8rpx;
  }
}
</style>
