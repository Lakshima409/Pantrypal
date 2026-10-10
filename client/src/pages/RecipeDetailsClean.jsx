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

function RecipeDetailsClean() {
  return (
    <div className="pp-page">
      <header className="pp-hero">
        <img className="pp-hero-bg" src={HERO} alt="" />
        <div className="pp-hero-inner">
          <h1>Cook Your <span className="coral">Favorite Dish</span></h1>
          <p>Step-by-step instructions matched to your pantry.</p>
        </div>
      </header>
      <div className="pp-title-rule"><h2>Recipe Details</h2></div>
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        <img src={PH[0]} alt="Recipe" style={{ width: '100%', borderRadius: 10 }} />
        <div>
          <h3 style={{ fontFamily: 'Georgia, serif', margin: '0 0 10px' }}>Recipe Name</h3>
          <p style={{ fontSize: 13.5, color: '#4b3a2d' }}>⏱ 30 min &nbsp; • &nbsp; 🍽 4 servings &nbsp; • &nbsp; ★★★★☆</p>
          <h4 style={{ fontFamily: 'Georgia, serif', margin: '18px 0 8px' }}>Ingredients</h4>
          <ul style={{ fontSize: 13.5, lineHeight: 1.9, paddingLeft: 18 }}>
            <li>Chicken breast — 500g</li>
            <li>Onion, garlic, spices</li>
            <li>Olive oil, salt</li>
          </ul>
          <h4 style={{ fontFamily: 'Georgia, serif', margin: '18px 0 8px' }}>Instructions</h4>
          <ol style={{ fontSize: 13.5, lineHeight: 1.9, paddingLeft: 18 }}>
            <li>Prep ingredients and preheat pan.</li>
            <li>Cook chicken until golden, add spices.</li>
            <li>Serve hot with your favorite side.</li>
          </ol>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <Link to="/mealplan" className="pp-btn-coral" style={{ boxShadow: 'none' }}>Add to Meal Plan</Link>
            <Link to="/shopping-list" className="pp-btn-coral" style={{ boxShadow: 'none', background: '#240d04' }}>Add Missing to Shopping List</Link>
          </div>
        </div>
      </section>
      <div className="pp-title-rule"><h2>You May Also Like</h2></div>
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px 10px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {PH.slice(1, 4).map((src, i) => (
          <article key={i} className="pp-card-food">
            <img src={src} alt="Recipe" />
            <button className="heart">♡</button>
            <div className="lbl">Recipe Name</div>
            <Link to="/recipes" className="view" style={{ textDecoration: 'none', display: 'block' }}>View Recipe</Link>
          </article>
        ))}
      </section>
    </div>
  );
}
export default RecipeDetailsClean;
