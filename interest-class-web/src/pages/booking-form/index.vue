<template>
  <view class="page">
    <!-- 加载状态 -->
    <view class="loading-state" v-if="loading">
      <Loading text="加载中..." />
    </view>

    <view class="form-container" v-else-if="course">
      <!-- 课程信息卡片 -->
      <view class="course-card">
        <view class="course-info">
          <text class="course-title">{{ course.title }}</text>
          <text class="course-type">
            {{ course.type === 'trial' ? '试听课' : '正式课' }}
          </text>
          <view class="course-meta" v-if="selectedSku">
            <text class="sku-name">{{ selectedSku.name }}</text>
            <text class="sku-price">￥{{ selectedSku.total_price }}</text>
          </view>
          <!-- 返现和立减标签（体验课不显示） -->
          <view class="cashback-tags" v-if="course.type !== 'trial' && skuCashbackAmount > 0">
            <text class="cashback-tag orange" v-if="skuDiscountAmount > 0">立减¥{{ skuDiscountAmount }}</text>
            <text class="cashback-tag red">最高返现¥{{ skuCashbackAmount }}</text>
          </view>
        </view>
      </view>

      <!-- 机构信息 -->
      <view class="section" v-if="course.institution">
        <view class="section-title">上课地点</view>
        <view class="institution-info">
          <text class="iconfont icon-location"></text>
          <view class="institution-text">
            <text class="name">{{ course.institution.name }}</text>
            <text class="address">{{ course.institution.address }}</text>
          </view>
        </view>
      </view>

      <!-- 选择宝贝 -->
      <view class="section">
        <view class="section-header">
          <view class="section-title">选择宝贝</view>
          <view class="add-child-btn" @click="goToAddChild">
            <text class="iconfont icon-add"></text>
            <text>添加宝贝</text>
          </view>
        </view>
        
        <!-- 无宝贝提示 -->
        <view class="no-child" v-if="!loadingChildren && children.length === 0">
          <text class="iconfont icon-customer"></text>
          <text class="no-child-text">暂无宝贝信息</text>
          <wd-button type="primary" size="small" @click="goToAddChild">
            添加宝贝
          </wd-button>
        </view>
        
        <!-- 宝贝列表 -->
        <view class="child-list" v-else>
          <view
            class="child-item"
            :class="{ active: selectedChildId === child.id }"
            v-for="child in children"
            :key="child.id"
            @click="selectedChildId = child.id"
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
              <view class="child-name-row">
                <text class="child-name">{{ child.name }}</text>
                <text class="child-gender" :class="child.gender">
                  {{ child.gender === 'male' ? '♂' : '♀' }}
                </text>
              </view>
              <text class="child-age" v-if="child.age">{{ child.age }}岁</text>
            </view>
            <view class="check-icon">
              <text class="iconfont icon-check"></text>
            </view>
          </view>
        </view>
        
        <!-- 已选宝贝信息 -->
        <view class="selected-child-info" v-if="selectedChild">
          <view class="info-row" v-if="selectedChild.phone">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ selectedChild.phone }}</text>
          </view>
          <view class="info-row" v-if="selectedChild.interests && selectedChild.interests.length > 0">
            <text class="info-label">兴趣爱好</text>
            <text class="info-value">{{ selectedChild.interests.join('、') }}</text>
          </view>
        </view>
      </view>

      <!-- 预约信息 -->
      <view class="section">
        <view class="section-title">预约信息</view>
        
        <!-- 排课选择 -->
        <view class="form-group" v-if="schedules.length > 0">
          <view class="form-label-row">
            <text class="form-label">选择上课时段</text>
            <text class="form-hint">可多选</text>
          </view>
          <view class="selected-count" v-if="selectedScheduleIds.length > 0">
            已选 {{ selectedScheduleIds.length }} 个时段
          </view>
          <view class="schedule-list">
            <view
              class="schedule-item"
              :class="{ active: selectedScheduleIds.includes(schedule.id) }"
              v-for="schedule in sortedSchedules"
              :key="schedule.id"
              @click="selectSchedule(schedule.id)"
            >
              <view class="schedule-main">
                <view class="schedule-time">
                  <text class="day">{{ getDayOfWeekLabel(schedule.day_of_week) }}</text>
                  <text class="time">{{ formatTimeRange(schedule.start_time, schedule.end_time) }}</text>
                </view>
                <view class="schedule-info">
                  <view class="info-tag" v-if="schedule.teacher">
                    <text class="iconfont icon-customer"></text>
                    {{ schedule.teacher.name }}
                  </view>
                  <view class="info-tag" v-if="schedule.classroom">
                    <text class="iconfont icon-location"></text>
                    {{ schedule.classroom.name }}
                  </view>
                </view>
              </view>
              <view class="schedule-meta">
                <text class="spots">
                  剩余{{ schedule.max_students - schedule.booked_count }}位
                </text>
                <view class="check-icon">
                  <text class="iconfont icon-check"></text>
                </view>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 无排课提示 -->
        <view class="no-schedule" v-else>
          <text class="iconfont icon-calendar" style="font-size: 80rpx; color: #d9d9d9;"></text>
          <text class="no-schedule-text">暂无可预约时段</text>
          <text class="no-schedule-hint">请稍后再试或联系机构咨询</text>
        </view>

        <view class="form-group">
          <view class="form-label">备注</view>
          <wd-textarea
            v-model="form.remark"
            placeholder="请输入备注信息（选填）"
            :maxlength="200"
            show-word-limit
          />
        </view>
      </view>

      <!-- 优惠与抵扣（体验课/试听类SKU不展示邀请码） -->
      <view class="section" v-if="course?.type !== 'trial' && !isTrialSku">
        <view class="section-title">优惠与抵扣</view>
        
        <!-- 邀请码输入 -->
        <view class="form-group invite-group">
          <!-- 优惠与权益 label 已移除 -->
          
          <view class="invite-section">
            <!-- 邀请码操作区 -->
            <view class="invite-header">
              <view class="left-col" v-if="inviteValidated">
                <text class="tag">已减￥{{ formatPrice(inviteDiscount) }}</text>
              </view>
              
              <!-- 验证后状态 -->
              <view class="action-row" v-if="inviteValidated">
                <view class="code-badge">
                  <text class="code">{{ inviteCode }}</text>
                  <view class="remove-btn" @click.stop="clearInviteCode">
                    <text class="iconfont icon-close"></text>
                  </view>
                </view>
              </view>
              
              <!-- 未验证状态 -->
              <view class="action-row" v-else>
                <view class="input-trigger" @click.stop="() => {}">
                   <input 
                      class="code-input" 
                      v-model="inviteCode" 
                      placeholder="如有邀请码，请输入" 
                      confirm-type="search"
                      @confirm="handleValidateInvite"
                    />
                    <view class="btn-verify" @click.stop="handleValidateInvite" v-if="inviteCode">验证</view>
                </view>
                <view class="divider"></view>
                <view class="btn-select" @click="goSelectInviteCode">
                   <text class="text">选择</text>
                   <text class="iconfont icon-right"></text>
                </view>
              </view>
            </view>
            
            <view class="discount-display" v-if="inviteDiscount > 0">
               <text class="tip">邀请码抵扣</text>
               <text class="amount">-￥{{ formatPrice(inviteDiscount) }}</text>
            </view>
          </view>
        </view>
        
        <!-- 余额抵扣 -->
        <view class="form-group balance-group" v-if="userBalance > 0">
          <view class="balance-row">
            <view class="balance-left">
              <text class="form-label">余额抵扣</text>
              <text class="balance-tip">可用余额 ￥{{ formatPrice(userBalance) }}</text>
            </view>
            <wd-switch :model-value="useBalance" @change="toggleBalance" />
          </view>
          <view class="balance-deduct" v-if="useBalance">
            <text class="deduct-label">本次抵扣</text>
            <text class="deduct-value">-￥{{ formatPrice(balanceDeductAmount) }}</text>
          </view>
        </view>
      </view>

      <!-- 费用明细 -->
      <view class="section" v-if="selectedSku">
        <view class="section-title">费用明细</view>
        <view class="fee-detail">
          <view class="fee-row">
            <text class="fee-label">课程总价</text>
            <text class="fee-value">￥{{ formatPrice(selectedSku.total_price) }}</text>
          </view>
          <!-- 体验课：全额线上支付 -->
          <view v-if="isTrialSku">
            <view class="fee-row" v-if="commissionAmount > 0">
              <text class="fee-label">平台服务费</text>
              <text class="fee-value">+￥{{ formatPrice(commissionAmount) }}</text>
            </view>
            <view class="fee-row" v-if="useBalance && balanceDeductAmount > 0">
              <text class="fee-label">余额抵扣</text>
              <text class="fee-value discount">-￥{{ formatPrice(balanceDeductAmount) }}</text>
            </view>
            <view class="fee-divider"></view>
            <view class="fee-row highlight">
              <text class="fee-label">线上支付</text>
              <text class="fee-value price">￥{{ formatPrice(onlinePayAmount) }}</text>
            </view>
            <view class="fee-tip">体验课需全额线上支付</view>
          </view>
          <!-- 正式课：拆分线上/线下 -->
          <view v-else>
            <view class="fee-row">
              <text class="fee-label">线上定金（{{ course.cashback_ratio || 10 }}%）</text>
              <text class="fee-value">￥{{ formatPrice(onlinePayBase) }}</text>
            </view>
            <view class="fee-row" v-if="commissionAmount > 0">
              <text class="fee-label">平台服务费</text>
              <text class="fee-value">+￥{{ formatPrice(commissionAmount) }}</text>
            </view>
            <view class="fee-row" v-if="inviteDiscount > 0">
              <text class="fee-label">邀请码优惠</text>
              <text class="fee-value discount">-￥{{ formatPrice(inviteDiscount) }}</text>
            </view>
            <view class="fee-row" v-if="useBalance && balanceDeductAmount > 0">
              <text class="fee-label">余额抵扣</text>
              <text class="fee-value discount">-￥{{ formatPrice(balanceDeductAmount) }}</text>
            </view>
            <view class="fee-divider"></view>
            <view class="fee-row highlight">
              <text class="fee-label">线上支付（定金）</text>
              <text class="fee-value price">￥{{ formatPrice(onlinePayAmount) }}</text>
            </view>
            <view class="fee-row">
              <text class="fee-label">线下支付（尾款）</text>
              <text class="fee-value">￥{{ formatPrice(offlinePayAmount) }}</text>
            </view>
            <view class="fee-tip">线上支付含定金及服务费，线下尾款请到店支付给机构</view>
          </view>
        </view>
      </view>

      <!-- 报名须知 -->
      <view class="section">
        <view class="section-title">报名须知</view>
        <view class="notice-list">
          <view class="notice-item">
            <text class="notice-icon">1</text>
            <text class="notice-text">报名成功后，请保持手机畅通，等待机构确认并通知缴费</text>
          </view>
          <view class="notice-item">
            <text class="notice-icon">2</text>
            <text class="notice-text">机构确认后可在"我的订单"中查看详情</text>
          </view>
          <view class="notice-item">
            <text class="notice-icon">3</text>
            <text class="notice-text">确认后如需调整上课时间，可在"我的预约"中修改</text>
          </view>
        </view>
      </view>

      <!-- 用户协议 -->
      <view class="agreement">
        <wd-checkbox v-model="agreed" />
        <text class="agreement-text">
          我已阅读并同意
          <text class="link" @click="showAgreement">《报名服务协议》</text>
        </text>
      </view>
    </view>

    <!-- 错误状态 -->
    <view class="error-state" v-else-if="!loading">
      <text class="iconfont icon-warning" style="font-size: 240rpx; color: #d9d9d9;"></text>
      <text class="error-text">课程不存在</text>
      <wd-button type="primary" @click="handleBack">返回</wd-button>
    </view>

    <!-- 底部操作栏 -->
    <PageFooter v-if="course">
      <view class="footer-content">
        <view class="footer-price" v-if="selectedSku">
          <view class="price-row">
            <text class="price-label">{{ isTrialSku ? '线上支付：' : '需付定金：' }}</text>
            <text class="price-value">￥{{ formatPrice(isTrialSku ? finalPrice : onlinePayAmount) }}</text>
          </view>
          <view class="price-detail" v-if="!isTrialSku">
            <text class="offline-tip">尾款 ￥{{ formatPrice(offlinePayAmount) }} 到店支付</text>
          </view>
          <view class="price-detail" v-else-if="totalDiscount > 0">
            <text class="origin-price">原价 ￥{{ formatPrice(selectedSku.total_price) }}</text>
            <text class="discount-info">已优惠 ￥{{ formatPrice(totalDiscount) }}</text>
          </view>
        </view>
        <wd-button
          type="primary"
          size="large"
          custom-class="submit-btn"
          :loading="submitting"
          @click="handleSubmit"
        >
          {{ course?.type === 'trial' ? '提交预约' : '提交报名' }}
        </wd-button>
      </view>
    </PageFooter>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { courseApi, type Course, type CourseSku } from '@/api'
