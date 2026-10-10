# ai-services/diet-planner/app.py
# Flask microservice: POST /mealplan builds the 7-day plan (blueprint §28).
# Node (plannerService.js) calls this and falls back to its heuristic when
# the service is offline (§27: React → Node → Flask, never direct).
import os

from flask import Flask, jsonify, request

import planner

app = Flask(__name__)

# Warm the recipe corpus at boot (~3s) so the FIRST /mealplan request is the
# fast cached path — never the cold MySQL load (NFR §56: <2s).
planner.load_recipes()
print("[diet-planner] recipe corpus warmed")


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "diet-planner"})


@app.post("/mealplan")
def mealplan():
    """
    body  { user_id, calorie_goal, diet_type, allergies[], days }
    resp  { meals: [{ day, mealType, recipeId }] }  (matches Node contract)
    """
    body = request.get_json(silent=True) or {}
    try:
        meals = planner.generate_plan(
            calorie_goal=body.get("calorie_goal") or 2000,
            diet_type=body.get("diet_type"),
            allergies=body.get("allergies") or [],
            days=body.get("days") or 7,
            seed=body.get("seed"),  # optional replayable seed; omit → new plan
        )
    except Exception as exc:
        print(f"[diet-planner] error: {exc}")
        return jsonify({"error": str(exc)}), 500
    return jsonify({"meals": meals})


if __name__ == "__main__":
    port = int(os.environ.get("AI_PLANNER_PORT", "5002"))
    app.run(host="127.0.0.1", port=port, threaded=True)
