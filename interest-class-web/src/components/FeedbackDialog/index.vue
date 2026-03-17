<template>
  <view v-if="visible" class="feedback-mask" @click="handleClose">
    <view class="feedback-dialog" @click.stop>
      <text class="feedback-title">意见反馈</text>
      <text class="feedback-desc">您的建议是我们前进的动力</text>

      <!-- 反馈类型选择 -->
      <view class="type-group">
        <view
          v-for="item in typeOptions"
          :key="item.value"
          class="type-tag"
          :class="{ active: feedbackType === item.value }"
          @click="feedbackType = item.value"
        >
          <text>{{ item.label }}</text>
        </view>
      </view>

      <!-- 反馈内容 -->
      <textarea
        v-model="feedbackContent"
        class="feedback-textarea"
        placeholder="请描述您遇到的问题或建议..."
        :maxlength="500"
        :auto-height="false"
      />
      <view class="feedback-counter">
        <text>{{ feedbackContent.length }}/500</text>
      </view>

      <!-- 联系方式（可选） -->
      <input
        v-model="contactInfo"
        class="contact-input"
        placeholder="联系方式（选填，方便我们回复您）"
        :maxlength="50"
      />

      <!-- 操作按钮 -->
      <view class="feedback-actions">
        <view class="feedback-btn cancel cancel-btn-common" @click="handleClose">
          <text>取消</text>
        </view>
        <view class="feedback-btn confirm" :class="{ disabled: submitting }" @click="handleSubmit">
          <text>{{ submitting ? '提交中...' : '提交' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { feedbackApi } from '@/api/feedback'

interface Props {
  pageSource?: string
}

const props = withDefaults(defineProps<Props>(), {
  pageSource: '',
})

interface Emits {
  (e: 'success'): void
}

const emit = defineEmits<Emits>()

const visible = ref(false)
const feedbackContent = ref('')
const feedbackType = ref<'suggestion' | 'bug' | 'other'>('suggestion')
const contactInfo = ref('')
const submitting = ref(false)

const typeOptions = [
  { label: '💡 建议', value: 'suggestion' as const },
  { label: '🐛 Bug', value: 'bug' as const },
  { label: '📝 其他', value: 'other' as const },
]

/** 打开弹窗 */
const open = () => {
  feedbackContent.value = ''
  feedbackType.value = 'suggestion'
  contactInfo.value = ''
  submitting.value = false
  visible.value = true
}

/** 关闭弹窗 */
const handleClose = () => {
  visible.value = false
}

/** 提交反馈 */
const handleSubmit = async () => {
  const content = feedbackContent.value.trim()
  if (!content) {
    uni.showToast({ title: '请输入反馈内容', icon: 'none' })
    return
  }
  if (submitting.value) return
  submitting.value = true

  try {
    await feedbackApi.create({
      content,
      type: feedbackType.value,
      contact: contactInfo.value.trim() || undefined,
      page_source: props.pageSource || undefined,
    })
    visible.value = false
    uni.showToast({ title: '感谢您的反馈！', icon: 'success' })
    emit('success')
  } catch (error) {
    console.error('提交反馈失败:', error)
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

defineExpose({ open })
</script>

<style lang="scss" scoped>
.feedback-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: $uni-bg-color-mask;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feedback-dialog {
  width: 620rpx;
  background: $uni-bg-color;
  border-radius: 20rpx;
  padding: 40rpx 32rpx;
}

.feedback-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: $uni-text-color;
  text-align: center;
  margin-bottom: 8rpx;
}

.feedback-desc {
  display: block;
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
  text-align: center;
  margin-bottom: 28rpx;
}

.type-group {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.type-tag {
  flex: 1;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: $uni-bg-color-grey;
  font-size: 26rpx;
  color: $uni-text-color-secondary;
  transition: all 0.2s;

  &.active {
    background: $uni-color-primary-lighter;
    color: $uni-color-primary;
    font-weight: 500;
  }
}

.feedback-textarea {
  width: 100%;
  height: 200rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: $uni-text-color;
  background: $uni-bg-color-grey;
  border-radius: 12rpx;
  box-sizing: border-box;
}

.feedback-counter {
  text-align: right;
  font-size: 22rpx;
  color: $uni-text-color-tertiary;
  margin-top: 8rpx;
  margin-bottom: 16rpx;
}

.contact-input {
  width: 100%;
  height: 72rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: $uni-text-color;
  background: $uni-bg-color-grey;
  border-radius: 12rpx;
  box-sizing: border-box;
  margin-bottom: 24rpx;
}

.feedback-actions {
  display: flex;
  gap: 24rpx;
}

.feedback-btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  font-size: 30rpx;

  &.confirm {
    background: $uni-color-primary;
    color: #fff;

    &.disabled {
      opacity: 0.6;
    }
  }
}
</style>
