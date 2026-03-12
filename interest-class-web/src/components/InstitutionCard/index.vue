<template>
  <view class="institution-card" :class="modeClass" @click="handleClick">
    <!-- compact 模式：纵向卡片（首页横滑用） -->
    <template v-if="mode === 'compact'">
      <view class="compact-image">
        <AsyncImage
          :url="institution.logo || '/static/default-institution.png'"
          width="100%"
          height="100%"
          mode="aspectFill"
        />
        <view class="distance-overlay" v-if="institution.distance">
          {{ formatDistance(institution.distance) }}
        </view>
      </view>
      <view class="compact-info">
        <text class="inst-name clamp-1">{{ institution.name }}</text>
        <view class="rating-row" v-if="showRating">
          <wd-rate
            :model-value="Number(institution.avg_rating || 4.0)"
            readonly
            size="20rpx"
            space="2rpx"
            color="#faad14"
          />
          <text class="rating-score">{{ Number(institution.avg_rating || 4.0).toFixed(1) }}</text>
        </view>
        <view class="promo-row" v-if="showPromo && hasPromo">
          <text class="promo-tag promo-orange" v-if="(institution.max_discount_amount || 0) > 0">
            最高立减¥{{ Number(institution.max_discount_amount || 0).toFixed(0) }}
          </text>
          <text class="promo-tag promo-red" v-if="(institution.max_cashback_amount || 0) > 0">
            最高返现¥{{ Number(institution.max_cashback_amount || 0).toFixed(0) }}
          </text>
        </view>
        <text class="inst-area clamp-1" v-if="institution.district || institution.city">
          {{ institution.district || institution.city || '' }}
        </text>
      </view>
    </template>

    <!-- full 模式：横向卡片（列表/收藏用） -->
    <template v-else>
      <view class="full-image">
        <AsyncImage
          :url="institution.logo || '/static/default-institution.png'"
          width="100%"
          height="100%"
          mode="aspectFill"
        />
        <view class="distance-bar" v-if="institution.distance">
          {{ formatDistance(institution.distance) }}
        </view>
      </view>
      <view class="full-info">
        <text class="inst-name clamp-2">{{ institution.name }}</text>

        <view class="rating-row" v-if="showRating">
          <wd-rate
            :model-value="Number(institution.avg_rating || 4.0)"
            readonly
            size="24rpx"
            space="4rpx"
            color="#faad14"
          />
          <text class="rating-score">{{ Number(institution.avg_rating || 4.0).toFixed(1) }}</text>
          <text class="review-count" v-if="(institution.review_count || 0) > 0">
            ({{ institution.review_count }}条)
          </text>
        </view>

        <view class="tags-row" v-if="showTags && displayTags.length > 0">
          <text class="tag-chip" v-for="(tag, i) in displayTags" :key="i">{{ tag }}</text>
        </view>

        <view class="address-row" v-if="showAddress && displayAddress">
          <text class="iconfont icon-location"></text>
          <text class="address-text clamp-1">{{ displayAddress }}</text>
        </view>

        <view class="promo-row" v-if="showPromo && hasPromo">
          <text class="promo-tag promo-orange" v-if="(institution.max_discount_amount || 0) > 0">
            最高立减¥{{ Number(institution.max_discount_amount || 0).toFixed(0) }}
          </text>
          <text class="promo-tag promo-red" v-if="(institution.max_cashback_amount || 0) > 0">
            最高返现¥{{ Number(institution.max_cashback_amount || 0).toFixed(0) }}
          </text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDistance } from '@/utils/distance'
import AsyncImage from '@/components/AsyncImage/index.vue'

export interface InstitutionData {
  id: string
  name: string
  logo?: string
  tags?: string
  avg_rating?: number
  review_count?: number
  distance?: number | string | null
  address?: string
  district?: string
  city?: string
  max_discount_amount?: number
  max_cashback_amount?: number
  [key: string]: any
}

