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
              <AsyncImage
                v-if="teacher.photo"
                :url="teacher.photo"
                width="120rpx"
                height="120rpx"
                mode="aspectFill"
                custom-class="teacher-avatar__img"
              />
              <view v-else class="default-avatar">
                {{ teacher.name?.charAt(0) || '师' }}
              </view>
            </view>
            <view class="teacher-info">
              <view class="info-top">
                <view class="name-wrap">
                  <text class="teacher-name">{{ teacher.name }}</text>
                  <text v-if="teacher.gender" class="gender-tag" :class="teacher.gender">
                    {{ teacher.gender === 'male' ? '男' : '女' }}
                  </text>
                </view>
                <view class="status-tag" :class="`status-${teacher.status}`">
                  <text class="status-dot"></text>
                  {{ getStatusLabel(teacher.status) }}
                </view>
              </view>
              <view class="teacher-meta" v-if="teacher.title || teacher.phone">
                <text v-if="teacher.title" class="teacher-title">{{ teacher.title }}</text>
                <text v-if="teacher.phone" class="teacher-phone">{{ teacher.phone }}</text>
              </view>
              <view class="teacher-highlights">
                <view v-if="teacher.years_of_experience" class="highlight-chip">
                  <text class="highlight-label">教龄</text>
                  <text class="highlight-value">{{ teacher.years_of_experience }}年</text>
                </view>
                <view v-if="teacher.subjects?.length" class="highlight-chip">
                  <text class="highlight-label">科目</text>
                  <text class="highlight-value">{{ teacher.subjects.length }}项</text>
                </view>
                <view v-if="teacher.certificates?.length" class="highlight-chip">
                  <text class="highlight-label">证书</text>
                  <text class="highlight-value">{{ teacher.certificates.length }}张</text>
                </view>
              </view>
            </view>
          </view>

          <view class="card-body">
            <view v-if="teacher.subjects && teacher.subjects.length > 0" class="info-row">
              <text class="label">教授科目</text>
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
            <view v-if="teacher.bio" class="info-row bio">
              <text class="label">教师简介</text>
              <text class="value bio-text">{{ teacher.bio }}</text>
            </view>
          </view>

          <view class="card-footer">
            <wd-button size="small" plain custom-class="teacher-action teacher-action--edit" @click.stop="handleEdit(teacher.id)">编辑</wd-button>
            <wd-button
              size="small"
              plain
              custom-class="teacher-action teacher-action--delete"
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
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.teacher-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  min-width: 0;
}

.info-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.name-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}

.teacher-name {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gender-tag {
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  flex-shrink: 0;

  &.male {
    color: #1677ff;
    background-color: rgba(22, 119, 255, 0.12);
  }

  &.female {
    color: #eb2f96;
    background-color: rgba(235, 47, 150, 0.12);
  }
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx 14rpx;
  font-size: 24rpx;
  border-radius: 999rpx;
  flex-shrink: 0;

  .status-dot {
    width: 10rpx;
    height: 10rpx;
    border-radius: 50%;
    background-color: currentColor;
  }

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
  font-weight: 500;
}

.teacher-phone {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
}

.teacher-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx 20rpx;
  align-items: center;
}

.teacher-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.highlight-chip {
  min-width: 132rpx;
  padding: 12rpx 16rpx;
  border-radius: 14rpx;
  background: linear-gradient(180deg, #f8fff2 0%, #f3fce8 100%);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.highlight-label {
  font-size: 22rpx;
  color: $uni-text-color-tertiary;
}

.highlight-value {
  font-size: 26rpx;
  color: $uni-text-color;
  font-weight: 600;
}

.card-body {
  margin-bottom: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid $uni-border-color-light;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  font-size: 28rpx;
  margin-bottom: 20rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.label {
  color: $uni-text-color-secondary;
  font-size: 24rpx;
  flex-shrink: 0;
}

.value {
  color: $uni-text-color;
  word-break: break-all;
}

.bio-text {
  line-height: 1.7;
  color: $uni-text-color-secondary;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.subjects {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.subject-tag {
  padding: 8rpx 16rpx;
  font-size: 24rpx;
  background-color: $uni-color-primary-lighter;
  color: $uni-color-primary;
  border-radius: 999rpx;
}

.card-footer {
  display: flex;
  gap: 16rpx;
  justify-content: flex-end;
}

:deep(.teacher-action) {
  min-width: 132rpx;
  border-radius: 999rpx !important;
  font-size: 26rpx !important;
}

:deep(.teacher-action--edit.is-plain) {
  color: $uni-color-primary !important;
  border-color: rgba(82, 196, 26, 0.35) !important;
  background-color: rgba(82, 196, 26, 0.06) !important;
}

:deep(.teacher-action--delete.is-plain) {
  color: $uni-color-error !important;
  border-color: rgba(245, 34, 45, 0.28) !important;
  background-color: rgba(245, 34, 45, 0.05) !important;
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
