// server/routes/shoppinglist.js
const express = require("express");
const shoppingListController = require("../controllers/shoppingListController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", shoppingListController.getShoppingList);
router.post("/generate", shoppingListController.generateShoppingList);
router.post("/", shoppingListController.addItems);
router.patch("/:itemId", shoppingListController.updateItem);
router.delete("/:itemId", shoppingListController.deleteItem);

module.exports = router;
