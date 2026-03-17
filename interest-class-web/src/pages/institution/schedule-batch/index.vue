<template>
  <view class="page">
    <view v-if="pageLoading" class="loading">
      <Loading text="加载中..." />
    </view>

    <view v-else class="form-container">
      <!-- 课程选择 -->
      <view class="section">
        <view class="section-title">课程信息</view>
        <view class="form-group">
          <view class="form-label required">选择课程</view>
          <view class="selector" @click="showCoursePicker = true">
            <text v-if="selectedCourse" class="selector-text">{{ selectedCourse.title }}</text>
            <text v-else class="selector-placeholder">请选择课程</text>
            <text class="iconfont icon-right-arrow selector-arrow"></text>
          </view>
        </view>
      </view>

      <!-- 上课安排：星期 + 每天时间/教师/教室 -->
      <view class="section">
        <view class="section-title">上课安排</view>

        <view class="form-group">
          <view class="form-label required">上课日期（可多选）</view>
          <view class="day-tags">
            <view
              v-for="item in dayOptions"
              :key="item.value"
              class="day-tag"
              :class="{ active: selectedDays.includes(item.value) }"
              @click="toggleDay(item.value)"
            >
              {{ item.label }}
            </view>
          </view>
        </view>

        <view v-if="selectedDays.length > 0" class="day-config-list">
          <view
            v-for="day in sortedSelectedDays"
            :key="day"
            class="day-config-card"
          >
            <view class="day-config-header">
              <text class="day-config-day">{{ weekLabels[day] }}</text>
            </view>
            <!-- 时间 -->
            <view class="day-config-row">
              <text class="day-config-label">时间</text>
              <view class="day-time-pickers">
                <wd-picker
                  :model-value="dayConfigMap[day]?.start_time || ''"
                  :columns="timeColumns"
                  placeholder="开始"
                  @confirm="(e: any) => setDayConfig(day, 'start_time', e.value)"
                />
                <text class="day-time-sep">—</text>
                <wd-picker
                  :model-value="dayConfigMap[day]?.end_time || ''"
                  :columns="timeColumns"
                  placeholder="结束"
                  @confirm="(e: any) => setDayConfig(day, 'end_time', e.value)"
                />
              </view>
            </view>
            <!-- 教师 -->
            <view class="day-config-row" @click="openTeacherPicker(day)">
              <text class="day-config-label">教师</text>
              <view class="day-config-selector">
                <text v-if="dayConfigMap[day]?.teacherName" class="day-config-value-text">
                  {{ dayConfigMap[day].teacherName }}
                </text>
                <text v-else class="day-config-placeholder">请选择教师</text>
                <text class="iconfont icon-right-arrow day-config-arrow"></text>
              </view>
            </view>
            <!-- 教室 -->
            <view class="day-config-row" @click="openClassroomPicker(day)">
              <text class="day-config-label">教室</text>
              <view class="day-config-selector">
                <text v-if="dayConfigMap[day]?.classroomName" class="day-config-value-text">
                  {{ dayConfigMap[day].classroomName }}
                  <text v-if="dayConfigMap[day]?.classroomCapacity" class="day-config-cap">（{{ dayConfigMap[day].classroomCapacity }}人）</text>
                </text>
                <text v-else class="day-config-placeholder">请选择教室</text>
                <text class="iconfont icon-right-arrow day-config-arrow"></text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 排课周期 -->
      <view class="section">
        <view class="section-title">排课周期</view>

        <view class="form-group">
          <view class="form-label required">开始日期</view>
          <picker mode="date" :value="form.start_date" @change="onStartDateChange">
            <view class="date-selector">
              <text :class="form.start_date ? 'date-text' : 'date-placeholder'">
                {{ form.start_date || '请选择开始日期' }}
              </text>
              <text class="iconfont icon-right-arrow selector-arrow"></text>
            </view>
          </picker>
        </view>

        <view class="form-group">
          <view class="form-label required">结束日期</view>
          <view v-if="form.end_date" class="end-date-display">
            <view class="end-date-value">
              <text class="iconfont icon-calendar end-date-icon"></text>
              <text class="end-date-text">{{ form.end_date }}</text>
              <view v-if="totalLessonsLabel" class="end-date-badge">{{ totalLessonsLabel }}</view>
            </view>
            <view class="end-date-actions">
              <text class="end-date-hint">自动计算</text>
              <picker mode="date" :value="form.end_date" :start="form.start_date || ''" @change="onEndDateChange">
                <text class="end-date-edit">修改</text>
              </picker>
            </view>
          </view>
          <picker v-else mode="date" :value="form.end_date" :start="form.start_date || ''" @change="onEndDateChange">
            <view class="date-selector">
              <text class="date-placeholder">请选择结束日期</text>
              <text class="iconfont icon-right-arrow selector-arrow"></text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 预览 -->
      <view v-if="previewCount > 0" class="section preview-section">
        <view class="section-title">排课预览</view>
        <view class="preview-card">
          <view v-for="day in sortedSelectedDays" :key="day" class="preview-row">
            <text class="preview-label">{{ weekLabels[day] }}</text>
            <view class="preview-col">
              <text class="preview-value">{{ dayConfigMap[day]?.start_time || '--' }} — {{ dayConfigMap[day]?.end_time || '--' }}</text>
              <text class="preview-sub">{{ dayConfigMap[day]?.teacherName || '--' }} · {{ dayConfigMap[day]?.classroomName || '--' }}</text>
            </view>
          </view>
          <view class="preview-row">
            <text class="preview-label">日期范围</text>
            <text class="preview-value">{{ form.start_date }} 至 {{ form.end_date }}</text>
          </view>
          <view v-if="selectedDays.length > 1 && selectedCourse?.skus?.[0]?.total_lessons" class="preview-row note-row">
            <text class="preview-label">说明</text>
            <text class="preview-value note">
              每天各独立排满 {{ selectedCourse.skus[0].total_lessons }} 节，共 {{ selectedDays.length }} 天
            </text>
          </view>
          <view class="preview-row highlight">
            <text class="preview-label">总计</text>
            <text class="preview-value count">{{ previewCount }} 节课</text>
          </view>
        </view>
      </view>

      <!-- 其他信息 -->
      <view class="section">
        <view class="section-title">其他信息</view>
        <view class="form-group">
          <view class="form-label required">最大学生数</view>
          <wd-input
            v-model="form.max_students"
            type="number"
            placeholder="请输入最大学生数"
          >
            <template #suffix>
              <text>人</text>
            </template>
          </wd-input>
        </view>
        <view class="form-group">
          <view class="form-label">备注</view>
          <wd-textarea
            v-model="form.notes"
            placeholder="选填，排课的其他说明"
            :maxlength="200"
            show-word-limit
            :auto-height="true"
            custom-style="min-height: 120rpx;"
          />
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <PageFooter>
      <wd-button type="default" custom-class="cancel-btn-common" @click="goBack">取消</wd-button>
      <wd-button type="primary" @click="handleSubmit" custom-style="margin-left: 16rpx;">
        批量创建
      </wd-button>
    </PageFooter>

    <!-- 课程选择弹窗 -->
    <wd-popup v-model="showCoursePicker" position="bottom" :closable="true">
      <view class="picker-popup">
        <view class="popup-title">选择课程</view>
        <view v-if="courseList.length > 0" class="picker-list">
          <view
            v-for="course in courseList"
            :key="course.id"
            class="picker-item"
            :class="{ active: form.course_id === course.id }"
            @click="selectCourse(course)"
          >
            <text class="picker-item-text">{{ course.title }}</text>
            <text v-if="form.course_id === course.id" class="picker-item-check">✓</text>
          </view>
        </view>
        <view v-else class="picker-empty"><text>暂无课程</text></view>
      </view>
    </wd-popup>

    <!-- 教师选择弹窗 -->
    <wd-popup v-model="showTeacherPicker" position="bottom" :closable="true">
      <view class="picker-popup">
        <view class="popup-title">选择教师（{{ weekLabels[activeDayForTeacher] || '' }}）</view>
        <view v-if="teacherList.length > 0" class="picker-list">
          <view
            v-for="teacher in teacherList"
            :key="teacher.id"
            class="picker-item"
            :class="{ active: dayConfigMap[activeDayForTeacher]?.teacher_id === teacher.id }"
            @click="selectTeacher(teacher)"
          >
            <text class="picker-item-text">{{ teacher.name }}</text>
            <text v-if="teacher.title" class="picker-item-desc">{{ teacher.title }}</text>
            <text v-if="dayConfigMap[activeDayForTeacher]?.teacher_id === teacher.id" class="picker-item-check">✓</text>
          </view>
        </view>
        <view v-else class="picker-empty"><text>暂无教师</text></view>
      </view>
    </wd-popup>

    <!-- 教室选择弹窗 -->
    <wd-popup v-model="showClassroomPicker" position="bottom" :closable="true">
      <view class="picker-popup">
        <view class="popup-title">选择教室（{{ weekLabels[activeDayForClassroom] || '' }}）</view>
        <view v-if="classroomList.length > 0" class="picker-list">
          <view
            v-for="classroom in classroomList"
            :key="classroom.id"
            class="picker-item"
            :class="{ active: dayConfigMap[activeDayForClassroom]?.classroom_id === classroom.id }"
            @click="selectClassroom(classroom)"
          >
            <text class="picker-item-text">{{ classroom.name }}</text>
            <text class="picker-item-desc">容纳{{ classroom.capacity }}人</text>
            <text v-if="dayConfigMap[activeDayForClassroom]?.classroom_id === classroom.id" class="picker-item-check">✓</text>
          </view>
        </view>
        <view v-else class="picker-empty"><text>暂无教室</text></view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { scheduleApi } from '@/api'
