<template>
  <view class="page">
    <view v-if="loading" class="loading">
      <Loading text="加载中..." />
    </view>

    <view v-else class="form-container">
      <!-- 基础信息 -->
      <view class="section">
        <view class="section-title">基础信息</view>

        <view class="form-group">
          <view class="form-label required">头像</view>
          <FileUpload v-model="form.photo" :max-count="1" file-type="image" accept="image" />
        </view>

        <view class="form-group">
          <view class="form-label required">教师姓名</view>
          <wd-input v-model="form.name" placeholder="请输入教师姓名" maxlength="50" show-word-limit />
        </view>

        <view class="form-group">
          <view class="form-label">性别</view>
          <view class="gender-tags">
            <view
              v-for="item in genderOptions"
              :key="item.value"
              class="gender-tag"
              :class="{ active: form.gender === item.value }"
              @click="form.gender = item.value as any"
            >
              {{ item.label }}
            </view>
          </view>
        </view>

        <view class="form-group">
          <view class="form-label">手机号</view>
          <wd-input v-model="form.phone" type="number" placeholder="请输入手机号" maxlength="20" />
        </view>

        <view class="form-group">
          <view class="form-label required">状态</view>
          <view class="status-tags">
            <view
              v-for="item in statusOptions"
              :key="item.value"
              class="status-tag"
              :class="{ active: form.status === item.value }"
              @click="form.status = item.value as any"
            >
              {{ item.label }}
            </view>
          </view>
        </view>
      </view>

      <!-- 专业信息 -->
      <view class="section">
        <view class="section-title">专业信息</view>

        <view class="form-group">
          <view class="form-label">教授科目</view>
          <view class="subject-tags">
            <view
              v-for="(subject, index) in form.subjects"
              :key="index"
              class="subject-tag"
              @click="removeSubject(index)"
            >
              {{ subject }}
              <text class="remove-icon">×</text>
            </view>
            <view class="subject-tag add-tag" @click="showAddSubject = true">+ 添加</view>
          </view>
        </view>

        <view class="form-group">
          <view class="form-label">职称/资质</view>
          <wd-input v-model="form.title" placeholder="如：高级教师、国家一级运动员" maxlength="100" />
        </view>

        <view class="form-group">
          <view class="form-label">教龄</view>
          <wd-input v-model.number="form.years_of_experience" type="number" placeholder="请输入教龄">
            <template #suffix>
              <text>年</text>
            </template>
          </wd-input>
        </view>

        <view class="form-group">
          <view class="form-label">资格证书</view>
          <view class="certificate-tags">
            <view
              v-for="(cert, index) in form.certificates"
              :key="index"
              class="certificate-tag"
              @click="removeCertificate(index)"
            >
              {{ cert }}
              <text class="remove-icon">×</text>
            </view>
            <view class="certificate-tag add-tag" @click="showAddCertificate = true">+ 添加</view>
          </view>
        </view>

        <view class="form-group">
          <view class="form-label">教师简介</view>
          <wd-textarea
            v-model="form.bio"
            placeholder="教师的教学经验、专长等"
            :maxlength="1000"
            show-word-limit
            :auto-height="true"
            custom-style="min-height: 200rpx;"
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

    <!-- 添加科目弹窗 -->
    <wd-popup v-model="showAddSubject" position="bottom" :closable="true" :z-index="2000">
      <view class="popup-content">
        <view class="popup-title">添加科目</view>
        <view class="preset-items">
          <view
            v-for="item in presetSubjects"
            :key="item"
            class="preset-item"
            @click="addSubject(item)"
          >
            {{ item }}
          </view>
        </view>
        <view class="custom-input">
          <wd-input
            v-model="customSubject"
            placeholder="或输入自定义科目"
            @confirm="addCustomSubject"
          />
          <wd-button type="primary" size="small" @click="addCustomSubject">添加</wd-button>
        </view>
      </view>
    </wd-popup>

    <!-- 添加证书弹窗 -->
    <wd-popup v-model="showAddCertificate" position="bottom" :closable="true" :z-index="2000">
      <view class="popup-content">
        <view class="popup-title">添加资格证书</view>
        <view class="custom-input">
          <wd-input
            v-model="customCertificate"
            placeholder="请输入证书名称"
            @confirm="addCustomCertificate"
          />
          <wd-button type="primary" size="small" @click="addCustomCertificate">添加</wd-button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { teacherApi, type CreateTeacherDto } from '@/api/teacher'
import FileUpload from '@/components/FileUpload/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import Loading from '@/components/Loading/index.vue'
import { isValidPhone } from '@/utils/validator'
const loading = ref(false)
const teacherId = ref('')
const institutionId = ref('')
const isEdit = computed(() => !!teacherId.value)

const genderOptions = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
]

const statusOptions = [
  { label: '在职', value: 'active' },
  { label: '休假', value: 'on_leave' },
  { label: '离职', value: 'inactive' },
]

const presetSubjects = [
  '美术',
  '书法',
  '钢琴',
  '舞蹈',
  '声乐',
  '吉他',
  '架子鼓',
  '小提琴',
  '篮球',
  '足球',
  '羽毛球',
  '乒乓球',
  '游泳',
  '跆拳道',
  '英语',
  '数学',
  '编程',
]

const showAddSubject = ref(false)
const customSubject = ref('')
const showAddCertificate = ref(false)
const customCertificate = ref('')

