<!-- 
  AsyncImage 组件使用示例
  展示如何在机构详情页中使用 AsyncImage 替换普通 image 标签
-->

<template>
  <view class="example-page">
    <!-- 示例 1: 单张图片展示（机构 LOGO） -->
    <view class="section">
      <text class="title">机构 LOGO</text>
      <async-image
        :url="logoUrl"
        mode="aspectFit"
        custom-class="logo-image"
        custom-style="width: 200rpx; height: 200rpx; border-radius: 16rpx;"
      />
    </view>

    <!-- 示例 2: 证件图片（可点击预览） -->
    <view class="section">
      <text class="title">营业执照</text>
      <async-image
        :url="licenseUrl"
        mode="aspectFit"
        custom-class="cert-image"
        custom-style="width: 100%; height: 400rpx; border-radius: 16rpx;"
        @click="handlePreviewLicense"
      />
    </view>

    <!-- 示例 3: 图片网格（教学环境） -->
    <view class="section">
      <text class="title">教学环境</text>
      <view class="image-grid">
        <async-image
          v-for="(img, index) in teachingImages"
          :key="index"
          :url="img"
          mode="aspectFill"
          custom-class="grid-image"
          @click="handlePreviewGrid(index)"
        />
      </view>
    </view>

    <!-- 示例 4: 身份证正反面 -->
    <view class="section">
      <text class="title">身份证照片</text>
      <view class="id-card-container">
        <async-image
          :url="idCardFront"
          mode="aspectFit"
          custom-class="id-card-image"
          @click="handlePreviewIdCard(0)"
        />
        <async-image
          :url="idCardBack"
          mode="aspectFit"
          custom-class="id-card-image"
          @click="handlePreviewIdCard(1)"
        />
      </view>
    </view>

    <!-- 示例 5: 监听加载状态 -->
    <view class="section">
      <text class="title">带加载状态监听</text>
      <async-image
        :url="statusImageUrl"
        mode="aspectFill"
        custom-style="width: 100%; height: 300rpx;"
        @load="handleImageLoad"
        @error="handleImageError"
      />
      <text class="status-text">{{ imageStatus }}</text>
    </view>

    <!-- 示例 6: 手动控制加载 -->
    <view class="section">
      <text class="title">手动加载图片</text>
      <async-image
        ref="manualImageRef"
        :url="manualImageUrl"
        :auto-load="false"
        custom-style="width: 100%; height: 300rpx;"
      />
      <wd-button @click="handleManualLoad">点击加载图片</wd-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AsyncImage from '@/components/AsyncImage/index.vue'
import { ossApi } from '@/api/oss'

// 示例数据
const logoUrl = ref('uploads/logos/institution-logo.jpg')
const licenseUrl = ref('uploads/licenses/business-license.jpg')
const teachingImages = ref([
  'uploads/teaching/classroom1.jpg',
  'uploads/teaching/classroom2.jpg',
  'uploads/teaching/classroom3.jpg',
  'uploads/teaching/equipment.jpg',
])
const idCardFront = ref('uploads/idcards/front.jpg')
const idCardBack = ref('uploads/idcards/back.jpg')
const statusImageUrl = ref('uploads/status-demo.jpg')
const manualImageUrl = ref('uploads/manual-demo.jpg')

const imageStatus = ref('等待加载...')
const manualImageRef = ref()

/**
 * 预览单张证件图片
 */
const handlePreviewLicense = async () => {
  try {
    const res = await ossApi.getPreviewUrl(licenseUrl.value)
    uni.previewImage({
      urls: [res.url],
      current: res.url
    })
  } catch (error) {
    console.error('预览失败:', error)
  }
}

/**
 * 预览图片网格
 */
const handlePreviewGrid = async (index: number) => {
  try {
    // 批量获取所有图片的预览URL
    const urlPromises = teachingImages.value.map(path => 
      ossApi.getPreviewUrl(path)
    )
    const results = await Promise.all(urlPromises)
    const urls = results.map(res => res.url)
    
    uni.previewImage({
      urls,
      current: index
    })
  } catch (error) {
    console.error('预览失败:', error)
  }
}

/**
 * 预览身份证
 */
const handlePreviewIdCard = async (index: number) => {
  try {
    const [frontRes, backRes] = await Promise.all([
      ossApi.getPreviewUrl(idCardFront.value),
      ossApi.getPreviewUrl(idCardBack.value)
    ])
    
    uni.previewImage({
      urls: [frontRes.url, backRes.url],
      current: index
    })
  } catch (error) {
    console.error('预览失败:', error)
  }
}

/**
 * 图片加载成功
 */
const handleImageLoad = (e: any) => {
  console.log('图片加载成功', e)
  imageStatus.value = '✅ 加载成功'
}

/**
 * 图片加载失败
 */
const handleImageError = (e: any) => {
  console.error('图片加载失败', e)
  imageStatus.value = '❌ 加载失败'
  uni.showToast({
    title: '图片加载失败',
    icon: 'none'
  })
}

/**
 * 手动加载图片
 */
const handleManualLoad = () => {
  manualImageRef.value?.reload()
}
</script>

<style lang="scss" scoped>
.example-page {
  padding: 32rpx;
}

.section {
  margin-bottom: 48rpx;
}

.title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-bottom: 24rpx;
}

.logo-image {
  display: block;
  background-color: $uni-bg-color-grey;
}

.cert-image {
  display: block;
  background-color: $uni-bg-color-grey;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.grid-image {
  width: 100%;
  height: 300rpx;
  border-radius: 12rpx;
  background-color: $uni-bg-color-grey;
}

.id-card-container {
  display: flex;
  gap: 16rpx;
}

.id-card-image {
  flex: 1;
  height: 200rpx;
  border-radius: 12rpx;
  background-color: $uni-bg-color-grey;
}

.status-text {
  display: block;
  margin-top: 16rpx;
  font-size: 28rpx;
  color: $uni-text-color-secondary;
}
</style>