import { courseApi, type Course } from '@/api/course'
import { teacherApi, type TeacherInfo } from '@/api/teacher'
import { classroomApi, type ClassroomInfo } from '@/api/classroom'
import { getMyInstitutions } from '@/api/category'
import PageFooter from '@/components/PageFooter/index.vue'
import Loading from '@/components/Loading/index.vue'
import { useScheduleEndDate } from '@/composables/useScheduleEndDate'

const pageLoading = ref(false)
const institutionId = ref('')

// 表单数据（teacher_id / classroom_id 已移入 dayConfigMap，每天独立配置）
const form = reactive({
  course_id: '',
  start_date: '',
  end_date: '',
  max_students: '',
  notes: '',
})

// 多选星期 + 每天独立配置（时间、教师、教室）
const selectedDays = ref<string[]>([])

interface DayConfig {
  start_time: string
  end_time: string
  teacher_id: string
  classroom_id: string
  teacherName: string
  classroomName: string
  classroomCapacity: number
}
const dayConfigMap = ref<Record<string, DayConfig>>({})

// 选中的课程
const selectedCourse = ref<Course | null>(null)

// 数据列表
const courseList = ref<Course[]>([])
const teacherList = ref<TeacherInfo[]>([])
const classroomList = ref<ClassroomInfo[]>([])

