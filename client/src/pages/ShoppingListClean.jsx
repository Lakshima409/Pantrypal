import { useState } from 'react';
import { usePlanStore } from '../stores/planStore';
import '../styles/plan-pages.css';

const CATEGORIES = ['Produce', 'Meat', 'Dairy', 'Grains', 'Pantry', 'Other'];
const CAT_EMOJI = { Produce: '🥬', Meat: '🥩', Dairy: '🥛', Grains: '🌾', Pantry: '🫙', Other: '🧺' };
const UNITS = ['', 'g', 'kg', 'ml', 'L', 'tbsp', 'tsp', 'cloves', 'slices', 'bunch', 'pack'];

function ShoppingListClean() {
  const {
    shoppingList, addShoppingItem, updateShoppingItem, toggleShoppingItem, removeShoppingItem, clearChecked,
  } = usePlanStore();

  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('g');
  const [category, setCategory] = useState('Produce');

  const total = shoppingList.length;
  const done = shoppingList.filter((i) => i.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const add = (e) => {
    e.preventDefault();
    const v = name.trim();
    if (!v) return;
    addShoppingItem({ name: v, qty: qty === '' ? 0 : Number(qty), unit, category });
    setName(''); setQty('');
  };

  // Group items by category, preserving insertion order of categories.
  const grouped = CATEGORIES
    .map((cat) => ({ cat, items: shoppingList.filter((i) => i.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="pl-page">
      <header className="pl-hero">
        <div className="pl-hero-card">
          <h1>Your Smart <span className="coral">Shopping List</span></h1>
          <p>Auto-built from your meal plan and missing pantry items, grouped by aisle and de-duplicated for an efficient shop.</p>
        </div>
      </header>

      <div className="pl-wrap">
        <section className="pl-card">
          <div className="pl-sl-top">
            <div className="pl-progress">
              <div className="pl-progress-lbl">{done} of {total} items collected</div>
              <div className="pl-progress-track"><div className="pl-progress-fill" style={{ width: pct + '%' }} /></div>
            </div>
            <button type="button" className="pl-btn pl-btn-dark" onClick={clearChecked} disabled={done === 0} style={{ opacity: done === 0 ? 0.5 : 1 }}>
              Clear Checked
            </button>
          </div>

          <form className="pl-addrow" onSubmit={add}>
            <input className="pl-in-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Add an item (e.g. Baby Spinach)…" aria-label="Item name" />
            <input className="pl-in-qty" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" inputMode="decimal" aria-label="Quantity" />
            <select className="pl-in-unit" value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Unit">
              {UNITS.map((u) => <option key={u} value={u}>{u || '—'}</option>)}
            </select>
            <select className="pl-in-cat" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="submit" className="pl-btn">Add Item</button>
          </form>

          {total === 0 ? (
            <div className="pl-empty-list">
              <div className="big">🧺</div>
              <div>Your list is empty. Add items above, or build a meal plan to auto-fill it.</div>
            </div>
          ) : (
            grouped.map((g) => (
              <div className="pl-cat" key={g.cat}>
                <div className="pl-cat-head">
                  <span className="pl-cat-emoji">{CAT_EMOJI[g.cat]}</span>
                  <span className="pl-cat-name">{g.cat}</span>
                  <span className="pl-cat-count">{g.items.length} item{g.items.length > 1 ? 's' : ''}</span>
                </div>
                <div className="pl-items">
                  {g.items.map((it) => (
                    <div className={`pl-item ${it.done ? 'done' : ''}`} key={it.id}>
                      <input type="checkbox" checked={it.done} onChange={() => toggleShoppingItem(it.id)} aria-label={`Mark ${it.name} collected`} />
                      <span className="pl-item-name">
                        {it.name} {it.fromPlan && <span className="pl-badge-auto">auto</span>}
                      </span>
                      <div className="pl-qty-box">
                        <input
                          value={it.qty}
                          onChange={(e) => updateShoppingItem(it.id, { qty: e.target.value === '' ? '' : Number(e.target.value) })}
                          inputMode="decimal"
                          aria-label={`Quantity for ${it.name}`}
                        />
                        <select value={it.unit} onChange={(e) => updateShoppingItem(it.id, { unit: e.target.value })} aria-label={`Unit for ${it.name}`}>
                          {UNITS.map((u) => <option key={u} value={u}>{u || '—'}</option>)}
                        </select>
                      </div>
                      <button type="button" className="pl-remove" onClick={() => removeShoppingItem(it.id)} title="Remove" aria-label={`Remove ${it.name}`}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

export default ShoppingListClean;
