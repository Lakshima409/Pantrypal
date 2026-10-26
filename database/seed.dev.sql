-- database/seed.dev.sql
-- DEVELOPMENT-ONLY seed. Not suitable for production.
--
-- Creates a known local development demo account and its dietary preferences.
-- Load this file only on a local development database after schema.sql and
-- migrations. Do not mount or load it in production, shared, or deployed
-- environments.

INSERT IGNORE INTO users (name, email, password_hash) VALUES
  ('Demo Cook', 'demo@pantrypal.local', '$2a$10$z4JKjD.kssTxoWK5YWNugOWMPWNbPkiZRFQnsHRAEomO1ySQAcM7a');

SET @demo_id := (SELECT user_id FROM users WHERE email = 'demo@pantrypal.local');

INSERT IGNORE INTO dietary_preferences (user_id, preference_type, preference_value) VALUES
  (@demo_id, 'calorieGoal', '2000'),
  (@demo_id, 'dietType', 'none'),
  (@demo_id, 'allergy', 'peanut');
