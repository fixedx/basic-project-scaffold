-- ============================================================
-- 创建 distance_km() 数据库函数
-- 统一距离计算，避免各处 SQL 手动 / 1000.0 导致单位不一致
-- ============================================================

-- 用法1: distance_km(location_column, lng, lat) → 公里数
-- 用法2: distance_km(location_column, point)    → 公里数

-- 通过 geography 类型的 location 列和用户坐标，计算距离（公里）
CREATE OR REPLACE FUNCTION distance_km(
  loc geography,
  lng float8,
  lat float8
) RETURNS float8 AS $$
BEGIN
  IF loc IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN ST_Distance(loc, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) / 1000.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- 重载版本：接受 geography 点参数
CREATE OR REPLACE FUNCTION distance_km(
  loc geography,
  user_point geography
) RETURNS float8 AS $$
BEGIN
  IF loc IS NULL OR user_point IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN ST_Distance(loc, user_point) / 1000.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- 验证函数
-- SELECT distance_km(location, 116.4074, 39.9042) AS dist_km FROM institutions WHERE location IS NOT NULL LIMIT 3;

COMMENT ON FUNCTION distance_km(geography, float8, float8) IS '计算 geography 列到指定经纬度的距离（单位：公里）。参数顺序：location列, 经度, 纬度';
COMMENT ON FUNCTION distance_km(geography, geography) IS '计算两个 geography 点之间的距离（单位：公里）';
