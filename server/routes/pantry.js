// server/routes/pantry.js
const express = require("express");
const pantryController = require("../controllers/pantryController");
const { requireAuth } = require("../middleware/authMiddleware");
const validate = require("../middleware/validateInput");

const router = express.Router();

router.use(requireAuth);

router.get("/", pantryController.listPantry);
router.post("/", validate.pantryItem, pantryController.addPantryItem);
router.put("/:id", pantryController.updatePantryItem);
router.delete("/:id", pantryController.deletePantryItem);

module.exports = router;
