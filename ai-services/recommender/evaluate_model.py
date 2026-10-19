# ai-services/recommender/evaluate_model.py
#
# Priority 1 — Proper evaluation pipeline for the hybrid recommender.
#
#   python evaluate_model.py
#
# What it does:
#   1. Loads recipes + interactions from datasets/ (CSV, no MySQL).
#   2. Splits interactions TEMPORALLY (train = earlier 80%, test = later 20%),
#      so we never train on future interactions and there is no data leakage.
#   3. Builds the hybrid model on TRAIN interactions only.
#   4. Generates top-K recommendations per test user and compares against
#      their held-out (test) interactions.
#   5. Reports Precision@K, Recall@K, NDCG@K, catalog coverage, and diversity
#      for both the hybrid recommender and a popular-recipes baseline.
#
# Metrics are computed per user, then macro-averaged across users who have
# at least one held-out relevant interaction.
#
import csv
import json
import math
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))  # service root

from preprocessing import recipe_document
from sklearn.feature_extraction.text import TfidfVectorizer

SERVICE_ROOT = Path(__file__).resolve().parent
DATASETS_DIR = SERVICE_ROOT / "datasets"

VECTORIZER_KWARGS = {
    "stop_words": "english",
    "max_features": 12000,
    "ngram_range": (1, 2),
    "min_df": 2,
}

INTERACTION_WEIGHTS = {"viewed": 1, "saved": 2, "liked": 3, "cooked": 4, "rated": 5}
CF_HALF_LIFE_DAYS = 90.0

POSITIVE_TYPES = {"saved", "liked", "cooked", "rated"}
RELEVANCE_GRADE = {"viewed": 1, "saved": 2, "liked": 3, "cooked": 4, "rated": 5}

WEIGHTS = {
    "content": 0.30,
    "pantry": 0.25,
    "dietary": 0.15,
    "nutrition": 0.10,
    "preference": 0.10,
    "expiry": 0.05,
    "collaborative": 0.05,
}

TOP_K = [5, 10]
TRAIN_RATIO = 0.70   # first 70% of interactions → train
VAL_RATIO = 0.10     # next 10% → validation (for weight tuning)
TEST_RATIO = 0.20    # last 20% → test (final comparison, untouched)


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_recipes(path):
    recipes = {}
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            rid = int(row["recipe_id"])
            recipes[rid] = {
                "recipe_id": rid,
                "title": row["title"],
                "ingredients": [i.strip() for i in row["ingredient_names"].split(",") if i.strip()],
                "tags": [t.strip() for t in row["tag_names"].split(",") if t.strip()],
                "calories": float(row["calories"]) if row.get("calories") else 0.0,
                "protein": float(row["protein"]) if row.get("protein") else 0.0,
                "fat": float(row["fat"]) if row.get("fat") else 0.0,
                "carbs": float(row["carbs"]) if row.get("carbs") else 0.0,
                "sodium": float(row["sodium"]) if row.get("sodium") else 0.0,
            }
    return recipes


def load_interactions(path):
    interactions = []
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            interactions.append({
                "user_id": int(row["user_id"]),
                "recipe_id": int(row["recipe_id"]),
                "type": row["type"],
                "ts": row["timestamp"],
            })
    return interactions


# ---------------------------------------------------------------------------
# Temporal train/test split
# ---------------------------------------------------------------------------

def temporal_split(interactions, train_ratio=TRAIN_RATIO, val_ratio=VAL_RATIO):
    """Split interactions TEMPORALLY into train / validation / test.

    Earlier interactions -> train, middle -> validation, later -> test.
    No interaction appears in more than one set; no future data leaks into
    earlier sets.

    Returns (train, validation, test, split_timestamps).
    """
    sorted_ints = sorted(interactions, key=lambda r: r["ts"])
    n = len(sorted_ints)
    n_train = int(n * train_ratio)
    n_val = int(n * val_ratio)
    train = sorted_ints[:n_train]
    val = sorted_ints[n_train:n_train + n_val]
    test = sorted_ints[n_train + n_val:]
    split_ts = (
        sorted_ints[n_train - 1]["ts"] if n_train > 0 else None,
        sorted_ints[n_train + n_val - 1]["ts"] if n_train + n_val < n else None,
    )
    return train, val, test, split_ts


# ---------------------------------------------------------------------------
# Model building (train-only, no leakage from test)
# ---------------------------------------------------------------------------

