<template>
  <view class="profile-page">
    <!-- 基本信息卡片 -->
    <view class="section-card">
      <view class="section-title">基本信息</view>

      <view class="form-group">
        <view class="form-label required">机构名称</view>
        <wd-input
          v-model="formData.name"
          placeholder="请输入机构名称"
          :disabled="!isEditing"
          :maxlength="50"
        />
      </view>

      <view class="form-group">
        <view class="form-label">机构Logo</view>
        <FileUpload
          v-if="isEditing"
          v-model="formData.logo"
          mode="avatar"
          path-prefix="institutions/logos"
          :is-public="false"
          avatar-size="160rpx"
        />
        <view v-else class="logo-preview">
          <AsyncImage
            v-if="formData.logo"
            :url="formData.logo || ''"
            width="160rpx"
            height="160rpx"
            mode="aspectFill"
            custom-style="border-radius: 12rpx; overflow: hidden;"
          />
          <view v-else class="empty-logo">
            <text class="iconfont icon-image" style="font-size: 48rpx; color: #ccc;"></text>
          </view>
        </view>
      </view>

      <view class="form-group">
        <view class="form-label">机构简介</view>
        <wd-textarea
          v-model="formData.introduction"
          placeholder="请介绍机构特色、教学理念等"
          :maxlength="2000"
          :disabled="!isEditing"
          show-word-limit
        />
      </view>

      <view class="form-group">
        <view class="form-label">机构标签</view>
        <EnumsTag
          v-if="isEditing"
          v-model="tagCodes"
          enum-type="institution_tag"
          :enum-items="tagEnums"
          multiple
        />
        <view v-else class="tags-display">
          <view
            v-for="code in tagCodes"
            :key="code"
            class="tag-item"
          >
            {{ getEnumLabel(ENUM_TYPES.INSTITUTION_TAG, code) }}
          </view>
          <text v-if="!tagCodes.length" class="placeholder-text">暂未设置</text>
        </view>
      </view>

      <view class="form-group">
        <view class="form-label">经营类目</view>
        <EnumsTag
          v-if="isEditing"
          v-model="formData.category_ids!"
          enum-type="institution_category"
          :enum-items="categoryEnums"
          multiple
        />
        <view v-else class="tags-display">
          <view
            v-for="cat in displayCategories"
            :key="cat"
            class="tag-item"
          >
            {{ cat }}
          </view>
          <text v-if="!displayCategories.length" class="placeholder-text">暂未设置</text>
        </view>
      </view>

      <view class="form-group">
        <view class="form-label required">客服电话</view>
        <wd-input
          v-model="formData.contact_phone"
          placeholder="请输入联系电话"
          type="tel"
          :disabled="!isEditing"
        />
      </view>
    </view>

    <!-- 地址信息卡片 -->
    <view class="section-card">
      <view class="section-title">地址信息</view>

      <view class="form-group">
        <view class="form-label required">所在地区</view>
        <view v-if="!isEditing" class="area-display">
          <text>{{ areaDisplayText || '暂未设置' }}</text>
        </view>
        <view v-else class="area-with-map">
          <wd-picker
            v-model="areaValue"
            label=""
            :columns="areaColumns"
            :column-change="handleAreaColumnChange"
            :display-format="displayAreaFormat"
            placeholder="请选择省市区"
            @confirm="handleAreaConfirm"
            custom-class="area-picker"
          />
          <view class="map-btn" @click="chooseLocation">
            <text class="iconfont icon-location" style="font-size: 40rpx; color: #52c41a;"></text>
          </view>
        </view>
      </view>

      <view class="form-group">
        <view class="form-label required">详细地址</view>
        <wd-input
          v-model="formData.address"
          placeholder="请输入街道门牌号"
          :disabled="!isEditing"
        />
      </view>
    </view>

    <!-- 品牌宣传卡片 -->
    <view class="section-card">
      <view class="section-title">品牌宣传</view>

      <view class="form-group">
        <view class="form-label">教学环境（最多20张）</view>
        <FileUpload
          v-if="isEditing"
          v-model="teachingEnvImages"
          :limit="20"
          :multiple="true"
          file-type="image"
          :is-public="false"
          path-prefix="institutions/teaching-environment"
        />
        <view v-else class="image-grid">
          <AsyncImage
            v-for="(img, index) in teachingEnvImages"
            :key="'te-' + index"
            :url="img"
            width="200rpx"
            height="200rpx"
            mode="aspectFill"
            custom-style="border-radius: 8rpx; overflow: hidden;"
          />
          <text v-if="!teachingEnvImages.length" class="placeholder-text">暂未上传</text>
        </view>
      </view>

      <view class="form-group">
        <view class="form-label">荣誉时刻（最多20张）</view>
        <FileUpload
          v-if="isEditing"
          v-model="honorImages"
          :limit="20"
          :multiple="true"
          file-type="image"
          :is-public="false"
          path-prefix="institutions/honor-moments"
        />
        <view v-else class="image-grid">
          <AsyncImage
            v-for="(img, index) in honorImages"
            :key="'hm-' + index"
            :url="img"
            width="200rpx"
            height="200rpx"
            mode="aspectFill"
            custom-style="border-radius: 8rpx; overflow: hidden;"
          />
          <text v-if="!honorImages.length" class="placeholder-text">暂未上传</text>
        </view>
      </view>

      <view class="form-group">
        <view class="form-label">学员风采（最多30个）</view>
        <FileUpload
          v-if="isEditing"
          v-model="studentImages"
          :limit="30"
          :multiple="true"
          accept="all"
          file-type="image"
          :is-public="false"
          path-prefix="institutions/student-showcase"
        />
        <view v-else class="image-grid">
          <AsyncImage
            v-for="(img, index) in studentImages"
            :key="'ss-' + index"
            :url="img"
            width="200rpx"
            height="200rpx"
            mode="aspectFill"
            custom-style="border-radius: 8rpx; overflow: hidden;"
          />
          <text v-if="!studentImages.length" class="placeholder-text">暂未上传</text>
        </view>
      </view>
    </view>

    <!-- 资质信息卡片（仅展示，不可编辑） -->
    <view class="section-card">
      <view class="section-title">
        资质信息
        <text class="section-tip">（审核通过后不可修改）</text>
      </view>

      <view class="info-row">
        <text class="info-label">统一社会信用代码</text>
        <text class="info-value">{{ formData.license_no || '暂未填写' }}</text>
      </view>

      <view class="info-row">
        <text class="info-label">法人姓名</text>
        <text class="info-value">{{ formData.legal_person || '暂未填写' }}</text>
      </view>

      <view class="info-row">
        <text class="info-label">营业执照</text>
        <view class="info-value">
          <AsyncImage
            v-if="formData.license_img"
            :url="formData.license_img"
            width="200rpx"
            height="140rpx"
            mode="aspectFill"
            custom-style="border-radius: 8rpx; overflow: hidden;"
          />
          <text v-else class="placeholder-text">暂未上传</text>
        </view>
      </view>

      <view class="info-row">
        <text class="info-label">审核状态</text>
        <view class="status-tag" :class="`status-${formData.audit_status}`">
          {{ getStatusText(formData.audit_status) }}
        </view>
      </view>

      <view v-if="formData.audit_status === 'rejected' && formData.reject_reason" class="info-row">
        <text class="info-label">驳回原因</text>
        <text class="info-value reject-reason">{{ formData.reject_reason }}</text>
      </view>
    </view>

    <!-- 结算信息卡片 -->
    <view class="section-card">
      <view class="section-title">
        结算信息
        <text class="section-tip">（审核通过后不可修改）</text>
      </view>

      <view class="info-row">
        <text class="info-label">开户银行</text>
        <text class="info-value">{{ formData.bank_name || '暂未填写' }}</text>
      </view>

      <view class="info-row">
        <text class="info-label">银行账号</text>
        <text class="info-value">{{ formData.bank_account || '暂未填写' }}</text>
      </view>

      <view class="info-row">
        <text class="info-label">开户名称</text>
        <text class="info-value">{{ formData.account_holder || '暂未填写' }}</text>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <PageFooter>
      <wd-button
        v-if="!isEditing"
        type="primary"
        block
        @click="startEditing"
      >
        编辑基本信息
      </wd-button>
      <template v-else>
        <wd-button
          block
          @click="cancelEditing"
          custom-class="flex-1"
        >
          取消
        </wd-button>
        <wd-button
          type="primary"
          block
          :loading="saving"
          @click="handleSave"
          custom-class="flex-1"
        >
          保存
        </wd-button>
      </template>
    </PageFooter>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { institutionApi, type InstitutionInfo } from '@/api/institution'
