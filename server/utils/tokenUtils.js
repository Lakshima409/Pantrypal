// server/utils/tokenUtils.js
const jwt = require("jsonwebtoken");

// Fail fast in production; warn loudly in development (blueprint §54 security).
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production.");
  }
  console.warn("[auth] JWT_SECRET not set — using insecure dev default. Set it in server/.env.");
  return "secret";
})();
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
