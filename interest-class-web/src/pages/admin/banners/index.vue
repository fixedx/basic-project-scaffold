<template>
  <view class="admin-banners-page">
    <!-- 顶部操作栏 -->
    <view class="action-bar">
      <view class="status-filter">
        <view
          class="filter-tag"
          :class="{ active: filterStatus === '' }"
          @click="filterStatus = ''; loadBanners()"
        >全部</view>
        <view
          class="filter-tag"
          :class="{ active: filterStatus === 'active' }"
          @click="filterStatus = 'active'; loadBanners()"
        >已启用</view>
        <view
          class="filter-tag"
          :class="{ active: filterStatus === 'inactive' }"
          @click="filterStatus = 'inactive'; loadBanners()"
        >已停用</view>
      </view>
      <wd-button type="primary" size="small" @click="handleAdd">
        <text class="iconfont icon-add" style="margin-right: 8rpx;"></text>
        新增
      </wd-button>
    </view>

    <!-- 提示信息 -->
    <view class="sort-hint" v-if="banners.length > 1">
      <text class="iconfont icon-info"></text>
      <text>长按拖动可调整 Banner 排序，松手自动保存</text>
    </view>

    <!-- Banner 列表 -->
    <view v-if="loading" class="loading-container">
      <Loading text="加载中..." />
    </view>

    <view v-else-if="banners.length === 0" class="empty-container">
      <text class="iconfont icon-picture" style="font-size: 80rpx; color: #ddd;"></text>
      <text class="empty-text">暂无 Banner</text>
      <wd-button type="primary" size="small" @click="handleAdd">新增 Banner</wd-button>
    </view>

    <view v-else class="banner-list">
      <view
        v-for="(item, index) in banners"
        :key="item.id"
        class="banner-item"
      >
        <view class="banner-card">
          <!-- 排序手柄 -->
          <view class="sort-handle">
            <view class="sort-btns">
              <text
                class="iconfont icon-up sort-btn"
                :class="{ disabled: index === 0 }"
                @click="moveUp(index)"
              ></text>
              <text class="sort-num">{{ index + 1 }}</text>
              <text
                class="iconfont icon-down sort-btn"
                :class="{ disabled: index === banners.length - 1 }"
                @click="moveDown(index)"
              ></text>
            </view>
          </view>

          <!-- Banner 预览图 -->
          <view class="banner-preview" @click="handleEdit(item)">
            <AsyncImage
              :url="item.image"
              width="100%"
              height="100%"
              mode="aspectFill"
            />
            <view class="status-badge" :class="item.status">
              {{ item.status === 'active' ? '启用' : '停用' }}
            </view>
          </view>

          <!-- Banner 信息 -->
          <view class="banner-info" @click="handleEdit(item)">
            <text class="banner-title">{{ item.title }}</text>
            <view class="banner-meta">
              <text class="meta-item">
                <text class="iconfont icon-link"></text>
                {{ getLinkTypeText(item.link_type) }}
              </text>
              <text v-if="item.start_time" class="meta-item">
                <text class="iconfont icon-time"></text>
                {{ formatDate(item.start_time) }}
              </text>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="banner-actions">
            <view
              class="action-btn"
              :class="item.status === 'active' ? 'warning' : 'success'"
              @click="toggleStatus(item)"
            >
              <text class="iconfont" :class="item.status === 'active' ? 'icon-hide' : 'icon-view'"></text>
            </view>
            <view class="action-btn primary" @click="handleEdit(item)">
              <text class="iconfont icon-edit"></text>
            </view>
            <view class="action-btn danger" @click="handleDelete(item)">
              <text class="iconfont icon-delete"></text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { bannerApi, type Banner } from '@/api/banner'
import AsyncImage from '@/components/AsyncImage/index.vue'
import Loading from '@/components/Loading/index.vue'

const loading = ref(false)
const banners = ref<Banner[]>([])
const filterStatus = ref('')

