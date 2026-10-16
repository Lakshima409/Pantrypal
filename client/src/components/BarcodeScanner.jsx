import { useState, useRef, useEffect, useCallback } from 'react';
import { BrowserCodeReader } from '@zxing/browser';

function BarcodeScanner({ onBarcode }) {
  const [mode, setMode] = useState('camera');
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [hasCamera, setHasCamera] = useState(true);

  const videoRef = useRef(null);
  const readerRef = useRef(null);

  const isValidBarcode = useCallback((value) => {
    return /^\d{8,14}$/.test(value.trim());
  }, []);

  useEffect(() => {
    return () => {
      if (readerRef.current) {
        try { readerRef.current.reset(); } catch {
          // best-effort reset; ignore if already closed
          void 0;
        }
      }
    };
  }, []);

  const startScan = useCallback(async () => {
    setError(null);
    setCameraError(null);
    setScanning(true);
    try {
      const reader = new BrowserCodeReader();
      readerRef.current = reader;

      if (typeof reader.getVideoInputDevices !== "function") {
        setCameraError(
          "Camera scanning not supported in this browser. Use manual entry instead."
        );
        setHasCamera(false);
        setScanning(false);
        setMode("manual");
        return;
      }

      const devices = await reader.getVideoInputDevices();
      if (!devices || devices.length === 0) {
        setHasCamera(false);
        setCameraError('No camera found on this device.');
        setScanning(false);
        setMode('manual');
        return;
      }

      setHasCamera(true);
      await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (result) {
            const code = result.getText();
            if (isValidBarcode(code)) {
              setBarcode(code);
              onBarcode(code);
              try { reader.reset(); } catch {
                // best-effort reset; ignore if already closed
                void 0;
              }
              setScanning(false);
            }
          }
        }
      );
    } catch (err) {
      setScanning(false);
      const msg = err instanceof Error ? err.message : 'Camera error';
      if (msg.includes('permission') || msg.includes('Permission')) {
        setCameraError('Camera permission denied. Use manual entry instead.');
      } else if (msg.includes('HTTPS') || msg.includes('secure')) {
        setCameraError('Camera requires HTTPS. Use manual entry instead.');
      } else {
        setCameraError(`Camera unavailable: ${msg}`);
      }
      setMode('manual');
    }
  }, [isValidBarcode, onBarcode]);

  const stopScan = useCallback(() => {
    setScanning(false);
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch {
        // best-effort reset; ignore if already closed
        void 0;
      }
    }
  }, []);

  const handleManualSubmit = useCallback((e) => {
    e.preventDefault();
    setError(null);
    const value = barcode.trim();
    if (!isValidBarcode(value)) {
      setError('Please enter a valid barcode (8–14 digits).');
      return;
    }
    onBarcode(value);
  }, [barcode, isValidBarcode, onBarcode]);

  const handleManualChange = useCallback((e) => {
    setError(null);
    setBarcode(e.target.value.replace(/\D/g, ''));
  }, []);

  const toggleMode = useCallback((newMode) => {
    setError(null);
    setCameraError(null);
    setBarcode('');
    setMode(newMode);
    if (newMode === 'camera') {
      startScan();
    } else {
      stopScan();
    }
  }, [startScan, stopScan]);

  useEffect(() => {
    if (mode === 'camera') {
      startScan();
    } else {
      stopScan();
    }
  }, [mode, startScan, stopScan]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Add by Barcode</h2>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => toggleMode('camera')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            mode === 'camera'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📷 Camera
        </button>
        <button
          type="button"
          onClick={() => toggleMode('manual')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            mode === 'manual'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ✌️ Manual Entry
        </button>
      </div>

      {cameraError && (
        <div className="mb-4 p-3 rounded bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          {cameraError}
        </div>
      )}

      {mode === 'camera' && hasCamera && (
        <div className="mb-4">
          <video
            ref={videoRef}
            className="w-full max-w-md rounded-lg border border-gray-200 bg-gray-100"
            autoPlay
            muted
            playsInline
          />
          <div className="mt-2 flex justify-center">
            {scanning ? (
              <button
                type="button"
                onClick={stopScan}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Stop Scan
              </button>
            ) : (
              <button
                type="button"
                onClick={startScan}
                className="px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700"
              >
                Start Scanning
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Point the camera at the barcode. Scanning works on localhost or HTTPS.
          </p>
        </div>
      )}

      {(mode === 'manual' || !hasCamera) && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter Barcode
          </label>
          <input
            type="text"
            maxLength={14}
            value={barcode}
            onChange={handleManualChange}
            placeholder="8–14 digits (e.g. 3017624010701)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={!isValidBarcode(barcode)}
            className="mt-3 w-full px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-300 disabled:text-gray-500"
          >
            Look Up Product
          </button>
          <p className="mt-2 text-xs text-gray-500">
            Tip: the barcode is usually printed below the barcode lines on the package.
          </p>
        </div>
      )}

      {!hasCamera && mode === 'camera' && (
        <p className="mt-3 text-sm text-gray-500">
          Camera not available — switch to Manual Entry to type the barcode.
        </p>
      )}
    </div>
  );
}

export default BarcodeScanner;
