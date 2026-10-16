// server/services/barcodeService.js — Barcode product lookup via Open Food Facts v3.
// Phase 2 feature: smart pantry entry — barcode-assisted inventory.
// Calls Open Food Facts product lookup, normalizes the result into a
// PantryPal-friendly shape, and never writes to the database.

const OPENFOODFACTS_BASE = "https://world.openfoodfacts.org/api/v3/product";
const REQUEST_TIMEOUT_MS = Number(process.env.BARCODE_TIMEOUT_MS) || 8000;

// Numeric barcodes only: EAN-8 (8), UPC-A (12), EAN-13 (13), ITF-14 (14).
const MIN_BARCODE_LENGTH = 8;
const MAX_BARCODE_LENGTH = 14;

// Identifying User-Agent requested by Open Food Facts.
// Replace the contact URL with your own project contact if you have one.
const USER_AGENT = "PantryPal/1.0 (https://github.com/Lakshima409/PantryPal)";

function isValidBarcode(barcode) {
  if (typeof barcode !== "string" && typeof barcode !== "number") return false;
  const s = String(barcode).trim();
  return /^\d{8,14}$/.test(s);
}

function asNumberOrNull(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Look up a product by barcode from Open Food Facts.
 * @param {string} barcode - validated barcode
 * @returns {Promise<{found: boolean, product?: object, error?: string, status?: number}>}
 */
async function lookupProduct(barcode) {
  if (!isValidBarcode(barcode)) {
    return { found: false, error: "invalid_barcode" };
  }

  const code = String(barcode).trim();
  const url = `${OPENFOODFACTS_BASE}/${code}?fields=code,product_name,brands,quantity,ingredients_text,nutriments,image_front_url`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      // Upstream HTTP error (5xx, 429, etc.) — never leak internals.
      return { found: false, error: "upstream_error", status: res.status };
    }

    const data = await res.json();

    // Open Food Facts v3: status 1 = found, status 0 = not found.
    if (data.status === 0 || !data.product) {
      return { found: false, error: "not_found" };
    }

    return { found: true, product: normalizeProduct(data.product, code) };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      return { found: false, error: "timeout" };
    }
    // Network failure, DNS error, malformed JSON, etc.
    return { found: false, error: "upstream_error" };
  }
}

/**
 * Normalize an Open Food Facts product into the PantryPal review shape.
 * Missing values are preserved as null (never treated as zero).
 */
function normalizeProduct(product, code) {
  const nutriments = product.nutriments || {};

  // Open Food Facts nutrient keys are per 100g by default.
  const energyKcalRaw =
    nutriments["energy-kcal_100g"] !== undefined
      ? nutriments["energy-kcal_100g"]
      : nutriments["energy_100g"] !== undefined
        ? nutriments["energy_100g"] / 4.184 // kJ -> kcal fallback
        : null;

  // Round energy to 1 decimal place (kcal from kJ can be imprecise).
  const energyKcal = asNumberOrNull(energyKcalRaw);

  return {
    barcode: code,
    name: product.product_name || null,
    brand: product.brands || null,
    packageSize: product.quantity || null,
    ingredients: product.ingredients_text || null,
    imageUrl: product.image_front_url || null,
    nutritionPer100g: {
      energyKcal: energyKcal !== null ? Math.round(energyKcal * 10) / 10 : null,
      proteinG: asNumberOrNull(nutriments["proteins_100g"]),
      carbohydratesG: asNumberOrNull(nutriments["carbohydrates_100g"]),
      fatG: asNumberOrNull(nutriments["fat_100g"]),
    },
    source: "open_food_facts",
  };
}

module.exports = { lookupProduct, isValidBarcode, normalizeProduct };
