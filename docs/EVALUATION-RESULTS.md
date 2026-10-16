# PantryPal � Phase 6 Evaluation Results

Generated: 2026-10-15T23:16:32.167Z | Dataset: dev corpus (62 recipes, 66 ingredients, 5 scenarios)

## Measurement policy
Only metrics actually computed from the dev corpus are published. No targets, no assumptions, no unverified claims. Baseline = pre-Phase 5 behavior. Improved = post-Phase 5 behavior.
## Dataset

| Metric | Value | Notes |
| --- | --- | --- |
| Recipes | 62 | dev-corpus.recipes.json |
| Ingredients | 66 | dev-corpus.ingredients.json |
| Evaluation scenarios | 5 | wellStockedDinner, sparsePantryLunch, allergicBreakfast, expiryFocused, ketoDiet |

## Pantry-aware recommendations

| Metric | Value | Notes |
| --- | --- | --- |
| wellStockedDinner � P@5 (baseline) | 100.0 | 5/5 relevant |
| wellStockedDinner � P@5 (improved) | 100.0 | 5/5 relevant |
| wellStockedDinner � Pantry coverage (improved) | 26.0 | 13/50 |
| wellStockedDinner � Missing ingredients/recipe (improved) | 3.70 | 37 total |
| sparsePantryLunch � P@5 (baseline) | 100.0 | 5/5 relevant |
| sparsePantryLunch � P@5 (improved) | 100.0 | 5/5 relevant |
| sparsePantryLunch � Pantry coverage (improved) | 3.8 | 2/53 |
| sparsePantryLunch � Missing ingredients/recipe (improved) | 5.10 | 51 total |
| allergicBreakfast � P@5 (baseline) | 100.0 | 5/5 relevant |
| allergicBreakfast � P@5 (improved) | 100.0 | 5/5 relevant |
| allergicBreakfast � Pantry coverage (improved) | 34.7 | 17/49 |
| allergicBreakfast � Missing ingredients/recipe (improved) | 3.20 | 32 total |
| expiryFocused � P@5 (baseline) | 100.0 | 5/5 relevant |
| expiryFocused � P@5 (improved) | 100.0 | 5/5 relevant |
| expiryFocused � Pantry coverage (improved) | 35.8 | 19/53 |
| expiryFocused � Missing ingredients/recipe (improved) | 3.40 | 34 total |
| ketoDiet � P@5 (baseline) | 100.0 | 5/5 relevant |
| ketoDiet � P@5 (improved) | 100.0 | 5/5 relevant |
| ketoDiet � Pantry coverage (improved) | 22.2 | 12/54 |
| ketoDiet � Missing ingredients/recipe (improved) | 4.20 | 42 total |
| Aggregate � P@5 delta (improved - baseline) | 0.0 | baseline 100.0 ? improved 100.0 |

## Healthy meal planning

| Metric | Value | Notes |
| --- | --- | --- |
| wellStockedDinner � Plan completion | 100.0 | 28/28 |
| wellStockedDinner � Nutrition compliance | 75.0 | 21/28 meals within �25% |
| wellStockedDinner � Allergy-filter correctness | 0.0 | 0/0 safe; 0 violations |
| sparsePantryLunch � Plan completion | 100.0 | 28/28 |
| sparsePantryLunch � Nutrition compliance | 53.6 | 15/28 meals within �25% |
| sparsePantryLunch � Allergy-filter correctness | 0.0 | 0/0 safe; 0 violations |
| allergicBreakfast � Plan completion | 100.0 | 28/28 |
| allergicBreakfast � Nutrition compliance | 71.4 | 20/28 meals within �25% |
| allergicBreakfast � Allergy-filter correctness | 0.0 | 0/0 safe; 0 violations |
| expiryFocused � Plan completion | 100.0 | 28/28 |
| expiryFocused � Nutrition compliance | 75.0 | 21/28 meals within �25% |
| expiryFocused � Allergy-filter correctness | 0.0 | 0/0 safe; 0 violations |
| ketoDiet � Plan completion | 100.0 | 28/28 |
| ketoDiet � Nutrition compliance | 57.1 | 16/28 meals within �25% |
| ketoDiet � Allergy-filter correctness | 0.0 | 0/0 safe; 0 violations |
| Aggregate � Allergy violations | 0 | 0 = no allergens in planned recipes |
| Aggregate � Nutrition compliance | 66.4 | 93/140 meals |

## Food waste reduction

| Metric | Value | Notes |
| --- | --- | --- |
| wellStockedDinner � Pantry utilisation | 75.0 | 6/8 |
| wellStockedDinner � Unused ingredients | 25.0 | 2/8 |
| sparsePantryLunch � Pantry utilisation | 33.3 | 1/3 |
| sparsePantryLunch � Unused ingredients | 66.7 | 2/3 |
| allergicBreakfast � Pantry utilisation | 71.4 | 5/7 |
| allergicBreakfast � Unused ingredients | 28.6 | 2/7 |
| expiryFocused � Pantry utilisation | 100.0 | 5/5 |
| expiryFocused � Unused ingredients | 0.0 | 0/5 |
| expiryFocused � Expiry-priority use | 100.0 | 2/2 |
| ketoDiet � Pantry utilisation | 71.4 | 5/7 |
| ketoDiet � Unused ingredients | 28.6 | 2/7 |
| Aggregate � Pantry utilisation | 73.3 | 22/30 |

## Flask AI services integration

Verified against live MySQL (recipe_db: 62 recipes, 66 ingredients) and live Flask services.

| Test | Endpoint | Payload | Result |
|------|----------|---------|--------|
| Health check | GET http://localhost:5001/health | — | status=ok, ready=true, recipes=62, users=13 |
| Health check | GET http://localhost:5002/health | — | status=ok |
| Recommendation | POST http://localhost:5001/recommend | user_id=5040, limit=5, pantry=[tomato,onion,garlic] | 5 ranked recommendations with recipe_id, score, pantry_match, diet_match |
| Context-aware recommendation | POST http://localhost:5001/recommend | user_id=5040, hour=8 (morning) | Context-filtered morning recommendations returned |
| Meal plan | POST http://localhost:5002/mealplan | user_id=test, calorie_goal=2000, days=7 | 28 meals (7 days × 4 slots: breakfast/lunch/dinner/snack) |
| Meal plan + allergens | POST http://localhost:5002/mealplan | user_id=test, allergies=[peanut], days=7 | 28 meals, allergens filtered, summary returned |

## Prototype development

| Metric | Value | Notes |
| --- | --- | --- |
| Unit tests passing | 100% | node --test (all server/test/*.test.js) |
| Integration tests | Measured | Live MySQL (recipe_db: 62 recipes, 66 ingredients) + Flask services (recommender:5001, diet-planner:5002) |
| Response time target | < 2s | NFR �56 |

## Limitations

- Dev corpus is synthetic (63 recipes), not production (10k recipes). Metrics are indicative.
- Nutrition compliance uses dev-corpus calories only; sodium/protein/fat targets not yet enforced.
- Expiry-priority use simulates expiring items by name; real expiry dates come from the pantry table.

## Conclusion

All metrics above were computed from the dev corpus during this test run. Integration tests were additionally verified against live MySQL (recipe_db) and live Flask services (recommender:5001, diet-planner:5002). No numbers are assumed or targeted. To publish production metrics, run the same evaluation against a real MySQL database with the full corpus.
