<template>
  <view class="page">
    <view v-if="loading" class="loading">
      <Loading text="加载中..." />
    </view>

    <view v-else class="form-container">
      <!-- 基础信息卡片 -->
      <view class="section">
        <view class="section-title">基础信息</view>

        <view class="form-group">
          <view class="form-label required">课程类目</view>
          <EnumsTag
            v-model="form.category_code"
            enum-type="course_category"
            :enum-items="courseCategoryEnums"
          />
        </view>

        <view class="form-group">
          <view class="form-label required">课程标题</view>
          <wd-input v-model="form.title" placeholder="请输入4-30字标题" maxlength="30" show-word-limit />
        </view>

        <view class="form-group">
          <view class="form-label">课程副标题</view>
          <wd-input v-model="form.subtitle" placeholder="一句话卖点（选填）" maxlength="20" show-word-limit />
        </view>

        <view class="form-group">
          <view class="form-label required">课程类型</view>
          <EnumsTag
            v-model="form.type"
            enum-type="course_type"
            :enum-items="courseTypeEnums"
            :disabled="isEdit"
          />
          <view v-if="isEdit" class="form-tip">课程类型创建后不可修改</view>
        </view>

        <view class="form-group">
          <view class="form-label">课程标签</view>
          <EnumsTag
            v-model="form.tags!"
            enum-type="course_tag"
            :enum-items="courseTagEnums"
            multiple
          />
          <view class="form-tip">可选多个标签</view>
        </view>

        <view class="form-group">
          <view class="form-label">适用年龄</view>
          <view class="flex items-center gap-2">
            <wd-input v-model.number="form.min_age" type="number" placeholder="最小年龄" style="flex: 1;" />
            <text style="margin: 0 16rpx;">至</text>
            <wd-input v-model.number="form.max_age" type="number" placeholder="最大年龄" style="flex: 1;" />
            <text style="margin-left: 16rpx;">岁</text>
          </view>
          <view class="form-tip">例如：3至6岁</view>
        </view>

        <view class="form-group">
          <view class="form-label">单节时长</view>
          <wd-input v-model.number="form.lesson_duration" type="number" placeholder="请输入单节课时长">
            <template #suffix>
              <text>分钟</text>
            </template>
          </wd-input>
          <view class="form-tip">例如：45分钟</view>
        </view>
      </view>

      <!-- 规格与价格配置 -->
      <view class="section">
        <view class="section-title">规格与价格</view>

        <view v-if="form.type === 'trial'" class="tip-box tip-warning">
          <text class="tip-icon">ℹ️</text>
          <text class="tip-text">试听课需全额线上支付，不支持返现与退款</text>
        </view>

        <view v-if="form.type === 'standard'" class="tip-box tip-info">
          <text class="tip-icon">💡</text>
          <text class="tip-text">线上支付金额将作为推广佣金发放给推荐人，机构线下收取剩余尾款</text>
        </view>

        <view v-for="(sku, index) in form.skus" :key="index" class="sku-card">
          <view class="sku-header">
            <text class="sku-title">规格 {{ index + 1 }}</text>
            <wd-button v-if="form.skus.length > 1" size="small" type="error" @click="removeSku(index)">
              删除
            </wd-button>
          </view>

          <view class="form-group">
            <view class="form-label required">规格名称</view>
            <wd-input v-model="sku.name" placeholder="如：春季12课时包" />
          </view>

          <!-- SKU类型选择（仅正式课显示，因为试听课SKU类型固定为trial） -->
          <view v-if="form.type === 'standard'" class="form-group">
            <view class="form-label required">套餐类型</view>
            <view class="tag-group">
              <view class="tag-item" :class="{ 'tag-active': sku.type === 'standard' }" @click="sku.type = 'standard'; calculateSkuPrices(sku)">正式课套餐</view>
              <view class="tag-item" :class="{ 'tag-active': sku.type === 'trial' }" @click="sku.type = 'trial'; calculateSkuPrices(sku)">体验课套餐</view>
            </view>
          </view>

          <view class="form-group">
            <view class="form-label required">总课时数</view>
            <wd-input v-model.number="sku.total_lessons" type="number" placeholder="请输入课时数" />
          </view>

          <view class="form-group">
            <view class="form-label required">课程总价（元）</view>
            <wd-input v-model.number="sku.total_price" type="digit" placeholder="请输入总价"
              @blur="calculateSkuPrices(sku)" />
          </view>

          <!-- 正式课套餐返现配置（体验课套餐不显示） -->
          <view v-if="form.type === 'standard' && sku.type !== 'trial'" class="form-group">
            <view class="form-label required">返现设置</view>
            <EnumsTag
              v-model="sku.cashback_type"
              enum-type="cashback_type"
              :enum-items="cashbackTypeEnums.filter(e => e.code !== 'none')"
              @change="calculateSkuPrices(sku)"
            />
          </view>

          <view v-if="form.type === 'standard' && sku.type !== 'trial'" class="form-group">
            <view class="form-label required">
              {{ sku.cashback_type === 'percentage' ? '返现比例（%）' : '返现金额（元）' }}
            </view>
            <wd-input v-model.number="sku.cashback_value" type="digit"
              :placeholder="sku.cashback_type === 'percentage' ? '如：5' : '如：100'" @blur="calculateSkuPrices(sku)" />
          </view>

          <!-- 价格计算结果 -->
          <view class="price-summary">
            <view class="price-item">
              <text class="price-label">线上应付：</text>
              <text class="price-value primary">¥{{ sku.online_pay_price || 0 }}</text>
            </view>
            <view class="price-item">
              <text class="price-label">线下尾款：</text>
              <text class="price-value">¥{{ sku.offline_pay_price || 0 }}</text>
            </view>
          </view>

          <view class="form-group" style="margin-top: 40rpx;">
            <view class="form-label">可报名人数</view>
            <wd-input v-model.number="sku.stock" type="number" placeholder="-1为不限" />
          </view>
        </view>

        <wd-button type="primary" block @click="addSku" custom-style="margin-top: 24rpx;">
          + 添加规格
        </wd-button>
      </view>

      <!-- 课程详情 -->
      <view class="section">
        <view class="section-title">课程详情</view>
        <view class="form-group">
          <view class="form-label required">详细介绍</view>
          <wd-textarea v-model="form.description" placeholder="请输入课程详情" :maxlength="5000" show-word-limit
            :auto-height="true" custom-style="min-height: 300rpx;" />
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <PageFooter custom-class="footer-buttons">
      <view class="footer-btn left">
        <wd-button type="info" plain block custom-class="cancel-btn-common" @click="goBack">取消</wd-button>
      </view>
      <view class="footer-btn right">
        <wd-button type="primary" block :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存课程' : '立即创建' }}
        </wd-button>
      </view>
    </PageFooter>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { courseApi, type CourseSku, type CreateCourseDto } from '@/api/course'
