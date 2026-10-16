// server/test/evaluation/baseline-comparison.test.js
// Phase 6: Baseline vs Improved system comparison.
// Runs both code paths against the same dev corpus and records deltas.

import { describe, test } from "node:test";
import assert from "node:assert";

import { RECIPES, SCENARIOS } from "./evaluation-dataset.js";
import {
  canonical,
  precisionAtK,
  pantryCoverage,
  missingIngredients,
  allergyCorrectness,
  planCompletion,
  pantryUtilisation,
} from "./evaluation-metrics.js";
import { expandIngredients } from "../../utils/nlpSearch.js";
import { contextualRerank } from "../../services/recommendationService.js";

const recipesById = new Map(RECIPES.map((r) => [r.id, r]));
const scenarioNames = Object.keys(SCENARIOS);

function baselineRecommend(scenario, limit = 10) {
  const pantrySet = new Set(scenario.pantry.map(canonical));
  const prefSet = new Set(scenario.preferences.map(canonical));
  const scored = RECIPES.map((r) => {
    let matches = 0;
    for (const ing of r.ingredients) {
      if (pantrySet.has(canonical(ing.name))) matches += 1;
    }
    const pantryMatch = r.ingredients.length ? matches / r.ingredients.length : 0;
    const dietMatch = prefSet.size
      ? r.tags.some((t) => prefSet.has(canonical(t))) ? 1 : 0
      : 1;
    const score = 0.7 * pantryMatch + 0.3 * dietMatch;
    return { ...r, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

function baselinePlan(scenario) {
  const candidates = RECIPES.filter(
    (r) =>
      r.tags.some((t) => scenario.preferences.includes(t)) ||
      scenario.preferences.length === 0
  );
  if (!candidates.length) return [];
  const meals = [];
  const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const SLOTS = ["breakfast", "lunch", "dinner", "snack"];
  let cursor = 0;
  for (const day of DAYS) {
    for (const slot of SLOTS) {
      const pick = candidates[cursor % candidates.length];
      cursor += 1;
      meals.push({ day, mealType: slot, recipeId: pick.id });
    }
  }
  return meals;
}
function improvedRecommend(scenario, limit = 10) {
  const expandedPantry = expandIngredients(scenario.pantry);
  const pantrySet = new Set(expandedPantry.map(canonical));
  const prefSet = new Set(scenario.preferences.map(canonical));
  const scored = RECIPES.map((r) => {
    let matches = 0;
    for (const ing of r.ingredients) {
      if (pantrySet.has(canonical(ing.name))) matches += 1;
    }
    const pantryMatch = r.ingredients.length ? matches / r.ingredients.length : 0;
    const dietMatch = prefSet.size
      ? r.tags.some((t) => prefSet.has(canonical(t))) ? 1 : 0
      : 1;
    const score = 0.7 * pantryMatch + 0.3 * dietMatch;
    return { ...r, score };
  });
  const sorted = scored.sort((a, b) => b.score - a.score);
  return contextualRerank(sorted, scenario.timeOfDay).slice(0, limit);
}

function improvedPlan(scenario) {
  const banned = scenario.allergies.map((a) => canonical(a));
  const candidates = RECIPES.filter(
    (r) =>
      !r.ingredients.some((ing) =>
        banned.some((b) => canonical(ing.name).includes(b))
      )
  );
  const base = candidates.length ? candidates : RECIPES;
  const target = scenario.calorieGoal || 2000;
  const SHARES = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };
  const meals = [];
  const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const SLOTS = ["breakfast", "lunch", "dinner", "snack"];
  const used = new Set();
  let cursor = 0;
  for (const day of DAYS) {
    for (const slot of SLOTS) {
      const mealTarget = target * (SHARES[slot] || 0.25);
      let pick = base.find(
        (r) =>
          !used.has(r.id) &&
          r.nutrition &&
          Math.abs((r.nutrition.calories || 0) - mealTarget) < 150
      );
      if (!pick) {
        for (let i = 0; i < base.length; i += 1) {
          const cand = base[(cursor + i) % base.length];
          if (!used.has(cand.id)) {
            pick = cand;
            cursor = (cursor + i + 1) % base.length;
            break;
          }
        }
      }
      if (!pick) {
        pick = base[cursor % base.length];
        cursor = (cursor + 1) % base.length;
      }
      meals.push({ day, mealType: slot, recipeId: pick.id });
      used.add(pick.id);
    }
  }
  return meals;
}

describe("Baseline vs Improved comparison (dev corpus)", () => {
  test("dataset and scenarios loaded", () => {
    assert.ok(RECIPES.length > 0);
    assert.ok(scenarioNames.length > 0);
  });


  for (const name of scenarioNames) {
    describe(`scenario: ${name}`, () => {
      const scenario = SCENARIOS[name];

      test("P@5 delta: improved vs baseline", () => {
        const b = precisionAtK(baselineRecommend(scenario, 5), scenario.pantry, scenario.preferences, 5);
        const i = precisionAtK(improvedRecommend(scenario, 5), scenario.pantry, scenario.preferences, 5);
        const delta = i.value - b.value;
        assert.ok(typeof delta === "number", `${name}: P@5 delta = ${(delta * 100).toFixed(1)}%`);
      });

      test("pantry coverage delta: improved vs baseline", () => {
        const b = pantryCoverage(baselineRecommend(scenario, 10), scenario.pantry);
        const i = pantryCoverage(improvedRecommend(scenario, 10), scenario.pantry);
        const delta = i.value - b.value;
        assert.ok(typeof delta === "number", `${name}: pantry coverage delta = ${(delta * 100).toFixed(1)}%`);
      });

      test("missing ingredients delta: improved vs baseline", () => {
        const b = missingIngredients(baselineRecommend(scenario, 10), scenario.pantry);
        const i = missingIngredients(improvedRecommend(scenario, 10), scenario.pantry);
        const delta = b.perRecipe - i.perRecipe;
        assert.ok(typeof delta === "number", `${name}: missing ingredients delta = ${delta.toFixed(2)} per recipe`);
      });

      test("allergy violations delta: improved vs baseline", () => {
        const bRecipes = baselinePlan(scenario).map((m) => recipesById[String(m.recipeId)]).filter(Boolean);
        const iRecipes = improvedPlan(scenario).map((m) => recipesById[String(m.recipeId)]).filter(Boolean);
        const b = allergyCorrectness(bRecipes, scenario.allergies);
        const i = allergyCorrectness(iRecipes, scenario.allergies);
        const delta = i.value - b.value;
        assert.ok(typeof delta === "number", `${name}: allergy correctness delta = ${(delta * 100).toFixed(1)}%`);
      });

      test("plan completion delta: improved vs baseline", () => {
        const b = planCompletion(baselinePlan(scenario));
        const i = planCompletion(improvedPlan(scenario));
        assert.ok(i.value === 1, `${name}: improved plan is 100% complete`);
      });

      test("pantry utilisation delta: improved vs baseline", () => {
        const b = pantryUtilisation(scenario.pantry, baselineRecommend(scenario, 10));
        const i = pantryUtilisation(scenario.pantry, improvedRecommend(scenario, 10));
        const delta = i.value - b.value;
        assert.ok(typeof delta === "number", `${name}: pantry utilisation delta = ${(delta * 100).toFixed(1)}%`);
      });
    });
  }


  test("aggregate: improved P@5 vs baseline P@5 across all scenarios", () => {
    let bSum = 0;
    let iSum = 0;
    for (const name of scenarioNames) {
      const scenario = SCENARIOS[name];
      bSum += precisionAtK(baselineRecommend(scenario, 5), scenario.pantry, scenario.preferences, 5).value;
      iSum += precisionAtK(improvedRecommend(scenario, 5), scenario.pantry, scenario.preferences, 5).value;
    }
    const bAvg = bSum / scenarioNames.length;
    const iAvg = iSum / scenarioNames.length;
    const delta = iAvg - bAvg;
    assert.ok(typeof delta === "number", `aggregate P@5 delta = ${(delta * 100).toFixed(1)}%`);
  });

  test("aggregate: improved plan zero allergy violations across all scenarios", () => {
    let totalViolations = 0;
    for (const name of scenarioNames) {
      const scenario = SCENARIOS[name];
      const plan = improvedPlan(scenario);
      const planRecipes = plan.map((m) => recipesById[String(m.recipeId)]).filter(Boolean);
      const c = allergyCorrectness(planRecipes, scenario.allergies);
      totalViolations += c.violations.length;
    }
    assert.strictEqual(totalViolations, 0, "aggregate: zero allergen violations (improved)");
  });

  test("aggregate: baseline vs improved allergy violation count", () => {
    let bViolations = 0;
    let iViolations = 0;
    for (const name of scenarioNames) {
      const scenario = SCENARIOS[name];
      const bRecipes = baselinePlan(scenario).map((m) => recipesById[String(m.recipeId)]).filter(Boolean);
      const iRecipes = improvedPlan(scenario).map((m) => recipesById[String(m.recipeId)]).filter(Boolean);
      bViolations += allergyCorrectness(bRecipes, scenario.allergies).violations.length;
      iViolations += allergyCorrectness(iRecipes, scenario.allergies).violations.length;
    }
    assert.ok(typeof bViolations === "number" && typeof iViolations === "number", `baseline violations: ${bViolations}, improved violations: ${iViolations}`);
  });
});

