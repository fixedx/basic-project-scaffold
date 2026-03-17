<template>
  <view class="page">
    <!-- 状态 Tab 栏 -->
    <view class="tab-bar">
      <scroll-view scroll-x class="tab-scroll">
        <view class="tab-list">
          <view
            v-for="tab in tabs"
            :key="tab.value"
            class="tab-item"
            :class="{ active: currentTab === tab.value }"
            @click="switchTab(tab.value)"
          >
            <text>{{ tab.label }}</text>
            <view v-if="tab.badge && tab.badge > 0" class="tab-badge">{{ tab.badge }}</view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 预约列表 -->
    <scroll-view
      scroll-y
      class="list-scroll"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="list-container">
        <view v-if="loading && list.length === 0" class="loading-wrap">
          <wd-loading />
        </view>

        <view v-else-if="list.length === 0" class="empty-wrap">
          <EmptyState message="暂无预约记录" />
        </view>

        <view v-else>
          <view
            v-for="booking in list"
            :key="booking.id"
            class="booking-card"
          >
            <!-- 卡片头部：学员信息 + 状态 -->
            <view class="card-header">
              <view class="student-info">
                <text class="student-name">{{ booking.student_name }}</text>
                <text class="student-phone">{{ booking.student_phone }}</text>
                <text v-if="booking.student_age" class="student-age">{{ booking.student_age }}岁</text>
              </view>
              <view class="status-tag" :class="statusClass(booking.status)">
                {{ statusLabel(booking.status) }}
              </view>
            </view>

            <!-- 当前课程时间 -->
            <view class="time-block">
              <text class="iconfont icon-time time-icon"></text>
              <view class="time-info">
                <text class="time-label">上课时间：</text>
                <text class="time-val">{{ formatTime(booking.start_time, booking.end_time) }}</text>
              </view>
            </view>
            <view v-if="booking.teacher_name || booking.classroom_name" class="detail-row">
              <text v-if="booking.teacher_name" class="detail-text">
                <text class="iconfont icon-customer detail-icon"></text>
                {{ booking.teacher_name }}
              </text>
              <text v-if="booking.classroom_name" class="detail-text">
                <text class="iconfont icon-location detail-icon"></text>
                {{ booking.classroom_name }}
              </text>
            </view>

            <!-- pending_change：展示待审核的新排课信息 -->
            <view v-if="booking.status === 'pending_change' && pendingScheduleMap[booking.id]" class="change-block">
              <view class="change-header">
                <text class="iconfont icon-edit change-icon"></text>
                <text class="change-title">申请修改为</text>
              </view>
              <view class="change-detail">
                <text class="change-text">{{ formatScheduleInfo(pendingScheduleMap[booking.id]) }}</text>
              </view>
            </view>

            <!-- 备注 -->
            <view v-if="booking.remark" class="remark-row">
              <text class="remark-label">备注：</text>
              <text class="remark-text">{{ booking.remark }}</text>
            </view>

            <!-- 拒绝/取消原因 -->
            <view v-if="booking.reason && ['rejected', 'cancelled'].includes(booking.status)" class="reason-row">
              <text class="reason-label">原因：</text>
              <text class="reason-text">{{ booking.reason }}</text>
            </view>

            <!-- 操作按钮 -->
            <view class="card-actions">
              <!-- pending_cancel：审核取消申请 -->
              <template v-if="booking.status === 'pending_cancel'">
                <wd-button
                  size="small"
                  type="error"
                  plain
                  @click="openRejectDialog(booking, 'cancel')"
                >拒绝取消</wd-button>
                <wd-button
                  size="small"
                  type="primary"
                  @click="confirmApprove(booking, 'cancel')"
                >同意取消</wd-button>
              </template>

              <!-- pending_change：审核修改排课申请 -->
              <template v-else-if="booking.status === 'pending_change'">
                <wd-button
                  size="small"
                  type="error"
                  plain
                  @click="openRejectDialog(booking, 'change')"
                >拒绝修改</wd-button>
                <wd-button
                  size="small"
                  type="primary"
                  @click="confirmApprove(booking, 'change')"
                >同意修改</wd-button>
              </template>

              <!-- pending：确认/拒绝预约 -->
              <template v-else-if="booking.status === 'pending'">
                <wd-button
                  size="small"
                  type="error"
                  plain
                  @click="openRejectDialog(booking, 'booking')"
                >拒绝</wd-button>
                <wd-button
                  size="small"
                  type="primary"
                  @click="confirmApprove(booking, 'booking')"
                >确认预约</wd-button>
              </template>

              <!-- 所有状态均可查看详情 -->
              <wd-button
                size="small"
                plain
                @click="goDetail(booking.id)"
              >查看详情</wd-button>
            </view>
          </view>

          <!-- 加载更多 -->
          <view v-if="hasMore" class="load-more-tip">
            <wd-loading v-if="loadingMore" size="18px" />
            <text v-else class="load-more-text">上拉加载更多</text>
          </view>
          <view v-else-if="list.length > 0" class="no-more-tip">
            <text>已加载全部</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 拒绝原因弹窗 -->
    <wd-popup
      v-model="showRejectDialog"
      position="bottom"
      :safe-area-inset-bottom="true"
      custom-class="reject-popup"
    >
      <view class="reject-dialog">
        <view class="dialog-title">填写原因</view>
        <view class="dialog-subtitle">{{ rejectDialogTitle }}</view>
        <wd-input
          v-model="rejectReason"
          type="textarea"
          :rows="3"
          placeholder="请输入原因（选填）"
          :maxlength="200"
          show-word-limit
        />
        <view class="dialog-actions">
          <wd-button block plain custom-class="cancel-btn-common" @click="showRejectDialog = false">取消</wd-button>
          <wd-button block type="error" :loading="actionLoading" @click="doReject">确认拒绝</wd-button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { bookingApi, type Booking } from '@/api/booking'
