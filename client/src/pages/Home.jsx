import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/pantrypal.css';

const HERO = '/assets/italian-spread-Y6a.jpg';

// Real local food photos used only if the trending API is unreachable, so the
// section is never empty.
const FALLBACK = [
  { id: 'f1', title: 'Italian Spread', image: '/assets/italian-spread-Y6a.jpg' },
  { id: 'f2', title: 'Pizza, Sand & Pasta', image: '/assets/pizza-sand-pasta-haH.jpg' },
  { id: 'f3', title: 'Wooden Table Feast', image: '/assets/pizza-wooden-table.jpg' },
];

function Home() {
  const [recipes, setRecipes] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/recipes/trending', { credentials: 'include' });
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.recipes || data.recommendations || [];
        if (alive && res.ok && list.length) {
          setRecipes(list.slice(0, 6));
        }
      } catch {
        // keep the local fallback on any network error
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="pp-page">
      <header className="pp-hero">
        <img className="pp-hero-bg" src={HERO} alt="" />
        <div className="pp-hero-inner">
          <h1>Smart Cooking Starts in <span className="coral">Your Pantry</span></h1>
          <p>Add Your Ingredients and Let AI Serve the Perfect Recipe</p>
          <div style={{ marginTop: 26 }}>
            <Link to="/recipes-generator" className="pp-btn-coral">Start Suggesting Recipes <span>✦</span></Link>
          </div>
        </div>
      </header>

      <div className="pp-title-rule"><h2>Most Popular Recipes</h2></div>
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {loading && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#9a8a7e', padding: 20 }}>Finding popular recipes…</div>
        )}
        {!loading && recipes.map((r) => (
          <article key={r.id} className="pp-card-food">
            <img src={r.image} alt={r.title || 'Recipe'} />
            <button className="heart" aria-label="favorite">♡</button>
            <div className="lbl">{r.title || 'Recipe'}</div>
            <Link to={`/recipes/${r.id}`} className="view" style={{ textDecoration: 'none', display: 'block' }}>View Recipe</Link>
          </article>
        ))}
      </section>
      <style>{`@media (max-width: 860px){.pp-page section{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}

export default Home;


