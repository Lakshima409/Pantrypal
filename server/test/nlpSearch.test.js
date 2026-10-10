// Unit tests for the rule-based NLP search (blueprint §37).
// Run: npm test  (node --test)
const test = require("node:test");
const assert = require("node:assert");

const { parse } = require("../utils/nlpSearch");

test("parses diet + meal + calorie cap", () => {
  const r = parse("spicy vegan dinner under 500 calories");
  assert.deepStrictEqual(r.dietary.sort(), ["dinner", "vegan"]);
  assert.strictEqual(r.maxCalories, 500);
  assert.strictEqual(r.meal, "dinner");
  assert.ok(r.query.includes("spicy"));
});

test("parses dairy-free exclusion with expansions", () => {
  const r = parse("Find a dairy-free low-carb dinner under 500 calories.");
  assert.ok(r.dietary.includes("dairy-free"));
  assert.ok(r.dietary.includes("low-carb"));
  assert.ok(r.exclude.includes("milk"));
  assert.strictEqual(r.maxCalories, 500);
});

test("parses cook time in minutes and hours", () => {
  assert.strictEqual(parse("pasta in 20 mins").maxTime, 20);
  assert.strictEqual(parse("slow stew 1 hour").maxTime, 60);
  assert.strictEqual(parse("quick lunch").maxTime, 20);
});

test("parses without/no/avoid exclusions", () => {
  const r = parse("chicken curry without peanuts and shellfish");
  assert.ok(r.exclude.includes("peanuts"));
  assert.ok(r.exclude.includes("shellfish"));
  assert.ok(r.ingredients.includes("chicken") || r.ingredients.includes("curry"));
});

test("empty and noise input degrades gracefully", () => {
  const r = parse("show me something tasty please");
  assert.strictEqual(r.query, "");
  assert.deepStrictEqual(r.dietary, []);
  assert.strictEqual(r.maxCalories, null);
  const e = parse("");
  assert.strictEqual(e.query, "");
});