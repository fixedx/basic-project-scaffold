<template>
  <view class="page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <wd-loading />
    </view>

    <template v-else>
      <!-- ========== 状态：签约审核中 ========== -->
      <view v-if="currentStatus === 'contract_review'" class="status-section">
        <view class="status-icon-wrap review">
          <text class="iconfont icon-time" style="font-size: 80rpx;"></text>
        </view>
        <text class="status-title">签约审核中</text>
        <text class="status-desc">您已提交签约凭证，平台正在审核中，请耐心等待</text>

        <!-- 已提交的截图预览 -->
        <view v-if="contractScreenshot" class="screenshot-preview">
          <text class="preview-label">已提交的签约凭证</text>
          <AsyncImage
            :url="contractScreenshot"
            width="100%"
            height="500rpx"
            mode="aspectFit"
            custom-style="border-radius: 16rpx; border: 1rpx solid #f0f0f0;"
            :enable-preview="true"
          />
        </view>
      </view>

      <!-- ========== 状态：待签约（含驳回重签） ========== -->
      <view v-else-if="currentStatus === 'contract_signing'" class="contract-container">
        <!-- 侧边指示器（作为修饰） -->
        <view class="side-accent"></view>

        <!-- 头部导读 -->
        <view class="contract-header">
          <text class="title">签署入驻协议</text>
          <text class="subtitle">恭喜您的机构通过审核，请完成签署以正式上线</text>
        </view>

        <!-- 驳回原因提示 -->
        <view v-if="rejectReason" class="reject-box">
          <text class="iconfont icon-warning-fill"></text>
          <view class="content">
            <text class="label">签约审核驳回：</text>
            <text class="reason">{{ rejectReason }}</text>
          </view>
        </view>

        <!-- 流程图 -->
        <view class="process-wrapper">
          <view class="process-item" :class="{ active: step >= 1 }">
            <view class="icon-box">
              <view class="dot"></view>
            </view>
            <text>1. 签署协议</text>
          </view>
          <view class="process-line" :class="{ active: step > 1 }"></view>
          <view class="process-item" :class="{ active: step >= 2 }">
            <view class="icon-box">
              <view class="dot"></view>
            </view>
            <text>2. 上传凭证</text>
          </view>
        </view>

        <!-- Step 1: 引导签署 -->
        <view v-if="step === 1" class="step-card fade-in">
          <view class="esign-guide">
            <view class="guide-item">
              <view class="num">01</view>
              <view class="text">
                <text class="h">点击前往腾讯电子签</text>
                <text class="p">具有法律效力，安全可靠</text>
              </view>
            </view>
            <view class="guide-item">
              <view class="num">02</view>
              <view class="text">
                <text class="h">完成签署并截图</text>
                <text class="p">截图需包含“签署成功”字样</text>
              </view>
            </view>
            <view class="guide-item">
              <view class="num">03</view>
              <view class="text">
                <text class="h">返回此处上传</text>
                <text class="p">平台将在1-3个工作日内审核</text>
              </view>
            </view>
          </view>

          <view class="action-footer">
            <wd-button type="primary" block size="large" @click="goToESign">
              立即前往签署
            </wd-button>
            <view class="already-done" @click="step = 2">
              <text>已完成签署？直接上传凭证</text>
              <text class="iconfont icon-right"></text>
            </view>
          </view>
        </view>

        <!-- Step 2: 上传凭证 -->
        <view v-if="step === 2" class="step-card fade-in">
          <view class="upload-section">
            <view class="section-title">上传签约成功截图</view>
            <view class="upload-box-wrap">
              <FileUpload
                v-model="screenshotUrl"
                :limit="1"
                path-prefix="contracts"
                :is-public="true"
              />
            </view>
            
            <view class="upload-notice">
              <view class="notice-title">温馨提示</view>
              <view class="notice-item">凭证需清晰展示签署方与签署状态</view>
              <view class="notice-item">审核通过后，机构将立即面向家长展示</view>
            </view>
          </view>
        </view>
      </view>

      <!-- ========== 状态：已通过（不应出现，但兜底） ========== -->
      <view v-else-if="currentStatus === 'approved'" class="status-section">
        <view class="status-icon-wrap success">
          <text class="iconfont icon-success-fill" style="font-size: 80rpx;"></text>
        </view>
        <text class="status-title">签约完成</text>
        <text class="status-desc">您的机构已正式上线，可以开始运营了！</text>
        <wd-button type="primary" block size="large" style="margin-top: 60rpx;" @click="goToCenter">
          返回机构中心
        </wd-button>
      </view>
    </template>

    <!-- 底部提交按钮（仅 Step 2 显示） -->
    <PageFooter v-if="!loading && currentStatus === 'contract_signing' && step === 2">
      <view class="footer-btns">
        <wd-button plain block @click="step = 1">上一步</wd-button>
        <wd-button type="primary" block :disabled="!screenshotUrl" :loading="submitting" @click="handleSubmit">
          提交签约凭证
        </wd-button>
      </view>
    </PageFooter>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { institutionApi } from '@/api/institution'