import { orderApi, type OrderAmountResult } from '@/api/order'
import { childApi, type Child } from '@/api/child'
import { scheduleApi, type Schedule } from '@/api/schedule'
import { inviteApi } from '@/api/invite'
import { showErrorToast, showSuccessToast } from '@/utils/toast'
import { getToken } from '@/utils/request'
import AsyncImage from '@/components/AsyncImage/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import Loading from '@/components/Loading/index.vue'

// 页面参数
const courseId = ref('')
const skuId = ref('')

// 数据
const course = ref<Course | null>(null)
const selectedSku = ref<CourseSku | null>(null)
const loading = ref(false)
const submitting = ref(false)
const agreed = ref(false)

// 宝贝数据
const children = ref<Child[]>([])
const selectedChildId = ref('')
const loadingChildren = ref(false)

// 选中的宝贝
const selectedChild = computed(() => {
  return children.value.find(c => c.id === selectedChildId.value) || null
})

// 排课数据
const schedules = ref<Schedule[]>([])
const selectedScheduleIds = ref<string[]>([]) // 支持多选
const loadingSchedules = ref(false)

// 邀请码
const inviteCode = ref('')
const inviteValidated = ref(false)
const validatingInvite = ref(false)
const useBalance = ref(false)

// ⚠️ 所有金额由后端统一计算，前端不做任何金额计算
const amountResult = ref<OrderAmountResult>({
  is_trial: false,
  original_price: 0,
  cashback_ratio: 10,
  online_pay_base: 0,
  invite_discount: 0,
  balance_deduct: 0,
  total_discount: 0,
  online_pay_amount: 0,
  offline_pay_amount: 0,
  paid_amount: 0,
  user_balance: 0,
  max_cashback_amount: 0,
  max_discount_amount: 0,
  max_share_ratio: 50,
  commission_amount: 0,
})
const calculatingAmount = ref(false)

