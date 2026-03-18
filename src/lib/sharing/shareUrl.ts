import LZString from 'lz-string';
import { CVData } from '@/types/cv.types';

const SHARE_PARAM = 'share';

/** Strip photos before encoding to keep URL small */
function stripPhotos(cv: CVData): CVData {
  return {
    ...cv,
    personalInfo: { ...cv.personalInfo, photo: undefined },
  };
}

export function encodeCVToURL(cv: CVData): string {
  const stripped = stripPhotos(cv);
  const json = JSON.stringify(stripped);
  const compressed = LZString.compressToEncodedURIComponent(json);
  const url = new URL(window.location.href);
  url.searchParams.set(SHARE_PARAM, compressed);
  return url.toString();
}

export function decodeCVFromURL(urlOrParam?: string): CVData | null {
  try {
    const param = urlOrParam
      ?? (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get(SHARE_PARAM) : null);
    if (!param) return null;
    const json = LZString.decompressFromEncodedURIComponent(param);
    if (!json) return null;
    return JSON.parse(json) as CVData;
  } catch {
    return null;
  }
}

export function removeShareParam(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete(SHARE_PARAM);
  window.history.replaceState({}, '', url.toString());
}
