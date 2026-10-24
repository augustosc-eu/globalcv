import { CVData, Market, ApplicationEntry, ApplicationStatus } from '@/types/cv.types';
import { parseCVData, repairCVData, RepairContext } from '@/lib/cv/schema';
import { MARKETS } from '@/lib/markets/registry';
import { safeHttpUrl } from '@/lib/utils/safeUrl';

/*
 * Browser persistence for GlobalCV.
 *
 * Invariants (see docs/remediation/GLOBALCV_REMEDIATION_SUMMARY.md):
 *  - Reads never delete or rewrite user data. Drafts that fail validation are
 *    repaired in memory or kept verbatim; unparseable payloads are copied to a
 *    quarantine key before anything can overwrite them.
 *  - Every write reports success or failure. Callers must not show "saved"
 *    unless a write returned { ok: true }.
 *  - A save re-reads the market index immediately before writing and only
 *    replaces its own draft entry, so other drafts (possibly written by another
 *    tab) are preserved. Per-draft revisions detect concurrent edits of the
 *    same draft; conflicting saves are refused, never applied silently.
 *  - Large photos are stored once per content hash instead of inside every
 *    draft, to reduce quota pressure.
 */

const CURRENT_VERSION = 2;
const STORAGE_KEY_PREFIX = 'cv_maker_v';
const LEGACY_VERSION = 1;
const QUARANTINE_PREFIX = 'cv_maker_quarantine_';
const PHOTO_PREFIX = 'cv_maker_photo_';
export const PHOTO_REF_PREFIX = 'stored-photo:';
const MIN_PHOTO_LENGTH_TO_EXTERNALIZE = 512;

/** Key prefixes owned by GlobalCV. Used by "erase all" and recovery export. */
export const OWNED_STORAGE_PREFIXES = ['cv_maker_', 'globalcv_'] as const;

export type StorageFailureReason =
  | 'quota'
  | 'unavailable'
  | 'conflict'
  | 'deleted-elsewhere'
  | 'unrecoverable-existing-data';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type StorageResult<T extends object = {}> =
  | ({ ok: true } & T)
  | { ok: false; reason: StorageFailureReason; message: string };

export type SaveResult = StorageResult<{ savedAt: string; revision: number }>;

interface StoredData {
  version: number;
  data: CVData;
  savedAt: string;
  revision?: number;
}

interface StoredIndex {
  version: number;
  activeDraftId: string | null;
  /** Raw draft entries exactly as persisted. Never filtered on read. */
  drafts: Record<string, unknown>;
  corruptedAt?: string;
}

interface DraftView {
  data: CVData;
  savedAt: string;
  revision: number;
  repaired: boolean;
}

interface MarketRead {
  market: Market;
  stored: StoredIndex;
  valid: Record<string, DraftView>;
  invalidIds: string[];
  /** The main key held text that is not valid JSON. */
  unreadable: boolean;
  /** For unreadable payloads: whether a quarantine copy exists. */
  quarantined: boolean;
  /** Index was synthesised from the legacy v1 key. */
  fromLegacy: boolean;
  unavailable: boolean;
}

export interface SavedDraftMeta {
  id: string;
  market: Market;
  title: string;
  savedAt: string;
  lastModified: string;
}

export interface LoadedDraft {
  cv: CVData;
  revision: number;
  repaired: boolean;
}

// ─── Low-level helpers ───────────────────────────────────────────────────────

function getStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function getStorageKey(market: Market): string {
  return `${STORAGE_KEY_PREFIX}${CURRENT_VERSION}_${market}`;
}

function getLegacyKey(market: Market): string {
  return `${STORAGE_KEY_PREFIX}${LEGACY_VERSION}_${market}`;
}

export function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; code?: number; message?: string };
  return (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22 ||
    e.code === 1014 ||
    /quota/i.test(e.message ?? '')
  );
}

function failure(reason: StorageFailureReason, message: string): { ok: false; reason: StorageFailureReason; message: string } {
  return { ok: false, reason, message };
}

const FAILURE_MESSAGES: Record<'quota' | 'unavailable', string> = {
  quota: 'Browser storage is full. Your latest changes are NOT saved. Download a backup, then remove a photo or delete old drafts.',
  unavailable: 'Browser storage is unavailable (private mode or blocked). Your latest changes are NOT saved. Download a backup to keep them.',
};