// 格式化价格
const formatPrice = (price: number | string) => {
  return (Number(price) || 0).toFixed(2)
}

// ===== 以下所有金额字段都来自后端计算结果 =====
const isTrialSku = computed(() => amountResult.value.is_trial)
const onlinePayBase = computed(() => amountResult.value.online_pay_base)
const balanceDeductAmount = computed(() => amountResult.value.balance_deduct)
const totalDiscount = computed(() => amountResult.value.total_discount)
const onlinePayAmount = computed(() => amountResult.value.online_pay_amount)
const offlinePayAmount = computed(() => amountResult.value.offline_pay_amount)
const commissionAmount = computed(() => amountResult.value.commission_amount)
const finalPrice = computed(() => amountResult.value.paid_amount)
const inviteDiscount = computed(() => amountResult.value.invite_discount)
const userBalance = computed(() => amountResult.value.user_balance)
const skuCashbackAmount = computed(() => amountResult.value.max_cashback_amount)
const skuDiscountAmount = computed(() => amountResult.value.max_discount_amount)

// 选中的排课列表
const selectedSchedules = computed(() => {
  return schedules.value.filter(s => selectedScheduleIds.value.includes(s.id))
})

// 星期几排序映射
const dayOfWeekOrder: Record<string, number> = {
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
  'sunday': 7,
}

