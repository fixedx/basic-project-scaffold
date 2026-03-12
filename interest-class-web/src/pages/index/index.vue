<template>
  <view class="home-page">
    <!-- 自定义导航栏 (Fixed) -->
    <view 
      class="custom-navbar" 
      :style="{ 
        height: (config.navHeight + config.statusBarHeight) + 'px',
        paddingTop: config.statusBarHeight + 'px',
        paddingRight: config.menuButtonWidth + 'px'
      }"
    >
      <view class="navbar-content" :style="{ height: config.navHeight + 'px' }">
        <view class="city-entry">
          <text class="city-name">{{ currentCity || '定位中' }}</text>
        </view>
        <view class="navbar-search-box" @click="handleSearch">
          <text class="iconfont icon-search search-icon"></text>
          <text class="search-text">搜索课程、机构</text>
        </view>
      </view>
    </view>

    <!-- 导航栏占位符 (防止内容被遮挡) -->
    <view :style="{ height: (config.navHeight + config.statusBarHeight) + 'px' }"></view>

    <!-- 主内容区域 -->
    <view class="main-content">
      <!-- Banner 轮播 -->
      <view class="banner-wrapper" v-if="banners.length > 0">
        <swiper
          class="banner-swiper"
          :indicator-dots="true"
          :autoplay="true"
          :interval="4000"
          :circular="true"
          indicator-color="rgba(255, 255, 255, 0.4)"
          indicator-active-color="#fff"
        >
          <swiper-item
            v-for="banner in banners"
            :key="banner.id"
            class="banner-item"
            @click="handleBannerClick(banner)"
          >
            <view class="banner-image-wrapper">
              <AsyncImage
                :url="banner.image"
                width="100%"
                height="100%"
                mode="aspectFill"
                class="banner-image"
              />
            </view>
          </swiper-item>
        </swiper>
      </view>

      <!-- 系统公告 -->
      <view class="notice-bar" v-if="announcements.length > 0" @click="handleAnnouncementClick">
        <view class="notice-icon">
          <text class="iconfont icon-notice-fill"></text>
        </view>
        <swiper
          class="notice-swiper"
          :vertical="true"
          :autoplay="true"
          :interval="3500"
          :circular="true"
          :show-indicator-dots="false"
        >
          <swiper-item
            v-for="item in announcements"
            :key="item.id"
            class="notice-item"
          >
            <view class="notice-content">
              <view class="notice-type-tag" :class="item.type">
                {{ getAnnouncementTypeText(item.type) }}
              </view>
              <text class="notice-text">{{ item.title }}</text>
            </view>
          </swiper-item>
        </swiper>
        <text class="iconfont icon-right notice-arrow"></text>
      </view>

      <!-- 分类导航 -->
      <view class="section-card category-card">
        <view class="category-grid">
          <view
            v-for="category in categories"
            :key="category.code"
            class="category-item"
            @click="handleCategoryClick(category)"
          >
            <view class="icon-wrapper" :style="{ backgroundColor: category.bgColor }">
              <text class="iconfont" :class="category.iconClass" :style="{ color: category.iconColor }"></text>
            </view>
            <text class="category-name">{{ category.label }}</text>
          </view>
        </view>
      </view>

      <!-- 推荐机构 (横向滚动) -->
      <view class="section-container" v-if="institutions.length > 0">
        <view class="section-header">
          <view class="header-left">
            <text class="section-title">优质机构</text>
            <text class="section-subtitle">严选好课 放心学习</text>
          </view>
          <view class="header-more" @click="handleMoreInstitutions">
            <text>更多</text>
            <text class="iconfont icon-right"></text>
          </view>
        </view>
        
        <scroll-view class="institution-scroll" scroll-x :show-scrollbar="false">
          <view class="institution-list">
            <InstitutionCard
              v-for="institution in institutions"
              :key="institution.id"
              :institution="institution"
              mode="compact"
              @click="handleInstitutionClick"
            />
          </view>
        </scroll-view>
      </view>

      <!-- 推荐课程 (列表) -->
      <view class="section-container">
        <view class="section-header">
          <view class="header-left">
            <text class="section-title">热门课程</text>
            <text class="section-subtitle">猜你喜欢</text>
          </view>
        </view>
        
        <view class="course-list">
          <CourseCard
            v-for="course in courses"
            :key="course.id"
            :course="course"
            role="parent"
            :show-promo="course.type !== 'trial'"
            @click="handleCourseClick"
          />
        </view>

        <!-- 加载更多 -->
        <view class="load-more-status">
          <text v-if="loading">正在加载...</text>
          <text v-else-if="!hasMore && courses.length > 0">没有更多了</text>
          <view v-else-if="!loading && courses.length === 0" class="empty-box">
            <text class="iconfont icon-order" style="font-size: 80rpx; color: #ddd;"></text>
            <text>暂无课程数据</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部占位（为 tabbar 留空间） -->
    <view style="height: 120rpx;"></view>

    <!-- 自定义 TabBar -->
    <CustomTabbar />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app'
