// server/controllers/recipeController.js
const Recipe = require("../models/Recipe");
const Favorites = require("../models/Favorites");
const SearchHistory = require("../models/SearchHistory");
const Substitution = require("../models/Substitution");
const recommendationService = require("../services/recommendationService");
const recipeGenerationService = require("../services/recipeGenerationService");
const visionService = require("../services/visionService");

const { parse: parseNlp } = require("../utils/nlpSearch");
const { mergeSearch, applyParsedFilters } = require("../utils/recipeFilters");

const toList = (value) =>
  String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// GET /api/recipes/recommended?pantry=a,b&preferences={"dietType":"vegan"}&limit=12
// Query inputs are honoured first, then the stored user context — so pantry
// chips typed on the search page actually change the result set instead of
// silently returning the same popularity list for every input.
exports.getRecommended = async (req, res, next) => {
  try {
    const recipes = await recommendationService.getRecommended(
      req.user && req.user.id,
      Number(req.query.limit) || 12,
      {
        pantry: toList(req.query.pantry),
        preferences: parsePreferences(req.query.preferences),
      }
    );
    res.json(recipes);
  } catch (err) {
    next(err);
  }
};

function parsePreferences(raw) {
  if (!raw) return undefined;
  if (typeof raw === "object") return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

// ✅ GET /api/recipes/trending
exports.getTrending = async (req, res, next) => {
  try {
    res.json(await Recipe.trending(12));
  } catch (err) {
    next(err);
  }
};

// ✅ GET /api/recipes/search?query=&dietary=&cookTime=&difficulty=&ingredients=
//    &exclude=&maxCalories=&maxTime=
// Blueprint §37: the free-text `q` param (alias of `query`) is also parsed by
// the rule-based NLP parser when the caller puts a sentence there; explicit
// params always win over NLP-derived ones.
exports.searchRecipes = async (req, res, next) => {
  try {
    const { dietary, cookTime, difficulty, ingredients, exclude, maxCalories, maxTime } = req.query;
    const query = req.query.query || req.query.q;

    const nlp = req.query.q ? parseNlp(String(req.query.q)) : null;
    const merged = mergeSearch(nlp, {
      query,
      dietary: toList(dietary),
      ingredients: toList(ingredients),
      exclude: toList(exclude),
      maxCalories: maxCalories === undefined ? undefined : maxCalories,
      maxTime: maxTime === undefined ? undefined : maxTime,
    });
    const ingredientList = merged.ingredients;

    let results = await Recipe.search({
      query: toList(merged.query)[0],
      dietary: merged.dietary,
      ingredients: ingredientList,
      matchAll: true,
    });

    // Strict "all ingredients" matching found nothing → relax to "any".
    if (!results.length && ingredientList.length > 1) {
      results = await Recipe.search({
        query: toList(merged.query)[0],
        dietary: merged.dietary,
        ingredients: ingredientList,
        matchAll: false,
      });
    }

    const effectiveTime = maxTime !== undefined && maxTime !== '' ? maxTime : merged.maxTime;
    const pruned = applyParsedFilters(results, { exclude: merged.exclude, maxCalories: merged.maxCalories });

    const shaped = Recipe.filterByDerived(pruned, {
      cookTime: effectiveTime !== undefined && effectiveTime !== null && effectiveTime !== '' ? effectiveTime : cookTime,
      difficulty,
    });

    // Log one search row per request (best-effort; never fails the search).
    try {
      const SearchLog = require("../models/SearchLog");
      await SearchLog.record(req.user && req.user.id, req.query.q || merged.query, merged);
    } catch (err) {
      console.warn("[search] history log skipped:", err.message);
    }

    res.set("X-Search-Parsed", "1");
    res.json(shaped);
  } catch (err) {
    next(err);
  }
};

// ✅ GET /api/recipes/favorites
exports.getFavorites = async (req, res, next) => {
  try {
    res.json(await Favorites.list(req.user.id));
  } catch (err) {
    next(err);
  }
};

// ✅ POST /api/recipes/:id/favorite
exports.addFavorite = async (req, res, next) => {
  try {
    await Favorites.add(req.user.id, req.params.id);
    res.json({ isFavorite: true });
  } catch (err) {
    next(err);
  }
};

// ✅ DELETE /api/recipes/:id/favorite
exports.removeFavorite = async (req, res, next) => {
  try {
    await Favorites.remove(req.user.id, req.params.id);
    res.json({ isFavorite: false });
  } catch (err) {
    next(err);
  }
};

// ✅ POST /api/recipes/substitutions  { ingredients: ["butter", ...], allergies? }
//    GET  /api/recipes/substitutions?ingredients=...&allergies=...
// Phase 4: substitutes are filtered against allergens/restrictions. When the
// caller is authenticated their stored preferences are merged in automatically,
// so a peanut-allergic user can never be served almond butter as a "safe" swap.
exports.getSubstitutions = async (req, res, next) => {
  try {
    const names =
      (req.body && req.body.ingredients) ||
      toList(req.query.ingredients) ||
      [];
    // Banned terms: explicit request params + stored prefs (when authed).
    const explicit = [
      ...toList(req.body && req.body.allergies),
      ...toList(req.query.allergies),
      ...toList(req.body && req.body.exclude),
      ...toList(req.query.exclude),
    ];
    let stored = [];
    if (req.user) {
      try {
        const UserModel = require("../models/user");
        const prefs = await UserModel.getPreferences(req.user.id);
        stored = [
          ...(prefs.allergies || []),
          ...(prefs.dietaryRestrictions || []),
          ...(prefs.healthConditions || []),
        ];
      } catch (err) {
        stored = [];
      }
    }
    const banned = [...new Set([...explicit, ...stored])];
    const detailed = await Substitution.getForIngredients(names, banned);
    // Wire format used by the UI: substitutes is a plain array of names.
    res.json({
      substitutions: detailed.map((entry) => ({
        original: entry.original,
        substitutes: entry.substitutes.map((s) => s.name),
        details: entry.substitutes,
      })),
      filteredBy: banned.length ? banned : undefined,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ GET /api/recipes/:id
exports.getRecipeById = async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found." });

    let isFavorite = false;
    if (req.user) {
      isFavorite = await Favorites.has(req.user.id, req.params.id);
      // Record the view best-effort: a missing/invalid user row must never
      // break the recipe detail page (FK constraint on interactions.user_id).
      try {
        await SearchHistory.recordView(req.user.id, req.params.id);
      } catch (err) {
        console.warn("[recipe] view log skipped:", err.message);
      }
    }
    res.json({ recipe, isFavorite });
  } catch (err) {
    next(err);
  }
};

// ✅ GET /api/recipes/recommended/contextual?timeOfDay=morning
//    Context-aware recommendations re-ranked by time-of-day meal fit.
exports.getContextualRecommended = async (req, res, next) => {
  try {
    const timeOfDay = req.query.timeOfDay || null;
    const limit = Number(req.query.limit) || 12;
    const recipes = await recommendationService.getContextualRecommended(
      req.user && req.user.id,
      limit,
      timeOfDay
    );
    res.json(recipes);
  } catch (err) {
    next(err);
  }
};

// ✅ POST /api/recipes/generate  { ingredients: [...], dietary?, servings? }
//    LLM-based recipe generation with structured output validation.
//    Falls back to a local heuristic when no LLM is configured.
exports.generateRecipe = async (req, res, next) => {
  try {
    const { ingredients, dietary, servings } = req.body || {};
    if (!Array.isArray(ingredients) || !ingredients.length) {
      return res.status(400).json({ message: "ingredients array is required" });
    }
    const result = await recipeGenerationService.generateRecipe(ingredients, {
      endpoint: process.env.LLM_ENDPOINT,
      apiKey: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL,
      dietary,
      servings,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ✅ POST /api/recipes/recognize-ingredients  { image, provider?, apiKey?, endpoint?, filename? }
//    Image-based ingredient recognition with vision API + local fallback.
exports.recognizeIngredients = async (req, res, next) => {
  try {
    const { image, provider, apiKey, endpoint, filename } = req.body || {};
    if (!image) {
      return res.status(400).json({ message: "image is required" });
    }
    const result = await visionService.recognizeIngredients(image, {
      provider,
      apiKey,
      endpoint,
      filename,
    });
    res.json({ ingredients: result });
  } catch (err) {
    next(err);
  }
};
