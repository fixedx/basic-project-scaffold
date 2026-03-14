<template>
  <view class="help-detail-page">
    <view v-if="article" class="article-container">
      <!-- 文章标题 -->
      <view class="article-header">
        <text class="article-title">{{ article.title }}</text>
        <view class="article-meta">
          <text class="meta-category">{{ categoryName }}</text>
        </view>
      </view>

      <!-- 文章内容 -->
      <view class="article-body">
        <rich-text :nodes="renderedContent"></rich-text>
      </view>

      <!-- 反馈 -->
      <view class="feedback-section">
        <text class="feedback-title">这篇文章对您有帮助吗？</text>
        <view class="feedback-actions">
          <view
            class="feedback-btn"
            :class="{ active: feedback === 'yes' }"
            @click="handleFeedback('yes')"
          >
            <text class="iconfont icon-good"></text>
            <text class="feedback-text">有帮助</text>
          </view>
          <view
            class="feedback-btn"
            :class="{ active: feedback === 'no' }"
            @click="handleFeedback('no')"
          >
            <text class="iconfont icon-bad"></text>
            <text class="feedback-text">没帮助</text>
          </view>
        </view>
      </view>

      <!-- 相关文章 -->
      <view v-if="relatedArticles.length > 0" class="related-section">
        <text class="related-title">相关问题</text>
        <view class="related-list">
          <view
            v-for="related in relatedArticles"
            :key="related.id"
            class="related-item"
            @click="goToArticle(related.id)"
          >
            <text class="related-item-title">{{ related.title }}</text>
            <text class="iconfont icon-right related-arrow"></text>
          </view>
        </view>
      </view>
    </view>

    <!-- 文章不存在 -->
    <EmptyState
      v-else
      icon="icon-info"
      text="文章不存在"
    />

    <view class="safe-area"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import EmptyState from '@/components/EmptyState/index.vue'
import { helpData } from './help-data'

const categoryId = ref('')
const articleId = ref('')
const feedback = ref('')

/** 当前文章 */
const article = computed(() =>
  helpData.articles.find((a) => a.id === articleId.value)
)

/** 分类名称 */
const categoryName = computed(() => {
  const cat = helpData.categories.find((c) => c.id === categoryId.value)
  return cat?.name || ''
})

/** 渲染 Markdown 为 HTML */
const renderedContent = computed(() => {
  if (!article.value) return ''
  return markdownToHtml(article.value.content)
})

/** 相关文章（同分类下的其他文章，最多5篇） */
const relatedArticles = computed(() =>
  helpData.articles
    .filter((a) => a.categoryId === categoryId.value && a.id !== articleId.value)
    .slice(0, 5)
)

/** 简单的 Markdown → HTML 转换 */
function markdownToHtml(md: string): string {
  let html = md.trim()

  // 表格处理（需在其他规则前处理）
  html = html.replace(/\n\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, (_, header, body) => {
    const headers = header
      .split('|')
      .map((h: string) => h.trim())
      .filter(Boolean)
    const rows = body
      .trim()
      .split('\n')
      .filter((r: string) => r.trim())

    let table = '<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">'
    table += '<thead><tr>'
    headers.forEach((h: string) => {
      table += `<th style="padding:8px 12px;border:1px solid #e8e8e8;background:#f5f5f5;text-align:left;font-weight:600;">${h}</th>`
    })
    table += '</tr></thead><tbody>'
    rows.forEach((row: string) => {
      const cells = row
        .split('|')
        .map((c: string) => c.trim())
        .filter(Boolean)
      table += '<tr>'
      cells.forEach((c: string) => {
        // 处理单元格内加粗
        const cellContent = c.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        table += `<td style="padding:8px 12px;border:1px solid #e8e8e8;">${cellContent}</td>`
      })
      table += '</tr>'
    })
    table += '</tbody></table>'
    return table
  })

  // 标题
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:16px;font-weight:600;color:#333;margin:20px 0 8px;">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:600;color:#333;margin:24px 0 12px;">$1</h2>')

  // 加粗
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600;">$1</strong>')

  // 有序列表
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;padding:4px 0;"><span style="color:#52c41a;font-weight:500;min-width:20px;">$1.</span><span style="flex:1;">$2</span></div>')

  // 无序列表
  html = html.replace(/^- (.+)$/gm, '<div style="display:flex;padding:4px 0;"><span style="color:#52c41a;margin-right:8px;">•</span><span style="flex:1;">$1</span></div>')

  // 段落（连续空行）
  html = html.replace(/\n\n+/g, '<div style="height:12px;"></div>')

  // 单行换行
  html = html.replace(/\n/g, '<br/>')

  return html
}

