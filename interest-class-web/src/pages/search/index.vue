<template>
  <view class="search-page">
    <!-- 自定义导航栏 -->
    <view 
      class="custom-navbar" 
      :style="{ 
        paddingTop: navConfig.statusBarHeight + 'px',
        paddingRight: (navConfig.menuButtonWidth + 8) + 'px'
      }"
    >
      <view class="navbar-content" :style="{ height: navConfig.navHeight + 'px' }">
        <view class="back-btn" @click="handleBack">
          <text class="iconfont icon-left"></text>
        </view>
        <view class="navbar-search-box">
          <text class="iconfont icon-search search-icon"></text>
          <input
            ref="searchInput"
            v-model="keyword"
            class="search-input"
            placeholder="搜索课程、机构"
            confirm-type="search"
            :focus="true"
            @confirm="handleSearch"
          />
          <text 
            v-if="keyword" 
            class="iconfont icon-close clear-icon" 
            @click="clearSearch"
          ></text>
        </view>
      </view>
    </view>

    <!-- 导航栏占位 -->
    <view :style="{ height: (navConfig.navHeight + navConfig.statusBarHeight + 10) + 'px' }"></view>

    <!-- 搜索结果 -->
    <view class="result-container" v-if="hasSearched">
      <!-- 机构结果 -->
      <view class="result-section" v-if="institutions.length > 0">
        <view class="section-header">
          <text class="section-title">机构</text>
          <view class="section-more" v-if="institutionTotal > 3" @click="goToInstitutionList">
            <text>查看全部{{ institutionTotal }}个</text>
            <text class="iconfont icon-right"></text>
          </view>
        </view>

        <InstitutionCard
          v-for="item in institutions"
          :key="item.id"
          :institution="item"
          mode="full"
          :show-rating="true"
          :show-tags="true"
          :show-address="true"
          :show-promo="false"
          @click="goToInstitutionDetail"
          style="margin-bottom: 16rpx;"
        />
      </view>

      <!-- 课程结果 -->
      <view class="result-section" v-if="courses.length > 0">
        <view class="section-header">
          <text class="section-title">课程</text>
          <view class="section-more" v-if="courseTotal > 5" @click="goToCourseList">
            <text>查看全部{{ courseTotal }}个</text>
            <text class="iconfont icon-right"></text>
          </view>
        </view>

        <CourseCard
          v-for="course in courses"
          :key="course.id"
          :course="course"
          role="parent"
          :show-promo="true"
          @click="goToCourseDetail"
        />
      </view>

      <!-- 全部为空 -->
      <EmptyState 
        v-if="institutions.length === 0 && courses.length === 0 && !loading"
        icon="icon-search" 
        :text="`未找到“${keyword}”相关结果`" 
      />
    </view>

    <!-- 未搜索状态 -->
    <view class="initial-state" v-else>
      <view class="hot-section" v-if="hotKeywords.length > 0">
        <text class="hot-title">热门搜索</text>
        <view class="hot-tags">
          <view 
            class="hot-tag" 
            v-for="(kw, idx) in hotKeywords" 
            :key="idx"
            @click="quickSearch(kw)"
          >
            {{ kw }}
          </view>
        </view>
      </view>
    </view>

    <!-- 加载遮罩 -->
    <view class="loading-overlay" v-if="loading">
      <wd-loading color="#52c41a" />
      <text class="loading-text">搜索中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { institutionApi } from '@/api/institution'
import { courseApi } from '@/api/course'
import type { Institution } from '@/api/institution'
import type { CourseInfo } from '@/api/course'
import CourseCard from '@/components/CourseCard/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import { useEnums } from '@/composables/useEnums'
import { getUserLocation } from '@/utils/distance'

const { loadEnumsByTypes, getEnumLabel, ENUM_TYPES } = useEnums()

// 导航栏配置
const navConfig = reactive({
  statusBarHeight: 20,
  navHeight: 44,
  menuButtonWidth: 96,
})

const initNavbar = () => {
  const sysInfo = uni.getSystemInfoSync()
  navConfig.statusBarHeight = sysInfo.statusBarHeight || 20
  // #ifdef MP-WEIXIN
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton) {
      navConfig.navHeight = (menuButton.top - navConfig.statusBarHeight) * 2 + menuButton.height
      navConfig.menuButtonWidth = menuButton.width + 12
    }
  } catch (e) {
    navConfig.menuButtonWidth = 96
  }
  // #endif
}

