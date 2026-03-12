<template>
  <view class="institution-settle-page">
    <!-- 顶部步骤条 -->
    <view class="steps-wrapper">
      <wd-steps :current="currentStep" :steps="steps" />
    </view>

    <!-- 表单内容 -->
    <view class="form-content">
      <!-- 步骤1: 基础信息 -->
      <view v-show="currentStep === 0" class="step-panel">
        <view class="panel-title">基础信息</view>
        
        <view class="form-group">
          <view class="form-label required">机构名称</view>
          <wd-input
            v-model="formData.name"
            placeholder="请输入机构全称（需与营业执照一致）"
            :maxlength="50"
          />
        </view>
        
        <view class="form-group">
          <view class="form-label required">机构Logo</view>
          <FileUpload 
            v-model="formData.logo" 
            :limit="1"
            file-type="image"
            :is-public="false"
            path-prefix="institutions/logos"
          />
        </view>
        
        <view class="form-group">
          <view class="form-label">机构简介</view>
          <wd-textarea
            v-model="formData.introduction"
            placeholder="请介绍您的机构特色、教学理念等"
            :maxlength="2000"
            show-word-limit
            custom-class="custom-textarea"
          />
        </view>
        
        <view class="form-group">
          <view class="form-label">机构标签</view>
          <EnumsTag
            v-model="tagCodes"
            enum-type="institution_tag"
            :enum-items="tagEnums"
            multiple
          />
        </view>
        
        <view class="form-group">
          <view class="form-label required">经营类目</view>
          <EnumsTag
            v-model="formData.category_ids"
            enum-type="institution_category"
            :enum-items="categoryEnums"
            multiple
          />
        </view>
        
        <view class="form-group">
          <view class="form-label required">客服电话</view>
          <wd-input
            v-model="formData.contact_phone"
            placeholder="请输入联系电话"
            type="tel"
          />
        </view>
        
        <view class="form-group">
          <view class="form-label required">所在地区</view>
          <view class="area-with-map">
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
            placeholder="请输入街道门牌号（或通过地图选点自动填充）"
          />
        </view>
      </view>

      <!-- 步骤2: 资质认证 -->
      <view v-show="currentStep === 1" class="step-panel">
        <view class="panel-title">资质认证</view>
        
        <view class="form-group">
          <view class="form-label required">统一社会信用代码</view>
          <wd-input
            v-model="formData.license_no"
            placeholder="请输入18位信用代码"
            :maxlength="18"
          />
        </view>
        
        <view class="form-group">
          <view class="form-label required">营业执照</view>
          <FileUpload 
            v-model="formData.license_img" 
            :limit="1"
            file-type="image"
            :is-public="false"
            path-prefix="institutions/licenses"
          />
        </view>
        
        <view class="form-group">
          <view class="form-label required">法人姓名</view>
          <wd-input
            v-model="formData.legal_person"
            placeholder="请输入法人姓名（需与身份证一致）"
          />
        </view>
        
        <view class="form-group">
          <view class="form-label required">法人身份证</view>
          <view class="id-card-upload">
            <view class="upload-item">
              <text class="upload-label">正面</text>
              <FileUpload 
                v-model="formData.id_card_imgs.front" 
                :limit="1"
                file-type="image"
                :is-public="false"
                path-prefix="institutions/id-cards"
              />
            </view>
            <view class="upload-item">
              <text class="upload-label">反面</text>
              <FileUpload 
                v-model="formData.id_card_imgs.back" 
                :limit="1"
                file-type="image"
                :is-public="false"
                path-prefix="institutions/id-cards"
              />
            </view>
          </view>
        </view>
      </view>

      <!-- 步骤3: 结算账户 -->
      <view v-show="currentStep === 2" class="step-panel">
        <view class="panel-title">结算账户</view>
        
        <view class="form-group">
          <view class="form-label required">开户银行</view>
          <wd-input
            v-model="formData.bank_name"
            placeholder="如：招商银行、支付宝"
          />
        </view>
        
        <view class="form-group">
          <view class="form-label required">银行账号</view>
          <wd-input
            v-model="formData.bank_account"
            placeholder="请输入账号"
          />
        </view>
        
        <view class="form-group">
          <view class="form-label required">开户名称</view>
          <wd-input
            v-model="formData.account_holder"
            placeholder="必须与机构名或法人名一致"
          />
        </view>
      </view>

      <!-- 步骤4: 账号设置 -->
      <view v-show="currentStep === 3" class="step-panel">
        <view class="panel-title">账号设置</view>
        <view class="panel-desc">设置可登录机构管理后台的账号，可添加多个</view>
        
        <!-- 账号列表 -->
        <view class="account-list">
          <view 
            v-for="(account, index) in accounts" 
            :key="index" 
            class="account-item"
          >
            <view class="account-info">
              <view class="account-row">
                <text class="label">手机号：</text>
                <text class="value">{{ account.phone }}</text>
              </view>
              <view class="account-row" v-if="account.real_name">
                <text class="label">姓名：</text>
                <text class="value">{{ account.real_name }}</text>
              </view>
              <view class="account-row" v-if="account.role">
                <text class="label">角色：</text>
                <text class="value">{{ getRoleLabel(account.role) }}</text>
              </view>
            </view>
            <view class="account-actions">
              <wd-button 
                type="default" 
                size="small" 
                @click="editAccount(index)"
                custom-style="margin-right: 16rpx;"
              >
                编辑
              </wd-button>
              <wd-button 
                type="error" 
                size="small" 
                @click="removeAccount(index)"
              >
                删除
              </wd-button>
            </view>
          </view>

          <view v-if="accounts.length === 0" class="empty-hint">
            <text>暂无账号，请至少添加一个管理账号</text>
          </view>
        </view>

        <!-- 添加账号按钮 -->
        <wd-button 
          type="primary" 
          block 
          @click="showAccountDialog"
          custom-style="margin-top: 32rpx;"
        >
          + 添加账号
        </wd-button>
      </view>

      <!-- 步骤5: 品牌宣传（选填） -->
      <view v-show="currentStep === 4" class="step-panel">
        <view class="panel-title">品牌宣传（选填）</view>
        <view class="panel-desc">此步骤为选填内容，可跳过直接提交审核</view>
        
        <view class="form-group">
          <view class="form-label">教学环境（最多20张）</view>
          <FileUpload 
            v-model="teachingEnvImages" 
            :limit="20"
            :multiple="true"
            file-type="image"
            :is-public="false"
            path-prefix="institutions/teaching-environment"
          />
        </view>
        
        <view class="form-group">
          <view class="form-label">荣誉时刻（最多20张）</view>
          <FileUpload 
            v-model="honorImages" 
            :limit="20"
            :multiple="true"
            file-type="image"
            :is-public="false"
            path-prefix="institutions/honor-moments"
          />
        </view>
        
        <view class="form-group">
          <view class="form-label">学员风采（图片+视频，最多30个）</view>
          <FileUpload 
            v-model="studentImages" 
            :limit="30"
            :multiple="true"
            accept="all"
            file-type="image"
            :is-public="false"
            path-prefix="institutions/student-showcase"
          />
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <PageFooter>
      <!-- 保存草稿 -->
      <view class="save-draft" @click="saveDraft">
        <text class="iconfont icon-edit" style="font-size: 36rpx; color: #999;"></text>
        <text>草稿</text>
      </view>
      
      <!-- 操作按钮组 -->
      <view class="action-group">
        <wd-button
          v-if="currentStep > 0"
          @click="prevStep"
          custom-class="action-btn btn-secondary"
        >
          上一步
        </wd-button>
        
        <wd-button
          v-if="currentStep < 4"
          type="primary"
          @click="nextStep"
          custom-class="action-btn btn-primary"
        >
          下一步
        </wd-button>
        
        <wd-button
          v-if="currentStep === 4"
          type="primary"
          @click="submitAudit"
          custom-class="action-btn btn-primary"
        >
          提交审核
        </wd-button>
      </view>
    </PageFooter>

    <!-- 地区选择器已经内联在表单中，不需要单独的弹窗 -->

    <!-- 账号设置对话框 -->
    <wd-popup 
      v-model="accountDialogVisible" 
      position="bottom"
      :closable="true"
      :safe-area-inset-bottom="true"
      :z-index="9999"
      custom-style="height: 60%; border-radius: 32rpx 32rpx 0 0;"
    >
      <view class="account-dialog">
        <view class="dialog-title">{{ editingAccountIndex === -1 ? '添加账号' : '编辑账号' }}</view>
        
        <view class="dialog-content">
          <view class="dialog-form-group">
            <view class="form-label required">手机号</view>
            <wd-input
              v-model="accountForm.phone"
              placeholder="请输入11位手机号"
              type="number"
              :maxlength="11"
              no-border
              custom-class="dialog-input"
            />
          </view>
          
          <view class="dialog-form-group">
            <view class="form-label">真实姓名</view>
            <wd-input
              v-model="accountForm.real_name"
              placeholder="请输入真实姓名"
              no-border
              custom-class="dialog-input"
            />
          </view>
          
          <view class="dialog-form-group">
            <view class="form-label">角色</view>
            <EnumsTag
              v-model="accountForm.role"
              enum-type="account_role"
              :enum-items="accountRoleEnums"
            />
          </view>
          
          <view class="dialog-form-group">
            <view class="form-label">备注</view>
            <wd-textarea
              v-model="accountForm.remark"
              placeholder="备注信息（选填）"
              :maxlength="200"
              no-border
              custom-class="dialog-textarea"
            />
          </view>
        </view>
        
        <view class="dialog-actions">
          <wd-button 
            plain
            size="large"
            @click="accountDialogVisible = false"
            custom-class="flex-1 dialog-btn-cancel"
          >
            取消
          </wd-button>
          <wd-button 
            type="primary"
            size="large"
            @click="saveAccount"
            custom-class="flex-1"
          >
            确定
          </wd-button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { institutionApi, type CreateInstitutionParams } from '@/api/institution'
