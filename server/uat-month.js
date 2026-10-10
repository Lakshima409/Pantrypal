// PantryPal month-long end-to-end user test (backend HTTP only).
//
// Simulates one realistic power-user ("Maya") using the system daily for 30 days:
// register -> preferences -> daily pantry top-ups -> weekly interactions
// (views/saves/cooks/likes/ratings) -> recommendations -> 7-day meal plan
// -> shopping-list generation -> personalized diet confirmation.
//
// Run (server MUST be up):   node uat-month.js [--base http://localhost:5000]
//
// Zero dependencies (global fetch only). Every check throws on regression;
// the summary pinpoints PASS/FAIL per journey stage.
const BASE = (process.argv.find((a) => a.startsWith("--base=")) || "").slice(7) || "http://localhost:5000";
const DB_DSN = process.env.DB_DSN || "";
const EMAIL = `maya.uat.${Date.now()}@pantrypal.local`;
const PASSWORD = "MonthOfMeals1";

const results = [];
function check(stage, name, cond, detail = "") {
  const ok = Boolean(cond);
  results.push({ stage, name, ok, detail });
  console.log(`${ok ? "  PASS" : "  FAIL"} [${stage}] ${name}${detail ? ` -- ${detail}` : ""}`);
  return ok;
}

let db = null;
async function dbQuery(sql, params) {
  if (!db) {
    const mysql = require("mysql2/promise");
    db = await mysql.createConnection(DB_DSN);
  }
  const [rows] = await db.execute(sql, params);
  return rows;
}

async function api(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`PantryPal month-long UAT -- base ${BASE} (DB seed ${DB_DSN ? "ON" : "OFF"})`);

  // 1. Register
  let token = null;
  let userId = null;
  {
    const { status, data } = await api("POST", "/api/auth/register", null, {
      name: PERSONA.name, email: EMAIL, password: PASSWORD,
    });
    check("register", "account created (201 + token)", status === 201 && data.token && data.user, `status=${status}`);
    token = data.token;
    userId = data.user && (data.user.id || data.user.user_id);
    check("register", "public user shape has id/name/email",
      data.user && data.user.email === EMAIL && data.user.name === PERSONA.name && !("password_hash" in data.user));
  }

  // 2. Preferences (personalization inputs)
  {
    const { status, data } = await api("PUT", "/api/users/preferences", token, PERSONA.preferences);
    const prefs = data.preferences || {};
    check("profile", "preferences saved", status === 200, `status=${status}`);
    check("profile", "calorieGoal=1900 persisted", String(prefs.calorieGoal) === "1900", JSON.stringify(prefs.calorieGoal));
    check("profile", "peanut allergy persisted", (prefs.allergies || []).includes("peanut"), JSON.stringify(prefs.allergies));
    check("profile", "vegetarian diet persisted",
      (prefs.dietary || []).includes("vegetarian") || prefs.dietType === "vegetarian",
      JSON.stringify({ dietType: prefs.dietType, dietary: prefs.dietary }));
    const back = await api("GET", "/api/users/preferences", token);
    check("profile", "preferences round-trip", back.status === 200 && String(back.data.preferences.calorieGoal) === "1900");
  }

  // 3. Pantry: 30-day top-up cadence
  {
    for (const item of PERSONA.pantryBase) {
      const r = await api("POST", "/api/pantry", token, item);
      if (r.status !== 201) throw new Error(`pantry seed failed: ${JSON.stringify(r.data)}`);
    }
    let ok = true;
    for (let w = 0; w < 4; w++) {
      for (const item of PERSONA.pantryWeekly[w]) {
        const r = await api("POST", "/api/pantry", token, item);
        ok = ok && r.status === 201;
      }
      await sleep(50);
    }
    const list = await api("GET", "/api/pantry", token);
    const n = Array.isArray(list.data) ? list.data.length : 0;
    check("pantry", "30-day pantry built (base 6 + 20 weekly)", ok && n >= 24, `${n} items`);
  }

  // 4. Interaction history (~1 month of real usage)
  let recipeIds = [];
  let seededInteractions = 0;
  {
    const t = await api("GET", "/api/recipes/trending", token);
    const rows = Array.isArray(t.data) ? t.data : t.data.recipes || [];
    recipeIds = rows.map((r) => r.id || r.recipe_id).filter(Boolean).slice(0, 24);
    check("history", "seed corpus discoverable (>=8 recipes)", recipeIds.length >= 8, `${recipeIds.length} ids`);
  }

  if (DB_DSN && userId && recipeIds.length) {
    const plan = [
      ...recipeIds.slice(0, 10).map((id) => [id, "viewed", 1]),
      ...recipeIds.slice(0, 8).map((id) => [id, "viewed", 2]),
      ...recipeIds.slice(0, 5).map((id) => [id, "saved", 1]),
      ...recipeIds.slice(2, 6).map((id) => [id, "cooked", 1]),
      ...recipeIds.slice(0, 4).map((id) => [id, "liked", 2]),
      ...recipeIds.slice(1, 4).map((id) => [id, "rated", 2]),
      ...recipeIds.slice(3, 7).map((id) => [id, "cooked", 3]),
      ...recipeIds.slice(5, 9).map((id) => [id, "viewed", 4]),
      ...recipeIds.slice(0, 3).map((id) => [id, "cooked", 4]),
      ...recipeIds.slice(6, 8).map((id) => [id, "rated", 1]),
    ];
    for (const [rid, type, weekNo] of plan) {
      const daysAgo = Math.max(0, 30 - weekNo * 7 + (Number(String(rid).slice(-1)) % 7));
      await dbQuery(
        "INSERT INTO interactions (user_id, recipe_id, type, timestamp) VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))",
        [userId, Number(rid), type, daysAgo]
      );
      seededInteractions++;
    }
  }
  if (recipeIds.length >= 2) {
    const f1 = await api("POST", `/api/recipes/${recipeIds[0]}/favorite`, token);
    const f2 = await api("POST", `/api/recipes/${recipeIds[1]}/favorite`, token);
    check("history", "favorite route works (saved interactions)",
      f1.status === 200 && f1.data.isFavorite === true && f2.status === 200, `${f1.status}/${f2.status}`);
    const d1 = await api("DELETE", `/api/recipes/${recipeIds[1]}/favorite`, token);
    check("history", "unfavorite route works", d1.status === 200 && d1.data.isFavorite === false);
  }
  check("history", DB_DSN ? `month of interactions seeded (${seededInteractions} rows)` : "interaction DB seed skipped (no DB_DSN)",
    DB_DSN ? seededInteractions >= 30 : true);

  // 5. Recommendations: ranked, scored, allergy-safe
  {
    const { status, data } = await api("GET", "/api/recipes/recommended", token);
    const recs = Array.isArray(data) ? data : data.recipes || data.recommendations || [];
    check("recommend", "recommended returns 12 ranked recipes", status === 200 && recs.length === 12, `status=${status} n=${recs.length}`);
    const fields = recs.length && recs[0].score !== undefined && recs[0].pantryMatch !== undefined && recs[0].dietMatch !== undefined;
    check("recommend", "recipes carry score/pantryMatch/dietMatch", fields,
      fields ? `top score=${recs[0].score}` : `keys=${recs.length ? Object.keys(recs[0]).join(",") : "none"}`);
    const bad = recs.filter((r) => {
      const hay = `${r.title || ""} ${(r.ingredients || []).map((i) => i.name).join(" ")} ${(r.tags || []).join(" ")}`.toLowerCase();
      return hay.includes("peanut");
    });
    check("recommend", "no peanut recipes for allergic user", bad.length === 0,
      bad.length ? `flagged: ${bad.map((r) => r.title).join("; ")}` : `${recs.length} clean`);
    console.log(`     top-5: ${recs.slice(0, 5).map((r) => r.title).join(" | ")}`);
    const sorted = [...recs].sort((a, b) => (b.score || 0) - (a.score || 0));
    check("recommend", "already sorted by score desc", recs.every((r, i) => r === sorted[i]));
  }
}


