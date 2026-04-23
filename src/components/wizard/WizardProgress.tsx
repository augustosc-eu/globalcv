'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Market } from '@/types/cv.types';
import { getMarketConfig } from '@/lib/markets';
import { WizardStep } from './WizardShell';
import { useCVStore } from '@/store/cvStore';
import { computeStepCompletion } from '@/lib/cv/completeness';

interface Props {
  steps: WizardStep[];
  currentStep: number;
  market: Market;
}

export default function WizardProgress({ steps, currentStep, market }: Props) {
  const config = getMarketConfig(market);
  const { setCurrentStep, cv } = useCVStore();
  const completion = computeStepCompletion(cv, config);

  return (
    <nav className="space-y-1.5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3">
        Steps
      </p>
      {steps.map((step, idx) => {
        const isDone = idx < currentStep;
        const isActive = idx === currentStep;
        const meta = completion[step.key];

        return (
          <button
            key={step.key}
            onClick={() => idx < currentStep && setCurrentStep(idx)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all text-left border',
              isActive
                ? 'text-white font-semibold border-transparent shadow-sm'
                : isDone
                ? 'text-slate-700 border-slate-200 bg-white hover:bg-slate-50 cursor-pointer'
                : 'text-slate-400 border-slate-200/80 bg-slate-50/50 cursor-default'
            )}
            style={isActive ? { backgroundColor: config.color } : undefined}
            disabled={idx > currentStep}
          >
            <span
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                isActive
                  ? 'bg-white/20 text-white'
                  : isDone
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-400'
              )}
            >
              {isDone ? <Check size={12} strokeWidth={3} /> : idx + 1}
            </span>
            <div className="min-w-0">
              <span className="truncate block">{step.label}</span>
              {meta && (
                <span className={cn(
                  'text-[11px] block truncate mt-0.5',
                  isActive ? 'text-white/80' : 'text-slate-400'
                )}>
                  {meta.score}% · {meta.summary}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </nav>
  );
}
