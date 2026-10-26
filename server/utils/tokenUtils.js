// server/utils/tokenUtils.js
const jwt = require("jsonwebtoken");


// Fail fast in production; warn loudly in development (blueprint §54 security).
const INSECURE_SECRETS = new Set([
  "secret",
  "change-me-to-a-long-random-string",
  "change-me-in-production",
]);

function isTestEnvironment() {
  return process.env.NODE_ENV === "test" || process.env.NODE_ENV === "testing";
}

function assertSecureSecret(value) {
  if (typeof value !== "string" || value.trim().length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long.");
  }
  const normalized = value.trim().toLowerCase();
  if (INSECURE_SECRETS.has(normalized)) {
    throw new Error("JWT_SECRET must not use a known insecure placeholder value.");
  }
}

let JWT_SECRET;
if (process.env.JWT_SECRET) {
  if (!isTestEnvironment()) {
    assertSecureSecret(process.env.JWT_SECRET);
  }
  JWT_SECRET = process.env.JWT_SECRET;
} else if (isTestEnvironment()) {
  JWT_SECRET = "test-jwt-secret-that-is-long-enough-for-hs256-signing";
} else if (process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET must be set in production.");
} else {
  throw new Error("JWT_SECRET must be set. Copy server/.env.example to server/.env and set JWT_SECRET.");
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function signToken(user) {
  const userId = user.id || user.user_id;
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  // Normalise older tokens that used `{ id }` instead of `{ userId }`.
  if (!payload.userId && payload.id) payload.userId = payload.id;
  return payload;
}

module.exports = { signToken, verifyToken, JWT_SECRET };
