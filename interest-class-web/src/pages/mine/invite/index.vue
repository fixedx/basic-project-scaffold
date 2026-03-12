<template>
  <view v-if="isReady" class="page">
    <!-- 收益卡片 (Top Priority) -->
    <view class="earnings-card">
      <view class="earnings-header">
        <text class="label">可提现金额 (元)</text>
        <view class="amount-row">
          <text class="currency">¥</text>
          <text class="amount">{{ formatPrice(stats?.balance?.available || 0) }}</text>
        </view>
        <wd-button 
          size="medium"
          custom-class="withdraw-btn"
          :disabled="(stats?.balance?.available || 0) < 50"
          @click="goToWallet"
        >
          {{ (stats?.balance?.available || 0) >= 50 ? '立即提现' : '满50元可提现' }}
        </wd-button>
      </view>
      
      <view class="earnings-grid">
        <view class="grid-item">
          <text class="value">¥{{ formatPrice(stats?.balance?.total_earned || 0) }}</text>
          <text class="label">累计收益</text>
        </view>
        <view class="grid-item">
          <text class="value">¥{{ formatPrice(stats?.balance?.frozen || 0) }}</text>
          <text class="label">待结算</text>
        </view>
        <view class="grid-item clickable" @click="goToEarnings">
          <text class="value iconfont icon-list"></text>
          <text class="label">收益明细</text>
        </view>
      </view>
    </view>

    <!-- 邀请码卡片 (Secondary) -->
    <view class="invite-section">
      <view class="section-title-row">
        <text class="title">我的专属邀请码</text>
        <view 
          class="status-tag"
          :class="{ 'status-frozen': inviteCode?.status === 'frozen' }"
        >
          {{ inviteCode?.status === 'active' ? '使用中' : '已冻结' }}
        </view>
      </view>

      <view class="code-card">
        <view class="code-display">
          <text class="code-text">{{ inviteCode?.invite_code || '....' }}</text>
          <view class="actions">
            <view class="action-btn" @click="copyCode">
              <text class="iconfont icon-copy"></text>
              <text>复制</text>
            </view>
            <view class="divider"></view>
            <view class="action-btn" @click="shareCode">
              <text class="iconfont icon-share"></text>
              <text>分享</text>
            </view>
          </view>
        </view>
        
        <view class="usage-stats">
          <text class="stat">今日已用: {{ inviteCode?.daily_use_count || 0 }}/50</text>
          <text class="stat">累计使用: {{ inviteCode?.use_count || 0 }}次</text>
        </view>
      </view>
    </view>
    
    <!-- 让利比例设置 -->
    <view class="setting-card">
      <view class="card-header">
        <text class="card-title">让利比例设置</text>
        <text class="card-desc">设置让利给好友的比例，剩余比例归自己</text>
      </view>
      
      <view class="ratio-display">
        <view class="ratio-box friend">
          <text class="label">好友立减</text>
          <text class="val">{{ shareRatio }}%</text>
        </view>
        <view class="ratio-icon">
          <text class="iconfont icon-exchange"></text>
        </view>
        <view class="ratio-box self">
          <text class="label">我的收益</text>
          <text class="val">{{ 100 - shareRatio }}%</text>
        </view>
      </view>

      <view class="ratio-slider">
        <wd-slider
          v-model="shareRatio"
          :min="0"
          :max="100"
          :step="5"
          active-color="#52c41a"
          @dragend="handleRatioChange"
        />
      </view>
      
      <view class="ratio-presets">
        <view 
          v-for="preset in ratioPresets" 
          :key="preset"
          class="preset-tag"
          :class="{ 'preset-active': shareRatio === preset }"
          @click="shareRatio = preset; handleRatioChange(preset)"
        >
          {{ preset }}% (好友)
        </view>
      </view>
    </view>

    <!-- 管理操作 -->
    <view class="action-section">
      <wd-button 
        v-if="inviteCode?.status === 'active'"
        block 
        plain
        type="warning"
        @click="handleFreeze"
      >
        冻结邀请码
      </wd-button>
      <wd-button 
        v-else
        block 
        type="primary"
        @click="handleUnfreeze"
      >
        解冻邀请码
      </wd-button>
      
      <view class="reset-link" @click="handleReset">
        重置邀请码 (生成新的ID)
      </view>
    </view>
    
    <!-- 使用说明 -->
    <view class="tips-card">
      <text class="tips-title">收益说明</text>
      <view class="tips-list">
        <text class="tips-item">1. 分享邀请码给好友，好友下单可享受立减优惠。</text>
        <text class="tips-item">2. 比如课程返现比例是10%，您设置好友让利50%，则好友优惠5%，您获得5%收益。</text>
        <text class="tips-item">3. 收益在好友"确认收货/核销完成"后自动结算到余额。</text>
        <text class="tips-item">4. 满50元可申请提现到微信零钱，实时到账。</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { inviteApi, type InviteCodeInfo, type InviteStats } from '@/api'
