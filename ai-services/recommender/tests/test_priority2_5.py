# ai-services/recommender/tests/test_priority2_5.py
# Priority 2.5 — preference-aware synthetic data:
#   * reproducibility (same seed → same output)
#   * preference diversity across users
#   * interaction generation biased by preference match
#   * valid recipe/user IDs
#   * timestamp ordering
#   * train/test separation
#   * content-based baseline evaluation behaviour
import csv
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # service root
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "datasets"))  # datasets dir

from generate_datasets import (
    build_user_profiles,
    recipe_match_score,
    write_preference_interactions,
    _type_weights_for_match,
    CUISINES,
    MEAL_TYPES,
)
from evaluate_model import (
    content_baseline_recommendations,
    load_recipes,
    load_interactions,
    temporal_split,
    DATASETS_DIR,
)


# ---------------------------------------------------------------------------
# 1. Reproducibility
# ---------------------------------------------------------------------------

class TestReproducibility:
    def test_same_seed_same_profiles(self):
        import random as _random
        p1 = build_user_profiles(50, rng=_random.Random(999))
        p2 = build_user_profiles(50, rng=_random.Random(999))
        assert p1 == p2

    def test_different_seed_different_profiles(self):
        import random as _random
        p1 = build_user_profiles(50, rng=_random.Random(111))
        p2 = build_user_profiles(50, rng=_random.Random(222))
        assert p1 != p2

    def test_same_seed_same_interactions(self):
        import random as _random
        import tempfile, os
        recipes = {900001: {"tags": ["indian", "dinner"]},
                   900002: {"tags": ["italian", "lunch"]},
                   900003: {"tags": ["thai", "dinner"]}}
        profiles = build_user_profiles(5, rng=_random.Random(42))
        with tempfile.TemporaryDirectory() as td:
            p1 = os.path.join(td, "a.csv")
            p2 = os.path.join(td, "b.csv")
            write_preference_interactions(p1, profiles, recipes, 100, rng=_random.Random(42))
            write_preference_interactions(p2, profiles, recipes, 100, rng=_random.Random(42))
            with open(p1) as f1, open(p2) as f2:
                assert f1.read() == f2.read()


# ---------------------------------------------------------------------------
# 2. Preference diversity
# ---------------------------------------------------------------------------

class TestPreferenceDiversity:
    def test_profiles_have_different_cuisines(self):
        profiles = build_user_profiles(50)
        cuisine_sets = [frozenset(p["preferred_cuisines"]) for p in profiles.values()]
        assert len(set(cuisine_sets)) > 1

    def test_profiles_have_different_meals(self):
        profiles = build_user_profiles(50)
        meal_sets = [frozenset(p["preferred_meals"]) for p in profiles.values()]
        assert len(set(meal_sets)) > 1

    def test_profiles_have_at_least_one_cuisine_and_meal(self):
        profiles = build_user_profiles(30)
        for uid, p in profiles.items():
            assert len(p["preferred_cuisines"]) >= 1
            assert len(p["preferred_meals"]) >= 1

    def test_profiles_cuisines_are_valid(self):
        profiles = build_user_profiles(30)
        for p in profiles.values():
            for c in p["preferred_cuisines"]:
                assert c in CUISINES

    def test_profiles_meals_are_valid(self):
        profiles = build_user_profiles(30)
        for p in profiles.values():
            for m in p["preferred_meals"]:
                assert m in MEAL_TYPES

# ---------------------------------------------------------------------------
# 3. Interaction generation
# ---------------------------------------------------------------------------

class TestInteractionGeneration:
    def test_match_score_bounded(self):
        tags = ["indian", "dinner", "spicy"]
        profile = {"preferred_cuisines": ["indian"], "preferred_meals": ["dinner"],
                   "preferred_diet": [], "preferred_other": ["spicy"]}
        s = recipe_match_score(tags, profile)
        assert 0.0 <= s <= 1.0

    def test_match_score_full_match(self):
        tags = ["indian", "dinner"]
        profile = {"preferred_cuisines": ["indian"], "preferred_meals": ["dinner"],
                   "preferred_diet": [], "preferred_other": []}
        assert recipe_match_score(tags, profile) == 1.0

    def test_match_score_no_match(self):
        tags = ["italian", "lunch"]
        profile = {"preferred_cuisines": ["indian"], "preferred_meals": ["dinner"],
                   "preferred_diet": [], "preferred_other": []}
        assert recipe_match_score(tags, profile) == 0.0

    def test_type_weights_depend_on_match(self):
        high = _type_weights_for_match(0.8)
        low = _type_weights_for_match(0.05)
        assert high[1][3] > low[1][3]  # cooked weight higher for high match
        assert low[1][0] > high[1][0]  # viewed weight higher for low match

    def test_type_weights_sum_to_one(self):
        for m in (0.0, 0.3, 0.9):
            _, weights = _type_weights_for_match(m)
            assert abs(sum(weights) - 1.0) < 1e-9


# ---------------------------------------------------------------------------
# 4. Valid IDs and timestamps
# ---------------------------------------------------------------------------

