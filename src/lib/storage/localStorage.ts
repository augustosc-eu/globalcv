import { CVData, Market } from '@/types/cv.types';
import { parseCVData } from '@/lib/cv/schema';

const CURRENT_VERSION = 2;
const STORAGE_KEY_PREFIX = 'cv_maker_v';
const LEGACY_VERSION = 1;

interface StoredData {
  version: number;
  data: CVData;
  savedAt: string;
}

interface MarketDraftIndex {
  version: number;
  activeDraftId: string | null;
  drafts: Record<string, StoredData>;
  corruptedAt?: string;
}

export interface SavedDraftMeta {
  id: string;
  market: Market;
  title: string;
  savedAt: string;
  lastModified: string;
}

function getStorageKey(market: Market): string {
  return `${STORAGE_KEY_PREFIX}${CURRENT_VERSION}_${market}`;
}

function getLegacyKey(market: Market): string {
  return `${STORAGE_KEY_PREFIX}${LEGACY_VERSION}_${market}`;
}

function buildDraftTitle(cv: CVData): string {
  if (cv.title?.trim()) return cv.title.trim();
  const fullName = `${cv.personalInfo.firstName} ${cv.personalInfo.lastName}`.trim();
  return fullName || `${cv.market.toUpperCase()} Draft`;
}

function normalizeData(data: CVData): CVData {
  return {
    ...data,
    version: CURRENT_VERSION,
    title: buildDraftTitle(data),
    workExperience: (data.workExperience ?? []).map((exp) => ({
      ...exp,
      isPresent: exp.isPresent ?? false,
      achievements: exp.achievements ?? [],
    })),
    education: (data.education ?? []).map((edu) => ({
      ...edu,
      isPresent: edu.isPresent ?? false,
    })),
    skills: data.skills ?? [],
    languages: data.languages ?? [],
    certifications: data.certifications ?? [],
    references: data.references ?? [],
    hiddenSections: data.hiddenSections ?? [],
  };
}

function migrateStoredData(stored: StoredData): StoredData | null {
  const parsed = parseCVData(normalizeData(stored.data));
  if (!parsed) return null;
  return {
    version: CURRENT_VERSION,
    data: parsed,
    savedAt: stored.savedAt || new Date().toISOString(),
  };
}

function emptyIndex(): MarketDraftIndex {
  return {
    version: CURRENT_VERSION,
    activeDraftId: null,
    drafts: {},
  };
}

function readMarketIndex(market: Market): MarketDraftIndex {
  if (typeof window === 'undefined') return emptyIndex();

  const key = getStorageKey(market);

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return migrateLegacyIfNeeded(market);
    }

    const parsed = JSON.parse(raw) as Partial<MarketDraftIndex>;
    const next: MarketDraftIndex = {
      version: CURRENT_VERSION,
      activeDraftId: parsed.activeDraftId ?? null,
      drafts: {},
      corruptedAt: parsed.corruptedAt,
    };

    for (const [draftId, value] of Object.entries(parsed.drafts ?? {})) {
      const migrated = migrateStoredData(value as StoredData);
      if (migrated) next.drafts[draftId] = migrated;
    }

    if (next.activeDraftId && !next.drafts[next.activeDraftId]) {
      next.activeDraftId = Object.keys(next.drafts)[0] ?? null;
    }

    persistIndex(market, next);
    return next;
  } catch (err) {
    console.error('[CV Storage] Failed to read market index:', err);
    const corrupted: MarketDraftIndex = {
      ...emptyIndex(),
      corruptedAt: new Date().toISOString(),
    };
    persistIndex(market, corrupted);
    return corrupted;
  }
}

function persistIndex(market: Market, index: MarketDraftIndex): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(market), JSON.stringify(index));
  } catch (err) {
    console.error('[CV Storage] Failed to persist market index:', err);
  }
}

function migrateLegacyIfNeeded(market: Market): MarketDraftIndex {
  const legacyKey = getLegacyKey(market);

  try {
    const legacyRaw = localStorage.getItem(legacyKey);
    if (!legacyRaw) return emptyIndex();

    const legacyStored = JSON.parse(legacyRaw) as StoredData;
    const migrated = migrateStoredData(legacyStored);
    localStorage.removeItem(legacyKey);
    if (!migrated) return emptyIndex();

    const index: MarketDraftIndex = {
      version: CURRENT_VERSION,
      activeDraftId: migrated.data.id,
      drafts: {
        [migrated.data.id]: migrated,
      },
    };
    persistIndex(market, index);
    return index;
  } catch (err) {
    console.error('[CV Storage] Failed to migrate legacy draft:', err);
    return emptyIndex();
  }
}

export function saveCV(data: CVData): void {
  if (typeof window === 'undefined') return;

  const market = data.market;
  const index = readMarketIndex(market);
  const savedAt = new Date().toISOString();
  const normalized = normalizeData({
    ...data,
    lastModified: savedAt,
  });

  index.drafts[normalized.id] = {
    version: CURRENT_VERSION,
    data: normalized,
    savedAt,
  };
  index.activeDraftId = normalized.id;
  persistIndex(market, index);
}

export function loadCV(market: Market, draftId?: string | null): CVData | null {
  if (typeof window === 'undefined') return null;

  const index = readMarketIndex(market);
  const selectedId = draftId ?? index.activeDraftId;
  if (!selectedId) return null;
  return index.drafts[selectedId]?.data ?? null;
}

export function clearCV(market: Market, draftId?: string): void {
  if (typeof window === 'undefined') return;

  const index = readMarketIndex(market);
  if (draftId) {
    delete index.drafts[draftId];
    if (index.activeDraftId === draftId) {
      index.activeDraftId = Object.keys(index.drafts)[0] ?? null;
    }
    persistIndex(market, index);
    return;
  }

  try {
    localStorage.removeItem(getStorageKey(market));
  } catch (err) {
    console.error('[CV Storage] Failed to clear CV:', err);
  }
}

export function setActiveDraft(market: Market, draftId: string): void {
  const index = readMarketIndex(market);
  if (!index.drafts[draftId]) return;
  index.activeDraftId = draftId;
  persistIndex(market, index);
}

export function listSavedMarkets(): Market[] {
  if (typeof window === 'undefined') return [];

  const markets: Market[] = ['us', 'eu', 'latam', 'jp', 'gb', 'au', 'in', 'br'];
  return markets.filter((market) => Object.keys(readMarketIndex(market).drafts).length > 0);
}

export function listSavedDrafts(market?: Market): SavedDraftMeta[] {
  if (typeof window === 'undefined') return [];

  const markets = market ? [market] : listSavedMarkets();
  return markets.flatMap((currentMarket) => {
    const index = readMarketIndex(currentMarket);
    return Object.values(index.drafts)
      .map(({ data, savedAt }) => ({
        id: data.id,
        market: currentMarket,
        title: buildDraftTitle(data),
        savedAt,
        lastModified: data.lastModified,
      }))
      .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
  });
}

export function getLastSaved(market: Market, draftId?: string | null): Date | null {
  if (typeof window === 'undefined') return null;

  const index = readMarketIndex(market);
  const selectedId = draftId ?? index.activeDraftId;
  if (!selectedId) return null;

  const stored = index.drafts[selectedId];
  return stored?.savedAt ? new Date(stored.savedAt) : null;
}

export function hasCorruptedDrafts(market: Market): boolean {
  return Boolean(readMarketIndex(market).corruptedAt);
}
