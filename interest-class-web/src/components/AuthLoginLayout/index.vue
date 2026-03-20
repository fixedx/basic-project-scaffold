<template>
  <view class="auth-login-layout">
    <view class="auth-login-layout__bg">
        <view class="auth-login-layout__glow auth-login-layout__glow--left"></view>
        <view class="auth-login-layout__glow auth-login-layout__glow--right"></view>
    </view>
    
      <view class="auth-login-layout__content">
        <view class="auth-login-layout__panel">
          <view class="auth-login-layout__panel-top">
            <view class="auth-login-layout__logo-wrap">
              <view class="auth-login-layout__logo avatar">
                <AsyncImage
                  v-if="logoUrl"
                  :url="logoUrl"
                  width="104rpx"
                  height="104rpx"
                  mode="aspectFit"
                  custom-class="avatar"
                />
                <text v-else class="iconfont auth-login-layout__logo-icon" :class="logoIcon"></text>
              </view>
              <view v-if="roleLabel" class="auth-login-layout__role-chip">{{ roleLabel }}</view>
            </view>

            <text class="auth-login-layout__title">{{ title }}</text>
            <text class="auth-login-layout__subtitle">{{ subtitle }}</text>
          </view>

          <view class="auth-login-layout__card">
            <slot></slot>

            <view v-if="showAgreement" class="auth-login-layout__agreement">
              <view class="auth-login-layout__agreement-row">
                <wd-checkbox :model-value="isAgreed" @change="handleAgreementChange" shape="square" size="small"></wd-checkbox>
                <view class="auth-login-layout__agreement-content">
                  <text class="auth-login-layout__agreement-text">我已阅读并同意</text>
                  <text class="auth-login-layout__agreement-link" @click.stop="handleLinkClick('/pages/agreement/index', true)">《用户协议》</text>
                  <text class="auth-login-layout__agreement-text">和</text>
                  <text class="auth-login-layout__agreement-link" @click.stop="handleLinkClick('/pages/privacy/index', true)">《隐私政策》</text>
                </view>
              </view>
            </view>
          </view>

          <view v-if="links.length > 0" class="auth-login-layout__links">
            <text class="auth-login-layout__links-title">切换其他身份</text>
            <view class="auth-login-layout__links-grid">
              <view
                v-for="link in links"
                :key="`${link.label}-${link.path}`"
                class="auth-login-layout__link-card"
                @click="handleLinkClick(link.path, link.navigate)"
              >
                <view class="auth-login-layout__link-icon-wrap">
                  <text class="iconfont auth-login-layout__link-icon" :class="link.icon"></text>
                </view>
                <text class="auth-login-layout__link-label">{{ link.label }}</text>
              </view>
            </view>
          </view>

          <view class="auth-login-layout__footer">
            <view class="auth-login-layout__footer-btn" @click="handleFooterAction">
              <text class="iconfont auth-login-layout__footer-icon" :class="footerIcon"></text>
              <text>{{ footerText }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </template>

  <script setup lang="ts">
  import AsyncImage from '@/components/AsyncImage/index.vue'

  interface LinkItem {
    label: string
    path: string
    icon: string
    navigate?: boolean
  }

  interface Props {
    title: string
    subtitle: string
    roleLabel?: string
    logoUrl?: string
    logoIcon?: string
    links?: LinkItem[]
    showAgreement?: boolean
    isAgreed?: boolean
    footerText?: string
    footerIcon?: string
    footerPath?: string
    footerNavigate?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    roleLabel: '',
    logoUrl: '/static/logo.png',
    logoIcon: 'icon-customer',
    links: () => [],
    showAgreement: true,
    isAgreed: false,
    footerText: '返回首页',
    footerIcon: 'icon-home',
    footerPath: '/pages/index/index',
    footerNavigate: false,
  })

  const emit = defineEmits<{
    (e: 'update:isAgreed', value: boolean): void
  }>()

  const handleAgreementChange = ({ value }: { value: boolean }) => {
    emit('update:isAgreed', value)
  }

  const handleLinkClick = (path: string, navigate = false) => {
    if (navigate) {
      uni.navigateTo({ url: path })
      return
    }
    uni.reLaunch({ url: path })
  }

  const handleFooterAction = () => {
    handleLinkClick(props.footerPath, props.footerNavigate)
  }
  </script>

  <style lang="scss" scoped>
  .auth-login-layout {
    min-height: 100vh;
    position: relative;
    overflow: hidden;
    background: #f8fafc; // 偏灰白的底色，突出中间的卡片
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .auth-login-layout__bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(circle at 0% 0%, rgba(82, 196, 26, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 100% 100%, rgba(82, 196, 26, 0.05) 0%, transparent 50%);
  }

  .auth-login-layout__glow {
    display: none; // 移除旧的气泡
  }

  .auth-login-layout__content {
    position: relative;
    z-index: 1;
    width: 100%;
    padding: 40rpx 32rpx;
    display: flex;
    justify-content: center;
  }

  .auth-login-layout__panel {
    width: 100%;
    max-width: 640rpx;
    animation: fadeInScale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(20rpx);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .auth-login-layout__panel-top {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-bottom: 48rpx;
  }

  .auth-login-layout__logo-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20rpx;
    margin-bottom: 32rpx;
  }

  .auth-login-layout__logo {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 0;
    box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.05);
  }

  :deep(.auth-login-layout__logo .avatar) {
    width: 104rpx !important;
    height: 104rpx !important;
    margin-right: 0 !important;
    border: 0 !important;
    background-color: transparent !important;
  }

  .auth-login-layout__logo-icon {
    font-size: 56rpx;
    color: $uni-color-primary;
  }

  .auth-login-layout__role-chip {
    padding: 6rpx 20rpx;
    border-radius: 999rpx;
    background: $uni-color-primary;
    color: #ffffff;
    font-size: 20rpx;
    font-weight: 600;
    box-shadow: 0 4rpx 12rpx rgba($uni-color-primary, 0.2);
  }

  .auth-login-layout__title {
    display: block;
    font-size: 40rpx;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.4;
  }

  .auth-login-layout__subtitle {
    display: block;
    margin-top: 8rpx;
    font-size: 26rpx;
    color: #64748b;
  }

  .auth-login-layout__card {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border-radius: 40rpx;
    padding: 56rpx 40rpx 48rpx;
    border: 1rpx solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.05);
  }

  .auth-login-layout__agreement {
    margin-top: 40rpx;
    padding: 0 4rpx;
  }

  .auth-login-layout__agreement-row {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 8rpx;
  }

  .auth-login-layout__agreement-content {
    flex: 1;
    font-size: 24rpx;
    line-height: 1.5;
    color: #94a3b8;
  }

  :deep(.wd-checkbox) {
    margin-top: 2rpx;
  }

  :deep(.wd-checkbox__label) {
    display: none;
  }

  .auth-login-layout__agreement-text {
    color: #94a3b8;
  }

  .auth-login-layout__agreement-link {
    color: $uni-color-primary;
    font-weight: 500;
  }

  .auth-login-layout__links {
    margin-top: 48rpx;
  }

  .auth-login-layout__links-title {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22rpx;
    color: #cbd5e1;
    margin-bottom: 24rpx;
    
    &::before, &::after {
      content: '';
      flex: 1;
      height: 1rpx;
      background: #e2e8f0;
      max-width: 60rpx;
      margin: 0 20rpx;
    }
  }

  .auth-login-layout__links-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24rpx;
    padding: 0 4rpx;
  }

  .auth-login-layout__link-card {
    background: #ffffff;
    border: 1rpx solid #f1f5f9;
    border-radius: 24rpx;
    padding: 32rpx 20rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16rpx;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.02);

    &:active {
      transform: scale(0.96);
      background: #f8fafc;
      border-color: $uni-color-primary-lighter;
    }
  }

  .auth-login-layout__link-icon-wrap {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .auth-login-layout__link-icon {
    font-size: 40rpx;
    color: $uni-color-primary;
  }

  .auth-login-layout__link-label {
    font-size: 28rpx;
    font-weight: 500;
    color: #475569;
  }

  .auth-login-layout__footer {
    display: flex;
    justify-content: center;
    margin-top: 60rpx;
  }

  .auth-login-layout__footer-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    color: #94a3b8;
    font-size: 26rpx;
    padding: 20rpx;
  }

  .auth-login-layout__footer-icon {
    font-size: 24rpx;
  }

  @media screen and (max-height: 600px) {
    .auth-login-layout__content {
      padding-top: 40rpx;
      padding-bottom: 40rpx;
    }
    .auth-login-layout__panel-top {
      margin-bottom: 32rpx;
    }
  }
  </style>