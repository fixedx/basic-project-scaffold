<template>
  <view class="admin-reviews-page">
    <!-- 顶部Tab -->
    <view class="tabs-container">
      <wd-tabs v-model="activeTab" @change="handleTabChange">
        <wd-tab title="全部" name="all" />
        <wd-tab title="资质审核" name="pending" />
        <wd-tab title="签约审核" name="contract_review" />
        <wd-tab title="已通过" name="approved" />
        <wd-tab title="已驳回" name="rejected" />
      </wd-tabs>
    </view>

    <!-- 机构列表 -->
    <view class="list-container">
      <view v-if="loading" class="loading-container">
        <Loading text="加载中..." />
      </view>

      <view v-else-if="institutions.length === 0" class="empty-container">
        <text class="empty-text">暂无数据</text>
      </view>

      <view v-else class="institution-list">
        <view
          v-for="item in institutions"
          :key="item.id"
          class="institution-item"
          @click="handleViewDetail(item)"
        >
          <view class="item-header">
            <image
              v-if="item.logo"
              :src="item.logo"
              class="logo"
              mode="aspectFill"
            />
            <view v-else class="logo-placeholder">
              <text class="iconfont icon-store" style="font-size: 64rpx; color: #ccc;"></text>
            </view>
            <view class="info">
              <text class="name">{{ item.name }}</text>
              <text class="address">{{ getFullAddress(item) }}</text>
            </view>
          </view>

          <view class="item-footer">
            <view class="status-tag" :class="getStatusClass(item.audit_status)">
              <text>{{ getStatusText(item.audit_status) }}</text>
            </view>
            <view class="detail-link">
              <text>查看详情</text>
              <text class="iconfont icon-right"></text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载更多 -->
    <view v-if="hasMore && !loading" class="load-more" @click="loadMore">
      <text>加载更多</text>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { type InstitutionInfo } from '@/api/institution'
import { adminApi } from '@/api/admin'
import Loading from '@/components/Loading/index.vue'

const activeTab = ref('pending')
const loading = ref(false)
const institutions = ref<InstitutionInfo[]>([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const hasMore = ref(true)

/**
 * 接收来自管理中心的 status 参数
 */
onLoad((options) => {
  if (options?.status) {
    activeTab.value = options.status
  }
})

/**
 * 加载机构列表
 */
const loadInstitutions = async (isLoadMore = false) => {
  if (loading.value) return

  try {
    loading.value = true

    const auditStatus = activeTab.value === 'all' ? undefined : activeTab.value
    const res = await adminApi.getInstitutionList(page.value, pageSize, auditStatus)

    if (isLoadMore) {
      institutions.value = [...institutions.value, ...res.data]
    } else {
      institutions.value = res.data
    }

    total.value = res.total
    hasMore.value = institutions.value.length < total.value
  } catch (error) {
    console.error('加载机构列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

onPullDownRefresh(async () => {
  page.value = 1
  await loadInstitutions()
})

const handleTabChange = () => {
  page.value = 1
  loadInstitutions()
}

const loadMore = () => {
  page.value++
  loadInstitutions(true)
}

const handleViewDetail = (item: InstitutionInfo) => {
  uni.navigateTo({
    url: `/pages/admin/institution-detail/index?id=${item.id}`
  })
}

const getFullAddress = (item: InstitutionInfo) => {
  const parts = [item.province, item.city, item.district, item.address].filter(Boolean)
  return parts.join('')
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    contract_signing: '待签约',
    contract_review: '签约审核中',
    approved: '已通过',
    rejected: '已驳回',
    frozen: '已冻结'
  }
  return statusMap[status] || status
}

const getStatusClass = (status: string) => {
  return `status-${status}`
}

onMounted(() => {
  loadInstitutions()
})
</script>

<style lang="scss" scoped>
.admin-reviews-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.tabs-container {
  background-color: $uni-bg-color;
}

.list-container {
  padding: 16rpx;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 80rpx 0;
}

.empty-container {
  text-align: center;
  padding: 120rpx 0;

  .empty-text {
    font-size: 28rpx;
    color: $uni-text-color-tertiary;
  }
}

.institution-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.institution-item {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 24rpx;
}

.item-header {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.logo,
.logo-placeholder {
  width: 96rpx;
  height: 96rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}

.logo-placeholder {
  background-color: $uni-bg-color-grey;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  justify-content: center;
}

.name {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
}

.address {
  font-size: 24rpx;
  color: $uni-text-color-secondary;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid $uni-border-color-light;
}

.status-tag {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;

  &.status-draft {
    background-color: $uni-bg-color-grey;
    color: $uni-text-color-secondary;
  }

  &.status-pending {
    background-color: #fff7e6;
    color: $uni-color-warning;
  }

  &.status-contract_signing {
    background-color: #e6f7ff;
    color: #1890ff;
  }

  &.status-contract_review {
    background-color: #f0f5ff;
    color: #2f54eb;
  }

  &.status-approved {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
  }

  &.status-rejected {
    background-color: #fff1f0;
    color: $uni-color-error;
  }

  &.status-frozen {
    background-color: $uni-bg-color-grey;
    color: $uni-text-color-tertiary;
  }
}

.detail-link {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 24rpx;
  color: $uni-color-primary;

  .iconfont {
    font-size: 22rpx;
  }
}

.load-more {
  text-align: center;
  padding: 32rpx;
  color: $uni-color-primary;
  font-size: 28rpx;
}

</style>
