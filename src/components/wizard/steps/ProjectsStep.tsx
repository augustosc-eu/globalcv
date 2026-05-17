'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical, CopyPlus, Link } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCVStore } from '@/store/cvStore';
import { Project, Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import StepHeader from './StepHeader';

interface Props { market: Market; config: MarketConfig; }

const emptyProject = (): Omit<Project, 'id'> => ({
  name: '', description: '', role: '', url: '', techStack: [],
});

export default function ProjectsStep({ config }: Props) {
  const { cv, addProject, updateProject, removeProject, reorderProjects, duplicateProject } = useCVStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const label = config.sections.projects?.label ?? 'Projects';
  const projects = cv.projects ?? [];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = projects.map((p) => p.id);
      const oldIdx = ids.indexOf(active.id as string);
      const newIdx = ids.indexOf(over.id as string);
      if (oldIdx < 0 || newIdx < 0) return;
      reorderProjects(arrayMove(ids, oldIdx, newIdx));
    }
  };

  return (
    <div className="space-y-6">
      <StepHeader
        title={label}
        description="Showcase side projects, open-source work, freelance builds, or academic projects. Drag to reorder."
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {projects.map((project) => (
              <SortableProjectCard
                key={project.id}
                project={project}
                expanded={expandedId === project.id}
                onToggle={() => setExpandedId(expandedId === project.id ? null : project.id)}
                onUpdate={(data) => updateProject(project.id, data)}
                onRemove={() => removeProject(project.id)}
                onDuplicate={() => duplicateProject(project.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        onClick={() => {
          addProject(emptyProject());
          const last = useCVStore.getState().cv.projects?.at(-1);
          if (last) setExpandedId(last.id);
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
      >
        <Plus size={16} />
        Add project
      </button>
    </div>
  );
}

interface CardProps {
  project: Project;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (d: Partial<Project>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  dragHandleProps?: object;
}

function SortableProjectCard(props: Omit<CardProps, 'dragHandleProps'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.project.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 'auto' } as React.CSSProperties;
  return <div ref={setNodeRef} style={style}><ProjectCard {...props} dragHandleProps={{ ...attributes, ...listeners }} /></div>;
}

function ProjectCard({ project, expanded, onToggle, onUpdate, onRemove, onDuplicate, dragHandleProps }: CardProps) {
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition';

  function handleTechStack(raw: string) {
    onUpdate({ techStack: raw.split(',').map((t) => t.trim()).filter(Boolean) });
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={onToggle}>
        <span {...dragHandleProps} onClick={(e) => e.stopPropagation()} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none flex-shrink-0">
          <GripVertical size={16} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{project.name || 'New project'}</p>
          <p className="text-xs text-gray-500 truncate">
            {project.role ? `${project.role} · ` : ''}
            {(project.techStack ?? []).slice(0, 4).join(', ') || 'No tech stack listed'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {project.url && (
            <a href={project.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 text-gray-400 hover:text-blue-500 transition-colors rounded">
              <Link size={13} />
            </a>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 text-gray-400 hover:text-blue-500 transition-colors rounded">
            <CopyPlus size={14} />
          </button>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Project name</label>
              <input value={project.name} onChange={(e) => onUpdate({ name: e.target.value })} className={inputCls} placeholder="My Awesome App" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Your role</label>
              <input value={project.role ?? ''} onChange={(e) => onUpdate({ role: e.target.value })} className={inputCls} placeholder="Lead Developer" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">URL (optional)</label>
            <input value={project.url ?? ''} onChange={(e) => onUpdate({ url: e.target.value })} type="url" className={inputCls} placeholder="https://github.com/you/project" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tech stack (comma-separated)</label>
            <input
              value={(project.techStack ?? []).join(', ')}
              onChange={(e) => handleTechStack(e.target.value)}
              className={inputCls}
              placeholder="React, TypeScript, Tailwind, PostgreSQL"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={project.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="What the project does, your contribution, and the outcome or impact."
            />
          </div>
        </div>
      )}
    </div>
  );
}
