<template>
  <view class="page">
    <view v-if="loading" class="loading">
      <Loading text="加载中..." />
    </view>

    <view v-else class="container">
      <!-- 筛选栏 -->
      <view class="filter-bar">
        <KeywordSearchBar
          v-model="searchKeyword" 
          placeholder="搜索教师姓名、手机号" 
          @search="handleSearch"
          @clear="handleSearch"
        />
        <view class="filter-tabs">
          <view
            v-for="item in statusOptions"
            :key="item.value"
            class="filter-tab"
            :class="{ active: filterStatus === item.value }"
            @click="handleFilterStatus(item.value)"
          >
            {{ item.label }}
          </view>
        </view>
      </view>

      <!-- 教师列表 -->
      <view v-if="teacherList.length > 0" class="teacher-list">
        <view
          v-for="teacher in teacherList"
          :key="teacher.id"
          class="teacher-card"
        >
          <view class="card-header">
            <view class="teacher-avatar">
              <async-image
                v-if="teacher.avatar"
                :url="teacher.avatar"
                width="120rpx"
                height="120rpx"
                mode="aspectFill"
                :radius="60"
              />
              <view v-else class="default-avatar">
                {{ teacher.name?.charAt(0) || '师' }}
              </view>
            </view>
            <view class="teacher-info">
              <view class="info-top">
                <text class="teacher-name">{{ teacher.name }}</text>
                <view class="status-tag" :class="`status-${teacher.status}`">
                  {{ getStatusLabel(teacher.status) }}
                </view>
              </view>
              <view v-if="teacher.title" class="teacher-title">{{ teacher.title }}</view>
              <view v-if="teacher.phone" class="teacher-phone">📱 {{ teacher.phone }}</view>
            </view>
          </view>

          <view class="card-body">
            <view v-if="teacher.subjects && teacher.subjects.length > 0" class="info-row">
              <text class="label">教授科目：</text>
              <view class="subjects">
                <text
                  v-for="(subject, index) in teacher.subjects"
                  :key="index"
                  class="subject-tag"
                >
                  {{ subject }}
                </text>
              </view>
            </view>
            <view v-if="teacher.years_of_experience" class="info-row">
              <text class="label">教龄：</text>
              <text class="value">{{ teacher.years_of_experience }}年</text>
            </view>
            <view v-if="teacher.bio" class="info-row bio">
              <text class="label">简介：</text>
              <text class="value">{{ teacher.bio }}</text>
            </view>
          </view>

          <view class="card-footer">
            <wd-button size="small" @click.stop="handleEdit(teacher.id)">编辑</wd-button>
            <wd-button
              size="small"
              type="error"
              @click.stop="handleDelete(teacher.id, teacher.name)"
            >
              删除
            </wd-button>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <EmptyState 
        v-else 
        icon="icon-customer" 
        text="暂无教师" 
      />

      <!-- 添加按钮 -->
      <view class="fab" @click="handleAdd">
        <text class="fab-icon">+</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useMessage } from 'wot-design-uni'
import { teacherApi, type TeacherInfo } from '@/api/teacher'
import KeywordSearchBar from '@/components/KeywordSearchBar/index.vue'
import AsyncImage from '@/components/AsyncImage/index.vue'
import Loading from '@/components/Loading/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
const message = useMessage()

const loading = ref(true)
const institutionId = ref('')
const teacherList = ref<TeacherInfo[]>([])
const searchKeyword = ref('')
const filterStatus = ref<string>('')

// 时间过滤参数（从URL获取）
const periodFilter = ref('')
const startDateFilter = ref('')
const endDateFilter = ref('')

const statusOptions = [
  { label: '全部', value: '' },
  { label: '在职', value: 'active' },
  { label: '休假', value: 'on_leave' },
  { label: '离职', value: 'inactive' },
]

