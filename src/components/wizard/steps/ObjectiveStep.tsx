'use client';

import { useCVStore } from '@/store/cvStore';
import { MarketConfig } from '@/types/market.types';
import StepHeader from './StepHeader';

interface Props {
  config: MarketConfig;
}

export default function ObjectiveStep({ config }: Props) {
  const { cv, setObjective } = useCVStore();
  const sectionLabel = config.sections.objective.label ?? 'Professional Summary';

  return (
    <div className="space-y-6">
      <StepHeader title={sectionLabel} description={config.ui.objectiveDesc} />

      <div>
        <textarea
          value={cv.objective ?? ''}
          onChange={(e) => setObjective(e.target.value)}
          rows={6}
          placeholder={config.ui.objectivePlaceholder}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">
          {cv.objective?.length ?? 0} {config.ui.characters}{config.ui.objectiveAimHint}
        </p>
      </div>

      {config.enableATSSuggestions && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">ATS Tips</p>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li>Start with your job title and years of experience</li>
            <li>Include 2–3 quantified achievements (e.g., &ldquo;increased revenue by 25%&rdquo;)</li>
            <li>Match keywords from the job description</li>
            <li>Keep it to 3–4 sentences maximum</li>
          </ul>
        </div>
      )}
    </div>
  );
}
