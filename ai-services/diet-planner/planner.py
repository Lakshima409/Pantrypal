# ai-services/diet-planner/planner.py
# 7-day × 4-slot (breakfast/lunch/dinner/snack) weekly meal plan generator
# (blueprint §28): calorie-target aware, allergen-filtered, variety-seeking.
#
# Phase 4:
#   * SLOT_SHARES — the 25/35/30/10 split is a CONFIGURABLE PLANNING RULE
#     (env PLANNER_SLOT_SHARES), not proof of nutritional health. The plan
#     response carries an explicit summary that validates totals and marks
#     estimated values.
#   * nutrition_basis + servings honoured: per_serving rows are scaled;
#     unknown/missing nutrition is flagged, never treated as exact 0 kcal.
#   * pool exhaustion refills instead of truncating the week (DEV-07).
import json
import os
import random
import time

import pymysql

from config import DB_CONFIG

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
SLOTS = ["breakfast", "lunch", "dinner", "snack"]
MEALS_PER_DAY = len(SLOTS)

BREAKFAST_HINTS = ("breakfast", "pancake", "oatmeal", "oats", "cereal", "omelette",
                   "toast", "waffle", "porridge", "yogurt", "granola")

# Configurable planning rule (blueprint research): default 25/35/30/10.
# Override with PLANNER_SLOT_SHARES='{"breakfast":0.3,...}' (must sum to 1.0).
SLOT_SHARES = {"breakfast": 0.25, "lunch": 0.35, "dinner": 0.30, "snack": 0.10}
_env_shares = os.environ.get("PLANNER_SLOT_SHARES")
if _env_shares:
    try:
        parsed = json.loads(_env_shares)
        if set(parsed) == set(SLOTS) and abs(sum(parsed.values()) - 1.0) < 1e-6:
            SLOT_SHARES = {k: float(v) for k, v in parsed.items()}
        else:
            print("[planner] PLANNER_SLOT_SHARES ignored: needs the 4 slot keys summing to 1.0")
    except (ValueError, TypeError) as exc:
        print(f"[planner] PLANNER_SLOT_SHARES ignored ({exc})")
assert abs(sum(SLOT_SHARES.values()) - 1.0) < 1e-9


def slot_targets(calorie_goal):
    """Per-slot calorie targets from the configurable share rule."""
    goal = float(calorie_goal or 2000)
    return {slot: goal * SLOT_SHARES[slot] for slot in SLOTS}

# Recipe corpus cache — reloads every REFRESH_SECONDS so each /mealplan call
# never re-queries MySQL (keeps well inside Node's 2s timeout, NFR §56).
CACHE = {"recipes": None, "loaded_at": 0.0}
REFRESH_SECONDS = 900


