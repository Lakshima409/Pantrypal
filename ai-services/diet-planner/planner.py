# ai-services/diet-planner/planner.py
# 7-day × 4-slot (breakfast/lunch/dinner/snack) weekly meal plan generator
# (blueprint §28): calorie-target aware, allergen-filtered, variety-seeking.
import random
import time

import pymysql

from config import DB_CONFIG

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
SLOTS = ["breakfast", "lunch", "dinner", "snack"]
MEALS_PER_DAY = len(SLOTS)

BREAKFAST_HINTS = ("breakfast", "pancake", "oatmeal", "oats", "cereal", "omelette",
                   "toast", "waffle", "porridge", "yogurt", "granola")

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
    """Corpus loader with a 15-minute in-memory cache."""
    now = time.time()
    if not force and CACHE["recipes"] is not None and now - CACHE["loaded_at"] < REFRESH_SECONDS:
        return CACHE["recipes"]
    recipes = _fetch("SELECT recipe_id, title FROM recipes")
    nut = {r["recipe_id"]: r for r in _fetch("SELECT recipe_id, calories FROM nutrition_info")}
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
        out.append({
            "recipe_id": rid,
            "title": r["title"],
            "calories": float(nut.get(rid, {}).get("calories") or 0),
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
    """
    rng = random.Random(seed)
    prefs = {"allergies": allergies or []}
    banned = _banned_terms(prefs)
    allowed = [r for r in load_recipes() if not _clashes(r, banned)]

    diet = str(diet_type or "").strip().lower()
    if diet and diet not in ("none", "any", ""):
        tagged = [r for r in allowed if any(diet in t for t in r["tags"])]
        if len(tagged) >= 10:
            allowed = tagged
    if not allowed:
        allowed = load_recipes()  # degenerate case — never return an empty week

    per_meal = float(calorie_goal or 2000) / MEALS_PER_DAY
    breakfasts = [r for r in allowed if _is_breakfast(r)] or allowed
    snacks = sorted(allowed, key=lambda r: abs(r["calories"] - per_meal * 0.5))[: max(len(allowed) // 3, 1)]
    mains = allowed

    def queue(pool):
        shuffled = pool[:]
        rng.shuffle(shuffled)
        return shuffled

    pools = {"breakfast": queue(breakfasts), "lunch": queue(mains),
             "dinner": queue(mains), "snack": queue(snacks or allowed)}
    cursors = {slot: 0 for slot in SLOTS}
    used = set()  # one shared set: lunch & dinner never repeat the same recipe

    def pick(slot, target):
        pool = pools[slot] or pools["lunch"] or allowed
        start = cursors[slot] % max(len(pool), 1)
        ordered = pool[start:] + pool[:start]
        unused = [r for r in ordered if r["recipe_id"] not in used]
        candidates = unused or ordered  # reuse only when every pool is exhausted
        # Nearest calorie fit to this slot's target; variety via shared used-set.
        best = min(candidates, key=lambda r: abs(r["calories"] - target) if r["calories"] else 1e9)
        cursors[slot] = (start + 1) % max(len(pool), 1)
        used.add(best["recipe_id"])
        return best

    meals = []
    n_days = int(days) if 1 <= int(days) <= 7 else 7
    for day in DAYS[:n_days]:
        for slot in SLOTS:
            target = per_meal * (0.6 if slot == "snack" else 1.0)
            recipe = pick(slot, target)
            meals.append({"day": day, "mealType": slot, "recipeId": recipe["recipe_id"]})
    return meals
