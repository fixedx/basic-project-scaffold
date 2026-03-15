<template>
  <view class="page">
    <!-- 加载状态 -->
    <view class="loading-state" v-if="loading">
      <Loading text="加载中..." />
    </view>

    <view class="form-container" v-else>
      <!-- 头像 -->
      <view class="avatar-section">
        <!-- 使用 FileUpload 组件的 avatar 模式 -->
        <FileUpload
          v-model="form.avatar"
          mode="avatar"
          path-prefix="avatars"
          :is-public="true"
          avatar-size="160rpx"
        />
        <text class="avatar-tip">点击更换头像</text>
      </view>

      <!-- 基本信息 -->
      <view class="section">
        <view class="section-title">基本信息</view>

        <view class="form-group">
          <view class="form-label required">宝贝姓名</view>
          <wd-input
            v-model="form.name"
            placeholder="请输入宝贝姓名"
            clearable
          />
        </view>

        <view class="form-group">
          <view class="form-label">性别</view>
          <view class="gender-tags">
            <view
              class="gender-tag"
              :class="{ active: form.gender === 'male' }"
              @click="form.gender = 'male'"
            >
              <text class="iconfont icon-male"></text>
              <text>男孩</text>
            </view>
            <view
              class="gender-tag"
              :class="{ active: form.gender === 'female' }"
              @click="form.gender = 'female'"
            >
              <text class="iconfont icon-female"></text>
              <text>女孩</text>
            </view>
          </view>
        </view>

        <view class="form-group">
          <view class="form-label">出生日期</view>
          <wd-datetime-picker
            v-model="birthdayValue"
            type="date"
            :max-date="maxDate"
            placeholder="请选择出生日期"
            @confirm="handleDateConfirm"
          />
        </view>

        <view class="form-group">
          <view class="form-label">年龄</view>
          <wd-input
            v-model="form.age"
            type="number"
            placeholder="请输入年龄（可根据出生日期自动计算）"
            :maxlength="3"
            clearable
          />
        </view>
      </view>

      <!-- 兴趣爱好 -->
      <view class="section">
        <view class="section-title">兴趣爱好</view>
        
        <view class="interests-wrapper">
          <view class="interest-tags">
            <view
              v-for="(interest, index) in form.interests"
              :key="index"
              class="interest-tag"
            >
              <text>{{ interest }}</text>
              <text class="remove-btn" @click="removeInterest(index)">×</text>
            </view>
            <view class="add-interest" @click="showInterestInput = true">
              <text class="iconfont icon-add"></text>
              <text>添加</text>
            </view>
          </view>
          
          <!-- 快捷标签 -->
          <view class="quick-tags">
            <text class="quick-label">推荐：</text>
            <view
              v-for="tag in quickTags"
              :key="tag"
              class="quick-tag"
              :class="{ selected: form.interests.includes(tag) }"
              @click="toggleQuickTag(tag)"
            >
              {{ tag }}
            </view>
          </view>
        </view>
      </view>

      <!-- 备注 -->
      <view class="section">
        <view class="section-title">备注</view>
        <wd-textarea
          v-model="form.remark"
          placeholder="请输入备注信息（选填）"
          :maxlength="200"
          show-word-limit
        />
      </view>
    </view>

    <!-- 底部操作栏 -->
    <PageFooter v-if="!loading">
      <view class="footer-actions">
        <wd-button
          v-if="isEdit"
          type="error"
          plain
          block
          custom-class="action-btn-secondary"
          @click="handleDelete"
        >
          删除
        </wd-button>
        <wd-button
          type="primary"
          block
          :loading="submitting"
          custom-class="action-btn-primary"
          @click="handleSubmit"
        >
          保存
        </wd-button>
      </view>
    </PageFooter>

    <!-- 添加兴趣弹窗 -->
    <wd-popup
      v-model="showInterestInput"
      position="bottom"
      :safe-area-inset-bottom="true"
    >
      <view class="interest-popup">
        <view class="popup-header">
          <text class="popup-title">添加兴趣爱好</text>
          <text class="popup-close" @click="showInterestInput = false">×</text>
        </view>
        <view class="popup-content">
          <wd-input
            v-model="newInterest"
            placeholder="请输入兴趣爱好"
            clearable
          />
        </view>
        <view class="popup-footer">
          <wd-button type="primary" block @click="addInterest">确定添加</wd-button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { childApi, type Child } from '@/api'
