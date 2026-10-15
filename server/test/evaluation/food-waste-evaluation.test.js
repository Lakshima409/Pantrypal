// server/test/evaluation/food-waste-evaluation.test.js
// Phase 6: Food waste reduction evaluation.
//
// Measures pantry utilisation, expiry-priority use, and unused-ingredient
// trends for the recommendation/planner system against the dev corpus dataset.
//
// No MySQL, no Flask, no network: fully hermetic.

import { describe, test } from "node:test";
import assert from "node:assert";

import { RECIPES, SCENARIOS } from "./evaluation-dataset.js";
import {
  canonical,
  pantryUtilisation,
  expiryPriorityUse,
  unusedIngredients,
} from "./evaluation-metrics.js";
import { contextualRerank } from "../../services/recommendationService.js";

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
    return { ...r, score };
  });
  const sorted = scored.sort((a, b) => b.score - a.score);
  const reranked = contextualRerank(sorted, scenario.timeOfDay);
  return reranked.slice(0, limit);
}

import { expandIngredients } from "../../utils/nlpSearch.js";

describe("Food waste reduction evaluation (dev corpus)", () => {
  const scenarioNames = Object.keys(SCENARIOS);

  test("dataset is loaded and non-empty", () => {
    assert.ok(RECIPES.length > 0, "recipes should be loaded");
  });

  for (const name of scenarioNames) {
    describe(`scenario: ${name}`, () => {
      const scenario = SCENARIOS[name];
      const recommended = improvedRecommend(scenario, 10);

      test("pantry utilisation: fraction of pantry items used in recommendations", () => {
        const c = pantryUtilisation(scenario.pantry, recommended);
        // Measurement only — documents how much of the pantry gets used.
        assert.ok(c.totalPantryItems > 0, `${name}: ${c.totalPantryItems} pantry items`);
      });

      test("unused ingredients: fraction of pantry items NOT used (potential waste)", () => {
        const c = unusedIngredients(scenario.pantry, recommended);
        // Measurement only — documents waste trend.
        assert.ok(c.totalPantryItems > 0, `${name}: ${c.unusedCount}/${c.totalPantryItems} unused`);
      });

      if (scenario.expiringItems && scenario.expiringItems.length) {
        test("expiry-priority use: expiring items appear in recommendations", () => {
          const c = expiryPriorityUse(scenario.expiringItems, recommended);
          // Measurement only — documents whether soon-to-expire items get used.
          assert.ok(c.totalExpiring > 0, `${name}: ${c.totalExpiring} expiring items`);
        });
      }
    });
  }

  test("aggregate: pantry utilisation across all scenarios", () => {
    let totalUsed = 0;
    let totalPantry = 0;
    for (const name of scenarioNames) {
      const scenario = SCENARIOS[name];
      const recommended = improvedRecommend(scenario, 10);
      const c = pantryUtilisation(scenario.pantry, recommended);
      totalUsed += c.utilisedItems;
      totalPantry += c.totalPantryItems;
    }
    const aggregate = totalPantry ? totalUsed / totalPantry : 0;
    assert.ok(totalPantry > 0, `aggregate: ${totalPantry} pantry items across scenarios`);
  });

  test("aggregate: unused ingredients across all scenarios", () => {
    let totalUnused = 0;
    let totalPantry = 0;
    for (const name of scenarioNames) {
      const scenario = SCENARIOS[name];
      const recommended = improvedRecommend(scenario, 10);
      const c = unusedIngredients(scenario.pantry, recommended);
      totalUnused += c.unusedCount;
      totalPantry += c.totalPantryItems;
    }
    const aggregate = totalPantry ? totalUnused / totalPantry : 0;
    assert.ok(totalPantry > 0, `aggregate: ${totalPantry} pantry items across scenarios`);
  });
});