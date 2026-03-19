<template>
  <view class="review-list-page">
    <!-- 顶部筛选 -->
    <view class="filter-bar">
      <view
        v-for="tab in filterTabs"
        :key="tab.value"
        class="filter-tab"
        :class="{ active: sortBy === tab.value }"
        @click="onSortChange(tab.value)"
      >
        <text>{{ tab.label }}</text>
      </view>

      <!-- 只看未回复 -->
      <view
        class="filter-tab reply-toggle"
        :class="{ active: onlyUnreplied }"
        @click="toggleUnreplied"
      >
        <text>待回复</text>
      </view>
    </view>

    <!-- 统计概览 -->
    <view class="summary-card">
      <view class="summary-item">
        <text class="summary-value">{{ total }}</text>
        <text class="summary-label">全部评价</text>
      </view>
      <view class="divider-v"></view>
      <view class="summary-item">
        <text class="summary-value">{{ avgRating.toFixed(1) }}</text>
        <text class="summary-label">平均评分</text>
      </view>
      <view class="divider-v"></view>
      <view class="summary-item">
        <text class="summary-value">{{ unrepliedCount }}</text>
        <text class="summary-label">待回复</text>
      </view>
    </view>

    <!-- 列表 -->
    <scroll-view
      scroll-y
      class="review-scroll"
      :style="{ height: scrollHeight + 'px' }"
      @scrolltolower="loadMore"
    >
      <!-- 加载中骨架 -->
      <view v-if="loading && list.length === 0" class="skeleton-wrap">
        <view v-for="i in 3" :key="i" class="skeleton-card"></view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!loading && list.length === 0" class="empty-wrap">
        <text class="iconfont icon-notice empty-icon"></text>
        <text class="empty-text">暂无{{ onlyUnreplied ? '待回复的' : '' }}评价</text>
      </view>

      <!-- 评价卡片 -->
      <view v-else>
        <view
          v-for="review in list"
          :key="review.id"
          class="review-card"
        >
          <!-- 用户信息 + 评分 -->
          <view class="card-header">
            <view class="user-info">
              <AsyncImage
                v-if="review.user_avatar"
                :url="review.user_avatar"
                width="72rpx"
                height="72rpx"
                mode="aspectFill"
                custom-class="user-avatar"
              />
              <view v-else class="avatar-placeholder">
                <text>{{ (review.user_nickname || '用').charAt(0) }}</text>
              </view>
              <view class="user-meta">
                <text class="user-name">{{ review.user_nickname || '用户' }}</text>
                <text class="course-name">{{ review.course_name || '' }}</text>
              </view>
            </view>
            <view class="rating-wrap">
              <view class="stars">
                <text
                  v-for="n in 5"
                  :key="n"
                  class="iconfont"
                  :class="n <= review.rating ? 'icon-favorites-fill star-filled' : 'icon-favorites star-empty'"
                ></text>
              </view>
              <text class="review-time">{{ formatTime(review.created_at) }}</text>
            </view>
          </view>

          <!-- 评价内容 -->
          <view class="card-content">
            <text class="content-text">{{ review.content }}</text>
            <!-- 评价图片 -->
            <view v-if="review.images && review.images.length > 0" class="image-row">
              <AsyncImage
                v-for="(img, idx) in review.images.slice(0, 3)"
                :key="idx"
                :url="img"
                width="160rpx"
                height="160rpx"
                mode="aspectFill"
                custom-class="review-img"
                :enable-preview="true"
                :preview-urls="review.images!"
                :preview-current="idx"
              />
            </view>
          </view>

          <!-- 已有回复 -->
          <view v-if="review.reply" class="reply-block">
            <text class="reply-label">商家回复：</text>
            <text class="reply-content">{{ review.reply }}</text>
            <view class="reply-actions">
              <text class="reply-time">{{ formatTime(review.replied_at!) }}</text>
              <text
                v-if="canEditReply(review.replied_at)"
                class="edit-btn"
                @click="openEditReply(review)"
              >修改回复</text>
            </view>
          </view>

          <!-- 回复输入区（未回复） -->
          <view v-else class="reply-input-block">
            <input
              v-model="replyDraft[review.id]"
              class="reply-input"
              placeholder="回复此评价…"
              maxlength="500"
              :confirm-hold="true"
            />
            <view
              class="reply-submit-btn"
              :class="{ disabled: !replyDraft[review.id]?.trim() }"
              @click="submitReply(review.id)"
            >
              <text>发送</text>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="loadingMore" class="loading-more">
          <text>加载中…</text>
        </view>
        <view v-else-if="noMore && list.length > 0" class="no-more">
          <text>— 已显示全部 —</text>
        </view>
      </view>
    </scroll-view>

    <!-- 编辑回复弹窗 -->
    <view v-if="editDialogVisible" class="dialog-mask" @click.self="closeEditDialog">
      <view class="edit-dialog">
        <text class="dialog-title">修改回复</text>
        <textarea
          v-model="editReplyContent"
          class="dialog-textarea"
          placeholder="修改你的回复…"
          maxlength="500"
          :auto-height="true"
        />
        <text class="char-count">{{ editReplyContent.length }}/500</text>
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @click="closeEditDialog">取消</view>
          <view class="dialog-btn confirm" @click="submitEditReply">保存</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { reviewApi, type Review } from '@/api/review'
