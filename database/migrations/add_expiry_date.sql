-- database/migrations/add_expiry_date.sql
-- Blueprint §10-11: pantry items carry expiry dates; near-expiry items
-- power expiry-aware recommendation (§21) and "expiring soon" UI badges.

SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pantry_items' AND COLUMN_NAME = 'expiry_date'
);
SET @sql := IF(@has_col = 0,
  'ALTER TABLE pantry_items ADD COLUMN expiry_date DATE DEFAULT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
