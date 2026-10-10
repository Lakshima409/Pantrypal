# ai-services/diet-planner/tests/test_planner.py
# PyTest for the 7-day meal-plan generator (blueprint §61).
# generate_plan() reads the live MySQL corpus (already seeded on this machine).
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # service root

import planner


def test_generate_plan_shape_and_count():
    meals = planner.generate_plan(calorie_goal=2000, days=7, seed=7)
    assert len(meals) == 7 * 4  # 7 days × breakfast/lunch/dinner/snack (§28)
    days = {m["day"] for m in meals}
    assert days == set(planner.DAYS)
    for meal in meals:
        assert meal["mealType"] in planner.SLOTS
        assert isinstance(meal["recipeId"], int)


def test_no_duplicate_recipes_in_week():
    meals = planner.generate_plan(calorie_goal=2000, days=7, seed=11)
    counts = Counter(m["recipeId"] for m in meals)
    assert max(counts.values()) == 1, "a week must not repeat the same recipe while alternatives exist"


def test_allergens_filtered_out():
    banned = ["chicken"]
    meals = planner.generate_plan(calorie_goal=2000, allergies=banned, days=7, seed=3)
    ids = [m["recipeId"] for m in meals]
    recipes = {r["recipe_id"]: r for r in planner.load_recipes()}
    for rid in ids:
        recipe = recipes[rid]
        text = " ".join(recipe["ingredients"] + recipe["tags"])
        assert "chicken" not in text, f"allergen 'chicken' leaked into recipe {rid}"


def test_deterministic_with_seed_same_without_change():
    a = planner.generate_plan(calorie_goal=1800, days=7, seed=42)
    b = planner.generate_plan(calorie_goal=1800, days=7, seed=42)
    assert [m["recipeId"] for m in a] == [m["recipeId"] for m in b]
    c = planner.generate_plan(calorie_goal=1800, days=7, seed=43)
    assert [m["recipeId"] for m in a] != [m["recipeId"] for m in c]


def test_breakfast_slots_prefers_breakfast_recipes():
    meals = planner.generate_plan(calorie_goal=2000, days=7, seed=9)
    recipes = {r["recipe_id"]: r for r in planner.load_recipes()}
    breakfasts = [m for m in meals if m["mealType"] == "breakfast"]
    hits = sum(
        1 for m in breakfasts
        if planner._is_breakfast(recipes[m["recipeId"]])
    )
    # Most breakfast slots should get a breakfast-tagged/title recipe.
    assert hits >= len(breakfasts) // 2
