// Unit tests for the pantry-aware shopping-list math (blueprint §30-31).
// Run: npm test  (node --test)
const test = require("node:test");
const assert = require("node:assert");

const { toBase, fromBase } = require("../models/ShoppingList");

test("mass units convert to grams", () => {
  assert.strictEqual(toBase(1, "kg").amount, 1000);
  assert.strictEqual(toBase(500, "g").amount, 500);
  assert.strictEqual(toBase(1, "kg").base, toBase(500, "g").base);
  const lb = toBase(1, "lb").amount;
  assert.ok(Math.abs(lb - 453.592) < 0.01);
});

test("volume units convert to millilitres", () => {
  assert.strictEqual(toBase(1, "l").amount, 1000);
  assert.strictEqual(toBase(2, "cup").amount, 2 * 236.588);
  assert.strictEqual(toBase(1, "tbsp").base, toBase(3, "tsp").base);
});

test("unknown units compare literally", () => {
  assert.strictEqual(toBase(2, "pinch").base, "pinch");
  assert.strictEqual(toBase(2, "").base, "each");
});

test("pantry subtraction arithmetic uses base units", () => {
  // recipe needs 332.16 g, pantry has 166 g → missing 166.16 g
  const need = toBase(332.16, "g").amount;
  const have = toBase(166, "g").amount;
  const missing = Math.max(0, need - have);
  assert.ok(Math.abs(missing - 166.16) < 0.001);
  // recipe needs 1 kg, pantry has 1200 g → fully covered (0 missing)
  assert.strictEqual(Math.max(0, toBase(1, "kg").amount - toBase(1200, "g").amount), 0);
});

test("fromBase picks human-friendly units", () => {
  assert.deepStrictEqual(fromBase(2500, "g"), { quantity: 2.5, unit: "kg" });
  assert.deepStrictEqual(fromBase(1500, "ml"), { quantity: 1.5, unit: "l" });
  assert.deepStrictEqual(fromBase(450, "g"), { quantity: 450, unit: "g" });
});
