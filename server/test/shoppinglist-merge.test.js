// server/test/shoppinglist-merge.test.js
// Phase 4 — pure shopping-list math: cross-recipe merging, pantry deduction,
// incompatible-unit safety. No MySQL required.
const test = require("node:test");
const assert = require("node:assert");

const {
  aggregateRequired,
  applyPantryDeduction,
  buildListValues,
} = require("../models/ShoppingList");

const row = (ingredient_id, quantity, unit, name = "x", category = "other") => ({
  ingredient_id, quantity, unit, name, category,
});

test("merge: convertible units combine into one base entry", () => {
  // 1 kg + 500 g of ingredient 7 → single 1500 g entry.
  const required = aggregateRequired([
    row(7, 1, "kg", "flour"),
    row(7, 500, "g", "flour"),
  ]);
  assert.strictEqual(required.size, 1);
  const entry = required.get("7::g");
  assert.ok(entry);
  assert.strictEqual(entry.amount, 1500);
});

test("merge: duplicates across recipes sum (l + ml)", () => {
  const required = aggregateRequired([
    row(9, 2, "cup", "milk"),      // 2 × 236.588 ml
    row(9, 500, "ml", "milk"),
  ]);
  const entry = required.get("9::ml");
  assert.ok(Math.abs(entry.amount - (2 * 236.588 + 500)) < 1e-6);
});

test("incompatible units never combine (g vs cup vs literal)", () => {
  const required = aggregateRequired([
    row(3, 100, "g", "butter"),
    row(3, 1, "cup", "butter"),     // volume — different base
    row(3, 2, "pinch", "butter"),   // unknown — literal base
  ]);
  assert.strictEqual(required.size, 3);
  assert.ok(required.get("3::g"));
  assert.ok(required.get("3::ml"));
  assert.ok(required.get("3::pinch"));
});

test("pantry deduction: convertible stock subtracts, clamped at 0", () => {
  const required = aggregateRequired([row(7, 332.16, "g", "flour")]);
  applyPantryDeduction(required, [{ ingredient_id: 7, quantity: 166, unit: "g" }]);
  assert.ok(Math.abs(required.get("7::g").amount - 166.16) < 1e-6);

  const req2 = aggregateRequired([row(8, 100, "g", "sugar")]);
  applyPantryDeduction(req2, [{ ingredient_id: 8, quantity: 2, unit: "kg" }]); // over-cover
  assert.strictEqual(req2.get("8::g").amount, 0); // never negative (§30)
});

test("pantry deduction: incompatible stock unit is NOT deducted", () => {
  // Recipe needs 100 g; pantry has 1 cup (=236.588 ml, different base).
  // Deducting would be wrong-unit arithmetic — the helper must skip it.
  const required = aggregateRequired([row(7, 100, "g", "flour")]);
  applyPantryDeduction(required, [{ ingredient_id: 7, quantity: 1, unit: "cup" }]);
  assert.strictEqual(required.get("7::g").amount, 100);
});

test("buildListValues: fully-covered dropped, missing kept with pretty units", () => {
  const required = aggregateRequired([
    row(1, 2500, "g", "meat", "meat"),   // → 2.5 kg display
    row(2, 50, "g", "salt", "spice"),
  ]);
  applyPantryDeduction(required, [{ ingredient_id: 2, quantity: 50, unit: "g" }]);
  const values = buildListValues(required, 42);
  assert.strictEqual(values.length, 1); // salt fully covered → dropped
  const [listId, ingredientId, quantity, unit] = values[0];
  assert.strictEqual(listId, 42);
  assert.strictEqual(ingredientId, 1);
  assert.strictEqual(quantity, 2.5);
  assert.strictEqual(unit, "kg");
});

test("full pipeline: merge across recipes then subtract pantry", () => {
  const required = aggregateRequired([
    row(5, 0.5, "kg", "onion"),   // 500 g
    row(5, 250, "g", "onion"),    // → 750 g total
  ]);
  applyPantryDeduction(required, [{ ingredient_id: 5, quantity: 0.25, unit: "kg" }]); // 250 g
  const values = buildListValues(required, 1);
  assert.strictEqual(values.length, 1);
  // 500 g remaining stays in grams (fromBase only switches to kg at ≥1000).
  assert.strictEqual(values[0][2], 500);
  assert.strictEqual(values[0][3], "g");
});