/** 跳转到其他文章 */
const goToArticle = (id: string) => {
  uni.redirectTo({
    url: `/pages/help-center/detail?categoryId=${categoryId.value}&articleId=${id}`,
  })
}

/** 反馈 */
const handleFeedback = (type: string) => {
  feedback.value = type
  uni.showToast({
    title: type === 'yes' ? '感谢您的反馈！' : '我们会继续改进',
    icon: 'none',
  })
}

onLoad((options) => {
  categoryId.value = options?.categoryId || ''
  articleId.value = options?.articleId || ''

  if (article.value) {
    uni.setNavigationBarTitle({ title: article.value.title })
  }
})
</script>

<style lang="scss" scoped>
.help-detail-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.article-container {
  padding: 0 0 24rpx;
}

/* 文章头部 */
.article-header {
  background-color: $uni-bg-color;
  padding: 40rpx 32rpx 32rpx;
  margin-bottom: 16rpx;
}

.article-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: $uni-text-color;
  line-height: 1.5;
  margin-bottom: 16rpx;
}

.article-meta {
  display: flex;
  align-items: center;
}

.meta-category {
  font-size: 24rpx;
  color: $uni-color-primary;
  background-color: $uni-color-primary-lighter;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
}

/* 文章内容 */
.article-body {
  background-color: $uni-bg-color;
  padding: 32rpx;
  margin-bottom: 16rpx;
  font-size: 28rpx;
  color: $uni-text-color;
  line-height: 1.8;
}

/* 反馈 */
.feedback-section {
  background-color: $uni-bg-color;
  padding: 40rpx 32rpx;
  margin-bottom: 16rpx;
  text-align: center;
}

.feedback-title {
  display: block;
  font-size: 28rpx;
  color: $uni-text-color-secondary;
  margin-bottom: 24rpx;
}

.feedback-actions {
  display: flex;
  justify-content: center;
  gap: 64rpx;
}

.feedback-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 40rpx;
  border-radius: 36rpx;
  background-color: $uni-bg-color-grey;
  transition: all 0.3s;

  .iconfont {
    font-size: 32rpx;
    color: $uni-text-color-tertiary;
  }

  &.active {
    background-color: $uni-color-primary-lighter;

    .iconfont {
      color: $uni-color-primary;
    }

    .feedback-text {
      color: $uni-color-primary;
    }
  }
}

.feedback-text {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
}

/* 相关文章 */
.related-section {
  margin: 0 32rpx;
}

.related-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: $uni-text-color;
  margin-bottom: 16rpx;
}

.related-list {
  border-radius: 16rpx;
  overflow: hidden;
}

.related-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 24rpx;
  background-color: $uni-bg-color;
  border-bottom: 1rpx solid $uni-border-color-light;

  &:last-child {
    border-bottom: none;
  }
}

.related-item-title {
  flex: 1;
  font-size: 28rpx;
  color: $uni-text-color;
}

.related-arrow {
  font-size: 24rpx;
  color: $uni-text-color-disable;
  margin-left: 16rpx;
}

.safe-area {
  height: 40rpx;
}
</style>
