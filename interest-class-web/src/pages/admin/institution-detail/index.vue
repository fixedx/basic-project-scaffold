<template>
  <view class="page">
    <view v-if="loading" class="loading-state">
      <wd-loading />
    </view>

    <view v-else-if="institution">
      <!-- ========== 审核状态横幅（管理员特有） ========== -->
      <view class="audit-banner" :class="`audit-${institution.audit_status}`">
        <view class="audit-left">
          <text class="audit-status-text">{{ getStatusText(institution.audit_status) }}</text>
          <text class="audit-time">申请时间：{{ formatDate(institution.created_at) }}</text>
        </view>
        <view class="audit-icon">
          <text class="iconfont" :class="getStatusIcon(institution.audit_status)" style="font-size: 64rpx;"></text>
        </view>
      </view>

      <!-- 驳回原因提示 -->
      <view v-if="institution.reject_reason" class="reject-banner">
        <text class="iconfont icon-warning" style="font-size: 28rpx; margin-right: 8rpx;"></text>
        <text>驳回原因：{{ institution.reject_reason }}</text>
      </view>

      <!-- ========== 复用公共组件：机构信息卡片 ========== -->
      <InstitutionInfoCard :institution="institution" :resolved-tags="tags" />

      <!-- ========== 复用公共组件：课程列表 ========== -->
      <InstitutionCourses :courses="courses" title="机构课程" @click="goToCourse" />

      <!-- ========== 复用公共组件：环境风采 + 荣誉 ========== -->
      <InstitutionShowcase
        :showcases="(institution as any).showcases || []"
        :honors="(institution as any).honors || []"
      />

      <!-- ========== 管理员特有：资质信息 ========== -->
      <view class="section-block">
        <view class="block-header">
          <text class="block-title">资质信息</text>
        </view>
        <view class="qual-list">
          <view class="qual-item" v-if="institution.license_no">
            <text class="qual-label">营业执照号</text>
            <text class="qual-value">{{ institution.license_no }}</text>
          </view>
          <view class="qual-item" v-if="institution.legal_person">
            <text class="qual-label">法人代表</text>
            <text class="qual-value">{{ institution.legal_person }}</text>
          </view>
        </view>

        <!-- 营业执照图片 -->
        <view v-if="institution.license_img" class="qual-images">
          <text class="qual-label" style="margin-bottom: 16rpx;">营业执照</text>
          <AsyncImage
            :url="institution.license_img"
            mode="aspectFit"
            width="100%"
            height="400rpx"
            custom-style="border-radius: 16rpx;"
            @click="previewSingleImage(institution.license_img)"
          />
        </view>

        <!-- 身份证照片 -->
        <view v-if="institution.id_card_imgs" class="qual-images">
          <text class="qual-label" style="margin-bottom: 16rpx;">身份证照片</text>
          <view class="id-card-imgs">
            <AsyncImage
              v-if="institution.id_card_imgs.front"
              :url="institution.id_card_imgs.front"
              mode="aspectFit"
              width="320rpx"
              height="200rpx"
              custom-style="border-radius: 16rpx;"
              @click="previewSingleImage(institution.id_card_imgs.front)"
            />
            <AsyncImage
              v-if="institution.id_card_imgs.back"
              :url="institution.id_card_imgs.back"
              mode="aspectFit"
              width="320rpx"
              height="200rpx"
              custom-style="border-radius: 16rpx;"
              @click="previewSingleImage(institution.id_card_imgs.back)"
            />
          </view>
        </view>
      </view>

      <!-- ========== 管理员特有：财务信息 ========== -->
      <view class="section-block" v-if="institution.bank_name || institution.bank_account">
        <view class="block-header">
          <text class="block-title">财务信息</text>
        </view>
        <view class="qual-list">
          <view class="qual-item" v-if="institution.bank_name">
            <text class="qual-label">开户银行</text>
            <text class="qual-value">{{ institution.bank_name }}</text>
          </view>
          <view class="qual-item" v-if="institution.bank_account">
            <text class="qual-label">银行账号</text>
            <text class="qual-value">{{ institution.bank_account }}</text>
          </view>
          <view class="qual-item" v-if="institution.account_holder">
            <text class="qual-label">账户名称</text>
            <text class="qual-value">{{ institution.account_holder }}</text>
          </view>
        </view>
      </view>

      <!-- ========== 管理员特有：佣金配置 ========== -->
      <view class="section-block">
        <view class="block-header">
          <text class="block-title">佣金配置</text>
          <view
            class="commission-type-badge"
            :class="(institution as any).commission_type === 'percentage' ? 'badge-percentage' : 'badge-fixed'"
          >
            <text class="iconfont icon-money-rmb"></text>
            <text>{{ (institution as any).commission_type === 'percentage' ? '按比例' : '固定金额' }}</text>
          </view>
        </view>
        <view class="qual-list">
          <view class="qual-item">
            <text class="qual-label">佣金类型</text>
            <text class="qual-value">{{ (institution as any).commission_type === 'percentage' ? '按交易金额比例' : '每单固定金额' }}</text>
          </view>
          <view class="qual-item">
            <text class="qual-label">佣金数值</text>
            <text class="qual-value commission-highlight">
              {{ (institution as any).commission_type === 'percentage'
                ? (Number((institution as any).commission_value) * 100).toFixed(1) + '%'
                : '¥' + Number((institution as any).commission_value).toFixed(2) }}
            </text>
          </view>
        </view>
        <view class="commission-tip">
          <text class="iconfont icon-info"></text>
          <text>{{ (institution as any).commission_type === 'percentage'
            ? `每笔订单按 ${(Number((institution as any).commission_value) * 100).toFixed(1)}% 收取平台服务费`
            : `每笔订单收取固定 ¥${Number((institution as any).commission_value).toFixed(2)} 平台服务费` }}</text>
        </view>
      </view>

      <!-- ========== 管理员特有：签约凭证（contract_review 状态） ========== -->
      <view v-if="institution.contract_screenshot" class="section-block">
        <view class="block-header">
          <text class="block-title">签约凭证</text>
          <view v-if="institution.contract_signed_at" class="contract-time">
            <text class="iconfont icon-time" style="font-size: 22rpx; margin-right: 4rpx;"></text>
            <text>{{ formatDate(institution.contract_signed_at) }}</text>
          </view>
        </view>
        <AsyncImage
          :url="institution.contract_screenshot"
          mode="aspectFit"
          width="100%"
          height="500rpx"
          custom-style="border-radius: 16rpx; border: 1rpx solid #f0f0f0;"
          @click="previewSingleImage(institution.contract_screenshot)"
        />
      </view>
    </view>

    <!-- ========== 底部操作栏 ========== -->
    <PageFooter v-if="institution && !showCommissionDialog">
      <wd-button class="flex-1" block type="primary" plain size="large" @click="goToEdit">
        编辑信息
      </wd-button>
      <wd-button class="flex-1" block type="warning" plain size="large" @click="openCommissionDialog">
        设置佣金
      </wd-button>
      <template v-if="institution.audit_status === 'pending'">
        <wd-button class="flex-1" block type="error" size="large" @click="handleReject">
          驳回
        </wd-button>
        <wd-button class="flex-1" block type="success" size="large" @click="handleApprove">
          通过
        </wd-button>
      </template>
      <template v-if="institution.audit_status === 'contract_review'">
        <wd-button class="flex-1" block type="error" size="large" @click="handleContractReject">
          驳回签约
        </wd-button>
        <wd-button class="flex-1" block type="success" size="large" @click="handleContractApprove">
          签约通过
        </wd-button>
      </template>
    </PageFooter>

    <!-- ========== 驳回弹窗 ========== -->
    <wd-popup v-model="showRejectDialog" position="center" :close-on-click-modal="false">
      <view class="reject-dialog">
        <view class="dialog-header">
          <text class="dialog-title">驳回原因</text>
        </view>
        <view class="dialog-content">
          <wd-textarea
            v-model="rejectReason"
            placeholder="请输入驳回原因"
            :maxlength="200"
            show-word-limit
            :rows="5"
          />
        </view>
        <view class="dialog-footer">
          <wd-button type="default" @click="showRejectDialog = false">取消</wd-button>
          <wd-button type="error" @click="confirmReject">确定驳回</wd-button>
        </view>
      </view>
    </wd-popup>

    <!-- ========== 签约驳回弹窗 ========== -->
    <wd-popup v-model="showContractRejectDialog" position="center" :close-on-click-modal="false">
      <view class="reject-dialog">
        <view class="dialog-header">
          <text class="dialog-title">驳回签约</text>
        </view>
        <view class="dialog-content">
          <wd-textarea
            v-model="contractRejectReason"
            placeholder="请输入驳回原因（如：截图不清晰、签署信息不完整等）"
            :maxlength="200"
            show-word-limit
            :rows="5"
          />
        </view>
        <view class="dialog-footer">
          <wd-button type="default" @click="showContractRejectDialog = false">取消</wd-button>
          <wd-button type="error" @click="confirmContractReject">确定驳回</wd-button>
        </view>
      </view>
    </wd-popup>

    <!-- ========== 佣金设置弹窗 ========== -->
    <wd-popup v-model="showCommissionDialog" position="bottom" :close-on-click-modal="true">
      <view class="commission-dialog">
        <view class="dialog-header">
          <text class="dialog-title">设置佣金</text>
          <view class="dialog-close" @click="showCommissionDialog = false">
            <text class="iconfont icon-close"></text>
          </view>
        </view>

        <!-- 佣金类型 -->
        <view class="dialog-section">
          <text class="dialog-label">佣金类型</text>
          <view class="type-tags">
            <view
              class="type-tag"
              :class="{ active: commissionForm.type === 'percentage' }"
              @click="commissionForm.type = 'percentage'"
            >按比例</view>
            <view
              class="type-tag"
              :class="{ active: commissionForm.type === 'fixed_amount' }"
              @click="commissionForm.type = 'fixed_amount'"
            >固定金额</view>
          </view>
        </view>

        <!-- 佣金数值 -->
        <view class="dialog-section">
          <text class="dialog-label">
            {{ commissionForm.type === 'percentage' ? '佣金比例（0-100%）' : '固定金额（元）' }}
          </text>
          <view class="value-input-row">
            <wd-input
              v-model="commissionForm.valueStr"
              type="number"
              :placeholder="commissionForm.type === 'percentage' ? '如：10 表示10%' : '如：5 表示5元'"
              no-border
              class="value-input"
            />
            <text class="value-unit">{{ commissionForm.type === 'percentage' ? '%' : '元' }}</text>
          </view>
          <text v-if="commissionForm.type === 'percentage'" class="dialog-hint">
            每笔订单实际收取金额 = 订单金额 × {{ commissionForm.valueStr || '0' }}%
          </text>
          <text v-else class="dialog-hint">
            每笔订单固定收取 ¥{{ commissionForm.valueStr || '0' }}
          </text>
        </view>

        <view class="dialog-actions">
          <wd-button block type="primary" size="large" @click="saveCommission">确认保存</wd-button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { institutionApi, type InstitutionInfo } from '@/api/institution'
