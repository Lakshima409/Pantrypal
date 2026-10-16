import api from './api';

/**
 * Look up a product by barcode using the Phase 2 backend endpoint.
 * GET /api/products/barcode/:barcode (authenticated)
 */
export async function lookupProductByBarcode(barcode) {
  return api.get(`/products/barcode/${barcode}`);
}

export default { lookupProductByBarcode };