// 按时间排序的排课列表
const sortedSchedules = computed(() => {
  return [...schedules.value].sort((a, b) => {
    // 先按星期几排序
    const dayA = dayOfWeekOrder[a.day_of_week?.toLowerCase()] || 0
    const dayB = dayOfWeekOrder[b.day_of_week?.toLowerCase()] || 0
    if (dayA !== dayB) return dayA - dayB
    
    // 再按开始时间排序
    const timeA = new Date(a.start_time).getTime()
    const timeB = new Date(b.start_time).getTime()
    return timeA - timeB
  })
})

// 表单数据
const form = reactive({
  remark: '',
})

onLoad((options: any) => {
  // 检查登录状态，未登录直接跳转登录页
  const token = getToken()
  if (!token) {
    // 未登录，跳转到登录页，带上来源页面
    const currentUrl = `/pages/booking-form/index?courseId=${options.courseId || ''}&skuId=${options.skuId || ''}`
    uni.redirectTo({
      url: `/pages/login/index?from=${encodeURIComponent(currentUrl)}`
    })
    return
  }
  
  if (options.courseId) {
    courseId.value = options.courseId
  }
  if (options.skuId) {
    skuId.value = options.skuId
  }
})

onMounted(() => {
  // 页面已在进入前检查过登录状态，直接加载数据
  // 金额由 loadCourseDetail 中调用 recalculateAmount 统一处理
  loadCourseDetail()
  loadSchedules()
  loadChildren()
})

// 页面显示时刷新宝贝列表（从添加宝贝页返回时）
onShow(() => {
  const token = getToken()
  if (token) {
    // 已登录，刷新宝贝列表
    loadChildren()
  }
})

// 加载宝贝列表
const loadChildren = async () => {
  loadingChildren.value = true
  try {
    const data = await childApi.getMyList()
    children.value = data
    // 默认选中第一个宝贝
    if (data.length > 0) {
      selectedChildId.value = data[0].id
    }
  } catch (error) {
    console.error('获取宝贝列表失败:', error)
  } finally {
    loadingChildren.value = false
  }
}

// 加载余额（现在由 recalculateAmount 统一处理，仅保留兼容）
const loadBalance = async () => {
  // 余额信息已由 recalculateAmount 返回，无需单独加载
}

/**
 * 调用后端统一计算金额接口
 * 在以下时机调用：
 * 1. 课程加载完成后
 * 2. 邀请码验证成功/清除后
 * 3. 余额开关切换后
 */
const recalculateAmount = async () => {
  if (!courseId.value || !skuId.value) return

  calculatingAmount.value = true
  try {
    const result = await orderApi.calculateAmount({
      course_id: courseId.value,
      sku_id: skuId.value,
      quantity: 1,
      invite_code: (!isTrialSku.value && inviteValidated.value) ? inviteCode.value.trim() : undefined,
      use_balance: useBalance.value,
    })
    amountResult.value = result
  } catch (error: any) {
    console.error('计算金额失败:', error)
  } finally {
    calculatingAmount.value = false
  }
}

// 验证邀请码
const handleValidateInvite = async () => {
  if (!inviteCode.value.trim()) {
    showErrorToast('请输入邀请码')
    return
  }
  
  if (!courseId.value) {
    showErrorToast('缺少课程信息')
    return
  }
  
  validatingInvite.value = true
  try {
    // 验证邀请码有效性
    await inviteApi.validateInviteCode(inviteCode.value.trim(), courseId.value)
    
    inviteValidated.value = true
    showSuccessToast('邀请码验证成功')
    
    // 重新调用后端计算金额（包含邀请码优惠）
    await recalculateAmount()
  } catch (error: any) {
    showErrorToast(error.message || '邀请码无效')
    inviteCode.value = ''
    inviteValidated.value = false
    // 清除邀请码后重新计算
    await recalculateAmount()
  } finally {
    validatingInvite.value = false
  }
}

