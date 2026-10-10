// server/routes/mealplan.js
const express = require("express");
const mealPlanController = require("../controllers/mealPlanController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", mealPlanController.getWeek);
router.post("/generate", mealPlanController.generateWeek);
router.post("/", mealPlanController.addMeal);
router.delete("/:mealId", mealPlanController.removeMeal);

module.exports = router;