import { useAuthGuard } from '@/composables/useAuthGuard'

const { isReady } = useAuthGuard()

const inviteCode = ref<InviteCodeInfo | null>(null)
const stats = ref<InviteStats | null>(null)
const shareRatio = ref(50)
const ratioPresets = [0, 20, 50, 80, 100]

const formatPrice = (price: number) => {
  return (Number(price) || 0).toFixed(2)
}

const loadData = async () => {
  try {
    const [codeRes, statsRes] = await Promise.all([
      inviteApi.getMyInviteCode(),
      inviteApi.getInviteStats(),
    ])
    inviteCode.value = codeRes
    stats.value = statsRes
    shareRatio.value = codeRes.share_ratio
  } catch (e) {
    console.error('加载邀请码信息失败', e)
  }
}

const copyCode = () => {
  if (!inviteCode.value?.invite_code) return
  uni.setClipboardData({
    data: inviteCode.value.invite_code,
    success: () => {
      uni.showToast({ title: '复制成功', icon: 'success' })
    },
  })
}

const shareCode = () => {
  uni.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] })
}

const handleRatioChange = async (event: { value: number } | number) => {
  const value = typeof event === 'number' ? event : event.value
  try {
    await inviteApi.setShareRatio(value)
    uni.showToast({ title: '已更新比例', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '设置失败', icon: 'none' })
  }
}

