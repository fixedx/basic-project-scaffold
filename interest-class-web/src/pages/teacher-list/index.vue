<template>
  <view class="page">
    <view v-if="loading && teacherList.length === 0" class="loading">
      <Loading text="加载中..." />
    </view>

    <view v-else class="container">
      <!-- 教师列表 -->
      <view v-if="teacherList.length > 0" class="teacher-list">
        <view
          v-for="teacher in teacherList"
          :key="teacher.id"
          class="teacher-card"
          @click="goToDetail(teacher.id)"
        >
          <view class="card-main">
            <view class="teacher-avatar">
              <AsyncImage
                v-if="teacher.photo"
                :url="teacher.photo"
                width="120rpx"
                height="120rpx"
                mode="aspectFill"
                custom-class="avatar-img"
              />
              <view v-else class="default-avatar">
                {{ teacher.name?.charAt(0) || '师' }}
              </view>
            </view>
            <view class="teacher-info">
              <view class="info-top">
                <text class="teacher-name">{{ teacher.name }}</text>
                <text class="teacher-title" v-if="teacher.title">{{ teacher.title }}</text>
              </view>
              <view class="info-meta">
                <text class="meta-tag" v-if="teacher.years_of_experience">
                  {{ teacher.years_of_experience }}年教龄
                </text>
                <text class="meta-tag" v-if="teacher.gender">
                  {{ teacher.gender === 'male' ? '男' : '女' }}
                </text>
              </view>
              <view v-if="teacher.subjects && teacher.subjects.length > 0" class="subject-row">
                <text
                  v-for="(subject, index) in teacher.subjects"
                  :key="index"
                  class="subject-tag"
                >
                  {{ subject }}
                </text>
              </view>
              <view v-if="teacher.bio" class="teacher-bio">
                <text>{{ teacher.bio }}</text>
              </view>
            </view>
          </view>
          <view class="card-arrow">
            <text class="iconfont icon-right"></text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-state">
        <text class="empty-icon">👨‍🏫</text>
        <text class="empty-text">暂无教师信息</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { teacherApi, type TeacherInfo } from '@/api/teacher'
import { showErrorToast } from '@/utils/toast'
import AsyncImage from '@/components/AsyncImage/index.vue'
import Loading from '@/components/Loading/index.vue'

const loading = ref(true)
const institutionId = ref('')
const teacherList = ref<TeacherInfo[]>([])

onLoad((options) => {
  institutionId.value = options?.institutionId || ''
  if (!institutionId.value) {
    showErrorToast('缺少机构ID')
    setTimeout(() => uni.navigateBack(), 1500)
  }
})

onMounted(() => {
  loadTeachers()
})

const loadTeachers = async () => {
  try {
    loading.value = true
    const res = await teacherApi.getList({
      institutionId: institutionId.value,
      status: 'active', // 只展示在职教师
    })
    teacherList.value = res
  } catch (error) {
    console.error('加载教师列表失败:', error)
    showErrorToast('加载失败')
  } finally {
    loading.value = false
  }
}

const goToDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/teacher-detail/index?id=${id}` })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.container {
  padding: 24rpx;
}

.teacher-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.teacher-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-main {
  flex: 1;
  display: flex;
  gap: 24rpx;
  min-width: 0;
}

.teacher-avatar {
  flex-shrink: 0;

  .default-avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    background: $uni-color-primary-lighter;
    color: $uni-color-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40rpx;
    font-weight: bold;
  }
}

:deep(.avatar-img) {
  border-radius: 50%;
}

.teacher-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.info-top {
  display: flex;
  align-items: baseline;
  gap: 12rpx;

  .teacher-name {
    font-size: 32rpx;
    font-weight: 600;
    color: $uni-text-color;
  }

  .teacher-title {
    font-size: 24rpx;
    color: $uni-text-color-secondary;
  }
}

.info-meta {
  display: flex;
  gap: 12rpx;

  .meta-tag {
    font-size: 22rpx;
    color: $uni-text-color-tertiary;
    background: $uni-bg-color-grey;
    padding: 4rpx 12rpx;
    border-radius: 6rpx;
  }
}

.subject-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;

  .subject-tag {
    font-size: 22rpx;
    color: $uni-color-primary;
    background: $uni-color-primary-lighter;
    padding: 4rpx 14rpx;
    border-radius: 6rpx;
  }
}

.teacher-bio {
  text {
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.5;
  }
}

.card-arrow {
  flex-shrink: 0;
  margin-left: 12rpx;

  .iconfont {
    font-size: 28rpx;
    color: $uni-text-color-disable;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16rpx;

  .empty-icon {
    font-size: 80rpx;
  }

  .empty-text {
    font-size: 28rpx;
    color: $uni-text-color-tertiary;
  }
}
</style>
