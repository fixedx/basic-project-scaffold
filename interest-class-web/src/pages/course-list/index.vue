<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view 
      class="custom-navbar" 
      :style="{ 
        height: (config.navHeight + config.statusBarHeight) + 'px',
        paddingTop: config.statusBarHeight + 'px',
        paddingRight: config.menuButtonWidth + 'px'
      }"
    >
      <view class="navbar-content" :style="{ height: config.navHeight + 'px' }">
        <view class="back-btn" @click="handleBack">
          <text class="iconfont icon-left"></text>
        </view>
        <view class="navbar-search-box">
          <text class="iconfont icon-search search-icon"></text>
          <input
            v-model="searchKeyword"
            class="search-input"
            placeholder="搜索课程名称"
            confirm-type="search"
            @confirm="handleSearch"
          />
          <text 
            v-if="searchKeyword" 
            class="iconfont icon-close clear-icon" 
            @click="clearSearch"
          ></text>
        </view>
      </view>
    </view>

    <!-- 导航栏占位符 -->
    <view :style="{ height: (config.navHeight + config.statusBarHeight) + 'px' }"></view>

    <!-- 筛选栏 (吸顶) -->
    <view class="filter-header" :style="{ top: (config.navHeight + config.statusBarHeight) + 'px' }">
      <wd-drop-menu custom-class="custom-drop-menu">
        <wd-drop-menu-item 
          v-model="selectedCategory" 
          :options="categoryOptions"
          @change="handleCategoryChange"
        />
        
        <wd-drop-menu-item 
          v-model="selectedDistance" 
          :options="distanceOptions"
          @change="handleDistanceChange"
        />
        
        <wd-drop-menu-item 
          v-model="selectedSort" 
          :options="sortOptions"
          @change="handleSortChange"
        />
      </wd-drop-menu>
    </view>
    <!-- 筛选栏占位符 -->
    <view class="filter-placeholder"></view>

    <!-- 课程列表 -->
    <view class="list-container">
      <!-- 骨架屏（初始加载时显示） -->
      <view class="skeleton-list" v-if="loading && courses.length === 0">
        <CourseCardSkeleton v-for="i in 5" :key="i" />
      </view>

      <view class="course-list" v-else-if="courses.length > 0">
        <CourseCard
          v-for="course in courses"
          :key="course.id"
          :course="course"
          role="parent"
          :show-promo="true"
          :show-category="!!getCategoryLabel(course.category_code)"
          :category-label="getCategoryLabel(course.category_code)"
          @click="handleCourseClick"
        />

        <!-- 加载更多 -->
        <view class="load-more-status">
          <text v-if="loading">加载中...</text>
          <text v-else-if="!hasMore && courses.length > 0">没有更多了</text>
        </view>
      </view>

      <!-- 空状态 -->
      <EmptyState v-if="!loading && courses.length === 0" icon="icon-catalog" text="暂无课程数据" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { courseApi, type Course } from '@/api'
import { showErrorToast } from '@/utils/toast'
import { formatDistance, getUserLocation } from '@/utils/distance'
import CourseCard from '@/components/CourseCard/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import { CourseCardSkeleton } from '@/components/Skeleton'

// 导航栏配置
const config = reactive({
  statusBarHeight: 20, // 默认为20
  navHeight: 44, // 内容高度
  menuButtonWidth: 96, // 胶囊宽度默认值
})

// 初始化导航栏
const initNavbar = () => {
  const sysInfo = uni.getSystemInfoSync()
  config.statusBarHeight = sysInfo.statusBarHeight || 20
  
  // #ifdef MP-WEIXIN
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton) {
      config.navHeight = (menuButton.top - config.statusBarHeight) * 2 + menuButton.height
      config.menuButtonWidth = menuButton.width + 12
    }
  } catch (e) {
    config.menuButtonWidth = 96
  }
  // #endif
}

// 搜索关键词
const searchKeyword = ref('')

// 机构ID（从机构详情跳转时传入）
const institutionId = ref('')

// 用户位置
const userLocation = ref<{ latitude: number; longitude: number } | null>(null)

// 筛选条件
const selectedCategory = ref<number>(0)
const selectedDistance = ref<number>(0)
const selectedSort = ref<number>(0)

// Data Helpers
const categoryValues = ['', 'art_painting', 'music', 'dance', 'ball_sports', 'swimming', 'martial_arts', 'language', 'math', 'science', 'calligraphy', 'handicraft', 'chess', 'fitness', 'other']

const categoryOptions = ref([
  { label: '全部分类', value: 0 },
  { label: '美术绘画', value: 1 },
  { label: '音乐', value: 2 },
  { label: '舞蹈', value: 3 },
  { label: '球类运动', value: 4 },
  { label: '游泳', value: 5 },
  { label: '武术', value: 6 },
  { label: '语言培训', value: 7 },
  { label: '数学思维', value: 8 },
  { label: '科学探索', value: 9 },
  { label: '书法', value: 10 },
  { label: '手工制作', value: 11 },
  { label: '棋类', value: 12 },
  { label: '体能训练', value: 13 },
  { label: '其他', value: 14 },
])

