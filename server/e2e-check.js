// Temporary E2E validation script for Phase A (delete after run).
const base = "http://localhost:5000";

async function call(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

(async () => {
  const email = `e2e_${Date.now()}@test.local`;
  const reg = await call("POST", "/api/auth/register", { name: "E2E Tester", email, password: "Passw0rd!123" });
  const tok = reg.token;
  console.log(`1. register OK user=${reg.user.id}`);

  const recipes = await call("GET", "/api/recipes/search?query=chicken", undefined, tok);
  const rec = recipes.find((r) => r.ingredients && r.ingredients.length >= 3);
  if (!rec) throw new Error("no recipe with >=3 ingredients");
  console.log(`2. recipe OK id=${rec.id} "${rec.title}"`);
  rec.ingredients.slice(0, 5).forEach((i) => console.log(`   need: ${i.name} ${i.amount} ${i.unit}`));

  // Pantry: half-quantity of ingredients 1-2, full quantity of ingredient 3.
  const a = rec.ingredients[0], b = rec.ingredients[1], c = rec.ingredients[2];
  const half = (q) => Math.max(1, Math.floor(Number(q) / 2));
  await call("POST", "/api/pantry", { name: a.name, quantity: half(a.amount), unit: a.unit }, tok);
  await call("POST", "/api/pantry", { name: b.name, quantity: half(b.amount), unit: b.unit }, tok);
  if (c) await call("POST", "/api/pantry", { name: c.name, quantity: Number(c.amount), unit: c.unit }, tok);
  console.log(`3. pantry OK (+${a.name} ${half(a.amount)}, +${b.name} ${half(b.amount)}${c ? `, full ${c.name}` : ""})`);

  await call("POST", "/api/mealplan", { recipeId: rec.id, day: "Monday", mealType: "dinner" }, tok);
  console.log("4. mealplan add OK (mealType=dinner)");

  const gen = await call("POST", "/api/shoppinglist/generate", {}, tok);
  console.log("5. shopping list after pantry subtraction:");
  gen.shoppingList.forEach((i) => console.log(`   - ${i.name}: ${i.amount} ${i.unit}`));

  // Assertions per §30-31
  const names = gen.shoppingList.map((i) => i.name.toLowerCase());
  const fail = [];
  if (c && names.includes(c.name.toLowerCase())) fail.push(`fully-stocked "${c.name}" should NOT be on list`);
  if (!names.length) fail.push("list empty — expected partial-coverage items");
  const week = await call("GET", "/api/mealplan?week=0", undefined, tok);
  if (!week.nutrition) fail.push("mealplan missing nutrition summary");
  console.log(`6. nutrition summary: ${JSON.stringify(week.nutrition)}`);

  const recs = await call("GET", "/api/recipes/recommended", undefined, tok);
  if (!Array.isArray(recs) || !recs.length) fail.push("recommended empty");
  const first = recs[0];
  if (first && (first.score === undefined || first.pantryMatch === undefined || first.dietMatch === undefined)) {
    fail.push(`recommended missing §25 score fields: ${JSON.stringify({ score: first.score, pantryMatch: first.pantryMatch, dietMatch: first.dietMatch })}`);
  }
  console.log(`7. recommended OK count=${recs.length} first="${first && first.title}" score=${first && first.score} pantryMatch=${first && first.pantryMatch} dietMatch=${first && first.dietMatch}`);

  if (fail.length) {
    console.error("FAILURES:\n - " + fail.join("\n - "));
    process.exit(1);
  }
  console.log("ALL E2E CHECKS PASSED");
})().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