class TestValidData:
    def test_preference_interactions_have_valid_ids(self):
        interactions = load_interactions(DATASETS_DIR / "interactions_preference.csv")
        recipes = load_recipes(DATASETS_DIR / "recipes.csv")
        valid_rids = set(recipes.keys())
        valid_uids = set(range(1, 101))
        for row in interactions:
            assert row["user_id"] in valid_uids, f"invalid user_id {row['user_id']}"
            assert row["recipe_id"] in valid_rids, f"invalid recipe_id {row['recipe_id']}"

    def test_preference_interactions_timestamps_ordered(self):
        interactions = load_interactions(DATASETS_DIR / "interactions_preference.csv")
        timestamps = [row["ts"] for row in interactions]
        assert timestamps == sorted(timestamps), "preference interactions not chronological"

    def test_preference_interactions_types_valid(self):
        valid = {"viewed", "saved", "liked", "cooked", "rated"}
        interactions = load_interactions(DATASETS_DIR / "interactions_preference.csv")
        for row in interactions:
            assert row["type"] in valid


# ---------------------------------------------------------------------------
# 5. Train/test separation
# ---------------------------------------------------------------------------

class TestTrainTestSeparation:
    def test_preference_split_disjoint(self):
        interactions = load_interactions(DATASETS_DIR / "interactions_preference.csv")
        train, val, test, _ = temporal_split(interactions)
        train_keys = {(r["user_id"], r["recipe_id"], r["ts"]) for r in train}
        val_keys = {(r["user_id"], r["recipe_id"], r["ts"]) for r in val}
        test_keys = {(r["user_id"], r["recipe_id"], r["ts"]) for r in test}
        assert not (train_keys & val_keys)
        assert not (train_keys & test_keys)
        assert not (val_keys & test_keys)

    def test_preference_split_chronological(self):
        interactions = load_interactions(DATASETS_DIR / "interactions_preference.csv")
        train, val, test, _ = temporal_split(interactions)
        if train and val:
            assert train[-1]["ts"] <= val[0]["ts"]
        if val and test:
            assert val[-1]["ts"] <= test[0]["ts"]


# ---------------------------------------------------------------------------
# 6. Content-based baseline behaviour
# ---------------------------------------------------------------------------

class TestContentBaseline:
    def test_content_baseline_returns_k_results(self):
        recipes = load_recipes(DATASETS_DIR / "recipes.csv")
        train = [{"user_id": 1, "recipe_id": 900001, "type": "liked",
                  "ts": "2026-01-01 00:00:00"}]
        from evaluate_model import build_train_model
        model = build_train_model(recipes, train)
        recs = content_baseline_recommendations(model, 1, k=10,
                                                exclude_seen=True,
                                                train_interactions=train)
        assert len(recs) <= 10
        assert len(recs) > 0

    def test_content_baseline_excludes_seen(self):
        recipes = load_recipes(DATASETS_DIR / "recipes.csv")
        train = [{"user_id": 1, "recipe_id": 900001, "type": "liked",
                  "ts": "2026-01-01 00:00:00"}]
        from evaluate_model import build_train_model
        model = build_train_model(recipes, train)
        recs = content_baseline_recommendations(model, 1, k=10,
                                                exclude_seen=True,
                                                train_interactions=train)
        assert 900001 not in [rid for rid, _ in recs]

    def test_content_baseline_deterministic(self):
        recipes = load_recipes(DATASETS_DIR / "recipes.csv")
        train = [{"user_id": 1, "recipe_id": 900001, "type": "liked",
                  "ts": "2026-01-01 00:00:00"}]
        from evaluate_model import build_train_model
        model = build_train_model(recipes, train)
        r1 = content_baseline_recommendations(model, 1, k=10, exclude_seen=True,
                                              train_interactions=train)
        r2 = content_baseline_recommendations(model, 1, k=10, exclude_seen=True,
                                              train_interactions=train)
        assert r1 == r2

    def test_content_baseline_no_duplicates(self):
        recipes = load_recipes(DATASETS_DIR / "recipes.csv")
        train = [{"user_id": 1, "recipe_id": 900001, "type": "liked",
                  "ts": "2026-01-01 00:00:00"}]
        from evaluate_model import build_train_model
        model = build_train_model(recipes, train)
        recs = content_baseline_recommendations(model, 1, k=10, exclude_seen=True,
                                                train_interactions=train)
        ids = [rid for rid, _ in recs]
        assert len(ids) == len(set(ids))


# ---------------------------------------------------------------------------
# 7. Preference data file exists and is well-formed
# ---------------------------------------------------------------------------

class TestPreferenceFiles:
    def test_user_preferences_file_exists(self):
        assert (DATASETS_DIR / "user_preferences.csv").exists()

    def test_user_preferences_has_100_users(self):
        with open(DATASETS_DIR / "user_preferences.csv", newline="") as f:
            rows = list(csv.DictReader(f))
        assert len(rows) == 100

    def test_generation_metadata_exists(self):
        import json
        with open(DATASETS_DIR / "generation_meta_preference.json") as f:
            meta = json.load(f)
        assert meta["mode"] == "preference"
        assert meta["seed"] == 20261017
        assert meta["exploration_rate"] == 0.30
        assert "metric_definitions" in meta
