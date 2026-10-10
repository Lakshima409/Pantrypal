import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useProfile } from '../stores/profileStore';
import '../styles/plan-pages.css';
import '../styles/profile.css';

const DIETS = ['', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'gluten-free', 'halal', 'none'];
const SKILLS = ['beginner', 'intermediate', 'advanced'];
const ALLERGIES = ['peanuts', 'shellfish', 'dairy', 'eggs', 'soy', 'wheat', 'tree-nuts', 'fish'];
const CONDITIONS = ['diabetes', 'hypertension', 'heart-disease', 'celiac', 'lactose-intolerance'];
const DIET_LABELS = { '': 'No specific diet', none: 'No specific diet', vegetarian: 'Vegetarian', vegan: 'Vegan', pescatarian: 'Pescatarian', keto: 'Keto', paleo: 'Paleo', 'gluten-free': 'Gluten-Free', halal: 'Halal' };
const titleCase = (s) => String(s).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function ProfileClean() {
  const { user, logout } = useUser();
  const { profile, updateProfile } = useProfile(user);
  const navigate = useNavigate();

  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);

  // Re-seed the form whenever the identity (account) changes.
  useEffect(() => { setForm(profile); setSaved(false); /* eslint-disable-next-line */ }, [profile.email]);

  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setSaved(false); };
  const toggleIn = (key, value) =>
    setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value] }));

  const save = (e) => {
    e.preventDefault();
    updateProfile({ ...form });
    setSaved(true);
    // Best-effort persistence to the backend (silently ignored when not authed/mock).
    fetch('/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dietaryRestrictions: [form.diet].filter(Boolean),
        allergies: form.allergies,
        conditions: form.conditions,
        skill: form.skill,
        calories: form.calories,
        name: form.name,
      }),
    }).catch(() => { /* offline/mock — local store already updated */ });
  };

  const signOut = () => { logout(); navigate('/login'); };
  const initial = (profile.name || 'G')[0].toUpperCase();

  const effects = [];
  if (form.diet && form.diet !== 'none') effects.push({ ic: '🥗', text: `Prioritising ${DIET_LABELS[form.diet] || titleCase(form.diet)} recipes` });
  else effects.push({ ic: '🥗', text: 'No diet filter', muted: true });
  effects.push(form.allergies.length
    ? { ic: '🚫', text: `Excluding: ${form.allergies.map(titleCase).join(', ')}` }
    : { ic: '🚫', text: 'No allergies set', muted: true });
  effects.push(form.conditions.length
    ? { ic: '🩺', text: `Tailoring for: ${form.conditions.map(titleCase).join(', ')}` }
    : { ic: '🩺', text: 'No health conditions set', muted: true });
  if (form.calories) effects.push({ ic: '🎯', text: `Daily calorie goal: ${form.calories} kcal` });
  effects.push({ ic: '👨‍🍳', text: `Matching ${titleCase(form.skill)} skill recipes` });

  return (
    <div className="pl-page">
      <header className="pl-hero">
        <div className="pl-hero-card">
          <h1>Hello, <span className="coral">{profile.name}</span></h1>
          <p>Your profile personalises every recommendation, meal plan and shopping list across PantryPal.</p>
        </div>
      </header>

      <div className="pl-wrap">
        <section className="pl-card">
          <div className="pl-card-head">
            <h2 className="pl-pref-title" style={{ textAlign: 'left' }}>Account</h2>
            <button type="button" className="pl-btn pl-btn-dark" onClick={signOut}>Sign Out</button>
          </div>
          <div className="pl-pref-rule" style={{ margin: '12px 0 0' }} />
          <div className="pf-identity" style={{ marginTop: 20 }}>
            <div className="pf-avatar" style={{ background: form.avatarColor }}>{initial}</div>
            <div className="pf-who">
              <h2>{profile.name}</h2>
              <p>{profile.email || 'Not signed in with an email'}</p>
              <div className="pf-swatches">
                {['#ff6b4a', '#7c2d0e', '#2f8f5b', '#3b6fd4', '#a24fb0', '#d98b1f'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`pf-swatch ${form.avatarColor === c ? 'on' : ''}`}
                    style={{ background: c }}
                    onClick={() => set({ avatarColor: c })}
                    aria-label={`Choose avatar colour ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
        {/* PREFERENCES_FORM */}
        <form className="pl-card" onSubmit={save}>
          <h2 className="pl-pref-title">Diet, Health &amp; Goals</h2>
          <div className="pl-pref-rule" />
          <div className="pf-grid">
            <div className="pf-field">
              <label>Display Name</label>
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Your name" />
            </div>
            <div className="pf-field">
              <label>Dietary Preference</label>
              <select value={form.diet} onChange={(e) => set({ diet: e.target.value })}>
                {DIETS.map((d) => <option key={d} value={d}>{DIET_LABELS[d]}</option>)}
              </select>
            </div>
            <div className="pf-field">
              <label>Daily Calorie Goal (kcal)</label>
              <input inputMode="numeric" value={form.calories} onChange={(e) => set({ calories: e.target.value.replace(/[^0-9]/g, '') })} placeholder="e.g. 2000" />
            </div>
            <div className="pf-field">
              <label>Cooking Skill</label>
              <select value={form.skill} onChange={(e) => set({ skill: e.target.value })}>
                {SKILLS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
              </select>
            </div>
          </div>

          <div className="pf-field" style={{ marginTop: 22 }}>
            <label>Allergies &amp; Intolerances</label>
            <div className="pf-chips">
              {ALLERGIES.map((a) => (
                <label key={a} className={`pf-chip ${form.allergies.includes(a) ? 'on' : ''}`}>
                  <input type="checkbox" checked={form.allergies.includes(a)} onChange={() => toggleIn('allergies', a)} />
                  {titleCase(a)}
                </label>
              ))}
            </div>
          </div>

          <div className="pf-field" style={{ marginTop: 22 }}>
            <label>Health Conditions</label>
            <div className="pf-chips">
              {CONDITIONS.map((c) => (
                <label key={c} className={`pf-chip ${form.conditions.includes(c) ? 'on' : ''}`}>
                  <input type="checkbox" checked={form.conditions.includes(c)} onChange={() => toggleIn('conditions', c)} />
                  {titleCase(c)}
                </label>
              ))}
            </div>
          </div>

          <div className="pf-actions" style={{ marginTop: 26 }}>
            <button type="submit" className="pl-btn">Save Changes</button>
            <button type="button" className="pl-btn pl-btn-dark" onClick={() => { setForm(profile); setSaved(false); }}>Reset</button>
            {saved && <span className="pf-saved">✓ Saved &amp; applied across PantryPal</span>}
          </div>
        </form>
        {/* SUMMARY_CARD */}
        <section className="pl-card">
          <h2 className="pl-pref-title">How This Personalises PantryPal</h2>
          <div className="pl-pref-rule" />
          <ul className="pf-summary">
            {effects.map((e, i) => (
              <li key={i}><span className="ic">{e.ic}</span><span className={e.muted ? 'muted' : ''}>{e.text}</span></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default ProfileClean;
