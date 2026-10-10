// server/models/ShoppingList.js — `shopping_lists` + `shopping_list_items`.
//
// Blueprint §30-31: required = Σ recipe quantities, available = pantry
// quantities, missing = max(0, required - available). Only missing items
// land on the shopping list (merged per ingredient+unit, grouped by category).
const db = require("../config/db");
const { ensureIngredient, normalize } = require("./Ingredient");
const { cleanName } = require("../utils/ingredientName");

const DEFAULT_LIST = "My Shopping List";

// Canonical mass/volume/count units — convertible to a base unit so pantry
// subtraction works even when recipe and pantry use different units.
const UNIT_TABLE = {
  // mass → grams
  g: { base: "g", factor: 1, kind: "mass" },
  gram: { base: "g", factor: 1, kind: "mass" },
  grams: { base: "g", factor: 1, kind: "mass" },
  kg: { base: "g", factor: 1000, kind: "mass" },
  kilogram: { base: "g", factor: 1000, kind: "mass" },
  kilograms: { base: "g", factor: 1000, kind: "mass" },
  mg: { base: "g", factor: 0.001, kind: "mass" },
  oz: { base: "g", factor: 28.3495, kind: "mass" },
  ounce: { base: "g", factor: 28.3495, kind: "mass" },
  ounces: { base: "g", factor: 28.3495, kind: "mass" },
  lb: { base: "g", factor: 453.592, kind: "mass" },
  lbs: { base: "g", factor: 453.592, kind: "mass" },
  pound: { base: "g", factor: 453.592, kind: "mass" },
  pounds: { base: "g", factor: 453.592, kind: "mass" },
  // volume → millilitres
  ml: { base: "ml", factor: 1, kind: "volume" },
  millilitre: { base: "ml", factor: 1, kind: "volume" },
  millilitres: { base: "ml", factor: 1, kind: "volume" },
  milliliter: { base: "ml", factor: 1, kind: "volume" },
  milliliters: { base: "ml", factor: 1, kind: "volume" },
  l: { base: "ml", factor: 1000, kind: "volume" },
  litre: { base: "ml", factor: 1000, kind: "volume" },
  litres: { base: "ml", factor: 1000, kind: "volume" },
  liter: { base: "ml", factor: 1000, kind: "volume" },
  liters: { base: "ml", factor: 1000, kind: "volume" },
  tsp: { base: "ml", factor: 4.92892, kind: "volume" },
  teaspoon: { base: "ml", factor: 4.92892, kind: "volume" },
  teaspoons: { base: "ml", factor: 4.92892, kind: "volume" },
  tbsp: { base: "ml", factor: 14.7868, kind: "volume" },
  tablespoon: { base: "ml", factor: 14.7868, kind: "volume" },
  tablespoons: { base: "ml", factor: 14.7868, kind: "volume" },
  cup: { base: "ml", factor: 236.588, kind: "volume" },
  cups: { base: "ml", factor: 236.588, kind: "volume" },
  floz: { base: "ml", factor: 29.5735, kind: "volume" },
  "fl-oz": { base: "ml", factor: 29.5735, kind: "volume" },
  pint: { base: "ml", factor: 473.176, kind: "volume" },
  quart: { base: "ml", factor: 946.353, kind: "volume" },
  gallon: { base: "ml", factor: 3785.41, kind: "volume" },
  // count-ish units compare literally
  piece: { base: "piece", factor: 1, kind: "count" },
  pieces: { base: "piece", factor: 1, kind: "count" },
  clove: { base: "clove", factor: 1, kind: "count" },
  cloves: { base: "clove", factor: 1, kind: "count" },
  slice: { base: "slice", factor: 1, kind: "count" },
  slices: { base: "slice", factor: 1, kind: "count" },
  can: { base: "can", factor: 1, kind: "count" },
  cans: { base: "can", factor: 1, kind: "count" },
  pack: { base: "pack", factor: 1, kind: "count" },
  packs: { base: "pack", factor: 1, kind: "count" },
  bunch: { base: "bunch", factor: 1, kind: "count" },
  bunches: { base: "bunch", factor: 1, kind: "count" },
};

function unitKey(unit) {
  return normalize(unit).replace(/[.]+$/, "");
}

function toBase(quantity, unit) {
  const entry = UNIT_TABLE[unitKey(unit)];
  if (!entry) {
    // Unknown/empty unit (e.g. "to taste") — compare literally.
    return { base: unitKey(unit) || "each", amount: Number(quantity) || 0, kind: "other" };
  }
  return { base: entry.base, amount: (Number(quantity) || 0) * entry.factor, kind: entry.kind };
}

// Pick a human-friendly unit for display (g↔kg, ml↔l).
function fromBase(amount, base) {
  if (base === "g" && amount >= 1000) return { quantity: Math.round((amount / 1000) * 100) / 100, unit: "kg" };
  if (base === "ml" && amount >= 1000) return { quantity: Math.round((amount / 1000) * 100) / 100, unit: "l" };
  return { quantity: Math.round(amount * 100) / 100, unit: base === "each" ? "" : base };
}

async function ensureDefaultList(userId) {
  const [rows] = await db.query(
    "SELECT list_id FROM shopping_lists WHERE user_id = ? ORDER BY list_id LIMIT 1",
    [userId]
  );
  if (rows[0]) return rows[0].list_id;
  const [result] = await db.query(
    "INSERT INTO shopping_lists (user_id, list_name) VALUES (?, ?)",
    [userId, DEFAULT_LIST]
  );
  return result.insertId;
}

