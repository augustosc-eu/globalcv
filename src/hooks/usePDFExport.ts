'use client';

import { useState, useCallback } from 'react';
import { CVData } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';

type ExportState = 'idle' | 'generating' | 'done' | 'error';

export function usePDFExport() {
  const [state, setState] = useState<ExportState>('idle');
  const [error, setError] = useState<string | null>(null);

  const exportPDF = useCallback(async (cv: CVData, config: MarketConfig) => {
    setState('generating');
    setError(null);
    try {
      const [pdfModule, docModule] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/lib/pdf/CVPDFDocument'),
      ]);

      const { pdf } = pdfModule;
      const { CVPDFDocument } = docModule;

      // @react-pdf/renderer requires a JSX element passed to pdf()
      // We use React.createElement via dynamic import to avoid SSR issues
      const { createElement } = await import('react');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = createElement(CVPDFDocument as any, { cv, config });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await (pdf as any)(doc).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cv.personalInfo.firstName || 'CV'}_${cv.personalInfo.lastName || ''}_${cv.market.toUpperCase()}.pdf`.replace(/\s+/g, '_');
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      setState('done');
      setTimeout(() => setState('idle'), 3000);
    } catch (err) {
      console.error('[PDF Export] Failed:', err);
      const msg = err instanceof Error ? err.message : 'PDF generation failed';
      setError(msg);
      setState('error');
      setTimeout(() => setState('idle'), 5000);
    }
  }, []);

  return { exportPDF, state, error };
}
