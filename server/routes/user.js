// server/routes/user.js
const express = require("express");
const userController = require("../controllers/userController");
const { requireAuth } = require("../middleware/authMiddleware");
const validate = require("../middleware/validateInput");
const vx = require("../middleware/validateExtended");

const router = express.Router();

router.use(requireAuth);

router.get("/profile", userController.getProfile);
router.put("/profile", validate.profileUpdate, vx.profileFull, userController.updateProfile);
router.get("/preferences", userController.getPreferences);
router.put("/preferences", vx.preferencesUpdate, userController.savePreferences);

module.exports = router;
