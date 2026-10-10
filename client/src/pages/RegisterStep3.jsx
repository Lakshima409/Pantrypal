import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import PantryPalLogo from '../components/PantryPalLogo';
import '../styles/auth.css';

const DIETS = ['vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'gluten-free', 'halal', 'none'];
const SKILLS = ['beginner', 'intermediate', 'advanced'];
const ALLERGIES = ['peanuts', 'shellfish', 'dairy', 'eggs', 'soy', 'wheat', 'tree-nuts', 'fish'];
const CONDITIONS = ['diabetes', 'hypertension', 'heart-disease', 'celiac', 'lactose-intolerance'];

function ChipGroup({ items, selected, onToggle }) {
  return (
    <div className="pp-chips">
      {items.map((item) => (
        <label className="pp-chip" key={item}>
          <input type="checkbox" checked={selected.includes(item)} onChange={() => onToggle(item)} />
          {item}
        </label>
      ))}
    </div>
  );
}
function RegisterStep3() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, updateUser } = useUser();
  const stored = (() => {
    try {
      return {
        email: sessionStorage.getItem('pp_register_email') || '',
        name: sessionStorage.getItem('pp_register_name') || '',
        password: sessionStorage.getItem('pp_register_password') || '',
      };
    } catch { return { email: '', name: '', password: '' }; }
  })();
  const email = location.state?.email || stored.email || '';
  const fullName = location.state?.fullName || stored.name || '';
  const password = location.state?.password || stored.password || '';
  const [diet, setDiet] = useState('');
  const [allergies, setAllergies] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [skill, setSkill] = useState('beginner');
  const [calories, setCalories] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const toggle = (list, setList) => (item) =>
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);

  const handleFinish = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.message || 'Registration failed'); return; }
      const user = data.user || { name: fullName || email.split('@')[0], email };
      login(user);
      try {
        const pres = await fetch('/api/users/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dietaryRestrictions: [diet].filter(Boolean), allergies, conditions, skill, calories }),
        });
        const pdata = await pres.json().catch(() => ({}));
        if (pres.ok && pdata.user) updateUser(pdata.user);
      } catch { /* optional */ }
      try { sessionStorage.removeItem('pp_register_password'); } catch { /* ignore */ }
      navigate('/');
    } catch { setError('An error occurred during registration'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-bg" style={{ alignItems: 'flex-start', paddingTop: 0, paddingBottom: 0 }}>
      <style>{`.pp-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}.pp-chip{display:flex;align-items:center;gap:7px;background:#fff;border-radius:7px;padding:7px 11px;font-size:12px;color:#444;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.12)}.pp-chip input{width:13px;height:13px;margin:0;accent-color:#ff7061}.pp-label{display:block;font-size:12px;margin-bottom:6px}.pp-select{width:100%;background:#e9e6e3;border:none;height:38px;border-radius:7px;padding:0 11px;font-size:12.5px;margin-bottom:16px}`}</style>
      <div className="auth-card auth-card--narrow" style={{ borderRadius: 0, minHeight: '100vh', paddingTop: 24, textAlign: 'left' }}>
        <PantryPalLogo compact />
        <div className="auth-steps"><span className="active" /><span className="active" /><span className="active" /></div>
        <h1 style={{ fontSize: 22, textAlign: 'center' }}>Complete Your Profile</h1>
        <p className="auth-sub auth-sub--sm" style={{ textAlign: 'center', fontSize: 12.5 }}>Welcome {fullName || 'nethmini'}! Let&apos;s personalize your experience</p>
        {error && <div className="auth-err">{error}</div>}
        <form onSubmit={handleFinish}>
          <label className="pp-label">Dietary Preference</label>
          <select className="pp-select" value={diet} onChange={(e) => setDiet(e.target.value)}>
            <option value="">Select diet type</option>
            {DIETS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <label className="pp-label">Allergies</label>
          <ChipGroup items={ALLERGIES} selected={allergies} onToggle={toggle(allergies, setAllergies)} />
          <label className="pp-label">Health Conditions</label>
          <ChipGroup items={CONDITIONS} selected={conditions} onToggle={toggle(conditions, setConditions)} />
          <label className="pp-label">Cooking Skill</label>
          <select className="pp-select" value={skill} onChange={(e) => setSkill(e.target.value)}>
            {SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="pp-label">Daily Calorie Goal</label>
          <input type="text" inputMode="numeric" placeholder="e.g., 2000" value={calories} onChange={(e) => setCalories(e.target.value)} style={{ height: 38, fontSize: 13, marginBottom: 18 }} />
          <button type="submit" className="auth-btn" disabled={loading}>{loading ? 'Creating account...' : 'Complete Registration'}</button>
        </form>
        <p className="auth-switch" style={{ textAlign: 'center' }}>Already have an account? <Link to="/login" className="auth-link-red">Login</Link></p>
      </div>
    </div>
  );
}

export default RegisterStep3;
