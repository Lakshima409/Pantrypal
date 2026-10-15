// server/routes/shoppinglist.js
const express = require("express");
const shoppingListController = require("../controllers/shoppingListController");
const { requireAuth } = require("../middleware/authMiddleware");
const vx = require("../middleware/validateExtended");

const router = express.Router();

router.use(requireAuth);

router.get("/", shoppingListController.getShoppingList);
router.post("/generate", shoppingListController.generateShoppingList);
router.post("/", vx.shoppingAdd, shoppingListController.addItems);
router.patch("/:itemId", vx.idParam("itemId"), vx.shoppingUpdate, shoppingListController.updateItem);
router.delete("/:itemId", vx.idParam("itemId"), shoppingListController.deleteItem);

module.exports = router;