def build_train_model(recipes, train_interactions):
    """Build TF-IDF + CF structures from train interactions only."""
    ids = sorted(recipes.keys())
    index = {rid: i for i, rid in enumerate(ids)}

    docs = [
        recipe_document(recipes[rid]["title"],
                        recipes[rid]["ingredients"],
                        recipes[rid]["tags"])
        for rid in ids
    ]
    vectoriser = TfidfVectorizer(**VECTORIZER_KWARGS)
    matrix = vectoriser.fit_transform(docs)

    now = datetime.now()
    history, by_recipe = defaultdict(dict), defaultdict(set)
    for row in train_interactions:
        base = INTERACTION_WEIGHTS.get(row["type"], 1)
        try:
            ts = datetime.strptime(row["ts"], "%Y-%m-%d %H:%M:%S")
            age_days = (now - ts).total_seconds() / 86400.0
        except (ValueError, TypeError):
            age_days = 0.0
        w = float(base) * (0.5 ** (age_days / CF_HALF_LIFE_DAYS))
        uid, rid = int(row["user_id"]), int(row["recipe_id"])
        if rid in index:
            history[uid][rid] = max(history[uid].get(rid, 0.0), w)
            by_recipe[rid].add(uid)

    pop_counts = defaultdict(int)
    for row in train_interactions:
        rid = int(row["recipe_id"])
        if rid in index:
            pop_counts[rid] += 1
    max_pop = max(pop_counts.values()) if pop_counts else 1
    popularity = {rid: n / max_pop for rid, n in pop_counts.items()}

    nutrition = {
        rid: {
            "calories": recipes[rid]["calories"],
            "protein": recipes[rid]["protein"],
            "fat": recipes[rid]["fat"],
            "carbs": recipes[rid]["carbs"],
            "sodium": recipes[rid]["sodium"],
        }
        for rid in ids
    }

    ingredients = {rid: recipes[rid]["ingredients"] for rid in ids}
    tags = {rid: recipes[rid]["tags"] for rid in ids}

    return {
        "vectoriser": vectoriser,
        "matrix": matrix,
        "ids": ids,
        "index": index,
        "history": dict(history),
        "by_recipe": dict(by_recipe),
        "popularity": popularity,
        "nutrition": nutrition,
        "ingredients": ingredients,
        "tags": tags,
    }


# ---------------------------------------------------------------------------
# Scoring components (mirrors recommender.py / scoring.py logic)
# ---------------------------------------------------------------------------

def content_score(model, uid):
    """Weighted mean TF-IDF cosine similarity vs user's interacted recipes."""
    hist = model["history"].get(uid, {})
    if not hist:
        return np.zeros(len(model["ids"]))
    rows, weights = [], []
    for rid, w in hist.items():
        i = model["index"].get(rid)
        if i is not None:
            rows.append(i)
            weights.append(w)
    if not rows:
        return np.zeros(len(model["ids"]))
    from sklearn.metrics.pairwise import cosine_similarity
    sims = cosine_similarity(model["matrix"][rows], model["matrix"])
    w = np.asarray(weights, dtype=float)
    return (sims * w[:, None]).sum(axis=0) / w.sum()


def cf_score(model, uid):
    """User-user collaborative filtering (zero for cold users)."""
    hist = model["history"].get(uid)
    if not hist:
        return np.zeros(len(model["ids"]))
    neighbour_hits = defaultdict(int)
    for rid in hist:
        for other in model["by_recipe"].get(rid, ()):
            if other != uid:
                neighbour_hits[other] += 1
    if not neighbour_hits:
        return np.zeros(len(model["ids"]))
    base = math.sqrt(sum(w * w for w in hist.values())) or 1.0
    out = np.zeros(len(model["ids"]))
    for other, shared in neighbour_hits.items():
        oh = model["history"].get(other, {})
        other_norm = math.sqrt(sum(w * w for w in oh.values())) or 1.0
        sim = shared / (base * other_norm)
        for rid, w in oh.items():
            i = model["index"].get(rid)
            if i is not None:
                out[i] += sim * w
    peak = out.max()
    return out / peak if peak > 0 else out


def preference_score(model, uid):
    """Tag affinity from user's interacted recipes."""
    hist = model["history"].get(uid, {})
    if not hist:
        return np.zeros(len(model["ids"]))
    affinity = defaultdict(float)
    for rid, w in hist.items():
        for tag in model["tags"].get(rid, []):
            affinity[tag.strip().lower()] += w
    if not affinity:
        return np.zeros(len(model["ids"]))
    peak = max(affinity.values())
    out = np.zeros(len(model["ids"]))
    for rid, i in model["index"].items():
        score = sum(affinity.get(t.strip().lower(), 0.0)
                    for t in model["tags"].get(rid, [])) / max(len(model["tags"].get(rid, [])), 1)
        out[i] = score / peak
    return out


