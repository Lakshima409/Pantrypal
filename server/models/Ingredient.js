// server/models/Ingredient.js — data access for `ingredients`.
const db = require("../config/db");

const normalize = (name) => String(name || "").trim().toLowerCase();

async function findByName(name) {
  const [rows] = await db.query("SELECT * FROM ingredients WHERE name = ?", [normalize(name)]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await db.query("SELECT * FROM ingredients WHERE ingredient_id = ?", [id]);
  return rows[0] || null;
}

// Find-or-create: keeps the dataset's ingredient list clean for new items.
async function ensureIngredient(name, category = "other") {
  const clean = normalize(name);
  const existing = await findByName(clean);
  if (existing) return existing;
  const [result] = await db.query(
    "INSERT INTO ingredients (name, category, unit) VALUES (?, ?, '')",
    [clean, normalize(category) || "other"]
  );
  return findById(result.insertId);
}

async function listCategories() {
  const [rows] = await db.query(
    "SELECT DISTINCT category FROM ingredients ORDER BY category LIMIT 50"
  );
  return rows.map((r) => r.category);
}

// Options for the "select an ingredient" dropdowns on the Home page.
async function listByCategory(category, limit = 30) {
  const [rows] = await db.query(
    "SELECT ingredient_id, name, category FROM ingredients WHERE category = ? ORDER BY name LIMIT ?",
    [normalize(category), Number(limit) || 30]
  );
  return rows;
}

module.exports = { findByName, findById, ensureIngredient, listCategories, listByCategory, normalize };
