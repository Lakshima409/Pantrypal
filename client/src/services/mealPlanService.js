import api from './api';

export async function fetchMealPlan(week = 0) {
  return api.get(`/api/mealplan?week=${week}`);
}

export async function addMealToPlan(recipeId, day) {
  return api.post('/mealplan', { recipeId, day });
}

export async function removeMealFromPlan(mealId) {
  return api.del(`/api/mealplan/${mealId}`);
}

export async function generateMealPlan(payload = {}) {
  return api.post('/mealplan/generate', payload);
}

export default { fetchMealPlan, addMealToPlan, removeMealFromPlan, generateMealPlan };

