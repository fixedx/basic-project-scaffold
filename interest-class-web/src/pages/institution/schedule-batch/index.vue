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

      <!-- 教师和教室 -->
      <view class="section">
        <view class="section-title">教师与教室</view>
        <view class="form-group">
          <view class="form-label required">选择教师</view>
          <view class="selector" @click="showTeacherPicker = true">
            <text v-if="selectedTeacher" class="selector-text">{{ selectedTeacher.name }}</text>
            <text v-else class="selector-placeholder">请选择教师</text>
            <text class="iconfont icon-right-arrow selector-arrow"></text>
          </view>
        </view>
        <view class="form-group">
          <view class="form-label required">选择教室</view>
          <view class="selector" @click="showClassroomPicker = true">
            <text v-if="selectedClassroom" class="selector-text">
              {{ selectedClassroom.name }}（容纳{{ selectedClassroom.capacity }}人）
            </text>
            <text v-else class="selector-placeholder">请选择教室</text>
            <text class="iconfont icon-right-arrow selector-arrow"></text>
          </view>
        </view>
      </view>

      <!-- 重复设置 -->
      <view class="section">
        <view class="section-title">重复设置</view>

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

        <view class="form-group">
          <view class="form-label required">上课时间（每天独立配置）</view>
          <view v-if="selectedDays.length === 0" class="day-time-empty">请先选择上课日期</view>
          <view v-else class="day-time-list">
            <view
              v-for="day in sortedSelectedDays"
              :key="day"
              class="day-time-row"
            >
              <view class="day-time-label">{{ weekLabels[day] }}</view>
              <view class="day-time-pickers">
                <wd-picker
                  :model-value="dayTimeMap[day]?.start_time || ''"
                  :columns="timeColumns"
                  placeholder="开始"
                  @confirm="({ value }) => setDayTime(day, 'start_time', value)"
                />
                <text class="day-time-sep">—</text>
                <wd-picker
                  :model-value="dayTimeMap[day]?.end_time || ''"
                  :columns="timeColumns"
                  placeholder="结束"
                  @confirm="({ value }) => setDayTime(day, 'end_time', value)"
                />
              </view>
            </view>
          </view>
        </view>

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
            <text class="preview-value">
              {{ dayTimeMap[day]?.start_time || '--' }} — {{ dayTimeMap[day]?.end_time || '--' }}
            </text>
          </view>
          <view class="preview-row">
            <text class="preview-label">日期范围</text>
            <text class="preview-value">{{ form.start_date }} 至 {{ form.end_date }}</text>
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
      <wd-button type="default" @click="goBack">取消</wd-button>
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
        <view class="popup-title">选择教师</view>
        <view v-if="teacherList.length > 0" class="picker-list">
          <view
            v-for="teacher in teacherList"
            :key="teacher.id"
            class="picker-item"
            :class="{ active: form.teacher_id === teacher.id }"
            @click="selectTeacher(teacher)"
          >
            <text class="picker-item-text">{{ teacher.name }}</text>
            <text v-if="teacher.title" class="picker-item-desc">{{ teacher.title }}</text>
            <text v-if="form.teacher_id === teacher.id" class="picker-item-check">✓</text>
          </view>
        </view>
        <view v-else class="picker-empty"><text>暂无教师</text></view>
      </view>
    </wd-popup>

    <!-- 教室选择弹窗 -->
    <wd-popup v-model="showClassroomPicker" position="bottom" :closable="true">
      <view class="picker-popup">
        <view class="popup-title">选择教室</view>
        <view v-if="classroomList.length > 0" class="picker-list">
          <view
            v-for="classroom in classroomList"
            :key="classroom.id"
            class="picker-item"
            :class="{ active: form.classroom_id === classroom.id }"
            @click="selectClassroom(classroom)"
          >
            <text class="picker-item-text">{{ classroom.name }}</text>
            <text class="picker-item-desc">容纳{{ classroom.capacity }}人</text>
            <text v-if="form.classroom_id === classroom.id" class="picker-item-check">✓</text>
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

// 表单数据
const form = reactive({
  course_id: '',
  teacher_id: '',
  classroom_id: '',
  start_date: '',
  end_date: '',
  max_students: '',
  notes: '',
})

// 多选星期（含各天独立时间配置）
const selectedDays = ref<string[]>([])

interface DayTimeConfig { start_time: string; end_time: string }
const dayTimeMap = ref<Record<string, DayTimeConfig>>({})

// 选中项
const selectedCourse = ref<Course | null>(null)
const selectedTeacher = ref<TeacherInfo | null>(null)
const selectedClassroom = ref<ClassroomInfo | null>(null)

// 数据列表
const courseList = ref<Course[]>([])
const teacherList = ref<TeacherInfo[]>([])
const classroomList = ref<ClassroomInfo[]>([])

