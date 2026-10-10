import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/pantrypal.css';

const PH = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
];

const INITIAL_INGREDIENTS = ['Tomatoes', 'Tomatoes', 'Butter', 'Tomatoes'];

// Offline fallback so the page is never empty if the API is unreachable.
const FALLBACK = [
  { id: 'recipe-1', title: 'Quick Fried Butter', ing: 1, kcal: 3, img: PH[0] },
  { id: 'recipe-2', title: 'Classic Cheese Burger', ing: 1, kcal: 3, img: PH[1] },
  { id: 'recipe-3', title: 'Authentic Onion Tacos', ing: 1, kcal: 3, img: PH[2] },
  { id: 'recipe-4', title: 'Gourmet Steamed Thyme', ing: 1, kcal: 3, img: PH[3] },
  { id: 'recipe-5', title: 'Easy Lemon Salad', ing: 1, kcal: 3, img: PH[4] },
];

function RecipeSearchClean() {
  const [ingredients, setIngredients] = useState(INITIAL_INGREDIENTS);
  const [recipes, setRecipes] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const remove = (i) => setIngredients((prev) => prev.filter((_, idx) => idx !== i));

  // Load real, personalised recommendations (score / pantry-match from the API).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/recipes/recommended', { credentials: 'include' });
        const data = await res.json().catch(() => []);
        const list = Array.isArray(data) ? data : data.recipes || data.recommendations || [];
        if (!alive) return;
        if (res.ok && list.length) {
          setRecipes(list.map((r) => ({
            id: r.id || r.recipe_id,
            title: r.title || 'Recipe',
            img: r.image || r.imageUrl,
            ing: (r.ingredients || []).length,
            kcal: r.nutrition ? Math.round(r.nutrition.calories || 0) : null,
            score: r.score,
            pantryMatch: r.pantryMatch,
          })));
          setUsingFallback(false);
        } else {
          setUsingFallback(true);
        }
      } catch {
        if (alive) setUsingFallback(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="pp-page rs-page">
      <div className="rs-wrap">
        <div className="rs-ing-row">
          <span className="rs-ing-label">Based on your ingredients</span>
          <div className="rs-pills">
            {ingredients.map((ing, i) => (
              <button key={i} type="button" className="rs-pill" onClick={() => remove(i)}>
                {ing}<span className="rs-pill-x">×</span>
              </button>
            ))}
          </div>
        </div>

        {loading && <p style={{ textAlign: 'center', color: '#9a8a7e', padding: 24 }}>Finding recipes for you…</p>}
        {!loading && usingFallback && (
          <p style={{ textAlign: 'center', color: '#b91c1c', fontSize: 12.5, marginBottom: 12 }}>
            Showing sample recipes — sign in for personalised recommendations.
          </p>
        )}

        <div className="rs-grid">
          {recipes.map((r) => (
            <div key={r.id} className="rs-card">
              <Link to={`/recipes/${r.id}`} className="rs-card-link">
                <img className="rs-card-img" src={r.img} alt={r.title} />
                <div className="rs-card-body">
                  <div className="rs-card-title">{r.title}</div>
                  <div className="rs-card-meta">
                    {r.ing} ingredients{r.kcal != null ? ` • ${r.kcal} kcal` : ''}
                    {typeof r.pantryMatch === 'number' ? ` • ${Math.round(r.pantryMatch * 100)}% pantry match` : ''}
                  </div>
                </div>
              </Link>
              <button type="button" className="rs-heart" aria-label="Save recipe">♡</button>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .rs-wrap { max-width: 1120px; margin: 0 auto; padding: 28px 24px 48px; }
        .rs-ing-row { margin-bottom: 22px; }
        .rs-ing-label { display: block; font-size: 14px; font-weight: 600; color: #3a2a20; margin-bottom: 12px; }
        .rs-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .rs-pill { display: inline-flex; align-items: center; gap: 8px; background: #f2542d; color: #fff; border: none; border-radius: 999px; padding: 6px 12px; font-size: 12.5px; font-weight: 500; cursor: pointer; }
        .rs-pill:hover { background: #d9431f; }
        .rs-pill-x { font-size: 15px; line-height: 1; opacity: .9; }
        .rs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
        .rs-card { position: relative; display: flex; align-items: center; background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.05); transition: box-shadow .15s, transform .15s; }
        .rs-card:hover { box-shadow: 0 6px 18px rgba(0,0,0,.1); transform: translateY(-2px); }
        .rs-card-link { display: flex; align-items: center; gap: 14px; text-decoration: none; flex: 1; min-width: 0; }
        .rs-card-img { width: 72px; height: 72px; border-radius: 10px; object-fit: cover; flex-shrink: 0; }
        .rs-card-body { min-width: 0; }
        .rs-card-title { font-size: 14.5px; font-weight: 700; color: #2b1c12; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rs-card-meta { font-size: 12px; color: #9a8a7e; margin-top: 4px; }
        .rs-heart { position: absolute; top: 10px; right: 12px; background: none; border: none; font-size: 18px; color: #cfc6bf; cursor: pointer; line-height: 1; }
        .rs-heart:hover { color: #f2542d; }
        @media (max-width: 640px){ .rs-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

export default RecipeSearchClean;