onLoad((options) => {
  institutionId.value = options?.institutionId || ''
  periodFilter.value = options?.period || ''
  startDateFilter.value = options?.startDate || ''
  endDateFilter.value = options?.endDate || ''
  // 从URL读取状态筛选（数据概览跳转时传递 status=active）
  if (options?.status) {
    filterStatus.value = options.status
  }
  if (!institutionId.value) {
    uni.showToast({ title: '缺少机构ID', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
    return
  }
})

onMounted(() => {
  loadTeachers()
  // 监听页面刷新事件
  uni.$on('refreshTeacherList', () => {
    loadTeachers()
  })
})

/**
 * 加载教师列表
 */
const loadTeachers = async () => {
  try {
    loading.value = true
    const res = await teacherApi.getList({
      institutionId: institutionId.value,
      keyword: searchKeyword.value,
      status: filterStatus.value as any,
      period: periodFilter.value || undefined,
      startDate: startDateFilter.value || undefined,
      endDate: endDateFilter.value || undefined,
    })
    teacherList.value = res
  } catch (error) {
    console.error('加载教师列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 搜索
 */
const handleSearch = () => {
  loadTeachers()
}

/**
 * 筛选状态
 */
const handleFilterStatus = (status: string) => {
  filterStatus.value = status
  loadTeachers()
}

/**
 * 获取状态标签
 */
const getStatusLabel = (status: string) => {
  const item = statusOptions.find((s) => s.value === status)
  return item?.label || status
}

/**
 * 添加教师
 */
const handleAdd = () => {
  uni.navigateTo({
    url: `/pages/institution/teacher-edit/index?institutionId=${institutionId.value}`,
  })
}

/**
 * 编辑教师
 */
const handleEdit = (id: string) => {
  uni.navigateTo({
    url: `/pages/institution/teacher-edit/index?id=${id}&institutionId=${institutionId.value}`,
  })
}

/**
 * 删除教师
 */
const handleDelete = async (id: string, name: string) => {
  const confirmed = await message.confirm({
    msg: `确定要删除教师"${name}"吗？`,
    title: '删除确认',
  })

  if (!confirmed) return

  try {
    await teacherApi.delete(id)
    uni.showToast({ title: '删除成功', icon: 'success' })
    loadTeachers()
  } catch (error) {
    console.error('删除失败:', error)
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.container {
  padding-bottom: 160rpx;
}

.filter-bar {
  background-color: $uni-bg-color;
  padding: 24rpx 32rpx;
}

.filter-tabs {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.filter-tab {
  padding: 12rpx 24rpx;
  font-size: 28rpx;
  color: $uni-text-color-secondary;
  background-color: $uni-bg-color-grey;
  border-radius: 8rpx;
  transition: all 0.3s;

  &.active {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
  }
}

.teacher-list {
  padding: 24rpx 32rpx;
}

.teacher-card {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.teacher-avatar {
  flex-shrink: 0;
}

.default-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  background: linear-gradient(135deg, $uni-color-primary-light, $uni-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  font-weight: bold;
  color: $uni-text-color-inverse;
}

.teacher-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.info-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.teacher-name {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
}

.status-tag {
  padding: 4rpx 12rpx;
  font-size: 24rpx;
  border-radius: 6rpx;
  flex-shrink: 0;

  &.status-active {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
  }

  &.status-on_leave {
    background-color: #fff3e0;
    color: $uni-color-warning;
  }

  &.status-inactive {
    background-color: #fafafa;
    color: $uni-text-color-disable;
  }
}

.teacher-title {
  font-size: 26rpx;
  color: $uni-color-primary;
}

.teacher-phone {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
}

.card-body {
  margin-bottom: 24rpx;
}

.info-row {
  display: flex;
  font-size: 28rpx;
  margin-bottom: 16rpx;

  &:last-child {
    margin-bottom: 0;
  }

  &.bio {
    flex-direction: column;
  }
}

.label {
  color: $uni-text-color-secondary;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.value {
  color: $uni-text-color;
  word-break: break-all;
}

.subjects {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.subject-tag {
  padding: 4rpx 12rpx;
  font-size: 24rpx;
  background-color: $uni-color-primary-lighter;
  color: $uni-color-primary;
  border-radius: 6rpx;
}

.card-footer {
  display: flex;
  gap: 16rpx;
  justify-content: flex-end;
}

.fab {
  position: fixed;
  right: 32rpx;
  bottom: 32rpx;
  width: 112rpx;
  height: 112rpx;
  background-color: $uni-color-primary;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(82, 196, 26, 0.4);
  z-index: 100;
}

.fab-icon {
  font-size: 64rpx;
  color: $uni-text-color-inverse;
  font-weight: 300;
}
</style>
