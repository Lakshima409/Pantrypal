import { Link, useLocation } from 'react-router-dom';

function Footer() {
  const { pathname } = useLocation();
  const is = (p) => (pathname === p || pathname.startsWith(p + '/') ? 'active' : '');
  return (
    <footer className="pp-footer">
      <div className="pp-footer-inner">
        <div>
          <h3>Join with Us</h3>
          <div className="brand"><img src="/assets/pantrypal-logo.png" alt="PantryPal" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'contain', background: '#fff8e8' }} /> PantryPal</div>
          <p className="desc">Get the latest smart cooking tips, AI recipe updates, and exclusive features straight to your inbox.</p>
          <form className="pp-subrow" onSubmit={(e) => e.preventDefault()}>
            <input placeholder="Enter Your Email" />
            <button type="submit">Subscribe</button>
          </form>
        </div>
        <div>
          <h4>Quick Links</h4>
          <Link to="/" className={is('/') && pathname === '/' ? 'active' : ''}>Home</Link>
          <Link to="/recipes-generator" className={pathname.startsWith('/recipes-generator') || pathname.startsWith('/recipes') ? 'active' : ''}>Recipes Generate</Link>
          <Link to="/mealplan" className={is('/mealplan')}>Smart meal planner</Link>
          <Link to="/shopping-list" className={is('/shopping-list')}>Shopping List</Link>
        </div>
        <div>
          <h4>Contact us</h4>
          <div className="pp-social"><span>f</span><span>🐦</span><span>📷</span></div>
        </div>
      </div>
      <div className="pp-copy">Copyrights© 2025 PantryPal. All rights reserved.</div>
    </footer>
  );
}

export default Footer;
