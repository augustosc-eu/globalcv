import { CVData, Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';

type ChecklistStatus = 'ok' | 'warn';

export interface FormatChecklistItem {
  id: string;
  label: string;
  status: ChecklistStatus;
  detail?: string;
}

export interface MarketFormatGuidance {
  preferredLabel: string;
  pageNorm: string;
  photoNorm: string;
  recommendedTemplateId: string;
  doList: string[];
}

export interface MarketDifferenceItem {
  label: string;
  value: string;
}

const guidanceByMarket: Record<Market, MarketFormatGuidance> = {
  us: {
    preferredLabel: 'US Resume',
    pageNorm: '1 page is preferred for most roles.',
    photoNorm: 'Photo is usually omitted unless explicitly requested.',
    recommendedTemplateId: 'us-classic',
    doList: ['Quantified impact bullets', 'Strong action verbs', 'ATS-friendly headings'],
  },
  eu: {
    preferredLabel: 'EU CV / Europass',
    pageNorm: '1-2 pages is common; 2+ acceptable for senior profiles.',
    photoNorm: 'Photo is optional and country-dependent.',
    recommendedTemplateId: 'eu-europass',
    doList: ['Language proficiency levels', 'Clear chronology', 'Professional summary'],
  },
  gb: {
    preferredLabel: 'UK CV',
    pageNorm: '2 pages is the standard target.',
    photoNorm: 'Photo is often discouraged in the UK.',
    recommendedTemplateId: 'gb-classic',
    doList: ['Personal profile section', 'Evidence-based achievements', 'A4 formatting'],
  },
  au: {
    preferredLabel: 'AU/NZ Resume',
    pageNorm: '2-3 pages is common in AU/NZ.',
    photoNorm: 'Photo is usually optional and often omitted.',
    recommendedTemplateId: 'au-classic',
    doList: ['Career summary', 'Role scope and outcomes', 'Referees or references note'],
  },
  latam: {
    preferredLabel: 'LATAM CV',
    pageNorm: '1-2 pages is common; longer for senior roles.',
    photoNorm: 'Photo is commonly expected.',
    recommendedTemplateId: 'latam-traditional',
    doList: ['Personal details block', 'References section', 'Localized wording'],
  },
  br: {
    preferredLabel: 'Curriculo (Brasil)',
    pageNorm: '1-2 pages is typical in Brazil.',
    photoNorm: 'Photo is optional but common in many sectors.',
    recommendedTemplateId: 'br-classic',
    doList: ['Objetivo Profissional', 'Portuguese-friendly tone', 'Clear CLT/PJ context if needed'],
  },
  in: {
    preferredLabel: 'India CV',
    pageNorm: '1-2 pages is preferred for most candidates.',
    photoNorm: 'Photo is often optional but accepted.',
    recommendedTemplateId: 'in-classic',
    doList: ['Career Objective', 'Technical skills visibility', 'Result-oriented experience'],
  },
  jp: {
    preferredLabel: 'Rirekisho / Shokumu Keirekisho',
    pageNorm: 'Structured, form-based layout is expected.',
    photoNorm: 'Photo is usually required in rirekisho.',
    recommendedTemplateId: 'jp-rirekisho',
    doList: ['Formal chronology', 'Standardized fields', 'Japanese-specific sections'],
  },
};

const marketDifferences: Partial<Record<Market, MarketDifferenceItem[]>> = {
  us: [
    { label: 'Page setup', value: 'Letter size with a 1-page target for most roles.' },
    { label: 'Personal details', value: 'Photo, date of birth, and nationality stay off the resume.' },
    { label: 'Content style', value: 'ATS-friendly headings with quantified impact bullets.' },
    { label: 'Template fit', value: 'Classic and modern resume layouts tuned for US recruiters.' },
  ],
  eu: [
    { label: 'Page setup', value: 'A4 CV format, usually 1-2 pages depending on seniority.' },
    { label: 'Personal details', value: 'Photo and personal details are optional and country-dependent.' },
    { label: 'Language scale', value: 'CEFR language levels are built into the CV workflow.' },
    { label: 'Template fit', value: 'Europass-compatible and modern EU layouts are available.' },
  ],
  jp: [
    { label: 'Page setup', value: 'A4 rirekisho and shokumu keirekisho formats.' },
    { label: 'Required fields', value: 'Photo, furigana, gender, nearest station, and commute time.' },
    { label: 'Content style', value: 'Formal chronology with Japan-specific sections.' },
    { label: 'Template fit', value: 'Includes 自己PR and 志望動機 sections for local applications.' },
  ],
};

function estimatePages(cv: CVData, config: MarketConfig): number {
  const unitsPerPage = config.pageSize === 'A4' ? 52 : 46;
  let units = 6;
  if (cv.objective) units += Math.ceil(cv.objective.length / 90) + 1;
  for (const e of cv.workExperience) {
    units += 2 + (e.description ? Math.ceil(e.description.length / 80) : 0);
  }
  units += cv.education.length * 1.5;
  units += Math.ceil(cv.skills.length / 6);
  units += Math.ceil(cv.languages.length / 3);
  units += cv.certifications.length;
  units += cv.references.length * 1.5;
  return Math.max(1, Math.ceil(units / unitsPerPage));
}

export function getMarketFormatGuidance(market: Market): MarketFormatGuidance {
  return guidanceByMarket[market];
}

export function getMarketDifferences(market: Market): MarketDifferenceItem[] {
  return marketDifferences[market] ?? [];
}

export function getFormatChecklist(cv: CVData, config: MarketConfig): FormatChecklistItem[] {
  const items: FormatChecklistItem[] = [];
  const estimatedPages = estimatePages(cv, config);

  if (config.pageLimitSuggestion) {
    items.push({
      id: 'pages',
      label: `Page length (${estimatedPages}/${config.pageLimitSuggestion})`,
      status: estimatedPages <= config.pageLimitSuggestion ? 'ok' : 'warn',
      detail: estimatedPages <= config.pageLimitSuggestion
        ? 'Within suggested range'
        : 'Above preferred page count for this market',
    });
  }

  if (config.fields.photo.visibility === 'required') {
    items.push({
      id: 'photo',
      label: 'Photo requirement',
      status: cv.personalInfo.photo ? 'ok' : 'warn',
      detail: cv.personalInfo.photo ? 'Photo included' : 'This market format usually expects a photo',
    });
  } else {
    const photoNorm = getMarketFormatGuidance(config.market).photoNorm.toLowerCase();
    const prefersNoPhoto = photoNorm.includes('discouraged') || photoNorm.includes('omitted');
    items.push({
      id: 'photo',
      label: 'Photo convention',
      status: 'ok',
      detail: prefersNoPhoto
        ? (cv.personalInfo.photo ? 'Included (optional)' : 'Omitted (typical for this market)')
        : (cv.personalInfo.photo ? 'Included (optional)' : 'Optional for this market'),
    });
  }

  if (config.sections.objective.required) {
    items.push({
      id: 'objective',
      label: 'Objective / summary',
      status: cv.objective?.trim() ? 'ok' : 'warn',
      detail: cv.objective?.trim() ? 'Present' : 'Required by this market profile',
    });
  }

  if (config.sections.workExperience.required) {
    items.push({
      id: 'work',
      label: 'Work experience',
      status: cv.workExperience.length > 0 ? 'ok' : 'warn',
      detail: cv.workExperience.length > 0 ? `${cv.workExperience.length} entries` : 'Add at least one role',
    });
  }

  if (config.sections.education.required) {
    items.push({
      id: 'education',
      label: 'Education',
      status: cv.education.length > 0 ? 'ok' : 'warn',
      detail: cv.education.length > 0 ? `${cv.education.length} entries` : 'Add at least one education entry',
    });
  }

  return items;
}
