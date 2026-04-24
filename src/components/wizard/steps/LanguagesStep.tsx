'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useCVStore } from '@/store/cvStore';
import { Language, CEFRLevel, JLPTLevel, GenericLevel, Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import { getLanguageOptions } from '@/lib/markets/languageOptions';
import StepHeader from './StepHeader';

interface Props { market: Market; config: MarketConfig; }

const cefrLevels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const cefrDescriptions: Record<CEFRLevel, string> = {
  A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate',
  B2: 'Upper-Intermediate', C1: 'Advanced', C2: 'Mastery',
};
const jlptLevels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const genericLevels: GenericLevel[] = ['basic', 'conversational', 'professional', 'fluent', 'native'];

export default function LanguagesStep({ market, config }: Props) {
  const { cv, addLanguage, updateLanguage, removeLanguage } = useCVStore();
  const [newLang, setNewLang] = useState('');
  const label = config.sections.languages.label ?? 'Languages';
  const system = config.languageLevelSystem;
  const languageOptions = getLanguageOptions(market);
  const listId = languageOptions.length > 0 ? `${market}-language-options` : undefined;
  const addedLanguages = new Set(cv.languages.map((lang) => lang.language.toLowerCase()));

  const addLanguageValue = (language: string) => {
    const trimmed = language.trim();
    if (!trimmed || addedLanguages.has(trimmed.toLowerCase())) return;
    const defaultProf = system === 'cefr' ? 'B2' : system === 'jlpt' ? 'N3' : 'conversational';
    addLanguage({ language: trimmed, proficiency: defaultProf as Language['proficiency'], isNative: false });
    setNewLang('');
  };

  const handleAdd = () => {
    addLanguageValue(newLang);
  };

  return (
    <div className="space-y-6">
      <StepHeader title={label} description={config.ui.languagesDesc} />

      <div className="flex gap-2">
        <input
          value={newLang}
          onChange={(e) => setNewLang(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={config.ui.languagePlaceholder}
          list={listId}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        {languageOptions.length > 0 && (
          <datalist id={listId}>
            {languageOptions.map((option) => (
              <option
                key={option.label}
                value={option.label}
                label={option.nativeLabel ? `${option.label} (${option.nativeLabel})` : option.label}
              />
            ))}
          </datalist>
        )}
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <Plus size={14} />
          {config.ui.addLanguage}
        </button>
      </div>

      {languageOptions.length > 0 && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
          <p className="text-xs font-semibold text-indigo-900 mb-2">EU language suggestions</p>
          <div className="flex flex-wrap gap-2">
            {languageOptions.map((option) => {
              const isAdded = addedLanguages.has(option.label.toLowerCase());
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => addLanguageValue(option.label)}
                  disabled={isAdded}
                  className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-800 transition-colors hover:bg-indigo-100 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <span>{option.label}</span>
                  {option.nativeLabel && <span className="text-indigo-400">{option.nativeLabel}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {cv.languages.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">{config.ui.noLanguagesYet}</div>
      )}

      <div className="space-y-3">
        {cv.languages.map((lang) => (
          <LanguageRow key={lang.id} lang={lang} system={system} nativeLabel={config.ui.nativeLabel} certLabel={config.ui.langCertLabel} certPlaceholder={config.ui.langCertPlaceholder} onUpdate={(d) => updateLanguage(lang.id, d)} onRemove={() => removeLanguage(lang.id)} />
        ))}
      </div>

      {system === 'cefr' && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-indigo-800 mb-2">CEFR Reference</p>
          <div className="grid grid-cols-3 gap-1 text-xs text-indigo-700">
            {cefrLevels.map((l) => (
              <span key={l}><strong>{l}</strong> — {cefrDescriptions[l]}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LanguageRow({ lang, system, nativeLabel, certLabel, certPlaceholder, onUpdate, onRemove }: {
  lang: Language;
  system: 'cefr' | 'jlpt' | 'generic';
  nativeLabel: string;
  certLabel: string;
  certPlaceholder: string;
  onUpdate: (d: Partial<Language>) => void;
  onRemove: () => void;
}) {
  const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition';

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
      <div className="flex-1 font-medium text-gray-800 text-sm">{lang.language}</div>

      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          checked={lang.isNative}
          onChange={(e) => onUpdate({ isNative: e.target.checked })}
          className="rounded"
        />
        {nativeLabel}
      </label>

      {!lang.isNative && (
        <select
          value={lang.proficiency}
          onChange={(e) => onUpdate({ proficiency: e.target.value as Language['proficiency'] })}
          className={inputCls}
        >
          {system === 'cefr' && cefrLevels.map((l) => (
            <option key={l} value={l}>{l} — {cefrDescriptions[l]}</option>
          ))}
          {system === 'jlpt' && jlptLevels.map((l) => (
            <option key={l} value={l}>JLPT {l}</option>
          ))}
          {system === 'generic' && genericLevels.map((l) => (
            <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
          ))}
        </select>
      )}

      <input
        value={lang.certification ?? ''}
        onChange={(e) => onUpdate({ certification: e.target.value })}
        className={`${inputCls} w-36`}
        placeholder={certPlaceholder}
      />

      <button onClick={onRemove} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
