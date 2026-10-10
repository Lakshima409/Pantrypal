/* REBUILT-2-disabled */


import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import RecipeCard from '../components/RecipeCard';

function Favorites() {
  const { user } = useUser();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    
    const fetchFavorites = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/recipes/favorites', {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (response.ok) {
          setFavorites(data);
        } else {
          setError(data.message || 'Failed to fetch favorites');
        }
      } catch (err) {
        setError('An error occurred while fetching favorites');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  const handleRemoveFavorite = async (recipeId) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/favorite`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setFavorites(prev => prev.filter(recipe => recipe.id !== recipeId));
      }
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  return (
    <div className="text-center mt-10">
      <h1 className="text-4xl font-bold text-orange-600">Favorites Page</h1>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Favorite Recipes</h1>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">{error}</div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {user ? 'You have no favorite recipes yet' : 'Please log in to view your favorites'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map(recipe => (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                isFavorite={true}
                onRemoveFavorite={() => handleRemoveFavorite(recipe.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Favorites;