import { institutionApi } from '@/api/institution'
import { useEnums } from '@/composables/useEnums'
import EnumsTag from '@/components/EnumsTag/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import Loading from '@/components/Loading/index.vue'

/** 统一提示（直接使用 uni API，不依赖 wot-design-uni toast 组件） */
const showTip = (title: string, icon: 'success' | 'none' | 'error' = 'none') => {
  uni.showToast({ title, icon, duration: 2000 })
}

const { loadEnumsByTypes, getEnumList, getEnumLabel, ENUM_TYPES } = useEnums()

const loading = ref(false)
const submitting = ref(false)
const courseId = ref('')
const isEdit = computed(() => !!courseId.value)

// 机构ID（从URL参数获取）
const institutionId = ref('')

// 枚举数据
const courseTypeEnums = ref<any[]>([])
const cashbackTypeEnums = ref<any[]>([])
const courseCategoryEnums = ref<any[]>([])
const courseTagEnums = ref<any[]>([])

// 表单数据
const form = reactive<CreateCourseDto>({
  institution_id: '',
  title: '',
  subtitle: '',
  category_code: '', // 课程类目代码
  tags: [],
  description: '',
  min_age: undefined,
  max_age: undefined,
  lesson_duration: undefined,
  type: 'standard',
  skus: [
    {
      name: '',
      type: 'standard' as const,
      total_lessons: 0,
      total_price: 0,
      cashback_type: 'fixed',
      cashback_value: 0,
      online_pay_price: 0,
      offline_pay_price: 0,
      stock: -1,
    },
  ],
})

