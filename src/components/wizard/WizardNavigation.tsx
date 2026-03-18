'use client';

import { ArrowLeft, ArrowRight, Download, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useCVStore } from '@/store/cvStore';
import { Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import { WizardStep } from './WizardShell';
import { usePDFExport } from '@/hooks/usePDFExport';
import { cn } from '@/lib/utils/cn';

interface Props {
  steps: WizardStep[];
  currentStep: number;
  market: Market;
  config: MarketConfig;
}

export default function WizardNavigation({ steps, currentStep, config }: Props) {
  const { nextStep, prevStep, cv } = useCVStore();
  const { exportPDF, state: pdfState, error: pdfError } = usePDFExport();
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div className="mt-10 flex items-center justify-between pt-6 border-t border-gray-200">
      <button
        onClick={prevStep}
        disabled={isFirst}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isFirst ? 'text-gray-300 cursor-default' : 'text-gray-600 hover:bg-gray-100'
        )}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <span className="text-sm text-gray-400">
        {currentStep + 1} / {steps.length}
      </span>

      {isLast ? (
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => exportPDF(cv, config)}
            disabled={pdfState === 'generating'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: pdfState === 'error' ? '#dc2626' : config.color }}
          >
            {pdfState === 'generating' ? (
              <><Loader2 size={16} className="animate-spin" /> Generating…</>
            ) : pdfState === 'done' ? (
              <><CheckCircle size={16} /> Done!</>
            ) : pdfState === 'error' ? (
              <><AlertCircle size={16} /> Failed</>
            ) : (
              <><Download size={16} /> Export PDF</>
            )}
          </button>
          {pdfState === 'error' && pdfError && (
            <p className="text-xs text-red-600 max-w-xs text-right">{pdfError}</p>
          )}
        </div>
      ) : (
        <button
          onClick={nextStep}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: config.color }}
        >
          Next
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
