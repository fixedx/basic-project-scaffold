<template>
  <view class="course-card" :class="{ 'course-card--flat': flat }" @click="handleClick">
    <!-- 课程信息 -->
    <view class="course-info">
      <!-- 分类标签 -->
      <view v-if="showCategory && categoryLabel" class="category-badge">
        {{ categoryLabel }}
      </view>
      
      <view class="title-row">
        <text class="course-title">{{ course.title }}</text>
        <view v-if="showPrice" class="price-box">
          <text class="price-symbol">¥</text>
          <text class="price-num">{{ displayPrice }}</text>
          <text class="price-suffix">起</text>
        </view>
      </view>
      
      <!-- 机构信息（家长端展示） -->
      <view v-if="role === 'parent' && course.institution" class="institution-row">
        <view class="inst-left">
          <text class="iconfont icon-store meta-icon"></text>
          <text class="institution-name">{{ course.institution.name }}</text>
        </view>
        <text v-if="course.distance" class="course-distance">
          <text class="iconfont icon-location meta-icon"></text>
          {{ formatDistance(course.distance) }}
        </text>
      </view>
      
      <!-- 副标题 -->
      <text v-if="course.subtitle" class="course-subtitle">{{ course.subtitle }}</text>
      
      <!-- 课程标签（机构端展示） -->
      <view v-if="role === 'institution'" class="course-tags">
        <view class="type-tag" :class="course.type === 'trial' ? 'tag-trial' : 'tag-standard'">
          {{ course.type === 'trial' ? '试听课' : '正式课' }}
        </view>
        <view class="status-tag" :class="course.is_online ? 'tag-online' : 'tag-offline'">
          {{ course.is_online ? '已上架' : '已下架' }}
        </view>
      </view>
      
      <!-- 课程元信息 -->
      <view class="course-meta">
        <view v-if="course.min_age || course.max_age" class="meta-chip">
          <text class="iconfont icon-smile meta-icon"></text>
          <text>{{ course.min_age || 0 }}-{{ course.max_age || 99 }}岁</text>
        </view>
        <view v-if="course.lesson_duration" class="meta-chip">
          <text class="iconfont icon-time meta-icon"></text>
          <text>{{ course.lesson_duration }}分钟/节</text>
        </view>
        <view v-if="role === 'institution'" class="meta-chip">
          <text class="iconfont icon-catalog meta-icon"></text>
          <text>{{ course.skus?.length || 0 }}个规格</text>
        </view>
      </view>
      
      <!-- 营销标签 -->
      <view v-if="showPromo && hasPromo" class="promo-row">
        <text v-if="(course.max_discount_amount || 0) > 0" class="promo-tag promo-orange">
          最高立减¥{{ Number(course.max_discount_amount || 0).toFixed(0) }}
        </text>
        <text v-if="(course.max_cashback_amount || 0) > 0" class="promo-tag promo-red">
          最高返现¥{{ Number(course.max_cashback_amount || 0).toFixed(0) }}
        </text>
      </view>
      
      <!-- 底部信息 -->
      <view class="course-footer">
        <text class="course-sales">
          <text class="iconfont icon-hot-for-ux meta-icon hot-icon"></text>
          已售{{ course.sales_count || 0 }}
        </text>
      </view>
    </view>

    <!-- 操作按钮区域（通过 slot 传入） -->
    <view v-if="$slots.actions" class="course-actions" @click.stop>
      <slot name="actions" :course="course" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDistance } from '@/utils/distance'

interface CourseSku {
  id?: string
  total_price: number
  online_pay_price?: number
  offline_pay_price?: number
  [key: string]: any
}

interface Course {
  id: string
  title: string
  subtitle?: string
  slider_imgs?: string[]
  type?: string
  is_online?: boolean
  min_age?: number
  max_age?: number
  lesson_duration?: number
  sales_count?: number
  distance?: number | null
  min_price?: number
  max_discount_amount?: number
  max_cashback_amount?: number
  skus?: CourseSku[]
  institution?: {
    id: string
    name: string
    [key: string]: any
  }
  [key: string]: any
}

interface Props {
  course: Course
  role?: 'parent' | 'institution'
  showPrice?: boolean
  showPromo?: boolean
  showCategory?: boolean
  categoryLabel?: string
  flat?: boolean
}

interface Emits {
  (e: 'click', course: Course): void
}

const props = withDefaults(defineProps<Props>(), {
  role: 'parent',
  showPrice: true,
  showPromo: false,
  showCategory: false,
  flat: false,
})

