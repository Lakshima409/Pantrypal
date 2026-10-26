// server/test/setup-env.js
// Explicit test-mode configuration for the Node test runner.
if (!process.env.NODE_ENV) process.env.NODE_ENV = "test";
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-jwt-secret-that-is-long-enough-for-hs256-signing";
}
