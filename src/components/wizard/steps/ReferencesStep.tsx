'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, CopyPlus } from 'lucide-react';
import { useCVStore } from '@/store/cvStore';
import { Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import StepHeader from './StepHeader';

interface Props { market: Market; config: MarketConfig; }

export default function ReferencesStep({ config }: Props) {
  const { cv, addReference, updateReference, removeReference, duplicateReference } = useCVStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const label = config.sections.references.label ?? 'References';

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition';

  return (
    <div className="space-y-6">
      <StepHeader title={label} description={config.ui.refsDesc} />

      <div className="space-y-3">
        {cv.references.map((ref) => (
          <div key={ref.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(expandedId === ref.id ? null : ref.id)}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{ref.name || config.ui.newReference}</p>
                <p className="text-xs text-gray-500 truncate">{ref.title ? `${ref.title} at ${ref.company}` : 'Title, Company'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); duplicateReference(ref.id); }} className="p-1 text-gray-300 hover:text-blue-500 transition-colors">
                  <CopyPlus size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); removeReference(ref.id); }} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
                {expandedId === ref.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </div>

            {expandedId === ref.id && (
              <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{config.ui.refName}</label>
                    <input value={ref.name} onChange={(e) => updateReference(ref.id, { name: e.target.value })} className={inputCls} placeholder={config.ui.refNamePlaceholder} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{config.ui.refJobTitle}</label>
                    <input value={ref.title} onChange={(e) => updateReference(ref.id, { title: e.target.value })} className={inputCls} placeholder={config.ui.refJobTitlePlaceholder} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{config.ui.refCompany}</label>
                    <input value={ref.company} onChange={(e) => updateReference(ref.id, { company: e.target.value })} className={inputCls} placeholder={config.ui.refCompanyPlaceholder} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{config.ui.refRelationship}</label>
                    <input value={ref.relationship} onChange={(e) => updateReference(ref.id, { relationship: e.target.value })} className={inputCls} placeholder={config.ui.refRelationshipPlaceholder} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{config.ui.email}</label>
                    <input type="email" value={ref.email ?? ''} onChange={(e) => updateReference(ref.id, { email: e.target.value })} className={inputCls} placeholder={config.ui.emailPlaceholder} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{config.ui.phone}</label>
                    <input value={ref.phone ?? ''} onChange={(e) => updateReference(ref.id, { phone: e.target.value })} className={inputCls} placeholder={config.ui.phonePlaceholder} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          addReference({ name: '', title: '', company: '', relationship: '' });
          setTimeout(() => {
            const last = useCVStore.getState().cv.references.at(-1);
            if (last) setExpandedId(last.id);
          }, 50);
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-gray-400 transition-colors"
      >
        <Plus size={16} />
        {config.ui.addReference}
      </button>
    </div>
  );
}
