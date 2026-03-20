<template>
  <view class="teacher-detail-page">
    <!-- 加载状态 -->
    <view class="loading" v-if="loading">
      <Loading size="48rpx" />
    </view>

    <!-- 教师详情 -->
    <view class="detail-container" v-else-if="teacher">
      <!-- 教师头像区域 -->
      <view class="teacher-header">
        <view class="avatar-wrapper">
          <AsyncImage
            :url="teacher.photo || '/static/default-avatar.png'"
            width="200rpx"
            height="200rpx"
            mode="aspectFill"
            custom-class="teacher-avatar-img"
          />
        </view>
        <view class="teacher-basic">
          <view class="teacher-name">{{ teacher.name }}</view>
          <view class="teacher-title" v-if="teacher.title">{{ teacher.title }}</view>
          <view class="teacher-tags">
            <text class="tag" v-if="teacher.years_of_experience">
              {{ teacher.years_of_experience }}年教龄
            </text>
            <text class="tag" v-if="teacher.gender">
              {{ teacher.gender === 'male' ? '男' : '女' }}
            </text>
            <text 
              class="tag status-tag" 
              :class="{ 
                'status-active': teacher.status === 'active',
                'status-inactive': teacher.status === 'inactive',
                'status-leave': teacher.status === 'on_leave'
              }"
            >
              {{ statusText }}
            </text>
          </view>
        </view>
      </view>

      <!-- 擅长科目 -->
      <view class="section" v-if="teacher.subjects && teacher.subjects.length > 0">
        <view class="section-title">擅长科目</view>
        <view class="section-content">
          <view class="subject-list">
            <text 
              v-for="subject in teacher.subjects" 
              :key="subject"
              class="subject-tag"
            >
              {{ subject }}
            </text>
          </view>
        </view>
      </view>

      <!-- 个人简介 -->
      <view class="section" v-if="teacher.bio">
        <view class="section-title">个人简介</view>
        <view class="section-content">
          <text class="bio-text">{{ teacher.bio }}</text>
        </view>
      </view>

      <!-- 资质证书 -->
      <view class="section" v-if="teacher.certificates && teacher.certificates.length > 0">
        <view class="section-title">资质证书</view>
        <view class="section-content">
          <view class="certificate-grid">
            <view 
              v-for="(cert, index) in teacher.certificates" 
              :key="index"
              class="certificate-item"
            >
              <AsyncImage
                :url="cert"
                width="200rpx"
                height="280rpx"
                mode="aspectFill"
                :enable-preview="true"
                :preview-urls="teacher.certificates"
                :preview-current="index"
              />
            </view>
          </view>
        </view>
      </view>

      <!-- 所属机构 -->
      <view class="section" v-if="teacher.institution_id">
        <view class="section-title">所属机构</view>
        <view class="section-content">
          <InstitutionCard
            v-if="institutionData"
            :institution="institutionData"
            mode="full"
            :show-rating="true"
            :show-tags="true"
            :show-address="true"
            :show-promo="false"
            @click="goToInstitution"
          />
          <view class="inst-loading" v-else>
            <text class="inst-loading-text">加载机构信息中...</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 错误状态 -->
    <view class="error-state" v-else>
      <text class="iconfont icon-warning error-icon"></text>
      <text class="error-text">教师信息不存在</text>
      <wd-button type="primary" @click="handleBack">返回</wd-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { teacherApi, institutionApi, type TeacherInfo } from '@/api'
import { showErrorToast } from '@/utils/toast'
import AsyncImage from '@/components/AsyncImage/index.vue'
import Loading from '@/components/Loading/index.vue'

const teacherId = ref('')
const teacher = ref<TeacherInfo | null>(null)
const loading = ref(false)
const institutionData = ref<any>(null)

// 状态文本
const statusText = computed(() => {
  if (!teacher.value) return ''
  const statusMap: Record<string, string> = {
    active: '在职',
    inactive: '离职',
    on_leave: '休假中',
  }
  return statusMap[teacher.value.status] || '未知'
})

// 加载教师详情
const loadTeacherDetail = async () => {
  if (!teacherId.value) return
  
  loading.value = true
  try {
    const data = await teacherApi.getDetail(teacherId.value)
    teacher.value = data
    // 加载所属机构信息
    if (data.institution_id) {
      loadInstitution(data.institution_id)
    }
  } catch (error) {
    showErrorToast('加载失败')
  } finally {
    loading.value = false
  }
}

// 加载机构信息
const loadInstitution = async (institutionId: string) => {
  try {
    const data = await institutionApi.getById(institutionId)
    institutionData.value = data
  } catch (error) {
    console.error('加载机构信息失败', error)
  }
}

// 跳转到机构详情
const goToInstitution = (inst?: any) => {
  const institutionId = inst?.id || teacher.value?.institution_id
  if (institutionId) {
    uni.navigateTo({
      url: `/pages/institution-detail/index?id=${institutionId}`,
    })
  }
}

// 返回
const handleBack = () => {
  uni.navigateBack()
}

onLoad((options) => {
  if (options?.id) {
    teacherId.value = options.id
  }
})

onMounted(() => {
  loadTeacherDetail()
})
</script>

<style lang="scss" scoped>
.teacher-detail-page {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 40rpx;
  box-sizing: border-box;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
}

.detail-container {
  padding: 24rpx;
}

.teacher-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 32rpx;
  background-color: #ffffff;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.teacher-basic {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  z-index: 1;
}

.teacher-name {
  font-size: 40rpx; // Larger font
  font-weight: 700;
  color: #1a1a1a;
}

.teacher-title {
  font-size: 28rpx;
  color: #666;
  background-color: #f5f5f5;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.teacher-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  justify-content: center;
  margin-top: 8rpx;
}

.tag {
  padding: 6rpx 16rpx;
  font-size: 24rpx;
  color: #666;
  background-color: #f7f8fa;
  border-radius: 8rpx;
}

.status-tag {
  font-weight: 500;
  
  &.status-active {
    color: #52c41a;
    background-color: #f6ffed;
    border: 1rpx solid rgba(82, 196, 26, 0.2);
  }
  
  &.status-inactive {
    color: #999;
    background-color: #f5f5f5;
    border: 1rpx solid #d9d9d9;
  }
  
  &.status-leave {
    color: #faad14;
    background-color: #fffbe6;
    border: 1rpx solid rgba(250, 173, 20, 0.2);
  }
}

.section {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 24rpx;
  position: relative;
  padding-left: 20rpx;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 6rpx;
    height: 28rpx;
    background: linear-gradient(to bottom, #52c41a, #95de64); // Theme gradient
    border-radius: 4rpx;
  }
}

.subject-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.subject-tag {
  padding: 10rpx 24rpx;
  font-size: 26rpx;
  color: #52c41a;
  background-color: #f6ffed;
  border: 1rpx solid rgba(82, 196, 26, 0.15);
  border-radius: 100rpx; // Pill shape
}

.bio-text {
  font-size: 28rpx;
  color: #4a4a4a;
  line-height: 1.8;
  white-space: pre-wrap;
  text-align: justify;
}

.certificate-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.certificate-item {
  border-radius: 12rpx;
  overflow: hidden;
  border: 1rpx solid #eee;
}

.inst-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx 0;

  .inst-loading-text {
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
  }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 32rpx;
  gap: 40rpx;
  
  .error-icon {
    font-size: 120rpx;
    color: #d9d9d9;
  }
  
  .error-text {
    font-size: 30rpx;
    color: #999;
  }
}
</style>
