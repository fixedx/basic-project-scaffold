<template>
  <view class="page">
    <view v-if="loading" class="loading">
      <Loading text="加载中..." />
    </view>

    <view v-else class="container">
      <!-- 筛选栏 -->
      <view class="filter-bar">
        <wd-search 
          v-model="searchKeyword" 
          placeholder="搜索教室名称" 
          hide-cancel
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

      <!-- 教室列表 -->
      <view v-if="classroomList.length > 0" class="classroom-list">
        <view
          v-for="classroom in classroomList"
          :key="classroom.id"
          class="classroom-card"
        >
          <view class="card-header">
            <view class="classroom-name">{{ classroom.name }}</view>
            <view class="status-tag" :class="`status-${classroom.status}`">
              {{ getStatusLabel(classroom.status) }}
            </view>
          </view>

          <view class="card-body">
            <view class="info-row">
              <text class="label">容纳人数：</text>
              <text class="value">{{ classroom.capacity }}人</text>
            </view>
            <view v-if="classroom.area" class="info-row">
              <text class="label">面积：</text>
              <text class="value">{{ classroom.area }}㎡</text>
            </view>
            <view v-if="classroom.floor" class="info-row">
              <text class="label">楼层：</text>
              <text class="value">{{ classroom.floor }}</text>
            </view>
            <view v-if="classroom.facilities && classroom.facilities.length > 0" class="info-row">
              <text class="label">设施：</text>
              <text class="value">{{ classroom.facilities.join('、') }}</text>
            </view>
            <view v-if="classroom.description" class="info-row description">
              <text class="label">备注：</text>
              <text class="value">{{ classroom.description }}</text>
            </view>
          </view>

          <view class="card-footer">
            <wd-button size="small" @click.stop="handleEdit(classroom.id)">编辑</wd-button>
            <wd-button
              size="small"
              type="error"
              @click.stop="handleDelete(classroom.id, classroom.name)"
            >
              删除
            </wd-button>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <EmptyState 
        v-else 
        icon="icon-store" 
        text="暂无教室" 
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
import { classroomApi, type ClassroomInfo } from '@/api/classroom'
import Loading from '@/components/Loading/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
const message = useMessage()

const loading = ref(true)
const institutionId = ref('')
const classroomList = ref<ClassroomInfo[]>([])
const searchKeyword = ref('')
const filterStatus = ref<string>('')

// 时间过滤参数（从URL获取）
const periodFilter = ref('')
const startDateFilter = ref('')
const endDateFilter = ref('')

const statusOptions = [
  { label: '全部', value: '' },
  { label: '可用', value: 'available' },
  { label: '维护中', value: 'maintenance' },
  { label: '已停用', value: 'disabled' },
]

onLoad((options) => {
  institutionId.value = options?.institutionId || ''
  periodFilter.value = options?.period || ''
  startDateFilter.value = options?.startDate || ''
  endDateFilter.value = options?.endDate || ''
  if (!institutionId.value) {
    uni.showToast({ title: '缺少机构ID', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
    return
  }
})

onMounted(() => {
  loadClassrooms()
  // 监听页面刷新事件
  uni.$on('refreshClassroomList', () => {
    loadClassrooms()
  })
})

/**
 * 加载教室列表
 */
const loadClassrooms = async () => {
  try {
    loading.value = true
    const res = await classroomApi.getList({
      institutionId: institutionId.value,
      keyword: searchKeyword.value,
      status: filterStatus.value as any,
      period: periodFilter.value || undefined,
      startDate: startDateFilter.value || undefined,
      endDate: endDateFilter.value || undefined,
    })
    classroomList.value = res
  } catch (error) {
    console.error('加载教室列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 搜索
 */
const handleSearch = () => {
  loadClassrooms()
}

/**
 * 筛选状态
 */
const handleFilterStatus = (status: string) => {
  filterStatus.value = status
  loadClassrooms()
}

/**
 * 获取状态标签
 */
const getStatusLabel = (status: string) => {
  const item = statusOptions.find((s) => s.value === status)
  return item?.label || status
}

/**
 * 添加教室
 */
const handleAdd = () => {
  uni.navigateTo({
    url: `/pages/institution/classroom-edit/index?institutionId=${institutionId.value}`,
  })
}

/**
 * 编辑教室
 */
const handleEdit = (id: string) => {
  uni.navigateTo({
    url: `/pages/institution/classroom-edit/index?id=${id}&institutionId=${institutionId.value}`,
  })
}

/**
 * 删除教室
 */
const handleDelete = async (id: string, name: string) => {
  const confirmed = await message.confirm({
    msg: `确定要删除教室"${name}"吗？`,
    title: '删除确认',
  })

  if (!confirmed) return

  try {
    await classroomApi.delete(id)
    uni.showToast({ title: '删除成功', icon: 'success' })
    loadClassrooms()
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

.classroom-list {
  padding: 24rpx 32rpx;
}

.classroom-card {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.classroom-name {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
}

.status-tag {
  padding: 8rpx 16rpx;
  font-size: 24rpx;
  border-radius: 8rpx;

  &.status-available {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
  }

  &.status-maintenance {
    background-color: #fff3e0;
    color: $uni-color-warning;
  }

  &.status-disabled {
    background-color: #fafafa;
    color: $uni-text-color-disable;
  }
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

  &.description {
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
