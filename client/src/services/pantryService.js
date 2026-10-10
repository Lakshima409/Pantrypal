import api from './api';

export async function fetchPantry() {
  return api.get('/api/pantry');
}

export async function addPantryItem(item) {
  return api.post('/api/pantry', item);
}

export async function updatePantryItem(id, updates) {
  return api.put(`/api/pantry/${id}`, updates);
}

export async function deletePantryItem(id) {
  return api.del(`/api/pantry/${id}`);
}

export default { fetchPantry, addPantryItem, updatePantryItem, deletePantryItem };

