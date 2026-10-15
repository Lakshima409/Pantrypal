// server/routes/recipes.js
const express = require("express");
const recipeController = require("../controllers/recipeController");
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");
const vx = require("../middleware/validateExtended");

const router = express.Router();

// Static routes first — they must win over `/:id`.
router.get("/", vx.recipeSearch, recipeController.searchRecipes); // list / filter (same params as /search)
router.get("/recommended", optionalAuth, recipeController.getRecommended);
router.get("/trending", recipeController.getTrending);
router.get("/search", vx.recipeSearch, recipeController.searchRecipes);
router.get("/favorites", requireAuth, recipeController.getFavorites);
router.post("/substitutions", recipeController.getSubstitutions);
router.get("/substitutions", recipeController.getSubstitutions);

router.post("/:id/favorite", requireAuth, vx.idParam("id"), recipeController.addFavorite);
router.delete("/:id/favorite", requireAuth, vx.idParam("id"), recipeController.removeFavorite);
router.get("/:id", optionalAuth, vx.idParam("id"), recipeController.getRecipeById);

module.exports = router;