interface Props {
  institution: InstitutionData
  mode?: 'compact' | 'full'
  showRating?: boolean
  showTags?: boolean
  showAddress?: boolean
  showPromo?: boolean
  /** 外部传入的标签文本数组，优先使用；未传则从 institution.tags 自动解析 */
  tagLabels?: string[]
}

interface Emits {
  (e: 'click', institution: InstitutionData): void
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'full',
  showRating: true,
  showTags: true,
  showAddress: true,
  showPromo: true,
})

const emit = defineEmits<Emits>()

const modeClass = computed(() => `institution-card--${props.mode}`)

const displayTags = computed(() => {
  if (props.tagLabels && props.tagLabels.length > 0) return props.tagLabels
  if (!props.institution.tags) return []
  const raw = typeof props.institution.tags === 'string'
    ? props.institution.tags.split(',')
    : props.institution.tags
  return (raw as string[]).filter(Boolean).slice(0, 3)
})

const displayAddress = computed(() => {
  const inst = props.institution
  if (inst.address) return inst.address
  return inst.district || inst.city || ''
})

const hasPromo = computed(() => {
  return (Number(props.institution.max_discount_amount) || 0) > 0 ||
         (Number(props.institution.max_cashback_amount) || 0) > 0
})

const handleClick = () => {
  emit('click', props.institution)
}
</script>

<style lang="scss" scoped>
/* ========== compact 模式（纵向卡片） ========== */
.institution-card--compact {
  display: inline-block;
  width: 280rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  .compact-image {
    width: 100%;
    height: 200rpx;
    position: relative;

    .distance-overlay {
      position: absolute;
      bottom: 12rpx;
      right: 12rpx;
      background: rgba(0, 0, 0, 0.5);
      color: #fff;
      font-size: 20rpx;
      padding: 2rpx 10rpx;
      border-radius: 8rpx;
      backdrop-filter: blur(4px);
    }
  }

  .compact-info {
    padding: 20rpx;
    display: flex;
    flex-direction: column;
    gap: 8rpx;

    .inst-name {
      font-size: 28rpx;
      font-weight: bold;
      color: $uni-text-color;
    }

    .inst-area {
      font-size: 22rpx;
      color: $uni-text-color-tertiary;
    }
  }
}

/* ========== full 模式（横向卡片） ========== */
.institution-card--full {
  display: flex;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  gap: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.02);

  &:active {
    background-color: $uni-bg-color-tertiary;
  }

  .full-image {
    width: 180rpx;
    height: 180rpx;
    border-radius: 16rpx;
    overflow: hidden;
    position: relative;
    flex-shrink: 0;

    .distance-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      font-size: 20rpx;
      padding: 4rpx 0;
      text-align: center;
    }
  }

  .full-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0;

    .inst-name {
      font-size: 32rpx;
      font-weight: 600;
      color: $uni-text-color;
      line-height: 1.4;
    }
  }
}

/* ========== 通用样式 ========== */
.clamp-1 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 6rpx;

  .rating-score {
    font-size: 24rpx;
    font-weight: 600;
    color: #faad14;
  }

  .review-count {
    font-size: 22rpx;
    color: $uni-text-color-tertiary;
  }
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 4rpx;

  .tag-chip {
    font-size: 22rpx;
    color: $uni-text-color-secondary;
    background: $uni-bg-color-grey;
    padding: 4rpx 12rpx;
    border-radius: 6rpx;
  }
}

.address-row {
  display: flex;
  align-items: center;
  gap: 4rpx;
  margin-top: 4rpx;

  .iconfont {
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
  }

  .address-text {
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
    flex: 1;
    min-width: 0;
  }
}

.promo-row {
  display: flex;
  gap: 8rpx;
  margin-top: 4rpx;

  .promo-tag {
    font-size: 18rpx;
    padding: 2rpx 8rpx;
    border-radius: 6rpx;

    &.promo-orange {
      color: #ff9500;
      background: #fff7e6;
      border: 1rpx solid rgba(255, 149, 0, 0.2);
    }

    &.promo-red {
      color: #ff4d4f;
      background: #fff1f0;
      border: 1rpx solid rgba(255, 77, 79, 0.2);
    }
  }
}
</style>
