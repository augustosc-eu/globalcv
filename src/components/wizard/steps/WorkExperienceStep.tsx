'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCVStore } from '@/store/cvStore';
import { WorkExperience, Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import DateRangePicker from '@/components/form-fields/DateRangePicker';
import StepHeader from './StepHeader';
import { cn } from '@/lib/utils/cn';

interface Props { market: Market; config: MarketConfig; }

const emptyExp = (): Omit<WorkExperience, 'id'> => ({
  company: '', title: '', location: '', startDate: '', endDate: '',
  isPresent: false, description: '', achievements: [], employmentType: 'full_time',
});

export default function WorkExperienceStep({ market, config }: Props) {
  const { cv, addWorkExperience, updateWorkExperience, removeWorkExperience, reorderWorkExperience } = useCVStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const label = config.sections.workExperience.label ?? 'Work Experience';

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = cv.workExperience.map((e) => e.id);
      const oldIdx = ids.indexOf(active.id as string);
      const newIdx = ids.indexOf(over.id as string);
      reorderWorkExperience(arrayMove(ids, oldIdx, newIdx));
    }
  };

  return (
    <div className="space-y-6">
      <StepHeader title={label} description="List your most recent positions first. Drag to reorder." />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cv.workExperience.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {cv.workExperience.map((exp) => (
              <SortableExperienceCard
                key={exp.id}
                exp={exp}
                market={market}
                config={config}
                expanded={expandedId === exp.id}
                onToggle={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                onUpdate={(data) => updateWorkExperience(exp.id, data)}
                onRemove={() => removeWorkExperience(exp.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        onClick={() => {
          addWorkExperience(emptyExp());
          setTimeout(() => {
            const last = useCVStore.getState().cv.workExperience.at(-1);
            if (last) setExpandedId(last.id);
          }, 50);
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
      >
        <Plus size={16} />
        {config.ui.addWork}
      </button>
    </div>
  );
}

interface CardProps {
  exp: WorkExperience; market: Market; config: MarketConfig; expanded: boolean;
  onToggle: () => void; onUpdate: (d: Partial<WorkExperience>) => void; onRemove: () => void;
}

function SortableExperienceCard(props: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.exp.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 'auto' } as React.CSSProperties;
  return <div ref={setNodeRef} style={style}><ExperienceCard {...props} dragHandleProps={{ ...attributes, ...listeners }} /></div>;
}

function ExperienceCard({ exp, market, config, expanded, onToggle, onUpdate, onRemove, dragHandleProps }: CardProps & { dragHandleProps?: object }) {
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition';

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={onToggle}>
        <span {...dragHandleProps} onClick={(e) => e.stopPropagation()} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none flex-shrink-0">
          <GripVertical size={16} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{exp.title || config.ui.newPosition}</p>
          <p className="text-xs text-gray-500 truncate">{exp.company || config.ui.newCompany}{exp.location ? ` · ${exp.location}` : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded">
            <Trash2 size={14} />
          </button>
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{config.ui.workJobTitle}</label>
              <input value={exp.title} onChange={(e) => onUpdate({ title: e.target.value })} className={inputCls} placeholder={config.ui.workJobTitlePlaceholder} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{config.ui.workCompany}</label>
              <input value={exp.company} onChange={(e) => onUpdate({ company: e.target.value })} className={inputCls} placeholder={config.ui.workCompanyPlaceholder} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{config.ui.workLocation}</label>
              <input value={exp.location ?? ''} onChange={(e) => onUpdate({ location: e.target.value })} className={inputCls} placeholder={config.ui.workLocationPlaceholder} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{config.ui.workEmploymentType}</label>
              <select value={exp.employmentType ?? 'full_time'} onChange={(e) => onUpdate({ employmentType: e.target.value as WorkExperience['employmentType'] })} className={inputCls}>
                <option value="full_time">{config.ui.employmentTypes.fullTime}</option>
                <option value="part_time">{config.ui.employmentTypes.partTime}</option>
                <option value="contract">{config.ui.employmentTypes.contract}</option>
                <option value="freelance">{config.ui.employmentTypes.freelance}</option>
                <option value="internship">{config.ui.employmentTypes.internship}</option>
              </select>
            </div>
          </div>

          <DateRangePicker
            startDate={exp.startDate} endDate={exp.endDate} isPresent={exp.isPresent}
            onChange={(start, end, isPresent) => onUpdate({ startDate: start, endDate: end, isPresent })}
          />

          {market === 'jp' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">部署名 (Department)</label>
              <input value={exp.departmentName ?? ''} onChange={(e) => onUpdate({ departmentName: e.target.value })} className={inputCls} placeholder="開発部" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {config.ui.workDescription}
            </label>
            <textarea
              value={exp.description} onChange={(e) => onUpdate({ description: e.target.value })}
              rows={4} className={cn(inputCls, 'resize-none')}
              placeholder={config.ui.workDescPlaceholder}
            />
          </div>

          {market === 'jp' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">退職理由 (Reason for Leaving)</label>
              <input value={exp.reasonForLeaving ?? ''} onChange={(e) => onUpdate({ reasonForLeaving: e.target.value })} className={inputCls} placeholder="一身上の都合により退職" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
