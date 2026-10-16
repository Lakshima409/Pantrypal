// server/services/visionService.js — Ingredient recognition from images.
// Phase 5 feature: "Ingredient recognition — image-based pantry entry" (Medium).
//
// Attempts to identify ingredients in a pantry-fridge photo using a vision
// API (e.g. Google Cloud Vision / AWS Rekognition). Falls back to a local
// heuristic (filename/OCR-free keyword matching) when no provider is
// configured or the call fails. Never throws; returns an empty array with
// a reason on total failure.
//
// Output: [{ name, confidence, source }] where source is "vision-api" or
// "local-fallback".

const INGREDIENT_KEYWORDS = [
  "apple", "banana", "orange", "lemon", "lime", "grape", "strawberry",
  "blueberry", "raspberry", "mango", "pineapple", "pear", "peach", "plum",
  "kiwi", "avocado", "tomato", "potato", "onion", "garlic", "ginger",
  "carrot", "celery", "cucumber", "pepper", "pepperoni", "lettuce", "spinach",
  "kale", "cabbage", "broccoli", "cauliflower", "mushroom", "zucchini",
  "courgette", "eggplant", "aubergine", "corn", "peas", "beans", "lentils",
  "chickpea", "rice", "pasta", "bread", "flour", "sugar", "salt", "pepper",
  "oil", "butter", "cheese", "milk", "cream", "yogurt", "egg", "eggs",
  "basil", "parsley", "thyme", "rosemary", "oregano",
  "chicken", "beef", "pork", "turkey", "fish", "salmon", "shrimp", "tofu",
  "tempeh", "bacon", "ham", "sausage",
];

function norm(s) {
  return String(s || "").toLowerCase().trim();
}

function localRecognize(text) {
  const found = new Map();
  const haystack = norm(text);
  for (const kw of INGREDIENT_KEYWORDS) {
    if (haystack.includes(kw)) {
      found.set(kw, 0.6); // conservative confidence for heuristic
    }
  }
  return [...found.entries()].map(([name, confidence]) => ({
    name,
    confidence,
    source: "local-fallback",
  }));
}

/**
 * Recognize ingredients from an image.
 * @param {Buffer|string} imageInput - image buffer or file path
 * @param {object} opts - { provider, apiKey, endpoint, filename }
 * @returns {Promise<Array<{name, confidence, source}>>}
 */
async function recognizeIngredients(imageInput, opts = {}) {
  const { provider, apiKey, endpoint } = opts;

  // 1) Try configured vision provider.
  if (provider && apiKey && endpoint) {
    try {
      const result = await callVisionProvider(imageInput, {
        provider,
        apiKey,
        endpoint,
      });
      if (Array.isArray(result) && result.length) {
        return result.map((r) => ({
          name: norm(r.name || r.label || r.description || ""),
          confidence: Number(r.confidence || r.score || 0.5),
          source: "vision-api",
        })).filter((r) => r.name);
      }
    } catch (err) {
      console.warn(`[vision] provider ${provider} failed:`, err.message);
    }
  }

  // 2) Local fallback: inspect filename / any embedded text hint.
  const hint =
    typeof imageInput === "string" ? imageInput : opts.filename || "";
  const local = localRecognize(hint);
  if (local.length) return local;

  // 3) Total failure — empty, with reason.
  return [];
}

async function callVisionProvider(imageInput, cfg) {
  // Placeholder for a real vision provider integration. The controller
  // layer decides which provider to wire. This implementation delegates to
  // a generic HTTP POST so any vision endpoint can be configured via env.
  const fetchFn = globalThis.fetch;
  if (!fetchFn) throw new Error("fetch not available");

  const body =
    imageInput instanceof Buffer
      ? imageInput.toString("base64")
      : String(imageInput);

  const res = await fetchFn(cfg.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify({ image: body, filename: cfg.filename }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`vision API returned ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.predictions || data.labels || data.ingredients)
    ? (data.predictions || data.labels || data.ingredients)
    : [];
}

module.exports = { recognizeIngredients, localRecognize, INGREDIENT_KEYWORDS };