import { courseApi, type CourseInfo } from '@/api/course'
import { adminApi } from '@/api/admin'
import { useEnums } from '@/composables/useEnums'
import AsyncImage from '@/components/AsyncImage/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import InstitutionInfoCard from '@/components/InstitutionInfoCard/index.vue'
import InstitutionCourses from '@/components/InstitutionCourses/index.vue'
import InstitutionShowcase from '@/components/InstitutionShowcase/index.vue'

const { loadEnumsByTypes, getEnumLabel, ENUM_TYPES } = useEnums()

const loading = ref(true)
const institution = ref<InstitutionInfo | null>(null)
const courses = ref<CourseInfo[]>([])
const institutionId = ref('')

const showRejectDialog = ref(false)
const rejectReason = ref('')

// ========== Computed ==========

const tags = computed(() => {
  if (!institution.value?.tags) return []
  return institution.value.tags
    .split(',')
    .map((code: string) => getEnumLabel(ENUM_TYPES.INSTITUTION_TAG, code.trim()) || code.trim())
})

// ========== Lifecycle ==========

onLoad(async (options: any) => {
  if (options?.id) {
    institutionId.value = options.id
  }
  await loadEnumsByTypes([ENUM_TYPES.INSTITUTION_TAG])
  await loadData()
})

