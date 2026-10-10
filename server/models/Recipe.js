// server/models/Recipe.js — data access + shaping for `recipes` and friends.
const db = require("../config/db");
const { recipeImage } = require("../utils/recipeImage");
const { cleanName } = require("../utils/ingredientName");
const { generateInstructions } = require("../utils/recipeInstructions");

const INGREDIENT_SELECT = `
  SELECT ri.recipe_id, i.name, ri.quantity, ri.unit, ri.original_text
  FROM recipe_ingredients ri
  JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
`;

function deriveMeta(ingredientCount, stepCount) {
  const cookTime = ingredientCount <= 4 ? 15 : ingredientCount <= 8 ? 30 : ingredientCount <= 12 ? 45 : 60;
  const difficulty = ingredientCount <= 5 ? "easy" : ingredientCount <= 10 ? "medium" : "hard";
  return { cookTime, difficulty, stepCount };
}

async function attachDetails(rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.recipe_id);

  const [ingRows] = await db.query(
    `${INGREDIENT_SELECT} WHERE ri.recipe_id IN (?)`, [ids]
  );
  const [nutRows] = await db.query(
    "SELECT recipe_id, calories, protein, fat, carbs, sodium, servings FROM nutrition_info WHERE recipe_id IN (?)",
    [ids]
  );
  const [tagRows] = await db.query(
    `SELECT rt.recipe_id, t.tag_name FROM recipe_tags rt
     JOIN tags t ON t.tag_id = rt.tag_id WHERE rt.recipe_id IN (?)`,
    [ids]
  );

  const byRecipe = (list, key = "recipe_id") =>
    list.reduce((acc, item) => {
      (acc[item[key]] = acc[item[key]] || []).push(item);
      return acc;
    }, {});

  const ingsByRecipe = byRecipe(ingRows);
  const nutsByRecipe = Object.fromEntries(nutRows.map((n) => [n.recipe_id, n]));
  const tagsByRecipe = byRecipe(tagRows);

  return rows.map((row) => {
    const ingredients = (ingsByRecipe[row.recipe_id] || []).map((i) => ({
      name: cleanName(i.name),
      amount: i.quantity,
      unit: i.unit,
      originalText: i.original_text,
    }));
    const nut = nutsByRecipe[row.recipe_id];
    const title = (row.title && String(row.title).trim()) || `Recipe #${row.recipe_id}`;
    const tags = (tagsByRecipe[row.recipe_id] || []).map((t) => t.tag_name);
    // The corpus stores 100% templated filler instructions that leak dirty
    // ingredient ids. Replace them with real, per-recipe steps (task a);
    // genuine stored instructions are kept as-is by the generator.
    const steps = generateInstructions({ title, ingredients, tags, instructions: row.instructions });
    const meta = deriveMeta(ingredients.length, steps.length);
    const servings = nut && Number(nut.servings) > 0 ? Math.max(1, Math.round(Number(nut.servings))) : 4;

    // Titles are always present in the corpus, but fall back defensively so a
    // card never renders blank. Images: the corpus stores example.com
    // placeholders that never load, so generate a matching tile instead.
    const context = `${title} ${tags.join(" ")} ${ingredients.map((i) => i.name).join(" ")}`;
    const image = recipeImage(row.image_url, title, context);

    return {
      id: String(row.recipe_id),
      recipe_id: String(row.recipe_id),
      title,
      image,
      imageUrl: image,
      description: "",
      cookTime: meta.cookTime,
      difficulty: meta.difficulty,
      servings,
      rating: null,
      tags,
      ingredients,
      instructions: steps,
      nutrition: nut
        ? {
            calories: round2(nut.calories),
            protein: round2(nut.protein),
            fat: round2(nut.fat),
            carbs: round2(nut.carbs),
            sodium: round2(nut.sodium),
          }
        : null,
    };
  });
}

function round2(value) {
  if (value === null || value === undefined) return null;
  return Math.round(Number(value) * 100) / 100;
}

function parseInstructions(instructions) {
  if (Array.isArray(instructions)) return instructions;
  if (typeof instructions !== "string") return [];
  try {
    const parsed = JSON.parse(instructions);
    if (Array.isArray(parsed)) return parsed.map((s) => String(s));
  } catch (err) { /* not JSON — fall through */ }
  return instructions.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);
}

