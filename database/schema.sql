/*!40101 SET @saved_cs_client     = @@character_set_client */;
SET FOREIGN_KEY_CHECKS=0;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dietary_preferences` (
  `preference_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `preference_type` varchar(40) NOT NULL,
  `preference_value` varchar(160) NOT NULL,
  PRIMARY KEY (`preference_id`),
  UNIQUE KEY `uq_dietary_preference` (`user_id`,`preference_type`,`preference_value`),
  CONSTRAINT `fk_dietary_preferences_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18025 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingredients` (
  `ingredient_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(240) NOT NULL,
  `category` varchar(80) NOT NULL DEFAULT 'other',
  `unit` varchar(50) NOT NULL DEFAULT '',
  `fdc_id` bigint unsigned DEFAULT NULL,
  `calories_per_100g` decimal(12,4) DEFAULT NULL,
  `protein_per_100g` decimal(12,4) DEFAULT NULL,
  `fat_per_100g` decimal(12,4) DEFAULT NULL,
  `carbs_per_100g` decimal(12,4) DEFAULT NULL,
  `sodium_mg_per_100g` decimal(12,4) DEFAULT NULL,
  `nutrition_source` varchar(80) DEFAULT NULL,
  `nutrition_source_url` varchar(1000) DEFAULT NULL,
  `is_nutrition_reference` tinyint(1) NOT NULL DEFAULT '0',
  `substitutions_json` json DEFAULT NULL,
  PRIMARY KEY (`ingredient_id`),
  UNIQUE KEY `uq_ingredients_name` (`name`),
  UNIQUE KEY `uq_ingredients_fdc_id` (`fdc_id`),
  KEY `idx_ingredients_category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=1056 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interactions` (
  `interaction_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `recipe_id` bigint unsigned NOT NULL,
  `type` enum('viewed','liked','cooked','saved','rated') NOT NULL,
  `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`interaction_id`),
  KEY `idx_interactions_user_type` (`user_id`,`type`),
  KEY `idx_interactions_recipe_type` (`recipe_id`,`type`),
  CONSTRAINT `fk_interactions_recipe` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`recipe_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_interactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=100006 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nutrition_info` (
  `nutrition_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `recipe_id` bigint unsigned NOT NULL,
  `calories` decimal(14,4) DEFAULT NULL,
  `protein` decimal(14,4) DEFAULT NULL,
  `fat` decimal(14,4) DEFAULT NULL,
  `carbs` decimal(14,4) DEFAULT NULL,
  `sodium` decimal(14,4) DEFAULT NULL,
  `servings` decimal(10,4) DEFAULT NULL,
  `nutrition_basis` enum('whole_recipe','per_serving','unknown') NOT NULL DEFAULT 'unknown',
  `calculation_method` varchar(240) DEFAULT NULL,
  PRIMARY KEY (`nutrition_id`),
  UNIQUE KEY `uq_nutrition_info_recipe` (`recipe_id`),
  CONSTRAINT `fk_nutrition_info_recipe` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`recipe_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pantry_items` (
  `pantry_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `ingredient_id` bigint unsigned NOT NULL,
  `quantity` decimal(14,6) NOT NULL DEFAULT '0.000000',
  `unit` varchar(50) NOT NULL DEFAULT '',
  PRIMARY KEY (`pantry_id`),
  UNIQUE KEY `uq_pantry_user_ingredient_unit` (`user_id`,`ingredient_id`,`unit`),
  KEY `fk_pantry_items_ingredient` (`ingredient_id`),
  CONSTRAINT `fk_pantry_items_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_pantry_items_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30019 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipe_ingredients` (
  `recipe_ingredient_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `recipe_id` bigint unsigned NOT NULL,
  `ingredient_id` bigint unsigned NOT NULL,
  `quantity` decimal(14,6) DEFAULT NULL,
  `unit` varchar(50) NOT NULL DEFAULT '',
  `original_text` text NOT NULL,
  PRIMARY KEY (`recipe_ingredient_id`),
  UNIQUE KEY `uq_recipe_ingredient` (`recipe_id`,`ingredient_id`),
  KEY `idx_recipe_ingredients_ingredient` (`ingredient_id`),
  CONSTRAINT `fk_recipe_ingredients_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_recipe_ingredients_recipe` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`recipe_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=80112 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipe_tags` (
  `recipe_tag_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `recipe_id` bigint unsigned NOT NULL,
  `tag_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`recipe_tag_id`),
  UNIQUE KEY `uq_recipe_tag` (`recipe_id`,`tag_id`),
  KEY `idx_recipe_tags_tag` (`tag_id`),
  CONSTRAINT `fk_recipe_tags_recipe` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`recipe_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_recipe_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`tag_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=57404 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipes` (
  `recipe_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(500) NOT NULL,
  `instructions` json NOT NULL,
  `image_url` varchar(2000) DEFAULT NULL,
  `created_by` int unsigned DEFAULT NULL,
  `source_dataset` varchar(80) DEFAULT NULL,
  `source_id` varchar(128) DEFAULT NULL,
  `source_url` varchar(1500) DEFAULT NULL,
  `dataset_license` varchar(240) DEFAULT NULL,
  `content_sha256` char(64) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`recipe_id`),
  UNIQUE KEY `uq_recipes_source` (`source_dataset`,`source_id`),
  UNIQUE KEY `uq_recipes_content` (`content_sha256`),
  KEY `idx_recipes_title` (`title`(191)),
  KEY `fk_recipes_created_by` (`created_by`),
  CONSTRAINT `fk_recipes_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shopping_list_items` (
  `item_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `list_id` bigint unsigned NOT NULL,
  `ingredient_id` bigint unsigned NOT NULL,
  `quantity` decimal(14,6) DEFAULT NULL,
  `unit` varchar(50) NOT NULL DEFAULT '',
  PRIMARY KEY (`item_id`),
  KEY `idx_shopping_list_items_list` (`list_id`),
  KEY `idx_shopping_list_items_ingredient` (`ingredient_id`),
  CONSTRAINT `fk_shopping_list_items_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`ingredient_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_shopping_list_items_list` FOREIGN KEY (`list_id`) REFERENCES `shopping_lists` (`list_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=45004 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shopping_lists` (
  `list_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `list_name` varchar(160) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`list_id`),
  KEY `idx_shopping_lists_user` (`user_id`),
  CONSTRAINT `fk_shopping_lists_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tags` (
  `tag_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tag_name` varchar(120) NOT NULL,
  `tag_type` enum('diet','cuisine','meal','other') NOT NULL DEFAULT 'other',
  `is_candidate` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`tag_id`),
  UNIQUE KEY `uq_tags_name` (`tag_name`),
  KEY `idx_tags_type` (`tag_type`)
) ENGINE=InnoDB AUTO_INCREMENT=202 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(254) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reset_token` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_expires` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_reset_token` (`reset_token`)
) ENGINE=InnoDB AUTO_INCREMENT=5014 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
SET FOREIGN_KEY_CHECKS=1;
