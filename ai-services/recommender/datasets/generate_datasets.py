# ai-services/recommender/datasets/generate_datasets.py
# Generates large synthetic datasets for the TF-IDF recommender.
# Run:  python datasets/generate_datasets.py [n_recipes] [n_interactions] [n_users]
# Outputs:
#   datasets/recipes.csv        — N recipes with ingredients, tags, nutrition
#   datasets/ingredients.csv    — ingredient reference table
#   datasets/interactions.csv   — M user–recipe interactions
import csv
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

DATASETS_DIR = Path(__file__).resolve().parent
RNG = random.Random(42)  # deterministic output

# ---------------------------------------------------------------- ingredients
INGREDIENTS = [
    # id, name, category, unit
    (0, "chicken breast", "meat", "g"),
    (1, "chicken thigh", "meat", "g"),
    (2, "ground beef", "meat", "g"),
    (3, "salmon fillet", "seafood", "g"),
    (4, "prawns", "seafood", "g"),
    (5, "paneer", "dairy", "g"),
    (6, "egg", "dairy", "piece"),
    (7, "cheddar cheese", "dairy", "g"),
    (8, "mozzarella", "dairy", "g"),
    (9, "greek yogurt", "dairy", "g"),
    (10, "butter", "dairy", "g"),
    (11, "milk", "dairy", "ml"),
    (12, "tofu", "protein", "g"),
    (13, "chickpeas", "legume", "g"),
    (14, "red lentils", "legume", "g"),
    (15, "black beans", "legume", "g"),
    (16, "white rice", "grain", "g"),
    (17, "basmati rice", "grain", "g"),
    (18, "spaghetti", "grain", "g"),
    (19, "noodles", "grain", "g"),
    (20, "tortilla", "grain", "piece"),
    (21, "bread", "grain", "slice"),
    (22, "rolled oats", "grain", "g"),
    (23, "onion", "vegetable", "g"),
    (24, "garlic", "vegetable", "clove"),
    (25, "ginger", "vegetable", "g"),
    (26, "tomato", "vegetable", "g"),
    (27, "cherry tomatoes", "vegetable", "g"),
    (28, "spinach", "vegetable", "g"),
    (29, "carrot", "vegetable", "g"),
    (30, "bell pepper", "vegetable", "g"),
    (31, "broccoli", "vegetable", "g"),
    (32, "cauliflower", "vegetable", "g"),
    (33, "mushrooms", "vegetable", "g"),
    (34, "potato", "vegetable", "g"),
    (35, "sweet potato", "vegetable", "g"),
    (36, "zucchini", "vegetable", "g"),
    (37, "cucumber", "vegetable", "g"),
    (38, "lettuce", "vegetable", "g"),
    (39, "green beans", "vegetable", "g"),
    (40, "peas", "vegetable", "g"),
    (41, "corn", "vegetable", "g"),
    (42, "avocado", "fruit", "g"),
    (43, "lemon", "fruit", "piece"),
    (44, "banana", "fruit", "piece"),
    (45, "apple", "fruit", "piece"),
    (46, "orange", "fruit", "piece"),
    (47, "strawberries", "fruit", "g"),
    (48, "blueberries", "fruit", "g"),
    (49, "mango", "fruit", "g"),
    (50, "pineapple", "fruit", "g"),
    (51, "coconut milk", "dairy", "ml"),
    (52, "cream", "dairy", "ml"),
    (53, "parmesan", "dairy", "g"),
    (54, "olive oil", "oil", "ml"),
    (55, "soy sauce", "condiment", "ml"),
    (56, "salsa", "condiment", "g"),
    (57, "balsamic vinegar", "condiment", "ml"),
    (58, "sesame seeds", "spice", "g"),
    (59, "cumin", "spice", "g"),
    (60, "paprika", "spice", "g"),
    (61, "turmeric", "spice", "g"),
    (62, "coriander", "spice", "g"),
    (63, "curry powder", "spice", "g"),
    (64, "chili flakes", "spice", "g"),
    (65, "basil", "herb", "g"),
    (66, "cilantro", "herb", "g"),
    (67, "parsley", "herb", "g"),
    (68, "mint", "herb", "g"),
    (69, "rosemary", "herb", "g"),
    (70, "thyme", "herb", "g"),
    (71, "honey", "sweetener", "ml"),
    (72, "maple syrup", "sweetener", "ml"),
    (73, "sugar", "sweetener", "g"),
    (74, "flour", "grain", "g"),
    (75, "pita bread", "grain", "piece"),
    (76, "tortilla chips", "grain", "g"),
    (77, "granola", "grain", "g"),
    (78, "chia seeds", "seed", "g"),
    (79, "almonds", "nut", "g"),
    (80, "walnuts", "nut", "g"),
    (81, "peanut butter", "nut", "g"),
    (82, "dates", "fruit", "g"),
    (83, "cocoa powder", "spice", "g"),
    (84, "dark chocolate", "dairy", "g"),
    (85, "goat cheese", "dairy", "g"),
    (86, "feta cheese", "dairy", "g"),
    (87, "ricotta", "dairy", "g"),
    (88, "coconut", "fruit", "g"),
    (89, "tahini", "condiment", "ml"),
    (90, "seaweed", "vegetable", "g"),
    (91, "miso paste", "condiment", "g"),
    (92, "green onion", "vegetable", "g"),
    (93, "dashi", "condiment", "ml"),
    (94, "tamari", "condiment", "ml"),
    (95, "rice vinegar", "condiment", "ml"),
    (96, "fish sauce", "condiment", "ml"),
    (97, "snap peas", "vegetable", "g"),
    (98, "edamame", "legume", "g"),
    (99, "bamboo shoots", "vegetable", "g"),
    (100, "water chestnuts", "vegetable", "g"),
    (101, "bok choy", "vegetable", "g"),
    (102, "napa cabbage", "vegetable", "g"),
    (103, "daikon", "vegetable", "g"),
    (104, "lotus root", "vegetable", "g"),
    (105, "shiitake mushrooms", "vegetable", "g"),
    (106, "enoki mushrooms", "vegetable", "g"),
    (107, "kale", "vegetable", "g"),
    (108, "arugula", "vegetable", "g"),
    (109, "romaine lettuce", "vegetable", "g"),
    (110, "iceberg lettuce", "vegetable", "g"),
    (111, "red onion", "vegetable", "g"),
    (112, "shallot", "vegetable", "g"),
    (113, "leek", "vegetable", "g"),
    (114, "celery", "vegetable", "g"),
    (115, "fennel", "vegetable", "g"),
    (116, "beet", "vegetable", "g"),
    (117, "turnip", "vegetable", "g"),
    (118, "parsnip", "vegetable", "g"),
    (119, "butternut squash", "vegetable", "g"),
    (120, "acorn squash", "vegetable", "g"),
    (121, "pumpkin", "vegetable", "g"),
    (122, "eggplant", "vegetable", "g"),
    (123, "okra", "vegetable", "g"),
    (124, "artichoke", "vegetable", "g"),
    (125, "asparagus", "vegetable", "g"),
    (126, "brussels sprouts", "vegetable", "g"),
    (127, "cabbage", "vegetable", "g"),
    (128, "kohlrabi", "vegetable", "g"),
    (129, "radish", "vegetable", "g"),
    (130, "jicama", "vegetable", "g"),
    (131, "plantain", "fruit", "g"),
    (132, "papaya", "fruit", "g"),
    (133, "kiwi", "fruit", "piece"),
    (134, "dragon fruit", "fruit", "piece"),
    (135, "passion fruit", "fruit", "piece"),
    (136, "guava", "fruit", "piece"),
    (137, "lychee", "fruit", "piece"),
    (138, "rambutan", "fruit", "piece"),
    (139, "durian", "fruit", "g"),
    (140, "jackfruit", "fruit", "g"),
    (141, "breadfruit", "fruit", "g"),
    (142, "cassava", "vegetable", "g"),
    (143, "yams", "vegetable", "g"),
    (144, "taro", "vegetable", "g"),
    (145, "quinoa", "grain", "g"),
    (146, "couscous", "grain", "g"),
    (147, "bulgur", "grain", "g"),
    (148, "farro", "grain", "g"),
    (149, "barley", "grain", "g"),
    (150, "millet", "grain", "g"),
    (151, "buckwheat", "grain", "g"),
    (152, "amaranth", "grain", "g"),
    (153, "teff", "grain", "g"),
    (154, "sorghum", "grain", "g"),
    (155, "rye", "grain", "g"),
    (156, "oat bran", "grain", "g"),
    (157, "wheat germ", "grain", "g"),
    (158, "linseed", "seed", "g"),
    (159, "pumpkin seeds", "seed", "g"),
    (160, "sunflower seeds", "seed", "g"),
    (161, "sesame", "seed", "g"),
    (162, "poppy seeds", "seed", "g"),
    (163, "hemp seeds", "seed", "g"),
    (164, "macadamia nuts", "nut", "g"),
    (165, "cashews", "nut", "g"),
    (166, "pecans", "nut", "g"),
    (167, "hazelnuts", "nut", "g"),
    (168, "pistachios", "nut", "g"),
    (169, "brazil nuts", "nut", "g"),
    (170, "pine nuts", "nut", "g"),
    (171, "coconut oil", "oil", "ml"),
    (172, "avocado oil", "oil", "ml"),
    (173, "sesame oil", "oil", "ml"),
    (174, "ghee", "dairy", "ml"),
    (175, "sour cream", "dairy", "ml"),
    (176, "creme fraiche", "dairy", "ml"),
    (177, "buttermilk", "dairy", "ml"),
    (178, "kefir", "dairy", "ml"),
    (179, "labneh", "dairy", "ml"),
    (180, "quark", "dairy", "ml"),
    (181, "mascarpone", "dairy", "ml"),
    (182, "ricotta salata", "dairy", "ml"),
    (183, "halloumi", "dairy", "ml"),
    (184, "feta", "dairy", "ml"),
    (185, "blue cheese", "dairy", "ml"),
    (186, "brie", "dairy", "ml"),
    (187, "camembert", "dairy", "ml"),
    (188, "gouda", "dairy", "ml"),
    (189, "emmental", "dairy", "ml"),
    (190, "gruyere", "dairy", "ml"),
    (191, "fontina", "dairy", "ml"),
    (192, "provolone", "dairy", "ml"),
    (193, "ricotta", "dairy", "ml"),
    (194, "burrata", "dairy", "ml"),
    (195, "mozzarella di bufala", "dairy", "ml"),
    (196, "pecorino", "dairy", "ml"),
    (197, "manchego", "dairy", "ml"),
    (198, "idiazabal", "dairy", "ml"),
    (199, "tzatziki", "condiment", "ml"),
]

