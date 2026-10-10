-- database/migrations/add_diet_plan.sql
-- Report §6.3: "Diet_Plan and Diet_Plan_Meals: Weekly meal plans and daily meal plans."
-- Also adds password-reset columns (report §6.5 password reset workflow) and the
-- `completed` flag the shopping-list UI toggles.

CREATE TABLE IF NOT EXISTS diet_plan (
  plan_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  week_start DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (plan_id),
  UNIQUE KEY uq_diet_plan_user_week (user_id, week_start),
  CONSTRAINT fk_diet_plan_user FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS diet_plan_meals (
  meal_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  plan_id BIGINT UNSIGNED NOT NULL,
  day_of_week TINYINT UNSIGNED NOT NULL,
  recipe_id BIGINT UNSIGNED NOT NULL,
  meal_type ENUM('breakfast','lunch','dinner','snack') NOT NULL DEFAULT 'dinner',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (meal_id),
  KEY idx_diet_plan_meals_plan (plan_id),
  KEY idx_diet_plan_meals_recipe (recipe_id),
  CONSTRAINT fk_diet_plan_meals_plan FOREIGN KEY (plan_id) REFERENCES diet_plan (plan_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_diet_plan_meals_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Password reset workflow -------------------------------------------------
SET @has_reset := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'reset_token'
);
SET @sql := IF(@has_reset = 0,
  'ALTER TABLE users ADD COLUMN reset_token VARCHAR(64) DEFAULT NULL, ADD COLUMN reset_expires DATETIME DEFAULT NULL, ADD INDEX idx_users_reset_token (reset_token)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Shopping list completion flag ------------------------------------------
SET @has_completed := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shopping_list_items' AND COLUMN_NAME = 'completed'
);
SET @sql := IF(@has_completed = 0,
  'ALTER TABLE shopping_list_items ADD COLUMN completed TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;