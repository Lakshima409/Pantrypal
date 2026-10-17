# ai-services/recommender/model/train_tfidf.py
# Trains the TF-IDF recommender model from dataset CSV files (no MySQL required)
# and persists the complete model as a pickle artifact for offline serving.
#
#   python model/train_tfidf.py
#
# Reads:
#   datasets/recipes.csv      — recipe_id, title, ingredient_names, tag_names, calories, …
#   datasets/interactions.csv — user_id, recipe_id, type, timestamp
#
# Writes:
#   model/tfidf_model.pkl     — vectoriser, matrix, ids, history, by_recipe, ingredients, tags, nutrition
import csv
import pickle
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # service root

from preprocessing import recipe_document

SERVICE_ROOT = Path(__file__).resolve().parents[1]
DATASETS_DIR = SERVICE_ROOT / "datasets"
MODEL_DIR = SERVICE_ROOT / "model"
OUT_PICKLE = MODEL_DIR / "tfidf_model.pkl"

VECTORIZER_KWARGS = {
    "stop_words": "english",
    "max_features": 12000,
    "ngram_range": (1, 2),
    "min_df": 2,
}

INTERACTION_WEIGHTS = {"viewed": 1, "saved": 2, "liked": 3, "cooked": 4, "rated": 5}
CF_HALF_LIFE_DAYS = 90.0


def _decay_weight(base_weight, age_days):
    try:
        age = max(float(age_days or 0.0), 0.0)
    except (TypeError, ValueError):
        age = 0.0
    return float(base_weight) * (0.5 ** (age / CF_HALF_LIFE_DAYS))


def load_recipes(path):
    recipes = []
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            recipes.append({
                "recipe_id": int(row["recipe_id"]),
                "title": row["title"],
                "ingredients": [i.strip() for i in row["ingredient_names"].split(",") if i.strip()],
                "tags": [t.strip() for t in row["tag_names"].split(",") if t.strip()],
                "calories": float(row["calories"]) if row.get("calories") else 0.0,
                "protein": float(row["protein"]) if row.get("protein") else 0.0,
                "fat": float(row["fat"]) if row.get("fat") else 0.0,
                "carbs": float(row["carbs"]) if row.get("carbs") else 0.0,
                "sodium": float(row["sodium"]) if row.get("sodium") else 0.0,
            })
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


def build_model(recipes, interactions):
    ids = [r["recipe_id"] for r in recipes]

    docs = [
        recipe_document(r["title"], r["ingredients"], r["tags"])
        for r in recipes
    ]

    vectoriser = TfidfVectorizer(**VECTORIZER_KWARGS)
    matrix = vectoriser.fit_transform(docs)

    now = datetime.now()
    history, by_recipe = {}, {}
    for row in interactions:
        base = INTERACTION_WEIGHTS.get(row["type"], 1)
        try:
            ts = datetime.strptime(row["ts"], "%Y-%m-%d %H:%M:%S")
            age_days = (now - ts).total_seconds() / 86400.0
        except (ValueError, TypeError):
            age_days = 0.0
        w = _decay_weight(base, age_days)
        uid, rid = int(row["user_id"]), int(row["recipe_id"])
        user_hist = history.setdefault(uid, {})
        user_hist[rid] = max(user_hist.get(rid, 0.0), w)
        by_recipe.setdefault(rid, set()).add(uid)

    popularity_counts = {}
    for row in interactions:
        rid = int(row["recipe_id"])
        popularity_counts[rid] = popularity_counts.get(rid, 0) + 1
    max_pop = max(popularity_counts.values()) if popularity_counts else 1
    popularity = {rid: n / max_pop for rid, n in popularity_counts.items()}

    ingredients = {r["recipe_id"]: r["ingredients"] for r in recipes}
    tags = {r["recipe_id"]: r["tags"] for r in recipes}
    nutrition = {
        r["recipe_id"]: {
            "calories": r["calories"],
            "protein": r["protein"],
            "fat": r["fat"],
            "carbs": r["carbs"],
            "sodium": r["sodium"],
        }
        for r in recipes
    }

    index = {rid: i for i, rid in enumerate(ids)}

    return {
        "vectoriser": vectoriser,
        "matrix": matrix,
        "ids": ids,
        "index": index,
        "ingredients": ingredients,
        "tags": tags,
        "nutrition": nutrition,
        "popularity": popularity,
        "history": history,
        "by_recipe": {k: set(v) for k, v in by_recipe.items()},
        "documents_count": len(ids),
        "features": len(vectoriser.vocabulary_),
        "trained_at": datetime.now().isoformat(),
    }


def main():
    print("Loading dataset CSVs …")
    recipes = load_recipes(DATASETS_DIR / "recipes.csv")
    interactions = load_interactions(DATASETS_DIR / "interactions.csv")
    print(f"  {len(recipes)} recipes, {len(interactions)} interactions")

    print("Fitting TF-IDF vectoriser …")
    payload = build_model(recipes, interactions)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with OUT_PICKLE.open("wb") as fh:
        pickle.dump(payload, fh, protocol=pickle.HIGHEST_PROTOCOL)

    print(
        f"Saved model: {payload['documents_count']} recipes, "
        f"{payload['features']} TF-IDF features → {OUT_PICKLE}"
    )


if __name__ == "__main__":
    main()
