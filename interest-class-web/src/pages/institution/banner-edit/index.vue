<template>
  <view class="page">
    <view class="form-container">
      <!-- Banner 标题 -->
      <view class="form-group">
        <view class="form-label required">Banner 标题</view>
        <wd-input
          v-model="form.title"
          placeholder="请输入 Banner 标题"
          clearable
        />
      </view>

      <!-- Banner 图片 -->
      <view class="form-group">
        <view class="form-label required">Banner 图片</view>
        <FileUpload
          v-model="form.image"
          :max-count="1"
          :max-size="5"
          accept="image"
        />
        <view class="form-tip">建议尺寸：750x300px，支持 JPG、PNG 格式，不超过 5MB</view>
      </view>

      <!-- 链接类型 -->
      <view class="form-group">
        <view class="form-label required">链接类型</view>
        <view class="tag-group">
          <view
            v-for="type in linkTypes"
            :key="type.value"
            class="tag-item"
            :class="{ 'tag-active': form.link_type === type.value }"
            @click="handleLinkTypeChange(type.value)"
          >
            {{ type.label }}
          </view>
        </view>
      </view>

      <!-- 链接目标（课程） -->
      <view class="form-group" v-if="form.link_type === 'course'">
        <view class="form-label">选择课程</view>
        <wd-picker
          v-model="form.link_target"
          :columns="courseOptions"
          placeholder="请选择课程"
          @confirm="handleCourseConfirm"
        />
      </view>

      <!-- 链接目标（URL） -->
      <view class="form-group" v-if="form.link_type === 'url'">
        <view class="form-label">链接地址</view>
        <wd-input
          v-model="form.link_target"
          placeholder="请输入链接地址，如：https://example.com"
          clearable
        />
      </view>

      <!-- 排序 -->
      <view class="form-group">
        <view class="form-label">排序</view>
        <wd-input
          v-model.number="form.sort"
          type="number"
          placeholder="数字越小越靠前"
        />
        <view class="form-tip">默认为 0，数字越小排序越靠前</view>
      </view>

      <!-- 状态 -->
      <view class="form-group">
        <view class="form-label">状态</view>
        <view class="tag-group">
          <view
            class="tag-item"
            :class="{ 'tag-active': form.status === 'active' }"
            @click="form.status = 'active'"
          >
            启用
          </view>
          <view
            class="tag-item"
            :class="{ 'tag-active': form.status === 'inactive' }"
            @click="form.status = 'inactive'"
          >
            停用
          </view>
        </view>
      </view>

      <!-- 有效期（可选） -->
      <view class="form-group">
        <view class="form-label">有效期（可选）</view>
        <view class="date-range">
          <wd-datetime-picker
            v-model="form.start_time"
            type="datetime"
            placeholder="开始时间"
          />
          <text class="date-separator">至</text>
          <wd-datetime-picker
            v-model="form.end_time"
            type="datetime"
            placeholder="结束时间"
          />
        </view>
        <view class="form-tip">不设置则永久有效</view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <PageFooter>
      <wd-button block @click="handleCancel">取消</wd-button>
      <wd-button type="primary" block @click="handleSubmit">
        {{ isEdit ? '保存' : '创建' }}
      </wd-button>
    </PageFooter>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { bannerApi, courseApi } from '@/api'
import { showSuccessToast, showErrorToast } from '@/utils/toast'

const bannerId = ref('')
const isEdit = ref(false)

// 表单数据
const form = reactive({
  title: '',
  image: '',
  link_type: 'none',
  link_target: '',
  sort: 0,
  status: 'active',
  start_time: '',
  end_time: '',
})

// 链接类型选项
const linkTypes = [
  { label: '无链接', value: 'none' },
  { label: '课程链接', value: 'course' },
  { label: '外部链接', value: 'url' },
]

// 课程选项
const courseOptions = ref<Array<{ label: string; value: string }>>([])

// 处理链接类型变化
const handleLinkTypeChange = (type: string) => {
  form.link_type = type
  form.link_target = ''
}

// 处理课程选择
const handleCourseConfirm = (value: any) => {
  form.link_target = value.value
}

// 加载课程列表
const loadCourses = async () => {
  try {
    const data = await courseApi.getList({ page: 1, pageSize: 100 })
    courseOptions.value = data.data.map((course: any) => ({
      label: course.title,
      value: course.id,
    }))
  } catch (error) {
    console.error('加载课程列表失败:', error)
  }
}

// 加载 Banner 详情
const loadBannerDetail = async () => {
  if (!bannerId.value) return

  try {
    const data = await bannerApi.getDetail(bannerId.value)
    form.title = data.title
    form.image = data.image
    form.link_type = data.link_type
    form.link_target = data.link_target || ''
    form.sort = data.sort
    form.status = data.status
    form.start_time = data.start_time || ''
    form.end_time = data.end_time || ''
  } catch (error) {
    showErrorToast('加载失败')
  }
}

// 表单验证
const validateForm = () => {
  if (!form.title) {
    showErrorToast('请输入 Banner 标题')
    return false
  }
  if (!form.image) {
    showErrorToast('请上传 Banner 图片')
    return false
  }
  if (form.link_type === 'course' && !form.link_target) {
    showErrorToast('请选择课程')
    return false
  }
  if (form.link_type === 'url' && !form.link_target) {
    showErrorToast('请输入链接地址')
    return false
  }
  return true
}

// 提交表单
const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    const params = {
      title: form.title,
      image: form.image,
      link_type: form.link_type,
      link_target: form.link_target || undefined,
      sort: form.sort,
      status: form.status,
      start_time: form.start_time || undefined,
      end_time: form.end_time || undefined,
    }

    if (isEdit.value) {
      await bannerApi.update(bannerId.value, params)
      showSuccessToast('保存成功')
    } else {
      await bannerApi.create(params)
      showSuccessToast('创建成功')
    }

    setTimeout(() => {
      uni.navigateBack()
    }, 500)
  } catch (error) {
    showErrorToast(isEdit.value ? '保存失败' : '创建失败')
  }
}

// 取消
const handleCancel = () => {
  uni.navigateBack()
}

onLoad((options) => {
  if (options.id) {
    bannerId.value = options.id
    isEdit.value = true
  }
})

onMounted(() => {
  loadCourses()
  if (isEdit.value) {
    loadBannerDetail()
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.form-container {
  padding: 24rpx 32rpx 160rpx;
}

.form-group {
  margin-bottom: 32rpx;
}

.form-label {
  font-size: 28rpx;
  color: $uni-text-color;
  margin-bottom: 16rpx;

  &.required::before {
    content: '*';
    color: $uni-color-error;
    margin-right: 8rpx;
  }
}

.form-tip {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
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

.date-range {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.date-separator {
  font-size: 28rpx;
  color: $uni-text-color-secondary;
}
</style>
