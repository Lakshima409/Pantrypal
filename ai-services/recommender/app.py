# ai-services/recommender/app.py
# Flask AI microservice (blueprint §26-27): Node calls POST /recommend;
# React never talks to Flask directly.
import os

from flask import Flask, jsonify, request

from recommender import Recommender

app = Flask(__name__)
model = Recommender()
model.start_refresh_loop()


@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "ready": model.ready,
        "recipes": len(model.ids) if model.ready else 0,
        "users": len(model.history) if model.ready else 0,
        "loaded_at": model.loaded_at,
    })


@app.post("/recommend")
def recommend():
    """
    Blueprint §25 contract:
      body  { user_id, limit, pantry[], preferences{...}, filters{...} }
      resp  { recommendations: [{ recipe_id, score, pantry_match, diet_match }] }
    """
    body = request.get_json(silent=True) or {}
    try:
        recs = model.recommend(
            user_id=body.get("user_id"),
            limit=body.get("limit", 12),
            pantry=body.get("pantry") or [],
            preferences=body.get("preferences") or {},
            filters=body.get("filters"),
        )
    except Exception as exc:  # never 500 Node's 1.8s fallback away silently
        print(f"[recommender] error: {exc}")
        return jsonify({"error": str(exc)}), 500
    return jsonify({"recommendations": recs})


if __name__ == "__main__":
    port = int(os.environ.get("AI_RECOMMENDER_PORT", "5001"))
    app.run(host="127.0.0.1", port=port, threaded=True)
