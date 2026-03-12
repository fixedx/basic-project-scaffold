<template>
  <view class="demo-page">
    <view class="demo-title">FileUpload 组件示例</view>

    <!-- 示例1: 单图上传 -->
    <view class="demo-section">
      <view class="section-title">示例1: 单图上传（Logo）</view>
      <FileUpload 
        v-model="form.logo" 
        :limit="1"
        path-prefix="demo/logos"
        @success="handleSuccess"
      />
      <view class="result-text">上传结果: {{ form.logo || '未上传' }}</view>
    </view>

    <!-- 示例2: 多图上传 -->
    <view class="demo-section">
      <view class="section-title">示例2: 多图上传（相册，最多9张）</view>
      <FileUpload 
        v-model="form.images" 
        :limit="9"
        :multiple="true"
        path-prefix="demo/gallery"
      />
      <view class="result-text">
        已上传 {{ form.images.length }} 张图片
        <text v-if="form.images.length > 0">:</text>
      </view>
      <view v-for="(url, index) in form.images" :key="index" class="url-item">
        {{ index + 1 }}. {{ url }}
      </view>
    </view>

    <!-- 示例3: 身份证上传 -->
    <view class="demo-section">
      <view class="section-title">示例3: 身份证上传</view>
      <view class="id-card-wrapper">
        <view class="id-card-item">
          <text class="label">正面</text>
          <FileUpload 
            v-model="form.idCardFront" 
            :limit="1"
            path-prefix="demo/id-cards"
          />
        </view>
        <view class="id-card-item">
          <text class="label">反面</text>
          <FileUpload 
            v-model="form.idCardBack" 
            :limit="1"
            path-prefix="demo/id-cards"
          />
        </view>
      </view>
    </view>

    <!-- 示例4: 自定义大小限制 -->
    <view class="demo-section">
      <view class="section-title">示例4: 大文件上传（最大10MB）</view>
      <FileUpload 
        v-model="form.largeFile" 
        :limit="1"
        :max-size="10 * 1024 * 1024"
        path-prefix="demo/large-files"
      />
    </view>

    <!-- 提交按钮 -->
    <PageFooter>
      <wd-button type="primary" @click="handleSubmit" block>
        查看表单数据
      </wd-button>
    </PageFooter>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileUpload from '@/components/FileUpload/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

const form = ref({
  logo: '',
  images: [] as string[],
  idCardFront: '',
  idCardBack: '',
  largeFile: ''
})

const handleSuccess = (urls: string[]) => {
  console.log('上传成功:', urls)
  uni.showToast({
    title: '上传成功',
    icon: 'success'
  })
}

const handleSubmit = () => {
  console.log('表单数据:', form.value)
  uni.showModal({
    title: '表单数据',
    content: JSON.stringify(form.value, null, 2),
    showCancel: false
  })
}
</script>

<style lang="scss" scoped>
.demo-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  padding: 32rpx;
  padding-bottom: 120rpx;
}

.demo-title {
  font-size: 40rpx;
  font-weight: bold;
  color: $uni-text-color;
  text-align: center;
  margin-bottom: 48rpx;
}

.demo-section {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-bottom: 24rpx;
}

.result-text {
  margin-top: 24rpx;
  font-size: 28rpx;
  color: $uni-text-color-secondary;
  word-break: break-all;
}

.url-item {
  font-size: 24rpx;
  color: $uni-text-color-tertiary;
  margin-top: 8rpx;
  word-break: break-all;
}

.id-card-wrapper {
  display: flex;
  gap: 32rpx;
}

.id-card-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.label {
  font-size: 28rpx;
  color: $uni-text-color-secondary;
}
</style>