import EmptyState from '@/components/EmptyState/index.vue'

// ─── 状态 Tab ───────────────────────────────────────────────────────────────
const TABS = [
  { value: 'pending_review', label: '待审核', badge: 0 },
  { value: 'pending', label: '待确认', badge: 0 },
  { value: 'confirmed', label: '已确认', badge: 0 },
  { value: 'all', label: '全部', badge: 0 },
  { value: 'cancelled', label: '已取消', badge: 0 },
  { value: 'rejected', label: '已拒绝', badge: 0 },
  { value: 'completed', label: '已完成', badge: 0 },
]

const tabs = ref(TABS.map(t => ({ ...t })))
const currentTab = ref('pending_review')

const institutionId = ref('')

// 将 Tab value 映射为实际传给后端的 status 参数
const tabToStatus = (tab: string): string | undefined => {
  if (tab === 'pending_review') return 'pending_cancel,pending_change'
  if (tab === 'all') return undefined
  return tab
}

// ─── 列表数据 ────────────────────────────────────────────────────────────────
const list = ref<Booking[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const refreshing = ref(false)
const page = ref(1)
const hasMore = ref(true)
const PAGE_SIZE = 15

// 缓存 pending_change 对应的新排课简要信息（通过 booking.pending_change_schedule_id 查询）
const pendingScheduleMap = ref<Record<string, any>>({})

async function loadList(isLoadMore = false) {
  if (!institutionId.value) return
  if (isLoadMore) {
    if (!hasMore.value || loadingMore.value) return
    loadingMore.value = true
  } else {
    loading.value = true
    page.value = 1
    list.value = []
    hasMore.value = true
  }

  try {
    const status = tabToStatus(currentTab.value)
    const res = await bookingApi.getInstitutionList(institutionId.value, {
      page: isLoadMore ? page.value : 1,
      pageSize: PAGE_SIZE,
      status,
    })

    const newItems: Booking[] = Array.isArray(res) ? (res as any) : (res as any).data ?? []
    if (isLoadMore) {
      list.value = [...list.value, ...newItems]
    } else {
      list.value = newItems
    }

    const total: number = Array.isArray(res) ? newItems.length : (res as any).total ?? newItems.length
    hasMore.value = list.value.length < total

    if (isLoadMore) page.value++
    else page.value = 2

    // 加载 pending_change 对应的新排课信息
    await loadPendingSchedules()
  } catch (e) {
    console.error('加载预约列表失败', e)
  } finally {
    loading.value = false
    loadingMore.value = false
    refreshing.value = false
  }
}

// 对于 pending_change 的预约，尝试加载新排课的简要信息（调用排课详情接口）
async function loadPendingSchedules() {
  const pendingChanges = list.value.filter(
    b => b.status === 'pending_change' && b.pending_change_schedule_id && !pendingScheduleMap.value[b.id]
  )
  if (pendingChanges.length === 0) return

  for (const booking of pendingChanges) {
    try {
      const { get } = await import('@/utils/request')
      const schedule = await get<any>(`/schedule/${booking.pending_change_schedule_id}`)
      pendingScheduleMap.value[booking.id] = schedule
    } catch {
      // 忽略加载失败
    }
  }
}

function loadMore() {
  loadList(true)
}

function onRefresh() {
  refreshing.value = true
  loadList()
}

function switchTab(val: string) {
  if (currentTab.value === val) return
  currentTab.value = val
  loadList()
}

// ─── 审核操作 ────────────────────────────────────────────────────────────────
const actionLoading = ref(false)
const showRejectDialog = ref(false)
const rejectReason = ref('')
const rejectTarget = ref<{ booking: Booking; type: 'cancel' | 'change' | 'booking' } | null>(null)

const rejectDialogTitle = computed(() => {
  if (!rejectTarget.value) return ''
  if (rejectTarget.value.type === 'cancel') return '拒绝用户取消预约'
  if (rejectTarget.value.type === 'change') return '拒绝修改排课申请'
  return '拒绝预约'
})

function openRejectDialog(booking: Booking, type: 'cancel' | 'change' | 'booking') {
  rejectTarget.value = { booking, type }
  rejectReason.value = ''
  showRejectDialog.value = true
}

async function confirmApprove(booking: Booking, type: 'cancel' | 'change' | 'booking') {
  const typeLabel = type === 'cancel' ? '取消申请' : type === 'change' ? '修改申请' : '预约'
  // 同意后预约将进入的 Tab
  const afterTab = type === 'cancel' ? 'cancelled' : 'confirmed'
  const afterTabLabel = type === 'cancel' ? '已取消' : '已确认'
  uni.showModal({
    title: '确认操作',
    content: `确定同意该${typeLabel}吗？`,
    success: async (res) => {
      if (!res.confirm) return
      actionLoading.value = true
      try {
        if (type === 'cancel') {
          await bookingApi.reviewCancel(booking.id, 'approve')
        } else if (type === 'change') {
          await bookingApi.reviewChangeSchedule(booking.id, 'approve')
        } else {
          await bookingApi.updateStatus(booking.id, { status: 'confirmed' })
        }
        uni.showToast({ title: `已同意，可在「${afterTabLabel}」中查看`, icon: 'none', duration: 2500 })
        currentTab.value = afterTab
        await loadList()
      } catch (e: any) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      } finally {
        actionLoading.value = false
      }
    },
  })
}