// 弹窗控制
const showCoursePicker = ref(false)
const showTeacherPicker = ref(false)
const showClassroomPicker = ref(false)

// 当前正在配置哪天的教师 / 教室
const activeDayForTeacher = ref('')
const activeDayForClassroom = ref('')

// 星期选项
const dayOptions = [
  { label: '周一', value: '1' },
  { label: '周二', value: '2' },
  { label: '周三', value: '3' },
  { label: '周四', value: '4' },
  { label: '周五', value: '5' },
  { label: '周六', value: '6' },
  { label: '周日', value: '7' },
]

const weekLabels: Record<string, string> = {
  '1': '周一', '2': '周二', '3': '周三', '4': '周四',
  '5': '周五', '6': '周六', '7': '周日',
}

// 生成时间列
const generateTimeColumns = () => {
  const times: string[] = []
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return times
}
const timeColumns = computed(() => generateTimeColumns())

// 已排序的选中星期
const sortedSelectedDays = computed(() =>
  [...selectedDays.value].sort((a, b) => Number(a) - Number(b))
)

// 计算预览数量（所有天合计）
const previewCount = computed(() => {
  if (!form.start_date || !form.end_date || selectedDays.value.length === 0) return 0

  const [sy, sm, sd] = form.start_date.split('-').map(Number)
  const [ey, em, ed] = form.end_date.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  const end = new Date(ey, em - 1, ed)

  if (start > end) return 0

  const targetJsDays = selectedDays.value.map(d => {
    const n = parseInt(d)
    return n === 7 ? 0 : n
  })

  let count = 0
  const current = new Date(start)
  while (current <= end) {
    if (targetJsDays.includes(current.getDay())) count++
    current.setDate(current.getDate() + 1)
  }
  return count
})

