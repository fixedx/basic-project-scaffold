<template>
  <view class="page">
    <view class="page-bg"></view>
    
    <!-- 加载状态 -->
    <view class="loading-container" v-if="loading">
      <Loading text="正在获取签到信息..." />
    </view>

    <!-- 空状态 -->
    <view class="empty-container" v-else-if="!bookings || bookings.length === 0">
      <view class="empty-content">
        <view class="empty-icon-box">
          <text class="iconfont icon-calendar"></text>
        </view>
        <text class="empty-title">今日无课</text>
        <text class="empty-desc">您暂时没有需要签到的课程</text>
        <wd-button custom-class="explore-btn" type="primary" size="medium" @click="goCourseList">浏览精彩课程</wd-button>
      </view>
    </view>

    <!-- 签到卡片轮播 -->
    <view class="swiper-container" v-else>
      <!-- 课程切换 -->
      <view v-if="courseList.length > 1" class="course-selector" @click="showCourseSheet = true">
        <view class="selector-inner">
          <text class="selector-label">{{ selectedCourseName }}</text>
          <text class="selector-arrow">▾</text>
        </view>
      </view>

      <!-- 筛选后无结果 -->
      <view v-if="filteredBookings.length === 0" class="empty-filter">
        <text class="iconfont icon-calendar"></text>
        <text class="empty-filter-text">该课程暂无签到记录</text>
      </view>

      <template v-else>
      <swiper
        class="card-swiper"
        :current="currentIndex"
        @change="onSwiperChange"
        previous-margin="40rpx"
        next-margin="40rpx"
        circular
      >
        <swiper-item v-for="(booking, index) in filteredBookings" :key="booking.id" class="card-swiper-item">
          <view class="check-in-card" :class="{ 'active': currentIndex === index }">
            
            <!-- 卡片头部：课程信息 -->
            <view class="card-header">
              <view class="header-top">
                <view class="institution-tag">
                  <text class="iconfont icon-store"></text>
                  <text>{{ booking.institution?.name || '机构名称' }}</text>
                </view>
                <view class="status-tag" :class="getCardStatusClass(booking)">
                  {{ getCardStatusText(booking) }}
                </view>
              </view>
              <text class="course-title">{{ booking.course?.title || '课程名称' }}</text>
              <view class="progress-box">
                 <text class="progress-text">已上 {{ booking.checkInStatus?.completed_lessons || 0 }} / {{ booking.checkInStatus?.total_lessons || 0 }} 课时</text>
                 <view class="progress-track">
                   <view class="progress-bar" :style="{ width: `${getProgressPercent(booking)}%` }"></view>
                 </view>
              </view>
            </view>

            <!-- 卡片中部：时间信息 -->
            <view class="card-body">
              <view class="time-display">
                <text class="time-big">{{ formatTimeOnly(booking) }}</text>
                <text class="date-small">{{ formatDateOnly(booking) }}</text>
              </view>
              
              <view class="countdown-tips" :class="{ 'urgent': booking.isWithin24Hours && !booking.hasCheckedIn }">
                 <text class="iconfont icon-time"></text>
                 <text>{{ getTimeToClass(booking) }}</text>
              </view>
            </view>

            <!-- 卡片底部：签到操作 -->
            <view class="card-footer">
              <!-- 签到按钮区域 -->
              <view class="check-in-action">
                <view class="check-in-btn-wrapper">
                  <view 
                    class="check-in-btn"
                    :class="{ 
                      'active': canCheckIn(booking), 
                      'checked': booking.hasCheckedIn,
                      'disabled': isOrderCompleted(booking)
                    }"
                    @click="handleCheckIn(booking)"
                  >
                    <text class="iconfont" :class="getCheckInIcon(booking)"></text>
                    <text class="btn-text">{{ getCheckInButtonText(booking) }}</text>
                  </view>
                  
                  <text class="check-in-tip" :class="{
                    'tip-checked': booking.hasCheckedIn,
                    'tip-waiting': canCheckIn(booking),
                    'tip-normal': !canCheckIn(booking) && !booking.hasCheckedIn
                  }">{{ getCheckInTipText(booking) }}</text>
                </view>
              </view>
              
              <view class="footer-tools">
                <view class="tool-item" @click="goCheckInDetail(booking)">
                  <text class="iconfont icon-list"></text>
                  <text>签到记录</text>
                </view>
                <!-- 分隔线 -->
                <view class="tool-divider" v-if="!isOrderCompleted(booking) && shouldShowMakeup(booking)"></view>
                <!-- 补卡按钮 -->
                <view class="tool-item" v-if="!isOrderCompleted(booking) && shouldShowMakeup(booking)" @click="showMakeup(booking)">
                  <text class="iconfont icon-edit"></text>
                  <text>申请补卡</text>
                </view>
              </view>
            </view>
            
          </view>
        </swiper-item>
      </swiper>
      
      <!-- 指示点 -->
      <view class="custom-indicators" v-if="filteredBookings.length > 1">
        <view 
          v-for="(_, index) in filteredBookings" 
          :key="index"
          class="indicator" 
          :class="{ active: currentIndex === index }"
          @click="swiperTo(index)"
        ></view>
      </view>
      </template>
    </view>

    <!-- 补卡弹窗 -->
    <wd-popup 
      v-model="showMakeupModal" 
      position="bottom" 
      custom-class="makeup-popup"
    >
      <view class="makeup-modal">
        <view class="modal-header">
          <text class="modal-title">申请补卡</text>
          <text class="iconfont icon-close" style="font-size: 24px; color: #999;" @click="showMakeupModal = false"></text>
        </view>
        
        <view class="modal-body">
          <view class="makeup-info" v-if="currentMakeupBooking">
             <text class="info-label">补卡课程：</text>
             <text class="info-value">{{ currentMakeupBooking.course?.title }}</text>
          </view>
          
          <view class="form-item">
            <text class="form-label">补卡日期</text>
            <view class="date-picker-box">
               <wd-datetime-picker
                v-model="makeupDate"
                type="date"
                :max-date="new Date().getTime()"
               />
            </view>
          </view>
          
          <view class="form-item">
            <text class="form-label">补卡原因</text>
            <view class="textarea-box">
              <wd-textarea 
                v-model="makeupRemark" 
                placeholder="请填写补卡原因（选填）" 
                :maxlength="100"
                auto-height
              />
            </view>
          </view>
        </view>
        
        <view class="modal-action">
          <wd-button type="primary" block size="large" @click="handleMakeup">提交申请</wd-button>
        </view>
      </view>
    </wd-popup>

    <!-- 课程选择弹窗 -->
    <wd-action-sheet 
      v-model="showCourseSheet" 
      :actions="courseActions" 
      cancel-text="取消"
      @select="handleCourseSelect"
    />

    <!-- 底部占位（为 tabbar 留空间） -->
    <view style="height: 120rpx;"></view>

    <!-- 自定义 TabBar -->
    <CustomTabbar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { checkInApi, bookingApi, homeApi, type CheckInStatus, type Booking } from '@/api'
