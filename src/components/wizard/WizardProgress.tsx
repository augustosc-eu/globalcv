'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Market } from '@/types/cv.types';
import { getMarketConfig } from '@/lib/markets';
import { WizardStep } from './WizardShell';
import { useCVStore } from '@/store/cvStore';

interface Props {
  steps: WizardStep[];
  currentStep: number;
  market: Market;
}

export default function WizardProgress({ steps, currentStep, market }: Props) {
  const config = getMarketConfig(market);
  const { setCurrentStep } = useCVStore();

  return (
    <nav className="space-y-1">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-4">
        Steps
      </p>
      {steps.map((step, idx) => {
        const isDone = idx < currentStep;
        const isActive = idx === currentStep;

        return (
          <button
            key={step.key}
            onClick={() => idx < currentStep && setCurrentStep(idx)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
              isActive
                ? 'text-white font-semibold'
                : isDone
                ? 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                : 'text-gray-400 cursor-default'
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
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400'
              )}
            >
              {isDone ? <Check size={12} strokeWidth={3} /> : idx + 1}
            </span>
            <span className="truncate">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