CUISINES = ["indian", "italian", "mexican", "thai", "japanese", "chinese",
            "mediterranean", "american", "middle-eastern", "french", "spanish",
            "korean", "vietnamese", "greek", "turkish", "lebanese", "moroccan",
            "brazilian", "argentine", "peruvian"]

MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "dessert"]

DIET_TAGS = ["vegetarian", "vegan", "gluten-free", "dairy-free", "low-carb",
             "high-protein", "keto", "paleo", "halal", "kosher"]

OTHER_TAGS = ["quick", "one-pot", "baked", "grilled", "spicy", "mild",
              "comfort food", "street food", "gourmet", "family-style",
              "meal-prep", "holiday", "summer", "winter"]

TAG_TYPE_MAP = {t: "cuisine" for t in CUISINES}
TAG_TYPE_MAP.update({t: "meal" for t in MEAL_TYPES})
TAG_TYPE_MAP.update({t: "diet" for t in DIET_TAGS})
TAG_TYPE_MAP.update({t: "other" for t in OTHER_TAGS})

ALL_TAGS = CUISINES + MEAL_TYPES + DIET_TAGS + OTHER_TAGS


def ingredient_name(idx):
    return INGREDIENTS[idx][1]


def build_recipe(rid):
    """Build one synthetic recipe row."""
    cuisine = RNG.choice(CUISINES)
    meal = RNG.choice(MEAL_TYPES)

    # 4-10 ingredients per recipe
    n_ings = RNG.randint(4, 10)
    ing_indices = RNG.sample(range(len(INGREDIENTS)), n_ings)
    ingredient_names = [ingredient_name(i) for i in ing_indices]

    # Tags: cuisine + meal + 0-2 diet + 0-2 other
    tags = [cuisine, meal]
    if RNG.random() < 0.5:
        tags.append(RNG.choice(DIET_TAGS))
    if RNG.random() < 0.3:
        tags.append(RNG.choice(DIET_TAGS))
    for _ in range(RNG.randint(0, 2)):
        tags.append(RNG.choice(OTHER_TAGS))
    tags = list(dict.fromkeys(tags))  # dedupe, keep order

    # Title from cuisine + a few ingredients
    title_parts = [cuisine.title()]
    for ing in ingredient_names[:2]:
        title_parts.append(ing.title())
    title = " ".join(title_parts[:4])

    # Calories based on meal type
    if meal == "breakfast":
        calories = RNG.randint(250, 550)
    elif meal == "lunch":
        calories = RNG.randint(350, 700)
    elif meal == "dinner":
        calories = RNG.randint(400, 850)
    elif meal == "snack":
        calories = RNG.randint(150, 400)
    else:  # dessert
        calories = RNG.randint(200, 600)

    protein = RNG.randint(5, 50)
    fat = RNG.randint(5, 45)
    carbs = RNG.randint(10, 90)
    sodium = RNG.randint(100, 1200)

    return {
        "recipe_id": rid,
        "title": title,
        "ingredient_names": ",".join(ingredient_names),
        "tag_names": ",".join(tags),
        "calories": calories,
        "protein": protein,
        "fat": fat,
        "carbs": carbs,
        "sodium": sodium,
    }


