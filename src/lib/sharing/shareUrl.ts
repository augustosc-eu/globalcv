import LZString from 'lz-string';
import { CVData, Market, PersonalInfo } from '@/types/cv.types';
import { parseCVData } from '@/lib/cv/schema';

/*
 * Share links.
 *
 * Current format:  https://host/{market}#cv=2.<lz-string payload>
 *   - The payload lives in the URL *fragment*, which browsers do not send to
 *     the server in HTTP requests or Referer headers. This keeps CV data out
 *     of hosting/CDN access logs during normal use.
 *   - The payload is compressed, NOT encrypted. Anyone who has the link can
 *     read it, and it can still end up in browser history, chat previews,
 *     bookmarks and screenshots.
 *   - Sensitive personal fields are excluded unless the author opts in, and
 *     some fields (photo, government ID number) are never included.
 *
 * Legacy format:   ?share=<lz-string payload>  (still readable; removed from
 * the address bar immediately and imported with the same field policy).
 */

export const SHARE_FRAGMENT_KEY = 'cv';
export const LEGACY_SHARE_PARAM = 'share';
const PAYLOAD_VERSION = '2';

/** Links longer than this may break in some email/chat clients. */
export const URL_WARN_THRESHOLD = 2000;
/** Hard limits applied before/after decompression to avoid oversized payloads. */
export const MAX_ENCODED_LENGTH = 60_000;
export const MAX_DECODED_LENGTH = 300_000;

/** Never shared, regardless of options. */
export const NEVER_SHARED_FIELDS = ['photo', 'idNumber'] as const;

/** Excluded unless the author explicitly opts in. */
export const SENSITIVE_PERSONAL_FIELDS = [
  'dateOfBirth',
  'nationality',
  'maritalStatus',
  'gender',
  'emergencyContact',
  'nearestStation',
  'commuteTime',
  'personalSeal',
] as const satisfies readonly (keyof PersonalInfo)[];

export interface ShareOptions {
  /** Include date of birth, nationality, marital status, gender, emergency contact, street address etc. */
  includeSensitive?: boolean;
}

export type ShareDecodeResult =
  | { status: 'none' }
  | { status: 'ok'; cv: CVData; market: Market; legacy: boolean }
  | { status: 'invalid'; legacy: boolean; reason: 'too-large' | 'corrupt' | 'schema' };

/** Remove fields that must not travel in a link (see constants above). */
export function sanitizeForShare(cv: CVData, options: ShareOptions = {}): CVData {
  const personalInfo: PersonalInfo = { ...cv.personalInfo };
  for (const field of NEVER_SHARED_FIELDS) delete personalInfo[field];
  if (!options.includeSensitive) {
    for (const field of SENSITIVE_PERSONAL_FIELDS) delete personalInfo[field];
    if (personalInfo.address) {
      // Keep only the coarse location typically printed on CVs.
      const { city, country, state, prefecture } = personalInfo.address;
      personalInfo.address = { city, country, ...(state ? { state } : {}), ...(prefecture ? { prefecture } : {}) };
    }
  }
  return {
    ...cv,
    personalInfo,
    references: (cv.references ?? []).map((ref) =>
      options.includeSensitive ? { ...ref } : { ...ref, email: undefined, phone: undefined }
    ),
  };
}

export function encodeSharePayload(cv: CVData, options: ShareOptions = {}): string {
  const json = JSON.stringify(sanitizeForShare(cv, options));
  return `${PAYLOAD_VERSION}.${LZString.compressToEncodedURIComponent(json)}`;
}

/** Build a share link for the current origin and the CV's market route. */
export function encodeCVToURL(cv: CVData, options: ShareOptions = {}, baseHref?: string): string {
  const base = baseHref ?? (typeof window !== 'undefined' ? window.location.href : 'https://example.invalid/');
  const url = new URL(`/${cv.market}`, base);
  url.search = '';
  url.hash = `${SHARE_FRAGMENT_KEY}=${encodeSharePayload(cv, options)}`;
  return url.toString();
}

