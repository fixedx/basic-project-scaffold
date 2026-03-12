-- ============================================================
-- PostGIS 扩展和 GiST 空间索引支持
-- ============================================================

-- 1. 启用 PostGIS 扩展
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. 为机构表添加 geography 类型的位置列
-- geography 类型使用球面坐标，计算距离更准确（单位：米）
ALTER TABLE institutions 
ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- 3. 从现有的 latitude/longitude 列填充 location 列
UPDATE institutions 
SET location = ST_SetSRID(ST_MakePoint(longitude::float, latitude::float), 4326)::geography
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND location IS NULL;

-- 4. 创建 GiST 空间索引（大幅提升距离查询性能）
CREATE INDEX IF NOT EXISTS idx_institutions_location 
ON institutions USING GIST (location);

-- 5. 创建触发器函数：自动同步 latitude/longitude 到 location
CREATE OR REPLACE FUNCTION sync_institution_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude::float, NEW.latitude::float), 4326)::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建触发器：在 INSERT 或 UPDATE 时自动更新 location
DROP TRIGGER IF EXISTS trg_sync_institution_location ON institutions;
CREATE TRIGGER trg_sync_institution_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON institutions
FOR EACH ROW
EXECUTE FUNCTION sync_institution_location();

-- ============================================================
-- 使用示例
-- ============================================================

-- 查询距离某点 3km 以内的机构（按距离排序）
-- SELECT 
--   id, name, address,
--   ST_Distance(location, ST_SetSRID(ST_MakePoint(116.4074, 39.9042), 4326)::geography) as distance
-- FROM institutions
-- WHERE ST_DWithin(
--   location, 
--   ST_SetSRID(ST_MakePoint(116.4074, 39.9042), 4326)::geography, 
--   3000  -- 3000米 = 3公里
-- )
-- ORDER BY distance;

-- 验证索引是否生效
-- EXPLAIN ANALYZE SELECT * FROM institutions 
-- WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(116.4074, 39.9042), 4326)::geography, 5000);
