<template>
  <view class="empty-state">
    <text 
      v-if="icon" 
      class="iconfont" 
      :class="icon"
      :style="{ fontSize: iconSize, color: iconColor }"
    ></text>
    <image 
      v-else-if="image" 
      :src="image" 
      class="empty-image"
      mode="aspectFit"
    />
    <view v-else class="default-icon">
      <text class="iconfont icon-empty"></text>
    </view>
    
    <text class="empty-text">{{ text }}</text>
    
    <slot name="action">
      <wd-button 
        v-if="actionText" 
        type="primary" 
        size="small"
        @click="emit('action')"
      >
        {{ actionText }}
      </wd-button>
    </slot>
  </view>
</template>

<script setup lang="ts">
interface Props {
  text?: string
  icon?: string
  iconSize?: string
  iconColor?: string
  image?: string
  actionText?: string
}

interface Emits {
  (e: 'action'): void
}

withDefaults(defineProps<Props>(), {
  text: '暂无数据',
  iconSize: '200rpx',
  iconColor: '#d9d9d9',
})

const emit = defineEmits<Emits>()
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
  
  .iconfont {
    margin-bottom: 32rpx;
  }
  
  .empty-image {
    width: 300rpx;
    height: 300rpx;
    margin-bottom: 32rpx;
  }
  
  .default-icon {
    .iconfont {
      font-size: 200rpx;
      color: #d9d9d9;
    }
  }
  
  .empty-text {
    font-size: 28rpx;
    color: $uni-text-color-tertiary;
    margin-bottom: 32rpx;
    text-align: center;
  }
}
</style>