// 表单数据
const form = reactive<CreateTeacherDto>({
  institution_id: '',
  name: '',
  gender: undefined,
  phone: '',
  photo: '',
  subjects: [],
  title: '',
  years_of_experience: undefined,
  bio: '',
  certificates: [],
  status: 'active',
  sort_order: 0,
})

onLoad((options) => {
  institutionId.value = options?.institutionId || ''
  teacherId.value = options?.id || ''

  if (!institutionId.value) {
    uni.showToast({ title: '缺少机构ID', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
    return
  }

  form.institution_id = institutionId.value

  if (isEdit.value) {
    loadTeacherDetail(teacherId.value)
  }
})

/**
 * 加载教师详情
 */
const loadTeacherDetail = async (id: string) => {
  try {
    loading.value = true
    const res = await teacherApi.getDetail(id)

    Object.assign(form, {
      name: res.name,
      gender: res.gender,
      phone: res.phone,
      photo: res.photo,
      subjects: res.subjects || [],
      title: res.title,
      years_of_experience: res.years_of_experience,
      bio: res.bio,
      certificates: res.certificates || [],
      status: res.status,
      sort_order: res.sort_order,
    })
  } catch (error) {
    console.error('加载教师详情失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 添加预设科目
 */
const addSubject = (subject: string) => {
  if (!form.subjects) {
    form.subjects = []
  }
  if (!form.subjects.includes(subject)) {
    form.subjects.push(subject)
  }
  showAddSubject.value = false
}

/**
 * 添加自定义科目
 */
const addCustomSubject = () => {
  const subject = customSubject.value.trim()
  if (!subject) {
    uni.showToast({ title: '请输入科目名称', icon: 'none' })
    return
  }

  if (!form.subjects) {
    form.subjects = []
  }

  if (form.subjects.includes(subject)) {
    uni.showToast({ title: '该科目已添加', icon: 'none' })
    return
  }

  form.subjects.push(subject)
  customSubject.value = ''
  showAddSubject.value = false
}

/**
 * 移除科目
 */
const removeSubject = (index: number) => {
  form.subjects?.splice(index, 1)
}

/**
 * 添加自定义证书
 */
const addCustomCertificate = () => {
  const cert = customCertificate.value.trim()
  if (!cert) {
    uni.showToast({ title: '请输入证书名称', icon: 'none' })
    return
  }

  if (!form.certificates) {
    form.certificates = []
  }

  if (form.certificates.includes(cert)) {
    uni.showToast({ title: '该证书已添加', icon: 'none' })
    return
  }

  form.certificates.push(cert)
  customCertificate.value = ''
  showAddCertificate.value = false
}

/**
 * 移除证书
 */
const removeCertificate = (index: number) => {
  form.certificates?.splice(index, 1)
}

/**
 * 表单校验
 */
const validateForm = (): boolean => {
  if (!form.name) {
    uni.showToast({ title: '请输入教师姓名', icon: 'none' })
    return false
  }

  if (!form.photo) {
    uni.showToast({ title: '请上传教师头像', icon: 'none' })
    return false
  }

  if (form.phone && !isValidPhone(form.phone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return false
  }

  return true
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    uni.showLoading({ title: '提交中...', mask: true })
    
    if (isEdit.value) {
      await teacherApi.update(teacherId.value, {
        name: form.name,
        gender: form.gender,
        phone: form.phone,
        photo: form.photo,
        subjects: form.subjects,
        title: form.title,
        years_of_experience: form.years_of_experience,
        bio: form.bio,
        certificates: form.certificates,
        status: form.status,
      })
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await teacherApi.create(form)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }

    // 触发列表刷新
    uni.$emit('refreshTeacherList')
    
    setTimeout(() => {
      uni.navigateBack()
    }, 500)
  } catch (error) {
    console.error('提交失败:', error)
    uni.showToast({ title: '提交失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

/**
 * 返回
 */
const goBack = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.form-container {
  padding: 24rpx 32rpx 160rpx;
}

.section {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-bottom: 32rpx;
}

.form-group {
  margin-bottom: 32rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  font-size: 28rpx;
  color: $uni-text-color;
  margin-bottom: 16rpx;

  &.required::before {
    content: '*';
    color: $uni-color-error;
    margin-right: 8rpx;
  }
}

.gender-tags,
.status-tags {
  display: flex;
  gap: 16rpx;
}

.gender-tag,
.status-tag {
  flex: 1;
  padding: 20rpx;
  font-size: 28rpx;
  text-align: center;
  color: $uni-text-color-secondary;
  background-color: $uni-bg-color-grey;
  border-radius: 8rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s;

  &.active {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
    border-color: $uni-color-primary;
  }
}

.subject-tags,
.certificate-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.subject-tag,
.certificate-tag {
  padding: 12rpx 24rpx;
  font-size: 28rpx;
  color: $uni-text-color;
  background-color: $uni-bg-color-grey;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;

  &.add-tag {
    color: $uni-color-primary;
    background-color: $uni-color-primary-lighter;
    border: 2rpx dashed $uni-color-primary;
  }
}

.remove-icon {
  font-size: 32rpx;
  color: $uni-text-color-tertiary;
}

.popup-content {
  padding: 48rpx 32rpx;
}

.popup-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-bottom: 32rpx;
}

.preset-items {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.preset-item {
  padding: 16rpx 32rpx;
  font-size: 28rpx;
  color: $uni-text-color;
  background-color: $uni-bg-color-grey;
  border-radius: 8rpx;
}

.custom-input {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

// PageFooter 内部布局样式
:deep(.page-footer) {
  display: flex;
  gap: 16rpx;
}
</style>
