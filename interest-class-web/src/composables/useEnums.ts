import { ref } from 'vue'
import { getAllEnums, getEnumsByTypes, type EnumData, type EnumItem, ENUM_TYPES } from '@/api/enum'

// 枚举缓存
const enumCache = ref<EnumData>({})
const isLoaded = ref(false)

/**
 * 枚举管理 Composable
 */
export const useEnums = () => {
  /**
   * 加载所有枚举
   */
  const loadAllEnums = async () => {
    if (isLoaded.value) {
      return enumCache.value
    }

    try {
      const data = await getAllEnums()
      enumCache.value = data
      isLoaded.value = true
      return data
    } catch (error) {
      console.error('加载枚举失败:', error)
      throw error
    }
  }

  /**
   * 加载指定类型的枚举
   */
  const loadEnumsByTypes = async (types: string[]) => {
    try {
      const data = await getEnumsByTypes(types)
      // 合并到缓存
      Object.assign(enumCache.value, data)
      return data
    } catch (error) {
      console.error('加载枚举失败:', error)
      throw error
    }
  }

  /**
   * 获取枚举列表
   */
  const getEnumList = (type: string): EnumItem[] => {
    return enumCache.value[type] || []
  }

  /**
   * 根据code获取枚举项
   */
  const getEnumItem = (type: string, code: string): EnumItem | undefined => {
    const list = getEnumList(type)
    return list.find(item => item.code === code)
  }

  /**
   * 根据code获取label
   */
  const getEnumLabel = (type: string, code: string): string => {
    const item = getEnumItem(type, code)
    return item?.label || code
  }

  /**
   * 转换为选项列表（用于picker等组件）
   */
  const getEnumOptions = (type: string) => {
    const list = getEnumList(type)
    return list.map(item => ({
      label: item.label,
      value: item.code,
      icon: item.icon,
      ...item.extra,
    }))
  }

  /**
   * 转换为picker columns格式
   */
  const getEnumColumns = (type: string) => {
    return [
      {
        values: getEnumList(type),
        labelKey: 'label',
        valueKey: 'code',
      }
    ]
  }

  /**
   * 清除缓存
   */
  const clearCache = () => {
    enumCache.value = {}
    isLoaded.value = false
  }

  return {
    enumCache,
    isLoaded,
    loadAllEnums,
    loadEnumsByTypes,
    getEnumList,
    getEnumItem,
    getEnumLabel,
    getEnumOptions,
    getEnumColumns,
    clearCache,
    ENUM_TYPES,
  }
}
