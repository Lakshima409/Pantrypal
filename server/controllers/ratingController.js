// server/controllers/ratingController.js — recipe ratings & feedback (Phase 5).
// POST   /api/recipes/:id/rate      { rating: 1-5, review? }
// GET    /api/recipes/:id/ratings   -> { avgRating, ratingCount, ratings[] }
// GET    /api/recipes/:id/my-rating -> { id, rating, review } or null
// DELETE /api/recipes/:id/rate      -> removes user's rating
const Rating = require("../models/Rating");
const Recipe = require("../models/Recipe");

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

// ✅ POST /api/recipes/:id/rate
exports.rateRecipe = async (req, res, next) => {
  try {
    const { rating, review } = req.body || {};
    const r = toNum(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ message: "rating must be an integer between 1 and 5." });
    }
    if (review !== undefined && review !== null && String(review).length > 1000) {
      return res.status(400).json({ message: "Review must be 1000 characters or fewer." });
    }
    // Recipe must exist.
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found." });
    const saved = await Rating.upsert(req.user.id, req.params.id, { rating: r, review: review || null });
    const stats = await Rating.statsForRecipe(req.params.id);
    res.status(201).json({ rating: saved, stats });
  } catch (err) {
    next(err);
  }
};

// ✅ GET /api/recipes/:id/ratings
exports.listRatings = async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const ratings = await Rating.listForRecipe(req.params.id, limit);
    const stats = await Rating.statsForRecipe(req.params.id);
    res.json({ stats, ratings });
  } catch (err) {
    next(err);
  }
};

// ✅ GET /api/recipes/:id/my-rating
exports.getMyRating = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Sign in to view your rating." });
    const rating = await Rating.getByUserAndRecipe(req.user.id, req.params.id);
    res.json(rating || null);
  } catch (err) {
    next(err);
  }
};

// ✅ DELETE /api/recipes/:id/rate
exports.removeRating = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Sign in to remove your rating." });
    const removed = await Rating.remove(req.user.id, req.params.id);
    if (!removed) return res.status(404).json({ message: "Rating not found." });
    const stats = await Rating.statsForRecipe(req.params.id);
    res.json({ message: "Rating removed.", stats });
  } catch (err) {
    next(err);
  }
};
