'use client';

import { CheckCircle2, AlertTriangle, BookOpenText } from 'lucide-react';
import { useCVStore } from '@/store/cvStore';
import { Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import { getFormatChecklist, getMarketDifferences, getMarketFormatGuidance } from '@/lib/markets/formatGuidance';
import { euCountryGuidance } from '@/lib/markets/euCountryGuidance';

interface Props {
  market: Market;
  config: MarketConfig;
}

export default function MarketFormatPanel({ market, config }: Props) {
  const { cv } = useCVStore();
  const guide = getMarketFormatGuidance(market);
  const differences = getMarketDifferences(market);
  const checklist = getFormatChecklist(cv, config);
  const warnCount = checklist.filter((c) => c.status === 'warn').length;

  return (
    <section className="surface-card rounded-2xl p-4 md:p-5 border border-slate-200/90">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <BookOpenText size={13} />
            Format Guide
          </p>
          <h3 className="text-sm md:text-base font-semibold text-slate-900">
            {guide.preferredLabel} conventions
          </h3>
          <p className="text-xs text-slate-600 mt-1">{guide.pageNorm} {guide.photoNorm}</p>
        </div>
        {warnCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            <AlertTriangle size={12} />
            {warnCount} to review
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 size={12} />
            In range
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 mb-2">Checklist</p>
          <ul className="space-y-1.5">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                {item.status === 'ok' ? (
                  <CheckCircle2 size={13} className="mt-0.5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle size={13} className="mt-0.5 text-amber-600 flex-shrink-0" />
                )}
                <span className="text-xs text-slate-700">
                  <strong>{item.label}:</strong> {item.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 mb-2">Focus For This Market</p>
          <ul className="space-y-1.5">
            {guide.doList.map((point) => (
              <li key={point} className="text-xs text-slate-700 flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {differences.length > 0 && (
        <div className="mt-3 rounded-xl bg-white border border-slate-200 p-3">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 mb-2">What Changes In This Market</p>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {differences.map((item) => (
              <div key={item.label} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
                <dd className="mt-1 text-xs text-slate-700 leading-relaxed">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {market === 'eu' && (
        <details className="mt-3 rounded-xl bg-indigo-50 border border-indigo-100 p-3">
          <summary className="cursor-pointer list-none text-[11px] uppercase tracking-wide font-semibold text-indigo-700">
            EU Country Deep-Dives
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {euCountryGuidance.map((country) => (
              <div key={country.country} className="rounded-lg bg-white/80 border border-indigo-100 px-3 py-2">
                <p className="text-xs font-semibold text-indigo-900">{country.country}</p>
                <p className="mt-1 text-xs text-indigo-800 leading-relaxed">{country.length} {country.photo}</p>
                <p className="mt-1 text-[11px] text-indigo-700">{country.emphasis}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
