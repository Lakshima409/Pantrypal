// server/models/SearchHistory.js — recipe views stored as interactions type='viewed'.
const db = require("../config/db");

async function recordView(userId, recipeId) {
  if (!userId || !recipeId) return false;
  await db.query(
    "INSERT INTO interactions (user_id, recipe_id, type) VALUES (?, ?, 'viewed')",
    [userId, recipeId]
  );
  return true;
}

async function recordInteraction(userId, recipeId, type = "viewed") {
  if (!userId || !recipeId) return false;
  const allowed = ["viewed", "liked", "cooked", "saved", "rated"];
  if (!allowed.includes(type)) return false;
  await db.query("INSERT INTO interactions (user_id, recipe_id, type) VALUES (?, ?, ?)", [
    userId,
    recipeId,
    type,
  ]);
  return true;
}

async function recent(userId, limit = 10) {
  const [rows] = await db.query(
    `SELECT i.recipe_id, MAX(i.timestamp) AS last_viewed
     FROM interactions i
     WHERE i.user_id = ? AND i.type = 'viewed'
     GROUP BY i.recipe_id
     ORDER BY last_viewed DESC
     LIMIT ?`,
    [userId, Number(limit) || 10]
  );
  return rows;
}

module.exports = { recordView, recordInteraction, recent };
