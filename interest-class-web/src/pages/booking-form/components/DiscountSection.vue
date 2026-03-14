<template>
  <view class="discount-section">
    <view class="section-title">优惠与抵扣</view>

    <!-- 邀请码 -->
    <view class="form-group invite-group">
      <view class="invite-section">
        <view class="invite-header">
          <view class="left-col" v-if="inviteValidated">
            <text class="tag">已减￥{{ formatPrice(inviteDiscount) }}</text>
          </view>

          <!-- 验证后状态 -->
          <view class="action-row full" v-if="inviteValidated">
            <view class="code-badge">
              <text class="code">{{ modelInviteCode }}</text>
              <view class="remove-btn" @click.stop="emit('clearInvite')">
                <text class="iconfont icon-close"></text>
              </view>
            </view>
          </view>

          <!-- 未验证状态 -->
          <view class="action-row" v-else>
            <view class="input-trigger">
              <input
                class="code-input"
                :value="modelInviteCode"
                placeholder="如有邀请码，请输入"
                confirm-type="search"
                @input="emit('update:modelInviteCode', ($event as any).detail.value)"
                @confirm="emit('validateInvite')"
              />
              <view class="btn-verify" @click.stop="emit('validateInvite')" v-if="modelInviteCode">
                验证
              </view>
            </view>
            <view class="divider"></view>
            <view class="btn-select" @click="emit('selectInviteCode')">
              <text class="text">选择</text>
              <text class="iconfont icon-right"></text>
            </view>
          </view>
        </view>

        <view class="discount-display" v-if="inviteDiscount > 0">
          <text class="tip">邀请码抵扣</text>
          <text class="amount">-￥{{ formatPrice(inviteDiscount) }}</text>
        </view>
      </view>
    </view>

    <!-- 余额抵扣 -->
    <view class="form-group balance-group" v-if="userBalance > 0">
      <view class="balance-row">
        <view class="balance-left">
          <text class="form-label">余额抵扣</text>
          <text class="balance-tip">可用余额 ￥{{ formatPrice(userBalance) }}</text>
        </view>
        <wd-switch
          :model-value="modelUseBalance"
          @change="emit('update:modelUseBalance', !modelUseBalance)"
        />
      </view>
      <view class="balance-deduct" v-if="modelUseBalance">
        <text class="deduct-label">本次抵扣</text>
        <text class="deduct-value">-￥{{ formatPrice(balanceDeductAmount) }}</text>
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
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
  padding-left: 20rpx;
  position: relative;
  margin-bottom: 24rpx;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 6rpx;
    height: 28rpx;
    background: linear-gradient(to bottom, #52c41a, #95de64);
    border-radius: 4rpx;
  }
}

.form-group {
  margin-bottom: 24rpx;

  &:last-child { margin-bottom: 0; }
}

.invite-group {
  .invite-section {
    background-color: #f7f8fa;
    border-radius: 16rpx;
    padding: 24rpx;
  }

  .invite-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 64rpx;

    .left-col {
      display: flex;
      align-items: center;
      gap: 16rpx;
      margin-right: 16rpx;

      .tag {
        font-size: 20rpx;
        color: #f5222d;
        background-color: #fff1f0;
        border: 1rpx solid #ffa39e;
        padding: 2rpx 8rpx;
        border-radius: 4rpx;
        white-space: nowrap;
      }
    }

    .action-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      min-width: 0;

      &.full { flex: 1; }
    }

    .input-trigger {
      display: flex;
      align-items: center;
      background-color: #fff;
      border-radius: 8rpx;
      padding: 0 16rpx;
      height: 64rpx;
      margin-right: 16rpx;
      border: 1rpx solid transparent;
      flex: 1;

      &:focus-within { border-color: #52c41a; }

      .code-input {
        flex: 1;
        width: 100%;
        font-size: 26rpx;
        color: #333;
      }

      .btn-verify {
        font-size: 24rpx;
        color: #52c41a;
        font-weight: 500;
        padding-left: 16rpx;
        border-left: 1rpx solid #e8e8e8;
        margin-left: 8rpx;
        white-space: nowrap;
      }
    }

    .divider {
      width: 1rpx;
      height: 24rpx;
      background-color: #d9d9d9;
      margin: 0 16rpx;
    }

    .btn-select {
      display: flex;
      align-items: center;
      color: #666;

      .text { font-size: 26rpx; margin-right: 4rpx; }
      .iconfont { font-size: 24rpx; color: #999; }
    }

    .code-badge {
      display: flex;
      align-items: center;
      background-color: #f6ffed;
      border: 1rpx solid #b7eb8f;
      border-radius: 32rpx;
      padding: 6rpx 6rpx 6rpx 20rpx;

      .code {
        font-size: 26rpx;
        color: #52c41a;
        font-weight: 500;
        margin-right: 12rpx;
        font-family: monospace;
      }

      .remove-btn {
        width: 36rpx;
        height: 36rpx;
        display: flex;
        align-items: center;
        justify-content: center;

        .iconfont { font-size: 32rpx; color: #bfbfbf; }
      }
    }
  }

  .discount-display {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 24rpx;
    padding-top: 24rpx;
    border-top: 1rpx solid rgba(0, 0, 0, 0.05);

    .tip { font-size: 26rpx; color: #666; }

    .amount {
      font-size: 32rpx;
      color: #f5222d;
      font-weight: 700;
      font-family: DINAlternate-Bold, sans-serif;
    }
  }
}

.balance-group {
  .balance-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .balance-left {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }

  .form-label {
    font-size: 28rpx;
    color: #333;
  }

  .balance-tip {
    font-size: 24rpx;
    color: #666;
  }

  .balance-deduct {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16rpx;
    padding: 16rpx;
    background-color: #d9f7be;
    border-radius: 8rpx;

    .deduct-label { font-size: 26rpx; color: #333; }

    .deduct-value {
      font-size: 28rpx;
      font-weight: bold;
      color: #f5222d;
    }
  }
}
</style>
