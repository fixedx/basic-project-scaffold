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
            placeholder="搜索机构名称"
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
      </wd-drop-menu>
    </view>
    <!-- 筛选栏占位符 -->
    <view class="filter-placeholder"></view>

    <!-- 机构列表 -->
    <view class="list-container">
      <view class="institution-list" v-if="!loading || institutionList.length > 0">
        <InstitutionCard
          v-for="item in institutionList"
          :key="item.id"
          :institution="item"
          mode="full"
          :tag-labels="item.tags ? formatTags(item.tags) : []"
          @click="handleCardClick"
        />

        <!-- 加载更多 -->
        <view class="load-more-status">
          <text v-if="loading">加载中...</text>
          <text v-else-if="noMore && institutionList.length > 0">没有更多了</text>
          <view v-else-if="!loading && institutionList.length === 0" class="empty-box">
            <text class="iconfont icon-shopping" style="font-size: 80rpx; color: #ddd;"></text>
            <text class="empty-text">暂无机构数据</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import { institutionApi, type InstitutionInfo } from '@/api/institution'
import { useEnums } from '@/composables/useEnums'
import { formatDistance, getUserLocation } from '@/utils/distance'
import InstitutionCard from '@/components/InstitutionCard/index.vue'

const { loadEnumsByTypes, getEnumList, getEnumLabel, ENUM_TYPES } = useEnums()

// 导航栏配置
const config = reactive({
  statusBarHeight: 20, // 默认为20
  navHeight: 44, // 导航内容固定高度
  menuButtonWidth: 96, // 胶囊按钮宽度(给个默认值防止重叠)
  menuButtonHeight: 32, // 胶囊按钮高度
  menuButtonTop: 24, // 胶囊按钮距离顶部距离
})

// 初始化导航栏
const initNavbar = () => {
  const sysInfo = uni.getSystemInfoSync()
  config.statusBarHeight = sysInfo.statusBarHeight || 20
  
  // #ifdef MP-WEIXIN
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton) {
      // 计算导航栏内容高度：(胶囊顶部 - 状态栏高度) * 2 + 胶囊高度
      // 这里的 navHeight 指的是状态栏下方的内容区域高度
      config.navHeight = (menuButton.top - config.statusBarHeight) * 2 + menuButton.height
      config.menuButtonWidth = menuButton.width + 12 // 右侧留出一点额外间距
      config.menuButtonHeight = menuButton.height
      config.menuButtonTop = menuButton.top
    }
  } catch (e) {
    // 获取失败时的保底逻辑
    config.menuButtonWidth = 96
  }
  // #endif
  
  // #ifndef MP-WEIXIN
  // 非小程序环境下，右侧也留出一定间距，保持美观
  config.menuButtonWidth = 0 
  // #endif
}

// 搜索关键词
const searchKeyword = ref('')

// 用户位置
const userLocation = ref<{ latitude: number; longitude: number } | null>(null)

// 筛选条件
const selectedCategory = ref<number>(0)
const selectedDistance = ref<number>(0)

// Category Mappings
const categoryValues = ref<string[]>([])
const categoryOptions = ref<any[]>([])

// Distance Options
const distanceValues = [0, 2, 3, 5, 10]
const distanceOptions = ref([
  { label: '距离不限', value: 0 },
  { label: '2公里内', value: 1 },
  { label: '3公里内', value: 2 },
  { label: '5公里内', value: 3 },
  { label: '10公里内', value: 4 },
])

// List Data
const institutionList = ref<InstitutionInfo[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const noMore = ref(false)

onLoad((options) => {
  if (options?.keyword) {
    searchKeyword.value = options.keyword
  }
})

onMounted(async () => {
  initNavbar()
  userLocation.value = await getUserLocation()
  await loadCategories()
  await loadInstitutions()
})

const handleBack = () => {
  uni.navigateBack()
}

const loadCategories = async () => {
  await loadEnumsByTypes([ENUM_TYPES.INSTITUTION_CATEGORY, ENUM_TYPES.INSTITUTION_TAG])
  const categoryEnums = getEnumList(ENUM_TYPES.INSTITUTION_CATEGORY)
  categoryValues.value = ['', ...categoryEnums.map((item: any) => item.value)]
  categoryOptions.value = [
    { label: '全部分类', value: 0 },
    ...categoryEnums.map((item: any, index: number) => ({
      label: item.label,
      value: index + 1,
    })),
  ]
}

const loadInstitutions = async (isLoadMore = false) => {
  if (loading.value) return
  loading.value = true
  
  try {
    const categoryIndex = selectedCategory.value
    const categoryCode = categoryValues.value[categoryIndex] || undefined
    
    const distanceIndex = selectedDistance.value
    const distanceValue = distanceValues[distanceIndex] || undefined

    const params: any = {
      page: page.value,
      pageSize: pageSize.value,
      latitude: userLocation.value?.latitude,
      longitude: userLocation.value?.longitude,
      keyword: searchKeyword.value,
      category: categoryCode,
      maxDistance: distanceValue
    }

    const res = await institutionApi.getList(params)

    if (isLoadMore) {
      institutionList.value = [...institutionList.value, ...res.data]
    } else {
      institutionList.value = res.data
    }
    
    total.value = res.total
    noMore.value = institutionList.value.length >= total.value
  } catch (err) {
    if (!isLoadMore) institutionList.value = []
  } finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

const handleSearch = () => {
  page.value = 1
  loadInstitutions()
}

const clearSearch = () => {
  searchKeyword.value = ''
  handleSearch()
}

const handleCategoryChange = () => {
  page.value = 1
  loadInstitutions()
}

const handleDistanceChange = () => {
  page.value = 1
  loadInstitutions()
}

const loadMore = () => {
  if (!noMore.value && !loading.value) {
    page.value++
    loadInstitutions(true)
  }
}

const handleCardClick = (inst: any) => {
  uni.navigateTo({ url: `/pages/institution-detail/index?id=${inst.id}` })
}

const formatTags = (tags: string) => tags.split(',').slice(0, 3).map(code => getEnumLabel(ENUM_TYPES.INSTITUTION_TAG, code.trim()) || code.trim())

onReachBottom(() => {
  loadMore()
})

onPullDownRefresh(() => {
  page.value = 1
  loadInstitutions()
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
  height: 88rpx; // wd-drop-menu default height
}

.custom-drop-menu {
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

/* List */
.list-container {
  padding: 24rpx;
}

.institution-list {
  display: flex;
  flex-direction: column;
}

.load-more-status {
  padding: 32rpx;
  text-align: center;
  color: #999;
  font-size: 26rpx;
  
  .empty-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
    padding: 64rpx 0;
  }
}
</style>
