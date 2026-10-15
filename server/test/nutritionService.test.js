// Unit tests for the nutrition enrichment service (no network; API key not set).
// Run: npm test  (node --test)
const test = require("node:test");
const assert = require("node:assert");

const {
  validateNutrient,
  normaliseUsdaFood,
  enrichIngredient,
  isEnabled,
  cacheStats,
} = require("../services/nutritionService");

// ---- validateNutrient ----

test("validateNutrient accepts in-range values", () => {
  assert.strictEqual(validateNutrient("calories", 250), 250);
  assert.strictEqual(validateNutrient("protein", 10.5), 10.5);
  assert.strictEqual(validateNutrient("fat", 5), 5);
  assert.strictEqual(validateNutrient("carbs", 20), 20);
  assert.strictEqual(validateNutrient("sodium", 120), 120);
});

test("validateNutrient rejects out-of-range and invalid values", () => {
  assert.strictEqual(validateNutrient("calories", -1), null);
  assert.strictEqual(validateNutrient("calories", 1000), null); // above 900
  assert.strictEqual(validateNutrient("protein", 200), null); // above 100
  assert.strictEqual(validateNutrient("fat", "not-a-number"), null);
  assert.strictEqual(validateNutrient("carbs", null), null);
  assert.strictEqual(validateNutrient("sodium", undefined), null);
  assert.strictEqual(validateNutrient("unknown", 5), null); // no bounds defined
});

test("validateNutrient rounds to 2 decimals", () => {
  assert.strictEqual(validateNutrient("calories", 250.333), 250.33);
  assert.strictEqual(validateNutrient("protein", 10.555), 10.56);
});

// ---- normaliseUsdaFood ----

test("normaliseUsdaFood returns null for missing fdcId", () => {
  assert.strictEqual(normaliseUsdaFood(null), null);
  assert.strictEqual(normaliseUsdaFood({}), null);
  assert.strictEqual(normaliseUsdaFood({ description: "apple" }), null);
});

test("normaliseUsdaFood extracts nutrients from USDA shape", () => {
  const food = {
    fdcId: 12345,
    description: "Raw apple",
    foodNutrients: [
      { nutrient: { name: "Energy" }, amount: 52 },
      { nutrient: { name: "Protein" }, amount: 0.3 },
      { nutrient: { name: "Total lipid (fat)" }, amount: 0.2 },
      { nutrient: { name: "Carbohydrate, by difference" }, amount: 14 },
      { nutrient: { name: "Sodium" }, amount: 1 },
    ],
  };
  const norm = normaliseUsdaFood(food);
  assert.strictEqual(norm.fdcId, 12345);
  assert.strictEqual(norm.name, "Raw apple");
  assert.strictEqual(norm.caloriesPer100g, 52);
  assert.strictEqual(norm.proteinPer100g, 0.3);
  assert.strictEqual(norm.fatPer100g, 0.2);
  assert.strictEqual(norm.carbsPer100g, 14);
  assert.strictEqual(norm.sodiumPer100g, 1);
  assert.strictEqual(norm.source, "usda");
});

test("normaliseUsdaFood returns null when calories missing", () => {
  const food = {
    fdcId: 999,
    description: "water",
    foodNutrients: [
      { nutrient: { name: "Protein" }, amount: 0 },
      { nutrient: { name: "Fat" }, amount: 0 },
    ],
  };
  assert.strictEqual(normaliseUsdaFood(food), null);
});

test("normaliseUsdaFood handles alternative nutrient shapes", () => {
  const food = {
    fdcId: 777,
    description: "alt food",
    foodNutrients: [
      { nutrientName: "Energy", value: 100 },
      { nutrientName: "Protein", value: 5 },
    ],
  };
  const norm = normaliseUsdaFood(food);
  assert.strictEqual(norm.caloriesPer100g, 100);
  assert.strictEqual(norm.proteinPer100g, 5);
  assert.strictEqual(norm.fatPer100g, null);
});

// ---- isEnabled / cacheStats ----

test("isEnabled returns false when no API key", () => {
  // API key is not set in this test environment.
  assert.strictEqual(isEnabled(), false);
});

test("cacheStats returns shape", () => {
  const stats = cacheStats();
  assert.ok(typeof stats.size === "number");
  assert.ok(typeof stats.enabled === "boolean");
});

// ---- enrichIngredient degrades gracefully without API key ----

test("enrichIngredient returns null without API key", async () => {
  const result = await enrichIngredient({ name: "apple" });
  assert.strictEqual(result, null);
  const result2 = await enrichIngredient({ fdcId: 12345 });
  assert.strictEqual(result2, null);
  const result3 = await enrichIngredient({});
  assert.strictEqual(result3, null);
});
