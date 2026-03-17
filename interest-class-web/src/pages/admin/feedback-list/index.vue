<template>
  <view class="feedback-list-page">
    <!-- 统计卡片 -->
    <view class="stats-bar">
      <view class="stat-item" :class="{ active: currentStatus === '' }" @click="filterByStatus('')">
        <text class="stat-num">{{ statsData.total }}</text>
        <text class="stat-label">全部</text>
      </view>
      <view class="stat-item" :class="{ active: currentStatus === 'pending' }" @click="filterByStatus('pending')">
        <text class="stat-num pending">{{ statsData.pending }}</text>
        <text class="stat-label">待处理</text>
      </view>
      <view class="stat-item" :class="{ active: currentStatus === 'processing' }" @click="filterByStatus('processing')">
        <text class="stat-num processing">{{ statsData.processing }}</text>
        <text class="stat-label">处理中</text>
      </view>
      <view class="stat-item" :class="{ active: currentStatus === 'resolved' }" @click="filterByStatus('resolved')">
        <text class="stat-num resolved">{{ statsData.resolved }}</text>
        <text class="stat-label">已解决</text>
      </view>
    </view>

    <!-- 反馈列表 -->
    <view v-if="loading" class="loading-wrap">
      <wd-loading />
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else-if="feedbackList.length === 0" class="empty-wrap">
      <text class="empty-icon">📭</text>
      <text class="empty-text">暂无反馈记录</text>
    </view>

    <view v-else class="feedback-list">
      <view
        v-for="item in feedbackList"
        :key="item.id"
        class="feedback-card"
        @click="openDetail(item)"
      >
        <view class="card-header">
          <view class="user-info">
            <text class="user-name">{{ item.user_nickname || '匿名用户' }}</text>
            <text class="user-phone" v-if="item.user_phone">{{ item.user_phone }}</text>
          </view>
          <view class="status-tag" :class="item.status">
            <text>{{ getStatusLabel(item.status) }}</text>
          </view>
        </view>

        <view class="card-body">
          <view class="type-tag">
            <text>{{ getTypeLabel(item.type) }}</text>
          </view>
          <text class="content-text">{{ item.content }}</text>
        </view>

        <view class="card-footer">
          <text class="time">{{ formatTime(item.created_at) }}</text>
          <text class="source" v-if="item.page_source">来自: {{ item.page_source }}</text>
        </view>

        <!-- 已有回复 -->
        <view v-if="item.reply" class="reply-section">
          <text class="reply-label">管理员回复：</text>
          <text class="reply-content">{{ item.reply }}</text>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more" @click="loadMore">
        <text>{{ loadingMore ? '加载中...' : '加载更多' }}</text>
      </view>
    </view>

    <!-- 反馈详情/回复弹窗 -->
    <view v-if="showDetailDialog" class="detail-mask" @click="showDetailDialog = false">
      <view class="detail-dialog" @click.stop>
        <view class="detail-header">
          <text class="detail-title">反馈详情</text>
          <text class="iconfont icon-close detail-close" @click="showDetailDialog = false"></text>
        </view>

        <scroll-view scroll-y class="detail-body">
          <!-- 用户信息 -->
          <view class="detail-row">
            <text class="detail-label">用户</text>
            <text class="detail-value">{{ currentDetail?.user_nickname || '匿名' }} {{ currentDetail?.user_phone || '' }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">类型</text>
            <text class="detail-value">{{ getTypeLabel(currentDetail?.type) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">时间</text>
            <text class="detail-value">{{ formatTime(currentDetail?.created_at) }}</text>
          </view>
          <view v-if="currentDetail?.contact" class="detail-row">
            <text class="detail-label">联系方式</text>
            <text class="detail-value">{{ currentDetail.contact }}</text>
          </view>

          <!-- 反馈内容 -->
          <view class="detail-content-section">
            <text class="detail-label">反馈内容</text>
            <text class="detail-content">{{ currentDetail?.content }}</text>
          </view>

          <!-- 状态选择 -->
          <view class="detail-status-section">
            <text class="detail-label">处理状态</text>
            <view class="status-options">
              <view
                v-for="opt in statusOptions"
                :key="opt.value"
                class="status-option"
                :class="{ active: replyStatus === opt.value }"
                @click="replyStatus = opt.value"
              >
                <text>{{ opt.label }}</text>
              </view>
            </view>
          </view>

          <!-- 回复输入 -->
          <view class="detail-reply-section">
            <text class="detail-label">回复内容</text>
            <textarea
              v-model="replyContent"
              class="reply-textarea"
              placeholder="输入回复内容（选填）..."
              :maxlength="500"
            />
          </view>
        </scroll-view>

        <!-- 操作按钮 -->
        <view class="detail-actions">
          <view class="detail-btn cancel cancel-btn-common" @click="showDetailDialog = false">
            <text>取消</text>
          </view>
          <view class="detail-btn confirm" :class="{ disabled: submitting }" @click="handleReply">
            <text>{{ submitting ? '提交中...' : '提交' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { feedbackApi, type Feedback, type FeedbackStats } from '@/api/feedback'

const loading = ref(false)
const loadingMore = ref(false)
const submitting = ref(false)
const feedbackList = ref<Feedback[]>([])
const currentPage = ref(1)
const pageSize = 10
const hasMore = ref(false)
const currentStatus = ref('')

const statsData = ref<FeedbackStats>({
  pending: 0,
  processing: 0,
  resolved: 0,
  closed: 0,
  total: 0,
})

// 详情弹窗
const showDetailDialog = ref(false)
const currentDetail = ref<Feedback | null>(null)
const replyContent = ref('')
const replyStatus = ref('pending')

const statusOptions = [
  { label: '待处理', value: 'pending' },
  { label: '处理中', value: 'processing' },
  { label: '已解决', value: 'resolved' },
  { label: '已关闭', value: 'closed' },
]

const getStatusLabel = (status?: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭',
  }
  return map[status || 'pending'] || '未知'
}

const getTypeLabel = (type?: string) => {
  const map: Record<string, string> = {
    suggestion: '💡 建议',
    bug: '🐛 Bug',
    other: '📝 其他',
  }
  return map[type || 'suggestion'] || '其他'
}

const formatTime = (time?: string) => {
  if (!time) return ''
  const d = new Date(time)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}小时前`
  if (diffMin < 43200) return `${Math.floor(diffMin / 1440)}天前`

  const m = d.getMonth() + 1
  const day = d.getDate()
  const h = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${m}/${day} ${h}:${min}`
}

/** 加载统计 */
const loadStats = async () => {
  try {
    const res = await feedbackApi.getStats()
    statsData.value = res
  } catch (error) {
    console.error('获取反馈统计失败:', error)
  }
}

/** 加载列表 */
const loadList = async (reset = true) => {
  if (reset) {
    loading.value = true
    currentPage.value = 1
  } else {
    loadingMore.value = true
  }

  try {
    const res = await feedbackApi.getList({
      page: currentPage.value,
      pageSize,
      status: currentStatus.value || undefined,
    })
    if (reset) {
      feedbackList.value = res.data
    } else {
      feedbackList.value.push(...res.data)
    }
    hasMore.value = currentPage.value < res.totalPages
  } catch (error) {
    console.error('获取反馈列表失败:', error)
    uni.showToast({ title: '获取列表失败', icon: 'none' })
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

/** 按状态筛选 */
const filterByStatus = (status: string) => {
  currentStatus.value = status
  loadList(true)
}

/** 加载更多 */
const loadMore = () => {
  if (loadingMore.value || !hasMore.value) return
  currentPage.value++
  loadList(false)
}

/** 打开详情 */
const openDetail = (item: Feedback) => {
  currentDetail.value = item
  replyContent.value = item.reply || ''
  replyStatus.value = item.status
  showDetailDialog.value = true
}

/** 提交回复 */
const handleReply = async () => {
  if (submitting.value) return
  submitting.value = true

  try {
    await feedbackApi.reply(currentDetail.value!.id, {
      reply: replyContent.value.trim() || undefined,
      status: replyStatus.value as any,
    })
    showDetailDialog.value = false
    uni.showToast({ title: '操作成功', icon: 'success' })
    // 刷新
    await Promise.all([loadStats(), loadList(true)])
  } catch (error) {
    console.error('回复失败:', error)
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onLoad((options) => {
  if (options?.status) {
    currentStatus.value = options.status
  }
})

onMounted(() => {
  loadStats()
  loadList()
})
</script>

<style lang="scss" scoped>
.feedback-list-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

/* 统计栏 */
.stats-bar {
  display: flex;
  background: #fff;
  padding: 24rpx 0;
  margin-bottom: 16rpx;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 0;
  border-radius: 8rpx;
  transition: all 0.2s;

  &.active {
    background: $uni-color-primary-lighter;
  }
}

.stat-num {
  font-size: 40rpx;
  font-weight: bold;
  color: $uni-text-color;

  &.pending { color: #faad14; }
  &.processing { color: #1890ff; }
  &.resolved { color: #52c41a; }
}

.stat-label {
  font-size: 22rpx;
  color: $uni-text-color-secondary;
  margin-top: 4rpx;
}

/* 加载状态 */
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.loading-text {
  font-size: 26rpx;
  color: $uni-text-color-tertiary;
  margin-top: 16rpx;
}

/* 空状态 */
.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $uni-text-color-tertiary;
}

/* 反馈卡片 */
.feedback-list {
  padding: 0 24rpx;
}

.feedback-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 28rpx;
  font-weight: 500;
  color: $uni-text-color;
}

.user-phone {
  font-size: 22rpx;
  color: $uni-text-color-tertiary;
  margin-top: 4rpx;
}

.status-tag {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;

  &.pending { background: #fff7e6; color: #faad14; }
  &.processing { background: #e6f7ff; color: #1890ff; }
  &.resolved { background: #f6ffed; color: #52c41a; }
  &.closed { background: #f5f5f5; color: #999; }
}

.card-body {
  margin-bottom: 12rpx;
}

.type-tag {
  display: inline-block;
  font-size: 22rpx;
  color: $uni-text-color-secondary;
  margin-bottom: 8rpx;
}

.content-text {
  font-size: 28rpx;
  color: $uni-text-color;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.time {
  font-size: 22rpx;
  color: $uni-text-color-tertiary;
}

.source {
  font-size: 22rpx;
  color: $uni-text-color-disable;
}

.reply-section {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid $uni-border-color-light;
}

.reply-label {
  font-size: 22rpx;
  color: $uni-color-primary;
  margin-bottom: 4rpx;
  display: block;
}

.reply-content {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  line-height: 1.5;
}

.load-more {
  text-align: center;
  padding: 24rpx;
  font-size: 26rpx;
  color: $uni-text-color-secondary;
}

/* 详情弹窗 */
.detail-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: $uni-bg-color-mask;
  z-index: 999;
  display: flex;
  align-items: flex-end;
}

.detail-dialog {
  width: 100%;
  max-height: 85vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid $uni-border-color-light;
}

.detail-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $uni-text-color;
}

.detail-close {
  font-size: 36rpx;
  color: $uni-text-color-tertiary;
  padding: 8rpx;
}

.detail-body {
  flex: 1;
  padding: 24rpx 32rpx;
  max-height: 60vh;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid $uni-border-color-light;
}

.detail-label {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  margin-bottom: 8rpx;
  flex-shrink: 0;
}

.detail-value {
  font-size: 26rpx;
  color: $uni-text-color;
}

.detail-content-section {
  margin-top: 24rpx;
}

.detail-content {
  display: block;
  font-size: 28rpx;
  color: $uni-text-color;
  line-height: 1.6;
  padding: 16rpx;
  background: $uni-bg-color-grey;
  border-radius: 12rpx;
}

.detail-status-section {
  margin-top: 24rpx;
}

.status-options {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.status-option {
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
  background: $uni-bg-color-grey;
  font-size: 24rpx;
  color: $uni-text-color-secondary;
  transition: all 0.2s;

  &.active {
    background: $uni-color-primary-lighter;
    color: $uni-color-primary;
    font-weight: 500;
  }
}

.detail-reply-section {
  margin-top: 24rpx;
}

.reply-textarea {
  width: 100%;
  height: 180rpx;
  padding: 16rpx;
  font-size: 26rpx;
  color: $uni-text-color;
  background: $uni-bg-color-grey;
  border-radius: 12rpx;
  box-sizing: border-box;
}

.detail-actions {
  display: flex;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid $uni-border-color-light;
}

.detail-btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  font-size: 30rpx;

  &.confirm {
    background: $uni-color-primary;
    color: #fff;

    &.disabled {
      opacity: 0.6;
    }
  }
}
</style>
