// Unit tests for recipe generation service (no network, no API key).
// Run: npm test  (node --test)
const test = require("node:test");
const assert = require("node:assert");

const {
  validateRecipe,
  sanitizeRecipe,
  generateRecipe,
  heuristicRecipe,
  buildPrompt,
} = require("../services/recipeGenerationService");

// ---- validateRecipe ----

const validRecipe = {
  title: "Test Recipe",
  description: "A test",
  servings: 4,
  timeMinutes: 30,
  ingredients: [{ name: "tomato", amount: "2", unit: "pcs" }],
  instructions: ["Chop tomato", "Cook it"],
  tags: ["quick"],
};

test("validateRecipe accepts a valid recipe", () => {
  const r = validateRecipe(validRecipe);
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.reason, undefined);
});

test("validateRecipe rejects missing fields", () => {
  const bad = { ...validRecipe };
  delete bad.title;
  assert.strictEqual(validateRecipe(bad).valid, false);
  assert.ok(validateRecipe(bad).reason.includes("missing field"));

  const bad2 = { ...validRecipe };
  delete bad2.ingredients;
  assert.strictEqual(validateRecipe(bad2).valid, false);

  const bad3 = { ...validRecipe };
  delete bad3.instructions;
  assert.strictEqual(validateRecipe(bad3).valid, false);
});

test("validateRecipe rejects empty title and too-long title", () => {
  assert.strictEqual(validateRecipe({ ...validRecipe, title: "" }).valid, false);
  assert.strictEqual(
    validateRecipe({ ...validRecipe, title: "x".repeat(201) }).valid,
    false
  );
});

test("validateRecipe rejects invalid ingredients", () => {
  assert.strictEqual(
    validateRecipe({ ...validRecipe, ingredients: [] }).valid,
    false
  );
  assert.strictEqual(
    validateRecipe({ ...validRecipe, ingredients: [{ name: "" }] }).valid,
    false
  );
  assert.strictEqual(
    validateRecipe({ ...validRecipe, ingredients: [{ name: "x".repeat(101) }] }).valid,
    false
  );
});

test("validateRecipe rejects invalid instructions", () => {
  assert.strictEqual(
    validateRecipe({ ...validRecipe, instructions: [] }).valid,
    false
  );
  assert.strictEqual(
    validateRecipe({ ...validRecipe, instructions: [""] }).valid,
    false
  );
});

test("validateRecipe rejects out-of-range servings/timeMinutes", () => {
  assert.strictEqual(validateRecipe({ ...validRecipe, servings: 0 }).valid, false);
  assert.strictEqual(validateRecipe({ ...validRecipe, servings: 51 }).valid, false);
  assert.strictEqual(validateRecipe({ ...validRecipe, timeMinutes: 0 }).valid, false);
  assert.strictEqual(validateRecipe({ ...validRecipe, timeMinutes: 481 }).valid, false);
});

test("validateRecipe rejects null/non-object", () => {
  assert.strictEqual(validateRecipe(null).valid, false);
  assert.strictEqual(validateRecipe("string").valid, false);
  assert.strictEqual(validateRecipe(42).valid, false);
});

// ---- sanitizeRecipe ----

test("sanitizeRecipe fills defaults and clamps values", () => {
  const raw = {
    title: "  Spaced Title  ",
    ingredients: [{ name: "  Tomato  ", amount: 5, unit: "  pcs  " }],
    instructions: ["  Step one  ", ""],
    servings: 999,
    timeMinutes: 9999,
  };
  const s = sanitizeRecipe(raw);
  assert.strictEqual(s.title, "Spaced Title");
  assert.strictEqual(s.servings, 50);
  assert.strictEqual(s.timeMinutes, 480);
  assert.strictEqual(s.ingredients[0].name, "Tomato");
  assert.strictEqual(s.ingredients[0].unit, "pcs");
  assert.strictEqual(s.instructions.length, 1);
});

// ---- generateRecipe degrades without LLM config ----

test("generateRecipe returns local fallback without endpoint/key", async () => {
  const result = await generateRecipe(["tomato", "basil"], {});
  assert.strictEqual(result.source, "local-fallback");
  assert.strictEqual(result.validated, true);
  assert.ok(result.recipe.title);
  assert.ok(Array.isArray(result.recipe.ingredients));
  assert.ok(Array.isArray(result.recipe.instructions));
});

test("generateRecipe with no ingredients still returns fallback", async () => {
  const result = await generateRecipe([], {});
  assert.strictEqual(result.recipe.title, "Simple Pantry Recipe");
});

test("generateRecipe passes dietary and servings to fallback", async () => {
  const result = await generateRecipe(["egg"], { dietary: "vegetarian", servings: 2 });
  assert.strictEqual(result.recipe.servings, 2);
  assert.ok(result.recipe.description.includes("egg"));
});

// ---- heuristicRecipe ----

test("heuristicRecipe creates sensible output", () => {
  const r = heuristicRecipe(["tomato", "basil"], { servings: 2 });
  assert.strictEqual(r.title, "Simple tomato Recipe");
  assert.strictEqual(r.servings, 2);
  assert.strictEqual(r.ingredients.length, 2);
  assert.strictEqual(r.instructions.length, 3);
});

// ---- buildPrompt ----

test("buildPrompt includes ingredients and preferences", () => {
  const p = buildPrompt(["tomato"], { dietary: "vegan", servings: 3 });
  assert.ok(p.includes("tomato"));
  assert.ok(p.includes("vegan"));
  assert.ok(p.includes("3"));
});
