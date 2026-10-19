# ai-services/recommender/tests/test_priority2.py
# Priority 2 — hybrid scoring hardening:
#   * component normalisation and score bounds
#   * allergy / dietary hard filters
#   * missing nutrition values
#   * empty interaction history (cold-start)
#   * unknown users and unseen recipes
#   * duplicate removal and deterministic ranking
#   * training/test separation and leakage prevention
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # service root

import scoring
from evaluate_model import (
    RELEVANCE_GRADE,
    WEIGHTS,
    precision_at_k,
    recall_at_k,
    ndcg_at_k,
    catalog_coverage,
    diversity_score,
    popular_recommendations,
    temporal_split,
)

TODAY = date.today()
iso = lambda d: d.isoformat()  # noqa: E731


# ---------------------------------------------------------------------------
# 1. Component normalisation and score bounds
# ---------------------------------------------------------------------------

class TestNormalisationBounds:
    def test_all_weights_sum_to_one(self):
        assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9

    def test_final_score_always_in_zero_to_one(self):
        combos = [
            {"content": 0.99, "pantry": 0.99, "dietary": 0.99},
            {"content": 0.0, "pantry": 0.0, "dietary": 0.0},
            {"content": 5.0, "pantry": -1.0, "dietary": 0.5},
            {"content": 0.5, "pantry": 0.3, "dietary": 0.7,
             "nutrition": 0.2, "preference": 0.8, "expiry": 0.1, "collaborative": 0.4},
            {},
        ]
        for components in combos:
            score = scoring.final_score(components)
            assert 0.0 <= score <= 1.0, f"score={score} for {components}"

    def test_pantry_match_bounded(self):
        assert 0.0 <= scoring.pantry_match(["a", "b"], ["a"]) <= 1.0
        assert 0.0 <= scoring.pantry_match([], []) <= 1.0
        assert 0.0 <= scoring.pantry_match(["a"], []) <= 1.0

    def test_nutrition_match_bounded(self):
        assert 0.0 <= scoring.nutrition_match(500, 2000) <= 1.0
        assert 0.0 <= scoring.nutrition_match(9999, 2000) <= 1.0
        assert 0.0 <= scoring.nutrition_match(0, 2000) <= 1.0

    def test_expiry_priority_bounded(self):
        item = {"name": "tomato", "expiry_date": iso(TODAY + timedelta(days=1))}
        assert 0.0 <= scoring.expiry_priority(["tomato"], [item]) <= 1.0

    def test_diet_match_only_returns_known_values(self):
        for args in [
            (["dinner"], ["peanut"], ["peanut"], None),
            (["vegetarian"], ["paneer"], [], "vegetarian"),
            (["non-vegetarian"], ["chicken"], [], "vegetarian"),
            (["dinner"], ["chicken"], [], "vegan"),
            ([], ["chicken"], [], "vegan"),
            ([], [], [], None),
        ]:
            val = scoring.diet_match(*args)
            assert val in (0.0, 0.4, 1.0), f"unexpected diet_match value {val} for {args}"

# ---------------------------------------------------------------------------
# 2. Allergy / dietary hard filters
# ---------------------------------------------------------------------------

