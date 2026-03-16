<template>
  <view class="page">
    <!-- 加载状态 -->
    <view class="loading-state" v-if="loading">
      <Loading text="加载中..." />
    </view>

    <view class="form-container" v-else-if="course">
      <!-- 课程信息卡片 -->
      <CourseInfoCard
        :course="course"
        :selected-sku="selectedSku"
        :sku-cashback-amount="skuCashbackAmount"
        :sku-discount-amount="skuDiscountAmount"
        :display-price="displayPrice"
        :format-price="formatPrice"
      />

      <!-- 机构信息 -->
      <view class="section card" v-if="course.institution">
        <view class="section-title">上课地点</view>
        <view class="institution-info">
          <text class="iconfont icon-location loc-icon"></text>
          <view class="institution-text">
            <text class="inst-name">{{ course.institution.name }}</text>
            <text class="inst-address">{{ course.institution.address }}</text>
          </view>
        </view>
      </view>

      <!-- 选择宝贝 -->
      <ChildSelector
        v-model="selectedChildId"
        :children="children"
        :loading-children="loadingChildren"
        @add-child="goToAddChild"
      />

      <!-- 已选宝贝附加信息 -->
      <view class="section card" v-if="selectedChild">
        <view class="selected-child-info">
          <view class="info-row" v-if="selectedChild.phone">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ selectedChild.phone }}</text>
          </view>
          <view class="info-row" v-if="selectedChild.interests && selectedChild.interests.length > 0">
            <text class="info-label">兴趣爱好</text>
            <text class="info-value">{{ selectedChild.interests.join('、') }}</text>
          </view>
        </view>
      </view>

      <!-- 选择上课时间 -->
      <ScheduleSelector
        :schedules="schedules"
        :selected-schedule-ids="selectedScheduleIds"
        :get-day-of-week-label="getDayOfWeekLabel"
        :format-time-range="formatTimeRange"
        @toggle="selectSchedule"
      />

      <!-- 备注 -->
      <view class="section card">
        <view class="section-title">备注</view>
        <wd-textarea
          v-model="form.remark"
          placeholder="请输入备注信息（选填）"
          :maxlength="200"
          show-word-limit
        />
      </view>

      <!-- 优惠与抵扣（体验课/试听类SKU不展示） -->
      <DiscountSection
        v-if="canUseInviteCode"
        v-model:model-invite-code="inviteCode"
        v-model:model-use-balance="useBalance"
        :invite-validated="inviteValidated"
        :validating-invite="validatingInvite"
        :invite-discount="displayedInviteDiscount"
        :user-balance="userBalance"
        :balance-deduct-amount="balanceDeductAmount"
        :format-price="formatPrice"
        @validate-invite="handleValidateInvite"
        @clear-invite="clearInviteCode"
        @select-invite-code="goSelectInviteCode"
      />

      <!-- 费用明细 -->
      <FeeDetail
        v-if="selectedSku"
        :selected-sku="selectedSku"
        :is-trial-sku="isTrialSku"
        :course="course"
        :display-price="displayPrice"
        :invite-discount="displayedInviteDiscount"
        :model-use-balance="useBalance"
        :balance-deduct-amount="balanceDeductAmount"
        :online-pay-base="onlinePayBase"
        :online-pay-amount="onlinePayAmount"
        :offline-pay-amount="offlinePayAmount"
        :format-price="formatPrice"
      />

      <!-- 报名须知 -->
      <view class="section card">
        <view class="section-title">报名须知</view>
        <view class="notice-list">
          <view class="notice-item">
            <text class="notice-icon">1</text>
            <text class="notice-text">报名成功后，请保持手机畅通，等待机构确认并通知缴费</text>
          </view>
          <view class="notice-item">
            <text class="notice-icon">2</text>
            <text class="notice-text">机构确认后可在"我的订单"中查看详情</text>
          </view>
          <view class="notice-item">
            <text class="notice-icon">3</text>
            <text class="notice-text">确认后如需调整上课时间，可在"我的预约"中修改</text>
          </view>
        </view>
      </view>

      <!-- 用户协议 -->
      <view class="agreement">
        <wd-checkbox v-model="agreed" />
        <text class="agreement-text">
          我已阅读并同意
          <text class="link" @click="showAgreement">《报名服务协议》</text>
        </text>
      </view>
    </view><!-- /form-container -->

    <!-- 错误状态 -->
    <view class="error-state" v-else-if="!loading">
      <text class="iconfont icon-warning" style="font-size: 160rpx; color: #d9d9d9;"></text>
      <text class="error-text">课程不存在</text>
      <wd-button type="primary" @click="handleBack">返回</wd-button>
    </view>

    <!-- 底部操作栏 -->
    <PageFooter v-if="course">
      <view class="footer-content">
        <view class="footer-price" v-if="selectedSku">
          <view class="price-row">
            <text class="price-label">{{ isTrialSku ? '线上支付：' : '需付定金：' }}</text>
            <text class="price-value">￥{{ formatPrice(isTrialSku ? finalPrice : onlinePayAmount) }}</text>
          </view>
          <view class="price-detail" v-if="!isTrialSku">
            <text class="offline-tip">尾款 ￥{{ formatPrice(offlinePayAmount) }} 到店支付</text>
          </view>
          <view class="price-detail" v-else-if="totalDiscount > 0">
            <text class="origin-price">原价 ￥{{ formatPrice(displayPrice || selectedSku.total_price) }}</text>
            <text class="discount-info">已优惠 ￥{{ formatPrice(totalDiscount) }}</text>
          </view>
        </view>
        <wd-button
          type="primary"
          size="large"
          custom-class="submit-btn"
          :loading="submitting"
          @click="handleSubmit"
        >
          {{ course?.type === 'trial' ? '提交预约' : '提交报名' }}
        </wd-button>
      </view>
    </PageFooter>

  </view>
