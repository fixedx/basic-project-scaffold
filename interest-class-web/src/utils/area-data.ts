/**
 * 省市区数据处理工具
 */
import { areaList } from '@vant/area-data'

/**
 * 转换为 wot-design-uni 的 ColPicker 需要的格式
 */
export function transformAreaData() {
  const provinces = areaList.province_list
  const cities = areaList.city_list
  const counties = areaList.county_list

  // 构建三级数据
  const columns = [
    // 省份列
    Object.keys(provinces).map(code => ({
      value: code,
      label: provinces[code]
    })),
    // 城市列
    Object.keys(cities).map(code => ({
      value: code,
      label: cities[code]
    })),
    // 区县列
    Object.keys(counties).map(code => ({
      value: code,
      label: counties[code]
    }))
  ]

  return columns
}

/**
 * 根据省份代码获取城市列表
 */
export function getCitiesByProvince(provinceCode: string) {
  const cities = areaList.city_list
  
  return Object.keys(cities)
    .filter(code => code.startsWith(provinceCode.substring(0, 2)))
    .map(code => ({
      value: code,
      label: cities[code]
    }))
}

/**
 * 根据城市代码获取区县列表
 */
export function getCountiesByCity(cityCode: string) {
  const counties = areaList.county_list
  
  return Object.keys(counties)
    .filter(code => code.startsWith(cityCode.substring(0, 4)))
    .map(code => ({
      value: code,
      label: counties[code]
    }))
}

/**
 * 根据区域代码获取名称
 */
export function getAreaName(code: string): string {
  return areaList.province_list[code] || 
         areaList.city_list[code] || 
         areaList.county_list[code] || 
         ''
}

/**
 * 根据地址字符串解析省市区
 * @param address 完整地址，如："广东省深圳市南山区科技园南路"
 * @returns { province, city, district, detail }
 */
export function parseAddress(address: string) {
  const provinces = areaList.province_list
  const cities = areaList.city_list
  const counties = areaList.county_list
  
  let province = ''
  let provinceCode = ''
  let city = ''
  let cityCode = ''
  let district = ''
  let districtCode = ''
  
  // 查找省份
  for (const [code, name] of Object.entries(provinces)) {
    if (address.includes(name)) {
      province = name
      provinceCode = code
      break
    }
  }
  
  // 查找城市
  if (provinceCode) {
    for (const [code, name] of Object.entries(cities)) {
      if (code.startsWith(provinceCode.substring(0, 2)) && address.includes(name)) {
        city = name
        cityCode = code
        break
      }
    }
  }
  
  // 查找区县
  if (cityCode) {
    for (const [code, name] of Object.entries(counties)) {
      if (code.startsWith(cityCode.substring(0, 4)) && address.includes(name)) {
        district = name
        districtCode = code
        break
      }
    }
  }
  
  // 提取详细地址（去除省市区部分）
  let detail = address
  if (province) detail = detail.replace(province, '')
  if (city) detail = detail.replace(city, '')
  if (district) detail = detail.replace(district, '')
  
  return {
    province,
    provinceCode,
    city,
    cityCode,
    district,
    districtCode,
    detail: detail.trim()
  }
}

/**
 * 导出原始数据
 */
export { areaList }