import { useEnums } from '@/composables/useEnums'
import { areaList, parseAddress } from '@/utils/area-data'
import AsyncImage from '@/components/AsyncImage/index.vue'
import FileUpload from '@/components/FileUpload/index.vue'
import EnumsTag from '@/components/EnumsTag/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import { isValidPhone } from '@/utils/validator'

const { loadEnumsByTypes, ENUM_TYPES, getEnumLabel } = useEnums()

const loading = ref(true)
const saving = ref(false)
const isEditing = ref(false)
const categoryEnums = ref<any[]>([])
const tagEnums = ref<any[]>([])

// 原始数据备份（取消编辑时恢复）
let originalData: any = null

const formData = ref<Partial<InstitutionInfo>>({
  name: '',
  logo: '',
  introduction: '',
  tags: '',
  category_ids: [],
  contact_phone: '',
  province: '',
  city: '',
  district: '',
  address: '',
  license_no: '',
  license_img: '',
  legal_person: '',
  bank_name: '',
  bank_account: '',
  account_holder: '',
  audit_status: 'draft',
  reject_reason: '',
})

// 品牌宣传图片（UI state，保存时转换为后端 honors/showcases 结构）
const teachingEnvImages = ref<string[]>([])
const honorImages = ref<string[]>([])
const studentImages = ref<string[]>([])

