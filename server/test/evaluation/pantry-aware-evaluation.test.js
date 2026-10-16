// server/test/evaluation/pantry-aware-evaluation.test.js
// Phase 6: Pantry-aware recommendation evaluation.
// Measures Precision@K, Recall@K, pantry coverage, missing ingredients.

import { describe, test } from "node:test";
import assert from "node:assert";

import { RECIPES, SCENARIOS } from "./evaluation-dataset.js";
import { canonical, precisionAtK, recallAtK, pantryCoverage, missingIngredients } from "./evaluation-metrics.js";
import { expandIngredients } from "../../utils/nlpSearch.js";
import { contextualRerank } from "../../services/recommendationService.js";

function baselineRecommend(scenario, limit = 12) {
  const pantrySet = new Set(scenario.pantry.map(canonical));
  const prefSet = new Set(scenario.preferences.map(canonical));
  const scored = RECIPES.map((r) => {
    let matches = 0;
    for (const ing of r.ingredients) {
      if (pantrySet.has(canonical(ing.name))) matches += 1;
    }
    const pantryMatch = r.ingredients.length ? matches / r.ingredients.length : 0;
    const dietMatch = prefSet.size ? (r.tags.some((t) => prefSet.has(canonical(t))) ? 1 : 0) : 1;
    const score = 0.7 * pantryMatch + 0.3 * dietMatch;
    return { ...r, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
function improvedRecommend(scenario, limit = 12) {
  const expandedPantry = expandIngredients(scenario.pantry);
  const pantrySet = new Set(expandedPantry.map(canonical));
  const prefSet = new Set(scenario.preferences.map(canonical));
  const scored = RECIPES.map((r) => {
    let matches = 0;
    for (const ing of r.ingredients) {
      if (pantrySet.has(canonical(ing.name))) matches += 1;
    }
    const pantryMatch = r.ingredients.length ? matches / r.ingredients.length : 0;
    const dietMatch = prefSet.size ? (r.tags.some((t) => prefSet.has(canonical(t))) ? 1 : 0) : 1;
    const score = 0.7 * pantryMatch + 0.3 * dietMatch;
    return { ...r, score, pantryMatch, dietMatch };
  });
  const sorted = scored.sort((a, b) => b.score - a.score);
  const reranked = contextualRerank(sorted, scenario.timeOfDay);
  return reranked.slice(0, limit);
}

function buildRelevanceSet(scenario) {
  const expandedPantry = expandIngredients(scenario.pantry);
  const pantrySet = new Set(expandedPantry.map(canonical));
  const prefSet = new Set(scenario.preferences.map(canonical));
  return RECIPES.filter((r) =>
    r.ingredients.some((i) => pantrySet.has(canonical(i.name))) ||
    (prefSet.size && r.tags.some((t) => prefSet.has(canonical(t))))
  );
}

describe("Pantry-aware recommendation evaluation (dev corpus)", () => {
  const K_VALUES = [3, 5, 10];
  const scenarioNames = Object.keys(SCENARIOS);

  test("dataset is loaded and non-empty", () => {
    assert.ok(RECIPES.length > 0, "recipes should be loaded");
    assert.ok(scenarioNames.length > 0, "scenarios should be defined");
  });

  for (const name of scenarioNames) {
    describe(`scenario: ${name}`, () => {
      const scenario = SCENARIOS[name];
      const relevantSet = buildRelevanceSet(scenario);

      test("has a non-empty relevant set for recall computation", () => {
        assert.ok(relevantSet.length > 0, `${name}: relevant set should be non-empty`);
      });

      for (const k of K_VALUES) {
        test(`Precision@${k}: improved >= baseline`, () => {
          const baseline = baselineRecommend(scenario, k);
          const improved = improvedRecommend(scenario, k);
          const b = precisionAtK(baseline, scenario.pantry, scenario.preferences, k);
          const i = precisionAtK(improved, scenario.pantry, scenario.preferences, k);
          assert.ok(i.value >= b.value - 0.001, `${name}: improved P@${k} should not be below baseline`);
        });

        test(`Recall@${k}: improved >= baseline`, () => {
          const baseline = baselineRecommend(scenario, k);
          const improved = improvedRecommend(scenario, k);
          const b = recallAtK(baseline, relevantSet, scenario.pantry, scenario.preferences, k);
          const i = recallAtK(improved, relevantSet, scenario.pantry, scenario.preferences, k);
          assert.ok(i.value >= b.value - 0.001, `${name}: improved R@${k} should not be below baseline`);
        });
      }

      test("pantry coverage: record baseline vs improved", () => {
        const baseline = baselineRecommend(scenario, 10);
        const improved = improvedRecommend(scenario, 10);
        const b = pantryCoverage(baseline, scenario.pantry);
        const i = pantryCoverage(improved, scenario.pantry);
        assert.ok(typeof i.value === "number", `${name}: baseline ${(b.value * 100).toFixed(1)}% -> improved ${(i.value * 100).toFixed(1)}%`);
      });

      test("missing ingredients: record baseline vs improved", () => {
        const baseline = baselineRecommend(scenario, 10);
        const improved = improvedRecommend(scenario, 10);
        const b = missingIngredients(baseline, scenario.pantry);
        const i = missingIngredients(improved, scenario.pantry);
        assert.ok(typeof i.perRecipe === "number", `${name}: baseline ${b.perRecipe.toFixed(2)} -> improved ${i.perRecipe.toFixed(2)} per recipe`);
      });
    });
  }

  test("across all scenarios: improved P@5 >= baseline P@5", () => {
    let baselineSum = 0;
    let improvedSum = 0;
    for (const name of scenarioNames) {
      const scenario = SCENARIOS[name];
      const b = precisionAtK(baselineRecommend(scenario, 5), scenario.pantry, scenario.preferences, 5);
      const i = precisionAtK(improvedRecommend(scenario, 5), scenario.pantry, scenario.preferences, 5);
      baselineSum += b.value;
      improvedSum += i.value;
    }
    const baselineAvg = baselineSum / scenarioNames.length;
    const improvedAvg = improvedSum / scenarioNames.length;
    assert.ok(improvedAvg >= baselineAvg - 0.001, `aggregate: improved P@5 >= baseline P@5`);
  });
});

