'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { Market } from '@/types/cv.types';
import { getMarketConfig } from '@/lib/markets';
import { useCVStore } from '@/store/cvStore';
import { decodeCVFromURL, removeShareParam } from '@/lib/sharing/shareUrl';
import AppHeader from '@/components/shared/AppHeader';
import WizardProgress from './WizardProgress';
import WizardNavigation from './WizardNavigation';
import StepRouter from './StepRouter';
import PreviewPane from '@/components/preview/PreviewPane';
import CrossTabSyncBanner from '@/components/shared/CrossTabSyncBanner';
import BuilderInsightsPanel from './BuilderInsightsPanel';
import { computeStepCompletion } from '@/lib/cv/completeness';
import { useSearchParams } from 'next/navigation';
import { usePDFExport } from '@/hooks/usePDFExport';

interface WizardShellProps { market: Market }
export interface WizardStep { key: string; label: string }

const PREVIEW_WIDTH_KEY = 'globalcv_preview_width';
const DEFAULT_PREVIEW_WIDTH = 420;
const MIN_PREVIEW_WIDTH = 320;
const MAX_PREVIEW_WIDTH = 720;

export default function WizardShell({ market }: WizardShellProps) {
  const config = getMarketConfig(market);
  const searchParams = useSearchParams();
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(DEFAULT_PREVIEW_WIDTH);
  const appliedUrlTargeting = useRef(false);
  const resizeState = useRef<{ startX: number; startWidth: number } | null>(null);
  const { exportPDF, state: pdfState, error: pdfError } = usePDFExport();
  const { initializeMarket, setSteps, wizard, cv, setPersonalInfo, setObjective,
          addWorkExperience, addEducation, addSkill, addLanguage, addCertification,
          addReference, setSelfPromotion, setReasonForApplication, setDesiredConditions,
          setTemplate, setColorTheme, setPageSize, setTargeting, setCurrentStep } = useCVStore();

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
      shared.references.forEach((r) => addReference(r));
      if (shared.selfPromotion) setSelfPromotion(shared.selfPromotion);
      if (shared.reasonForApplication) setReasonForApplication(shared.reasonForApplication);
      if (shared.desiredConditions) setDesiredConditions(shared.desiredConditions);
      if (shared.templateId) setTemplate(shared.templateId);
      if (shared.colorTheme) setColorTheme(shared.colorTheme);
      if (shared.pageSize) setPageSize(shared.pageSize);
      removeShareParam();
    } else {
      initializeMarket(market);
    }
    setSteps(steps.map((s) => s.label));
  }, [market]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (appliedUrlTargeting.current) return;
    const role = searchParams.get('targetRole') ?? undefined;
    const company = searchParams.get('targetCompany') ?? undefined;
    const notes = searchParams.get('jobDescriptionNotes') ?? undefined;
    const mode = searchParams.get('mode');
    if (!role && !company && !notes && !mode) return;

    appliedUrlTargeting.current = true;
    if (role || company || notes) {
      setTargeting({ targetRole: role, targetCompany: company, jobDescriptionNotes: notes });
    }
    if (mode === 'job' || role || notes) {
      const objectiveStep = steps.findIndex((step) => step.key === 'objective');
      if (objectiveStep >= 0) setCurrentStep(objectiveStep);
    }
    if (mode === 'convert') {
      const templateStep = steps.findIndex((step) => step.key === 'template');
      if (templateStep >= 0) setCurrentStep(templateStep);
    }
  }, [searchParams, setCurrentStep, setTargeting, steps]);

  const currentStep = wizard.currentStep;
  const activeStep = steps[currentStep];
  const completion = computeStepCompletion(cv, config);
  const activeCompletion = completion[activeStep?.key ?? 'personal'];

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(PREVIEW_WIDTH_KEY));
      if (Number.isFinite(saved) && saved >= MIN_PREVIEW_WIDTH && saved <= MAX_PREVIEW_WIDTH) {
        setPreviewWidth(saved);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PREVIEW_WIDTH_KEY, String(previewWidth));
    } catch {
      // no-op
    }
  }, [previewWidth]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!resizeState.current) return;
      const delta = resizeState.current.startX - event.clientX;
      const nextWidth = resizeState.current.startWidth + delta;
      setPreviewWidth(Math.max(MIN_PREVIEW_WIDTH, Math.min(MAX_PREVIEW_WIDTH, nextWidth)));
    }

    function handlePointerUp() {
      resizeState.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  function startPreviewResize(event: React.PointerEvent<HTMLButtonElement>) {
    resizeState.current = {
      startX: event.clientX,
      startWidth: previewWidth,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  return (
    <div className="min-h-screen flex flex-col app-shell-bg">
      <AppHeader market={market} config={config} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:flex flex-col w-72 bg-white/85 backdrop-blur border-r border-slate-200 p-4 overflow-y-auto flex-shrink-0">
          <WizardProgress steps={steps} currentStep={currentStep} market={market} />
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-5">
            <div className="lg:hidden surface-card rounded-2xl p-4">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span className="font-semibold text-gray-800">{activeStep?.label}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, backgroundColor: config.color }} />
              </div>
              {activeCompletion && (
                <p className="mt-2 text-xs text-slate-500">
                  Section completion: <span className="font-semibold text-slate-700">{activeCompletion.score}%</span> · {activeCompletion.summary}
                </p>
              )}
            </div>

            <BuilderInsightsPanel market={market} cv={cv} config={config} />

            <section className="surface-card rounded-2xl p-5 md:p-6 border border-slate-200/90">
              <StepRouter activeStepKey={activeStep?.key ?? 'personal'} market={market} config={config} />
              <WizardNavigation steps={steps} currentStep={currentStep} market={market} config={config} />
            </section>
          </div>
        </main>

        <button
          type="button"
          onPointerDown={startPreviewResize}
          onDoubleClick={() => setPreviewWidth(DEFAULT_PREVIEW_WIDTH)}
          className="hidden xl:flex relative w-3 flex-shrink-0 items-stretch justify-center bg-transparent group"
          aria-label="Resize preview pane"
          title="Drag to resize preview pane. Double-click to reset."
        >
          <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-slate-200 group-hover:bg-slate-300 transition-colors" />
          <span className="absolute top-1/2 left-1/2 h-14 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200 group-hover:bg-slate-300 transition-colors" />
        </button>

        <aside
          className="hidden xl:flex flex-col bg-white/85 backdrop-blur border-l border-slate-200 overflow-y-auto flex-shrink-0"
          style={{ width: `${previewWidth}px` }}
        >
          <PreviewPane cv={cv} config={config} />
        </aside>
      </div>

      {/* Sticky bottom mobile navigation bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div className="flex items-center px-4 py-2 gap-3">
          <button
            onClick={() => useCVStore.getState().prevStep()}
            disabled={currentStep === 0}
            className="flex items-center justify-center gap-1 w-10 h-10 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex-shrink-0"
            aria-label="Previous step"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              {steps.map((s, i) => (
                <span
                  key={s.key}
                  className={`rounded-full transition-all duration-200 ${i === currentStep ? 'w-4 h-2' : 'w-2 h-2 opacity-30'}`}
                  style={{ backgroundColor: config.color }}
                />
              ))}
            </div>
            <p className="text-[10px] font-medium text-slate-500">{steps[currentStep]?.label}</p>
          </div>

          <button
            onClick={() => setShowMobilePreview(true)}
            className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0"
            aria-label="Preview CV"
          >
            <Eye size={18} />
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => useCVStore.getState().nextStep()}
              className="flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-white text-sm font-semibold transition-colors active:scale-95 flex-shrink-0"
              style={{ backgroundColor: config.color }}
            >
              {config.ui.next}
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => exportPDF(cv, config)}
              disabled={pdfState === 'generating'}
              className="flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl text-white text-xs font-semibold transition-colors active:scale-95 flex-shrink-0"
              style={{ backgroundColor: config.color }}
            >
              {pdfState === 'generating' ? 'Exporting' : pdfState === 'done' ? 'Done' : 'Export'}
            </button>
          )}
        </div>
      </nav>

      {pdfState === 'error' && pdfError && (
        <div className="lg:hidden fixed bottom-16 left-4 right-4 z-40 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-lg">
          {pdfError}
        </div>
      )}

      {/* Add bottom padding on mobile so content doesn't get hidden behind nav */}
      <div className="lg:hidden h-16" />

      <CrossTabSyncBanner market={market} />

      {/* Mobile preview modal */}
      {showMobilePreview && (
        <div className="xl:hidden fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">CV Preview</span>
            <button
              onClick={() => setShowMobilePreview(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close preview"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <PreviewPane cv={cv} config={config} />
          </div>
        </div>
      )}
    </div>
  );
}
