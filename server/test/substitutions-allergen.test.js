// server/test/substitutions-allergen.test.js
// Phase 4 — allergen guard for ingredient substitutions (pure function).
const test = require("node:test");
const assert = require("node:assert");

const { filterSubstitutes } = require("../models/Substitution");

const SUBS = [
  { name: "almond butter", closeness: 0.9 },
  { name: "soy milk", closeness: 0.8 },
  { name: "coconut cream", closeness: 0.7 },
  { name: "peanut oil", closeness: 0.6 },
];

test("no banned terms → substitutes untouched", () => {
  assert.deepStrictEqual(filterSubstitutes(SUBS, []), SUBS);
  assert.deepStrictEqual(filterSubstitutes(SUBS, null), SUBS);
});

test("allergen term drops matching substitutes (case-insensitive)", () => {
  const out = filterSubstitutes(SUBS, ["peanut"]);
  assert.ok(!out.some((s) => s.name.includes("peanut")));
  assert.ok(out.some((s) => s.name === "soy milk"));
});

test("plural allergy term still matches singular substitute name", () => {
  // UI allergy list uses "peanuts"; substitute data says "peanut oil".
  const out = filterSubstitutes(SUBS, ["peanuts"]);
  assert.ok(!out.some((s) => s.name.includes("peanut")));
});

test("multiple bans compose", () => {
  const out = filterSubstitutes(SUBS, ["peanut", "almond"]);
  assert.ok(!out.some((s) => s.name.includes("peanut")));
  assert.ok(!out.some((s) => s.name.includes("almond")));
  assert.strictEqual(out.length, 2);
});

test("all substitutes banned → empty list (fail safe)", () => {
  const out = filterSubstitutes([{ name: "peanut butter" }], ["peanut"]);
  assert.deepStrictEqual(out, []);
});
