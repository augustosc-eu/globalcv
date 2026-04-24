'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { CVData } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import { computeReadinessChecklist } from '@/lib/cv/completeness';
import { loadReadinessHistory, recordReadinessSnapshot, ReadinessSnapshot } from '@/lib/storage/readinessHistory';
import { runRecruiterScan } from '@/lib/cv/recruiterScan';

interface Props {
  cv: CVData;
  config: MarketConfig;
}

function readinessScore(cv: CVData, config: MarketConfig): number {
  const items = computeReadinessChecklist(cv, config);
  const ready = items.filter((item) => item.ready).length;
  return Math.round((ready / Math.max(items.length, 1)) * 100);
}

export default function ReadinessHistoryPanel({ cv, config }: Props) {
  const [history, setHistory] = useState<ReadinessSnapshot[]>([]);
  const score = readinessScore(cv, config);
  const first = history[0]?.score;
  const previous = first ?? score;
  const delta = score - previous;
  const nextAction = getNextAction(cv, config);

  useEffect(() => {
    setHistory(recordReadinessSnapshot(cv.id, score));
  }, [cv.id, score]);

  useEffect(() => {
    setHistory(loadReadinessHistory(cv.id));
  }, [cv.id]);

  return (
    <section className="surface-card rounded-2xl p-4 md:p-5 border border-slate-200/90">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold text-slate-500">
            <TrendingUp size={13} />
            Progress
          </p>
          <h3 className="text-sm md:text-base font-semibold text-slate-900 mt-1">
            {delta > 0 ? `You improved from ${previous}% to ${score}%` : `Readiness is at ${score}%`}
          </h3>
          <p className="text-xs text-slate-600 mt-1">Next best action: {nextAction}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{history.length} snapshots</span>
      </div>
    </section>
  );
}

function getNextAction(cv: CVData, config: MarketConfig): string {
  const readiness = computeReadinessChecklist(cv, config).find((item) => !item.ready);
  if (readiness) return readiness.label;
  const scanRisk = runRecruiterScan(cv, config).find((item) => item.tone === 'warn');
  if (scanRisk) return scanRisk.detail;
  return 'Review the final preview and export with the best mode for this application.';
}
