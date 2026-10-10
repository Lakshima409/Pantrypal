// server/models/PantryItem.js — data access for `pantry_items` (+ ingredients).
const db = require("../config/db");
const { ensureIngredient, findByName, normalize } = require("./Ingredient");

function mapRow(row) {
  return {
    id: String(row.pantry_id),
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    category: row.category || "other",
    expiryDate: row.expiry_date || null,
  };
}

async function listByUser(userId) {
  const [rows] = await db.query(
    `SELECT p.pantry_id, p.quantity, p.unit, p.expiry_date, i.name, i.category
     FROM pantry_items p
     JOIN ingredients i ON i.ingredient_id = p.ingredient_id
     WHERE p.user_id = ?
     ORDER BY i.name`,
    [userId]
  );
  return rows.map(mapRow);
}

async function create(userId, { name, quantity = 0, unit = "", category = "other", expiryDate = null }) {
  const ingredient = await ensureIngredient(name, category);
  // The unique key is (user, ingredient, unit) — bump the quantity on conflict.
  const [existing] = await db.query(
    "SELECT pantry_id, quantity FROM pantry_items WHERE user_id = ? AND ingredient_id = ? AND unit = ?",
    [userId, ingredient.ingredient_id, unit]
  );
  if (existing.length) {
    const next = Number(existing[0].quantity) + Number(quantity || 0);
    await db.query(
      "UPDATE pantry_items SET quantity = ?, expiry_date = COALESCE(?, expiry_date) WHERE pantry_id = ?",
      [next, expiryDate || null, existing[0].pantry_id]
    );
    return getById(existing[0].pantry_id, userId);
  }
  const [result] = await db.query(
    "INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit, expiry_date) VALUES (?, ?, ?, ?, ?)",
    [userId, ingredient.ingredient_id, Number(quantity) || 0, unit, expiryDate || null]
  );
  return getById(result.insertId, userId);
}

async function getById(id, userId) {
  const [rows] = await db.query(
    `SELECT p.pantry_id, p.quantity, p.unit, p.expiry_date, i.name, i.category
     FROM pantry_items p
     JOIN ingredients i ON i.ingredient_id = p.ingredient_id
     WHERE p.pantry_id = ? AND p.user_id = ?`,
    [id, userId]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

async function update(id, userId, { name, quantity, unit, category, expiryDate }) {
  const [rows] = await db.query(
    `SELECT p.pantry_id, p.ingredient_id, p.quantity, p.unit, p.expiry_date, i.name AS ingredient_name
     FROM pantry_items p
     JOIN ingredients i ON i.ingredient_id = p.ingredient_id
     WHERE p.pantry_id = ? AND p.user_id = ?`,
    [id, userId]
  );
  if (!rows[0]) return null;
  const current = rows[0];

  let ingredientId = current.ingredient_id;
  if (name && normalize(name) !== normalize(current.ingredient_name)) {
    const ingredient = await ensureIngredient(name, category || "other");
    ingredientId = ingredient.ingredient_id;
  }

  const nextQuantity =
    quantity !== undefined && quantity !== null && quantity !== ""
      ? Number(quantity)
      : Number(current.quantity);
  const nextUnit = unit !== undefined && unit !== null ? unit : current.unit;
  const nextExpiry = expiryDate !== undefined ? expiryDate || null : current.expiry_date;

  await db.query(
    "UPDATE pantry_items SET ingredient_id = ?, quantity = ?, unit = ?, expiry_date = ? WHERE pantry_id = ? AND user_id = ?",
    [ingredientId, nextQuantity, nextUnit, nextExpiry, id, userId]
  );
  return getById(id, userId);
}

async function remove(id, userId) {
  const [result] = await db.query(
    "DELETE FROM pantry_items WHERE pantry_id = ? AND user_id = ?",
    [id, userId]
  );
  return result.affectedRows > 0;
}

// Names of everything in the user's pantry (used by the recommender fallback).
async function names(userId) {
  const [rows] = await db.query(
    `SELECT i.name FROM pantry_items p JOIN ingredients i ON i.ingredient_id = p.ingredient_id
     WHERE p.user_id = ?`,
    [userId]
  );
  return rows.map((r) => r.name);
}

module.exports = { listByUser, create, update, remove, getById, names };
