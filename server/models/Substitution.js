// server/models/Substitution.js — reads `ingredients.substitutions_json`.
const db = require("../config/db");

const normalize = (name) => String(name || "").trim().toLowerCase();

/**
 * Returns [{ original, substitutes: [{ name, ratio, bestFor, closeness }] }]
 * for every requested ingredient that has substitution data in the dataset.
 */
async function getForIngredients(names) {
  const clean = [...new Set((names || []).map(normalize).filter(Boolean))];
  if (!clean.length) return [];

  const [rows] = await db.query(
    `SELECT name, substitutions_json FROM ingredients
     WHERE substitutions_json IS NOT NULL
       AND (${clean.map(() => "name LIKE ?").join(" OR ")})`,
    clean.map((n) => `%${n}%`)
  );

  // Prefer an exact name match, otherwise the first row containing the term.
  const pickRow = (name) =>
    rows.find((row) => normalize(row.name) === name) ||
    rows.find((row) => normalize(row.name).includes(name));

  // mysql2 returns JSON columns already parsed; strings only appear for TEXT columns.
  const parseSubs = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        return [];
      }
    }
    return [];
  };

  return clean
    .map((name) => pickRow(name))
    .filter(Boolean)
    .filter((row, index, all) => all.indexOf(row) === index)
    .map((row) => {
      const subs = [...parseSubs(row.substitutions_json)];
      return {
        original: row.name,
        substitutes: subs
          .sort((a, b) => (b.closeness_score || 0) - (a.closeness_score || 0))
          .map((s) => ({
            name: s.substitute,
            ratio: s.ratio || null,
            bestFor: s.best_for || null,
            closeness: s.closeness_score || null,
          })),
      };
    });
}

module.exports = { getForIngredients };
