import { Market } from '@/types/cv.types';

export interface SensitiveGuidance {
  tone: 'privacy' | 'detail';
  title: string;
  points: string[];
}

const guidance: Record<Market, SensitiveGuidance> = {
  us: {
    tone: 'privacy',
    title: 'Keep sensitive details minimal',
    points: ['Photo, date of birth, and marital status are hidden by default.', 'Focus on impact, keywords, and contact details.'],
  },
  gb: {
    tone: 'privacy',
    title: 'UK recruiters expect a privacy-first CV',
    points: ['Avoid DOB, nationality, and photo unless explicitly required.', 'Keep the profile concise and evidence-based.'],
  },
  au: {
    tone: 'privacy',
    title: 'AU/NZ resumes usually avoid extra personal details',
    points: ['Photo is optional and often omitted.', 'Use the extra space for achievements and referees.'],
  },
  in: {
    tone: 'privacy',
    title: 'Keep optional details intentional',
    points: ['DOB and marital status can be included but are not required.', 'Prioritize objective, skills, and project outcomes first.'],
  },
  eu: {
    tone: 'detail',
    title: 'European CVs can include more profile detail',
    points: ['Language levels and location detail are often helpful.', 'Photo and personal details depend on country and industry.'],
  },
  latam: {
    tone: 'detail',
    title: 'LATAM CVs often expect a fuller profile',
    points: ['A photo and personal details can be normal for this market.', 'References and localized wording improve fit.'],
  },
  br: {
    tone: 'detail',
    title: 'Brazilian curriculos often include profile context',
    points: ['Objective, employment context, and contact details should be easy to scan.', 'Photo is optional but commonly accepted.'],
  },
  jp: {
    tone: 'detail',
    title: 'Japan formats expect structured personal details',
    points: ['Photo, furigana, and commute details are often part of the format.', 'Keep fields formal and chronology precise.'],
  },
};

export function getSensitiveGuidance(market: Market): SensitiveGuidance {
  return guidance[market];
}
