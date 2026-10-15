// server/middleware/validateExtended.js
// Phase 2 — extended server-side validators for the ACTUAL repo shapes.
// Small companion to validateInput.js (kept intact); both are wired in routes.
const BASE = require("./validateInput");

const asStr = (v) => (v === undefined || v === null ? "" : String(v));
const toNumber = (v) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const isFiniteNumber = (v) => Number.isFinite(toNumber(v));
function fail(res, message) {
  return res.status(400).json({ message });
}
function isStringList(value, maxItems = 30, maxLen = 60) {
  if (!Array.isArray(value)) return false;
  if (value.length > maxItems) return false;
  return value.every(
    (v) => typeof v === "string" && v.trim().length >= 1 && v.trim().length <= maxLen
  );
}

const DIETS = new Set(["", "vegetarian", "vegan", "pescatarian", "keto", "paleo", "gluten-free", "halal", "none"]);
const SKILLS = new Set(["beginner", "intermediate", "advanced"]);
const DIFFS = new Set(["easy", "medium", "hard"]);
const MEAL_TYPES = new Set(["breakfast", "lunch", "dinner", "snack"]);
const DAYS = new Set(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);

// Optional age/bio: no column or form field today — validate ONLY when present.
function checkOptionalAgeBio(body, res) {
  if (body.age !== undefined && body.age !== null && body.age !== "") {
    const n = toNumber(body.age);
    if (!Number.isInteger(n) || n < 13 || n > 120) {
      return fail(res, "Age must be a whole number between 13 and 120.");
    }
  }
  if (body.bio !== undefined && body.bio !== null && body.bio !== "") {
    if (asStr(body.bio).trim().length > 500) {
      return fail(res, "Bio must be 500 characters or fewer.");
    }
  }
  return null;
}

// PUT /api/users/profile — actual shape: name/email + arrays + skill/diet/calories.
const profileFull = (req, res, next) => {
  const body = req.body || {};
  for (const key of ["dietaryRestrictions", "preferences", "allergies", "conditions", "healthConditions", "dietary"]) {
    if (body[key] !== undefined && !isStringList(body[key])) {
      return fail(res, `${key} must be an array of up to 30 short strings.`);
    }
  }
  for (const key of ["householdSize", "cookingFrequency", "skill", "diet", "calories"]) {
    if (body[key] !== undefined && body[key] !== null && asStr(body[key]).length > 60) {
      return fail(res, `${key} is too long (max 60 characters).`);
    }
  }
  if (body.calories !== undefined && body.calories !== null && body.calories !== "") {
    const n = toNumber(body.calories);
    if (!Number.isFinite(n) || n < 500 || n > 10000) {
      return fail(res, "Daily calorie goal must be between 500 and 10000 kcal.");
    }
  }
  if (body.skill !== undefined && body.skill !== null && body.skill !== "" &&
      !SKILLS.has(asStr(body.skill).toLowerCase())) {
    return fail(res, "Cooking skill must be beginner, intermediate or advanced.");
  }
  if (body.diet !== undefined && body.diet !== null && body.diet !== "" &&
      !DIETS.has(asStr(body.diet).toLowerCase())) {
    return fail(res, "Dietary preference is not recognised.");
  }
  const err = checkOptionalAgeBio(body, res);
  if (err) return err;
  next();
};

// PUT /api/users/preferences — actual UserModel.savePreferences shape.
const preferencesUpdate = (req, res, next) => {
  const body = req.body || {};
  if (body.dietType !== undefined && body.dietType !== null && body.dietType !== "" &&
      !DIETS.has(asStr(body.dietType).toLowerCase())) {
    return fail(res, "dietType must be a known diet (vegetarian, vegan, keto, ...).");
  }
  for (const key of ["calorieGoal", "calorieMin", "calorieMax"]) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
      const n = toNumber(body[key]);
      if (!Number.isFinite(n) || n < 500 || n > 10000) {
        return fail(res, `${key} must be a number between 500 and 10000.`);
      }
    }
  }
  const lo = toNumber(body.calorieMin);
  const hi = toNumber(body.calorieMax);
  if (body.calorieMin !== "" && body.calorieMax !== "" &&
      Number.isFinite(lo) && Number.isFinite(hi) && lo > hi &&
      body.calorieMin !== undefined && body.calorieMax !== undefined &&
      body.calorieMin !== null && body.calorieMax !== null) {
    return fail(res, "calorieMin cannot be greater than calorieMax.");
  }
  if (body.skill !== undefined && body.skill !== null && body.skill !== "" &&
      !SKILLS.has(asStr(body.skill).toLowerCase())) {
    return fail(res, "skill must be beginner, intermediate or advanced.");
  }
  if (body.difficulty !== undefined && body.difficulty !== null && body.difficulty !== "" &&
      !DIFFS.has(asStr(body.difficulty).toLowerCase())) {
    return fail(res, "difficulty must be easy, medium or hard.");
  }
  for (const key of ["cookTime", "householdSize", "cookingFrequency"]) {
    if (body[key] !== undefined && body[key] !== null && asStr(body[key]).length > 60) {
      return fail(res, `${key} is too long (max 60 characters).`);
    }
  }
  if (body.cookTime !== undefined && body.cookTime !== null && body.cookTime !== "" &&
      isFiniteNumber(body.cookTime)) {
    const n = toNumber(body.cookTime);
    if (n < 1 || n > 600) return fail(res, "cookTime must be between 1 and 600 minutes.");
  }
  for (const key of ["dietaryRestrictions", "preferences", "allergies", "dietary", "healthConditions"]) {
    if (body[key] !== undefined && !isStringList(body[key])) {
      return fail(res, `${key} must be an array of up to 30 short strings.`);
    }
  }
  const err = checkOptionalAgeBio(body, res);
  if (err) return err;
  next();
};


