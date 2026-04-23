'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import { CVData } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import { computeReadinessChecklist } from '@/lib/cv/completeness';

interface Props {
  cv: CVData;
  config: MarketConfig;
}

export default function ReadinessPanel({ cv, config }: Props) {
  const items = computeReadinessChecklist(cv, config);
  const readyCount = items.filter((item) => item.ready).length;

  return (
    <section className="surface-card rounded-2xl p-4 md:p-5 border border-slate-200/90">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">Ready To Export</p>
          <h3 className="text-sm md:text-base font-semibold text-slate-900 mt-1">
            {readyCount}/{items.length} checks complete
          </h3>
        </div>
        <div className="text-sm font-semibold text-slate-700">
          {Math.round((readyCount / items.length) * 100)}%
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
            {item.ready ? (
              <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
            ) : (
              <Circle size={15} className="text-slate-300 flex-shrink-0" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
