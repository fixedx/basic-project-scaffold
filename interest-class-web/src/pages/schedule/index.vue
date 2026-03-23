<template>
  <view class="page">
    <!-- 顶部固定区域 -->
    <view class="fixed-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <!-- 顶部操作栏 -->
      <view class="header-main" :style="{ height: navBarHeight + 'px', paddingRight: safeAreaRight + 'px' }">
        <!-- 孩子选择器 -->
        <view class="child-selector" @click="showChildPicker = true">
          <view class="child-avatar">
            <AsyncImage 
              v-if="selectedChild?.avatar" 
              :url="selectedChild.avatar" 
              width="64rpx" 
              height="64rpx"
              custom-class="avatar avatar-img"
            />
            <view v-else class="default-avatar">
              <text class="iconfont icon-customer"></text>
            </view>
          </view>
          <view class="child-info">
            <text class="child-name">{{ selectedChild?.name || '全部孩子' }}</text>
            <text class="iconfont icon-down"></text>
          </view>
        </view>
        
        <!-- 右侧操作区 -->
        <view class="header-actions">
          <!-- 今天按钮 -->
           <!-- <view class="today-btn" @click="goToToday">
            <text>今</text>
          </view> -->
        </view>
      </view>

      <!-- 日期导航栏 -->
      <view class="date-navigator">
        <!-- 左侧月份调整 -->
        <view class="date-controls">
          <view class="nav-control prev" @click="handlePrev">
            <text class="iconfont icon-left"></text>
          </view>
          <view class="nav-date" @click="showMonthPicker = true">
            <text class="date-text">{{ navTitle }}</text>
            <text class="iconfont icon-down"></text>
          </view>
          <view class="nav-control next" @click="handleNext">
            <text class="iconfont icon-right"></text>
          </view>
        </view>

        <!-- 右侧视图切换 -->
        <view class="view-switch-capsule">
          <view 
            v-for="view in viewOptions" 
            :key="view.value"
            class="switch-item"
            :class="{ active: currentView === view.value }"
            @click="switchView(view.value)"
          >
            {{ view.label }}
          </view>
        </view>
      </view>

      <!-- 星期表头 (仅月视图/周视图显示在此处) -->
      <view class="weekday-header" v-if="currentView === 'month'">
        <text v-for="day in weekDayNames" :key="day" class="weekday-item">{{ day }}</text>
      </view>
    </view>

    <!-- 占位符 (防止内容被 fixed header 遮挡) - 仅在月/周视图使用 -->
    <view 
      v-if="currentView !== 'day'"
      class="header-placeholder" 
      :style="placeholderStyle"
    ></view>

    <!-- ==================== 月视图布局 ==================== -->
    <block v-if="currentView === 'month'">
      <!-- 月日历 -->
      <view class="calendar-month">
        <view class="date-grid">
          <view 
            v-for="(day, index) in monthDays" 
            :key="index"
            class="date-cell"
            :class="{ 
              'other-month': !day.currentMonth,
              'today': day.isToday,
              'selected': day.date === selectedDate,
              'has-course': day.courseCount > 0
            }"
            @click="selectDate(day.date)"
          >
            <text class="date-number">{{ day.dayNumber }}</text>
            <view v-if="day.courseCount > 0" class="course-dot">
              <text class="dot-count" v-if="day.courseCount > 1">{{ day.courseCount }}</text>
            </view>
          </view>
        </view>
      </view>
    </block>
    
    <!-- ==================== 周视图布局 ==================== -->
    <block v-if="currentView === 'week'">
      <!-- 周日历 -->
      <view class="calendar-week">
        <scroll-view scroll-x class="week-scroll" :show-scrollbar="false">
          <view class="week-days">
            <view 
              v-for="(day, index) in weekDays" 
              :key="index"
              class="week-day-item"
              :class="{ 
                'is-today': day.isToday,
                'is-selected': day.date === selectedDate,
                'has-course': day.courseCount > 0
              }"
              @click="selectDate(day.date)"
            >
              <text class="day-name">{{ day.dayName }}</text>
              <view class="day-number-wrapper">
                <text class="day-number">{{ day.dayNumber }}</text>
              </view>
              <!-- 课程数量指示器 -->
              <view class="course-count-badge" v-if="day.courseCount > 0">
                {{ day.courseCount }}
              </view>
              <view class="course-count-placeholder" v-else></view>
            </view>
          </view>
        </scroll-view>
      </view>
    </block>

    <!-- ==================== 课程列表区域 (月/周视图共用) ==================== -->
    <view class="course-section" v-if="currentView !== 'day'">
      <view class="section-header">
        <text class="section-title">{{ selectedDateText }}的课程</text>
        <text class="course-count" v-if="daySchedules.length > 0">共{{ daySchedules.length }}节</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-state">
        <Loading text="加载中..." />
      </view>

      <!-- 空状态 -->
      <view v-else-if="daySchedules.length === 0" class="empty-state-wrapper">
        <EmptyState 
          icon="icon-calendar"
          :text="selectedDate === today ? '今天没有课程' : '当天没有课程'"
          tips="快去预约心仪的课程吧~"
        >
          <wd-button type="primary" size="small" @click="goToExplore">探索课程</wd-button>
        </EmptyState>
      </view>

      <!-- 课程列表 -->
      <view v-else class="course-list">
        <view 
          v-for="schedule in daySchedules" 
          :key="schedule.id"
          class="course-card"
          @click="handleCourseClick(schedule)"
        >
          <view class="course-time">
            <text class="time-text">{{ schedule.start_time }}</text>
            <text class="time-divider">-</text>
            <text class="time-text">{{ schedule.end_time }}</text>
          </view>
          <view class="course-content">
            <view class="course-header">
              <text class="course-name">{{ schedule.course_name }}</text>
              <view class="course-status" :class="'status-' + schedule.status">
                {{ getStatusText(schedule.status) }}
              </view>
            </view>
            <view class="course-meta">
              <!-- 人员所在行 -->
              <view class="meta-row person-row" v-if="schedule.teacher_name || schedule.child_name">
                <view class="person-badge teacher" v-if="schedule.teacher_name">
                  <view class="badge-label">教</view>
                  <text class="badge-text">{{ schedule.teacher_name }}</text>
                </view>
                <view class="person-badge student" v-if="schedule.child_name">
                  <view class="badge-label">学</view>
                  <text class="badge-text">{{ schedule.child_name }}</text>
                </view>
              </view>
              
              <!-- 地点所在行 -->
              <view class="meta-row location-row">
                <view class="meta-item" v-if="schedule.classroom_name">
                  <text class="iconfont icon-location"></text>
                  <text>{{ schedule.classroom_name }}</text>
                </view>
              </view>
              <view class="meta-row location-row">
                <view class="meta-item" v-if="schedule.institution_name">
                  <text class="iconfont icon-store"></text>
                  <text>{{ schedule.institution_name }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ==================== 日视图独立布局 ==================== -->
    <view 
      v-if="currentView === 'day'" 
      class="day-view-container"
      :style="{ paddingTop: placeholderStyle.height }"
    >
      <scroll-view 
        class="calendar-day-scroll" 
        scroll-y
        :scroll-into-view="scrollToHour"
        :enable-back-to-top="true"
      >
        <view class="time-axis">
          <!-- 顶部留白，防止0点被 header 阴影遮挡 -->
          <view style="height: 20rpx;"></view>
          
          <!-- 时间轴行 -->
          <view 
            v-for="hour in dayHours" 
            :key="hour"
            :id="'hour-' + hour"
            class="time-row"
          >
            <view class="time-label">
              <text>{{ hour.toString().padStart(2, '0') }}:00</text>
            </view>
            <view class="time-content">
              <!-- 显示该小时内的课程 -->
              <view 
                v-for="schedule in getSchedulesForHour(hour)" 
                :key="schedule.id"
                class="day-course-block"
                :class="'status-' + schedule.status"
                :style="getCourseBlockStyle(schedule, hour)"
                @click="handleCourseClick(schedule)"
              >
                <view class="block-time">{{ schedule.start_time }} - {{ schedule.end_time }}</view>
                <view class="block-name">{{ schedule.course_name }}</view>
                <view class="block-info" v-if="schedule.teacher_name || schedule.classroom_name">
                   <text v-if="schedule.teacher_name">{{ schedule.teacher_name }}</text>
                   <text v-if="schedule.teacher_name && schedule.classroom_name"> · </text>
                  <text v-if="schedule.classroom_name">{{ schedule.classroom_name }}</text>
                </view>
              </view>
            </view>
          </view>
          
          <!-- 底部留白，防止23点被底部遮挡 -->
          <view style="height: 120rpx;"></view>
        </view>
      </scroll-view>
    </view>

    <!-- 孩子选择弹窗 -->
    <wd-action-sheet
      v-model="showChildPicker"
      :actions="childActions"
      cancel-text="取消"
      @select="handleChildSelect"
    />

    <!-- 月份选择器弹窗 -->
    <wd-popup 
      v-model="showMonthPicker" 
      position="bottom" 
      :safe-area-inset-bottom="true"
    >
      <view class="month-picker-container">
        <view class="picker-header">
          <text class="picker-cancel" @click="showMonthPicker = false">取消</text>
          <text class="picker-title">选择月份</text>
          <text class="picker-confirm" @click="confirmMonthSelect">确定</text>
        </view>
        <wd-datetime-picker-view
          v-model="tempMonthValue"
          type="year-month"
        />
      </view>
    </wd-popup>
    
    <!-- 底部 TabBar 占位 -->
    <view style="height: 120rpx;"></view>
    <CustomTabbar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onShow, onPullDownRefresh, onLoad } from '@dcloudio/uni-app'
