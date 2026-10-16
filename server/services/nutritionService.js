// server/services/nutritionService.js — Nutrition enrichment via USDA FoodData
// Central (FDC) API with in-memory caching, validation, and graceful fallback.
// Phase 5 feature: "Nutrition enrichment — Integrate a suitable nutrition API,
// cache responses, and validate returned data" (High priority).
//
// Design: cache-first, OFF by default (no key required, no surprise spend).
// Set NUTRITION_API_KEY to enable live USDA lookups. The service normalises
// USDA FDC responses into the ingredient nutrition shape used by the corpus
// (calories/protein/fat/carbs/sodium per 100g) and validates ranges so
// implausible values are never written back to the DB.

const API_KEY = process.env.NUTRITION_API_KEY || "";

const BASE_URL = "https://api.nal.usda.gov/fdc/v1";
const CACHE_TTL_MS = Number(process.env.NUTRITION_CACHE_TTL_MS) || 24 * 60 * 60 * 1000; // 24h
const REQUEST_TIMEOUT_MS = Number(process.env.NUTRITION_TIMEOUT_MS) || 5000;

// In-memory cache: { [fdcIdOrQuery]: { data, expiresAt } }
const cache = new Map();

// Validation bounds (per 100g) — values outside these ranges are rejected.
const BOUNDS = {
  calories: [0, 900],
  protein: [0, 100],
  fat: [0, 100],
  carbs: [0, 100],
  sodium: [0, 20000], // mg per 100g, generous upper bound
};

function isEnabled() {
  return Boolean(API_KEY);
}

function now() {
  return Date.now();
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < now()) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data) {
  cache.set(key, { data, expiresAt: now() + CACHE_TTL_MS });
}

function round2(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function validateNutrient(name, value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  const bounds = BOUNDS[name];
  if (!bounds) return null; // unknown nutrient — reject
  const [lo, hi] = bounds;
  if (n < lo || n > hi) return null;
  return round2(n);
}

/**
 * Look up a single USDA FDC food by ID, validate, and normalise.
 * Returns { fdcId, name, caloriesPer100g, proteinPer100g, fatPer100g,
 *   carbsPer100g, sodiumPer100g, source: 'usda' } or null on any failure.
 */
async function lookupByFdcId(fdcId) {
  if (!isEnabled()) return null;
  const key = `fdc:${fdcId}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${BASE_URL}/food/${fdcId}?api_key=${API_KEY}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const norm = normaliseUsdaFood(data);
    if (norm) cacheSet(key, norm);
    return norm;
  } catch (err) {
    console.warn(`[nutrition] FDC lookup failed for ${fdcId}:`, err.message);
    return null;
  }
}

/**
 * Search USDA FDC for a food by query string, returning the best validated match.
 * Returns null if no usable match or the service is disabled.
 */
async function searchByQuery(query, { pageSize = 5 } = {}) {
  if (!isEnabled()) return null;
  const key = `search:${normQuery(query)}:${pageSize}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const url = `${BASE_URL}/search?api_key=${API_KEY}&query=${encodeURIComponent(
      String(query)
    )}&pageSize=${Number(pageSize)}&dataType[]=Branded&dataType[]=SR Legacy&dataType[]=Foundation`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const foods = Array.isArray(data.foods) ? data.foods : [];
    for (const food of foods) {
      const norm = normaliseUsdaFood(food);
      if (norm) {
        cacheSet(key, norm);
        return norm;
      }
    }
    return null;
  } catch (err) {
    console.warn(`[nutrition] FDC search failed for "${query}":`, err.message);
    return null;
  }
}

function normQuery(q) {
  return String(q || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Normalise a USDA FDC food object into the ingredient-nutrition shape.
 * Validates every nutrient against BOUNDS; returns null if the food has no
 * usable nutrient data.
 */
function normaliseUsdaFood(food) {
  if (!food || !food.fdcId) return null;

  const nutrients = {};
  for (const n of food.foodNutrients || []) {
    const name =
      (n.nutrient && n.nutrient.name) ||
      (n.nutrient && n.nutrient.nutrientName) ||
      n.nutrientName ||
      "";
    const value =
      n.amount !== undefined ? n.amount : n.value !== undefined ? n.value : null;
    const key = nutrientKey(name);
    if (key && value !== null && value !== undefined) nutrients[key] = value;
  }

  const calories = validateNutrient("calories", nutrients.energy || nutrients.calories);
  const protein = validateNutrient("protein", nutrients.protein);
  const fat = validateNutrient("fat", nutrients.fat || nutrients["total lipid"]);
  const carbs = validateNutrient("carbs", nutrients.carbohydrate || nutrients.carbs);
  const sodium = validateNutrient("sodium", nutrients.sodium);

  if (calories === null) return null;

  return {
    fdcId: Number(food.fdcId),
    name: String(food.description || food.name || "").trim() || null,
    caloriesPer100g: calories,
    proteinPer100g: protein,
    fatPer100g: fat,
    carbsPer100g: carbs,
    sodiumPer100g: sodium,
    source: "usda",
  };
}

const NUTRIENT_ALIASES = {
  energy: "energy",
  calories: "energy",
  "energy (atwater)": "energy",
  protein: "protein",
  "total lipid": "fat",
  "total lipid (fat)": "fat",
  fat: "fat",
  "total fat": "fat",
  carbohydrate: "carbs",
  "carbohydrate, by difference": "carbs",
  carbs: "carbs",
  sodium: "sodium",
};

function nutrientKey(name) {
  const n = String(name || "").toLowerCase().trim();
  // Exact match first.
  if (NUTRIENT_ALIASES[n]) return NUTRIENT_ALIASES[n];
  // Prefix match: "total lipid (fat)" -> "total lipid" -> "fat".
  for (const [alias, key] of Object.entries(NUTRIENT_ALIASES)) {
    if (n.startsWith(alias)) return key;
  }
  return null;
}

/**
 * Enrich an ingredient name with USDA nutrition data. Tries FDC ID first (if
 * the ingredient record carries one), then falls back to a text search.
 * Returns null when the service is disabled or no valid data is found —
 * callers must degrade gracefully (no exception, no partial writes).
 */
async function enrichIngredient({ name, fdcId }) {
  if (!name && !fdcId) return null;
  if (fdcId) {
    const byId = await lookupByFdcId(fdcId);
    if (byId) return byId;
  }
  if (name) return searchByQuery(name);
  return null;
}

/** Cache statistics (useful for debugging / health endpoints). */
function cacheStats() {
  const nowTs = now();
  let oldest = null;
  for (const [, entry] of cache) {
    if (oldest === null || entry.expiresAt < oldest) oldest = entry.expiresAt;
  }
  return { size: cache.size, enabled: isEnabled(), oldestExpiry: oldest };
}

module.exports = {
  isEnabled,
  validateNutrient,
  cacheGet,
  cacheSet,
  round2,
  lookupByFdcId,
  searchByQuery,
  enrichIngredient,
  normaliseUsdaFood,
  nutrientKey,
  cacheStats,
};