async function listItems(userId) {
  const listId = await ensureDefaultList(userId);
  const [rows] = await db.query(
    `SELECT s.item_id, s.quantity, s.unit, s.completed, i.name
     FROM shopping_list_items s
     JOIN ingredients i ON i.ingredient_id = s.ingredient_id
     WHERE s.list_id = ?
     ORDER BY s.item_id`,
    [listId]
  );
  return rows.map((r) => ({
    id: String(r.item_id),
    name: cleanName(r.name),
    amount: r.quantity,
    unit: r.unit,
    completed: Boolean(r.completed),
  }));
}

function mapItem(r) {
  return {
    id: String(r.item_id),
    name: cleanName(r.name),
    amount: r.quantity,
    unit: r.unit,
    completed: Boolean(r.completed),
    listId: r.list_id ? String(r.list_id) : undefined,
  };
}

async function addItem(userId, { name, quantity = null, unit = "" }) {
  const listId = await ensureDefaultList(userId);
  const ingredient = await ensureIngredient(name, "other");
  const [result] = await db.query(
    "INSERT INTO shopping_list_items (list_id, ingredient_id, quantity, unit, completed) VALUES (?, ?, ?, ?, 0)",
    [listId, ingredient.ingredient_id, quantity, unit]
  );
  const [rows] = await db.query(
    `SELECT s.item_id, s.quantity, s.unit, s.completed, s.list_id, i.name
     FROM shopping_list_items s JOIN ingredients i ON i.ingredient_id = s.ingredient_id
     WHERE s.item_id = ?`,
    [result.insertId]
  );
  return mapItem(rows[0]);
}

async function addItems(userId, items = []) {
  const created = [];
  for (const item of items) {
    if (!item || !item.name) continue;
    created.push(await addItem(userId, item));
  }
  return created;
}

async function setCompleted(itemId, userId, completed) {
  const [result] = await db.query(
    `UPDATE shopping_list_items s
     JOIN shopping_lists l ON l.list_id = s.list_id
     SET s.completed = ?
     WHERE s.item_id = ? AND l.user_id = ?`,
    [completed ? 1 : 0, itemId, userId]
  );
  if (!result.affectedRows) return null;
  const [rows] = await db.query(
    `SELECT s.item_id, s.quantity, s.unit, s.completed, i.name
     FROM shopping_list_items s JOIN ingredients i ON i.ingredient_id = s.ingredient_id
     WHERE s.item_id = ?`,
    [itemId]
  );
  return rows[0] ? mapItem(rows[0]) : null;
}

async function removeItem(itemId, userId) {
  const [result] = await db.query(
    `DELETE s FROM shopping_list_items s
     JOIN shopping_lists l ON l.list_id = s.list_id
     WHERE s.item_id = ? AND l.user_id = ?`,
    [itemId, userId]
  );
  return result.affectedRows > 0;
}

// Replaces the default list with the MISSING ingredients from a meal plan:
// required (Σ recipe quantities) minus available (pantry), per §30-31.
async function replaceFromRecipes(userId, recipeIds, { subtractPantry = true } = {}) {
  const listId = await ensureDefaultList(userId);
  await db.query("DELETE FROM shopping_list_items WHERE list_id = ?", [listId]);

  const cleanIds = [...new Set((recipeIds || []).map(Number).filter((n) => Number.isFinite(n) && n > 0))];
  if (!cleanIds.length) return [];

  const [rows] = await db.query(
    `SELECT ri.ingredient_id, i.name, i.category, ri.quantity, ri.unit
     FROM recipe_ingredients ri
     JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
     WHERE ri.recipe_id IN (?)`,
    [cleanIds]
  );

  // 1. Aggregate required quantities per ingredient in base units (g / ml / literal).
  const required = new Map(); // ingredient_id::base -> { ingredient_id, name, category, base, amount }
  for (const row of rows) {
    const { base, amount } = toBase(row.quantity, row.unit);
    const key = `${row.ingredient_id}::${base}`;
    const entry = required.get(key) || {
      ingredient_id: row.ingredient_id,
      name: row.name,
      category: row.category || "other",
      base,
      amount: 0,
    };
    entry.amount += amount;
    required.set(key, entry);
  }

  // 2. Subtract what the user already has (same ingredient + convertible unit).
  if (subtractPantry) {
    let pantry = [];
    try {
      const [pantryRows] = await db.query(
        `SELECT p.ingredient_id, p.quantity, p.unit
         FROM pantry_items p WHERE p.user_id = ?`,
        [userId]
      );
      pantry = pantryRows;
    } catch (err) {
      pantry = [];
    }
    for (const item of pantry) {
      const { base, amount } = toBase(item.quantity, item.unit);
      const key = `${item.ingredient_id}::${base}`;
      const entry = required.get(key);
      if (entry) entry.amount = Math.max(0, entry.amount - amount);
    }
  }

  // 3. Only missing items (> tiny epsilon) land on the list, prettiest unit first.
  const values = [];
  for (const entry of required.values()) {
    if (entry.amount <= 1e-9) continue; // fully covered by pantry
    const display = fromBase(entry.amount, entry.base);
    values.push([listId, entry.ingredient_id, display.quantity, display.unit, entry.category]);
  }
  // Deterministic order: category, then ingredient name.
  values.sort((a, b) => String(a[4]).localeCompare(String(b[4])));

  if (values.length) {
    for (const [lId, ingredientId, quantity, unit] of values.map((v) => [v[0], v[1], v[2], v[3]])) {
      await db.query(
        "INSERT INTO shopping_list_items (list_id, ingredient_id, quantity, unit, completed) VALUES (?, ?, ?, ?, 0)",
        [lId, ingredientId, quantity, unit]
      );
    }
  }
  return listItems(userId);
}

module.exports = {
  ensureDefaultList,
  listItems,
  addItem,
  addItems,
  setCompleted,
  removeItem,
  replaceFromRecipes,
  toBase,
  fromBase,
};
