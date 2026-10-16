// Unit tests for rating controller input validation (no DB required).
// Run: npm test  (node --test)
const test = require("node:test");
const assert = require("node:assert");

// Stub the models so the controller loads without a database connection.
const mockRecipe = { findById: async () => null };
const mockRating = {
  upsert: async () => ({}),
  statsForRecipe: async () => ({ avgRating: null, ratingCount: 0 }),
  getByUserAndRecipe: async () => null,
  listForRecipe: async () => [],
  remove: async () => false,
};

require.cache[require.resolve("../models/Recipe")] = {
  id: require.resolve("../models/Recipe"),
  filename: require.resolve("../models/Recipe"),
  loaded: true,
  exports: mockRecipe,
};
require.cache[require.resolve("../models/Rating")] = {
  id: require.resolve("../models/Rating"),
  filename: require.resolve("../models/Rating"),
  loaded: true,
  exports: mockRating,
};

const { rateRecipe, listRatings, getMyRating, removeRating } =
  require("../controllers/ratingController");

// Helper to build a mock Express req/res/next.
function makeReq(body = {}, params = {}, user = { id: 1 }, query = {}) {
  return { body, params, user, query };
}
function makeRes() {
  const res = {};
  let statusCode = 200;
  let body;
  res.status = (code) => {
    statusCode = code;
    return res;
  };
  res.json = (data) => {
    body = data;
    return res;
  };
  return { res, getStatus: () => statusCode, getBody: () => body };
}

// ---- rateRecipe validation ----

test("rateRecipe rejects missing rating", async () => {
  const req = makeReq({}, { id: 42 });
  const res = makeRes();
  await rateRecipe(req, res.res, () => {});
  assert.strictEqual(res.getStatus(), 400);
  assert.ok(res.getBody().message.includes("rating"));
});

test("rateRecipe rejects rating 0", async () => {
  const req = makeReq({ rating: 0 }, { id: 42 });
  const res = makeRes();
  await rateRecipe(req, res.res, () => {});
  assert.strictEqual(res.getStatus(), 400);
});

test("rateRecipe rejects rating 6", async () => {
  const req = makeReq({ rating: 6 }, { id: 42 });
  const res = makeRes();
  await rateRecipe(req, res.res, () => {});
  assert.strictEqual(res.getStatus(), 400);
});

test("rateRecipe rejects non-integer rating", async () => {
  const req = makeReq({ rating: "abc" }, { id: 42 });
  const res = makeRes();
  await rateRecipe(req, res.res, () => {});
  assert.strictEqual(res.getStatus(), 400);
});

test("rateRecipe accepts rating 3", async () => {
  const req = makeReq({ rating: 3 }, { id: 42 });
  const res = makeRes();
  await rateRecipe(req, res.res, () => {});
  // Recipe.findById returns null (stubbed) → 404, not 500.
  assert.strictEqual(res.getStatus(), 404);
});

test("rateRecipe accepts rating 5 with review", async () => {
  const req = makeReq({ rating: 5, review: "Great!" }, { id: 42 });
  const res = makeRes();
  await rateRecipe(req, res.res, () => {});
  assert.strictEqual(res.getStatus(), 404); // recipe stubbed as not found
});

test("rateRecipe rejects review over 1000 chars", async () => {
  const req = makeReq(
    { rating: 4, review: "x".repeat(1001) },
    { id: 42 }
  );
  const res = makeRes();
  await rateRecipe(req, res.res, () => {});
  assert.strictEqual(res.getStatus(), 400);
});

test("rateRecipe accepts review exactly 1000 chars", async () => {
  const req = makeReq(
    { rating: 4, review: "x".repeat(1000) },
    { id: 42 }
  );
  const res = makeRes();
  await rateRecipe(req, res.res, () => {});
  assert.strictEqual(res.getStatus(), 404); // passes validation, hits recipe stub
});

// ---- getMyRating ----

test("getMyRating returns 401 without user", async () => {
  const req = makeReq({}, { id: 42 }, null);
  const res = makeRes();
  await getMyRating(req, res.res, () => {});
  assert.strictEqual(res.getStatus(), 401);
});

// ---- removeRating ----

test("removeRating returns 401 without user", async () => {
  const req = makeReq({}, { id: 42 }, null);
  const res = makeRes();
  await removeRating(req, res.res, () => {});
  assert.strictEqual(res.getStatus(), 401);
});

// ---- listRatings ----

test("listRatings returns empty ratings with stats", async () => {
  const req = makeReq({}, { id: 42 });
  const res = makeRes();
  await listRatings(req, res.res, () => {});
  assert.strictEqual(res.getStatus(), 200);
  assert.ok(res.getBody().stats);
  assert.ok(Array.isArray(res.getBody().ratings));
});