async function doReject() {
  if (!rejectTarget.value) return
  const { booking, type } = rejectTarget.value
  actionLoading.value = true
  try {
    if (type === 'cancel') {
      // 拒绝取消申请 → 预约恢复为"已确认"状态（不是"已拒绝"）
      await bookingApi.reviewCancel(booking.id, 'reject', rejectReason.value || undefined)
      showRejectDialog.value = false
      uni.showToast({ title: '已拒绝取消，预约恢复至「已确认」', icon: 'none', duration: 2500 })
      currentTab.value = 'confirmed'
    } else if (type === 'change') {
      // 拒绝修改申请 → 预约恢复为"已确认"状态（不是"已拒绝"）
      await bookingApi.reviewChangeSchedule(booking.id, 'reject', rejectReason.value || undefined)
      showRejectDialog.value = false
      uni.showToast({ title: '已拒绝修改，预约恢复至「已确认」', icon: 'none', duration: 2500 })
      currentTab.value = 'confirmed'
    } else {
      // 拒绝初始预约 → 状态变为"已拒绝"
      await bookingApi.updateStatus(booking.id, { status: 'rejected', reason: rejectReason.value || undefined })
      showRejectDialog.value = false
      uni.showToast({ title: '已拒绝，可在「已拒绝」中查看', icon: 'none', duration: 2000 })
      currentTab.value = 'rejected'
    }
    await loadList()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  } finally {
    actionLoading.value = false
  }
}

