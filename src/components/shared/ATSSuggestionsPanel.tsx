'use client';

import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { CVData } from '@/types/cv.types';

interface Suggestion {
  id: string;
  label: string;
  pass: boolean;
  tip?: string;
}

function buildSuggestions(cv: CVData): Suggestion[] {
  const p = cv.personalInfo;
  const hasLongDesc = cv.workExperience.some((e) => e.description && e.description.length >= 80);
  const hasQuantified = cv.workExperience.some((e) =>
    e.description && /\d/.test(e.description)
  );

  return [
    {
      id: 'name',
      label: 'Name added',
      pass: !!(p.firstName && p.lastName),
      tip: 'ATS parsers expect a full name at the top of the document.',
    },
    {
      id: 'email',
      label: 'Email address',
      pass: !!p.email,
    },
    {
      id: 'phone',
      label: 'Phone number',
      pass: !!p.phone,
    },
    {
      id: 'linkedin',
      label: 'LinkedIn URL',
      pass: !!p.linkedIn,
      tip: 'Recruiters check LinkedIn on 80%+ of applications.',
    },
    {
      id: 'summary',
      label: 'Professional summary',
      pass: !!(cv.objective && cv.objective.length >= 40),
      tip: 'A 2–4 sentence summary helps ATS systems match you to job descriptions.',
    },
    {
      id: 'work',
      label: 'Work experience added',
      pass: cv.workExperience.length > 0,
    },
    {
      id: 'workDesc',
      label: 'Job descriptions filled in',
      pass: hasLongDesc,
      tip: 'At least one role description should be 80+ characters.',
    },
    {
      id: 'quantified',
      label: 'Quantified achievements',
      pass: hasQuantified,
      tip: 'Include numbers (%, $, headcount) — ATS and recruiters weight these heavily.',
    },
    {
      id: 'education',
      label: 'Education added',
      pass: cv.education.length > 0,
    },
    {
      id: 'skills',
      label: 'Skills section',
      pass: cv.skills.length >= 3,
      tip: 'Add at least 3 skills. ATS systems keyword-match your skills against job postings.',
    },
  ];
}

interface Props {
  cv: CVData;
}

export default function ATSSuggestionsPanel({ cv }: Props) {
  const suggestions = buildSuggestions(cv);
  const passing = suggestions.filter((s) => s.pass).length;
  const total = suggestions.length;
  const score = Math.round((passing / total) * 100);

  const scoreColor =
    score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">ATS Readiness</span>
          <Info size={13} className="text-gray-400" />
        </div>
        <span className="text-sm font-bold tabular-nums" style={{ color: scoreColor }}>
          {passing}/{total}
        </span>
      </div>

      {/* Score bar */}
      <div className="px-4 pt-3 pb-1">
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${score}%`, backgroundColor: scoreColor }}
          />
        </div>
      </div>

      {/* Checklist */}
      <ul className="px-4 py-3 space-y-2">
        {suggestions.map((s) => (
          <li key={s.id} className="flex items-start gap-2.5 group">
            {s.pass ? (
              <CheckCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#16a34a' }} />
            ) : (
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-amber-500" />
            )}
            <div className="min-w-0">
              <span className={`text-xs ${s.pass ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>
                {s.label}
              </span>
              {!s.pass && s.tip && (
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{s.tip}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
