<template>
  <view class="admin-announcements-page">
    <!-- 顶部操作栏 -->
    <view class="action-bar">
      <view class="status-filter">
        <view
          class="filter-tag"
          :class="{ active: filterStatus === '' }"
          @click="filterStatus = ''; loadList()"
        >全部</view>
        <view
          class="filter-tag"
          :class="{ active: filterStatus === 'active' }"
          @click="filterStatus = 'active'; loadList()"
        >启用中</view>
        <view
          class="filter-tag"
          :class="{ active: filterStatus === 'inactive' }"
          @click="filterStatus = 'inactive'; loadList()"
        >已停用</view>
      </view>
      <wd-button type="primary" size="small" @click="handleAdd">
        <text class="iconfont icon-add" style="margin-right: 8rpx;"></text>
        发布
      </wd-button>
    </view>

    <!-- 列表 -->
    <view v-if="loading" class="loading-container">
      <Loading text="加载中..." />
    </view>

    <view v-else-if="list.length === 0" class="empty-container">
      <text class="iconfont icon-notice" style="font-size: 80rpx; color: #ddd;"></text>
      <text class="empty-text">暂无公告</text>
      <wd-button type="primary" size="small" @click="handleAdd">发布公告</wd-button>
    </view>

    <view v-else class="announcement-list">
      <view
        v-for="item in list"
        :key="item.id"
        class="announcement-card"
        @click="handleEdit(item)"
      >
        <view class="card-header">
          <view class="type-badge" :class="item.type">
            {{ getTypeText(item.type) }}
          </view>
          <view class="status-badge" :class="item.status">
            {{ item.status === 'active' ? '启用' : '停用' }}
          </view>
        </view>
        <text class="card-title">{{ item.title }}</text>
        <text class="card-content">{{ item.content }}</text>
        <view class="card-footer">
          <text class="footer-time">
            <text class="iconfont icon-time"></text>
            {{ formatDate(item.created_at) }}
          </text>
          <view v-if="item.priority > 0" class="footer-priority">
            <text class="iconfont icon-pin"></text>
            优先级 {{ item.priority }}
          </view>
        </view>
        <view class="card-actions">
          <view
            class="action-btn"
            :class="item.status === 'active' ? 'warning' : 'success'"
            @click.stop="toggleStatus(item)"
          >
            {{ item.status === 'active' ? '停用' : '启用' }}
          </view>
          <view class="action-btn primary" @click.stop="handleEdit(item)">
            编辑
          </view>
          <view class="action-btn danger" @click.stop="handleDelete(item)">
            删除
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { announcementApi, type Announcement } from '@/api/announcement'
import Loading from '@/components/Loading/index.vue'

const loading = ref(false)
const list = ref<Announcement[]>([])
const filterStatus = ref('')

const loadList = async () => {
  try {
    loading.value = true
    const params: any = {}
    if (filterStatus.value) params.status = filterStatus.value
    const res = await announcementApi.getList(params)
    list.value = Array.isArray(res) ? res : []
  } catch (error) {
    console.error('加载公告列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  uni.navigateTo({ url: '/pages/admin/announcement-edit/index' })
}

const handleEdit = (item: Announcement) => {
  uni.navigateTo({ url: `/pages/admin/announcement-edit/index?id=${item.id}` })
}

const handleDelete = (item: Announcement) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除公告「${item.title}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await announcementApi.delete(item.id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadList()
        } catch (error) {
          console.error('删除失败:', error)
        }
      }
    }
  })
}

const toggleStatus = async (item: Announcement) => {
  const newStatus = item.status === 'active' ? 'inactive' : 'active'
  try {
    await announcementApi.update(item.id, { status: newStatus })
    uni.showToast({
      title: newStatus === 'active' ? '已启用' : '已停用',
      icon: 'success'
    })
    loadList()
  } catch (error) {
    console.error('状态更新失败:', error)
  }
}

const getTypeText = (type: string) => {
  const map: Record<string, string> = {
    notice: '通知',
    update: '更新',
    activity: '活动',
  }
  return map[type] || type
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

onMounted(() => {
  loadList()
})

onShow(() => {
  loadList()
})
</script>

<style lang="scss" scoped>
.admin-announcements-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background-color: $uni-bg-color;
}

.status-filter {
  display: flex;
  gap: 12rpx;
}

.filter-tag {
  padding: 8rpx 20rpx;
  font-size: 24rpx;
  border-radius: 30rpx;
  background-color: $uni-bg-color-grey;
  color: $uni-text-color-secondary;

  &.active {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
    font-weight: 600;
  }
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 80rpx 0;
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding: 120rpx 0;

  .empty-text {
    font-size: 28rpx;
    color: $uni-text-color-tertiary;
  }
}

.announcement-list {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.announcement-card {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 24rpx;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.type-badge {
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
  font-size: 22rpx;
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
    background-color: #fff7e6;
    color: $uni-color-warning;
  }
}

.status-badge {
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
  font-size: 22rpx;

  &.active {
    background-color: #f6ffed;
    color: $uni-color-success;
  }

  &.inactive {
    background-color: $uni-bg-color-grey;
    color: $uni-text-color-tertiary;
  }
}

.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: $uni-text-color;
  margin-bottom: 8rpx;
}

.card-content {
  display: block;
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 12rpx;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 16rpx;
}

.footer-time,
.footer-priority {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: $uni-text-color-tertiary;

  .iconfont {
    font-size: 22rpx;
  }
}

.card-actions {
  display: flex;
  gap: 16rpx;
  border-top: 1rpx solid $uni-border-color-light;
  padding-top: 16rpx;
}

.action-btn {
  flex: 1;
  text-align: center;
  padding: 10rpx;
  border-radius: 8rpx;
  font-size: 26rpx;

  &.primary {
    color: $uni-color-info;
    background-color: #e6f7ff;
  }

  &.success {
    color: $uni-color-success;
    background-color: #f6ffed;
  }

  &.warning {
    color: $uni-color-warning;
    background-color: #fff7e6;
  }

  &.danger {
    color: $uni-color-error;
    background-color: #fff2f0;
  }

  &:active {
    opacity: 0.7;
  }
}
</style>
