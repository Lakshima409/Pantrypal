// server/controllers/pantryController.js
const PantryItem = require("../models/PantryItem");

// Accepts `"2 cups"` / `"500g"` / `2` and splits it into quantity + unit.
function parseQuantity(raw, fallbackUnit = "") {
  if (raw === undefined || raw === null || raw === "") {
    return { quantity: 0, unit: fallbackUnit };
  }
  if (typeof raw === "number") return { quantity: raw, unit: fallbackUnit };
  const match = String(raw).trim().match(/^(-?[\d.,]+)\s*(.*)$/);
  if (!match) return { quantity: 0, unit: String(raw).trim() || fallbackUnit };
  const quantity = Number(match[1].replace(",", "."));
  return {
    quantity: Number.isFinite(quantity) ? quantity : 0,
    unit: (match[2] || fallbackUnit).trim(),
  };
}

// ✅ GET /api/pantry
exports.listPantry = async (req, res, next) => {
  try {
    res.json(await PantryItem.listByUser(req.user.id));
  } catch (err) {
    next(err);
  }
};

// ✅ POST /api/pantry  { name, quantity, category, expiryDate }
exports.addPantryItem = async (req, res, next) => {
  try {
    const { name, category, expiryDate } = req.body;
    const { quantity, unit } = parseQuantity(req.body.quantity, req.body.unit || "");
    const item = await PantryItem.create(req.user.id, {
      name,
      quantity,
      unit,
      category: category || "other",
      expiryDate,
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

// ✅ PUT /api/pantry/:id
exports.updatePantryItem = async (req, res, next) => {
  try {
    const patch = { ...req.body };
    if (patch.quantity !== undefined && typeof patch.quantity === "string") {
      const parsed = parseQuantity(patch.quantity, patch.unit || "");
      patch.quantity = parsed.quantity;
      patch.unit = parsed.unit;
    }
    const item = await PantryItem.update(req.params.id, req.user.id, patch);
    if (!item) return res.status(404).json({ message: "Pantry item not found." });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

// ✅ DELETE /api/pantry/:id
exports.deletePantryItem = async (req, res, next) => {
  try {
    const removed = await PantryItem.remove(req.params.id, req.user.id);
    if (!removed) return res.status(404).json({ message: "Pantry item not found." });
    res.json({ message: "Pantry item removed." });
  } catch (err) {
    next(err);
  }
};
