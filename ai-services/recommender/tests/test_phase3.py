# ai-services/recommender/tests/test_phase3.py
# Phase 3 — content-based hardening (3.1), temporal CF (3.2), hybrid + context
# (3.3). Pure functions only — no MySQL required.
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # service root

import preprocessing
import scoring
from recommender import _decay_weight


def test_canonical_ingredient_synonyms_and_plurals():
    assert preprocessing.canonical_ingredient("Garbanzo") == "chickpea"
    assert preprocessing.canonical_ingredient("chick peas") == "chickpea"
    assert preprocessing.canonical_ingredient("Tomatoes") == "tomato"
    assert preprocessing.canonical_ingredient("CAPSICUM") == "bell pepper"
    assert preprocessing.canonical_ingredient("chopped spinach 108") == "chopped spinach"
    assert preprocessing.canonical_ingredient("") == ""
    assert preprocessing.canonical_ingredient(None) == ""


def test_dedupe_ingredients_collapses_variants():
    out = preprocessing.dedupe_ingredients(["Tomato", "tomatoes", "TOMATO", "onion"])
    assert out == ["tomato", "onion"]


def test_recipe_document_missing_data_safe():
    assert preprocessing.recipe_document("", [], []) == ""
    assert preprocessing.recipe_document(None, None, None) == ""
    doc = preprocessing.recipe_document("Chicken Curry", ["Chicken", "chicken", "rice"], ["dinner"])
    assert "chicken" in doc.split()
    assert doc.split().count("chicken") >= 1  # title + one deduped ingredient


def test_pantry_match_canonicalised_and_deduped():
    # Synonym + case tolerant …
    assert scoring.pantry_match(["Garbanzo Beans"], ["chickpea"]) >= 0.0  # no crash path
    assert scoring.pantry_match(["Tomatoes", "tomato"], ["tomato"]) == 1.0  # deduped
    # … but genuinely missing ingredients still score 0.
    assert scoring.pantry_match(["saffron"], ["rice"]) == 0.0
    assert scoring.pantry_match([], ["rice"]) == 0.0
    assert scoring.pantry_match(["rice"], []) == 0.0


def test_decay_weight_half_life():
    assert _decay_weight(4.0, 0) == 4.0
    assert abs(_decay_weight(4.0, 90.0) - 2.0) < 1e-9  # one half-life
    assert _decay_weight(4.0, 180.0) < _decay_weight(4.0, 90.0)  # monotonic
    assert _decay_weight(4.0, -5) == 4.0  # negative age clamped


def test_pantry_match_moves_ranking():
    # Same content/preference lead, but one recipe matches the pantry fully.
    base = {"content": 0.8, "dietary": 1.0, "nutrition": 0.5,
            "preference": 0.8, "expiry": 0.0, "collaborative": 0.0}
    strong = dict(base, pantry=1.0)
    weak = dict(base, pantry=0.0)
    assert scoring.final_score(strong) > scoring.final_score(weak)
    gap = scoring.final_score(strong) - scoring.final_score(weak)
    assert gap >= 0.20  # pantry weight 0.25 guarantees a meaningful swing


def test_final_score_clamps_unnormalised_input():
    assert scoring.final_score({"pantry": 5.0, "content": -3.0}) <= 1.0
    assert scoring.final_score({"pantry": 5.0, "content": -3.0}) >= 0.0
    custom = dict(scoring.WEIGHTS)
    custom["pantry"] = 0.50
    custom["content"] = 0.05  # keep sum at 1.0
    assert scoring.final_score({"pantry": 1.0}, weights=custom) > \
        scoring.final_score({"pantry": 1.0})


def test_context_slot_mapping_and_multiplier():
    assert scoring.meal_slot_for_hour(8) == "breakfast"
    assert scoring.meal_slot_for_hour(12) == "lunch"
    assert scoring.meal_slot_for_hour(16) == "snack"
    assert scoring.meal_slot_for_hour(20) == "dinner"
    assert scoring.meal_slot_for_hour(2) is None
    assert scoring.context_multiplier(["breakfast", "quick"], "breakfast") == 1.15
    assert scoring.context_multiplier(["dinner", "indian"], "breakfast") == 0.9
    assert scoring.context_multiplier(["dinner"], "dinner") == 1.0


def test_apply_context_promotes_slot_fit():
    recs = [
        {"recipe_id": 1, "score": 0.80},  # dinner curry
        {"recipe_id": 2, "score": 0.78},  # pancakes
    ]
    tags = {1: ["dinner", "indian"], 2: ["breakfast", "quick"]}
    out = scoring.apply_context(recs, tags, "breakfast")
    assert out[0]["recipe_id"] == 2  # breakfast fit promoted to top
