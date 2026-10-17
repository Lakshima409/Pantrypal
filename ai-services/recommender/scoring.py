# ai-services/recommender/scoring.py
# Hybrid score pipeline (blueprint §24).
#
# Phase 3.3 — refined hybrid scoring:
#   * WEIGHTS is the single central config (sums to 1.0; validated at import).
#     Override per-request via final_score(components, weights=...) or the
#     WEIGHTS_JSON env var (JSON object with the same 7 keys).
#   * every component is normalised to 0..1 before weighting (content/cf/pref
#     arrive pre-normalised; nutrition/expiry/dietary/pantry are 0..1 by
#     construction; final_score clamps defensively).
#   * pantry weight (0.25) is large enough that a full pantry match
#     (+0.25) outranks a pure content+preference lead — verified in
#     tests/test_scoring.py::test_pantry_match_moves_ranking.
import json
import os
from datetime import date, datetime

WEIGHTS = {
    "content": 0.30,     # TF-IDF cosine similarity vs user history
    "pantry": 0.25,      # how much of the recipe the user already has
    "dietary": 0.15,     # allergen / restriction / diet-type fit
    "nutrition": 0.10,   # calorie proximity to per-meal target
    "preference": 0.10,  # tag/cuisine affinity from interactions
    "expiry": 0.05,      # bonus for using soon-to-expire pantry items (§21)
    "collaborative": 0.05,  # user-user CF (§22), 0 during cold start (§23)
}

# Central override without code changes (experiments stay reproducible by
# logging the env value alongside results).
_env_weights = os.environ.get("WEIGHTS_JSON")
if _env_weights:
    try:
        _parsed = json.loads(_env_weights)
        if set(_parsed) == set(WEIGHTS) and abs(sum(_parsed.values()) - 1.0) < 1e-6:
            WEIGHTS = {k: float(v) for k, v in _parsed.items()}
        else:
            print("[scoring] WEIGHTS_JSON ignored: must carry the same 7 keys summing to 1.0")
    except (ValueError, TypeError) as exc:
        print(f"[scoring] WEIGHTS_JSON ignored ({exc})")

assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9, "WEIGHTS must sum to 1.0"

MEALS_PER_DAY = 4
DAYS_IN_WEEK = 7


def clamp01(x):
    return 0.0 if x != x else max(0.0, min(1.0, float(x)))  # NaN-safe


def pantry_match(ingredient_names, pantry_names):
    """Fraction of recipe ingredients already in the pantry (§20).

    Phase 3.3: uses IngredientMatcher. Returns required_available / total_required.
    Empty recipe or empty pantry → 0.0 (cold start falls back to diet/popularity).
    """
    from preprocessing import IngredientMatcher

    matcher = IngredientMatcher(ingredient_names, pantry_names)
    result = matcher.match()
    return result['match_percent']


def diet_match(recipe_tags, ingredient_names, banned_terms, diet_type):
    """0 = allergen/restriction clash (hard filter), 1 = fits, 0.4 = neutral.

    Hard filter semantics: a return of 0.0 means the recipe must be excluded
    entirely (§8-9, §21). Callers must treat 0.0 as a hard exclusion, not as
    a low score that can be overcome by other components.

    Missing/unknown diet_type → neutral 1.0 (no restriction to enforce).
    Recipe with no tags when a diet_type is set → neutral 0.4 (cannot verify).
    Recipe with tags that conflict with required diet → 0.0 hard filter.
    """
    text = " ".join(str(t).lower() for t in (recipe_tags or [])) + " " + \
           " ".join(str(i).lower() for i in (ingredient_names or []))
    banned = [str(b).strip().lower() for b in (banned_terms or []) if str(b).strip()]
    if any(term and term in text for term in banned):
        return 0.0  # hard filter — caller must exclude
    if diet_type and str(diet_type).strip().lower() not in ("none", "any", ""):
        wanted = str(diet_type).strip().lower()
        tags = " ".join(str(t).lower() for t in (recipe_tags or []))
        # Whole-word match, but 'vegetarian' must NOT match 'non-vegetarian'.
        import re
        negated = f"non-{wanted}" in tags or f"non {wanted}" in tags
        if not negated and re.search(rf"\b{re.escape(wanted)}\b", tags):
            return 1.0
        if not recipe_tags:
            return 0.4  # cannot verify compliance → neutral
        return 0.0  # hard filter: declared tags conflict with required diet
    return 1.0



def nutrition_match(recipe_calories, calorie_goal):
    """Proximity of recipe kcal to the per-meal target derived from the goal."""
    if not recipe_calories or not calorie_goal:
        return 0.5  # unknown nutrition → neutral
    per_meal = float(calorie_goal) / MEALS_PER_DAY
    diff = abs(float(recipe_calories) - per_meal)
    return clamp01(1.0 - diff / max(per_meal, 1.0))