/**
 * 加载枚举数据
 */
const loadEnums = async () => {
  try {
    const data = await loadEnumsByTypes([
      ENUM_TYPES.COURSE_TYPE,
      ENUM_TYPES.CASHBACK_TYPE,
      ENUM_TYPES.COURSE_CATEGORY,
      ENUM_TYPES.COURSE_TAG,
    ])

    courseTypeEnums.value = data[ENUM_TYPES.COURSE_TYPE] || []
    cashbackTypeEnums.value = data[ENUM_TYPES.CASHBACK_TYPE] || []
    courseCategoryEnums.value = data[ENUM_TYPES.COURSE_CATEGORY] || []
    courseTagEnums.value = data[ENUM_TYPES.COURSE_TAG] || []

    // 如果是新建且有类目，默认选择第一个
    if (!isEdit.value && courseCategoryEnums.value.length > 0 && !form.category_code) {
      form.category_code = courseCategoryEnums.value[0].code
    }
  } catch (error) {
    console.error('加载枚举失败:', error)
    showTip('加载枚举失败')
  }
}

/**
 * 计算SKU价格
 */
const calculateSkuPrices = (sku: CourseSku) => {
  const totalPrice = Number(sku.total_price) || 0
  // 课程类型为 trial 或 SKU 类型为 trial 时，都按体验课处理
  const isTrial = form.type === 'trial' || sku.type === 'trial'

  if (isTrial) {
    // 体验课套餐：全额线上支付
    sku.online_pay_price = totalPrice
    sku.offline_pay_price = 0
    sku.cashback_type = 'none'
    sku.cashback_value = 0
  } else {
    // 正式课：计算返现
    let onlinePayPrice = 0
    const cashbackValue = Number(sku.cashback_value) || 0

    if (sku.cashback_type === 'percentage') {
      onlinePayPrice = totalPrice * (cashbackValue / 100)
    } else {
      onlinePayPrice = cashbackValue
    }

    sku.online_pay_price = Number(onlinePayPrice.toFixed(2))
    sku.offline_pay_price = Number((totalPrice - onlinePayPrice).toFixed(2))
  }
}

/**
 * 添加规格
 */
const addSku = () => {
  form.skus.push({
    name: '',
    type: 'standard' as const,
    total_lessons: 0,
    total_price: 0,
    cashback_type: 'fixed',
    cashback_value: 0,
    online_pay_price: 0,
    offline_pay_price: 0,
    stock: -1,
  })
}

/**
 * 删除规格
 */
const removeSku = (index: number) => {
  form.skus.splice(index, 1)
}

/**
 * 加载课程详情（编辑模式）
 */
const loadCourseDetail = async (id: string) => {
  try {
    loading.value = true
    const res = await courseApi.getDetail(id)

    Object.assign(form, {
      institution_id: res.institution_id,
      title: res.title,
      subtitle: res.subtitle,
      category_code: res.category_code,
      tags: res.tags,
      description: res.description,
      min_age: res.min_age,
      max_age: res.max_age,
      lesson_duration: res.lesson_duration,
      type: res.type,
      skus: (res.skus || []).map((sku: any) => ({
        ...sku,
        total_lessons: Number(sku.total_lessons) || 0,
        total_price: Number(sku.total_price) || 0,
        cashback_value: Number(sku.cashback_value) || 0,
        stock: sku.stock != null ? Number(sku.stock) : null,
        validity_days: sku.validity_days != null ? Number(sku.validity_days) : null,
      })),
    })
  } catch (error) {
    console.error('加载课程详情失败:', error)
    showTip('加载失败')
  } finally {
    loading.value = false
  }
}