</template>

<script setup lang="ts">
import { useBookingForm } from '@/composables/useBookingForm'
import CourseInfoCard from './components/CourseInfoCard.vue'
import ChildSelector from './components/ChildSelector.vue'
import ScheduleSelector from './components/ScheduleSelector.vue'
import DiscountSection from './components/DiscountSection.vue'
import FeeDetail from './components/FeeDetail.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import Loading from '@/components/Loading/index.vue'

const {
  course, selectedSku, loading, submitting, agreed,
  children, selectedChildId, loadingChildren, selectedChild,
  schedules, selectedScheduleIds,
  inviteCode, inviteValidated, validatingInvite, useBalance,
  form,
  isTrialSku, onlinePayBase, balanceDeductAmount, totalDiscount,
  onlinePayAmount, offlinePayAmount, commissionAmount, finalPrice,
  inviteDiscount, displayedInviteDiscount, canUseInviteCode, userBalance, skuCashbackAmount, skuDiscountAmount, displayPrice,
  formatPrice, getDayOfWeekLabel, formatTimeRange,
  handleValidateInvite, goSelectInviteCode, clearInviteCode,
  selectSchedule, handleSubmit, handleBack, showAgreement, goToAddChild,
} = useBookingForm()
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.form-container {
  padding: 24rpx 32rpx 200rpx;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;

  .error-text {
    margin: 24rpx 0 32rpx;
    color: $uni-text-color-secondary;
  }
}

.section.card {
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

.institution-info {
  display: flex;
  align-items: flex-start;

  .loc-icon {
    font-size: 36rpx;
    color: #52c41a;
    margin-right: 16rpx;
    margin-top: 4rpx;
  }

  .institution-text {
    flex: 1;
    display: flex;
    flex-direction: column;

    .inst-name {
      font-size: 28rpx;
      color: #333;
      font-weight: 500;
    }

    .inst-address {
      font-size: 24rpx;
      color: #666;
      margin-top: 8rpx;
    }
  }
}

.selected-child-info {
  .info-row {
    display: flex;
    align-items: flex-start;
    margin-bottom: 12rpx;

    &:last-child { margin-bottom: 0; }

    .info-label {
      width: 140rpx;
      font-size: 26rpx;
      color: #666;
      flex-shrink: 0;
    }

    .info-value {
      flex: 1;
      font-size: 26rpx;
      color: #333;
    }
  }
}

.notice-list {
  .notice-item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 16rpx;

    &:last-child { margin-bottom: 0; }

    .notice-icon {
      width: 36rpx;
      height: 36rpx;
      border-radius: 50%;
      background-color: $uni-color-primary-lighter;
      color: $uni-color-primary;
      font-size: 22rpx;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-right: 16rpx;
      margin-top: 2rpx;
    }

    .notice-text {
      flex: 1;
      font-size: 26rpx;
      color: #666;
      line-height: 1.6;
    }
  }
}

.agreement {
  display: flex;
  align-items: center;
  padding: 24rpx 0;

  .agreement-text {
    font-size: 26rpx;
    color: #666;
    margin-left: 12rpx;

    .link { color: #52c41a; }
  }
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  .footer-price {
    display: flex;
    flex-direction: column;

    .price-row {
      display: flex;
      align-items: baseline;
    }

    .price-label {
      font-size: 26rpx;
      color: #666;
    }

    .price-value {
      font-size: 40rpx;
      font-weight: 600;
      color: #f5222d;
    }

    .price-detail {
      display: flex;
      align-items: center;
      gap: 16rpx;
      margin-top: 4rpx;

      .origin-price {
        font-size: 22rpx;
        color: #999;
        text-decoration: line-through;
      }

      .discount-info { font-size: 22rpx; color: #52c41a; }
      .offline-tip { font-size: 22rpx; color: #999; }
    }
  }

  .submit-btn { min-width: 240rpx; }
}
</style>
