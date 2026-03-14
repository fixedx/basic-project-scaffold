<template>
  <view class="notification-page">
    <!-- 空状态 -->
    <EmptyState 
      icon="icon-notice" 
      text="暂无消息" 
      desc="消息通知功能即将上线，敬请期待" 
    />
  </view>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState/index.vue'
</script>

<style lang="scss" scoped>
.notification-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}
</style>
