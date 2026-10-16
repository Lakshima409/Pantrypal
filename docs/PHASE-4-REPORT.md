# Phase 4 — Meal planning, nutrition & shopping hardening

**Branch:** `Phases` · **Date:** 2026-10-15
**Scope:** `ai-services/diet-planner/planner.py` (+app), Node planner fallback
(DEV-07), `server/models/ShoppingList.js`, substitution allergen guard,
expiry safety in `recommender/scoring.py`. No new dependencies. All Node/Flask
contracts kept backward-compatible.

---

## Research consideration honoured

The **25 % breakfast / 35 % lunch / 30 % dinner / 10 % snack** split is
implemented as a **configurable planning rule** (`SLOT_SHARES`, override via
`PLANNER_SLOT_SHARES` env JSON), not as a health claim. Every generated plan
now carries a `summary` that separates measured values from estimates so no
caller can mistake the rule for nutritional validation.

## Diet planner (`ai-services/diet-planner/`)

| Task | Change |
|---|---|
| Calorie distribution | `slot_targets(goal)` applies the configurable share rule; Flask response unchanged in shape (`meals`) plus additive `summary` |
| Restrictions/allergies before selection | Already filtered pre-selection (`_clashes` before `pick`) — now locked by `test_heavy_allergen_still_yields_complete_week` |
| No repeated meals | `used` set + DEV-05: reuse only when a slot pool is truly exhausted; `plan_summary.repeatedRecipes` reports the count (0 on the dev corpus) |
| Missing nutrition ≠ exact | `load_recipes` returns `calories: None` (unknown) instead of 0; unknown rows never win a nearest-calorie contest; `per_serving` rows are scaled by servings and flagged `nutrition_estimated` |
| Constraint validation | New `plan_summary()` reports slot counts, week target vs known calories, unknown/estimated meal counts, repeats, and `completeWeek` — served as `summary` on `/mealplan` |
| Complete weeks (DEV-07 fixed) | Python planner already refilled pools; **Node fallback rewritten** — `heuristicWeek` now guarantees 28 meals (was 25 vegetarian / 18 vegan in Phase 1) with the same share rule |

## Shopping list (`server/models/ShoppingList.js`)

| Task | Change |
|---|---|
| Normalise before combining | Aggregation extracted to pure `aggregateRequired()` — ingredient + base-unit keys; kg↔g, l↔ml merge correctly |
| Pantry deduction | Pure `applyPantryDeduction()` — clamped at 0, tested with convertible + over-covering stock |
| Merge duplicates across recipes | `aggregateRequired` sums across rows; manual `addItem` now merges into an existing open row instead of inserting a duplicate line |
| Incompatible units | Different bases (`g` vs `cup` vs literal `pinch`) never combine; pantry stock in a non-convertible unit is **not** deducted (would be wrong-unit arithmetic). Locked by tests |
| Budget estimation | **Not implemented — correctly deferred.** No price columns exist anywhere in `schema.sql`; estimating money from nothing would fabricate data |

## Pantry / expiry (`ai-services/recommender/scoring.py`)

- **Expired ≠ expiring** (safety fix): expired items (`days_left < 0`) no longer earn the "use me" boost — cooking with spoiled food is unsafe. New `expired_flag()` tells the UI to show a discard warning; `/recommend` results now carry `uses_expired`.
- Expiring ramp unchanged: 1.0 today → 0.25 at day 3 → 0 beyond.
- Missing-ingredient math: covered by the shopping-list tests above (0 negative quantities, full-stock exclusion, §30-31).

## Substitution allergen guard (`server/models/Substitution.js`)

**Bug found: zero allergen filtering.** A peanut-allergic user could be served
"peanut oil" as a butter substitute. Now:

- Pure `filterSubstitutes(subs, banned)` — case-insensitive, **plural-tolerant** ("peanuts" matches "peanut oil").
- `getForIngredients(names, bannedTerms)` filters every entry; all-banned → empty list (fail safe).
- Controller merges explicit `allergies`/`exclude` params **+ the authenticated user's stored allergies/restrictions/health conditions** (routes gained `optionalAuth`), so a logged-in allergic user is protected even if the client forgets to send allergies.
- Response includes `filteredBy` (list of applied bans) for transparency.

## Tests

| Suite | Before | After | Content |
|---|---|---|---|
| diet-planner pytest | 5 | **10** | +slot shares, plan_summary validation, heavy-allergen complete weeks, None-calorie handling (monkeypatched), pool-refill |
| recommender pytest | 17 | **21** | +expiry ramp, expired-no-boost, expired_flag, prefix/bad-date handling |
| Node `npm test` | 35 | **47** | +7 shopping-list merge/deduction/incompatible-unit, +5 substitution allergen guard |
| Journeys | 37 | 37 | unchanged, re-run |

## Known limitations (honest)

- Dev-corpus `nutrition_info` is synthetic whole-recipe data; the estimated-
  value machinery (`per_serving` scaling, `nutrition_estimated` flags) is
  unit-tested but only fully exercised once the real 10k dataset lands (DEV-01).
- Diet-type filtering still needs ≥10 tagged recipes to activate (pre-existing
  behaviour, unchanged, documented in FEATURE-STATUS).
- Substitution dataset (`substitutions_json`) is empty in the dev corpus, so
  the allergen guard is verified at the unit level; end-to-end coverage needs
  real substitution data.
