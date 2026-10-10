import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

function RecipeCard({ recipe, isFavorite = false, onRemoveFavorite, onClick }) {
  const navigate = useNavigate();
  const [imgOk, setImgOk] = useState(true);

  if (!recipe) return null;

  const handleClick = () => {
    if (onClick) {
      onClick(recipe.id);
    } else {
      navigate(`/recipes/${recipe.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
    >
      <div className="h-40 bg-orange-100 flex items-center justify-center overflow-hidden">
        {recipe.image && imgOk ? (
          <img
            src={recipe.image}
            alt={recipe.title}
            onError={() => setImgOk(false)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl">🍽️</span>
        )}
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="font-semibold text-gray-800">{recipe.title || 'Recipe'}</h3>
          {typeof recipe.rating === 'number' && (
            <span className="text-yellow-500 text-sm whitespace-nowrap">
              ★ {recipe.rating.toFixed(1)}
            </span>
          )}
        </div>

        {recipe.description && (
          <p className="text-sm text-gray-500 mb-3 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {recipe.description}
          </p>
        )}

        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>{recipe.cookTime} mins</span>
          <span className="capitalize">{recipe.difficulty}</span>
        </div>

        {onRemoveFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveFavorite();
            }}
            className="mt-3 w-full text-sm bg-red-50 text-red-600 py-2 rounded-md hover:bg-red-100 transition"
          >
            Remove from favorites
          </button>
        )}

        {!onRemoveFavorite && isFavorite && (
          <div className="mt-3 text-sm text-yellow-600 text-center">★ In your favorites</div>
        )}
      </div>
    </div>
  );
}

export default RecipeCard;
