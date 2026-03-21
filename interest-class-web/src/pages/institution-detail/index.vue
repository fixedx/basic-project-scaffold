<template>
  <view class="page">
    <!-- Custom Navbar -->
    <view
      class="custom-navbar"
      :style="{
        paddingTop: statusBarHeight + 'px',
        backgroundColor: `rgba(255, 255, 255, ${navOpacity})`
      }"
    >
      <view class="navbar-content">
        <view class="nav-capsule" :class="{ dark: navOpacity > 0.5 }">
          <view class="nav-btn nav-back" @click="handleBack">
            <text class="iconfont icon-left" style="font-size: 20px;"></text>
          </view>
          <view class="nav-divider"></view>
          <button class="nav-btn nav-share" open-type="share">
            <text class="iconfont icon-share" style="font-size: 20px;"></text>
          </button>
        </view>
        <view class="nav-title" :style="{ opacity: navOpacity }">
          {{ institution?.name || '机构详情' }}
        </view>
        <view style="width: 80px;"></view>
      </view>
    </view>

    <view v-if="loading" class="loading-state">
      <wd-loading />
    </view>

    <view v-else-if="institution">
      <!-- Hero Section -->
      <view class="hero-section">
        <image
          :src="institution.showcases?.[0]?.img_url || institution.logo"
          mode="aspectFill"
          class="hero-image"
        />
        <view class="hero-mask"></view>
      </view>

      <!-- ✅ 复用公共组件：机构信息卡片 -->
      <view class="info-card-overlap">
        <InstitutionInfoCard
          :institution="institution"
          :resolved-tags="tags"
          :max-discount-amount="maxDiscountAmount"
          :max-cashback-amount="maxCashbackAmount"
        />
      </view>

      <!-- Tabs Header (Sticky) -->
      <view class="content-section">
        <view class="tabs-header-wrapper" :class="{ 'is-sticky': isHeaderSticky }">
          <view class="tabs-header">
            <view
              v-for="(tab, idx) in tabList"
              :key="idx"
              class="tab-item"
              :class="{ active: activeTab === idx }"
              @click="scrollToSection(idx)"
            >
              {{ tab }}
              <view class="tab-line" v-if="activeTab === idx"></view>
            </view>
          </view>
        </view>

        <!-- 1. 课程 -->
        <view id="section-0">
          <InstitutionCourses
            :courses="courses"
            title="热门课程"
            :limit="8"
            show-more
            @click="goToCourse"
            @more="handleMoreCourses"
          />
        </view>

        <!-- 2. 环境/风采 -->
        <view id="section-1">
          <InstitutionShowcase
            :showcases="institution.showcases || []"
            :honors="institution.honors || []"
          />
        </view>

        <!-- 3. 师资 -->
        <view id="section-2">
          <InstitutionTeachers
            :teachers="teachers"
            :limit="4"
            show-more
            @click="goToTeacher"
            @more="handleMoreTeachers"
          />
        </view>

        <!-- 4. 评价 -->
        <view id="section-3">
          <InstitutionReviews
            :reviews="reviews"
            :total="reviewsTotal"
            :limit="3"
            show-more
            show-empty
            @more="handleMoreReviews"
          />
        </view>
      </view>
    </view>

    <!-- 底部收藏栏 -->
    <view class="favorite-footer" v-if="institution">
      <view class="footer-left">
        <view class="footer-icon-btn" @click="handleFavorite">
          <text
            class="iconfont"
            :class="isFavorited ? 'icon-favorites-fill' : 'icon-favorites'"
            :style="{ color: isFavorited ? '#f5222d' : '' }"
          ></text>
          <text class="footer-icon-label">{{ isFavorited ? '已收藏' : '收藏' }}</text>
        </view>
        <button class="footer-icon-btn share-btn" open-type="share">
          <text class="iconfont icon-share"></text>
          <text class="footer-icon-label">分享</text>
        </button>
      </view>
      <wd-button type="primary" custom-class="contact-btn" @click="handleContact">
        <text class="iconfont icon-phone" style="margin-right: 8rpx;"></text>
        联系机构
      </wd-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad, onPageScroll, onShareAppMessage } from '@dcloudio/uni-app'
import { institutionApi, type Institution } from '@/api/institution'
import { courseApi, type Course } from '@/api/course'
import { reviewApi, type Review } from '@/api/review'
import { favoriteApi } from '@/api/favorite'
import { getToken } from '@/utils/auth'
import { useEnums } from '@/composables/useEnums'
import InstitutionInfoCard from '@/components/InstitutionInfoCard/index.vue'
import InstitutionCourses from '@/components/InstitutionCourses/index.vue'
import InstitutionShowcase from '@/components/InstitutionShowcase/index.vue'
import InstitutionTeachers from '@/components/InstitutionTeachers/index.vue'
import InstitutionReviews from '@/components/InstitutionReviews/index.vue'