// 跳转到邀请码选择页面
const goSelectInviteCode = () => {
  if (!selectedSku.value || !course.value) {
    showErrorToast('请先选择课程规格')
    return
  }
  
  const orderAmount = Number(selectedSku.value.total_price)
  const cashbackRatio = Number(course.value.cashback_ratio) || 10
  
  uni.navigateTo({
    url: `/pages/invite-code-select/index?courseId=${courseId.value}&courseName=${encodeURIComponent(course.value.title)}&orderAmount=${orderAmount}&cashbackRatio=${cashbackRatio}`,
    events: {
      // 接收选择页面返回的邀请码
      selectInviteCode: async (data: { inviteCode: string; discountAmount: number }) => {
        inviteCode.value = data.inviteCode
        inviteValidated.value = true
        // 重新调用后端计算金额（包含邀请码优惠）
        await recalculateAmount()
      }
    }
  })
}

// 清除邀请码
const clearInviteCode = async () => {
  inviteCode.value = ''
  inviteValidated.value = false
  // 清除后重新计算金额
  await recalculateAmount()
}

// 切换余额抵扣时重新计算
const toggleBalance = async ({ value }: { value: boolean }) => {
  useBalance.value = value
  await recalculateAmount()
}

// 加载课程详情
const loadCourseDetail = async () => {
  if (!courseId.value) {
    showErrorToast('缺少课程参数')
    return
  }

  loading.value = true
  try {
    const data = await courseApi.getDetail(courseId.value)
    course.value = data

    // 找到选中的 SKU
    if (skuId.value && data.skus) {
      selectedSku.value = data.skus.find((s: CourseSku) => s.id === skuId.value) || data.skus[0]
    } else if (data.skus && data.skus.length > 0) {
      selectedSku.value = data.skus[0]
    }
    
    // 确保 skuId 与 selectedSku 同步
    if (selectedSku.value) {
      skuId.value = selectedSku.value.id
    }
    
    // 课程和SKU加载完成后，调用后端计算金额
    await recalculateAmount()
  } catch (error) {
    showErrorToast('加载课程失败')
  } finally {
    loading.value = false
  }
}

// 加载排课列表
const loadSchedules = async () => {
  if (!courseId.value) return
  
  loadingSchedules.value = true
  try {
    const data = await scheduleApi.getByCourse(courseId.value)
    schedules.value = data || []
  } catch (error) {
    console.error('获取排课列表失败:', error)
  } finally {
    loadingSchedules.value = false
  }
}

// 选择/取消排课（多选）
const selectSchedule = (scheduleId: string) => {
  const index = selectedScheduleIds.value.indexOf(scheduleId)
  if (index > -1) {
    // 已选中，取消选择
    selectedScheduleIds.value.splice(index, 1)
  } else {
    // 未选中，添加选择
    selectedScheduleIds.value.push(scheduleId)
  }
}

// 格式化排课时间显示
const formatScheduleTime = (schedule: Schedule) => {
  const dateStr = dayjs(schedule.start_time).format('MM-DD')
  return `${dateStr} ${getDayOfWeekLabel(schedule.day_of_week)} ${formatTimeRange(schedule.start_time, schedule.end_time)}`
}

// 获取星期几的文字
const getDayOfWeekLabel = (day: string) => {
  const dayMap: Record<string, string> = {
    'monday': '周一',
    'tuesday': '周二',
    'wednesday': '周三',
    'thursday': '周四',
    'friday': '周五',
    'saturday': '周六',
    'sunday': '周日',
  }
  return dayMap[day?.toLowerCase()] || day
}

// 使用 dayjs 格式化时间范围
const formatTimeRange = (startTime: string, endTime: string) => {
  const start = dayjs(startTime).format('HH:mm')
  const end = dayjs(endTime).format('HH:mm')
  return `${start}-${end}`
}



// 显示协议
const showAgreement = () => {
  uni.showModal({
    title: '报名服务协议',
    content: '1. 报名成功后，请等待机构确认并通知缴费。\n2. 机构确认订单后，您可以在"我的预约"中调整上课时间。\n3. 如需退款，请在"我的订单"中申请。\n4. 报名信息仅用于课程安排，我们将严格保护您的隐私。',
    showCancel: false,
    confirmText: '我知道了',
  })
}

// 跳转添加宝贝
const goToAddChild = () => {
  uni.navigateTo({
    url: '/pages/child-edit/index',
  })
}

// 表单验证
const validateForm = () => {
  if (!selectedChild.value) {
    showErrorToast('请选择一个宝贝')
    return false
  }

  if (!agreed.value) {
    showErrorToast('请阅读并同意报名服务协议')
    return false
  }

  return true
}

