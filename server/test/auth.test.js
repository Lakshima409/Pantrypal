// Auth validation + JWT round-trip tests (blueprint §54, §61).
const test = require("node:test");
const assert = require("node:assert");

const { isStrongPassword, EMAIL_RE } = require("../middleware/validateInput");
const { signToken, verifyToken } = require("../utils/tokenUtils");

test("password policy matches backend rules (§54)", () => {
  assert.strictEqual(isStrongPassword("Passw0rd!123"), true);
  assert.strictEqual(isStrongPassword("short1A"), false);       // < 8 chars
  assert.strictEqual(isStrongPassword("alllowercase1"), false); // no uppercase
  assert.strictEqual(isStrongPassword("ALLUPPERCASE1"), false); // no lowercase
  assert.strictEqual(isStrongPassword("NoNumbersHere"), false); // no digit
});

test("email validation", () => {
  assert.ok(EMAIL_RE.test("user@example.com"));
  assert.ok(!EMAIL_RE.test("not-an-email"));
  assert.ok(!EMAIL_RE.test("missing@tld"));
});

test("JWT sign → verify round-trip", () => {
  const token = signToken({ user_id: 42 });
  const payload = verifyToken(token);
  assert.strictEqual(payload.userId, 42);
});

test("tampered JWT is rejected", () => {
  const token = signToken({ user_id: 42 });
  assert.throws(() => verifyToken(token + "x"));
});