function decodePayload(encoded: string, legacy: boolean): ShareDecodeResult {
  if (encoded.length > MAX_ENCODED_LENGTH) return { status: 'invalid', legacy, reason: 'too-large' };
  let json: string | null = null;
  try {
    json = LZString.decompressFromEncodedURIComponent(encoded);
  } catch {
    json = null;
  }
  if (!json) return { status: 'invalid', legacy, reason: 'corrupt' };
  if (json.length > MAX_DECODED_LENGTH) return { status: 'invalid', legacy, reason: 'too-large' };
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { status: 'invalid', legacy, reason: 'corrupt' };
  }
  const parsed = parseCVData(raw);
  if (!parsed) return { status: 'invalid', legacy, reason: 'schema' };
  // Apply the current field policy to everything we import (incl. legacy links).
  const cv = sanitizeForShare(parsed, { includeSensitive: !legacy });
  return { status: 'ok', cv, market: cv.market, legacy };
}

// The lz-string URI alphabet contains "+", which URLSearchParams would turn
// into a space, so fragments are split manually.
function fragmentParts(hash: string): string[] {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  return fragment ? fragment.split('&').filter(Boolean) : [];
}

function readFragmentPayload(hash: string): string | null {
  const prefix = `${SHARE_FRAGMENT_KEY}=`;
  const part = fragmentParts(hash).find((p) => p.startsWith(prefix));
  if (!part) return null;
  let value = part.slice(prefix.length);
  try {
    value = decodeURIComponent(value);
  } catch {
    // keep raw value
  }
  return value.replace(/ /g, '+') || null;
}

/**
 * Decode a share link from a URL (defaults to the current location).
 * Accepts the fragment format and the legacy `?share=` query format.
 */
export function decodeShareFromLocation(href?: string): ShareDecodeResult {
  const source = href ?? (typeof window !== 'undefined' ? window.location.href : '');
  if (!source) return { status: 'none' };
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return { status: 'none' };
  }

  const fragmentValue = readFragmentPayload(url.hash);
  if (fragmentValue) {
    const dot = fragmentValue.indexOf('.');
    const version = dot > 0 ? fragmentValue.slice(0, dot) : '';
    if (version !== PAYLOAD_VERSION) return { status: 'invalid', legacy: false, reason: 'corrupt' };
    return decodePayload(fragmentValue.slice(dot + 1), false);
  }

  const legacyValue = url.searchParams.get(LEGACY_SHARE_PARAM);
  if (legacyValue) return decodePayload(legacyValue, true);
  return { status: 'none' };
}

/** @deprecated kept for callers of the old API; prefer decodeShareFromLocation. */
export function decodeCVFromURL(urlOrParam?: string): CVData | null {
  if (urlOrParam && !/^https?:/i.test(urlOrParam)) {
    const result = decodePayload(urlOrParam, true);
    return result.status === 'ok' ? result.cv : null;
  }
  const result = decodeShareFromLocation(urlOrParam);
  return result.status === 'ok' ? result.cv : null;
}

/** Remove share data (fragment and legacy query) from the address bar. */
export function removeShareParam(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete(LEGACY_SHARE_PARAM);
  const rest = fragmentParts(url.hash).filter((p) => !p.startsWith(`${SHARE_FRAGMENT_KEY}=`));
  url.hash = rest.length ? `#${rest.join('&')}` : '';
  window.history.replaceState(window.history.state ?? {}, '', url.toString());
}

export type IncomingShareAction =
  | { type: 'none' }
  | { type: 'redirect'; href: string }
  | { type: 'offer'; cv: CVData; legacy: boolean }
  | { type: 'invalid'; message: string };

const INVALID_MESSAGES: Record<'too-large' | 'corrupt' | 'schema', string> = {
  'too-large': 'This share link is too large to open safely. Ask the sender for a JSON file instead.',
  corrupt: 'This share link is incomplete or damaged (it may have been cut off when copied). Ask the sender to share it again.',
  schema: 'This share link does not contain a valid GlobalCV CV.',
};

/**
 * Decide what to do with a share link when a market route loads.
 * Links for another market are redirected to that market's route (always in
 * the fragment format, so legacy query payloads are not re-sent to the server).
 */
export function resolveIncomingShare(href: string, routeMarket: Market): IncomingShareAction {
  const decoded = decodeShareFromLocation(href);
  if (decoded.status === 'none') return { type: 'none' };
  if (decoded.status === 'invalid') return { type: 'invalid', message: INVALID_MESSAGES[decoded.reason] };
  if (decoded.market !== routeMarket) {
    // Payload was already sanitised during decoding; keep what it contains.
    return { type: 'redirect', href: encodeCVToURL(decoded.cv, { includeSensitive: true }, href) };
  }
  return { type: 'offer', cv: decoded.cv, legacy: decoded.legacy };
}
