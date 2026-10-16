import { useState } from 'react';
import { usePantry } from '../context/PantryContext';
import BarcodeScanner from '../components/BarcodeScanner';
import ProductReviewForm from '../components/ProductReviewForm';
import PantryItemCard from '../components/PantryItemCard';
import productService from '../services/productService';
import pantryService from '../services/pantryService';

/**
 * My Pantry page (/pantry).
 *
 * Flow:
 * 1. User scans a barcode or enters it manually.
 * 2. Page calls GET /api/products/barcode/:barcode (Phase 2 backend).
 * 3. Product details are shown in a review form for editing.
 * 4. User confirms — Phase 4 will call the existing POST /api/pantry to save.
 *
 * Nothing is saved to the pantry automatically in this phase.
 */
function Pantry() {
  const { pantryItems, loading, error, fetchPantryItems } = usePantry();
  const [scannedProduct, setScannedProduct] = useState(null);
  const [lookupError, setLookupError] = useState(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);

  const handleBarcodeScanned = async (barcode) => {
    setLookupError(null);
    setSaveError(null);
    setSaveSuccess(null);
    setIsLookingUp(true);
    try {
      const product = await productService.lookupProductByBarcode(barcode);
      setScannedProduct(product);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lookup failed';
      if (msg.includes('404') || msg.includes('not found')) {
        setLookupError("Product not found in our database. You can still add it manually in Phase 4.");
      } else if (msg.includes('504') || msg.includes('timed out')) {
        setLookupError('The product lookup timed out. Please try again.');
      } else if (msg.includes('502') || msg.includes('unable to reach')) {
        setLookupError('Unable to reach the product database. Please try again later.');
      } else if (msg.includes('401') || msg.includes('Sign in')) {
        setLookupError('Please sign in to use barcode lookup.');
      } else {
        setLookupError(`Lookup failed: ${msg}`);
      }
      setScannedProduct(null);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleCancelReview = () => {
    setScannedProduct(null);
    setLookupError(null);
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleConfirmReview = async (reviewData) => {
    setSaveError(null);
    setSaveSuccess(null);
    setIsSaving(true);
    try {
      const payload = {
        name: reviewData.name.trim(),
        quantity: reviewData.quantity.trim(),
        unit: reviewData.unit.trim(),
        expiryDate: reviewData.expiryDate || null,
      };
      await pantryService.addPantryItem(payload);
      setSaveSuccess('Product added to your pantry.');
      await fetchPantryItems();
      setScannedProduct(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      if (msg.includes('401') || msg.includes('Sign in') || msg.includes('session')) {
        setSaveError('Please sign in to save products to your pantry.');
      } else if (msg.includes('400')) {
        setSaveError('Invalid product details. Please check and try again.');
      } else {
        setSaveError(`Save failed: ${msg}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateItem = async (id, updates) => {
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const payload = {
        name: updates.name,
        quantity: updates.quantity,
        unit: updates.unit,
        expiryDate: updates.expiryDate || null,
      };
      await pantryService.updatePantryItem(id, payload);
      setSaveSuccess('Item updated.');
      await fetchPantryItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      if (msg.includes('401') || msg.includes('Sign in') || msg.includes('session')) {
        setSaveError('Please sign in to update pantry items.');
      } else {
        setSaveError(`Update failed: ${msg}`);
      }
    }
  };

  const handleDeleteItem = async (id) => {
    setSaveError(null);
    setSaveSuccess(null);
    if (!window.confirm('Remove this item from your pantry?')) return;
    try {
      await pantryService.deletePantryItem(id);
      setSaveSuccess('Item removed.');
      await fetchPantryItems();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      if (msg.includes('401') || msg.includes('Sign in') || msg.includes('session')) {
        setSaveError('Please sign in to remove pantry items.');
      } else {
        setSaveError(`Delete failed: ${msg}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Pantry</h1>
        <p className="text-gray-500">Loading your pantry…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Pantry</h1>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchPantryItems}
          className="mt-4 px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">My Pantry</h1>
        <p className="text-gray-600">
          Scan barcodes to add products, or manage your saved ingredients.
        </p>
      </header>

      {/* Barcode scanner + review form */}
      {isLookingUp && (
        <div className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-blue-800 text-sm">
          Looking up product…
        </div>
      )}
      {saveSuccess && (
        <div className="mb-4 p-3 rounded bg-green-50 border border-green-200 text-green-800 text-sm">
          {saveSuccess}
        </div>
      )}
      {scannedProduct ? (
        <ProductReviewForm
          product={scannedProduct}
          onCancel={handleCancelReview}
          onConfirm={handleConfirmReview}
          saving={isSaving}
        />
      ) : (
        <>
          <BarcodeScanner onBarcode={handleBarcodeScanned} />
          {lookupError && (
            <div className="mt-4 p-3 rounded bg-red-50 border border-red-200 text-red-800 text-sm">
              {lookupError}
            </div>
          )}
          {saveError && (
            <div className="mt-4 p-3 rounded bg-red-50 border border-red-200 text-red-800 text-sm">
              {saveError}
            </div>
          )}
        </>
      )}

      {/* Saved pantry items */}
      <section className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Saved Items ({pantryItems.length})
          </h2>
          <button
            onClick={fetchPantryItems}
            className="text-sm text-orange-600 hover:text-orange-700"
          >
            Refresh
          </button>
        </div>

        {pantryItems.length === 0 ? (
          <div className="bg-white rounded-lg p-8 border border-gray-100 text-center">
            <p className="text-gray-500">Your pantry is empty.</p>
            <p className="text-sm text-gray-400 mt-2">
              Scan a barcode above to add your first product.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pantryItems.map((item) => (
              <PantryItemCard
                key={item.id}
                item={item}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Pantry;
