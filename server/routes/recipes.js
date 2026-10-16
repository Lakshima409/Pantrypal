// server/routes/recipes.js
const express = require("express");
const recipeController = require("../controllers/recipeController");
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");
const vx = require("../middleware/validateExtended");

const router = express.Router();

// Static routes first — they must win over `/:id`.
router.get("/", vx.recipeSearch, recipeController.searchRecipes); // list / filter (same params as /search)
router.get("/recommended", optionalAuth, recipeController.getRecommended);
router.get("/recommended/contextual", optionalAuth, recipeController.getContextualRecommended);
router.get("/trending", recipeController.getTrending);
router.get("/search", vx.recipeSearch, recipeController.searchRecipes);
router.get("/favorites", requireAuth, recipeController.getFavorites);
router.post("/substitutions", optionalAuth, recipeController.getSubstitutions);
router.get("/substitutions", optionalAuth, recipeController.getSubstitutions);
router.post("/generate", optionalAuth, recipeController.generateRecipe);
router.post("/recognize-ingredients", optionalAuth, recipeController.recognizeIngredients);

router.post("/:id/favorite", requireAuth, vx.idParam("id"), recipeController.addFavorite);
router.delete("/:id/favorite", requireAuth, vx.idParam("id"), recipeController.removeFavorite);

// Phase 5: recipe ratings & feedback (handled by ratingsRoutes).

router.get("/:id", optionalAuth, vx.idParam("id"), recipeController.getRecipeById);

module.exports = router;