// ---- queries ----

async function search({ query, dietary, ingredients, matchAll = true } = {}) {
  const where = [];
  const params = [];
  const ingredientConds = [];

  if (query) {
    where.push("r.title LIKE ?");
    params.push(`%${String(query)}%`);
  }

  for (const diet of dietary || []) {
    const tag = String(diet).toLowerCase().replace(/\s+/g, "_");
    where.push(`EXISTS (
      SELECT 1 FROM recipe_tags rt JOIN tags t ON t.tag_id = rt.tag_id
      WHERE rt.recipe_id = r.recipe_id AND t.tag_name IN (?, ?))`);
    params.push(tag, `${tag}_candidate`);
  }

  for (const term of ingredients || []) {
    ingredientConds.push(`EXISTS (
      SELECT 1 FROM recipe_ingredients ri JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
      WHERE ri.recipe_id = r.recipe_id AND i.name LIKE ?)`);
    params.push(`%${String(term).toLowerCase()}%`);
  }
  if (ingredientConds.length) {
    where.push(`(${ingredientConds.join(matchAll ? " AND " : " OR ")})`);
  }

  const sql = `
    SELECT r.recipe_id, r.title, r.image_url, r.instructions
    FROM recipes r
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY r.recipe_id
    LIMIT 40`;
  const [rows] = await db.query(sql, params);
  return attachDetails(rows);
}

async function trending(limit = 12) {
  const [rows] = await db.query(
    `SELECT r.recipe_id, r.title, r.image_url, r.instructions,
            COUNT(i.interaction_id) AS score
     FROM interactions i
     JOIN recipes r ON r.recipe_id = i.recipe_id
     WHERE i.timestamp >= NOW() - INTERVAL 30 DAY
     GROUP BY r.recipe_id, r.title, r.image_url, r.instructions
     ORDER BY score DESC, r.recipe_id
     LIMIT ?`,
    [Number(limit) || 12]
  );
  const detailed = await attachDetails(rows);
  if (detailed.length < limit) {
    const have = new Set(detailed.map((r) => r.id));
    const [recent] = await db.query(
      "SELECT recipe_id, title, image_url, instructions FROM recipes ORDER BY recipe_id DESC LIMIT ?",
      [Number(limit) * 2]
    );
    const extra = await attachDetails(recent.filter((r) => !have.has(String(r.recipe_id))));
    return [...detailed, ...extra].slice(0, limit);
  }
  return detailed;
}

// Popularity fallback used when the Flask recommender is unavailable.
async function recommendedFallback(limit = 12) {
  const [rows] = await db.query(
    `SELECT r.recipe_id, r.title, r.image_url, r.instructions
     FROM recipes r
     ORDER BY (SELECT COUNT(*) FROM interactions i WHERE i.recipe_id = r.recipe_id) DESC,
              r.recipe_id DESC
     LIMIT ?`,
    [Number(limit) || 12]
  );
  return attachDetails(rows);
}

async function listByIds(ids) {
  const clean = (ids || []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  if (!clean.length) return [];
  const [rows] = await db.query(
    "SELECT recipe_id, title, image_url, instructions FROM recipes WHERE recipe_id IN (?)",
    [clean]
  );
  const detailed = await attachDetails(rows);
  const order = new Map(clean.map((id, index) => [String(id), index]));
  return detailed.sort((a, b) => order.get(a.id) - order.get(b.id));
}

async function findById(id) {
  const [rows] = await db.query(
    "SELECT recipe_id, title, image_url, instructions FROM recipes WHERE recipe_id = ?",
    [id]
  );
  const [detailed] = await attachDetails(rows);
  return detailed || null;
}

// Applies cookTime/difficulty filters (derived fields, not stored columns).
function filterByDerived(list, { cookTime, difficulty } = {}) {
  let result = list;
  if (cookTime) {
    const max = Number(cookTime);
    if (Number.isFinite(max)) result = result.filter((r) => r.cookTime <= max);
  }
  if (difficulty) {
    result = result.filter((r) => r.difficulty === String(difficulty).toLowerCase());
  }
  return result;
}

module.exports = {
  search,
  trending,
  recommendedFallback,
  listByIds,
  findById,
  filterByDerived,
};
