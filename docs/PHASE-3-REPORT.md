# Phase 3 — Recommendation engine improvements

**Branch:** `Phases` · **Date:** 2026-10-15
**Scope:** `ai-services/recommender/` — TF-IDF content filtering, user-user
collaborative filtering, hybrid scoring, context-aware re-ranking, and a
reproducible evaluation harness. Node/Flask contracts unchanged except one
optional field (`hour`). **No new dependencies.**

---

## 3.1 Content-based filtering (TF-IDF + cosine retained)

| Problem | Evidence | Fix |
|---|---|---|
| Pantry match double-counted | A recipe listing "Tomato" twice counted the hit twice (each row compared independently) | `scoring.pantry_match` canonicalises + dedupes both sides; one canonical ingredient = one vote |
| Inconsistent normalisation | TF-IDF used `normalise()`, pantry used ad-hoc `.lower()`; "Garbanzo" never matched pantry "chickpea" | `preprocessing.canonical_ingredient()`: lowercase → strip punctuation → drop dataset-id suffixes ("spinach 108") → strip quantity fragments ("2 cups") → curated synonym map (~25 pairs) → light plural strip. Shared by documents **and** pantry matching |
| Duplicate ingredients | `recipe_document` emitted every row, inflating term frequency | `dedupe_ingredients()` per recipe |
| Missing data | Empty title / no ingredients could yield empty TF-IDF documents | `recipe_document` degrades to `""` safely |

Synonym map is small, curated and checked in (`preprocessing.SYNONYMS`) so
experiments stay reproducible. Tests: `chick peas`/`Garbanzo` → `chickpea`,
`Tomatoes` dedupes with `tomato`.

## 3.2 Collaborative filtering (user-user retained, temporal decay added)

- **Positive feedback defined** (`recommender.POSITIVE_TYPES`): `saved`,
  `liked`, `cooked`, `rated` positive; `viewed` weak implicit signal.
  Weights: viewed 1, saved 2, liked 3, cooked 4, rated 5.
- **Temporal decay (Priority-2 algorithm, implemented):** interaction weight
  × `0.5 ** (age_days / 90)` — 90-day half-life (`CF_HALF_LIFE_DAYS`).
  History rows now carry `timestamp`; negative ages clamp to 0. Decayed
  weights drive both the content-history profile and CF neighbour cosine,
  so recent cooks outrank stale views.
- **Sparse-history guard:** thin histories produce smaller neighbour weights;
  cold users (no interactions) get zeros and fall back to pantry + diet (§23)
  — verified live: `user_id=null` still returns a full top-5.
- **Honest finding:** on the 62-recipe / ~11-user dev corpus, history-vs-cold
  top-5 ordering was identical in the probe — too small for CF to move the
  ranking measurably. The decay path is unit-tested and will matter at scale.

## 3.3 Hybrid scoring (seven components retained, normalized, centrally weighted)

- `scoring.WEIGHTS` remains the **single central config** (sums to 1.0,
  asserted at import). `final_score(components, weights=None)` accepts an
  override for A/B runs; `WEIGHTS_JSON` env var overrides without code
  changes (same 7 keys, must sum to 1.0, else ignored with a warning).
- **Normalization verified:** content/cf/preference arrive pre-normalised;
  pantry/dietary/nutrition/expiry are 0..1 by construction; `final_score`
  clamps every component defensively.
- **Strong pantry match meaningfully influences ranking** — regression test
  `test_pantry_match_moves_ranking`: identical non-pantry components,
  pantry 1.0 vs 0.0 → gap ≥ 0.20 (the 0.25 pantry weight), i.e. a full
  pantry match outranks any plausible content+preference lead.


## 3.4 Reproducible evaluation (new: `evaluate.py`)

Fixed dataset: 4 cold-start cases (pantry + allergen bans; held-out recipes
chosen by **actual DB overlap**, not aspirational titles — see limitation).
Metrics: Precision@K, Recall@K, F1@K, pantry coverage (mean `pantry_match`
over top-K), diversity (1 − mean pairwise TF-IDF cosine), response time.
Deterministic — no randomness anywhere.

```bash
cd ai-services/recommender && python evaluate.py --k 5
```

**Results (K=5, dev corpus, 2026-10-15):**

