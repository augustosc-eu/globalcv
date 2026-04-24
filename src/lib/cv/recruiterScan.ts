import { CVData } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import { analyzeJobTargeting } from './jobTargeting';

export type ScanTone = 'good' | 'warn' | 'info';

export interface RecruiterScanItem {
  id: string;
  tone: ScanTone;
  title: string;
  detail: string;
}

const metricPattern = /(\d+%?|\$|€|£|¥|revenue|cost|users|customers|growth|reduced|increased|saved|launched)/i;

export function runRecruiterScan(cv: CVData, config: MarketConfig): RecruiterScanItem[] {
  const items: RecruiterScanItem[] = [];
  const objectiveLength = cv.objective?.trim().length ?? 0;
  const targeting = analyzeJobTargeting(cv);
  const workWithMetrics = cv.workExperience.filter((item) => metricPattern.test(item.description)).length;
  const workReady = cv.workExperience.filter((item) => item.title && item.company && item.description).length;

  items.push({
    id: 'summary-length',
    tone: objectiveLength >= 120 && objectiveLength <= 650 ? 'good' : 'warn',
    title: 'Summary fit',
    detail: objectiveLength === 0
      ? 'Add a summary so recruiters can understand your target and seniority quickly.'
      : objectiveLength < 120
        ? 'The summary is quite short. Add role focus, strengths, and one proof point.'
        : objectiveLength > 650
          ? 'The summary may be too long for quick scanning. Tighten it to the strongest 3-5 lines.'
          : 'Summary length is in a good scanning range.',
  });

  items.push({
    id: 'work-proof',
    tone: workWithMetrics > 0 ? 'good' : 'warn',
    title: 'Proof in bullets',
    detail: workWithMetrics > 0
      ? `${workWithMetrics} work entr${workWithMetrics === 1 ? 'y uses' : 'ies use'} metrics or outcome language.`
      : 'Add numbers, scope, or outcomes to at least one work entry.',
  });

  items.push({
    id: 'skills',
    tone: cv.skills.length >= 6 ? 'good' : cv.skills.length >= 3 ? 'info' : 'warn',
    title: 'Skill coverage',
    detail: cv.skills.length >= 6
      ? 'Skills are broad enough for a quick recruiter scan.'
      : `You have ${cv.skills.length} skills. Add role-specific tools, methods, or domain skills.`,
  });

  if (targeting) {
    items.push({
      id: 'target-keywords',
      tone: targeting.missingKeywords.length <= 3 ? 'good' : 'warn',
      title: 'Job keyword match',
      detail: targeting.missingKeywords.length
        ? `Consider adding: ${targeting.missingKeywords.slice(0, 5).join(', ')}.`
        : 'Your skills and experience cover the repeated job-description keywords.',
    });
  } else {
    items.push({
      id: 'target-keywords',
      tone: 'info',
      title: 'Job keyword match',
      detail: 'Paste a target job description in the summary step to unlock keyword checks.',
    });
  }

  if (config.market === 'us' || config.market === 'gb') {
    items.push({
      id: 'photo-risk',
      tone: cv.personalInfo.photo ? 'warn' : 'good',
      title: 'Photo convention',
      detail: cv.personalInfo.photo
        ? 'This market often prefers no photo. Use ATS-safe or privacy export when applying broadly.'
        : 'Photo is omitted, which fits common recruiter expectations in this market.',
    });
  }

  if (config.market === 'jp') {
    items.push({
      id: 'jp-specific',
      tone: cv.selfPromotion && cv.reasonForApplication ? 'good' : 'warn',
      title: 'Japan-specific sections',
      detail: cv.selfPromotion && cv.reasonForApplication
        ? 'Self-promotion and application reason sections are filled.'
        : 'Add 自己PR and 志望動機 before exporting for Japanese applications.',
    });
  }

  items.push({
    id: 'work-depth',
    tone: workReady >= 2 ? 'good' : workReady === 1 ? 'info' : 'warn',
    title: 'Experience depth',
    detail: workReady >= 2
      ? 'Multiple roles are ready for review.'
      : workReady === 1
        ? 'One role is ready. Add another role if it helps show progression.'
        : 'Add at least one complete work entry with title, company, and description.',
  });

  return items;
}
