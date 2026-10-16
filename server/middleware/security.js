// server/middleware/security.js
// Phase 2 — API protection without new dependencies.
// Lightweight in-memory rate limiting + security headers.

function getClientKey(req) {
  // Prefer Express' trust-aware IP, fall back to socket address.
  return (
    req.ip ||
    (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
    (req.socket && req.socket.remoteAddress) ||
    "unknown"
  );
}

// Sliding-window limiter: max requests per windowMs per key.
function rateLimit({ windowMs = 60 * 1000, max = 120, message } = {}) {
  const hits = new Map(); // key -> { count, resetAt }
  const mw = (req, res, next) => {
    // Never rate-limit health checks (load balancers / Docker HEALTHCHECK).
    if (req.path === "/api/health" || req.originalUrl === "/api/health") return next();
    const key = `${getClientKey(req)}:${req.baseUrl || ""}`;
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
    if (entry.count > max) {
      return res.status(429).json({
        message: message || "Too many requests. Please slow down and try again.",
      });
    }
    next();
  };
  // Exposed for tests (reset between cases).
  mw._reset = () => hits.clear();
  mw._hits = hits;
  return mw;
}

// Minimal security headers (helmet-equivalent subset, no dependency).
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // Keep permissive enough for the Vite SPA; tightens MIME / framing attacks.
  next();
}

module.exports = { rateLimit, securityHeaders, getClientKey };
