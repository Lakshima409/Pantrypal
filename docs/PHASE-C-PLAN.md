# Phase C — Future/Advanced implementation plan

Scope decision: rule-based NLP (no transformer dependency), heuristic image detection
with an explicit external-vision seam, cache-first Spoonacular with a hard OFF
default (no key required, no surprise spend), DB-backed ratings/comments designed for
local-no-auth demo via localStorage, nutrition+score display where the fields exist,
a WCAG checklist PR-style pass, and a real CI workflow that runs green offline.

## C1 — NLP search (§37)
- `server/utils/nlpSearch.js` (pure, node --test covered): tokenize/stopwords,
  diet + cuisine + ingredient + `under N calories/minutes` extraction,
  `q`-shaped structured output. Example: "spicy vegan dinner under 500 calories"
  -> `{ query:'spicy', dietary:['vegan'], maxCalories:500 }`.
- `recipeController.searchRecipes`: parse `q`, merge with explicit params
  (explicit wins), log one SearchHistory row per request, and prune by
  calories when the DB has nutrition rows (skip gracefully when it does not).
  No schema change needed for C1 (uses existing `nutrition_info`).
- Client: `RecipeSearchClean` gains an NL input line using the same parse +
  a "parsed as" chip row; pure fallback still works if the server is down.

## C2 — Image recognition (§13, Phase-2 guidance)
- `server/services/visionService.js`: `detectFromBytes()` contract — if
  `VISION_API_URL` (+optional key) is set, forwards to an external vision
  endpoint; otherwise returns a deterministic filename-hint heuristic and
  `source:'heuristic'`. No new dependency, no database needed at this stage
  (previous use-case covered confirm-before-save; covered client-side).
- `server/routes/vision.js` + `app.js` mount: `POST /api/vision/detect`
  (JSON `{ imageBase64, filename }`, 2 MB cap) -> `{ detections, source }`.
- Client: `IngredientUpload` switches to the dropzone style already on the
  generator page — image preview, "detect" call via `/api/vision/detect`,
  candidate checkboxes -> add to pantry, graceful fallback message when the
  API is unreachable. Pure Node test covers the heuristic path deterministically.

## C3 — Ratings/comments UI (§35)
- Decision: no new ratings/comments tables in this increment (schema owned by
  the report's canonical migration; interaction tables exist for the Phase-B
  signal). Ratings/comments are demonstrated with a per-recipe localStorage
  layer (`stores/ratingsStore.js`: rates + text comments, aggregated averages,
  community seeding params under test) so the UI (RatingStars already exists)
  works in local-no-auth demo.
- `RecipeDetailsClean` gains: interactive RatingStars, "your rating saved"
  state, average + count line, comment form + list, and a compact report/flag
  button writing a `report` interaction via recipeService (best-effort).
- `RecipeSearchClean` cards show the averaged stars.

## C4 — Spoonacular cache (§52)
- `server/services/spoonacular.js`: cache-first (memory + optional
  `external_recipe_cache` table behind `SPOONACULAR_CACHE_DB=1`), normalize to
  the Recipe shape, OFF by default (`SPOONACULAR_ENABLED=0`); when on, Node-only
  (never from React), key stays server-side, 429/timeout -> empty result.
- `GET /api/recipes/external?q=` wired through it, explicitly flagged.
- Migration file for the optional table lives beside schema (not executed).
- Node tests stub fetch to prove normalize + memory cache (no network).

## C5 — Nutrition/score display (report evaluation fields)
- `Recipe.js attachDetails`: carry `score`, `pantry_match`, `diet_match`,
  `pantryMatch`, `dietMatch` through `findById`/`listByIds` so `GET /:id`
  preserves the Flask hybrid fields (previously dropped — that is why the
  frontend could not show them).
- `RecipeSearchClean` (live path): fetch `/api/recipes/recommended`, card meta
  shows score / pantry-match % / diet-match chip + kcal when present, loading +
  error states kept; static fallback unchanged.
- `RecipeDetailsClean` (live path): nutrition panel + score line from the API
  when available, static fallback otherwise.

## C6 — WCAG 2.1 audit (§56)
- Fix pass, no framework churn: skip-link + landmark roles in MainLayout;
  decorative images `alt=""`, content images descriptive `alt`; icon-only
  buttons named; form inputs labelled; focus-visible ring in CSS; colour
  contrast tighten (AA) on meta/ghost text; live region for async feedback.
- `docs/WCAG-AUDIT.md`: criterion-by-criterion table (1.1.1→4.1.3) with the
  fix locations so it reads as an audit, not a claim.

## C7 — CI
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
