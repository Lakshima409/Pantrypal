// server/test/validation-security.test.js
// Phase 2 — server-side validation + auth hardening tests (no DB needed).
// Part 1: profile + backend input validation (valid requests still pass).
const test = require("node:test");
const assert = require("node:assert");

const vx = require("../middleware/validateExtended");
const validate = require("../middleware/validateInput");

function mockReq({ body, params, query } = {}) {
  return {
    body, params: params || {}, query: query || {},
    headers: {}, cookies: {}, ip: "127.0.0.1", baseUrl: "",
    path: "/", originalUrl: "/",
  };
}
function mockRes() {
  const res = { statusCode: 200, body: null, headers: {} };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.body = obj; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  return res;
}
function run(mw, req) {
  const res = mockRes();
  let passed = false;
  mw(req, res, () => { passed = true; });
  return { res, passed };
}

test("profile: name length enforced", () => {
  const bad = run(validate.profileUpdate, mockReq({ body: { name: "A" } }));
  assert.strictEqual(bad.passed, false);
  assert.strictEqual(bad.res.statusCode, 400);
  const ok = run(validate.profileUpdate, mockReq({ body: { name: "Ada Lovelace" } }));
  assert.strictEqual(ok.passed, true);
});

test("profile: valid email passes, invalid rejected", () => {
  const bad = run(validate.profileUpdate, mockReq({ body: { email: "not-an-email" } }));
  assert.strictEqual(bad.res.statusCode, 400);
  const ok = run(validate.profileUpdate, mockReq({ body: { email: "ada@example.com" } }));
  assert.strictEqual(ok.passed, true);
});

test("profile: age bounds validated only when present", () => {
  assert.strictEqual(run(vx.profileFull, mockReq({ body: { age: 5 } })).res.statusCode, 400);
  assert.strictEqual(run(vx.profileFull, mockReq({ body: { age: 200 } })).res.statusCode, 400);
  assert.strictEqual(run(vx.profileFull, mockReq({ body: { age: 34 } })).passed, true);
  assert.strictEqual(run(vx.profileFull, mockReq({ body: {} })).passed, true);
});

test("profile: bio length validated only when present", () => {
  const bad = run(vx.profileFull, mockReq({ body: { bio: "x".repeat(501) } }));
  assert.strictEqual(bad.res.statusCode, 400);
  assert.strictEqual(run(vx.profileFull, mockReq({ body: { bio: "Home cook." } })).passed, true);
});

test("profile: arrays, skill, diet enum, calories validated", () => {
  assert.strictEqual(run(vx.profileFull, mockReq({ body: { allergies: "peanuts" } })).res.statusCode, 400);
  assert.strictEqual(run(vx.profileFull, mockReq({ body: { skill: "master" } })).res.statusCode, 400);
  assert.strictEqual(run(vx.profileFull, mockReq({ body: { diet: "carnivore" } })).res.statusCode, 400);
  assert.strictEqual(run(vx.profileFull, mockReq({ body: { calories: 50 } })).res.statusCode, 400);
  const ok = run(vx.profileFull, mockReq({ body: {
    diet: "vegan", skill: "beginner", allergies: ["peanuts"], calories: "2000",
  } }));
  assert.strictEqual(ok.passed, true);
});

test("pantry: name required, quantity numeric + bounded", () => {
  assert.strictEqual(run(validate.pantryItem, mockReq({ body: { quantity: 2 } })).res.statusCode, 400);
  assert.strictEqual(run(validate.pantryItem, mockReq({ body: { name: "Eggs", quantity: "lots" } })).res.statusCode, 400);
  assert.strictEqual(run(vx.pantryUpdate, mockReq({ body: { quantity: -5 } })).res.statusCode, 400);
  assert.strictEqual(run(validate.pantryItem, mockReq({ body: { name: "Eggs", quantity: 2 } })).passed, true);
});

test("path params: non-integer ids rejected", () => {
  for (const p of ["id", "mealId", "itemId"]) {
    assert.strictEqual(run(vx.idParam(p), mockReq({ params: { [p]: "abc" } })).res.statusCode, 400);
    assert.strictEqual(run(vx.idParam(p), mockReq({ params: { [p]: "7" } })).passed, true);
  }
});

test("mealplan: day + mealType enums, calorieGoal bounds", () => {
  assert.strictEqual(run(vx.mealAdd, mockReq({ body: { recipeId: 3 } })).res.statusCode, 400);
  assert.strictEqual(run(vx.mealAdd, mockReq({ body: { recipeId: 3, day: "Funday" } })).res.statusCode, 400);
  assert.strictEqual(run(vx.mealAdd, mockReq({ body: { recipeId: "x", day: "Monday" } })).res.statusCode, 400);
  assert.strictEqual(run(vx.mealAdd, mockReq({ body: { recipeId: 3, day: "Monday", mealType: "brunch" } })).res.statusCode, 400);
  assert.strictEqual(run(vx.mealGenerate, mockReq({ body: { calorieGoal: 100 } })).res.statusCode, 400);
  assert.strictEqual(run(vx.mealAdd, mockReq({ body: { recipeId: 3, day: "Monday", mealType: "dinner" } })).passed, true);
});

test("shopping: batch + strict completed boolean", () => {
  assert.strictEqual(run(vx.shoppingAdd, mockReq({ body: { items: [{ name: "" }] } })).res.statusCode, 400);
  assert.strictEqual(run(vx.shoppingUpdate, mockReq({ body: { completed: "yes" } })).res.statusCode, 400);
  assert.strictEqual(run(vx.shoppingUpdate, mockReq({ body: { completed: "false" } })).passed, true);
  assert.strictEqual(run(vx.shoppingAdd, mockReq({ body: { name: "Milk", quantity: 1, unit: "l" } })).passed, true);
});

test("recipes: query length + numeric bounds", () => {
  assert.strictEqual(run(vx.recipeSearch, mockReq({ query: { maxCalories: "abc" } })).res.statusCode, 400);
  assert.strictEqual(run(vx.recipeSearch, mockReq({ query: { maxTime: 9999 } })).res.statusCode, 400);
  assert.strictEqual(run(vx.recipeSearch, mockReq({ query: { q: "x".repeat(301) } })).res.statusCode, 400);
  assert.strictEqual(run(vx.recipeSearch, mockReq({ query: { q: "vegan dinner" } })).passed, true);
});
