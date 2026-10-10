// server/models/Favorites.js — favourites live in `interactions` as type='saved'.
const db = require("../config/db");

async function list(userId) {
  const [rows] = await db.query(
    `SELECT r.recipe_id, r.title, r.image_url, r.instructions
     FROM interactions i
     JOIN recipes r ON r.recipe_id = i.recipe_id
     WHERE i.user_id = ? AND i.type = 'saved'
     ORDER BY i.timestamp DESC
     LIMIT 100`,
    [userId]
  );
  const Recipe = require("./Recipe");
  return Recipe.listByIds(rows.map((r) => r.recipe_id));
}

async function has(userId, recipeId) {
  const [rows] = await db.query(
    `SELECT 1 FROM interactions
     WHERE user_id = ? AND recipe_id = ? AND type = 'saved' LIMIT 1`,
    [userId, recipeId]
  );
  return rows.length > 0;
}

async function add(userId, recipeId) {
  if (await has(userId, recipeId)) return true;
  await db.query(
    "INSERT INTO interactions (user_id, recipe_id, type) VALUES (?, ?, 'saved')",
    [userId, recipeId]
  );
  return true;
}

async function remove(userId, recipeId) {
  await db.query(
    "DELETE FROM interactions WHERE user_id = ? AND recipe_id = ? AND type = 'saved'",
    [userId, recipeId]
  );
  return false;
}

module.exports = { list, has, add, remove };