import { bookingApi, type Booking } from '@/api/booking'
import { childApi, type Child } from '@/api/child'
import { getToken } from '@/utils/auth'
import AsyncImage from '@/components/AsyncImage/index.vue'
import Loading from '@/components/Loading/index.vue'
import EmptyState from '@/components/EmptyState/index.vue'
import CustomTabbar from '@/components/CustomTabbar/index.vue'

// ==================== 状态栏适配 ====================
const statusBarHeight = ref(20) // 默认值
const navBarHeight = ref(44)    // 默认导航栏高度
const menuButtonInfo = ref<UniApp.GetMenuButtonBoundingClientRectRes | null>(null)
const safeAreaRight = ref(0)    // 右侧安全距离（避开胶囊）

onLoad(() => {
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 20
  
  // #ifdef MP-WEIXIN
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect()
    menuButtonInfo.value = menuButton
    // 计算导航栏高度 = (胶囊顶部 - 状态栏底部) + 胶囊高度 + (胶囊底 - 胶囊底) -- 简易算法：胶囊高度 + (胶囊顶部 - 状态栏高度) * 2
    // 或者通常取 (menuButton.top - systemInfo.statusBarHeight) * 2 + menuButton.height
    navBarHeight.value = (menuButton.top - statusBarHeight.value) * 2 + menuButton.height
    // 右侧留白 = 屏幕宽度 - 胶囊左侧
    safeAreaRight.value = systemInfo.windowWidth - menuButton.left
  } catch (e) {
    console.error('获取胶囊按钮信息失败', e)
  }
  // #endif
})

