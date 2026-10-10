// Shared store for the Diet Plan + Shopping List pages.
// Module-level store (same pattern as the *Context files) so both pages read one
// source of truth without a <Provider> wrapper. Pure client-side — no backend/auth
// needed, so the pages stay fully demonstrable and stay in sync with each other.

import { useEffect, useState } from 'react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];

const RECIPES = [
  { id: 'r0', title: 'Grilled Chicken & Rice', kcal: 520, protein: 45, time: 30, cuisine: 'Asian', slots: ['dinner', 'lunch'], diets: ['high-protein'], img: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=300&q=70', ingredients: [ { name: 'Chicken Breast', qty: 500, unit: 'g', category: 'Meat' }, { name: 'Rice', qty: 300, unit: 'g', category: 'Grains' }, { name: 'Soy Sauce', qty: 30, unit: 'ml', category: 'Pantry' }, { name: 'Garlic', qty: 3, unit: 'cloves', category: 'Produce' } ] },
  { id: 'r1', title: 'Veggie Stir-Fry', kcal: 320, protein: 12, time: 20, cuisine: 'Asian', slots: ['dinner', 'lunch'], diets: ['vegan', 'vegetarian'], img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=70', ingredients: [ { name: 'Bell Peppers', qty: 2, unit: '', category: 'Produce' }, { name: 'Broccoli', qty: 200, unit: 'g', category: 'Produce' }, { name: 'Soy Sauce', qty: 20, unit: 'ml', category: 'Pantry' }, { name: 'Rice', qty: 150, unit: 'g', category: 'Grains' } ] },
  { id: 'r2', title: 'Salmon & Quinoa Bowl', kcal: 480, protein: 38, time: 25, cuisine: 'Mediterranean', slots: ['lunch', 'dinner'], diets: ['high-protein', 'pescatarian'], img: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=300&q=70', ingredients: [ { name: 'Salmon', qty: 200, unit: 'g', category: 'Meat' }, { name: 'Quinoa', qty: 150, unit: 'g', category: 'Grains' }, { name: 'Lemon', qty: 1, unit: '', category: 'Produce' }, { name: 'Olive Oil', qty: 15, unit: 'ml', category: 'Pantry' } ] },
  { id: 'r3', title: 'Overnight Oats', kcal: 350, protein: 15, time: 5, cuisine: 'American', slots: ['breakfast'], diets: ['vegetarian'], img: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=300&q=70', ingredients: [ { name: 'Oats', qty: 80, unit: 'g', category: 'Grains' }, { name: 'Milk', qty: 250, unit: 'ml', category: 'Dairy' }, { name: 'Berries', qty: 100, unit: 'g', category: 'Produce' }, { name: 'Honey', qty: 15, unit: 'ml', category: 'Pantry' } ] },
  { id: 'r4', title: 'Greek Yogurt Parfait', kcal: 260, protein: 18, time: 5, cuisine: 'Mediterranean', slots: ['breakfast', 'snack'], diets: ['vegetarian', 'high-protein'], img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&q=70', ingredients: [ { name: 'Yogurt', qty: 200, unit: 'g', category: 'Dairy' }, { name: 'Granola', qty: 60, unit: 'g', category: 'Grains' }, { name: 'Honey', qty: 15, unit: 'ml', category: 'Pantry' } ] },
  { id: 'r5', title: 'Beef Tacos', kcal: 560, protein: 35, time: 25, cuisine: 'Mexican', slots: ['dinner'], diets: ['high-protein'], img: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300&q=70', ingredients: [ { name: 'Beef', qty: 300, unit: 'g', category: 'Meat' }, { name: 'Tortillas', qty: 6, unit: '', category: 'Grains' }, { name: 'Cheese', qty: 80, unit: 'g', category: 'Dairy' }, { name: 'Salsa', qty: 100, unit: 'g', category: 'Pantry' } ] },
  { id: 'r6', title: 'Chickpea Curry', kcal: 420, protein: 18, time: 30, cuisine: 'Indian', slots: ['dinner', 'lunch'], diets: ['vegan', 'vegetarian'], img: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&q=70', ingredients: [ { name: 'Chickpeas', qty: 400, unit: 'g', category: 'Pantry' }, { name: 'Coconut Milk', qty: 200, unit: 'ml', category: 'Pantry' }, { name: 'Tomatoes', qty: 3, unit: '', category: 'Produce' }, { name: 'Onions', qty: 1, unit: '', category: 'Produce' }, { name: 'Rice', qty: 150, unit: 'g', category: 'Grains' } ] },
  { id: 'r7', title: 'Chicken Caesar Salad', kcal: 400, protein: 32, time: 15, cuisine: 'American', slots: ['lunch'], diets: ['high-protein', 'low-carb'], img: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=300&q=70', ingredients: [ { name: 'Chicken Breast', qty: 200, unit: 'g', category: 'Meat' }, { name: 'Romaine Lettuce', qty: 1, unit: '', category: 'Produce' }, { name: 'Parmesan', qty: 40, unit: 'g', category: 'Dairy' }, { name: 'Caesar Dressing', qty: 30, unit: 'ml', category: 'Pantry' } ] },
  { id: 'r8', title: 'Pasta Primavera', kcal: 480, protein: 16, time: 25, cuisine: 'Italian', slots: ['dinner', 'lunch'], diets: ['vegetarian'], img: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=300&q=70', ingredients: [ { name: 'Pasta', qty: 200, unit: 'g', category: 'Grains' }, { name: 'Cherry Tomatoes', qty: 200, unit: 'g', category: 'Produce' }, { name: 'Zucchini', qty: 1, unit: '', category: 'Produce' }, { name: 'Parmesan', qty: 40, unit: 'g', category: 'Dairy' }, { name: 'Olive Oil', qty: 20, unit: 'ml', category: 'Pantry' } ] },
  { id: 'r9', title: 'Egg & Avocado Toast', kcal: 380, protein: 16, time: 10, cuisine: 'American', slots: ['breakfast'], diets: ['vegetarian', 'high-protein'], img: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=300&q=70', ingredients: [ { name: 'Bread', qty: 2, unit: 'slices', category: 'Grains' }, { name: 'Eggs', qty: 2, unit: '', category: 'Dairy' }, { name: 'Avocado', qty: 1, unit: '', category: 'Produce' } ] },
  { id: 'r10', title: 'Turkey & Cheese Wrap', kcal: 430, protein: 30, time: 10, cuisine: 'American', slots: ['lunch', 'snack'], diets: ['high-protein'], img: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=300&q=70', ingredients: [ { name: 'Turkey', qty: 150, unit: 'g', category: 'Meat' }, { name: 'Tortillas', qty: 1, unit: '', category: 'Grains' }, { name: 'Cheese', qty: 50, unit: 'g', category: 'Dairy' }, { name: 'Lettuce', qty: 1, unit: '', category: 'Produce' } ] },
  { id: 'r11', title: 'Hearty Lentil Soup', kcal: 300, protein: 18, time: 35, cuisine: 'Mediterranean', slots: ['dinner', 'lunch'], diets: ['vegan', 'vegetarian'], img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&q=70', ingredients: [ { name: 'Lentils', qty: 250, unit: 'g', category: 'Pantry' }, { name: 'Carrots', qty: 2, unit: '', category: 'Produce' }, { name: 'Onions', qty: 1, unit: '', category: 'Produce' }, { name: 'Celery', qty: 2, unit: 'stalks', category: 'Produce' } ] },
];

const DIET_OPTIONS = [
  { key: 'any', label: 'Any' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'pescatarian', label: 'Pescatarian' },
  { key: 'high-protein', label: 'High-Protein' },
  { key: 'low-carb', label: 'Low-Carb' },
];

function matchesDiet(diet, r) {
  if (diet === 'any') return true;
  if (diet === 'vegetarian') return r.diets.includes('vegetarian') || r.diets.includes('vegan');
  if (diet === 'pescatarian') return r.diets.includes('pescatarian') || r.diets.includes('vegetarian') || r.diets.includes('vegan');
  return r.diets.includes(diet);
}

const round1 = (n) => Math.round(n * 10) / 10;

const listeners = new Set();
const notify = () => listeners.forEach((l) => l());

let plan = {};          // plan[day][slot] = recipe | null
let shoppingList = [];  // [{ id, name, qty, unit, category, done, fromPlan }]
let dietFilter = 'any';
let seed = 0;

function pickForSlot(slot, used, diet) {
  const pool = RECIPES.filter((r) => r.slots.includes(slot) && matchesDiet(diet, r));
  const fresh = pool.filter((r) => !used.has(r.id));
  const list = fresh.length ? fresh : pool.length ? pool : RECIPES.filter((r) => r.slots.includes(slot));
  if (!list.length) return null;
  seed += 1;
  return list[seed % list.length];
}

function generateWeek() {
  plan = {};
  const used = { breakfast: new Set(), lunch: new Set(), dinner: new Set(), snack: new Set() };
  for (const day of DAYS) {
    plan[day] = {};
    for (const slot of SLOTS) {
      const r = pickForSlot(slot, used[slot], dietFilter);
      if (r) used[slot].add(r.id);
      plan[day][slot] = r || null;
    }
  }
  deriveShoppingList();
  notify();
}

function setMeal(day, slot) {
  if (!plan[day]) plan[day] = {};
  const used = new Set();
  for (const d of DAYS) for (const s of SLOTS) if (plan[d] && plan[d][s]) used.add(plan[d][s].id);
  const r = pickForSlot(slot, used, dietFilter);
  plan[day] = { ...plan[day], [slot]: r };
  deriveShoppingList();
  notify();
}

function clearMeal(day, slot) {
  if (!plan[day]) return;
  plan[day] = { ...plan[day], [slot]: null };
  deriveShoppingList();
  notify();
}

function deriveShoppingList() {
  const byKey = new Map();
  for (const day of DAYS) {
    const d = plan[day] || {};
    for (const slot of SLOTS) {
      const r = d[slot];
      if (!r) continue;
      for (const ing of r.ingredients) {
        const key = ing.name.toLowerCase() + '|' + (ing.unit || '');
        if (byKey.has(key)) {
          byKey.get(key).qty = round1(byKey.get(key).qty + (ing.qty || 0));
        } else {
          byKey.set(key, { id: 'gen-' + key, name: ing.name, qty: ing.qty || 0, unit: ing.unit || '', category: ing.category || 'Other', done: false, fromPlan: true });
        }
      }
    }
  }
  const manual = shoppingList.filter((i) => !i.fromPlan);
  shoppingList = [...byKey.values(), ...manual];
}

// ---- shopping list actions ----
let uid = 0;
function addShoppingItem(item) {
  uid += 1;
  shoppingList = [
    ...shoppingList,
    { id: 'man-' + uid, name: item.name, qty: item.qty || 0, unit: item.unit || '', category: item.category || 'Other', done: false, fromPlan: false },
  ];
  notify();
}
function updateShoppingItem(id, patch) {
  shoppingList = shoppingList.map((i) => (i.id === id ? { ...i, ...patch } : i));
  notify();
}
function toggleShoppingItem(id) {
  shoppingList = shoppingList.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
  notify();
}
function removeShoppingItem(id) {
  shoppingList = shoppingList.filter((i) => i.id !== id);
  notify();
}
function clearChecked() {
  shoppingList = shoppingList.filter((i) => !i.done);
  notify();
}
function setDietFilter(diet) {
  dietFilter = diet;
  generateWeek();
}

function dayTotals(day) {
  const d = plan[day] || {};
  let kcal = 0, protein = 0, meals = 0;
  for (const slot of SLOTS) {
    const r = d[slot];
    if (r) { kcal += r.kcal; protein += r.protein; meals += 1; }
  }
  return { kcal, protein, meals };
}

function weekTotals() {
  let kcal = 0, protein = 0, meals = 0;
  for (const day of DAYS) { const t = dayTotals(day); kcal += t.kcal; protein += t.protein; meals += t.meals; }
  return { kcal, protein, meals, avgKcal: DAYS.length ? Math.round(kcal / DAYS.length) : 0, avgProtein: DAYS.length ? Math.round(protein / DAYS.length) : 0 };
}

export function usePlanStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((c) => c + 1);
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);
  return {
    plan, shoppingList, dietFilter, DAYS, SLOTS, RECIPES, DIET_OPTIONS,
    generateWeek, setMeal, clearMeal, setDietFilter, dayTotals, weekTotals,
    addShoppingItem, updateShoppingItem, toggleShoppingItem, removeShoppingItem, clearChecked,
  };
}

// Seed a demo week so both pages are alive on first load.
generateWeek();

