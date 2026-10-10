import { Link } from 'react-router-dom';
import '../styles/pantrypal.css';
const HERO = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1800&q=80';
const PH = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=700&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=700&q=80',
  'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=700&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=700&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=700&q=80',
];
function FavoritesClean() {
  return (
    <div className="pp-page">
      <header className="pp-hero">
        <img className="pp-hero-bg" src={HERO} alt="" />
        <div className="pp-hero-inner">
          <h1>Your Favorite <span className="coral">Recipes</span></h1>
          <p>All the dishes you loved, saved in one place.</p>
        </div>
      </header>
      <div className="pp-title-rule"><h2>Saved Favorites</h2></div>
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {PH.map((src, i) => (
          <article key={i} className="pp-card-food">
            <img src={src} alt="Recipe" />
            <button className="heart" style={{ color: '#ff6b4a' }}>♥</button>
            <div className="lbl">Recipe Name</div>
            <Link to="/recipes" className="view" style={{ textDecoration: 'none', display: 'block' }}>View Recipe</Link>
          </article>
        ))}
      </section>
      <style>{`@media (max-width:900px){.pp-page section{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}
export default FavoritesClean;
