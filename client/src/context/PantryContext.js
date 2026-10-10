// Pantry context — restored implementation (the backup copy of this file was empty).
// Module-level store shared by every consumer (Pantry page, RecipeDetails, ...),
// so no <PantryProvider> wrapper is required. All data lives on the dev API.
import { useEffect, useState } from 'react';

let pantryItems = [];
let loading = false;
let error = '';
let fetchStarted = false;

const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

async function fetchPantryItems() {
  loading = true;
  error = '';
  notify();
  try {
    const response = await fetch('/api/pantry');
    const data = await response.json();
    if (response.ok) {
      pantryItems = Array.isArray(data) ? data : [];
    } else {
      error = data.message || 'Failed to fetch pantry items';
    }
  } catch {
    error = 'An error occurred while fetching pantry items';
  } finally {
    loading = false;
    notify();
  }
}

async function addPantryItem(item) {
  try {
    const response = await fetch('/api/pantry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const data = await response.json();
    if (response.ok) {
      pantryItems = [...pantryItems, data];
      notify();
      return data;
    }
    error = data.message || 'Failed to add pantry item';
    notify();
    return null;
  } catch {
    error = 'An error occurred while adding the pantry item';
    notify();
    return null;
  }
}

async function updatePantryItem(id, updates) {
  try {
    const response = await fetch(`/api/pantry/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (response.ok) {
      pantryItems = pantryItems.map((item) => (item.id === id ? data : item));
      notify();
      return data;
    }
    error = data.message || 'Failed to update pantry item';
    notify();
    return null;
  } catch {
    error = 'An error occurred while updating the pantry item';
    notify();
    return null;
  }
}

async function deletePantryItem(id) {
  try {
    const response = await fetch(`/api/pantry/${id}`, { method: 'DELETE' });
    if (response.ok) {
      pantryItems = pantryItems.filter((item) => item.id !== id);
      notify();
      return true;
    }
    const data = await response.json().catch(() => ({}));
    error = data.message || 'Failed to delete pantry item';
    notify();
    return false;
  } catch {
    error = 'An error occurred while deleting the pantry item';
    notify();
    return false;
  }
}

export function usePantry() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((count) => count + 1);
    listeners.add(listener);
    if (!fetchStarted) {
      fetchStarted = true;
      fetchPantryItems();
    }
    return () => listeners.delete(listener);
  }, []);

  return {
    pantryItems,
    loading,
    error,
    fetchPantryItems,
    addPantryItem,
    updatePantryItem,
    deletePantryItem,
  };
}

