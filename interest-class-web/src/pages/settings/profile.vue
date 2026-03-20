<template>
  <view class="profile-page">
    <!-- 顶部艺术背景区域 -->
    <view class="hero-section">
      <view class="hero-bg">
        <view class="hero-circle-1"></view>
        <view class="hero-circle-2"></view>
        <view class="hero-circle-3"></view>
      </view>
      
      <view class="hero-content">
        <text class="hero-title">个人主页</text>
        <text class="hero-subtitle">自定义你的身份标识</text>
      </view>

      <!-- 悬浮头像区 -->
      <view class="avatar-card">
        <!-- #ifdef MP-WEIXIN -->
        <button
          class="avatar-wrapper"
          open-type="chooseAvatar"
          :disabled="avatarUploading || saving"
          @chooseavatar="handleChooseWechatAvatar"
        >
          <AsyncImage
            :url="form.avatar || '/static/images/default-avatar.png'"
            width="200rpx"
            height="200rpx"
            mode="aspectFill"
            custom-class="avatar main-avatar"
          />
          <view class="avatar-edit-badge">
            <text class="iconfont icon-camera-fill"></text>
          </view>
        </button>
        <!-- #endif -->

        <!-- #ifndef MP-WEIXIN -->
        <view class="avatar-wrapper">
          <FileUpload
            v-model="form.avatar"
            mode="avatar"
            path-prefix="avatars"
            :is-public="true"
            avatar-size="200rpx"
          />
        </view>
        <!-- #endif -->
        
        <text class="nickname-label">{{ form.nickname || '点击下方输入昵称' }}</text>
        <text class="hint-text">点击头像可同步微信头像</text>
      </view>
    </view>

    <!-- 表单填充区域 -->
    <view class="form-section">
      <view class="form-group slide-up">
        <view class="form-item">
          <view class="item-label">
            <text class="iconfont icon-customer-fill label-icon"></text>
            <text class="label-text">你的昵称</text>
          </view>
          
          <view class="input-container">
            <!-- #ifdef MP-WEIXIN -->
            <input
              v-model="form.nickname"
              type="nickname"
              maxlength="20"
              class="nickname-input"
              placeholder="请输入或获取微信昵称"
              placeholder-class="input-placeholder"
            />
            <!-- #endif -->

            <!-- #ifndef MP-WEIXIN -->
            <input
              v-model="form.nickname"
              maxlength="20"
              class="nickname-input"
              placeholder="请输入昵称"
              placeholder-class="input-placeholder"
            />
            <!-- #endif -->
            
            <text v-if="form.nickname" class="iconfont icon-close-fill clear-btn" @click="form.nickname = ''"></text>
          </view>
          
          <view class="item-footer">
            <text class="footer-tip">好的昵称让老师和机构更容易记住你</text>
          </view>
        </view>
      </view>

      <view class="brand-info slide-up-delay">
        <image src="/static/logo.png" mode="aspectFit" class="brand-logo" />
        <text class="brand-name">Interest Class</text>
        <text class="brand-slogan">陪伴每一个孩子的兴趣成长</text>
      </view>
    </view>

    <PageFooter custom-class="no-shadow">
      <view class="footer-actions">
        <wd-button 
          type="primary" 
          block 
          size="large"
          :loading="saving" 
          :disabled="avatarUploading" 
          custom-class="save-btn"
          @click="handleSave"
        >
          保存所有修改
        </wd-button>
      </view>
    </PageFooter>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { authApi } from '@/api/auth'
import { ossApi } from '@/api/oss'
import { useUserStore } from '@/stores/user'
import AsyncImage from '@/components/AsyncImage/index.vue'
import FileUpload from '@/components/FileUpload/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

const userStore = useUserStore()
const saving = ref(false)
const avatarUploading = ref(false)

const form = reactive({
  nickname: '',
  avatar: '',
})

