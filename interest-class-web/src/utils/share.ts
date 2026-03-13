/**
 * 微信小程序分享工具函数
 *
 * 只负责生成分享内容，不包含任何 Vue/uni-app 生命周期逻辑。
 * 生命周期注册由 composables/useShare.ts 统一处理。
 */

const INVITE_CODE_KEY = '_share_invite_code'

/** 缓存邀请码到本地（登录成功或加载邀请码后调用） */
export function cacheInviteCode(code: string) {
  try {
    uni.setStorageSync(INVITE_CODE_KEY, code)
  } catch (e) {
    console.error('[share] 缓存邀请码失败:', e)
  }
}

/** 从本地缓存读取邀请码 */
export function getCachedInviteCode(): string {
  try {
    return uni.getStorageSync(INVITE_CODE_KEY) || ''
  } catch {
    return ''
  }
}

/** 清除邀请码缓存（退出登录时调用） */
export function clearInviteCode() {
  try {
    uni.removeStorageSync(INVITE_CODE_KEY)
  } catch { /* ignore */ }
}

/**
 * 生成"分享给朋友"的内容
 * onShareAppMessage(() => getShareContent())
 */
export function getShareContent(inviteCode?: string) {
  const code = inviteCode ?? getCachedInviteCode()
  return {
    title: '发现超棒的兴趣课机构，用我的邀请码报名还能立减！🎉',
    path: code
      ? `/pages/index/index?inviteCode=${code}`
      : '/pages/index/index',
  }
}

/**
 * 生成"分享到朋友圈"的内容
 * onShareTimeline(() => getTimelineContent())
 */
export function getTimelineContent(inviteCode?: string) {
  const code = inviteCode ?? getCachedInviteCode()
  return {
    title: '发现超棒的兴趣课机构，用我的邀请码报名还能立减！🎉',
    query: code ? `inviteCode=${code}` : '',
  }
}
