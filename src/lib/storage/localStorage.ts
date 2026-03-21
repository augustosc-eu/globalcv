import { CVData, Market } from '@/types/cv.types';

const CURRENT_VERSION = 1;
const STORAGE_KEY_PREFIX = 'cv_maker_v';

function getStorageKey(market: Market): string {
  return `${STORAGE_KEY_PREFIX}${CURRENT_VERSION}_${market}`;
}

interface StoredData {
  version: number;
  data: CVData;
  savedAt: string;
}

/**
 * Migrate data from an older schema version to the current one.
 */
function migrateData(stored: StoredData): CVData {
  const { version, data } = stored;

  // Version 0 → 1: ensure arrays exist, add new fields
  if (version < 1) {
    return {
      ...data,
      version: 1,
      skills: data.skills ?? [],
      languages: data.languages ?? [],
      certifications: data.certifications ?? [],
      references: data.references ?? [],
      workExperience: (data.workExperience ?? []).map((exp) => ({
        ...exp,
        isPresent: exp.isPresent ?? false,
        achievements: exp.achievements ?? [],
      })),
      education: (data.education ?? []).map((edu) => ({
        ...edu,
        isPresent: edu.isPresent ?? false,
      })),
    };
  }

  return { ...data, version: CURRENT_VERSION };
}

/**
 * Save CV data to localStorage.
 */
export function saveCV(data: CVData): void {
  if (typeof window === 'undefined') return;

  try {
    const toStore: StoredData = {
      version: CURRENT_VERSION,
      data: { ...data, lastModified: new Date().toISOString() },
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(getStorageKey(data.market), JSON.stringify(toStore));
  } catch (err) {
    console.error('[CV Storage] Failed to save CV:', err);
  }
}

/**
 * Load CV data from localStorage for a given market.
 * Returns null if no data found or data is corrupt.
 */
export function loadCV(market: Market): CVData | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(getStorageKey(market));
    if (!raw) return null;

    const stored: StoredData = JSON.parse(raw);

    if (!stored.data || typeof stored.version !== 'number') {
      console.warn('[CV Storage] Corrupt data, clearing.');
      clearCV(market);
      return null;
    }

    // Migrate if needed
    if (stored.version < CURRENT_VERSION) {
      const migrated = migrateData(stored);
      // Save migrated data back
      saveCV(migrated);
      return migrated;
    }

    return stored.data;
  } catch (err) {
    console.error('[CV Storage] Failed to load CV:', err);
    clearCV(market);
    return null;
  }
}

/**
 * Clear stored CV data for a given market.
 */
export function clearCV(market: Market): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(getStorageKey(market));
  } catch (err) {
    console.error('[CV Storage] Failed to clear CV:', err);
  }
}

/**
 * List all markets that have saved CV data.
 */
export function listSavedMarkets(): Market[] {
  if (typeof window === 'undefined') return [];

  const markets: Market[] = ['us', 'eu', 'latam', 'jp', 'gb', 'au', 'in', 'br'];
  return markets.filter((market) => {
    try {
      return localStorage.getItem(getStorageKey(market)) !== null;
    } catch {
      return false;
    }
  });
}

/**
 * Get the last saved timestamp for a market.
 */
export function getLastSaved(market: Market): Date | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(getStorageKey(market));
    if (!raw) return null;
    const stored: StoredData = JSON.parse(raw);
    return stored.savedAt ? new Date(stored.savedAt) : null;
  } catch {
    return null;
  }
}
