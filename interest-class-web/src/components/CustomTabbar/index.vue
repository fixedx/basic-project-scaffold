<template>
  <view class="custom-tabbar" v-if="visible && tabList.length > 1">
    <view
      v-for="(item, index) in tabList"
      :key="item.pagePath"
      class="tabbar-item"
      :class="{ active: currentIndex === index }"
      @click="switchTab(index)"
    >
      <text class="iconfont" :class="currentIndex === index ? item.selectedIcon : item.icon"></text>
      <text class="tabbar-text">{{ item.text }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'

interface TabItem {
  pagePath: string
  text: string
  icon: string
  selectedIcon: string
}

const props = defineProps<{
  current?: number
}>()

const emit = defineEmits<{
  (e: 'change', index: number): void
}>()

/** 原生 tabBar 页面路径（可使用 switchTab 导航） */
const NATIVE_TAB_PATHS = [
  '/pages/index/index',
  '/pages/schedule/index',
  '/pages/check-in-tab/index',
  '/pages/mine/index',
]

/** 根据角色获取 tab 配置 */
const getTabsByRole = (role: string): TabItem[] => {
  switch (role) {
    case 'institution':
      // 机构端：仅"我的"（不显示 tabbar，由 visible 控制）
      return [
        {
          pagePath: '/pages/institution/center/index',
          text: '我的',
          icon: 'icon-user-defined',
          selectedIcon: 'icon-user-defined-fill',
        },
      ]
    case 'teacher':
      // 教师端：课表、考勤、我的
      return [
        {
          pagePath: '/pages/teacher/schedule/index',
          text: '课表',
          icon: 'icon-calendar',
          selectedIcon: 'icon-calendar-fill',
        },
        {
          pagePath: '/pages/teacher/attendance/index',
          text: '考勤',
          icon: 'icon-sign-board',
          selectedIcon: 'icon-sign-board-fill',
        },
        {
          pagePath: '/pages/teacher/center/index',
          text: '我的',
          icon: 'icon-user-defined',
          selectedIcon: 'icon-user-defined-fill',
        },
      ]
    default:
      // 家长端（默认）：首页、课表、签到、我的
      return [
        {
          pagePath: '/pages/index/index',
          text: '首页',
          icon: 'icon-home',
          selectedIcon: 'icon-home-fill',
        },
        {
          pagePath: '/pages/schedule/index',
          text: '课表',
          icon: 'icon-calendar',
          selectedIcon: 'icon-calendar-fill',
        },
        {
          pagePath: '/pages/check-in-tab/index',
          text: '签到',
          icon: 'icon-sign-board',
          selectedIcon: 'icon-sign-board-fill',
        },
        {
          pagePath: '/pages/mine/index',
          text: '我的',
          icon: 'icon-user-defined',
          selectedIcon: 'icon-user-defined-fill',
        },
      ]
  }
}

// 获取当前角色
const userType = ref(uni.getStorageSync('userType') || '')
const tabList = computed(() => getTabsByRole(userType.value))
const currentIndex = ref(props.current ?? 0)
const visible = ref(true)

// 监听 props 变化
watch(() => props.current, (val) => {
  if (val !== undefined) {
    currentIndex.value = val
  }
})

/** 切换 tab */
const switchTab = (index: number) => {
  if (currentIndex.value === index) return

  // ⚠️ 不在这里设置 currentIndex，让目标页面的 CustomTabbar 自己通过路径匹配来确定高亮
  emit('change', index)

  const item = tabList.value[index]

  // 原生 tabBar 页面使用 switchTab，其他页面使用 reLaunch
  if (NATIVE_TAB_PATHS.includes(item.pagePath)) {
    uni.switchTab({
      url: item.pagePath,
      fail: () => {
        uni.reLaunch({ url: item.pagePath })
      },
    })
  } else {
    uni.reLaunch({ url: item.pagePath })
  }
}

/** 根据当前页面路径检测并设置选中状态 */
const detectCurrentIndex = () => {
  // 刷新角色（可能在页面间切换后变化）
  userType.value = uni.getStorageSync('userType') || ''

  const pages = getCurrentPages()
  if (pages.length > 0) {
    const currentPage = pages[pages.length - 1]
    const currentPath = '/' + currentPage.route
    const index = tabList.value.findIndex(item => item.pagePath === currentPath)
    if (index !== -1) {
      currentIndex.value = index
    }
  }
}

// 首次挂载时检测
onMounted(() => {
  detectCurrentIndex()

  // 只在原生 tabBar 页面才调用 hideTabBar
  const pages = getCurrentPages()
  if (pages.length > 0) {
    const path = '/' + pages[pages.length - 1].route
    if (NATIVE_TAB_PATHS.includes(path)) {
      uni.hideTabBar({ animation: false })
    }
  }
})

// tabBar 页面被缓存后再次显示时，onMounted 不会重新触发
// 需要通过 onShow 重新检测当前页面路径，修正高亮状态
onShow(() => {
  detectCurrentIndex()
})
</script>

<style lang="scss" scoped>
.custom-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 100rpx;
  background-color: $uni-bg-color;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.08);
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 999;
}

.tabbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  transition: all 0.3s;
  
  .iconfont {
    font-size: 44rpx;
    color: $uni-text-color-tertiary;
    margin-bottom: 4rpx;
    transition: all 0.3s;
  }
  
  .tabbar-text {
    font-size: 22rpx;
    color: $uni-text-color-tertiary;
    transition: all 0.3s;
  }
  
  &.active {
    .iconfont {
      color: $uni-color-primary;
    }
    
    .tabbar-text {
      color: $uni-color-primary;
    }
  }
}
</style>
