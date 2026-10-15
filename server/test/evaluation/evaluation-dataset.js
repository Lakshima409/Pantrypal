// server/test/evaluation/evaluation-dataset.js
// Phase 6: Consistent test dataset for research evaluation.
//
// Loads the dev corpus (database/dev-corpus.*.json) — the same deterministic,
// versioned synthetic data used by generate-dev-corpus.js — and exposes it as
// plain JS objects so every evaluation test runs against the identical dataset.
// No MySQL, no Flask, no network: fully hermetic.

const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.join(__dirname, "..", "..", "..");
const CORPUS_DIR = path.join(ROOT, "database");

function _loadJson(name) {
  const raw = fs.readFileSync(path.join(CORPUS_DIR, name), "utf8");
  return JSON.parse(raw);
}

// ---- Dev corpus recipes ------------------------------------------------------
// Each entry from dev-corpus.recipes.json:
//   [title, [ingredientIndexes...], [tagNames...], calories, protein, fat, carbs]
const RAW_RECIPES = _loadJson("dev-corpus.recipes.json").recipes;
const INGREDIENTS = _loadJson("dev-corpus.ingredients.json").ingredients;
const TAGS = _loadJson("dev-corpus.tags.json").tags;

// ingredient name lookup by index
const INGREDIENT_NAMES = INGREDIENTS.map((ing) => ing[0]);

// Build canonical recipe objects used by all evaluation tests.
const RECIPES = RAW_RECIPES.map((row, idx) => {
  const [title, ingIndexes, tagNames, calories, protein, fat, carbs] = row;
  const ingredientNames = ingIndexes.map((i) => INGREDIENT_NAMES[i] || `unknown-${i}`);
  return {
    id: String(900001 + idx),
    title,
    ingredients: ingredientNames.map((name) => ({ name })),
    tags: tagNames || [],
    nutrition: {
      calories,
      protein,
      fat,
      carbs,
      sodium: 0, // not stored in dev corpus; 0 means "unknown" for compliance checks
    },
    cookTime: ingredientNames.length <= 4 ? 15 : ingredientNames.length <= 8 ? 30 : 45,
    servings: 4,
    sourceDataset: "dev-corpus",
  };
});

const INGREDIENT_LIST = INGREDIENTS.map((ing) => ({
  name: ing[0],
  category: ing[1],
  unit: ing[2],
  caloriesPer100g: ing[3],
  proteinPer100g: ing[4],
  fatPer100g: ing[5],
  carbsPer100g: ing[6],
  sodiumPer100g: ing[7],
}));

const TAG_LIST = TAGS.map((t) => ({ name: t[0], type: t[1] }));

// ---- Standard evaluation scenarios -------------------------------------------
// Each scenario is a self-contained "user" with pantry, preferences, allergies,
// calorie goal, and time-of-day. Used consistently across all metric modules.

const SCENARIOS = {
  // Well-stocked pantry, no restrictions, dinner time.
  wellStockedDinner: {
    userId: "eval-user-1",
    pantry: ["chicken breast", "onion", "garlic", "tomato", "bell pepper", "rice", "olive oil", "salt"],
    preferences: [],
    allergies: [],
    calorieGoal: 2000,
    timeOfDay: "evening",
    expectedMealTypes: ["dinner"],
  },
  // Sparse pantry, vegetarian diet, lunch time.
  sparsePantryLunch: {
    userId: "eval-user-2",
    pantry: ["rice", "onion", "salt"],
    preferences: ["vegetarian"],
    allergies: [],
    calorieGoal: 1800,
    timeOfDay: "midday",
    expectedMealTypes: ["lunch"],
  },
  // Full pantry with allergies (nuts, dairy), breakfast time.
  allergicBreakfast: {
    userId: "eval-user-3",
    pantry: ["egg", "bread", "milk", "butter", "banana", "oats", "honey"],
    preferences: [],
    allergies: ["nut", "dairy"],
    calorieGoal: 2200,
    timeOfDay: "morning",
    expectedMealTypes: ["breakfast"],
  },
  // Expiry-focused: pantry with soon-to-expire items (simulated by names).
  expiryFocused: {
    userId: "eval-user-4",
    pantry: ["spinach", "milk", "chicken breast", "tomato", "bread"],
    preferences: [],
    allergies: [],
    calorieGoal: 2000,
    timeOfDay: "dinner",
    expectedMealTypes: ["dinner"],
    expiringItems: ["spinach", "milk"], // simulate soon-to-expire
  },
  // Keto diet, high protein target.
  ketoDiet: {
    userId: "eval-user-5",
    pantry: ["salmon fillet", "chicken breast", "egg", "butter", "cheddar cheese", "spinach", "broccoli"],
    preferences: ["keto", "high-protein"],
    allergies: [],
    calorieGoal: 2500,
    timeOfDay: "evening",
    expectedMealTypes: ["dinner"],
  },
};

module.exports = {
  RECIPES,
  INGREDIENT_LIST,
  TAG_LIST,
  INGREDIENT_NAMES,
  SCENARIOS,
  recipeCount: () => RECIPES.length,
  ingredientCount: () => INGREDIENT_LIST.length,
  scenario: (name) => SCENARIOS[name],
  allScenarios: () => Object.values(SCENARIOS),
};