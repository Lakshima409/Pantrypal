# PantryPal API Server

Node.js + Express + MySQL REST API for the PantryPal recipe suggester system.

## Run

```bash
npm install
npm start          # or: npm run dev (auto-restart)
```

Configuration lives in `.env` (DB credentials, `JWT_SECRET`, AI service URLs).

## Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | – | Service health check |
| POST | `/api/auth/register` | – | Create account → `{ user, token }` |
| POST | `/api/auth/login` | – | Sign in → `{ user, token }` |
| POST | `/api/auth/forgot-password` | – | Request reset token |
| POST | `/api/auth/reset-password` | – | Reset password with token |
| GET | `/api/recipes/recommended` | – | AI hybrid recommendations (Flask :5001, DB fallback) |
| GET | `/api/recipes/trending` | – | Most interacted recipes |
| GET | `/api/recipes/search` | – | Search with `query`, `dietary`, `cookTime`, `difficulty`, `ingredients` |
| GET | `/api/recipes/favorites` | ✓ | Current user's saved recipes |
| POST | `/api/recipes/substitutions` | – | Ingredient substitution suggestions |
| GET | `/api/recipes/:id` | – | Recipe detail (`{ recipe, isFavorite }`) |
| POST/DELETE | `/api/recipes/:id/favorite` | ✓ | Toggle favourite (stored as `interactions.type='saved'`) |
| GET/POST | `/api/pantry` | ✓ | List / add pantry items |
| PUT/DELETE | `/api/pantry/:id` | ✓ | Update / remove pantry item |
| GET | `/api/mealplan?week=N` | ✓ | Weekly meal plan (`diet_plan` tables) |
| POST | `/api/mealplan` | ✓ | Add recipe to a day |
| POST | `/api/mealplan/generate` | ✓ | AI-generated 7-day plan (Flask :5002, heuristic fallback) |
| DELETE | `/api/mealplan/:mealId` | ✓ | Remove meal |
| GET/POST | `/api/shoppinglist` | ✓ | List / add items |
| PATCH/DELETE | `/api/shoppinglist/:itemId` | ✓ | Toggle completed / remove |
| POST | `/api/shoppinglist/generate` | ✓ | Build list from a meal plan |
| GET/PUT | `/api/users/profile` | ✓ | Profile |
| GET/PUT | `/api/users/preferences` | ✓ | Diet, allergies, calorie goal, skill |

Auth uses JWT (`Authorization: Bearer <token>` or the `pantry_token` cookie set on login/register).

## Database

Schema: `../database/schema.sql`. Seed data: `../database/seed.sql`.
Migrations: `../database/migrations/*.sql`.