// 提交报名（创建订单，同时自动创建预约）
const handleSubmit = async () => {
  if (!validateForm()) return
  if (!selectedChild.value) return

  submitting.value = true
  try {
    // 必须选择至少一个排课
    if (selectedScheduleIds.value.length === 0) {
      showErrorToast('请选择至少一个上课时段')
      return
    }
    
    // 创建订单（后端会自动创建关联的预约）
    const params = {
      course_id: courseId.value,
      sku_id: selectedSku.value?.id || '',
      quantity: 1,
      child_id: selectedChild.value.id,
      student_name: selectedChild.value.name,
      student_phone: selectedChild.value.phone || '',
      student_age: selectedChild.value.age,
      schedule_ids: selectedScheduleIds.value,
      payment_method: (isTrialSku.value ? 'wechat' : 'offline') as 'wechat' | 'offline',
      remark: form.remark.trim() || undefined,
      // 邀请码和余额抵扣（后端会重新计算金额，前端只传标记）
      invite_code: (!isTrialSku.value && inviteValidated.value) ? inviteCode.value.trim() : undefined,
      use_balance_amount: useBalance.value ? amountResult.value.balance_deduct : undefined,
    }

    const orderId = await orderApi.create(params)

    showSuccessToast('报名成功，请完成支付')

    // 跳转到支付页面
    setTimeout(() => {
      uni.redirectTo({
        url: `/pages/order-pay/index?id=${orderId}`,
      })
    }, 1500)
  } catch (error: any) {
    showErrorToast(error.message || '报名失败')
  } finally {
    submitting.value = false
  }
}

// 返回
const handleBack = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.form-container {
  padding: 24rpx 32rpx 200rpx;
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

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
  
  .error-text {
    margin: 24rpx 0 32rpx;
    color: $uni-text-color-secondary;
  }
}

// 课程卡片
.course-card {
  display: flex;
  padding: 32rpx;
  background-color: #fff;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  
  .course-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    
    .course-title {
      font-size: 34rpx;
      font-weight: 700;
      color: #1a1a1a;
      line-height: 1.4;
      margin-bottom: 8rpx;
    }
    
    .course-type {
      display: inline-block;
      align-self: flex-start;
      font-size: 22rpx;
      color: #52c41a;
      background-color: #f6ffed;
      padding: 4rpx 12rpx;
      border-radius: 6rpx;
      margin-top: 8rpx;
    }
    
    .course-meta {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 24rpx;
      padding-top: 24rpx;
      border-top: 1rpx solid #f5f5f5;
      
      .sku-name {
        font-size: 26rpx;
        color: #666;
        background-color: #f9f9f9;
        padding: 6rpx 16rpx;
        border-radius: 8rpx;
      }
      
      .sku-price {
        font-size: 36rpx;
        font-weight: 700;
        color: #ff4d4f;
        font-family: DINAlternate-Bold, sans-serif;
      }
    }
    
    .cashback-tags {
      display: flex;
      gap: 12rpx;
      margin-top: 16rpx;
      
      .cashback-tag {
        font-size: 22rpx;
        padding: 4rpx 12rpx;
        border-radius: 6rpx;
        
        &.orange {
          color: #fa8c16;
          background-color: #fff7e6;
        }
        
        &.red {
          color: #f5222d;
          background-color: #fff1f0;
        }
      }
    }
  }
}

// 区块
.section {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02);
  
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
    border-left: none; // remove old border
    
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
  
  .add-child-btn {
    display: flex;
    align-items: center;
    font-size: 26rpx;
    color: $uni-color-primary;
    
    .iconfont {
      font-size: 28rpx;
      margin-right: 8rpx;
    }
  }
}

// 无宝贝提示
.no-child {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0;
  
  .iconfont {
    font-size: 80rpx;
    color: $uni-text-color-tertiary;
    margin-bottom: 16rpx;
  }
  
  .no-child-text {
    font-size: 28rpx;
    color: $uni-text-color-secondary;
    margin-bottom: 24rpx;
  }
}

// 宝贝列表
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
  border: 1rpx solid transparent;
  transition: all 0.3s;
  
  &.active {
    background-color: #fff;
    border-color: #52c41a;
    box-shadow: 0 4rpx 16rpx rgba(82, 196, 26, 0.1);
    
    .child-info .child-name {
      color: #52c41a;
    }

    .check-icon {
      background-color: #52c41a;
      border-color: #52c41a;
      
      .iconfont {
        opacity: 1;
        transform: scale(1);
      }
    }
  }
  
  .child-info {
    flex: 1;
    margin-left: 24rpx;
    z-index: 1;
    
    .child-name-row {
      display: flex;
      align-items: center;
    }
    
    .child-name {
      font-size: 30rpx;
      font-weight: 600;
      color: #333;
      transition: color 0.3s;
    }
    
    .child-gender {
      font-size: 24rpx;
      margin-left: 12rpx;
      
      &.male {
        color: #1890ff;
      }
      
      &.female {
        color: #eb2f96;
      }
    }
    
    .child-age {
      font-size: 24rpx;
      color: #999;
      margin-top: 8rpx;
    }
  }
  
  .check-icon {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    border: 2rpx solid #d9d9d9; // 默认灰色边框
    background-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    
    .iconfont {
      font-size: 24rpx;
      color: #fff;
      opacity: 0; // 默认隐藏图标
      transform: scale(0.5);
      transition: all 0.2s;
    }
  }
}


