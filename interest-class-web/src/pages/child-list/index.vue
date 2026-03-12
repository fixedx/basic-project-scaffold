<template>
  <view class="page">
    <!-- 加载状态 -->
    <view class="loading-state" v-if="loading">
      <Loading text="加载中..." />
    </view>

    <!-- 宝贝列表 -->
    <view class="list-container" v-else>
      <!-- 空状态 -->
      <view class="empty-state" v-if="children.length === 0">
        <text class="iconfont icon-baby empty-icon"></text>
        <text class="empty-text">还没有添加宝贝</text>
        <text class="empty-tip">添加宝贝信息，预约课程更便捷</text>
        <wd-button type="primary" @click="handleAdd">添加宝贝</wd-button>
      </view>

      <!-- 列表 -->
      <view class="child-list" v-else>
        <view
          v-for="child in children"
          :key="child.id"
          class="child-card"
        >
          <view class="child-avatar">
            <AsyncImage
              v-if="child.avatar"
              :url="child.avatar"
              width="100rpx"
              height="100rpx"
              custom-class="avatar-round"
              mode="aspectFill"
            />
            <view v-else class="avatar-placeholder">
              <text class="iconfont icon-customer"></text>
            </view>
            <view class="gender-badge" v-if="child.gender">
              <text class="iconfont" :class="child.gender === 'male' ? 'icon-male' : 'icon-female'"></text>
            </view>
          </view>
          
          <view class="child-info">
            <view class="child-name">{{ child.name }}</view>
            <view class="child-meta">
              <text v-if="child.age">{{ child.age }}岁</text>
            </view>
            <view class="child-interests" v-if="child.interests && child.interests.length > 0">
              <text
                v-for="(interest, index) in child.interests.slice(0, 3)"
                :key="index"
                class="interest-tag"
              >
                {{ interest }}
              </text>
              <text v-if="child.interests.length > 3" class="more-tag">
                +{{ child.interests.length - 3 }}
              </text>
            </view>
          </view>
          
          <view class="child-actions">
            <view class="edit-btn" @click="handleEdit(child)">
              <text class="iconfont icon-edit"></text>
              <text>编辑</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <PageFooter v-if="!loading">
      <view class="footer-content">
        <wd-button type="primary" block size="large" @click="handleAdd">
          添加宝贝
        </wd-button>
      </view>
    </PageFooter>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { childApi, type Child } from '@/api'
import { showErrorToast } from '@/utils/toast'
import AsyncImage from '@/components/AsyncImage/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import Loading from '@/components/Loading/index.vue'

const children = ref<Child[]>([])
const loading = ref(false)

onMounted(() => {
  loadChildren()
})

// 每次显示时刷新列表
onShow(() => {
  loadChildren()
})

// 下拉刷新
onPullDownRefresh(async () => {
  await loadChildren()
  uni.stopPullDownRefresh()
})

// 加载宝贝列表
const loadChildren = async () => {
  loading.value = true
  try {
    children.value = await childApi.getMyList()
  } catch (error: any) {
    showErrorToast(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// 添加宝贝
const handleAdd = () => {
  uni.navigateTo({
    url: '/pages/child-edit/index',
  })
}

// 编辑宝贝
const handleEdit = (child: Child) => {
  uni.navigateTo({
    url: `/pages/child-edit/index?id=${child.id}`,
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.footer-content {
  width: 100%;
}

.list-container {
  padding: 24rpx 32rpx 160rpx;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
  
  text {
    margin-top: 20rpx;
    color: $uni-text-color-secondary;
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
  
  .empty-icon {
    font-size: 160rpx;
    color: $uni-text-color-disable;
    margin-bottom: 32rpx;
  }
  
  .empty-text {
    font-size: 32rpx;
    color: $uni-text-color;
    margin-bottom: 16rpx;
  }
  
  .empty-tip {
    font-size: 26rpx;
    color: $uni-text-color-secondary;
    margin-bottom: 48rpx;
  }
}

// 宝贝卡片
.child-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  
  .child-avatar {
    position: relative;
    flex-shrink: 0;
    
    .avatar-placeholder {
      width: 100rpx;
      height: 100rpx;
      border-radius: 50%;
      background-color: $uni-bg-color-grey;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .iconfont {
        font-size: 48rpx;
        color: $uni-text-color-disable;
      }
    }
    
    .gender-badge {
      position: absolute;
      right: -4rpx;
      bottom: -4rpx;
      width: 36rpx;
      height: 36rpx;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .icon-male {
        background-color: #1890ff;
        color: #fff;
        font-size: 20rpx;
        border-radius: 50%;
        padding: 6rpx;
      }
      
      .icon-female {
        background-color: #eb2f96;
        color: #fff;
        font-size: 20rpx;
        border-radius: 50%;
        padding: 6rpx;
      }
    }
  }
  
  .child-info {
    flex: 1;
    margin-left: 24rpx;
    
    .child-name {
      font-size: 32rpx;
      font-weight: 600;
      color: $uni-text-color;
    }
    
    .child-meta {
      font-size: 26rpx;
      color: $uni-text-color-secondary;
      margin-top: 8rpx;
      
      text {
        margin-right: 16rpx;
      }
    }
    
    .child-interests {
      display: flex;
      flex-wrap: wrap;
      margin-top: 12rpx;
      
      .interest-tag {
        font-size: 22rpx;
        color: $uni-color-primary;
        background-color: $uni-color-primary-lighter;
        padding: 4rpx 12rpx;
        border-radius: 8rpx;
        margin-right: 12rpx;
        margin-bottom: 8rpx;
      }
      
      .more-tag {
        font-size: 22rpx;
        color: $uni-text-color-secondary;
        padding: 4rpx 12rpx;
      }
    }
  }
  
  .child-actions {
    flex-shrink: 0;
    
    .edit-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16rpx 24rpx;
      color: $uni-color-primary;
      
      .iconfont {
        font-size: 36rpx;
        margin-bottom: 4rpx;
      }
      
      text:last-child {
        font-size: 22rpx;
      }
    }
  }
}

// 圆形头像样式
:deep(.avatar-round) {
  border-radius: 50%;
  overflow: hidden;
}
</style>