const handleFreeze = async () => {
  uni.showModal({
    title: '确认冻结',
    content: '冻结后邀请码将无法使用，确定要冻结吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await inviteApi.freezeInviteCode()
          uni.showToast({ title: '已冻结', icon: 'success' })
          loadData()
        } catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

const handleUnfreeze = async () => {
  try {
    await inviteApi.unfreezeInviteCode()
    uni.showToast({ title: '已解冻', icon: 'success' })
    loadData()
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

const handleReset = async () => {
  uni.showModal({
    title: '确认重置',
    content: '重置后将生成新的邀请码，原邀请码将失效，确定要重置吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const newCode = await inviteApi.resetInviteCode()
          inviteCode.value = newCode
          uni.showToast({ title: '重置成功', icon: 'success' })
        } catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

const goToEarnings = () => {
  uni.navigateTo({ url: '/pages/mine/invite-earnings/index' })
}

const goToWallet = () => {
  uni.navigateTo({ url: '/pages/mine/wallet/index' })
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24rpx;
  padding-bottom: 80rpx;
}

/* 收益详情卡片 */
.earnings-card {
  background: linear-gradient(135deg, #237804 0%, #52c41a 100%);
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  color: #fff;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(82, 196, 26, 0.25);
  
  .earnings-header {
    text-align: center;
    margin-bottom: 40rpx;
    
    .label {
      font-size: 26rpx;
      opacity: 0.9;
      display: block;
      margin-bottom: 16rpx;
    }
    
    .amount-row {
      display: flex;
      justify-content: center;
      align-items: baseline;
      margin-bottom: 24rpx;
      
      .currency {
        font-size: 32rpx;
        font-weight: bold;
        margin-right: 8rpx;
      }
      
      .amount {
        font-size: 72rpx;
        font-family: 'DINAlternate-Bold', sans-serif;
        font-weight: bold;
        line-height: 1;
      }
    }
    
    .withdraw-btn {
      border-radius: 100rpx;
      font-weight: bold;
      color: #52c41a !important;
      background: #fff !important;
      border: none !important;
      padding: 0 48rpx;
      min-width: 200rpx;
      
      &.is-disabled {
        opacity: 0.7;
        background: rgba(255,255,255,0.8) !important;
        color: #999 !important;
      }
    }
  }
  
  .earnings-grid {
    display: flex;
    justify-content: space-between;
    padding-top: 32rpx;
    border-top: 1rpx solid rgba(255, 255, 255, 0.15);
    
    .grid-item {
      flex: 1;
      text-align: center;
      
      &.clickable:active {
        opacity: 0.8;
      }
      
      .value {
        display: block;
        font-size: 36rpx;
        font-weight: bold;
        font-family: 'DINAlternate-Bold', sans-serif;
        margin-bottom: 8rpx;
        min-height: 42rpx;
        
        &.iconfont {
          font-size: 36rpx;
          line-height: 42rpx;
        }
      }
      
      .label {
        font-size: 24rpx;
        opacity: 0.8;
      }
    }
  }
}

/* 邀请码区域 */
.invite-section {
  margin-bottom: 24rpx;
  
  .section-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
    padding: 0 8rpx;
    
    .title {
      font-size: 30rpx;
      font-weight: bold;
      color: #333;
    }
    
    .status-tag {
      font-size: 22rpx;
      padding: 4rpx 12rpx;
      border-radius: 8rpx;
      background: #e6f7ff;
      color: #1890ff;
      
      &.status-frozen {
        background: #fff1f0;
        color: #f5222d;
      }
    }
  }
  
  .code-card {
    background: #fff;
    border-radius: 24rpx;
    padding: 32rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.02);
    
    .code-display {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f9f9f9;
      border-radius: 16rpx;
      padding: 24rpx 32rpx;
      margin-bottom: 24rpx;
      border: 1rpx dashed #d9d9d9;
      
      .code-text {
        font-size: 44rpx;
        font-weight: bold;
        color: #333;
        letter-spacing: 4rpx;
      }
      
      .actions {
        display: flex;
        align-items: center;
        
        .action-btn {
          display: flex;
          align-items: center;
          padding: 12rpx;
          
          .iconfont {
            font-size: 32rpx;
            color: #52c41a;
            margin-right: 4rpx;
          }
          
          text {
            font-size: 26rpx;
            color: #666;
          }
          
          &:active {
            opacity: 0.6;
          }
        }
        
        .divider {
          width: 1rpx;
          height: 24rpx;
          background: #e8e8e8;
          margin: 0 16rpx;
        }
      }
    }
    
    .usage-stats {
      display: flex;
      justify-content: space-between;
      font-size: 24rpx;
      color: #999;
      padding: 0 8rpx;
    }
  }
}

/* 比例设置卡片 */
.setting-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.02);
  
  .card-header {
    margin-bottom: 32rpx;
    
    .card-title {
      font-size: 30rpx;
      font-weight: bold;
      color: #333;
      margin-right: 16rpx;
    }
    
    .card-desc {
      font-size: 24rpx;
      color: #999;
    }
  }
  
  .ratio-display {
    display: flex;
    align-items: center;
    justify-content: space-around;
    margin-bottom: 48rpx;
    
    .ratio-box {
      text-align: center;
      
      .label {
        font-size: 24rpx;
        color: #666;
        display: block;
        margin-bottom: 8rpx;
      }
      
      .val {
        font-size: 40rpx;
        font-weight: bold;
        font-family: 'DINAlternate-Bold', sans-serif;
      }
      
      &.friend .val { color: #faad14; }
      &.self .val { color: #52c41a; }
    }
    
    .ratio-icon {
      color: #d9d9d9;
    }
  }
  
  .ratio-slider {
    padding: 0 16rpx;
    margin-bottom: 32rpx;
  }
  
  .ratio-presets {
    display: flex;
    justify-content: center;
    gap: 16rpx;
    flex-wrap: wrap;
    
    .preset-tag {
      padding: 10rpx 24rpx;
      background: #f5f5f5;
      border-radius: 100rpx;
      font-size: 24rpx;
      color: #666;
      border: 1rpx solid transparent;
      transition: all 0.2s;
      
      &.preset-active {
        background: #f6ffed;
        color: #52c41a;
        border-color: #b7eb8f;
        font-weight: 500;
      }
    }
  }
}

/* 操作区域 */
.action-section {
  margin-top: 48rpx;
  padding: 0 16rpx;
  
  .reset-link {
    text-align: center;
    font-size: 24rpx;
    color: #999;
    margin-top: 24rpx;
    text-decoration: underline;
  }
}

/* 提示卡片 */
.tips-card {
  margin-top: 48rpx;
  padding: 32rpx;
  
  .tips-title {
    font-size: 26rpx;
    font-weight: bold;
    color: #666;
    margin-bottom: 24rpx;
    display: block;
    text-align: center;
    position: relative;
    
    &::before, &::after {
      content: '';
      display: inline-block;
      width: 40rpx;
      height: 1rpx;
      background: #ddd;
      vertical-align: middle;
      margin: 0 16rpx;
    }
  }
  
  .tips-list {
    .tips-item {
      display: block;
      font-size: 24rpx;
      color: #999;
      line-height: 1.6;
      margin-bottom: 8rpx;
    }
  }
}
</style>
