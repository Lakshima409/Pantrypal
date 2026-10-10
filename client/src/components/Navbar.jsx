import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import '../styles/navbar.css';

const LINKS = [
  { to: '/', label: 'Home', match: ['/'] },
  { to: '/recipes-generator', label: 'Recipes', match: ['/recipes-generator', '/recipes'] },
  { to: '/mealplan', label: 'Diet Plan', match: ['/mealplan'] },
  { to: '/shopping-list', label: 'Shopping List', match: ['/shopping-list'] },
  { to: '/profile', label: 'Profile', match: ['/profile'] },
];

function Navbar() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = (paths) =>
    paths.some((p) => (p === '/' ? pathname === '/' : pathname.startsWith(p)));

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="rg-nav">
      <div className="rg-nav-inner">
        <Link to="/" className="rg-brand">
          <img src="/assets/pantrypal-logo.png" alt="PantryPal" draggable={false} />
          <span>PantryPal</span>
        </Link>
        <div className="rg-links">
          {LINKS.map((l) => (
            <Link key={l.label} to={l.to} className={isActive(l.match) ? 'active' : ''}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="rg-nav-right">
          <Link to="/favorites" className="rg-nav-fav" title="Favorites" aria-label="Favorites">♡</Link>
          {user ? (
            <>
              <Link to="/profile" className="rg-nav-avatar" title="Profile">{(user.name || 'U')[0].toUpperCase()}</Link>
              <button type="button" className="rg-nav-logout" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <Link to="/login" className="rg-nav-icon" title="Account" aria-label="Account">👤</Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;



