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
        <view v-if="user.phone" class="user-badge phone user-phone-badge">
          <text class="iconfont icon-phone"></text>
          {{ user.phone }}
        </view>
        <view class="card-main">
          <view class="user-avatar">
            <AsyncImage
              v-if="user.avatar"
              :url="user.avatar"
              width="96rpx"
              height="96rpx"
              mode="aspectFill"
              custom-class="avatar-img"
            />
            <view v-else class="avatar-placeholder">
              <text class="iconfont icon-customer"></text>
            </view>
          </view>
          <view class="user-info">
            <view class="user-top-row">
              <view class="name-block">
                <view class="user-name-row">
                  <text class="user-name">{{ user.nickname || '未设置昵称' }}</text>
                  <text v-if="user.gender" class="gender-tag" :class="getGenderClass(user.gender)">
                    {{ getGenderLabel(user.gender) }}
                  </text>
                </view>
                <view class="sub-row">
                  <text class="user-id">ID：{{ user.id }}</text>
                  <text v-if="user.username" class="user-account">账号：{{ user.username }}</text>
                </view>
              </view>
            </view>

            <view class="meta-grid">
              <view class="meta-card">
                <text class="meta-label">注册时间</text>
                <text class="meta-value">{{ formatDateTime(user.created_at) }}</text>
              </view>
              <view class="meta-card">
                <text class="meta-label">最近登录</text>
                <text class="meta-value">{{ formatDateTime(user.lastLoginAt) || '暂无记录' }}</text>
              </view>
            </view>

            <view class="user-meta footer-meta">
              <text v-if="user.city || user.province" class="meta-item">
                <text class="iconfont icon-location"></text>
                {{ [user.province, user.city].filter(Boolean).join(' ') || '未设置地区' }}
              </text>
              <text v-if="user.country" class="meta-item">
                <text class="iconfont icon-global"></text>
                {{ user.country }}
              </text>
            </view>
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

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

const getGenderLabel = (gender?: number) => {
  if (gender === 1) return '男'
  if (gender === 2) return '女'
  return ''
}

const getGenderClass = (gender?: number) => {
  if (gender === 1) return 'male'
  if (gender === 2) return 'female'
  return ''
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
  gap: 20rpx;
}

.user-card {
  background-color: $uni-bg-color;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
  position: relative;
}

.card-main {
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
}

.user-avatar {
  flex-shrink: 0;
}

:deep(.avatar-img) {
  border-radius: 50%;
}

.avatar-placeholder {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, $uni-color-primary-lighter, #eef8e4);
  display: flex;
  align-items: center;
  justify-content: center;

  .iconfont {
    font-size: 44rpx;
    color: $uni-color-primary;
  }
}

.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-right: 180rpx;
}

.user-top-row {
  display: flex;
  gap: 12rpx;
}

.name-block {
  flex: 1;
  min-width: 0;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 8rpx;
}

.user-name {
  font-size: 30rpx;
  font-weight: 600;
  color: $uni-text-color;
  max-width: 320rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gender-tag {
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  font-size: 22rpx;

  &.male {
    color: #1677ff;
    background-color: rgba(22, 119, 255, 0.12);
  }

  &.female {
    color: #eb2f96;
    background-color: rgba(235, 47, 150, 0.12);
  }
}

.sub-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx 20rpx;
}

.user-id,
.user-account {
  font-size: 22rpx;
  color: $uni-text-color-tertiary;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  width: fit-content;
  max-width: 100%;

  .iconfont {
    font-size: 20rpx;
    flex-shrink: 0;
  }

  &.phone {
    background-color: rgba(24, 144, 255, 0.10);
    color: #1890ff;
    border: 1rpx solid rgba(24, 144, 255, 0.18);
  }
}

.user-phone-badge {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  max-width: 170rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.meta-card {
  padding: 18rpx 20rpx;
  border-radius: 16rpx;
  background-color: $uni-bg-color-grey;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.meta-label {
  font-size: 22rpx;
  color: $uni-text-color-tertiary;
}

.meta-value {
  font-size: 24rpx;
  color: $uni-text-color;
  word-break: break-word;
}

.user-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.footer-meta {
  padding-top: 4rpx;
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
