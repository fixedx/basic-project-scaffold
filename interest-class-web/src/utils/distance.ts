/**
 * 距离格式化工具
 * 后端返回的距离单位统一为**公里（km）**
 */

/**
 * 格式化距离（输入单位：公里）
 * @param distance - 距离（公里），后端通过 ST_Distance / 1000.0 计算得出
 * @returns 格式化后的字符串，如 "500m" 或 "1.2km" 或 "1234km"
 */
export function formatDistance(distance: number | string | null | undefined): string {
  if (distance === null || distance === undefined) {
    return ''
  }

  const km = typeof distance === 'string' ? parseFloat(distance) : distance

  if (isNaN(km)) {
    return ''
  }

  // 小于 1 公里，转换为米显示
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }

  // 1-100 公里，保留一位小数
  if (km < 100) {
    return `${km.toFixed(1)}km`
  }

  // 100 公里以上，取整显示
  return `${Math.round(km)}km`
}

/**
 * 获取用户位置
 * @returns Promise<{latitude: number, longitude: number} | null>
 */
export function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    uni.getLocation({
      type: 'gcj02',
      success: (res) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude,
        })
      },
      fail: (err) => {
        console.warn('获取位置失败:', err)
        resolve(null)
      },
    })
  })
}
