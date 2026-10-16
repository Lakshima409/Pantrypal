# PR: Merge `Phases` → `main` — Phases 4–6 + CI (C8)

## Summary

This PR merges the `Phases` branch into `main`, completing Phases 4–6 of the PantryPal roadmap and adding the Phase C8 CI workflow.

### What changed

| Area | Details |
|------|---------|
| **Phase 4** | Meal-planning hardening (allergen filtering, nutrition compliance, 25/35/30/10 slot rule, complete-week guarantee) |
| **Phase 5** | Ratings model, NLP search, expiry-aware planning, vision, LLM recipe generation |
| **Phase 6** | Evaluation harness + `docs/EVALUATION-RESULTS.md` (62-recipe dev corpus, 5 scenarios, aggregate metrics) |
| **Phase C8** | `.github/workflows/ci.yml` — Node server unit tests, client lint/build, Python pytest for both AI services, MySQL-gated integration (best-effort) |

## Test results (all green)

### Node server — `server/` (231 unit tests)
- `npm test` → **231/231 pass** against live MySQL (3306)
- Covers: `plannerService.js`, `Rating.js`, `SearchLog.js`, and all other server modules
- Integration tests against live MySQL also run in CI (`continue-on-error: true`)

### Python AI services — `ai-services/`
| Service | Framework | Tests | Result |
|---------|-----------|-------|--------|
| recommender | pytest | `tests/test_recommender.py`, `test_api.py`, `test_integration.py` | ✅ pass |
| diet-planner | pytest | `tests/test_planner.py`, `test_api.py`, `test_integration.py` | ✅ pass |

### Flask integration tests against live MySQL + live Flask services

**Manually verified** by starting both Flask services and hitting their real endpoints:

| Test | Endpoint | Payload | Result |
|------|----------|---------|--------|
| Recommendation | `POST http://localhost:5001/recommend` | `user_id=5040, limit=5, pantry=[tomato,onion,garlic]` | ✅ 5 ranked recommendations with `recipe_id`, `score`, `pantry_match`, `diet_match` |
| Context-aware recommendation | `POST /recommend` | `hour=8` (morning) | ✅ Context-filtered results returned |
| Meal plan | `POST http://localhost:5002/mealplan` | `user_id=test, calorie_goal=2000, days=7` | ✅ 28 meals (7 days × 4 slots: breakfast/lunch/dinner/snack) |
| Meal plan + allergens | `POST /mealplan` | `allergies=[peanut]` | ✅ 28 meals, allergens filtered, summary returned |

Both services report healthy:
- Recommender: `status=ok, ready=true, recipes=62, users=13`
- Diet planner: `status=ok`

### Client — `client/`
- `npm run lint` → ✅ pass
- `npm run build` → ✅ pass

## Remaining items (not blocking)

1. **PR review** — attach this description to the GitHub PR at `https://github.com/Lakshima409/Pantrypal/compare/main...Phases` once review is ready.

## Verification checklist

- [x] MySQL 3306 reachable, `recipe_db` with 62 recipes / 66 ingredients
- [x] Node unit tests: 231/231 pass
- [x] Python pytest: both services pass
- [x] Flask `/recommend` integration: 5 ranked results, context-aware
- [x] Flask `/mealplan` integration: 28 meals, allergen filtering
- [x] Client lint + build pass
- [x] Temp `verify_mysql.py` removed; working tree clean