const { loadEnumsByTypes, getEnumLabel, ENUM_TYPES } = useEnums()

const institutionId = ref('')
const institution = ref<Institution | null>(null)
const courses = ref<Course[]>([])
const reviews = ref<Review[]>([])
const reviewsTotal = ref(0)
const loading = ref(true)
const isFavorited = ref(false)

// Navigation state
const navOpacity = ref(0)
const isHeaderSticky = ref(false)
const activeTab = ref(0)
const tabList = ['热门课程', '简介环境', '金牌教师', '学员评价']
const sectionTops = ref<number[]>([])
const isScrolling = ref(false)
const statusBarHeight = ref(0)

// Lifecycle
onLoad((options: any) => {
  if (options.id) {
    institutionId.value = options.id
  }
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 20
})

onMounted(async () => {
  await loadData()
  checkFavoriteStatus()
  setTimeout(calculateSectionTops, 1000)
})

onPageScroll((e) => {
  const scrollTop = e.scrollTop
  navOpacity.value = Math.min(scrollTop / 200, 1)

  const threshold = uni.upx2px(420)
  isHeaderSticky.value = scrollTop > threshold

  if (isScrolling.value) return
  if (sectionTops.value.length > 0) {
    const buffer = uni.upx2px(110)
    for (let i = sectionTops.value.length - 1; i >= 0; i--) {
      if (scrollTop >= sectionTops.value[i] - buffer) {
        activeTab.value = i
        break
      }
    }
  }
})

onShareAppMessage(() => ({
  title: institution.value?.name || '机构详情',
  path: `/pages/institution-detail/index?id=${institutionId.value}`,
}))

// Data Loading
const loadData = async () => {
  if (!institutionId.value) return
  loading.value = true
  try {
    const [instRes, courseRes, reviewRes] = await Promise.all([
      institutionApi.getById(institutionId.value),
      courseApi.getList({ institutionId: institutionId.value, is_online: true, page: 1, pageSize: 8 }),
      reviewApi.getInstitutionTopReviews(institutionId.value, 5),
      loadEnumsByTypes([ENUM_TYPES.INSTITUTION_TAG]),
    ])

    institution.value = instRes
    courses.value = Array.isArray(courseRes) ? courseRes : courseRes.data
    reviews.value = reviewRes.data || []
    reviewsTotal.value = reviewRes.total || 0
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// Computed
const tags = computed(() => {
  if (!institution.value?.tags) return []
  return institution.value.tags.split(',').map((code: string) =>
    getEnumLabel(ENUM_TYPES.INSTITUTION_TAG, code.trim()) || code.trim()
  )
})

const maxCashbackAmount = computed(() => {
  if (!courses.value || courses.value.length === 0) return 0
  return Math.max(...courses.value.map(c => Number(c.max_cashback_amount) || 0))
})

const maxDiscountAmount = computed(() => {
  if (!courses.value || courses.value.length === 0) return 0
  return Math.max(...courses.value.map(c => Number(c.max_discount_amount) || 0))
})

const teachers = computed(() => (institution.value as any)?.teachers || [])

// Methods
const handleBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}

const scrollToSection = (index: number) => {
  activeTab.value = index
  isScrolling.value = true
  const selector = `#section-${index}`

  uni.createSelectorQuery().selectViewport().scrollOffset((res: any) => {
    const currentScroll = res.scrollTop || 0
    uni.createSelectorQuery()
      .select(selector)
      .boundingClientRect((data: any) => {
        if (data) {
          const target = currentScroll + data.top - uni.upx2px(100)
          uni.pageScrollTo({
            scrollTop: target,
            duration: 300,
            complete: () => {
              setTimeout(() => { isScrolling.value = false }, 350)
            },
          })
        } else {
          isScrolling.value = false
        }
      })
      .exec()
  }).exec()
}

const calculateSectionTops = () => {
  uni.createSelectorQuery().selectViewport().scrollOffset((res: any) => {
    const currentScroll = res.scrollTop || 0
    uni.createSelectorQuery()
      .selectAll('[id^="section-"]')
      .boundingClientRect((rects: any) => {
        if (Array.isArray(rects)) {
          sectionTops.value = rects.map(r => r.top! + currentScroll)
        }
      })
      .exec()
  }).exec()
}

const handleFavorite = async () => {
  if (!getToken()) {
    uni.navigateTo({
      url: `/pages/login/index?from=${encodeURIComponent(`/pages/institution-detail/index?id=${institutionId.value}`)}`,
    })
    return
  }
  try {
    const res = await favoriteApi.toggle({
      target_type: 'institution',
      target_id: institutionId.value,
    })
    isFavorited.value = res.isFavorited
    uni.showToast({ title: res.isFavorited ? '已收藏' : '已取消收藏', icon: 'none' })
  } catch (error) {
    console.error('收藏操作失败:', error)
  }
}

const checkFavoriteStatus = async () => {
  if (!getToken() || !institutionId.value) return
  try {
    const res = await favoriteApi.checkFavorite('institution', institutionId.value)
    isFavorited.value = res.isFavorited
  } catch (error) {
    console.error('检查收藏状态失败:', error)
  }
}

const handleContact = () => {
  if (institution.value?.contact_phone) {
    uni.makePhoneCall({ phoneNumber: institution.value.contact_phone })
  } else {
    uni.showToast({ title: '暂无联系电话', icon: 'none' })
  }
}

const goToCourse = (course: any) => {
  uni.navigateTo({ url: `/pages/course-detail/index?id=${course.id}` })
}

const goToTeacher = (id: string) => {
  uni.navigateTo({ url: `/pages/teacher-detail/index?id=${id}` })
}

const handleMoreCourses = () => {
  uni.navigateTo({ url: `/pages/course-list/index?institutionId=${institutionId.value}` })
}

const handleMoreTeachers = () => {
  uni.navigateTo({ url: `/pages/teacher-list/index?institutionId=${institutionId.value}` })
}

const handleMoreReviews = () => {
  uni.navigateTo({ url: `/pages/review-list/index?institutionId=${institutionId.value}` })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 200rpx;
}

// Custom Navbar
.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 999;
  transition: background-color 0.3s;
}