const buildAvatarPath = (sourcePath: string) => {
  const fileName = sourcePath.split('/').pop() || `wechat-avatar-${Date.now()}.png`
  const extension = fileName.includes('.') ? fileName.split('.').pop() : 'png'
  return `avatars/wechat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
}

const uploadWechatAvatar = async (tempFilePath: string) => {
  avatarUploading.value = true
  try {
    const result = await ossApi.upload(tempFilePath, buildAvatarPath(tempFilePath), true)
    form.avatar = result.path
    uni.showToast({ title: '已读取微信头像', icon: 'success' })
  } catch (error: any) {
    uni.showToast({ title: error?.message || '读取失败', icon: 'none' })
  } finally {
    avatarUploading.value = false
  }
}

const handleChooseWechatAvatar = async (event: any) => {
  const detail = event?.detail || event || {}
  const avatarUrl = detail.avatarUrl

  if (!avatarUrl) {
    uni.showToast({ title: '未获取到头像', icon: 'none' })
    return
  }

  await uploadWechatAvatar(avatarUrl)
}

/**
 * 加载用户信息
 */
const loadUserInfo = async () => {
  try {
    const info = await authApi.getUserInfo()
    form.nickname = info.nickname || ''
    form.avatar = info.avatar || ''
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

/**
 * 保存修改
 */
const handleSave = async () => {
  if (!form.nickname.trim()) {
    uni.showToast({ title: '请输入有效昵称', icon: 'none' })
    return
  }

  saving.value = true
  try {
    await authApi.updateProfile({
      nickname: form.nickname.trim(),
      avatar: form.avatar,
    })
    
    // 同步 Pinia 状态
    userStore.setUserInfo({
      ...userStore.state.userInfo,
      nickname: form.nickname.trim(),
      avatar: form.avatar,
    })

    uni.showToast({ title: '保存成功', icon: 'success' })
    
    // 延迟返回，让用户看到成功提示
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    uni.showToast({ title: error?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadUserInfo()
})
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
}

/* 顶部艺术背景 */
.hero-section {
  position: relative;
  height: 480rpx;
  background: linear-gradient(135deg, $uni-color-primary 0%, $uni-color-primary-dark 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: visible;
  padding-top: 80rpx;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  opacity: 0.15;
  
  view {
    position: absolute;
    border-radius: 50%;
    border: 2rpx solid #ffffff;
  }
  
  .hero-circle-1 {
    width: 600rpx;
    height: 600rpx;
    top: -300rpx;
    left: -100rpx;
  }
  
  .hero-circle-2 {
    width: 400rpx;
    height: 400rpx;
    bottom: -100rpx;
    right: -100rpx;
  }
  
  .hero-circle-3 {
    width: 200rpx;
    height: 200rpx;
    top: 100rpx;
    right: 150rpx;
  }
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: #ffffff;
  
  .hero-title {
    font-size: 44rpx;
    font-weight: 600;
    letter-spacing: 2rpx;
    display: block;
    margin-bottom: 8rpx;
  }
  
  .hero-subtitle {
    font-size: 26rpx;
    opacity: 0.8;
    display: block;
  }
}

.nickname-label {
  margin-top: 32rpx;
  font-size: 36rpx;
  font-weight: 600;
  color: $uni-text-color;
}

.hint-text {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
}

/* 表单区域 */
.form-section {
  flex: 1;
  padding: 240rpx 40rpx 100rpx;
}

.form-group {
  margin-bottom: 60rpx;
}

.form-item {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.02);
}

.item-label {
  display: flex;
  align-items: center;
  margin-bottom: 32rpx;
  
  .label-icon {
    font-size: 32rpx;
    color: $uni-color-primary;
    margin-right: 12rpx;
  }
  
  .label-text {
    font-size: 28rpx;
    font-weight: 500;
    color: $uni-text-color;
  }
}

.input-container {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border-radius: 20rpx;
  padding: 0 24rpx;
  height: 100rpx;
  border: 2rpx solid #eff6ff;
  transition: all 0.3s;
  
  &:focus-within {
    background: #ffffff;
    border-color: $uni-color-primary-light;
    box-shadow: 0 0 0 4rpx $uni-color-primary-lighter;
  }
}

.nickname-input {
  flex: 1;
  height: 100rpx;
  font-size: 32rpx;
  color: $uni-text-color;
}

.input-placeholder {
  color: #94a3b8;
  font-size: 28rpx;
}

.clear-btn {
  padding: 10rpx;
  color: #cbd5e1;
  font-size: 32rpx;
}

.item-footer {
  margin-top: 24rpx;
  
  .footer-tip {
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
  }
}

/* 品牌装饰 */
.brand-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0.5;
  margin-top: auto;
  padding-bottom: 60rpx;
  
  .brand-logo {
    width: 64rpx;
    height: 64rpx;
    margin-bottom: 16rpx;
    filter: grayscale(100%);
  }
  
  .brand-name {
    font-size: 24rpx;
    font-weight: 600;
    color: $uni-text-color;
    letter-spacing: 4rpx;
  }
  
  .brand-slogan {
    font-size: 20rpx;
    color: $uni-text-color-tertiary;
    margin-top: 4rpx;
  }
}

/* 底部操作 */
.footer-actions {
  padding: 0 40rpx;
}

:deep(.save-btn) {
  height: 100rpx !important;
  border-radius: 20rpx !important;
  font-size: 32rpx !important;
  font-weight: 600 !important;
  box-shadow: 0 8rpx 24rpx rgba($uni-color-primary, 0.25) !important;
}

/* 动画特效 */
.slide-up {
  animation: slideUp 0.6s ease-out forwards;
}

.slide-up-delay {
  animation: slideUp 0.8s ease-out forwards;
  opacity: 0;
}

@keyframes slideUp {
  from {
    transform: translateY(40rpx);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 去除 PageFooter 默认阴影以配合新设计 */
:deep(.no-shadow .page-footer) {
  box-shadow: none !important;
  background-color: transparent !important;
}
</style>