def expiry_priority(ingredient_names, expiring):
    """
    expiring: [{name, expiry_date}] from the user's pantry (§21).
    Returns up to 1.0 — recipes using items expiring within 3 days get more.

    Phase 4: EXPIRED items (days_left < 0) contribute NOTHING to the boost —
    encouraging users to cook with spoiled food is unsafe. Use expired_flag()
    separately to surface a discard warning instead.
    """
    if not expiring or not ingredient_names:
        return 0.0
    today = datetime.now().date()
    best = 0.0
    recipe_ings = {str(i).strip().lower() for i in ingredient_names}
    for item in expiring:
        name = str(item.get("name", "")).strip().lower()
        if not name:
            continue
        matched = name in recipe_ings or any(
            n.startswith(name) or name.startswith(n) for n in recipe_ings
        )
        if not matched:
            continue
        raw = item.get("expiry_date") or item.get("expiryDate")
        if not raw:
            continue
        try:
            exp = date.fromisoformat(str(raw)[:10])
        except ValueError:
            continue
        days_left = (exp - today).days
        if days_left < 0:
            continue  # expired — no "use me" boost (Phase 4 safety fix)
        if days_left <= 3:
            best = max(best, 1.0 - days_left * 0.25)  # 1.0 today → 0.25 at day 3
    return best


def expired_flag(ingredient_names, expiring):
    """True when a recipe uses at least one ALREADY-EXPIRED pantry item.

    Phase 4: distinct from expiry_priority — the UI should show a discard
    warning for these, not a "cook me first" badge.
    """
    if not expiring or not ingredient_names:
        return False
    today = datetime.now().date()
    recipe_ings = {str(i).strip().lower() for i in ingredient_names}
    for item in expiring:
        name = str(item.get("name", "")).strip().lower()
        if not name:
            continue
        matched = name in recipe_ings or any(
            n.startswith(name) or name.startswith(n) for n in recipe_ings
        )
        if not matched:
            continue
        raw = item.get("expiry_date") or item.get("expiryDate")
        if not raw:
            continue
        try:
            exp = date.fromisoformat(str(raw)[:10])
        except ValueError:
            continue
        if (exp - today).days < 0:
            return True
    return False


def final_score(components, weights=None):
    """Weighted sum of all component scores → single 0..1 score (§24).

    Every component is clamped to 0..1 first so an unnormalised caller
    can't dominate the ranking. Pass weights= to run A/B experiments
    without touching the central WEIGHTS.
    """
    w = weights or WEIGHTS
    total = 0.0
    for key, weight in w.items():
        total += weight * clamp01(components.get(key, 0.0))
    return round(clamp01(total), 4)


# Phase 3.3 — context-aware filtering (Priority 1).
# Meal-type suitability: maps clock hour → expected slot and scores how well
# a recipe's tags fit that slot. Applied as a post-rank multiplier by
# apply_context() so the seven core components stay untouched.
MEAL_BY_HOUR = (
    (5, 11, "breakfast"),
    (11, 15, "lunch"),
    (15, 18, "snack"),
    (18, 23, "dinner"),
)
BREAKFAST_TAGS = {"breakfast", "pancake", "oatmeal", "oats", "cereal", "omelette",
                  "toast", "waffle", "porridge", "yogurt", "granola", "smoothie"}
SNACK_TAGS = {"snack", "quick", "smoothie", "bites", "dip"}


def meal_slot_for_hour(hour):
    """Clock hour (0-23) → breakfast/lunch/snack/dinner (None overnight)."""
    try:
        h = int(hour)
    except (TypeError, ValueError):
        return None
    for start, end, slot in MEAL_BY_HOUR:
        if start <= h < end:
            return slot
    return None  # 23-05: no strong expectation


def context_multiplier(recipe_tags, slot):
    """1.15 when the recipe fits the slot, 0.9 on a clear mismatch, else 1.0."""
    if not slot:
        return 1.0
    tags = {str(t).strip().lower() for t in (recipe_tags or [])}
    if slot == "breakfast":
        if tags & BREAKFAST_TAGS or "breakfast" in tags:
            return 1.15
        if "dinner" in tags and not (tags & BREAKFAST_TAGS):
            return 0.9
        return 1.0
    if slot == "snack":
        if tags & SNACK_TAGS:
            return 1.15
        return 1.0
    # lunch/dinner: only penalise a hard breakfast-only recipe at dinner.
    if slot == "dinner" and "breakfast" in tags and "dinner" not in tags:
        return 0.9
    return 1.0


def apply_context(results, recipe_tags_by_id, slot):
    """Re-weight a ranked list for time-of-day; stable re-sort by score."""
    if not slot:
        return results
    out = []
    for r in results:
        mult = context_multiplier(recipe_tags_by_id.get(r.get("recipe_id")), slot)
        entry = dict(r)
        entry["score"] = round(float(r.get("score", 0.0)) * mult, 4)
        out.append(entry)
    out.sort(key=lambda r: r["score"], reverse=True)
    return out