import { useEnums } from '@/composables/useEnums'
import FileUpload from '@/components/FileUpload/index.vue'
import EnumsTag from '@/components/EnumsTag/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import { areaList, getAreaName, parseAddress } from '@/utils/area-data'
import { isValidPhone, validatePhoneRequired } from '@/utils/validator'

// 草稿 localStorage 存储 key
const DRAFT_STORAGE_KEY = 'institution_settle_draft'

const { loadEnumsByTypes, ENUM_TYPES } = useEnums()

// 步骤定义
const steps = [
  { title: '基础信息' },
  { title: '资质认证' },
  { title: '结算账户' },
  { title: '账号设置' },
  { title: '品牌宣传' }
]

// 当前步骤
const currentStep = ref(0)

// 枚举数据
const categoryEnums = ref<any[]>([])
const tagEnums = ref<any[]>([])
const accountRoleEnums = ref<any[]>([
  { code: 'owner', label: '机构所有者', sort_order: 15 },
  { code: 'admin', label: '管理员', sort_order: 10 },
  { code: 'staff', label: '普通员工', sort_order: 5 },
])

/**
 * 加载机构类目枚举
 */
const loadCategories = async () => {
  try {
    const data = await loadEnumsByTypes([ENUM_TYPES.INSTITUTION_CATEGORY, ENUM_TYPES.INSTITUTION_TAG])
    categoryEnums.value = data[ENUM_TYPES.INSTITUTION_CATEGORY] || []
    tagEnums.value = data[ENUM_TYPES.INSTITUTION_TAG] || []
  } catch (error) {
    console.error('加载类目失败:', error)
  }
}

