// Unit tests for NLP-aware recipe post-filters (blueprint §37).
// Run: npm test  (node --test)
const test = require("node:test");
const assert = require("node:assert");

const { mergeSearch, applyExclude, applyMaxCalories, applyParsedFilters } = require("../utils/recipeFilters");

const R = (title, names, calories) => ({
  title,
  ingredients: (names || []).map((n) => ({ name: n })),
  nutrition: calories === undefined ? null : { calories },
  tags: [],
});

test("explicit params win over NLP-derived ones", () => {
  const m = mergeSearch(
    { query: "pasta", dietary: ["vegan"], ingredients: ["tomato"], exclude: ["milk"], maxCalories: 500, maxTime: 30 },
    { query: "soup", maxCalories: "400" }
  );
  assert.strictEqual(m.query, "soup");
  assert.strictEqual(m.maxCalories, 400);
  assert.deepStrictEqual(m.dietary, ["vegan"]); // explicit empty -> parsed stands
  assert.ok(m.exclude.includes("milk"));
});

test("exclude removes recipes mentioning the term, word-boundaried", () => {
  const list = [R("Peanut Noodles", ["peanut", "noodles"]), R("Chicken Rice", ["chicken", "rice"])];
  const out = applyExclude(list, ["peanut"]);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].title, "Chicken Rice");
});

test("maxCalories prunes but keeps unknown-nutrition recipes", () => {
  const list = [R("A", [], 650), R("B", [], 300), R("C", [])];
  const out = applyMaxCalories(list, 500);
  assert.deepStrictEqual(out.map((r) => r.title), ["B", "C"]);
});

test("applyParsedFilters composes exclude + calories", () => {
  const list = [R("Peanut Curry", ["peanut"], 700), R("Veggie Soup", ["carrot"], 250)];
  const out = applyParsedFilters(list, { exclude: ["peanut"], maxCalories: 500 });
  assert.deepStrictEqual(out.map((r) => r.title), ["Veggie Soup"]);
});

test("no filters returns the list untouched", () => {
  const list = [R("A", [], 900)];
  assert.strictEqual(applyParsedFilters(list, {}).length, 1);
  assert.strictEqual(applyParsedFilters(list, null).length, 1);
});