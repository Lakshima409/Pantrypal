const DIETARY_OPTIONS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free'];
const COOK_TIME_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '15', label: 'Under 15 mins' },
  { value: '30', label: 'Under 30 mins' },
  { value: '60', label: 'Under 1 hour' },
];
const DIFFICULTY_OPTIONS = ['', 'easy', 'medium', 'hard'];

function FilterPanel({ filters, onFilterChange, onSearch }) {
  const update = (patch) => onFilterChange({ ...filters, ...patch });

  const toggleDietary = (option) => {
    const isSelected = filters.dietary.includes(option);
    update({
      dietary: isSelected
        ? filters.dietary.filter((item) => item !== option)
        : [...filters.dietary, option],
    });
  };

  const handleIngredientsChange = (value) => {
    update({
      ingredients: value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-5">
      <div>
        <h3 className="font-medium text-gray-800 mb-2">Dietary</h3>
        <div className="space-y-1">
          {DIETARY_OPTIONS.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-gray-600 capitalize">
              <input
                type="checkbox"
                checked={filters.dietary.includes(option)}
                onChange={() => toggleDietary(option)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              {option}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium text-gray-800 mb-2">Cook time</h3>
        <select
          value={filters.cookTime}
          onChange={(e) => update({ cookTime: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          {COOK_TIME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="font-medium text-gray-800 mb-2">Difficulty</h3>
        <select
          value={filters.difficulty}
          onChange={(e) => update({ difficulty: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          {DIFFICULTY_OPTIONS.map((option) => (
            <option key={option || 'any'} value={option}>
              {option ? option.charAt(0).toUpperCase() + option.slice(1) : 'Any difficulty'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="font-medium text-gray-800 mb-2">Ingredients</h3>
        <input
          type="text"
          value={filters.ingredients.join(', ')}
          onChange={(e) => handleIngredientsChange(e.target.value)}
          placeholder="e.g., chicken, rice"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <button
        onClick={() => onSearch({ preventDefault: () => {} })}
        className="w-full bg-orange-600 text-white py-2 rounded-md hover:bg-orange-700 transition"
      >
        Apply Filters
      </button>
    </div>
  );
}

export default FilterPanel;
