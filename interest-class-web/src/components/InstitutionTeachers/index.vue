<template>
  <view class="section-block" v-if="teachers.length > 0">
    <view class="block-header">
      <text class="block-title">金牌教师</text>
      <view v-if="showMore" class="block-more" @click="emit('more')">
        全部 <text class="iconfont icon-right" style="font-size: 14px;"></text>
      </view>
    </view>
    <view class="teacher-grid">
      <view
        v-for="t in displayTeachers"
        :key="t.id"
        class="teacher-card"
        @click="emit('click', t.id)"
      >
        <view class="teacher-avatar avatar">
          <AsyncImage
            :url="t.avatar_url || '/static/default-avatar.png'"
            width="100%"
            height="100%"
            mode="aspectFill"
          />
        </view>
        <view class="teacher-name">{{ t.name }}</view>
        <view class="teacher-title">{{ t.title || '' }}</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AsyncImage from '@/components/AsyncImage/index.vue'

interface TeacherItem {
  id: string
  name: string
  avatar_url?: string
  title?: string
}

interface Props {
  /** 教师数组 */
  teachers: TeacherItem[]
  /** 最大展示数量（默认4） */
  limit?: number
  /** 是否显示"全部"按钮 */
  showMore?: boolean
}

interface Emits {
  (e: 'click', id: string): void
  (e: 'more'): void
}

const props = withDefaults(defineProps<Props>(), {
  limit: 4,
  showMore: false,
})

const emit = defineEmits<Emits>()

const displayTeachers = computed(() => {
  if (props.limit > 0) return props.teachers.slice(0, props.limit)
  return props.teachers
})
</script>

<style lang="scss" scoped>
.section-block {
  background: #fff;
  margin: 24rpx;
  padding: 32rpx;
  border-radius: 24rpx;
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.block-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.block-more {
  font-size: 24rpx;
  color: #999;
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.teacher-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}

.teacher-card {
  width: calc(25% - 18rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.teacher-avatar {
  width: 120rpx;
  height: 120rpx;
  margin-right: 0;
  margin-bottom: 16rpx;
  flex-shrink: 0;
}

.teacher-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 4rpx;
  overflow: hidden;
  width: 100%;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  white-space: normal;
  word-break: break-word;
}

.teacher-title {
  font-size: 22rpx;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  width: 100%;
  text-overflow: ellipsis;
}
</style>
