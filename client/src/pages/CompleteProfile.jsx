import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import PantryPalLogo from '../components/PantryPalLogo';
import '../styles/auth.css';

const ALLERGIES = ['peanuts', 'shellfish', 'dairy', 'eggs', 'soy', 'wheat', 'tree-nuts', 'fish'];
const CONDITIONS = ['diabetes', 'hypertension', 'heart-disease', 'celiac', 'lactose-intolerance'];
const DIETS = ['vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'gluten-free', 'halal', 'none'];
const SKILLS = ['beginner', 'intermediate', 'advanced'];

function CheckGroup({ items, selected, onToggle }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
      {items.map((item) => (
        <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#444', cursor: 'pointer', boxShadow: '0 1px 5px rgba(0,0,0,0.12)' }}>
          <input type="checkbox" checked={selected.includes(item)} onChange={() => onToggle(item)} style={{ width: 15, height: 15, margin: 0, accentColor: '#ff7061' }} />
          {item}
        </label>
      ))}
    </div>
  );
}

function CompleteProfile() {
  const navigate = useNavigate();
  const { user, updateUser } = useUser();
  const [diet, setDiet] = useState('');
  const [allergies, setAllergies] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [skill, setSkill] = useState('beginner');
  const [calories, setCalories] = useState('');

  const toggle = (list, setList) => (item) =>
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dietaryRestrictions: [diet].filter(Boolean), allergies, conditions, skill, calories }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.user) updateUser(data.user);
    } catch {
      // completes locally even if mock API unavailable
    }
    navigate('/');
  };

  return (
    <div className="auth-bg" style={{ alignItems: 'flex-start', paddingTop: 0, paddingBottom: 0 }}>
      <div className="auth-card auth-card--narrow" style={{ borderRadius: 0, minHeight: '100vh', paddingTop: 24, textAlign: 'left' }}>
        <PantryPalLogo compact />
        <h1 style={{ fontSize: 22, textAlign: 'center' }}>Complete Your Profile</h1>
        <p className="auth-sub auth-sub--sm" style={{ textAlign: 'center', fontSize: 12.5 }}>Welcome {user?.name || 'nethmini'}! Let&apos;s personalize your experience</p>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>Dietary Preference</label>
          <select value={diet} onChange={(e) => setDiet(e.target.value)} style={{ width: '100%', background: '#e9e6e3', border: 'none', height: 38, borderRadius: 6, padding: '0 12px', fontSize: 13, marginBottom: 22 }}>
            <option value="">Select diet type</option>
            {DIETS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>Allergies</label>
          <CheckGroup items={ALLERGIES} selected={allergies} onToggle={toggle(allergies, setAllergies)} />
          <label style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>Health Conditions</label>
          <CheckGroup items={CONDITIONS} selected={conditions} onToggle={toggle(conditions, setConditions)} />
          <label style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>Cooking Skill</label>
          <select value={skill} onChange={(e) => setSkill(e.target.value)} style={{ width: '100%', background: '#e9e6e3', border: 'none', height: 38, borderRadius: 6, padding: '0 12px', fontSize: 13, marginBottom: 22 }}>
            {SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>Daily Calorie Goal</label>
          <input type="number" placeholder="e.g., 2000" value={calories} onChange={(e) => setCalories(e.target.value)} style={{ height: 38, fontSize: 13, marginBottom: 18 }} />
          <button type="submit" className="auth-btn">Complete Registration</button>
        </form>
        <p className="auth-switch" style={{ textAlign: 'center' }}>Back to <Link to="/login" className="auth-link-red">Login</Link></p>
      </div>
    </div>
  );
}

export default CompleteProfile;