def hybrid_score(model, uid, weights=None, exclude_seen=True, train_interactions=None):
    """Full hybrid score vector for one user.

    Returns array of scores aligned with model["ids"].
    If exclude_seen, recipes the user interacted with in TRAIN are masked to -inf.
    """
    w = weights or WEIGHTS
    n = len(model["ids"])
    content = content_score(model, uid)
    cf = cf_score(model, uid)
    pref = preference_score(model, uid)

    # Neutral defaults for evaluation (empty pantry, no restrictions, median calories)
    pantry_scores = np.zeros(n)
    dietary_scores = np.ones(n)
    nutrition_scores = np.full(n, 0.5)
    expiry_scores = np.zeros(n)

    scores = (
        w["content"] * content +
        w["pantry"] * pantry_scores +
        w["dietary"] * dietary_scores +
        w["nutrition"] * nutrition_scores +
        w["preference"] * pref +
        w["expiry"] * expiry_scores +
        w["collaborative"] * cf
    )

    pop_vec = np.array([model["popularity"].get(rid, 0.0) for rid in model["ids"]])
    scores = scores + 0.001 * pop_vec

    if exclude_seen and train_interactions is not None:
        seen = set()
        for row in train_interactions:
            if int(row["user_id"]) == uid:
                seen.add(int(row["recipe_id"]))
        for rid in seen:
            i = model["index"].get(rid)
            if i is not None:
                scores[i] = -np.inf

    return scores


def rank_recommendations(model, uid, k=12, weights=None, exclude_seen=True, train_interactions=None):
    """Return top-k (recipe_id, score) pairs for a user."""
    scores = hybrid_score(model, uid, weights=weights, exclude_seen=exclude_seen,
                          train_interactions=train_interactions)
    top_idx = np.argsort(-scores)[:k]
    results = []
    for i in top_idx:
        rid = model["ids"][i]
        s = float(scores[i])
        if s == -np.inf:
            continue
        results.append((rid, s))
    return results


# ---------------------------------------------------------------------------
# Baseline: popular recipes
# ---------------------------------------------------------------------------

def popular_recommendations(model, k=12, exclude_seen=True, train_interactions=None, uid=None):
    """Recommend the most popular recipes (baseline)."""
    seen = set()
    if exclude_seen and train_interactions is not None and uid is not None:
        for row in train_interactions:
            if int(row["user_id"]) == uid:
                seen.add(int(row["recipe_id"]))
    pop_sorted = sorted(model["popularity"].items(), key=lambda x: -x[1])
    results = []
    for rid, _ in pop_sorted:
        if rid in seen:
            continue
        results.append((rid, model["popularity"][rid]))
        if len(results) >= k:
            break
    return results


def content_baseline_recommendations(model, uid, k=12, exclude_seen=True, train_interactions=None):
    """Content-based baseline: pure TF-IDF cosine similarity, no CF or preference.

    This isolates the content-similarity signal so we can measure whether the
    hybrid (content + CF + preference + pantry + …) actually adds value over
    content similarity alone.
    """
    scores = content_score(model, uid)
    if exclude_seen and train_interactions is not None:
        seen = set()
        for row in train_interactions:
            if int(row["user_id"]) == uid:
                seen.add(int(row["recipe_id"]))
        for rid in seen:
            i = model["index"].get(rid)
            if i is not None:
                scores[i] = -np.inf

    # Deterministic tie-breaking: score desc, then recipe_id asc
    indexed = [(i, float(scores[i])) for i in range(len(model["ids"]))
               if scores[i] != -np.inf]
    indexed.sort(key=lambda x: (-x[1], x[0]))
    results = []
    for i, s in indexed[:k]:
        rid = model["ids"][i]
        results.append((rid, s))
    return results


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

def precision_at_k(recommended, relevant, k):
    rec_k = recommended[:k]
    if not rec_k:
        return 0.0
    hits = sum(1 for rid, _ in rec_k if rid in relevant)
    return hits / len(rec_k)


def recall_at_k(recommended, relevant, k):
    rec_k = recommended[:k]
    if not relevant:
        return 0.0
    hits = sum(1 for rid, _ in rec_k if rid in relevant)
    return hits / len(relevant)


