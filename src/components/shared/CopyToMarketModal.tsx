'use client';

import { useState } from 'react';
import { X, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { CVData, Market } from '@/types/cv.types';
import { saveCV } from '@/lib/storage/localStorage';
import { createEmptyCVData } from '@/store/cvStore';
import { getMarketConfig } from '@/lib/markets';
import { getMarketSwitchPreview } from '@/lib/markets/marketSwitchPreview';

interface Props {
  cv: CVData;
  currentMarket: Market;
  open: boolean;
  onClose: () => void;
}

const ALL_MARKETS: Market[] = ['us', 'eu', 'latam', 'jp', 'gb', 'au', 'in', 'br'];

const marketFlags: Record<Market, string> = {
  us: '🇺🇸', eu: '🇪🇺', latam: '🌎', jp: '🇯🇵',
  gb: '🇬🇧', au: '🇦🇺', in: '🇮🇳', br: '🇧🇷',
};

export default function CopyToMarketModal({ cv, currentMarket, open, onClose }: Props) {
  const [selected, setSelected] = useState<Market | null>(null);
  const [done, setDone] = useState(false);
  const [useLocalizationDefaults, setUseLocalizationDefaults] = useState(true);

  if (!open) return null;

  const targets = ALL_MARKETS.filter((m) => m !== currentMarket);
  const previewConfig = selected ? getMarketConfig(selected) : null;
  const switchPreview = selected ? getMarketSwitchPreview(cv, selected, !useLocalizationDefaults) : null;

  function handleCopy() {
    if (!selected) return;
    const base = createEmptyCVData(selected);
    const targetConfig = getMarketConfig(selected);
    const hiddenFields = [
      targetConfig.fields.photo.visibility === 'hidden' && cv.personalInfo.photo ? 'photo' : null,
      targetConfig.fields.dateOfBirth.visibility === 'hidden' && cv.personalInfo.dateOfBirth ? 'dateOfBirth' : null,
      targetConfig.fields.maritalStatus.visibility === 'hidden' && cv.personalInfo.maritalStatus ? 'maritalStatus' : null,
      targetConfig.fields.idNumber.visibility === 'hidden' && cv.personalInfo.idNumber ? 'idNumber' : null,
    ].filter(Boolean) as string[];
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
      targetRole: cv.targetRole,
      targetCompany: cv.targetCompany,
      jobDescriptionNotes: cv.jobDescriptionNotes,
      // Keep the target market's template/theme defaults
      market: selected,
      templateId: useLocalizationDefaults ? base.templateId : cv.templateId,
      colorTheme: useLocalizationDefaults ? base.colorTheme : cv.colorTheme,
      pageSize: useLocalizationDefaults ? base.pageSize : cv.pageSize,
      hiddenSections: hiddenFields,
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
                All content will be copied, then localized for the target market. You can keep the source template or use the target market defaults.
              </p>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs text-slate-700 mb-3">
                <input
                  type="checkbox"
                  checked={useLocalizationDefaults}
                  onChange={(e) => setUseLocalizationDefaults(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Use target market page size, theme, and template defaults
              </label>
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
              {previewConfig && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Copy preview for {previewConfig.name}</p>
                  {switchPreview?.setup.map((item) => (
                    <p key={item} className="text-xs text-slate-700">{item}</p>
                  ))}
                  {switchPreview && switchPreview.newRequirements.length > 0 && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 mb-1">Review after copy</p>
                      <ul className="space-y-1">
                        {switchPreview.newRequirements.map((item) => (
                          <li key={item} className="text-xs text-blue-800">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {switchPreview && switchPreview.hiddenOrSensitive.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 mb-1">
                        <AlertTriangle size={11} />
                        Sensitive fields
                      </p>
                      <ul className="space-y-1">
                        {switchPreview.hiddenOrSensitive.map((item) => (
                          <li key={item} className="text-xs text-amber-800">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {switchPreview && switchPreview.sections.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Enabled sections</p>
                      <div className="flex flex-wrap gap-1.5">
                        {switchPreview.sections.slice(0, 8).map((section) => (
                          <span key={section} className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600">{section}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