/**
 * 表单校验
 */
const validateForm = (): boolean => {
  if (!form.institution_id) {
    showTip('机构信息缺失，请返回重试')
    return false
  }

  if (!form.title || form.title.length < 4) {
    showTip('请输入4-30字的课程标题')
    return false
  }

  if (!form.category_code) {
    showTip('请选择课程类目')
    return false
  }

  if (!form.skus || form.skus.length === 0) {
    showTip('请至少添加1个规格')
    return false
  }

  for (let i = 0; i < form.skus.length; i++) {
    const sku = form.skus[i]
    if (!sku.name) {
      showTip(`请输入规格${i + 1}的名称`)
      return false
    }
    if (!sku.total_lessons || sku.total_lessons <= 0) {
      showTip(`请输入规格${i + 1}的课时数`)
      return false
    }
    if (!sku.total_price || sku.total_price <= 0) {
      showTip(`请输入规格${i + 1}的价格`)
      return false
    }

    // 正式课 + 非体验课套餐 才校验返现
    const needCashbackCheck = form.type === 'standard' && sku.type !== 'trial'
    if (needCashbackCheck) {
      if (!sku.cashback_value || sku.cashback_value <= 0) {
        showTip(`请输入规格${i + 1}的返现金额`)
        return false
      }

      // 校验返现金额不能超过总价
      if (sku.cashback_type === 'fixed' && sku.cashback_value > sku.total_price) {
        showTip(`规格${i + 1}的返现金额不能超过课程总价`)
        return false
      }

      // 校验返现比例不能超过100%
      if (sku.cashback_type === 'percentage' && sku.cashback_value > 100) {
        showTip(`规格${i + 1}的返现比例不能超过100%`)
        return false
      }
    }
  }

  return true
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  if (submitting.value) return
  submitting.value = true

  try {
    // 白名单：只提交后端 DTO 接受的字段，避免多余字段被 class-validator 拒绝
    const submitData = {
      institution_id: form.institution_id,
      title: form.title,
      subtitle: form.subtitle || undefined,
      category_code: form.category_code,
      tags: form.tags,
      description: form.description || undefined,
      min_age: form.min_age,
      max_age: form.max_age,
      lesson_duration: form.lesson_duration,
      type: form.type,
      skus: form.skus.map(sku => ({
        name: sku.name,
        type: sku.type,
        total_lessons: Number(sku.total_lessons),
        total_price: Number(sku.total_price),
        cashback_type: sku.cashback_type,
        cashback_value: Number(sku.cashback_value),
        stock: sku.stock != null ? Number(sku.stock) : undefined,
        ...(sku.validity_days != null ? { validity_days: Number(sku.validity_days) } : {}),
      })),
    }

    if (isEdit.value) {
      await courseApi.update(courseId.value, submitData)
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await courseApi.create(submitData)
      uni.showToast({ title: '创建成功', icon: 'success' })
    }

    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    console.error('提交失败:', error)
    // 请求工具已通过 showError 展示过具体错误，这里兜底防止静默
    const msg = error?.message || '提交失败，请重试'
    uni.showToast({ title: msg, icon: 'none', duration: 2500 })
  } finally {
    submitting.value = false
  }
}

/**
 * 返回
 */
const goBack = () => {
  uni.navigateBack()
}

