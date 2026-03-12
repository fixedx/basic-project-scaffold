<template>
  <view class="page">
    <!-- 搜索和筛选区域 -->
    <view class="sticky-header">
      <view class="search-box">
        <wd-search
          v-model="searchKeyword"
          placeholder="搜索课程名称"
          hide-cancel
          light
          @search="handleSearch"
          @clear="handleSearch"
        />
      </view>
      <view class="filter-box">
        <wd-drop-menu>
          <wd-drop-menu-item v-model="filterType" :options="typeOptions" @change="handleFilterChange" />
          <wd-drop-menu-item v-model="filterOnline" :options="onlineOptions" @change="handleFilterChange" />
        </wd-drop-menu>
      </view>
    </view>

    <!-- 课程列表 -->
    <view class="course-list">
      <view v-if="loading" class="loading">
        <Loading text="加载中..." />
      </view>

      <view v-else-if="!selectedInstitutionId" class="empty">
         <!-- Fail-safe if no institution is loaded -->
        <wd-status-tip image="search" tip="未找到关联机构" />
      </view>
      
      <view v-else-if="courseList.length === 0" class="empty">
        <EmptyState icon="icon-catalog" text="暂无课程数据" />
         <wd-button type="primary" @click="goToCreate" custom-style="margin-top: 32rpx;">
          新建课程
        </wd-button>
      </view>

      <view v-else class="list-content">
        <CourseCard
          v-for="course in courseList"
          :key="course.id"
          :course="course"
          role="institution"
          @click="handleCardClick"
        >
          <template #actions="{ course: c }">
            <view class="action-buttons">
              <wd-button
                size="small"
                plain
                custom-class="btn-action btn-info"
                @click="goToSchedule(c.id)"
              >
                排课管理
              </wd-button>
              <wd-button
                size="small"
                :type="c.is_online ? 'warning' : 'success'"
                plain
                custom-class="btn-action"
                @click="handleToggleOnline(c)"
              >
                {{ c.is_online ? '下架' : '上架' }}
              </wd-button>
              <wd-button
                size="small"
                type="primary"
                plain
                custom-class="btn-action"
                @click="goToEdit(c.id)"
              >
                编辑
              </wd-button>
            </view>
          </template>
        </CourseCard>
      </view>
    </view>

    <!-- 悬浮按钮 -->
    <view v-if="selectedInstitutionId" class="fab" @click="goToCreate">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import { courseApi, type CourseInfo } from '@/api/course'
import { getMyInstitutions } from '@/api/category'
import { useEnums } from '@/composables/useEnums'
import CourseCard from '@/components/CourseCard/index.vue'
import Loading from '@/components/Loading/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
const { loadEnumsByTypes, getEnumLabel, ENUM_TYPES } = useEnums()

const loading = ref(true)
const courseList = ref<CourseInfo[]>([])

// 机构相关
const institutions = ref<any[]>([])
const selectedInstitutionId = ref('')

// 搜索关键字
const searchKeyword = ref('')

// 筛选条件
const filterType = ref('')
const filterOnline = ref('')

// 时间过滤参数（从URL获取）
const periodFilter = ref('')
const startDateFilter = ref('')
const endDateFilter = ref('')

// 枚举数据
const courseTypeEnums = ref<any[]>([])

const typeOptions = computed(() => [
  { label: '全部类型', value: '' },
  ...courseTypeEnums.value.map(item => ({
    label: item.label,
    value: item.code,
  })),
])

const onlineOptions = [
  { label: '全部状态', value: '' },
  { label: '已上架', value: 'true' },
  { label: '已下架', value: 'false' },
]

/**
 * 加载机构列表
 */
const loadInstitutions = async () => {
  try {
    const res = await getMyInstitutions()
    institutions.value = res
    
    // 如果有机构，自动选择第一个
    if (institutions.value.length > 0 && !selectedInstitutionId.value) {
      selectedInstitutionId.value = institutions.value[0].id
      await loadCourseList()
    }
  } catch (error) {
    console.error('加载机构列表失败:', error)
    uni.showToast({ title: '加载机构列表失败', icon: 'none' })
  }
}

/**
 * 加载枚举数据
 */
