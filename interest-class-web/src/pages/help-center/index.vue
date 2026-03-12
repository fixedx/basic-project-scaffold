<template>
  <view class="help-center-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap" @click="focusSearch">
        <text class="iconfont icon-search search-icon"></text>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索问题"
          confirm-type="search"
          @confirm="handleSearch"
        />
        <text
          v-if="keyword"
          class="iconfont icon-close clear-icon"
          @click.stop="clearSearch"
        ></text>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-if="keyword && filteredArticles.length > 0" class="search-results">
      <text class="result-hint">找到 {{ filteredArticles.length }} 个相关问题</text>
      <view
        v-for="article in filteredArticles"
        :key="article.id"
        class="article-item"
        @click="goToDetail(article.categoryId, article.id)"
      >
        <text class="article-title">{{ article.title }}</text>
        <text class="iconfont icon-right article-arrow"></text>
      </view>
    </view>

    <!-- 搜索无结果 -->
    <view v-else-if="keyword && filteredArticles.length === 0" class="empty-search">
      <text class="empty-text">没有找到相关问题</text>
      <text class="empty-hint">换个关键词试试吧</text>
    </view>

    <!-- 分类列表 -->
    <view v-else class="category-list">
      <!-- 热门问题 -->
      <view class="hot-section">
        <view class="section-header">
          <text class="section-title">🔥 热门问题</text>
        </view>
        <view class="hot-list">
          <view
            v-for="article in hotArticles"
            :key="article.id"
            class="article-item"
            @click="goToDetail(article.categoryId, article.id)"
          >
            <text class="article-title">{{ article.title }}</text>
            <text class="iconfont icon-right article-arrow"></text>
          </view>
        </view>
      </view>

      <!-- 分类卡片 -->
      <view class="section-header">
        <text class="section-title">📚 帮助分类</text>
      </view>
      <view class="category-grid">
        <view
          v-for="category in categories"
          :key="category.id"
          class="category-card"
          @click="goToCategory(category.id)"
        >
          <view class="category-icon-wrap" :class="category.colorClass">
            <text class="iconfont category-icon" :class="category.icon"></text>
          </view>
          <view class="category-info">
            <text class="category-name">{{ category.name }}</text>
            <text class="category-desc">{{ category.desc }}</text>
          </view>
          <text class="iconfont icon-right category-arrow"></text>
        </view>
      </view>

      <!-- 联系客服 -->
      <view class="contact-section">
        <view class="contact-card">
          <text class="contact-title">没有找到您的问题？</text>
          <text class="contact-desc">可以通过以下方式联系我们</text>
          <view class="contact-actions">
            <view class="contact-btn" @click="handleCallService">
              <text class="iconfont icon-phone contact-btn-icon"></text>
              <text class="contact-btn-text">客服电话</text>
            </view>
            <view class="contact-btn" @click="handleFeedback">
              <text class="iconfont icon-edit contact-btn-icon"></text>
              <text class="contact-btn-text">意见反馈</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="safe-area"></view>

    <!-- 意见反馈弹窗 -->
    <FeedbackDialog ref="feedbackDialogRef" page-source="help-center" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { helpData } from './help-data'
import FeedbackDialog from '@/components/FeedbackDialog/index.vue'

/** 分类列表 */
const categories = computed(() => helpData.categories)

/** 所有帮助文章 */
const allArticles = computed(() => helpData.articles)

/** 搜索关键词 */
const keyword = ref('')

/** 搜索框是否聚焦 */
const searchFocused = ref(false)

/** 热门文章 */
const hotArticles = computed(() => allArticles.value.filter((a) => a.hot))

/** 搜索过滤 */
const filteredArticles = computed(() => {
  if (!keyword.value.trim()) return []
  const kw = keyword.value.trim().toLowerCase()
  return allArticles.value.filter(
    (a) =>
      a.title.toLowerCase().includes(kw) ||
      a.content.toLowerCase().includes(kw),
  )
})

const focusSearch = () => {
  searchFocused.value = true
}

const clearSearch = () => {
  keyword.value = ''
}

const handleSearch = () => {
  // 搜索已通过 computed 实时过滤，confirm 时仅收起键盘
  uni.hideKeyboard()
}

/** 跳转到分类文章列表 */
const goToCategory = (categoryId: string) => {
  uni.navigateTo({
    url: `/pages/help-center/list?categoryId=${categoryId}`,
  })
}

/** 跳转到文章详情 */
const goToDetail = (categoryId: string, articleId: string) => {
  uni.navigateTo({
    url: `/pages/help-center/detail?categoryId=${categoryId}&articleId=${articleId}`,
  })
}

