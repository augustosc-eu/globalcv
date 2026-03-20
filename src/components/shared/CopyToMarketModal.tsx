'use client';

import { useState } from 'react';
import { X, Copy, CheckCircle } from 'lucide-react';
import { CVData, Market } from '@/types/cv.types';
import { saveCV } from '@/lib/storage/localStorage';
import { createEmptyCVData } from '@/store/cvStore';
import { getMarketConfig } from '@/lib/markets';

interface Props {
  cv: CVData;
  currentMarket: Market;
  open: boolean;
  onClose: () => void;
}

const ALL_MARKETS: Market[] = ['us', 'eu', 'latam', 'jp'];

const marketFlags: Record<Market, string> = {
  us: '🇺🇸', eu: '🇪🇺', latam: '🌎', jp: '🇯🇵',
};

export default function CopyToMarketModal({ cv, currentMarket, open, onClose }: Props) {
  const [selected, setSelected] = useState<Market | null>(null);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const targets = ALL_MARKETS.filter((m) => m !== currentMarket);

  function handleCopy() {
    if (!selected) return;
    const base = createEmptyCVData(selected);
    const copied: CVData = {
      ...base,
      // Copy all shared content fields
      personalInfo: { ...cv.personalInfo },
      objective: cv.objective,
      workExperience: cv.workExperience.map((e) => ({ ...e })),
      education: cv.education.map((e) => ({ ...e })),
      skills: cv.skills.map((s) => ({ ...s })),
      languages: cv.languages.map((l) => ({ ...l })),
      certifications: cv.certifications.map((c) => ({ ...c })),
      references: cv.references.map((r) => ({ ...r })),
      // Keep the target market's template/theme defaults
      market: selected,
      templateId: base.templateId,
      colorTheme: base.colorTheme,
      pageSize: base.pageSize,
    };
    saveCV(copied);
    setDone(true);
    setTimeout(() => {
      onClose();
      setDone(false);
      setSelected(null);
    }, 1800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-80 mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Copy CV to another market</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={14} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <CheckCircle size={28} className="text-green-500" />
            <p className="text-sm font-medium text-gray-800">Copied to {selected ? getMarketConfig(selected).name : ''}</p>
            <p className="text-xs text-gray-500 text-center px-4">Your CV data has been saved. Open that market to continue editing.</p>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-2">
              <p className="text-xs text-gray-500 mb-3">
                All content (name, work, education, skills, etc.) will be copied. The target market&apos;s default template and theme will be used.
              </p>
              {targets.map((m) => {
                const cfg = getMarketConfig(m);
                return (
                  <button
                    key={m}
                    onClick={() => setSelected(m)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-colors ${
                      selected === m
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">{marketFlags[m]}</span>
                    <div className="text-left">
                      <p className="font-medium text-xs">{cfg.name}</p>
                      <p className="text-gray-400 text-xs">{cfg.pageSize} · {cfg.templates[0]?.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-5 pb-4 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCopy}
                disabled={!selected}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Copy size={12} />
                Copy
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
