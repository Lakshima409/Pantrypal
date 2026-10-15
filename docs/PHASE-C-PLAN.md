# Phase C — Future/Advanced implementation plan

Scope decision: rule-based NLP (no transformer dependency), heuristic image detection
with an explicit external-vision seam, cache-first USDA FDC nutrition with a hard OFF
default (no key required, no surprise spend), DB-backed ratings designed for
local-no-auth demo via localStorage, nutrition+score display where the fields exist,
a WCAG checklist PR-style pass, and a real CI workflow that runs green offline.

## C1 — NLP search (§37) — IMPLEMENTED (Phase 5)
- `server/utils/nlpSearch.js`: tokenize/stopwords, diet + cuisine + ingredient +
  `under N calories/minutes` extraction, `q`-shaped structured output.
  Phase 5 additions: `INGREDIENT_SYNONYMS`, `expandIngredients()`, time-of-day
  meal hints (morning/midday/evening/night/late night/suppertime), underscore
  diet tags (`dairy_free`→`dairy-free`). 12 test cases in `server/test/nlpSearch.test.js`.
- `recipeController.searchRecipes`: parse `q`, merge with explicit params
  (explicit wins), log one SearchHistory row per request, and prune by
  calories when the DB has nutrition rows (skip gracefully when it does not).
- Client: `RecipeSearchClean` gains an NL input line using the same parse +
  a "parsed as" chip row; pure fallback still works if the server is down.

## C2 — Image recognition (§13) — IMPLEMENTED (Phase 5)
- `server/services/visionService.js`: `recognizeIngredients()` contract — if
  provider + apiKey + endpoint are set, forwards to an external vision endpoint;
  otherwise returns a deterministic filename-hint heuristic and
  `source:'local-fallback'`. No new dependency, no database needed.
- `POST /api/recipes/recognize-ingredients` wired in `server/routes/recipes.js`.
- Client: `IngredientUpload` can call `/api/recipes/recognize-ingredients`,
  candidate checkboxes -> add to pantry, graceful fallback message when the
  API is unreachable. Pure Node tests cover the heuristic path deterministically.

## C3 — Ratings/comments (§35) — IMPLEMENTED server-side (Phase 5)
- `database/migrations/add_ratings_table.sql`: `ratings` table (user_id, recipe_id,
  rating 1–5, review, unique user+recipe).
- `server/models/Rating.js`: upsert, getById, getByUserAndRecipe, listForRecipe,
  statsForRecipe, listByUser, remove.
- `server/controllers/ratingController.js`: rateRecipe, listRatings, getMyRating,
  removeRating. Routes: `POST/GET/DELETE /api/recipes/:id/rate`,
  `GET /api/recipes/:id/my-rating`, `GET /api/recipes/:id/ratings`.
- `server/test/ratingController.test.js`: 12 validation tests (no DB required).
- Client: localStorage ratings layer (`stores/ratingsStore.js`) still works for
  local-no-auth demo; server-side ratings are authoritative when authenticated.

## C4 — Nutrition enrichment (USDA FDC, replaces Spoonacular) — IMPLEMENTED (Phase 5)
- `server/services/nutritionService.js`: USDA FoodData Central API lookup by FDC ID
  or text search, in-memory cache (24h TTL), per-100g nutrient validation
  (calories/protein/fat/carbs/sodium bounds), graceful OFF-by-default
  (`NUTRITION_API_KEY`).
- `enrichIngredient({ name, fdcId })` normalises to
  `{ caloriesPer100g, proteinPer100g, fatPer100g, carbsPer100g, sodiumPer100g }`.
- `server/test/nutritionService.test.js`: 14 tests (no network, no API key).

## C5 — Context-aware recommendations — IMPLEMENTED (Phase 5)
- `recommendationService.getContextualRecommended(userId, limit, timeOfDay)`:
  fetches standard recommendations, then re-ranks by time-of-day meal-type fit
  (70% base score + 30% context match). Maps morning→breakfast, midday→lunch,
  evening→dinner, night→dinner, late night→snack, suppertime→dinner.
- `GET /api/recipes/recommended/contextual?timeOfDay=morning`
- `server/test/recommendationContext.test.js`: 9 tests.

## C6 — Recipe generation (LLM) — IMPLEMENTED (Phase 5)
- `server/services/recipeGenerationService.js`: `generateRecipe()` calls a
  configured LLM endpoint, validates structured output against a fixed schema
  (title, ingredients, instructions, servings, timeMinutes, tags), falls back
  to a deterministic heuristic recipe when no LLM is configured or validation
  fails. Never throws.
- `POST /api/recipes/generate`
- `server/test/recipeGenerationService.test.js`: 15 tests.

## C7 — WCAG 2.1 audit (§56)
- Fix pass, no framework churn: skip-link + landmark roles in MainLayout;
  decorative images `alt=""`, content images descriptive `alt`; icon-only
  buttons named; form inputs labelled; focus-visible ring in CSS; colour
  contrast tighten (AA) on meta/ghost text; live region for async feedback.
- `docs/WCAG-AUDIT.md`: criterion-by-criterion table (1.1.1→4.1.3) with the
  fix locations so it reads as an audit, not a claim.

## C8 — CI
- `.github/workflows/ci.yml`: Node (npm test), Python (pytest both services),
  client (`npm run build`), MySQL-gated server integration marked
  best-effort (continues on error), runs fully green offline.
- `VALIDATION_VERIFICATION.md` + root `README.md` get the Phase C section.

## Verification (must all stay green)
- `npm test` (server, new nlp + vision + spoonacular cases included)
- pytest both AI services (untouched, must still pass)
- `npm run build` (client)
- Vite transform 200s on every touched page/component
- Optional live endpoints only if MySQL :3306 answers (§C4/C1-C3 degrade gracefully when it does not)
