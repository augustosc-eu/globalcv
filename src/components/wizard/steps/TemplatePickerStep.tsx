'use client';

import { useCVStore } from '@/store/cvStore';
import { Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import StepHeader from './StepHeader';
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
        title="Choose a Template"
        description="Select the layout that best fits your target role."
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

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-sm text-gray-600">
          <strong>Selected:</strong>{' '}
          {config.templates.find((t) => t.id === cv.templateId)?.name ?? 'None'}
          {' — '}
          {config.templates.find((t) => t.id === cv.templateId)?.description}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          The live preview on the right updates automatically as you fill in your information.
        </p>
      </div>
    </div>
  );
}
