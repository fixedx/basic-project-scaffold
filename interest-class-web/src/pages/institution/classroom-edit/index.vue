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
          <view class="form-label required">教室名称</view>
          <wd-input v-model="form.name" placeholder="请输入教室名称" maxlength="50" show-word-limit />
        </view>

        <view class="form-group">
          <view class="form-label required">容纳人数</view>
          <wd-input v-model.number="form.capacity" type="number" placeholder="请输入容纳人数">
            <template #suffix>
              <text>人</text>
            </template>
          </wd-input>
        </view>

        <view class="form-group">
          <view class="form-label">面积</view>
          <wd-input v-model.number="form.area" type="digit" placeholder="选填">
            <template #suffix>
              <text>㎡</text>
            </template>
          </wd-input>
        </view>

        <view class="form-group">
          <view class="form-label">楼层</view>
          <wd-input v-model="form.floor" placeholder="如：3楼、B1层" maxlength="20" />
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

      <!-- 设施设备 -->
      <view class="section">
        <view class="section-title">设施设备</view>

        <view class="form-group">
          <view class="form-label">已有设施</view>
          <view class="facility-tags">
            <view
              v-for="(facility, index) in form.facilities"
              :key="index"
              class="facility-tag"
              @click="removeFacility(index)"
            >
              {{ facility }}
              <text class="remove-icon">×</text>
            </view>
            <view class="facility-tag add-tag" @click="showAddFacility = true">+ 添加</view>
          </view>
        </view>

        <view class="form-group">
          <view class="form-label">备注说明</view>
          <wd-textarea
            v-model="form.description"
            placeholder="教室的其他说明信息"
            :maxlength="500"
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

    <!-- 添加设施弹窗 -->
    <wd-popup v-model="showAddFacility" position="bottom" :closable="true">
      <view class="facility-popup">
        <view class="popup-title">添加设施</view>
        <view class="preset-facilities">
          <view
            v-for="item in presetFacilities"
            :key="item"
            class="preset-item"
            @click="addFacility(item)"
          >
            {{ item }}
          </view>
        </view>
        <view class="custom-facility">
          <wd-input
            v-model="customFacility"
            placeholder="或输入自定义设施名称"
            @confirm="addCustomFacility"
          />
          <wd-button type="primary" size="small" @click="addCustomFacility">添加</wd-button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { classroomApi, type CreateClassroomDto } from '@/api/classroom'
import PageFooter from '@/components/PageFooter/index.vue'
import Loading from '@/components/Loading/index.vue'
const loading = ref(false)
const classroomId = ref('')
const institutionId = ref('')
const isEdit = computed(() => !!classroomId.value)

const statusOptions = [
  { label: '可用', value: 'available' },
  { label: '维护中', value: 'maintenance' },
  { label: '已停用', value: 'disabled' },
]

const presetFacilities = [
  '空调',
  '投影仪',
  '白板',
  '音响',
  '钢琴',
  '镜子',
  '把杆',
  '地垫',
  '储物柜',
  '饮水机',
  'WiFi',
  '监控',
]

const showAddFacility = ref(false)
const customFacility = ref('')

// 表单数据
const form = reactive<CreateClassroomDto>({
  institution_id: '',
  name: '',
  capacity: 0,
  area: undefined,
  floor: '',
  facilities: [],
  status: 'available',
  sort_order: 0,
  description: '',
})

onLoad((options) => {
  institutionId.value = options?.institutionId || ''
  classroomId.value = options?.id || ''

  if (!institutionId.value) {
    uni.showToast({ title: '缺少机构ID', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
    return
  }

  form.institution_id = institutionId.value

  if (isEdit.value) {
    loadClassroomDetail(classroomId.value)
  }
})

/**
 * 加载教室详情
 */
const loadClassroomDetail = async (id: string) => {
  try {
    loading.value = true
    const res = await classroomApi.getDetail(id)

    Object.assign(form, {
      name: res.name,
      capacity: res.capacity,
      area: res.area,
      floor: res.floor,
      facilities: res.facilities || [],
      status: res.status,
      sort_order: res.sort_order,
      description: res.description,
    })
  } catch (error) {
    console.error('加载教室详情失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 添加预设设施
 */
const addFacility = (facility: string) => {
  if (!form.facilities) {
    form.facilities = []
  }
  if (!form.facilities.includes(facility)) {
    form.facilities.push(facility)
  }
  showAddFacility.value = false
}

/**
 * 添加自定义设施
 */
const addCustomFacility = () => {
  const facility = customFacility.value.trim()
  if (!facility) {
    uni.showToast({ title: '请输入设施名称', icon: 'none' })
    return
  }

  if (!form.facilities) {
    form.facilities = []
  }

  if (form.facilities.includes(facility)) {
    uni.showToast({ title: '该设施已添加', icon: 'none' })
    return
  }

  form.facilities.push(facility)
  customFacility.value = ''
  showAddFacility.value = false
}

/**
 * 移除设施
 */
const removeFacility = (index: number) => {
  form.facilities?.splice(index, 1)
}

/**
 * 表单校验
 */
const validateForm = (): boolean => {
  if (!form.name) {
    uni.showToast({ title: '请输入教室名称', icon: 'none' })
    return false
  }

  if (!form.capacity || form.capacity <= 0) {
    uni.showToast({ title: '请输入正确的容纳人数', icon: 'none' })
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
      await classroomApi.update(classroomId.value, {
        name: form.name,
        capacity: form.capacity,
        area: form.area,
        floor: form.floor,
        facilities: form.facilities,
        status: form.status,
        description: form.description,
      })
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await classroomApi.create(form)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }

    // 触发列表刷新
    uni.$emit('refreshClassroomList')
    
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

.status-tags {
  display: flex;
  gap: 16rpx;
}

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

.facility-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.facility-tag {
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

.facility-popup {
  padding: 48rpx 32rpx;
}

.popup-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-bottom: 32rpx;
}

.preset-facilities {
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

.custom-facility {
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
