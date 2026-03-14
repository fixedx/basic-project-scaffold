<template>
  <view class="page">
    <view class="container">
      <view class="card-box">
        <!-- 评分 -->
        <view class="form-group">
          <view class="form-label required">评分</view>
          <view class="rating-group">
            <view
              v-for="star in 5"
              :key="star"
              class="star"
              @click="handleRatingChange(star)"
            >
              <text 
                class="iconfont icon-favorites-fill" 
                :style="{ fontSize: '60rpx', color: star <= form.rating ? '#faad14' : '#f0f0f0' }"
              ></text>
            </view>
          </view>
          <text class="rating-text">{{ getRatingText(form.rating) }}</text>
        </view>

        <!-- 评价内容 -->
        <view class="form-group">
          <view class="form-label required">评价内容</view>
          <wd-textarea
            v-model="form.content"
            placeholder="请分享您的上课体验，帮助其他家长了解课程"
            :maxlength="500"
            show-word-limit
            :auto-height="true"
          />
        </view>

        <!-- 评价图片 -->
        <view class="form-group">
          <view class="form-label">评价图片</view>
          <FileUpload
            v-model="form.images"
            :limit="9"
            path-prefix="reviews"
            :is-public="true"
          />
        </view>
      </view>
    </view>

    <!-- 底部提交按钮 -->
    <PageFooter>
      <wd-button type="primary" block @click="handleSubmit">
        提交评价
      </wd-button>
    </PageFooter>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { reviewApi } from '@/api/review'
import FileUpload from '@/components/FileUpload/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

const orderId = ref('')
const courseId = ref('')

const form = reactive({
  rating: 5,
  content: '',
  images: [] as string[],
})

onLoad((options: any) => {
  if (options.orderId) {
    orderId.value = options.orderId
  }
  if (options.courseId) {
    courseId.value = options.courseId
  }
})

onMounted(() => {
  if (!courseId.value) {
    uni.showToast({
      title: '缺少课程ID',
      icon: 'none',
    })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  }
})

// 评分改变
const handleRatingChange = (star: number) => {
  form.rating = star
}

// 获取评分文案
const getRatingText = (rating: number) => {
  const textMap: Record<number, string> = {
    1: '非常不满意',
    2: '不满意',
    3: '一般',
    4: '满意',
    5: '非常满意',
  }
  return textMap[rating] || ''
}

// 提交评价
const handleSubmit = async () => {
  // 验证
  if (form.rating === 0) {
    uni.showToast({
      title: '请选择评分',
      icon: 'none',
    })
    return
  }

  if (!form.content.trim()) {
    uni.showToast({
      title: '请输入评价内容',
      icon: 'none',
    })
    return
  }

  if (form.content.trim().length < 10) {
    uni.showToast({
      title: '评价内容至少10个字',
      icon: 'none',
    })
    return
  }

  try {
    uni.showLoading({
      title: '提交中...',
    })

    await reviewApi.create({
      course_id: courseId.value,
      order_id: orderId.value || undefined,
      rating: form.rating,
      content: form.content.trim(),
      images: form.images.length > 0 ? form.images : undefined,
    })

    uni.hideLoading()

    uni.showToast({
      title: '评价成功',
      icon: 'success',
    })

    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({
      title: error.message || '提交失败',
      icon: 'none',
    })
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.container {
  padding: 24rpx 32rpx 180rpx;
}

.rating-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 32rpx 0;
  background-color: #f7f8fa;
  border-radius: 16rpx;
}

.star {
  transition: transform 0.2s;
  
  &:active {
    transform: scale(1.2);
  }
}

.rating-text {
  display: block;
  text-align: center;
  margin-top: 16rpx;
  font-size: 28rpx;
  color: $uni-text-color-secondary;
}
</style>
