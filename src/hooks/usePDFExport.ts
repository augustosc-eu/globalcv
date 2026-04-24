'use client';

import { useState, useCallback } from 'react';
import { CVData } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';

type ExportState = 'idle' | 'generating' | 'done' | 'error';
export type ExportMode = 'designed' | 'ats' | 'privacy' | 'compact';
interface ExportOptions {
  hidePhoto?: boolean;
  mode?: ExportMode;
}

const COMPACT_LIMITS = {
  objective: 260,
  workDescription: 190,
  workEntries: 3,
  educationEntries: 2,
  skills: 8,
  languages: 4,
  certifications: 2,
};

const MAX_PHOTO_DATA_URI_LENGTH = 1_250_000; // ~1.2MB base64 payload threshold
const PDF_PHOTO_MAX_PX = 1200;

function trimToSentence(value: string | undefined, maxLength: number): string | undefined {
  if (!value || value.length <= maxLength) return value;
  const clipped = value.slice(0, maxLength).trim();
  const lastSentence = Math.max(clipped.lastIndexOf('.'), clipped.lastIndexOf('!'), clipped.lastIndexOf('?'));
  return `${(lastSentence > maxLength * 0.55 ? clipped.slice(0, lastSentence + 1) : clipped).trim()}…`;
}

function withHiddenSections(cv: CVData, sections: string[]): string[] {
  return Array.from(new Set([...(cv.hiddenSections ?? []), ...sections]));
}

function hasText(value?: string): boolean {
  return Boolean(value?.trim());
}

function cleanOptionalEntries(cv: CVData): Pick<CVData, 'workExperience' | 'education' | 'skills' | 'languages' | 'certifications' | 'references'> {
  return {
    workExperience: cv.workExperience.filter((exp) =>
      hasText(exp.title) || hasText(exp.company) || hasText(exp.description)
    ),
    education: cv.education.filter((edu) =>
      hasText(edu.degree) || hasText(edu.institution) || hasText(edu.fieldOfStudy)
    ),
    skills: cv.skills.filter((skill) => hasText(skill.name)),
    languages: cv.languages.filter((language) => hasText(language.language)),
    certifications: cv.certifications.filter((cert) => hasText(cert.name) || hasText(cert.issuer)),
    references: cv.references.filter((ref) =>
      hasText(ref.name) || hasText(ref.title) || hasText(ref.company) || hasText(ref.email) || hasText(ref.phone)
    ),
  };
}

function prepareCVForExportMode(
  cv: CVData,
  config: MarketConfig,
  mode: ExportMode,
  normalizedPhoto?: string
): CVData {
  const hidePhotoForMode =
    mode === 'ats' ||
    mode === 'privacy' ||
    (mode === 'compact' && config.fields.photo.visibility !== 'required');

  const personalInfo = {
    ...cv.personalInfo,
    photo: hidePhotoForMode ? undefined : normalizedPhoto,
    ...(mode === 'privacy'
      ? {
          dateOfBirth: undefined,
          nationality: undefined,
          maritalStatus: undefined,
          idNumber: undefined,
          gender: undefined,
          emergencyContact: undefined,
          personalSeal: undefined,
        }
      : {}),
  };
  const cleaned = cleanOptionalEntries(cv);

  if (mode !== 'compact') {
    return { ...cv, ...cleaned, personalInfo };
  }

  return {
    ...cv,
    ...cleaned,
    personalInfo,
    objective: trimToSentence(cv.objective, COMPACT_LIMITS.objective),
    workExperience: cleaned.workExperience.slice(0, COMPACT_LIMITS.workEntries).map((exp) => ({
      ...exp,
      description: trimToSentence(exp.description, COMPACT_LIMITS.workDescription) ?? '',
    })),
    education: cleaned.education.slice(0, COMPACT_LIMITS.educationEntries),
    skills: cleaned.skills.slice(0, COMPACT_LIMITS.skills),
    languages: cleaned.languages.slice(0, COMPACT_LIMITS.languages),
    certifications: cleaned.certifications.slice(0, COMPACT_LIMITS.certifications),
    references: [],
    hiddenSections: withHiddenSections(cv, ['references']),
  };
}

async function normalizePhotoForPDF(photo?: string): Promise<string | undefined> {
  if (!photo || typeof window === 'undefined') return photo;
  if (!photo.startsWith('data:image/')) return photo;
  if (photo.length <= MAX_PHOTO_DATA_URI_LENGTH) return photo;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > PDF_PHOTO_MAX_PX || height > PDF_PHOTO_MAX_PX) {
        if (width >= height) {
          height = Math.round((height * PDF_PHOTO_MAX_PX) / width);
          width = PDF_PHOTO_MAX_PX;
        } else {
          width = Math.round((width * PDF_PHOTO_MAX_PX) / height);
          height = PDF_PHOTO_MAX_PX;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(photo);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      let compressed = canvas.toDataURL('image/jpeg', quality);
      while (compressed.length > MAX_PHOTO_DATA_URI_LENGTH && quality > 0.55) {
        quality -= 0.08;
        compressed = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(compressed);
    };
    img.onerror = () => resolve(photo);
    img.src = photo;
  });
}

export function usePDFExport() {
  const [state, setState] = useState<ExportState>('idle');
  const [error, setError] = useState<string | null>(null);

  const exportPDF = useCallback(async (cv: CVData, config: MarketConfig, options?: ExportOptions) => {
    setState('generating');
    setError(null);
    try {
      const [pdfModule, docModule] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/lib/pdf/CVPDFDocument'),
      ]);

      const { pdf } = pdfModule;
      const { CVPDFDocument } = docModule;
      const mode = options?.mode ?? 'designed';
      const shouldHidePhoto = options?.hidePhoto || mode === 'ats' || mode === 'privacy' || (mode === 'compact' && config.fields.photo.visibility !== 'required');
      const sourcePhoto = shouldHidePhoto ? undefined : cv.personalInfo.photo;
      const normalizedPhoto = await normalizePhotoForPDF(sourcePhoto);
      const cvForPdf = prepareCVForExportMode(cv, config, mode, normalizedPhoto);

      // @react-pdf/renderer requires a JSX element passed to pdf()
      // We use React.createElement via dynamic import to avoid SSR issues
      const { createElement } = await import('react');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = createElement(CVPDFDocument as any, { cv: cvForPdf, config, exportMode: mode });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await (pdf as any)(doc).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cv.personalInfo.firstName || 'CV'}_${cv.personalInfo.lastName || ''}_${cv.market.toUpperCase()}_${mode}.pdf`.replace(/\s+/g, '_');
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      setState('done');
      setTimeout(() => setState('idle'), 3000);
    } catch (err) {
      console.error('[PDF Export] Failed:', err);
      const msg = err instanceof Error ? err.message : 'PDF generation failed';
      setError(msg);
      setState('error');
      setTimeout(() => setState('idle'), 5000);
    }
  }, []);

  return { exportPDF, state, error };
}
