import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useUser } from '../context/UserContext';
import { useProfile } from '../stores/profileStore';
import '../styles/recipe-generator.css';

const CATEGORIES = [
  { key: 'vegetables', label: 'Vegetables', options: ['Tomatoes', 'Onions', 'Garlic', 'Spinach', 'Carrots', 'Bell Peppers'] },
  { key: 'meats', label: 'Meats', options: ['Chicken', 'Beef', 'Pork', 'Salmon', 'Shrimp', 'Turkey'] },
  { key: 'dairy', label: 'Dairy', options: ['Milk', 'Cheese', 'Butter', 'Yogurt', 'Eggs', 'Cream'] },
  { key: 'grains', label: 'Grains', options: ['Rice', 'Pasta', 'Bread', 'Quinoa', 'Oats', 'Flour'] },
];

const POPULAR = ['Chicken', 'Tomatoes', 'Onions', 'Garlic', 'Rice', 'Pasta'];

const ALLERGIES = ['Dairy', 'Eggs', 'Gluten', 'Peanuts', 'Tree Nuts', 'Soy', 'Fish', 'Shellfish', 'Sesame', 'Mustard', 'Celery', 'Lupin', 'Molluscs', 'Sulfites'];

const DIETARY = ['Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Paleo', 'Low-Carb', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Mediterranean', 'Low-Sodium'];

const COOK_TIMES = ['Select cooking time', 'Under 15 mins', 'Under 30 mins', 'Under 1 hour'];
const DIFFICULTIES = ['Select difficulty', 'Easy', 'Medium', 'Hard'];

function RecipeGenerator() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { profile } = useProfile(user);
  const [query, setQuery] = useState('');
  const [newIng, setNewIng] = useState('');
  const [pantry, setPantry] = useState(['Onions', 'Garlic', 'Rice', 'Tomatoes']);
  const [allergies, setAllergies] = useState([]);
  const [dietary, setDietary] = useState([]);
  const [calMin, setCalMin] = useState('');
  const [calMax, setCalMax] = useState('');
  const [cookTime, setCookTime] = useState(COOK_TIMES[0]);
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[0]);
  const [image, setImage] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  // Personalise from the signed-in user's profile: prefill diet, allergies, calorie target.
  useEffect(() => {
    if (!profile) return;
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
    if (profile.diet && profile.diet !== 'none') {
      const match = DIETARY.find((d) => norm(d) === norm(profile.diet));
      if (match) setDietary((prev) => (prev.includes(match) ? prev : [...prev, match]));
    }
    if (Array.isArray(profile.allergies) && profile.allergies.length) {
      setAllergies((prev) => {
        const set = new Set(prev);
        profile.allergies.forEach((a) => {
          const m = ALLERGIES.find((x) => norm(x) === norm(a));
          if (m) set.add(m);
        });
        return [...set];
      });
    }
    if (profile.calories) setCalMax(String(profile.calories));
    // eslint-disable-next-line
  }, [profile && profile.email]);

  const addIngredient = (name) => {
    const v = (name || '').trim();
    if (!v) return;
    if (!pantry.some((p) => p.toLowerCase() === v.toLowerCase())) setPantry((prev) => [...prev, v]);
    setNewIng('');
  };
  const removeIngredient = (name) => setPantry((prev) => prev.filter((p) => p !== name));

  const toggle = (list, setList, value) =>
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const onFiles = (files) => {
    const f = files && files[0];
    if (f) setImage({ url: URL.createObjectURL(f), name: f.name });
  };

  const generate = () => navigate('/recipes');

  return (
    <div className="rg-page">
      <Navbar />

      <header className="rg-hero">
        <div className="rg-hero-card">
          <h1>
            Delicious Recipes, Matched to
            <span className="coral">What&apos;s in Your Kitchen</span>
          </h1>
          <p>Tell us what ingredients you have, and we&apos;ll suggest amazing recipes you can make right now.</p>
        </div>
      </header>

      <section className="rg-search">
        <div className="rg-search-card">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes, cuisines, or dishes…"
            aria-label="Search recipes"
          />
          <button type="button" className="rg-btn" onClick={generate}>Search</button>
        </div>
      </section>

      <div className="rg-wrap">
        {/* What's in Your Pantry Today? */}
        <section className="rg-card">
          <div className="rg-card-title">
            <img src="/assets/pantrypal-logo.png" alt="PantryPal" draggable={false} />
            <h2>What&apos;s in Your Pantry Today?</h2>
          </div>
          <div className="rg-underline" />

          <div className="rg-add-row">
            <input
              value={newIng}
              onChange={(e) => setNewIng(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(newIng); } }}
              placeholder="Enter an ingredient (e.g., chicken, tomatoes, rice)"
              aria-label="Add an ingredient"
            />
            <button type="button" className="rg-btn" onClick={() => addIngredient(newIng)}>Add Ingredient</button>
          </div>

          <div className="rg-cats">
            {CATEGORIES.map((c) => (
              <div className="rg-cat" key={c.key}>
                <label htmlFor={`cat-${c.key}`}>{c.label}</label>
                <select
                  id={`cat-${c.key}`}
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) addIngredient(e.target.value); e.target.value = ''; }}
                >
                  <option value="">Select an ingredient</option>
                  {c.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          <p className="rg-popular-label">Popular ingredients:</p>
          <div className="rg-popular">
            {POPULAR.map((p) => (
              <button type="button" key={p} className="rg-pop" onClick={() => addIngredient(p)}>{p}</button>
            ))}
          </div>
        </section>

        {/* User Preferences */}
        <section className="rg-card">
          <h3 className="rg-pref-title">User Preferences</h3>
          <div className="rg-pref-rule" />

          <div className="rg-field">
            <label>Calorie Range (kcal):</label>
            <div className="rg-cal">
              <input value={calMin} onChange={(e) => setCalMin(e.target.value)} placeholder="Min" inputMode="numeric" aria-label="Minimum calories" />
              <input value={calMax} onChange={(e) => setCalMax(e.target.value)} placeholder="Max" inputMode="numeric" aria-label="Maximum calories" />
            </div>
          </div>

          <div className="rg-field">
            <label>Allergies:</label>
            <div className="rg-chips">
              {ALLERGIES.map((a) => (
                <label key={a} className={`rg-chip ${allergies.includes(a) ? 'on' : ''}`}>
                  <input type="checkbox" checked={allergies.includes(a)} onChange={() => toggle(allergies, setAllergies, a)} />
                  {a}
                </label>
              ))}
            </div>
          </div>

          <div className="rg-field">
            <label>Dietary Preferences:</label>
            <div className="rg-chips">
              {DIETARY.map((d) => (
                <label key={d} className={`rg-chip ${dietary.includes(d) ? 'on' : ''}`}>
                  <input type="checkbox" checked={dietary.includes(d)} onChange={() => toggle(dietary, setDietary, d)} />
                  {d}
                </label>
              ))}
            </div>
          </div>

          <div className="rg-field rg-two">
            <div>
              <label>Cooking Time:</label>
              <select className="rg-sel" value={cookTime} onChange={(e) => setCookTime(e.target.value)}>
                {COOK_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label>Difficulty Level:</label>
              <select className="rg-sel" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Your Pantry */}
        <section className="rg-card">
          <h3 className="rg-pref-title" style={{ color: '#240d04' }}>Your Pantry</h3>
          <div className="rg-pantry-box">
            {pantry.length === 0 && <span style={{ color: '#a49481', fontSize: 13.5 }}>No ingredients yet — add some above.</span>}
            {pantry.map((p) => (
              <span className="rg-pchip" key={p}>
                {p}
                <button type="button" onClick={() => removeIngredient(p)} aria-label={`Remove ${p}`}>×</button>
              </span>
            ))}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
          {image ? (
            <div className="rg-preview">
              <img src={image.url} alt={image.name} />
              <div><button type="button" className="rg-remove" onClick={() => setImage(null)}>Remove Image</button></div>
            </div>
          ) : (
            <div
              className={`rg-drop ${dragging ? 'drag' : ''}`}
              onClick={() => fileRef.current && fileRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
            >
              <div className="rg-drop-icon">⬆</div>
              <div className="rg-drop-text">Drag and drop an image of your ingredients</div>
              <div className="rg-drop-or">or</div>
              <div className="rg-drop-file">Choose File</div>
            </div>
          )}

          <div className="rg-gen">
            <button type="button" className="rg-btn" onClick={generate}>Generate Recipes</button>
          </div>
        </section>
      </div>
      <footer className="rg-footer">
        <div className="rg-footer-inner">
          <div className="rg-footer-links">
            <a href="#contact">Contact</a>
            <a href="#terms">Terms</a>
            <a href="#about">About</a>
          </div>
          <div className="rg-footer-copy">© 2025 PantryPal. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

export default RecipeGenerator;
