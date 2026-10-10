const PROFILE_KEYWORDS = {
  spicy: ['chili', 'spicy', 'jalapeno', 'cayenne', 'curry', 'salsa'],
  sweet: ['honey', 'sugar', 'maple', 'chocolate', 'caramel', 'sweet'],
  savory: ['garlic', 'onion', 'cheese', 'mushroom', 'soy', 'herb'],
};

export function matchFlavorProfile(recipe = {}, preferences = []) {
  if (!Array.isArray(preferences) || preferences.length === 0) return 0;
  const haystack = `${recipe.title || ''} ${recipe.description || ''} ${(recipe.tags || []).join(' ')}`.toLowerCase();
  let score = 0;
  preferences.forEach((preference) => {
    const keywords = PROFILE_KEYWORDS[String(preference).toLowerCase()] || [String(preference).toLowerCase()];
    if (keywords.some((keyword) => keyword && haystack.includes(keyword))) score += 1;
  });
  return Math.round((score / preferences.length) * 100);
}

export default matchFlavorProfile;

