// server/controllers/authController.js
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../config/db");
const UserModel = require("../models/user");
const { signToken } = require("../utils/tokenUtils");
const { sendResetEmail } = require("../utils/email");

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function setAuthCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.append(
    "Set-Cookie",
    `pantry_token=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${Math.floor(
      COOKIE_MAX_AGE / 1000
    )}; SameSite=Lax${secure}`
  );
}

// ✅ POST /api/auth/register
exports.registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "An account with that email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ name: String(name).trim(), email, passwordHash });
    if (!user || (!user.user_id && !user.id)) {
      // DB insert did not return a row (e.g. schema mismatch) — surface as
      // 500 with context server-side instead of crashing in signToken.
      throw new Error("User creation did not return a row — check `users` table shape.");
    }
    const token = signToken(user);

    setAuthCookie(res, token);
    res.status(201).json({ user: UserModel.toPublic(user), token });
  } catch (err) {
    // Log SQL context server-side (errorHandler hides it from the client).
    console.error("[register] failed:", err && err.code ? `${err.code}: ${err.sqlMessage || err.message}` : err);
    next(err);
  }
};

// ✅ POST /api/auth/login
exports.loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findByEmail(email);

    const valid = user && (await bcrypt.compare(password, user.password_hash));
    if (!valid) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }

    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ user: UserModel.toPublic(user), token });
  } catch (err) {
    next(err);
  }
};

// ✅ GET /api/auth/me  (optional identity probe for the frontend)
exports.getMe = async (req, res) => {
  const user = await UserModel.findById(req.user.id);
  res.json({ user: UserModel.toPublic(user) });
};

// ✅ POST /api/auth/forgot-password
// Uniform response whether or not the address exists (anti-enumeration).
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await UserModel.findByEmail(email);
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await db.query("UPDATE users SET reset_token = ?, reset_expires = ? WHERE user_id = ?", [
        token,
        expires,
        user.user_id,
      ]);
      await sendResetEmail(email, token);
    }
    // Same message either way — never reveal whether the address exists.
    res.json({ message: "If that account exists, a reset link was sent." });
  } catch (err) {
    next(err);
  }
};

// ✅ POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;
    const [rows] = await db.query(
      "SELECT user_id FROM users WHERE email = ? AND reset_token = ? AND reset_expires > NOW()",
      [email, token]
    );
    if (!rows[0]) {
      return res.status(400).json({ message: "Invalid or expired reset token." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      "UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE user_id = ?",
      [passwordHash, rows[0].user_id]
    );
    res.json({ message: "Password updated successfully." });
  } catch (err) {
    next(err);
  }
};
