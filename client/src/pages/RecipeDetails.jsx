import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { usePantry } from '../context/PantryContext';
import { StarIcon, ClockIcon, UserGroupIcon, BookmarkIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import IngredientMatchIndicator from '../components/IngredientMatchIndicator';

function RecipeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { pantryItems } = usePantry();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [servings, setServings] = useState(1);
  const [missingIngredients, setMissingIngredients] = useState([]);
  const [substitutions, setSubstitutions] = useState([]);

  const checkIngredients = useCallback((recipeIngredients) => {
    const missing = [];
    const pantryItemNames = pantryItems.map(item => item.name.toLowerCase());
    
    recipeIngredients.forEach(ingredient => {
      const normalizedIngredient = ingredient.name.toLowerCase();
      if (!pantryItemNames.some(item => item.includes(normalizedIngredient) || normalizedIngredient.includes(item))) {
        missing.push(ingredient);
      }
    });
    
    setMissingIngredients(missing);
    fetchSubstitutions(missing);
  }, [pantryItems]);

  const fetchSubstitutions = async (missing) => {
    if (missing.length === 0) return;
    
    try {
      const response = await fetch('/api/recipes/substitutions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients: missing.map(i => i.name) })
      });
      
      const data = await response.json();
      if (response.ok) {
        setSubstitutions(data.substitutions);
      }
    } catch (err) {
      console.error('Error fetching substitutions:', err);
    }
  };

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/recipes/${id}`, { credentials: 'include' });
        let data;
        try {
          data = await response.json();
        } catch (jsonErr) {
          const text = await response.text().catch(() => '');
          console.error('Failed to parse recipe response:', jsonErr, text);
          setError('The recipe could not be loaded. Please refresh and try again.');
          return;
        }

        if (response.ok) {
          setRecipe(data.recipe);
          setIsFavorite(data.isFavorite);
          setServings(data.recipe.servings || 1);
          checkIngredients(data.recipe.ingredients);
        } else {
          setError(data.message || 'Recipe not found.');
        }
      } catch (err) {
        setError('An error occurred while fetching the recipe');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id, checkIngredients]);

  const toggleFavorite = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      const response = await fetch(`/api/recipes/${id}/favorite`, {
        method: isFavorite ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        setIsFavorite(!isFavorite);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const addToMealPlan = async (day) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      const response = await fetch('/api/mealplan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipeId: id, day }),
        credentials: 'include'
      });
      
      if (response.ok) {
        alert('Recipe added to your meal plan!');
      }
    } catch (err) {
      console.error('Error adding to meal plan:', err);
    }
  };

  const addToShoppingList = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      const response = await fetch('/api/shoppinglist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          items: missingIngredients.map(ing => ({
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit
          }))
        }),
        credentials: 'include'
      });
      
      if (response.ok) {
        alert('Missing ingredients added to your shopping list!');
      }
    } catch (err) {
      console.error('Error adding to shopping list:', err);
    }
  };

  const adjustServings = (newServings) => {
    if (newServings < 1) return;
    setServings(newServings);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-gray-500">
        Recipe not found
      </div>
    );
  }

  const scaledIngredients = recipe.ingredients.map(ing => ({
    ...ing,
    amount: ing.amount ? (ing.amount * servings / recipe.servings).toFixed(2) : null
  }));

  return (
    <div className="text-center mt-10">
      <h1 className="text-4xl font-bold text-orange-600">RecipeDetails Page</h1>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-2/3">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <img 
                src={recipe.image || '/placeholder-recipe.jpg'} 
                alt={recipe.title} 
                className="w-full h-64 object-cover"
              />
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h1 className="text-3xl font-bold text-gray-800">{recipe.title}</h1>
                  <button
                    onClick={toggleFavorite}
                    className={`p-2 rounded-full ${isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`}
                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <StarIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center text-gray-600">
                    <ClockIcon className="h-5 w-5 mr-1" />
                    <span>{recipe.cookTime} mins</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <UserGroupIcon className="h-5 w-5 mr-1" />
                    <span>{servings} serving{servings !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span>Difficulty: {recipe.difficulty}</span>
                  </div>
                </div>
                
                <div className="mb-6">
                  <IngredientMatchIndicator 
                    total={recipe.ingredients.length} 
                    matched={recipe.ingredients.length - missingIngredients.length} 
                  />
                </div>
                
                <p className="text-gray-700 mb-6">{recipe.description}</p>
                
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 flex justify-between items-center">
                    Ingredients
                    <div className="flex items-center">
                      <button 
                        onClick={() => adjustServings(servings - 1)}
                        className="px-2 py-1 bg-gray-200 rounded-l-md"
                        disabled={servings <= 1}
                      >
                        -
                      </button>
                      <span className="px-4 py-1 bg-gray-100">{servings}</span>
                      <button 
                        onClick={() => adjustServings(servings + 1)}
                        className="px-2 py-1 bg-gray-200 rounded-r-md"
                      >
                        +
                      </button>
                    </div>
                  </h2>
                  <ul className="space-y-2">
                    {scaledIngredients.map((ingredient, index) => {
                      const isMissing = missingIngredients.some(i => i.name === ingredient.name);
                      return (
                        <li 
                          key={index} 
                          className={`flex items-start ${isMissing ? 'text-red-500' : 'text-gray-700'}`}
                        >
                          <span className="mr-2">•</span>
                          <span>
                            {ingredient.amount && `${ingredient.amount} ${ingredient.unit} `}
                            {ingredient.name}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  
                  {missingIngredients.length > 0 && (
                    <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                      <h3 className="font-medium text-yellow-800 mb-2">Missing Ingredients</h3>
                      <p className="text-yellow-700 mb-3">
                        You're missing {missingIngredients.length} ingredient{missingIngredients.length !== 1 ? 's' : ''} for this recipe.
                      </p>
                      
                      {substitutions.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium text-yellow-800 mb-1">Suggested Substitutions:</h4>
                          <ul className="list-disc pl-5 text-yellow-700">
                            {substitutions.map((sub, idx) => (
                              <li key={idx}>
                                <span className="font-medium">{sub.original}</span> → {sub.substitutes.join(', ')}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <button
                        onClick={addToShoppingList}
                        className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
                      >
                        <ShoppingCartIcon className="h-5 w-5" />
                        Add missing items to shopping list
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">Instructions</h2>
                  <ol className="space-y-4">
                    {recipe.instructions.map((step, index) => (
                      <li key={index} className="flex">
                        <span className="flex-shrink-0 bg-orange-100 text-orange-800 font-bold rounded-full h-8 w-8 flex items-center justify-center mr-3">
                          {index + 1}
                        </span>
                        <span className="text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:w-1/3">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Recipe Actions</h2>
              
              <div className="space-y-4">
                <button
                  onClick={toggleFavorite}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md ${isFavorite ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'} hover:bg-gray-200 transition`}
                >
                  <BookmarkIcon className="h-5 w-5" />
                  {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </button>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Add to Meal Plan:</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <button
                        key={day}
                        onClick={() => addToMealPlan(day)}
                        className="py-2 px-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition text-sm"
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-medium mb-2">Nutrition Information (per serving)</h3>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-gray-100 p-2 rounded text-center">
                      <div className="font-medium">{recipe.nutrition?.calories || 'N/A'}</div>
                      <div className="text-gray-500">Calories</div>
                    </div>
                    <div className="bg-gray-100 p-2 rounded text-center">
                      <div className="font-medium">{recipe.nutrition?.protein || 'N/A'}g</div>
                      <div className="text-gray-500">Protein</div>
                    </div>
                    <div className="bg-gray-100 p-2 rounded text-center">
                      <div className="font-medium">{recipe.nutrition?.carbs || 'N/A'}g</div>
                      <div className="text-gray-500">Carbs</div>
                    </div>
                    <div className="bg-gray-100 p-2 rounded text-center">
                      <div className="font-medium">{recipe.nutrition?.fat || 'N/A'}g</div>
                      <div className="text-gray-500">Fat</div>
                    </div>
                    <div className="bg-gray-100 p-2 rounded text-center">
                      <div className="font-medium">{recipe.nutrition?.fiber || 'N/A'}g</div>
                      <div className="text-gray-500">Fiber</div>
                    </div>
                    <div className="bg-gray-100 p-2 rounded text-center">
                      <div className="font-medium">{recipe.nutrition?.sugar || 'N/A'}g</div>
                      <div className="text-gray-500">Sugar</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecipeDetails;