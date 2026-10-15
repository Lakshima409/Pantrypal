// server/models/Substitution.js — reads `ingredients.substitutions_json`.
const db = require("../config/db");

const normalize = (name) => String(name || "").trim().toLowerCase();

// Phase 4: allergen guard. Drops any substitute whose name clashes with a
// banned term (allergies / dietary restrictions / health conditions).
// Plural-tolerant: the UI's "peanuts" also matches a "peanut oil" substitute.
// Exposed as a pure function so unit tests cover it without MySQL.
function filterSubstitutes(substitutes, bannedTerms) {
  const banned = [];
  for (const t of bannedTerms || []) {
    const n = normalize(t);
    if (!n) continue;
    banned.push(n);
    if (n.endsWith("s") && n.length > 3) banned.push(n.slice(0, -1)); // peanuts → peanut
  }
  if (!banned.length) return substitutes || [];
  return (substitutes || []).filter((s) => {
    const name = normalize(s.name || s.substitute || "");
    return !banned.some((term) => name.includes(term));
  });
}

/**
 * Returns [{ original, substitutes: [{ name, ratio, bestFor, closeness }] }]
 * for every requested ingredient that has substitution data in the dataset.
 * Phase 4: pass bannedTerms (allergies etc.) to suppress unsafe swaps.
 */
async function getForIngredients(names, bannedTerms = []) {
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
        substitutes: filterSubstitutes(
          subs
            .sort((a, b) => (b.closeness_score || 0) - (a.closeness_score || 0))
            .map((s) => ({
              name: s.substitute,
              ratio: s.ratio || null,
              bestFor: s.best_for || null,
              closeness: s.closeness_score || null,
            })),
          bannedTerms
        ),
      };
    });
}

module.exports = { getForIngredients, filterSubstitutes };
