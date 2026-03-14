<template>
  <view class="course-detail-page">
    <!-- 加载状态 -->
    <view class="loading" v-if="loading">
      <Loading size="48rpx" />
    </view>

    <!-- 课程详情 -->
    <view v-else-if="course">
      <!-- 信息卡片 Info Section -->
      <view class="info-section">
        <view class="info-card">
          <view class="card-header">
            <view class="title-row">
              <text class="title">{{ course.title }}</text>
            </view>
            <view class="subtitle-row" v-if="course.subtitle">
              <text class="subtitle">{{ course.subtitle }}</text>
            </view>
            
            <!-- 标签行 -->
            <view class="tags-row">
              <view class="tag-item type-tag">
                {{ course.type === 'standard' ? '正式课' : '试听课' }}
              </view>
              <view class="tag-item mode-tag">
                {{ course.is_online ? '在线授课' : '线下授课' }}
              </view>
              <view 
                v-for="tag in course.tags?.slice(0, 3)" 
                :key="tag" 
                class="tag-item"
              >
                {{ tag }}
              </view>
            </view>

            <!-- 价格和返现 -->
            <view class="price-row" v-if="selectedSku">
              <view class="price-box">
                <text class="currency">¥</text>
                <text class="amount">{{ selectedSku.display_price ?? selectedSku.total_price }}</text>
                <text class="qi">起</text>
                <text class="unit">/ {{ selectedSku.total_lessons }}节</text>
              </view>
              <view class="cashback-tags" v-if="skuCashbackAmount > 0">
                <text class="cashback-tag orange" v-if="skuDiscountAmount > 0">
                  最高立减¥{{ skuDiscountAmount }}
                </text>
                <text class="cashback-tag">
                  最高返现¥{{ skuCashbackAmount }}
                </text>
              </view>
            </view>

            <!-- 基础信息 -->
            <view class="meta-grid">
              <view class="meta-item">
                <text class="meta-label">适合年龄</text>
                <text class="meta-value">{{ course.min_age || 0 }}-{{ course.max_age || 99 }}岁</text>
              </view>
              <view class="meta-item">
                <text class="meta-label">课程时长</text>
                <text class="meta-value">{{ course.lesson_duration }}分钟/节</text>
              </view>
              <view class="meta-item">
                <text class="meta-label">包含课时</text>
                <text class="meta-value">{{ selectedSku?.total_lessons || 0 }}节</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 价格套餐 SKU Selection -->
        <view class="section-card" v-if="course.skus && course.skus.length > 0">
          <view class="section-header">
            <text class="section-title">课程套餐</text>
          </view>
          <scroll-view scroll-x class="sku-scroll">
            <view class="sku-list">
              <view
                v-for="sku in course.skus"
                :key="sku.id"
                class="sku-item"
                :class="{ 'sku-active': selectedSku?.id === sku.id }"
                @click="selectSku(sku)"
              >
                <view class="sku-name">{{ sku.name }}</view>
                <view class="sku-detail">
                  <text class="sku-price">¥{{ sku.display_price ?? sku.total_price }}</text>
                  <text class="sku-lessons">{{ sku.total_lessons }}节</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 机构入口 -->
        <view class="section-card" v-if="course.institution">
          <view class="section-header">
            <text class="section-title">所属机构</text>
          </view>
          <InstitutionCard
            :institution="course.institution"
            mode="full"
            :show-rating="true"
            :show-tags="true"
            :show-address="true"
            :show-promo="false"
            @click="handleInstitutionClick"
          />
        </view>

        <!-- 课程介绍 -->
        <view class="section-card" v-if="course.description">
          <view class="section-header">
            <text class="section-title">课程介绍</text>
          </view>
          <view class="content-body">
            <text class="rich-text">{{ course.description }}</text>
          </view>
        </view>

        <!-- 教师团队 -->
        <view class="section-card" v-if="course.teachers && course.teachers.length > 0">
          <view class="section-header">
            <text class="section-title">教师团队</text>
          </view>
          <scroll-view scroll-x class="teacher-scroll">
            <view class="teacher-list">
              <view
                v-for="teacher in course.teachers"
                :key="teacher.id"
                class="teacher-card"
                @click="handleTeacherClick(teacher)"
              >
                <AsyncImage
                  :url="teacher.photo || '/static/default-avatar.png'"
                  width="100rpx"
                  height="100rpx"
                  mode="aspectFill"
                  custom-class="teacher-avatar-img"
                />
                <text class="teacher-name">{{ teacher.name }}</text>
                <text class="teacher-title">{{ teacher.title || '教师' }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
        
        <!-- 学员评价 -->
        <view class="section-card">
          <view class="section-header" @click="handleViewMoreReviews">
            <text class="section-title">学员评价 <text class="count" v-if="reviewsTotal">({{ reviewsTotal }})</text></text>
            <view class="header-right">
              <text class="more-text">查看全部</text>
              <text class="iconfont icon-right"></text>
            </view>
          </view>
          
          <view class="review-list" v-if="reviews.length > 0">
            <view class="review-item" v-for="review in reviews.slice(0, 2)" :key="review.id">
              <view class="review-header">
                <view class="user-info">
                  <AsyncImage 
                    :url="'/static/default-avatar.png'" 
                    width="48rpx" 
                    height="48rpx" 
                    :radius="24"
                  />
                  <text class="user-name">{{ review.user_id?.substring(0, 8) || '用户' }}***</text>
                </view>
                <view class="rating-stars">
                  <text v-for="n in 5" :key="n" class="star" :class="{ active: n <= review.rating }">★</text>
                </view>
              </view>
              <view class="review-content">{{ review.content }}</view>
            </view>
          </view>
          <view class="empty-state" v-else>
            <text>暂无评价</text>
          </view>
        </view>

        <!-- 购课须知 -->
        <view class="section-card">
          <view class="section-header">
            <text class="section-title">购课须知</text>
          </view>

          <!-- 🎁 邀友返现活动横幅 -->
          <view class="cashback-banner" @click="goToInvite()">
            <view class="cashback-banner__left">
              <view class="cashback-banner__tag">限时活动</view>
              <text class="cashback-banner__title">邀友购课，被邀请人立减·邀请人返现</text>
              <text class="cashback-banner__desc">分享专属邀请码给好友，好友购课立即享受立减优惠，你按好友完课进度解锁返现，满50元随时可提现。</text>
            </view>
            <view class="cashback-banner__right">
              <text class="cashback-banner__amount">最高</text>
              <text class="cashback-banner__percent">15%</text>
              <text class="cashback-banner__unit">返现</text>
              <text class="iconfont icon-right cashback-banner__arrow"></text>
            </view>
          </view>

          <!-- 须知列表 -->
          <view class="notice-list">
            <view class="notice-item">
              <text class="iconfont icon-calendar notice-icon" style="color: #597ef7;"></text>
              <view class="notice-body">
                <text class="notice-label">预约规则</text>
                <text class="notice-text">下单时即选定上课时段，订单确认后预约自动生效并出现在课表中；如需调整时段，课前 24 小时以上可直接修改，24 小时内需机构审核</text>
              </view>
            </view>
            <view class="notice-item">
              <text class="iconfont icon-confirm notice-icon" style="color: #52c41a;"></text>
              <view class="notice-body">
                <text class="notice-label">签到规则</text>
                <text class="notice-text">每次上课须在 App 内签到，签到后自动扣除一节课时并记录上课进度</text>
              </view>
            </view>
            <view class="notice-item">
              <text class="iconfont icon-money-rmb notice-icon" style="color: #fa8c16;"></text>
              <view class="notice-body">
                <text class="notice-label">退款规则</text>
                <text class="notice-text">订单确认后可申请退款，退款金额按剩余未上课时比例退还；课时已全部消耗不支持退款</text>
              </view>
            </view>
            <view class="notice-item">
              <text class="iconfont icon-order notice-icon" style="color: #1890ff;"></text>
              <view class="notice-body">
                <text class="notice-label">课时查询</text>
                <text class="notice-text">可在「我的订单」中实时查看剩余课时、签到记录及返现进度</text>
              </view>
            </view>
            <view class="notice-item">
              <text class="iconfont icon-smile notice-icon" style="color: #ff7a45;"></text>
              <view class="notice-body">
                <text class="notice-label">宝贝信息</text>
                <text class="notice-text">下单时请选择正确的宝贝信息，提交后不可更改，请仔细核对</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <PageFooter>
        <view class="footer-bar">
          <view class="action-icons">
            <button class="icon-btn share-btn-footer" open-type="share">
              <view class="icon-wrapper">
                <text class="iconfont icon-share"></text>
              </view>
              <text>分享</text>
            </button>
            <view class="icon-btn" @click="handleFavorite">
              <view class="icon-wrapper">
                <text 
                  class="iconfont" 
                  :class="isFavorited ? 'icon-favorites-fill' : 'icon-favorites'"
                  :style="{ color: isFavorited ? '#f5222d' : '' }"
                ></text>
              </view>
              <text>{{ isFavorited ? '已收藏' : '收藏' }}</text>
            </view>
          </view>
          
          <view class="action-buttons">
            <wd-button 
              type="primary" 
              block 
              custom-class="buy-button"
              @click="handleReserve"
            >
              {{ course.type === 'trial' ? '立即预约' : '立即报名' }}
            </wd-button>
          </view>
        </view>
      </PageFooter>
    </view>

    <!-- 错误状态 -->
    <view class="error-state" v-else>
      <text class="iconfont icon-warning"></text>
      <text class="error-text">课程不存在</text>
      <wd-button type="primary" size="small" @click="handleBack">返回</wd-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import { courseApi, reviewApi, type Course, type CourseSku, type Review } from '@/api'
import { favoriteApi } from '@/api/favorite'
import { showErrorToast, showSuccessToast } from '@/utils/toast'
import { getToken } from '@/utils/request'
import AsyncImage from '@/components/AsyncImage/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import Loading from '@/components/Loading/index.vue'
import InstitutionCard from '@/components/InstitutionCard/index.vue'

const courseId = ref('')
const course = ref<Course | null>(null)
const selectedSku = ref<CourseSku | null>(null)
const loading = ref(false)
const isFavorited = ref(false)

// 导航栏透明度控制

const handleBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.reLaunch({ url: '/pages/index/index' })
  }
}

