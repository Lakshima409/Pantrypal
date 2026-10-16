import api from './api';

export async function fetchPantry() {
  return api.get('/pantry');
}

export async function addPantryItem(item) {
  return api.post('/pantry', item);
}

export async function updatePantryItem(id, updates) {
  return api.put(`/pantry/${id}`, updates);
}

export async function deletePantryItem(id) {
  return api.del(`/pantry/${id}`);
}

export default { fetchPantry, addPantryItem, updatePantryItem, deletePantryItem };