// 弹窗控制
const showCoursePicker = ref(false)
const showTeacherPicker = ref(false)
const showClassroomPicker = ref(false)

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

// 选中的星期标签（如"周一、周三"）
const selectedDayLabels = computed(() =>
  selectedDays.value
    .sort((a, b) => Number(a) - Number(b))
    .map(d => weekLabels[d])
    .join('、')
)

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

// 计算预览数量
const previewCount = computed(() => {
  if (!form.start_date || !form.end_date || selectedDays.value.length === 0) return 0

  const [sy, sm, sd] = form.start_date.split('-').map(Number)
  const [ey, em, ed] = form.end_date.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  const end = new Date(ey, em - 1, ed)

  if (start > end) return 0

  // 将项目 day_of_week（1=周一...7=周日）转为 JS getDay()（0=周日...6=周六）
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

// 选择器回调
const selectCourse = (course: Course) => {
  form.course_id = course.id
  selectedCourse.value = course
  showCoursePicker.value = false
  const end = computeEndDate(form.start_date)
  if (end) form.end_date = end
}
const selectTeacher = (teacher: TeacherInfo) => {
  form.teacher_id = teacher.id
  selectedTeacher.value = teacher
  showTeacherPicker.value = false
}
const selectClassroom = (classroom: ClassroomInfo) => {
  form.classroom_id = classroom.id
  selectedClassroom.value = classroom
  if (!form.max_students) form.max_students = String(classroom.capacity)
  showClassroomPicker.value = false
}

// 按天独立配置时间
const sortedSelectedDays = computed(() =>
  [...selectedDays.value].sort((a, b) => Number(a) - Number(b))
)

// 切换星期选中
const toggleDay = (value: string) => {
  const idx = selectedDays.value.indexOf(value)
  if (idx >= 0) {
    selectedDays.value.splice(idx, 1)
    const updated = { ...dayTimeMap.value }
    delete updated[value]
    dayTimeMap.value = updated
  } else {
    selectedDays.value.push(value)
    if (!dayTimeMap.value[value]) {
      dayTimeMap.value = { ...dayTimeMap.value, [value]: { start_time: '', end_time: '' } }
    }
  }
}

// 设置某天的时间
const setDayTime = (day: string, field: 'start_time' | 'end_time', value: string) => {
  if (dayTimeMap.value[day]) {
    dayTimeMap.value[day][field] = value
  }
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

// 表单校验
const validateForm = (): boolean => {
  if (!form.course_id) { uni.showToast({ title: '请选择课程', icon: 'none' }); return false }
  if (!form.teacher_id) { uni.showToast({ title: '请选择教师', icon: 'none' }); return false }
  if (!form.classroom_id) { uni.showToast({ title: '请选择教室', icon: 'none' }); return false }
  if (selectedDays.value.length === 0) { uni.showToast({ title: '请选择上课日期', icon: 'none' }); return false }
  for (const day of selectedDays.value) {
    const cfg = dayTimeMap.value[day]
    if (!cfg?.start_time) { uni.showToast({ title: `请设置${weekLabels[day]}的开始时间`, icon: 'none' }); return false }
    if (!cfg?.end_time) { uni.showToast({ title: `请设置${weekLabels[day]}的结束时间`, icon: 'none' }); return false }
    if (cfg.start_time >= cfg.end_time) { uni.showToast({ title: `${weekLabels[day]}开始时间必须早于结束时间`, icon: 'none' }); return false }
  }
  if (!form.start_date) { uni.showToast({ title: '请选择开始日期', icon: 'none' }); return false }
  if (!form.end_date) { uni.showToast({ title: '请选择结束日期', icon: 'none' }); return false }
  if (form.start_date > form.end_date) { uni.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' }); return false }
  const max = Number(form.max_students)
  if (!max || max < 1) { uni.showToast({ title: '请输入正确的最大学生数', icon: 'none' }); return false }
  if (previewCount.value === 0) { uni.showToast({ title: '所选范围内没有匹配的日期', icon: 'none' }); return false }
  return true
}

// 提交（白名单方式构造字段，符合 AGENTS.md 规则 #26）
const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    uni.showLoading({ title: `正在创建${previewCount.value}节课...`, mask: true })

    // 每个选中的星期独立发一次 batch 请求（各有自己的 start_time/end_time）
    let totalCreated = 0
    let totalSkipped = 0
    const sortedDays = [...selectedDays.value].sort((a, b) => Number(a) - Number(b))
    for (const day of sortedDays) {
      const cfg = dayTimeMap.value[day]
      const submitData = {
        course_id: form.course_id,
        teacher_id: form.teacher_id,
        classroom_id: form.classroom_id,
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
      success: () => {
        uni.navigateBack()
      },
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

  // 如果携带了 courseId 参数，自动选中
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

// 每天独立时间配置样式
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
