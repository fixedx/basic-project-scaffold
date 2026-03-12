<template>
  <view class="page">
    <view class="form-container">
      <!-- 基本信息 -->
      <view class="section">
        <view class="section-title">基本信息</view>

        <view class="form-group">
          <view class="form-label required">公告标题</view>
          <wd-input v-model="form.title" placeholder="请输入公告标题" maxlength="50" show-word-limit clearable />
        </view>

        <view class="form-group">
          <view class="form-label required">公告类型</view>
          <view class="tag-group">
            <view class="tag-item" :class="{ 'tag-active': form.type === 'notice' }" @click="form.type = 'notice'">
              <text class="iconfont icon-notice" style="margin-right: 6rpx; font-size: 24rpx;"></text>
              通知
            </view>
            <view class="tag-item" :class="{ 'tag-active': form.type === 'update' }" @click="form.type = 'update'">
              <text class="iconfont icon-info" style="margin-right: 6rpx; font-size: 24rpx;"></text>
              更新
            </view>
            <view class="tag-item" :class="{ 'tag-active': form.type === 'activity' }" @click="form.type = 'activity'">
              <text class="iconfont icon-honor" style="margin-right: 6rpx; font-size: 24rpx;"></text>
              活动
            </view>
          </view>
        </view>
      </view>

      <!-- 公告内容 -->
      <view class="section">
        <view class="section-title">公告内容</view>

        <view class="form-group">
          <view class="form-label required">正文</view>
          <wd-textarea
            v-model="form.content"
            placeholder="请输入公告内容"
            :maxlength="1000"
            show-word-limit
            :auto-height="true"
            :rows="5"
          />
        </view>
      </view>

      <!-- 展示设置 -->
      <view class="section">
        <view class="section-title">展示设置</view>

        <view class="form-group">
          <view class="form-label">状态</view>
          <view class="tag-group">
            <view class="tag-item" :class="{ 'tag-active': form.status === 'active' }" @click="form.status = 'active'">
              <text class="iconfont icon-success" style="margin-right: 6rpx; font-size: 24rpx;"></text>
              启用
            </view>
            <view class="tag-item" :class="{ 'tag-active': form.status === 'inactive' }" @click="form.status = 'inactive'">
              <text class="iconfont icon-close" style="margin-right: 6rpx; font-size: 24rpx;"></text>
              停用
            </view>
          </view>
        </view>

        <view class="form-group">
          <view class="form-label">优先级</view>
          <view class="form-tip">数字越大越靠前，0 为默认</view>
          <wd-input v-model="priorityStr" type="number" placeholder="0" />
        </view>

        <view class="form-group">
          <view class="form-label">生效时间</view>
          <view class="form-tip">不设置则立即生效且长期有效</view>
          <view class="date-row">
            <wd-datetime-picker v-model="startTimeValue" type="date" @confirm="onStartConfirm">
              <view class="date-input">
                <text class="iconfont icon-calendar" style="font-size: 28rpx; color: #86909c; margin-right: 8rpx;"></text>
                <text :class="{ 'date-placeholder': !startTimeDisplay }">
                  {{ startTimeDisplay || '开始时间' }}
                </text>
              </view>
            </wd-datetime-picker>
            <text class="date-sep">至</text>
            <wd-datetime-picker v-model="endTimeValue" type="date" @confirm="onEndConfirm">
              <view class="date-input">
                <text class="iconfont icon-calendar" style="font-size: 28rpx; color: #86909c; margin-right: 8rpx;"></text>
                <text :class="{ 'date-placeholder': !endTimeDisplay }">
                  {{ endTimeDisplay || '结束时间' }}
                </text>
              </view>
            </wd-datetime-picker>
          </view>
          <view v-if="form.start_time || form.end_time" class="clear-date" @click="clearDate">
            <text class="iconfont icon-close" style="font-size: 22rpx;"></text>
            <text>清除时间</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <PageFooter custom-class="footer-buttons">
      <view class="footer-btn" v-if="isEdit">
        <wd-button type="info" plain block @click="handleDelete">删除</wd-button>
      </view>
      <view class="footer-btn right">
        <wd-button type="primary" block @click="handleSubmit">
          {{ isEdit ? '保存修改' : '发布公告' }}
        </wd-button>
      </view>
    </PageFooter>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { announcementApi } from '@/api/announcement'
import PageFooter from '@/components/PageFooter/index.vue'

const isEdit = ref(false)
const announcementId = ref('')
const priorityStr = ref('0')

const form = ref({
  title: '',
  content: '',
  type: 'notice',
  status: 'active',
  priority: 0,
  start_time: '',
  end_time: '',
})

const startTimeValue = ref(Date.now())
const endTimeValue = ref(Date.now())

const startTimeDisplay = computed(() => {
  if (!form.value.start_time) return ''
  return formatDateStr(form.value.start_time)
})

const endTimeDisplay = computed(() => {
  if (!form.value.end_time) return ''
  return formatDateStr(form.value.end_time)
})