// 课程选择
const selectCourse = (course: Course) => {
  form.course_id = course.id
  selectedCourse.value = course
  showCoursePicker.value = false
  const end = computeEndDate(form.start_date)
  if (end) form.end_date = end
}

// 切换星期选中（新增时初始化完整 DayConfig）
const toggleDay = (value: string) => {
  const idx = selectedDays.value.indexOf(value)
  if (idx >= 0) {
    selectedDays.value.splice(idx, 1)
    const updated = { ...dayConfigMap.value }
    delete updated[value]
    dayConfigMap.value = updated
  } else {
    selectedDays.value.push(value)
    if (!dayConfigMap.value[value]) {
      dayConfigMap.value = {
        ...dayConfigMap.value,
        [value]: {
          start_time: '', end_time: '',
          teacher_id: '', classroom_id: '',
          teacherName: '', classroomName: '', classroomCapacity: 0,
        },
      }
    }
  }
}

// 设置某天的时间字段
const setDayConfig = (day: string, field: 'start_time' | 'end_time', value: string) => {
  if (dayConfigMap.value[day]) {
    dayConfigMap.value[day][field] = value
  }
}

// 打开某天的教师 / 教室选择弹窗
const openTeacherPicker = (day: string) => {
  activeDayForTeacher.value = day
  showTeacherPicker.value = true
}
const openClassroomPicker = (day: string) => {
  activeDayForClassroom.value = day
  showClassroomPicker.value = true
}

// 选择教师（写入对应天的配置）
const selectTeacher = (teacher: TeacherInfo) => {
  const day = activeDayForTeacher.value
  if (day && dayConfigMap.value[day]) {
    dayConfigMap.value[day].teacher_id = teacher.id
    dayConfigMap.value[day].teacherName = teacher.name
  }
  showTeacherPicker.value = false
  activeDayForTeacher.value = ''
}

// 选择教室（写入对应天的配置）
const selectClassroom = (classroom: ClassroomInfo) => {
  const day = activeDayForClassroom.value
  if (day && dayConfigMap.value[day]) {
    dayConfigMap.value[day].classroom_id = classroom.id
    dayConfigMap.value[day].classroomName = classroom.name
    dayConfigMap.value[day].classroomCapacity = classroom.capacity
    if (!form.max_students) form.max_students = String(classroom.capacity)
  }
  showClassroomPicker.value = false
  activeDayForClassroom.value = ''
}

// 结束日期自动计算 Hook
const { computeEndDate, totalLessonsLabel } = useScheduleEndDate(selectedCourse, selectedDays)

// 课程 / 天数 / 开始日期任意变化时，自动计算结束日期
watch(
  [selectedCourse, selectedDays, () => form.start_date],
  () => {
    const computed = computeEndDate(form.start_date)
    if (computed) form.end_date = computed
  },
  { deep: true },
)

const onStartDateChange = (e: any) => {
  form.start_date = e.detail.value
  const end = computeEndDate(form.start_date)
  if (end) form.end_date = end
}
const onEndDateChange = (e: any) => { form.end_date = e.detail.value }

// 加载机构ID
const loadInstitutionId = async () => {
  try {
    const res = await getMyInstitutions()
    if (res && res.length > 0) institutionId.value = res[0].id
  } catch (error) {
    console.error('加载机构信息失败:', error)
  }
}

// 加载选项列表
const loadOptions = async () => {
  try {
    const params: any = {}
    if (institutionId.value) params.institutionId = institutionId.value

    const [courses, teachers, classrooms] = await Promise.all([
      courseApi.getList({ ...params, pageSize: 100 }),
      teacherApi.getList({ ...params, status: 'active' }),
      classroomApi.getList({ ...params, status: 'available' }),
    ])
    courseList.value = Array.isArray(courses) ? courses : (courses as any)?.data || []
    teacherList.value = Array.isArray(teachers) ? teachers : []
    classroomList.value = Array.isArray(classrooms) ? classrooms : []
  } catch (error) {
    console.error('加载选项数据失败:', error)
    uni.showToast({ title: '加载数据失败', icon: 'none' })
  }
}

