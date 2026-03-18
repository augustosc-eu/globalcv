'use client';

import { useEffect, useMemo } from 'react';
import { Market } from '@/types/cv.types';
import { getMarketConfig } from '@/lib/markets';
import { useCVStore } from '@/store/cvStore';
import { decodeCVFromURL, removeShareParam } from '@/lib/sharing/shareUrl';
import AppHeader from '@/components/shared/AppHeader';
import WizardProgress from './WizardProgress';
import WizardNavigation from './WizardNavigation';
import StepRouter from './StepRouter';
import PreviewPane from '@/components/preview/PreviewPane';

interface WizardShellProps { market: Market }
export interface WizardStep { key: string; label: string }

export default function WizardShell({ market }: WizardShellProps) {
  const config = getMarketConfig(market);
  const { initializeMarket, setSteps, wizard, cv, setPersonalInfo, setObjective,
          addWorkExperience, addEducation, addSkill, addLanguage, addCertification,
          setTemplate, setColorTheme, setPageSize } = useCVStore();

  const steps: WizardStep[] = useMemo(() => {
    const list: WizardStep[] = [{ key: 'personal', label: 'Personal Info' }];
    const orderedSections = Object.entries(config.sections)
      .filter(([, s]) => s.enabled)
      .sort((a, b) => a[1].order - b[1].order);
    for (const [key, section] of orderedSections) {
      if (key === 'selfPromotion' || key === 'reasonForApplication') continue;
      list.push({ key, label: section.label ?? key });
    }
    if (
      config.fields.nearestStation.visibility !== 'hidden' ||
      config.fields.emergencyContact.visibility !== 'hidden' ||
      config.sections.selfPromotion.enabled ||
      config.sections.reasonForApplication.enabled
    ) {
      list.push({ key: 'japanSpecific', label: '追加情報' });
    }
    list.push({ key: 'template', label: 'Template' });
    return list;
  }, [config]);

  useEffect(() => {
    // Check for shared CV in URL first
    const shared = decodeCVFromURL();
    if (shared && shared.market === market) {
      setPersonalInfo(shared.personalInfo);
      if (shared.objective) setObjective(shared.objective);
      shared.workExperience.forEach((e) => addWorkExperience(e));
      shared.education.forEach((e) => addEducation(e));
      shared.skills.forEach((s) => addSkill(s));
      shared.languages.forEach((l) => addLanguage(l));
      shared.certifications.forEach((c) => addCertification(c));
      if (shared.templateId) setTemplate(shared.templateId);
      if (shared.colorTheme) setColorTheme(shared.colorTheme);
      if (shared.pageSize) setPageSize(shared.pageSize);
      removeShareParam();
    } else {
      initializeMarket(market);
    }
    setSteps(steps.map((s) => s.label));
  }, [market]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentStep = wizard.currentStep;
  const activeStep = steps[currentStep];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AppHeader market={market} config={config} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto flex-shrink-0">
          <WizardProgress steps={steps} currentStep={currentStep} market={market} />
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="lg:hidden mb-6">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span className="font-medium text-gray-800">{activeStep?.label}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, backgroundColor: config.color }} />
              </div>
            </div>

            <StepRouter activeStepKey={activeStep?.key ?? 'personal'} market={market} config={config} />

            <WizardNavigation steps={steps} currentStep={currentStep} market={market} config={config} />
          </div>
        </main>

        <aside className="hidden xl:flex flex-col w-[420px] bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
          <PreviewPane cv={cv} config={config} />
        </aside>
      </div>
    </div>
  );
}
