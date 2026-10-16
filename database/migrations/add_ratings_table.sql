-- database/migrations/add_ratings_table.sql
-- Phase 5: recipe ratings and feedback for evaluation + collaborative filtering.
-- Stores 1-5 star ratings per user per recipe, replacing the placeholder
-- interactions.type='rated' which has no value column.
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ratings'
);
SET @sql := IF(@has_col = 0,
  'CREATE TABLE ratings (
     rating_id bigint unsigned NOT NULL AUTO_INCREMENT,
     user_id int unsigned NOT NULL,
     recipe_id bigint unsigned NOT NULL,
     rating tinyint unsigned NOT NULL CHECK (rating BETWEEN 1 AND 5),
     review varchar(1000) DEFAULT NULL,
     created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     PRIMARY KEY (rating_id),
     UNIQUE KEY uq_ratings_user_recipe (user_id, recipe_id),
     KEY idx_ratings_recipe (recipe_id),
     KEY idx_ratings_user (user_id),
     CONSTRAINT fk_ratings_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE,
     CONSTRAINT fk_ratings_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE ON UPDATE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;