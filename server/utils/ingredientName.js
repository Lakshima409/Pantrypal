// server/utils/ingredientName.js
// The synthetic corpus appends dataset ids to ~85% of ingredient names
// ("hot mint 923", "whole chicken 822"). Those ids leak into the UI, pantry
// matching and the shopping list. This shared helper strips them so every
// layer (API, recommender, shopping list) compares and displays clean names.
//
// Task (b): "add ingredient quantities / clean names" — quantities already
// exist in recipe_ingredients; the real fix is normalising the names.

const ID_SUFFIX = /\s+\d+\s*$/;

/**
 * Strip a trailing dataset id ("hot mint 923" -> "hot mint") and tidy spacing.
 * Names that are only digits collapse to an empty string (guarded by caller).
 * @param {string} name
 * @returns {string}
 */
function cleanName(name) {
  if (name === null || name === undefined) return "";
  let s = String(name).trim();
  s = s.replace(ID_SUFFIX, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** Lower-cased, id-stripped key for equality/prefix comparisons. */
function key(name) {
  return cleanName(name).toLowerCase();
}

/** Human-readable amount from a decimal quantity + unit ("54.02","g" -> "54 g"). */
function formatQty(quantity, unit) {
  const n = Number(quantity);
  const u = String(unit || "").trim();
  if (!Number.isFinite(n)) return u || "";
  const rounded = Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : String(Math.round(n * 10) / 10);
  return u ? `${rounded} ${u}` : rounded;
}

/** Oxford-style list: "a, b and c". */
function joinList(items) {
  const list = (items || []).filter(Boolean);
  if (list.length <= 1) return list[0] || "";
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

module.exports = { cleanName, key, formatQty, joinList };
