export const CONTINUOUS_UNITS = new Set(['kg', 'gram', 'liter', 'ml', 'meter', 'feet']);

export const isContinuousUnit = (unit?: string): boolean =>
  CONTINUOUS_UNITS.has(unit ?? '');

export const UNIT_LABELS: Record<string, string> = {
  kg: 'kg',
  gram: 'g',
  liter: 'L',
  ml: 'ml',
  meter: 'm',
  feet: 'ft',
  piece: 'pcs',
  dozen: 'doz',
  pack: 'pack',
  box: 'box',
  roll: 'roll',
};

export const getUnitLabel = (unit?: string): string =>
  UNIT_LABELS[unit ?? ''] ?? unit ?? '';

// For GST invoices: measurement units show their label, all discrete/count
// units (piece, pack, box, roll, dozen, etc.) and undefined show "Nos."
export const getInvoiceUnitLabel = (unit?: string): string =>
  CONTINUOUS_UNITS.has(unit ?? '') ? (UNIT_LABELS[unit!] ?? unit!) : 'Nos.';

// Format quantity for invoice display: removes trailing zeros but keeps up to
// 2 decimal places.  "1.00" → "1", "1.50" → "1.5", "1.45" → "1.45"
export const formatInvoiceQty = (qty: number | string): string =>
  String(parseFloat(Number(qty).toFixed(2)));