// Positive-integer :id / :mealId / :itemId params (prevents "abc" hitting MySQL).
function isPositiveInt(v) {
  if (typeof v === "number") return Number.isInteger(v) && v > 0;
  return typeof v === "string" && /^[1-9]\d*$/.test(v.trim());
}
function idParam(paramName = "id") {
  return (req, res, next) => {
    const raw = req.params && req.params[paramName];
    if (!isPositiveInt(raw)) {
      return res.status(400).json({ message: `Invalid ${paramName}. Must be a positive integer.` });
    }
    next();
  };
}

// POST /api/auth/forgot-password
const forgotPassword = (req, res, next) => {
  const { email } = req.body || {};
  if (asStr(email).trim() === "") return fail(res, "Email is required.");
  if (asStr(email).length > 254 || !BASE.EMAIL_RE.test(asStr(email).trim())) {
    return fail(res, "Please enter a valid email address.");
  }
  next();
};

// PUT /api/pantry/:id — partial patch validation.
// Accepts the controller's "500 g" / "2 cups" quantity strings (parseQuantity
// splits them); validates the numeric part + optional embedded unit.
const pantryUpdate = (req, res, next) => {
  const body = req.body || {};
  if (body.name !== undefined && (asStr(body.name).trim() === "" || asStr(body.name).length > 240)) {
    return fail(res, "Ingredient name must be 1-240 characters.");
  }
  if (body.quantity !== undefined && body.quantity !== null && body.quantity !== "") {
    let num = body.quantity;
    let embeddedUnit = null;
    if (typeof body.quantity === "string") {
      const m = body.quantity.trim().match(/^(-?[\d.,]+)\s*(.*)$/);
      if (!m) return fail(res, "Quantity must be a number between 0 and 1000000.");
      num = Number(m[1].replace(",", "."));
      embeddedUnit = (m[2] || "").trim();
    }
    const n = typeof num === "number" ? num : Number(num);
    if (!Number.isFinite(n) || n < 0 || n > 1000000) {
      return fail(res, "Quantity must be a number between 0 and 1000000.");
    }
    if (embeddedUnit && embeddedUnit.length > 20) {
      return fail(res, "Unit must be 20 characters or fewer.");
    }
  }
  if (body.unit !== undefined && body.unit !== null && asStr(body.unit).length > 20) {
    return fail(res, "Unit must be 20 characters or fewer.");
  }
  if (body.category !== undefined && body.category !== null && asStr(body.category).length > 80) {
    return fail(res, "Category must be 80 characters or fewer.");
  }
  if (body.expiryDate !== undefined && body.expiryDate !== null && body.expiryDate !== "") {
    if (Number.isNaN(new Date(body.expiryDate).getTime())) {
      return fail(res, "expiryDate must be a valid date (YYYY-MM-DD).");
    }
  }
  next();
};

// POST /api/mealplan (+ full checks; controller only checked presence).
const mealAdd = (req, res, next) => {
  const { recipeId, day, mealType } = req.body || {};
  if (recipeId === undefined || recipeId === null || recipeId === "" ||
      day === undefined || day === null || asStr(day).trim() === "") {
    return res.status(400).json({ message: "recipeId and day are required." });
  }
  if (!isPositiveInt(recipeId)) return fail(res, "recipeId must be a positive integer.");
  if (!DAYS.has(asStr(day).toLowerCase())) {
    return fail(res, "day must be a weekday (Monday-Sunday).");
  }
  if (mealType !== undefined && mealType !== null && mealType !== "" &&
      !MEAL_TYPES.has(asStr(mealType).toLowerCase())) {
    return fail(res, "mealType must be breakfast, lunch, dinner or snack.");
  }
  next();
};

