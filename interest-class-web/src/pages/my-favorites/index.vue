<template>
  <view class="favorites-page">
    <!-- 顶部 Tab 切换 -->
    <view class="tabs-bar">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: currentTab === tab.value }"
        @click="switchTab(tab.value)"
      >
        <text class="tab-text">{{ tab.label }}</text>
        <view v-if="currentTab === tab.value" class="tab-indicator"></view>
      </view>
    </view>

    <!-- 课程收藏列表 -->
    <view v-if="currentTab === 'course'" class="list-container">
      <view v-if="loading" class="loading-state">
        <Loading />
      </view>
      <template v-else-if="courseList.length > 0">
        <CourseCard
          v-for="item in courseList"
          :key="item.id"
          :course="item"
          role="parent"
          @click="goToCourseDetail(item)"
        />
      </template>
      <EmptyState v-else text="暂无收藏的课程" icon="icon-favorites" />
    </view>

    <!-- 机构收藏列表 -->
    <view v-if="currentTab === 'institution'" class="list-container">
      <view v-if="loading" class="loading-state">
        <Loading />
      </view>
      <template v-else-if="institutionList.length > 0">
        <InstitutionCard
          v-for="item in institutionList"
          :key="item.id"
          :institution="item"
          mode="full"
          :show-rating="false"
          :show-promo="false"
          @click="goToInstitutionDetail"
        />
      </template>
      <EmptyState v-else text="暂无收藏的机构" icon="icon-favorites" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { favoriteApi } from '@/api/favorite'
import { courseApi, type Course } from '@/api/course'
import { institutionApi, type Institution } from '@/api/institution'
import CourseCard from '@/components/CourseCard/index.vue'
import InstitutionCard from '@/components/InstitutionCard/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import Loading from '@/components/Loading/index.vue'

const tabs = [
  { label: '课程', value: 'course' as const },
  { label: '机构', value: 'institution' as const },
]

const currentTab = ref<'course' | 'institution'>('course')
const loading = ref(false)
const courseList = ref<any[]>([])
const institutionList = ref<any[]>([])

const switchTab = (tab: 'course' | 'institution') => {
  if (currentTab.value === tab) return
  currentTab.value = tab
  loadFavorites()
}

/**
 * 加载收藏列表（加载收藏记录 → 批量加载目标详情）
 */
const loadFavorites = async () => {
  loading.value = true
  try {
    const favorites = await favoriteApi.getMyFavorites({
      target_type: currentTab.value,
    })

    const items = Array.isArray(favorites) ? favorites : favorites?.data || []

    if (items.length === 0) {
      if (currentTab.value === 'course') {
        courseList.value = []
      } else {
        institutionList.value = []
      }
      return
    }

    const targetIds = items.map((f: any) => f.target_id)

    if (currentTab.value === 'course') {
      // 批量加载课程详情
      const details = await Promise.all(
        targetIds.map((id: string) =>
          courseApi.getDetail(id).catch(() => null)
        )
      )
      courseList.value = details.filter(Boolean)
    } else {
      // 批量加载机构详情
      const details = await Promise.all(
        targetIds.map((id: string) =>
          institutionApi.getById(id).catch(() => null)
        )
      )
      institutionList.value = details.filter(Boolean)
    }
  } catch (error) {
    console.error('加载收藏列表失败:', error)
  } finally {
    loading.value = false
  }
}

const goToCourseDetail = (course: any) => {
  uni.navigateTo({
    url: `/pages/course-detail/index?id=${course.id}`,
  })
}

const goToInstitutionDetail = (institution: any) => {
  uni.navigateTo({
    url: `/pages/institution-detail/index?id=${institution.id}`,
  })
}

onShow(() => {
  loadFavorites()
})
</script>

<style lang="scss" scoped>
.favorites-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.tabs-bar {
  display: flex;
  background-color: $uni-bg-color;
  padding: 0 32rpx;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0 16rpx;
  position: relative;

  .tab-text {
    font-size: 30rpx;
    color: $uni-text-color-secondary;
    transition: all 0.3s;
  }

  &.active {
    .tab-text {
      font-size: 32rpx;
      font-weight: bold;
      color: $uni-text-color;
    }
  }

  .tab-indicator {
    width: 48rpx;
    height: 6rpx;
    background-color: $uni-color-primary;
    border-radius: 3rpx;
    margin-top: 8rpx;
  }
}

.list-container {
  padding: 24rpx;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 100rpx 0;
}
</style>
