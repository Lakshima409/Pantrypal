// server/controllers/recipeController.js
const Recipe = require("../models/Recipe");
const Favorites = require("../models/Favorites");
const SearchHistory = require("../models/SearchHistory");
const Substitution = require("../models/Substitution");
const recommendationService = require("../services/recommendationService");

const { parse: parseNlp } = require("../utils/nlpSearch");
const { mergeSearch, applyParsedFilters } = require("../utils/recipeFilters");

const toList = (value) =>
  String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// ✅ GET /api/recipes/recommended — hybrid AI recommender with DB fallback.
exports.getRecommended = async (req, res, next) => {
  try {
    const recipes = await recommendationService.getRecommended(req.user && req.user.id, 12);
    res.json(recipes);
  } catch (err) {
    next(err);
  }
};

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

// ✅ POST /api/recipes/substitutions  { ingredients: ["butter", ...] }
exports.getSubstitutions = async (req, res, next) => {
  try {
    const names =
      (req.body && req.body.ingredients) ||
      toList(req.query.ingredients) ||
      [];
    const detailed = await Substitution.getForIngredients(names);
    // Wire format used by the UI: substitutes is a plain array of names.
    res.json({
      substitutions: detailed.map((entry) => ({
        original: entry.original,
        substitutes: entry.substitutes.map((s) => s.name),
        details: entry.substitutes,
      })),
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
      await SearchHistory.recordView(req.user.id, req.params.id);
    }
    res.json({ recipe, isFavorite });
  } catch (err) {
    next(err);
  }
};
