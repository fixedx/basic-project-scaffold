<template>
  <view v-if="isReady" class="admin-edit-page">
    <view v-if="loading" class="loading-container">
      <Loading text="加载中..." />
    </view>

    <template v-else>
      <view class="form-container">
        <!-- 基本信息 -->
        <view class="section">
          <view class="section-title">基本信息</view>

          <view class="form-group">
            <view class="form-label required">机构名称</view>
            <wd-input v-model="form.name" placeholder="请输入机构名称" />
          </view>

          <view class="form-group">
            <view class="form-label">机构Logo</view>
            <FileUpload
              v-model="form.logo"
              mode="avatar"
              path-prefix="institution/logo"
              :is-public="true"
              avatar-size="160rpx"
            />
          </view>

          <view class="form-group">
            <view class="form-label">机构简介</view>
            <wd-textarea
              v-model="form.introduction"
              placeholder="请输入机构简介"
              :maxlength="500"
              show-word-limit
              :rows="4"
            />
          </view>

          <view class="form-group">
            <view class="form-label">机构标签</view>
            <EnumsTag
              v-model="form.tags"
              enum-type="institution_tag"
              :enum-items="tagEnums"
              multiple
            />
          </view>

          <view class="form-group">
            <view class="form-label">经营类目</view>
            <EnumsTag
              v-model="form.category_ids"
              enum-type="institution_category"
              :enum-items="categoryEnums"
              multiple
            />
          </view>

          <view class="form-group">
            <view class="form-label">联系电话</view>
            <wd-input v-model="form.contact_phone" placeholder="请输入联系电话" type="tel" />
          </view>
        </view>

        <!-- 地址信息 -->
        <view class="section">
          <view class="section-title">地址信息</view>

          <view class="form-group">
            <view class="form-label">所在地区</view>
            <view class="area-display" @click="chooseLocation">
              <text v-if="form.province" class="area-text">
                {{ form.province }} {{ form.city }} {{ form.district }}
              </text>
              <text v-else class="area-placeholder">点击选择地区</text>
              <text class="iconfont icon-location"></text>
            </view>
          </view>

          <view class="form-group">
            <view class="form-label">详细地址</view>
            <wd-input v-model="form.address" placeholder="请输入详细地址" />
          </view>
        </view>

        <!-- 资质信息 -->
        <view class="section">
          <view class="section-title">资质信息</view>

          <view class="form-group">
            <view class="form-label">营业执照号</view>
            <wd-input v-model="form.license_no" placeholder="请输入统一社会信用代码" />
          </view>

          <view class="form-group">
            <view class="form-label">营业执照</view>
            <FileUpload
              v-model="form.license_img"
              path-prefix="institution/license"
              :is-public="false"
            />
          </view>

          <view class="form-group">
            <view class="form-label">法人代表</view>
            <wd-input v-model="form.legal_person" placeholder="请输入法人代表姓名" />
          </view>

          <view class="form-group">
            <view class="form-label">身份证正面</view>
            <FileUpload
              v-model="form.id_card_front"
              path-prefix="institution/idcard"
              :is-public="false"
            />
          </view>

          <view class="form-group">
            <view class="form-label">身份证反面</view>
            <FileUpload
              v-model="form.id_card_back"
              path-prefix="institution/idcard"
              :is-public="false"
            />
          </view>
        </view>

        <!-- 结算信息 -->
        <view class="section">
          <view class="section-title">结算信息</view>

          <view class="form-group">
            <view class="form-label">开户银行</view>
            <wd-input v-model="form.bank_name" placeholder="请输入开户银行" />
          </view>

          <view class="form-group">
            <view class="form-label">银行账号</view>
            <wd-input v-model="form.bank_account" placeholder="请输入银行账号" />
          </view>

          <view class="form-group">
            <view class="form-label">开户名称</view>
            <wd-input v-model="form.account_holder" placeholder="请输入开户名称" />
          </view>
        </view>

        <!-- 品牌宣传 -->
        <view class="section">
          <view class="section-title">品牌宣传</view>

          <view class="form-group">
            <view class="form-label">教学环境</view>
            <FileUpload
              v-model="teachingEnvImages"
              :limit="20"
              path-prefix="institution/teaching-env"
              :is-public="true"
            />
          </view>

          <view class="form-group">
            <view class="form-label">荣誉时刻</view>
            <FileUpload
              v-model="honorImages"
              :limit="20"
              path-prefix="institution/honors"
              :is-public="true"
            />
          </view>

          <view class="form-group">
            <view class="form-label">学员风采</view>
            <FileUpload
              v-model="studentImages"
              :limit="30"
              path-prefix="institution/showcases"
              :is-public="true"
              accept="all"
            />
          </view>
        </view>

        <!-- 审核状态 -->
        <view class="section">
          <view class="section-title">审核状态</view>
          <view class="form-group">
            <view class="form-label">当前状态</view>
            <view class="status-tag" :class="`status-${form.audit_status}`">
              <text>{{ getStatusText(form.audit_status) }}</text>
            </view>
          </view>
          <view v-if="form.reject_reason" class="form-group">
            <view class="form-label">驳回原因</view>
            <text class="reject-reason">{{ form.reject_reason }}</text>
          </view>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <PageFooter>
        <view class="footer-actions">
          <wd-button plain custom-class="cancel-btn-common" @click="handleCancel">取消</wd-button>
          <wd-button type="primary" :loading="saving" @click="handleSave">保存修改</wd-button>
        </view>
      </PageFooter>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { institutionApi, type InstitutionInfo } from '@/api/institution'