class TestHardFilters:
    def test_allergy_ingredient_match_is_hard_filter(self):
        assert scoring.diet_match(["dinner"], ["peanut butter", "flour"], ["peanut"], None) == 0.0

    def test_allergy_tag_match_is_hard_filter(self):
        assert scoring.diet_match(["contains nuts"], ["flour"], ["nuts"], None) == 0.0

    def test_conflicting_diet_tag_is_hard_filter(self):
        assert scoring.diet_match(["non-vegetarian"], ["chicken"], [], "vegetarian") == 0.0

    def test_matching_diet_tag_is_pass(self):
        assert scoring.diet_match(["vegetarian"], ["paneer"], [], "vegetarian") == 1.0

    def test_no_tags_with_diet_requirement_is_neutral(self):
        assert scoring.diet_match([], ["chicken"], [], "vegetarian") == 0.4

    def test_no_diet_requirement_is_pass(self):
        assert scoring.diet_match(["dinner"], ["chicken"], [], None) == 1.0
        assert scoring.diet_match(["dinner"], ["chicken"], [], "none") == 1.0

    def test_allergy_beats_high_content_score(self):
        components = {"content": 1.0, "pantry": 1.0, "dietary": 0.0,
                      "nutrition": 1.0, "preference": 1.0, "expiry": 1.0,
                      "collaborative": 1.0}
        assert components["dietary"] == 0.0

    def test_multiple_allergens_all_checked(self):
        # Both banned terms present -> hard filter
        assert scoring.diet_match([], ["peanut", "shrimp"], ["peanut", "shrimp"], None) == 0.0
        # Only one banned term matches -> hard filter
        assert scoring.diet_match([], ["peanut", "shrimp"], ["peanut"], None) == 0.0
        # No banned term matches -> pass
        assert scoring.diet_match([], ["peanut", "shrimp"], ["shellfish"], None) == 1.0


# ---------------------------------------------------------------------------
# 3. Missing nutrition values
# ---------------------------------------------------------------------------

class TestMissingNutrition:
    def test_missing_calories_returns_neutral(self):
        assert scoring.nutrition_match(None, 2000) == 0.5
        assert scoring.nutrition_match(0, 2000) == 0.5

    def test_missing_goal_returns_neutral(self):
        assert scoring.nutrition_match(500, None) == 0.5
        assert scoring.nutrition_match(500, 0) == 0.5

    def test_missing_nutrition_not_treated_as_healthy_or_unhealthy(self):
        assert scoring.nutrition_match(None, 2000) == 0.5

    def test_known_calories_score_by_proximity(self):
        goal = 2000
        per_meal = 500
        assert scoring.nutrition_match(per_meal, goal) == 1.0
        assert scoring.nutrition_match(per_meal * 2, goal) == 0.0
        mid = scoring.nutrition_match(per_meal + 100, goal)
        assert 0.0 < mid < 1.0


# ---------------------------------------------------------------------------
# 4. Cold-start / empty interaction history
# ---------------------------------------------------------------------------

class TestColdStart:
    def test_decay_weight_handles_missing_age(self):
        from recommender import _decay_weight
        assert _decay_weight(4.0, None) == 4.0
        assert _decay_weight(4.0, "bad") == 4.0
        assert _decay_weight(None, 0) == 0.0

    def test_popular_recommendations_works_with_empty_history(self):
        model = {
            "popularity": {101: 0.9, 102: 0.7, 103: 0.5},
            "ids": [101, 102, 103],
        }
        recs = popular_recommendations(model, k=3, exclude_seen=True,
                                       train_interactions=[], uid=999)
        assert len(recs) == 3
        assert recs[0][0] == 101

    def test_popular_recommendations_excludes_seen(self):
        model = {"popularity": {101: 0.9, 102: 0.7, 103: 0.5},
                 "ids": [101, 102, 103]}
        train = [{"user_id": 1, "recipe_id": 101, "type": "liked", "ts": "2026-01-01 00:00:00"}]
        recs = popular_recommendations(model, k=3, exclude_seen=True,
                                       train_interactions=train, uid=1)
        assert 101 not in [rid for rid, _ in recs]


# ---------------------------------------------------------------------------
# 5. Unknown users and unseen recipes
# ---------------------------------------------------------------------------

