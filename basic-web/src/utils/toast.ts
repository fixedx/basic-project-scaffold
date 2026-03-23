/**
 * Toast 提示工具函数
 */

export const showSuccessToast = (title: string, duration = 2000) => {
  uni.showToast({
    title,
    icon: 'success',
    duration
  })
}

export const showErrorToast = (title: string, duration = 2000) => {
  uni.showToast({
    title,
    icon: 'none',
    duration
  })
}

export const showLoadingToast = (title = '加载中...', mask = true) => {
  uni.showLoading({
    title,
    mask
  })
}

export const hideLoadingToast = () => {
  uni.hideLoading()
}

export const showConfirmDialog = (options: {
  title?: string
  content: string
  confirmText?: string
  cancelText?: string
}): Promise<boolean> => {
  return new Promise((resolve) => {
    uni.showModal({
      title: options.title || '提示',
      content: options.content,
      confirmText: options.confirmText || '确定',
      cancelText: options.cancelText || '取消',
      success: (res) => {
        resolve(res.confirm)
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}