.navbar-content {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 16px;
  position: relative;
}

.nav-title {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 16px;
  font-weight: bold;
  color: #333;
  pointer-events: none;
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-capsule {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(4px);
  border-radius: 32rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.2);
  height: 32px;
  padding: 0 4rpx;
  transition: all 0.3s;
  flex-shrink: 0;
  z-index: 10;

  &.dark {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(0, 0, 0, 0.1);

    .nav-btn {
      color: #333;
    }

    .nav-divider {
      background: rgba(0, 0, 0, 0.1);
    }
  }
}

.nav-divider {
  width: 1rpx;
  height: 18px;
  background: rgba(255, 255, 255, 0.3);
  margin: 0 2rpx;
}

.nav-btn {
  width: 40px;
  height: 32px;
  border-radius: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  padding: 0;
  margin: 0;
  border: none;

  &::after {
    border: none;
  }
}

// Hero Section
.hero-section {
  position: relative;
  height: 400rpx;
  width: 100%;
}

.hero-image {
  width: 100%;
  height: 100%;
}

.hero-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.3));
}

// Info card overlap on hero
.info-card-overlap {
  margin-top: -60rpx;
  position: relative;
  z-index: 10;

  :deep(.info-section) {
    margin: 0 24rpx;
  }
}

// Tabs Header
.content-section {
  position: relative;
  z-index: 10;
}

.tabs-header-wrapper {
  background: #f7f8fa;
  padding: 24rpx 32rpx 0;

  &.is-sticky {
    position: sticky;
    top: 88rpx;
    z-index: 100;
    background: #fff;
    padding-bottom: 24rpx;
    box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  }
}

.tabs-header {
  display: flex;
  justify-content: space-between;
}

.tab-item {
  font-size: 28rpx;
  color: #666;
  position: relative;
  padding-bottom: 12rpx;
  font-weight: 500;
  transition: all 0.3s;

  &.active {
    color: $uni-color-primary;
    font-weight: bold;
    font-size: 30rpx;
  }
}

.tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 32rpx;
  height: 6rpx;
  background: $uni-color-primary;
  border-radius: 4rpx;
}

.loading-state {
  margin-top: 100rpx;
  display: flex;
  justify-content: center;
}

// 底部收藏栏
.favorite-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: $uni-bg-color;
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  z-index: 100;

  .footer-left {
    display: flex;
    gap: 32rpx;
    margin-right: 24rpx;
  }

  .footer-icon-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4rpx;
    background: transparent;
    padding: 0;
    border: none;
    line-height: 1.2;

    &::after {
      border: none;
    }

    .iconfont {
      font-size: 40rpx;
      color: $uni-text-color-secondary;
    }

    .footer-icon-label {
      font-size: 20rpx;
      color: $uni-text-color-secondary;
    }
  }

  :deep(.contact-btn) {
    flex: 1;
    border-radius: 40rpx !important;
  }
}
</style>