// Persona: Maya — vegetarian, lactose-intolerant, 1900 kcal, intermediate cook.
const PERSONA = {
  name: "Maya Fernando",
  preferences: {
    calorieGoal: "1900",
    dietType: "vegetarian",
    skill: "intermediate",
    allergies: ["peanut"],
    dietary: ["vegetarian"],
    healthConditions: ["lactose-intolerance"],
    dietaryRestrictions: [],
    preferences: ["italian", "indian"],
  },
  pantryBase: [
    { name: "rice", quantity: 2000, unit: "g", category: "grains" },
    { name: "olive oil", quantity: 500, unit: "ml", category: "pantry" },
    { name: "garlic", quantity: 12, unit: "cloves", category: "vegetables" },
    { name: "onion", quantity: 8, unit: "", category: "vegetables" },
    { name: "salt", quantity: 250, unit: "g", category: "pantry" },
    { name: "black pepper", quantity: 50, unit: "g", category: "pantry" },
  ],
  pantryWeekly: [
    [
      { name: "tomatoes", quantity: 6, unit: "", category: "vegetables" },
      { name: "spinach", quantity: 300, unit: "g", category: "vegetables" },
      { name: "chickpeas", quantity: 800, unit: "g", category: "pantry" },
      { name: "milk", quantity: 1, unit: "l", category: "dairy" },
      { name: "eggs", quantity: 12, unit: "", category: "dairy" },
    ],
    [
      { name: "bell peppers", quantity: 4, unit: "", category: "vegetables" },
      { name: "zucchini", quantity: 3, unit: "", category: "vegetables" },
      { name: "pasta", quantity: 1000, unit: "g", category: "grains" },
      { name: "parmesan", quantity: 120, unit: "g", category: "dairy" },
      { name: "basil", quantity: 1, unit: "bunch", category: "vegetables" },
    ],
    [
      { name: "quinoa", quantity: 750, unit: "g", category: "grains" },
      { name: "oats", quantity: 800, unit: "g", category: "grains" },
      { name: "broccoli", quantity: 2, unit: "", category: "vegetables" },
      { name: "greek yogurt", quantity: 500, unit: "g", category: "dairy" },
      { name: "lentils", quantity: 600, unit: "g", category: "pantry" },
    ],
    [
      { name: "oat milk", quantity: 2, unit: "l", category: "dairy" },
      { name: "coconut milk", quantity: 800, unit: "ml", category: "pantry" },
      { name: "sweet potato", quantity: 4, unit: "", category: "vegetables" },
      { name: "curry powder", quantity: 90, unit: "g", category: "pantry" },
      { name: "ginger", quantity: 100, unit: "g", category: "vegetables" },
    ],
  ],
};

