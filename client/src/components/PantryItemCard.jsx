function PantryItemCard({ item, onUpdate, onDelete }) {
  if (!item) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-start gap-2">
      <div className="flex-grow">
        <h3 className="font-medium text-gray-800">{item.name}</h3>
        {item.quantity && (
          <p className="text-sm text-gray-500">
            Qty: {item.quantity} {item.unit || ''}
          </p>
        )}
        {item.expiryDate && (
          <p className="text-xs text-gray-400">Expires: {item.expiryDate}</p>
        )}
        <span className="inline-block mt-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full capitalize">
          {item.category || 'other'}
        </span>
      </div>
      <div className="flex flex-col gap-1 text-sm">
        {onUpdate && (
          <button onClick={() => onUpdate(item.id, item)} className="text-orange-600 hover:text-orange-700">
            Edit
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(item.id)} className="text-red-500 hover:text-red-600">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default PantryItemCard;

