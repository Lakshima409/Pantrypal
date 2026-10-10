// server/utils/recipeFilters.js
// Pure helpers that apply NLP-parsed search filters (§37) to detailed recipe
// objects. Dependency-free and DB-free, so they are fully unit-tested.
// Detailed recipe shape (from Recipe.attachDetails / mock API):
//   { title, ingredients:[{name}], nutrition:{calories}|null, cookTime, tags[] }

// Explicit query params win over NLP-derived ones.
function mergeSearch(nlp, explicit) {
  const parsed = nlp || {};
  const exp = explicit || {};
  const list = (v) => (Array.isArray(v) ? v : v === undefined || v === null || v === '' ? [] : [v]).map(String);
  const first = (v) => {
    const l = list(v);
    return l.length ? l[0] : '';
  };
  return {
    query: first(exp.query) || parsed.query || '',
    dietary: list(exp.dietary).length ? list(exp.dietary) : parsed.dietary || [],
    ingredients: list(exp.ingredients).length ? list(exp.ingredients) : parsed.ingredients || [],
    exclude: [...new Set([...list(exp.exclude), ...(parsed.exclude || [])])],
    maxCalories: exp.maxCalories !== undefined && exp.maxCalories !== '' && exp.maxCalories !== null
      ? Number(exp.maxCalories) : (parsed.maxCalories === undefined ? null : parsed.maxCalories),
    maxTime: exp.maxTime !== undefined && exp.maxTime !== '' && exp.maxTime !== null
      ? Number(exp.maxTime) : (parsed.maxTime === undefined ? null : parsed.maxTime),
  };
}

function recipeText(r) {
  return `${r.title || ''} ${(r.ingredients || []).map((i) => i.name || '').join(' ')}`.toLowerCase();
}

// Remove recipes whose title/ingredients mention an excluded term (word-boundary).
function applyExclude(results, exclude) {
  const terms = (exclude || []).map((t) => String(t).toLowerCase().trim()).filter(Boolean);
  if (!terms.length) return results;
  return (results || []).filter((r) => {
    const text = recipeText(r);
    return !terms.some((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text));
  });
}

// Keep recipes whose calories <= max (skip recipes with unknown nutrition).
function applyMaxCalories(results, max) {
  if (max === null || max === undefined || max === '') return results;
  const cap = Number(max);
  if (!Number.isFinite(cap)) return results;
  return (results || []).filter((r) => {
    if (!r.nutrition || r.nutrition.calories === null || r.nutrition.calories === undefined) return true;
    return Number(r.nutrition.calories) <= cap;
  });
}

function applyParsedFilters(results, filters) {
  let out = results || [];
  out = applyExclude(out, filters && filters.exclude);
  out = applyMaxCalories(out, filters && filters.maxCalories);
  return out;
}

module.exports = { mergeSearch, applyExclude, applyMaxCalories, applyParsedFilters };
