// server/test/auth-hardening.test.js
// Phase 2 — authentication / authorization / API protection / error handling.
// No DB needed: exercises middleware + error handler directly.
const test = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");

const { requireAuth } = require("../middleware/authMiddleware");
const { rateLimit } = require("../middleware/security");
const { errorHandler } = require("../middleware/errorHandler");

function mockReq({ headers } = {}) {
  return {
    headers: headers || {}, cookies: {}, ip: "127.0.0.1", baseUrl: "",
    path: "/", originalUrl: "/",
  };
}
function mockRes() {
  const res = { statusCode: 200, body: null, headers: {} };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.body = obj; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  return res;
}
function run(mw, req) {
  const res = mockRes();
  let passed = false;
  mw(req, res, () => { passed = true; });
  return { res, passed, req };
}

test("auth: missing token -> 401", () => {
  const { res, passed } = run(requireAuth, mockReq());
  assert.strictEqual(passed, false);
  assert.strictEqual(res.statusCode, 401);
});

test("auth: forged/tampered token -> 401 invalid", () => {
  const secret = require("../utils/tokenUtils").JWT_SECRET;
  const good = jwt.sign({ userId: 1 }, secret, { expiresIn: "7d" });
  const bad = good.slice(0, -2) + "xx";
  const { res, passed } = run(requireAuth, mockReq({ headers: { authorization: `Bearer ${bad}` } }));
  assert.strictEqual(passed, false);
  assert.strictEqual(res.statusCode, 401);
  assert.ok(!res.body.expired);
});

test("auth: expired token -> 401 with expired flag", () => {
  const secret = require("../utils/tokenUtils").JWT_SECRET;
  const expired = jwt.sign({ userId: 9 }, secret, { expiresIn: "-10s" });
  const { res, passed } = run(requireAuth, mockReq({ headers: { authorization: `Bearer ${expired}` } }));
  assert.strictEqual(passed, false);
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.expired, true);
});

test("auth: valid token attaches req.user", () => {
  const secret = require("../utils/tokenUtils").JWT_SECRET;
  const token = jwt.sign({ userId: 42 }, secret, { expiresIn: "7d" });
  const { passed, req } = run(requireAuth, mockReq({ headers: { authorization: `Bearer ${token}` } }));
  assert.strictEqual(passed, true);
  assert.strictEqual(req.user.id, 42);
});

test("rate limiter blocks after max", () => {
  const mw = rateLimit({ windowMs: 60000, max: 3 });
  const mkReq = () => ({ ip: "10.0.0.9", baseUrl: "", path: "/x", originalUrl: "/x", headers: {} });
  for (let i = 0; i < 3; i++) {
    assert.strictEqual(run(mw, mkReq()).res.statusCode, 200);
  }
  assert.strictEqual(run(mw, mkReq()).res.statusCode, 429);
});

test("errors: 500 hides internals, 400 keeps message", () => {
  const r500 = mockRes();
  errorHandler(new Error("s3cr3t password_hash='x'"), mockReq(), r500, () => {});
  assert.strictEqual(r500.statusCode, 500);
  assert.ok(!JSON.stringify(r500.body).includes("s3cr3t"));

  const r400 = mockRes();
  const e400 = new Error("recipeId and day are required.");
  e400.status = 400;
  errorHandler(e400, mockReq(), r400, () => {});
  assert.strictEqual(r400.statusCode, 400);
  assert.strictEqual(r400.body.message, "recipeId and day are required.");
});