import { homeApi, type Course, type Institution, type Banner } from '@/api'
import { announcementApi, type Announcement } from '@/api/announcement'
import { showErrorToast } from '@/utils/toast'
import { formatDistance, getUserLocation } from '@/utils/distance'
import AsyncImage from '@/components/AsyncImage/index.vue'
import CustomTabbar from '@/components/CustomTabbar/index.vue'
import CourseCard from '@/components/CourseCard/index.vue'
import InstitutionCard from '@/components/InstitutionCard/index.vue'

// 导航栏配置
const config = reactive({
  statusBarHeight: 20,
  navHeight: 44, // 内容高度
  menuButtonWidth: 87, // 胶囊宽度预估
})

// 数据
const banners = ref<Banner[]>([])
const institutions = ref<Institution[]>([])
const courses = ref<Course[]>([])
const announcements = ref<Announcement[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const userLocation = ref<{ latitude: number; longitude: number } | null>(null)
const currentCity = ref('')

// 分类数据 (使用 iconfont)
// 配色方案：多彩柔和色系
const categories = [
  { code: 'art_painting', label: '美术绘画', iconClass: 'icon-picture-fill', iconColor: '#FF6B6B', bgColor: '#FFF0F0' },
  { code: 'music', label: '音乐', iconClass: 'icon-live-fill', iconColor: '#4ECDC4', bgColor: '#E6FCFA' },
  { code: 'dance', label: '舞蹈', iconClass: 'icon-honor-fill', iconColor: '#FFD93D', bgColor: '#FFFBE6' }, // Change to generic honor for stage
  { code: 'ball_sports', label: '球类运动', iconClass: 'icon-flag-fill', iconColor: '#95E1D3', bgColor: '#EAFFFA' },
  { code: 'swimming', label: '游泳', iconClass: 'icon-logistics-ocean-shipping-fill', iconColor: '#45B7D1', bgColor: '#E8F7FA' },
  { code: 'martial_arts', label: '武术', iconClass: 'icon-security-fill', iconColor: '#FF8B94', bgColor: '#FFF2F3' },
  { code: 'language', label: '语言培训', iconClass: 'icon-message-multi-language-fill', iconColor: '#A8D8EA', bgColor: '#F2FAFC' },
  { code: 'math', label: '数学思维', iconClass: 'icon-order-location-fill', iconColor: '#AA96DA', bgColor: '#F6F2FC' }, // Using location as generic geometry
]

// 是否还有更多
const hasMore = computed(() => courses.value.length < total.value)

// 初始化导航栏高度
const initNavbar = () => {
  const sysInfo = uni.getSystemInfoSync()
  config.statusBarHeight = sysInfo.statusBarHeight || 20
  
  // 处理小程序胶囊按钮
  // #ifdef MP-WEIXIN
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton) {
      const top = menuButton.top
      const height = menuButton.height
      // 导航栏内容高度 = (胶囊顶部 - 状态栏高度) * 2 + 胶囊高度
      // 并且通常加上一点底部padding
      config.navHeight = (top - config.statusBarHeight) * 2 + height
      config.menuButtonWidth = menuButton.width + 10 // 留出一点边距
    }
  } catch (e) {
    // console.error('获取胶囊信息失败', e)
  }
  // #endif
}

