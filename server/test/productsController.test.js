// Unit tests for productsController (mocks the barcode service).
// Run: npm test  (node --test)
const test = require("node:test");
const assert = require("node:assert");

const productsController = require("../controllers/productsController");

// ---- helpers ----

function makeRes() {
  const res = {
    statusCode: 200, // Express defaults to 200 on res.json()
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      if (this.statusCode === null) this.statusCode = 200;
      this.body = body;
      return this;
    },
  };
  return res;
}

function nextCalled() {
  let called = false;
  const next = () => {
    called = true;
  };
  return { next, get called() {
    return called;
  } };
}

// ---- lookupBarcode ----

test("lookupBarcode returns 400 for invalid barcode without calling service", async () => {
  const res = makeRes();
  const { next, called } = nextCalled();
  await productsController.lookupBarcode(
    { params: { barcode: "ABC" } },
    res,
    next
  );
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.message, "Invalid barcode. Please enter a numeric barcode (8-14 digits).");
  assert.strictEqual(called, false);
});

test("lookupBarcode returns normalized product on success", async () => {
  const res = makeRes();
  const { next, called } = nextCalled();

  // Temporarily replace the service call.
  const original = productsController.constructor ? null : null;
  const origLookup = require("../services/barcodeService").lookupProduct;
  require("../services/barcodeService").lookupProduct = async () => ({
    found: true,
    product: {
      barcode: "3017624010701",
      name: "Test Cereal",
      brand: "Test Brand",
      packageSize: "500 g",
      ingredients: "whole grain wheat, sugar",
      imageUrl: null,
      nutritionPer100g: { energyKcal: 380, proteinG: 7, carbohydratesG: 78, fatG: 2.5 },
      source: "open_food_facts",
    },
  });

  try {
    await productsController.lookupBarcode(
      { params: { barcode: "3017624010701" } },
      res,
      next
    );
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.name, "Test Cereal");
    assert.strictEqual(res.body.source, "open_food_facts");
    assert.strictEqual(called, false);
  } finally {
    require("../services/barcodeService").lookupProduct = origLookup;
  }
});

test("lookupBarcode returns 404 when product not found", async () => {
  const res = makeRes();
  const { next, called } = nextCalled();

  const origLookup = require("../services/barcodeService").lookupProduct;
  require("../services/barcodeService").lookupProduct = async () => ({
    found: false,
    error: "not_found",
  });

  try {
    await productsController.lookupBarcode(
      { params: { barcode: "0000000000000" } },
      res,
      next
    );
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.message, "Product not found in Open Food Facts.");
    assert.strictEqual(called, false);
  } finally {
    require("../services/barcodeService").lookupProduct = origLookup;
  }
});

test("lookupBarcode returns 504 on timeout", async () => {
  const res = makeRes();
  const { next, called } = nextCalled();

  const origLookup = require("../services/barcodeService").lookupProduct;
  require("../services/barcodeService").lookupProduct = async () => ({
    found: false,
    error: "timeout",
  });

  try {
    await productsController.lookupBarcode(
      { params: { barcode: "3017624010701" } },
      res,
      next
    );
    assert.strictEqual(res.statusCode, 504);
    assert.strictEqual(res.body.message, "The product lookup timed out. Please try again.");
    assert.strictEqual(called, false);
  } finally {
    require("../services/barcodeService").lookupProduct = origLookup;
  }
});

test("lookupBarcode returns 502 on upstream error", async () => {
  const res = makeRes();
  const { next, called } = nextCalled();

  const origLookup = require("../services/barcodeService").lookupProduct;
  require("../services/barcodeService").lookupProduct = async () => ({
    found: false,
    error: "upstream_error",
  });

  try {
    await productsController.lookupBarcode(
      { params: { barcode: "3017624010701" } },
      res,
      next
    );
    assert.strictEqual(res.statusCode, 502);
    assert.strictEqual(res.body.message, "Unable to reach Open Food Facts. Please try again later.");
    assert.strictEqual(called, false);
  } finally {
    require("../services/barcodeService").lookupProduct = origLookup;
  }
});