import { showSuccessToast, showErrorToast } from '@/utils/toast'
import { getToken } from '@/utils/auth'
import AsyncImage from '@/components/AsyncImage/index.vue'
import Loading from '@/components/Loading/index.vue'
import CustomTabbar from '@/components/CustomTabbar/index.vue'

// 扩展预约类型，包含签到状态和上课时间
interface BookingWithCheckIn extends Booking {
  checkInStatus?: CheckInStatus
  hasCheckedIn?: boolean    // 这节课是否已签到（预约级别）
  scheduleStartTime?: Date  // 排课开始时间
  isWithin24Hours?: boolean // 是否在24小时内
  order_id?: string         // 关联订单ID
  course?: any
  institution?: any
  schedule?: any
}

// 登录状态
const isLoggedIn = computed(() => !!getToken())

// 开发模式（跳过24小时限制）
const isDevelopment = ref(false)
// 配置是否已加载完成
const configLoaded = ref(false)

// 数据状态
const loading = ref(false)
const bookings = ref<BookingWithCheckIn[]>([])
const currentIndex = ref(0)
const selectedCourseId = ref('')
const showCourseSheet = ref(false)

// 从预约中提取课程列表（去重）
const courseList = computed(() => {
  const courseMap = new Map<string, { id: string; title: string; count: number }>()
  for (const b of bookings.value) {
    const courseId = b.course_id || b.course?.id || ''
    const courseTitle = b.course?.title || '未知课程'
    if (courseId && !courseMap.has(courseId)) {
      courseMap.set(courseId, { id: courseId, title: courseTitle, count: 0 })
    }
    if (courseId) {
      courseMap.get(courseId)!.count++
    }
  }
  return Array.from(courseMap.values())
})