onShow(() => {
  if (institutionId.value) {
    loadData()
  }
})

// ========== Data Loading ==========

const loadData = async () => {
  if (!institutionId.value) return
  loading.value = true
  try {
    const [instRes, courseRes] = await Promise.all([
      institutionApi.getById(institutionId.value),
      courseApi.getList({ institutionId: institutionId.value, page: 1, pageSize: 20 }),
    ])
    institution.value = instRes
    courses.value = Array.isArray(courseRes) ? courseRes : courseRes.data || []
  } catch (e) {
    console.error('加载详情失败:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// ========== 状态相关（管理员特有） ==========

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    contract_signing: '待签约',
    contract_review: '签约审核中',
    approved: '已通过',
    rejected: '已驳回',
    frozen: '已冻结',
  }
  return map[status || 'contract_signing'] || status
}

const getStatusIcon = (status: string) => {
  const map: Record<string, string> = {
    draft: 'icon-edit',
    pending: 'icon-time',
    contract_signing: 'icon-edit',
    contract_review: 'icon-time',
    approved: 'icon-success',
    rejected: 'icon-error',
    frozen: 'icon-lock',
  }
  return map[status] || 'icon-info'
}

// ========== 通用方法 ==========

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const previewSingleImage = (url: string) => {
  uni.previewImage({ urls: [url], current: url })
}

const goToCourse = (course: any) => {
  uni.navigateTo({ url: `/pages/course-detail/index?id=${course.id}` })
}

const goToEdit = () => {
  uni.navigateTo({ url: `/pages/admin/institution-edit/index?id=${institutionId.value}` })
}

// ========== 审核操作（管理员特有） ==========

const handleApprove = () => {
  uni.showModal({
    title: '提示',
    content: '确定审核通过该机构吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminApi.audit(institutionId.value, { auditStatus: 'approved' })
          uni.showToast({ title: '审核成功', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 1000)
        } catch (error) {
          console.error('审核失败:', error)
        }
      }
    },
  })
}