// ─── 导航 ────────────────────────────────────────────────────────────────────
function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/booking-detail/index?id=${id}` })
}

// ─── 格式化工具 ──────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  rejected: '已拒绝',
  cancelled: '已取消',
  completed: '已完成',
  pending_change: '待审核修改',
  pending_cancel: '待审核取消',
}

function statusLabel(status: string) {
  return STATUS_LABELS[status] || status
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    pending: 'tag-pending',
    confirmed: 'tag-confirmed',
    rejected: 'tag-rejected',
    cancelled: 'tag-cancelled',
    completed: 'tag-completed',
    pending_change: 'tag-review',
    pending_cancel: 'tag-review',
  }
  return map[status] || 'tag-pending'
}

function formatTime(start?: string, end?: string) {
  if (!start) return '时间待定'
  const s = new Date(start)
  const dateStr = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`
  const startHM = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`
  if (!end) return `${dateStr} ${startHM}`
  const e = new Date(end)
  const endHM = `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`
  return `${dateStr} ${startHM}–${endHM}`
}

function formatScheduleInfo(schedule: any) {
  if (!schedule) return '加载中…'
  const parts: string[] = []
  if (schedule.start_time) {
    parts.push(formatTime(schedule.start_time, schedule.end_time))
  }
  if (schedule.teacher_name) parts.push(`教师：${schedule.teacher_name}`)
  if (schedule.classroom_name) parts.push(`教室：${schedule.classroom_name}`)
  return parts.join('  ') || '暂无详情'
}

// ─── 生命周期 ────────────────────────────────────────────────────────────────
onLoad((options) => {
  institutionId.value =
    (options?.institutionId as string) ||
    uni.getStorageSync('institutionId') ||
    ''

  // 支持从待办入口传入 tab 参数
  const tab = (options?.tab as string) || 'pending_review'
  currentTab.value = tab

  loadList()
})

onMounted(() => {
  if (!institutionId.value) {
    institutionId.value = uni.getStorageSync('institutionId') || ''
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  display: flex;
  flex-direction: column;
}

/* ── Tab 栏 ── */
.tab-bar {
  background-color: $uni-bg-color;
  border-bottom: 1rpx solid $uni-border-color-light;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab-scroll {
  white-space: nowrap;
}

.tab-list {
  display: flex;
  padding: 0 16rpx;
}

.tab-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 24rpx 24rpx;
  font-size: 28rpx;
  color: $uni-text-color-secondary;
  white-space: nowrap;
  flex-shrink: 0;

  &.active {
    color: $uni-color-primary;
    font-weight: 600;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 40rpx;
      height: 4rpx;
      background-color: $uni-color-primary;
      border-radius: 2rpx;
    }
  }
}

.tab-badge {
  min-width: 32rpx;
  height: 32rpx;
  background-color: $uni-color-error;
  color: #fff;
  font-size: 20rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
  margin-left: 6rpx;
}

/* ── 滚动区域 ── */
.list-scroll {
  flex: 1;
  height: calc(100vh - 96rpx);
}

.list-container {
  padding: 24rpx 24rpx 48rpx;
}

/* ── 预约卡片 ── */
.booking-card {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 28rpx 28rpx 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.student-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
}

.student-name {
  font-size: 32rpx;
  font-weight: 600;
  color: $uni-text-color;
}

.student-phone {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
}

.student-age {
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
  background-color: $uni-bg-color-grey;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
}

/* 状态标签 */
.status-tag {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: 16rpx;

  &.tag-pending {
    background-color: #fff7e6;
    color: #fa8c16;
  }

  &.tag-confirmed {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
  }

  &.tag-rejected {
    background-color: #fff1f0;
    color: $uni-color-error;
  }

  &.tag-cancelled {
    background-color: $uni-bg-color-grey;
    color: $uni-text-color-tertiary;
  }

  &.tag-completed {
    background-color: #e6f4ff;
    color: #1890ff;
  }

  &.tag-review {
    background-color: #fff3e0;
    color: #ff9800;
  }
}

/* 时间信息 */
.time-block {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.time-icon {
  font-size: 28rpx;
  color: $uni-color-primary;
  margin-right: 10rpx;
}

.time-info {
  display: flex;
  align-items: center;
}

.time-label {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
}

.time-val {
  font-size: 26rpx;
  color: $uni-text-color;
  font-weight: 500;
}

/* 教师教室行 */
.detail-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 12rpx;
}

.detail-text {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  display: flex;
  align-items: center;
}

.detail-icon {
  font-size: 24rpx;
  margin-right: 6rpx;
  color: $uni-text-color-tertiary;
}

/* pending_change 新排课信息 */
.change-block {
  background-color: #fff8e1;
  border: 1rpx dashed #ffcc02;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 16rpx;
}

.change-header {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
}

.change-icon {
  font-size: 26rpx;
  color: #ff9800;
  margin-right: 8rpx;
}

.change-title {
  font-size: 26rpx;
  color: #ff9800;
  font-weight: 500;
}

.change-text {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
}

/* 备注 */
.remark-row {
  display: flex;
  margin-bottom: 12rpx;
}

.remark-label,
.reason-label {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  flex-shrink: 0;
}

.remark-text,
.reason-text {
  font-size: 26rpx;
  color: $uni-text-color;
}

/* 原因 */
.reason-row {
  display: flex;
  margin-bottom: 12rpx;
}

/* 操作按钮 */
.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid $uni-border-color-light;
}

/* ── 辅助状态 ── */
.loading-wrap,
.empty-wrap {
  display: flex;
  justify-content: center;
  padding-top: 120rpx;
}

.load-more-tip,
.no-more-tip {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32rpx 0;
}

.load-more-text,
.no-more-tip text {
  font-size: 26rpx;
  color: $uni-text-color-tertiary;
}

/* ── 拒绝弹窗 ── */
:deep(.reject-popup) {
  border-radius: 24rpx 24rpx 0 0;
}

.reject-dialog {
  padding: 40rpx 32rpx 48rpx;
}

.dialog-title {
  font-size: 34rpx;
  font-weight: 600;
  color: $uni-text-color;
  margin-bottom: 8rpx;
}

.dialog-subtitle {
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  margin-bottom: 32rpx;
}

.dialog-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 32rpx;
}
</style>