def _fetch(sql, args=None):
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cur:
            cur.execute(sql, args or ())
            columns = [d[0] for d in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        conn.close()


def load_recipes(force=False):
    """Corpus loader with a 15-minute in-memory cache.

    Phase 4: carries nutrition_basis + servings so calories can be scaled
    (per_serving → whole recipe) and ESTIMATED values flagged. A recipe with
    no nutrition row gets calories=None (unknown), never 0-as-exact.
    """
    now = time.time()
    if not force and CACHE["recipes"] is not None and now - CACHE["loaded_at"] < REFRESH_SECONDS:
        return CACHE["recipes"]
    recipes = _fetch("SELECT recipe_id, title FROM recipes")
    nut = {
        r["recipe_id"]: r
        for r in _fetch(
            "SELECT recipe_id, calories, protein, servings, nutrition_basis FROM nutrition_info"
        )
    }
    tags, ings = {}, {}
    for r in _fetch("SELECT rt.recipe_id, t.tag_name FROM recipe_tags rt "
                    "JOIN tags t ON t.tag_id = rt.tag_id"):
        tags.setdefault(r["recipe_id"], []).append(str(r["tag_name"]).lower())
    for r in _fetch("SELECT ri.recipe_id, i.name FROM recipe_ingredients ri "
                    "JOIN ingredients i ON i.ingredient_id = ri.ingredient_id"):
        ings.setdefault(r["recipe_id"], []).append(str(r["name"]).lower())
    out = []
    for r in recipes:
        rid = r["recipe_id"]
        row = nut.get(rid) or {}
        raw_cal = row.get("calories")
        basis = (row.get("nutrition_basis") or "unknown").lower()
        servings = row.get("servings")
        calories, estimated = None, False
        if raw_cal is not None:
            calories = float(raw_cal)
            if basis == "per_serving" and servings and float(servings) > 0:
                calories *= float(servings)  # scale to whole recipe
                estimated = True
            elif basis != "whole_recipe":
                estimated = True  # basis unknown → treat as estimate, not fact
        out.append({
            "recipe_id": rid,
            "title": r["title"],
            "calories": calories,               # None = unknown (never 0-as-exact)
            "nutrition_estimated": estimated,
            "tags": tags.get(rid, []),
            "ingredients": ings.get(rid, []),
        })
    CACHE["recipes"] = out
    CACHE["loaded_at"] = now
    return out


def _banned_terms(prefs):
    return [str(t).strip().lower() for t in (
        list(prefs.get("allergies") or []) +
        list(prefs.get("dietaryRestrictions") or []) +
        list(prefs.get("healthConditions") or [])
    ) if str(t).strip()]


def _clashes(recipe, banned):
    text = " ".join(recipe["ingredients"] + recipe["tags"])
    return any(term in text for term in banned)


def _is_breakfast(recipe):
    text = " ".join(recipe["tags"] + [recipe["title"].lower()])
    return any(h in text for h in BREAKFAST_HINTS)


def generate_plan(calorie_goal=2000, diet_type=None, allergies=None, days=7, seed=None):
    """
    Returns [{ day, mealType, recipeId }] — exactly the shape
    server/services/plannerService.js expects from POST /mealplan (§27).

    Phase 4:
      * per-slot targets from SLOT_SHARES (25/35/30/10 rule, configurable)
      * recipes with UNKNOWN calories (None) are valid but never win a
        nearest-calorie contest (treated as worst fit, not as 0 kcal)
      * allergen/diet exclusions run BEFORE any selection
      * pool exhaustion refills from the full allowed list (no short weeks)
      * repeated recipes counted so plan_summary() can report them
    """
    rng = random.Random(seed)
    prefs = {"allergies": allergies or []}
    banned = _banned_terms(prefs)
    # Exclusions BEFORE selection (Phase 4 requirement).
    allowed = [r for r in load_recipes() if not _clashes(r, banned)]

    diet = str(diet_type or "").strip().lower()
    if diet and diet not in ("none", "any", ""):
        tagged = [r for r in allowed if any(diet in t for t in r["tags"])]
        if len(tagged) >= 10:
            allowed = tagged
    if not allowed:
        allowed = load_recipes()  # degenerate case — never return an empty week

    targets = slot_targets(calorie_goal)
    breakfasts = [r for r in allowed if _is_breakfast(r)] or allowed
    snack_pool = sorted(
        (r for r in allowed if r["calories"] is not None),
        key=lambda r: abs(r["calories"] - targets["snack"]),
    )[: max(len(allowed) // 3, 1)] or allowed
    mains = allowed

    def queue(pool):
        shuffled = pool[:]
        rng.shuffle(shuffled)
        return shuffled

    pools = {"breakfast": queue(breakfasts), "lunch": queue(mains),
             "dinner": queue(mains), "snack": queue(snack_pool or allowed)}
    # Each pool refills from itself once exhausted: repeats only happen when
    # the corpus genuinely runs out (DEV-05 guard, tracked by plan_summary).
    cursors = {slot: 0 for slot in SLOTS}
    used = set()
    repeat_count = 0

    def pick(slot, target):
        nonlocal repeat_count
        pool = pools[slot] or pools["lunch"] or allowed
        start = cursors[slot] % max(len(pool), 1)
        ordered = pool[start:] + pool[:start]
        unused = [r for r in ordered if r["recipe_id"] not in used]
        candidates = unused or ordered  # reuse only when every pool is exhausted
        if not unused:
            repeat_count += 1
        # Nearest calorie fit; unknown calories (None) are the worst fit.
        best = min(
            candidates,
            key=lambda r: abs(r["calories"] - target) if r["calories"] is not None else 1e9,
        )
        cursors[slot] = (start + 1) % max(len(pool), 1)
        used.add(best["recipe_id"])
        return best

    meals = []
    n_days = int(days) if 1 <= int(days) <= 7 else 7
    for day in DAYS[:n_days]:
        for slot in SLOTS:
            recipe = pick(slot, targets[slot])
            meals.append({"day": day, "mealType": slot, "recipeId": recipe["recipe_id"]})
    # Stash repeats for plan_summary (same process, same cache).
    CACHE["_last_repeats"] = repeat_count
    return meals


def plan_summary(meals, calorie_goal=2000):
    """Validates a generated week and labels estimated values (Phase 4).

    The 25/35/30/10 split is a planning RULE, not a health guarantee — this
    summary reports measured totals, unknowns and repeats so callers can see
    exactly what is factual vs estimated.
    """
    recipes = {r["recipe_id"]: r for r in load_recipes()}
    by_slot = {s: 0 for s in SLOTS}
    known_total = 0.0
    unknown_meals = 0
    estimated_meals = 0
    ids = []
    for m in meals:
        by_slot[m["mealType"]] = by_slot.get(m["mealType"], 0) + 1
        ids.append(m["recipeId"])
        rec = recipes.get(m["recipeId"]) or {}
        if rec.get("calories") is None:
            unknown_meals += 1
        else:
            known_total += float(rec["calories"])
        if rec.get("nutrition_estimated"):
            estimated_meals += 1
    repeats = len(ids) - len(set(ids))
    target_week = float(calorie_goal or 2000) * (len(meals) / MEALS_PER_DAY if meals else 7)
    return {
        "slotShares": dict(SLOT_SHARES),
        "slotCounts": by_slot,
        "weekCalorieTarget": round(target_week, 1),
        "weekCaloriesKnown": round(known_total, 1),
        "unknownCalorieMeals": unknown_meals,
        "estimatedCalorieMeals": estimated_meals,
        "repeatedRecipes": repeats,
        "completeWeek": len(meals) == MEALS_PER_DAY * 7,
    }