def write_recipes(path, n):
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=[
            "recipe_id", "title", "ingredient_names", "tag_names",
            "calories", "protein", "fat", "carbs", "sodium",
        ])
        writer.writeheader()
        for rid in range(900001, 900001 + n):
            writer.writerow(build_recipe(rid))
    print(f"Wrote {n} recipes → {path}")


def write_ingredients(path):
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["ingredient_id", "name", "category", "unit"])
        for row in INGREDIENTS:
            writer.writerow(row)
    print(f"Wrote {len(INGREDIENTS)} ingredients → {path}")


def write_interactions(path, n_recipes, n_users=50, n_interactions=2000):
    interaction_types = ["viewed", "saved", "liked", "cooked", "rated"]
    type_weights = [0.35, 0.25, 0.20, 0.15, 0.05]

    start_date = datetime(2026, 1, 1)
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["user_id", "recipe_id", "type", "timestamp"])
        for _ in range(n_interactions):
            uid = RNG.randint(1, n_users)
            rid = RNG.randint(900001, 900000 + n_recipes)
            itype = RNG.choices(interaction_types, weights=type_weights, k=1)[0]
            ts = start_date + timedelta(
                days=RNG.randint(0, 200),
                hours=RNG.randint(0, 23),
                minutes=RNG.randint(0, 59),
            )
            writer.writerow([uid, rid, itype, ts.strftime("%Y-%m-%d %H:%M:%S")])
    print(f"Wrote {n_interactions} interactions → {path}")