const keyword = ref('')
const hasSearched = ref(false)
const loading = ref(false)
const userLocation = ref<{ latitude: number; longitude: number } | null>(null)

// 机构结果
const institutions = ref<Institution[]>([])
const institutionTotal = ref(0)

// 课程结果
const courses = ref<CourseInfo[]>([])
const courseTotal = ref(0)

// 热门搜索词
const hotKeywords = ref<string[]>(['美术', '舞蹈', '钢琴', '篮球', '游泳', '书法', '编程', '英语'])

const handleBack = () => {
  uni.navigateBack()
}

/**
 * 执行搜索
 */
const handleSearch = async () => {
  const kw = keyword.value.trim()
  if (!kw) {
    uni.showToast({ title: '请输入搜索关键词', icon: 'none' })
    return
  }

  loading.value = true
  hasSearched.value = true

  try {
    // 同时搜索机构和课程
    const [instRes, courseRes] = await Promise.all([
      institutionApi.getList({
        keyword: kw,
        page: 1,
        pageSize: 3,
        latitude: userLocation.value?.latitude,
        longitude: userLocation.value?.longitude,
      }),
      courseApi.getList({ keyword: kw, is_online: true, page: 1, pageSize: 5 }),
    ])

    institutions.value = (instRes?.data || []) as unknown as Institution[]
    institutionTotal.value = instRes?.total || 0

    const courseData = courseRes as any
    courses.value = (courseData?.data || []) as CourseInfo[]
    courseTotal.value = courseData?.total || 0
  } catch (e) {
    console.error('搜索失败:', e)
    uni.showToast({ title: '搜索失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const clearSearch = () => {
  keyword.value = ''
  hasSearched.value = false
  institutions.value = []
  courses.value = []
}

const quickSearch = (kw: string) => {
  keyword.value = kw
  handleSearch()
}

const goToInstitutionDetail = (inst: any) => {
  const id = inst?.id || inst
  uni.navigateTo({ url: `/pages/institution-detail/index?id=${id}` })
}

const goToCourseDetail = (course: any) => {
  uni.navigateTo({ url: `/pages/course-detail/index?id=${course.id}` })
}

const goToInstitutionList = () => {
  uni.navigateTo({ url: `/pages/institution-list/index?keyword=${keyword.value}` })
}

const goToCourseList = () => {
  uni.navigateTo({ url: `/pages/course-list/index?keyword=${keyword.value}` })
}

onMounted(async () => {
  initNavbar()
  loadEnumsByTypes([ENUM_TYPES.INSTITUTION_TAG])
  userLocation.value = await getUserLocation()
})
</script>

<style lang="scss" scoped>
.search-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

/* ====== 导航栏 ====== */
.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
  padding-bottom: 8px;
}

.navbar-content {
  display: flex;
  align-items: center;
  padding: 0 24rpx;
}

.back-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  .iconfont {
    font-size: 40rpx;
    color: #333;
  }
}

.navbar-search-box {
  flex: 1;
  height: 64rpx;
  background-color: #F5F6F8;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  margin: 0 16rpx;

  .search-icon {
    font-size: 28rpx;
    color: #999;
    margin-right: 12rpx;
  }

  .search-input {
    flex: 1;
    font-size: 28rpx;
    color: #333;
  }

  .clear-icon {
    font-size: 28rpx;
    color: #ccc;
    padding: 10rpx;
  }
}

/* ====== 搜索结果 ====== */
.result-container {
  padding: 24rpx;
}

.result-section {
  margin-bottom: 32rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
}

.section-more {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: $uni-text-color-tertiary;

  .iconfont {
    font-size: 24rpx;
    margin-left: 4rpx;
  }
}

/* ====== 初始状态（热门搜索） ====== */
.initial-state {
  padding: 32rpx;
}

.hot-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
}

.hot-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $uni-text-color;
  margin-bottom: 24rpx;
  display: block;
}

.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.hot-tag {
  padding: 12rpx 28rpx;
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  background: $uni-bg-color-grey;
  border-radius: 32rpx;

  &:active {
    background: $uni-color-primary-lighter;
    color: $uni-color-primary;
  }
}

/* ====== 加载遮罩 ====== */
.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  gap: 16rpx;
}

.loading-text {
  font-size: 26rpx;
  color: $uni-text-color-tertiary;
}
</style>
