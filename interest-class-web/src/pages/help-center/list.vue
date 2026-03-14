<template>
  <view class="help-list-page">
    <!-- 分类头部 -->
    <view class="category-header">
      <view class="category-icon-wrap" :class="currentCategory?.colorClass">
        <text class="iconfont category-icon" :class="currentCategory?.icon"></text>
      </view>
      <view class="category-info">
        <text class="category-name">{{ currentCategory?.name }}</text>
        <text class="category-desc">共 {{ articles.length }} 篇帮助文章</text>
      </view>
    </view>

    <!-- 文章列表 -->
    <view class="article-list">
      <view
        v-for="(article, index) in articles"
        :key="article.id"
        class="article-item"
        @click="goToDetail(article.id)"
      >
        <view class="article-index">{{ index + 1 }}</view>
        <text class="article-title">{{ article.title }}</text>
        <text class="iconfont icon-right article-arrow"></text>
      </view>
    </view>

    <!-- 空状态 -->
    <EmptyState v-if="articles.length === 0" icon="icon-notice" text="暂无帮助文章" />

    <view class="safe-area"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { helpData, type HelpCategory, type HelpArticle } from './help-data'
import EmptyState from '@/components/EmptyState/index.vue'

const categoryId = ref('')

/** 当前分类信息 */
const currentCategory = computed<HelpCategory | undefined>(() =>
  helpData.categories.find((c: HelpCategory) => c.id === categoryId.value)
)

/** 当前分类下的文章 */
const articles = computed<HelpArticle[]>(() =>
  helpData.articles.filter((a: HelpArticle) => a.categoryId === categoryId.value)
)

/** 跳转到文章详情 */
const goToDetail = (articleId: string) => {
  uni.navigateTo({
    url: `/pages/help-center/detail?categoryId=${categoryId.value}&articleId=${articleId}`,
  })
}

onLoad((options) => {
  categoryId.value = options?.categoryId || ''

  // 设置导航栏标题
  const cat = helpData.categories.find((c: HelpCategory) => c.id === categoryId.value)
  if (cat) {
    uni.setNavigationBarTitle({ title: cat.name })
  }
})
</script>

<style lang="scss" scoped>
.help-list-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

/* 分类头部 */
.category-header {
  display: flex;
  align-items: center;
  padding: 40rpx 32rpx;
  background-color: $uni-bg-color;
  margin-bottom: 24rpx;
}

.category-icon-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 28rpx;
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
  font-size: 44rpx;
}

.category-info {
  flex: 1;
}

.category-name {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: $uni-text-color;
  margin-bottom: 6rpx;
}

.category-desc {
  display: block;
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
}

/* 文章列表 */
.article-list {
  margin: 0 32rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.article-item {
  display: flex;
  align-items: center;
  padding: 32rpx 28rpx;
  background-color: $uni-bg-color;
  border-bottom: 1rpx solid $uni-border-color-light;

  &:last-child {
    border-bottom: none;
  }
}

.article-index {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: $uni-bg-color-grey;
  color: $uni-text-color-tertiary;
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
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

.safe-area {
  height: 40rpx;
}
</style>
