<template>
  <view class="child-selector">
    <view class="section-header">
      <view class="section-title">选择宝贝</view>
      <view class="add-btn" @click="emit('addChild')">
        <text class="iconfont icon-add"></text>
        <text>添加宝贝</text>
      </view>
    </view>

    <!-- 无宝贝提示 -->
    <view class="empty-wrap" v-if="!loadingChildren && children.length === 0">
      <text class="iconfont icon-customer empty-icon"></text>
      <text class="empty-text">暂无宝贝信息</text>
      <wd-button type="primary" size="small" @click="emit('addChild')">添加宝贝</wd-button>
    </view>

    <!-- 宝贝列表 -->
    <view class="child-list" v-else>
      <view
        class="child-item"
        :class="{ active: modelValue === child.id }"
        v-for="child in children"
        :key="child.id"
        @click="emit('update:modelValue', child.id)"
      >
        <AsyncImage
          :url="child.avatar || ''"
          width="80rpx"
          height="80rpx"
          mode="aspectFill"
          :radius="40"
          :show-placeholder="true"
        />
        <view class="child-info">
          <view class="name-row">
            <text class="name">{{ child.name }}</text>
            <text class="gender" :class="child.gender">
              {{ child.gender === 'male' ? '♂' : '♀' }}
            </text>
          </view>
          <text class="age" v-if="child.age">{{ child.age }}岁</text>
        </view>
        <view class="check-icon">
          <text class="iconfont icon-check"></text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Child } from '@/api/child'
import AsyncImage from '@/components/AsyncImage/index.vue'

interface Props {
  children: Child[]
  modelValue: string
  loadingChildren: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [id: string]
  addChild: []
}>()
</script>

<style lang="scss" scoped>
.child-selector {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
  padding-left: 20rpx;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 6rpx;
    height: 28rpx;
    background: linear-gradient(to bottom, #52c41a, #95de64);
    border-radius: 4rpx;
  }
}

.add-btn {
  display: flex;
  align-items: center;
  font-size: 26rpx;
  color: #52c41a;

  .iconfont {
    font-size: 28rpx;
    margin-right: 6rpx;
  }
}

.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0;

  .empty-icon {
    font-size: 80rpx;
    color: #d9d9d9;
    margin-bottom: 16rpx;
  }

  .empty-text {
    font-size: 28rpx;
    color: #999;
    margin-bottom: 24rpx;
  }
}

.child-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.child-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #f7f8fa;
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;

  &.active {
    background-color: #fff;
    border-color: #52c41a;
    box-shadow: 0 4rpx 16rpx rgba(82, 196, 26, 0.1);

    .child-info .name { color: #52c41a; }

    .check-icon {
      background-color: #52c41a;
      border-color: #52c41a;
      .iconfont { opacity: 1; transform: scale(1); }
    }
  }

  .child-info {
    flex: 1;
    margin-left: 24rpx;

    .name-row {
      display: flex;
      align-items: center;
    }

    .name {
      font-size: 30rpx;
      font-weight: 600;
      color: #333;
      transition: color 0.2s;
    }

    .gender {
      font-size: 24rpx;
      margin-left: 12rpx;
      &.male { color: #1890ff; }
      &.female { color: #eb2f96; }
    }

    .age {
      font-size: 24rpx;
      color: #999;
      margin-top: 8rpx;
    }
  }

  .check-icon {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    border: 2rpx solid #d9d9d9;
    background-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    .iconfont {
      font-size: 24rpx;
      color: #fff;
      opacity: 0;
      transform: scale(0.5);
      transition: all 0.2s;
    }
  }
}
</style>