// 加载首页数据
const loadHomeData = async () => {
  loading.value = true
  try {
    userLocation.value = await getUserLocation()
    // 通过后端反向地理编码获取城市名（避免小程序域名白名单问题）
    if (userLocation.value) {
      homeApi.getCityByLocation({
        latitude: userLocation.value.latitude,
        longitude: userLocation.value.longitude,
      }).then(res => {
        if (res?.city) currentCity.value = res.city
      }).catch(() => {})
    }
    const data = await homeApi.getData({
      page: page.value,
      pageSize: pageSize.value,
      latitude: userLocation.value?.latitude,
      longitude: userLocation.value?.longitude,
    })
    
    banners.value = data.banners
    institutions.value = data.institutions.data
    courses.value = data.courses.data
    total.value = data.courses.total

    // 加载公告
    announcementApi.getActive().then(res => {
      announcements.value = Array.isArray(res) ? res : []
    }).catch(() => {})
  } catch (error) {
    // console.error(error)
    showErrorToast('加载失败')
  } finally {
    loading.value = false
  }
}

// 加载更多课程
const loadMoreCourses = async () => {
  if (loading.value || !hasMore.value) return
  
  page.value++
  loading.value = true
  
  try {
    const data = await homeApi.getRecommendedCourses({
      page: page.value,
      pageSize: pageSize.value,
      latitude: userLocation.value?.latitude,
      longitude: userLocation.value?.longitude,
    })
    
    courses.value.push(...data.data)
    total.value = data.total
  } catch (error) {
    showErrorToast('加载失败')
    page.value--
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  uni.navigateTo({ url: '/pages/search/index' })
}

const handleBannerClick = (banner: Banner) => {
  if (banner.link_type === 'course' && banner.link_target) {
    uni.navigateTo({ url: `/pages/course-detail/index?id=${banner.link_target}` })
  }
}

const handleCategoryClick = (category: any) => {
  uni.navigateTo({ url: `/pages/course-list/index?category=${category.code}` })
}

const handleInstitutionClick = (institution: Institution) => {
  uni.navigateTo({ url: `/pages/institution-detail/index?id=${institution.id}` })
}

const handleCourseClick = (course: Course) => {
  uni.navigateTo({ url: `/pages/course-detail/index?id=${course.id}` })
}

const handleMoreInstitutions = () => {
  uni.navigateTo({ url: '/pages/institution-list/index' })
}

const getAnnouncementTypeText = (type: string) => {
  const map: Record<string, string> = { notice: '通知', update: '更新', activity: '活动' }
  return map[type] || type
}

const handleAnnouncementClick = () => {
  // 可跳转到公告列表或详情，暂无独立页面则不跳转
}

onMounted(() => {
  initNavbar()
  loadHomeData()
})

onShow(() => {
  uni.hideTabBar({ animation: false })
})

onPullDownRefresh(async () => {
  page.value = 1
  await loadHomeData()
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  if (!loading.value && hasMore.value) {
    loadMoreCourses()
  }
})
</script>

<style lang="scss" scoped>
/* 页面容器 */
.home-page {
  min-height: 100vh;
  background-color: #F7F8FA; // 浅灰背景
  box-sizing: border-box;
  padding-bottom: 150rpx;
}

/* 自定义导航栏 */
.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #F7F8FA; // 与背景同色
  box-sizing: border-box;
}

