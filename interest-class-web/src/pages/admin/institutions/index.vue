<template>
  <view class="admin-institutions-page">
    <!-- 筛选栏 -->
    <view class="filter-bar">
      <wd-search 
        v-model="searchKeyword" 
        placeholder="搜索机构名称" 
        hide-cancel
        @search="handleSearch"
        @clear="handleSearch"
      />
      <view class="filter-tabs-wrapper">
        <scroll-view scroll-x class="filter-tabs" :show-scrollbar="false">
          <view class="tabs-inner">
            <view
              v-for="item in statusOptions"
              :key="item.value"
              class="filter-tab"
              :class="{ active: filterStatus === item.value }"
              @click="handleFilterChangeInternal(item.value)"
            >
              {{ item.label }}
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 机构列表 -->
    <view class="list-container">
      <view v-if="loading && institutions.length === 0" class="loading-container">
        <Loading text="加载中..." />
      </view>

      <EmptyState
        v-else-if="institutions.length === 0"
        icon="icon-store"
        text="暂无机构数据"
      />

      <view v-else class="institution-list">
        <view
          v-for="item in institutions"
          :key="item.id"
          class="card-wrapper"
        >
          <InstitutionCard
            :institution="item"
            mode="full"
            :show-rating="true"
            @click="handleViewDetail"
          />
          <view class="card-status-info" @click="handleViewDetail(item)">
            <view class="status-row">
              <text class="label">状态：</text>
              <view class="status-tag" :class="`status-${item.audit_status}`">
                {{ getStatusText(item.audit_status) }}
              </view>
              <text class="time">{{ formatDate(item.created_at) }}</text>
            </view>
            <view v-if="item.reject_reason" class="reject-row">
              <text class="label">驳回原因：</text>
              <text class="value">{{ item.reject_reason }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore && !loading" class="load-more" @click="loadMore">
        <text>加载更多</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { type InstitutionInfo } from '@/api/institution'
import { adminApi } from '@/api/admin'
import Loading from '@/components/Loading/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import InstitutionCard from '@/components/InstitutionCard/index.vue'

const searchKeyword = ref('')
const filterStatus = ref(0)
const loading = ref(false)
const institutions = ref<InstitutionInfo[]>([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const hasMore = ref(true)

const statusOptions = [
  { label: '全部状态', value: 0 },
  { label: '草稿', value: 1 },
  { label: '待审核', value: 2 },
  { label: '待签约', value: 3 },
  { label: '签约审核中', value: 4 },
  { label: '已通过', value: 5 },
  { label: '已驳回', value: 6 },
  { label: '已冻结', value: 7 },
]

const statusValueMap: Record<number, string> = {
  0: '',
  1: 'draft',
  2: 'pending',
  3: 'contract_signing',
  4: 'contract_review',
  5: 'approved',
  6: 'rejected',
  7: 'frozen',
}

const statusReverseMap: Record<string, number> = {
  draft: 1,
  pending: 2,
  contract_signing: 3,
  contract_review: 4,
  approved: 5,
  rejected: 6,
  frozen: 7,
}

/** 加载机构列表 */
const loadInstitutions = async (isLoadMore = false) => {
  if (loading.value) return
  try {
    loading.value = true
    const auditStatus = statusValueMap[filterStatus.value] || undefined
    const res = await adminApi.getInstitutionList(page.value, pageSize, auditStatus, searchKeyword.value)
    if (isLoadMore) {
      institutions.value = [...institutions.value, ...res.data]
    } else {
      institutions.value = res.data
    }

    total.value = res.total
    hasMore.value = institutions.value.length < total.value
  } catch (error) {
    console.error('加载机构列表失败:', error)
    if (!isLoadMore) {
      institutions.value = []
    }
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  loadInstitutions()
}

const handleFilterChangeInternal = (statusValue: number) => {
  filterStatus.value = statusValue
  handleFilterChange()
}

const handleFilterChange = () => {
  page.value = 1
  loadInstitutions()
}

const loadMore = () => {
  page.value++
  loadInstitutions(true)
}

/** 查看详情 */
const handleViewDetail = (item: any) => {
  uni.navigateTo({
    url: `/pages/admin/institution-detail/index?id=${item.id}`,
  })
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    contract_signing: '待签约',
    contract_review: '签约审核中',
    approved: '已通过',
    rejected: '已驳回',
    frozen: '已冻结',
  }
  return map[status || 'contract_signing'] || status
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

onLoad((options) => {
  if (options?.status && statusReverseMap[options.status] !== undefined) {
    filterStatus.value = statusReverseMap[options.status]
  }
  loadInstitutions()
})
</script>

<style lang="scss" scoped>
.admin-institutions-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.filter-bar {
  background-color: $uni-bg-color;
  padding: 24rpx 32rpx;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.02);
}

.filter-tabs-wrapper {
  margin-top: 24rpx;
}

.filter-tabs {
  width: 100%;
  white-space: nowrap;
}

.tabs-inner {
  display: inline-flex;
  gap: 16rpx;
  padding-right: 32rpx;
}

.filter-tab {
  display: inline-block;
  padding: 12rpx 28rpx;
  font-size: 28rpx;
  color: $uni-text-color-secondary;
  background-color: $uni-bg-color-grey;
  border-radius: 32rpx;
  transition: all 0.3s;
  flex-shrink: 0;

  &.active {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
    font-weight: 500;
  }
}

.list-container {
  padding: 24rpx 32rpx;
  padding-bottom: env(safe-area-inset-bottom);
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 80rpx 0;
}

.institution-list {
  display: flex;
  flex-direction: column;
}

.card-wrapper {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);

  :deep(.institution-card) {
    box-shadow: none;
    border-radius: 0;
    margin-bottom: 0;
  }
}

.card-status-info {
  padding: 16rpx 24rpx 24rpx;
  background-color: #fff;
  border-top: 1rpx solid $uni-border-color-light;

  .status-row {
    display: flex;
    align-items: center;
    font-size: 24rpx;
    
    .label {
      color: $uni-text-color-secondary;
    }
    
    .time {
      margin-left: auto;
      color: $uni-text-color-tertiary;
    }
  }

  .reject-row {
    margin-top: 12rpx;
    padding: 12rpx 16rpx;
    background-color: #fff1f0;
    border-radius: 8rpx;
    display: flex;
    font-size: 24rpx;
    
    .label {
      color: $uni-color-error;
      font-weight: bold;
      flex-shrink: 0;
    }
    .value {
      color: $uni-color-error;
      word-break: break-all;
    }
  }
}

.status-tag {
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-size: 20rpx;

  &.status-draft {
    background-color: $uni-bg-color-grey;
    color: $uni-text-color-secondary;
  }
  &.status-pending {
    background-color: #fff7e6;
    color: $uni-color-warning;
  }
  &.status-contract_signing {
    background-color: #fff7e6;
    color: #d48806;
  }
  &.status-contract_review {
    background-color: #e6f7ff;
    color: #1890ff;
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

.load-more {
  text-align: center;
  padding: 32rpx;
  color: $uni-color-primary;
  font-size: 28rpx;
}
</style>
