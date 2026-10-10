// MealPlan context — module-level store (same pattern as Pantry/User contexts)
// so pages work without a <MealPlanProvider> wrapper.
import { useEffect, useState } from 'react';

let weekOffset = 0;
let mealPlan = {};
let shoppingList = [];
let loading = false;
let fetchStarted = false;

const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

async function fetchMealPlan() {
  loading = true;
  notify();
  try {
    const response = await fetch(`/api/mealplan?week=${weekOffset}`);
    const data = await response.json();
    if (response.ok) {
      mealPlan = data.mealPlan || {};
      shoppingList = data.shoppingList || [];
    }
  } catch {
    // Keep last-known plan; pages surface their own errors.
  } finally {
    loading = false;
    notify();
  }
}

function setWeekOffset(offset) {
  weekOffset = offset;
  fetchStarted = false;
  fetchMealPlan();
  fetchStarted = true;
}

export function useMealPlan() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((count) => count + 1);
    listeners.add(listener);
    if (!fetchStarted) {
      fetchStarted = true;
      fetchMealPlan();
    }
    return () => listeners.delete(listener);
  }, []);

  return { mealPlan, shoppingList, loading, weekOffset, fetchMealPlan, setWeekOffset };
}


