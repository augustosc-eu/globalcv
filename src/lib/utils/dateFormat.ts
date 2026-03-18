import { format, parseISO, isValid } from 'date-fns';
import { Market } from '@/types/cv.types';
import { getMarketConfig } from '@/lib/markets';

/**
 * Japanese wareki era table
 * Each entry: [eraName, gregorianStartYear, gregorianStartMonth (1-based)]
 */
const WAREKI_ERAS = [
  { name: '令和', startYear: 2019, startMonth: 5 },
  { name: '平成', startYear: 1989, startMonth: 1 },
  { name: '昭和', startYear: 1926, startMonth: 12 },
  { name: '大正', startYear: 1912, startMonth: 7 },
  { name: '明治', startYear: 1868, startMonth: 10 },
] as const;

/**
 * Convert a Gregorian date to Japanese wareki string.
 * e.g. 2024-03 → "令和6年3月"
 */
export function toWareki(dateStr: string): string {
  const date = safeParseDate(dateStr);
  if (!date) return dateStr;

  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  for (const era of WAREKI_ERAS) {
    if (
      year > era.startYear ||
      (year === era.startYear && month >= era.startMonth)
    ) {
      const eraYear = year - era.startYear + 1;
      const eraYearDisplay = eraYear === 1 ? '元' : String(eraYear);
      return `${era.name}${eraYearDisplay}年${month}月`;
    }
  }

  // Fallback for pre-Meiji dates
  return `${year}年${month}月`;
}

/**
 * Safely parse a date string (ISO or partial YYYY-MM).
 */
function safeParseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Handle "YYYY-MM" partial dates
  const partialMatch = dateStr.match(/^(\d{4})-(\d{2})$/);
  if (partialMatch) {
    const d = new Date(parseInt(partialMatch[1]), parseInt(partialMatch[2]) - 1, 1);
    return isValid(d) ? d : null;
  }

  try {
    const d = parseISO(dateStr);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

/**
 * Format a single date string according to market locale.
 */
export function formatDate(dateStr: string, market: Market): string {
  if (!dateStr) return '';

  if (market === 'jp') {
    return toWareki(dateStr);
  }

  const date = safeParseDate(dateStr);
  if (!date) return dateStr;

  const config = getMarketConfig(market);
  try {
    return format(date, config.dateFormat);
  } catch {
    return dateStr;
  }
}

/**
 * Format a date range for display on a CV.
 * e.g. "Jan 2020 – Present" or "2020年4月 〜 令和6年3月"
 */
export function formatDateRange(
  startDate: string,
  endDate: string | undefined,
  isPresent: boolean,
  market: Market
): string {
  const start = formatDate(startDate, market);

  if (isPresent) {
    const presentLabel = market === 'jp' ? '現在' : 'Present';
    const separator = market === 'jp' ? ' 〜 ' : ' – ';
    return `${start}${separator}${presentLabel}`;
  }

  if (!endDate) {
    return start;
  }

  const end = formatDate(endDate, market);
  const separator = market === 'jp' ? ' 〜 ' : ' – ';
  return `${start}${separator}${end}`;
}

/**
 * Format a full date (with day) for birthdate display.
 */
export function formatBirthDate(dateStr: string, market: Market): string {
  if (!dateStr) return '';

  const date = safeParseDate(dateStr);
  if (!date) return dateStr;

  if (market === 'jp') {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    for (const era of WAREKI_ERAS) {
      if (
        year > era.startYear ||
        (year === era.startYear && month >= era.startMonth)
      ) {
        const eraYear = year - era.startYear + 1;
        const eraYearDisplay = eraYear === 1 ? '元' : String(eraYear);
        return `${era.name}${eraYearDisplay}年${month}月${day}日`;
      }
    }
    return `${year}年${month}月${day}日`;
  }

  if (market === 'eu') {
    return format(date, 'dd/MM/yyyy');
  }

  if (market === 'latam') {
    return format(date, 'dd/MM/yyyy');
  }

  return format(date, 'MM/dd/yyyy');
}

/**
 * Calculate years of experience from a date string to now.
 */
export function yearsFrom(dateStr: string): number {
  const date = safeParseDate(dateStr);
  if (!date) return 0;
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}
