<template>
  <view class="auth-login-layout">
    <view class="auth-login-layout__bg">
      <view class="auth-login-layout__halo auth-login-layout__halo--one"></view>
      <view class="auth-login-layout__halo auth-login-layout__halo--two"></view>
      <view class="auth-login-layout__grid"></view>
    </view>

    <view class="auth-login-layout__content">
      <view class="auth-login-layout__hero">
        <view class="auth-login-layout__brand">
          <view class="auth-login-layout__logo">
            <AsyncImage
              v-if="logoUrl"
              :url="logoUrl"
              width="108rpx"
              height="108rpx"
              mode="aspectFit"
              custom-class="auth-login-layout__logo-image"
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
          <text class="auth-login-layout__agreement-text">登录即表示同意</text>
          <text class="auth-login-layout__agreement-link" @click="handleLinkClick('/pages/agreement/index', true)">《用户协议》</text>
          <text class="auth-login-layout__agreement-text">和</text>
          <text class="auth-login-layout__agreement-link" @click="handleLinkClick('/pages/privacy/index', true)">《隐私政策》</text>
        </view>
      </view>

      <view v-if="links.length > 0" class="auth-login-layout__links">
        <text class="auth-login-layout__links-title">其他入口</text>
        <view class="auth-login-layout__links-grid">
          <view
            v-for="link in links"
            :key="`${link.label}-${link.path}`"
            class="auth-login-layout__link-item"
            @click="handleLinkClick(link.path, link.navigate)"
          >
            <view class="auth-login-layout__link-icon">
              <text class="iconfont" :class="link.icon"></text>
            </view>
            <text class="auth-login-layout__link-label">{{ link.label }}</text>
          </view>
        </view>
      </view>

      <view class="auth-login-layout__footer">
        <view class="auth-login-layout__footer-btn" @click="handleFooterAction">
          <text class="iconfont" :class="footerIcon"></text>
          <text>{{ footerText }}</text>
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
  footerText: '返回首页',
  footerIcon: 'icon-home',
  footerPath: '/pages/index/index',
  footerNavigate: false,
})

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
  background:
    radial-gradient(circle at top left, rgba(82, 196, 26, 0.18), transparent 32%),
    linear-gradient(180deg, #f6ffe8 0%, #f8faf7 48%, #ffffff 100%);
}

.auth-login-layout__bg {
  position: absolute;
  inset: 0;
}

.auth-login-layout__halo {
  position: absolute;
  border-radius: 50%;
  filter: blur(8rpx);
}

.auth-login-layout__halo--one {
  top: -140rpx;
  right: -120rpx;
  width: 420rpx;
  height: 420rpx;
  background: rgba(82, 196, 26, 0.14);
}

.auth-login-layout__halo--two {
  left: -100rpx;
  top: 260rpx;
  width: 260rpx;
  height: 260rpx;
  background: rgba(149, 222, 100, 0.18);
}

.auth-login-layout__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(82, 196, 26, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(82, 196, 26, 0.03) 1px, transparent 1px);
  background-size: 28rpx 28rpx;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.4), transparent 72%);
}

.auth-login-layout__content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 112rpx 40rpx 56rpx;
  display: flex;
  flex-direction: column;
}

.auth-login-layout__hero {
  margin-bottom: 40rpx;
}

.auth-login-layout__brand {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 28rpx;
}

.auth-login-layout__logo {
  width: 120rpx;
  height: 120rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18rpx 42rpx rgba(82, 196, 26, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.auth-login-layout__logo-image) {
  border-radius: 24rpx;
}

.auth-login-layout__logo-icon {
  font-size: 62rpx;
  color: $uni-color-primary;
}

.auth-login-layout__role-chip {
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: $uni-color-primary;
  background: rgba(82, 196, 26, 0.10);
  border: 1rpx solid rgba(82, 196, 26, 0.22);
}

.auth-login-layout__title {
  display: block;
  font-size: 52rpx;
  line-height: 1.18;
  font-weight: 700;
  color: #1f2a1f;
}

.auth-login-layout__subtitle {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: #708070;
}

.auth-login-layout__card {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  border: 1rpx solid rgba(255, 255, 255, 0.7);
  border-radius: 36rpx;
  padding: 36rpx 32rpx;
  box-shadow: 0 22rpx 60rpx rgba(20, 30, 20, 0.08);
}

.auth-login-layout__agreement {
  margin-top: 28rpx;
  text-align: center;
  font-size: 22rpx;
  line-height: 1.8;
}

.auth-login-layout__agreement-text {
  color: $uni-text-color-tertiary;
}

.auth-login-layout__agreement-link {
  color: $uni-color-primary;
}

.auth-login-layout__links {
  margin-top: 36rpx;
  padding: 28rpx 24rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.72);
}

.auth-login-layout__links-title {
  display: block;
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
  margin-bottom: 24rpx;
}

.auth-login-layout__links-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24rpx 12rpx;
}

.auth-login-layout__link-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.auth-login-layout__link-icon {
  width: 84rpx;
  height: 84rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(82, 196, 26, 0.08);

  .iconfont {
    font-size: 40rpx;
    color: $uni-color-primary;
  }
}

.auth-login-layout__link-label {
  font-size: 22rpx;
  color: $uni-text-color-secondary;
}

.auth-login-layout__footer {
  margin-top: auto;
  padding-top: 28rpx;
  display: flex;
  justify-content: center;
}

.auth-login-layout__footer-btn {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 18rpx 28rpx;
  border-radius: 999rpx;
  color: $uni-text-color-secondary;
  background: rgba(255, 255, 255, 0.82);
  font-size: 24rpx;

  .iconfont {
    font-size: 22rpx;
  }
}
</style>