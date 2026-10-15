# Phase 2 — Validation & security hardening

**Branch:** `Phases` · **Date:** 2026-10-15
**Scope:** server-authoritative validation, JWT handling, per-user
authorization, data integrity, safe errors, rate limiting + size limits.
No new npm dependencies. No duplicate `Profile.jsx` — the real profile UI
is `client/src/pages/ProfileClean.jsx` + `CompleteProfile.jsx`.

## What existed (verified, kept)

- JWT sign/verify (`utils/tokenUtils.js`), `requireAuth`/`optionalAuth`,
  per-user scoping (`WHERE user_id = ?` in PantryItem/MealPlan/ShoppingList).
- Parameterised `?` queries everywhere; FKs + unique keys in
  `schema.sql` + `migrations/` (pantry unique, diet-plan unique, etc.).
- Base validators: register/login/profile-name-email/password/pantry-name.

## Gaps found and fixed

| # | Gap | Fix |
|---|---|---|
| 1 | Profile PUT accepted any arrays/enums/calories; `age`/`bio` unmentioned | `validateExtended.profileFull` + `preferencesUpdate`: name 2-80, email, string-lists, skill/diet/difficulty enums, calories 500-10000, calorieMin≤Max, cookTime 1-600; `age` 13-120 and `bio` ≤500 **only when present** (no such column/field exists today) |
| 2 | PUT pantry, meal add, shopping add/update, recipe search had thin/no checks | `pantryUpdate` (keeps `"500 g"` strings), `mealAdd` (day + mealType enums), `mealGenerate`, `weekQuery` (-52..52), `shoppingAdd` (batch ≤100), `shoppingUpdate` (strict boolean — fixes `Boolean("false")===true`), `recipeSearch` (maxCalories/maxTime bounds, query ≤300) |
| 3 | `/recipes/abc`, `/pantry/abc` reached MySQL or leaked 404s | `idParam()` on `:id`/`:mealId`/`:itemId` → 400 before controllers; pantry `GET /:id` returns a guided 400 |
| 4 | Expired vs forged tokens indistinguishable | `requireAuth` → 401 + `expired:true` for `TokenExpiredError`, plain invalid otherwise |
| 5 | 500s echoed `err.message` (SQL/stack/secret leak) | `errorHandler`: logs full detail server-side, returns generic 500 to clients; 4xx pass through; handles 413 |
| 6 | No rate limiting; 1 MB JSON cap | In-house `middleware/security.js`: global 300/min + auth 60/15 min (429 verified live); JSON 200 kB; `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` |
| 7 | Auth cookie missing `Secure` in prod; forgot-password revealed account existence | `Secure` flag in production; uniform forgot-password response (anti-enumeration) |
| 8 | Preferences DELETE+INSERT and meal-plan replace not atomic | Transactions (`BEGIN`/`COMMIT`/`ROLLBACK`) in `user.savePreferences` + `MealPlan.replaceWeek` |
| 9 | Client saved profile without token, swallowed server errors | `ProfileClean.jsx`: client mirror validation (UX only), sends `Bearer` token, surfaces server messages |

## Validation ≠ authentication; server repeats every check

- **Validation** (age range, email shape, enums, bounds) answers "is this
  data well-formed?" — enforced in `validateInput` + `validateExtended`.
- **Authentication** (JWT signature + expiry in `requireAuth`) answers "who
  is calling?" — every pantry/mealplan/shopping/profile route requires it.
- The React form validates for UX, but the server re-checks all
  security-relevant fields because the UI can be bypassed (proven live:
  direct `PUT /api/users/profile` with `name:"A"` → 400).

## Tests

- `server/test/validation-security.test.js` (10) + `auth-hardening.test.js` (6):
  invalid/missing inputs, expired + forged + missing tokens, strict booleans,
  id bounds, rate-limit 429, error masking, valid-request pass-through.
- Full suite: **35/35 Node pass** · journeys **37/37** · live probes:
  bad id/day → 400, cross-user DELETE → 404, own DELETE → 200,
  auth flood → 429, weak register → 400, forged JWT → 401.