def ndcg_at_k(recommended, relevant_grades, k):
    """NDCG@K where relevant_grades is {recipe_id: grade}."""
    rec_k = recommended[:k]
    if not rec_k:
        return 0.0

    dcg = 0.0
    for i, (rid, _) in enumerate(rec_k):
        grade = relevant_grades.get(rid, 0)
        dcg += grade / math.log2(i + 2)

    ideal_grades = sorted(relevant_grades.values(), reverse=True)
    idcg = 0.0
    for i, grade in enumerate(ideal_grades[:k]):
        idcg += grade / math.log2(i + 2)

    if idcg == 0:
        return 0.0
    return dcg / idcg


def catalog_coverage(all_recommendations, total_recipes):
    """Fraction of the catalog that appears in at least one user's recommendations."""
    recommended_ids = set()
    for recs in all_recommendations.values():
        for rid, _ in recs:
            recommended_ids.add(rid)
    return len(recommended_ids) / total_recipes if total_recipes else 0.0


def diversity_score(all_recommendations, model):
    """Average intra-list diversity: 1 - average Jaccard similarity between
    pairs of users' top-K recommendation sets."""
    user_ids = list(all_recommendations.keys())
    if len(user_ids) < 2:
        return 1.0
    sets = [set(rid for rid, _ in all_recommendations[uid]) for uid in user_ids]
    total_sim = 0.0
    pairs = 0
    for i in range(len(sets)):
        for j in range(i + 1, len(sets)):
            si, sj = sets[i], sets[j]
            union = len(si | sj)
            if union == 0:
                continue
            total_sim += len(si & sj) / union
            pairs += 1
    avg_sim = total_sim / pairs if pairs else 0.0
    return 1.0 - avg_sim


# ---------------------------------------------------------------------------
# Main evaluation
# ---------------------------------------------------------------------------

def evaluate(train_interactions, test_interactions, recipes, model, weights=None):
    """Run full evaluation and return a results dict.

    Uses the given weights for hybrid scoring (or WEIGHTS default).
    """
    test_by_user = defaultdict(list)
    for row in test_interactions:
        uid = int(row["user_id"])
        rid = int(row["recipe_id"])
        if rid in model["index"]:
            test_by_user[uid].append(row)

    eval_users = []
    for uid, rows in test_by_user.items():
        relevant = {int(r["recipe_id"]): RELEVANCE_GRADE.get(r["type"], 1)
                    for r in rows if r["type"] in POSITIVE_TYPES}
        if relevant:
            eval_users.append((uid, relevant))

    if not eval_users:
        print("No users with positive test interactions found.")
        return None

    print(f"Evaluating {len(eval_users)} users with held-out positive interactions")

    hybrid_metrics = {k: {"precision": [], "recall": [], "ndcg": []} for k in TOP_K}
    baseline_metrics = {k: {"precision": [], "recall": [], "ndcg": []} for k in TOP_K}
    content_metrics = {k: {"precision": [], "recall": [], "ndcg": []} for k in TOP_K}
    hybrid_all_recs = {}
    baseline_all_recs = {}
    content_all_recs = {}

    for uid, relevant in eval_users:
        hybrid_recs = rank_recommendations(
            model, uid, k=max(TOP_K), weights=weights,
            exclude_seen=True, train_interactions=train_interactions,
        )
        hybrid_all_recs[uid] = hybrid_recs

        baseline_recs = popular_recommendations(
            model, k=max(TOP_K),
            exclude_seen=True, train_interactions=train_interactions, uid=uid,
        )
        baseline_all_recs[uid] = baseline_recs

        content_recs = content_baseline_recommendations(
            model, uid, k=max(TOP_K),
            exclude_seen=True, train_interactions=train_interactions,
        )
        content_all_recs[uid] = content_recs

        for k in TOP_K:
            hybrid_metrics[k]["precision"].append(
                precision_at_k(hybrid_recs, set(relevant.keys()), k))
            hybrid_metrics[k]["recall"].append(
                recall_at_k(hybrid_recs, set(relevant.keys()), k))
            hybrid_metrics[k]["ndcg"].append(
                ndcg_at_k(hybrid_recs, relevant, k))

            baseline_metrics[k]["precision"].append(
                precision_at_k(baseline_recs, set(relevant.keys()), k))
            baseline_metrics[k]["recall"].append(
                recall_at_k(baseline_recs, set(relevant.keys()), k))
            baseline_metrics[k]["ndcg"].append(
                ndcg_at_k(baseline_recs, relevant, k))

            content_metrics[k]["precision"].append(
                precision_at_k(content_recs, set(relevant.keys()), k))
            content_metrics[k]["recall"].append(
                recall_at_k(content_recs, set(relevant.keys()), k))
            content_metrics[k]["ndcg"].append(
                ndcg_at_k(content_recs, relevant, k))

    def avg(vals):
        return float(np.mean(vals)) if vals else 0.0

    results = {
        "n_eval_users": len(eval_users),
        "n_train_interactions": len(train_interactions),
        "n_test_interactions": len(test_interactions),
        "total_recipes": len(recipes),
        "weights": weights or dict(WEIGHTS),
        "hybrid": {},
        "baseline_popular": {},
        "baseline_content": {},
    }

    for k in TOP_K:
        results["hybrid"][f"precision@{k}"] = avg(hybrid_metrics[k]["precision"])
        results["hybrid"][f"recall@{k}"] = avg(hybrid_metrics[k]["recall"])
        results["hybrid"][f"ndcg@{k}"] = avg(hybrid_metrics[k]["ndcg"])

        results["baseline_popular"][f"precision@{k}"] = avg(baseline_metrics[k]["precision"])
        results["baseline_popular"][f"recall@{k}"] = avg(baseline_metrics[k]["recall"])
        results["baseline_popular"][f"ndcg@{k}"] = avg(baseline_metrics[k]["ndcg"])

        results["baseline_content"][f"precision@{k}"] = avg(content_metrics[k]["precision"])
        results["baseline_content"][f"recall@{k}"] = avg(content_metrics[k]["recall"])
        results["baseline_content"][f"ndcg@{k}"] = avg(content_metrics[k]["ndcg"])

    results["hybrid"]["catalog_coverage"] = catalog_coverage(hybrid_all_recs, len(recipes))
    results["hybrid"]["diversity"] = diversity_score(hybrid_all_recs, model)
    results["baseline_popular"]["catalog_coverage"] = catalog_coverage(baseline_all_recs, len(recipes))
    results["baseline_popular"]["diversity"] = diversity_score(baseline_all_recs, model)
    results["baseline_content"]["catalog_coverage"] = catalog_coverage(content_all_recs, len(recipes))
    results["baseline_content"]["diversity"] = diversity_score(content_all_recs, model)

    return results



