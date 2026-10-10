// server/utils/recipeInstructions.js
// Task (a): the corpus stores 100% templated filler instructions, e.g.
//   "Prepare the X. Heat oil and cook the main ingredient thoroughly.
//    Add <dirty ingredient list>. Season, simmer or stir until tender…"
// This turns that into *usable, per-recipe* step-by-step instructions.
//
// It is pluggable:
//   - offline generator (default, deterministic, no network) builds steps from
//     the recipe's clean ingredients + quantities + tags + title.
//   - if OPENAI_API_KEY / LLM_API_KEY is set, `generateWithLlm()` can be called
//     to replace steps with richer text; callers fall back to the offline
//     result on any error, so the system works with or without a key.

const { cleanName, formatQty, joinList } = require("./ingredientName");

// Filler signatures produced by the synthetic corpus (used only to decide
// whether to replace the stored text; kept loose on purpose).
const FILLER_MARKERS = [
  "heat oil and cook the main ingredient",
  "season, simmer or stir until tender",
];

function isFiller(steps) {
  const text = (Array.isArray(steps) ? steps.join(" ") : String(steps || "")).toLowerCase();
  if (!text) return false;
  return FILLER_MARKERS.some((m) => text.includes(m));
}

// Cooking-verb hints keyed off common tags/title words so steps read sensibly.
function cookingStyle(title, tags) {
  const t = `${title || ""} ${(tags || []).join(" ")}`.toLowerCase();
  if (/stir[- ]?fry/.test(t)) return "stir-fry";
  if (/bake|roast|casserole|gratin/.test(t)) return "bake";
  if (/soup|stew|broth|chowder/.test(t)) return "simmer";
  if (/salad|bowl/.test(t)) return "toss";
  if (/wrap|sandwich|taco|roll/.test(t)) return "assemble";
  if (/curry/.test(t)) return "simmer";
  if (/grill|bbq|barbecue|skewer/.test(t)) return "grill";
  if (/pasta|noodle|rice/.test(t)) return "simmer";
  return "saute";
}

const STYLE_VERB = {
  "stir-fry": { base: "Heat oil in a wok or large pan over high heat.", done: "toss everything together for 2-3 minutes until just cooked through" },
  bake: { base: "Preheat the oven to 200°C (180°C fan / gas 6).", done: "transfer to the oven and bake until golden and cooked through" },
  simmer: { base: "Place a large pot over medium heat.", done: "cover and let it simmer gently until the ingredients are tender and the flavours meld" },
  toss: { base: "Bring a pot of salted water to the boil if using grains, then drain.", done: "add the dressing and toss everything together until evenly coated" },
  assemble: { base: "Lay out your wraps or bases on a clean surface.", done: "spoon the filling in, roll or fold, and cut on the diagonal" },
  grill: { base: "Preheat the grill or grill pan to medium-high.", done: "cook, turning occasionally, until charred on the outside and cooked through" },
  saute: { base: "Heat a splash of oil in a large pan over medium heat.", done: "cook, stirring now and then, until tender and fragrant" },
};

// Rough ingredient grouping so step order reads naturally.
const AROMATICS = /garlic|onion|ginger|chilli|chili|shallot|leek|spring onion|scallion/;
const LIQUID = /oil|stock|broth|water|milk|cream|coconut milk|sauce|soy|vinegar|juice/;

/**
 * Build deterministic, readable steps from a recipe's structured data.
 * @param {{title:string, ingredients:Array, tags?:string[]}} recipe
 * @returns {string[]} steps
 */
