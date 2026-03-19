'use client';

import { useState } from 'react';
import { X, Upload, Sparkles, AlertCircle } from 'lucide-react';
import { useCVStore } from '@/store/cvStore';
import { Market } from '@/types/cv.types';
import { parseRawCV } from '@/lib/parser/cvParser';
import { getMarketConfig } from '@/lib/markets';

interface Props {
  market: Market;
  open: boolean;
  onClose: () => void;
}

export default function PasteImportModal({ market, open, onClose }: Props) {
  const config = getMarketConfig(market);
  const [text, setText] = useState('');
  const [step, setStep] = useState<'paste' | 'preview' | 'done'>('paste');
  const [preview, setPreview] = useState<ReturnType<typeof parseRawCV> | null>(null);
  const { cv, setPersonalInfo, setObjective, addWorkExperience, addEducation,
          addSkill, addLanguage, addCertification, resetCV } = useCVStore();

  if (!open) return null;

  const handleParse = () => {
    if (!text.trim()) return;
    const parsed = parseRawCV(text, market);
    setPreview(parsed);
    setStep('preview');
  };

  const handleApply = () => {
    if (!preview) return;

    // Reset then apply
    resetCV(market);
    if (preview.personalInfo) setPersonalInfo(preview.personalInfo);
    if (preview.objective) setObjective(preview.objective);
    preview.workExperience?.forEach((e) => addWorkExperience(e));
    preview.education?.forEach((e) => addEducation(e));
    preview.skills?.forEach((s) => addSkill(s));
    preview.languages?.forEach((l) => addLanguage(l));
    preview.certifications?.forEach((c) => addCertification(c));

    setStep('done');
    setTimeout(() => {
      onClose();
      setStep('paste');
      setText('');
      setPreview(null);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-violet-600" />
            <h2 className="font-bold text-gray-900">{config.ui.importTitle}</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {step === 'paste' && (
            <>
              <p className="text-sm text-gray-600">
                {config.ui.importDesc}
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  {config.ui.importWarning}
                </p>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={config.ui.importPlaceholder}
                rows={16}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 transition resize-none"
              />
            </>
          )}

          {step === 'preview' && preview && (
            <>
              <p className="text-sm text-gray-600">
                {config.ui.importSuccessDesc}
              </p>
              <div className="space-y-3 text-sm">
                <PreviewRow label={config.ui.previewLabels.name} value={`${preview.personalInfo?.firstName ?? ''} ${preview.personalInfo?.lastName ?? ''}`} notFoundLabel={config.ui.previewLabels.notFound} />
                <PreviewRow label={config.ui.previewLabels.email} value={preview.personalInfo?.email} notFoundLabel={config.ui.previewLabels.notFound} />
                <PreviewRow label={config.ui.previewLabels.phone} value={preview.personalInfo?.phone} notFoundLabel={config.ui.previewLabels.notFound} />
                <PreviewRow label={config.ui.previewLabels.linkedin} value={preview.personalInfo?.linkedIn} notFoundLabel={config.ui.previewLabels.notFound} />
                {preview.objective && <PreviewRow label={config.ui.previewLabels.summary} value={preview.objective.slice(0, 120) + (preview.objective.length > 120 ? '…' : '')} notFoundLabel={config.ui.previewLabels.notFound} />}
                <PreviewRow label={config.ui.previewLabels.workExperience} value={`${preview.workExperience?.length ?? 0} ${config.ui.previewLabels.entries}`} notFoundLabel={config.ui.previewLabels.notFound} />
                <PreviewRow label={config.ui.previewLabels.education} value={`${preview.education?.length ?? 0} ${config.ui.previewLabels.entries}`} notFoundLabel={config.ui.previewLabels.notFound} />
                <PreviewRow label={config.ui.previewLabels.skills} value={preview.skills?.slice(0, 8).map((s) => s.name).join(', ')} notFoundLabel={config.ui.previewLabels.notFound} />
                <PreviewRow label={config.ui.previewLabels.languages} value={preview.languages?.map((l) => l.language).join(', ')} notFoundLabel={config.ui.previewLabels.notFound} />
                <PreviewRow label={config.ui.previewLabels.certifications} value={`${preview.certifications?.length ?? 0} ${config.ui.previewLabels.entries}`} notFoundLabel={config.ui.previewLabels.notFound} />
              </div>

              {/* Work experience detail */}
              {(preview.workExperience?.length ?? 0) > 0 && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{config.ui.previewLabels.workPreview}</p>
                  {preview.workExperience?.slice(0, 3).map((e, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium">{e.title || config.ui.previewLabels.noTitle}</span>
                      {e.company ? <span className="text-gray-500"> · {e.company}</span> : null}
                      {e.startDate ? <span className="text-gray-400 ml-2 text-xs">{e.startDate}</span> : null}
                    </div>
                  ))}
                  {(preview.workExperience?.length ?? 0) > 3 && (
                    <p className="text-xs text-gray-400">+{(preview.workExperience?.length ?? 0) - 3} {config.ui.previewLabels.moreSuffix}</p>
                  )}
                </div>
              )}
            </>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Sparkles size={22} className="text-green-600" />
              </div>
              <p className="font-semibold text-gray-900">{config.ui.importSuccess}</p>
              <p className="text-sm text-gray-500">{config.ui.importSuccessDesc}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'done' && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            {step === 'preview' && (
              <button
                onClick={() => setStep('paste')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {config.ui.editText}
              </button>
            )}
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors">
              {config.ui.cancel}
            </button>
            {step === 'paste' && (
              <button
                onClick={handleParse}
                disabled={!text.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles size={14} />
                {config.ui.parseCV}
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={handleApply}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors"
              >
                <Upload size={14} />
                {config.ui.applyToBuilder}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewRow({ label, value, notFoundLabel }: { label: string; value?: string | null; notFoundLabel?: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-gray-500 w-36 flex-shrink-0 text-xs pt-0.5">{label}</span>
      <span className="text-gray-800 font-medium text-xs">{value || <span className="text-gray-300 italic">{notFoundLabel ?? 'not found'}</span>}</span>
    </div>
  );
}
