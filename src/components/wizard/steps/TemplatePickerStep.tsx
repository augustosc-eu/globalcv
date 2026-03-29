'use client';

import { useCVStore } from '@/store/cvStore';
import { Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import StepHeader from './StepHeader';
import ThemeSelector from '@/components/shared/ThemeSelector';
import ATSSuggestionsPanel from '@/components/shared/ATSSuggestionsPanel';
import { cn } from '@/lib/utils/cn';
import { Check, Sparkles } from 'lucide-react';
import { getMarketFormatGuidance } from '@/lib/markets/formatGuidance';

interface Props { market: Market; config: MarketConfig; }

const templatePreviews: Record<string, string> = {
  'us-classic': '📄',
  'us-modern': '🎨',
  'eu-europass': '🇪🇺',
  'eu-modern': '✨',
  'latam-traditional': '📋',
  'latam-modern': '🌟',
  'jp-rirekisho': '📝',
  'jp-shokumu': '📊',
};

export default function TemplatePickerStep({ config }: Props) {
  const { cv, setTemplate } = useCVStore();
  const showATS = config.enableATSSuggestions;
  const guidance = getMarketFormatGuidance(config.market);

  return (
    <div className="space-y-6">
      <StepHeader
        title={config.ui.templateTitle}
        description={config.ui.templateDesc}
      />

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">Recommended for {config.name}</p>
        <p className="text-sm text-blue-700">
          <strong>{config.templates.find((t) => t.id === guidance.recommendedTemplateId)?.name ?? 'Default template'}</strong>
          {' '}fits the preferred {guidance.preferredLabel} format.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {config.templates.map((tmpl) => {
          const isSelected = cv.templateId === tmpl.id;
          const isRecommended = tmpl.id === guidance.recommendedTemplateId;
          return (
            <button
              key={tmpl.id}
              onClick={() => setTemplate(tmpl.id)}
              className={cn(
                'relative flex flex-col items-start gap-3 p-5 border rounded-2xl text-left transition-all hover:shadow-md',
                isSelected ? 'border-current shadow-md' : 'border-slate-200 bg-white'
              )}
              style={isSelected ? { borderColor: config.color } : undefined}
            >
              {isRecommended && (
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-slate-900 text-white px-2 py-0.5 text-[10px] font-semibold">
                  <Sparkles size={10} />
                  Recommended
                </span>
              )}
              {isSelected && (
                <span
                  className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: config.color }}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
              )}

              <span className={cn('text-4xl', isRecommended ? 'mt-4' : '')}>{templatePreviews[tmpl.id] ?? '📄'}</span>

              <div>
                <p className="font-bold text-gray-900">{tmpl.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{tmpl.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Color theme — always visible here, header version is hidden on mobile */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">{config.ui.colorTheme}</p>
          <ThemeSelector config={config} inline />
        </div>
        <p className="text-xs text-gray-400">
          {config.ui.selectedLabel} <strong>{config.templates.find((t) => t.id === cv.templateId)?.name ?? 'None'}</strong>
          {' — '}{config.templates.find((t) => t.id === cv.templateId)?.description}
        </p>
      </div>

      {/* ATS readiness checklist — US only */}
      {showATS && <ATSSuggestionsPanel cv={cv} />}
    </div>
  );
}