def main(n_recipes=3000, n_interactions=8000, n_users=100):
    DATASETS_DIR.mkdir(parents=True, exist_ok=True)
    write_ingredients(DATASETS_DIR / "ingredients.csv")
    write_recipes(DATASETS_DIR / "recipes.csv", n_recipes)
    write_interactions(
        DATASETS_DIR / "interactions.csv",
        n_recipes=n_recipes,
        n_users=n_users,
        n_interactions=n_interactions,
    )


# ===========================================================================
# Priority 2.5 — preference-aware interaction generation
# ===========================================================================
# A user profile is a set of preferred tag categories drawn from the recipe
# tag vocabulary.  Interactions are then sampled proportionally to how well
# each recipe matches the user's profile, with a controlled exploration
# fraction so that non-matching recipes also receive some traffic.
#
# This does NOT expose hidden preferences to the recommender — the profiles
# are saved to user_preferences.csv for analysis only.  The recommender
# still sees only (user_id, recipe_id, type, timestamp), exactly as in the
# random baseline.

PREF_SEED = 20261017
EXPLORATION_RATE = 0.30       # fraction of interactions that are uniform random
MATCH_BOOST = 3.0             # multiplier on preference-match probability


def _type_weights_for_match(match):
    """Return (types, weights) for interaction-type sampling given match score in [0,1]."""
    if match >= 0.5:
        return (["viewed", "saved", "liked", "cooked", "rated"],
                [0.10, 0.20, 0.25, 0.30, 0.15])
    elif match >= 0.2:
        return (["viewed", "saved", "liked", "cooked", "rated"],
                [0.25, 0.30, 0.25, 0.15, 0.05])
    else:
        return (["viewed", "saved", "liked", "cooked", "rated"],
                [0.50, 0.20, 0.15, 0.10, 0.05])


