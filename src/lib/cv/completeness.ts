import { CVData } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';

export interface StepCompletion {
  score: number;
  complete: boolean;
  summary: string;
}

export function computeStepCompletion(cv: CVData, config: MarketConfig): Record<string, StepCompletion> {
  const fullName = `${cv.personalInfo.firstName} ${cv.personalInfo.lastName}`.trim();
  const personalFields = [
    fullName,
    cv.personalInfo.email,
    cv.personalInfo.phone,
    cv.personalInfo.address?.city,
    cv.personalInfo.address?.country,
  ];

  const workReady = cv.workExperience.filter((item) => item.title && item.company && item.description).length;
  const educationReady = cv.education.filter((item) => item.degree && item.institution).length;

  const steps: Record<string, StepCompletion> = {
    personal: summarizeRatio(personalFields.filter(Boolean).length, 5, `${personalFields.filter(Boolean).length}/5 core details`),
    objective: summarizeRatio(cv.objective?.trim() ? 1 : 0, 1, cv.objective?.trim() ? 'Summary added' : 'Add a summary'),
    workExperience: summarizeRatio(workReady, Math.max(cv.workExperience.length, 1), `${workReady}/${Math.max(cv.workExperience.length, 1)} polished roles`),
    education: summarizeRatio(educationReady, Math.max(cv.education.length, 1), `${educationReady}/${Math.max(cv.education.length, 1)} education entries`),
    skills: summarizeRatio(cv.skills.length > 0 ? Math.min(cv.skills.length, 8) : 0, 8, `${cv.skills.length} skills`),
    languages: summarizeRatio(cv.languages.length > 0 ? Math.min(cv.languages.length, 3) : 0, 3, `${cv.languages.length} languages`),
    certifications: summarizeRatio(cv.certifications.length > 0 ? Math.min(cv.certifications.length, 3) : 0, 3, `${cv.certifications.length} certifications`),
    references: summarizeRatio(cv.references.length > 0 ? Math.min(cv.references.length, 2) : 0, 2, `${cv.references.length} references`),
    japanSpecific: summarizeRatio(
      [cv.selfPromotion, cv.reasonForApplication, cv.personalInfo.nearestStation, cv.personalInfo.emergencyContact?.name].filter(Boolean).length,
      2,
      'Market-specific details'
    ),
    template: summarizeRatio(cv.templateId ? 1 : 0, 1, cv.templateId ? 'Template selected' : 'Choose a template'),
  };

  if (!config.sections.languages.enabled) delete steps.languages;
  if (!config.sections.certifications.enabled) delete steps.certifications;
  if (!config.sections.references.enabled) delete steps.references;

  return steps;
}

export function computeReadinessChecklist(cv: CVData, config: MarketConfig): Array<{ id: string; label: string; ready: boolean }> {
  return [
    { id: 'contact', label: 'Contact details are filled in', ready: Boolean(cv.personalInfo.email && cv.personalInfo.phone && cv.personalInfo.firstName) },
    { id: 'summary', label: 'Professional summary is written', ready: Boolean(cv.objective?.trim()) || !config.sections.objective.required },
    { id: 'work', label: 'At least one strong work entry is complete', ready: cv.workExperience.some((item) => item.title && item.company && item.description) },
    { id: 'education', label: 'Education is included', ready: cv.education.length > 0 || !config.sections.education.required },
    { id: 'skills', label: 'Core skills are listed', ready: cv.skills.length >= 3 },
    { id: 'template', label: 'Template and market defaults are selected', ready: Boolean(cv.templateId && cv.pageSize) },
  ];
}

function summarizeRatio(count: number, total: number, summary: string): StepCompletion {
  const safeTotal = Math.max(total, 1);
  const score = Math.min(100, Math.round((count / safeTotal) * 100));
  return {
    score,
    complete: score >= 100,
    summary,
  };
}