// 已选宝贝信息
.selected-child-info {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid $uni-border-color-light;
  
  .info-row {
    display: flex;
    align-items: flex-start;
    margin-bottom: 12rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .info-label {
      width: 140rpx;
      font-size: 26rpx;
      color: $uni-text-color-secondary;
      flex-shrink: 0;
    }
    
    .info-value {
      flex: 1;
      font-size: 26rpx;
      color: $uni-text-color;
    }
  }
}

// 机构信息
.institution-info {
  display: flex;
  align-items: flex-start;
  
  .iconfont {
    font-size: 36rpx;
    color: $uni-color-primary;
    margin-right: 16rpx;
    margin-top: 4rpx;
  }
  
  .institution-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    
    .name {
      font-size: 28rpx;
      color: $uni-text-color;
      font-weight: 500;
    }
    
    .address {
      font-size: 24rpx;
      color: $uni-text-color-secondary;
      margin-top: 8rpx;
    }
  }
}

// 表单组
.form-group {
  margin-bottom: 24rpx;
  
  .form-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16rpx;
  }
  
  .form-label {
    font-size: 28rpx;
    color: $uni-text-color;
    
    &.required::before {
      content: '*';
      color: $uni-color-error;
      margin-right: 8rpx;
    }
    
    .label-hint {
      font-size: 24rpx;
      color: $uni-text-color-tertiary;
      font-weight: normal;
    }
  }
  
  .form-hint {
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
  }
  
  .selected-count {
    font-size: 24rpx;
    color: $uni-color-primary;
    margin-bottom: 12rpx;
  }
}

// 排课列表
.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

// 无排课提示
.no-schedule {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 0;
  background-color: #fafafa;
  border-radius: 12rpx;
  
  .no-schedule-text {
    font-size: 30rpx;
    color: #666;
    margin-top: 24rpx;
    font-weight: 500;
  }
  
  .no-schedule-hint {
    font-size: 24rpx;
    color: #999;
    margin-top: 12rpx;
  }
}

.schedule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  background-color: #f7f8fa;
  border-radius: 16rpx;
  border: 1rpx solid transparent;
  transition: all 0.3s;
  
  &.active {
    background-color: #fff;
    border-color: #52c41a;
    box-shadow: 0 4rpx 16rpx rgba(82, 196, 26, 0.1);
    
    .schedule-main .schedule-time .day,
    .schedule-main .schedule-time .time {
      color: #52c41a;
    }

    .check-icon {
      background-color: #52c41a;
      border-color: #52c41a;
      
      .iconfont {
        opacity: 1;
        transform: scale(1);
      }
    }
  }
  
  .schedule-main {
    flex: 1;
    z-index: 1;
    
    .schedule-time {
      display: flex;
      align-items: baseline;
      margin-bottom: 12rpx;
      
      .day {
        font-size: 30rpx;
        font-weight: 700;
        color: #333;
        margin-right: 16rpx;
        transition: color 0.3s;
      }
      
      .time {
        font-size: 34rpx;
        color: #333;
        font-family: DINAlternate-Bold, sans-serif;
        font-weight: 700;
        transition: color 0.3s;
      }
    }
    
    .schedule-info {
      display: flex;
      flex-wrap: wrap;
      gap: 16rpx;
      
      .info-tag {
        display: inline-flex;
        align-items: center;
        height: 48rpx;
        padding: 0 16rpx;
        font-size: 24rpx;
        color: #666;
        background-color: #fff;
        border-radius: 8rpx;
        border: 1rpx solid #e8e8e8;
        
        .iconfont {
          font-size: 24rpx;
          margin-right: 8rpx;
          color: #999;
        }
      }
    }
  }
  
  .schedule-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12rpx;
    padding-left: 32rpx;
    margin-left: 0; 
    
    .spots {
      font-size: 22rpx;
      color: #faad14;
      font-weight: 500;
      background-color: #fffbe6;
      padding: 6rpx 16rpx;
      border-radius: 100rpx;
      border: 1rpx solid #ffe58f;
    }
    
    .check-icon {
      width: 44rpx;
      height: 44rpx;
      border-radius: 50%;
      border: 2rpx solid #d9d9d9;
      background-color: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      
      .iconfont {
        font-size: 26rpx;
        color: #fff;
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.2s;
      }
    }
  }
}

// 费用明细
.fee-detail {
  .fee-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16rpx 0;
    
    .fee-label {
      font-size: 28rpx;
      color: $uni-text-color-secondary;
    }
    
    .fee-value {
      font-size: 28rpx;
      color: $uni-text-color;
      
      &.discount {
        color: $uni-color-success;
      }
      
      &.price {
        font-size: 32rpx;
        font-weight: 600;
        color: $uni-color-error;
      }
    }
    
    &.highlight {
      .fee-label {
        color: $uni-text-color;
        font-weight: 500;
      }
    }
  }
  
  .fee-divider {
    height: 1rpx;
    background-color: $uni-border-color-light;
    margin: 8rpx 0;
  }
  
  .fee-tip {
    font-size: 24rpx;
    color: $uni-text-color-tertiary;
    margin-top: 8rpx;
    padding-bottom: 8rpx;
  }
}

