/* DISABLED-BELOW-CONT

/* REBUILT-FILE-OK-disabled */

import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';

function ShoppingList() {
  const { user } = useUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (!user) return;
    
    const fetchShoppingList = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/shoppinglist');
        const data = await response.json();
        
        if (response.ok) {
          setItems(data);
        } else {
          setError(data.message || 'Failed to fetch shopping list');
        }
      } catch (err) {
        setError('An error occurred while fetching shopping list');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchShoppingList();
  }, [user]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    
    try {
      const response = await fetch('/api/shoppinglist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newItem }),
        credentials: 'include'
      });
      
      const data = await response.json();
      if (response.ok) {
        setItems(prev => [...prev, data]);
        setNewItem('');
      }
    } catch (err) {
      console.error('Error adding item:', err);
    }
  };

  const handleToggleItem = async (itemId, completed) => {
    try {
      const response = await fetch(`/api/shoppinglist/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: !completed }),
        credentials: 'include'
      });
      
      if (response.ok) {
        setItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, completed: !completed } : item
        ));
      }
    } catch (err) {
      console.error('Error toggling item:', err);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      const response = await fetch(`/api/shoppinglist/${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setItems(prev => prev.filter(item => item.id !== itemId));
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  return (
    <div className="text-center mt-10">
      <h1 className="text-4xl font-bold text-orange-600">ShoppingList Page</h1>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Shopping List</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleAddItem} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add an item..."
              className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <button
              type="submit"
              className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 transition"
            >
              Add
            </button>
          </form>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-8">{error}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Your shopping list is empty</div>
          ) : (
            <ul className="space-y-3">
              {items.map(item => (
                <li key={item.id} className="flex items-center group">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleItem(item.id, item.completed)}
                    className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-3"
                  />
                  <span className={`flex-grow ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.name}
                    {item.amount && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({item.amount} {item.unit})
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShoppingList;