const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const int = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 });

export const formatEur = (n: number): string => eur.format(n);
export const formatInt = (n: number): string => int.format(n);

/** Hours: one decimal under 10, whole hours above. */
export const formatHours = (h: number): string => (h < 10 ? (Math.round(h * 10) / 10).toString() : formatInt(Math.round(h)));

export const plural = (n: number, one: string, many = `${one}s`): string => `${formatInt(n)} ${n === 1 ? one : many}`;

export const parseNumber = (text: string): number | undefined => {
  const cleaned = text.replace(/[^\d.,-]/g, '').replace(',', '.');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
};

export const parseMoney = (text: string): number | undefined => {
  // Money is whole euros: strip thousands separators of either style.
  const digits = text.replace(/[^\d]/g, '');
  return digits === '' ? undefined : Number(digits);
};