// 表单数据
const formData = ref<Partial<CreateInstitutionParams>>({
  // 基础信息
  name: '',
  logo: '',
  introduction: '',
  tags: '',
  province: '',
  city: '',
  district: '',
  address: '',
  latitude: 0,
  longitude: 0,
  contact_phone: '',
  category_ids: [],
  license_no: '',
  license_img: '',
  legal_person: '',
  id_card_imgs: {
    front: '',
    back: ''
  },
  bank_name: '',
  bank_account: '',
  account_holder: '',
})

// 品牌宣传图片（UI state，提交时转换为 honors/showcases）
const teachingEnvImages = ref<string[]>([])
const honorImages = ref<string[]>([])
const studentImages = ref<string[]>([])

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
// 机构ID（编辑模式）
const institutionId = ref('')

// 账号列表
const accounts = ref<any[]>([])

// 账号对话框
const accountDialogVisible = ref(false)
const editingAccountIndex = ref(-1)
const accountForm = ref({
  phone: '',
  real_name: '',
  role: 'admin',
  remark: ''
})

// 地区选择
const areaValue = ref<string[]>([])

// 构建省市区数据字典
const areaDict = computed(() => {
  const provinces = areaList.province_list
  const cities = areaList.city_list
  const counties = areaList.county_list

  const dict: Record<string, any[]> = {
    '0': [] // 省份列表
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

// 初始化列数据
const areaColumns = ref<any[][]>([])

// 初始化地区列数据
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

/**
 * 地区列变化处理
 */
const handleAreaColumnChange = (pickerView: any, value: any, columnIndex: number, resolve: Function) => {
  const dict = areaDict.value
  const item = value[columnIndex]
  
  if (columnIndex === 0) {
    // 省份变化，更新市和区
    const cities = dict[item.value] || []
    const firstCity = cities[0]
    pickerView.setColumnData(1, cities)
    
    if (firstCity) {
      const counties = dict[firstCity.value] || []
      pickerView.setColumnData(2, counties)
    } else {
      pickerView.setColumnData(2, [])
    }
  } else if (columnIndex === 1) {
    // 城市变化，更新区
    const counties = dict[item.value] || []
    pickerView.setColumnData(2, counties)
  }
  
  resolve()
}

/**
 * 地区展示格式化
 */
const displayAreaFormat = (items: any[]) => {
  return items.map(item => item.label).join(' ')
}

/**
 * 地区选择确认
 */
const handleAreaConfirm = ({ value, selectedItems }: any) => {
  console.log('选择的地区:', value, selectedItems)
  
  // 更新表单数据
  formData.value.province = selectedItems[0]?.label || ''
  formData.value.city = selectedItems[1]?.label || ''
  formData.value.district = selectedItems[2]?.label || ''
}

/**
 * 选择地图位置
 */
const chooseLocation = () => {
  console.log('点击了地图选点')
  
  uni.chooseLocation({
    success: (res) => {
      console.log('选择位置成功:', res)
      
      // 存储经纬度
      formData.value.latitude = res.latitude
      formData.value.longitude = res.longitude
      
      // 解析地址
      const addressInfo = parseAddress(res.address || res.name || '')
      console.log('地址解析结果:', addressInfo)
      
      // 自动填充省市区
      if (addressInfo.province) {
        formData.value.province = addressInfo.province
      }
      if (addressInfo.city) {
        formData.value.city = addressInfo.city
      }
      if (addressInfo.district) {
        formData.value.district = addressInfo.district
      }
      
      // 自动填充详细地址（去除省市区后的部分）
      if (addressInfo.detail) {
        formData.value.address = addressInfo.detail
      } else {
        formData.value.address = res.address
      }
      
      // 更新地区选择器的数据和显示值
      if (addressInfo.provinceCode && addressInfo.cityCode && addressInfo.districtCode) {
        const dict = areaDict.value
        
        // 更新列数据
        areaColumns.value = [
          dict['0'] || [],
          dict[addressInfo.provinceCode] || [],
          dict[addressInfo.cityCode] || []
        ]
        
        // 更新选中值
        areaValue.value = [addressInfo.provinceCode, addressInfo.cityCode, addressInfo.districtCode]
      }
      
      uni.showToast({
        title: '位置选择成功',
        icon: 'success'
      })
    },
    fail: (err) => {
      console.error('选择位置失败:', err)
      uni.showToast({
        title: err.errMsg || '位置选择失败',
        icon: 'none',
        duration: 3000
      })
    }
  })
}

/**
 * 下一步
 */
const nextStep = () => {
  // 验证当前步骤必填项
  if (!validateCurrentStep()) {
    return
  }
  
  if (currentStep.value < 4) {
    currentStep.value++
  }
}

/**
 * 上一步
 */
const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

/**
 * 验证当前步骤
 */
const validateCurrentStep = (): boolean => {
  if (currentStep.value === 0) {
    if (!formData.value.name) {
      uni.showToast({ title: '请输入机构名称', icon: 'none' })
      return false
    }
    if (!formData.value.logo) {
      uni.showToast({ title: '请上传机构Logo', icon: 'none' })
      return false
    }
    if (!formData.value.category_ids || formData.value.category_ids.length === 0) {
      uni.showToast({ title: '请选择经营类目', icon: 'none' })
      return false
    }
    if (!formData.value.contact_phone) {
      uni.showToast({ title: '请输入客服电话', icon: 'none' })
      return false
    }
    if (!isValidPhone(formData.value.contact_phone)) {
      uni.showToast({ title: '请输入正确的客服电话', icon: 'none' })
      return false
    }
    if (!formData.value.province || !formData.value.city) {
      uni.showToast({ title: '请选择所在地区', icon: 'none' })
      return false
    }
    if (!formData.value.address) {
      uni.showToast({ title: '请输入详细地址', icon: 'none' })
      return false
    }
    if (!formData.value.latitude || !formData.value.longitude) {
      uni.showToast({ title: '请在地图上选择位置', icon: 'none' })
      return false
    }
  } else if (currentStep.value === 1) {
    if (!formData.value.license_no) {
      uni.showToast({ title: '请输入统一社会信用代码', icon: 'none' })
      return false
    }
    if (!formData.value.license_img) {
      uni.showToast({ title: '请上传营业执照', icon: 'none' })
      return false
    }
    if (!formData.value.legal_person) {
      uni.showToast({ title: '请输入法人姓名', icon: 'none' })
      return false
    }
    if (!formData.value.id_card_imgs?.front || !formData.value.id_card_imgs?.back) {
      uni.showToast({ title: '请上传法人身份证正反面', icon: 'none' })
      return false
    }
  } else if (currentStep.value === 2) {
    if (!formData.value.bank_name) {
      uni.showToast({ title: '请输入开户银行', icon: 'none' })
      return false
    }
    if (!formData.value.bank_account) {
      uni.showToast({ title: '请输入银行账号', icon: 'none' })
      return false
    }
    if (!formData.value.account_holder) {
      uni.showToast({ title: '请输入开户名称', icon: 'none' })
      return false
    }
  }
  
  if (currentStep.value === 3) {
    // 验证账号设置
    if (accounts.value.length === 0) {
      uni.showToast({ title: '请至少添加一个管理账号', icon: 'none' })
      return false
    }
  }
  
  return true
}

/**
 * 构建提交数据（将图片数组转换为后端 honors/showcases 结构）
 */
const buildSubmitData = () => {
  return {
    ...formData.value,
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
}

/**
 * 保存草稿到 localStorage
 */
const saveDraft = () => {
  try {
    const draftData = {
      formData: formData.value,
      accounts: accounts.value,
      teachingEnvImages: teachingEnvImages.value,
      honorImages: honorImages.value,
      studentImages: studentImages.value,
      currentStep: currentStep.value,
      savedAt: Date.now(),
    }
    uni.setStorageSync(DRAFT_STORAGE_KEY, JSON.stringify(draftData))
    uni.showToast({
      title: '草稿已保存',
      icon: 'success'
    })
  } catch (error: any) {
    console.error('保存草稿失败:', error)
    uni.showToast({
      title: '保存草稿失败',
      icon: 'none'
    })
  }
}

/**
 * 从 localStorage 加载草稿
 * @returns 是否成功加载了草稿
 */
const loadDraftFromStorage = (): boolean => {
  try {
    const raw = uni.getStorageSync(DRAFT_STORAGE_KEY)
    if (!raw) return false
    
    const draftData = JSON.parse(raw)
    if (!draftData || !draftData.formData) return false

    // 恢复表单数据
    formData.value = {
      ...formData.value,
      ...draftData.formData,
    }

    // 恢复账号列表
    if (draftData.accounts && Array.isArray(draftData.accounts)) {
      accounts.value = draftData.accounts
    }

    // 恢复品牌宣传图片
    if (draftData.teachingEnvImages) {
      teachingEnvImages.value = draftData.teachingEnvImages
    }
    if (draftData.honorImages) {
      honorImages.value = draftData.honorImages
    }
    if (draftData.studentImages) {
      studentImages.value = draftData.studentImages
    }

    // 恢复步骤
    if (typeof draftData.currentStep === 'number') {
      currentStep.value = draftData.currentStep
    }

    // 恢复地区选择器
    if (draftData.formData.province && draftData.formData.city && draftData.formData.district) {
      restoreAreaPicker(draftData.formData.province, draftData.formData.city, draftData.formData.district)
    }

    const savedTime = new Date(draftData.savedAt).toLocaleString()
    console.log(`从本地草稿恢复数据，保存时间: ${savedTime}`)
    uni.showToast({
      title: '已恢复草稿',
      icon: 'success'
    })
    return true
  } catch (error) {
    console.error('加载草稿失败:', error)
    return false
  }
}

/**
 * 清除本地草稿
 */
const clearDraft = () => {
  try {
    uni.removeStorageSync(DRAFT_STORAGE_KEY)
  } catch (_) {}
}

/**
 * 恢复地区选择器状态
 */
const restoreAreaPicker = (province: string, city: string, district: string) => {
  const dict = areaDict.value
  let provinceCode = ''
  let cityCode = ''
  let districtCode = ''

  for (const [code, name] of Object.entries(areaList.province_list)) {
    if (name === province) { provinceCode = code; break }
  }
  if (provinceCode) {
    for (const [code, name] of Object.entries(areaList.city_list)) {
      if (code.startsWith(provinceCode.substring(0, 2)) && name === city) { cityCode = code; break }
    }
  }
  if (cityCode) {
    for (const [code, name] of Object.entries(areaList.county_list)) {
      if (code.startsWith(cityCode.substring(0, 4)) && name === district) { districtCode = code; break }
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

/**
 * 显示账号对话框
 */
const showAccountDialog = () => {
  editingAccountIndex.value = -1
  accountForm.value = {
    phone: '',
    real_name: '',
    role: 'admin',
    remark: ''
  }
  accountDialogVisible.value = true
}

/**
 * 编辑账号
 */
const editAccount = (index: number) => {
  editingAccountIndex.value = index
  const account = accounts.value[index]
  accountForm.value = {
    phone: account.phone,
    real_name: account.real_name || '',
    role: account.role || 'admin',
    remark: account.remark || ''
  }
  accountDialogVisible.value = true
}

/**
 * 获取角色显示标签
 */
const getRoleLabel = (role: string): string => {
  const map: Record<string, string> = {
    owner: '机构所有者',
    admin: '管理员',
    staff: '普通员工',
  }
  return map[role] || role
}

/**
 * 保存账号
 */
const saveAccount = () => {
  // 验证手机号
  if (!validatePhoneRequired(accountForm.value.phone)) {
    return
  }
  
  // 检查手机号是否重复
  const duplicate = accounts.value.some((acc, idx) => 
    acc.phone === accountForm.value.phone && idx !== editingAccountIndex.value
  )
  if (duplicate) {
    uni.showToast({ title: '该手机号已添加', icon: 'none' })
    return
  }
  
  if (editingAccountIndex.value === -1) {
    // 新增
    accounts.value.push({ ...accountForm.value })
  } else {
    // 编辑
    accounts.value[editingAccountIndex.value] = { ...accountForm.value }
  }
  
  accountDialogVisible.value = false
  uni.showToast({ title: '保存成功', icon: 'success' })
}

/**
 * 删除账号
 */
const removeAccount = (index: number) => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该账号吗？',
    success: (res) => {
      if (res.confirm) {
        accounts.value.splice(index, 1)
        uni.showToast({ title: '删除成功', icon: 'success' })
      }
    }
  })
}

/**
 * 提交审核
 */
const submitAudit = async () => {
  // 验证所有必填项
  for (let i = 0; i <= 3; i++) {
    currentStep.value = i
    if (!validateCurrentStep()) {
      return
    }
  }
  currentStep.value = 4
  
  try {
    uni.showLoading({ title: '提交中...' })
    
    // 将账号数组添加到 formData
    formData.value.accounts = accounts.value.map(acc => ({
      phone: acc.phone,
      real_name: acc.real_name,
      role: acc.role || 'admin',
      remark: acc.remark
    }))
    
    // 保存机构信息（包含账号数组）
    const submitData = buildSubmitData()
    if (!institutionId.value) {
      // 首次创建（后端直接返回机构 ID 字符串）
      const id = await institutionApi.create(submitData as CreateInstitutionParams)
      institutionId.value = id
    } else {
      // 更新已有草稿
      await institutionApi.update(institutionId.value, submitData)
    }
    
    // 提交审核
    await institutionApi.submit(institutionId.value)
    
    // 提交成功后清除本地草稿
    clearDraft()
    
    uni.hideLoading()
    uni.showModal({
      title: '提交成功',
      content: '您的入驻申请已提交，我们将在3个工作日内完成审核。审核通过后，管理员账号可使用微信手机号一键登录',
      showCancel: false,
      success: () => {
        uni.reLaunch({
          url: '/pages/login/index'
        })
      }
    })
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({
      title: error.message || '提交失败',
      icon: 'none'
    })
  }
}

onMounted(async () => {
  console.log('页面加载完成')
  
  // 加载机构类目枚举
  await loadCategories()
  
  // 先初始化地区选择器
  initAreaColumns()
  
  // 尝试从 localStorage 恢复草稿（机构入驻场景，未登录状态）
  loadDraftFromStorage()
})
</script>

<style lang="scss" scoped>
.institution-settle-page {
  min-height: 100vh;
  background-color: $uni-bg-color-grey;
  padding-bottom: 120rpx;
}

.steps-wrapper {
  background-color: $uni-bg-color;
  padding: 32rpx;
}

.form-content {
  padding: 32rpx;
}

.step-panel {
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  padding: 32rpx;
}

// 表单组
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
  display: flex;
  align-items: center;
  
  &.required::before {
    content: '*';
    color: $uni-color-error;
    margin-right: 8rpx;
  }
}

.area-with-map {
  display: flex;
  align-items: stretch;
  gap: 16rpx;
  
  :deep(.wd-picker) {
    flex: 1;
    min-width: 0;
  }
  
  .map-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64rpx;
    height: 64rpx;
    border-radius: 8rpx;
    background-color: rgba(82, 196, 26, 0.1);
    cursor: pointer;
    transition: all 0.3s;
    flex-shrink: 0;
    
    &:active {
      background-color: rgba(82, 196, 26, 0.2);
    }
  }
}

// 覆盖 wot-design-uni 的 textarea 样式
::v-deep .custom-textarea {
  padding: 0 !important;
}

::v-deep .custom-textarea .wd-textarea__inner {
  padding: 0 !important;
}

::v-deep .wd-textarea__inner {
  padding: 0 !important;
}

// 覆盖 wot-design-uni 的 picker 样式
::v-deep .wd-picker__field {
  padding-left: 0 !important;
}

::v-deep .wd-picker__cell {
  padding-left: 0 !important;
}

.panel-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-bottom: 24rpx;
}

.panel-desc {
  font-size: 28rpx;
  color: $uni-text-color-tertiary;
  margin-bottom: 24rpx;
}

.cell-value {
  color: $uni-text-color-secondary;
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.category-tag {
  cursor: pointer;
  transition: all 0.3s;
}

.id-card-upload {
  display: flex;
  gap: 32rpx;
}

.upload-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.upload-label {
  font-size: 28rpx;
  color: $uni-text-color-secondary;
}

// PageFooter 内部布局样式
:deep(.page-footer) {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

// 保存草稿
.save-draft {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 0;
  
  text {
    font-size: 26rpx;
    color: $uni-text-color-tertiary;
  }
}

// 操作按钮组
.action-group {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  height: 72rpx !important;
  min-width: 160rpx !important;
  border-radius: 8rpx !important;
  font-size: 30rpx !important;
}

::v-deep .btn-secondary {
  background-color: #f5f5f5 !important;
  color: #333 !important;
  border: none !important;
}

::v-deep .btn-primary {
  // 使用默认主题色
}

::v-deep .footer-btn-prev.wd-button--plain {
  background-color: #ffffff !important;
  color: #666666 !important;
  border: 1rpx solid #d9d9d9 !important;
}

// 账号列表
.account-list {
  margin-bottom: 32rpx;
}

.account-item {
  background-color: $uni-bg-color-tertiary;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.account-info {
  flex: 1;
}

.account-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .label {
    font-size: 26rpx;
    color: $uni-text-color-tertiary;
    min-width: 80rpx;
  }
  
  .value {
    font-size: 28rpx;
    color: $uni-text-color;
  }
}

.account-actions {
  display: flex;
  gap: 16rpx;
}

.empty-hint {
  text-align: center;
  padding: 80rpx 0;
  color: $uni-text-color-tertiary;
  font-size: 28rpx;
}

// 账号对话框
.account-dialog {
  padding: 32rpx;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dialog-title {
  font-size: 36rpx;
  font-weight: bold;
  color: $uni-text-color;
  margin-bottom: 32rpx;
  text-align: center;
  flex-shrink: 0;
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 16rpx;
}

// 对话框内的表单组（带底部分隔线）
.dialog-form-group {
  padding-bottom: 24rpx;
  margin-bottom: 24rpx;
  border-bottom: 1rpx solid $uni-border-color-light;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  .form-label {
    margin-bottom: 16rpx;
  }
}

// 对话框内输入框样式（与主表单一致）
:deep(.dialog-input) {
  padding: 0 !important;
  background: transparent !important;
  font-size: 28rpx !important;
}

:deep(.dialog-textarea) {
  padding: 0 !important;
  background: transparent !important;
}

// 取消按钮样式
:deep(.dialog-btn-cancel) {
  border: 1rpx solid $uni-border-color !important;
  color: $uni-text-color !important;
  background-color: $uni-bg-color !important;
}

.dialog-actions {
  flex-shrink: 0;
  padding-top: 32rpx;
  border-top: 1rpx solid $uni-border-color-light;
  display: flex;
  gap: 16rpx;
}

// Tag选择组
.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-item {
  padding: 12rpx 32rpx;
  font-size: 28rpx;
  border-radius: 8rpx;
  background-color: $uni-bg-color-grey;
  color: $uni-text-color-secondary;
  transition: all 0.3s;
  
  &.tag-active {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
    border: 1rpx solid $uni-color-primary;
  }
}
</style>
