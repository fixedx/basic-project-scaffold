/**
 * HTTP 请求工具
 */

import { getToken, setToken, removeToken } from './auth'

// API 前缀
const API_PREFIX = '/api'


/**
 * 获取当前运行环境的 API 地址
 */
function getBaseURL(): string {
  // #ifdef MP-WEIXIN
  try {
    const accountInfo = uni?.getAccountInfoSync?.()
    const envVersion = accountInfo?.miniProgram?.envVersion || 'release'
    
    // 开发版：本地开发工具
    if (envVersion === 'develop') {
      return 'https://unglacially-nonappeasing-misha.ngrok-free.dev'
    }
    
    // 体验版
    if (envVersion === 'trial') {
      return 'https://luckyer-test.qihangco.com'
    }
    
    // 正式版
    return 'https://luckyer.qihangco.com'
  } catch (e) {
    // uni 尚未初始化时的兜底
    return 'https://luckyer.qihangco.com'
  }
  // #endif

  // #ifdef H5
  // H5 开发环境使用本地后端，生产环境使用线上地址
  if (import.meta.env.DEV) {
    return 'http://localhost:8888'
  }
  return 'https://luckyer.qihangco.com'
  // #endif

  // #ifndef MP-WEIXIN || H5
  return 'https://luckyer.qihangco.com'
  // #endif
}

// 基础配置（延迟求值，避免模块初始化时 uni 未就绪）
let _baseURL: string | null = null
function getBaseURLLazy(): string {
  if (!_baseURL) {
    _baseURL = getBaseURL()
  }
  return _baseURL
}

/**
 * 请求配置
 */
interface RequestConfig {
  showLoading?: boolean
  showError?: boolean
  showSuccess?: boolean
  successMessage?: string
}

/**
 * 响应数据格式
 */
interface ResponseData<T = any> {
  code: number
  data: T
  message: string
}

// 重新导出 auth.ts 中的函数，保持向后兼容
export { getToken, setToken, removeToken }

/**
 * HTTP 请求封装
 */
class Http {
  private get baseURL(): string {
    return getBaseURLLazy()
  }

  /**
   * 通用请求方法
   */
  private request<T = any>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      showLoading = false,
      showError = true,
      showSuccess = false,
      successMessage = '操作成功'
    } = config

    // 显示加载
    if (showLoading) {
      uni.showLoading({ title: '加载中...', mask: true })
    }

    return new Promise((resolve, reject) => {
      const token = getToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        // 跳过 ngrok 安全提示页面（仅开发环境需要）
        'ngrok-skip-browser-warning': 'true'
      }
      
      // 只有存在token时才添加Authorization头
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      uni.request({
        url: this.baseURL + API_PREFIX + url,
        method,
        data,
        header: headers,
        success: (res: any) => {
          if (showLoading) {
            uni.hideLoading()
          }

          const responseData = res.data as ResponseData<T>

          // 成功
          if (responseData.code === 200) {
            if (showSuccess) {
              uni.showToast({
                title: successMessage,
                icon: 'success'
              })
            }
            resolve(responseData.data)
          } 
          // 未授权，跳转登录
          else if (responseData.code === 401) {
            removeToken()
            uni.reLaunch({
              url: '/pages/login/index'
            })
            reject(new Error('未授权，请先登录'))
          }
          else {
            // 业务错误
            if (showError) {
              uni.showToast({
                title: responseData.message || '请求失败',
                icon: 'none'
              })
            }
            reject(new Error(responseData.message))
          }
        },
        fail: (err) => {
          if (showLoading) {
            uni.hideLoading()
          }

          if (showError) {
            uni.showToast({
              title: '网络请求失败',
              icon: 'none'
            })
          }
          reject(err)
        }
      })
    })
  }

  /**
   * GET 请求
   */
  get<T = any>(url: string, params?: any, config?: RequestConfig): Promise<T> {
    // 将参数拼接到 URL 上
    if (params) {
      const queryString = Object.keys(params)
        .filter(key => params[key] !== undefined && params[key] !== null)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&')
      
      if (queryString) {
        url = url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`
      }
    }
    
    return this.request<T>(url, 'GET', undefined, config)
  }

  /**
   * POST 请求
   */
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, 'POST', data, config)
  }

  /**
   * PUT 请求
   */
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, 'PUT', data, config)
  }

  /**
   * DELETE 请求
   */
  delete<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, 'DELETE', data, config)
  }

  /**
   * 上传文件
   */
  upload<T = any>(
    url: string,
    filePath: string | File,
    name: string = 'file',
    formData?: Record<string, any>,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      showLoading = false,
      showError = true,
    } = config

    if (showLoading) {
      uni.showLoading({ title: '上传中...', mask: true })
    }

    return new Promise((resolve, reject) => {
      // H5 环境下，filePath 可能是 File 对象
      // @ts-ignore
      if (typeof window !== 'undefined' && filePath instanceof File) {
        // H5 环境使用 XMLHttpRequest 上传
        const xhr = new XMLHttpRequest()
        const formDataObj = new FormData()
        
        formDataObj.append(name, filePath)
        
        // 添加其他表单数据
        if (formData) {
          Object.keys(formData).forEach(key => {
            formDataObj.append(key, formData[key])
          })
        }
        
        xhr.open('POST', this.baseURL + API_PREFIX + url)
        xhr.setRequestHeader('Authorization', `Bearer ${getToken() || ''}`)
        
        xhr.onload = () => {
          if (showLoading) {
            uni.hideLoading()
          }
          
          try {
            const responseData = JSON.parse(xhr.responseText) as ResponseData<T>
            
            if (responseData.code === 200) {
              resolve(responseData.data)
            } else {
              if (showError) {
                uni.showToast({
                  title: responseData.message || '上传失败',
                  icon: 'none'
                })
              }
              reject(new Error(responseData.message))
            }
          } catch (error) {
            if (showError) {
              uni.showToast({
                title: '上传失败',
                icon: 'none'
              })
            }
            reject(error)
          }
        }
        
        xhr.onerror = () => {
          if (showLoading) {
            uni.hideLoading()
          }
          
          if (showError) {
            uni.showToast({
              title: '上传失败',
              icon: 'none'
            })
          }
          reject(new Error('上传失败'))
        }
        
        xhr.send(formDataObj)
        return
      }
      
      // 小程序环境使用 uni.uploadFile
      uni.uploadFile({
        url: this.baseURL + API_PREFIX + url,
        filePath: filePath as string,
        name,
        formData,
        header: {
          'Authorization': `Bearer ${getToken() || ''}`
        },
        success: (res: any) => {
          if (showLoading) {
            uni.hideLoading()
          }

          try {
            const responseData = JSON.parse(res.data) as ResponseData<T>

            if (responseData.code === 200) {
              resolve(responseData.data)
            } else {
              if (showError) {
                uni.showToast({
                  title: responseData.message || '上传失败',
                  icon: 'none'
                })
              }
              reject(new Error(responseData.message))
            }
          } catch (error) {
            if (showError) {
              uni.showToast({
                title: '上传失败',
                icon: 'none'
              })
            }
            reject(error)
          }
        },
        fail: (err) => {
          if (showLoading) {
            uni.hideLoading()
          }

          if (showError) {
            uni.showToast({
              title: '上传失败',
              icon: 'none'
            })
          }
          reject(err)
        }
      })
    })
  }
}

export const http = new Http()

// 便捷方法导出
export const get = http.get.bind(http)
export const post = http.post.bind(http)
export const put = http.put.bind(http)
export const del = http.delete.bind(http)
export const upload = http.upload.bind(http)