// ===================== 标签管理 =====================

/** 标签代码数组（与逗号分隔字符串双向绑定） */
const tagCodes = computed({
  get: () => {
    const tags = formData.value.tags
    if (!tags || !tags.trim()) return [] as string[]
    return tags.split(',').map(t => t.trim()).filter(Boolean)
  },
  set: (val: string[]) => {
    formData.value.tags = val.join(',')
  },
})

// ===================== 地区选择器 =====================

const areaValue = ref<string[]>([])

/** 地区展示文本 */
const areaDisplayText = computed(() => {
  const { province, city, district } = formData.value
  if (province || city || district) {
    return [province, city, district].filter(Boolean).join(' ')
  }
  return ''
})

/** 构建省市区数据字典 */
const areaDict = computed(() => {
  const provinces = areaList.province_list
  const cities = areaList.city_list
  const counties = areaList.county_list

  const dict: Record<string, any[]> = {
    '0': []
  }

  // 省份
  dict['0'] = Object.keys(provinces).map(code => ({
    value: code,
    label: provinces[code]
  }))

  // 城市
  Object.keys(cities).forEach(code => {
    const provinceCode = code.substring(0, 2) + '0000'
    if (!dict[provinceCode]) {
      dict[provinceCode] = []
    }
    dict[provinceCode].push({
      value: code,
      label: cities[code]
    })
  })

  // 区县
  Object.keys(counties).forEach(code => {
    const cityCode = code.substring(0, 4) + '00'
    if (!dict[cityCode]) {
      dict[cityCode] = []
    }
    dict[cityCode].push({
      value: code,
      label: counties[code]
    })
  })

  return dict
})

const areaColumns = ref<any[][]>([])

/** 初始化地区列数据 */
const initAreaColumns = () => {
  const dict = areaDict.value
  const firstProvince = dict['0'][0]
  const firstCity = dict[firstProvince?.value]?.[0]
  const firstCounty = firstCity ? dict[firstCity.value]?.[0] : undefined

  areaColumns.value = [
    dict['0'] || [],
    firstCity ? dict[firstProvince.value] : [],
    firstCounty ? dict[firstCity.value] : []
  ]
}

/** 地区列变化处理 */
const handleAreaColumnChange = (pickerView: any, value: any, columnIndex: number, resolve: Function) => {
  const dict = areaDict.value
  const item = value[columnIndex]

  if (columnIndex === 0) {
    const cities = dict[item.value] || []
    const firstCity = cities[0]
    pickerView.setColumnData(1, cities)
    if (firstCity) {
      pickerView.setColumnData(2, dict[firstCity.value] || [])
    } else {
      pickerView.setColumnData(2, [])
    }
  } else if (columnIndex === 1) {
    pickerView.setColumnData(2, dict[item.value] || [])
  }

  resolve()
}

/** 地区展示格式化 */
const displayAreaFormat = (items: any[]) => {
  return items.map(item => item.label).join(' ')
}

/** 地区选择确认 */
const handleAreaConfirm = ({ selectedItems }: any) => {
  formData.value.province = selectedItems[0]?.label || ''
  formData.value.city = selectedItems[1]?.label || ''
  formData.value.district = selectedItems[2]?.label || ''
}

