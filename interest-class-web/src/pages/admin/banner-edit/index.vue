<template>
  <view class="page">
    <view class="form-container">
      <!-- 基本信息 -->
      <view class="section">
        <view class="section-title">基本信息</view>

        <view class="form-group">
          <view class="form-label required">Banner 标题</view>
          <wd-input v-model="form.title" placeholder="请输入 Banner 标题" maxlength="30" show-word-limit />
        </view>

        <view class="form-group">
          <view class="form-label required">Banner 图片</view>
          <view class="form-tip">建议尺寸 750×300，支持 JPG/PNG 格式</view>
          <FileUpload
            v-model="form.image"
            path-prefix="banners"
            :is-public="true"
            :limit="1"
          />
        </view>

        <!-- 图片预览 -->
        <view class="form-group" v-if="form.image">
          <view class="form-label">预览效果</view>
          <view class="preview-card">
            <AsyncImage
              :url="form.image"
              width="100%"
              height="300rpx"
              mode="aspectFill"
              custom-class="preview-img"
            />
          </view>
        </view>
      </view>

      <!-- 链接配置 -->
      <view class="section">
        <view class="section-title">链接配置</view>

        <view class="form-group">
          <view class="form-label required">链接类型</view>
          <view class="tag-group">
            <view class="tag-item" :class="{ 'tag-active': form.link_type === 'none' }" @click="form.link_type = 'none'">
              无链接
            </view>
            <view class="tag-item" :class="{ 'tag-active': form.link_type === 'course' }" @click="form.link_type = 'course'">
              课程链接
            </view>
            <view class="tag-item" :class="{ 'tag-active': form.link_type === 'url' }" @click="form.link_type = 'url'">
              外部链接
            </view>
          </view>
          <view class="form-tip">无链接：仅展示图片；课程链接：点击跳转课程详情；外部链接：跳转指定页面</view>
        </view>

        <view class="form-group" v-if="form.link_type !== 'none'">
          <view class="form-label required">
            {{ form.link_type === 'course' ? '课程 ID' : '链接地址' }}
          </view>
          <wd-input
            v-model="form.link_target"
            :placeholder="form.link_type === 'course' ? '请输入课程ID' : '请输入完整URL（如 https://...）'"
            clearable
          />
          <view class="form-tip" v-if="form.link_type === 'course'">可在课程管理中查看课程ID</view>
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
          {{ isEdit ? '保存修改' : '立即创建' }}
        </wd-button>
      </view>
    </PageFooter>

  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { bannerApi } from '@/api/banner'
import AsyncImage from '@/components/AsyncImage/index.vue'
import FileUpload from '@/components/FileUpload/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

const isEdit = ref(false)
const bannerId = ref('')

const form = ref({
  title: '',
  image: '',
  link_type: 'none',
  link_target: '',
  status: 'active',
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
  if (value) {
    form.value.start_time = new Date(value).toISOString()
  }
}

const onEndConfirm = ({ value }: any) => {
  if (value) {
    form.value.end_time = new Date(value).toISOString()
  }
}

const clearDate = () => {
  form.value.start_time = ''
  form.value.end_time = ''
}

const loadBanner = async (id: string) => {
  try {
    uni.showLoading({ title: '加载中...' })
    const data = await bannerApi.getDetail(id)
    form.value = {
      title: data.title || '',
      image: data.image || '',
      link_type: data.link_type || 'none',
      link_target: data.link_target || '',
      status: data.status || 'active',
      start_time: data.start_time || '',
      end_time: data.end_time || '',
    }
  } catch (error) {
    console.error('加载 Banner 详情失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const validate = () => {
  if (!form.value.title.trim()) {
    uni.showToast({ title: '请输入标题', icon: 'none' })
    return false
  }
  if (!form.value.image) {
    uni.showToast({ title: '请上传 Banner 图片', icon: 'none' })
    return false
  }
  if (form.value.link_type !== 'none' && !form.value.link_target?.trim()) {
    uni.showToast({ title: '请输入链接目标', icon: 'none' })
    return false
  }
  return true
}

const handleSubmit = async () => {
  if (!validate()) return

  try {
    const submitData: any = {
      title: form.value.title,
      image: form.value.image,
      link_type: form.value.link_type,
      status: form.value.status,
    }
    if (form.value.link_type !== 'none') {
      submitData.link_target = form.value.link_target
    }
    if (form.value.start_time) {
      submitData.start_time = form.value.start_time
    }
    if (form.value.end_time) {
      submitData.end_time = form.value.end_time
    }

    if (isEdit.value) {
      await bannerApi.update(bannerId.value, submitData)
      uni.showToast({ title: '修改成功', icon: 'success' })
    } else {
      await bannerApi.create(submitData)
      uni.showToast({ title: '创建成功', icon: 'success' })
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
          await bannerApi.delete(bannerId.value)
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
    bannerId.value = options.id
    uni.setNavigationBarTitle({ title: '编辑 Banner' })
    loadBanner(options.id)
  } else {
    uni.setNavigationBarTitle({ title: '新增 Banner' })
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

// Section card: white card with green left-bar title (same as course-edit)
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

// Input: underline style (same as course-edit)
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

// Tag group: pill capsule style (same as course-edit)
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

// Preview card
.preview-card {
  border-radius: 16rpx;
  overflow: hidden;
  border: 2rpx solid #e5e6eb;
}

// Footer: frosted glass effect (same as course-edit)
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
