// server/routes/ratings.js — recipe ratings & feedback routes (Phase 5).
const express = require("express");
const ratingController = require("../controllers/ratingController");
const { requireAuth } = require("../middleware/authMiddleware");
const vx = require("../middleware/validateExtended");

const router = express.Router();

router.use(requireAuth);

// POST /api/recipes/:id/rate  { rating: 1-5, review? }
router.post("/:id/rate", vx.idParam("id"), vx.rateRecipe, ratingController.rateRecipe);

// GET /api/recipes/:id/ratings  (public — stats + list)
router.get("/:id/ratings", vx.idParam("id"), ratingController.listRatings);

// GET /api/recipes/:id/my-rating  (authenticated — user's own rating)
router.get("/:id/my-rating", vx.idParam("id"), ratingController.getMyRating);

// DELETE /api/recipes/:id/rate
router.delete("/:id/rate", vx.idParam("id"), ratingController.removeRating);

module.exports = router;