def tune_weights(model, recipes, val_interactions, train_interactions):
    """Try several weight configurations on the validation set and return the best.

    The best configuration is the one with the highest mean NDCG@10 on
    validation users. The test set is never touched during tuning.
    """
    candidate_weights = [
        dict(WEIGHTS),  # current default
        {"content": 0.40, "pantry": 0.20, "dietary": 0.15, "nutrition": 0.10,
         "preference": 0.10, "expiry": 0.03, "collaborative": 0.02},
        {"content": 0.20, "pantry": 0.35, "dietary": 0.15, "nutrition": 0.10,
         "preference": 0.10, "expiry": 0.05, "collaborative": 0.05},
        {"content": 0.25, "pantry": 0.25, "dietary": 0.15, "nutrition": 0.10,
         "preference": 0.15, "expiry": 0.05, "collaborative": 0.05},
    ]

    best_weights = dict(WEIGHTS)
    best_ndcg = -1.0

    # Group validation interactions by user
    val_by_user = defaultdict(list)
    for row in val_interactions:
        uid = int(row["user_id"])
        rid = int(row["recipe_id"])
        if rid in model["index"]:
            val_by_user[uid].append(row)

    eval_users = []
    for uid, rows in val_by_user.items():
        relevant = {int(r["recipe_id"]): RELEVANCE_GRADE.get(r["type"], 1)
                    for r in rows if r["type"] in POSITIVE_TYPES}
        if relevant:
            eval_users.append((uid, relevant))

    if not eval_users:
        print("No validation users with positive interactions; using default weights.")
        return best_weights

    print(f"Tuning weights on {len(eval_users)} validation users …")

    for candidate in candidate_weights:
        ndcg_scores = []
        for uid, relevant in eval_users:
            recs = rank_recommendations(
                model, uid, k=10, weights=candidate,
                exclude_seen=True, train_interactions=train_interactions,
            )
            ndcg_scores.append(ndcg_at_k(recs, relevant, 10))
        mean_ndcg = float(np.mean(ndcg_scores))
        print(f"  weights={candidate}  NDCG@10={mean_ndcg:.6f}")
        if mean_ndcg > best_ndcg:
            best_ndcg = mean_ndcg
            best_weights = dict(candidate)

    print(f"Best weights: {best_weights} (NDCG@10={best_ndcg:.6f})")
    return best_weights