/** 根据名称反查 code，初始化地区选择器 */
const initAreaPickerFromNames = () => {
  const { province, city, district } = formData.value
  if (!province || !city || !district) return

  const dict = areaDict.value
  let provinceCode = ''
  let cityCode = ''
  let districtCode = ''

  for (const [code, name] of Object.entries(areaList.province_list)) {
    if (name === province) {
      provinceCode = code
      break
    }
  }

  if (provinceCode) {
    for (const [code, name] of Object.entries(areaList.city_list)) {
      if (code.startsWith(provinceCode.substring(0, 2)) && name === city) {
        cityCode = code
        break
      }
    }
  }

  if (cityCode) {
    for (const [code, name] of Object.entries(areaList.county_list)) {
      if (code.startsWith(cityCode.substring(0, 4)) && name === district) {
        districtCode = code
        break
      }
    }
  }

  if (provinceCode && cityCode && districtCode) {
    areaColumns.value = [
      dict['0'] || [],
      dict[provinceCode] || [],
      dict[cityCode] || []
    ]
    areaValue.value = [provinceCode, cityCode, districtCode]
  }
}

/** 选择地图位置 */
const chooseLocation = () => {
  uni.chooseLocation({
    success: (res) => {
      formData.value.latitude = res.latitude
      formData.value.longitude = res.longitude

      const addressInfo = parseAddress(res.address || res.name || '')

      if (addressInfo.province) formData.value.province = addressInfo.province
      if (addressInfo.city) formData.value.city = addressInfo.city
      if (addressInfo.district) formData.value.district = addressInfo.district

      if (addressInfo.detail) {
        formData.value.address = addressInfo.detail
      } else {
        formData.value.address = res.address
      }

      // 同步更新地区选择器
      if (addressInfo.provinceCode && addressInfo.cityCode && addressInfo.districtCode) {
        const dict = areaDict.value
        areaColumns.value = [
          dict['0'] || [],
          dict[addressInfo.provinceCode] || [],
          dict[addressInfo.cityCode] || []
        ]
        areaValue.value = [addressInfo.provinceCode, addressInfo.cityCode, addressInfo.districtCode]
      }

      uni.showToast({ title: '位置选择成功', icon: 'success' })
    },
    fail: (err) => {
      console.log('选择位置取消:', err)
    },
  })
}

// ===================== 类目展示 =====================

const displayCategories = computed(() => {
  if (!formData.value.category_ids?.length || !categoryEnums.value.length) return []
  return formData.value.category_ids.map(id => {
    const item = categoryEnums.value.find((e: any) => e.code === id)
    return item?.label || id
  })
})

// ===================== 状态 =====================

const getStatusText = (status?: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    contract_signing: '待签约',
    contract_review: '签约审核中',
    approved: '已通过',
    rejected: '已拒绝',
    frozen: '已冻结',
  }
  return statusMap[status || 'contract_signing'] || '未知状态'
}

// ===================== 数据加载 =====================

