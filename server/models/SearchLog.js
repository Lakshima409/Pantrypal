// server/models/SearchLog.js — one row per recipe search request.
// Kept dependency-free: callers (recipeController) wrap in try/catch so a
// down DB never fails a search. Table: search_history(user_id, query, filters_json).
const db = require("../config/db");

async function record(userId, query, filters) {
  try {
    await db.query(
      "INSERT INTO search_history (user_id, query, filters_json) VALUES (?, ?, ?)",
      [userId || null, String(query || "").slice(0, 500), JSON.stringify(filters || {})]
    );
    return true;
  } catch {
    return false;
  }
}

module.exports = { record };
