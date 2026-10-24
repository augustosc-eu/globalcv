/**
 * CV dates are stored as partial ISO strings: "YYYY-MM" (month precision) or
 * "YYYY" (year only — e.g. imported from a CV that only listed years).
 * Formatting must never invent precision that the source did not have.
 */
export type PartialDateStyle = 'MMM yyyy' | 'MM/yyyy' | 'jp-era';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parsePartialDate(value?: string): { year: number; month?: number } | null {
  if (!value) return null;
  const ym = value.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (ym) {
    const month = Number(ym[2]);
    if (month < 1 || month > 12) return null;
    return { year: Number(ym[1]), month };
  }
  const y = value.match(/^(\d{4})$/);
  if (y) return { year: Number(y[1]) };
  return null;
}

function jpEra(year: number, month?: number): string {
  if (month === undefined) {
    // Year-only: only use an era when the whole year falls inside it.
    if (year >= 2020) return `令和${year - 2018}年`;
    if (year >= 1990 && year <= 2018) return `平成${year - 1988}年`;
    return `${year}年`;
  }
  if (year > 2019 || (year === 2019 && month >= 5)) return `令和${year - 2018}年${month}月`;
  if (year >= 1989) return `平成${year - 1988}年${month}月`;
  return `${year}年${month}月`;
}

export function formatPartialDate(value: string | undefined, style: PartialDateStyle): string {
  if (!value) return '';
  const parsed = parsePartialDate(value);
  if (!parsed) return value;
  const { year, month } = parsed;
  if (style === 'jp-era') return jpEra(year, month);
  if (month === undefined) return String(year);
  if (style === 'MM/yyyy') return `${String(month).padStart(2, '0')}/${year}`;
  return `${SHORT_MONTHS[month - 1]} ${year}`;
}