const loadInstitutionInfo = async () => {
  try {
    loading.value = true
    const result = await institutionApi.getCurrentInstitution()
    formData.value = { ...formData.value, ...result }
    // 从子表数据提取图片 URL
    if ((result as any).honors) {
      honorImages.value = (result as any).honors.map((h: any) => h.img_url).filter(Boolean)
    }
    if ((result as any).teaching_environments) {
      teachingEnvImages.value = (result as any).teaching_environments
        .map((e: any) => e.img_url)
        .filter(Boolean)
    }
    if ((result as any).showcases) {
      studentImages.value = (result as any).showcases
        .filter((s: any) => s.type === 'student_work' || s.type === 'activity')
        .map((s: any) => s.img_url)
        .filter(Boolean)
    }
    // 初始化地区选择器
    initAreaPickerFromNames()
  } catch (error: any) {
    console.error('加载机构信息失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const loadEnums = async () => {
  try {
    const data = await loadEnumsByTypes([ENUM_TYPES.INSTITUTION_CATEGORY, ENUM_TYPES.INSTITUTION_TAG])
    categoryEnums.value = data[ENUM_TYPES.INSTITUTION_CATEGORY] || []
    tagEnums.value = data[ENUM_TYPES.INSTITUTION_TAG] || []
  } catch (error) {
    console.error('加载枚举失败:', error)
  }
}

// ===================== 编辑操作 =====================

// 原始图片数据备份
let originalImages: { teachingEnv: string[]; honors: string[]; students: string[] } | null = null

const startEditing = () => {
  originalData = JSON.parse(JSON.stringify(formData.value))
  originalImages = {
    teachingEnv: [...teachingEnvImages.value],
    honors: [...honorImages.value],
    students: [...studentImages.value],
  }
  isEditing.value = true
}

const cancelEditing = () => {
  if (originalData) {
    formData.value = originalData
    originalData = null
  }
  if (originalImages) {
    teachingEnvImages.value = originalImages.teachingEnv
    honorImages.value = originalImages.honors
    studentImages.value = originalImages.students
    originalImages = null
  }
  isEditing.value = false
}

const handleSave = async () => {
  if (!formData.value.name?.trim()) {
    uni.showToast({ title: '请输入机构名称', icon: 'none' })
    return
  }
  if (!formData.value.contact_phone?.trim()) {
    uni.showToast({ title: '请输入客服电话', icon: 'none' })
    return
  }
  if (!isValidPhone(formData.value.contact_phone.trim())) {
    uni.showToast({ title: '请输入正确的客服电话', icon: 'none' })
    return
  }

  try {
    saving.value = true
    const institutionId = (formData.value as any).id
    if (!institutionId) {
      uni.showToast({ title: '机构信息异常', icon: 'none' })
      return
    }

    const updateData: Record<string, any> = {
      name: formData.value.name,
      logo: formData.value.logo,
      introduction: formData.value.introduction,
      tags: formData.value.tags,
      category_ids: formData.value.category_ids,
      contact_phone: formData.value.contact_phone,
      province: formData.value.province,
      city: formData.value.city,
      district: formData.value.district,
      address: formData.value.address,
      latitude: formData.value.latitude,
      longitude: formData.value.longitude,
      honors: honorImages.value.map((url, i) => ({
        title: '',
        img_url: url,
        sort_order: i,
      })),
      teaching_environments: teachingEnvImages.value.map((url, i) => ({
        img_url: url,
        sort_order: i,
      })),
      showcases: [
        ...studentImages.value.map((url, i) => ({
          img_url: url,
          type: 'student_work' as const,
          sort_order: i,
        })),
      ],
    }

    await institutionApi.update(institutionId, updateData)
    uni.showToast({ title: '保存成功', icon: 'success' })
    isEditing.value = false
    originalData = null
    await loadInstitutionInfo()
  } catch (error: any) {
    console.error('保存失败:', error)
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

onLoad(async () => {
  initAreaColumns()
  await Promise.all([loadInstitutionInfo(), loadEnums()])
})
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  padding: 24rpx 24rpx 180rpx;
}

.section-card {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $uni-text-color;
  margin-bottom: 32rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid $uni-border-color-light;
}

.section-tip {
  font-size: 24rpx;
  font-weight: normal;
  color: $uni-text-color-tertiary;
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

.logo-preview {
  display: inline-block;
}

.empty-logo {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background-color: $uni-bg-color-grey;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  font-size: 26rpx;
  color: $uni-text-color-tertiary;
}

// ===================== 标签样式 =====================

.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-item {
  padding: 8rpx 20rpx;
  font-size: 24rpx;
  border-radius: 8rpx;
  background-color: $uni-color-primary-lighter;
  color: $uni-color-primary;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

// ===================== 地区选择 =====================

.area-display {
  font-size: 28rpx;
  color: $uni-text-color;
  padding: 16rpx 0;
}

.area-with-map {
  display: flex;
  align-items: center;
  gap: 16rpx;

  :deep(.area-picker) {
    flex: 1;
  }
}

.map-btn {
  flex-shrink: 0;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $uni-bg-color-grey;
  border-radius: 12rpx;
}

// ===================== 图片网格 =====================

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

// ===================== 信息展示行 =====================

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20rpx 0;
  border-bottom: 1rpx solid $uni-border-color-light;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}

.info-label {
  font-size: 28rpx;
  color: $uni-text-color-secondary;
  flex-shrink: 0;
  width: 250rpx;
}

.info-value {
  font-size: 28rpx;
  color: $uni-text-color;
  text-align: right;
  flex: 1;
}

.reject-reason {
  color: $uni-color-error;
}

.status-tag {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  background-color: $uni-bg-color-grey;
  color: $uni-text-color-secondary;

  &.status-approved {
    background-color: rgba(82, 196, 26, 0.1);
    color: $uni-color-success;
  }

  &.status-pending {
    background-color: rgba(250, 173, 20, 0.1);
    color: $uni-color-warning;
  }

  &.status-rejected {
    background-color: rgba(245, 34, 45, 0.1);
    color: $uni-color-error;
  }

  &.status-frozen {
    background-color: rgba(0, 0, 0, 0.06);
    color: $uni-text-color-tertiary;
  }
}
</style>