// 按选中课程过滤预约
const filteredBookings = computed(() => {
  if (!selectedCourseId.value) return bookings.value
  return bookings.value.filter(b => {
    const courseId = b.course_id || b.course?.id || ''
    return courseId === selectedCourseId.value
  })
})

// 切换课程
const switchCourse = (courseId: string) => {
  selectedCourseId.value = courseId
  currentIndex.value = 0
}

// 当前选中课程名称
const selectedCourseName = computed(() => {
  if (!selectedCourseId.value) return `全部课程 (${bookings.value.length})`
  const course = courseList.value.find(c => c.id === selectedCourseId.value)
  return course ? `${course.title} (${course.count})` : '全部课程'
})

// ActionSheet 选项
const courseActions = computed(() => {
  const actions: any[] = [
    { name: `全部课程 (${bookings.value.length})`, courseId: '' }
  ]
  for (const course of courseList.value) {
    actions.push({ name: `${course.title} (${course.count})`, courseId: course.id })
  }
  return actions
})

// 选择课程
const handleCourseSelect = ({ item, index }: any) => {
  switchCourse(item.courseId ?? '')
}

// 时间显示
const currentTime = ref('')
const currentDate = ref('')
let timeInterval: any = null

// 补卡弹窗
const showMakeupModal = ref(false)
const makeupDate = ref(new Date().getTime())
const makeupRemark = ref('')
const currentMakeupBooking = ref<BookingWithCheckIn | null>(null)

// 当前选中的预约
const currentBooking = computed(() => {
  return bookings.value[currentIndex.value] || null
})

// 计算进度百分比
const getProgressPercent = (booking: BookingWithCheckIn) => {
  if (!booking.checkInStatus) return 0
  const total = booking.checkInStatus.total_lessons || 1
  const completed = booking.checkInStatus.completed_lessons || 0
  return Math.min(100, Math.round((completed / total) * 100))
}

// 判断是否完成
const isOrderCompleted = (booking: BookingWithCheckIn): boolean => {
  const status = booking.checkInStatus
  if (!status) return false
  return status.completed_lessons >= status.total_lessons
}

// 判断这节课是否需要显示补卡按钮
// 条件：上课时间已过 && 这节课没有签到 && 订单未完成
const shouldShowMakeup = (booking: BookingWithCheckIn): boolean => {
  // 已完成的订单不需要补卡
  if (isOrderCompleted(booking)) return false
  
  // 这节课已签到，不需要补卡
  if (booking.hasCheckedIn) return false
  
  // 检查上课时间是否已过
  if (!booking.scheduleStartTime) return false
  
  const now = new Date()
  const scheduleTime = booking.scheduleStartTime
  
  // 上课时间还没到，不需要补卡
  if (scheduleTime > now) return false
  
  // 上课时间已过但没签到，显示补卡按钮
  return true
}

// 判断是否可以签到（24小时内）
const canCheckIn = (booking: BookingWithCheckIn): boolean => {
  // 已完成不能签到
  if (isOrderCompleted(booking)) return false
  // 这节课已签到不能再签
  if (booking.hasCheckedIn) return false
  // 必须在24小时内
  return booking.isWithin24Hours === true
}

// 获取签到按钮文本
const getCheckInButtonText = (booking: BookingWithCheckIn): string => {
  if (isOrderCompleted(booking)) return '已完成'
  if (booking.hasCheckedIn) return '已签到'
  if (!booking.isWithin24Hours) return '未到签到时间'
  return '签到/打卡'
}

