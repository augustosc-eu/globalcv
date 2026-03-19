'use client';

import { useCVStore } from '@/store/cvStore';
import { Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import StepHeader from './StepHeader';
import ThemeSelector from '@/components/shared/ThemeSelector';
import { cn } from '@/lib/utils/cn';
import { Check } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <StepHeader
        title={config.ui.templateTitle}
        description={config.ui.templateDesc}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {config.templates.map((tmpl) => {
          const isSelected = cv.templateId === tmpl.id;
          return (
            <button
              key={tmpl.id}
              onClick={() => setTemplate(tmpl.id)}
              className={cn(
                'relative flex flex-col items-start gap-3 p-5 border-2 rounded-2xl text-left transition-all hover:shadow-md',
                isSelected ? 'border-current shadow-md' : 'border-gray-200'
              )}
              style={isSelected ? { borderColor: config.color } : undefined}
            >
              {isSelected && (
                <span
                  className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: config.color }}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
              )}

              <span className="text-4xl">{templatePreviews[tmpl.id] ?? '📄'}</span>

              <div>
                <p className="font-bold text-gray-900">{tmpl.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{tmpl.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Color theme — always visible here, header version is hidden on mobile */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">{config.ui.colorTheme}</p>
          <ThemeSelector config={config} inline />
        </div>
        <p className="text-xs text-gray-400">
          {config.ui.selectedLabel} <strong>{config.templates.find((t) => t.id === cv.templateId)?.name ?? 'None'}</strong>
          {' — '}{config.templates.find((t) => t.id === cv.templateId)?.description}
        </p>
      </div>
    </div>
  );
}