// 表单校验（每天独立校验教师、教室、时间）
const validateForm = (): boolean => {
  if (!form.course_id) { uni.showToast({ title: '请选择课程', icon: 'none' }); return false }
  if (selectedDays.value.length === 0) { uni.showToast({ title: '请选择上课日期', icon: 'none' }); return false }
  for (const day of selectedDays.value) {
    const cfg = dayConfigMap.value[day]
    const label = weekLabels[day]
    if (!cfg?.start_time) { uni.showToast({ title: `请设置${label}的开始时间`, icon: 'none' }); return false }
    if (!cfg?.end_time) { uni.showToast({ title: `请设置${label}的结束时间`, icon: 'none' }); return false }
    if (cfg.start_time >= cfg.end_time) { uni.showToast({ title: `${label}开始时间必须早于结束时间`, icon: 'none' }); return false }
    if (!cfg?.teacher_id) { uni.showToast({ title: `请选择${label}的教师`, icon: 'none' }); return false }
    if (!cfg?.classroom_id) { uni.showToast({ title: `请选择${label}的教室`, icon: 'none' }); return false }
  }
  if (!form.start_date) { uni.showToast({ title: '请选择开始日期', icon: 'none' }); return false }
  if (!form.end_date) { uni.showToast({ title: '请选择结束日期', icon: 'none' }); return false }
  if (form.start_date > form.end_date) { uni.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' }); return false }
  const max = Number(form.max_students)
  if (!max || max < 1) { uni.showToast({ title: '请输入正确的最大学生数', icon: 'none' }); return false }
  if (previewCount.value === 0) { uni.showToast({ title: '所选范围内没有匹配的日期', icon: 'none' }); return false }
  return true
}

// 提交（每天独立 teacher_id / classroom_id，白名单构造字段）
const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    uni.showLoading({ title: `正在创建${previewCount.value}节课...`, mask: true })

    let totalCreated = 0
    let totalSkipped = 0
    const sortedDays = [...selectedDays.value].sort((a, b) => Number(a) - Number(b))

    for (const day of sortedDays) {
      const cfg = dayConfigMap.value[day]
      const submitData = {
        course_id: form.course_id,
        teacher_id: cfg.teacher_id,
        classroom_id: cfg.classroom_id,
        start_time: cfg.start_time,
        end_time: cfg.end_time,
        days_of_week: [day],
        start_date: form.start_date,
        end_date: form.end_date,
        max_students: Number(form.max_students),
        notes: form.notes || undefined,
      }
      const res = await scheduleApi.batchCreate(submitData) as any
      totalCreated += res.created || 0
      totalSkipped += res.skipped || 0
    }
    uni.hideLoading()

    let message = `成功创建 ${totalCreated} 节课`
    if (totalSkipped > 0) {
      message += `\n跳过 ${totalSkipped} 节（时间冲突）`
    }

    uni.showModal({
      title: '批量排课完成',
      content: message,
      showCancel: false,
      success: () => { uni.navigateBack() },
    })
  } catch (error: any) {
    uni.hideLoading()
    console.error('批量创建排课失败:', error)
  }
}

const goBack = () => { uni.navigateBack() }

// 页面初始化
onLoad(async (options) => {
  pageLoading.value = true
  await loadInstitutionId()
  await loadOptions()

  if (options?.courseId) {
    const course = courseList.value.find(c => c.id === options.courseId)
    if (course) selectCourse(course)
  }

  pageLoading.value = false
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40vh 0;
}

.form-container {
  padding: 24rpx;
}

.section {
  margin-bottom: 24rpx;
  padding: 32rpx;
  background-color: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  &:last-child {
    margin-bottom: 0;
  }

  &-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #1d2129;
    margin-bottom: 32rpx;
    display: flex;
    align-items: center;
    line-height: 1.4;

    &::before {
      content: '';
      width: 8rpx;
      height: 32rpx;
      background: $uni-color-primary;
      border-radius: 4rpx;
      margin-right: 16rpx;
    }
  }
}