/** 拨打客服电话 */
const handleCallService = () => {
  uni.makePhoneCall({
    phoneNumber: '400-888-8888',
    fail: () => {
      uni.showToast({ title: '客服电话：400-888-8888', icon: 'none' })
    },
  })
}

/** 意见反馈 */
const feedbackDialogRef = ref<InstanceType<typeof FeedbackDialog> | null>(null)

const handleFeedback = () => {
  feedbackDialogRef.value?.open()
}
</script>

<style lang="scss" scoped>
.help-center-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

/* 搜索栏 */
.search-bar {
  padding: 24rpx 32rpx;
  background-color: $uni-bg-color;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  background-color: $uni-bg-color-grey;
  border-radius: 36rpx;
  padding: 0 24rpx;
  height: 72rpx;
}

.search-icon {
  font-size: 32rpx;
  color: $uni-text-color-tertiary;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: $uni-text-color;
}

.clear-icon {
  font-size: 28rpx;
  color: $uni-text-color-tertiary;
  padding: 8rpx;
}

/* 搜索结果 */
.search-results {
  padding: 0 32rpx;
}

.result-hint {
  display: block;
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
  padding: 24rpx 0 16rpx;
}

.empty-search {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 64rpx;
}

.empty-text {
  font-size: 30rpx;
  color: $uni-text-color-secondary;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: $uni-text-color-tertiary;
}

/* 文章条目 */
.article-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  background-color: $uni-bg-color;
  border-bottom: 1rpx solid $uni-border-color-light;

  &:first-child {
    border-radius: 16rpx 16rpx 0 0;
  }

  &:last-child {
    border-bottom: none;
    border-radius: 0 0 16rpx 16rpx;
  }

  &:only-child {
    border-radius: 16rpx;
  }
}

.article-title {
  flex: 1;
  font-size: 28rpx;
  color: $uni-text-color;
  line-height: 1.5;
}

.article-arrow {
  font-size: 24rpx;
  color: $uni-text-color-disable;
  margin-left: 16rpx;
}

/* 热门问题 */
.hot-section {
  padding: 0 32rpx;
  margin-bottom: 32rpx;
}

.section-header {
  padding: 24rpx 32rpx 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $uni-text-color;
}

.hot-list {
  border-radius: 16rpx;
  overflow: hidden;
}

/* 分类卡片 */
.category-grid {
  padding: 0 32rpx;
}

.category-card {
  display: flex;
  align-items: center;
  padding: 32rpx;
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.category-icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  flex-shrink: 0;

  &.color-primary {
    background-color: rgba(82, 196, 26, 0.1);
    .category-icon { color: $uni-color-primary; }
  }
  &.color-info {
    background-color: rgba(24, 144, 255, 0.1);
    .category-icon { color: $uni-color-info; }
  }
  &.color-warning {
    background-color: rgba(250, 173, 20, 0.1);
    .category-icon { color: $uni-color-warning; }
  }
  &.color-success {
    background-color: rgba(82, 196, 26, 0.1);
    .category-icon { color: $uni-color-success; }
  }
  &.color-orange {
    background-color: rgba(250, 140, 22, 0.1);
    .category-icon { color: #fa8c16; }
  }
  &.color-error {
    background-color: rgba(245, 34, 45, 0.1);
    .category-icon { color: $uni-color-error; }
  }
  &.color-purple {
    background-color: rgba(114, 46, 209, 0.1);
    .category-icon { color: #722ed1; }
  }
  &.color-grey {
    background-color: rgba(0, 0, 0, 0.04);
    .category-icon { color: $uni-text-color-secondary; }
  }
}

.category-icon {
  font-size: 40rpx;
}

.category-info {
  flex: 1;
  min-width: 0;
}

.category-name {
  display: block;
  font-size: 30rpx;
  font-weight: 500;
  color: $uni-text-color;
  margin-bottom: 6rpx;
}

.category-desc {
  display: block;
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
}

.category-arrow {
  font-size: 24rpx;
  color: $uni-text-color-disable;
  margin-left: 8rpx;
}

/* 联系客服 */
.contact-section {
  padding: 48rpx 32rpx;
}

.contact-card {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 40rpx 32rpx;
  text-align: center;
}

.contact-title {
  display: block;
  font-size: 30rpx;
  font-weight: 500;
  color: $uni-text-color;
  margin-bottom: 8rpx;
}

.contact-desc {
  display: block;
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
  margin-bottom: 32rpx;
}

.contact-actions {
  display: flex;
  justify-content: center;
  gap: 48rpx;
}

.contact-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.contact-btn-icon {
  font-size: 44rpx;
  color: $uni-color-primary;
}

.contact-btn-text {
  font-size: 24rpx;
  color: $uni-text-color-secondary;
}

.safe-area {
  height: 40rpx;
}
</style>
