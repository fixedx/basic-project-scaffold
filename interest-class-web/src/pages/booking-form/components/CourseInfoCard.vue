<template>
  <view class="course-info-card">
    <view class="title-row">
      <text class="course-title">{{ course.title }}</text>
      <text class="type-tag">{{ course.type === 'trial' ? '试听课' : '正式课' }}</text>
    </view>

    <view class="sku-row" v-if="selectedSku">
      <text class="sku-name">{{ selectedSku.name }}</text>
      <view class="price-box">
        <text class="symbol">¥</text>
        <text class="price">{{ selectedSku.total_price }}</text>
      </view>
    </view>

    <view class="cashback-tags" v-if="course.type !== 'trial' && skuCashbackAmount > 0">
      <text class="tag orange" v-if="skuDiscountAmount > 0">立减¥{{ skuDiscountAmount }}</text>
      <text class="tag red">最高返现¥{{ skuCashbackAmount }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Course, CourseSku } from '@/api'

interface Props {
  course: Course
  selectedSku: CourseSku | null
  skuCashbackAmount: number
  skuDiscountAmount: number
}

defineProps<Props>()
</script>

<style lang="scss" scoped>
.course-info-card {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.title-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 24rpx;

  .course-title {
    flex: 1;
    font-size: 34rpx;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1.4;
  }

  .type-tag {
    flex-shrink: 0;
    font-size: 22rpx;
    color: #52c41a;
    background-color: #f6ffed;
    padding: 4rpx 12rpx;
    border-radius: 6rpx;
    margin-top: 4rpx;
  }
}

.sku-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;

  .sku-name {
    font-size: 26rpx;
    color: #666;
  }

  .price-box {
    display: flex;
    align-items: baseline;

    .symbol {
      font-size: 24rpx;
      color: #ff4d4f;
      font-weight: 600;
    }

    .price {
      font-size: 40rpx;
      color: #ff4d4f;
      font-family: DINAlternate-Bold, sans-serif;
      font-weight: 700;
    }
  }
}

.cashback-tags {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;

  .tag {
    font-size: 22rpx;
    padding: 4rpx 12rpx;
    border-radius: 6rpx;

    &.orange { color: #fa8c16; background-color: #fff7e6; }
    &.red { color: #f5222d; background-color: #fff1f0; }
  }
}
</style>