import { adminApi } from '@/api/admin'
import { useAuthGuard } from '@/composables/useAuthGuard'
import { useEnums } from '@/composables/useEnums'
import Loading from '@/components/Loading/index.vue'
import FileUpload from '@/components/FileUpload/index.vue'
import EnumsTag from '@/components/EnumsTag/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

const { isReady } = useAuthGuard('admin')
const { loadEnumsByTypes, getEnumList, ENUM_TYPES } = useEnums()

const loading = ref(true)
const saving = ref(false)
const institutionId = ref('')

// 表单数据
const form = ref({
  name: '',
  logo: '',
  introduction: '',
  tags: '',
  category_ids: [] as string[],
  contact_phone: '',
  province: '',
  city: '',
  district: '',
  address: '',
  latitude: 0,
  longitude: 0,
  license_no: '',
  license_img: '',
  legal_person: '',
  id_card_front: '',
  id_card_back: '',
  bank_name: '',
  bank_account: '',
  account_holder: '',
  audit_status: '',
  reject_reason: '',
})

// 子表图片（扁平化管理）
const teachingEnvImages = ref<string[]>([])
const honorImages = ref<string[]>([])
const studentImages = ref<string[]>([])

// 枚举数据
const tagEnums = ref<any[]>([])
const categoryEnums = ref<any[]>([])

onLoad(async (options: any) => {
  if (options?.id) {
    institutionId.value = options.id
    await loadEnums()
    await loadInstitutionDetail()
  }
})

/**
 * 加载枚举数据
 */
const loadEnums = async () => {
  try {
    await loadEnumsByTypes(['institution_tag', 'institution_category'])
    tagEnums.value = getEnumList('institution_tag')
    categoryEnums.value = getEnumList('institution_category')
  } catch (error) {
    console.error('加载枚举失败:', error)
  }
}

/**
 * 加载机构详情
 */
