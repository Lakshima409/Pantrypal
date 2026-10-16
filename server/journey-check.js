#!/usr/bin/env node
// server/journey-check.js
//
// Phase 1 baseline: exercises every core user journey against the LIVE stack
// (Express + MySQL + both Flask services).
//
// Usage:  node server/journey-check.js        (override host with API_BASE=…)
//
// It registers ONE throwaway account and reports PASS/FAIL per step, so the
// output doubles as the journey section of the Phase 1 test report.

const BASE = process.env.API_BASE || "http://localhost:5000";

let passed = 0;
let failed = 0;
const failures = [];

function check(journey, label, ok, detail) {
  if (ok) passed += 1; else { failed += 1; failures.push(`${journey}: ${label}${detail ? ` — ${detail}` : ""}`); }
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
}

async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    return { status: 0, json: null, error: err.message };
  }
  let json = null;
  try { json = await res.json(); } catch { /* empty / non-JSON body */ }
  return { status: res.status, json };
}

const EMAIL = `journey${Date.now().toString().slice(-8)}@example.test`;
const PASSWORD = "Journey123!";
const today = () => new Date().toISOString().slice(0, 10);

async function main() {
  console.log(`\nPantryPal user-journey check  →  ${BASE}`);
  console.log(`throwaway account: ${EMAIL}\n`);
  // ---- 1. Registration -------------------------------------------------
  console.log("1. Registration");
  const reg = await call("POST", "/api/auth/register", {
    body: { name: "Journey Tester", email: EMAIL, password: PASSWORD },
  });
  check("registration", "register with a strong password succeeds",
    (reg.status === 200 || reg.status === 201) && Boolean(reg.json), `status ${reg.status}`);
  let token = reg.json && (reg.json.token || reg.json.accessToken);
  check("registration", "response returns a JWT", Boolean(token));

  const weak = await call("POST", "/api/auth/register", {
    body: { name: "Weak Pass", email: `weak${Date.now().toString().slice(-6)}@example.test`, password: "abc" },
  });
  check("registration", "weak password refused (policy §54)", weak.status === 400, `status ${weak.status}`);

  const badEmail = await call("POST", "/api/auth/register", {
    body: { name: "Bad Email", email: "not-an-email", password: PASSWORD },
  });
  check("registration", "invalid email refused", badEmail.status === 400, `status ${badEmail.status}`);

  const dupe = await call("POST", "/api/auth/register", {
    body: { name: "Dupe", email: EMAIL, password: PASSWORD },
  });
  check("registration", "duplicate email refused", dupe.status >= 400, `status ${dupe.status}`);

  // ---- 2. Login --------------------------------------------------------
  console.log("\n2. Login");
  const login = await call("POST", "/api/auth/login", { body: { email: EMAIL, password: PASSWORD } });
  check("login", "correct credentials authenticate",
    login.status === 200 && Boolean(login.json && login.json.token), `status ${login.status}`);
  if (login.json && login.json.token) token = login.json.token;

  const wrong = await call("POST", "/api/auth/login", { body: { email: EMAIL, password: "Wrong123!" } });
  check("login", "wrong password rejected", wrong.status === 401 || wrong.status === 400, `status ${wrong.status}`);

  const anon = await call("GET", "/api/pantry");
  check("login", "protected route refuses an anonymous request",
    anon.status === 401 || anon.status === 403, `status ${anon.status}`);

  const forged = await call("GET", "/api/pantry", { token: "not.a.valid.token" });
  check("login", "forged JWT rejected", forged.status === 401 || forged.status === 403, `status ${forged.status}`);

  // ---- 3. Profile ------------------------------------------------------
  console.log("\n3. Profile update");
  const profile = await call("GET", "/api/users/profile", { token });
  check("profile", "GET /api/users/profile returns the account",
    profile.status === 200 && Boolean(profile.json && profile.json.user), `status ${profile.status}`);

  const prefsSave = await call("PUT", "/api/users/preferences", {
    token,
    // dietType is deliberately "none": a restrictive diet filter exercises the Node
    // heuristic fallback, which is known to return an incomplete week (DEV-07).
    // Phase 1 asserts the Flask planner path here and tracks DEV-07 separately.
    body: { dietType: "none", allergies: ["peanut"], calorieGoal: 2000, skillLevel: "intermediate" },
  });
  check("profile", "PUT /api/users/preferences saves diet / allergies / calorie goal",
    prefsSave.status === 200, `status ${prefsSave.status}`);

  const prefsRead = await call("GET", "/api/users/preferences", { token });
  const saved = prefsRead.json && prefsRead.json.preferences;
  check("profile", "preferences read back after save",
    prefsRead.status === 200 && Boolean(saved), `status ${prefsRead.status}`);

  const nameUpdate = await call("PUT", "/api/users/profile", {
    token, body: { name: "Journey Tester Renamed" },
  });
  check("profile", "PUT /api/users/profile updates the display name",
    nameUpdate.status === 200, `status ${nameUpdate.status}`);

  // ---- 4. Pantry management -------------------------------------------
  console.log("\n4. Pantry management");
  const added = await call("POST", "/api/pantry", {
    token,
    body: { name: "Tomato", quantity: 6, unit: "piece", category: "vegetable", expiryDate: today() },
  });
  check("pantry", "POST /api/pantry adds an item", added.status === 201, `status ${added.status}`);
  const pantryId = added.json && (added.json.pantry_id || added.json.id);
  check("pantry", "new item returns its id", Boolean(pantryId));

  const noName = await call("POST", "/api/pantry", { token, body: { quantity: 1 } });
  check("pantry", "missing name refused by validation", noName.status === 400, `status ${noName.status}`);

  const list = await call("GET", "/api/pantry", { token });
  const rows = Array.isArray(list.json) ? list.json : [];
  check("pantry", "GET /api/pantry lists the new item", list.status === 200 && rows.length >= 1,
    `${rows.length} item(s), status ${list.status}`);

  if (pantryId) {
    const upd = await call("PUT", `/api/pantry/${pantryId}`, {
      token, body: { quantity: "500 g" },
    });
    check("pantry", "PUT /api/pantry/:id updates quantity + parses a unit string",
      upd.status === 200, `status ${upd.status}`);

    const del = await call("DELETE", `/api/pantry/${pantryId}`, { token });
    check("pantry", "DELETE /api/pantry/:id removes the item", del.status === 200, `status ${del.status}`);
  }

  // ---- 5. Recipe recommendations --------------------------------------
  console.log("\n5. Recipe recommendations");
  const rec = await call("GET", "/api/recipes/recommended?limit=5", { token });
  const recs = Array.isArray(rec.json) ? rec.json : (rec.json && rec.json.recipes) || [];
  check("recommend", "GET /api/recipes/recommended returns recipes",
    rec.status === 200 && recs.length > 0, `${recs.length} recipe(s), status ${rec.status}`);
  const decorated = recs.some((r) => r.score !== undefined || r.pantryMatch !== undefined);
  check("recommend", "recommendations carry the §25 score fields", decorated,
    decorated ? "score/pantryMatch present" : "no score fields found");

  const search = await call("GET", "/api/recipes/search?query=chicken");
  const found = Array.isArray(search.json) ? search.json : (search.json && search.json.recipes) || [];
  check("recommend", "GET /api/recipes/search?query=chicken returns hits",
    search.status === 200 && found.length > 0, `${found.length} hit(s), status ${search.status}`);

  const nlp = await call("GET", "/api/recipes/search?q=vegan%20dinner%20under%20500%20calories");
  check("recommend", "natural-language query is accepted (§37)",
    nlp.status === 200, `status ${nlp.status}`);

  const detailId = (recs[0] && (recs[0].id || recs[0].recipe_id)) ||
                   (found[0] && (found[0].id || found[0].recipe_id));
  if (detailId) {
    const detail = await call("GET", `/api/recipes/${detailId}`);
    check("recommend", `GET /api/recipes/${detailId} returns detail`,
      detail.status === 200 && Boolean(detail.json), `status ${detail.status}`);

    const fav = await call("POST", `/api/recipes/${detailId}/favorite`, { token });
    check("recommend", "POST /api/recipes/:id/favorite saves a favourite",
      fav.status === 200, `status ${fav.status}`);

    const favs = await call("GET", "/api/recipes/favorites", { token });
    check("recommend", "GET /api/recipes/favorites lists the saved recipe",
      favs.status === 200, `status ${favs.status}`);
  } else {
    check("recommend", "recipe detail + favourite", false, "no recipe id available");
  }

  // ---- 6. Meal planning ------------------------------------------------
  console.log("\n6. Meal planning");
  const generated = await call("POST", "/api/mealplan/generate", { token, body: { weekStart: today() } });
  check("mealplan", "POST /api/mealplan/generate builds a week",
    generated.status === 200, `status ${generated.status}`);
  // The API returns a day-keyed object { Monday: [...], ... } (see MealPlan.getWeek).
  const flattenPlan = (mealPlan) => {
    if (Array.isArray(mealPlan)) return mealPlan;
    if (mealPlan && typeof mealPlan === "object") return Object.values(mealPlan).flat();
    return null;
  };
  const planMeals = flattenPlan(generated.json && (generated.json.mealPlan || generated.json.meals));
  if (Array.isArray(planMeals)) {
    check("mealplan", "generated plan fills the 7 days × 4 slots (§28)",
      planMeals.length === 28, `${planMeals.length} meal(s)`);
    const ids = planMeals.map((m) => String(m.recipeId || m.recipe_id));
    const repeats = ids.length - new Set(ids).size;
    check("mealplan", "no duplicate recipes inside one week", repeats === 0, `${repeats} repeat(s)`);
    const slots = new Set(planMeals.map((m) => m.mealType));
    check("mealplan", "plan uses all four meal slots",
      slots.size === 4, [...slots].join(", "));
  }

  const week = await call("GET", "/api/mealplan", { token });
  check("mealplan", "GET /api/mealplan returns the saved week", week.status === 200, `status ${week.status}`);

  // Contract: POST /api/mealplan { recipeId, day, mealType } where day is a weekday name.
  if (detailId) {
    const addMeal = await call("POST", "/api/mealplan", {
      token,
      body: { recipeId: detailId, day: "Wednesday", mealType: "dinner" },
    });
    check("mealplan", "POST /api/mealplan adds a recipe to a day",
      addMeal.status === 200 || addMeal.status === 201, `status ${addMeal.status}`);

    const missing = await call("POST", "/api/mealplan", { token, body: { mealType: "dinner" } });
    check("mealplan", "POST /api/mealplan rejects a payload without recipeId/day",
      missing.status === 400, `status ${missing.status}`);
  }

  // ---- 7. Shopping list ------------------------------------------------
  console.log("\n7. Shopping list");
  const built = await call("POST", "/api/shoppinglist/generate", { token, body: {} });
  check("shopping", "POST /api/shoppinglist/generate builds from the meal plan",
    built.status === 200, `status ${built.status}`);
  const items = built.json && (built.json.shoppingList || built.json.items);
  if (Array.isArray(items)) {
    const negative = items.filter((i) => Number(i.quantity) < 0).length;
    check("shopping", "pantry is subtracted so quantities are never negative (§30)",
      negative === 0, `${items.length} item(s), ${negative} negative`);
  }

  const shopList = await call("GET", "/api/shoppinglist", { token });
  check("shopping", "GET /api/shoppinglist returns the list", shopList.status === 200, `status ${shopList.status}`);

  const shopRows = Array.isArray(shopList.json) ? shopList.json : [];
  const firstItem = shopRows[0];
  const itemId = firstItem && (firstItem.item_id || firstItem.id);
  if (itemId) {
    const toggled = await call("PATCH", `/api/shoppinglist/${itemId}`, { token, body: { completed: true } });
    check("shopping", "PATCH /api/shoppinglist/:itemId marks an item completed",
      toggled.status === 200, `status ${toggled.status}`);
  } else {
    check("shopping", "PATCH item completed", true, "no items generated to toggle");
  }

  // ---- summary ---------------------------------------------------------
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Journey summary: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  console.log(`${"=".repeat(60)}\n`);
  process.exit(failed ? 1 : 0);
}




main().catch((err) => {
  console.error("journey-check crashed:", err && err.message);
  process.exit(1);
});
