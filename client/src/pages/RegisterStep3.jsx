import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import PantryPalLogo from '../components/PantryPalLogo';
import '../styles/auth.css';

const DIETS = [
  'vegetarian',
  'vegan',
  'pescatarian',
  'keto',
  'paleo',
  'gluten-free',
  'halal',
  'none',
];

const SKILLS = ['beginner', 'intermediate', 'advanced'];

const ALLERGIES = [
  'peanuts',
  'shellfish',
  'dairy',
  'eggs',
  'soy',
  'wheat',
  'tree-nuts',
  'fish',
];

const CONDITIONS = [
  'diabetes',
  'hypertension',
  'heart-disease',
  'celiac',
  'lactose-intolerance',
];

function ChipGroup({ items, selected, onToggle }) {
  return (
    <div className="pp-chips">
      {items.map((item) => (
        <label className="pp-chip" key={item}>
          <input
            type="checkbox"
            checked={selected.includes(item)}
            onChange={() => onToggle(item)}
          />
          {item.replaceAll('-', ' ')}
        </label>
      ))}
    </div>
  );
}

async function readResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getErrorMessage(data, fallback) {
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error;
  }

  return fallback;
}

function RegisterStep3() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, updateUser } = useUser();

  const [diet, setDiet] = useState('');
  const [allergies, setAllergies] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [skill, setSkill] = useState('beginner');
  const [calories, setCalories] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const stored = (() => {
    try {
      return {
        email: sessionStorage.getItem('pp_register_email') || '',
        name: sessionStorage.getItem('pp_register_name') || '',
        password: sessionStorage.getItem('pp_register_password') || '',
      };
    } catch {
      return { email: '', name: '', password: '' };
    }
  })();

  const email = location.state?.email || stored.email;
  const fullName = location.state?.fullName || stored.name;
  const password = location.state?.password || stored.password;

  const missingCredentials = !email || !fullName || !password;

  const toggle = (list, setList) => (item) => {
    setList((previous) =>
      previous.includes(item)
        ? previous.filter((value) => value !== item)
        : [...previous, item]
    );
  };

  const handleFinish = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError('');

    if (missingCredentials) {
      setError(
        'Your registration details have expired. Please start again from Step 1.'
      );
      navigate('/register/step1');
      return;
    }

    if (!DIETS.includes(diet) && diet !== '') {
      setError('Please select a valid dietary preference.');
      return;
    }

    if (!SKILLS.includes(skill)) {
      setError('Please select a valid cooking skill level.');
      return;
    }

    let calorieGoal = null;

    if (calories.trim() !== '') {
      if (!/^\d+$/.test(calories.trim())) {
        setError('Please enter your daily calorie goal as a whole number.');
        return;
      }

      calorieGoal = Number(calories.trim());

      if (!Number.isSafeInteger(calorieGoal) || calorieGoal <= 0) {
        setError('Please enter a calorie goal greater than zero.');
        return;
      }
    }

    setLoading(true);

    try {
      // Step 1: Create the account.
      let registerResponse;

      try {
        registerResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            name: fullName.trim(),
            email: email.trim(),
            password,
          }),
        });
      } catch {
        throw new Error(
          'Cannot connect to the server. Check that the PantryPal backend is running and try again.'
        );
      }

      const registerData = await readResponse(registerResponse);

      if (!registerResponse.ok) {
        if (registerResponse.status >= 500) {
          console.error(
            'Registration server error:',
            registerResponse.status,
            registerData
          );

          throw new Error(
            getErrorMessage(
              registerData,
              'The server could not create your account. Please check the backend terminal for the actual error.'
            )
          );
        }

        throw new Error(
          getErrorMessage(registerData, 'Registration failed. Please try again.')
        );
      }

      const user = registerData.user || {
        name: fullName.trim(),
        email: email.trim(),
      };

      // Step 2: Establish the user session.
      // Preserve the existing UserContext login contract.
      login(user);

      // Step 3: Save the user's profile preferences.
      // This request depends on the authentication contract used by your API.
      const profilePayload = {
        dietaryRestrictions: diet ? [diet] : [],
        allergies,
        conditions,
        skill,
        calories: calorieGoal,
      };

      try {
        const profileResponse = await fetch('/api/users/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(profilePayload),
        });

        const profileData = await readResponse(profileResponse);

        if (!profileResponse.ok) {
          console.error(
            'Profile update failed:',
            profileResponse.status,
            profileData
          );
        } else if (profileData.user) {
          updateUser(profileData.user);
        }
      } catch (profileError) {
        console.error('Profile request failed:', profileError);
      }

      // Clear temporary registration data after successful account creation.
      try {
        sessionStorage.removeItem('pp_register_password');
        sessionStorage.removeItem('pp_register_email');
        sessionStorage.removeItem('pp_register_name');
      } catch {
        // Session storage may be unavailable.
      }

      navigate('/');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred during registration.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-bg"
      style={{
        alignItems: 'flex-start',
        paddingTop: 0,
        paddingBottom: 0,
      }}
    >
      <style>{`
        .pp-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }

        .pp-chip {
          display: flex;
          align-items: center;
          gap: 7px;
          background: #fff;
          border-radius: 7px;
          padding: 7px 11px;
          font-size: 12px;
          color: #444;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0, 0, 0, .12);
        }

        .pp-chip input {
          width: 13px;
          height: 13px;
          margin: 0;
          accent-color: #ff7061;
        }

        .pp-label {
          display: block;
          font-size: 12px;
          margin-bottom: 6px;
        }

        .pp-select {
          width: 100%;
          background: #e9e6e3;
          border: none;
          height: 38px;
          border-radius: 7px;
          padding: 0 11px;
          font-size: 12.5px;
          margin-bottom: 16px;
        }

        .pp-calories {
          width: 100%;
          box-sizing: border-box;
          background: #e9e6e3;
          border: none;
          border-radius: 7px;
          height: 38px;
          padding: 0 11px;
          font-size: 13px;
          margin-bottom: 18px;
        }

        .pp-calories:focus,
        .pp-select:focus {
          outline: 2px solid #ff7061;
          outline-offset: 2px;
        }
      `}</style>

      <div
        className="auth-card auth-card--narrow"
        style={{
          borderRadius: 0,
          minHeight: '100vh',
          paddingTop: 24,
          textAlign: 'left',
        }}
      >
        <PantryPalLogo compact />

        <div className="auth-steps">
          <span className="active" />
          <span className="active" />
          <span className="active" />
        </div>

        <h1 style={{ fontSize: 22, textAlign: 'center' }}>
          Complete Your Profile
        </h1>

        <p
          className="auth-sub auth-sub--sm"
          style={{ textAlign: 'center', fontSize: 12.5 }}
        >
          Welcome {fullName || 'there'}! Let&apos;s personalize your experience.
        </p>

        {error && (
          <div className="auth-err" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <form onSubmit={handleFinish}>
          <label className="pp-label" htmlFor="diet">
            Dietary Preference
          </label>

          <select
            id="diet"
            className="pp-select"
            value={diet}
            onChange={(event) => setDiet(event.target.value)}
          >
            <option value="">Select diet type</option>
            {DIETS.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll('-', ' ')}
              </option>
            ))}
          </select>

          <label className="pp-label">Allergies</label>
          <ChipGroup
            items={ALLERGIES}
            selected={allergies}
            onToggle={toggle(allergies, setAllergies)}
          />

          <label className="pp-label">Health Conditions</label>
          <ChipGroup
            items={CONDITIONS}
            selected={conditions}
            onToggle={toggle(conditions, setConditions)}
          />

          <label className="pp-label" htmlFor="skill">
            Cooking Skill
          </label>

          <select
            id="skill"
            className="pp-select"
            value={skill}
            onChange={(event) => setSkill(event.target.value)}
          >
            {SKILLS.map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>

          <label className="pp-label" htmlFor="calories">
            Daily Calorie Goal (optional)
          </label>

          <input
            id="calories"
            className="pp-calories"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            placeholder="e.g., 2000"
            value={calories}
            onChange={(event) => setCalories(event.target.value)}
          />

          <button
            type="submit"
            className="auth-btn"
            disabled={loading || missingCredentials}
          >
            {loading ? 'Creating account...' : 'Complete Registration'}
          </button>
        </form>

        <p className="auth-switch" style={{ textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/login" className="auth-link-red">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterStep3;