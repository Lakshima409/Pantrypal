# 🍲 PantryPal — Recipe Recommendation, Personalized Diet & Shopping List System

AI-powered food-management platform: **profile → dietary preferences → pantry →
recipes → hybrid AI recommendation → 7-day meal plan → pantry-aware shopping
list → interactions → better personalization.**

> Core question answered: *“Considering what I have, what I can eat, what I want
> nutritionally, and what I like — what should I cook? What am I missing? How do
> I organize my week?”*

## Architecture (blueprint §2, §27)

```text
React (client/)  →  Node/Express (server/)  →  MySQL (recipe_db)
                          │
                          ├→ Flask recommender   :5001  (TF-IDF + cosine + hybrid scoring)
                          └→ Flask diet-planner  :5002  (7-day × 4-slot meal plans)
```

React **never** talks to Flask or MySQL directly; Flask **never** does auth.
The Node layer degrades gracefully: if a Flask service is offline it uses a
local pantry-overlap / heuristic fallback so every endpoint keeps answering.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind 4 + react-router 7 |
| Backend | Node.js + Express, JWT + bcryptjs, mysql2 pool |
| AI services | Python 3.12, Flask, scikit-learn, NumPy, PyMySQL |
| Database | MySQL 8.4 — `database/schema.sql` + `database/migrations/` |
| Tests | `node --test` (Jest-style) + PyTest |
| Deploy | Docker Compose (authored per §66; not run on original machine) |

## Repository layout

```text
PantryPal/
├── client/                  # React SPA (pages, contexts, Tailwind styles)
├── server/                  # Express REST API  (see server/README.md)
│   ├── e2e-check.js         # full register→pantry→plan→shopping→AI flow
│   └── ai-path-check.js     # proves Node serves Flask hybrid scores
├── ai-services/
│   ├── recommender/         # :5001  /recommend  (scoring.py = §24 weights)
│   │   ├── model/train_tfidf.py
│   │   └── tests/test_scoring.py
│   └── diet-planner/        # :5002  /mealplan   (tests/test_planner.py)
├── database/
│   ├── schema.sql           # users, pantry, recipes, nutrition, tags, …
│   ├── migrations/          # diet_plan, reset tokens, expiry_date
│   └── seed.sql             # demo login: demo@pantrypal.local / Demo1234!
├── docker-compose.yml
└── .env.example → see server/.env.example
```

## Run locally

**Prereqs:** Node 20+, Python 3.12, MySQL 8.x.

```bash
# 1. Database
mysql -u root -p -e "CREATE DATABASE recipe_db CHARACTER SET utf8mb4;"
mysql -u root -p recipe_db < database/schema.sql
mysql -u root -p recipe_db < database/migrations/add_diet_plan.sql
mysql -u root -p recipe_db < database/migrations/add_expiry_date.sql
mysql -u root -p recipe_db < database/seed.sql

# 2. Backend  (copy server/.env.example → server/.env and set DB_PASS/JWT_SECRET)
cd server && npm install && npm run dev        # → http://localhost:5000

# 3. AI services (same .env is read automatically)
cd ../ai-services/recommender && pip install -r requirements.txt && python app.py   # → :5001
cd ../diet-planner           && pip install -r requirements.txt && python app.py    # → :5002

# 4. Frontend
cd ../../client && npm install && npm run dev  # → http://localhost:5173
```

## Tests (blueprint §61)

```bash
cd server            && npm test        # units: shopping math, auth/JWT  (9 tests)
cd ai-services/recommender  && python -m pytest tests -q   # score components (8)
cd ai-services/diet-planner && python -m pytest tests -q   # week plans, allergens (5)
cd server && node e2e-check.js          # live E2E against MySQL + all services
cd server && node ai-path-check.js      # asserts Node → Flask hybrid scores
```

## Key behaviors implemented

* **Pantry-aware shopping list (§30-31)** — `missing = max(0, required − pantry)`
  with unit normalisation (g/kg, ml/l, tbsp…); fully-stocked ingredients never
  appear; duplicates merge; grouped by category.
* **Hybrid recommendation (§18-24)** — TF-IDF cosine content similarity +
  pantry match + dietary hard-filter + nutrition proximity + preference affinity
  + expiry priority + user-user CF; cold start falls back to pantry/diet
  (§23). Weights live in `ai-services/recommender/scoring.py` (§24-style, tunable).
* **7-day meal plan (§28)** — breakfast/lunch/dinner/snack slots, calorie-target
  aware, allergen-filtered, no duplicate recipes within the week, weekly
  nutrition summary on `GET /api/mealplan`.
* **Auth (§4-7)** — register/login/JWT cookie + Bearer, bcrypt, forgot/reset
  password, strong-password policy, `JWT_SECRET` enforced in production (§54).
* **Expiry-aware pantry (§10-11, §21)** — `expiry_date` column, near-expiry
  items boost recipes that use them.

## Not yet built (report “future/advanced”, Phase C+)

NLP search (§37), image-based ingredient recognition (§13), ratings/comments
UI, Spoonacular import cache (§52), grocery-partner integration, notifications,
role-based admin, WCAG audit (§56), CI.
