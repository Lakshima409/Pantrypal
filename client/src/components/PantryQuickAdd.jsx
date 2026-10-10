import { useState } from 'react';
import { usePantry } from '../context/PantryContext';

function PantryQuickAdd() {
  const { addPantryItem } = usePantry();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [added, setAdded] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    await addPantryItem({
      name: name.trim(),
      quantity: quantity.trim() || '1',
      category: 'other',
      expiryDate: '',
    });

    setName('');
    setQuantity('');
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow-md p-4 mb-8 flex flex-col md:flex-row gap-3 items-end"
    >
      <div className="flex-grow w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quick add to pantry
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., tomatoes"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      <div className="w-full md:w-32">
        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
        <input
          type="text"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="e.g., 2"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      <button
        type="submit"
        className="w-full md:w-auto bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 transition"
      >
        Add
      </button>

      {added && <span className="text-green-600 text-sm pb-2">Added!</span>}
    </form>
  );
}

export default PantryQuickAdd;