onLoad(async (options: any) => {
  // 获取机构ID参数
  if (options.institutionId) {
    institutionId.value = options.institutionId
    form.institution_id = options.institutionId
  }

  // 加载枚举（包含课程类目）
  await loadEnums()

  // 编辑模式
  if (options.id) {
    courseId.value = options.id
    uni.setNavigationBarTitle({ title: '编辑课程' })
    await loadCourseDetail(options.id)
  } else {
    uni.setNavigationBarTitle({ title: '创建课程' })
    // 创建模式：如果URL没传institutionId，从API获取当前机构
    if (!form.institution_id) {
      try {
        const inst = await institutionApi.getCurrentInstitution()
        if (inst?.id) {
          institutionId.value = inst.id
          form.institution_id = inst.id
        } else {
          showTip('未找到机构信息，请先完成机构入驻')
          setTimeout(() => uni.navigateBack(), 1500)
        }
      } catch (e) {
        console.error('获取机构信息失败:', e)
        showTip('获取机构信息失败')
        setTimeout(() => uni.navigateBack(), 1500)
      }
    }
  }
})
</script>


<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: calc(100rpx + env(safe-area-inset-bottom));
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

/* ========== 直接引入公共样式逻辑，避免 @extend 无法跨作用域的问题 ========== */

/* 卡片容器 */
.section {
  margin-bottom: 24rpx;
  padding: 32rpx;
  background-color: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  .section-title {
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
      background: #52c41a;
      border-radius: 4rpx;
      margin-right: 16rpx;
    }
  }
}

/* 表单组 */
.form-group {
  margin-bottom: 32rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

/* 表单标签 */
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

/* 表单提示 */
.form-tip {
  font-size: 24rpx;
  color: #86909c;
  margin-top: 12rpx;
  line-height: 1.5;
}

/* 标签组样式 */
.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.tag-item {
  padding: 12rpx 32rpx;
  font-size: 26rpx;
  border-radius: 100rpx;
  background-color: #f2f3f5;
  color: #4e5969;
  border: 2rpx solid transparent;
  transition: all 0.3s;

  &.tag-active {
    background-color: rgba(82, 196, 26, 0.1);
    color: #52c41a;
    border-color: #52c41a;
    font-weight: 500;
  }
}

/* 提示框 */
.tip-box {
  display: flex;
  align-items: flex-start;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 32rpx;

  &.tip-warning {
    background-color: #fff7e6;
    border: 1rpx solid #ffe8c9;
  }

  &.tip-info {
    background-color: #e6f7ff;
    border: 1rpx solid #bae7ff;
  }
}

.tip-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
  margin-top: 2rpx;
}

.tip-text {
  flex: 1;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  text-align: justify;
}

// SKU 卡片优化：白色卡片+边框
.sku-card {
  position: relative;
  padding: 32rpx;
  background-color: #fff;
  border: 2rpx solid #e5e6eb;
  border-radius: 16rpx;
  margin-bottom: 32rpx;
  transition: all 0.3s;

  &:hover {
    border-color: $uni-color-primary;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
  }
}

.sku-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx dashed #e5e6eb;
}

.sku-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1d2129;
}

// 价格汇总区域优化：左右分栏
.price-summary {
  background-color: #f7f8fa;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-top: 24rpx;
  display: flex;
  justify-content: space-between;
}

.price-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
  
  &:first-child::after {
    content: '';
    position: absolute;
    right: 0;
    top: 15%;
    height: 70%;
    width: 2rpx;
    background-color: #e5e6eb;
  }
}

.price-label {
  font-size: 24rpx;
  color: #86909c;
  margin-bottom: 8rpx;
}

.price-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #1d2129;
  font-family: DIN Alternate, Roboto, sans-serif;

  &.primary {
    color: $uni-color-primary;
    font-size: 36rpx;
  }
}

// 辅助类
.flex { display: flex; }
.items-center { align-items: center; }
.gap-2 { gap: 16rpx; }

// Footer 优化：毛玻璃效果
:deep(.page-footer) {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20rpx);
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05) !important;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)) !important;
  
  .footer-btn {
    flex: 1;
    margin: 0 12rpx;
    
    &:first-child {
      margin-left: 0;
    }
    &:last-child {
      margin-right: 0;
    }
  }
}
</style>

