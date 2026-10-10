# ai-services/recommender/scoring.py
# Hybrid score pipeline (blueprint §24). Weights are tunable defaults, NOT
# values mandated by the report — tune experimentally (§24 note).
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

MEALS_PER_DAY = 4
DAYS_IN_WEEK = 7


def clamp01(x):
    return 0.0 if x != x else max(0.0, min(1.0, float(x)))  # NaN-safe


def pantry_match(ingredient_names, pantry_names):
    """Fraction of recipe ingredients already in the pantry (§20)."""
    if not ingredient_names or not pantry_names:
        return 0.0
    have = {str(p).strip().lower() for p in pantry_names}
    hits = 0
    for name in ingredient_names:
        n = str(name).strip().lower()
        if n in have:
            hits += 1
            continue
        # Dataset names carry ids ('spinach 108') — allow prefix overlap.
        if any(n.startswith(h) or h.startswith(n) for h in have):
            hits += 1
    return hits / len(ingredient_names)


def diet_match(recipe_tags, ingredient_names, banned_terms, diet_type):
    """0 = allergen/restriction clash, 1 = fits (§8-9, §21)."""
    text = " ".join(str(t).lower() for t in (recipe_tags or [])) + " " + \
           " ".join(str(i).lower() for i in (ingredient_names or []))
    banned = [str(b).strip().lower() for b in (banned_terms or []) if str(b).strip()]
    if any(term and term in text for term in banned):
        return 0.0
    if diet_type and str(diet_type).strip().lower() not in ("none", "any", ""):
        wanted = str(diet_type).strip().lower()
        tags = " ".join(str(t).lower() for t in (recipe_tags or []))
        # Whole-word match, but 'vegetarian' must NOT match 'non-vegetarian'.
        import re
        negated = f"non-{wanted}" in tags or f"non {wanted}" in tags
        if not negated and re.search(rf"\b{re.escape(wanted)}\b", tags):
            return 1.0
        return 0.4  # no explicit tag — neutral, don't punish hard
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
        if days_left <= 3:
            best = max(best, 1.0 - max(days_left, 0) * 0.25)  # 1.0 today → 0.25 at day 3
    return best


def final_score(components):
    """Weighted sum of all component scores → single 0..1 score (§24)."""
    total = 0.0
    for key, weight in WEIGHTS.items():
        total += weight * clamp01(components.get(key, 0.0))
    return round(clamp01(total), 4)
