function IngredientMatchIndicator({
  total = 0,
  matched = 0,
  missing = [],
  optionalMissing = [],
}) {
  const percent = total > 0 ? Math.round((matched / total) * 100) : 0;
  const allMatched = total > 0 && matched === total;
  const missingList = Array.isArray(missing) ? missing : [];
  const optionalList = Array.isArray(optionalMissing) ? optionalMissing : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">
          Ingredient match: {matched} of {total}
        </span>
        <span
          className={`text-sm font-semibold ${allMatched ? 'text-green-600' : 'text-orange-600'}`}
        >
          {percent}%
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all ${allMatched ? 'bg-green-500' : 'bg-orange-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-xs text-gray-500 mt-1">
        {allMatched
          ? 'You have every ingredient in your pantry!'
          : `${total - matched} ingredient${total - matched === 1 ? '' : 's'} missing from your pantry`}
      </p>

      {!allMatched && missingList.length > 0 && (
        <p className="text-xs text-gray-600 mt-1">
          Missing: {missingList.join(', ')}
        </p>
      )}

      {optionalList.length > 0 && (
        <p className="text-xs text-gray-400 mt-1">
          Optional: {optionalList.join(', ')}
        </p>
      )}
    </div>
  );
}
export default IngredientMatchIndicator;