| Case | P@5 | R@5 | F1@5 | Coverage | Diversity | ms |
|---|---|---|---|---|---|---|
| 1 (breakfast staples) | 0.40 | 1.00 | 0.57 | 0.53 | 0.79 | 8.7 |
| 2 (chickpea/bread, peanut-banned) | 0.40 | 1.00 | 0.57 | 0.57 | 0.71 | 5.3 |
| 3 (chicken/oats) | 0.40 | 1.00 | 0.57 | 0.61 | 0.72 | 4.6 |
| 4 (rice/tomato, two bans) | 0.20 | 0.50 | 0.29 | 0.42 | 0.84 | 4.6 |
| **mean** | **0.35** | **0.875** | **0.50** | **0.53** | **0.76** | **5.8** |

An earlier harness iteration (title-assumed held-outs) scored P@5 = 0.05 —
replaced by overlap-derived fixtures; both runs are reproducible from git.

## Priority-1 algorithm added: context-aware filtering

Time-of-day / meal-type suitability, opt-in and contract-safe:

- `scoring.meal_slot_for_hour(hour)` — 5-11 breakfast, 11-15 lunch,
  15-18 snack, 18-23 dinner, overnight → None.
- `scoring.context_multiplier(tags, slot)` — 1.15 on slot fit, 0.9 on clear
  mismatch (dinner curry at breakfast; breakfast-only at dinner), else 1.0.
- `scoring.apply_context()` re-scales the ranked list after the 7-component
  score; `Recommender.recommend(..., hour=...)` applies it.
- Node unchanged (sends no `hour` → Phase 2 behaviour identical).
  Flask `/recommend` accepts the optional `hour`.

**Live proof** (Flask :5001, same pantry, user 5040):

```
hour  8 → 900036, 900029, 900033, …   (breakfast-tagged rise to the top)
hour 20 → 900004, 900001, 900005, …   (dinner recipes lead)
```

## Algorithms deliberately deferred (with rationale)

| Priority | Algorithm | Why deferred |
|---|---|---|
| 3 | Enhanced ALS | Needs ≥ ~1k users × dense interactions; corpus = 62 recipes / ~11 users. Temporal-decay CF (done) already provides the "does history help" measurement infrastructure |
| 4 | Neural CF | Same data requirement plus meaningful baseline — ALS must show gain first |
| 5 | Graph-based | Ingredient/recipe bipartite graph would mostly rediscover TF-IDF similarity here; revisit when pantry-substitution edges exist in DB |
| 6 | Multi-armed bandit | Requires reliable feedback collection + safe A/B evaluation; not until production telemetry exists |

## Tests & verification

- `python -m pytest tests -q` → **17 passed** (8 original scoring tests
  untouched + 9 new `test_phase3.py`: canonicalisation, dedupe, missing
  data, decay half-life, pantry ranking influence, clamping, context slots).
- Node `npm test` → 35/35; journeys → 37/37 — no regressions.
- Live Flask probes: context (above), cold start, allergen bans, `hour`
  optional.

## Known limitation (recorded, not hidden)

`database/generate-dev-corpus.js` pairs real titles/tags with **pseudo-random
ingredient indices** — e.g. "Classic Chicken Curry" contains bread, oats and
blueberries. Phase-1 fixture artefact (see `BASELINE-REPORT §1.2`). Evaluation
fixtures therefore use **measured DB overlap**, not semantic titles. Fixing
this needs the real 10k dataset import (DEV-01) — out of Phase 3 scope.

## Files

| File | Change |
|---|---|
| `preprocessing.py` | `canonical_ingredient`, `dedupe_ingredients`, synonym map, id-suffix/quantity stripping, missing-data guards |
| `scoring.py` | `pantry_match` rewrite (dedupe + canonical), `WEIGHTS_JSON` central override, `final_score(weights=)`, context: `meal_slot_for_hour`, `context_multiplier`, `apply_context` |
| `recommender.py` | timestamp-aware history loading, `_decay_weight` (90-day half-life), `POSITIVE_TYPES`, `recommend(..., hour=)` |
| `app.py` | optional `hour` in `/recommend` |
| `evaluate.py` | **new** — reproducible P/R/F1@K, coverage, diversity, latency |
| `tests/test_phase3.py` | **new** — 9 tests |
