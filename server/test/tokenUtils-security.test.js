const test = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const tokenUtilsPath = path.resolve(__dirname, "../utils/tokenUtils.js");

function runChild(env) {
  const code = `try { require(${JSON.stringify(tokenUtilsPath)}); console.log("LOADED"); } catch (e) { console.error(e.message); process.exit(1); }`;
  return spawnSync(process.execPath, ["-e", code], {
    env: (() => { const merged = { ...process.env, ...env }; if (!Object.prototype.hasOwnProperty.call(env, "JWT_SECRET")) delete merged.JWT_SECRET; return merged; })(),
    encoding: "utf8",
  });
}

test("tokenUtils: explicit test mode allows missing JWT_SECRET", () => {
  const result = runChild({ NODE_ENV: "test" });
  delete result.env;
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /LOADED/);
});

test("tokenUtils: missing JWT_SECRET fails in production", () => {
  const result = runChild({ NODE_ENV: "production" });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /JWT_SECRET must be set in production/);
  assert.doesNotMatch(result.stderr, /test-jwt-secret/);
});

test("tokenUtils: missing JWT_SECRET fails in development", () => {
  const result = runChild({ NODE_ENV: "development" });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /JWT_SECRET must be set/);
});

test("tokenUtils: insecure JWT_SECRET fails outside test mode", () => {
  const result = runChild({ NODE_ENV: "production", JWT_SECRET: "secret" });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /JWT_SECRET must be at least 32 characters long|known insecure placeholder/);
});

test("tokenUtils: secure JWT_SECRET loads outside test mode", () => {
  const result = runChild({
    NODE_ENV: "production",
    JWT_SECRET: "abcdefghijklmnopqrstuvwxyz0123456789",
  });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /LOADED/);
});
