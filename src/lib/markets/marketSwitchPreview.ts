import { CVData, Market } from '@/types/cv.types';
import { getMarketConfig } from '@/lib/markets';

export interface MarketSwitchPreview {
  setup: string[];
  newRequirements: string[];
  hiddenOrSensitive: string[];
  sections: string[];
}

export function getMarketSwitchPreview(cv: CVData, target: Market, keepCurrentDefaults = false): MarketSwitchPreview {
  const config = getMarketConfig(target);
  const setup = [
    keepCurrentDefaults
      ? 'Keeps the current template, color, and page size.'
      : `Uses ${config.pageSize}, ${config.templates[0]?.name ?? 'default'} template, and target market colors.`,
    `Language levels use ${config.languageLevelSystem.toUpperCase()}.`,
  ];

  const newRequirements = [
    config.fields.photo.visibility === 'required' && !cv.personalInfo.photo ? 'Photo is expected.' : null,
    config.fields.furigana.visibility === 'required' ? 'Furigana fields become important.' : null,
    config.fields.nearestStation.visibility === 'required' ? 'Nearest station and commute time are expected.' : null,
    config.sections.selfPromotion.enabled ? 'Self-promotion section is enabled.' : null,
    config.sections.reasonForApplication.enabled ? 'Reason for application section is enabled.' : null,
    config.sections.references.enabled && cv.references.length === 0 ? 'References are available in this market.' : null,
  ].filter(Boolean) as string[];

  const hiddenOrSensitive = [
    config.fields.photo.visibility === 'hidden' && cv.personalInfo.photo ? 'Photo will be hidden by default.' : null,
    config.fields.dateOfBirth.visibility === 'hidden' && cv.personalInfo.dateOfBirth ? 'Date of birth is discouraged.' : null,
    config.fields.nationality.visibility === 'hidden' && cv.personalInfo.nationality ? 'Nationality is discouraged.' : null,
    config.fields.maritalStatus.visibility === 'hidden' && cv.personalInfo.maritalStatus ? 'Marital status is discouraged.' : null,
    config.fields.idNumber.visibility === 'hidden' && cv.personalInfo.idNumber ? 'ID/document number is discouraged.' : null,
  ].filter(Boolean) as string[];

  const sections = Object.values(config.sections)
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order)
    .map((section) => section.label)
    .filter(Boolean) as string[];

  return {
    setup,
    newRequirements,
    hiddenOrSensitive,
    sections,
  };
}