import AsyncImage from '@/components/AsyncImage/index.vue'
import FileUpload from '@/components/FileUpload/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

const loading = ref(true)
const submitting = ref(false)
const step = ref(1)
const screenshotUrl = ref('')
const currentStatus = ref('')
const rejectReason = ref('')
const contractScreenshot = ref('')
const institutionId = ref('')

onLoad(() => {
  loadInfo()
})

onShow(() => {
  // 从电子签小程序返回后静默刷新状态，避免选图时触发 loading 遮罩
  if (institutionId.value) {
    loadInfo(true)
  }
})

const loadInfo = async (silent = false) => {
  if (!silent) loading.value = true
  try {
    const info = await institutionApi.getCurrentInstitution()
    institutionId.value = info.id
    // 空/null 或 approved 但未签约 → 视为待签约（contract_signing）
    const approvedWithoutContract = info.audit_status === 'approved' && !info.contract_screenshot
    currentStatus.value = (!info.audit_status || approvedWithoutContract) ? 'contract_signing' : info.audit_status
    rejectReason.value = info.reject_reason || ''
    contractScreenshot.value = info.contract_screenshot || ''

    // 如果有驳回原因，直接显示上传步骤
    if (info.reject_reason && currentStatus.value === 'contract_signing') {
      step.value = 2
    }
  } catch (error) {
    console.error('加载机构信息失败:', error)
    if (!silent) uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    if (!silent) loading.value = false
  }
}

/**
 * 前往腾讯电子签小程序
 */
const goToESign = () => {
  // #ifdef MP-WEIXIN
  uni.navigateToMiniProgram({
    appId: 'wxa023b292fd19d41d', // 腾讯电子签小程序 AppID
    path: '',
    success: () => {
      // 跳转成功后自动切到 step 2
      step.value = 2
    },
    fail: (err: any) => {
      console.error('跳转电子签失败:', err)
      uni.showToast({ title: '跳转失败，请手动完成签署', icon: 'none' })
      step.value = 2
    },
  })
  // #endif

  // #ifdef H5
  uni.showModal({
    title: '提示',
    content: '请在微信小程序中打开腾讯电子签进行签约。H5 端暂不支持直接跳转。',
    showCancel: false,
    success: () => {
      step.value = 2
    },
  })
  // #endif
}

/**
 * 提交签约凭证
 */
const handleSubmit = async () => {
  if (!screenshotUrl.value) {
    uni.showToast({ title: '请先上传签约凭证截图', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    await institutionApi.submitContract(institutionId.value, {
      contract_screenshot: screenshotUrl.value,
    })
    uni.showToast({ title: '提交成功', icon: 'success' })
    // 刷新页面状态，静默刷新避免闪烁
    await loadInfo(true)
  } catch (error) {
    console.error('提交签约凭证失败:', error)
  } finally {
    submitting.value = false
  }
}

/**
 * 返回机构中心
 */
const goToCenter = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: #fff;
  padding-bottom: 200rpx;
  position: relative;
  overflow-x: hidden;
}

.contract-container {
  padding: 40rpx;
}

.side-accent {
  position: absolute;
  top: 0;
  right: -50rpx;
  width: 200rpx;
  height: 200rpx;
  background: radial-gradient(circle, $uni-color-primary-lighter 0%, transparent 70%);
  opacity: 0.5;
  z-index: 0;
}

.contract-header {
  position: relative;
  z-index: 1;
  margin-bottom: 60rpx;

  .title {
    font-size: 48rpx;
    font-weight: 800;
    color: $uni-text-color;
    display: block;
    margin-bottom: 12rpx;
  }

  .subtitle {
    font-size: 26rpx;
    color: $uni-text-color-secondary;
  }
}

.reject-box {
  background-color: #fff2f0;
  border: 1rpx solid #ffccc7;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 40rpx;

  .icon-warning-fill {
    color: #ff4d4f;
    font-size: 32rpx;
    margin-top: 4rpx;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }

  .label {
    font-size: 28rpx;
    font-weight: bold;
    color: #ff4d4f;
  }

  .reason {
    font-size: 26rpx;
    color: #595959;
    line-height: 1.5;
  }
}

.process-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 60rpx;
  padding: 0 10rpx;
}

