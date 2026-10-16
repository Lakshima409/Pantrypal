// server/models/Rating.js — recipe ratings (1-5 stars) + optional review text.
// Phase 5: stored in a dedicated `ratings` table (not `interactions`, which has
// no value column) so ratings can feed evaluation and collaborative filtering.
const db = require("../config/db");

function mapRow(row) {
  return {
    id: String(row.rating_id),
    userId: row.user_id,
    recipeId: String(row.recipe_id),
    rating: Number(row.rating),
    review: row.review || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Upsert a rating for (user, recipe). Returns the stored row.
async function upsert(userId, recipeId, { rating, review }) {
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) throw new Error("rating must be an integer 1-5");
  const existing = await getByUserAndRecipe(userId, recipeId);
  if (existing) {
    await db.query(
      "UPDATE ratings SET rating = ?, review = ?, updated_at = CURRENT_TIMESTAMP WHERE rating_id = ?",
      [r, review || null, existing.id]
    );
    return { ...existing, rating: r, review: review || null };
  }
  const [result] = await db.query(
    "INSERT INTO ratings (user_id, recipe_id, rating, review) VALUES (?, ?, ?, ?)",
    [userId, recipeId, r, review || null]
  );
  return getById(result.insertId, userId);
}

async function getById(id, userId) {
  const [rows] = await db.query(
    "SELECT * FROM ratings WHERE rating_id = ? AND user_id = ?",
    [id, userId]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

async function getByUserAndRecipe(userId, recipeId) {
  const [rows] = await db.query(
    "SELECT * FROM ratings WHERE user_id = ? AND recipe_id = ? LIMIT 1",
    [userId, recipeId]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

// List all ratings for a recipe (for public average + count).
async function listForRecipe(recipeId, limit = 100) {
  const [rows] = await db.query(
    "SELECT * FROM ratings WHERE recipe_id = ? ORDER BY created_at DESC LIMIT ?",
    [recipeId, Number(limit) || 100]
  );
  return rows.map(mapRow);
}

// Aggregate stats for a recipe: average rating + count.
async function statsForRecipe(recipeId) {
  const [rows] = await db.query(
    "SELECT AVG(rating) AS avgRating, COUNT(*) AS ratingCount FROM ratings WHERE recipe_id = ?",
    [recipeId]
  );
  const row = rows[0];
  return {
    avgRating: row.avgRating ? Number(row.avgRating) : null,
    ratingCount: Number(row.ratingCount || 0),
  };
}

// List all ratings by a user (for "my ratings" page).
async function listByUser(userId, limit = 100) {
  const [rows] = await db.query(
    "SELECT * FROM ratings WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    [userId, Number(limit) || 100]
  );
  return rows.map(mapRow);
}

// Remove a user's rating for a recipe.
async function remove(userId, recipeId) {
  const [result] = await db.query(
    "DELETE FROM ratings WHERE user_id = ? AND recipe_id = ?",
    [userId, recipeId]
  );
  return result.affectedRows > 0;
}

module.exports = { upsert, getById, getByUserAndRecipe, listForRecipe, statsForRecipe, listByUser, remove };