.form-group {
  margin-bottom: 32rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #4e5969;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;

  &.required::after {
    content: '*';
    color: #f53f3f;
    margin-left: 8rpx;
    font-size: 32rpx;
    line-height: 1;
    transform: translateY(4rpx);
  }
}

.selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #e5e6eb;
  transition: all 0.3s;
  
  &:active {
    opacity: 0.7;
  }
}

.selector-text {
  font-size: 28rpx;
  color: #1d2129;
  flex: 1;
}

.selector-placeholder {
  font-size: 28rpx;
  color: #c9cdd4;
  flex: 1;
}

.selector-arrow {
  font-size: 24rpx;
  color: #c9cdd4;
  flex-shrink: 0;
}

.date-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #e5e6eb;
  transition: all 0.3s;
}

.date-text {
  font-size: 28rpx;
  color: #1d2129;
}

.date-placeholder {
  font-size: 28rpx;
  color: #c9cdd4;
}

:deep(.wd-input) {
  padding: 0 !important;
  background: transparent !important;
  
  &::after {
    display: none !important;
  }

  .wd-input__inner {
    padding: 16rpx 0 !important;
    font-size: 28rpx !important;
    color: #1d2129 !important;
    background: transparent !important;
    border-bottom: 1rpx solid #e5e6eb !important;
    border-radius: 0 !important;
    transition: all 0.3s;

    &::placeholder {
      color: #c9cdd4;
    }

    &:focus {
      border-bottom-color: $uni-color-primary !important;
    }
  }
}

:deep(.wd-textarea) {
  padding: 0 !important;
  background: transparent !important;
  
  &::after {
    display: none !important;
  }

  .wd-textarea__inner {
    padding: 16rpx 0 !important;
    font-size: 28rpx !important;
    color: #1d2129 !important;
    background: transparent !important;
    border-bottom: 1rpx solid #e5e6eb !important;
    border-radius: 0 !important;
    min-height: 160rpx !important;
    line-height: 1.6 !important;
    transition: all 0.3s;

    &::placeholder {
      color: #c9cdd4;
    }

    &:focus {
      border-bottom-color: $uni-color-primary !important;
    }
  }
}

.day-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.day-tag {
  padding: 12rpx 32rpx;
  font-size: 26rpx;
  border-radius: 100rpx;
  background-color: #f2f3f5;
  color: #4e5969;
  border: 2rpx solid transparent;
  transition: all 0.3s;

  &.active {
    background-color: rgba($uni-color-primary, 0.1);
    color: $uni-color-primary;
    border-color: $uni-color-primary;
    font-weight: 500;
  }
}

// 每天独立配置卡片
.day-config-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.day-config-card {
  border: 1rpx solid #e5e6eb;
  border-radius: 16rpx;
  overflow: hidden;
}

.day-config-header {
  background-color: rgba($uni-color-primary, 0.06);
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid rgba($uni-color-primary, 0.12);
}

.day-config-day {
  font-size: 28rpx;
  font-weight: 600;
  color: $uni-color-primary;
}

.day-config-row {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #f2f3f5;

  &:last-child {
    border-bottom: none;
  }

  // 时间行：内部 day-time-pickers 接管布局
  .day-time-pickers {
    flex: 1;
    margin-left: 16rpx;
  }
}

.day-config-label {
  font-size: 26rpx;
  color: #4e5969;
  width: 56rpx;
  flex-shrink: 0;
}

.day-config-selector {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-left: 16rpx;
}

.day-config-value-text {
  font-size: 28rpx;
  color: #1d2129;
  flex: 1;
}

.day-config-cap {
  font-size: 24rpx;
  color: #86909c;
}

.day-config-placeholder {
  font-size: 28rpx;
  color: #c9cdd4;
  flex: 1;
}

.day-config-arrow {
  font-size: 22rpx;
  color: #c9cdd4;
  flex-shrink: 0;
}

// 预览列（时间 + 教师·教室 副文字）
.preview-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
}

.preview-sub {
  font-size: 24rpx;
  color: #86909c;
  font-weight: 400;
}

// 每天独立时间配置样式（保留，day-time-pickers 仍在新卡片中复用）
.day-time-empty {
  padding: 20rpx 0;
  font-size: 26rpx;
  color: #c9cdd4;
}