function writeKey(key: string, value: string): StorageResult {
  const store = getStore();
  if (!store) return failure('unavailable', FAILURE_MESSAGES.unavailable);
  try {
    store.setItem(key, value);
  } catch (err) {
    const reason = isQuotaError(err) ? 'quota' : 'unavailable';
    return failure(reason, FAILURE_MESSAGES[reason]);
  }
  // Verify the write landed (guards against shims/extensions that drop writes).
  try {
    if (store.getItem(key) !== value) return failure('unavailable', FAILURE_MESSAGES.unavailable);
  } catch {
    return failure('unavailable', FAILURE_MESSAGES.unavailable);
  }
  return { ok: true };
}

function readKey(key: string): { ok: true; value: string | null } | { ok: false } {
  const store = getStore();
  if (!store) return { ok: false };
  try {
    return { ok: true, value: store.getItem(key) };
  } catch {
    return { ok: false };
  }
}

/** Small, fast, non-cryptographic content hash (FNV-1a 32-bit + length). */
export function contentHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${(hash >>> 0).toString(16).padStart(8, '0')}${value.length.toString(16)}`;
}

function listOwnedKeys(store: Storage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (key && OWNED_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) keys.push(key);
  }
  return keys;
}

// ─── Quarantine (recovery copies) ────────────────────────────────────────────

/**
 * Store a verbatim copy of a payload that could not be used as-is. Idempotent:
 * the same payload is only stored once. Returns false if the copy could not be
 * written (callers must then refuse to overwrite the original).
 */
function quarantine(label: string, raw: string): boolean {
  const key = `${QUARANTINE_PREFIX}${label}_${contentHash(raw)}`;
  const existing = readKey(key);
  if (existing.ok && existing.value !== null) return true;
  const payload = JSON.stringify({ label, quarantinedAt: new Date().toISOString(), raw });
  return writeKey(key, payload).ok;
}

export function listQuarantineKeys(): string[] {
  const store = getStore();
  if (!store) return [];
  return listOwnedKeys(store).filter((key) => key.startsWith(QUARANTINE_PREFIX));
}

// ─── Photos (stored once per content hash) ───────────────────────────────────

function photoKey(ref: string): string {
  return `${PHOTO_PREFIX}${ref.slice(PHOTO_REF_PREFIX.length)}`;
}

function externalizePhoto(photo: string | undefined): StorageResult<{ value: string | undefined }> {
  if (!photo || photo.startsWith(PHOTO_REF_PREFIX) || photo.length < MIN_PHOTO_LENGTH_TO_EXTERNALIZE) {
    return { ok: true, value: photo };
  }
  const base = contentHash(photo);
  for (let n = 0; n < 5; n += 1) {
    const ref = `${PHOTO_REF_PREFIX}${n === 0 ? base : `${base}_${n}`}`;
    const existing = readKey(photoKey(ref));
    if (!existing.ok) return failure('unavailable', FAILURE_MESSAGES.unavailable);
    if (existing.value === photo) return { ok: true, value: ref };
    if (existing.value === null) {
      const written = writeKey(photoKey(ref), photo);
      return written.ok ? { ok: true, value: ref } : written;
    }
  }
  // Extremely unlikely hash collisions: keep the photo inline rather than lose it.
  return { ok: true, value: photo };
}

function resolvePhoto(photo: string | undefined): string | undefined {
  if (!photo || !photo.startsWith(PHOTO_REF_PREFIX)) return photo;
  const stored = readKey(photoKey(photo));
  return stored.ok && stored.value ? stored.value : undefined;
}

function withResolvedPhoto(cv: CVData): CVData {
  const photo = cv.personalInfo?.photo;
  if (!photo || !photo.startsWith(PHOTO_REF_PREFIX)) return cv;
  return { ...cv, personalInfo: { ...cv.personalInfo, photo: resolvePhoto(photo) } };
}

/** Remove photo blobs no longer referenced by any draft or recovery copy. */
export function collectUnusedPhotos(): number {
  const store = getStore();
  if (!store) return 0;
  const keys = listOwnedKeys(store);
  const photoKeys = keys.filter((key) => key.startsWith(PHOTO_PREFIX));
  if (photoKeys.length === 0) return 0;
  const referencing = keys
    .filter((key) => !key.startsWith(PHOTO_PREFIX))
    .map((key) => {
      try {
        return store.getItem(key) ?? '';
      } catch {
        return '';
      }
    })
    .join('\n');
  let removed = 0;
  for (const key of photoKeys) {
    const ref = `${PHOTO_REF_PREFIX}${key.slice(PHOTO_PREFIX.length)}`;
    // Match the full ref followed by a closing quote (JSON or escaped JSON).
    if (referencing.includes(`${ref}"`) || referencing.includes(`${ref}\\"`)) continue;
    try {
      store.removeItem(key);
      removed += 1;
    } catch {
      // ignore; harmless orphan
    }
  }
  return removed;
}

// ─── Reading ─────────────────────────────────────────────────────────────────

function buildDraftTitle(cv: CVData): string {
  if (cv.title?.trim()) return cv.title.trim();
  const fullName = `${cv.personalInfo?.firstName ?? ''} ${cv.personalInfo?.lastName ?? ''}`.trim();
  return fullName || `${String(cv.market).toUpperCase()} Draft`;
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
    projects: data.projects ?? [],
    hiddenSections: data.hiddenSections ?? [],
  };
}

const repairContexts: Partial<Record<Market, RepairContext>> = {};

/** Register market defaults used when repairing drafts (called by the store). */
export function registerRepairContext(ctx: RepairContext): void {
  repairContexts[ctx.market] = ctx;
}

function repairContextFor(market: Market): RepairContext {
  return repairContexts[market] ?? { market, templateId: '', pageSize: market === 'us' || market === 'latam' ? 'Letter' : 'A4' };
}

function viewDraft(value: unknown, market: Market): DraftView | null {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Partial<StoredData>;
  const rawData = entry.data;
  if (!rawData || typeof rawData !== 'object') return null;
  const savedAt = typeof entry.savedAt === 'string' && entry.savedAt ? entry.savedAt : new Date(0).toISOString();
  const revision = typeof entry.revision === 'number' && Number.isFinite(entry.revision) ? entry.revision : 0;

  let strict: CVData | null = null;
  try {
    strict = parseCVData(normalizeData(rawData as CVData));
  } catch {
    strict = null;
  }
  if (strict) return { data: strict, savedAt, revision, repaired: false };

  const repaired = repairCVData(rawData, repairContextFor(market));
  if (repaired) {
    return { data: normalizeData({ ...repaired, market }), savedAt, revision, repaired: true };
  }
  return null;
}

function emptyStoredIndex(): StoredIndex {
  return { version: CURRENT_VERSION, activeDraftId: null, drafts: {} };
}

function readMarket(market: Market): MarketRead {
  const result: MarketRead = {
    market,
    stored: emptyStoredIndex(),
    valid: {},
    invalidIds: [],
    unreadable: false,
    quarantined: false,
    fromLegacy: false,
    unavailable: false,
  };
  if (typeof window === 'undefined') return result;

  const main = readKey(getStorageKey(market));
  if (!main.ok) {
    result.unavailable = true;
    return result;
  }

  let rawIndex: unknown = null;
  if (main.value === null) {
    const legacy = readKey(getLegacyKey(market));
    if (legacy.ok && legacy.value) {
      try {
        const legacyStored = JSON.parse(legacy.value) as Partial<StoredData>;
        const id = typeof legacyStored?.data?.id === 'string' && legacyStored.data.id ? legacyStored.data.id : `legacy_${market}`;
        rawIndex = { version: CURRENT_VERSION, activeDraftId: id, drafts: { [id]: legacyStored } };
        result.fromLegacy = true;
      } catch {
        // Unparseable legacy payload: keep it untouched (it is never deleted)
        // and expose it through the recovery export.
        result.quarantined = quarantine(`legacy_${market}`, legacy.value);
        result.unreadable = true;
      }
    }
  } else {
    try {
      rawIndex = JSON.parse(main.value);
    } catch {
      result.unreadable = true;
      result.quarantined = quarantine(market, main.value);
      result.stored.corruptedAt = new Date().toISOString();
      return result;
    }
  }

  if (rawIndex && typeof rawIndex === 'object' && !Array.isArray(rawIndex)) {
    const parsed = rawIndex as Partial<StoredIndex>;
    const drafts = parsed.drafts && typeof parsed.drafts === 'object' && !Array.isArray(parsed.drafts) ? parsed.drafts : {};
    result.stored = {
      version: CURRENT_VERSION,
      activeDraftId: typeof parsed.activeDraftId === 'string' ? parsed.activeDraftId : null,
      drafts: { ...drafts },
      ...(parsed.corruptedAt ? { corruptedAt: parsed.corruptedAt } : {}),
    };
  } else if (rawIndex !== null) {
    // JSON that is not an index object: preserve verbatim.
    result.unreadable = true;
    result.quarantined = quarantine(market, main.value ?? JSON.stringify(rawIndex));
    return result;
  }

  for (const [draftId, value] of Object.entries(result.stored.drafts)) {
    const view = viewDraft(value, market);
    if (view) result.valid[draftId] = view;
    else result.invalidIds.push(draftId);
  }
  return result;
}

function activeId(read: MarketRead): string | null {
  const { activeDraftId } = read.stored;
  if (activeDraftId && read.valid[activeDraftId]) return activeDraftId;
  return Object.keys(read.valid)[0] ?? null;
}

function persistMarket(read: MarketRead): StorageResult {
  if (read.unavailable) return failure('unavailable', FAILURE_MESSAGES.unavailable);
  if (read.unreadable && !read.quarantined) {
    return failure(
      'unrecoverable-existing-data',
      'Existing saved data could not be read or backed up, so it was not overwritten. Download a recovery file and free some storage space.'
    );
  }
  const written = writeKey(getStorageKey(read.market), JSON.stringify(read.stored));
  if (written.ok && read.fromLegacy) {
    try {
      window.localStorage.removeItem(getLegacyKey(read.market));
    } catch {
      // harmless: the legacy key is ignored once the v2 key exists
    }
  }
  return written;
}

// ─── Public draft API ────────────────────────────────────────────────────────

export interface SaveOptions {
  /**
   * Revision of this draft the caller last loaded or saved. `null` means the
   * caller believes the draft has never been persisted. `undefined` skips the
   * conflict check (used for brand-new copies with fresh ids).
   */
  expectedRevision?: number | null;
  /** Overwrite even if another tab saved a newer revision (explicit user choice). */
  force?: boolean;
}

export function saveCV(data: CVData, options: SaveOptions = {}): SaveResult {
  if (typeof window === 'undefined') return failure('unavailable', FAILURE_MESSAGES.unavailable);

  const market = data.market;
  const read = readMarket(market);
  if (read.unavailable) return failure('unavailable', FAILURE_MESSAGES.unavailable);

  const existingRaw = read.stored.drafts[data.id];
  const existingView = read.valid[data.id];
  const existingRevision = existingView?.revision ?? (existingRaw ? viewDraftRevision(existingRaw) : 0);

  if (!options.force && options.expectedRevision !== undefined) {
    if (options.expectedRevision === null && existingRaw) {
      return failure('conflict', 'A draft with this id was saved in another tab. Choose which version to keep.');
    }
    if (typeof options.expectedRevision === 'number') {
      if (!existingRaw && options.expectedRevision > 0) {
        return failure('deleted-elsewhere', 'This draft was deleted in another tab. Save it as a new draft to keep your changes.');
      }
      if (existingRaw && existingRevision !== options.expectedRevision) {
        return failure('conflict', 'This draft was changed in another tab. Choose which version to keep.');
      }
    }
  }

  // Before replacing an entry that only loaded after repair (or not at all),
  // keep a verbatim recovery copy of the original.
  if (existingRaw && (!existingView || existingView.repaired)) {
    if (!quarantine(`${market}_${data.id}`, JSON.stringify(existingRaw))) {
      return failure('quota', FAILURE_MESSAGES.quota);
    }
  }

  const photo = externalizePhoto(data.personalInfo?.photo);
  if (!photo.ok) return photo;

  const savedAt = new Date().toISOString();
  const normalized = normalizeData({
    ...data,
    personalInfo: { ...data.personalInfo, photo: photo.value },
    lastModified: savedAt,
  });
  const revision = existingRevision + 1;
  read.stored.drafts[normalized.id] = { version: CURRENT_VERSION, data: normalized, savedAt, revision } satisfies StoredData;
  read.stored.activeDraftId = normalized.id;

  const written = persistMarket(read);
  if (!written.ok) return written;

  const previousPhoto = existingView?.data.personalInfo?.photo;
  if (previousPhoto && previousPhoto !== photo.value && previousPhoto.startsWith(PHOTO_REF_PREFIX)) {
    collectUnusedPhotos();
  }
  return { ok: true, savedAt, revision };
}

function viewDraftRevision(raw: unknown): number {
  const rev = (raw as { revision?: unknown } | null)?.revision;
  return typeof rev === 'number' && Number.isFinite(rev) ? rev : 0;
}

export function loadDraft(market: Market, draftId?: string | null): LoadedDraft | null {
  const read = readMarket(market);
  const selectedId = draftId ?? activeId(read);
  if (!selectedId) return null;
  const view = read.valid[selectedId];
  if (!view) return null;
  return { cv: withResolvedPhoto(view.data), revision: view.revision, repaired: view.repaired };
}

export function loadCV(market: Market, draftId?: string | null): CVData | null {
  return loadDraft(market, draftId)?.cv ?? null;
}

/** Current persisted revision of a draft (0 if never revisioned, null if absent). */
export function getDraftRevision(market: Market, draftId: string): number | null {
  const read = readMarket(market);
  const raw = read.stored.drafts[draftId];
  return raw ? viewDraftRevision(raw) : null;
}

/** Revision of a draft inside a raw serialized market index (used for storage events). */
export function revisionFromSerializedIndex(serialized: string | null, draftId: string): number | null {
  if (!serialized) return null;
  try {
    const parsed = JSON.parse(serialized) as Partial<StoredIndex>;
    const raw = parsed?.drafts?.[draftId];
    return raw ? viewDraftRevision(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Delete one draft (or, without draftId, every draft of the market).
 * The deletion is persisted before success is reported.
 */
export function clearCV(market: Market, draftId?: string): StorageResult {
  if (typeof window === 'undefined') return failure('unavailable', FAILURE_MESSAGES.unavailable);

  if (!draftId) {
    const read = readMarket(market);
    const ids = Object.keys(read.stored.drafts);
    const store = getStore();
    if (!store) return failure('unavailable', FAILURE_MESSAGES.unavailable);
    try {
      store.removeItem(getStorageKey(market));
      store.removeItem(getLegacyKey(market));
    } catch {
      return failure('unavailable', FAILURE_MESSAGES.unavailable);
    }
    ids.forEach(removeReadinessHistory);
    collectUnusedPhotos();
    return { ok: true };
  }

  const read = readMarket(market);
  if (read.unavailable) return failure('unavailable', FAILURE_MESSAGES.unavailable);
  if (read.fromLegacy && read.stored.drafts[draftId]) {
    // Deleting the only legacy draft: remove the legacy key directly.
    try {
      window.localStorage.removeItem(getLegacyKey(market));
    } catch {
      return failure('unavailable', FAILURE_MESSAGES.unavailable);
    }
    removeReadinessHistory(draftId);
    collectUnusedPhotos();
    return { ok: true };
  }
  if (!(draftId in read.stored.drafts)) return { ok: true };

  delete read.stored.drafts[draftId];
  if (read.stored.activeDraftId === draftId) {
    read.stored.activeDraftId = Object.keys(read.valid).find((id) => id !== draftId) ?? null;
  }
  const written = persistMarket(read);
  if (!written.ok) return written;
  removeReadinessHistory(draftId);
  collectUnusedPhotos();
  return { ok: true };
}

function removeReadinessHistory(draftId: string): void {
  try {
    window.localStorage.removeItem(`globalcv_readiness_history_${draftId}`);
  } catch {
    // ignore
  }
}

export function setActiveDraft(market: Market, draftId: string): StorageResult {
  const read = readMarket(market);
  if (!read.valid[draftId]) return { ok: true };
  if (read.stored.activeDraftId === draftId && !read.fromLegacy) return { ok: true };
  read.stored.activeDraftId = draftId;
  return persistMarket(read);
}

export function listSavedMarkets(): Market[] {
  if (typeof window === 'undefined') return [];
  return MARKETS.filter((market) => Object.keys(readMarket(market).valid).length > 0);
}

export function listSavedDrafts(market?: Market): SavedDraftMeta[] {
  if (typeof window === 'undefined') return [];
  const markets = market ? [market] : [...MARKETS];
  return markets.flatMap((currentMarket) => {
    const read = readMarket(currentMarket);
    return Object.entries(read.valid)
      .map(([id, { data, savedAt }]) => ({
        id,
        market: currentMarket,
        title: buildDraftTitle(data),
        savedAt,
        lastModified: data.lastModified,
      }))
      .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
  });
}

export function getLastSaved(market: Market, draftId?: string | null): Date | null {
  const read = readMarket(market);
  const selectedId = draftId ?? activeId(read);
  if (!selectedId) return null;
  const view = read.valid[selectedId];
  return view?.savedAt ? new Date(view.savedAt) : null;
}

export function hasCorruptedDrafts(market: Market): boolean {
  const read = readMarket(market);
  return read.unreadable || read.invalidIds.length > 0 || Boolean(read.stored.corruptedAt);
}

// ─── Recovery & data portability ─────────────────────────────────────────────

export interface RecoveryStatus {
  /** Markets whose saved data could not be parsed at all (preserved in quarantine). */
  unreadableMarkets: Market[];
  /** Drafts that could not be loaded even after repair (kept verbatim in storage). */
  invalidDrafts: { market: Market; id: string }[];
  /** Drafts that loaded only after automatic repair. */
  repairedDrafts: { market: Market; id: string }[];
  quarantineCount: number;
  needsAttention: boolean;
}

export function getRecoveryStatus(): RecoveryStatus {
  const status: RecoveryStatus = {
    unreadableMarkets: [],
    invalidDrafts: [],
    repairedDrafts: [],
    quarantineCount: 0,
    needsAttention: false,
  };
  if (typeof window === 'undefined') return status;
  for (const market of MARKETS) {
    const read = readMarket(market);
    if (read.unreadable) status.unreadableMarkets.push(market);
    read.invalidIds.forEach((id) => status.invalidDrafts.push({ market, id }));
    Object.entries(read.valid).forEach(([id, view]) => {
      if (view.repaired) status.repairedDrafts.push({ market, id });
    });
  }
  status.quarantineCount = listQuarantineKeys().length;
  status.needsAttention =
    status.unreadableMarkets.length > 0 || status.invalidDrafts.length > 0 || status.repairedDrafts.length > 0;
  return status;
}

export interface LocalDataExport {
  app: 'GlobalCV';
  kind: 'full-local-export';
  exportedAt: string;
  /** Every GlobalCV-owned localStorage entry, verbatim (JSON values parsed when possible). */
  entries: Record<string, unknown>;
}

/** Export everything GlobalCV stores on this device (for backup or recovery). */
export function exportAllLocalData(): LocalDataExport {
  const result: LocalDataExport = {
    app: 'GlobalCV',
    kind: 'full-local-export',
    exportedAt: new Date().toISOString(),
    entries: {},
  };
  const store = getStore();
  if (!store) return result;
  for (const key of listOwnedKeys(store).sort()) {
    let value: string | null = null;
    try {
      value = store.getItem(key);
    } catch {
      value = null;
    }
    if (value === null) continue;
    try {
      result.entries[key] = JSON.parse(value);
    } catch {
      result.entries[key] = value;
    }
  }
  return result;
}

export interface RestoreResult {
  restoredDrafts: number;
  restoredKeys: number;
  skippedExisting: number;
  failed: number;
}

/**
 * Restore a full local export WITHOUT overwriting anything already present:
 * missing keys are written, and drafts missing from an existing market index
 * are merged in. Existing drafts with the same id are left untouched.
 */
export function restoreFullLocalExport(exported: LocalDataExport): RestoreResult {
  const result: RestoreResult = { restoredDrafts: 0, restoredKeys: 0, skippedExisting: 0, failed: 0 };
  const store = getStore();
  if (!store || !exported?.entries) return result;
  const marketKeyRe = new RegExp(`^${STORAGE_KEY_PREFIX}${CURRENT_VERSION}_(${MARKETS.join('|')})$`);

  for (const [key, value] of Object.entries(exported.entries)) {
    if (!OWNED_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const match = key.match(marketKeyRe);
    const existing = readKey(key);
    if (!existing.ok) {
      result.failed += 1;
      continue;
    }
    if (existing.value === null) {
      if (writeKey(key, serialized).ok) {
        result.restoredKeys += 1;
        if (match && value && typeof value === 'object') {
          result.restoredDrafts += Object.keys((value as Partial<StoredIndex>).drafts ?? {}).length;
        }
      } else result.failed += 1;
      continue;
    }
    if (!match || !value || typeof value !== 'object') {
      result.skippedExisting += 1;
      continue;
    }
    const read = readMarket(match[1] as Market);
    const incoming = (value as Partial<StoredIndex>).drafts ?? {};
    let added = 0;
    for (const [id, entry] of Object.entries(incoming)) {
      if (id in read.stored.drafts) {
        result.skippedExisting += 1;
        continue;
      }
      read.stored.drafts[id] = entry;
      added += 1;
    }
    if (added === 0) continue;
    if (persistMarket(read).ok) result.restoredDrafts += added;
    else result.failed += added;
  }
  return result;
}

export interface EraseResult {
  removed: number;
  remaining: string[];
}

/**
 * Remove every GlobalCV-owned key from localStorage and sessionStorage.
 * Keys belonging to other sites/apps on the same origin are left untouched.
 */
export function eraseAllLocalData(): EraseResult {
  const result: EraseResult = { removed: 0, remaining: [] };
  if (typeof window === 'undefined') return result;
  const stores: Storage[] = [];
  try {
    if (window.localStorage) stores.push(window.localStorage);
  } catch {
    // unavailable
  }
  try {
    if (window.sessionStorage) stores.push(window.sessionStorage);
  } catch {
    // unavailable
  }
  for (const store of stores) {
    for (const key of listOwnedKeys(store)) {
      try {
        store.removeItem(key);
        result.removed += 1;
      } catch {
        // reported via `remaining`
      }
    }
    result.remaining.push(...listOwnedKeys(store));
  }
  return result;
}

// ─── Application Tracker ──────────────────────────────────────────────────────

const APPLICATIONS_KEY = 'cv_maker_applications';
const APPLICATION_STATUSES: ApplicationStatus[] = ['saved', 'applied', 'interview', 'offer', 'rejected'];

function isApplicationEntry(value: unknown): value is ApplicationEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<ApplicationEntry>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.jobTitle === 'string' &&
    typeof entry.company === 'string' &&
    APPLICATION_STATUSES.includes(entry.status as ApplicationStatus)
  );
}

/** Raw entries exactly as stored (never filtered, so writes don't drop data). */
function readApplicationsRaw(): { ok: true; entries: unknown[] } | { ok: false } {
  if (typeof window === 'undefined') return { ok: true, entries: [] };
  const raw = readKey(APPLICATIONS_KEY);
  if (!raw.ok) return { ok: false };
  if (!raw.value) return { ok: true, entries: [] };
  try {
    const parsed = JSON.parse(raw.value) as unknown;
    if (Array.isArray(parsed)) return { ok: true, entries: parsed };
  } catch {
    // fall through
  }
  // Unreadable tracker data: keep a recovery copy; only allow overwriting once preserved.
  return quarantine('applications', raw.value) ? { ok: true, entries: [] } : { ok: false };
}

function persistApplications(entries: unknown[]): StorageResult {
  return writeKey(APPLICATIONS_KEY, JSON.stringify(entries));
}

export function saveApplication(entry: Omit<ApplicationEntry, 'id' | 'savedAt'>): ApplicationEntry | null {
  const current = readApplicationsRaw();
  if (!current.ok) return null;
  const newEntry: ApplicationEntry = {
    ...entry,
    jobUrl: safeHttpUrl(entry.jobUrl),
    companyLogo: safeHttpUrl(entry.companyLogo, { allowDataImage: true }),
    id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
  };
  return persistApplications([newEntry, ...current.entries]).ok ? newEntry : null;
}

export function listApplications(): ApplicationEntry[] {
  const current = readApplicationsRaw();
  return current.ok ? current.entries.filter(isApplicationEntry) : [];
}

function updateApplication(id: string, patch: Partial<ApplicationEntry>): boolean {
  const current = readApplicationsRaw();
  if (!current.ok) return false;
  const next = current.entries.map((e) => (isApplicationEntry(e) && e.id === id ? { ...e, ...patch } : e));
  return persistApplications(next).ok;
}

export function updateApplicationStatus(id: string, status: ApplicationStatus): boolean {
  return updateApplication(id, { status });
}

export function updateApplicationNotes(id: string, notes: string): boolean {
  return updateApplication(id, { notes });
}

export function deleteApplication(id: string): boolean {
  const current = readApplicationsRaw();
  if (!current.ok) return false;
  return persistApplications(current.entries.filter((e) => !(isApplicationEntry(e) && e.id === id))).ok;
}

export function isJobSaved(jobId: string): boolean {
  const current = readApplicationsRaw();
  return current.ok && current.entries.some((e) => isApplicationEntry(e) && e.jobId === jobId);
}
