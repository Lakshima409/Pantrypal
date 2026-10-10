import { useState } from 'react';

function PantryItem({ item, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity || '');

  const handleSave = () => {
    onUpdate(item.id, { name: name.trim() || item.name, quantity });
    setEditing(false);
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start gap-2">
        {editing ? (
          <div className="flex-grow space-y-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
            />
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Quantity"
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
        ) : (
          <div className="flex-grow">
            <h3 className="font-medium text-gray-800">{item.name}</h3>
            {item.quantity && (
              <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
            )}
            {item.expiryDate && (
              <p className="text-xs text-gray-400">Expires: {item.expiryDate}</p>
            )}
          </div>
        )}

        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full capitalize whitespace-nowrap">
          {item.category || 'other'}
        </span>
      </div>

      <div className="flex justify-end gap-2 mt-3">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              className="text-sm bg-orange-600 text-white px-3 py-1 rounded-md hover:bg-orange-700 transition"
            >
              Save
            </button>
            <button
              onClick={() => {
                setName(item.name);
                setQuantity(item.quantity || '');
                setEditing(false);
              }}
              className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="text-sm text-red-500 hover:text-red-600"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default PantryItem;
