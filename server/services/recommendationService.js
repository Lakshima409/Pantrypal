// server/services/recommendationService.js
// Bridge to the Flask recommender microservice (ai-services/recommender, port
// 5001) with a database fallback so /api/recipes/recommended always answers.
//
// Contract (blueprint §25):
//   POST /recommend  { user_id, limit, pantry[], preferences{...} }
//   200 { recommendations: [{ recipe_id, score, pantry_match, diet_match,
//     pantry_ingredients_met, pantry_ingredients_remaining,
//     ingredient_match_percent, pantry_total_required,
//     pantry_optional_available, pantry_optional_missing }] }
//   Node passes these through as pantryIngredientsMet,
//   pantryIngredientsRemaining, ingredientMatchPercent, pantryTotalRequired,
//   pantryOptionalAvailable, pantryOptionalMissing (all optional).
//   — legacy { recipe_ids: [...] } is still accepted.
const Recipe = require("../models/Recipe");
const PantryItem = require("../models/PantryItem");
const UserModel = require("../models/user");

const AI_URL = process.env.AI_RECOMMENDER_URL || "http://localhost:5001";
const AI_TIMEOUT_MS = 1800;

// Score weights (blueprint §24 — tunable starting point, not report-mandated).
const WEIGHTS = { pantryMatch: 0.45, dietaryMatch: 0.25, popularity: 0.20, recency: 0.10 };

// Meal-type hints derived from time of day (§31 — context-aware recommendations).
// Used to re-rank results so the right meal is surfaced at the right time.
const TIME_OF_DAY_MEALS = {
  morning: ["breakfast", "brunch"],
  midday: ["lunch", "brunch"],
  afternoon: ["lunch", "snack"],
  evening: ["dinner", "supper"],
  night: ["dinner", "snack"],
  "late night": ["snack", "dessert"],
  suppertime: ["dinner", "supper"],
};

const MEAL_TAGS = new Set([
  "breakfast",
  "brunch",
  "lunch",
  "dinner",
  "supper",
  "snack",
  "dessert",
]);

function mealTypeFor(timeOfDay) {
  const key = norm(timeOfDay);
  return TIME_OF_DAY_MEALS[key] || null;
}

function recipeMealTypes(recipe) {
  const tags = new Set();
  for (const t of recipe.tags || []) {
    const nt = norm(t);
    if (MEAL_TAGS.has(nt)) tags.add(nt);
  }
  // Fallback: infer from name if no tags.
  const name = norm(recipe.name || recipe.title || "");
  const mealWords = ["breakfast", "brunch", "lunch", "dinner", "supper", "snack", "dessert"];
  for (const m of mealWords) if (name.includes(m)) tags.add(m);
  return tags;
}

/**
 * Rerank recipes so those matching the current meal context come first.
 * Adds a contextMatch (0–1) and contextualScore to each recipe without
 * mutating the original objects. Stable sort preserves relative order
 * among equal-scoring items.
 */
function contextualRerank(recipes, timeOfDay) {
  const targetMeals = mealTypeFor(timeOfDay);
  if (!targetMeals || !recipes.length) return recipes.map((r) => ({ ...r, contextMatch: 0, contextualScore: r.score }));

  const targetSet = new Set(targetMeals.map(norm));
  return recipes.map((recipe) => {
    const r = { ...recipe };
    const rMeals = recipeMealTypes(recipe);
    let contextMatch = 0;
    if (rMeals.size) {
      const hits = [...rMeals].filter((m) => targetSet.has(m)).length;
      contextMatch = hits / Math.max(targetSet.size, 1);
    }
    // Blend context into score: 70% base score + 30% context match.
    r.contextMatch = round3(contextMatch);
    r.contextualScore = round3(0.7 * Number(r.score || 0) + 0.3 * contextMatch);
    return r;
  }).sort((a, b) => b.contextualScore - a.contextualScore);
}