// 预约须知
.notice-list {
  .notice-item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 16rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .notice-icon {
      width: 36rpx;
      height: 36rpx;
      line-height: 36rpx;
      text-align: center;
      background-color: $uni-color-primary;
      color: #fff;
      font-size: 22rpx;
      border-radius: 50%;
      margin-right: 16rpx;
      flex-shrink: 0;
    }
    
    .notice-text {
      flex: 1;
      font-size: 26rpx;
      color: $uni-text-color-secondary;
      line-height: 1.6;
    }
  }
}

// 用户协议
.agreement {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  
  .agreement-text {
    font-size: 26rpx;
    color: $uni-text-color-secondary;
    margin-left: 12rpx;
    
    .link {
      color: $uni-color-primary;
    }
  }
}

// 底部栏
.footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  
  .footer-price {
    display: flex;
    flex-direction: column;
    
    .price-row {
      display: flex;
      align-items: baseline;
    }
    
    .price-label {
      font-size: 26rpx;
      color: $uni-text-color-secondary;
    }
    
    .price-value {
      font-size: 40rpx;
      font-weight: 600;
      color: $uni-color-error;
    }
    
    .price-detail {
      display: flex;
      align-items: center;
      gap: 16rpx;
      margin-top: 4rpx;
      
      .origin-price {
        font-size: 22rpx;
        color: $uni-text-color-tertiary;
        text-decoration: line-through;
      }
      
      .discount-info {
        font-size: 22rpx;
        color: $uni-color-success;
      }
      
      .offline-tip {
        font-size: 22rpx;
        color: $uni-text-color-tertiary;
      }
    }
  }
  
  .submit-btn {
    min-width: 240rpx;
  }
}

// 邀请码样式
.invite-group {
  .invite-section {
    background-color: #f7f8fa;
    border-radius: 16rpx;
    padding: 24rpx;
  }

  .invite-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 64rpx;

    .left-col {
      display: flex;
      align-items: center;
      gap: 16rpx;

      // 移除了 .label 样式

      .tag {
        font-size: 20rpx;
        color: #f5222d;
        background-color: #fff1f0;
        border: 1rpx solid #ffa39e;
        padding: 2rpx 8rpx;
        border-radius: 4rpx;
        white-space: nowrap; // 防止换行
      }
    }

    .action-row {
      display: flex;
      align-items: center;
      flex: 1; // 占据剩余空间
      justify-content: flex-end; // 默认靠右
      min-width: 0; // 防止 flex 子项溢出
    }

    // 输入框区域
    .input-trigger {
      display: flex;
      align-items: center;
      background-color: #fff;
      border-radius: 8rpx;
      padding: 0 16rpx;
      height: 64rpx;
      margin-right: 16rpx;
      border: 1rpx solid transparent;
      transition: all 0.3s;
      flex: 1; // 占满 action-row 的剩余空间

      &:focus-within {
        border-color: #52c41a;
      }

      .code-input {
        flex: 1; // 占满 input-trigger
        width: 100%; // 确保宽度生效
        font-size: 26rpx;
        color: #333;
      }
      
      .btn-verify {
        font-size: 24rpx;
        color: #52c41a;
        font-weight: 500;
        padding-left: 16rpx;
        border-left: 1rpx solid #e8e8e8;
        margin-left: 8rpx;
        white-space: nowrap;
      }
    }

    .divider {
      width: 1rpx;
      height: 24rpx;
      background-color: #d9d9d9;
      margin: 0 16rpx;
    }

    .btn-select {
      display: flex;
      align-items: center;
      color: #666;
      
      .text {
        font-size: 26rpx;
        margin-right: 4rpx;
      }

      .iconfont {
        font-size: 24rpx;
        color: #999;
      }
    }

    // 已验证状态
    .code-badge {
      display: flex;
      align-items: center;
      background-color: #f6ffed;
      border: 1rpx solid #b7eb8f;
      border-radius: 32rpx;
      padding: 6rpx 6rpx 6rpx 20rpx;

      .code {
        font-size: 26rpx;
        color: #52c41a;
        font-weight: 500;
        margin-right: 12rpx;
        font-family: monospace;
      }

      .remove-btn {
        width: 36rpx;
        height: 36rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        
        .iconfont {
          font-size: 32rpx;
          color: #bfbfbf;
        }
      }
    }
  }

  .discount-display {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 24rpx;
    padding-top: 24rpx;
    border-top: 1rpx solid rgba(0,0,0,0.05);

    .tip {
      font-size: 26rpx;
      color: #666;
    }

    .amount {
      font-size: 32rpx;
      color: #f5222d;
      font-weight: 700;
      font-family: DINAlternate-Bold, sans-serif;
    }
  }
}

.balance-group {
  .balance-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .balance-left {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }
  
  .balance-tip {
    font-size: 24rpx;
    color: $uni-text-color-secondary;
  }
  
  .balance-deduct {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16rpx;
    padding: 16rpx;
    background-color: $uni-color-primary-lighter;
    border-radius: 8rpx;
    
    .deduct-label {
      font-size: 26rpx;
      color: $uni-text-color;
    }
    
    .deduct-value {
      font-size: 28rpx;
      font-weight: bold;
      color: $uni-color-error;
    }
  }
}
</style>
