import { useState } from 'react';
import { Link } from 'react-router-dom';
import PantryPalLogo from '../components/PantryPalLogo';
import '../styles/auth.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch { /* mock API may not implement it — still confirm */ }
    setDone(true);
  };

  return (
    <div className="auth-bg">
      <div className="auth-card auth-card--narrow">
        <PantryPalLogo compact />
        <h1 style={{ fontSize: 26 }}>Reset Password</h1>
        <p className="auth-sub auth-sub--sm">
          {done ? `If an account exists for ${email}, a reset link is on its way.` : 'Enter your email and we will send you a reset link'}
        </p>
        {error && <div className="auth-err">{error}</div>}
        {!done && (
          <form onSubmit={handleSubmit}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit" className="auth-btn">Send Reset Link</button>
          </form>
        )}
        <p className="auth-switch"><Link to="/login" className="auth-link-red">Back to Login</Link></p>
      </div>
    </div>
  );
}

export default ForgotPassword;