// 计算样式
const headerStyle = computed(() => {
  return {
    paddingTop: `${statusBarHeight.value}px`,
  }
})

const headerMainStyle = computed(() => {
  return {
    height: `${navBarHeight.value}px`,
    paddingRight: `${safeAreaRight.value + 10}px` // 额外加 10px 间距
  }
})

// 占位符高度 = 状态栏 + 导航栏 + 日期导航(约46px) + (星期表头 if month) + fixed-header padding-bottom(8px)
const placeholderStyle = computed(() => {
  let height = statusBarHeight.value + navBarHeight.value + 46 + 8 // 46px date-nav + 8px padding
  if (currentView.value === 'month') {
    height += 30 // weekday-header 大致高度
  }
  return {
    height: `${height}px`
  }
})

// 计算日视图的时间轴高度
// 总高度 100vh - header占位高度
const dayViewHeight = computed(() => {
  // 解析 placeholderStyle.height (例如 "120px")
  const headerPx = parseInt(placeholderStyle.value.height) || 200
  // 返回 calc(100vh - headerPx)
  return `calc(100vh - ${headerPx}px)` 
})

// ==================== 登录状态 ====================
const isLoggedIn = computed(() => !!getToken())

// ==================== 视图相关 ====================
type ViewType = 'day' | 'week' | 'month'

const viewOptions = [
  { label: '日', value: 'day' as ViewType },
  { label: '周', value: 'week' as ViewType },
  { label: '月', value: 'month' as ViewType },
]

const currentView = ref<ViewType>('month')
const weekDayNames = ['日', '一', '二', '三', '四', '五', '六']

// ==================== 日期相关 ====================
const today = computed(() => formatDate(new Date()))
const selectedDate = ref('')
const currentMonthDate = ref(new Date())
const currentWeekStart = ref(new Date())

// 导航标题（动态显示）
const navTitle = computed(() => {
  if (currentView.value === 'month') {
    return monthTitle.value
  } else if (currentView.value === 'week') {
    return weekTitle.value
  } else {
    return dayTitle.value
  }
})

// 导航控制
const handlePrev = () => {
  if (currentView.value === 'month') {
    prevMonth()
  } else if (currentView.value === 'week') {
    prevWeek()
  } else {
    prevDay()
  }
}

const handleNext = () => {
  if (currentView.value === 'month') {
    nextMonth()
  } else if (currentView.value === 'week') {
    nextWeek()
  } else {
    nextDay()
  }
}


// ==================== 孩子相关 ====================
const children = ref<Child[]>([])
const selectedChildId = ref<string>('')
const showChildPicker = ref(false)
const showMonthPicker = ref(false)

const selectedChild = computed(() => {
  if (!selectedChildId.value) return null
  return children.value.find(c => c.id === selectedChildId.value) || null
})

// 月份选择器临时值
const tempMonthValue = ref(new Date().getTime())

const childActions = computed(() => {
  const actions = [
    { name: '全部孩子', value: '' }
  ]
  children.value.forEach(child => {
    actions.push({ name: child.name, value: child.id })
  })
  return actions
})

// ==================== 数据相关 ====================
const loading = ref(false)
const allBookings = ref<any[]>([])  // 当前视图范围内的所有预约
const bookingsByDate = ref<Map<string, any[]>>(new Map())

// ==================== 计算属性 ====================

// 月份标题
const monthTitle = computed(() => {
  const date = currentMonthDate.value
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
})

// 周标题
const weekTitle = computed(() => {
  const start = new Date(currentWeekStart.value)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  
  const startMonth = start.getMonth() + 1
  const startDay = start.getDate()
  const endMonth = end.getMonth() + 1
  const endDay = end.getDate()
  
  if (startMonth === endMonth) {
    return `${start.getFullYear()}年${startMonth}月${startDay}日 - ${endDay}日`
  }
  return `${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`
})

