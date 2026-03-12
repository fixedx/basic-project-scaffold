<template>
  <view class="section-block" v-if="classroomShowcases.length > 0 || studentShowcases.length > 0 || honors.length > 0">
    <!-- 环境/风采 Tab -->
    <view class="album-tabs" v-if="classroomShowcases.length > 0 || studentShowcases.length > 0">
      <view class="album-tab" :class="{ active: albumTab === 'env' }" @click="albumTab = 'env'">
        教学环境 ({{ classroomShowcases.length }})
      </view>
      <view class="album-tab" :class="{ active: albumTab === 'student' }" @click="albumTab = 'student'">
        学员风采 ({{ studentShowcases.length }})
      </view>
    </view>

    <view class="showcase-scroll" v-if="classroomShowcases.length > 0 || studentShowcases.length > 0">
      <scroll-view scroll-x class="showcase-scroll-view">
        <view class="showcase-list">
          <template v-if="currentShowcases.length > 0">
            <view
              v-for="(item, idx) in currentShowcases"
              :key="idx"
              class="showcase-item"
              @click="previewImages(currentShowcases, Number(idx))"
            >
              <AsyncImage :url="item.img_url" width="240rpx" height="180rpx" mode="aspectFill" custom-style="border-radius: 12rpx;" />
              <view class="showcase-title">{{ item.title || '图片' }}</view>
            </view>
          </template>
          <view v-else class="empty-block" style="width: 100%;">暂无图片</view>
        </view>
      </scroll-view>
    </view>

    <!-- 荣誉展示 -->
    <view v-if="honors.length > 0" :style="{ marginTop: (classroomShowcases.length > 0 || studentShowcases.length > 0) ? '32rpx' : '0' }">
      <view class="block-header">
        <text class="block-title">荣誉时刻 ({{ honors.length }})</text>
      </view>
      <scroll-view scroll-x class="showcase-scroll-view">
        <view class="showcase-list">
          <view
            v-for="(item, idx) in honors"
            :key="idx"
            class="showcase-item"
            @click="previewImages(honors, Number(idx))"
          >
            <AsyncImage :url="item.img_url" width="240rpx" height="180rpx" mode="aspectFill" custom-style="border-radius: 12rpx;" />
            <view class="showcase-title">{{ item.title || '荣誉' }}</view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AsyncImage from '@/components/AsyncImage/index.vue'

interface ShowcaseItem {
  img_url: string
  title?: string
  type?: string
  sort_order?: number
}

interface Props {
  /** showcases 数组（包含 classroom 和 student_work 类型） */
  showcases?: ShowcaseItem[]
  /** 荣誉数组 */
  honors?: ShowcaseItem[]
}

const props = withDefaults(defineProps<Props>(), {
  showcases: () => [],
  honors: () => [],
})

const albumTab = ref('env')

const classroomShowcases = computed(() =>
  props.showcases.filter(s => s.type === 'classroom')
)

const studentShowcases = computed(() =>
  props.showcases.filter(s => s.type === 'student_work')
)

const currentShowcases = computed(() =>
  albumTab.value === 'env' ? classroomShowcases.value : studentShowcases.value
)

const previewImages = (list: ShowcaseItem[], current: number) => {
  const urls = list.map(i => i.img_url)
  uni.previewImage({ urls, current })
}
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

.empty-block {
  text-align: center;
  color: #999;
  font-size: 26rpx;
  padding: 32rpx 0;
}

.album-tabs {
  display: flex;
  gap: 32rpx;
  border-bottom: 1rpx solid #eee;
  padding-bottom: 16rpx;
  margin-bottom: 24rpx;
}

.album-tab {
  font-size: 26rpx;
  color: #999;

  &.active {
    color: #333;
    font-weight: bold;
    position: relative;

    &:after {
      content: '';
      position: absolute;
      bottom: -18rpx;
      left: 50%;
      transform: translateX(-50%);
      width: 24rpx;
      height: 4rpx;
      background: $uni-color-primary;
    }
  }
}

.showcase-scroll {
  margin-top: 16rpx;
}

.showcase-scroll-view {
  width: 100%;
  white-space: nowrap;
}

.showcase-list {
  display: flex;
  gap: 16rpx;
}

.showcase-item {
  flex-shrink: 0;
  width: 240rpx;
  display: inline-block;
  vertical-align: top;
}

.showcase-title {
  font-size: 24rpx;
  color: #333;
  margin-top: 8rpx;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