.navbar-content {
  display: flex;
  align-items: center;
  padding: 0 32rpx;
  
  .city-entry {
    display: flex;
    align-items: center;
    margin-right: 20rpx;
    flex-shrink: 0;

    .city-name {
      font-size: 28rpx;
      font-weight: 600;
      color: $uni-text-color;
      max-width: 120rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .city-arrow {
      font-size: 20rpx;
      color: $uni-text-color-tertiary;
      margin-left: 4rpx;
    }
  }

  .navbar-search-box {
    flex: 1;
    background-color: #FFFFFF;
    height: 64rpx;
    border-radius: 32rpx;
    display: flex;
    align-items: center;
    padding: 0 24rpx;
    border: 1rpx solid rgba(0,0,0,0.03);
    
    .search-icon {
      font-size: 32rpx;
      color: #999;
      margin-right: 12rpx;
    }
    
    .search-text {
      font-size: 26rpx;
      color: #999;
    }
  }
}

/* 主内容区 */
.main-content {
  padding: 12rpx 24rpx;
}

/* Banner */
.banner-wrapper {
  margin-bottom: 32rpx;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(82, 196, 26, 0.15); // 给一点主题色的投影
}

.banner-swiper {
  height: 320rpx;
  background-color: #fff;
}

.banner-image-wrapper {
  width: 100%;
  height: 100%;
}

.banner-image {
  width: 100%;
  height: 100%;
}

/* 公告通知栏 */
.notice-bar {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #FFF7E6, #FFFBE6);
  border-radius: 16rpx;
  padding: 12rpx 20rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid #FFE58F;
}

.notice-icon {
  flex-shrink: 0;
  margin-right: 12rpx;

  .iconfont {
    font-size: 32rpx;
    color: $uni-color-warning;
  }
}

.notice-swiper {
  flex: 1;
  height: 56rpx;
}

.notice-item {
  display: flex;
  align-items: center;
  height: 56rpx;
}

.notice-content {
  display: flex;
  align-items: center;
  gap: 12rpx;
  width: 100%;
}

.notice-type-tag {
  flex-shrink: 0;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
  font-weight: 500;

  &.notice {
    background-color: #e6f7ff;
    color: #1890ff;
  }

  &.update {
    background-color: #f6ffed;
    color: $uni-color-success;
  }

  &.activity {
    background-color: #fff0f6;
    color: #eb2f96;
  }
}

.notice-text {
  font-size: 26rpx;
  color: $uni-text-color;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.notice-arrow {
  flex-shrink: 0;
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
  margin-left: 8rpx;
}

/* 通用卡片样式 */
.section-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.02);
}

.category-card {
  padding: 32rpx 16rpx; // 左右边距小一点
}

/* 分类 Grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  row-gap: 32rpx;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.icon-wrapper {
  width: 96rpx;
  height: 96rpx;
  border-radius: 32rpx; // 方圆
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s;
  
  &:active {
    transform: scale(0.95);
  }
  
  .iconfont {
    font-size: 48rpx;
  }
}

.category-name {
  font-size: 24rpx;
  color: #333;
  font-weight: 500;
}

/* 通用 Header */
.section-container {
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24rpx;
  padding: 0 8rpx;
  
  .header-left {
    display: flex;
    align-items: baseline;
    gap: 16rpx;
    
    .section-title {
      font-size: 36rpx;
      font-weight: 800;
      color: #333;
    }
    
    .section-subtitle {
      font-size: 24rpx;
      color: #999;
    }
  }
  
  .header-more {
    display: flex;
    align-items: center;
    font-size: 24rpx;
    color: #666;
    padding: 8rpx 16rpx;
    background: #fff;
    border-radius: 20rpx;
    
    .iconfont {
      font-size: 20rpx;
      margin-left: 4rpx;
    }
  }
}

/* 机构列表 */
.institution-scroll {
  white-space: nowrap;
  width: 100%;
}

.institution-list {
  display: inline-flex;
  gap: 20rpx;
  padding-bottom: 16rpx;
  padding-right: 24rpx;
}

/* 课程列表 */
.course-list {
  display: flex;
  flex-direction: column;
}

.load-more-status {
  padding: 32rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: #999;
  
  .empty-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
    padding: 60rpx 0;
  }
}
</style>
