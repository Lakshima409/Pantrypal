// server/models/MealPlan.js — weekly plans stored in `diet_plan` +
// `diet_plan_meals` (see database/migrations/add_diet_plan.sql).
const db = require("../config/db");
const { recipeImage } = require("../utils/recipeImage");

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

// Monday of the week `offset` weeks away from the current week.
function weekStart(offset = 0) {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = Monday
  now.setDate(now.getDate() - day + Number(offset || 0) * 7);
  now.setHours(0, 0, 0, 0);
  return now.toISOString().slice(0, 10);
}

async function getOrCreatePlan(userId, start) {
  const [rows] = await db.query(
    "SELECT plan_id FROM diet_plan WHERE user_id = ? AND week_start = ?",
    [userId, start]
  );
  if (rows[0]) return rows[0].plan_id;
  const [result] = await db.query(
    "INSERT INTO diet_plan (user_id, week_start) VALUES (?, ?)",
    [userId, start]
  );
  return result.insertId;
}

// Returns { mealPlan: { Monday: [...], ... } }
async function getWeek(userId, offset = 0) {
  const start = weekStart(offset);
  const [rows] = await db.query(
    `SELECT m.meal_id, m.day_of_week, m.meal_type, r.recipe_id, r.title, r.image_url
     FROM diet_plan_meals m
     JOIN diet_plan p ON p.plan_id = m.plan_id
     JOIN recipes r ON r.recipe_id = m.recipe_id
     WHERE p.user_id = ? AND p.week_start = ?
     ORDER BY m.day_of_week, m.meal_id`,
    [userId, start]
  );

  const mealPlan = Object.fromEntries(DAY_NAMES.map((d) => [d, []]));
  for (const row of rows) {
    const day = DAY_NAMES[row.day_of_week - 1];
    if (!day) continue;
    mealPlan[day].push({
      id: String(row.meal_id),
      recipeId: String(row.recipe_id),
      title: (row.title && String(row.title).trim()) || `Recipe #${row.recipe_id}`,
      image: recipeImage(row.image_url, row.title, row.title),
      mealType: row.meal_type,
      day,
    });
  }
  return mealPlan;
}

async function addMeal(userId, recipeId, dayName, offset = 0, mealType = "dinner") {
  const dayIndex = DAY_NAMES.findIndex((d) => d.toLowerCase() === String(dayName || "").toLowerCase());
  if (dayIndex < 0) throw Object.assign(new Error("Invalid day."), { status: 400 });
  const cleanType = MEAL_TYPES.includes(String(mealType || "").toLowerCase())
    ? String(mealType).toLowerCase()
    : "dinner";
  const planId = await getOrCreatePlan(userId, weekStart(offset));
  const [result] = await db.query(
    "INSERT INTO diet_plan_meals (plan_id, day_of_week, recipe_id, meal_type) VALUES (?, ?, ?, ?)",
    [planId, dayIndex + 1, Number(recipeId), cleanType]
  );
  return { id: String(result.insertId), day: DAY_NAMES[dayIndex], recipeId: String(recipeId), mealType: cleanType };
}

async function removeMeal(mealId, userId) {
  const [result] = await db.query(
    `DELETE m FROM diet_plan_meals m
     JOIN diet_plan p ON p.plan_id = m.plan_id
     WHERE m.meal_id = ? AND p.user_id = ?`,
    [mealId, userId]
  );
  return result.affectedRows > 0;
}

// Weekly nutrition totals across the planned meals (powers the Meal Plan
// nutrition summary card, blueprint §28).
async function weekNutrition(userId, offset = 0) {
  const start = weekStart(offset);
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(n.calories), 0) AS calories,
            COALESCE(SUM(n.protein), 0) AS protein,
            COALESCE(SUM(n.fat), 0) AS fat,
            COALESCE(SUM(n.carbs), 0) AS carbs,
            COALESCE(SUM(n.sodium), 0) AS sodium,
            COUNT(*) AS meals
     FROM diet_plan_meals m
     JOIN diet_plan p ON p.plan_id = m.plan_id
     LEFT JOIN nutrition_info n ON n.recipe_id = m.recipe_id
     WHERE p.user_id = ? AND p.week_start = ?`,
    [userId, start]
  );
  const totals = rows[0] || {};
  const round2 = (v) => Math.round(Number(v || 0) * 100) / 100;
  return {
    calories: round2(totals.calories),
    protein: round2(totals.protein),
    fat: round2(totals.fat),
    carbs: round2(totals.carbs),
    sodium: round2(totals.sodium),
    meals: Number(totals.meals) || 0,
  };
}

// Replaces the whole week with new meal rows: [{ day, recipeId, mealType }]
// Phase 2 data integrity: DELETE + bulk INSERT wrapped in a transaction.
async function replaceWeek(userId, meals, offset = 0) {
  const start = weekStart(offset);
  const planId = await getOrCreatePlan(userId, start);
  const rows = meals
    .map(({ day, recipeId, mealType }) => {
      const dayIndex = DAY_NAMES.findIndex((d) => d.toLowerCase() === String(day).toLowerCase());
      const rid = Number(recipeId);
      const cleanType = MEAL_TYPES.includes(String(mealType || "").toLowerCase())
        ? String(mealType).toLowerCase()
        : "dinner";
      return dayIndex >= 0 && Number.isFinite(rid) ? [planId, dayIndex + 1, rid, cleanType] : null;
    })
    .filter(Boolean);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM diet_plan_meals WHERE plan_id = ?", [planId]);
    if (rows.length) {
      await conn.query(
        "INSERT INTO diet_plan_meals (plan_id, day_of_week, recipe_id, meal_type) VALUES ?",
        [rows]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return getWeek(userId, offset);
}

module.exports = { DAY_NAMES, MEAL_TYPES, weekStart, getWeek, addMeal, removeMeal, weekNutrition, replaceWeek, getOrCreatePlan };
