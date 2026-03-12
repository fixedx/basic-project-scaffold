/**
 * 通用校验工具
 */

/**
 * 手机号正则（中国大陆 11 位手机号）
 */
export const PHONE_REG = /^1[3-9]\d{9}$/

/**
 * 校验手机号格式
 * @param phone 手机号字符串
 * @returns 是否为有效手机号
 */
export function isValidPhone(phone: string): boolean {
  return PHONE_REG.test(phone)
}

/**
 * 校验手机号并提示（不为空时才校验格式）
 * 适用于选填的手机号字段
 * @param phone 手机号
 * @param fieldName 字段名称，用于提示
 * @returns true=通过校验或为空, false=格式错误（已弹提示）
 */
export function validatePhoneOptional(phone: string | undefined | null, fieldName = '手机号'): boolean {
  if (!phone) return true
  if (!isValidPhone(phone)) {
    uni.showToast({ title: `请输入正确的${fieldName}`, icon: 'none' })
    return false
  }
  return true
}

/**
 * 校验手机号并提示（必填）
 * @param phone 手机号
 * @param fieldName 字段名称，用于提示
 * @returns true=通过校验, false=为空或格式错误（已弹提示）
 */
export function validatePhoneRequired(phone: string | undefined | null, fieldName = '手机号'): boolean {
  if (!phone) {
    uni.showToast({ title: `请输入${fieldName}`, icon: 'none' })
    return false
  }
  if (!isValidPhone(phone)) {
    uni.showToast({ title: `请输入正确的${fieldName}`, icon: 'none' })
    return false
  }
  return true
}
