// server/test/evaluation/evaluation-metrics.js
// Phase 6: Shared metric computation functions for research evaluation.
// All metrics are computed from in-memory data — no database, no network.

"use strict";

function canonical(name) {
  return String(name || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function precisionAtK(recommended, pantry, preferences, k) {
  const topK = recommended.slice(0, k);
  if (!topK.length) return { k, relevant: 0, total: 0, value: 0 };
  const pantrySet = new Set(pantry.map(canonical));
  const prefSet = new Set(preferences.map(canonical));
  let relevant = 0;
  for (const r of topK) {
    const ingMatch = r.ingredients.some((i) => pantrySet.has(canonical(i.name)));
    const tagMatch = prefSet.size ? r.tags.some((t) => prefSet.has(canonical(t))) : false;
    if (ingMatch || tagMatch) relevant += 1;
  }
  return { k, relevant, total: topK.length, value: relevant / topK.length };
}

function recallAtK(recommended, allRecipes, pantry, preferences, k) {
  const topK = recommended.slice(0, k);
  const pantrySet = new Set(pantry.map(canonical));
  const prefSet = new Set(preferences.map(canonical));
  let totalRelevant = 0;
  let retrievedRelevant = 0;
  const topKIds = new Set(topK.map((r) => r.id));
  for (const r of allRecipes) {
    const ingMatch = r.ingredients.some((i) => pantrySet.has(canonical(i.name)));
    const tagMatch = prefSet.size ? r.tags.some((t) => prefSet.has(canonical(t))) : false;
    if (ingMatch || tagMatch) {
      totalRelevant += 1;
      if (topKIds.has(r.id)) retrievedRelevant += 1;
    }
  }
  return { k, totalRelevant, retrievedRelevant, value: totalRelevant ? retrievedRelevant / totalRelevant : 0 };
}

function pantryCoverage(recommended, pantry) {
  const pantrySet = new Set(pantry.map(canonical));
  let totalIngredients = 0;
  let totalCovered = 0;
  for (const r of recommended) {
    for (const ing of r.ingredients) {
      totalIngredients += 1;
      if (pantrySet.has(canonical(ing.name))) totalCovered += 1;
    }
  }
  return { totalIngredients, coveredIngredients: totalCovered, value: totalIngredients ? totalCovered / totalIngredients : 0 };
}

function missingIngredients(recommended, pantry) {
  const pantrySet = new Set(pantry.map(canonical));
  let totalMissing = 0;
  const uniqueMissing = new Set();
  for (const r of recommended) {
    for (const ing of r.ingredients) {
      if (!pantrySet.has(canonical(ing.name))) {
        totalMissing += 1;
        uniqueMissing.add(canonical(ing.name));
      }
    }
  }
  return { totalMissing, perRecipe: recommended.length ? totalMissing / recommended.length : 0, uniqueMissingCount: uniqueMissing.size, uniqueMissing: [...uniqueMissing] };
}


function nutritionCompliance(mealPlan, recipesById, calorieGoal) {
  const perMealTarget = calorieGoal / 4;
  const lower = perMealTarget * 0.75;
  const upper = perMealTarget * 1.25;
  let compliant = 0;
  let total = 0;
  const details = [];
  for (const meal of mealPlan) {
    const recipe = recipesById.get(String(meal.recipeId || meal.recipe_id));
    if (!recipe) continue;
    total += 1;
    const calories = recipe.nutrition ? recipe.nutrition.calories : 0;
    const ok = calories >= lower && calories <= upper;
    if (ok) compliant += 1;
    details.push({ meal: meal.mealType, day: meal.day, recipeId: recipe.id, recipeTitle: recipe.title, calories, target: perMealTarget, compliant: ok });
  }
  return { perMealTarget, total, compliant, value: total ? compliant / total : 0, details };
}

function allergyCorrectness(recipes, allergies) {
  const banned = allergies.map((a) => canonical(a));
  let safe = 0;
  let total = 0;
  const violations = [];
  for (const r of recipes) {
    total += 1;
    const hits = r.ingredients.filter((ing) => banned.some((b) => canonical(ing.name).includes(b)));
    if (hits.length === 0) { safe += 1; } else { violations.push({ recipeId: r.id, recipeTitle: r.title, allergenIngredients: hits.map((h) => h.name) }); }
  }
  return { total, safe, violations, value: total ? safe / total : 0 };
}

function planCompletion(mealPlan, expectedDays = 7, expectedSlots = 4) {
  const expected = expectedDays * expectedSlots;
  const actual = mealPlan ? mealPlan.length : 0;
  return { expected, actual, value: expected ? actual / expected : 0 };
}

function pantryUtilisation(pantry, recipes) {
  const pantrySet = new Set(pantry.map(canonical));
  const used = new Set();
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      const c = canonical(ing.name);
      if (pantrySet.has(c)) used.add(c);
    }
  }
  return { totalPantryItems: pantrySet.size, utilisedItems: used.size, value: pantrySet.size ? used.size / pantrySet.size : 0, utilised: [...used], unused: pantry.filter((p) => !used.has(canonical(p))) };
}

function expiryPriorityUse(expiringItems, recipes) {
  const expiringSet = new Set(expiringItems.map(canonical));
  const used = new Set();
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      const c = canonical(ing.name);
      if (expiringSet.has(c)) used.add(c);
    }
  }
  return { totalExpiring: expiringSet.size, usedExpiring: used.size, value: expiringSet.size ? used.size / expiringSet.size : 0, used: [...used], unused: expiringItems.filter((e) => !used.has(canonical(e))) };
}

function unusedIngredients(pantry, recipes) {
  const utilised = new Set();
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      utilised.add(canonical(ing.name));
    }
  }
  const unused = pantry.filter((p) => !utilised.has(canonical(p)));
  return { totalPantryItems: pantry.length, unusedCount: unused.length, unused, value: pantry.length ? unused.length / pantry.length : 0 };
}

async function timeIt(fn) {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  const ms = Number(end - start) / 1_000_000;
  return { result, ms };
}

module.exports = { canonical, precisionAtK, recallAtK, pantryCoverage, missingIngredients, nutritionCompliance, allergyCorrectness, planCompletion, pantryUtilisation, expiryPriorityUse, unusedIngredients, timeIt };

