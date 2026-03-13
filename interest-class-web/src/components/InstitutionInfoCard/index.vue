<template>
  <view class="info-section">
    <!-- Header: Logo + Name -->
    <view class="info-header">
      <view v-if="institution.logo" class="inst-logo">
        <AsyncImage :url="institution.logo" width="120rpx" height="120rpx" mode="aspectFill" custom-style="border-radius: 16rpx;" />
      </view>
      <view class="inst-main">
        <text class="info-name">{{ institution.name }}</text>
        <view class="info-tags-container" v-if="resolvedTags.length > 0">
          <view v-for="(tag, idx) in resolvedTags" :key="idx" class="tag-item tag-gray">{{ tag }}</view>
        </view>
      </view>
    </view>

    <!-- Rating & Stats -->
    <view class="info-stats-row">
      <view class="rating-wrap">
        <wd-rate :model-value="ratingValue" readonly size="14px" color="#ff9500" void-color="#eee" />
        <text class="rating-score">{{ ratingValue.toFixed(1) }}分</text>
      </view>
      <view class="stat-divider">|</view>
      <text class="stat-text">{{ reviewText }}</text>
    </view>

    <!-- Promo Tags (C端独有) -->
    <view class="info-tags-container" v-if="maxDiscountAmount > 0 || maxCashbackAmount > 0">
      <view v-if="maxDiscountAmount > 0" class="tag-item tag-orange">最高立减{{ maxDiscountAmount }}</view>
      <view v-if="maxCashbackAmount > 0" class="tag-item tag-red">最高返现{{ maxCashbackAmount }}</view>
    </view>

    <!-- Introduction (Collapsible) -->
    <view class="info-intro-wrapper" v-if="institution.introduction">
      <view class="simple-intro" :class="{ 'is-collapsed': !introExpanded }">
        {{ institution.introduction }}
      </view>
      <view class="intro-expand-btn" v-if="showExpandBtn" @click.stop="introExpanded = !introExpanded">
        {{ introExpanded ? '收起' : '展开' }}
        <text class="iconfont" :class="introExpanded ? 'icon-up' : 'icon-down'" style="font-size: 10px; color: #999;"></text>
      </view>
    </view>

    <view class="info-divider-line"></view>

    <!-- Address & Phone -->
    <view class="info-contact-row">
      <view class="contact-left" @click="handleOpenMap">
        <view class="contact-address">
          <text class="iconfont icon-location addr-icon" style="font-size: 18px; color: #333;"></text>
          <text class="addr-text">{{ fullAddress }}</text>
          <text class="iconfont icon-right" style="font-size: 14px; color: #ccc; margin-left: 8rpx;"></text>
        </view>
      </view>
      <view class="vertical-line"></view>
      <view class="contact-right" @click="handleCallPhone">
        <text class="iconfont icon-phone" style="font-size: 22px; color: #333;"></text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AsyncImage from '@/components/AsyncImage/index.vue'

interface Props {
  /** 机构数据（兼容 Institution 和 InstitutionInfo 类型） */
  institution: Record<string, any>
  /** 已解析的标签名数组（由父页面通过 useEnums 解析后传入） */
  resolvedTags?: string[]
  /** 最高立减金额（C端课程计算后传入） */
  maxDiscountAmount?: number
  /** 最高返现金额（C端课程计算后传入） */
  maxCashbackAmount?: number
}

const props = withDefaults(defineProps<Props>(), {
  resolvedTags: () => [],
  maxDiscountAmount: 0,
  maxCashbackAmount: 0,
})

const introExpanded = ref(false)

const ratingValue = computed(() => Number(props.institution.avg_rating || 4.0))

const reviewText = computed(() => {
  const count = props.institution.review_count || 0
  return count > 0 ? `${count}条评价` : '暂无评价'
})

const showExpandBtn = computed(() => (props.institution.introduction || '').length > 80)

const fullAddress = computed(() => {
  const i = props.institution
  return [i.province, i.city, i.district, i.address].filter(Boolean).join('') || '暂无地址'
})

const handleOpenMap = () => {
  const i = props.institution
  if (i.latitude && i.longitude) {
    uni.openLocation({
      latitude: Number(i.latitude),
      longitude: Number(i.longitude),
      name: i.name,
      address: i.address,
    })
  } else {
    uni.showToast({ title: '暂无位置信息', icon: 'none' })
  }
}

const handleCallPhone = () => {
  if (props.institution.contact_phone) {
    uni.makePhoneCall({ phoneNumber: props.institution.contact_phone })
  } else {
    uni.showToast({ title: '暂无联系电话', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.info-section {
  background: #fff;
  margin: 24rpx;
  padding: 32rpx;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
}

.info-header {
  display: flex;
  gap: 24rpx;
  margin-bottom: 16rpx;
}

.inst-logo {
  flex-shrink: 0;
}

.inst-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.info-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #1a1a1a;
  line-height: 1.4;
}

.info-stats-row {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.rating-wrap {
  display: flex;
  align-items: center;
}

.rating-score {
  font-size: 28rpx;
  color: #ff9500;
  font-weight: bold;
  margin-left: 12rpx;
}

.stat-divider {
  color: #ddd;
  margin: 0 16rpx;
  font-size: 24rpx;
}

.stat-text {
  font-size: 24rpx;
  color: #666;
}

.info-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.tag-item {
  font-size: 22rpx;
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
}

.tag-gray {
  background: #f7f8fa;
  color: #666;
}

.tag-red {
  background: #fff1f0;
  color: #ff4d4f;
  border: 1rpx solid rgba(255, 77, 79, 0.15);
}

.tag-orange {
  background: #fff7e6;
  color: #fa8c16;
  border: 1rpx solid rgba(250, 140, 22, 0.15);
}

.info-divider-line {
  height: 1rpx;
  background: #f0f0f0;
  margin: 24rpx 0;
}

.info-intro-wrapper {
  margin: 12rpx 0 16rpx;
}

.simple-intro {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;

  &.is-collapsed {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }
}

.intro-expand-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 8rpx;
  font-size: 22rpx;
  color: #999;
  gap: 4rpx;
}

.info-contact-row {
  display: flex;
  align-items: center;
}

.contact-left {
  flex: 1;
  padding: 8rpx 0;
  overflow: hidden;
}

.contact-address {
  display: flex;
  align-items: center;
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  line-height: 1.4;
}

.addr-icon {
  margin-right: 16rpx;
}

.addr-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vertical-line {
  width: 1rpx;
  height: 40rpx;
  background: #eee;
  margin: 0 24rpx;
}

.contact-right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12rpx;
}
</style>
