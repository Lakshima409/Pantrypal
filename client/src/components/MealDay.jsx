function MealDay({ day, meals = [], onRemoveMeal }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="font-semibold text-gray-800 mb-3 text-center">{day}</h3>

      {meals.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-3">No meals planned</p>
      ) : (
        <ul className="space-y-2">
          {meals.map((meal) => (
            <li
              key={meal.id}
              className="flex justify-between items-center bg-orange-50 rounded-md px-2 py-2 text-sm gap-1"
            >
              <span className="truncate text-gray-700">{meal.name || meal.title}</span>
              <button
                onClick={() => onRemoveMeal(meal.id)}
                aria-label={`Remove ${meal.name || meal.title} from ${day}`}
                className="text-gray-400 hover:text-red-500 transition flex-shrink-0 font-bold leading-none"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MealDay;
