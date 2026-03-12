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
        <image
          :src="t.avatar_url || '/static/default-avatar.png'"
          mode="aspectFill"
          class="teacher-avatar"
        />
        <view class="teacher-name">{{ t.name }}</view>
        <view class="teacher-title">{{ t.title || '' }}</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  margin-bottom: 8rpx;
}

.teacher-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 4rpx;
  white-space: nowrap;
  overflow: hidden;
  width: 100%;
  text-overflow: ellipsis;
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
