/**
 * 防抖/节流工具函数
 */

/**
 * 防抖函数
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  
  return function (...args: Parameters<T>) {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, delay)
  }
}

/**
 * 节流函数
 * @param fn 要执行的函数
 * @param interval 间隔时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  interval: number = 300
): (...args: Parameters<T>) => void {
  let lastTime = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  
  return function (...args: Parameters<T>) {
    const now = Date.now()
    
    if (now - lastTime >= interval) {
      // 直接执行
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      fn(...args)
      lastTime = now
    } else if (!timer) {
      // 延迟到下一个周期执行
      timer = setTimeout(() => {
        fn(...args)
        lastTime = Date.now()
        timer = null
      }, interval - (now - lastTime))
    }
  }
}

/**
 * 带 Loading 状态的异步函数包装器
 * 防止重复提交
 * @param fn 异步函数
 * @param loadingRef loading 状态引用
 * @returns 包装后的函数
 */
export function withLoading<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  loadingRef: { value: boolean }
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  return async function (...args: Parameters<T>): Promise<ReturnType<T> | undefined> {
    if (loadingRef.value) {
      console.warn('操作过于频繁，请稍后再试')
      return undefined
    }
    
    loadingRef.value = true
    try {
      return await fn(...args)
    } finally {
      loadingRef.value = false
    }
  }
}

/**
 * 创建一次性执行的函数
 * 执行一次后自动禁用，直到异步操作完成
 * @param fn 异步函数
 * @returns 包装后的函数
 */
export function onceAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  let isExecuting = false
  
  return async function (...args: Parameters<T>): Promise<ReturnType<T> | undefined> {
    if (isExecuting) {
      console.warn('操作正在执行中，请勿重复点击')
      return undefined
    }
    
    isExecuting = true
    try {
      return await fn(...args)
    } finally {
      isExecuting = false
    }
  }
}