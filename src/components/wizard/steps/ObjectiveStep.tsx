'use client';

import { useCVStore } from '@/store/cvStore';
import { MarketConfig } from '@/types/market.types';
import StepHeader from './StepHeader';
import { analyzeJobTargeting } from '@/lib/cv/jobTargeting';
import { getSampleContent } from '@/lib/markets/sampleContent';

interface Props {
  config: MarketConfig;
}

export default function ObjectiveStep({ config }: Props) {
  const { cv, setObjective, setTargeting } = useCVStore();
  const sectionLabel = config.sections.objective.label ?? 'Professional Summary';
  const targeting = analyzeJobTargeting(cv);
  const samples = getSampleContent(config.market);

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

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Market-specific starter</p>
        <div className="space-y-2">
          {samples.summaries.map((sample) => (
            <div key={sample} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm text-slate-700 leading-relaxed">{sample}</p>
              <button
                type="button"
                onClick={() => setObjective(sample)}
                className="mt-2 text-xs font-semibold text-slate-900 hover:text-blue-700 transition-colors"
              >
                Use as starter
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Job-target tailoring</p>
          <p className="text-xs text-slate-500 mt-1">Paste a job description to spot missing keywords and decide which experience bullets deserve more emphasis.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Target role</label>
            <input
              value={cv.targetRole ?? ''}
              onChange={(e) => setTargeting({ targetRole: e.target.value, targetCompany: cv.targetCompany, jobDescriptionNotes: cv.jobDescriptionNotes })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Senior Product Designer"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Target company</label>
            <input
              value={cv.targetCompany ?? ''}
              onChange={(e) => setTargeting({ targetRole: cv.targetRole, targetCompany: e.target.value, jobDescriptionNotes: cv.jobDescriptionNotes })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Example Inc."
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Job description notes</label>
          <textarea
            value={cv.jobDescriptionNotes ?? ''}
            onChange={(e) => setTargeting({ targetRole: cv.targetRole, targetCompany: cv.targetCompany, jobDescriptionNotes: e.target.value })}
            rows={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
            placeholder="Paste the role summary, responsibilities, or requirements here."
          />
        </div>

        {targeting && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InsightCard
              title="Matched skills"
              items={targeting.matchedSkills}
              empty="Add skills from the job description to your skills step."
              tone="green"
            />
            <InsightCard
              title="Missing keywords"
              items={targeting.missingKeywords}
              empty="You already cover the main repeated keywords."
              tone="amber"
            />
            <InsightCard
              title="Experience to emphasize"
              items={targeting.suggestedBullets}
              empty="Add more detailed work bullets so we can match them here."
              tone="blue"
            />
          </div>
        )}
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

function InsightCard({
  title,
  items,
  empty,
  tone,
}: {
  title: string;
  items: string[];
  empty: string;
  tone: 'green' | 'amber' | 'blue';
}) {
  const tones = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
  };

  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2">{title}</p>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span key={item} className="inline-flex rounded-full bg-white/80 px-2 py-1 text-[11px] font-medium">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs">{empty}</p>
      )}
    </div>
  );
}
