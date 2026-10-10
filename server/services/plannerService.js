// server/services/plannerService.js
// Weekly diet plan generation. Talks to the AI diet-planner microservice
// (ai-services/diet-planner, port 5002) and falls back to a local heuristic
// that respects the user's preferences stored in dietary_preferences.
const Recipe = require("../models/Recipe");
const UserModel = require("../models/user");
const db = require("../config/db");

const AI_URL = process.env.AI_PLANNER_URL || "http://localhost:5002";
const AI_TIMEOUT_MS = 2000;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

async function callAiPlanner(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const response = await fetch(`${AI_URL}/mealplan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AI planner returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

// Local fallback: candidate recipes matching the diet, avoiding allergens,
// spread round-robin across the week for variety (4 slots/day per §28).
async function heuristicWeek({ userId, dietType, allergies, calorieGoal }) {
  let prefs = {};
  if (userId) prefs = await UserModel.getPreferences(userId);

  const diet = dietType || (prefs.dietType) || (prefs.dietary && prefs.dietary[0]) || (prefs.dietaryRestrictions && prefs.dietaryRestrictions[0]);
  const banned = [
    ...(allergies || []),
    ...(prefs.allergies || []),
    ...(prefs.healthConditions || []),
  ].map((a) => String(a).toLowerCase());

  const candidates = await Recipe.search({
    dietary: diet && diet !== "none" ? [diet] : [],
    ingredients: [],
  });

  const allowed = candidates.filter((recipe) =>
    !recipe.ingredients.some((ing) => banned.some((term) => String(ing.name).toLowerCase().includes(term)))
  );

  const pool = (allowed.length ? allowed : candidates).slice(0, 60);
  const target = Number(calorieGoal) || Number(prefs.calorieGoal) || 2000;
  const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
  const mealsPerDayTarget = target / DAYS.length / MEAL_TYPES.length;

  const meals = [];
  let cursor = 0;
  for (const day of DAYS) {
    for (const mealType of MEAL_TYPES) {
      // Prefer recipes near the per-meal calorie target.
      const pick =
        pool.find(
          (r) => r.nutrition && Math.abs((r.nutrition.calories || 0) - mealsPerDayTarget) < 150
        ) || pool[cursor % Math.max(pool.length, 1)];
      cursor += 1;
      if (!pick) break;
      meals.push({ day, mealType, recipeId: pick.id });
      pool.splice(pool.indexOf(pick), 1);
      if (!pool.length) break;
    }
  }
  return meals;
}

/**
 * Generates a 7-day plan: [{ day, recipeId }].
 * Uses the Flask planner when available, otherwise the heuristic above.
 */
async function generateWeek({ userId, calorieGoal, dietType, allergies }) {
  try {
    const prefs = userId ? await UserModel.getPreferences(userId) : {};
    const ai = await callAiPlanner({
      user_id: userId || null,
      calorie_goal: Number(calorieGoal) || Number(prefs.calorieGoal) || 2000,
      diet_type: dietType || (prefs.dietary && prefs.dietary[0]),
      allergies: allergies || prefs.allergies || [],
      days: DAYS.length,
    });
    const meals = ai && ai.meals;
    if (Array.isArray(meals) && meals.length) return meals;
    throw new Error("empty plan");
  } catch (err) {
    console.warn(`[planner] AI planner unavailable (${err.message}) — using heuristic`);
    return heuristicWeek({ userId, dietType, allergies, calorieGoal });
  }
}

module.exports = { generateWeek, heuristicWeek };