.day-time-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.day-time-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f2f3f5;

  &:last-child { border-bottom: none; }
}

.day-time-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #1d2129;
  width: 80rpx;
  flex-shrink: 0;
}

.day-time-pickers {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;

  :deep(.wd-picker) {
    flex: 1;
    .wd-cell { padding: 0 !important; }
  }
}

.day-time-sep {
  font-size: 24rpx;
  color: #c9cdd4;
  flex-shrink: 0;
}

// 结束日期自动计算展示
.end-date-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #e5e6eb;
  min-height: 72rpx;
}

.end-date-value {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}

.end-date-icon {
  font-size: 28rpx;
  color: $uni-color-primary;
}

.end-date-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #1d2129;
}

.end-date-badge {
  background: rgba($uni-color-primary, 0.1);
  color: $uni-color-primary;
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
  border: 1rpx solid rgba($uni-color-primary, 0.2);
}

.end-date-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-shrink: 0;
}

.end-date-hint {
  font-size: 22rpx;
  color: #c9cdd4;
}

.end-date-edit {
  font-size: 24rpx;
  color: $uni-color-primary;
  padding: 4rpx 12rpx;
  border: 1rpx solid rgba($uni-color-primary, 0.4);
  border-radius: 8rpx;
}

:deep(.wd-picker) {
  .wd-cell {
    padding-left: 0 !important;
    padding-right: 0 !important;
    background: transparent !important;
  }
  .wd-cell__title {
    white-space: nowrap !important;
    min-width: 80rpx !important;
  }
  .wd-cell__value {
    white-space: nowrap !important;
  }
  .wd-picker__value {
    padding: 16rpx 0 !important;
    font-size: 28rpx !important;
    color: #1d2129 !important;
    border-bottom: 1rpx solid #e5e6eb !important;
    
    &.is-placeholder {
      color: #c9cdd4 !important;
    }
  }
}

.picker-popup {
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  max-height: 70vh;
  background-color: #fff;
  border-radius: 32rpx 32rpx 0 0;
}

.popup-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 32rpx;
  text-align: center;
}

.picker-list {
  max-height: 55vh;
  overflow-y: auto;
}

.picker-item {
  display: flex;
  align-items: center;
  padding: 32rpx 0;
  border-bottom: 1rpx solid #f2f3f5;
  transition: all 0.3s;

  &:last-child {
    border-bottom: none;
  }
  
  &.active {
    .picker-item-text {
      color: $uni-color-primary;
      font-weight: 500;
    }
  }

  &:active {
    opacity: 0.7;
  }
}

.picker-item-text {
  flex: 1;
  font-size: 30rpx;
  color: #1d2129;
}

.picker-item-desc {
  font-size: 26rpx;
  color: #86909c;
  margin-right: 16rpx;
}

.picker-item-check {
  font-size: 36rpx;
  color: $uni-color-primary;
  font-weight: bold;
}

.picker-empty {
  padding: 80rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: #86909c;
}

// 预览特有样式
.preview-section {
  border: 2rpx solid rgba($uni-color-primary, 0.2);
  background-color: rgba($uni-color-primary, 0.02);
}

.preview-card {
  padding: 8rpx 0;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  
  &.highlight {
    margin-top: 16rpx;
    padding-top: 24rpx;
    border-top: 1rpx dashed #e5e6eb;
  }

  &.note-row {
    align-items: flex-start;
    padding: 8rpx 0;
  }
}

.preview-label {
  font-size: 28rpx;
  color: #4e5969;
}

.preview-value {
  font-size: 28rpx;
  color: #1d2129;
  font-weight: 500;
  
  &.count {
    font-size: 36rpx;
    font-weight: bold;
    color: $uni-color-primary;
  }

  &.note {
    font-size: 26rpx;
    font-weight: 400;
    color: #86909c;
    text-align: right;
  }
}

:deep(.page-footer) {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20rpx);
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05) !important;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)) !important;
  
  .wd-button {
    flex: 1;
    margin: 0 12rpx !important;
    
    &:first-child {
      margin-left: 0 !important;
    }
    &:last-child {
      margin-right: 0 !important;
    }
  }
}
</style>