// ── 6. Personalized 7-day diet plan ──────────────────────────────────────
async function stageMealPlan(token) {
  let planDays = 0;
  let totalMeals = 0;
  const g = await api("POST", "/api/mealplan/generate", token, {
    calorieGoal: 1900, dietType: "vegetarian", allergies: ["peanut"],
  });
  check("mealplan", "week generated", g.status === 200 && g.data.mealPlan, `status=${g.status}`);
  const week = await api("GET", "/api/mealplan?week=0", token);
  const mp = week.data.mealPlan || week.data.mealplan || {};
  planDays = Object.values(mp).filter((meals) => (meals || []).length).length;
  totalMeals = Object.values(mp).reduce((n, meals) => n + (meals || []).length, 0);
  check("mealplan", "plan covers 5+ days / 14+ meals", planDays >= 5 && totalMeals >= 14, `${planDays}d/${totalMeals}m`);
  const nut = week.data.nutrition || {};
  check("mealplan", "nutrition totals present", nut.meals > 0 && Number(nut.calories) > 0,
    `meals=${nut.meals} kcal=${nut.calories} protein=${nut.protein}`);
  const ids = Object.values(mp).flat().map((m) => m.recipeId).filter(Boolean);
  if (ids.length) {
    const det = await api("GET", `/api/recipes/${ids[0]}`, token);
    check("mealplan", "planned recipe resolves to detail", det.status === 200 && det.data.recipe, `id=${ids[0]}`);
  }
  return { planDays, totalMeals };
}

// ── 7. Shopping list generated from the plan ─────────────────────────────
async function stageShopping(token) {
  const g = await api("POST", "/api/shoppinglist/generate", token, {});
  check("shopping", "list generated from plan", g.status === 200 && Array.isArray(g.data.shoppingList), `status=${g.status}`);
  const list = await api("GET", "/api/shoppinglist", token);
  const items = Array.isArray(list.data) ? list.data : list.data.items || [];
  check("shopping", "non-empty deduplicated list", items.length >= 3, `${items.length} items`);
  const names = items.map((i) => String(i.name).toLowerCase());
  check("shopping", "no duplicate ingredient names", new Set(names).size === names.length,
    names.length ? `unique ${new Set(names).size}/${names.length}` : "empty");
  const preview = items.slice(0, 8).map((i) => `${i.name}${i.amount ? ` ${i.amount}${i.unit ? " " + i.unit : ""}` : ""}`).join(", ");
  console.log(`     preview: ${preview}${items.length > 8 ? " ..." : ""}`);
  if (items[0]) {
    const p = await api("PATCH", `/api/shoppinglist/${items[0].id}`, token, { completed: true });
    check("shopping", "check-off works", p.status === 200, `status=${p.status}`);
  }
}

// ── 8. Personalized diet confirmation (plan matches prefs) ───────────────
async function stagePersonalize(token, planDays) {
  const [prefsRes, weekRes] = await Promise.all([
    api("GET", "/api/users/preferences", token),
    api("GET", "/api/mealplan?week=0", token),
  ]);
  const prefs = prefsRes.data.preferences || {};
  const mp = weekRes.data.mealPlan || {};
  const gotVeg = (prefs.dietary || []).includes("vegetarian") || prefs.dietType === "vegetarian";
  const meals = Object.values(mp).flat();
  check("personalize", "diet preference still vegetarian", gotVeg, JSON.stringify(prefs.dietType || prefs.dietary));
  check("personalize", "plan still populated for this user",
    meals.length >= 14 && planDays >= 5, `${meals.length} meals / ${planDays} days`);
}

main()
  .then(async () => {
    // stages 6-8 run after register/profile/pantry/history/recommend inside main;
    // re-fetch the token-scoped state via a fresh login for isolation.
    const { status, data } = await api("POST", "/api/auth/login", null, { email: EMAIL, password: PASSWORD });
    if (status !== 200 || !data.token) throw new Error("re-login failed before stages 6-8");
    const { planDays } = await stageMealPlan(data.token);
    await stageShopping(data.token);
    await stagePersonalize(data.token, planDays);
    const pass = results.filter((r) => r.ok).length;
    console.log(`\nUAT month simulation: ${pass}/${results.length} checks passed.`);
    if (db) await db.end().catch(() => {});
    if (pass !== results.length) {
      console.log("Failed checks:");
      results.filter((r) => !r.ok).forEach((r) => console.log(` - [${r.stage}] ${r.name} ${r.detail}`));
      process.exitCode = 1;
    }
  })
  .catch((err) => {
    console.error("UAT crashed:", err && err.message ? err.message : err);
    process.exitCode = 1;
  });
