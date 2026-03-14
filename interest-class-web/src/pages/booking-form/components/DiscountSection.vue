<template>
  <view class="discount-section">
    <view class="section-title">立减优惠</view>

    <!-- 邀请码 -->
    <view class="form-group invite-group">
      <view class="invite-header">
        <view class="label-box">
          <text class="iconfont icon-favorites-fill"></text>
          <text class="label">邀请码</text>
        </view>

        <!-- 已验证状态 -->
        <view class="action-row" v-if="inviteValidated">
          <view class="code-badge">
            <text class="code">{{ modelInviteCode }}</text>
            <view class="remove-btn" @click.stop="emit('clearInvite')">
              <text class="iconfont icon-close"></text>
            </view>
          </view>
          <text class="discount-tag" v-if="inviteDiscount > 0">-￥{{ formatPrice(inviteDiscount) }}</text>
        </view>

        <!-- 未验证状态 -->
        <view class="action-row" v-else>
          <view class="input-trigger">
            <input
              class="code-input"
              :value="modelInviteCode"
              placeholder="请输入邀请码"
              confirm-type="search"
              @input="emit('update:modelInviteCode', ($event as any).detail.value)"
              @confirm="emit('validateInvite')"
            />
            <view class="btn-verify" @click.stop="emit('validateInvite')" v-if="modelInviteCode">
              使用
            </view>
          </view>
          <view class="btn-select" @click="emit('selectInviteCode')">
            <text class="iconfont icon-catalog"></text>
          </view>
        </view>
      </view>
    </view>

    <!-- 余额抵扣 -->
    <view class="form-group balance-group" v-if="userBalance > 0">
      <view class="balance-header">
        <view class="label-box">
          <text class="iconfont icon-money-wallet-fill"></text>
          <text class="label">余额抵扣</text>
          <text class="balance-val">（可用 ￥{{ formatPrice(userBalance) }}）</text>
        </view>
        <view class="action-box">
          <text class="deduct-amount" v-if="modelUseBalance">-￥{{ formatPrice(balanceDeductAmount) }}</text>
          <wd-switch
            :model-value="modelUseBalance"
            size="22px"
            active-color="#52c41a"
            @change="emit('update:modelUseBalance', !modelUseBalance)"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
interface Props {
  modelInviteCode: string
  inviteValidated: boolean
  validatingInvite: boolean
  inviteDiscount: number
  modelUseBalance: boolean
  userBalance: number
  balanceDeductAmount: number
  formatPrice: (val: number | string) => string
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelInviteCode': [val: string]
  'validateInvite': []
  'clearInvite': []
  'selectInviteCode': []
  'update:modelUseBalance': [val: boolean]
}>()
</script>

<style lang="scss" scoped>
.discount-section {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 24rpx;
}

.form-group {
  padding-bottom: 24rpx;
  margin-bottom: 24rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);

  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
}

// 通用标签盒
.label-box {
  display: flex;
  align-items: center;
  gap: 12rpx;

  .iconfont {
    font-size: 32rpx;
    &.icon-favorites-fill { color: #52c41a; }
    &.icon-money-wallet-fill { color: #f5222d; }
  }

  .label {
    font-size: 28rpx;
    color: #333;
    font-weight: 500;
  }
}

.invite-group {
  .invite-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 72rpx;
  }

  .action-row {
    display: flex;
    align-items: center;
    gap: 16rpx;
    flex: 1;
    justify-content: flex-end;
    margin-left: 24rpx;
  }

  .input-trigger {
    background-color: #f7f8fa;
    border-radius: 40rpx;
    padding: 0 24rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    flex: 1;
    max-width: 320rpx;

    .code-input {
      flex: 1;
      font-size: 24rpx;
      color: #333;
    }

    .btn-verify {
      font-size: 24rpx;
      color: #52c41a;
      font-weight: bold;
      margin-left: 12rpx;
      padding-left: 12rpx;
      border-left: 1rpx solid #e8e8e8;
    }
  }

  .btn-select {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f7f8fa;
    border-radius: 50%;
    color: #666;

    .iconfont { font-size: 32rpx; }
  }

  .code-badge {
    background: #f6ffed;
    border: 1rpx solid #b7eb8f;
    border-radius: 32rpx;
    padding: 6rpx 6rpx 6rpx 20rpx;
    display: flex;
    align-items: center;

    .code {
      font-size: 24rpx;
      color: #52c41a;
      font-weight: bold;
      margin-right: 8rpx;
    }

    .remove-btn {
      width: 32rpx;
      height: 32rpx;
      background: #b7eb8f;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      .iconfont { font-size: 20rpx; color: #fff; }
    }
  }

  .discount-tag {
    font-size: 28rpx;
    color: #f5222d;
    font-weight: bold;
    font-family: DINAlternate-Bold, sans-serif;
  }
}

.balance-group {
  .balance-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .balance-val {
    font-size: 24rpx;
    color: #999;
  }

  .action-box {
    display: flex;
    align-items: center;
    gap: 16rpx;

    .deduct-amount {
      font-size: 28rpx;
      color: #f5222d;
      font-weight: bold;
    }
  }
}
</style>
