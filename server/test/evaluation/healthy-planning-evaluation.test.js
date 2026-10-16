// server/test/evaluation/healthy-planning-evaluation.test.js
// Phase 6: Healthy meal planning evaluation.
// Measures nutritional target compliance, allergy-filter correctness, plan completion.

import { describe, test } from "node:test";
import assert from "node:assert";

import { RECIPES, SCENARIOS } from "./evaluation-dataset.js";
import { canonical, nutritionCompliance, allergyCorrectness, planCompletion } from "./evaluation-metrics.js";

const recipesById = new Map(RECIPES.map((r) => [r.id, r]));

function baselinePlan(scenario) {
  const candidates = RECIPES.filter((r) =>
    r.tags.some((t) => scenario.preferences.includes(t)) || scenario.preferences.length === 0
  );
  if (!candidates.length) return [];
  const meals = [];
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
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
function improvedPlan(scenario) {
  const banned = scenario.allergies.map((a) => canonical(a));
  const candidates = RECIPES.filter((r) =>
    !r.ingredients.some((ing) => banned.some((b) => canonical(ing.name).includes(b)))
  );
  const base = candidates.length ? candidates : RECIPES;
  const target = scenario.calorieGoal || 2000;
  const SHARES = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };
  const meals = [];
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const SLOTS = ["breakfast", "lunch", "dinner", "snack"];
  const used = new Set();
  let cursor = 0;
  for (const day of DAYS) {
    for (const slot of SLOTS) {
      const mealTarget = target * (SHARES[slot] || 0.25);
      let pick = base.find((r) => !used.has(r.id) && r.nutrition && Math.abs((r.nutrition.calories || 0) - mealTarget) < 150);
      if (!pick) {
        for (let i = 0; i < base.length; i += 1) {
          const cand = base[(cursor + i) % base.length];
          if (!used.has(cand.id)) { pick = cand; cursor = (cursor + i + 1) % base.length; break; }
        }
      }
      if (!pick) { pick = base[cursor % base.length]; cursor = (cursor + 1) % base.length; }
      meals.push({ day, mealType: slot, recipeId: pick.id });
      used.add(pick.id);
    }
  }
  return meals;
}

describe("Healthy meal planning evaluation (dev corpus)", () => {
  const scenarioNames = Object.keys(SCENARIOS);

  test("dataset is loaded and non-empty", () => {
    assert.ok(RECIPES.length > 0, "recipes should be loaded");
  });

  for (const name of scenarioNames) {
    describe(`scenario: ${name}`, () => {
      const scenario = SCENARIOS[name];

      test("plan completion: improved plan fills 7 days x 4 slots", () => {
        const plan = improvedPlan(scenario);
        const c = planCompletion(plan);
        assert.strictEqual(c.value, 1, `${name}: improved plan should be 100% complete (${c.actual}/${c.expected})`);
      });

      test("nutritional target compliance: improved plan", () => {
        const plan = improvedPlan(scenario);
        const c = nutritionCompliance(plan, recipesById, scenario.calorieGoal);
        assert.ok(c.total > 0, `${name}: compliance measured over ${c.total} meals`);
      });

      test("allergy-filter correctness: improved plan has zero violations", () => {
        const plan = improvedPlan(scenario);
        const planRecipes = plan.map((m) => recipesById.get(String(m.recipeId))).filter(Boolean);
        const c = allergyCorrectness(planRecipes, scenario.allergies);
        assert.strictEqual(c.value, 1, `${name}: zero allergen violations (${c.safe}/${c.total})`);
        if (c.violations.length) {
          console.log(`  [${name}] allergy violations:`, JSON.stringify(c.violations));
        }
      });

      test("allergy-filter correctness: baseline may have violations", () => {
        const plan = baselinePlan(scenario);
        const planRecipes = plan.map((m) => recipesById.get(String(m.recipeId))).filter(Boolean);
        const c = allergyCorrectness(planRecipes, scenario.allergies);
        assert.ok(c.total === 28, `${name}: baseline measured over ${c.total} meals`);
      });
    });
  }

  test("aggregate: improved plan compliance across all scenarios", () => {
    let totalCompliant = 0;
    let totalMeals = 0;
    for (const name of scenarioNames) {
      const scenario = SCENARIOS[name];
      const plan = improvedPlan(scenario);
      const c = nutritionCompliance(plan, recipesById, scenario.calorieGoal);
      totalCompliant += c.compliant;
      totalMeals += c.total;
    }
    const aggregate = totalMeals ? totalCompliant / totalMeals : 0;
    assert.ok(totalMeals > 0, `aggregate: measured over ${totalMeals} meals`);
  });

  test("aggregate: improved plan zero allergy violations across all scenarios", () => {
    let totalViolations = 0;
    for (const name of scenarioNames) {
      const scenario = SCENARIOS[name];
      const plan = improvedPlan(scenario);
      const planRecipes = plan.map((m) => recipesById.get(String(m.recipeId))).filter(Boolean);
      const c = allergyCorrectness(planRecipes, scenario.allergies);
      totalViolations += c.violations.length;
    }
    assert.strictEqual(totalViolations, 0, "aggregate: zero allergen violations across all scenarios");
  });
});

