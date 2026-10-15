# ai-services/recommender/evaluate.py
# Phase 3.4 — reproducible hybrid-recommender evaluation.
#
# Fixed dataset (no randomness): per-user pantry + held-out liked recipes +
# banned allergens, all drawn from the deterministic dev corpus. Metrics:
#   * Precision@K / Recall@K / F1@K against the held-out likes
#   * pantry coverage (mean pantry_match over the top-K)
#   * diversity (1 - mean pairwise TF-IDF cosine similarity over the top-K)
#   * response time (mean ms per recommend call)
#
# Usage:
#   python evaluate.py            # full report, K = 5 and 10
#   python evaluate.py --k 5       # single cutoff
import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

import scoring
from preprocessing import dedupe_ingredients
from recommender import Recommender

K_DEFAULTS = (5, 10)

# Fixed fixtures: pantry -> recipes with the strongest REAL overlap in the
# dev corpus (derived from the database, not from aspirational titles).
# held_out = top-2 overlap recipes for that pantry (the measurable target);
# banned = an allergen that must hard-filter to zero.
CASES = [
    {
        "user_id": None,  # cold start: pantry only, no history
        "pantry": ["bread", "rolled oats", "egg", "butter", "milk"],
        "held_out": [900002, 900006],
        "banned": [],
    },
    {
        "user_id": None,
        "pantry": ["bread", "rolled oats", "egg", "chickpeas", "almonds"],
        "held_out": [900004, 900002],
        "banned": ["peanut"],
    },
    {
        "user_id": None,
        "pantry": ["chicken breast", "bread", "rolled oats", "blueberries", "walnuts"],
        "held_out": [900001, 900003],
        "banned": [],
    },
    {
        "user_id": None,
        "pantry": ["basmati rice", "tomato", "cherry tomatoes", "tortilla", "garam masala"],
        "held_out": [900008, 900007],
        "banned": ["peanut", "shellfish"],
    },
]


def precision_recall_f1(recommended_ids, relevant_ids, k):
    top = recommended_ids[:k]
    rel = set(relevant_ids)
    hits = sum(1 for rid in top if rid in rel)
    precision = hits / k if k else 0.0
    recall = hits / len(rel) if rel else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    return precision, recall, f1


def diversity(model, recommended_ids):
    """1 - mean pairwise cosine similarity (higher = more varied)."""
    rows = [model.index.get(rid) for rid in recommended_ids]
    rows = [i for i in rows if i is not None]
    if len(rows) < 2:
        return 1.0
    sims = cosine_similarity(model.matrix[rows], model.matrix[rows])
    n = len(rows)
    off_diag = (sims.sum() - n) / (n * (n - 1))
    return round(float(1.0 - off_diag), 4)


def run_case(model, case, k):
    t0 = time.perf_counter()
    recs = model.recommend(
        user_id=case["user_id"],
        limit=k,
        pantry=list(case["pantry"]),
        preferences={"allergies": list(case["banned"])},
    )
    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    ids = [r["recipe_id"] for r in recs]
    p, r, f1 = precision_recall_f1(ids, case["held_out"], k)
    coverage = (
        round(float(np.mean([r.get("pantry_match", 0.0) for r in recs])), 4)
        if recs else 0.0
    )
    return {
        "ids": ids,
        "precision": round(p, 4),
        "recall": round(r, 4),
        "f1": round(f1, 4),
        "coverage": coverage,
        "diversity": diversity(model, ids),
        "ms": round(elapsed_ms, 2),
    }


def main():
    parser = argparse.ArgumentParser(description="Phase 3.4 recommender evaluation")
    parser.add_argument("--k", type=int, nargs="*", default=list(K_DEFAULTS))
    args = parser.parse_args()

    model = Recommender()
    if not model.ready:
        print("model not ready (empty corpus?) — aborting")
        sys.exit(1)

    print(f"corpus: {len(model.ids)} recipes · weights: {scoring.WEIGHTS}")
    for k in args.k:
        print(f"\n=== K={k} ===")
        agg = {"precision": [], "recall": [], "f1": [],
               "coverage": [], "diversity": [], "ms": []}
        for n, case in enumerate(CASES, 1):
            res = run_case(model, case, k)
            for key in agg:
                agg[key].append(res[key])
            print(f"case {n}: pantry={len(case['pantry'])} held_out={case['held_out']}")
            print(f"  top-{k}: {res['ids']}")
            print(f"  P={res['precision']} R={res['recall']} F1={res['f1']} "
                  f"coverage={res['coverage']} diversity={res['diversity']} "
                  f"time={res['ms']}ms")
        print("mean: " + " ".join(
            f"{key}={round(float(np.mean(vals)), 4)}" for key, vals in agg.items()
        ))


if __name__ == "__main__":
    main()
