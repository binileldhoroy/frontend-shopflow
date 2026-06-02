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