const loadEnums = async () => {
  try {
    const data = await loadEnumsByTypes([ENUM_TYPES.COURSE_TYPE])
    courseTypeEnums.value = data[ENUM_TYPES.COURSE_TYPE] || []
  } catch (error) {
    console.error('加载枚举失败:', error)
  }
}

/**
 * 加载课程列表
 */
const loadCourseList = async () => {
  if (!selectedInstitutionId.value) {
    courseList.value = []
    loading.value = false
    return
  }

  try {
    loading.value = true
    const params: any = {
      institutionId: selectedInstitutionId.value
    }
    
    if (filterType.value) {
      params.type = filterType.value
    }
    
    if (filterOnline.value) {
      params.is_online = filterOnline.value === 'true'
    }

    if (searchKeyword.value) {
      params.keyword = searchKeyword.value
    }

    if (periodFilter.value) {
      params.period = periodFilter.value
    }
    if (startDateFilter.value) {
      params.startDate = startDateFilter.value
    }
    if (endDateFilter.value) {
      params.endDate = endDateFilter.value
    }

    const res = await courseApi.getList(params)
    
    if (Array.isArray(res)) {
      courseList.value = res
    } else if (res && 'data' in res) {
      courseList.value = res.data
    }
  } catch (error) {
    console.error('加载课程列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 筛选条件变化
 */
const handleFilterChange = () => {
  loadCourseList()
}

/**
 * 搜索
 */
const handleSearch = () => {
  loadCourseList()
}

/**
 * 上架/下架课程
 */
const handleToggleOnline = async (course: CourseInfo) => {
  try {
    if (course.is_online) {
      await courseApi.offline(course.id)
      uni.showToast({ title: '下架成功', icon: 'success' })
    } else {
      await courseApi.online(course.id)
      uni.showToast({ title: '上架成功', icon: 'success' })
    }
    loadCourseList()
  } catch (error) {
    console.error('操作失败:', error)
  }
}

/**
 * 跳转到创建页面
 */
const goToCreate = () => {
  uni.navigateTo({
    url: `/pages/institution/course-edit/index?institutionId=${selectedInstitutionId.value}`
  })
}

/**
 * 跳转到编辑页面
 */
const handleCardClick = (course: any) => {
  goToEdit(course.id)
}

const goToEdit = (id: string) => {
  uni.navigateTo({
    url: `/pages/institution/course-edit/index?id=${id}`,
  })
}
/**
 * 跳转到排课页面
 */
const goToSchedule = (courseId: string) => {
  uni.navigateTo({
    url: `/pages/institution/schedule-list/index?courseId=${courseId}`,
  })
}
onLoad((options) => {
  periodFilter.value = options?.period || ''
  startDateFilter.value = options?.startDate || ''
  endDateFilter.value = options?.endDate || ''
})

onShow(() => {
  loadCourseList()
})

onMounted(async () => {
  await Promise.all([loadEnums(), loadInstitutions()])
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: $uni-bg-color;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.search-box {
  padding: 8rpx 0;
  border-bottom: 1rpx solid $uni-border-color-light;
}

:deep(.wd-search) {
  background: transparent !important;
  padding: 0 32rpx;
}

:deep(.wd-drop-menu) {
  border-bottom: none;
}

.loading, .empty {
  padding: 160rpx 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.course-list {
  padding: 24rpx;
}

.list-content {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.action-buttons {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16rpx;
  width: 100%;
}

/* 按钮样式优化 */
:deep(.btn-action) {
  margin: 0 !important;
  border-radius: 8rpx;
  font-weight: 500;
  padding: 0 24rpx;
  height: 56rpx;
  line-height: 56rpx;
}

:deep(.btn-info) {
  color: $uni-text-color-secondary;
  border-color: $uni-border-color-secondary;
  background: transparent;
}

.fab {
  position: fixed;
  right: 40rpx;
  bottom: calc(140rpx + env(safe-area-inset-bottom));
  width: 104rpx;
  height: 104rpx;
  background: linear-gradient(135deg, $uni-color-primary, #6de332);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 8rpx 28rpx rgba(82, 196, 26, 0.4);
  z-index: 99;
  transition: transform 0.2s ease;
  
  &:active {
    transform: scale(0.92);
  }
}

.fab-icon {
  font-size: 56rpx;
  color: #fff;
  line-height: 1;
  font-weight: 300;
  margin-top: -4rpx;
}
</style>
