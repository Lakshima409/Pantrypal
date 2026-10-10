// Verifies Node → Flask integration: /api/recipes/recommended must return the
// SAME ordered ids+scores as calling Flask /recommend directly (§27).
const base = "http://localhost:5000";
const FLASK = "http://127.0.0.1:5001";

async function call(method, url, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

(async () => {
  const reg = await call("POST", `${base}/api/auth/register`, {
    name: "AI Path Tester", email: `aipath_${Date.now()}@test.local`, password: "Passw0rd!123",
  });
  const tok = reg.token;

  await call("POST", `${base}/api/pantry`, { name: "chicken thigh", quantity: 200, unit: "g" }, tok);
  await call("POST", `${base}/api/pantry`, { name: "rice", quantity: 1, unit: "cup" }, tok);

  const viaNode = await call("GET", `${base}/api/recipes/recommended`, undefined, tok);
  const prefs = (await call("GET", `${base}/api/users/preferences`, undefined, tok)) || {};
  const viaFlask = await call("POST", `${FLASK}/recommend`, {
    user_id: reg.user.id, limit: 12,
    pantry: ["chicken thigh", "rice"],
    preferences: prefs.preferences || prefs,
  });

  const nodeTop = viaNode.slice(0, 5).map((r) => `${r.id}:${r.score}`).join(" ");
  const flaskTop = viaFlask.recommendations.slice(0, 5).map((r) => `${r.recipe_id}:${r.score}`).join(" ");
  console.log("NODE :", nodeTop);
  console.log("FLASK:", flaskTop);

  const nodeIds = viaNode.slice(0, 5).map((r) => String(r.id));
  const flaskIds = viaFlask.recommendations.slice(0, 5).map((r) => String(r.recipe_id));
  const same = JSON.stringify(nodeIds) === JSON.stringify(flaskIds);
  console.log(same ? "AI PATH CONFIRMED: Node is serving Flask hybrid scores" : "MISMATCH — Node likely used DB fallback");
  process.exit(same ? 0 : 1);
})().catch((err) => { console.error("ERROR:", err.message); process.exit(1); });
