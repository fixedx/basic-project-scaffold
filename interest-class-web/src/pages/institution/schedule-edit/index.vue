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

      <!-- 时间安排 -->
      <view class="section">
        <view class="section-title">时间安排</view>

        <view class="form-group">
          <view class="form-label required">上课星期</view>
          <view class="day-tags">
            <view
              v-for="item in dayOptions"
              :key="item.value"
              class="day-tag"
              :class="{ active: form.day_of_week === item.value }"
              @click="form.day_of_week = item.value"
            >
              {{ item.label }}
            </view>
          </view>
        </view>

        <view class="form-group">
          <view class="form-label required">上课时间</view>
          <view class="time-row">
            <view class="time-picker-wrapper">
              <wd-picker
                :z-index="1000"
                v-model="form.start_time"
                :columns="timeColumns"
                label="开始" label-width="80rpx" align-right
                placeholder="开始时间"
                @confirm="onStartTimeConfirm"
              />
            </view>
            <text class="time-separator">至</text>
            <view class="time-picker-wrapper">
              <wd-picker
                :z-index="1000"
                v-model="form.end_time"
                :columns="timeColumns"
                label="结束" label-width="80rpx" align-right
                placeholder="结束时间"
                @confirm="onEndTimeConfirm"
              />
            </view>
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
            custom-style="min-height: 160rpx;"
          />
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <PageFooter>
      <wd-button type="default" @click="goBack">取消</wd-button>
      <wd-button type="primary" @click="handleSubmit" custom-style="margin-left: 16rpx;">
        {{ isEdit ? '保存' : '创建' }}
      </wd-button>
    </PageFooter>

    <!-- 课程选择弹窗 -->
    <wd-popup v-model="showCoursePicker" position="bottom" :closable="true" :z-index="2000">
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
        <view v-else class="picker-empty">
          <text>暂无课程，请先创建课程</text>
        </view>
      </view>
    </wd-popup>

    <!-- 教师选择弹窗 -->
    <wd-popup v-model="showTeacherPicker" position="bottom" :closable="true" :z-index="2000">
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
        <view v-else class="picker-empty">
          <text>暂无可用教师，请先添加教师</text>
        </view>
      </view>
    </wd-popup>

    <!-- 教室选择弹窗 -->
    <wd-popup v-model="showClassroomPicker" position="bottom" :closable="true" :z-index="2000">
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
        <view v-else class="picker-empty">
          <text>暂无可用教室，请先添加教室</text>
        </view>
      </view>
    </wd-popup>

  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { scheduleApi } from '@/api'
import { courseApi, type Course } from '@/api/course'
import { teacherApi, type TeacherInfo } from '@/api/teacher'
import { classroomApi, type ClassroomInfo } from '@/api/classroom'
import { getMyInstitutions } from '@/api/category'
import PageFooter from '@/components/PageFooter/index.vue'
import Loading from '@/components/Loading/index.vue'

// 页面状态
const pageLoading = ref(false)
const scheduleId = ref('')
const isEdit = computed(() => !!scheduleId.value)

// 机构ID
const institutionId = ref('')

// 表单数据
const form = reactive({
  course_id: '',
  teacher_id: '',
  classroom_id: '',
  day_of_week: '1',
  start_time: '',
  end_time: '',
  max_students: '',
  notes: '',
})

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

// 生成时间选择列
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

// 时间选择回调
const onStartTimeConfirm = ({ value }: any) => {
  form.start_time = value
}

const onEndTimeConfirm = ({ value }: any) => {
  form.end_time = value
}

// 选择课程
const selectCourse = (course: Course) => {
  form.course_id = course.id
  selectedCourse.value = course
  showCoursePicker.value = false
}

// 选择教师
const selectTeacher = (teacher: TeacherInfo) => {
  form.teacher_id = teacher.id
  selectedTeacher.value = teacher
  showTeacherPicker.value = false
}

// 选择教室
const selectClassroom = (classroom: ClassroomInfo) => {
  form.classroom_id = classroom.id
  selectedClassroom.value = classroom
  // 自动填充最大学生数
  if (!form.max_students) {
    form.max_students = String(classroom.capacity)
  }
  showClassroomPicker.value = false
}

// 加载机构ID
const loadInstitutionId = async () => {
  try {
    const res = await getMyInstitutions()
    if (res && res.length > 0) {
      institutionId.value = res[0].id
    }
  } catch (error) {
    console.error('加载机构信息失败:', error)
  }
}