// 获取签到图标
const getCheckInIcon = (booking: BookingWithCheckIn): string => {
  if (isOrderCompleted(booking)) return 'icon-success-fill'
  if (booking.hasCheckedIn) return 'icon-success-fill'
  if (!booking.isWithin24Hours) return 'icon-time'
  return 'icon-sign-board'
}

const getCardStatusClass = (booking: BookingWithCheckIn) => {
  if (booking.hasCheckedIn) return 'status-checked'
  if (booking.status === 'cancelled') return 'status-cancelled'
  if (booking.isWithin24Hours) return 'status-active'
  return 'status-upcoming'
}

const getCardStatusText = (booking: BookingWithCheckIn) => {
  if (booking.hasCheckedIn) return '已签到'
  if (booking.status === 'cancelled') return '已取消'
  if (booking.isWithin24Hours) return '待签到'
  return '未开始'
}

const formatTimeOnly = (booking: BookingWithCheckIn) => {
  if (!booking.schedule?.start_time || !booking.schedule?.end_time) return ''
  const start = new Date(booking.schedule.start_time)
  const end = new Date(booking.schedule.end_time)
  const format = (d: Date) => {
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }
  return `${format(start)} - ${format(end)}`
}

const formatDateOnly = (booking: BookingWithCheckIn) => {
  if (!booking.schedule?.start_time) return ''
  const d = new Date(booking.schedule.start_time)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${month}月${day}日 ${weekDays[d.getDay()]}`
}

const getTimeToClass = (booking: BookingWithCheckIn) => {
  if (!booking.schedule?.start_time) return ''
  const now = new Date()
  const start = new Date(booking.schedule.start_time)
  const diffMs = start.getTime() - now.getTime()
  
  if (diffMs < 0) return '上课中 / 已结束'
  
  const diffHours = diffMs / (1000 * 60 * 60)
  if (diffHours < 1) {
    return `还有 ${Math.ceil(diffHours * 60)} 分钟上课`
  } else if (diffHours < 24) {
    return `还有 ${Math.floor(diffHours)} 小时上课`
  } else {
    const days = Math.floor(diffHours / 24)
    return `还有 ${days} 天上课`
  }
}

const getCheckInTipText = (booking: BookingWithCheckIn) => {
  if (booking.hasCheckedIn) return ''
  if (canCheckIn(booking)) return '现在可以签到打卡'
  return '上课前24小时开放签到'
}

// 格式化上课时间
const formatScheduleTime = (booking: BookingWithCheckIn): string => {
  if (!booking.schedule?.start_time) return ''
  const startTime = new Date(booking.schedule.start_time)
  const endTime = booking.schedule?.end_time ? new Date(booking.schedule.end_time) : null
  
  const formatTime = (d: Date) => {
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }
  
  const formatDate = (d: Date) => {
    const month = d.getMonth() + 1
    const day = d.getDate()
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${month}月${day}日 ${weekDays[d.getDay()]}`
  }
  
  if (endTime) {
    return `${formatDate(startTime)} ${formatTime(startTime)}-${formatTime(endTime)}`
  }
  return `${formatDate(startTime)} ${formatTime(startTime)}`
}