.process-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  position: relative;
  flex: 1;

  .icon-box {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background-color: #e8e8e8;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;

    .dot {
      width: 16rpx;
      height: 16rpx;
      border-radius: 50%;
      background-color: #fff;
    }
  }

  text {
    font-size: 26rpx;
    color: $uni-text-color-tertiary;
    font-weight: 500;
  }

  &.active {
    .icon-box {
      background-color: $uni-color-primary;
    }
    text {
      color: $uni-color-primary;
      font-weight: bold;
    }
  }
}

.process-line {
  width: 120rpx;
  height: 4rpx;
  background-color: #e8e8e8;
  margin: 0 10rpx;
  margin-top: -46rpx;
  border-radius: 2rpx;
  transition: all 0.3s;

  &.active {
    background-color: $uni-color-primary;
  }
}

.step-card {
  background-color: #fff;
  border-radius: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.05);
  border: 1rpx solid #fafafa;
  overflow: hidden;
}

.esign-guide {
  padding: 48rpx;
  display: flex;
  flex-direction: column;
  gap: 48rpx;
}

.guide-item {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;

  .num {
    font-size: 32rpx;
    font-family: 'DIN Alternate', sans-serif;
    color: $uni-color-primary;
    opacity: 0.3;
    font-weight: bold;
    line-height: 1;
    margin-top: 8rpx;
  }

  .text {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  .h {
    font-size: 30rpx;
    font-weight: bold;
    color: $uni-text-color;
  }

  .p {
    font-size: 24rpx;
    color: $uni-text-color-secondary;
  }
}

.action-footer {
  padding: 0 48rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  align-items: center;
}

.already-done {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  
  .icon-right {
    font-size: 24rpx;
    margin-top: 2rpx;
  }
}

.upload-section {
  padding: 40rpx;

  .section-title {
    font-size: 32rpx;
    font-weight: bold;
    color: $uni-text-color;
    margin-bottom: 40rpx;
    text-align: center;
  }
}

.upload-box-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 48rpx;
  
  :deep(.upload-container) {
    width: 100%;
    .upload-grid {
      justify-content: center;
    }
  }
}

.upload-notice {
  background-color: $uni-bg-color-grey;
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;

  .notice-title {
    font-size: 26rpx;
    font-weight: bold;
    color: $uni-text-color;
    margin-bottom: 4rpx;
  }

  .notice-item {
    font-size: 24rpx;
    color: $uni-text-color-secondary;
    position: relative;
    padding-left: 20rpx;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 14rpx;
      width: 6rpx;
      height: 6rpx;
      border-radius: 50%;
      background-color: $uni-text-color-tertiary;
    }
  }
}

.status-section {
  padding-top: 120rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.loading-state {
  margin-top: 300rpx;
  display: flex;
  justify-content: center;
}

.status-icon-wrap {
  width: 160rpx;
  height: 160rpx;
  border-radius: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: currentColor;
    opacity: 0.1;
  }

  &.review { color: #faad14; }
  &.success { color: $uni-color-primary; }
}

.status-title {
  font-size: 40rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-bottom: 24rpx;
}

.status-desc {
  font-size: 28rpx;
  color: $uni-text-color-secondary;
  line-height: 1.6;
  padding: 0 80rpx;
}

.screenshot-preview {
  width: 100%;
  margin-top: 60rpx;
  padding: 0 40rpx;

  .preview-label {
    font-size: 28rpx;
    font-weight: bold;
    color: $uni-text-color;
    margin-bottom: 20rpx;
    display: block;
  }
}

.footer-btns {
  display: flex;
  gap: 24rpx;
}

.fade-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20rpx); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