const handleReject = () => {
  rejectReason.value = ''
  showRejectDialog.value = true
}

const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    uni.showToast({ title: '请输入驳回原因', icon: 'none' })
    return
  }
  try {
    await adminApi.audit(institutionId.value, {
      auditStatus: 'rejected',
      rejectReason: rejectReason.value,
    })
    uni.showToast({ title: '已驳回', icon: 'success' })
    showRejectDialog.value = false
    setTimeout(() => uni.navigateBack(), 1000)
  } catch (error) {
    console.error('驳回失败:', error)
  }
}

// ========== 签约审核操作 ==========

const showContractRejectDialog = ref(false)
const contractRejectReason = ref('')

const handleContractApprove = () => {
  uni.showModal({
    title: '提示',
    content: '确定签约通过？机构将正式上线运营。',
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminApi.reviewContract(institutionId.value, { status: 'approved' })
          uni.showToast({ title: '签约审核通过', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 1000)
        } catch (error) {
          console.error('签约审核失败:', error)
        }
      }
    },
  })
}

const handleContractReject = () => {
  contractRejectReason.value = ''
  showContractRejectDialog.value = true
}

const confirmContractReject = async () => {
  if (!contractRejectReason.value.trim()) {
    uni.showToast({ title: '请输入驳回原因', icon: 'none' })
    return
  }
  try {
    await adminApi.reviewContract(institutionId.value, {
      status: 'rejected',
      rejectReason: contractRejectReason.value,
    })
    uni.showToast({ title: '签约已驳回', icon: 'success' })
    showContractRejectDialog.value = false
    setTimeout(() => uni.navigateBack(), 1000)
  } catch (error) {
    console.error('签约驳回失败:', error)
  }
}

// ========== 佣金设置 ==========

const showCommissionDialog = ref(false)
const commissionForm = ref({
  type: 'percentage' as 'percentage' | 'fixed_amount',
  valueStr: '10',
})

const openCommissionDialog = () => {
  const inst = institution.value as any
  if (!inst) return
  const t = inst.commission_type || 'percentage'
  const raw = Number(inst.commission_value) || 0
  commissionForm.value = {
    type: t,
    valueStr: t === 'percentage'
      ? (raw * 100).toFixed(1)
      : raw.toFixed(2),
  }
  showCommissionDialog.value = true
}

