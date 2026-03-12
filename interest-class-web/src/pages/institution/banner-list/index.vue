<template>
  <view class="page">
    <!-- 顶部操作栏 -->
    <view class="header">
      <view class="header-title">Banner 管理</view>
      <wd-button type="primary" size="small" @click="handleAdd">
        <text class="iconfont icon-add" style="font-size: 28rpx;"></text>
        添加 Banner
      </wd-button>
    </view>

    <!-- Banner 列表 -->
    <view class="banner-list">
      <view
        v-for="banner in bannerList"
        :key="banner.id"
        class="banner-item"
      >
        <!-- Banner 图片 -->
        <AsyncImage
          :url="banner.image"
          width="100%"
          height="300rpx"
          mode="aspectFill"
          class="banner-image"
        />

        <!-- Banner 信息 -->
        <view class="banner-info">
          <view class="banner-title">{{ banner.title }}</view>
          <view class="banner-meta">
            <text class="meta-item">排序: {{ banner.sort }}</text>
            <text
              class="meta-item"
              :class="`status-${banner.status}`"
            >
              {{ banner.status === 'active' ? '启用' : '停用' }}
            </text>
            <text class="meta-item" v-if="banner.link_type !== 'none'">
              {{ getLinkTypeLabel(banner.link_type) }}
            </text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="banner-actions">
          <wd-button size="small" @click="handleEdit(banner)">
            编辑
          </wd-button>
          <wd-button
            size="small"
            :type="banner.status === 'active' ? 'warning' : 'success'"
            @click="handleToggleStatus(banner)"
          >
            {{ banner.status === 'active' ? '停用' : '启用' }}
          </wd-button>
          <wd-button size="small" type="error" @click="handleDelete(banner)">
            删除
          </wd-button>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="bannerList.length === 0" class="empty-state">
        <text class="iconfont icon-picture" style="font-size: 80rpx; color: #d9d9d9;"></text>
        <text class="empty-text">暂无 Banner</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { bannerApi, type Banner } from '@/api'
import { showSuccessToast, showErrorToast, showConfirmDialog } from '@/utils/toast'
import AsyncImage from '@/components/AsyncImage/index.vue'

const bannerList = ref<Banner[]>([])

// 获取链接类型标签
const getLinkTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    course: '课程链接',
    url: '外部链接',
    none: '无链接',
  }
  return map[type] || type
}

// 加载 Banner 列表
const loadBanners = async () => {
  try {
    const data = await bannerApi.getList()
    bannerList.value = data
  } catch (error) {
    showErrorToast('加载失败')
  }
}

// 添加 Banner
const handleAdd = () => {
  uni.navigateTo({
    url: '/pages/institution/banner-edit/index',
  })
}

// 编辑 Banner
const handleEdit = (banner: Banner) => {
  uni.navigateTo({
    url: `/pages/institution/banner-edit/index?id=${banner.id}`,
  })
}

// 切换状态
const handleToggleStatus = async (banner: Banner) => {
  const newStatus = banner.status === 'active' ? 'inactive' : 'active'
  const action = newStatus === 'active' ? '启用' : '停用'

  const confirmed = await showConfirmDialog(`确定要${action}此 Banner 吗？`)
  if (!confirmed) return

  try {
    await bannerApi.update(banner.id, { status: newStatus })
    showSuccessToast(`${action}成功`)
    loadBanners()
  } catch (error) {
    showErrorToast(`${action}失败`)
  }
}

// 删除 Banner
const handleDelete = async (banner: Banner) => {
  const confirmed = await showConfirmDialog('确定要删除此 Banner 吗？')
  if (!confirmed) return

  try {
    await bannerApi.delete(banner.id)
    showSuccessToast('删除成功')
    loadBanners()
  } catch (error) {
    showErrorToast('删除失败')
  }
}

onMounted(() => {
  loadBanners()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background-color: $uni-bg-color;
  border-bottom: 1rpx solid $uni-border-color-secondary;
}

.header-title {
  font-size: 36rpx;
  font-weight: bold;
  color: $uni-text-color;
}

.banner-list {
  padding: 24rpx 32rpx;
}

.banner-item {
  margin-bottom: 24rpx;
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.banner-image {
  width: 100%;
  border-radius: 16rpx 16rpx 0 0;
}

.banner-info {
  padding: 24rpx;
}

.banner-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-bottom: 16rpx;
}

.banner-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.meta-item {
  font-size: 24rpx;
  color: $uni-text-color-secondary;
  padding: 8rpx 16rpx;
  background-color: $uni-bg-color-grey;
  border-radius: 8rpx;
}

.status-active {
  background-color: $uni-color-primary-lighter;
  color: $uni-color-primary;
}

.status-inactive {
  background-color: #fafafa;
  color: $uni-text-color-tertiary;
}

.banner-actions {
  display: flex;
  gap: 16rpx;
  padding: 24rpx;
  border-top: 1rpx solid $uni-border-color-secondary;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-text {
  margin-top: 24rpx;
  font-size: 28rpx;
  color: $uni-text-color-tertiary;
}
</style>
