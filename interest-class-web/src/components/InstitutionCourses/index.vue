<template>
  <view class="section-block" v-if="courses.length > 0">
    <view class="block-header">
      <text class="block-title">{{ title }} ({{ courses.length }})</text>
      <view v-if="showMore" class="block-more" @click="emit('more')">
        全部 <text class="iconfont icon-right" style="font-size: 14px;"></text>
      </view>
    </view>
    <view class="course-list">
      <CourseCard
        v-for="course in displayCourses"
        :key="course.id"
        :course="course"
        role="parent"
        flat
        :show-promo="true"
        @click="(c: any) => emit('click', c)"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CourseCard from '@/components/CourseCard/index.vue'

interface Props {
  /** 课程数组 */
  courses: any[]
  /** 标题 */
  title?: string
  /** 最大展示数量，0 表示全部展示 */
  limit?: number
  /** 是否显示"全部"按钮 */
  showMore?: boolean
}

interface Emits {
  (e: 'click', course: any): void
  (e: 'more'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: '热门课程',
  limit: 0,
  showMore: false,
})

const emit = defineEmits<Emits>()

const displayCourses = computed(() => {
  if (props.limit > 0) return props.courses.slice(0, props.limit)
  return props.courses
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

.course-list {
  display: flex;
  flex-direction: column;
}
</style>
