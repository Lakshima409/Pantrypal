// server/middleware/authMiddleware.js
// Verifies the JWT sent as `Authorization: Bearer <token>` or stored in the
// `pantry_token` cookie (set by authController on login/register).
const { verifyToken } = require("../utils/tokenUtils");

function extractToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  if (req.cookies && req.cookies.pantry_token) return req.cookies.pantry_token;
  const raw = req.headers.cookie || "";
  const match = raw.split(";").map((p) => p.trim()).find((p) => p.startsWith("pantry_token="));
  if (match) return decodeURIComponent(match.slice("pantry_token=".length));
  return null;
}

// Requires a valid token — 401 otherwise.
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ message: "Sign in to continue." });
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.userId };
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
}

// Attaches req.user when a valid token is present, but never blocks.
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyToken(token);
      req.user = { id: payload.userId };
      req.token = token;
    } catch (err) {
      // anonymous request — ignore
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth, extractToken };
