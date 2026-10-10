import { useState } from 'react';
import { usePantry } from '../context/PantryContext';

function IngredientUpload({ onUploadSuccess }) {
  const { addPantryItem } = usePantry();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setStatus('Reading file...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const lines = String(event.target.result)
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 25);

        if (lines.length === 0) {
          setStatus('No ingredients found in the file.');
          return;
        }

        for (const line of lines) {
          const parts = line.split(',');
          await addPantryItem({
            name: parts[0].trim(),
            quantity: (parts[1] || '1').trim(),
            category: 'other',
            expiryDate: '',
          });
        }

        setStatus(`Imported ${lines.length} ingredient${lines.length === 1 ? '' : 's'}.`);
        if (onUploadSuccess) onUploadSuccess();
      } catch {
        setStatus('Could not read that file. Use a .txt/.csv with one ingredient per line.');
      } finally {
        setBusy(false);
      }
    };
    reader.onerror = () => {
      setStatus('Could not read that file.');
      setBusy(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Upload ingredients from a file (.txt or .csv — one per line, or name,quantity)
      </label>
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".txt,.csv,text/plain,text/csv"
          onChange={handleFileChange}
          disabled={busy}
          className="text-sm text-gray-600"
        />
        {status && <span className="text-sm text-gray-500">{status}</span>}
      </div>
    </div>
  );
}

export default IngredientUpload;