def build_user_profiles(n_users, rng=None):
    """Generate diverse synthetic user preference profiles."""
    r = rng or random.Random(PREF_SEED)
    profiles = {}
    used_cuisines = set()
    for uid in range(1, n_users + 1):
        available = [c for c in CUISINES if c not in used_cuisines] or list(CUISINES)
        n_cuisine = r.randint(1, 3)
        chosen_cuisines = r.sample(available, min(n_cuisine, len(available)))
        used_cuisines.update(chosen_cuisines)

        n_meal = r.randint(1, 3)
        chosen_meals = r.sample(MEAL_TYPES, n_meal)

        n_diet = r.randint(0, 2)
        chosen_diets = r.sample(DIET_TAGS, n_diet) if n_diet else []

        n_other = r.randint(0, 2)
        chosen_others = r.sample(OTHER_TAGS, n_other) if n_other else []

        profiles[uid] = {
            "user_id": uid,
            "preferred_cuisines": chosen_cuisines,
            "preferred_meals": chosen_meals,
            "preferred_diet": chosen_diets,
            "preferred_other": chosen_others,
        }
    return profiles


def recipe_match_score(recipe_tags, profile):
    """Compute how well a recipe matches a user profile, in [0,1]."""
    pref_tags = set()
    for key in ("preferred_cuisines", "preferred_meals", "preferred_diet", "preferred_other"):
        pref_tags.update(profile[key])
    if not pref_tags:
        return 0.5
    recipe_set = {t.strip().lower() for t in recipe_tags}
    hits = sum(1 for t in pref_tags if t in recipe_set)
    return hits / len(pref_tags)


def write_preference_interactions(path, profiles, recipes_by_id, n_interactions,
                                  exploration_rate=EXPLORATION_RATE, rng=None):
    """Generate interactions biased by user preference match.

    For each interaction:
      1. Pick a user uniformly.
      2. With probability (1 - exploration_rate), pick a recipe sampled
         proportional to (1 + MATCH_BOOST * match_score).  With probability
         exploration_rate, pick a uniformly random recipe.
      3. Assign an interaction type whose distribution depends on match score.
      4. Assign a timestamp spread over the same 200-day window as the random
         baseline.  Rows are sorted chronologically for temporal splitting.
    """
    r = rng or random.Random(PREF_SEED)
    recipe_ids = sorted(recipes_by_id.keys())
    start_date = datetime(2026, 1, 1)

    # Pre-compute per-user recipe probability weights (biased by match)
    user_ids = sorted(profiles.keys())
    user_weights = {}
    for uid in user_ids:
        profile = profiles[uid]
        weights = []
        for rid in recipe_ids:
            tags = recipes_by_id[rid]["tags"]
            match = recipe_match_score(tags, profile)
            weights.append(1.0 + MATCH_BOOST * match)
        user_weights[uid] = weights

    rows = []
    for _ in range(n_interactions):
        uid = r.choice(user_ids)
        if r.random() < exploration_rate:
            rid = r.choice(recipe_ids)
        else:
            rid = r.choices(recipe_ids, weights=user_weights[uid], k=1)[0]
        match = recipe_match_score(recipes_by_id[rid]["tags"], profiles[uid])
        types, type_w = _type_weights_for_match(match)
        itype = r.choices(types, weights=type_w, k=1)[0]
        ts = start_date + timedelta(
            days=r.randint(0, 200),
            hours=r.randint(0, 23),
            minutes=r.randint(0, 59),
        )
        rows.append((uid, rid, itype, ts.strftime("%Y-%m-%d %H:%M:%S")))

    rows.sort(key=lambda x: x[3])  # chronological for temporal split
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["user_id", "recipe_id", "type", "timestamp"])
        for row in rows:
            writer.writerow(row)
    print(f"Wrote {len(rows)} preference-aware interactions → {path}")
    return rows