function buildOffline(recipe) {
  const ingredients = (recipe.ingredients || [])
    .map((i) => ({
      name: cleanName(i.name || i.originalText),
      amount: i.amount !== undefined ? i.amount : i.quantity,
      unit: i.unit,
    }))
    .filter((i) => i.name);

  if (!ingredients.length) {
    return [
      "Gather your ingredients and prepare them (wash, peel and chop as needed).",
      "Cook the main ingredients until tender and well seasoned.",
      "Taste, adjust the seasoning, and serve warm.",
    ];
  }

  const title = cleanName(recipe.title) || "the dish";
  const tags = recipe.tags || [];
  const style = cookingStyle(title, tags);
  const verb = STYLE_VERB[style];

  const aromatics = ingredients.filter((i) => AROMATICS.test(i.name));
  const mains = ingredients.filter((i) => !AROMATICS.test(i.name) && !LIQUID.test(i.name));
  const liquids = ingredients.filter((i) => LIQUID.test(i.name));
  const mainName = (mains[0] && mains[0].name) || (ingredients[0] && ingredients[0].name) || title;

  // Pair each quantity with its ingredient so the prep step is actually
  // readable ("54 g red lentils", not a bare "54 g").
  const qtyName = (i) => {
    const q = formatQty(i.amount, i.unit);
    return q ? `${q} ${i.name}` : i.name;
  };
  const prepList = joinList(ingredients.map(qtyName).filter(Boolean));

  const steps = [];
  steps.push(`Prepare and measure everything first: ${prepList || "the listed ingredients"}. Wash, peel and chop as needed.`);

  if (aromatics.length) {
    steps.push(`${verb.base} Add the ${joinList(aromatics.map((a) => a.name))} and cook for 1-2 minutes until fragrant.`);
  } else {
    steps.push(verb.base);
  }

  steps.push(`Add the ${mainName}${mains.length > 1 ? ` along with ${joinList(mains.slice(1).map((m) => m.name))}` : ""} and ${verb.done}.`);

  if (liquids.length) {
    steps.push(`Pour in ${joinList(liquids.map(qtyName).filter(Boolean))}, then taste and adjust the seasoning.`);
  } else {
    steps.push("Season generously with salt, pepper and your favourite spices, then taste and adjust.");
  }

  steps.push(`Serve the ${title} hot, garnished with fresh herbs or a squeeze of citrus if you like.`);
  return steps;
}

/**
 * Public entry — deterministic, synchronous, no network. Replaces the corpus
 * filler with per-recipe steps. If the stored instructions are NOT filler
 * (i.e. a recipe ever carries real steps), those are returned untouched.
 * @param {{title:string, ingredients:Array, tags?:string[], instructions?:any}} recipe
 * @returns {string[]}
 */
function generateInstructions(recipe) {
  if (recipe && !isFiller(recipe.instructions)) {
    const stored = Array.isArray(recipe.instructions)
      ? recipe.instructions
      : String(recipe.instructions || "").split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);
    if (stored.length) return stored.map(String);
  }
  return buildOffline(recipe || {});
}

// ---------------------------------------------------------------------------
// Optional LLM path. No key is configured in this project, so this is a
// drop-in for when one is provided (OPENAI_API_KEY / LLM_API_KEY + optional
// OPENAI_BASE_URL). It never blocks the sync path — callers await it only in
// an offline enrichment job and fall back to generateInstructions() on error.
// ---------------------------------------------------------------------------
const LLM_KEY = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || "";
const LLM_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const LLM_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function llmAvailable() {
  return Boolean(LLM_KEY);
}

async function generateWithLlm(recipe, { timeoutMs = 15000 } = {}) {
  if (!llmAvailable()) return null;
  const title = cleanName(recipe.title) || "the dish";
  const lines = (recipe.ingredients || [])
    .map((i) => {
      const name = cleanName(i.name || i.originalText);
      const qty = formatQty(i.amount !== undefined ? i.amount : i.quantity, i.unit);
      return qty ? `${qty} ${name}` : name;
    })
    .filter(Boolean);
  const tags = (recipe.tags || []).join(", ");

  const prompt = [
    `Write clear, numbered step-by-step cooking instructions for "${title}".`,
    tags ? `Tags: ${tags}.` : "",
    "Use these ingredients (with quantities):",
    ...lines.map((l) => `- ${l}`),
    "",
    "Return 5-8 concise steps as a JSON array of strings. No intro, no markdown.",
  ].filter(Boolean).join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${LLM_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_KEY}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message
      && data.choices[0].message.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length) return parsed.map((s) => String(s).trim()).filter(Boolean);
    return null;
  } catch (err) {
    return null; // caller falls back to generateInstructions()
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { generateInstructions, generateWithLlm, isFiller, llmAvailable };

