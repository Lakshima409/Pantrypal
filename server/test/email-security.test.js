const test = require("node:test");
const assert = require("node:assert");

const {
  sendResetEmail,
  getFrontendBaseUrl,
  buildResetUrl,
} = require("../utils/email");

test("email: FRONTEND_URL controls reset URL origin", () => {
  const oldFrontend = process.env.FRONTEND_URL;
  const oldClient = process.env.CLIENT_ORIGIN;
  try {
    process.env.FRONTEND_URL = "https://app.example.com/base/path?x=1";
    delete process.env.CLIENT_ORIGIN;
    assert.strictEqual(getFrontendBaseUrl(), "https://app.example.com");
    const url = buildResetUrl("user@example.com", "abc123");
    assert.strictEqual(
      url,
      "https://app.example.com/reset-password?email=user%40example.com&token=abc123"
    );
  } finally {
    if (oldFrontend === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = oldFrontend;
    if (oldClient === undefined) delete process.env.CLIENT_ORIGIN;
    else process.env.CLIENT_ORIGIN = oldClient;
  }
});

test("email: unsafe or invalid FRONTEND_URL is rejected", () => {
  const oldFrontend = process.env.FRONTEND_URL;
  const oldClient = process.env.CLIENT_ORIGIN;
  try {
    for (const value of ["javascript:alert(1)", "data:text/html,x", "not a url", "ftp://example.com"]) {
      process.env.FRONTEND_URL = value;
      delete process.env.CLIENT_ORIGIN;
      assert.throws(() => getFrontendBaseUrl());
    }
  } finally {
    if (oldFrontend === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = oldFrontend;
    if (oldClient === undefined) delete process.env.CLIENT_ORIGIN;
    else process.env.CLIENT_ORIGIN = oldClient;
  }
});

test("email: missing SMTP config fails safely without exposing token", async () => {
  const oldFrontend = process.env.FRONTEND_URL;
  const oldUser = process.env.EMAIL_USER;
  const oldPass = process.env.EMAIL_PASS;
  const logs = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args) => logs.push(args.join(" "));
  console.warn = () => {};
  try {
    process.env.FRONTEND_URL = "http://localhost:5173";
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    const token = "super-secret-reset-token";
    const result = await sendResetEmail("user@example.com", token);
    assert.deepStrictEqual(result, { sent: false });
    assert.strictEqual(Object.prototype.hasOwnProperty.call(result, "resetUrl"), false);
    const output = logs.join("\n");
    assert.ok(!output.includes(token));
    assert.ok(!output.includes("reset-password"));
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    if (oldFrontend === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = oldFrontend;
    if (oldUser === undefined) delete process.env.EMAIL_USER;
    else process.env.EMAIL_USER = oldUser;
    if (oldPass === undefined) delete process.env.EMAIL_PASS;
    else process.env.EMAIL_PASS = oldPass;
  }
});

test("email: production does not log reset request details", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldFrontend = process.env.FRONTEND_URL;
  const oldUser = process.env.EMAIL_USER;
  const oldPass = process.env.EMAIL_PASS;
  const logs = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args) => logs.push(args.join(" "));
  console.warn = () => {};
  try {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "http://localhost:5173";
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    const token = "production-secret-token";
    const result = await sendResetEmail("user@example.com", token);
    assert.deepStrictEqual(result, { sent: false });
    assert.strictEqual(logs.length, 0);
    assert.ok(!JSON.stringify(result).includes(token));
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldNodeEnv;
    if (oldFrontend === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = oldFrontend;
    if (oldUser === undefined) delete process.env.EMAIL_USER;
    else process.env.EMAIL_USER = oldUser;
    if (oldPass === undefined) delete process.env.EMAIL_PASS;
    else process.env.EMAIL_PASS = oldPass;
  }
});
