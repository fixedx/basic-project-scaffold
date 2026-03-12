<template>
  <view class="review-list-page">
    <!-- 筛选标签 -->
    <view class="filter-tabs">
      <view 
        v-for="tab in filterTabs" 
        :key="tab.value"
        class="filter-tab"
        :class="{ 'filter-tab-active': currentFilter === tab.value }"
        @click="handleFilterChange(tab.value)"
      >
        {{ tab.label }}
      </view>
    </view>

    <!-- 评价列表 -->
    <view class="reviews-container">
      <view 
        v-for="review in reviews" 
        :key="review.id" 
        class="review-item"
      >
        <view class="review-header">
          <view class="user-info">
            <AsyncImage 
              :url="'/static/default-avatar.png'" 
              width="80rpx" 
              height="80rpx" 
              :radius="40"
            />
            <view class="user-detail">
              <text class="user-name">{{ review.user_id?.substring(0, 8) || '匿名用户' }}***</text>
              <text class="review-date">{{ formatDate(review.created_at) }}</text>
            </view>
          </view>
          <view class="rating-stars">
            <text 
              v-for="star in 5" 
              :key="star" 
              class="star"
              :class="{ 'star-active': star <= review.rating }"
            >★</text>
          </view>
        </view>
        <view class="review-content">{{ review.content }}</view>
        <!-- 评价图片 -->
        <view class="review-images" v-if="review.images && review.images.length > 0">
          <AsyncImage 
            v-for="(img, idx) in review.images" 
            :key="idx"
            :url="img"
            width="200rpx"
            height="200rpx"
            mode="aspectFill"
            :radius="8"
            @click="previewImage(review.images, idx)"
          />
        </view>
        <!-- 商家回复 -->
        <view class="reply-section" v-if="review.reply">
          <text class="reply-label">商家回复：</text>
          <text class="reply-content">{{ review.reply }}</text>
        </view>
      </view>

      <!-- 无数据 -->
      <view class="empty-state" v-if="!loading && reviews.length === 0">
        <text class="iconfont icon-comment" style="font-size: 200rpx; color: #d9d9d9;"></text>
        <text class="empty-text">暂无评价</text>
      </view>
    </view>

    <!-- 加载中 -->
    <view class="loading-more" v-if="loading">
      <text>加载中...</text>
    </view>

    <!-- 加载完成 -->
    <view class="no-more" v-if="!loading && noMore && reviews.length > 0">
      <text>没有更多了</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { reviewApi, type Review } from '@/api/review'
import AsyncImage from '@/components/AsyncImage/index.vue'

// 筛选标签
const filterTabs = [
  { label: '全部', value: 'all' },
  { label: '好评', value: 'good' },
  { label: '中评', value: 'medium' },
  { label: '差评', value: 'bad' },
]

const courseId = ref('')
const institutionId = ref('')
const currentFilter = ref('all')
const reviews = ref<Review[]>([])
const loading = ref(false)
const noMore = ref(false)
const page = ref(1)
const pageSize = 10

onLoad((options: any) => {
  if (options.courseId) {
    courseId.value = options.courseId
  }
  if (options.institutionId) {
    institutionId.value = options.institutionId
  }
})

onMounted(() => {
  loadReviews()
})

onPullDownRefresh(() => {
  page.value = 1
  noMore.value = false
  loadReviews().finally(() => {
    uni.stopPullDownRefresh()
  })
})

onReachBottom(() => {
  if (!noMore.value && !loading.value) {
    loadReviews(true)
  }
})

// 加载评价列表
const loadReviews = async (isLoadMore = false) => {
  if (loading.value) return
  loading.value = true
  
  try {
    // 根据筛选条件设置评分范围
    let minRating: number | undefined
    let rating: number | undefined
    
    if (currentFilter.value === 'good') {
      minRating = 4
    } else if (currentFilter.value === 'medium') {
      rating = 3
    } else if (currentFilter.value === 'bad') {
      rating = 1 // 1-2分
    }
    
    let result: any
    
    if (courseId.value) {
      result = await reviewApi.getCourseList(courseId.value, {
        page: page.value,
        pageSize,
        sort_by: 'created_at_desc'
      })
    } else if (institutionId.value) {
      result = await reviewApi.getInstitutionList(institutionId.value, {
        page: page.value,
        pageSize,
        sort_by: 'created_at_desc'
      })
    }
    
    if (result) {
      let data = result.data || []
      
      // 客户端筛选（如果API不支持）
      if (currentFilter.value === 'good') {
        data = data.filter((r: Review) => r.rating >= 4)
      } else if (currentFilter.value === 'medium') {
        data = data.filter((r: Review) => r.rating === 3)
      } else if (currentFilter.value === 'bad') {
        data = data.filter((r: Review) => r.rating <= 2)
      }
      
      if (isLoadMore) {
        reviews.value = [...reviews.value, ...data]
      } else {
        reviews.value = data
      }
      
      // 判断是否还有更多
      if (data.length < pageSize) {
        noMore.value = true
      } else {
        page.value++
      }
    }
  } catch (error) {
    console.error('加载评价失败:', error)
  } finally {
    loading.value = false
  }
}

// 切换筛选
const handleFilterChange = (filter: string) => {
  if (currentFilter.value === filter) return
  currentFilter.value = filter
  page.value = 1
  noMore.value = false
  loadReviews()
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 预览图片
const previewImage = (urls: string[], current: number) => {
  uni.previewImage({
    urls,
    current,
  })
}
</script>

<style lang="scss" scoped>
.review-list-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.filter-tabs {
  display: flex;
  padding: 24rpx 32rpx;
  gap: 24rpx;
  background-color: $uni-bg-color;
  position: sticky;
  top: 0;
  z-index: 10;
}

.filter-tab {
  padding: 12rpx 32rpx;
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  background-color: $uni-bg-color-grey;
  border-radius: 32rpx;
  
  &.filter-tab-active {
    color: $uni-color-primary;
    background-color: $uni-color-primary-lighter;
  }
}

.reviews-container {
  padding: 24rpx 32rpx;
}

.review-item {
  padding: 32rpx;
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.user-detail {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.user-name {
  font-size: 28rpx;
  color: $uni-text-color;
  font-weight: 500;
}

.review-date {
  font-size: 22rpx;
  color: $uni-text-color-tertiary;
}

.rating-stars {
  display: flex;
  gap: 4rpx;
}

.star {
  font-size: 28rpx;
  color: #ddd;
  
  &.star-active {
    color: #ffc107;
  }
}

.review-content {
  font-size: 28rpx;
  color: $uni-text-color;
  line-height: 1.6;
  margin-bottom: 20rpx;
}

.review-images {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
  margin-bottom: 20rpx;
}

.reply-section {
  padding: 20rpx;
  background-color: $uni-bg-color-grey;
  border-radius: 8rpx;
}

.reply-label {
  font-size: 24rpx;
  color: $uni-color-primary;
  font-weight: 500;
}

.reply-content {
  font-size: 24rpx;
  color: $uni-text-color-secondary;
  line-height: 1.6;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-text {
  margin-top: 24rpx;
  font-size: 28rpx;
  color: $uni-text-color-tertiary;
}

.loading-more,
.no-more {
  padding: 32rpx;
  text-align: center;
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
}
</style>