const saveCommission = async () => {
  const { type, valueStr } = commissionForm.value
  const numVal = parseFloat(valueStr)
  if (isNaN(numVal) || numVal < 0) {
    uni.showToast({ title: '请输入有效的佣金值', icon: 'none' })
    return
  }
  if (type === 'percentage' && numVal > 100) {
    uni.showToast({ title: '百分比不能超过 100%', icon: 'none' })
    return
  }
  const apiValue = type === 'percentage' ? numVal / 100 : numVal
  try {
    await adminApi.setCommission(institutionId.value, {
      commissionType: type,
      commissionValue: apiValue,
    })
    uni.showToast({ title: '佣金设置成功', icon: 'success' })
    showCommissionDialog.value = false
    await loadData()
  } catch (error) {
    console.error('设置佣金失败:', error)
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 160rpx;
}

.loading-state {
  margin-top: 200rpx;
  display: flex;
  justify-content: center;
}

/* ========== 审核状态横幅（管理员特有） ========== */
.audit-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 40rpx;
  color: #fff;

  &.audit-draft {
    background: linear-gradient(135deg, #8c8c8c, #bfbfbf);
  }

  &.audit-pending {
    background: linear-gradient(135deg, #fa8c16, #ffc53d);
  }

  &.audit-approved {
    background: linear-gradient(135deg, $uni-color-primary-dark, $uni-color-primary-light);
  }

  &.audit-rejected {
    background: linear-gradient(135deg, #cf1322, #ff4d4f);
  }

  &.audit-contract_signing {
    background: linear-gradient(135deg, #d48806, #faad14);
  }

  &.audit-contract_review {
    background: linear-gradient(135deg, #096dd9, #1890ff);
  }

  &.audit-frozen {
    background: linear-gradient(135deg, #595959, #8c8c8c);
  }
}

.audit-left {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.audit-status-text {
  font-size: 36rpx;
  font-weight: bold;
}

.audit-time {
  font-size: 24rpx;
  opacity: 0.85;
}

.audit-icon {
  opacity: 0.6;
}

/* 驳回原因横幅 */
.reject-banner {
  display: flex;
  align-items: flex-start;
  padding: 20rpx 32rpx;
  background-color: #fff2f0;
  color: $uni-color-error;
  font-size: 26rpx;
  line-height: 1.5;
}

/* ========== 管理员特有：资质/财务信息 ========== */
.section-block {
  background: #fff;
  margin: 24rpx;
  padding: 32rpx;
  border-radius: 24rpx;
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.block-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.qual-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.qual-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}

.qual-label {
  font-size: 28rpx;
  color: $uni-text-color-secondary;
  flex-shrink: 0;
}

.qual-value {
  font-size: 28rpx;
  color: $uni-text-color;
  font-weight: 500;
  text-align: right;
}

.qual-images {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-end;

  .qual-label {
    align-self: flex-start;
  }
}

.id-card-imgs {
  display: flex;
  gap: 16rpx;
  justify-content: flex-end;
}

/* ========== 驳回弹窗 ========== */
.reject-dialog {
  width: 600rpx;
  background-color: $uni-bg-color;
  border-radius: 16rpx;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid $uni-border-color-light;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $uni-text-color;
}

.dialog-content {
  padding: 32rpx;
}

.dialog-footer {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 32rpx 32rpx;
}

/* ========== 签约凭证区域 ========== */
.contract-time {
  display: flex;
  align-items: center;
  font-size: 22rpx;
  color: $uni-text-color-tertiary;
}

/* ========== 佣金配置区域 ========== */
.commission-type-badge {
  display: flex;
  align-items: center;
  padding: 6rpx 16rpx;
  border-radius: 30rpx;
  font-size: 22rpx;

  .iconfont {
    font-size: 22rpx;
    margin-right: 4rpx;
  }

  &.badge-percentage {
    background-color: $uni-color-primary-lighter;
    color: $uni-color-primary;
  }

  &.badge-fixed {
    background-color: rgba(24, 144, 255, 0.1);
    color: #1890ff;
  }
}

.commission-highlight {
  font-size: 32rpx !important;
  font-weight: 700 !important;
  color: $uni-color-primary !important;
}

.commission-tip {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  background-color: $uni-bg-color-grey;
  border-radius: 12rpx;
  font-size: 22rpx;
  color: $uni-text-color-secondary;

  .iconfont {
    font-size: 22rpx;
    color: $uni-color-primary;
    margin-right: 8rpx;
    flex-shrink: 0;
  }
}

/* ========== 佣金设置弹窗 ========== */
.commission-dialog {
  background-color: $uni-bg-color;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}

.dialog-close {
  padding: 8rpx;
  .iconfont {
    font-size: 36rpx;
    color: $uni-text-color-tertiary;
  }
}

.dialog-section {
  margin-bottom: 32rpx;

  .dialog-label {
    font-size: 28rpx;
    color: $uni-text-color-secondary;
    margin-bottom: 16rpx;
    display: block;
  }
}

.type-tags {
  display: flex;
  gap: 16rpx;

  .type-tag {
    flex: 1;
    padding: 20rpx;
    text-align: center;
    border-radius: 12rpx;
    font-size: 28rpx;
    background-color: $uni-bg-color-grey;
    color: $uni-text-color-secondary;
    border: 2rpx solid transparent;

    &.active {
      background-color: $uni-color-primary-lighter;
      color: $uni-color-primary;
      border-color: $uni-color-primary;
      font-weight: 600;
    }
  }
}

.value-input-row {
  display: flex;
  align-items: center;
  border: 2rpx solid $uni-border-color;
  border-radius: 12rpx;
  overflow: hidden;
  padding: 0 20rpx;

  .value-input {
    flex: 1;
  }

  .value-unit {
    font-size: 30rpx;
    color: $uni-text-color-secondary;
    padding-left: 12rpx;
  }
}

.dialog-hint {
  display: block;
  font-size: 22rpx;
  color: $uni-text-color-tertiary;
  margin-top: 12rpx;
}

.dialog-actions {
  margin-top: 16rpx;
}
</style>
