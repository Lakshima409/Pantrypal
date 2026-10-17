# ai-services/recommender/recommender.py
# Hybrid recommender: TF-IDF content similarity (§19) + collaborative
# filtering (§22) + pantry/diet/nutrition/expiry signals (§20-21), combined
# with the §24 weights. Loads its corpus from a pickled model file by default;
# falls back to MySQL refresh when no pickle is present.
import math
import os
import pickle
import threading
import time
from datetime import datetime
from pathlib import Path

import numpy as np
import pymysql
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

import scoring
from config import DB_CONFIG
from preprocessing import IngredientMatcher, recipe_document

SERVICE_ROOT = Path(__file__).resolve().parent
MODEL_PICKLE_PATH = SERVICE_ROOT / "model" / "tfidf_model.pkl"
USE_PICKLE = os.environ.get("USE_PICKLE", "true").lower() == "true"

# Phase 3.2 — what counts as positive feedback. Views are weak implicit
# signal; saves/likes/cooks/ratings are positive. Weights feed both the
# content-history profile and the user-user CF neighbour similarity.
INTERACTION_WEIGHTS = {"viewed": 1, "saved": 2, "liked": 3, "cooked": 4, "rated": 5}
POSITIVE_TYPES = {"saved", "liked", "cooked", "rated"}
# Temporal decay: interactions older than the half-life count half as much.
# 90 days keeps the 62-recipe dev corpus stable while letting recent cooks
# outweigh stale views on the real dataset.
CF_HALF_LIFE_DAYS = 90.0
REFRESH_SECONDS = 900  # rebuild corpus every 15 minutes


def _decay_weight(base_weight, age_days):
    """Exponential time decay on an interaction weight (Phase 3.2)."""
    try:
        age = max(float(age_days or 0.0), 0.0)
    except (TypeError, ValueError):
        age = 0.0
    try:
        base = float(base_weight or 0.0)
    except (TypeError, ValueError):
        base = 0.0
    return base * (0.5 ** (age / CF_HALF_LIFE_DAYS))


