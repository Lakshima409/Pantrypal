// server/services/recipeGenerationService.js — LLM-based recipe generation.
// Phase 5 feature: "Recipe generation — LLM with structured output validation" (Medium).
//
// Calls a configured LLM endpoint to generate a recipe from pantry ingredients,
// then validates the structured output against a fixed schema. Falls back to
// a local heuristic recipe when no LLM is configured or validation fails.
// Never throws; returns { recipe, source, validated }.
//
// Output recipe shape: { title, description, servings, timeMinutes,
//   ingredients: [{ name, amount, unit }], instructions: string[],
//   tags: string[] }

const fetchFn = globalThis.fetch;

const REQUIRED_FIELDS = ["title", "ingredients", "instructions"];
const MAX_INGREDIENTS = 25;
const MAX_INSTRUCTIONS = 20;

function norm(s) {
  return String(s || "").trim();
}

function isValidIngredient(item) {
  return (
    item &&
    typeof item === "object" &&
    norm(item.name) &&
    item.name.length > 0 &&
    item.name.length <= 100
  );
}

function isValidInstruction(str) {
  return typeof str === "string" && norm(str).length > 0 && norm(str).length <= 1000;
}

function validateRecipe(raw) {
  if (!raw || typeof raw !== "object") return { valid: false, reason: "not an object" };

  for (const field of REQUIRED_FIELDS) {
    if (!(field in raw)) return { valid: false, reason: `missing field: ${field}` };
  }

  if (!norm(raw.title) || raw.title.length > 200)
    return { valid: false, reason: "invalid title" };

  if (!Array.isArray(raw.ingredients) || raw.ingredients.length === 0 || raw.ingredients.length > MAX_INGREDIENTS)
    return { valid: false, reason: "invalid ingredients array" };

  for (const ing of raw.ingredients) if (!isValidIngredient(ing))
    return { valid: false, reason: "invalid ingredient entry" };

  if (!Array.isArray(raw.instructions) || raw.instructions.length === 0 || raw.instructions.length > MAX_INSTRUCTIONS)
    return { valid: false, reason: "invalid instructions array" };

  for (const instr of raw.instructions) if (!isValidInstruction(instr))
    return { valid: false, reason: "invalid instruction" };

  const servings = Number(raw.servings);
  const timeMinutes = Number(raw.timeMinutes);
  if (raw.servings !== undefined && (!Number.isFinite(servings) || servings < 1 || servings > 50))
    return { valid: false, reason: "invalid servings" };
  if (raw.timeMinutes !== undefined && (!Number.isFinite(timeMinutes) || timeMinutes < 1 || timeMinutes > 480))
    return { valid: false, reason: "invalid timeMinutes" };

  return { valid: true };
}

function sanitizeRecipe(raw) {
  return {
    title: norm(raw.title),
    description: norm(raw.description) || "",
    servings: Number.isFinite(Number(raw.servings)) ? Math.max(1, Math.min(50, Math.floor(Number(raw.servings)))) : 4,
    timeMinutes: Number.isFinite(Number(raw.timeMinutes)) ? Math.max(1, Math.min(480, Math.floor(Number(raw.timeMinutes)))) : 30,
    ingredients: raw.ingredients.map((ing) => ({
      name: norm(ing.name),
      amount: ing.amount !== undefined ? String(ing.amount) : "",
      unit: norm(ing.unit) || "",
    })),
    instructions: raw.instructions.map((i) => norm(i)).filter(Boolean),
    tags: Array.isArray(raw.tags) ? raw.tags.map(norm).filter(Boolean).slice(0, 10) : [],
  };
}

/**
 * Generate a recipe from available ingredients using a configured LLM.
 * @param {string[]} ingredients - ingredient names
 * @param {object} opts - { endpoint, apiKey, model, dietary, servings }
 * @returns {Promise<{recipe, source, validated}>}
 */
async function generateRecipe(ingredients, opts = {}) {
  const { endpoint, apiKey, model, dietary, servings } = opts;

  if (endpoint && apiKey && fetchFn) {
    try {
      const raw = await callLlm(endpoint, apiKey, model, ingredients, { dietary, servings });
      const validation = validateRecipe(raw);
      if (validation.valid) {
        return { recipe: sanitizeRecipe(raw), source: "llm", validated: true };
      }
      console.warn(`[recipeGen] LLM output failed validation: ${validation.reason}`);
    } catch (err) {
      console.warn(`[recipeGen] LLM call failed:`, err.message);
    }
  }

  // Local fallback: heuristic recipe from ingredients.
  return {
    recipe: heuristicRecipe(ingredients, { dietary, servings }),
    source: "local-fallback",
    validated: true,
  };
}

async function callLlm(endpoint, apiKey, model, ingredients, ctx) {
  const prompt = buildPrompt(ingredients, ctx);
  const body = {
    model: model || "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a recipe generator. Respond with JSON only." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  };

  const res = await fetchFn(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`LLM returned ${res.status}`);
  const data = await res.json();

  const text =
    data.choices?.[0]?.message?.content ||
    data.content ||
    data.text ||
    "";

  try {
    return JSON.parse(text);
  } catch (err) {
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match) return JSON.parse(match[1]);
    throw new Error(`LLM did not return valid JSON: ${err.message}`);
  }
}

function buildPrompt(ingredients, ctx) {
  const ingList = ingredients.map((i) => `- ${i}`).join("\n") || "- (none specified)";
  return `Generate a recipe using these ingredients:
${ingList}

Dietary preferences: ${ctx.dietary || "none"}
Servings: ${ctx.servings || 4}

Return ONLY a JSON object with these fields:
- title (string)
- description (string)
- servings (number)
- timeMinutes (number)
- ingredients: array of { name, amount, unit }
- instructions: array of strings
- tags: array of strings`;
}

function heuristicRecipe(ingredients, ctx) {
  const ing = ingredients.filter(Boolean).slice(0, 10);
  const title = ing.length ? `Simple ${norm(ing[0])} Recipe` : "Simple Pantry Recipe";
  return {
    title,
    description: `A quick recipe made with ${ing.join(", ") || "pantry ingredients"}.`,
    servings: ctx.servings || 4,
    timeMinutes: 30,
    ingredients: ing.map((name) => ({ name, amount: "1", unit: "serving" })),
    instructions: [
      `Gather your ingredients: ${ing.join(", ")}.`,
      "Prepare and cook according to your preference.",
      "Season to taste and serve warm.",
    ],
    tags: ["quick", "pantry"],
  };
}

module.exports = { generateRecipe, validateRecipe, sanitizeRecipe, heuristicRecipe, buildPrompt };
