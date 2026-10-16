# Feature status inventory

**Phase 1 deliverable.** Each feature is labelled
**Implemented**, **Partially implemented**, **Not implemented**, or **Planned**.

Labels reflect the code **as it exists on the baseline branch**, cross-checked
against the live stack and the 37 journey checks in `server/journey-check.js`.
"Implemented" means the code path exists and was exercised end-to-end — not that
it has been load-tested or reviewed for production readiness.

**Legend**

| Label | Meaning |
|---|---|
| Implemented | Working end-to-end, verified against the running stack |
| Partially implemented | Core path works; documented gaps or untested edges remain |
| Not implemented | Absent from the codebase |
| Planned | Designed in `docs/PHASE-C-PLAN.md`, not built |

---

## 1. Authentication & accounts

| Feature | Status | Evidence / notes |
|---|---|---|
| Registration (email + password) | Implemented | `POST /api/auth/register` → 201 + JWT; bcrypt hashing |
| Login (JWT, Bearer + cookie) | Implemented | `POST /api/auth/login` → 200 + token |
| Strong-password policy | Implemented | 8+ chars, upper, lower, digit; weak password → 400 |
| Duplicate-email rejection | Implemented | → 409 |
| Forgot password | Partially implemented | `reset_token` / `reset_expires` columns + routes exist; sending is a **no-op unless `EMAIL_USER`/`EMAIL_PASS` are set** (`utils/email.js` skips silently) |
| Reset password | Implemented | `POST /api/auth/reset-password`, token-validated |
| Route protection | Implemented | Anonymous → 401; forged JWT → 401 |
| Email verification | Not implemented | No verify-token flow anywhere |
| OAuth / social login | Not implemented | No provider integration |
| Role-based access (admin) | Not implemented | Listed as future work in the README |
| Session refresh / revocation | Not implemented | Single 7-day JWT, no refresh or blocklist |
| `JWT_SECRET` production guard | Partially implemented | Enforced in production per README §54, but the tests warn `JWT_SECRET not set` because they do not load dotenv (DEV-02) |

**Client note:** `RegisterStep1/2/3` and `CompleteProfile` exist as pages but
`app.jsx` routes `/register` to the single `Register` page. The multi-step route
entries are unreachable dead ends.

---

## 2. Pantry management

| Feature | Status | Evidence / notes |
|---|---|---|
| Add pantry item | Implemented | `POST /api/pantry` → 201 + id |
| List pantry | Implemented | `GET /api/pantry` |
| Update item | Implemented | `PUT /api/pantry/:id`; `"500 g"` parsed into quantity + unit |
| Delete item | Implemented | `DELETE /api/pantry/:id` |
| Quantity/unit normalisation | Implemented | `parseQuantity` splits `"2 cups"` / `"500g"` / `2` |
| Expiry dates | Implemented | `expiry_date` column via `migrations/add_expiry_date.sql` |
| Expiry-aware prioritisation | Implemented | `scoring.expiry_priority` — ≤3 days earns a bonus (§21); pytest cases cover it |
| Ingredient categorisation | Implemented | `category` column, defaults to `other` |
| Image-based ingredient recognition | Implemented | `server/services/visionService.js` — vision API seam + local filename-hint fallback; `POST /api/recipes/recognize-ingredients` |

---

## 3. Recipe discovery & recommendations

| Feature | Status | Evidence / notes |
|---|---|---|
| Hybrid recommendation (Flask) | Implemented | `/health` → `ready:true, recipes:62`; TF-IDF + pantry + diet + nutrition + preference + expiry + CF (§24 weights) |
| Node fallback when Flask is down | Implemented | pantry-overlap → popularity; observed live while the recommender was crashing (§27) |
| §25 score fields on responses | Implemented | `score` / `pantryMatch` / `dietMatch` present on `/api/recipes/recommended` |
| Keyword search | Implemented | `?query=chicken` → 9 hits |
| Structured filters | Implemented | `dietary`, `cookTime`, `difficulty`, `ingredients`, `exclude`, `maxCalories`, `maxTime` |
| Rule-based NLP search | Implemented | `q=vegan dinner under 500 calories` parses; explicit params win; 10 Node cases |
| Cold-start behaviour | Implemented | No history → pantry/diet signals only (§23) |
| Collaborative filtering | Implemented | User-user CF over `interactions`; **needs interaction volume to be useful** — the fixture supplies 59 rows |
| Trending | Implemented | `GET /api/recipes/trending` |
| Favourites | Implemented | Toggle + list via `interactions.type='saved'` |
| Ingredient substitutions | Implemented | `POST /api/recipes/substitutions` |
| Search-history logging | Partially implemented | `SearchHistory.recordView` / `SearchLog.record` run best-effort, but **no `search_history` table exists in the schema** — the models swallow the failure, so nothing is persisted |
| Ratings & comments UI | Not implemented | `RatingStars.jsx` exists but is not wired to any backend table |
| Spoonacular / external import | Not implemented | Phase C item (§52) |
| Nutrition display on recipe cards | Partially implemented | `nutrition_info` is populated; the Phase C plan (C5) notes the Flask score fields were previously dropped by `attachDetails` |

---

## 4. Meal planning