const distanceValues = [0, 2, 3, 5, 10]
const distanceOptions = ref([
  { label: '距离不限', value: 0 },
  { label: '2公里内', value: 1 },
  { label: '3公里内', value: 2 },
  { label: '5公里内', value: 3 },
  { label: '10公里内', value: 4 },
])

const sortValues = ['default', 'newest', 'price_asc', 'price_desc', 'sales']
const sortOptions = ref([
  { label: '默认排序', value: 0 },
  { label: '最新发布', value: 1 },
  { label: '价格低到高', value: 2 },
  { label: '价格高到低', value: 3 },
  { label: '报名人数', value: 4 },
])

// 列表数据
const courses = ref<Course[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0) // Start with 0

const hasMore = computed(() => {
  return courses.value.length < total.value
})

onLoad((options) => {
  if (options?.institutionId) {
    institutionId.value = options.institutionId
    uni.setNavigationBarTitle({ title: '机构课程' })
  }
  if (options?.category) {
    const index = categoryValues.indexOf(options.category)
    if (index > 0) selectedCategory.value = index
  }
  if (options?.keyword) {
    searchKeyword.value = options.keyword
  }
})

onMounted(async () => {
  initNavbar()
  userLocation.value = await getUserLocation()
  loadCourses(true)
})

const handleBack = () => {
  uni.navigateBack()
}

const loadCourses = async (resetPage = false) => {
  if (resetPage) {
    page.value = 1
    courses.value = [] // Reset list
    total.value = 0
  }
  
  if (loading.value) return
  loading.value = true

  try {
    const params: any = {
      page: page.value,
      pageSize: pageSize.value,
      is_online: true,
      latitude: userLocation.value?.latitude,
      longitude: userLocation.value?.longitude,
      keyword: searchKeyword.value,
    }

    // 如果从机构详情进入，只查该机构的课程
    if (institutionId.value) {
      params.institutionId = institutionId.value
    }

    const categoryCode = categoryValues[selectedCategory.value]
    if (categoryCode) params.category_code = categoryCode
    
    const sortValue = sortValues[selectedSort.value]
    if (sortValue && sortValue !== 'default') params.sort = sortValue
    
    const distanceValue = distanceValues[selectedDistance.value]
    if (distanceValue > 0) params.maxDistance = distanceValue

    const res = await courseApi.getList(params)
    const result = Array.isArray(res) ? { data: res, total: res.length } : res
    
    if (resetPage) {
      courses.value = result.data
    } else {
      courses.value = [...courses.value, ...result.data]
    }
    total.value = result.total
  } catch (error) {
    showErrorToast('加载失败')
  } finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

const handleSearch = () => {
  loadCourses(true)
}

const clearSearch = () => {
  searchKeyword.value = ''
  loadCourses(true)
}

const handleCategoryChange = () => {
  loadCourses(true)
}

const handleDistanceChange = () => {
  loadCourses(true)
}

const handleSortChange = () => {
  loadCourses(true)
}

const handleCourseClick = (course: any) => {
  uni.navigateTo({
    url: `/pages/course-detail/index?id=${course.id}`,
  })
}

const getCategoryLabel = (code: string) => {
  const index = categoryValues.indexOf(code)
  if (index > 0 && index < categoryOptions.value.length) {
    return categoryOptions.value[index].label
  }
  return ''
}

onPullDownRefresh(() => {
  loadCourses(true)
})

onReachBottom(() => {
  if (hasMore.value) {
    page.value++
    loadCourses(false)
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: #F7F8FA;
}

/* Custom Navbar */
.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #fff;
  box-sizing: border-box;
  box-shadow: 0 1rpx 0 rgba(0,0,0,0.05);
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
  margin-right: 20rpx;
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
  
  .search-icon {
    font-size: 32rpx;
    color: #999;
    margin-right: 12rpx;
  }
  
  .search-input {
    flex: 1;
    font-size: 28rpx;
    color: #333;
  }
  
  .clear-icon {
    font-size: 32rpx;
    color: #ccc;
    padding: 10rpx;
  }
}

/* Filter Header (Sticky) */
.filter-header {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 99;
  background: #fff;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
}

.filter-placeholder {
  height: 88rpx;
}

.custom-drop-menu {
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

/* List */
.list-container {
  padding: 24rpx;
}

.course-list {
  display: flex;
  flex-direction: column;
}

.load-more-status {
  padding: 24rpx;
  text-align: center;
  color: #999;
  font-size: 24rpx;
}

.skeleton-list {
  padding: 24rpx;
}
</style>