// POST /api/mealplan/generate
const mealGenerate = (req, res, next) => {
  const { calorieGoal, dietType, allergies } = req.body || {};
  if (calorieGoal !== undefined && calorieGoal !== null && calorieGoal !== "") {
    const n = toNumber(calorieGoal);
    if (!Number.isFinite(n) || n < 500 || n > 10000) {
      return fail(res, "calorieGoal must be a number between 500 and 10000.");
    }
  }
  if (dietType !== undefined && dietType !== null && dietType !== "" &&
      !DIETS.has(asStr(dietType).toLowerCase())) {
    return fail(res, "dietType must be a known diet (vegetarian, vegan, keto, ...).");
  }
  if (allergies !== undefined && !isStringList(allergies)) {
    return fail(res, "allergies must be an array of up to 30 short strings.");
  }
  next();
};

// GET /api/mealplan?week=
const weekQuery = (req, res, next) => {
  if (req.query.week !== undefined && req.query.week !== "") {
    const n = toNumber(req.query.week);
    if (!Number.isInteger(n) || n < -52 || n > 52) {
      return fail(res, "week must be a whole number between -52 and 52.");
    }
  }
  next();
};

// POST /api/shoppinglist (+ batch shape { items: [...] }).
const shoppingAdd = (req, res, next) => {
  const body = req.body || {};
  const checkOne = (item) => {
    if (!item || asStr(item.name).trim() === "") return "Every item needs a name.";
    if (asStr(item.name).length > 240) return "Item names must be 240 characters or fewer.";
    const q = item.amount !== undefined ? item.amount : item.quantity;
    if (q !== undefined && q !== null && q !== "" &&
        (!isFiniteNumber(q) || toNumber(q) < 0 || toNumber(q) > 1000000)) {
      return "Item quantities must be numbers between 0 and 1000000.";
    }
    if (item.unit !== undefined && item.unit !== null && asStr(item.unit).length > 20) {
      return "Unit must be 20 characters or fewer.";
    }
    return null;
  };
  if (Array.isArray(body.items)) {
    if (body.items.length > 100) return fail(res, "A maximum of 100 items can be added at once.");
    for (const item of body.items) {
      const err = checkOne(item);
      if (err) return fail(res, err);
    }
    return next();
  }
  const err = checkOne(body);
  if (err) return fail(res, err === "Every item needs a name." ? "Item name is required." : err);
  next();
};

// PATCH /api/shoppinglist/:itemId — strict boolean (fixes Boolean("false")===true bug).
const shoppingUpdate = (req, res, next) => {
  const body = req.body || {};
  if (body.completed !== undefined) {
    const v = body.completed;
    const ok = typeof v === "boolean" || v === 0 || v === 1 ||
      (typeof v === "string" && (v.toLowerCase() === "true" || v.toLowerCase() === "false"));
    if (!ok) return fail(res, "completed must be a boolean.");
  }
  if (body.name !== undefined && (asStr(body.name).trim() === "" || asStr(body.name).length > 240)) {
    return fail(res, "Item names must be 1-240 characters.");
  }
  const q = body.amount !== undefined ? body.amount : body.quantity;
  if (q !== undefined && q !== null && q !== "" &&
      (!isFiniteNumber(q) || toNumber(q) < 0 || toNumber(q) > 1000000)) {
    return fail(res, "Item quantities must be numbers between 0 and 1000000.");
  }
  if (body.unit !== undefined && body.unit !== null && asStr(body.unit).length > 20) {
    return fail(res, "Unit must be 20 characters or fewer.");
  }
  next();
};

// GET /api/recipes/search + / — numeric + length bounds.
const recipeSearch = (req, res, next) => {
  const { maxCalories, maxTime, query, q } = req.query || {};
  const bounds = [["maxCalories", maxCalories, 1, 10000], ["maxTime", maxTime, 1, 600]];
  for (const [key, value, min, max] of bounds) {
    if (value !== undefined && value !== "" && value !== null) {
      const n = toNumber(value);
      if (!Number.isFinite(n) || n < min || n > max) {
        return fail(res, `${key} must be a number between ${min} and ${max}.`);
      }
    }
  }
  for (const [key, value] of [["query", query], ["q", q]]) {
    if (value !== undefined && value !== null && asStr(value).length > 300) {
      return fail(res, `${key} is too long (max 300 characters).`);
    }
  }
  next();
};

module.exports = {
  profileFull, preferencesUpdate, forgotPassword, pantryUpdate,
  mealAdd, mealGenerate, weekQuery, shoppingAdd, shoppingUpdate,
  recipeSearch, idParam, isPositiveInt,
};