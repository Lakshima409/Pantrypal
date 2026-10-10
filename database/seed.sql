-- database/seed.sql
-- Lightweight demo seed. The full corpus (10,000 recipes, 1,056 ingredients,
-- 5,011 users, 100k+ interactions) already lives in recipe_db from the source
-- dataset import — schema.sql + migrations/ create structure, and this file
-- only guarantees a known demo login for local development.
-- Demo credentials: demo@pantrypal.local / Demo1234!

INSERT IGNORE INTO users (name, email, password_hash) VALUES
  ('Demo Cook', 'demo@pantrypal.local', '$2a$10$z4JKjD.kssTxoWK5YWNugOWMPWNbPkiZRFQnsHRAEomO1ySQAcM7a');

SET @demo_id := (SELECT user_id FROM users WHERE email = 'demo@pantrypal.local');

INSERT IGNORE INTO dietary_preferences (user_id, preference_type, preference_value) VALUES
  (@demo_id, 'calorieGoal', '2000'),
  (@demo_id, 'dietType', 'none'),
  (@demo_id, 'allergy', 'peanut');

