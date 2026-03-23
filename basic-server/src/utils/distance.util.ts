/**
 * 距离计算工具
 * 
 * ⚠️ 重要约定：
 * - 后端所有接口返回的距离单位统一为 **公里（km）**
 * - 数据库查询统一使用 distance_km() 函数（见 migrations/create-distance-km-function.sql）
 * - 前端 formatDistance() 接收公里数，负责格式化为 "500m" / "1.2km" / "1235km"
 */

// ============================================================
// PostGIS SQL 片段生成工具
// 所有需要计算距离的 SQL 查询，必须使用这些工具函数生成 SQL 片段
// 禁止在业务代码中直接写 ST_Distance()
// ============================================================

/**
 * 生成距离计算 SQL 片段（使用数据库函数 distance_km）
 * 返回值单位：公里
 * 
 * @param locationColumn - location 列的引用（如 'i.location'）
 * @param lngExpr - 经度表达式（如 '$2::float8' 或直接数值）
 * @param latExpr - 纬度表达式（如 '$1::float8' 或直接数值）
 * @param alias - SQL 别名，默认 'distance'
 * @returns SQL 片段，如 "distance_km(i.location, $2::float8, $1::float8) AS distance"
 * 
 * @example
 * // 参数化查询（推荐）
 * const sql = `SELECT i.*, ${distanceSQL('i.location', '$2::float8', '$1::float8')} FROM institutions i`;
 * 
 * // 内联数值（用于动态拼接 SQL）
 * const sql = `SELECT i.*, ${distanceSQL('i.location', lng, lat)} FROM institutions i`;
 */
export function distanceSQL(
  locationColumn: string,
  lngExpr: string | number,
  latExpr: string | number,
  alias: string = 'distance',
): string {
  return `distance_km(${locationColumn}, ${lngExpr}, ${latExpr}) AS ${alias}`;
}

/**
 * 生成 ST_DWithin 距离筛选 SQL 片段
 * 
 * @param locationColumn - location 列的引用
 * @param lngExpr - 经度表达式
 * @param latExpr - 纬度表达式
 * @param distanceMetersExpr - 距离（米）表达式
 * @returns SQL 条件片段
 * 
 * @example
 * const where = withinSQL('i.location', '$2::float8', '$1::float8', '$3::float8');
 * // → "ST_DWithin(i.location, ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography, $3::float8)"
 */
export function withinSQL(
  locationColumn: string,
  lngExpr: string | number,
  latExpr: string | number,
  distanceMetersExpr: string | number,
): string {
  return `ST_DWithin(${locationColumn}, ST_SetSRID(ST_MakePoint(${lngExpr}, ${latExpr}), 4326)::geography, ${distanceMetersExpr})`;
}

/**
 * 生成用户位置点 SQL 片段
 * 
 * @param lngExpr - 经度表达式
 * @param latExpr - 纬度表达式
 * @returns geography 点 SQL
 */
export function userPointSQL(
  lngExpr: string | number,
  latExpr: string | number,
): string {
  return `ST_SetSRID(ST_MakePoint(${lngExpr}, ${latExpr}), 4326)::geography`;
}

// ============================================================
// 应用层距离工具
// ============================================================

/**
 * 计算两点之间的距离（Haversine 公式）
 * @param lat1 点1的纬度
 * @param lon1 点1的经度
 * @param lat2 点2的纬度
 * @param lon2 点2的经度
 * @returns 距离（单位：米）
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // 地球半径（米）

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 角度转弧度
 */
function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

import { MoneyMath } from '@/common/utils/money.util';

/**
 * 格式化距离显示
 * @param distance 距离（米）
 * @returns 格式化后的字符串
 */
export function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  } else {
    // 使用 MoneyMath 处理精度，保留1位小数
    const km = MoneyMath.divideYuan(distance, 1000);
    return `${MoneyMath.d(km).toDecimalPlaces(1).toString()}km`;
  }
}
