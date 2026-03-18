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
import { Education, Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import DateRangePicker from '@/components/form-fields/DateRangePicker';
import StepHeader from './StepHeader';
import { cn } from '@/lib/utils/cn';

interface Props { market: Market; config: MarketConfig; }

const emptyEdu = (): Omit<Education, 'id'> => ({
  institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '',
  isPresent: false, gpa: '', honors: '', location: '',
});

export default function EducationStep({ market, config }: Props) {
  const { cv, addEducation, updateEducation, removeEducation, reorderEducation } = useCVStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const label = config.sections.education.label ?? 'Education';

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = cv.education.map((e) => e.id);
      const oldIdx = ids.indexOf(active.id as string);
      const newIdx = ids.indexOf(over.id as string);
      reorderEducation(arrayMove(ids, oldIdx, newIdx));
    }
  };

  return (
    <div className="space-y-6">
      <StepHeader title={label} description="List your highest level of education first. Drag to reorder." />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cv.education.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {cv.education.map((edu) => (
              <SortableEducationCard
                key={edu.id}
                edu={edu}
                market={market}
                expanded={expandedId === edu.id}
                onToggle={() => setExpandedId(expandedId === edu.id ? null : edu.id)}
                onUpdate={(data) => updateEducation(edu.id, data)}
                onRemove={() => removeEducation(edu.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        onClick={() => {
          addEducation(emptyEdu());
          setTimeout(() => {
            const last = useCVStore.getState().cv.education.at(-1);
            if (last) setExpandedId(last.id);
          }, 50);
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-gray-400 transition-colors"
      >
        <Plus size={16} />
        Add {market === 'jp' ? '学歴' : 'Education'}
      </button>
    </div>
  );
}

interface CardProps {
  edu: Education; market: Market; expanded: boolean;
  onToggle: () => void; onUpdate: (d: Partial<Education>) => void; onRemove: () => void;
}

function SortableEducationCard(props: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.edu.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 'auto' } as React.CSSProperties;
  return <div ref={setNodeRef} style={style}><EducationCard {...props} dragHandleProps={{ ...attributes, ...listeners }} /></div>;
}

function EducationCard({ edu, market, expanded, onToggle, onUpdate, onRemove, dragHandleProps }: CardProps & { dragHandleProps?: object }) {
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition';

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={onToggle}>
        <span {...dragHandleProps} onClick={(e) => e.stopPropagation()} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none flex-shrink-0">
          <GripVertical size={16} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{edu.degree || 'New Degree'}</p>
          <p className="text-xs text-gray-500 truncate">{edu.institution || 'Institution'}</p>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Degree / {market === 'jp' ? '卒業区分' : 'Qualification'}</label>
              <input value={edu.degree} onChange={(e) => onUpdate({ degree: e.target.value })} className={inputCls} placeholder={market === 'jp' ? '卒業・修了・中退' : 'Bachelor of Science'} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Field of Study</label>
              <input value={edu.fieldOfStudy ?? ''} onChange={(e) => onUpdate({ fieldOfStudy: e.target.value })} className={inputCls} placeholder={market === 'jp' ? '情報工学科' : 'Computer Science'} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{market === 'jp' ? '学校名' : 'Institution'}</label>
            <input value={edu.institution} onChange={(e) => onUpdate({ institution: e.target.value })} className={inputCls} placeholder={market === 'jp' ? '○○大学' : 'University of California'} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <input value={edu.location ?? ''} onChange={(e) => onUpdate({ location: e.target.value })} className={inputCls} placeholder={market === 'jp' ? '東京都' : 'Berkeley, CA'} />
            </div>
            {market !== 'jp' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">GPA (optional)</label>
                <input value={edu.gpa ?? ''} onChange={(e) => onUpdate({ gpa: e.target.value })} className={inputCls} placeholder="3.8/4.0" />
              </div>
            )}
          </div>

          <DateRangePicker startDate={edu.startDate} endDate={edu.endDate} isPresent={edu.isPresent}
            onChange={(start, end, isPresent) => onUpdate({ startDate: start, endDate: end, isPresent })} />

          {market !== 'jp' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Honors / Awards</label>
              <input value={edu.honors ?? ''} onChange={(e) => onUpdate({ honors: e.target.value })} className={cn(inputCls)} placeholder="Magna Cum Laude, Dean's List" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
