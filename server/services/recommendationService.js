// server/services/recommendationService.js
// Bridge to the Flask recommender microservice (ai-services/recommender, port
// 5001) with a database fallback so /api/recipes/recommended always answers.
//
// Contract (blueprint §25):
//   POST /recommend  { user_id, limit, pantry[], preferences{...} }
//   200 { recommendations: [{ recipe_id, score, pantry_match, diet_match }] }
//   — legacy { recipe_ids: [...] } is still accepted.
const Recipe = require("../models/Recipe");
const PantryItem = require("../models/PantryItem");
const UserModel = require("../models/user");

const AI_URL = process.env.AI_RECOMMENDER_URL || "http://localhost:5001";
const AI_TIMEOUT_MS = 1800;

// Score weights (blueprint §24 — tunable starting point, not report-mandated).
const WEIGHTS = { pantryMatch: 0.45, dietaryMatch: 0.25, popularity: 0.20, recency: 0.10 };

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

async function contextFor(userId) {
  const [prefs, pantry] = await Promise.all([
    userId ? UserModel.getPreferences(userId).catch(() => ({})) : Promise.resolve({}),
    userId ? PantryItem.names(userId).catch(() => []) : Promise.resolve([]),
  ]);
  return { prefs, pantry, pantrySet: new Set(pantry.map(norm)) };
}

// Pantry-overlap ordering used when Flask is offline.
async function pantryOverlapRecommendations(userId, limit, pantrySet, prefs) {
  const pantryNames = [...pantrySet];
  if (!pantryNames.length) return decorate(await Recipe.recommendedFallback(limit), pantrySet, prefs);

  const [rows] = await require("../config/db").query(
    `SELECT ri.recipe_id, COUNT(*) AS hits
     FROM recipe_ingredients ri
     JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
     WHERE LOWER(i.name) IN (?)
     GROUP BY ri.recipe_id
     ORDER BY hits DESC, ri.recipe_id
     LIMIT ?`,
    [pantryNames, Math.max(limit * 3, 30)]
  );

  const recipes = await Recipe.listByIds(rows.map((r) => r.recipe_id));
  const ranked = decorate(recipes, pantrySet, prefs).sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, limit);
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
 */
async function getRecommended(userId, limit = 12) {
  const { prefs, pantry, pantrySet } = await contextFor(userId);

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

module.exports = { getRecommended, getRecommendationContext, callAiRecommender, pantryMatch, dietaryMatch };