async function callAiRecommender(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const response = await fetch(`${AI_URL}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AI service returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

const norm = (s) => String(s || "").trim().toLowerCase();
const round3 = (v) => Math.round(Number(v || 0) * 1000) / 1000;

// Pantry-overlap: how much of each recipe the user can cook right now (§20).
function pantryMatch(recipe, pantrySet) {
  const total = (recipe.ingredients && recipe.ingredients.length) || 0;
  if (!total || !pantrySet || !pantrySet.size) return 0;
  let hits = 0;
  for (const ing of recipe.ingredients) {
    const name = norm(ing.name);
    if (pantrySet.has(name)) { hits += 1; continue; }
    // Dataset names carry trailing ids ("spinach 108") — allow prefix match.
    for (const have of pantrySet) {
      if (name.startsWith(have) || have.startsWith(name)) { hits += 1; break; }
    }
  }
  return Math.round((hits / total) * 100) / 100;
}

// Allergen / restriction check (§8-9). 0 = clashes, 1 = fine (or no rules).
function dietaryMatch(recipe, prefs) {
  const banned = [
    ...(prefs.allergies || []),
    ...(prefs.dietaryRestrictions || []),
    ...(prefs.healthConditions || []),
  ].map(norm).filter(Boolean);
  if (!banned.length) return 1;
  const text = [
    ...(recipe.ingredients || []).map((i) => norm(i.name)),
    ...(recipe.tags || []).map(norm),
  ].join(" | ");
  return banned.some((term) => text.includes(term)) ? 0 : 1;
}

// Decorate recipes with §25 fields: { score, pantryMatch, dietMatch }.
function decorate(recipes, pantrySet, prefs) {
  const n = Math.max(recipes.length, 1);
  return recipes.map((recipe, index) => {
    const pm = pantryMatch(recipe, pantrySet);
    const dm = dietaryMatch(recipe, prefs);
    const rank = 1 - index / n;
    const score = round3(
      WEIGHTS.pantryMatch * pm +
      WEIGHTS.dietaryMatch * dm +
      WEIGHTS.popularity * rank +
      WEIGHTS.recency * rank
    );
    return { ...recipe, score, pantryMatch: pm, dietMatch: dm };
  });
}

async function contextFor(userId, overrides = {}) {
  const [prefs, pantry] = await Promise.all([
    userId ? UserModel.getPreferences(userId).catch(() => ({})) : Promise.resolve({}),
    userId ? PantryItem.names(userId).catch(() => []) : Promise.resolve([]),
  ]);
  // Request-scoped inputs win over stored context (never the reverse), so
  // ad-hoc pantry chips / diet choices change the ranking instead of being
  // silently ignored.
  const reqPrefs =
    overrides.preferences && typeof overrides.preferences === "object"
      ? { ...prefs, ...overrides.preferences }
      : prefs;
  const reqPantry =
    Array.isArray(overrides.pantry) && overrides.pantry.length
      ? overrides.pantry.map((p) => (typeof p === "string" ? p : p && p.name)).filter(Boolean)
      : pantry;
  return { prefs: reqPrefs, pantry: reqPantry, pantrySet: new Set(reqPantry.map(norm)) };
}

// Pantry-overlap ordering used when Flask is offline.
async function pantryOverlapRecommendations(userId, limit, pantrySet, prefs) {
  const pantryNames = [...pantrySet];
  if (!pantryNames.length) return decorate(await Recipe.recommendedFallback(limit), pantrySet, prefs);

  const likeClauses = pantryNames.map(() => 'LOWER(i.name) LIKE ?').join(' OR ');
  const likeParams = pantryNames.map(name => '%' + name.toLowerCase() + '%');

  const [rows] = await require("../config/db").query(
    `SELECT ri.recipe_id, COUNT(*) AS hits
     FROM recipe_ingredients ri
     JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
     WHERE
     ${likeClauses}
     GROUP BY ri.recipe_id
     ORDER BY hits DESC, ri.recipe_id
     LIMIT ?`,
    [...likeParams, Math.max(limit * 3, 30)]
  );

  const recipes = await Recipe.listByIds(rows.map((r) => r.recipe_id));
  const ranked = decorate(recipes, pantrySet, prefs).sort((a, b) => b.score - a.score);
  // Respect stored/requested diet + allergy filters on the overlap path:
  // drop allergen/diet clashes (diet_match 0), keep order, backfill.
  const filtered = ranked.filter((r) => r.dietMatch !== 0);
  const pool = filtered.length ? filtered : ranked;
  const top = pool.slice(0, limit);
  if (top.length >= limit) return top;

  const fallback = decorate(await Recipe.recommendedFallback(limit), pantrySet, prefs);
  const seen = new Set(top.map((r) => r.id));
  return [...top, ...fallback.filter((r) => !seen.has(r.id))].slice(0, limit);
}

function findAiEntry(recs, recipe) {
  return recs.find((r) => String(r.recipe_id || r.id) === String(recipe.id));
}

/**
 * Returns shaped recipes for GET /api/recipes/recommended, each carrying
 * { score, pantryMatch, dietMatch }. Order: Flask hybrid → pantry overlap →
 * popularity — every path is decorated so the API contract stays stable.
 * Request-scoped `overrides` ({ pantry?: string[], preferences?: object })
 * take precedence over the stored user context, so ad-hoc inputs (e.g. the
 * ingredient chips on the search page) change the ranking instead of being
 * silently ignored.
 */
async function getRecommended(userId, limit = 12, overrides = {}) {
  const { prefs, pantry, pantrySet } = await contextFor(userId, overrides);

  // 1) Flask hybrid model (§27: React → Node → Flask, never direct).
  try {
    const ai = await callAiRecommender({ user_id: userId || null, limit, pantry, preferences: prefs });
    const recs = Array.isArray(ai && ai.recommendations) ? ai.recommendations : null;
    if (recs && recs.length) {
      const ids = recs.map((r) => r.recipe_id || r.id).filter(Boolean);
      const recipes = await Recipe.listByIds(ids);
      const byId = new Map(recipes.map((r) => [r.id, r]));
      const ordered = recs
        .map((r) => byId.get(String(r.recipe_id || r.id)))
        .filter(Boolean)
        .map((recipe) => {
          const entry = findAiEntry(recs, recipe);
          return {
            ...recipe,
            score: round3(entry && entry.score),
            pantryMatch:
              entry && entry.pantry_match !== undefined && entry.pantry_match !== null
                ? round3(entry.pantry_match)
                : pantryMatch(recipe, pantrySet),
            dietMatch:
              entry && entry.diet_match !== undefined && entry.diet_match !== null
                ? round3(entry.diet_match)
                : dietaryMatch(recipe, prefs),
            // Priority 3: ingredient-level breakdown passed through when the
            // AI service provides it (additive — DB fallback paths omit it).
            pantryIngredientsMet:
              entry && entry.pantry_ingredients_met !== undefined && entry.pantry_ingredients_met !== null
                ? entry.pantry_ingredients_met
                : undefined,
            pantryIngredientsRemaining:
              entry && Array.isArray(entry.pantry_ingredients_remaining)
                ? entry.pantry_ingredients_remaining
                : [],
            ingredientMatchPercent:
              entry && entry.ingredient_match_percent !== undefined && entry.ingredient_match_percent !== null
                ? round3(entry.ingredient_match_percent)
                : undefined,
            pantryTotalRequired:
              entry && entry.pantry_total_required !== undefined && entry.pantry_total_required !== null
                ? entry.pantry_total_required
                : undefined,
            pantryOptionalAvailable:
              entry && entry.pantry_optional_available !== undefined && entry.pantry_optional_available !== null
                ? entry.pantry_optional_available
                : undefined,
            pantryOptionalMissing:
              entry && Array.isArray(entry.pantry_optional_missing)
                ? entry.pantry_optional_missing
                : [],
          };
        });
      if (ordered.length) return ordered.slice(0, limit);
    }
    // Legacy shape: { recipe_ids: [...] }
    const ids = (ai && (ai.recipe_ids || ai.recipes)) || [];
    if (Array.isArray(ids) && ids.length) {
      const recipes = await Recipe.listByIds(ids);
      if (recipes.length) return decorate(recipes, pantrySet, prefs).slice(0, limit);
    }
  } catch (err) {
    console.warn(`[recommend] AI service unavailable (${err.message}) — using DB fallback`);
  }

  // 2) Pantry-overlap heuristic over the DB (works with Flask offline).
  if (userId && pantrySet.size) {
    try {
      const overlap = await pantryOverlapRecommendations(userId, limit, pantrySet, prefs);
      if (overlap.length) return overlap;
    } catch (err) {
      console.warn("[recommend] pantry fallback failed:", err.message);
    }
  }
  // 3) Popularity fallback.
  return decorate(await Recipe.recommendedFallback(limit), pantrySet, prefs);
}

// Profile context forwarded to the AI service for personalisation.
async function getRecommendationContext(userId) {
  if (!userId) return {};
  try {
    const { prefs, pantry } = await contextFor(userId);
    return { preferences: prefs, pantry };
  } catch (err) {
    return {};
  }
}

/**
 * Context-aware recommendations: fetches the standard recommendation list
 * then re-ranks it by time-of-day / meal-type fit.
 *
 * @param {number|string|null} userId
 * @param {number} limit
 * @param {string|null} timeOfDay e.g. "morning", "midday", "evening", "night"
 * @returns {Promise<Array>} recipes with { contextMatch, contextualScore }
 */
async function getContextualRecommended(userId, limit = 12, timeOfDay = null) {
  const recipes = await getRecommended(userId, limit);
  return contextualRerank(recipes, timeOfDay);
}

module.exports = {
  getRecommended,
  getContextualRecommended,
  getRecommendationContext,
  callAiRecommender,
  pantryMatch,
  dietaryMatch,
  contextualRerank,
  mealTypeFor,
};