// 更新时间
const updateTime = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}:${seconds}`
  
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  currentDate.value = `${year}年${month}月${day}日 ${weekDays[now.getDay()]}`
}

// 加载需要签到的预约（已确认状态的预约）
const loadBookings = async () => {
  // 未登录直接跳转登录页
  if (!isLoggedIn.value) {
    uni.navigateTo({
      url: '/pages/login/index'
    })
    return
  }
  
  loading.value = true
  try {
    // 获取已确认的预约
    const res = await bookingApi.getMyList({ status: 'confirmed', pageSize: 50 })
    const allBookings = Array.isArray(res) ? res : (res.data || [])
    // 过滤掉已退款/已取消的（order_id 为空说明对应订单已退款或取消）
    const bookingList = allBookings.filter((b: any) => b.order_id)
    
    const now = new Date()
    
    // 收集所有预约ID和订单ID
    const bookingIds = bookingList.map((b: any) => b.id).filter(Boolean)
    const orderIds = [...new Set(bookingList.map((b: any) => b.order_id).filter(Boolean))]
    
    // 批量查询预约级别的签到状态
    let bookingStatusMap: Record<string, boolean> = {}
    if (bookingIds.length > 0) {
      try {
        bookingStatusMap = await checkInApi.batchGetBookingStatus(bookingIds)
      } catch (e) {
        console.error('批量获取预约签到状态失败', e)
      }
    }
    
    // 批量查询订单级别的签到状态（用于显示进度）
    const orderStatusMap: Record<string, any> = {}
    for (const orderId of orderIds) {
      try {
        const status = await checkInApi.getOrderStatus(orderId)
        orderStatusMap[orderId] = status
      } catch (e) {
        console.error(`获取订单 ${orderId} 签到状态失败`, e)
      }
    }
    
    // 处理每个预约
    const processedBookings: BookingWithCheckIn[] = bookingList.map((booking: any) => {
      const processed: BookingWithCheckIn = { ...booking }
      
      // 获取排课开始时间
      if (booking.schedule?.start_time) {
        processed.scheduleStartTime = new Date(booking.schedule.start_time)
        const startTime = processed.scheduleStartTime
        const hoursUntilClass = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
        // 开发模式下跳过24小时限制
        processed.isWithin24Hours = isDevelopment.value || hoursUntilClass <= 24
      } else {
        processed.isWithin24Hours = true
      }
      
      // 设置预约级别的签到状态
      processed.hasCheckedIn = bookingStatusMap[booking.id] || false
      
      // 设置订单级别的签到状态（用于显示进度）
      if (booking.order_id && orderStatusMap[booking.order_id]) {
        processed.checkInStatus = orderStatusMap[booking.order_id]
      }
      
      return processed
    })
    
    // 按上课时间排序（最近的排在前面）
    processedBookings.sort((a, b) => {
      const timeA = a.scheduleStartTime?.getTime() || 0
      const timeB = b.scheduleStartTime?.getTime() || 0
      return timeA - timeB
    })
    
    bookings.value = processedBookings
    
    // 默认定位到第一个需要签到的预约（未签到且可以签到的）
    const firstNeedCheckInIndex = processedBookings.findIndex(
      b => !b.hasCheckedIn && b.isWithin24Hours && !isOrderCompleted(b)
    )
    if (firstNeedCheckInIndex >= 0) {
      currentIndex.value = firstNeedCheckInIndex
    } else {
      // 没有需要签到的，定位到第一个未签到的
      const firstUncheckedIndex = processedBookings.findIndex(b => !b.hasCheckedIn)
      currentIndex.value = firstUncheckedIndex >= 0 ? firstUncheckedIndex : 0
    }
    
  } catch (error: any) {
    console.error('加载预约失败', error)
    showErrorToast(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// Swiper 切换
const onSwiperChange = (e: any) => {
  currentIndex.value = e.detail.current
}

const swiperTo = (index: number) => {
  currentIndex.value = index
}

// 签到
const handleCheckIn = async (booking: BookingWithCheckIn) => {
  // 不可签到状态，不处理
  if (!canCheckIn(booking)) {
    if (!booking.isWithin24Hours) {
      showErrorToast('还未到签到时间，请在上课前24小时内签到')
    }
    return
  }
  
  if (!booking.order_id) {
    showErrorToast('订单信息不完整')
    return
  }
  
  try {
    // 获取当前位置（可选）
    let latitude: number | undefined
    let longitude: number | undefined
    
    try {
      const location = await new Promise<UniApp.GetLocationSuccess>((resolve, reject) => {
        uni.getLocation({
          type: 'gcj02',
          success: resolve,
          fail: reject
        })
      })
      latitude = location.latitude
      longitude = location.longitude
    } catch (e) {
      console.log('获取位置失败，继续签到', e)
    }
    
    // 执行签到
    await checkInApi.checkIn({
      order_id: booking.order_id,
      booking_id: booking.id,
      schedule_id: booking.schedule_id,
      latitude,
      longitude
    })
    
    showSuccessToast('签到成功！')
    
    // 更新当前预约的签到状态
    booking.hasCheckedIn = true
    
    // 刷新订单级别的签到状态（用于更新进度）
    if (booking.order_id) {
      const newStatus = await checkInApi.getOrderStatus(booking.order_id)
      // 同步更新所有相同 order_id 的 booking 的进度
      bookings.value.forEach(b => {
        if (b.order_id === booking.order_id) {
          b.checkInStatus = newStatus
        }
      })
    }
    
  } catch (error: any) {
    showErrorToast(error.message || '签到失败')
  }
}

// 显示补卡弹窗
const showMakeup = (booking: BookingWithCheckIn) => {
  currentMakeupBooking.value = booking
  makeupDate.value = new Date().getTime()
  makeupRemark.value = ''
  showMakeupModal.value = true
}

// 补卡
const handleMakeup = async () => {
  if (!currentMakeupBooking.value || !currentMakeupBooking.value.order_id) return
  
  try {
    const date = new Date(makeupDate.value)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    
    await checkInApi.makeupCheckIn({
      order_id: currentMakeupBooking.value.order_id,
      makeup_date: dateStr,
      remark: makeupRemark.value || undefined
    })
    
    showSuccessToast('补卡成功！')
    showMakeupModal.value = false
    
    // 刷新签到状态 - 同步更新所有相同 order_id 的 booking
    if (currentMakeupBooking.value.order_id) {
      const orderId = currentMakeupBooking.value.order_id
      const newStatus = await checkInApi.getOrderStatus(orderId)
      bookings.value.forEach(b => {
        if (b.order_id === orderId) {
          b.checkInStatus = newStatus
        }
      })
    }
    
  } catch (error: any) {
    showErrorToast(error.message || '补卡失败')
  }
}

// 跳转到签到记录页面
const goCheckInDetail = (booking: BookingWithCheckIn) => {
  if (!booking.order_id) {
    showErrorToast('订单信息不完整')
    return
  }
  
  const courseTitle = encodeURIComponent(booking.course?.title || '')
  const institutionName = encodeURIComponent(booking.institution?.name || '')
  const completedLessons = booking.checkInStatus?.completed_lessons || 0
  const totalLessons = booking.checkInStatus?.total_lessons || 0
  
  uni.navigateTo({
    url: `/pages/check-in-records/index?orderId=${booking.order_id}&courseTitle=${courseTitle}&institutionName=${institutionName}&completedLessons=${completedLessons}&totalLessons=${totalLessons}`
  })
}

// 跳转课程列表
const goCourseList = () => {
  uni.navigateTo({
    url: '/pages/course-list/index'
  })
}

// 加载应用配置
const loadConfig = async () => {
  try {
    const config = await homeApi.getConfig()
    isDevelopment.value = config.isDevelopment
  } catch (e) {
    // 配置加载失败，默认为生产模式
    isDevelopment.value = false
  } finally {
    configLoaded.value = true
  }
}

// 页面显示时刷新数据
onShow(async () => {
  uni.hideTabBar({ animation: false })
  // 确保配置已加载
  if (!configLoaded.value) {
    await loadConfig()
  }
  loadBookings()
})

// 下拉刷新
onPullDownRefresh(async () => {
  await loadBookings()
  uni.stopPullDownRefresh()
})

onMounted(async () => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
  // 加载配置（判断是否为开发模式）
  await loadConfig()
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background-color: #F5F5F5;
}

.page-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

// 加载/空状态
.loading-container, .empty-container {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80vh;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  
  .empty-icon-box {
    width: 200rpx;
    height: 200rpx;
    background: #FFFFFF;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 32rpx;
    box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.05);
    
    .iconfont {
      font-size: 80rpx;
      color: #BFBFBF;
    }
  }
  
  .empty-title {
    font-size: 32rpx;
    font-weight: 600;
    color: $uni-text-color;
    margin-bottom: 12rpx;
  }
  
  .empty-desc {
    font-size: 28rpx;
    color: $uni-text-color-tertiary;
    margin-bottom: 48rpx;
  }
}

// Swiper 容器
.swiper-container {
  position: relative;
  z-index: 10;
  height: calc(100vh - 88rpx - var(--status-bar-height, 0));
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-swiper {
  height: 85vh;
  max-height: 1100rpx;
}

.card-swiper-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 0;
}

// 签到卡片
.check-in-card {
  width: 100%;
  height: 100%;
  background: #FFFFFF;
  border-radius: 32rpx;
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
  transform: scale(0.95);
  opacity: 0.8;
  
  &.active {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 24rpx 64rpx rgba(0, 0, 0, 0.12);
  }
  
  // 卡片头部
  .card-header {
    padding: 40rpx;
    background: linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 100%);
    
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24rpx;
      
      .institution-tag {
        display: flex;
        align-items: center;
        gap: 8rpx;
        padding: 8rpx 16rpx;
        background: rgba(255,255,255,0.8);
        border-radius: 100rpx;
        font-size: 24rpx;
        color: $uni-color-primary;
        font-weight: 500;
        
        .iconfont {
          font-size: 28rpx;
        }
      }
      
      .status-tag {
        font-size: 24rpx;
        font-weight: 600;
        padding: 4rpx 16rpx;
        border-radius: 8rpx;
        
        &.status-active { color: $uni-color-primary; background: rgba($uni-color-primary, 0.1); }
        &.status-upcoming { color: $uni-color-warning; background: rgba($uni-color-warning, 0.1); }
        &.status-checked { color: $uni-color-success; background: rgba($uni-color-success, 0.1); }
        &.status-cancelled { color: $uni-text-color-disable; background: #F5F5F5; }
        &.status-completed { color: $uni-text-color-tertiary; background: #F5F5F5; }
        &.status-finished { color: $uni-text-color-tertiary; background: #F5F5F5; }
      }
    }
    
    .course-title {
      font-size: 40rpx;
      font-weight: bold;
      color: $uni-text-color;
      line-height: 1.4;
      margin-bottom: 24rpx;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .progress-box {
       .progress-text {
         font-size: 24rpx;
         color: $uni-text-color-tertiary;
         margin-bottom: 12rpx;
         display: block;
       }
       
       .progress-track {
         height: 8rpx;
         background: #F0F0F0;
         border-radius: 4rpx;
         overflow: hidden;
         
         .progress-bar {
           height: 100%;
           background: $uni-color-primary;
           border-radius: 4rpx;
           transition: width 0.3s ease;
         }
       }
    }
  }
  
  // 卡片主体
  .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 0 40rpx;
    
    .time-display {
      text-align: center;
      margin-bottom: 48rpx;
      
      .time-big {
        display: block;
        font-size: 64rpx;
        font-weight: bold;
        color: $uni-text-color;
        margin-bottom: 12rpx;
        letter-spacing: 2rpx;
      }
      
      .date-small {
        font-size: 28rpx;
        color: $uni-text-color-secondary;
      }
    }
    
    .countdown-tips {
      display: flex;
      align-items: center;
      gap: 12rpx;
      padding: 16rpx 32rpx;
      background: #F9F9F9;
      border-radius: 100rpx;
      
      .iconfont {
        font-size: 32rpx;
        color: $uni-text-color-tertiary;
      }
      
      text {
        font-size: 28rpx;
        color: $uni-text-color-secondary;
      }
      
      &.urgent {
        background: rgba($uni-color-warning, 0.1);
        
        .iconfont, text {
          color: $uni-color-warning;
        }
      }
    }
  }
  
  // 卡片底部
  .card-footer {
    padding: 40rpx;
    border-top: 1rpx solid #F5F5F5;
    
    .check-in-action {
        display: flex;
        flex-direction: column;
        align-items: center;
        
        .check-in-btn-wrapper {
            margin-bottom: 40rpx;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            
            .check-in-btn {
              width: 200rpx;
              height: 200rpx;
              border-radius: 50%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 8rpx;
              background: #E8E8E8;
              color: #999;
              box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.1);
              transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
              
              .iconfont {
                font-size: 56rpx;
              }
              
              .btn-text {
                font-size: 28rpx;
                font-weight: 600;
              }
              
              &.active {
                background: linear-gradient(135deg, $uni-color-primary 0%, #7CE45F 100%);
                color: #FFF;
                box-shadow: 0 16rpx 48rpx rgba($uni-color-primary, 0.3);
                transform: translateY(-4rpx);
                
                &:active {
                   transform: translateY(0) scale(0.95);
                   box-shadow: 0 8rpx 24rpx rgba($uni-color-primary, 0.3);
                }
              }
              
              &.checked {
                background: #F0F9FF;
                color: $uni-color-primary;
                box-shadow: none;
                border: 2rpx solid rgba($uni-color-primary, 0.1);
              }
              
              &.disabled {
                  opacity: 0.6;
                  cursor: not-allowed;
              }
            }
            
            .check-in-tip {
              display: block;
              text-align: center;
              font-size: 24rpx;
              color: $uni-text-color-tertiary;
              margin-top: 24rpx;
            }
        }
    }
    
    .footer-tools {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 32rpx;
      
      .tool-item {
        display: flex;
        align-items: center;
        gap: 8rpx;
        padding: 12rpx 24rpx;
        
        .iconfont {
          font-size: 32rpx;
          color: $uni-text-color-secondary;
        }
        
        text {
          font-size: 26rpx;
          color: $uni-text-color-secondary;
        }
      }
      
      .tool-divider {
        width: 1rpx;
        height: 24rpx;
        background: $uni-border-color-light;
      }
    }
  }
}

// 课程切换选择器
.course-selector {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: center;
  margin: 0 24rpx 24rpx;
  
  .selector-inner {
    display: inline-flex;
    align-items: center;
    gap: 8rpx;
    padding: 16rpx 32rpx;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 100rpx;
    backdrop-filter: blur(10px);
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  }
  
  .selector-label {
    font-size: 28rpx;
    font-weight: 500;
    color: $uni-text-color;
  }
  
  .selector-arrow {
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
    margin-left: 4rpx;
  }
}

// 筛选后无结果
.empty-filter {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  
  .iconfont {
    font-size: 80rpx;
    color: #BFBFBF;
    margin-bottom: 24rpx;
  }
  
  .empty-filter-text {
    font-size: 28rpx;
    color: $uni-text-color-tertiary;
  }
}

// 指示点
.custom-indicators {
  display: flex;
  justify-content: center;
  gap: 12rpx;
  margin-top: 32rpx;
  
  .indicator {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    background: #E0E0E0;
    transition: all 0.3s;
    
    &.active {
      width: 32rpx;
      border-radius: 100rpx;
      background: $uni-color-primary;
    }
  }
}

// 补卡弹窗
.makeup-modal {
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  overflow: hidden;
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 32rpx 40rpx;
    border-bottom: 1rpx solid #F5F5F5;
    
    .modal-title {
      font-size: 32rpx;
      font-weight: 600;
      color: $uni-text-color;
    }
    
    .modal-close {
      font-size: 32rpx;
      color: $uni-text-color-tertiary;
      padding: 10rpx;
    }
  }
  
  .modal-body {
    padding: 40rpx;
    
    .makeup-info {
        display: flex;
        font-size: 28rpx;
        margin-bottom: 40rpx;
        padding: 24rpx;
        background: #F9F9F9;
        border-radius: 12rpx;
        
        .info-label {
            color: $uni-text-color-secondary;
        }
        
        .info-value {
            font-weight: 500;
            color: $uni-text-color;
            flex: 1;
        }
    }
    
    .form-item {
        margin-bottom: 40rpx;
        
        .form-label {
            display: block;
            font-size: 28rpx;
            font-weight: 500;
            color: $uni-text-color;
            margin-bottom: 16rpx;
        }
    }
  }
  
  .modal-action {
    padding: 20rpx 40rpx 60rpx;
  }
}

:deep(.makeup-popup) {
  border-radius: 32rpx 32rpx 0 0;
}
</style>
