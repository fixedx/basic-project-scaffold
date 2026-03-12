<template>
  <view class="profile-page">
    <!-- 头像区域 -->
    <view class="avatar-section">
      <FileUpload
        v-model="form.avatar"
        mode="avatar"
        path-prefix="avatars"
        :is-public="true"
        avatar-size="160rpx"
      />
      <text class="avatar-tip">点击更换头像</text>
    </view>

    <!-- 基本信息 -->
    <view class="section">
      <view class="section-title">基本信息</view>

      <view class="form-group">
        <view class="form-label">昵称</view>
        <wd-input
          v-model="form.nickname"
          placeholder="请输入昵称"
          clearable
          no-border
        />
      </view>

      <view class="form-group">
        <view class="form-label">性别</view>
        <view class="tag-group">
          <view
            class="tag-item"
            :class="{ 'tag-active': form.gender === '0' }"
            @click="form.gender = '0'"
          >
            未设置
          </view>
          <view
            class="tag-item"
            :class="{ 'tag-active': form.gender === '1' }"
            @click="form.gender = '1'"
          >
            男
          </view>
          <view
            class="tag-item"
            :class="{ 'tag-active': form.gender === '2' }"
            @click="form.gender = '2'"
          >
            女
          </view>
        </view>
      </view>

    </view>

    <!-- 底部保存按钮 -->
    <PageFooter>
      <wd-button type="primary" block :loading="saving" @click="handleSave">
        保存
      </wd-button>
    </PageFooter>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { authApi } from '@/api/auth'
import { useUserStore } from '@/stores/user'
import FileUpload from '@/components/FileUpload/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

const userStore = useUserStore()
const saving = ref(false)

const form = reactive({
  nickname: '',
  avatar: '',
  gender: '0',
})

/**
 * 加载用户信息
 */
const loadUserInfo = async () => {
  try {
    const info = await authApi.getUserInfo()
    form.nickname = info.nickname || ''
    form.avatar = info.avatar || ''
    form.gender = info.gender || '0'
  } catch (e) {
    console.error('加载用户信息失败:', e)
  }
}

/**
 * 保存用户资料
 */
const handleSave = async () => {
  if (!form.nickname.trim()) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }

  saving.value = true
  try {
    await authApi.updateProfile({
      nickname: form.nickname.trim(),
      avatar: form.avatar || undefined,
      gender: form.gender,
    })

    // 更新 store 中的用户信息
    await userStore.getUserInfo()

    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
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
  background-color: $uni-bg-color-grey;
  padding-bottom: 160rpx;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0 32rpx;
  background-color: $uni-bg-color;
}

.avatar-tip {
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
  margin-top: 16rpx;
}

.section {
  margin-top: 24rpx;
  background-color: $uni-bg-color;
  padding: 32rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-bottom: 24rpx;
}

.form-group {
  margin-bottom: 32rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  font-size: 28rpx;
  color: $uni-text-color;
  margin-bottom: 16rpx;
}

.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-item {
  padding: 12rpx 32rpx;
  font-size: 28rpx;
  border-radius: 8rpx;
  background-color: $uni-bg-color-grey;
  color: $uni-text-color-secondary;
  transition: all 0.3s;

  &.tag-active {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
    border: 1rpx solid $uni-color-primary;
  }
}
</style>