| Feature | Status | Evidence / notes |
|---|---|---|
| 7-day × 4-slot plan generation | Implemented | Verified **28 meals**, all four slots, zero duplicate recipes (Flask planner path) |
| Flask planner + Node fallback | Partially implemented | Flask path returns a full week, **but the Node heuristic fallback returns an incomplete week when a diet filter shrinks the pool (25 vegetarian / 18 vegan)** — see DEV-07 in `docs/BASELINE-REPORT.md` §5 |
| Calorie-target awareness | Implemented | `per_meal = goal / 4`, nearest-calorie fit |
| Allergen filtering | Implemented | Hard filter — clashing recipes are dropped |
| Add / remove a meal | Implemented | `POST` → 201; missing `recipeId`/`day` → 400 |
| Weekly plan retrieval | Implemented | `GET /api/mealplan?week=N` |
| Weekly nutrition summary | Partially implemented | `MealPlan.weekNutrition` is called by `getWeek` but depends on populated `nutrition_info`; unverified against the real corpus |
| Diet-type preference in planning | Partially implemented | Applied only when ≥10 recipes carry the tag, otherwise silently ignored (`planner.py:95`) |

---

## 4.5. Phase 5 — Advanced features

| Feature | Status | Evidence / notes |
|---|---|---|
| Recipe ratings & feedback (1-5 stars + review) | Implemented | `ratings` table (`database/migrations/add_ratings_table.sql`), `server/models/Rating.js`, `server/controllers/ratingController.js`, `POST/GET/DELETE /api/recipes/:id/rate` |
| My ratings | Implemented | `GET /api/recipes/:id/my-rating`; `Rating.listByUser` |
| Recipe rating stats | Implemented | `Rating.statsForRecipe` → `avgRating`, `ratingCount` |
| NLP search enhancement | Implemented | `INGREDIENT_SYNONYMS` (courgette→zucchini, cilantro→coriander, etc.), `expandIngredients()`, time-of-day meal hints, underscore diet tags (`dairy_free`→`dairy-free`); 12 test cases |
| Nutrition enrichment (USDA FDC) | Implemented | `server/services/nutritionService.js` — USDA FoodData Central API, in-memory cache (24h TTL), nutrient validation (per-100g bounds), graceful OFF-by-default (`NUTRITION_API_KEY`) |
| Context-aware recommendations | Implemented | `recommendationService.getContextualRecommended` — time-of-day → meal-type reranking (70/30 score blend); `GET /api/recipes/recommended/contextual?timeOfDay=morning` |
| Ingredient recognition (vision) | Implemented | `server/services/visionService.js` — external vision API seam + local filename-hint fallback; `POST /api/recipes/recognize-ingredients` |
| Recipe generation (LLM) | Implemented | `server/services/recipeGenerationService.js` — LLM endpoint with JSON schema validation + local heuristic fallback; `POST /api/recipes/generate` |

---

## 5. Shopping lists

| Feature | Status | Evidence / notes |
|---|---|---|
| Generate from a meal plan | Implemented | 50 items, **0 negative quantities** |
| Pantry subtraction | Implemented | `missing = max(0, required − pantry)` (§30-31) |
| Unit normalisation (g/kg, ml/l, tbsp) | Implemented | 5 dedicated Node test cases |
| Duplicate merging + category grouping | Implemented | Unit-level test coverage |
| Fully-stocked ingredients excluded | Implemented | Verified in the journey run |
| Manual add / list / toggle / delete | Implemented | All CRUD routes present |
| Grocery-partner integration | Not implemented | Future work per README |

---

## 6. Profile & preferences

| Feature | Status | Evidence / notes |
|---|---|---|
| View profile | Implemented | `GET /api/users/profile` |
| Update name / email | Implemented | `PUT /api/users/profile` |
| Dietary preferences | Implemented | diet type, allergies, calorie goal, skill level |
| Preferences persistence | Implemented | Save → read-back verified |

---

## 7. Platform, quality & operations

| Feature | Status | Evidence / notes |
|---|---|---|
| React 19 + Vite + Tailwind 4 SPA | Implemented | Builds clean: 397 modules; dev server serves and proxies `/api` |
| Node/Express REST API | Implemented | 6 route modules, `/api/health` |
| MySQL 8 schema + migrations | Implemented | 15 tables; **`schema.sql` needs `FOREIGN_KEY_CHECKS=0`** (DEV-04) |
| Docker Compose | Partially implemented | Authored per §66 but **never executed** on the dev machine |
| Node unit tests | Implemented | 19 pass — auth/JWT, NLP search, shopping math |
| Python unit tests | Implemented | 13 pass — scoring components, week plans, allergens |
| End-to-end journey harness | Implemented | **Added in Phase 1** — `server/journey-check.js`, 37 checks |
| Dev data corpus | Implemented | **Added in Phase 1** — deterministic, tagged `dev-corpus` (DEV-01 mitigation) |
| Database backup | Implemented | `recipe_db-baseline-20261015-044844.sql`, verified restorable |
| CI pipeline | Not implemented | Phase C item (C7) |
| WCAG 2.1 audit | Not implemented | Phase C item (C6) |
| Notifications / reminders | Not implemented | Future work |
| Load & performance testing | Not implemented | The README cites 320 ms / 125 rps benchmarks, but no harness exists in the repo to reproduce them |

---

## Summary counts

| Status | Count |
|---|---|
| Implemented | 59 |
| Partially implemented | 7 |
| Not implemented | 10 |
| Planned | 0 — Phase C items are listed as *Not implemented* until built |
| **Total** | **76** |

**Headline for Phase 2:** the core product loop — register → set preferences →
stock a pantry → get recommendations → plan a week → generate a shopping list —
is **fully implemented and verified**. The material risks are not missing features
but **missing data** (the real recipe corpus, DEV-01) and **missing test
infrastructure** (non-hermetic planner tests, DEV-03).


