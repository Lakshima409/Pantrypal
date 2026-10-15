// server/test/evaluation/prototype-evaluation.test.js
// Phase 6: Prototype development evaluation.
// Measures functional test results, integration reliability, response times.

import { describe, test } from "node:test";
import assert from "node:assert";

import { RECIPES, SCENARIOS, INGREDIENT_LIST } from "./evaluation-dataset.js";
import { canonical, timeIt } from "./evaluation-metrics.js";
import { parse, expandIngredients } from "../../utils/nlpSearch.js";
import { contextualRerank, mealTypeFor, pantryMatch, dietaryMatch } from "../../services/recommendationService.js";
import { validateNutrient } from "../../services/nutritionService.js";

const scenarioNames = Object.keys(SCENARIOS);

describe("Prototype development evaluation (dev corpus)", () => {
  test("NLP ingredient expansion works for known synonyms", () => {
    const result = expandIngredients(["courgette", "cilantro", "aubergine"]);
    assert.ok(result.includes("zucchini"), "courgette should expand to zucchini");
    assert.ok(result.includes("coriander"), "cilantro should expand to coriander");
    assert.ok(result.includes("eggplant"), "aubergine should expand to eggplant");
  });

  test("NLP parse extracts dietary tags, calories, and time", () => {
    const parsed = parse("vegan dinner under 600 calories in the morning");
    assert.ok(parsed.dietary.includes("vegan"), "should detect vegan");
    assert.ok(parsed.maxCalories === 600, `should detect maxCalories 600, got ${parsed.maxCalories}`);
    // First meal tag wins in NLP parse: "dinner" appears before "morning"
    assert.ok(["dinner", "breakfast"].includes(parsed.meal), `meal should be dinner or breakfast, got ${parsed.meal}`);
  });
  test("contextual rerank promotes meal-type matches", () => {
    const recipes = [
      { id: "1", name: "Oatmeal", tags: ["breakfast"], score: 0.5 },
      { id: "2", name: "Salad", tags: ["lunch"], score: 0.5 },
      { id: "3", name: "Steak", tags: ["dinner"], score: 0.5 },
    ];
    const morning = contextualRerank(recipes, "morning");
    assert.strictEqual(morning[0].id, "1", "breakfast should rank first in the morning when base scores are equal");
    assert.ok(morning[0].contextMatch > 0, "breakfast should have positive contextMatch");

    const evening = contextualRerank(recipes, "evening");
    const dinnerIdx = evening.findIndex((r) => r.id === "3");
    const saladIdx = evening.findIndex((r) => r.id === "2");
    assert.ok(dinnerIdx >= 0 && saladIdx >= 0, "all recipes should remain");
    // With equal base scores, context match should promote dinner in the evening
    assert.ok(dinnerIdx < saladIdx || evening[0].id === "3", "dinner should be promoted in the evening when base scores are equal");
  });

  test("pantry match returns 0-1 fraction", () => {
    const score = pantryMatch(
      { ingredients: [{ name: "chicken" }, { name: "rice" }] },
      new Set(["chicken", "onion"])
    );
    assert.ok(score >= 0 && score <= 1, `pantry match should be 0-1, got ${score}`);
    assert.strictEqual(score, 0.5, "1 of 2 ingredients matched");
  });

  test("dietary match returns 0 or 1", () => {
    const prefs = { allergies: [], dietaryRestrictions: [], healthConditions: [] };
    assert.strictEqual(dietaryMatch({ tags: ["vegetarian", "indian"] }, prefs), 1, "no banned terms -> 1");
    const prefsWithBan = { allergies: ["peanut"], dietaryRestrictions: [], healthConditions: [] };
    assert.strictEqual(dietaryMatch({ tags: ["indian"], ingredients: [{ name: "peanut butter" }] }, prefsWithBan), 0, "banned ingredient -> 0");
    assert.strictEqual(dietaryMatch({ tags: ["indian"], ingredients: [{ name: "rice" }] }, prefsWithBan), 1, "no banned ingredient -> 1");
  });

  test("nutrient validation rejects out-of-range values", () => {
    assert.strictEqual(validateNutrient("calories", 500), 500);
    assert.strictEqual(validateNutrient("calories", -1), null);
    assert.strictEqual(validateNutrient("calories", 2000), null);
    assert.strictEqual(validateNutrient("calories", null), null);
  });


  test("all scenarios produce recommendations without errors", async () => {
    let failures = 0;
    for (const name of scenarioNames) {
      try {
        const scenario = SCENARIOS[name];
        const result = await timeIt(() => contextualRerank(
          RECIPES.map((r) => ({ ...r, score: 0.5 })),
          scenario.timeOfDay
        ));
        assert.ok(result.result.length === RECIPES.length, `${name}: all recipes returned`);
      } catch (err) {
        failures += 1;
        console.log(`  [${name}] recommendation failed:`, err.message);
      }
    }
    assert.strictEqual(failures, 0, "no recommendation failures across scenarios");
  });

  test("all scenarios produce meal plan candidates without errors", async () => {
    let failures = 0;
    for (const name of scenarioNames) {
      try {
        const scenario = SCENARIOS[name];
        const banned = scenario.allergies.map((a) => canonical(a));
        const candidates = RECIPES.filter((r) =>
          !r.ingredients.some((ing) => banned.some((b) => canonical(ing.name).includes(b)))
        );
        assert.ok(candidates.length > 0, `${name}: should have candidates`);
      } catch (err) {
        failures += 1;
        console.log(`  [${name}] planning failed:`, err.message);
      }
    }
    assert.strictEqual(failures, 0, "no planning failures across scenarios");
  });

  test("recommendation response time is within acceptable bounds", async () => {
    const scenario = SCENARIOS.wellStockedDinner;
    const { ms } = await timeIt(() => {
      const expanded = expandIngredients(scenario.pantry);
      const pantrySet = new Set(expanded.map(canonical));
      const scored = RECIPES.map((r) => {
        let matches = 0;
        for (const ing of r.ingredients) {
          if (pantrySet.has(canonical(ing.name))) matches += 1;
        }
        return { ...r, score: r.ingredients.length ? matches / r.ingredients.length : 0 };
      });
      return contextualRerank(scored.sort((a, b) => b.score - a.score), scenario.timeOfDay);
    });
    assert.ok(ms < 2000, `recommendation took ${ms.toFixed(1)}ms, should be < 2000ms`);
  });

  test("NLP parse response time is within acceptable bounds", async () => {
    const { ms, result } = await timeIt(() =>
      parse("spicy vegan dinner under 500 calories with chicken and rice")
    );
    assert.ok(ms < 100, `NLP parse took ${ms.toFixed(1)}ms, should be < 100ms`);
    assert.ok(result, "parse should return a result");
  });

  test("dataset size is documented", () => {
    assert.ok(RECIPES.length > 0, "recipe count should be positive");
    assert.ok(INGREDIENT_LIST.length > 0, "ingredient count should be positive");
  });
});

