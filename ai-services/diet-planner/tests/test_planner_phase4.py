# ai-services/diet-planner/tests/test_planner_phase4.py
# Phase 4 — calorie-distribution rule, missing-nutrition handling, constraint
# validation (plan_summary), and complete-week guarantees.
# Uses the live MySQL corpus (same pattern as test_planner.py) plus one
# monkeypatched synthetic corpus for the None-calorie case.
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # service root

import planner


def test_slot_targets_follow_configurable_share_rule():
    t = planner.slot_targets(2000)
    assert t["breakfast"] == 500.0   # 25 %
    assert t["lunch"] == 700.0       # 35 %
    assert t["dinner"] == 600.0      # 30 %
    assert t["snack"] == 200.0       # 10 %
    assert abs(sum(t.values()) - 2000.0) < 1e-9
    # Rule is configurable but always sums to the goal.
    t2 = planner.slot_targets(1800)
    assert abs(sum(t2.values()) - 1800.0) < 1e-9


def test_plan_summary_validates_constraints():
    meals = planner.generate_plan(calorie_goal=2000, days=7, seed=21)
    s = planner.plan_summary(meals, calorie_goal=2000)
    assert s["completeWeek"] is True
    assert len(meals) == 28
    assert all(v == 7 for v in s["slotCounts"].values())  # 7 per slot
    assert s["weekCalorieTarget"] == 14000.0
    # Dev corpus has whole-recipe nutrition → no estimated meals expected,
    # but the counters must exist and be sane.
    assert s["unknownCalorieMeals"] >= 0
    assert s["estimatedCalorieMeals"] >= 0
    assert s["repeatedRecipes"] == 0  # 62 recipes > 28 slots


def test_heavy_allergen_still_yields_complete_week():
    # Pool shrinks after exclusions; the week must NOT be truncated (DEV-07).
    meals = planner.generate_plan(
        calorie_goal=2000, allergies=["chicken", "beef", "prawns", "salmon"], days=7, seed=5
    )
    assert len(meals) == 28
    recipes = {r["recipe_id"]: r for r in planner.load_recipes()}
    for m in meals:
        text = " ".join(recipes[m["recipeId"]]["ingredients"] + recipes[m["recipeId"]]["tags"])
        for banned in ("chicken", "beef", "prawns", "salmon"):
            assert banned not in text


def test_none_calories_never_break_or_win(monkeypatch):
    # Synthetic corpus: one recipe with UNKNOWN calories (None).
    fake = [
        {"recipe_id": 1, "title": "Mystery", "calories": None,
         "nutrition_estimated": False, "tags": ["breakfast"], "ingredients": ["egg"]},
        {"recipe_id": 2, "title": "Known", "calories": 500.0,
         "nutrition_estimated": False, "tags": ["lunch"], "ingredients": ["rice"]},
    ]
    monkeypatch.setattr(planner, "load_recipes", lambda force=False: fake)
    meals = planner.generate_plan(calorie_goal=2000, days=7, seed=1)
    # Corpus of 2 < 28 slots → deliberate reuse, but the week is complete
    # and the None-calorie recipe never wins the nearest-calorie contest
    # (except when it is the only unused candidate).
    assert len(meals) == 28
    s = planner.plan_summary(meals, calorie_goal=2000)
    assert s["unknownCalorieMeals"] >= 1  # the None recipe was used…
    assert s["completeWeek"] is True
    known_wins = sum(1 for m in meals if m["recipeId"] == 2)
    assert known_wins >= s["unknownCalorieMeals"]  # …but never preferred


def test_pool_exhaustion_refills_instead_of_truncating(monkeypatch):
    # 30 recipes → first 28 slots can all be unique; no repeats expected.
    fake = [
        {"recipe_id": 1000 + i, "title": f"R{i}", "calories": 300.0 + i * 10,
         "nutrition_estimated": False, "tags": ["lunch"], "ingredients": ["rice"]}
        for i in range(30)
    ]
    monkeypatch.setattr(planner, "load_recipes", lambda force=False: fake)
    meals = planner.generate_plan(calorie_goal=2000, days=7, seed=2)
    ids = [m["recipeId"] for m in meals]
    assert len(ids) == 28
    assert len(set(ids)) == 28  # no reuse while alternatives exist
