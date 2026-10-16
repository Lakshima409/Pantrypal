// server/routes/mealplan.js
const express = require("express");
const mealPlanController = require("../controllers/mealPlanController");
const { requireAuth } = require("../middleware/authMiddleware");
const vx = require("../middleware/validateExtended");

const router = express.Router();

router.use(requireAuth);

router.get("/", vx.weekQuery, mealPlanController.getWeek);
router.post("/generate", vx.mealGenerate, mealPlanController.generateWeek);
router.post("/", vx.mealAdd, mealPlanController.addMeal);
router.delete("/:mealId", vx.idParam("mealId"), mealPlanController.removeMeal);

module.exports = router;
