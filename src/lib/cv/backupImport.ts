import { CVData, Market } from '@/types/cv.types';
import { parseCVData, repairCVData } from '@/lib/cv/schema';
import { getMarketConfig } from '@/lib/markets';
import { isMarket } from '@/lib/markets/registry';
import type { LocalDataExport } from '@/lib/storage/localStorage';

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

export type BackupParseResult =
  | { kind: 'cv'; cv: CVData; repaired: boolean; marketMismatch: boolean }
  | { kind: 'full-export'; data: LocalDataExport }
  | { kind: 'error'; message: string };

/**
 * Validate a user-selected backup file before anything touches app state.
 * Accepts a single-CV backup (from "Backup JSON"/"Download JSON") or a full
 * local export (from "Download all my data").
 */
export function parseBackupFile(text: string, routeMarket: Market): BackupParseResult {
  if (text.length > MAX_BACKUP_BYTES) {
    return { kind: 'error', message: 'This file is too large to be a GlobalCV backup (limit 10 MB).' };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { kind: 'error', message: 'This file is not valid JSON, so it cannot be restored.' };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { kind: 'error', message: 'This file does not contain a GlobalCV CV.' };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.app === 'GlobalCV' && obj.kind === 'full-local-export' && obj.entries && typeof obj.entries === 'object') {
    return { kind: 'full-export', data: obj as unknown as LocalDataExport };
  }

  const strict = parseCVData(raw);
  if (strict) return { kind: 'cv', cv: strict, repaired: false, marketMismatch: strict.market !== routeMarket };

  // Looks like a CV but with invalid fields: repair conservatively.
  if (!('personalInfo' in obj) && !('workExperience' in obj)) {
    return { kind: 'error', message: 'This file does not contain a GlobalCV CV.' };
  }
  const market = isMarket(obj.market) ? obj.market : routeMarket;
  const config = getMarketConfig(market);
  const repaired = repairCVData(raw, { market, templateId: config.templates[0]?.id ?? '', pageSize: config.pageSize });
  if (!repaired) return { kind: 'error', message: 'This backup is damaged and could not be restored.' };
  return { kind: 'cv', cv: repaired, repaired: true, marketMismatch: repaired.market !== routeMarket };
}
