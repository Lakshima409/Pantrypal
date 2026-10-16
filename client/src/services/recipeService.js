import api from './api';

export async function searchRecipes(params = {}) {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length) queryParams.append(key, value.join(','));
    else if (value !== undefined && value !== null && value !== '') queryParams.append(key, value);
  });
  return api.get(`/api/recipes/search?${queryParams.toString()}`);
}

export async function fetchRecommended() {
  return api.get('/recipes/recommended');
}

export async function fetchTrending() {
  return api.get('/recipes/trending');
}

export async function fetchRecipeById(id) {
  return api.get(`/api/recipes/${id}`);
}

export async function fetchSubstitutions(ingredients = []) {
  return api.post('/recipes/substitutions', { ingredients });
}

export default {
  searchRecipes,
  fetchRecommended,
  fetchTrending,
  fetchRecipeById,
  fetchSubstitutions,
};

