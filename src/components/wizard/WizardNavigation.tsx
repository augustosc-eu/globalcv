'use client';

import { useEffect, useState } from 'react';
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
  const [hidePhotoInPdf, setHidePhotoInPdf] = useState(false);
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('globalcv_hide_photo_pdf');
      setHidePhotoInPdf(saved === 'true');
    } catch {
      // no-op
    }
  }, []);

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
        {config.ui.back}
      </button>

      <span className="text-sm text-gray-400">
        {currentStep + 1} / {steps.length}
      </span>

      {isLast ? (
        <div className="flex flex-col items-end gap-1">
          <label className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hidePhotoInPdf}
              onChange={(e) => {
                const checked = e.target.checked;
                setHidePhotoInPdf(checked);
                try {
                  window.localStorage.setItem('globalcv_hide_photo_pdf', String(checked));
                } catch {
                  // no-op
                }
              }}
              className="h-3.5 w-3.5 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
            />
            Hide photo in PDF
          </label>
          <button
            onClick={() => exportPDF(cv, config, { hidePhoto: hidePhotoInPdf })}
            disabled={pdfState === 'generating'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: pdfState === 'error' ? '#dc2626' : config.color }}
          >
            {pdfState === 'generating' ? (
              <><Loader2 size={16} className="animate-spin" /> {config.ui.generating}</>
            ) : pdfState === 'done' ? (
              <><CheckCircle size={16} /> {config.ui.done}</>
            ) : pdfState === 'error' ? (
              <><AlertCircle size={16} /> {config.ui.failed}</>
            ) : (
              <><Download size={16} /> {config.ui.exportPDF}</>
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
          {config.ui.next}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
