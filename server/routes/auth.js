// server/routes/auth.js
const express = require("express");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");
const validate = require("../middleware/validateInput");

const router = express.Router();

router.post("/register", validate.register, authController.registerUser);
router.post("/login", validate.login, authController.loginUser);
router.get("/me", requireAuth, authController.getMe);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", validate.resetPassword, authController.resetPassword);

module.exports = router;