import { showErrorToast, showSuccessToast } from '@/utils/toast'
import FileUpload from '@/components/FileUpload/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import Loading from '@/components/Loading/index.vue'

// 页面参数
const childId = ref('')
const isEdit = computed(() => !!childId.value)

// 数据
const loading = ref(false)
const submitting = ref(false)

// 表单
const form = reactive({
  name: '',
  avatar: '',
  gender: '' as '' | 'male' | 'female',
  birthday: '',
  age: '',
  interests: [] as string[],
  remark: '',
})

// 日期选择
const birthdayValue = ref<number>(Date.now())
const maxDate = Date.now()

// 兴趣爱好
const showInterestInput = ref(false)
const newInterest = ref('')
const quickTags = ['舞蹈', '绘画', '音乐', '钢琴', '篮球', '足球', '游泳', '书法', '编程', '英语']

onLoad((options: any) => {
  if (options.id) {
    childId.value = options.id
    uni.setNavigationBarTitle({ title: '编辑宝贝' })
  } else {
    uni.setNavigationBarTitle({ title: '添加宝贝' })
  }
})

onMounted(() => {
  if (isEdit.value) {
    loadChildDetail()
  }
})

// 加载宝贝详情
const loadChildDetail = async () => {
  loading.value = true
  try {
    const data = await childApi.getDetail(childId.value)
    form.name = data.name
    form.avatar = data.avatar || ''
    form.gender = data.gender || ''
    form.birthday = data.birthday ? data.birthday.split('T')[0] : ''
    form.age = data.age ? String(data.age) : ''
    form.interests = data.interests || []
    form.remark = data.remark || ''
    
    if (form.birthday) {
      birthdayValue.value = new Date(form.birthday).getTime()
    }
  } catch (error: any) {
    showErrorToast(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// 头像上传由 FileUpload 组件自动处理，通过 v-model 双向绑定

// 日期确认
const handleDateConfirm = (e: { value: number }) => {
  birthdayValue.value = e.value
  const date = new Date(e.value)
  form.birthday = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  
  // 自动计算年龄
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age--
  }
  form.age = String(age)
}

// 添加兴趣
const addInterest = () => {
  const interest = newInterest.value.trim()
  if (!interest) {
    showErrorToast('请输入兴趣爱好')
    return
  }
  if (form.interests.includes(interest)) {
    showErrorToast('已添加过该兴趣')
    return
  }
  if (form.interests.length >= 10) {
    showErrorToast('最多添加10个兴趣')
    return
  }
  form.interests.push(interest)
  newInterest.value = ''
  showInterestInput.value = false
}

// 移除兴趣
const removeInterest = (index: number) => {
  form.interests.splice(index, 1)
}

// 切换快捷标签
const toggleQuickTag = (tag: string) => {
  const index = form.interests.indexOf(tag)
  if (index > -1) {
    form.interests.splice(index, 1)
  } else {
    if (form.interests.length >= 10) {
      showErrorToast('最多添加10个兴趣')
      return
    }
    form.interests.push(tag)
  }
}

// 表单验证
const validateForm = () => {
  if (!form.name.trim()) {
    showErrorToast('请输入宝贝姓名')
    return false
  }
  
  return true
}

// 提交
const handleSubmit = async () => {
  if (!validateForm()) return
  
  submitting.value = true
  try {
    const params = {
      name: form.name.trim(),
      avatar: form.avatar || undefined,
      gender: form.gender || undefined,
      birthday: form.birthday || undefined,
      age: form.age ? parseInt(form.age) : undefined,
      interests: form.interests.length > 0 ? form.interests : undefined,
      remark: form.remark.trim() || undefined,
    }
    
    if (isEdit.value) {
      await childApi.update(childId.value, params)
      showSuccessToast('保存成功')
    } else {
      await childApi.create(params)
      showSuccessToast('添加成功')
    }
    
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    showErrorToast(error.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

// 删除
const handleDelete = () => {
  uni.showModal({
    title: '提示',
    content: '确定要删除这个宝贝吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await childApi.delete(childId.value)
          showSuccessToast('删除成功')
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        } catch (error: any) {
          showErrorToast(error.message || '删除失败')
        }
      }
    },
  })
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

// 头像区域
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0;
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  
  .avatar-tip {
    font-size: 24rpx;
    color: $uni-text-color-secondary;
    margin-top: 16rpx;
  }
}

// 区块
.section {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  
  .section-title {
    font-size: 30rpx;
    font-weight: 600;
    color: $uni-text-color;
    margin-bottom: 24rpx;
    padding-left: 16rpx;
    border-left: 6rpx solid $uni-color-primary;
  }
}

// 表单组
.form-group {
  margin-bottom: 24rpx;
  
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
}

// 性别选择
.gender-tags {
  display: flex;
  gap: 24rpx;
  
  .gender-tag {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24rpx;
    border-radius: 12rpx;
    background-color: $uni-bg-color-grey;
    transition: all 0.3s;
    
    .iconfont {
      font-size: 36rpx;
      margin-right: 12rpx;
    }
    
    .icon-male {
      color: #1890ff;
    }
    
    .icon-female {
      color: #eb2f96;
    }
    
    text {
      font-size: 28rpx;
      color: $uni-text-color;
    }
    
    &.active {
      background-color: $uni-color-primary-lighter;
      border: 2rpx solid $uni-color-primary;
    }
  }
}

// 兴趣爱好
.interests-wrapper {
  .interest-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    margin-bottom: 24rpx;
    
    .interest-tag {
      display: flex;
      align-items: center;
      padding: 12rpx 20rpx;
      background-color: $uni-color-primary-lighter;
      color: $uni-color-primary;
      border-radius: 8rpx;
      font-size: 26rpx;
      
      .remove-btn {
        margin-left: 8rpx;
        font-size: 28rpx;
      }
    }
    
    .add-interest {
      display: flex;
      align-items: center;
      padding: 12rpx 20rpx;
      background-color: $uni-bg-color-grey;
      color: $uni-text-color-secondary;
      border-radius: 8rpx;
      font-size: 26rpx;
      border: 2rpx dashed $uni-border-color;
      
      .iconfont {
        font-size: 24rpx;
        margin-right: 8rpx;
      }
    }
  }
  
  .quick-tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12rpx;
    
    .quick-label {
      font-size: 24rpx;
      color: $uni-text-color-secondary;
    }
    
    .quick-tag {
      padding: 8rpx 16rpx;
      font-size: 24rpx;
      color: $uni-text-color-secondary;
      background-color: $uni-bg-color-grey;
      border-radius: 8rpx;
      
      &.selected {
        background-color: $uni-color-primary-lighter;
        color: $uni-color-primary;
      }
    }
  }
}

// 底部栏
.footer-actions {
  display: flex;
  gap: 24rpx;
  width: 100%;
  
  .action-btn-secondary {
    flex: 1;
  }
  
  .action-btn-primary {
    flex: 2;
  }
}

// 兴趣弹窗
.interest-popup {
  padding: 32rpx;
  
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32rpx;
    
    .popup-title {
      font-size: 32rpx;
      font-weight: 600;
      color: $uni-text-color;
    }
    
    .popup-close {
      font-size: 40rpx;
      color: $uni-text-color-secondary;
    }
  }
  
  .popup-content {
    margin-bottom: 32rpx;
  }
}
</style>
