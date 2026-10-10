import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PantryPalLogo from '../components/PantryPalLogo';
import '../styles/auth.css';

function RegisterStep1() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleContinue = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    try {
      sessionStorage.setItem('pp_register_email', email);
    } catch { /* ignore */ }
    navigate('/register/step2', { state: { email } });
  };

  return (
    <div className="auth-bg">
      <div className="auth-card auth-card--narrow">
        <PantryPalLogo compact />
        <div className="auth-steps"><span className="active" /><span /><span /></div>
        <h1 style={{ fontSize: 26 }}>Create Your Account</h1>
        <p className="auth-sub auth-sub--sm">Please enter your email to get started</p>
        {error && <div className="auth-err">{error}</div>}
        <form onSubmit={handleContinue}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className="auth-btn">Continue</button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login" className="auth-link-red">Login</Link></p>
      </div>
    </div>
  );
}

export default RegisterStep1;