// 评价相关
const reviews = ref<Review[]>([])
const reviewsTotal = ref(0)

// 计算属性：当前选中SKU的最高返现金额
// 直接使用后端 findOne 已计算好的 max_cashback_amount（基于最高价格SKU × 课程返现比例）
// 避免在前端重复逻辑且绕过 cashback_enabled 默认 false 的陷阱
const skuCashbackAmount = computed(() => {
  if (!course.value || !selectedSku.value) return 0
  return Number((course.value as any).max_cashback_amount) || 0
})

// 计算属性：当前选中SKU的最高立减金额
// 直接使用后端 findOne 已计算好的 max_discount_amount
const skuDiscountAmount = computed(() => {
  if (!course.value || !selectedSku.value) return 0
  return Number((course.value as any).max_discount_amount) || 0
})

// 加载课程详情
const loadCourseDetail = async () => {
  if (!courseId.value) return
  
  loading.value = true
  try {
    const data = await courseApi.getDetail(courseId.value)
    course.value = data
    
    // 默认选中第一个 SKU
    if (data.skus && data.skus.length > 0) {
      selectedSku.value = data.skus[0]
    }
    
    // 加载评价
    await loadReviews()
  } catch (error) {
    showErrorToast('加载失败')
  } finally {
    loading.value = false
  }
}

