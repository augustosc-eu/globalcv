'use client';

import { useCVStore } from '@/store/cvStore';
import { Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import StepHeader from './StepHeader';

interface Props {
  market: Market;
  config: MarketConfig;
}

const placeholders: Record<string, string> = {
  us: 'Results-driven software engineer with 5+ years of experience building scalable web applications. Proven track record of delivering high-impact features that improve user engagement by 30%+.',
  eu: 'Experienced project manager with a background in cross-functional team leadership and agile delivery. Passionate about driving innovation and sustainable business growth across European markets.',
  latam: 'Profesional con más de 5 años de experiencia en desarrollo de software, orientado a resultados y comprometido con la excelencia técnica. Busco aportar mi experiencia en un equipo dinámico y de alto rendimiento.',
  jp: '○○年より○○社にて○○業務に従事。チームリーダーとしてプロジェクト管理を担当し、業務効率化に貢献してきました。貴社の発展に貢献したいと考えております。',
};

export default function ObjectiveStep({ market, config }: Props) {
  const { cv, setObjective } = useCVStore();
  const sectionLabel = config.sections.objective.label ?? 'Professional Summary';

  return (
    <div className="space-y-6">
      <StepHeader
        title={sectionLabel}
        description={
          market === 'jp'
            ? '志望動機や自己PRの概要を記入してください。'
            : market === 'latam'
            ? 'Describe tu perfil profesional y objetivos de carrera.'
            : 'A brief summary of your professional background and career goals.'
        }
      />

      <div>
        <textarea
          value={cv.objective ?? ''}
          onChange={(e) => setObjective(e.target.value)}
          rows={6}
          placeholder={placeholders[market]}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">
          {cv.objective?.length ?? 0} characters
          {market === 'us' && ' (aim for 2–4 sentences)'}
        </p>
      </div>

      {market === 'us' && (
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
