'use client';

import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { CVData } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import { runRecruiterScan } from '@/lib/cv/recruiterScan';

interface Props {
  cv: CVData;
  config: MarketConfig;
}

export default function RecruiterScanPanel({ cv, config }: Props) {
  const items = runRecruiterScan(cv, config);
  const warnCount = items.filter((item) => item.tone === 'warn').length;

  return (
    <section className="surface-card rounded-2xl p-4 md:p-5 border border-slate-200/90">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">Recruiter Scan</p>
          <h3 className="text-sm md:text-base font-semibold text-slate-900 mt-1">
            {warnCount === 0 ? 'No major scan risks' : `${warnCount} scan ${warnCount === 1 ? 'risk' : 'risks'} to improve`}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {items.map((item) => {
          const Icon = item.tone === 'good' ? CheckCircle2 : item.tone === 'warn' ? AlertTriangle : Info;
          const toneClass = item.tone === 'good'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : item.tone === 'warn'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-blue-200 bg-blue-50 text-blue-800';
          return (
            <div key={item.id} className={`rounded-xl border p-3 ${toneClass}`}>
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <Icon size={13} />
                {item.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed">{item.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