class TestUnknownUsersAndRecipes:
    def test_content_score_unknown_user_returns_zeros(self):
        from evaluate_model import content_score
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        docs = ["chicken curry onion", "salmon spinach lemon", "pasta tomato basil"]
        vec = TfidfVectorizer().fit_transform(docs)
        model = {
            "history": {1: {101: 1.0}},
            "index": {101: 0, 102: 1, 103: 2},
            "ids": [101, 102, 103],
            "matrix": vec,
            "vectoriser": None,
        }
        scores = content_score(model, 999)
        assert np.all(scores == 0.0)

    def test_cf_score_unknown_user_returns_zeros(self):
        from evaluate_model import cf_score
        model = {
            "history": {1: {101: 1.0}},
            "by_recipe": {101: {1}},
            "index": {101: 0, 102: 1},
            "ids": [101, 102],
        }
        scores = cf_score(model, 999)
        assert np.all(scores == 0.0)

    def test_preference_score_unknown_user_returns_zeros(self):
        from evaluate_model import preference_score
        model = {
            "history": {},
            "tags": {101: ["indian"], 102: ["italian"]},
            "index": {101: 0, 102: 1},
            "ids": [101, 102],
        }
        scores = preference_score(model, 999)
        assert np.all(scores == 0.0)


# ---------------------------------------------------------------------------
# 6. Duplicate removal and deterministic ranking
# ---------------------------------------------------------------------------

class TestDeterministicRanking:
    def test_tie_broken_by_recipe_id(self):
        recs = [
            {"recipe_id": 202, "score": 0.5, "_rid_for_sort": 202},
            {"recipe_id": 101, "score": 0.5, "_rid_for_sort": 101},
        ]
        recs.sort(key=lambda r: (-r["score"], r["_rid_for_sort"]))
        assert recs[0]["recipe_id"] == 101

    def test_rank_recommendations_deterministic(self):
        from evaluate_model import rank_recommendations, build_train_model, load_recipes, DATASETS_DIR
        recipes = load_recipes(DATASETS_DIR / "recipes.csv")
        train = [{"user_id": 1, "recipe_id": 900001, "type": "liked",
                  "ts": "2026-01-01 00:00:00"}]
        model = build_train_model(recipes, train)
        r1 = rank_recommendations(model, 1, k=10, exclude_seen=True, train_interactions=train)
        r2 = rank_recommendations(model, 1, k=10, exclude_seen=True, train_interactions=train)
        assert r1 == r2

    def test_no_duplicate_recipe_ids_in_output(self):
        from evaluate_model import rank_recommendations, build_train_model, load_recipes, DATASETS_DIR
        recipes = load_recipes(DATASETS_DIR / "recipes.csv")
        train = [{"user_id": 1, "recipe_id": 900001, "type": "liked",
                  "ts": "2026-01-01 00:00:00"}]
        model = build_train_model(recipes, train)
        recs = rank_recommendations(model, 1, k=20, exclude_seen=True, train_interactions=train)
        ids = [rid for rid, _ in recs]
        assert len(ids) == len(set(ids)), "duplicate recipe_ids in recommendations"

    def test_recommend_excludes_seen_recipes(self):
        from evaluate_model import rank_recommendations, build_train_model, load_recipes, DATASETS_DIR
        recipes = load_recipes(DATASETS_DIR / "recipes.csv")
        seen_recipe = 900001
        train = [{"user_id": 1, "recipe_id": seen_recipe, "type": "cooked",
                  "ts": "2026-01-01 00:00:00"}]
        model = build_train_model(recipes, train)
        recs = rank_recommendations(model, 1, k=12, exclude_seen=True, train_interactions=train)
        assert seen_recipe not in [rid for rid, _ in recs]


# ---------------------------------------------------------------------------
# 7. Training/test separation and leakage prevention
# ---------------------------------------------------------------------------