// 加载选项列表
const loadOptions = async () => {
  try {
    const params: any = {}
    if (institutionId.value) {
      params.institutionId = institutionId.value
    }

    const [courses, teachers, classrooms] = await Promise.all([
      courseApi.getList({ ...params, pageSize: 100 }),
      teacherApi.getList({ ...params, status: 'active' }),
      classroomApi.getList({ ...params, status: 'available' }),
    ])

    // 课程列表可能返回分页或数组
    courseList.value = Array.isArray(courses) ? courses : (courses as any)?.data || []
    teacherList.value = Array.isArray(teachers) ? teachers : []
    classroomList.value = Array.isArray(classrooms) ? classrooms : []
  } catch (error) {
    console.error('加载选项数据失败:', error)
    uni.showToast({ title: '加载数据失败', icon: 'none' })
  }
}

// 加载排课详情（编辑模式）
const loadScheduleDetail = async (id: string) => {
  try {
    pageLoading.value = true
    const res = await scheduleApi.getDetail(id)

    // 填充表单
    form.course_id = res.course_id
    form.teacher_id = res.teacher_id
    form.classroom_id = res.classroom_id
    form.day_of_week = res.day_of_week
    form.max_students = String(res.max_students)
    form.notes = res.notes || ''

    // 格式化时间（后端返回完整日期时间，只取 HH:mm）
    if (res.start_time) {
      const d = new Date(res.start_time)
      form.start_time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    if (res.end_time) {
      const d = new Date(res.end_time)
      form.end_time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }

    // 设置选中的关联数据
    if (res.course) {
      selectedCourse.value = res.course
    }
    if (res.teacher) {
      selectedTeacher.value = res.teacher
    }
    if (res.classroom) {
      selectedClassroom.value = res.classroom
    }
  } catch (error) {
    console.error('加载排课详情失败:', error)
    uni.showToast({ title: '加载详情失败', icon: 'none' })
  } finally {
    pageLoading.value = false
  }
}

// 表单校验
const validateForm = (): boolean => {
  if (!form.course_id) {
    uni.showToast({ title: '请选择课程', icon: 'none' })
    return false
  }
  if (!form.teacher_id) {
    uni.showToast({ title: '请选择教师', icon: 'none' })
    return false
  }
  if (!form.classroom_id) {
    uni.showToast({ title: '请选择教室', icon: 'none' })
    return false
  }
  if (!form.day_of_week) {
    uni.showToast({ title: '请选择上课星期', icon: 'none' })
    return false
  }
  if (!form.start_time) {
    uni.showToast({ title: '请选择开始时间', icon: 'none' })
    return false
  }
  if (!form.end_time) {
    uni.showToast({ title: '请选择结束时间', icon: 'none' })
    return false
  }
  if (form.start_time >= form.end_time) {
    uni.showToast({ title: '开始时间必须早于结束时间', icon: 'none' })
    return false
  }
  const maxStudents = Number(form.max_students)
  if (!maxStudents || maxStudents < 1) {
    uni.showToast({ title: '请输入正确的最大学生数', icon: 'none' })
    return false
  }
  return true
}

// 将 HH:mm 转换为 ISO 日期字符串（后端需要 DateString 格式）
const timeToDateString = (time: string): string => {
  const today = new Date()
  const [hours, minutes] = time.split(':').map(Number)
  today.setHours(hours, minutes, 0, 0)
  return today.toISOString()
}

// 提交表单（白名单方式构造字段，符合 AGENTS.md 规则 #26）
const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    uni.showLoading({ title: '提交中...', mask: true })

    const submitData = {
      course_id: form.course_id,
      teacher_id: form.teacher_id,
      classroom_id: form.classroom_id,
      day_of_week: form.day_of_week,
      start_time: timeToDateString(form.start_time),
      end_time: timeToDateString(form.end_time),
      max_students: Number(form.max_students),
      notes: form.notes || undefined,
    }

    if (isEdit.value) {
      await scheduleApi.update(scheduleId.value, submitData)
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await scheduleApi.create(submitData)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }

    setTimeout(() => {
      uni.navigateBack()
    }, 500)
  } catch (error: any) {
    console.error('提交失败:', error)
    uni.showToast({ title: error.message || '提交失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// 返回
const goBack = () => {
  uni.navigateBack()
}

onLoad(async (options: any) => {
  const id = options?.id || ''
  const preSelectCourseId = options?.courseId || ''

  scheduleId.value = id

  // 加载机构ID
  await loadInstitutionId()

  // 加载选项列表
  await loadOptions()

  if (id) {
    // 编辑模式：加载详情
    await loadScheduleDetail(id)
  } else if (preSelectCourseId) {
    // 预选课程
    form.course_id = preSelectCourseId
    const course = courseList.value.find((c) => c.id === preSelectCourseId)
    if (course) {
      selectedCourse.value = course
    }
  }
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

.time-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.time-picker-wrapper {
  flex: 1;
}

.time-separator {
  font-size: 28rpx;
  color: #4e5969;
  flex-shrink: 0;
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
