/* REBUILT-OK-disabled */

import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import MealDay from '../components/MealDay';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

function MealPlan() {
  const { user } = useUser();
  const [mealPlan, setMealPlan] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [shoppingList, setShoppingList] = useState([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchMealPlan = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/mealplan?week=${currentWeek}`);
        const data = await response.json();
        
        if (response.ok) {
          setMealPlan(data.mealPlan);
          setShoppingList(data.shoppingList || []);
        } else {
          setError(data.message || 'Failed to fetch meal plan');
        }
      } catch (err) {
        setError('An error occurred while fetching meal plan');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMealPlan();
  }, [user, currentWeek]);

  const handleWeekChange = (direction) => {
    setCurrentWeek(prev => direction === 'next' ? prev + 1 : prev - 1);
  };

  const handleRemoveMeal = async (day, mealId) => {
    try {
      const response = await fetch(`/api/mealplan/${mealId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setMealPlan(prev => ({
          ...prev,
          [day]: prev[day].filter(meal => meal.id !== mealId)
        }));
      }
    } catch (err) {
      console.error('Error removing meal:', err);
    }
  };

  const generateShoppingList = async () => {
    try {
      const response = await fetch('/api/shoppinglist/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mealPlan }),
        credentials: 'include'
      });
      
      const data = await response.json();
      if (response.ok) {
        setShoppingList(data.shoppingList);
      }
    } catch (err) {
      console.error('Error generating shopping list:', err);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="text-center mt-10">
      <h1 className="text-4xl font-bold text-orange-600">MealPlan Page</h1>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Meal Plan</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleWeekChange('prev')}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
              disabled={currentWeek === 0}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <span className="font-medium">
              Week {currentWeek + 1}
            </span>
            <button
              onClick={() => handleWeekChange('next')}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 mb-8">
              {days.map(day => (
                <MealDay 
                  key={day}
                  day={day}
                  meals={mealPlan[day] || []}
                  onRemoveMeal={(mealId) => handleRemoveMeal(day, mealId)}
                />
              ))}
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Shopping List</h2>
                <button
                  onClick={generateShoppingList}
                  className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition"
                >
                  Regenerate List
                </button>
              </div>
              
              {shoppingList.length === 0 ? (
                <p className="text-gray-500">Your shopping list is empty. Add meals to your plan or regenerate the list.</p>
              ) : (
                <ul className="space-y-2">
                  {shoppingList.map((item, index) => (
                    <li key={index} className="flex items-center">
                      <input 
                        type="checkbox" 
                        id={`item-${index}`}
                        className="mr-3 h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <label htmlFor={`item-${index}`} className="flex-grow">
                        <span className="font-medium">{item.amount} {item.unit}</span> {item.name}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MealPlan;