def write_user_preferences(path, profiles):
    """Save user preference profiles for analysis (NOT used by the recommender)."""
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["user_id", "preferred_cuisines", "preferred_meals",
                         "preferred_diet", "preferred_other"])
        for uid in sorted(profiles):
            p = profiles[uid]
            writer.writerow([
                uid,
                "|".join(p["preferred_cuisines"]),
                "|".join(p["preferred_meals"]),
                "|".join(p["preferred_diet"]),
                "|".join(p["preferred_other"]),
            ])
    print(f"Wrote {len(profiles)} user preference profiles → {path}")


def write_generation_metadata(path, n_recipes, n_interactions, n_users, mode,
                              seed, exploration_rate=None, match_boost=None):
    """Record dataset parameters for reproducibility and audit."""
    import json as _json
    meta = {
        "mode": mode,
        "n_recipes": n_recipes,
        "n_interactions": n_interactions,
        "n_users": n_users,
        "seed": seed,
        "exploration_rate": exploration_rate,
        "match_boost": match_boost,
        "train_ratio": 0.70,
        "val_ratio": 0.10,
        "test_ratio": 0.20,
        "metric_definitions": {
            "precision@k": "hits_in_top_k / k",
            "recall@k": "hits_in_top_k / |relevant|",
            "ndcg@k": "DCG@k / IDCG@k, graded relevance {viewed:1, saved:2, liked:3, cooked:4, rated:5}",
            "catalog_coverage": "unique_recipes_recommended / catalog_size",
            "diversity": "1 - mean_pairwise_jaccard_of_top_k_sets",
        },
        "relevance_definition": "positive types: saved, liked, cooked, rated (viewed=grade 1 for NDCG only)",
        "note": "All data is synthetic. Preference-aware data validates controlled behaviour, not real-world performance.",
    }
    with open(path, "w", encoding="utf-8") as fh:
        _json.dump(meta, fh, indent=2)
    print(f"Wrote generation metadata → {path}")


def main_preference(n_recipes=3000, n_interactions=8000, n_users=100,
                    exploration_rate=EXPLORATION_RATE):
    """Generate the preference-aware dataset variant."""
    DATASETS_DIR.mkdir(parents=True, exist_ok=True)

    recipes_by_id = {}
    with open(DATASETS_DIR / "recipes.csv", newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            rid = int(row["recipe_id"])
            recipes_by_id[rid] = {
                "tags": [t.strip() for t in row["tag_names"].split(",") if t.strip()],
            }

    profiles = build_user_profiles(n_users)
    write_user_preferences(DATASETS_DIR / "user_preferences.csv", profiles)
    write_preference_interactions(
        DATASETS_DIR / "interactions_preference.csv",
        profiles, recipes_by_id,
        n_interactions=n_interactions,
        exploration_rate=exploration_rate,
    )
    write_generation_metadata(
        DATASETS_DIR / "generation_meta_preference.json",
        n_recipes=n_recipes, n_interactions=n_interactions, n_users=n_users,
        mode="preference", seed=PREF_SEED,
        exploration_rate=exploration_rate, match_boost=MATCH_BOOST,
    )
    print("Preference-aware dataset generation complete.")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "random"
    if mode == "preference":
        n_recipes = int(sys.argv[2]) if len(sys.argv) > 2 else 3000
        n_interactions = int(sys.argv[3]) if len(sys.argv) > 3 else 8000
        n_users = int(sys.argv[4]) if len(sys.argv) > 4 else 100
        main_preference(n_recipes=n_recipes, n_interactions=n_interactions,
                        n_users=n_users)
    else:
        n_recipes = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
        n_interactions = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
        n_users = int(sys.argv[3]) if len(sys.argv) > 3 else 100
        main(n_recipes=n_recipes, n_interactions=n_interactions, n_users=n_users)