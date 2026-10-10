import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PantryPalLogo from '../components/PantryPalLogo';
import '../styles/auth.css';

function RegisterStep2() {
  const navigate = useNavigate();
  const location = useLocation();
  const storedEmail = (() => {
    try { return sessionStorage.getItem('pp_register_email') || ''; } catch { return ''; }
  })();
  const email = location.state?.email || storedEmail || 'User3@gmail.com';

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const handleContinue = (e) => {
    e.preventDefault();
    if (!fullName || !password || !confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError('Password must include upper & lower case letters and a number.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    try {
      sessionStorage.setItem('pp_register_email', email);
      sessionStorage.setItem('pp_register_name', fullName);
      sessionStorage.setItem('pp_register_password', password);
    } catch { /* ignore */ }
    navigate('/register/step3', { state: { email, fullName, password } });
  };

  return (
    <div className="auth-bg">
      <div className="auth-card auth-card--narrow">
        <PantryPalLogo compact />
        <div className="auth-steps"><span className="active" /><span className="active" /><span /></div>
        <h1 style={{ fontSize: 26 }}>Finish Creating Your Account</h1>
        <p className="auth-sub auth-sub--sm">Email: {email}</p>
        {error && <div className="auth-err">{error}</div>}
        <form onSubmit={handleContinue}>
          <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input type="password" placeholder="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button type="submit" className="auth-btn">Register</button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login" className="auth-link-red">Login</Link></p>
      </div>
    </div>
  );
}

export default RegisterStep2;
