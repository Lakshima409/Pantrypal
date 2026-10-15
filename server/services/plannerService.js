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
// Phase 4 / DEV-07: the pool REFILLS from the full allowed list when it runs
// out, so the week is always complete (28 meals); repeats are only used when
// the corpus genuinely cannot cover the week. Slot targets follow the same
// 25/35/30/10 share rule as the Flask planner (configurable there).
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

  // Exclusions BEFORE selection (same ordering guarantee as the Flask planner).
  const allowed = candidates.filter((recipe) =>
    !recipe.ingredients.some((ing) => banned.some((term) => String(ing.name).toLowerCase().includes(term)))
  );

  const base = (allowed.length ? allowed : candidates).slice(0, 60);
  if (!base.length) return [];
  const target = Number(calorieGoal) || Number(prefs.calorieGoal) || 2000;
  const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
  const SHARES = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };

  const meals = [];
  const used = new Set();
  let cursor = 0;
  for (const day of DAYS) {
    for (const mealType of MEAL_TYPES) {
      const mealTarget = target * (SHARES[mealType] || 0.25);
      // Prefer an unused recipe near the slot's calorie target.
      const near = base.find(
        (r) => !used.has(r.id) && r.nutrition &&
          Math.abs((r.nutrition.calories || 0) - mealTarget) < 150
      );
      // Next unused recipe round-robin; refill from `base` when exhausted.
      let pick = near;
      if (!pick) {
        for (let i = 0; i < base.length; i += 1) {
          const cand = base[(cursor + i) % base.length];
          if (!used.has(cand.id)) { pick = cand; cursor = (cursor + i + 1) % base.length; break; }
        }
      }
      if (!pick) { pick = base[cursor % base.length]; cursor = (cursor + 1) % base.length; } // corpus smaller than 28 → deliberate reuse
      meals.push({ day, mealType, recipeId: pick.id });
      used.add(pick.id);
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