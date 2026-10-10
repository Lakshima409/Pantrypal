// server/controllers/mealPlanController.js
const MealPlan = require("../models/MealPlan");
const ShoppingList = require("../models/ShoppingList");
const plannerService = require("../services/plannerService");

// ✅ GET /api/mealplan?week=0 — week plan + shopping list + nutrition totals.
exports.getWeek = async (req, res, next) => {
  try {
    const week = Number(req.query.week) || 0;
    const mealPlan = await MealPlan.getWeek(req.user.id, week);
    const shoppingList = await ShoppingList.listItems(req.user.id);
    const nutrition = await MealPlan.weekNutrition(req.user.id, week);
    res.json({ mealPlan, shoppingList, nutrition });
  } catch (err) {
    next(err);
  }
};

// ✅ POST /api/mealplan  { recipeId, day, mealType }
exports.addMeal = async (req, res, next) => {
  try {
    const { recipeId, day, mealType } = req.body || {};
    if (!recipeId || !day) {
      return res.status(400).json({ message: "recipeId and day are required." });
    }
    const meal = await MealPlan.addMeal(req.user.id, recipeId, day, 0, mealType);
    res.status(201).json({ meal, message: "Added to your meal plan." });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// ✅ DELETE /api/mealplan/:mealId
exports.removeMeal = async (req, res, next) => {
  try {
    const removed = await MealPlan.removeMeal(req.params.mealId, req.user.id);
    if (!removed) return res.status(404).json({ message: "Meal not found." });
    res.json({ message: "Meal removed." });
  } catch (err) {
    next(err);
  }
};

// ✅ POST /api/mealplan/generate
// Builds a balanced 7-day plan through the AI planner (Flask :5002),
// falling back to a local heuristic when the microservice is offline.
exports.generateWeek = async (req, res, next) => {
  try {
    const { calorieGoal, dietType, allergies } = req.body || {};
    const plan = await plannerService.generateWeek({
      userId: req.user.id,
      calorieGoal,
      dietType,
      allergies,
    });
    const mealPlan = await MealPlan.replaceWeek(req.user.id, plan, 0);
    res.json({ mealPlan, message: "Weekly meal plan generated." });
  } catch (err) {
    next(err);
  }
};
