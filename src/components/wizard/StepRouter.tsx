'use client';

import { Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import PersonalInfoStep from './steps/PersonalInfoStep';
import ObjectiveStep from './steps/ObjectiveStep';
import WorkExperienceStep from './steps/WorkExperienceStep';
import EducationStep from './steps/EducationStep';
import SkillsStep from './steps/SkillsStep';
import LanguagesStep from './steps/LanguagesStep';
import CertificationsStep from './steps/CertificationsStep';
import ReferencesStep from './steps/ReferencesStep';
import JapanSpecificStep from './steps/JapanSpecificStep';
import TemplatePickerStep from './steps/TemplatePickerStep';

interface Props {
  activeStepKey: string;
  market: Market;
  config: MarketConfig;
}

const stepMap: Record<string, React.ComponentType<{ market: Market; config: MarketConfig }>> = {
  personal: PersonalInfoStep,
  objective: ObjectiveStep,
  workExperience: WorkExperienceStep,
  education: EducationStep,
  skills: SkillsStep,
  languages: LanguagesStep,
  certifications: CertificationsStep,
  references: ReferencesStep,
  japanSpecific: JapanSpecificStep,
  template: TemplatePickerStep,
};

export default function StepRouter({ activeStepKey, market, config }: Props) {
  const StepComponent = stepMap[activeStepKey] ?? PersonalInfoStep;
  return <StepComponent market={market} config={config} />;
}
