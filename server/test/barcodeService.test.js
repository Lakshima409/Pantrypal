// Unit tests for the barcode lookup service (mocks Open Food Facts).
// Run: npm test  (node --test)
const test = require("node:test");
const assert = require("node:assert");

// Use a short timeout so the timeout test stays fast.
process.env.BARCODE_TIMEOUT_MS = "200";
const barcodeService = require("../services/barcodeService");

// ---- isValidBarcode ----

test("isValidBarcode accepts valid EAN-13 barcode", () => {
  assert.strictEqual(barcodeService.isValidBarcode("3017624010701"), true);
});

test("isValidBarcode accepts valid UPC-A barcode", () => {
  assert.strictEqual(barcodeService.isValidBarcode("036000291452"), true);
});

test("isValidBarcode accepts valid EAN-8 barcode", () => {
  assert.strictEqual(barcodeService.isValidBarcode("12345670"), true);
});

test("isValidBarcode rejects non-numeric barcode", () => {
  assert.strictEqual(barcodeService.isValidBarcode("ABC123"), false);
});

test("isValidBarcode rejects too-short barcode", () => {
  assert.strictEqual(barcodeService.isValidBarcode("1234567"), false);
});

test("isValidBarcode rejects empty string", () => {
  assert.strictEqual(barcodeService.isValidBarcode(""), false);
});

test("isValidBarcode rejects non-string / non-number input", () => {
  assert.strictEqual(barcodeService.isValidBarcode(null), false);
  assert.strictEqual(barcodeService.isValidBarcode(undefined), false);
  assert.strictEqual(barcodeService.isValidBarcode({}), false);
});

// ---- lookupProduct with mocked fetch ----

function mockFetch(responseJson, status = 200) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => responseJson,
  });
  return () => {
    globalThis.fetch = originalFetch;
  };
}

test("lookupProduct returns normalized product for known barcode", async () => {
  const restore = mockFetch({
    status: 1,
    code: "3017624010701",
    product: {
      product_name: "Test Cereal",
      brands: "Test Brand",
      quantity: "500 g",
      ingredients_text: "whole grain wheat, sugar",
      nutriments: {
        "energy-kcal_100g": 380,
        "proteins_100g": 7,
        "carbohydrates_100g": 78,
        "fat_100g": 2.5,
      },
      image_front_url: "https://images.openfoodfacts.org/images/products/301/762/401/0701/front_en.jpg",
    },
  });
  try {
    const result = await barcodeService.lookupProduct("3017624010701");
    assert.strictEqual(result.found, true);
    assert.strictEqual(result.product.barcode, "3017624010701");
    assert.strictEqual(result.product.name, "Test Cereal");
    assert.strictEqual(result.product.brand, "Test Brand");
    assert.strictEqual(result.product.packageSize, "500 g");
    assert.strictEqual(result.product.ingredients, "whole grain wheat, sugar");
    assert.strictEqual(
      result.product.imageUrl,
      "https://images.openfoodfacts.org/images/products/301/762/401/0701/front_en.jpg"
    );
    assert.strictEqual(result.product.source, "open_food_facts");
    assert.strictEqual(result.product.nutritionPer100g.energyKcal, 380);
    assert.strictEqual(result.product.nutritionPer100g.proteinG, 7);
    assert.strictEqual(result.product.nutritionPer100g.carbohydratesG, 78);
    assert.strictEqual(result.product.nutritionPer100g.fatG, 2.5);
  } finally {
    restore();
  }
});

test("lookupProduct returns not_found for unknown product", async () => {
  const restore = mockFetch({
    status: 0,
    code: "0000000000000",
    status_verbose: "product not found",
  });
  try {
    const result = await barcodeService.lookupProduct("0000000000000");
    assert.strictEqual(result.found, false);
    assert.strictEqual(result.error, "not_found");
  } finally {
    restore();
  }
});

test("lookupProduct returns upstream_error on non-ok upstream response", async () => {
  const restore = mockFetch({ error: "internal server error" }, 500);
  try {
    const result = await barcodeService.lookupProduct("3017624010701");
    assert.strictEqual(result.found, false);
    assert.strictEqual(result.error, "upstream_error");
  } finally {
    restore();
  }
});

test("lookupProduct returns invalid_barcode for bad input without calling upstream", async () => {
  const restore = mockFetch({ status: 1, product: {} });
  try {
    const result = await barcodeService.lookupProduct("ABC");
    assert.strictEqual(result.found, false);
    assert.strictEqual(result.error, "invalid_barcode");
  } finally {
    restore();
  }
});

test("normalizeProduct preserves nulls for missing nutrients", () => {
  const norm = barcodeService.normalizeProduct(
    {
      product_name: "X",
      brands: null,
      quantity: null,
      ingredients_text: null,
      nutriments: {},
      image_front_url: null,
    },
    "1234567890123"
  );
  assert.strictEqual(norm.barcode, "1234567890123");
  assert.strictEqual(norm.name, "X");
  assert.strictEqual(norm.brand, null);
  assert.strictEqual(norm.packageSize, null);
  assert.strictEqual(norm.ingredients, null);
  assert.strictEqual(norm.imageUrl, null);
  assert.strictEqual(norm.source, "open_food_facts");
  assert.strictEqual(norm.nutritionPer100g.energyKcal, null);
  assert.strictEqual(norm.nutritionPer100g.proteinG, null);
  assert.strictEqual(norm.nutritionPer100g.carbohydratesG, null);
  assert.strictEqual(norm.nutritionPer100g.fatG, null);
});

test("normalizeProduct converts kJ energy to kcal when only kJ provided", () => {
  const norm = barcodeService.normalizeProduct(
    {
      product_name: "Y",
      brands: "B",
      quantity: null,
      ingredients_text: null,
      nutriments: { "energy_100g": 836, "proteins_100g": null },
      image_front_url: null,
    },
    "1234567890123"
  );
  // 836 kJ / 4.184 ≈ 199.8 kcal (rounded to 1 decimal)
  assert.strictEqual(norm.nutritionPer100g.energyKcal, 199.8);
});