// 加载课程评价（高分前5条）
const loadReviews = async () => {
  try {
    const result = await reviewApi.getCourseTopReviews(courseId.value, 5)
    reviews.value = result.data || []
    reviewsTotal.value = result.total || 0
  } catch (error) {
    console.error('加载评价失败:', error)
  }
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 跳转邀请页
const goToInvite = () => {
  goToInvite()
}

// 查看更多评价
const handleViewMoreReviews = () => {
  uni.navigateTo({
    url: `/pages/review-list/index?courseId=${courseId.value}`
  })
}

// 选择套餐
const selectSku = (sku: CourseSku) => {
  selectedSku.value = sku
}

// 格式化返现信息
const formatCashback = (sku: CourseSku) => {
  if (sku.cashback_type === 'percentage') {
    return `${sku.cashback_value}%`
  } else if (sku.cashback_type === 'fixed') {
    return `¥${sku.cashback_value}`
  }
  return '无返现'
}

// 点击机构
const handleInstitutionClick = (inst?: any) => {
  const institutionId = inst?.id || course.value?.institution?.id
  if (institutionId) {
    uni.navigateTo({
      url: `/pages/institution-detail/index?id=${institutionId}`,
    })
  }
}

// 点击教师
const handleTeacherClick = (teacher: any) => {
  uni.navigateTo({
    url: `/pages/teacher-detail/index?id=${teacher.id}`,
  })
}

// 收藏
const handleFavorite = async () => {
  if (!getToken()) {
    uni.navigateTo({
      url: `/pages/login/index?from=${encodeURIComponent(`/pages/course-detail/index?id=${courseId.value}`)}`,
    })
    return
  }
  try {
    const res = await favoriteApi.toggle({
      target_type: 'course',
      target_id: courseId.value,
    })
    isFavorited.value = res.isFavorited
    showSuccessToast(res.isFavorited ? '已收藏' : '已取消收藏')
  } catch (error) {
    console.error('收藏操作失败:', error)
  }
}

// 检查收藏状态
const checkFavoriteStatus = async () => {
  if (!getToken() || !courseId.value) return
  try {
    const res = await favoriteApi.checkFavorite('course', courseId.value)
    isFavorited.value = res.isFavorited
  } catch (error) {
    console.error('检查收藏状态失败:', error)
  }
}

// 报名/预约
const handleReserve = () => {
  if (!selectedSku.value) {
    showErrorToast('请选择套餐')
    return
  }
  
  // 检查登录状态
  const token = uni.getStorageSync('auth_token')
  if (!token) {
    // 未登录，跳转到登录页，带上来源页面
    const currentUrl = `/pages/booking-form/index?courseId=${courseId.value}&skuId=${selectedSku.value.id}`
    uni.navigateTo({
      url: `/pages/login/index?from=${encodeURIComponent(currentUrl)}`
    })
    return
  }
  
  // 已登录，跳转到预约报名页面
  uni.navigateTo({
    url: `/pages/booking-form/index?courseId=${courseId.value}&skuId=${selectedSku.value.id}`,
  })
}

onLoad((options) => {
  if (options?.id) {
    courseId.value = options.id
  }
})

// 分享给好友
onShareAppMessage(() => {
  return {
    title: course.value?.title || '精彩课程推荐',
    path: `/pages/course-detail/index?id=${courseId.value}`
  }
})

onMounted(() => {
  loadCourseDetail()
  checkFavoriteStatus()
})
</script>

<style lang="scss" scoped>
.course-detail-page {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: env(safe-area-inset-bottom);
}

// 导航栏
.custom-navbar {
  display: none; // Hiding instead of removing to avoid context matching issues, effectively removed
}

// 信息部分
.info-section {
  position: relative;
  z-index: 10;
  padding: 24rpx 24rpx 180rpx;
}

.info-card {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.title-row {
  margin-bottom: 12rpx;
  .title {
    font-size: 40rpx;
    font-weight: bold;
    color: #333;
    line-height: 1.4;
  }
}

.subtitle-row {
  margin-bottom: 24rpx;
  .subtitle {
    font-size: 28rpx;
    color: #666;
    line-height: 1.5;
  }
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.tag-item {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  background-color: #f5f5f5;
  color: #666;

  &.type-tag {
    background-color: #e6f7ff;
    color: #1890ff;
  }

  &.mode-tag {
    background-color: #f6ffed;
    color: #52c41a;
  }
}

.price-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 32rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.price-box {
  display: flex;
  align-items: baseline;
  color: #ff4d4f;
  
  .currency {
    font-size: 28rpx;
    font-weight: bold;
    margin-right: 4rpx;
  }

  .amount {
    font-size: 48rpx;
    font-weight: bold;
    font-family: DINAlternate-Bold, sans-serif;
  }

  .qi {
    font-size: 24rpx;
    font-weight: bold;
    color: #ff4d4f;
    margin-left: 4rpx;
    margin-right: 4rpx;
  }

  .unit {
    font-size: 24rpx;
    color: #999;
    font-weight: normal;
    margin-left: 8rpx;
  }
}

.cashback-tags {
  display: flex;
  gap: 16rpx;
}

.cashback-tag {
  font-size: 22rpx;
  color: #ff4d4f;
  background-color: #fff1f0;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  border: 1rpx solid #ffccc7;

  &.orange {
    color: #fa8c16;
    background-color: #fff7e6;
    border-color: #ffd591;
  }
}

.meta-grid {
  display: flex;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  padding: 24rpx;
}

.meta-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  position: relative;

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 20%;
    height: 60%;
    width: 1rpx;
    background-color: #e8e8e8;
  }

  .meta-label {
    font-size: 24rpx;
    color: #999;
  }

  .meta-value {
    font-size: 28rpx;
    color: #333;
    font-weight: 500;
  }
}

// 通用卡片样式
.section-card {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  position: relative;
  padding-left: 20rpx;

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

  .count {
    font-size: 24rpx;
    font-weight: normal;
    color: #999;
    margin-left: 8rpx;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 4rpx;
  
  .more-text {
    font-size: 24rpx;
    color: #999;
  }
  
  .iconfont {
    font-size: 24rpx;
    color: #ccc;
  }
}

// SKU 列表
.sku-scroll {
  white-space: nowrap;
  margin: 0 -32rpx;
  padding: 0 32rpx;
}

.sku-list {
  display: inline-flex;
  gap: 20rpx;
}

.sku-item {
  width: 280rpx;
  background-color: #fff;
  border: 2rpx solid #efefef;
  border-radius: 16rpx;
  padding: 24rpx;
  transition: all 0.3s;
  white-space: normal;

  &.sku-active {
    background-color: #f6ffed;
    border-color: #52c41a;
    box-shadow: 0 4rpx 12rpx rgba(82, 196, 26, 0.1);
  }

  .sku-name {
    font-size: 28rpx;
    color: #333;
    font-weight: 500;
    margin-bottom: 16rpx;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    height: 40rpx;
  }

  .sku-detail {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    
    .sku-price {
      font-size: 32rpx;
      font-weight: bold;
      color: #ff4d4f;
    }
    
    .sku-lessons {
      font-size: 24rpx;
      color: #999;
    }
  }
}

// 机构入口
// 课程详情
.rich-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
  text-align: justify;
}

// 教师列表
.teacher-scroll {
  white-space: nowrap;
  
}

.teacher-list {
  display: inline-flex;
  gap: 32rpx;
}

.teacher-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  width: 140rpx;
  flex-shrink: 0; // Prevent shrinking

  :deep(.teacher-avatar-img) {
    border-radius: 50%;
    overflow: hidden;
    border: 2rpx solid #fff;
    box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
    
    .async-image__img {
      border-radius: 50%;
    }
  }
}

