export default function RecipeSearchLegacyDisabled() { return null; }
/* DISABLED-BELOW

const PH = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=700&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=700&q=80',
  'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=700&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=700&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=700&q=80',
];
function RecipeSearchNew() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ dietary: [], cookTime: '', difficulty: '', ingredients: [] });
  const navigate = useNavigate();
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() && filters.dietary.length === 0) return;
    try {
      setLoading(true); setError('');
      const qp = new URLSearchParams();
      if (searchQuery) qp.append('query', searchQuery);
      if (filters.dietary.length) qp.append('dietary', filters.dietary.join(','));
      if (filters.cookTime) qp.append('cookTime', filters.cookTime);
      if (filters.difficulty) qp.append('difficulty', filters.difficulty);
      const res = await fetch(`/api/recipes/search?${qp.toString()}`);
      const data = await res.json().catch(() => []);
      if (res.ok) setRecipes(Array.isArray(data) ? data : data.recipes || []);
      else setError(data.message || 'Failed to fetch recipes');
    } catch { setError('Search failed. Showing popular recipes.'); }
    finally { setLoading(false); }
  };
  const list = recipes.length ? recipes : PH.map((img, i) => ({ id: 'ph-' + i, title: 'Recipe Name', image: img }));
  return (
    <div className="pp-page">
      <header className="pp-hero">
        <img className="pp-hero-bg" src={HERO2} alt="" />
        <div className="pp-hero-inner">
          <h1>Find Your Perfect <span className="coral">Recipe</span></h1>
          <p>Search by name, diet or cook time. Our AI matches dishes to your pantry.</p>
          <form onSubmit={handleSearch} style={{ marginTop: 22, display: 'flex', gap: 10, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search for recipes..."
              style={{ flex: 1, height: 44, borderRadius: 8, border: '1px solid #ff6b4a', padding: '0 14px', fontSize: 13 }} />
            <button type="submit" className="pp-btn-coral" style={{ boxShadow: 'none' }}>Search</button>
          </form>
        </div>
      </header>
      <div className="pp-title-rule"><h2>Generated Recipes For You</h2></div>
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #7c2d0e', borderRadius: 8, padding: 16, height: 'fit-content' }}>
          <FilterPanel filters={filters} onFilterChange={setFilters} onSearch={handleSearch} />
        </div>
        <div>
          {loading && <p style={{ textAlign: 'center' }}>Loading...</p>}
          {error && <p style={{ textAlign: 'center', color: '#b91c1c' }}>{error}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {list.map((r, i) => (
              <article key={r.id || i} className="pp-card-food">
                <img src={r.image || r.imageUrl || PH[i % PH.length]} alt={r.title || 'Recipe'} />
                <button className="heart" aria-label="fav">♡</button>
                <div className="lbl">{r.title || r.name || 'Recipe Name'}</div>
                <Link to={String(r.id).startsWith('ph-') ? '/recipes/ph-' + i : `/recipes/${r.id}`} className="view" style={{ textDecoration: 'none', display: 'block' }}>View Recipe</Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <style>{`@media (max-width:900px){.pp-page section{grid-template-columns:1fr !important}.pp-page section div div{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}
export default RecipeSearchNew;


import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import FilterPanel from '../components/FilterPanel';

function RecipeSearchLegacy() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
__OLD_CODE_COMMENT_END__ */

    dietary: [],
    cookTime: '',
    difficulty: '',
    ingredients: []
  });
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      setError('');
      
      const queryParams = new URLSearchParams();
      queryParams.append('query', searchQuery);
      
      if (filters.dietary.length > 0) {
        queryParams.append('dietary', filters.dietary.join(','));
      }
      if (filters.cookTime) {
        queryParams.append('cookTime', filters.cookTime);
      }
      if (filters.difficulty) {
        queryParams.append('difficulty', filters.difficulty);
      }
      if (filters.ingredients.length > 0) {
        queryParams.append('ingredients', filters.ingredients.join(','));
      }
      
      const response = await fetch(`/api/recipes/search?${queryParams.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setRecipes(data);
      } else {
        setError(data.message || 'Failed to fetch recipes');
      }
    } catch (err) {
      setError('An error occurred while searching for recipes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleRecipeClick = (recipeId) => {
    navigate(`/recipes/${recipeId}`);
  };

  return (
    <div className="text-center mt-10">
      <h1 className="text-4xl font-bold text-orange-600">RecipeSearch Page</h1>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Recipe Search</h1>
        
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/4">
            <FilterPanel 
              filters={filters} 
              onFilterChange={handleFilterChange} 
              onSearch={handleSearch}
            />
          </div>
          
          <div className="lg:w-3/4">
            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for recipes..."
                  className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <button
                  type="submit"
                  className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 transition"
                >
                  Search
                </button>
              </div>
            </form>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 text-center py-8">{error}</div>
            ) : recipes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchQuery 
                  ? 'No recipes found matching your criteria' 
                  : 'Enter a search term to find recipes'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map(recipe => (
                  <RecipeCard 
                    key={recipe.id} 
                    recipe={recipe} 
                    onClick={() => handleRecipeClick(recipe.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* legacy-export-disabled export default RecipeSearchLegacy; */