const loadBanners = async () => {
  try {
    loading.value = true
    const params: any = {}
    if (filterStatus.value) {
      params.status = filterStatus.value
    }
    const res = await bannerApi.getList(params) as any
    banners.value = Array.isArray(res) ? res : (res?.data || [])
    // 按 sort 排序
    banners.value.sort((a, b) => (a.sort || 0) - (b.sort || 0))
  } catch (error) {
    console.error('加载 Banner 列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  uni.navigateTo({ url: '/pages/admin/banner-edit/index' })
}

const handleEdit = (item: Banner) => {
  uni.navigateTo({ url: `/pages/admin/banner-edit/index?id=${item.id}` })
}

const handleDelete = (item: Banner) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除 Banner「${item.title}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await bannerApi.delete(item.id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadBanners()
        } catch (error) {
          console.error('删除失败:', error)
        }
      }
    }
  })
}

const toggleStatus = async (item: Banner) => {
  const newStatus = item.status === 'active' ? 'inactive' : 'active'
  try {
    await bannerApi.update(item.id, { status: newStatus })
    uni.showToast({
      title: newStatus === 'active' ? '已启用' : '已停用',
      icon: 'success'
    })
    loadBanners()
  } catch (error) {
    console.error('状态更新失败:', error)
  }
}

/** 上移 */
const moveUp = async (index: number) => {
  if (index === 0) return
  const list = [...banners.value]
  const temp = list[index]
  list[index] = list[index - 1]
  list[index - 1] = temp
  banners.value = list
  await saveSort()
}

/** 下移 */
const moveDown = async (index: number) => {
  if (index >= banners.value.length - 1) return
  const list = [...banners.value]
  const temp = list[index]
  list[index] = list[index + 1]
  list[index + 1] = temp
  banners.value = list
  await saveSort()
}

/** 保存排序 */
const saveSort = async () => {
  try {
    const items = banners.value.map((b, i) => ({
      id: b.id,
      sort: i + 1,
    }))
    await bannerApi.updateSort({ items })
  } catch (error) {
    console.error('保存排序失败:', error)
    uni.showToast({ title: '排序保存失败', icon: 'none' })
  }
}

const getLinkTypeText = (type: string) => {
  const map: Record<string, string> = {
    course: '课程链接',
    url: '外部链接',
    none: '无链接',
  }
  return map[type] || type
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

onMounted(() => {
  loadBanners()
})

onShow(() => {
  loadBanners()
})
</script>

<style lang="scss" scoped>
.admin-banners-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  padding-bottom: calc(48rpx + env(safe-area-inset-bottom));
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

.sort-hint {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  background-color: #fffbe6;
  font-size: 24rpx;
  color: $uni-color-warning;

  .iconfont {
    font-size: 24rpx;
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

.banner-list {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.banner-card {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sort-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8rpx 0;
  background-color: $uni-bg-color-tertiary;
}

.sort-btns {
  display: flex;
  align-items: center;
  gap: 24rpx;

  .sort-btn {
    font-size: 32rpx;
    color: $uni-text-color-secondary;
    padding: 8rpx;

    &:active {
      color: $uni-color-primary;
    }

    &.disabled {
      color: $uni-text-color-disable;
    }
  }

  .sort-num {
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
    min-width: 40rpx;
    text-align: center;
  }
}

.banner-preview {
  position: relative;
  width: 100%;
  height: 240rpx;
}

.status-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
  font-size: 22rpx;
  color: #fff;

  &.active {
    background-color: $uni-color-success;
  }

  &.inactive {
    background-color: $uni-text-color-tertiary;
  }
}

.banner-info {
  padding: 16rpx 20rpx;
}

.banner-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $uni-text-color;
  margin-bottom: 8rpx;
  display: block;
}

.banner-meta {
  display: flex;
  gap: 24rpx;
}

.meta-item {
  font-size: 22rpx;
  color: $uni-text-color-tertiary;
  display: flex;
  align-items: center;
  gap: 4rpx;

  .iconfont {
    font-size: 22rpx;
  }
}

.banner-actions {
  display: flex;
  border-top: 1rpx solid $uni-border-color-light;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx;
  font-size: 32rpx;

  &:active {
    background-color: $uni-bg-color-grey;
  }

  &.primary {
    color: $uni-color-info;
  }

  &.success {
    color: $uni-color-success;
  }

  &.warning {
    color: $uni-color-warning;
  }

  &.danger {
    color: $uni-color-error;
  }

  & + & {
    border-left: 1rpx solid $uni-border-color-light;
  }
}
</style>
