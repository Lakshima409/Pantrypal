// Unit tests for the rule-based NLP search (blueprint §37).
// Run: npm test  (node --test)
const test = require("node:test");
const assert = require("node:assert");

const { parse, expandIngredients, INGREDIENT_SYNONYMS } = require("../utils/nlpSearch");

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

// ---- Phase 5: ingredient synonyms ----

test("expands ingredient synonyms in parsed output", () => {
  const r = parse("courgette and aubergine ratatouille");
  assert.ok(r.ingredients.includes("zucchini"), "courgette -> zucchini");
  assert.ok(r.ingredients.includes("eggplant"), "aubergine -> eggplant");
});

test("expands ingredient synonyms via expandIngredients", () => {
  const out = expandIngredients(["courgette", "cilantro", "chicken breast"]);
  assert.ok(out.includes("zucchini"), "courgette -> zucchini");
  assert.ok(out.includes("coriander"), "cilantro -> coriander");
  assert.ok(out.includes("chicken breast"), "kept original");
  // de-duplicated: 5 items (courgette, zucchini, cilantro, coriander, chicken breast)
  assert.strictEqual(new Set(out).size, out.length);
  assert.strictEqual(out.length, 5);
});

test("recognises time-of-day meal hints", () => {
  assert.strictEqual(parse("morning oatmeal").meal, "breakfast");
  assert.strictEqual(parse("midday salad").meal, "lunch");
  assert.strictEqual(parse("evening stew").meal, "dinner");
  assert.strictEqual(parse("late night snack").meal, "snack");
});

test("recognises underscore diet tags", () => {
  const r = parse("dairy_free gluten_free nut_free snacks");
  assert.ok(r.dietary.includes("dairy-free"));
  assert.ok(r.dietary.includes("gluten-free"));
  assert.ok(r.dietary.includes("nut-free"));
});

// ---- SYNONYM_EXPANSIONS sanity (not exported, but INGREDIENT_SYNONYMS is) ----

test("INGREDIENT_SYNONYMS maps known aliases", () => {
  assert.strictEqual(INGREDIENT_SYNONYMS["courgette"], "zucchini");
  assert.strictEqual(INGREDIENT_SYNONYMS["cilantro"], "coriander");
  assert.strictEqual(INGREDIENT_SYNONYMS["aubergine"], "eggplant");
});