.teacher-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #333;
}

.teacher-title {
  font-size: 22rpx;
  color: #999;
  background-color: #f5f5f5;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

// 评价样式
.review-item {
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
  margin-bottom: 24rpx;
  
  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 12rpx;
    
    .user-name {
      font-size: 26rpx;
      color: #666;
    }
  }
  
  .rating-stars {
    display: flex;
    gap: 4rpx;
    
    .star {
      font-size: 24rpx;
      color: #eee;
      &.active {
        color: #ffc107;
      }
    }
  }
}

.review-content {
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.empty-state {
  text-align: center;
  padding: 32rpx 0;
  color: #999;
  font-size: 28rpx;
}

// 须知
.notice-list {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
  margin-top: 24rpx;
}

.notice-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.notice-icon {
  font-size: 36rpx;
  line-height: 1.4;
  flex-shrink: 0;
  margin-top: 2rpx;
}

.notice-body {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  flex: 1;
}

.notice-label {
  font-size: 28rpx;
  font-weight: 600;
  color: $uni-text-color;
}

.notice-text {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  line-height: 1.6;
}

// 邀友返现活动横幅
.cashback-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  border: 2rpx solid $uni-color-primary-lighter;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 8rpx;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -20rpx;
    right: 80rpx;
    width: 120rpx;
    height: 120rpx;
    background: rgba(82, 196, 26, 0.08);
    border-radius: 50%;
  }

  &__left {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    padding-right: 20rpx;
  }

  &__tag {
    display: inline-flex;
    align-self: flex-start;
    padding: 4rpx 16rpx;
    background-color: $uni-color-primary;
    color: #fff;
    font-size: 20rpx;
    font-weight: 600;
    border-radius: 20rpx;
    letter-spacing: 1rpx;
  }

  &__title {
    font-size: 30rpx;
    font-weight: bold;
    color: $uni-color-primary-dark;
  }

  &__desc {
    font-size: 24rpx;
    color: $uni-text-color-secondary;
    line-height: 1.6;
  }

  &__right {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }

  &__amount {
    font-size: 22rpx;
    color: $uni-color-primary-dark;
  }

  &__percent {
    font-size: 52rpx;
    font-weight: bold;
    color: $uni-color-primary;
    line-height: 1.1;
  }

  &__unit {
    font-size: 22rpx;
    color: $uni-color-primary-dark;
  }

  &__arrow {
    font-size: 24rpx;
    color: $uni-color-primary;
    margin-top: 8rpx;
  }
}

// 底部栏
.footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 24rpx;
}

.action-icons {
  display: flex;
  gap: 40rpx;
  padding-right: 20rpx;
}

.icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: #666;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  line-height: 1.2;
  
  &::after {
    border: none;
  }
  
  .icon-wrapper {
    position: relative;
    .iconfont {
      font-size: 40rpx;
      color: #333;
      font-weight: bold;
    }
  }
}

// 微信小程序 button 样式重置
.share-btn-footer {
  background: none !important;
  border: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  line-height: 1.2 !important;
  font-size: 22rpx !important;
  color: #666 !important;
  
  &::after {
    border: none !important;
    display: none !important;
  }
}

.action-buttons {
  flex: 1;
}

:deep(.buy-button) {
  width: 100% !important;
  border-radius: 44rpx !important;
  background: linear-gradient(135deg, #52c41a, #73d13d) !important;
  border: none !important;
  box-shadow: 0 8rpx 16rpx rgba(82, 196, 26, 0.3);
}

.loading, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 20rpx;
}

.error-text {
  color: #999;
  font-size: 28rpx;
}
</style>
