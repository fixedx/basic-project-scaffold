/**
 * 安全的 Token 存储工具
 * 使用简单的加密方式存储 token，防止明文存储被 XSS 攻击获取
 */

const TOKEN_KEY = 'auth_token'
const TOKEN_IV_KEY = 'auth_token_iv'

/**
 * 简单的 XOR 加密/解密
 * 注意：这不是强加密，但比明文存储安全，可以防止简单的 XSS 攻击直接读取 token
 * 真正的安全需要配合 httpOnly Cookie 使用
 */
function xorEncrypt(text: string, secret: string): string {
  const result: number[] = []
  for (let i = 0; i < text.length; i++) {
    result.push(text.charCodeAt(i) ^ secret.charCodeAt(i % secret.length))
  }
  return String.fromCharCode(...result)
}

/**
 * 生成随机密钥（基于设备特征）
 */
function generateSecret(): string {
  // 使用设备信息 + 固定盐值生成密钥
  const systemInfo = uni.getSystemInfoSync()
  const deviceFingerprint = `${systemInfo.model || ''}${systemInfo.system || ''}${systemInfo.deviceId || 'unknown'}`
  const salt = 'interest-class-2026-salt'
  
  // 简单哈希
  let hash = 0
  const str = deviceFingerprint + salt
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  // 生成 16 字符密钥
  let secret = Math.abs(hash).toString(36)
  while (secret.length < 16) {
    secret += Math.abs(hash * 31).toString(36)
  }
  return secret.substring(0, 16)
}

/**
 * 将字符串转换为 Base64
 */
function toBase64(str: string): string {
  try {
    // #ifdef MP-WEIXIN
    return uni.arrayBufferToBase64(new Uint8Array(str.split('').map(c => c.charCodeAt(0))).buffer)
    // #endif
    // #ifdef H5
    return btoa(str)
    // #endif
    // #ifndef MP-WEIXIN || H5
    return uni.arrayBufferToBase64(new Uint8Array(str.split('').map(c => c.charCodeAt(0))).buffer)
    // #endif
  } catch (e) {
    // 降级：使用 URL 安全的 Base64 变体
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    let result = ''
    for (let i = 0; i < str.length; i += 3) {
      const b1 = str.charCodeAt(i)
      const b2 = i + 1 < str.length ? str.charCodeAt(i + 1) : 0
      const b3 = i + 2 < str.length ? str.charCodeAt(i + 2) : 0
      
      result += chars[(b1 >> 2) & 0x3F]
      result += chars[((b1 << 4) | (b2 >> 4)) & 0x3F]
      if (i + 1 < str.length) result += chars[((b2 << 2) | (b3 >> 6)) & 0x3F]
      if (i + 2 < str.length) result += chars[b3 & 0x3F]
    }
    return result
  }
}

/**
 * 将 Base64 转换为字符串
 */
function fromBase64(str: string): string {
  try {
    // #ifdef MP-WEIXIN
    const buffer = uni.base64ToArrayBuffer(str)
    const arr = new Uint8Array(buffer)
    return String.fromCharCode(...arr)
    // #endif
    // #ifdef H5
    return atob(str)
    // #endif
    // #ifndef MP-WEIXIN || H5
    const buffer = uni.base64ToArrayBuffer(str)
    const arr = new Uint8Array(buffer)
    return String.fromCharCode(...arr)
    // #endif
  } catch (e) {
    // 降级
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    let result = ''
    for (let i = 0; i < str.length; i += 4) {
      const c1 = chars.indexOf(str[i])
      const c2 = chars.indexOf(str[i + 1])
      const c3 = str[i + 2] ? chars.indexOf(str[i + 2]) : -1
      const c4 = str[i + 3] ? chars.indexOf(str[i + 3]) : -1
      
      result += String.fromCharCode((c1 << 2) | (c2 >> 4))
      if (c3 !== -1) result += String.fromCharCode(((c2 << 4) | (c3 >> 2)) & 0xFF)
      if (c4 !== -1) result += String.fromCharCode(((c3 << 6) | c4) & 0xFF)
    }
    return result
  }
}

/**
 * 设置 token（加密存储）
 */
export function setToken(token: string): void {
  try {
    const secret = generateSecret()
    const encrypted = xorEncrypt(token, secret)
    const base64Encrypted = toBase64(encrypted)
    
    // 存储加密后的 token
    uni.setStorageSync(TOKEN_KEY, base64Encrypted)
    // 存储 IV（这里用密钥的哈希作为标识，用于验证）
    uni.setStorageSync(TOKEN_IV_KEY, toBase64(secret.substring(0, 8)))
  } catch (e) {
    console.error('Token 加密存储失败:', e)
    // 降级：明文存储（仅作为最后手段）
    uni.setStorageSync(TOKEN_KEY, token)
  }
}

/**
 * 获取 token（解密）
 */
export function getToken(): string | null {
  try {
    const encrypted = uni.getStorageSync(TOKEN_KEY)
    if (!encrypted) return null
    
    // 如果存储的是明文 JWT（以 ey 开头），直接返回
    if (typeof encrypted === 'string' && encrypted.startsWith('ey')) {
      return encrypted
    }
    
    const secret = generateSecret()
    const encryptedStr = fromBase64(encrypted)
    const decrypted = xorEncrypt(encryptedStr, secret)
    
    return decrypted
  } catch (e) {
    console.error('Token 解密失败:', e)
    // 尝试直接返回（可能是明文存储的旧 token）
    const fallback = uni.getStorageSync(TOKEN_KEY)
    return fallback || null
  }
}

/**
 * 移除 token
 */
export function removeToken(): void {
  try {
    uni.removeStorageSync(TOKEN_KEY)
    uni.removeStorageSync(TOKEN_IV_KEY)
  } catch (e) {
    console.error('移除 Token 失败:', e)
  }
}

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
  return !!getToken()
}