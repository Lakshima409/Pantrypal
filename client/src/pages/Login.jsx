import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useUser } from '../context/UserContext';
import PantryPalLogo from '../components/PantryPalLogo';
import '../styles/auth.css';

function Login() {
  const { login } = useUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState('Kavi5@gmail.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        login(data.user || { name: email.split('@')[0], email });
        navigate('/');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <PantryPalLogo />
        <h1>Welcome Back!</h1>
        <p className="auth-sub">Please Login to continue</p>
        {error && <div className="auth-err">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" className="auth-btn" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
        </form>
        <Link to="/forgot-password" className="auth-link-red auth-forgot">Forgot Password?</Link>
        <p className="auth-switch">No account yet? <Link to="/register" className="auth-link-red">Register Here</Link></p>
      </div>
    </div>
  );
}

export default Login;

