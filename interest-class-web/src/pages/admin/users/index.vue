<template>
  <view class="admin-users-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <KeywordSearchBar
        v-model="keyword"
        placeholder="搜索昵称、手机号"
        @search="handleSearch"
        @clear="handleClear"
      />
    </view>

    <!-- 统计信息 -->
    <view class="stats-bar" v-if="total > 0">
      <text class="stats-text">共 {{ total }} 位用户</text>
    </view>

    <!-- 用户列表 -->
    <view v-if="loading && users.length === 0" class="loading-container">
      <Loading text="加载中..." />
    </view>

    <view v-else-if="users.length === 0" class="empty-container">
      <text class="iconfont icon-customer" style="font-size: 80rpx; color: #ddd;"></text>
      <text class="empty-text">{{ keyword ? '未找到匹配用户' : '暂无用户' }}</text>
    </view>

    <view v-else class="user-list">
      <view
        v-for="user in users"
        :key="user.id"
        class="user-card"
      >
        <view class="user-avatar">
          <AsyncImage
            v-if="user.avatar"
            :url="user.avatar"
            width="88rpx"
            height="88rpx"
            mode="aspectFill"
            custom-class="avatar-img"
          />
          <view v-else class="avatar-placeholder">
            <text class="iconfont icon-customer"></text>
          </view>
        </view>
        <view class="user-info">
          <view class="user-name-row">
            <text class="user-name">{{ user.nickname || '未设置昵称' }}</text>
            <view v-if="user.phone" class="user-badge phone">
              <text class="iconfont icon-phone"></text>
              {{ user.phone }}
            </view>
          </view>
          <view class="user-meta">
            <text v-if="user.username" class="meta-item">
              <text class="iconfont icon-customer"></text>
              {{ user.username }}
            </text>
            <text class="meta-item">
              <text class="iconfont icon-time"></text>
              注册: {{ formatDate(user.created_at) }}
            </text>
          </view>
          <view class="user-meta">
            <text v-if="user.lastLoginAt" class="meta-item">
              <text class="iconfont icon-time-history"></text>
              最近登录: {{ formatDate(user.lastLoginAt) }}
            </text>
            <text v-if="user.gender" class="meta-item">
              {{ user.gender === 1 ? '男' : user.gender === 2 ? '女' : '' }}
            </text>
            <text v-if="user.city" class="meta-item">
              <text class="iconfont icon-location"></text>
              {{ user.province || '' }} {{ user.city || '' }}
            </text>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more" @click="loadMore">
        <text v-if="loading">加载中...</text>
        <text v-else>加载更多</text>
      </view>
      <view v-else-if="users.length > 0" class="no-more">
        <text>没有更多了</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { adminApi } from '@/api/admin'
import KeywordSearchBar from '@/components/KeywordSearchBar/index.vue'
import AsyncImage from '@/components/AsyncImage/index.vue'
import Loading from '@/components/Loading/index.vue'

const keyword = ref('')
const loading = ref(false)
const users = ref<any[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const totalPages = ref(0)

const hasMore = computed(() => page.value < totalPages.value)

const loadUsers = async (reset = false) => {
  if (reset) {
    page.value = 1
    users.value = []
  }
  try {
    loading.value = true
    const res = await adminApi.getUsers({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
    })
    if (reset) {
      users.value = res.data || []
    } else {
      users.value.push(...(res.data || []))
    }
    total.value = res.total || 0
    totalPages.value = res.totalPages || 0
  } catch (error) {
    console.error('加载用户列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  loadUsers(true)
}

const handleClear = () => {
  keyword.value = ''
  loadUsers(true)
}

const loadMore = () => {
  if (!hasMore.value || loading.value) return
  page.value++
  loadUsers()
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
  loadUsers(true)
})

onPullDownRefresh(() => {
  loadUsers(true).then(() => {
    uni.stopPullDownRefresh()
  })
})

onReachBottom(() => {
  loadMore()
})
</script>

<style lang="scss" scoped>
.admin-users-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.search-bar {
  padding: 16rpx 24rpx;
  background-color: $uni-bg-color;
}

.stats-bar {
  padding: 16rpx 24rpx;
  background-color: $uni-bg-color;
  border-top: 1rpx solid $uni-border-color-light;
}

.stats-text {
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
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

.user-list {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.user-card {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  gap: 20rpx;
}

.user-avatar {
  flex-shrink: 0;
}

:deep(.avatar-img) {
  border-radius: 50%;
}

.avatar-placeholder {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background-color: $uni-bg-color-grey;
  display: flex;
  align-items: center;
  justify-content: center;

  .iconfont {
    font-size: 44rpx;
    color: $uni-text-color-disable;
  }
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.user-name {
  font-size: 30rpx;
  font-weight: 600;
  color: $uni-text-color;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  font-size: 22rpx;

  .iconfont {
    font-size: 20rpx;
  }

  &.phone {
    background-color: #e6f7ff;
    color: #1890ff;
  }
}

.user-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 4rpx;
}

.meta-item {
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
  display: flex;
  align-items: center;
  gap: 4rpx;

  .iconfont {
    font-size: 22rpx;
  }
}

.load-more,
.no-more {
  text-align: center;
  padding: 24rpx;
  font-size: 26rpx;
  color: $uni-text-color-tertiary;
}

.load-more {
  color: $uni-color-primary;
}
</style>
