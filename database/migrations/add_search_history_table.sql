-- database/migrations/add_search_history_table.sql
-- Phase 5: search history logging table referenced by SearchLog.js but missing
-- from schema.sql. The model already swallows failures gracefully.
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'search_history'
);
SET @sql := IF(@has_col = 0,
  'CREATE TABLE search_history (
     search_id bigint unsigned NOT NULL AUTO_INCREMENT,
     user_id int unsigned DEFAULT NULL,
     query varchar(500) NOT NULL,
     filters_json json DEFAULT NULL,
     created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (search_id),
     KEY idx_search_history_user (user_id),
     KEY idx_search_history_created (created_at),
     CONSTRAINT fk_search_history_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;