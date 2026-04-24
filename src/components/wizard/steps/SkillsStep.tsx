'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useCVStore } from '@/store/cvStore';
import { Skill, SkillLevel, Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import StepHeader from './StepHeader';
import { getSampleContent } from '@/lib/markets/sampleContent';

interface Props { market: Market; config: MarketConfig; }

export default function SkillsStep({ market, config }: Props) {
  const { cv, addSkill, updateSkill, removeSkill } = useCVStore();
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const label = config.sections.skills.label ?? 'Skills';
  const samples = getSampleContent(market);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addSkill({ name: newName.trim(), level: 3, category: newCategory.trim() || undefined });
    setNewName('');
  };

  // Group by category
  const grouped = cv.skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    const cat = skill.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <StepHeader title={label} description={config.ui.skillsDesc} />

      {/* Add new skill */}
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={config.ui.skillPlaceholder}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder={config.ui.skillCategoryPlaceholder}
          className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <Plus size={14} />
          {config.ui.addSkill}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Market-relevant skill starters</p>
        <div className="flex flex-wrap gap-2">
          {samples.skills.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => addSkill({ name: skill, level: 3, category: 'Market fit' })}
              disabled={cv.skills.some((item) => item.name.toLowerCase() === skill.toLowerCase())}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-default disabled:bg-slate-100 disabled:text-slate-400"
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      {/* Skill groups */}
      {Object.entries(grouped).map(([category, skills]) => (
        <div key={category}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{category}</p>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <SkillPill key={skill.id} skill={skill} skillLevels={config.ui.skillLevels} onUpdate={(d) => updateSkill(skill.id, d)} onRemove={() => removeSkill(skill.id)} />
            ))}
          </div>
        </div>
      ))}

      {cv.skills.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          {config.ui.noSkillsYet}
        </div>
      )}

      {market === 'us' && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">ATS Tip</p>
          <p className="text-xs text-amber-700">Include keywords from the job description. ATS systems scan for exact matches.</p>
        </div>
      )}
    </div>
  );
}

function SkillPill({ skill, skillLevels, onUpdate, onRemove }: { skill: Skill; skillLevels: [string, string, string, string, string]; onUpdate: (d: Partial<Skill>) => void; onRemove: () => void }) {
  const levels: SkillLevel[] = [1, 2, 3, 4, 5];
  const levelLabels = skillLevels;

  return (
    <div className="group flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1.5">
      <span className="text-sm text-gray-800">{skill.name}</span>

      {/* Level dots */}
      <div className="flex gap-0.5">
        {levels.map((l) => (
          <button
            key={l}
            title={levelLabels[l - 1]}
            onClick={() => onUpdate({ level: l })}
            className="w-2 h-2 rounded-full transition-colors"
            style={{ backgroundColor: (skill.level ?? 3) >= l ? '#374151' : '#d1d5db' }}
          />
        ))}
      </div>

      <button onClick={onRemove} className="text-gray-300 hover:text-red-400 transition-colors">
        <X size={12} />
      </button>
    </div>
  );
}