class TestLeakagePrevention:
    def test_temporal_split_returns_three_disjoint_sets(self):
        interactions = [
            {"user_id": 1, "recipe_id": 100, "type": "liked", "ts": f"2026-01-{d:02d} 12:00:00"}
            for d in range(1, 31)
        ]
        train, val, test, _ = temporal_split(interactions, train_ratio=0.6, val_ratio=0.2)
        train_keys = {(r["user_id"], r["recipe_id"], r["ts"]) for r in train}
        val_keys = {(r["user_id"], r["recipe_id"], r["ts"]) for r in val}
        test_keys = {(r["user_id"], r["recipe_id"], r["ts"]) for r in test}
        assert not (train_keys & val_keys), "train/val overlap"
        assert not (train_keys & test_keys), "train/test overlap"
        assert not (val_keys & test_keys), "val/test overlap"

    def test_temporal_split_preserves_order(self):
        interactions = [
            {"user_id": 1, "recipe_id": 100, "type": "liked", "ts": f"2026-01-{d:02d} 12:00:00"}
            for d in range(1, 31)
        ]
        train, val, test, _ = temporal_split(interactions, train_ratio=0.6, val_ratio=0.2)
        all_ts = [r["ts"] for r in train + val + test]
        assert all_ts == sorted(all_ts), "temporal order not preserved"

    def test_train_model_uses_only_train_interactions(self):
        from evaluate_model import build_train_model, load_recipes, DATASETS_DIR
        recipes = load_recipes(DATASETS_DIR / "recipes.csv")
        train = [
            {"user_id": 1, "recipe_id": 900001, "type": "liked", "ts": "2026-01-01 00:00:00"},
            {"user_id": 1, "recipe_id": 900002, "type": "cooked", "ts": "2026-01-02 00:00:00"},
        ]
        test_only_recipe = 900003
        model = build_train_model(recipes, train)
        assert set(model["history"][1].keys()) == {900001, 900002}
        assert test_only_recipe not in model["history"][1]

    def test_relevance_grades_positive_for_positive_types(self):
        positive = {"saved", "liked", "cooked", "rated"}
        for ptype in positive:
            assert RELEVANCE_GRADE[ptype] >= 2, f"{ptype} should have positive grade"

    def test_viewed_grade_lower_than_cooked(self):
        assert RELEVANCE_GRADE["viewed"] < RELEVANCE_GRADE["cooked"]
        assert RELEVANCE_GRADE["liked"] < RELEVANCE_GRADE["rated"]


# ---------------------------------------------------------------------------
# 8. Metric functions
# ---------------------------------------------------------------------------

class TestMetrics:
    def test_precision_at_k_perfect(self):
        recs = [(1, 0.9), (2, 0.8), (3, 0.7)]
        assert precision_at_k(recs, {1, 2, 3}, 3) == 1.0

    def test_precision_at_k_zero_hits(self):
        recs = [(4, 0.9), (5, 0.8), (6, 0.7)]
        assert precision_at_k(recs, {1, 2, 3}, 3) == 0.0

    def test_recall_at_k_partial(self):
        recs = [(1, 0.9), (2, 0.8), (3, 0.7)]
        # 2 hits out of 3 relevant = 2/3
        assert recall_at_k(recs, {1, 2, 99}, 3) == pytest.approx(2 / 3)
        # 1 hit out of 3 relevant = 1/3
        assert recall_at_k(recs, {1, 88, 99}, 3) == pytest.approx(1 / 3)

    def test_ndcg_perfect_ranking(self):
        recs = [(1, 0.9), (2, 0.8)]
        grades = {1: 5, 2: 3}
        assert ndcg_at_k(recs, grades, 2) == pytest.approx(1.0)

    def test_ndcg_empty_relevant(self):
        recs = [(1, 0.9), (2, 0.8)]
        assert ndcg_at_k(recs, {}, 2) == 0.0

    def test_catalog_coverage(self):
        all_recs = {1: [(101, 0.9), (102, 0.8)], 2: [(102, 0.9), (103, 0.8)]}
        assert catalog_coverage(all_recs, 100) == pytest.approx(0.03)

    def test_diversity_disjoint_lists(self):
        all_recs = {1: [(101, 0.9)], 2: [(102, 0.9)]}
        assert diversity_score(all_recs, None) == pytest.approx(1.0)