const loadInstitutionDetail = async () => {
  try {
    loading.value = true
    const data = await institutionApi.getById(institutionId.value) as InstitutionInfo & Record<string, any>
    if (!data) {
      uni.showToast({ title: '机构不存在', icon: 'none' })
      return
    }

    // 填充基本信息
    form.value.name = data.name || ''
    form.value.logo = data.logo || ''
    form.value.introduction = data.introduction || ''
    form.value.tags = data.tags || ''
    form.value.category_ids = data.category_ids || []
    form.value.contact_phone = data.contact_phone || ''
    form.value.province = data.province || ''
    form.value.city = data.city || ''
    form.value.district = data.district || ''
    form.value.address = data.address || ''
    form.value.latitude = data.latitude || 0
    form.value.longitude = data.longitude || 0

    // 资质信息
    form.value.license_no = data.license_no || ''
    form.value.license_img = data.license_img || ''
    form.value.legal_person = data.legal_person || ''
    form.value.id_card_front = data.id_card_imgs?.front || ''
    form.value.id_card_back = data.id_card_imgs?.back || ''

    // 结算信息
    form.value.bank_name = data.bank_name || ''
    form.value.bank_account = data.bank_account || ''
    form.value.account_holder = data.account_holder || ''

    // 审核状态
    form.value.audit_status = data.audit_status || ''
    form.value.reject_reason = data.reject_reason || ''

    // 品牌宣传（子表 → 扁平数组）
    teachingEnvImages.value = (data.teaching_environments || []).map((e: any) => e.img_url).filter(Boolean)
    honorImages.value = (data.honors || []).map((h: any) => h.img_url).filter(Boolean)
    studentImages.value = (data.showcases || [])
      .filter((s: any) => s.type === 'student_work' || s.type === 'activity')
      .map((s: any) => s.img_url)
      .filter(Boolean)
  } catch (error) {
    console.error('加载机构详情失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/**
 * 选择地图定位
 */
const chooseLocation = () => {
  uni.chooseLocation({
    success: (res) => {
      form.value.latitude = res.latitude
      form.value.longitude = res.longitude
      // 尝试解析地址
      if (res.address) {
        form.value.address = res.address
      }
      if (res.name) {
        form.value.address = res.name
      }
    },
    fail: () => {
      // 用户取消选择
    },
  })
}

/**
 * 获取状态文本
 */
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    contract_signing: '待签约',
    contract_review: '签约审核中',
    approved: '已通过',
    rejected: '已驳回',
    frozen: '已冻结',
  }
  return statusMap[status || 'contract_signing'] || status
}

/**
 * 构建提交数据（白名单方式）
 */
const buildSubmitData = () => {
  const data: Record<string, any> = {
    name: form.value.name,
    logo: form.value.logo || undefined,
    introduction: form.value.introduction || undefined,
    tags: form.value.tags || undefined,
    category_ids: form.value.category_ids.length > 0 ? form.value.category_ids : undefined,
    contact_phone: form.value.contact_phone || undefined,
    province: form.value.province || undefined,
    city: form.value.city || undefined,
    district: form.value.district || undefined,
    address: form.value.address || undefined,
    latitude: form.value.latitude || undefined,
    longitude: form.value.longitude || undefined,
    license_no: form.value.license_no || undefined,
    license_img: form.value.license_img || undefined,
    legal_person: form.value.legal_person || undefined,
    bank_name: form.value.bank_name || undefined,
    bank_account: form.value.bank_account || undefined,
    account_holder: form.value.account_holder || undefined,
  }

  // 身份证图片
  if (form.value.id_card_front || form.value.id_card_back) {
    data.id_card_imgs = {
      front: form.value.id_card_front || '',
      back: form.value.id_card_back || '',
    }
  }

  // 子表：教学环境
  if (teachingEnvImages.value.length > 0) {
    data.teaching_environments = teachingEnvImages.value.map((url, i) => ({
      img_url: url,
      sort_order: i,
    }))
  } else {
    data.teaching_environments = []
  }

  // 子表：荣誉时刻
  if (honorImages.value.length > 0) {
    data.honors = honorImages.value.map((url, i) => ({
      title: '',
      img_url: url,
      sort_order: i,
    }))
  } else {
    data.honors = []
  }

  // 子表：学员风采
  if (studentImages.value.length > 0) {
    data.showcases = studentImages.value.map((url, i) => ({
      img_url: url,
      type: 'student_work' as const,
      sort_order: i,
    }))
  } else {
    data.showcases = []
  }

  return data
}

/**
 * 保存修改
 */
const handleSave = async () => {
  if (!form.value.name.trim()) {
    uni.showToast({ title: '请输入机构名称', icon: 'none' })
    return
  }

  try {
    saving.value = true
    const submitData = buildSubmitData()
    await adminApi.updateInstitution(institutionId.value, submitData)
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  } catch (error) {
    console.error('保存失败:', error)
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

/**
 * 取消编辑
 */
const handleCancel = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.admin-edit-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
}

.form-container {
  padding: 16rpx 0 180rpx;
}

.section {
  margin-bottom: 16rpx;
  padding: 32rpx;
  background-color: $uni-bg-color;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid $uni-border-color-light;
}

.form-group {
  margin-bottom: 28rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  font-size: 28rpx;
  color: $uni-text-color;
  margin-bottom: 12rpx;

  &.required::before {
    content: '*';
    color: $uni-color-error;
    margin-right: 8rpx;
  }
}

.area-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background-color: $uni-bg-color-grey;
  border-radius: 12rpx;
  border: 2rpx solid $uni-border-color-light;
}

.area-text {
  font-size: 28rpx;
  color: $uni-text-color;
}

.area-placeholder {
  font-size: 28rpx;
  color: $uni-text-color-tertiary;
}

.status-tag {
  display: inline-block;
  padding: 8rpx 24rpx;
  border-radius: 8rpx;
  font-size: 24rpx;

  &.status-draft {
    background-color: $uni-bg-color-grey;
    color: $uni-text-color-secondary;
  }

  &.status-pending {
    background-color: #fff7e6;
    color: $uni-color-warning;
  }

  &.status-approved {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
  }

  &.status-rejected {
    background-color: #fff1f0;
    color: $uni-color-error;
  }

  &.status-frozen {
    background-color: #f5f5f5;
    color: #999;
  }
}

.reject-reason {
  font-size: 28rpx;
  color: $uni-color-error;
  line-height: 1.6;
}

.footer-actions {
  display: flex;
  gap: 20rpx;

  :deep(.wd-button) {
    flex: 1;
  }
}
</style>
