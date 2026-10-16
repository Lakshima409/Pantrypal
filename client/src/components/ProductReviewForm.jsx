import { useState } from 'react';

function ProductReviewForm({ product, onCancel, onConfirm, saving = false }) {
  const [form, setForm] = useState({
    name: product.name || '',
    brand: product.brand || '',
    packageSize: product.packageSize || '',
    quantity: '',
    unit: '',
    expiryDate: '',
    ingredients: product.ingredients || '',
  });

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      ...form,
      barcode: product.barcode,
      source: product.source,
      imageUrl: product.imageUrl,
      nutritionPer100g: product.nutritionPer100g,
    });
  };

  const nullOrEmpty = (v) => v === null || v === undefined || v === '';

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Review Product</h2>
          <p className="text-sm text-gray-500">
            Confirm details before adding to your pantry.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>

      {product.imageUrl && (
        <div className="mb-4">
          <img
            src={product.imageUrl}
            alt={product.name || 'Product'}
            className="max-w-xs max-h-xs rounded-lg border border-gray-200 object-cover"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={handleChange('name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand
          </label>
          <input
            type="text"
            value={form.brand}
            onChange={handleChange('brand')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Package Size (from label)
          </label>
          <input
            type="text"
            value={form.packageSize}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
          />
          <p className="mt-1 text-xs text-gray-500">
            This is the package size on the label — not your pantry quantity.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity You Have
          </label>
          <input
            type="text"
            value={form.quantity}
            onChange={handleChange('quantity')}
            placeholder="e.g. 0.5"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            How much of this product is actually in your pantry.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit
          </label>
          <input
            type="text"
            value={form.unit}
            onChange={handleChange('unit')}
            placeholder="e.g. kg, pack, bottle"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expiry Date
          </label>
          <input
            type="date"
            value={form.expiryDate}
            onChange={handleChange('expiryDate')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {!nullOrEmpty(form.ingredients) && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ingredients
          </label>
          <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">
            {form.ingredients}
          </p>
        </div>
      )}

      {product.nutritionPer100g && (
        <div className="mb-4 p-3 rounded bg-orange-50 border border-orange-100">
          <h3 className="text-sm font-semibold text-orange-800 mb-2">
            Nutrition per 100g
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>
              <span className="block text-orange-600 font-medium">
                {product.nutritionPer100g.energyKcal !== null
                  ? product.nutritionPer100g.energyKcal
                  : '–'
              }</span>
              <span className="text-xs text-orange-500">kcal</span>
            </div>
            <div>
              <span className="block text-orange-600 font-medium">
                {product.nutritionPer100g.proteinG !== null
                  ? product.nutritionPer100g.proteinG
                  : '–'
              }</span>
              <span className="text-xs text-orange-500">g protein</span>
            </div>
            <div>
              <span className="block text-orange-600 font-medium">
                {product.nutritionPer100g.carbohydratesG !== null
                  ? product.nutritionPer100g.carbohydratesG
                  : '–'
              }</span>
              <span className="text-xs text-orange-500">g carbs</span>
            </div>
            <div>
              <span className="block text-orange-600 font-medium">
                {product.nutritionPer100g.fatG !== null
                  ? product.nutritionPer100g.fatG
                  : '–'
              }</span>
              <span className="text-xs text-orange-500">g fat</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-orange-600">
            Source: Open Food Facts. Missing values are shown as "–" —
            they are not assumed to be zero.
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 rounded-md text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!form.name.trim() || !form.quantity.trim() || saving}
          className="px-5 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-300 disabled:text-gray-500"
        >
          {saving ? 'Saving…' : 'Add to Pantry'}
        </button>
        <span className="ml-auto text-xs text-gray-500 self-center">
          {saving ? 'Saving to your pantry…' : 'Saving happens on confirm — nothing added yet.'}
        </span>
      </div>
    </div>
  );
}

export default ProductReviewForm;
