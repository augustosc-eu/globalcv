'use client';

import { ChevronDown, Gauge } from 'lucide-react';
import { CVData, Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import { computeReadinessChecklist } from '@/lib/cv/completeness';
import { runRecruiterScan } from '@/lib/cv/recruiterScan';
import MarketFormatPanel from './MarketFormatPanel';
import ReadinessPanel from './ReadinessPanel';
import RecruiterScanPanel from './RecruiterScanPanel';
import ReadinessHistoryPanel from './ReadinessHistoryPanel';

interface Props {
  market: Market;
  cv: CVData;
  config: MarketConfig;
}

export default function BuilderInsightsPanel({ market, cv, config }: Props) {
  const readinessItems = computeReadinessChecklist(cv, config);
  const readyCount = readinessItems.filter((item) => item.ready).length;
  const readinessScore = Math.round((readyCount / Math.max(readinessItems.length, 1)) * 100);
  const scanRiskCount = runRecruiterScan(cv, config).filter((item) => item.tone === 'warn').length;

  return (
    <details className="group surface-card rounded-2xl border border-slate-200/90">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 md:px-5">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold text-slate-500">
            <Gauge size={13} />
            Guidance & readiness
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
            {readinessScore}% ready · {scanRiskCount === 0 ? 'No major scan risks' : `${scanRiskCount} scan ${scanRiskCount === 1 ? 'risk' : 'risks'}`} · {config.name}
          </p>
        </div>
        <ChevronDown size={16} className="flex-shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-4 border-t border-slate-200/80 p-4 md:p-5">
        <MarketFormatPanel market={market} config={config} />
        <ReadinessPanel cv={cv} config={config} />
        <RecruiterScanPanel cv={cv} config={config} />
        <ReadinessHistoryPanel cv={cv} config={config} />
      </div>
    </details>
  );
}
