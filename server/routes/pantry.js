// server/routes/pantry.js
const express = require("express");
const pantryController = require("../controllers/pantryController");
const { requireAuth } = require("../middleware/authMiddleware");
const validate = require("../middleware/validateInput");
const vx = require("../middleware/validateExtended");

const router = express.Router();

router.use(requireAuth);

router.get("/", pantryController.listPantry);
router.post("/", validate.pantryItem, pantryController.addPantryItem);
// Only the four real verbs exist — anything else (e.g. GET /:id) is a 400,
// not a 404 leak, so scanners can't probe for hidden sub-resources.
router.get("/:id", vx.idParam("id"), (req, res) =>
  res.status(400).json({ message: "Use GET /api/pantry to list items." })
);
router.put("/:id", vx.idParam("id"), vx.pantryUpdate, pantryController.updatePantryItem);
router.delete("/:id", vx.idParam("id"), pantryController.deletePantryItem);

module.exports = router;
