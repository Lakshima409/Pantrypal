# ai-services/recommender/tests/test_scoring.py
# Unit tests for the hybrid score components (blueprint §61: PyTest).
# Pure functions only — no MySQL required:  python -m pytest tests -q
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # service root

import scoring


def test_pantry_match_full_and_partial():
    ings = ["chicken thigh", "rice", "onion", "soy sauce"]
    assert scoring.pantry_match(ings, ["chicken thigh", "rice", "onion", "soy sauce"]) == 1.0
    assert scoring.pantry_match(ings, ["chicken thigh"]) == 0.25
    assert scoring.pantry_match(ings, []) == 0.0
    assert scoring.pantry_match([], ["rice"]) == 0.0


def test_pantry_match_prefix_handles_dataset_ids():
    # Recipe rows look like 'chopped spinach 108' while the pantry says 'chopped spinach'.
    assert scoring.pantry_match(["chopped spinach 108"], ["chopped spinach"]) == 1.0


def test_diet_match_allergen_hard_filter():
    assert scoring.diet_match(["dinner"], ["peanut butter", "flour"], ["peanut"], None) == 0.0
    assert scoring.diet_match(["dinner"], ["flour", "sugar"], ["peanut"], None) == 1.0
    assert scoring.diet_match([], ["flour"], [], "vegan") == 0.4  # neutral, no tags


def test_diet_match_diet_type_tag():
    assert scoring.diet_match(["vegetarian"], ["paneer"], [], "vegetarian") == 1.0
    # whole-word check: 'vegetarian' must not match 'non-vegetarian'
    # Priority 2: conflicting diet tag → hard filter (0.0), not neutral
    assert scoring.diet_match(["non-vegetarian"], ["chicken"], [], "vegetarian") == 0.0
    # Recipe with no tags when diet_type is set → neutral (cannot verify)
    assert scoring.diet_match([], ["chicken"], [], "vegetarian") == 0.4


def test_nutrition_match_targets_per_meal():
    # goal 2000 → 500 kcal/meal target
    assert scoring.nutrition_match(500, 2000) == 1.0
    assert scoring.nutrition_match(1000, 2000) == 0.0  # 100% off target
    assert scoring.nutrition_match(None, 2000) == 0.5  # unknown → neutral
    assert 0 < scoring.nutrition_match(650, 2000) < 1


def test_expiry_priority_soon_beats_later():
    from datetime import date, timedelta
    today = date.today()
    soon = {"name": "tomato", "expiry_date": (today + timedelta(days=1)).isoformat()}
    later = {"name": "tomato", "expiry_date": (today + timedelta(days=10)).isoformat()}
    assert scoring.expiry_priority(["tomato"], [soon]) > 0
    assert scoring.expiry_priority(["tomato"], [later]) == 0  # >3 days out → no bonus
    assert scoring.expiry_priority(["rice"], [soon]) == 0     # not in recipe
    assert scoring.expiry_priority(["tomato"], []) == 0


def test_final_score_weight_bounds():
    assert scoring.final_score({}) == 0.0
    all_max = {k: 1.0 for k in scoring.WEIGHTS}
    assert scoring.final_score(all_max) == 1.0
    # weight set must sum to 1.0 (§24 pipeline)
    assert abs(sum(scoring.WEIGHTS.values()) - 1.0) < 1e-9


def test_final_score_partial_is_between():
    val = scoring.final_score({"pantry": 1.0, "dietary": 1.0, "content": 0.5})
    assert 0.0 < val < 1.0
