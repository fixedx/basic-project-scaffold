<template>
  <AuthLoginLayout
    title="管理员登录"
    v-model:is-agreed="isAgreed"
    :links="entryLinks"
    footer-text="返回首页"
  >
    <view class="form-stack">
      <view class="form-field">
        <text class="iconfont icon-customer-fill form-field__icon"></text>
        <input
          v-model="formData.username"
          class="form-field__input"
          placeholder="管理员账号"
          placeholder-class="form-field__placeholder"
        />
      </view>

      <view class="form-field">
        <text class="iconfont icon-lock-fill form-field__icon"></text>
        <input
          v-model="formData.password"
          class="form-field__input"
          password
          placeholder="请输入密码"
          placeholder-class="form-field__placeholder"
        />
      </view>

      <wd-button
        type="primary"
        block
        custom-class="login-primary-btn"
        :loading="loading"
        @click="handleLogin"
      >
        <view class="login-primary-btn__content">
          <text class="iconfont icon-confirm"></text>
          <text>登录管理后台</text>
        </view>
      </wd-button>
    </view>
  </AuthLoginLayout>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { authApi } from '@/api/auth'
import { setToken } from '@/utils/auth'
import AuthLoginLayout from '@/components/AuthLoginLayout/index.vue'

const loading = ref(false)
const isAgreed = ref(false)
const formData = reactive({
  username: '',
  password: '',
})

const entryLinks = [
  { label: '家长登录', path: '/pages/login/index', icon: 'icon-customer-fill' },
  { label: '机构登录', path: '/pages/institution/login/index', icon: 'icon-store-fill' },
  { label: '教师登录', path: '/pages/teacher/login/index', icon: 'icon-teaching' },
]

const handleLogin = async () => {
  if (!isAgreed.value) {
    uni.showToast({ title: '请先勾选同意用户协议和隐私政策', icon: 'none' })
    return
  }
  if (!formData.username || !formData.password) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const res = await authApi.adminLogin(formData)
    setToken(res.token)
    uni.setStorageSync('userType', 'admin')

    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/admin/center/index' })
    }, 500)
  } catch (error: any) {
    uni.showToast({ title: error?.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.form-stack {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.form-field {
  height: 96rpx;
  padding: 0 24rpx;
  border-radius: 24rpx;
  background: #f7faf6;
  border: 1rpx solid #e6f1e3;
  display: flex;
  align-items: center;
  gap: 16rpx;

  &:focus-within {
    background: #ffffff;
    border-color: rgba(82, 196, 26, 0.4);
    box-shadow: 0 0 0 6rpx rgba(82, 196, 26, 0.08);
  }
}

.form-field__icon {
  font-size: 30rpx;
  color: #8ea08b;
}

.form-field__input {
  flex: 1;
  height: 100%;
  font-size: 30rpx;
  color: $uni-text-color;
}

.form-field__placeholder {
  color: #a8b7a4;
}

:deep(.login-primary-btn) {
  margin-top: 12rpx;
  height: 96rpx !important;
  border: none !important;
  border-radius: 24rpx !important;
  background: linear-gradient(135deg, $uni-color-primary 0%, $uni-color-primary-dark 100%) !important;
  box-shadow: 0 16rpx 36rpx rgba(82, 196, 26, 0.22) !important;
}

.login-primary-btn__content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 600;

  .iconfont {
    font-size: 28rpx;
  }
}
</style>
