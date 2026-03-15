<template>
  <view v-if="isReady" class="page">
    <!-- 余额卡片 -->
    <view class="balance-card">
      <view class="balance-header">
        <text class="balance-title">可用余额</text>
      </view>
      <view class="balance-amount">
        <text class="amount-symbol">¥</text>
        <text class="amount-value">{{ formatPrice(balance?.available || 0) }}</text>
      </view>
      <view class="balance-detail">
        <view class="detail-item">
          <text class="detail-label">冻结中</text>
          <text class="detail-value">¥{{ formatPrice(balance?.frozen || 0) }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">累计收入</text>
          <text class="detail-value">¥{{ formatPrice(balance?.total_earned || 0) }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">已提现</text>
          <text class="detail-value">¥{{ formatPrice(balance?.total_withdrawn || 0) }}</text>
        </view>
      </view>
      
      <wd-button 
        type="primary" 
        block 
        custom-class="withdraw-btn"
        :disabled="!balance?.can_withdraw"
        @click="showWithdrawPopup = true"
      >
        {{ balance?.can_withdraw ? '申请提现' : `满${balance?.withdraw_min_amount || 50}元可提现` }}
      </wd-button>
    </view>
    
    <!-- 标签页 -->
    <view class="tabs-header">
      <view 
        class="tab-item"
        :class="{ 'tab-active': currentTab === 'records' }"
        @click="currentTab = 'records'"
      >
        流水记录
      </view>
      <view 
        class="tab-item"
        :class="{ 'tab-active': currentTab === 'withdraws' }"
        @click="currentTab = 'withdraws'"
      >
        提现记录
      </view>
    </view>
    
    <!-- 流水记录 -->
    <view v-if="currentTab === 'records'" class="record-list">
      <view v-if="loading" class="loading-tip">
        <wd-loading />
      </view>
      
      <view v-else-if="records.length === 0" class="empty-tip">
        <text>暂无记录</text>
      </view>
      
      <view 
        v-else
        v-for="record in records" 
        :key="record.id"
        class="record-item"
      >
        <view class="record-left">
          <text class="record-type">{{ getRecordTypeText(record.type) }}</text>
          <text class="record-time">{{ formatDate(record.created_at) }}</text>
          <text v-if="record.remark" class="record-remark">{{ record.remark }}</text>
        </view>
        <view class="record-right">
          <text 
            class="record-amount"
            :class="{ 'amount-positive': record.amount > 0 }"
          >
            {{ record.amount > 0 ? '+' : '' }}{{ formatPrice(record.amount) }}
          </text>
          <text class="record-balance">余额 ¥{{ formatPrice(record.balance_after) }}</text>
        </view>
      </view>
    </view>
    
    <!-- 提现记录 -->
    <view v-if="currentTab === 'withdraws'" class="record-list">
      <view v-if="loading" class="loading-tip">
        <wd-loading />
      </view>
      
      <view v-else-if="withdraws.length === 0" class="empty-tip">
        <text>暂无提现记录</text>
      </view>
      
      <view 
        v-else
        v-for="withdraw in withdraws" 
        :key="withdraw.id"
        class="withdraw-item"
      >
        <view class="withdraw-left">
          <text class="withdraw-amount">¥{{ formatPrice(withdraw.amount) }}</text>
          <text class="withdraw-time">{{ formatDate(withdraw.created_at) }}</text>
        </view>
        <view class="withdraw-right">
          <text 
            class="withdraw-status"
            :class="getWithdrawStatusClass(withdraw.status)"
          >
            {{ getWithdrawStatusText(withdraw.status) }}
          </text>
          <text v-if="withdraw.reject_reason" class="withdraw-reason">
            {{ withdraw.reject_reason }}
          </text>
        </view>
      </view>
    </view>
    
    <!-- 提现弹窗 -->
    <wd-popup 
      v-model="showWithdrawPopup" 
      position="bottom" 
      custom-style="border-radius: 24rpx 24rpx 0 0"
    >
      <view class="withdraw-popup">
        <view class="popup-header">
          <text class="popup-title">申请提现</text>
          <text class="popup-close" @click="showWithdrawPopup = false">×</text>
        </view>
        
        <view class="popup-body">
          <view class="form-group">
            <view class="form-label">提现金额</view>
            <view class="amount-input-wrap">
              <text class="amount-prefix">¥</text>
              <input 
                v-model="withdrawAmount"
                type="digit"
                class="amount-input"
                placeholder="请输入提现金额"
              />
            </view>
            <view class="amount-tips">
              <text>可提现 ¥{{ formatPrice(balance?.available || 0) }}</text>
              <text class="withdraw-all" @click="withdrawAmount = String(balance?.available || 0)">全部提现</text>
            </view>
          </view>
          
          <view class="withdraw-notice">
            <text class="notice-title">提现说明</text>
            <text class="notice-item">• 提现将转入您的微信零钱</text>
            <text class="notice-item">• 最低提现金额 {{ balance?.withdraw_min_amount || 50 }} 元</text>
            <text class="notice-item">• 提现将实时转入您的微信零钱</text>
          </view>
        </view>
        
        <view class="popup-footer">
          <wd-button type="primary" block @click="handleWithdraw">
            确认提现
          </wd-button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { inviteApi, type BalanceInfo, type CashbackRecord, type WithdrawRecord } from '@/api'
import { useAuthGuard } from '@/composables/useAuthGuard'

const { isReady } = useAuthGuard()

const balance = ref<BalanceInfo | null>(null)
const records = ref<CashbackRecord[]>([])
const withdraws = ref<WithdrawRecord[]>([])
const loading = ref(false)
const currentTab = ref('records')
const showWithdrawPopup = ref(false)
const withdrawAmount = ref('')

const formatPrice = (price: number) => {
  return (Number(price) || 0).toFixed(2)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getRecordTypeText = (type: string) => {
  const map: Record<string, string> = {
    unlock: '返现解锁',
    withdraw: '提现',
    deduct: '余额抵扣',
    refund: '退款返还',
  }
  return map[type] || type
}

const getWithdrawStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '审核中',
    approved: '已通过',
    rejected: '已拒绝',
    completed: '已完成',
    failed: '失败',
  }
  return map[status] || status
}

const getWithdrawStatusClass = (status: string) => {
  const map: Record<string, string> = {
    pending: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected',
    completed: 'status-completed',
    failed: 'status-failed',
  }
  return map[status] || ''
}

const loadBalance = async () => {
  try {
    balance.value = await inviteApi.getBalance()
  } catch (e) {
    console.error('加载余额失败', e)
  }
}

const loadRecords = async () => {
  loading.value = true
  try {
    const res = await inviteApi.getCashbackRecords({ page: 1, pageSize: 50 })
    records.value = res.data || []
  } catch (e) {
    console.error('加载流水失败', e)
  } finally {
    loading.value = false
  }
}

const loadWithdraws = async () => {
  loading.value = true
  try {
    const res = await inviteApi.getWithdrawRecords({ page: 1, pageSize: 50 })
    withdraws.value = res.data || []
  } catch (e) {
    console.error('加载提现记录失败', e)
  } finally {
    loading.value = false
  }
}

const handleWithdraw = async () => {
  const amount = Number(withdrawAmount.value)
  if (!amount || amount <= 0) {
    uni.showToast({ title: '请输入正确的金额', icon: 'none' })
    return
  }
  if (amount < (balance.value?.withdraw_min_amount || 50)) {
    uni.showToast({ title: `最低提现${balance.value?.withdraw_min_amount || 50}元`, icon: 'none' })
    return
  }
  if (amount > (balance.value?.available || 0)) {
    uni.showToast({ title: '余额不足', icon: 'none' })
    return
  }
  
  try {
    await inviteApi.applyWithdraw(amount)
    uni.showToast({ title: '申请已提交', icon: 'success' })
    showWithdrawPopup.value = false
    withdrawAmount.value = ''
    loadBalance()
    loadWithdraws()
    currentTab.value = 'withdraws'
  } catch (e) {
    uni.showToast({ title: '申请失败', icon: 'none' })
  }
}

watch(currentTab, (val) => {
  if (val === 'records' && records.value.length === 0) {
    loadRecords()
  } else if (val === 'withdraws' && withdraws.value.length === 0) {
    loadWithdraws()
  }
})

onMounted(() => {
  loadBalance()
  loadRecords()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.balance-card {
  background: linear-gradient(135deg, $uni-color-primary 0%, $uni-color-primary-dark 100%);
  padding: 48rpx 32rpx;
  color: #fff;
}

.balance-header {
  margin-bottom: 16rpx;
}

.balance-title {
  font-size: 28rpx;
  opacity: 0.8;
}

.balance-amount {
  display: flex;
  align-items: baseline;
  margin-bottom: 32rpx;
}

.amount-symbol {
  font-size: 36rpx;
  margin-right: 8rpx;
}

.amount-value {
  font-size: 72rpx;
  font-weight: bold;
}

.balance-detail {
  display: flex;
  justify-content: space-around;
  padding: 24rpx 0;
  border-top: 1rpx solid rgba(255, 255, 255, 0.2);
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.2);
  margin-bottom: 32rpx;
}

.detail-item {
  text-align: center;
}

.detail-label {
  font-size: 24rpx;
  opacity: 0.7;
  display: block;
}

.detail-value {
  font-size: 28rpx;
  font-weight: bold;
  margin-top: 8rpx;
  display: block;
}

.withdraw-btn {
  margin-top: 16rpx;
}

.tabs-header {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid $uni-border-color-light;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 28rpx 0;
  font-size: 28rpx;
  color: $uni-text-color-secondary;
  position: relative;
  
  &.tab-active {
    color: $uni-color-primary;
    font-weight: bold;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 80rpx;
      height: 4rpx;
      background: $uni-color-primary;
      border-radius: 2rpx;
    }
  }
}

.record-list {
  padding: 24rpx;
}

.loading-tip,
.empty-tip {
  text-align: center;
  padding: 80rpx 0;
  color: $uni-text-color-secondary;
}

.record-item {
  display: flex;
  justify-content: space-between;
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.record-left {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.record-type {
  font-size: 28rpx;
  color: $uni-text-color;
  font-weight: bold;
}

.record-time {
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
}

.record-remark {
  font-size: 24rpx;
  color: $uni-text-color-secondary;
}

.record-right {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.record-amount {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
  
  &.amount-positive {
    color: $uni-color-primary;
  }
}

.record-balance {
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
}

.withdraw-item {
  display: flex;
  justify-content: space-between;
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.withdraw-left {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.withdraw-amount {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
}

.withdraw-time {
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
}

.withdraw-right {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.withdraw-status {
  font-size: 26rpx;
  
  &.status-pending {
    color: $uni-color-warning;
  }
  
  &.status-approved,
  &.status-completed {
    color: $uni-color-primary;
  }
  
  &.status-rejected,
  &.status-failed {
    color: $uni-color-error;
  }
}

.withdraw-reason {
  font-size: 24rpx;
  color: $uni-color-error;
}

.withdraw-popup {
  padding: 32rpx;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.popup-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
}

.popup-close {
  font-size: 48rpx;
  color: $uni-text-color-tertiary;
  line-height: 1;
}

.popup-body {
  margin-bottom: 32rpx;
}

.form-group {
  margin-bottom: 24rpx;
}

.form-label {
  font-size: 28rpx;
  color: $uni-text-color;
  margin-bottom: 16rpx;
}

.amount-input-wrap {
  display: flex;
  align-items: center;
  border-bottom: 2rpx solid $uni-border-color;
  padding: 16rpx 0;
}

.amount-prefix {
  font-size: 40rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-right: 8rpx;
}

.amount-input {
  flex: 1;
  font-size: 48rpx;
  font-weight: bold;
}

.amount-tips {
  display: flex;
  justify-content: space-between;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: $uni-text-color-secondary;
}

.withdraw-all {
  color: $uni-color-primary;
}

.withdraw-notice {
  background: $uni-bg-color-grey;
  border-radius: 12rpx;
  padding: 24rpx;
}

.notice-title {
  font-size: 26rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-bottom: 12rpx;
  display: block;
}

.notice-item {
  font-size: 24rpx;
  color: $uni-text-color-secondary;
  line-height: 1.8;
  display: block;
}

.popup-footer {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
