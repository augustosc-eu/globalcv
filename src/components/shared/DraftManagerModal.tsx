'use client';

import { useMemo, useState } from 'react';
import { Trash2, FolderOpen, CopyPlus, X, GitCompare, ArrowLeft } from 'lucide-react';
import { SavedDraftMeta, loadCV } from '@/lib/storage/localStorage';
import { Market } from '@/types/cv.types';
import { diffCV } from '@/lib/cv/diffCV';

interface Props {
  open: boolean;
  currentDraftId: string;
  drafts: SavedDraftMeta[];
  market: Market;
  onClose: () => void;
  onOpenDraft: (draftId: string) => void;
  onDeleteDraft: (draftId: string) => void;
  onDuplicateCurrent: () => void;
}

export default function DraftManagerModal({
  open,
  currentDraftId,
  drafts,
  market,
  onClose,
  onOpenDraft,
  onDeleteDraft,
  onDuplicateCurrent,
}: Props) {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  const marketDrafts = useMemo(
    () => drafts.filter((draft) => draft.market === market),
    [drafts, market]
  );
  const validCompareIds = useMemo(
    () => compareIds.filter((id) => marketDrafts.some((draft) => draft.id === id)),
    [compareIds, marketDrafts]
  );
  const comparison = useMemo(() => {
    if (!open || !comparing || validCompareIds.length !== 2) return null;
    const [firstId, secondId] = validCompareIds;
    const cvA = loadCV(market, firstId);
    const cvB = loadCV(market, secondId);
    return {
      cvA,
      cvB,
      titleA: marketDrafts.find((d) => d.id === firstId)?.title ?? 'Draft A',
      titleB: marketDrafts.find((d) => d.id === secondId)?.title ?? 'Draft B',
      diffs: cvA && cvB ? diffCV(cvA, cvB) : [],
    };
  }, [open, comparing, validCompareIds, market, marketDrafts]);

  if (!open) return null;

  function toggleCompareSelection(id: string) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );
  }

  function startCompare() {
    if (validCompareIds.length === 2) setComparing(true);
  }

  function exitCompare() {
    setComparing(false);
    setCompareIds([]);
  }

  if (comparing && comparison) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={exitCompare} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Draft comparison</h2>
                <p className="text-xs text-slate-500 mt-0.5">Changed sections are highlighted.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6">
            {(!comparison.cvA || !comparison.cvB) ? (
              <p className="text-sm text-slate-500 text-center py-10">Could not load one or both drafts.</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-3 w-28">Section</th>
                    <th className="text-left text-xs font-semibold text-blue-700 uppercase tracking-wide pb-3 px-3 w-1/2 truncate">{comparison.titleA}</th>
                    <th className="text-left text-xs font-semibold text-indigo-700 uppercase tracking-wide pb-3 px-3 w-1/2 truncate">{comparison.titleB}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.diffs.map((row) => (
                    <tr key={row.label} className={`border-t border-slate-100 ${row.changed ? 'bg-amber-50/50' : ''}`}>
                      <td className="py-2.5 pr-3 text-xs font-semibold text-slate-500 align-top whitespace-nowrap">{row.label}</td>
                      <td className={`py-2.5 px-3 text-xs align-top ${row.changed ? 'text-blue-800 font-medium' : 'text-slate-600'}`}>{row.a}</td>
                      <td className={`py-2.5 px-3 text-xs align-top ${row.changed ? 'text-indigo-800 font-medium' : 'text-slate-600'}`}>{row.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Saved drafts</h2>
            <p className="text-xs text-slate-500 mt-1">Switch between local drafts for this market or create a copy before tailoring.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={onDuplicateCurrent}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              <CopyPlus size={14} />
              Save as new draft
            </button>
            {compareIds.length === 2 && (
              <button
                onClick={startCompare}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                <GitCompare size={14} />
                Compare {compareIds.length}/2 selected
              </button>
            )}
            {compareIds.length > 0 && compareIds.length < 2 && (
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <GitCompare size={12} />
                Select one more draft to compare ({compareIds.length}/2)
              </span>
            )}
            {compareIds.length === 0 && marketDrafts.length >= 2 && (
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <GitCompare size={12} />
                Select 2 drafts to compare
              </span>
            )}
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto">
            {marketDrafts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                No saved drafts yet for this market.
              </div>
            ) : marketDrafts.map((draft) => {
              const isActive = draft.id === currentDraftId;
              const isSelected = compareIds.includes(draft.id);
              return (
                <div
                  key={draft.id}
                  className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                    isSelected ? 'border-indigo-400 bg-indigo-50' :
                    isActive ? 'border-blue-300 bg-blue-50' :
                    'border-slate-200 bg-white'
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCompareSelection(draft.id)}
                      className="rounded border-slate-300 text-indigo-600 flex-shrink-0"
                      title="Select for comparison"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{draft.title}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Saved {new Date(draft.savedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        {isActive && <span className="ml-2 text-blue-600 font-semibold">· Active</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onOpenDraft(draft.id)}
                      disabled={isActive}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-default"
                    >
                      <FolderOpen size={12} />
                      Open
                    </button>
                    <button
                      onClick={() => onDeleteDraft(draft.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
