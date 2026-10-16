// server/routes/auth.js
const express = require("express");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");
const validate = require("../middleware/validateInput");
const vx = require("../middleware/validateExtended");
const { rateLimit } = require("../middleware/security");

const router = express.Router();

// Brute-force protection on credential endpoints (stricter than the global cap).
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60,
  message: "Too many sign-in attempts. Please wait 15 minutes and try again." });

router.post("/register", authLimiter, validate.register, authController.registerUser);
router.post("/login", authLimiter, validate.login, authController.loginUser);
router.get("/me", requireAuth, authController.getMe);
router.post("/forgot-password", authLimiter, vx.forgotPassword, authController.forgotPassword);
router.post("/reset-password", authLimiter, validate.resetPassword, authController.resetPassword);

module.exports = router;