def print_results(results):
    if not results:
        print("No results to display.")
        return
    print("\n" + "=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)
    print(f"Eval users:        {results['n_eval_users']}")
    print(f"Train interactions: {results['n_train_interactions']}")
    print(f"Test interactions:  {results['n_test_interactions']}")
    print(f"Total recipes:      {results['total_recipes']}")
    print("-" * 60)
    print(f"{'Metric':<26} {'Hybrid':>9} {'Popular':>9} {'Content':>9}")
    print("-" * 60)
    for k in TOP_K:
        h_p = results["hybrid"][f"precision@{k}"]
        b_p = results["baseline_popular"][f"precision@{k}"]
        c_p = results.get("baseline_content", {}).get(f"precision@{k}", 0.0)
        h_r = results["hybrid"][f"recall@{k}"]
        b_r = results["baseline_popular"][f"recall@{k}"]
        c_r = results.get("baseline_content", {}).get(f"recall@{k}", 0.0)
        h_n = results["hybrid"][f"ndcg@{k}"]
        b_n = results["baseline_popular"][f"ndcg@{k}"]
        c_n = results.get("baseline_content", {}).get(f"ndcg@{k}", 0.0)
        print(f"{'Precision@' + str(k):<26} {h_p:>9.4f} {b_p:>9.4f} {c_p:>9.4f}")
        print(f"{'Recall@' + str(k):<26} {h_r:>9.4f} {b_r:>9.4f} {c_r:>9.4f}")
        print(f"{'NDCG@' + str(k):<26} {h_n:>9.4f} {b_n:>9.4f} {c_n:>9.4f}")
    print("-" * 60)
    h_cov = results["hybrid"]["catalog_coverage"]
    b_cov = results["baseline_popular"]["catalog_coverage"]
    c_cov = results.get("baseline_content", {}).get("catalog_coverage", 0.0)
    h_div = results["hybrid"]["diversity"]
    b_div = results["baseline_popular"]["diversity"]
    c_div = results.get("baseline_content", {}).get("diversity", 0.0)
    print(f"{'Catalog coverage':<26} {h_cov:>9.4f} {b_cov:>9.4f} {c_cov:>9.4f}")
    print(f"{'Diversity':<26} {h_div:>9.4f} {b_div:>9.4f} {c_div:>9.4f}")
    print("=" * 60 + "\n")


def main(interactions_path=None, out_name="evaluation_results.json"):
    """Run the full evaluation pipeline.

    Args:
        interactions_path: path to interactions CSV (default: random baseline).
        out_name: filename for the JSON output.
    """
    if interactions_path is None:
        interactions_path = DATASETS_DIR / "interactions.csv"

    print(f"Loading datasets (interactions: {interactions_path.name}) …")
    recipes = load_recipes(DATASETS_DIR / "recipes.csv")
    interactions = load_interactions(interactions_path)
    print(f"  {len(recipes)} recipes, {len(interactions)} interactions")

    print("Splitting temporally (70/10/20 train/val/test) …")
    train, val, test, split_ts = temporal_split(interactions)
    print(f"  Train: {len(train)} interactions (up to {split_ts[0]})")
    print(f"  Val:   {len(val)} interactions ({split_ts[0]} → {split_ts[1]})")
    print(f"  Test:  {len(test)} interactions (after {split_ts[1]})")

    print("Building model on train interactions only …")
    model = build_train_model(recipes, train)
    print(f"  {len(model['ids'])} recipes, {len(model['history'])} users with history")

    print("Tuning weights on validation set …")
    best_weights = tune_weights(model, recipes, val, train)

    print("Running evaluation on held-out test set …")
    results = evaluate(train, test, recipes, model, weights=best_weights)

    print_results(results)

    out_path = SERVICE_ROOT / out_name
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(results, fh, indent=2)
    print(f"Results saved to {out_path}")
    return results


if __name__ == "__main__":
    import sys as _sys
    mode = _sys.argv[1] if len(_sys.argv) > 1 else "random"
    if mode == "preference":
        main(
            interactions_path=DATASETS_DIR / "interactions_preference.csv",
            out_name="evaluation_results_preference.json",
        )
    else:
        main()