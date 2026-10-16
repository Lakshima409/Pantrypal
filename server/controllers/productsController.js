// server/controllers/productsController.js — Authenticated product lookup.
// Phase 2 feature: barcode-assisted inventory.
// Never creates or modifies pantry records — lookup only.

const barcodeService = require("../services/barcodeService");

// ✅ GET /api/products/barcode/:barcode
// Returns normalized Open Food Facts product details for the review form.
exports.lookupBarcode = async (req, res, next) => {
  try {
    const barcode = req.params.barcode;

    if (!barcodeService.isValidBarcode(barcode)) {
      return res.status(400).json({
        message: "Invalid barcode. Please enter a numeric barcode (8-14 digits).",
        barcode,
      });
    }

    const result = await barcodeService.lookupProduct(barcode);

    if (result.error === "invalid_barcode") {
      return res.status(400).json({
        message: "Invalid barcode. Please enter a numeric barcode (8-14 digits).",
        barcode,
      });
    }

    if (result.error === "not_found") {
      return res.status(404).json({
        message: "Product not found in Open Food Facts.",
        barcode,
      });
    }

    if (result.error === "timeout") {
      return res.status(504).json({
        message: "The product lookup timed out. Please try again.",
        barcode,
      });
    }

    if (result.error === "upstream_error") {
      return res.status(502).json({
        message: "Unable to reach Open Food Facts. Please try again later.",
        barcode,
      });
    }

    return res.json(result.product);
  } catch (err) {
    next(err);
  }
};