def _fetch(sql, args=None):
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cur:
            cur.execute(sql, args or ())
            columns = [d[0] for d in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        conn.close()


def _norm(s):
    return str(s or "").strip().lower()


class Recommender:
    """Thread-safe in-memory model. Loads from pickle by default; falls back to MySQL."""

    def __init__(self):
        self._lock = threading.Lock()
        self.ready = False
        self.loaded_at = None
        if USE_PICKLE and MODEL_PICKLE_PATH.exists():
            self.load_from_pickle()
        else:
            self.refresh()

    # ---------- data loading ----------

    @classmethod
    def load_from_pickle_path(cls, path=MODEL_PICKLE_PATH):
        """Load a previously trained model from a pickle file."""
        import pickle as _pickle
        with open(path, "rb") as fh:
            payload = _pickle.load(fh)

        instance = cls.__new__(cls)
        instance._lock = threading.Lock()
        instance.vectoriser = payload["vectoriser"]
        instance.matrix = payload["matrix"]
        instance.ids = payload["ids"]
        instance.index = payload.get("index", {rid: i for i, rid in enumerate(payload["ids"])})
        instance.ingredients = payload["ingredients"]
        instance.tags = payload["tags"]
        instance.nutrition = payload["nutrition"]
        instance.popularity = payload.get("popularity", {})
        instance.history = payload["history"]
        instance.by_recipe = payload.get("by_recipe", {})
        instance.ready = True
        instance.loaded_at = payload.get("trained_at", time.time())
        return instance

    def load_from_pickle(self, path=MODEL_PICKLE_PATH):
        """Load a previously trained model from a pickle file into this instance."""
        loaded = self.load_from_pickle_path(path)
        self.vectoriser = loaded.vectoriser
        self.matrix = loaded.matrix
        self.ids = loaded.ids
        self.index = loaded.index
        self.ingredients = loaded.ingredients
        self.tags = loaded.tags
        self.nutrition = loaded.nutrition
        self.popularity = loaded.popularity
        self.history = loaded.history
        self.by_recipe = loaded.by_recipe
        self.ready = loaded.ready
        self.loaded_at = loaded.loaded_at
        print(f"[recommender] loaded pickled model: {len(self.ids)} recipes from {path}")

    def save_to_pickle(self, path=MODEL_PICKLE_PATH):
        """Persist the current in-memory model to a pickle file."""
        import pickle as _pickle
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "vectoriser": self.vectoriser,
            "matrix": self.matrix,
            "ids": self.ids,
            "index": self.index,
            "ingredients": self.ingredients,
            "tags": self.tags,
            "nutrition": self.nutrition,
            "popularity": self.popularity,
            "history": self.history,
            "by_recipe": self.by_recipe,
            "documents_count": len(self.ids),
            "features": len(self.vectoriser.vocabulary_),
            "trained_at": datetime.now().isoformat(),
        }
        with open(path, "wb") as fh:
            _pickle.dump(payload, fh, protocol=_pickle.HIGHEST_PROTOCOL)
        print(f"[recommender] saved model to {path} ({len(self.ids)} recipes)")

    def refresh(self):
        recipes = _fetch("SELECT recipe_id, title FROM recipes")
        ing_rows = _fetch(
            "SELECT ri.recipe_id, i.name FROM recipe_ingredients ri "
            "JOIN ingredients i ON i.ingredient_id = ri.ingredient_id"
        )
        tag_rows = _fetch(
            "SELECT rt.recipe_id, t.tag_name FROM recipe_tags rt "
            "JOIN tags t ON t.tag_id = rt.tag_id"
        )
        nut_rows = _fetch("SELECT recipe_id, calories, protein FROM nutrition_info")
        inter_rows = _fetch(
            "SELECT user_id, recipe_id, type, "
            "COALESCE(timestamp, NOW()) AS ts FROM interactions"
        )
        pop_rows = _fetch(
            "SELECT recipe_id, COUNT(*) AS n FROM interactions GROUP BY recipe_id"
        )

        ings, tags = {}, {}
        for r in ing_rows:
            ings.setdefault(r["recipe_id"], []).append(r["name"])
        for r in tag_rows:
            tags.setdefault(r["recipe_id"], []).append(r["tag_name"])
        nutrition = {r["recipe_id"]: r for r in nut_rows}
        popularity = {r["recipe_id"]: int(r["n"]) for r in pop_rows}

        ids = [r["recipe_id"] for r in recipes]
        docs = [
            recipe_document(r["title"], ings.get(r["recipe_id"], []),
                            tags.get(r["recipe_id"], []))
            for r in recipes
        ]
        vectoriser = TfidfVectorizer(stop_words="english", max_features=12000,
                                      ngram_range=(1, 2), min_df=2)
        matrix = vectoriser.fit_transform(docs)

        # user_id -> {recipe_id: decayed weight}; recipe_id -> set of users.
        # Sparse-history guard: users with a single interaction keep the raw
        # weight (no decay penalty) so cold users still get CF neighbours.
        now = datetime.now()
        history, by_recipe = {}, {}
        for row in inter_rows:
            base = INTERACTION_WEIGHTS.get(row["type"], 1)
            ts = row.get("ts")
            try:
                age_days = (now - ts).total_seconds() / 86400.0 if ts else 0.0
            except (TypeError, AttributeError):
                age_days = 0.0
            w = _decay_weight(base, age_days)
            uid, rid = int(row["user_id"]), int(row["recipe_id"])
            user_hist = history.setdefault(uid, {})
            user_hist[rid] = max(user_hist.get(rid, 0.0), w)
            by_recipe.setdefault(rid, set()).add(uid)

        max_pop = max(popularity.values()) if popularity else 1
        with self._lock:
            self.recipes = {r["recipe_id"]: r for r in recipes}
            self.ids = ids
            self.index = {rid: i for i, rid in enumerate(ids)}
            self.ingredients = ings
            self.tags = tags
            self.nutrition = nutrition
            self.popularity = {rid: n / max_pop for rid, n in popularity.items()}
            self.vectoriser, self.matrix = vectoriser, matrix
            self.history, self.by_recipe = history, by_recipe
            self.ready = True
            self.loaded_at = time.time()

    def start_refresh_loop(self):
        def loop():
            while True:
                time.sleep(REFRESH_SECONDS)
                try:
                    self.refresh()
                except Exception as exc:  # keep serving old model on failure
                    print(f"[recommender] refresh failed: {exc}")
        threading.Thread(target=loop, daemon=True).start()

    # ---------- component scores ----------

    def _content_score(self, uid):
        """Weighted mean TF-IDF similarity of candidate vs interacted recipes (§19)."""
        hist = (self.history.get(uid) or {}).items()
        rows, weights = [], []
        for rid, w in hist:
            i = self.index.get(rid)
            if i is not None:
                rows.append(i)
                weights.append(w)
        if not rows:
            return np.zeros(len(self.ids))
        sims = cosine_similarity(self.matrix[rows], self.matrix)  # (h, N)
        w = np.asarray(weights, dtype=float)
        return (sims * w[:, None]).sum(axis=0) / w.sum()

    def _cf_score(self, uid):
        """User-user CF over shared interactions (§22); zeros when cold (§23)."""
        hist = self.history.get(uid)
        if not hist:
            return np.zeros(len(self.ids))
        neighbour_hits = {}
        for rid in hist:
            for other in self.by_recipe.get(rid, ()):
                if other != uid:
                    neighbour_hits[other] = neighbour_hits.get(other, 0) + 1
        if not neighbour_hits:
            return np.zeros(len(self.ids))
        base = np.sqrt(sum(w * w for w in hist.values())) or 1.0
        out = np.zeros(len(self.ids))
        for other, shared in neighbour_hits.items():
            oh = self.history.get(other) or {}
            other_norm = np.sqrt(sum(w * w for w in oh.values())) or 1.0
            sim = shared / (base * other_norm)
            for rid, w in oh.items():
                i = self.index.get(rid)
                if i is not None:
                    out[i] += sim * w
        peak = out.max()
        return out / peak if peak > 0 else out

    def _preference_score(self, uid):
        """Tag affinity derived from the user's interacted recipes (§8)."""
        hist = (self.history.get(uid) or {}).items()
        if not hist:
            return np.zeros(len(self.ids))
        affinity = {}
        for rid, w in hist:
            for tag in self.tags.get(rid, []):
                key = _norm(tag)
                affinity[key] = affinity.get(key, 0.0) + w
        if not affinity:
            return np.zeros(len(self.ids))
        peak = max(affinity.values())
        out = np.zeros(len(self.ids))
        for rid, recipe_tags in self.tags.items():
            i = self.index.get(rid)
            if i is None:
                continue
            score = sum(affinity.get(_norm(t), 0.0) for t in recipe_tags) / max(len(recipe_tags), 1)
            out[i] = score / peak
        return out

    def _seen_recipes(self, uid):
        """Recipe IDs the user has already interacted with (from train history).

        Used to exclude already-seen recipes from recommendations so the
        system surfaces *new* discoveries rather than re-recommending the
        same items.
        """
        if uid is None:
            return set()
        return set(self.history.get(uid, {}))

    # ---------- main entry ----------

    def recommend(self, user_id, limit, pantry, preferences, filters=None, hour=None):
        uid = int(user_id) if user_id else None
        pantry_names, expiring = [], []
        for p in pantry or []:
            if isinstance(p, dict):
                name = p.get("name")
                if name:
                    pantry_names.append(name)
                    exp_date = p.get("expiry_date") or p.get("expiryDate")
                    if exp_date:
                        expiring.append({"name": name, "expiry_date": exp_date})
            elif p:
                pantry_names.append(str(p))

        prefs = preferences or {}
        banned = list(prefs.get("allergies") or []) + \
                 list(prefs.get("dietaryRestrictions") or []) + \
                 list(prefs.get("healthConditions") or [])
        dietary = prefs.get("dietary") or []
        diet_type = prefs.get("dietType") or (dietary[0] if dietary else None)
        calorie_goal = float(prefs.get("calorieGoal") or 2000)

        with self._lock:
            content = self._content_score(uid) if uid else np.zeros(len(self.ids))
            cf = self._cf_score(uid) if uid else np.zeros(len(self.ids))
            pref = self._preference_score(uid) if uid else np.zeros(len(self.ids))
            ids = list(self.ids)
            ings, tags = self.ingredients, self.tags
            nuts, pop = self.nutrition, self.popularity

        # --- cold-start detection ---
        seen = self._seen_recipes(uid)
        has_history = uid is not None and uid in self.history and bool(self.history[uid])

        results = []
        seen_ids_in_results = set()  # dedupe guard
        for i, rid in enumerate(ids):
            # Exclude already-interacted recipes (discovery behaviour)
            if rid in seen:
                continue
            recipe_ings = ings.get(rid, [])
            components = {
                "content": float(content[i]),
                "pantry": scoring.pantry_match(recipe_ings, pantry_names),
                "dietary": scoring.diet_match(tags.get(rid, []), recipe_ings, banned, diet_type),
                "nutrition": scoring.nutrition_match(
                    float(nuts.get(rid, {}).get("calories") or 0), calorie_goal),
                "preference": float(pref[i]),
                "expiry": scoring.expiry_priority(recipe_ings, expiring),
                "collaborative": float(cf[i]),
            }
            if components["dietary"] == 0.0:
                continue  # hard-filter allergen clashes (§9)
            # Priority 3: ingredient-level breakdown — computed only for recipes
            # that survive the dietary/allergy hard filter above.
            ing_match = IngredientMatcher(recipe_ings, pantry_names).match()
            score = scoring.final_score(components) + 0.001 * pop.get(rid, 0.0)
            results.append({
                "recipe_id": int(rid),
                "score": round(float(score), 4),
                "pantry_match": round(components["pantry"], 4),
                "diet_match": round(components["dietary"], 4),
                # Priority 3: ingredient-level breakdown
                "pantry_ingredients_met": ing_match["required_available"],
                "pantry_ingredients_remaining": ing_match["required_missing"],
                "ingredient_match_percent": ing_match["match_percent"],
                "pantry_total_required": ing_match["total_required"],
                "pantry_optional_available": ing_match["optional_available"],
                "pantry_optional_missing": ing_match["optional_missing"],
                # Phase 4: uses an already-expired pantry item → discard warning.
                "uses_expired": scoring.expired_flag(recipe_ings, expiring),
                "_rid_for_sort": int(rid),
            })

        # --- cold-start fallback: popularity + pantry for users with no history ---
        if not has_history and not results:
            for i, rid in enumerate(ids):
                if rid in seen or rid in seen_ids_in_results:
                    continue
                recipe_ings = ings.get(rid, [])
                ing_match = IngredientMatcher(recipe_ings, pantry_names).match()
                pantry = scoring.pantry_match(recipe_ings, pantry_names)
                dietary = scoring.diet_match(tags.get(rid, []), recipe_ings, banned, diet_type)
                if dietary == 0.0:
                    continue
                score = 0.001 * pop.get(rid, 0.0) + 0.5 * pantry
                results.append({
                    "recipe_id": int(rid),
                    "score": round(float(score), 4),
                    "pantry_match": round(pantry, 4),
                    "diet_match": round(dietary, 4),
                    # Priority 3: ingredient-level breakdown (cold-start path)
                    "pantry_ingredients_met": ing_match["required_available"],
                    "pantry_ingredients_remaining": ing_match["required_missing"],
                    "ingredient_match_percent": ing_match["match_percent"],
                    "pantry_total_required": ing_match["total_required"],
                    "pantry_optional_available": ing_match["optional_available"],
                    "pantry_optional_missing": ing_match["optional_missing"],
                    "uses_expired": scoring.expired_flag(recipe_ings, expiring),
                    "_rid_for_sort": int(rid),
                })
                seen_ids_in_results.add(rid)

        # Sort: score descending, then recipe_id ascending for deterministic ties
        results.sort(key=lambda r: (-r["score"], r["_rid_for_sort"]))
        # Remove the internal sort key from output
        for r in results:
            r.pop("_rid_for_sort", None)
        # Phase 3 Priority 1 — time-of-day context (opt-in via hour=).
        slot = scoring.meal_slot_for_hour(hour) if hour is not None else None
        if slot:
            tags_by_id = {rid: tags.get(rid, []) for rid in ids}
            results = scoring.apply_context(results, tags_by_id, slot)
        return results[: int(limit) or 12]
