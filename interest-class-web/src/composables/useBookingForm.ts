import { ref, reactive, computed, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { courseApi, type Course, type CourseSku } from '@/api'
import { orderApi, type OrderAmountResult } from '@/api/order'
import { childApi, type Child } from '@/api/child'
import { scheduleApi, type Schedule } from '@/api/schedule'
import { inviteApi } from '@/api/invite'
import { showErrorToast, showSuccessToast } from '@/utils/toast'
import { getToken } from '@/utils/request'

export function useBookingForm() {
  // --- 路由参数 ---
  const courseId = ref('')
  const skuId = ref('')

  // --- 课程 & SKU ---
  const course = ref<Course | null>(null)
  const selectedSku = ref<CourseSku | null>(null)
  const loading = ref(false)
  const submitting = ref(false)
  const agreed = ref(false)

  // --- 宝贝 ---
  const children = ref<Child[]>([])
  const selectedChildId = ref('')
  const loadingChildren = ref(false)
  const selectedChild = computed(() =>
    children.value.find(c => c.id === selectedChildId.value) ?? null
  )

  // --- 排课 ---
  const schedules = ref<Schedule[]>([])
  const selectedScheduleIds = ref<string[]>([])
  const loadingSchedules = ref(false)

  const dayOfWeekOrder: Record<string, number> = {
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  }
  const sortedSchedules = computed(() =>
    [...schedules.value].sort((a, b) => {
      const dA = dayOfWeekOrder[String(a.day_of_week || '').toLowerCase()] || 0
      const dB = dayOfWeekOrder[String(b.day_of_week || '').toLowerCase()] || 0
      if (dA !== dB) return dA - dB
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    })
  )

  // --- 邀请码 & 余额 ---
  const inviteCode = ref('')
  const inviteValidated = ref(false)
  const validatingInvite = ref(false)
  const useBalance = ref(false)

  // --- 金额（由后端统一计算） ---
  const amountResult = ref<OrderAmountResult>({
    is_trial: false,
    original_price: 0,
    display_price: 0,
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

  // --- 表单 ---
  const form = reactive({ remark: '' })

  // --- 计算属性：金额 ---
  const isTrialSku = computed(() =>
    amountResult.value.is_trial ||
    course.value?.type === 'trial' ||
    selectedSku.value?.type === 'trial'
  )
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
  // 含佣金的展示价格，直接取后端计算结果
  const displayPrice = computed(() => amountResult.value.display_price)

  // --- 工具函数 ---
  const formatPrice = (price: number | string) => (Number(price) || 0).toFixed(2)

  const getDayOfWeekLabel = (day: string) => {
    const m: Record<string, string> = {
      '1': '周一',
      '2': '周二',
      '3': '周三',
      '4': '周四',
      '5': '周五',
      '6': '周六',
      '7': '周日',
      monday: '周一', tuesday: '周二', wednesday: '周三', thursday: '周四',
      friday: '周五', saturday: '周六', sunday: '周日',
    }
    return m[String(day || '').toLowerCase()] || day
  }

  const formatTimeRange = (start: string, end: string) =>
    `${dayjs(start).format('HH:mm')}-${dayjs(end).format('HH:mm')}`

  // --- 金额计算 ---
  const recalculateAmount = async () => {
    if (!courseId.value || !skuId.value) return
    calculatingAmount.value = true
    try {
      amountResult.value = await orderApi.calculateAmount({
        course_id: courseId.value,
        sku_id: skuId.value,
        quantity: 1,
        invite_code: (!isTrialSku.value && inviteValidated.value) ? inviteCode.value.trim() : undefined,
        use_balance: useBalance.value,
      })
    } catch (e) {
      console.error('计算金额失败:', e)
    } finally {
      calculatingAmount.value = false
    }
  }

  // 余额开关变化时自动重算
  watch(useBalance, () => {
    if (courseId.value && skuId.value) recalculateAmount()
  })

  // --- 邀请码 ---
  const handleValidateInvite = async () => {
    if (!inviteCode.value.trim()) { showErrorToast('请输入邀请码'); return }
    if (!courseId.value) { showErrorToast('缺少课程信息'); return }
    validatingInvite.value = true
    try {
      await inviteApi.validateInviteCode(inviteCode.value.trim(), courseId.value)
      inviteValidated.value = true
      showSuccessToast('邀请码验证成功')
      await recalculateAmount()
    } catch (e: any) {
      showErrorToast(e.message || '邀请码无效')
      inviteCode.value = ''
      inviteValidated.value = false
      await recalculateAmount()
    } finally {
      validatingInvite.value = false
    }
  }

  const goSelectInviteCode = () => {
    if (!selectedSku.value || !course.value) { showErrorToast('请先选择课程规格'); return }
    uni.navigateTo({
      url: `/pages/invite-code-select/index?courseId=${courseId.value}&courseName=${encodeURIComponent(course.value.title)}&orderAmount=${Number(selectedSku.value.total_price)}&cashbackRatio=${Number(course.value.cashback_ratio) || 10}`,
      events: {
        selectInviteCode: async (data: { inviteCode: string }) => {
          inviteCode.value = data.inviteCode
          inviteValidated.value = true
          await recalculateAmount()
        },
      },
    })
  }

  const clearInviteCode = async () => {
    inviteCode.value = ''
    inviteValidated.value = false
    await recalculateAmount()
  }

  // --- 数据加载 ---
  const loadCourseDetail = async () => {
    if (!courseId.value) { showErrorToast('缺少课程参数'); return }
    loading.value = true
    try {
      const data = await courseApi.getDetail(courseId.value)
      course.value = data
      if (skuId.value && data.skus) {
        selectedSku.value = data.skus.find((s: CourseSku) => (s.id as any) === skuId.value) || data.skus[0]
      } else if (data.skus && data.skus.length > 0) {
        selectedSku.value = data.skus[0]
      }
      if (selectedSku.value) skuId.value = selectedSku.value.id as string
      await recalculateAmount()
    } catch (e) {
      showErrorToast('加载课程失败')
    } finally {
      loading.value = false
    }
  }

  const loadChildren = async () => {
    loadingChildren.value = true
    try {
      const data = await childApi.getMyList()
      children.value = data
      if (data.length > 0 && !selectedChildId.value) {
        selectedChildId.value = data[0].id
      }
    } catch (e) {
      console.error('获取宝贝列表失败:', e)
    } finally {
      loadingChildren.value = false
    }
  }

  const loadSchedules = async () => {
    if (!courseId.value) return
    loadingSchedules.value = true
    try {
      schedules.value = (await scheduleApi.getByCourse(courseId.value)) || []
    } catch (e) {
      console.error('获取排课列表失败:', e)
    } finally {
      loadingSchedules.value = false
    }
  }

  // --- 交互 ---
  const selectSchedule = (id: string) => {
    const idx = selectedScheduleIds.value.indexOf(id)
    idx > -1 ? selectedScheduleIds.value.splice(idx, 1) : selectedScheduleIds.value.push(id)
  }

  const showAgreement = () => {
    uni.showModal({
      title: '报名服务协议',
      content: '1. 报名成功后，请等待机构确认并通知缴费。\n2. 机构确认订单后，您可以在"我的预约"中调整上课时间。\n3. 如需退款，请在"我的订单"中申请。\n4. 报名信息仅用于课程安排，我们将严格保护您的隐私。',
      showCancel: false,
      confirmText: '我知道了',
    })
  }

  const goToAddChild = () => uni.navigateTo({ url: '/pages/child-edit/index' })

  const validateForm = () => {
    if (!selectedChild.value) { showErrorToast('请选择一个宝贝'); return false }
    if (!agreed.value) { showErrorToast('请阅读并同意报名服务协议'); return false }
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    if (selectedScheduleIds.value.length === 0) { showErrorToast('请选择至少一个上课时段'); return }
    submitting.value = true
    try {
      const orderId = await orderApi.create({
        course_id: courseId.value,
        sku_id: selectedSku.value?.id || '',
        quantity: 1,
        child_id: selectedChild.value!.id,
        student_name: selectedChild.value!.name,
        student_phone: selectedChild.value!.phone || '',
        student_age: selectedChild.value!.age,
        schedule_ids: selectedScheduleIds.value,
        payment_method: (isTrialSku.value ? 'wechat' : 'offline') as 'wechat' | 'offline',
        remark: form.remark.trim() || undefined,
        invite_code: (!isTrialSku.value && inviteValidated.value) ? inviteCode.value.trim() : undefined,
        use_balance_amount: useBalance.value ? amountResult.value.balance_deduct : undefined,
      })
      showSuccessToast('报名成功，请完成支付')
      setTimeout(() => uni.redirectTo({ url: `/pages/order-pay/index?id=${orderId}` }), 1500)
    } catch (e: any) {
      showErrorToast(e.message || '报名失败')
    } finally {
      submitting.value = false
    }
  }

  const handleBack = () => uni.navigateBack()

  // --- 生命周期 ---
  onLoad((options: any) => {
    if (!getToken()) {
      const currentUrl = `/pages/booking-form/index?courseId=${options.courseId || ''}&skuId=${options.skuId || ''}`
      uni.redirectTo({ url: `/pages/login/index?from=${encodeURIComponent(currentUrl)}` })
      return
    }
    if (options.courseId) courseId.value = options.courseId
    if (options.skuId) skuId.value = options.skuId
    loadCourseDetail()
    loadSchedules()
    loadChildren()
  })

  onShow(() => {
    if (getToken()) loadChildren()
  })

  return {
    // 数据
    course, selectedSku, loading, submitting, agreed,
    children, selectedChildId, loadingChildren, selectedChild,
    schedules: sortedSchedules, selectedScheduleIds, loadingSchedules,
    inviteCode, inviteValidated, validatingInvite, useBalance,
    amountResult, calculatingAmount, form,
    // 计算金额
    isTrialSku, onlinePayBase, balanceDeductAmount, totalDiscount,
    onlinePayAmount, offlinePayAmount, commissionAmount, finalPrice,
    inviteDiscount, userBalance, skuCashbackAmount, skuDiscountAmount, displayPrice,
    // 工具
    formatPrice, getDayOfWeekLabel, formatTimeRange,
    // 方法
    handleValidateInvite, goSelectInviteCode, clearInviteCode,
    selectSchedule, handleSubmit, handleBack, showAgreement, goToAddChild,
  }
}