// 日标题
const dayTitle = computed(() => {
  if (!selectedDate.value) return ''
  const date = new Date(selectedDate.value)
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekday}`
})

// 选中日期文本
const selectedDateText = computed(() => {
  if (!selectedDate.value) return '今天'
  if (selectedDate.value === today.value) return '今天'
  const date = new Date(selectedDate.value)
  return `${date.getMonth() + 1}月${date.getDate()}日`
})

// 月视图日期数组
const monthDays = computed(() => {
  const year = currentMonthDate.value.getFullYear()
  const month = currentMonthDate.value.getMonth()
  
  // 当月第一天
  const firstDay = new Date(year, month, 1)
  // 当月最后一天
  const lastDay = new Date(year, month + 1, 0)
  
  // 开始于周几（0-6）
  const startWeekday = firstDay.getDay()
  
  const days = []
  
  // 填充上月日期
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const date = new Date(year, month - 1, day)
    days.push({
      date: formatDate(date),
      dayNumber: day,
      currentMonth: false,
      isToday: false,
      courseCount: getCoursesForDate(formatDate(date)).length
    })
  }
  
  // 当月日期
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    const dateStr = formatDate(date)
    days.push({
      date: dateStr,
      dayNumber: day,
      currentMonth: true,
      isToday: dateStr === today.value,
      courseCount: getCoursesForDate(dateStr).length
    })
  }
  
  // 填充下月日期（补满6行）
  const remainingDays = 42 - days.length
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day)
    days.push({
      date: formatDate(date),
      dayNumber: day,
      currentMonth: false,
      isToday: false,
      courseCount: getCoursesForDate(formatDate(date)).length
    })
  }
  
  return days
})

// 周视图日期数组
const weekDays = computed(() => {
  const days = []
  const start = new Date(currentWeekStart.value)
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    const dateStr = formatDate(date)
    
    days.push({
      date: dateStr,
      dayName: weekDayNames[date.getDay()],
      dayNumber: date.getDate(),
      isToday: dateStr === today.value,
      courseCount: getCoursesForDate(dateStr).length
    })
  }
  
  return days
})

// 当天课程列表
const daySchedules = computed(() => {
  return getCoursesForDate(selectedDate.value)
})

// ==================== 日视图相关 ====================

// 日视图的小时列表（0:00 - 23:00）
const dayHours = computed(() => {
  const hours: number[] = []
  for (let h = 0; h <= 23; h++) {
    hours.push(h)
  }
  return hours
})

// 当前应该滚动到的小时
const scrollToHour = computed(() => {
  const now = new Date()
  const currentHour = now.getHours()
  // 如果是今天，滚动到当前小时；否则滚动到第一个有课程的小时或8点
  if (selectedDate.value === today.value) {
    return `hour-${Math.max(6, Math.min(currentHour, 22))}`
  }
  // 找到第一个有课程的小时
  const schedules = daySchedules.value
  if (schedules.length > 0) {
    const firstHour = parseInt(schedules[0].start_time?.split(':')[0] || '8')
    return `hour-${Math.max(6, Math.min(firstHour, 22))}`
  }
  return 'hour-8'
})

// 获取某个小时的课程（课程开始时间在该小时内）
function getSchedulesForHour(hour: number): any[] {
  return daySchedules.value.filter(schedule => {
    if (!schedule.start_time) return false
    const startHour = parseInt(schedule.start_time.split(':')[0])
    return startHour === hour
  })
}

// 计算课程块的样式（高度和偏移）
function getCourseBlockStyle(schedule: any, hour: number): Record<string, string> {
  if (!schedule.start_time || !schedule.end_time) {
    return { height: '80rpx' }
  }
  
  const [startHour, startMin] = schedule.start_time.split(':').map(Number)
  const [endHour, endMin] = schedule.end_time.split(':').map(Number)
  
  // 计算时长（分钟）
  const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
  // 每小时120rpx，计算高度
  const height = Math.max(80, Math.round(durationMinutes / 60 * 120))
  
  // 计算顶部偏移（基于分钟）
  const topOffset = Math.round(startMin / 60 * 120)
  
  return {
    height: `${height}rpx`,
    top: `${topOffset}rpx`,
  }
}

// ==================== 方法 ====================

// 格式化日期
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 格式化时间
function formatTime(dateTimeStr?: string): string {
  if (!dateTimeStr) return ''
  const date = new Date(dateTimeStr)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// 获取某天的课程
function getCoursesForDate(date: string): any[] {
  return bookingsByDate.value.get(date) || []
}

// 切换视图
function switchView(view: ViewType) {
  currentView.value = view
  loadScheduleData()
}

// 返回今天
function goToToday() {
  const now = new Date()
  selectedDate.value = formatDate(now)
  currentMonthDate.value = new Date(now.getFullYear(), now.getMonth(), 1)
  initWeekStart(now)
  loadScheduleData()
}

// 初始化周起始日期
function initWeekStart(date: Date = new Date()) {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  currentWeekStart.value = monday
}

// 上一月
function prevMonth() {
  const date = new Date(currentMonthDate.value)
  date.setMonth(date.getMonth() - 1)
  currentMonthDate.value = date
  loadScheduleData()
}

// 下一月
function nextMonth() {
  const date = new Date(currentMonthDate.value)
  date.setMonth(date.getMonth() + 1)
  currentMonthDate.value = date
  loadScheduleData()
}

// 上一周
function prevWeek() {
  const date = new Date(currentWeekStart.value)
  date.setDate(date.getDate() - 7)
  currentWeekStart.value = date
  selectedDate.value = formatDate(date)
  loadScheduleData()
}

// 下一周
function nextWeek() {
  const date = new Date(currentWeekStart.value)
  date.setDate(date.getDate() + 7)
  currentWeekStart.value = date
  selectedDate.value = formatDate(date)
  loadScheduleData()
}

// 上一天
function prevDay() {
  const date = new Date(selectedDate.value)
  date.setDate(date.getDate() - 1)
  selectedDate.value = formatDate(date)
  // 如果跨月，更新月份
  if (date.getMonth() !== currentMonthDate.value.getMonth()) {
    currentMonthDate.value = new Date(date.getFullYear(), date.getMonth(), 1)
  }
  loadScheduleData()
}

// 下一天
function nextDay() {
  const date = new Date(selectedDate.value)
  date.setDate(date.getDate() + 1)
  selectedDate.value = formatDate(date)
  // 如果跨月，更新月份
  if (date.getMonth() !== currentMonthDate.value.getMonth()) {
    currentMonthDate.value = new Date(date.getFullYear(), date.getMonth(), 1)
  }
  loadScheduleData()
}

// 选择日期
function selectDate(date: string) {
  selectedDate.value = date
}

// 打开月份选择器时，初始化临时值
watch(showMonthPicker, (show) => {
  if (show) {
    tempMonthValue.value = currentMonthDate.value.getTime()
  }
})

// 月份选择确认
function confirmMonthSelect() {
  const date = new Date(tempMonthValue.value)
  currentMonthDate.value = date
  showMonthPicker.value = false
  loadScheduleData()
}

// 孩子选择（wd-action-sheet @select 回调参数为 { item, index }）
function handleChildSelect({ item, index }: { item: any; index: number }) {
  selectedChildId.value = item.value || ''
  showChildPicker.value = false
  loadScheduleData()
}

// 获取状态文本
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认',
    pending_change: '待审核修改',
    completed: '已完成',
    cancelled: '已取消',
    rejected: '已拒绝',
  }
  return statusMap[status] || '未知'
}

// 点击课程
function handleCourseClick(schedule: any) {
  uni.navigateTo({
    url: `/pages/booking-detail/index?id=${schedule.id}`,
  })
}

// 去探索课程
function goToExplore() {
  uni.navigateTo({
    url: '/pages/course-list/index',
  })
}

// 加载孩子列表
async function loadChildren() {
  try {
    const res = await childApi.getMyList()
    children.value = res || []
  } catch (error) {
    console.error('加载孩子列表失败:', error)
    children.value = []
  }
}

// 计算日期范围
function getDateRange(): { startDate: string; endDate: string } {
  let startDate: Date
  let endDate: Date
  
  if (currentView.value === 'month') {
    // 月视图：取当月前后各一周
    const year = currentMonthDate.value.getFullYear()
    const month = currentMonthDate.value.getMonth()
    startDate = new Date(year, month - 1, 20)
    endDate = new Date(year, month + 1, 10)
  } else if (currentView.value === 'week') {
    // 周视图：当周
    startDate = new Date(currentWeekStart.value)
    endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 6)
  } else {
    // 日视图：当天
    startDate = new Date(selectedDate.value)
    endDate = new Date(selectedDate.value)
  }
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  }
}

// 加载课程数据
async function loadScheduleData() {
  loading.value = true
  try {
    // 获取我的已确认预约 + 待审核修改预约（后端已关联 schedule、course、institution 等信息）
    // 注意：已完成(completed)的预约不需要显示在课表中
    const [res1, res2] = await Promise.all([
      bookingApi.getMyList({ status: 'confirmed' }),
      bookingApi.getMyList({ status: 'pending_change' }),
    ])
    const fetchedBookings = [
      ...(Array.isArray(res1) ? res1 : res1.data || []),
      ...(Array.isArray(res2) ? res2 : res2.data || []),
    ]
    // 过滤掉已退款/已取消的（order_id 为空说明对应订单已退款或取消）
    const bookings = fetchedBookings.filter((b: any) => b.order_id)
    
    // 按日期分组
    const byDate = new Map<string, any[]>()
    
    bookings.forEach((booking: any) => {
      // 过滤孩子
      if (selectedChildId.value && booking.child_id !== selectedChildId.value) {
        return
      }
      
      // 解析日期：优先使用排课时间，其次使用预约时间
      let scheduleDate = ''
      let startTime = ''
      let endTime = ''
      
      if (booking.schedule?.start_time) {
        // 使用排课的上课时间
        const scheduleStart = new Date(booking.schedule.start_time)
        scheduleDate = formatDate(scheduleStart)
        startTime = formatTime(booking.schedule.start_time)
        endTime = formatTime(booking.schedule.end_time)
      } else if (booking.booking_time) {
        // 降级使用预约时间
        scheduleDate = booking.booking_time.split('T')[0]
        startTime = formatTime(booking.booking_time)
      }
      
      if (!scheduleDate) return
      
      // 构造课程对象（使用后端返回的关联数据）
      const scheduleItem = {
        id: booking.id,
        course_name: booking.course?.title || booking.student_name || '课程',
        institution_name: booking.institution?.name || '',
        teacher_name: booking.teacher?.name || '',
        classroom_name: booking.classroom?.name || '',
        child_name: booking.child?.name || '',
        start_time: startTime,
        end_time: endTime,
        status: booking.status,
        booking
      }
      
      if (!byDate.has(scheduleDate)) {
        byDate.set(scheduleDate, [])
      }
      byDate.get(scheduleDate)!.push(scheduleItem)
    })
    
    // 排序每天的课程
    byDate.forEach((courses) => {
      courses.sort((a, b) => a.start_time.localeCompare(b.start_time))
    })
    
    bookingsByDate.value = byDate
    allBookings.value = bookings
    
  } catch (error: any) {
    console.error('加载课表失败:', error)
    bookingsByDate.value = new Map()
    allBookings.value = []
  } finally {
    loading.value = false
  }
}

// ==================== 生命周期 ====================

onMounted(async () => {
  // 检查登录状态，未登录直接跳转登录页
  if (!isLoggedIn.value) {
    uni.navigateTo({
      url: '/pages/login/index'
    })
    return
  }
  
  // 初始化日期
  selectedDate.value = today.value
  currentMonthDate.value = new Date()
  initWeekStart()
  
  // 加载数据
  await loadChildren()
  await loadScheduleData()
})

onShow(() => {
  uni.hideTabBar({ animation: false })
  if (!isLoggedIn.value) {
    uni.navigateTo({
      url: '/pages/login/index'
    })
    return
  }
  loadScheduleData()
})

// 下拉刷新
onPullDownRefresh(async () => {
  if (isLoggedIn.value) {
    await loadScheduleData()
  }
  uni.stopPullDownRefresh()
})
</script>


<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

// 头部固定区域
.fixed-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
  padding-bottom: 16rpx;
}

.header-placeholder {
  width: 100%;
  // Height is set dynamically via style binding
}

// 顶部主操作栏
.header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx; // 仅保留左右内边距，高度由 JS 动态计算
  box-sizing: border-box; // 确保 padding 不会撑大高度
}

.child-selector {
  display: flex;
  align-items: center;
  background-color: #f7f8fa;
  padding: 8rpx 20rpx 8rpx 8rpx;
  border-radius: 40rpx;
  
  .child-info {
    display: flex;
    align-items: center;
    
    .child-name {
      font-size: 28rpx;
      color: #333;
      font-weight: 500;
      margin-right: 8rpx;
      max-width: 160rpx;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    
    .iconfont {
      font-size: 20rpx;
      color: #999;
    }
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.view-switch-capsule {
  display: flex;
  background-color: #f0f2f5;
  border-radius: 32rpx;
  padding: 4rpx;
  
  .switch-item {
    font-size: 26rpx;
    color: #666;
    padding: 8rpx 24rpx;
    border-radius: 28rpx;
    transition: all 0.3s;
    
    &.active {
      background-color: #fff;
      color: $uni-color-primary;
      font-weight: 500;
      box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
    }
  }
}

.today-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background-color: $uni-color-primary-lighter;
  display: flex;
  align-items: center;
  justify-content: center;
  
  text {
    font-size: 24rpx;
    color: $uni-color-primary;
    font-weight: 600;
  }
  
  &:active {
    opacity: 0.8;
  }
}

// 日期导航
.date-navigator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 32rpx;
  background-color: #fff;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.02);
  position: relative;
  z-index: 20;

  .date-controls {
    display: flex;
    align-items: center;
  }
  
  .nav-control {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .iconfont {
      font-size: 32rpx;
      color: #999;
    }
    
    &:active .iconfont {
      color: $uni-color-primary;
    }
  }
  
  .nav-date {
    display: flex;
    align-items: center;
    padding: 0;
    
    .date-text {
      font-size: 30rpx;
      font-weight: 600;
      color: #333;
      margin-right: 8rpx;
    }
    
    .iconfont {
      font-size: 24rpx;
      color: #333;
    }
  }

  .view-switch-capsule {
    margin-left: auto;
  }
}

// 星期表头
.weekday-header {
  display: flex;
  justify-content: space-around;
  padding: 16rpx 0 8rpx;
  
  .weekday-item {
    width: 14.28%;
    text-align: center;
    font-size: 24rpx;
    color: #999;
  }
}

// 月视图日历
.calendar-month {
  background-color: #fff;
  padding: 0 16rpx 24rpx;
  
  .date-grid {
    display: flex;
    flex-wrap: wrap;
  }
  
  .date-cell {
    width: 14.28%;
    height: 90rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    border-radius: 12rpx;
    
    .date-number {
      font-size: 30rpx;
      color: #333;
      font-weight: 500;
      z-index: 2;
    }
    
    .course-dot {
      position: absolute;
      bottom: 12rpx;
      width: 8rpx;
      height: 8rpx;
      border-radius: 50%;
      background-color: $uni-color-primary;
      z-index: 2;
      
      .dot-count { display: none; }
    }
    
    &.other-month .date-number {
      color: #ccc;
    }
    
    &.today {
      .date-number {
        color: $uni-color-primary;
        font-weight: 600;
      }
    }
    
    &.selected {
      .date-number {
        color: #fff;
      }
      
      &::after {
        content: '';
        position: absolute;
        width: 72rpx;
        height: 72rpx;
        background-color: $uni-color-primary;
        border-radius: 50%;
        z-index: 1;
        box-shadow: 0 4rpx 12rpx rgba(82, 196, 26, 0.3);
      }
      
      .course-dot {
        background-color: #fff;
      }
    }
  }
}

// 周视图日历
.calendar-week {
  background-color: #fff;
  padding: 0 0 24rpx 0;
  
  // 滚动容器支持超出屏幕
  .week-scroll {
    width: 100%;
    white-space: nowrap;
  }

  .week-days {
    display: flex;
    justify-content: space-between; // 两端对齐，均匀分布
    padding: 0 24rpx;
  }
  
  .week-day-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 88rpx; // 固定宽度
    padding: 16rpx 0;
    border-radius: 44rpx; // 完全胶囊圆角
    background-color: transparent; // 默认无背景
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    
    // 星期名（一、二等）
    .day-name {
      font-size: 24rpx;
      color: #999;
      margin-bottom: 8rpx;
      font-weight: 500;
    }
    
    // 日期数字的外层容器
    .day-number-wrapper {
      width: 64rpx;
      height: 64rpx;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8rpx;
      transition: all 0.3s;
    }

    // 日期数字
    .day-number {
      font-size: 32rpx;
      color: #333;
      font-weight: 600;
      font-family: 'DIN Alternate', sans-serif; // 尝试使用数字字体
    }
    
    // 课程数量指示器
    .course-count-badge {
      font-size: 20rpx;
      color: #999;
      background-color: #f5f5f5;
      padding: 2rpx 12rpx;
      border-radius: 20rpx;
      transform: scale(0.9);
    }
    
    .course-count-placeholder {
      height: 32rpx; // 占位保持高度一致
    }
    
    // ===== 状态样式 =====

    // 今天
    &.is-today {
      .day-name {
        color: $uni-color-primary;
        font-weight: 600;
      }
      .day-number {
        color: $uni-color-primary;
      }
    }
    
    // 选中状态 (优先级高)
    &.is-selected {
      background-color: rgba(82, 196, 26, 0.08); // 浅绿色背景胶囊
      
      .day-name {
        color: $uni-color-primary;
      }
      
      .day-number-wrapper {
        background: linear-gradient(135deg, #73d13d 0%, #52c41a 100%);
        box-shadow: 0 4rpx 12rpx rgba(82, 196, 26, 0.4);
      }

      .day-number {
        color: #fff; // 数字变白
      }
      
      .course-count-badge {
        color: $uni-color-primary;
        background-color: #fff;
      }
    }

    // 点击反馈
    &:active {
      transform: scale(0.95);
    }
  }
}

// 日视图时间轴
// ==================== 日视图样式 ====================
.day-view-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ffffff;
  z-index: 1; /* 必须低于弹出层（wd-action-sheet/wd-popup 等），否则会遮挡弹窗 */
  
  .calendar-day-scroll {
    height: 100%;
    width: 100%;
  }

  .time-axis {
    display: flex;
    flex-direction: column;
    width: 100%;
    background-color: #fff;
  }
  
  .time-row {
    display: flex;
    min-height: 120rpx;
    position: relative;
    
    .time-label {
      width: 100rpx;
      text-align: right;
      padding-right: 20rpx;
      color: #999;
      font-size: 24rpx;
      font-weight: 500;
      transform: translateY(-14rpx); 
    }
    
    .time-content {
      flex: 1;
      position: relative;
      border-top: 1rpx solid #f0f0f0;
      
      // 半小时虚线
      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        border-top: 1rpx dashed #f5f5f5;
      }
    }
  }
  
  .day-course-block {
    position: absolute;
    left: 8rpx;
    right: 16rpx;
    top: 0;
    background-color: #e6f7ff;
    border-left: 6rpx solid #1890ff;
    border-radius: 8rpx;
    padding: 12rpx 16rpx;
    overflow: hidden;
    z-index: 10;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
    transition: all 0.2s ease;
    
    &:active {
      transform: scale(0.98);
      opacity: 0.9;
    }
    
    .block-time {
      font-size: 22rpx;
      font-weight: 500;
      color: #1890ff;
      margin-bottom: 4rpx;
    }
    
    .block-name {
      font-size: 26rpx;
      font-weight: 600;
      color: #333;
      margin-bottom: 4rpx;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .block-info {
      font-size: 20rpx;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    // 状态样式覆盖
    &.status-pending {
      background-color: #fffbe6;
      border-left-color: #fa8c16;
      .block-time { color: #d46b08; }
    }
    
    &.status-confirmed, &.status-pending_change {
      background-color: #f6ffed;
      border-left-color: #52c41a;
      .block-time { color: #389e0d; }
    }
    
    &.status-cancelled {
      background-color: #fff2f0;
      border-left-color: #f5222d;
      .block-time { color: #cf1322; }
      opacity: 0.6;
      text-decoration: line-through;
    }
  }
}

// 课程区域
.course-section {
  padding: 32rpx;
  background-color: #f5f7fa;
  border-radius: 40rpx 40rpx 0 0;
  margin-top: -24rpx; // 稍微向上覆盖一点日历
  position: relative;
  z-index: 10;
  
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32rpx;
    padding: 0 8rpx;
    
    .section-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #333;
    }
    
    .course-count {
      font-size: 24rpx;
      color: #999;
      background-color: #fff;
      padding: 6rpx 16rpx;
      border-radius: 20rpx;
    }
  }
}

// 加载状态
.loading-state {
  display: flex;
  justify-content: center;
  padding: 100rpx 0;
}

// 空状态优化
.empty-state-wrapper {
  display: flex;
  justify-content: center;
}

// 课程列表优化
.course-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.course-card {
  display: flex;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
  position: relative;
  overflow: hidden;
  
  // 左侧装饰条
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 32rpx;
    bottom: 32rpx;
    width: 8rpx;
    background-color: $uni-color-primary;
    border-radius: 0 8rpx 8rpx 0;
  }
  
  .course-time {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 120rpx;
    flex-shrink: 0;
    padding-left: 24rpx;
    
    .time-text {
      font-size: 32rpx;
      color: #333;
      font-weight: 600;
      line-height: 1.2;
    }
    
    .time-divider {
      font-size: 24rpx;
      color: #999;
      margin: 4rpx 0;
      transform: translateX(8rpx); // 微调对齐
    }
  }
  
  .course-content {
    flex: 1;
    margin-left: 24rpx;
    padding-left: 24rpx;
    border-left: 2rpx dashed #eee;
    
    .course-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 20rpx;
      
      .course-name {
        flex: 1;
        font-size: 32rpx;
        font-weight: 600;
        color: #333;
        margin-right: 20rpx;
        line-height: 1.4;
      }
      
      .course-status {
        padding: 4rpx 12rpx;
        border-radius: 8rpx;
        font-size: 20rpx;
        font-weight: 500;
        flex-shrink: 0;
        
        &.status-pending {
          background-color: #fff7e6;
          color: #fa8c16;
        }
        
        &.status-confirmed {
          background-color: rgba(82, 196, 26, 0.1);
          color: $uni-color-primary;
        }
        
        &.status-completed {
          background-color: #f6ffed;
          color: #52c41a;
        }
        
        &.status-cancelled, &.status-rejected {
          background-color: #fff2f0;
          color: #ff4d4f;
        }
      }
    }
    
    .course-meta {
      margin-top: 16rpx;
      display: flex;
      flex-direction: column;
      gap: 16rpx;
      
      .meta-row {
        display: flex;
        align-items: center;
        gap: 16rpx;
        
        &.location-row {
          .meta-item {
            display: flex;
            align-items: center;
            font-size: 24rpx;
            color: #666;
            background-color: #f7f8fa;
            padding: 4rpx 12rpx;
            border-radius: 6rpx;
            
            .iconfont {
              font-size: 24rpx;
              color: #999;
              margin-right: 8rpx;
            }
          }
        }
        
        &.person-row {
          .person-badge {
            display: flex;
            align-items: center;
            border-radius: 8rpx;
            overflow: hidden;
            
            .badge-label {
              font-size: 20rpx;
              color: #fff;
              padding: 4rpx 8rpx;
              line-height: 1.2;
            }
            
            .badge-text {
              font-size: 24rpx;
              padding: 4rpx 12rpx;
              font-weight: 500;
              line-height: 1.2;
            }
            
            &.teacher {
              background-color: #e6f7ff;
              .badge-label { background-color: #1890ff; }
              .badge-text { color: #003a8c; }
            }
            
            &.student {
              background-color: #f6ffed;
              .badge-label { background-color: #52c41a; }
              .badge-text { color: #135200; }
            }
          }
        }
      }
    }
  }
}



// 月份选择器弹窗样式
.month-picker-container {
  background-color: #fff;
  border-radius: 24rpx 24rpx 0 0;
  
  .picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx 32rpx;
    border-bottom: 1rpx solid $uni-border-color-light;
    
    .picker-cancel {
      font-size: 28rpx;
      color: $uni-text-color-secondary;
    }
    
    .picker-title {
      font-size: 32rpx;
      font-weight: 500;
      color: $uni-text-color;
    }
    
    .picker-confirm {
      font-size: 28rpx;
      color: $uni-color-primary;
    }
  }
}

</style>