const formatDateStr = (str: string) => {
  if (!str) return ''
  const d = new Date(str)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const onStartConfirm = ({ value }: any) => {
  if (value) form.value.start_time = new Date(value).toISOString()
}

const onEndConfirm = ({ value }: any) => {
  if (value) form.value.end_time = new Date(value).toISOString()
}

const clearDate = () => {
  form.value.start_time = ''
  form.value.end_time = ''
}

const loadAnnouncement = async (id: string) => {
  try {
    uni.showLoading({ title: '加载中...' })
    const data = await announcementApi.getDetail(id)
    form.value = {
      title: data.title || '',
      content: data.content || '',
      type: data.type || 'notice',
      status: data.status || 'active',
      priority: data.priority || 0,
      start_time: data.start_time || '',
      end_time: data.end_time || '',
    }
    priorityStr.value = String(form.value.priority)
  } catch (error) {
    console.error('加载公告详情失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const validate = () => {
  if (!form.value.title.trim()) {
    uni.showToast({ title: '请输入公告标题', icon: 'none' })
    return false
  }
  if (!form.value.content.trim()) {
    uni.showToast({ title: '请输入公告内容', icon: 'none' })
    return false
  }
  return true
}

const handleSubmit = async () => {
  if (!validate()) return

  try {
    const submitData: any = {
      title: form.value.title,
      content: form.value.content,
      type: form.value.type,
      status: form.value.status,
      priority: parseInt(priorityStr.value) || 0,
    }
    if (form.value.start_time) submitData.start_time = form.value.start_time
    if (form.value.end_time) submitData.end_time = form.value.end_time

    if (isEdit.value) {
      await announcementApi.update(announcementId.value, submitData)
      uni.showToast({ title: '修改成功', icon: 'success' })
    } else {
      await announcementApi.create(submitData)
      uni.showToast({ title: '发布成功', icon: 'success' })
    }
    setTimeout(() => uni.navigateBack(), 500)
  } catch (error) {
    console.error('提交失败:', error)
  }
}

const handleDelete = () => {
  uni.showModal({
    title: '确认删除',
    content: '删除后无法恢复，确定删除吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await announcementApi.delete(announcementId.value)
          uni.showToast({ title: '删除成功', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 500)
        } catch (error) {
          console.error('删除失败:', error)
        }
      }
    }
  })
}

onLoad((options) => {
  if (options?.id) {
    isEdit.value = true
    announcementId.value = options.id
    uni.setNavigationBarTitle({ title: '编辑公告' })
    loadAnnouncement(options.id)
  } else {
    uni.setNavigationBarTitle({ title: '发布公告' })
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}

.form-container {
  padding: 24rpx;
}

// Section card: white card with green left-bar title
.section {
  margin-bottom: 24rpx;
  padding: 32rpx;
  background-color: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  &:last-child {
    margin-bottom: 0;
  }

  &-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #1d2129;
    margin-bottom: 32rpx;
    display: flex;
    align-items: center;
    line-height: 1.4;

    &::before {
      content: '';
      width: 8rpx;
      height: 32rpx;
      background: $uni-color-primary;
      border-radius: 4rpx;
      margin-right: 16rpx;
    }
  }
}

.form-group {
  margin-bottom: 32rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #4e5969;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;

  &.required::after {
    content: '*';
    color: #f53f3f;
    margin-left: 8rpx;
    font-size: 32rpx;
    line-height: 1;
    transform: translateY(4rpx);
  }
}

.form-tip {
  font-size: 24rpx;
  color: #86909c;
  margin-top: 8rpx;
  margin-bottom: 12rpx;
  line-height: 1.5;
}

// Input: underline style
:deep(.wd-input) {
  padding: 0 !important;
  background: transparent !important;

  &::after {
    display: none !important;
  }

  .wd-input__inner {
    padding: 16rpx 0 !important;
    font-size: 28rpx !important;
    color: #1d2129 !important;
    background: transparent !important;
    border-bottom: 1rpx solid #e5e6eb !important;
    border-radius: 0 !important;
    transition: all 0.3s;

    &::placeholder {
      color: #c9cdd4;
    }

    &:focus {
      border-bottom-color: $uni-color-primary !important;
    }
  }
}

// Textarea: underline style
:deep(.wd-textarea) {
  padding: 0 !important;
  background: transparent !important;
  border: none !important;

  &::after {
    display: none !important;
  }

  .wd-textarea__inner {
    padding: 16rpx 0 !important;
    font-size: 28rpx !important;
    color: #1d2129 !important;
    background: transparent !important;
    border-bottom: 1rpx solid #e5e6eb !important;
    border-radius: 0 !important;
    transition: all 0.3s;

    &::placeholder {
      color: #c9cdd4;
    }

    &:focus {
      border-bottom-color: $uni-color-primary !important;
    }
  }
}

// Tag group: pill capsule style
.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.tag-item {
  padding: 12rpx 32rpx;
  font-size: 26rpx;
  border-radius: 100rpx;
  background-color: #f2f3f5;
  color: #4e5969;
  border: 2rpx solid transparent;
  transition: all 0.3s;
  display: flex;
  align-items: center;

  &.tag-active {
    background-color: rgba($uni-color-primary, 0.1);
    color: $uni-color-primary;
    border-color: $uni-color-primary;
    font-weight: 500;
  }
}

// Date row
.date-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.date-input {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #e5e6eb;
  font-size: 28rpx;
  color: #1d2129;
  transition: all 0.3s;

  &:active {
    border-bottom-color: $uni-color-primary;
  }
}

.date-placeholder {
  color: #c9cdd4;
}

.date-sep {
  font-size: 28rpx;
  color: #86909c;
  flex-shrink: 0;
}

.clear-date {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: $uni-color-error;
}

// Footer: frosted glass effect
:deep(.page-footer) {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20rpx);
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05) !important;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)) !important;
  display: flex;
  gap: 24rpx;

  .footer-btn {
    flex: 1;

    &.right {
      flex: 2;
    }
  }
}
</style>
