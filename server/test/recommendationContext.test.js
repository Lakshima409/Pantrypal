// Unit tests for context-aware recommendations (no network, no DB).
// Run: npm test  (node --test)
const test = require("node:test");
const assert = require("node:assert");

const { contextualRerank, mealTypeFor } = require("../services/recommendationService");

const baseRecipes = [
  { id: 1, name: "Breakfast Oatmeal", tags: ["breakfast"], score: 0.9 },
  { id: 2, name: "Grilled Chicken Salad", tags: ["lunch"], score: 0.85 },
  { id: 3, name: "Beef Stew", tags: ["dinner"], score: 0.8 },
  { id: 4, name: "Fruit Salad", tags: ["snack"], score: 0.75 },
  { id: 5, name: "Chocolate Cake", tags: ["dessert"], score: 0.7 },
  { id: 6, name: "Plain Rice", tags: [], score: 0.6 }, // no meal tags
];

// ---- mealTypeFor ----

test("mealTypeFor maps time-of-day to meal types", () => {
  assert.deepStrictEqual(mealTypeFor("morning"), ["breakfast", "brunch"]);
  assert.deepStrictEqual(mealTypeFor("midday"), ["lunch", "brunch"]);
  assert.deepStrictEqual(mealTypeFor("evening"), ["dinner", "supper"]);
  assert.deepStrictEqual(mealTypeFor("night"), ["dinner", "snack"]);
  assert.deepStrictEqual(mealTypeFor("late night"), ["snack", "dessert"]);
  assert.deepStrictEqual(mealTypeFor("suppertime"), ["dinner", "supper"]);
  assert.strictEqual(mealTypeFor("unknown"), null);
  assert.strictEqual(mealTypeFor(""), null);
});

// ---- contextualRerank ----

test("contextualRerank promotes matching meal types in the morning", () => {
  const result = contextualRerank(baseRecipes, "morning");
  assert.ok(result[0].id === 1, `expected oatmeal first, got ${result[0].name}`);
  assert.ok(result[0].contextMatch > 0);
  assert.ok(result[0].contextualScore >= result[1].contextualScore);
});

test("contextualRerank promotes dinner in the evening", () => {
  const result = contextualRerank(baseRecipes, "evening");
  const dinnerIndex = result.findIndex((r) => r.id === 3);
  const oatIndex = result.findIndex((r) => r.id === 1);
  assert.ok(dinnerIndex < oatIndex, `expected beef stew before oatmeal in evening`);
});

test("contextualRerank adds contextMatch and contextualScore to all items", () => {
  const result = contextualRerank(baseRecipes, "midday");
  for (const r of result) {
    assert.ok(typeof r.contextMatch === "number");
    assert.ok(typeof r.contextualScore === "number");
    assert.ok(r.contextMatch >= 0 && r.contextMatch <= 1);
  }
});

test("contextualRerank with null timeOfDay keeps original order with contextMatch 0", () => {
  const result = contextualRerank(baseRecipes, null);
  assert.strictEqual(result[0].id, 1);
  assert.strictEqual(result[1].id, 2);
  for (const r of result) assert.strictEqual(r.contextMatch, 0);
  assert.strictEqual(result[0].contextualScore, result[0].score);
});

test("contextualRerank with empty array returns empty", () => {
  assert.deepStrictEqual(contextualRerank([], "morning"), []);
});

test("contextualRerank does not mutate original recipes", () => {
  const before = baseRecipes.map((r) => ({ ...r }));
  contextualRerank(baseRecipes, "morning");
  assert.deepStrictEqual(baseRecipes, before);
});
