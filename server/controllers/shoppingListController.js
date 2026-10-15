// server/controllers/shoppingListController.js
const ShoppingList = require("../models/ShoppingList");
const MealPlan = require("../models/MealPlan");

// ✅ GET /api/shoppinglist
exports.getShoppingList = async (req, res, next) => {
  try {
    res.json(await ShoppingList.listItems(req.user.id));
  } catch (err) {
    next(err);
  }
};

// ✅ POST /api/shoppinglist  { name } | { items: [{ name, amount, unit }] }
exports.addItems = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (Array.isArray(body.items)) {
      const created = await ShoppingList.addItems(
        req.user.id,
        body.items.map((item) => ({
          name: item.name,
          quantity: item.amount !== undefined ? item.amount : item.quantity,
          unit: item.unit || "",
        }))
      );
      return res.status(201).json({ shoppingList: created });
    }
    if (!body.name || !String(body.name).trim()) {
      return res.status(400).json({ message: "Item name is required." });
    }
    const item = await ShoppingList.addItem(req.user.id, {
      name: body.name,
      quantity: body.amount !== undefined ? body.amount : body.quantity,
      unit: body.unit || "",
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

// ✅ PATCH /api/shoppinglist/:itemId  { completed, ... }
exports.updateItem = async (req, res, next) => {
  try {
    // Strict completed parsing — the string "false" must stay false.
    let completed;
    const raw = req.body && req.body.completed;
    if (raw === undefined) {
      completed = false;
    } else if (typeof raw === "boolean") {
      completed = raw;
    } else if (raw === 1 || raw === 0) {
      completed = raw === 1;
    } else if (typeof raw === "string" && raw.toLowerCase() === "true") {
      completed = true;
    } else if (typeof raw === "string" && raw.toLowerCase() === "false") {
      completed = false;
    } else {
      return res.status(400).json({ message: "completed must be a boolean." });
    }
    const patch = {};
    if (req.body && req.body.name !== undefined) patch.name = req.body.name;
    const qty = req.body && (req.body.amount !== undefined ? req.body.amount : req.body.quantity);
    if (qty !== undefined) patch.quantity = qty;
    if (req.body && req.body.unit !== undefined) patch.unit = req.body.unit;
    const item = await ShoppingList.setCompleted(
      req.params.itemId,
      req.user.id,
      completed,
      patch
    );
    if (!item) return res.status(404).json({ message: "Item not found." });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

// ✅ DELETE /api/shoppinglist/:itemId
exports.deleteItem = async (req, res, next) => {
  try {
    const removed = await ShoppingList.removeItem(req.params.itemId, req.user.id);
    if (!removed) return res.status(404).json({ message: "Item not found." });
    res.json({ message: "Item removed." });
  } catch (err) {
    next(err);
  }
};

// ✅ POST /api/shoppinglist/generate  { mealPlan }
// Collects every ingredient used by the planned meals into the list.
exports.generateShoppingList = async (req, res, next) => {
  try {
    const mealPlan = (req.body && req.body.mealPlan) || (await MealPlan.getWeek(req.user.id, 0));
    const recipeIds = Object.values(mealPlan)
      .flat()
      .map((meal) => meal.recipeId || meal.recipe_id || meal.id)
      .filter(Boolean);

    const shoppingList = await ShoppingList.replaceFromRecipes(req.user.id, recipeIds);
    res.json({ shoppingList, message: "Shopping list generated from your meal plan." });
  } catch (err) {
    next(err);
  }
};