// server/routes/products.js — Authenticated product lookup routes.
// Phase 2 feature: barcode-assisted inventory.
const express = require("express");
const productsController = require("../controllers/productsController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// All product routes require the same authentication as pantry operations.
router.use(requireAuth);

router.get("/barcode/:barcode", productsController.lookupBarcode);

module.exports = router;
