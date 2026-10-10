# ai-services/recommender/model/train_tfidf.py
# Builds the TF-IDF vectoriser + recipe matrix from MySQL and persists them
# (blueprint §26). The live service builds the same objects in memory at
# boot; this script exists for offline inspection and faster cold starts:
#   python model/train_tfidf.py
import pickle
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # service root

from recommender import Recommender  # noqa: E402

OUT = Path(__file__).resolve().parent


def main():
    print("Loading corpus and fitting TF-IDF …")
    model = Recommender()
    payload = {
        "vectoriser": model.vectoriser,
        "matrix": model.matrix,
        "ids": model.ids,
        "documents_count": len(model.ids),
        "features": len(model.vectoriser.vocabulary_),
    }
    out = OUT / "tfidf_vectors.pkl"
    with out.open("wb") as fh:
        pickle.dump(payload, fh, protocol=pickle.HIGHEST_PROTOCOL)
    print(f"Saved {payload['documents_count']} recipe vectors "
          f"({payload['features']} features) → {out}")


if __name__ == "__main__":
    main()