import AsyncImage from '@/components/AsyncImage/index.vue'

// 扩展 Review 类型以携带关联字段
interface ReviewWithMeta extends Review {
  user_nickname?: string
  user_avatar?: string
  course_name?: string
}

// ─── 状态 ──────────────────────────────────────────
const institutionId = ref('')
const list = ref<ReviewWithMeta[]>([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const noMore = ref(false)
const sortBy = ref<'created_at_desc' | 'rating_desc'>('created_at_desc')
const onlyUnreplied = ref(false)
const replyDraft = ref<Record<string, string>>({})

// 编辑回复弹窗
const editDialogVisible = ref(false)
const editingReviewId = ref('')
const editReplyContent = ref('')

// 统计
const avgRating = computed(() => {
  if (list.value.length === 0) return 0
  const sum = list.value.reduce((acc, r) => acc + (r.rating || 0), 0)
  return sum / list.value.length
})
const unrepliedCount = computed(() => list.value.filter(r => !r.reply).length)

// 滚动区高度
const scrollHeight = ref(0)

// 筛选 Tab
const filterTabs = [
  { label: '最新', value: 'created_at_desc' as const },
  { label: '好评优先', value: 'rating_desc' as const },
]

// ─── 生命周期 ────────────────────────────────────────
onLoad(() => {
  institutionId.value =
    uni.getStorageSync('institutionId') || ''
  const sysInfo = uni.getSystemInfoSync()
  scrollHeight.value = sysInfo.windowHeight - uni.upx2px(180)
})

onMounted(() => {
  if (institutionId.value) {
    loadList(true)
  }
})

// ─── 数据加载 ─────────────────────────────────────────
async function loadList(reset = false) {
  if (loading.value || loadingMore.value) return
  if (reset) {
    page.value = 1
    noMore.value = false
    list.value = []
    loading.value = true
  } else {
    if (noMore.value) return
    loadingMore.value = true
  }

  try {
    const res = await reviewApi.getInstitutionList(institutionId.value, {
      page: page.value,
      pageSize,
      sort_by: sortBy.value,
    })

    let data: ReviewWithMeta[] = res.data || []

    // 客户端过滤待回复
    if (onlyUnreplied.value) {
      data = data.filter(r => !r.reply)
    }

    if (reset) {
      list.value = data
      total.value = res.total
    } else {
      list.value = [...list.value, ...data]
    }

    if (list.value.length >= res.total || data.length < pageSize) {
      noMore.value = true
    } else {
      page.value++
    }
  } catch {
    uni.showToast({ title: '加载失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  if (!noMore.value) loadList(false)
}

// ─── 筛选 ────────────────────────────────────────────
function onSortChange(val: typeof sortBy.value) {
  sortBy.value = val
  loadList(true)
}

function toggleUnreplied() {
  onlyUnreplied.value = !onlyUnreplied.value
  loadList(true)
}

// ─── 回复 ─────────────────────────────────────────────
async function submitReply(reviewId: string) {
  const content = replyDraft.value[reviewId]?.trim()
  if (!content) return

  uni.showLoading({ title: '提交中' })
  try {
    await reviewApi.reply(reviewId, { reply: content })
    uni.showToast({ title: '回复成功', icon: 'success' })
    replyDraft.value[reviewId] = ''
    // 本地更新，避免重新拉取
    const target = list.value.find(r => r.id === reviewId)
    if (target) {
      target.reply = content
      target.replied_at = new Date().toISOString()
    }
  } catch {
    uni.showToast({ title: '回复失败，请重试', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// ─── 编辑回复 ──────────────────────────────────────────
function canEditReply(repliedAt?: string): boolean {
  if (!repliedAt) return false
  const diff = (Date.now() - new Date(repliedAt).getTime()) / (1000 * 60 * 60)
  return diff < 24
}

function openEditReply(review: ReviewWithMeta) {
  editingReviewId.value = review.id
  editReplyContent.value = review.reply || ''
  editDialogVisible.value = true
}

function closeEditDialog() {
  editDialogVisible.value = false
  editingReviewId.value = ''
  editReplyContent.value = ''
}

async function submitEditReply() {
  const content = editReplyContent.value.trim()
  if (!content) {
    uni.showToast({ title: '回复内容不能为空', icon: 'none' })
    return
  }

  uni.showLoading({ title: '保存中' })
  try {
    await reviewApi.updateReply(editingReviewId.value, { reply: content })
    uni.showToast({ title: '修改成功', icon: 'success' })
    const target = list.value.find(r => r.id === editingReviewId.value)
    if (target) {
      target.reply = content
    }
    closeEditDialog()
  } catch (e: any) {
    const msg = e?.data?.message || e?.message || '修改失败，请重试'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// ─── 工具函数 ──────────────────────────────────────────
function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
</script>

<style lang="scss" scoped>
.review-list-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

/* ── 顶部筛选 ── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 32rpx;
  background-color: $uni-bg-color;
  border-bottom: 1rpx solid $uni-border-color-light;
}

.filter-tab {
  padding: 10rpx 28rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  background-color: $uni-bg-color-grey;
  border: 1rpx solid transparent;
  transition: all 0.2s;

  &.active {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
    border-color: $uni-color-primary;
  }

  &.reply-toggle {
    margin-left: auto;
    background-color: $uni-bg-color-grey;

    &.active {
      background-color: #fff7e6;
      color: #fa8c16;
      border-color: #ffd591;
    }
  }
}

/* ── 统计概览 ── */
.summary-card {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 32rpx 0;
  margin: 20rpx 32rpx;
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.summary-value {
  font-size: 48rpx;
  font-weight: bold;
  color: $uni-color-primary;
}

.summary-label {
  font-size: 24rpx;
  color: $uni-text-color-secondary;
}

.divider-v {
  width: 1rpx;
  height: 60rpx;
  background-color: $uni-border-color-light;
}

/* ── 滚动区 ── */
.review-scroll {
  padding: 0 32rpx 32rpx;
}

/* ── 骨架 ── */
.skeleton-wrap {
  padding-top: 24rpx;
}

.skeleton-card {
  height: 240rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── 空状态 ── */
.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
  gap: 24rpx;
}

.empty-icon {
  font-size: 80rpx;
  color: $uni-text-color-disable;
}

.empty-text {
  font-size: 28rpx;
  color: $uni-text-color-tertiary;
}

/* ── 评价卡片 ── */
.review-card {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-top: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

/* 头部 */
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}

:deep(.user-avatar) {
  border-radius: 50%;
}

.avatar-placeholder {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background-color: $uni-color-primary-lighter;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: $uni-color-primary;
  font-weight: bold;
  flex-shrink: 0;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.user-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $uni-text-color;
}

.course-name {
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
}

.rating-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.stars {
  display: flex;
  gap: 4rpx;
}

.star-filled {
  color: #faad14;
  font-size: 28rpx;
}

.star-empty {
  color: $uni-text-color-disable;
  font-size: 28rpx;
}

.review-time {
  font-size: 22rpx;
  color: $uni-text-color-tertiary;
}

/* 内容 */
.card-content {
  margin-bottom: 20rpx;
}

.content-text {
  font-size: 28rpx;
  color: $uni-text-color;
  line-height: 1.6;
}

.image-row {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
}

:deep(.review-img) {
  border-radius: 8rpx;
}

/* 回复块 */
.reply-block {
  background-color: $uni-bg-color-grey;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
}

.reply-label {
  font-size: 24rpx;
  font-weight: 600;
  color: $uni-color-primary;
  margin-right: 8rpx;
}

.reply-content {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  line-height: 1.5;
}

.reply-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
}

.reply-time {
  font-size: 22rpx;
  color: $uni-text-color-tertiary;
}

.edit-btn {
  font-size: 24rpx;
  color: $uni-color-primary;
  padding: 4rpx 16rpx;
  border: 1rpx solid $uni-color-primary;
  border-radius: 24rpx;
}

/* 回复输入区 */
.reply-input-block {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background-color: $uni-bg-color-grey;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
}

.reply-input {
  flex: 1;
  font-size: 26rpx;
  color: $uni-text-color;
  min-height: 60rpx;
}

.reply-submit-btn {
  padding: 12rpx 28rpx;
  background-color: $uni-color-primary;
  border-radius: 32rpx;
  white-space: nowrap;
  flex-shrink: 0;

  text {
    font-size: 26rpx;
    color: #fff;
  }

  &.disabled {
    background-color: $uni-text-color-disable;
  }
}

/* 加载更多 */
.loading-more,
.no-more {
  text-align: center;
  padding: 32rpx 0;
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
}

/* ── 编辑回复弹窗 ── */
.dialog-mask {
  position: fixed;
  inset: 0;
  background-color: $uni-bg-color-mask;
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.edit-dialog {
  width: 100%;
  background-color: $uni-bg-color;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 40rpx calc(40rpx + env(safe-area-inset-bottom));
}

.dialog-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-bottom: 32rpx;
  text-align: center;
}

.dialog-textarea {
  width: 100%;
  min-height: 200rpx;
  font-size: 28rpx;
  color: $uni-text-color;
  background-color: $uni-bg-color-grey;
  border-radius: 12rpx;
  padding: 20rpx;
  box-sizing: border-box;
  line-height: 1.6;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: $uni-text-color-tertiary;
  margin-top: 8rpx;
}

.dialog-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 32rpx;
}

.dialog-btn {
  flex: 1;
  padding: 24rpx 0;
  text-align: center;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: 600;

  &.cancel {
    background-color: $uni-bg-color-grey;
    color: $uni-text-color-secondary;
  }

  &.confirm {
    background-color: $uni-color-primary;
    color: #fff;
  }
}
</style>
