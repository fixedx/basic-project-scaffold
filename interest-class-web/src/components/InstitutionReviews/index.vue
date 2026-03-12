<template>
  <view class="section-block" v-if="reviews.length > 0 || showEmpty">
    <view class="block-header">
      <text class="block-title">学员评价 ({{ total }})</text>
      <view v-if="showMore && total > 0" class="block-more" @click="emit('more')">
        全部 <text class="iconfont icon-right" style="font-size: 14px;"></text>
      </view>
    </view>

    <view class="review-list" v-if="displayReviews.length > 0">
      <view v-for="review in displayReviews" :key="review.id" class="review-card">
        <view class="review-user-row">
          <image class="review-avatar" :src="review.user_avatar || '/static/default-avatar.png'" />
          <text class="review-name">
            {{ review.user_nickname || review.user_id?.substring(0, 8) || '匿名用户' }}***
          </text>
          <wd-rate :model-value="review.rating" readonly size="12px" color="#ffc107" void-color="#eee" />
        </view>
        <view class="review-text">{{ review.content }}</view>
      </view>
    </view>
    <view v-else class="empty-block">暂无评价</view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface ReviewItem {
  id: string
  user_id?: string
  user_avatar?: string
  user_nickname?: string
  rating: number
  content: string
}

interface Props {
  /** 评价数组 */
  reviews: ReviewItem[]
  /** 评价总数 */
  total?: number
  /** 最大展示数量（默认3） */
  limit?: number
  /** 是否显示"全部"按钮 */
  showMore?: boolean
  /** 无评价时是否仍然显示组件 */
  showEmpty?: boolean
}

interface Emits {
  (e: 'more'): void
}

const props = withDefaults(defineProps<Props>(), {
  total: 0,
  limit: 3,
  showMore: false,
  showEmpty: false,
})

const emit = defineEmits<Emits>()

const displayReviews = computed(() => {
  if (props.limit > 0) return props.reviews.slice(0, props.limit)
  return props.reviews
})
</script>

<style lang="scss" scoped>
.section-block {
  background: #fff;
  margin: 24rpx;
  padding: 32rpx;
  border-radius: 24rpx;
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.block-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.block-more {
  font-size: 24rpx;
  color: #999;
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.empty-block {
  text-align: center;
  color: #999;
  font-size: 26rpx;
  padding: 32rpx 0;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.review-card {
  background: #f9f9f9;
  border-radius: 12rpx;
  padding: 20rpx;
}

.review-user-row {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
  gap: 12rpx;
}

.review-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
}

.review-name {
  font-size: 24rpx;
  color: #666;
  flex: 1;
}

.review-text {
  font-size: 26rpx;
  color: #333;
  line-height: 1.5;
}
</style>