const emit = defineEmits<Emits>()

// 计算显示价格（优先使用预计算的 min_price，否则从 SKU 计算）
const displayPrice = computed(() => {
  if (props.course.min_price != null) {
    const price = Number(props.course.min_price) || 0
    return price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)
  }
  if (props.course.skus && props.course.skus.length > 0) {
    // 优先使用含佣金的 display_price，否则回退到 total_price
    const prices = props.course.skus.map(s => Number(s.display_price ?? s.total_price) || 0)
    const min = Math.min(...prices)
    return min % 1 === 0 ? min.toFixed(0) : min.toFixed(2)
  }
  return '0'
})

// 是否有营销标签
const hasPromo = computed(() => {
  return (Number(props.course.max_discount_amount) || 0) > 0 ||
         (Number(props.course.max_cashback_amount) || 0) > 0
})

const handleClick = () => {
  emit('click', props.course)
}
</script>

<style lang="scss" scoped>
.course-card {
  display: flex;
  flex-direction: column;
  background-color: $uni-bg-color;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  &:active {
    background-color: $uni-bg-color-tertiary;
  }

  &--flat {
    background: none;
    box-shadow: none;
    border-radius: 0;
    padding: 20rpx 0;
    margin-bottom: 0;
    border-bottom: 1rpx solid $uni-border-color-light;

    &:last-child {
      border-bottom: none;
    }
  }
}

.course-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.category-badge {
  display: inline-flex;
  align-self: flex-start;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  margin-bottom: 12rpx;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 8rpx;
}

.course-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $uni-text-color;
  line-height: 1.4;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.price-box {
  color: #ff4d4f;
  display: flex;
  align-items: baseline;
  flex-shrink: 0;
  margin-top: 2rpx;

  .price-symbol {
    font-size: 22rpx;
    font-weight: 600;
  }

  .price-num {
    font-size: 36rpx;
    font-weight: 800;
    margin: 0 2rpx;
  }

  .price-suffix {
    font-size: 20rpx;
    color: $uni-text-color-tertiary;
    font-weight: normal;
    margin-left: 2rpx;
  }
}

.meta-icon {
  font-size: 22rpx;
  margin-right: 4rpx;
}

.institution-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;

  .inst-left {
    display: flex;
    align-items: center;
    flex: 1;
    overflow: hidden;

    .meta-icon {
      color: $uni-color-primary;
    }
  }

  .institution-name {
    font-size: 24rpx;
    color: $uni-text-color-secondary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .course-distance {
    font-size: 22rpx;
    color: $uni-color-primary;
    margin-left: 16rpx;
    flex-shrink: 0;
    display: flex;
    align-items: center;

    .meta-icon {
      font-size: 20rpx;
      color: $uni-color-primary;
    }
  }
}

.course-subtitle {
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-tags {
  display: flex;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.type-tag,
.status-tag {
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-size: 22rpx;
}

.tag-trial {
  background-color: #fff7e6;
  color: #fa8c16;
}

.tag-standard {
  background-color: #e6f7ff;
  color: #1890ff;
}

.tag-online {
  background-color: #f6ffed;
  color: #52c41a;
}

.tag-offline {
  background-color: #f5f5f5;
  color: #999;
}

.course-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 8rpx;

  .meta-chip {
    font-size: 22rpx;
    color: $uni-text-color-tertiary;
    background: $uni-bg-color-grey;
    padding: 4rpx 14rpx;
    border-radius: 6rpx;
    display: flex;
    align-items: center;
    gap: 4rpx;

    .meta-icon {
      font-size: 20rpx;
      color: $uni-text-color-tertiary;
    }
  }
}

.promo-row {
  display: flex;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.promo-tag {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 4rpx;

  &.promo-orange {
    color: #ff9500;
    background: rgba(255, 149, 0, 0.1);
    border: 1rpx solid rgba(255, 149, 0, 0.2);
  }

  &.promo-red {
    color: #ff4d4f;
    background: rgba(255, 59, 48, 0.1);
    border: 1rpx solid rgba(255, 59, 48, 0.2);
  }
}

.course-footer {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-top: 8rpx;

  .hot-icon {
    font-size: 22rpx;
    color: #ff4d4f;
    margin-right: 4rpx;
  }

  .course-sales {
    font-size: 22rpx;
    color: $uni-text-color-tertiary;
  }
}

.course-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  padding-top: 16rpx;
  margin-top: 16rpx;
  border-top: 1rpx solid $uni-border-color-light;
}
</style>
