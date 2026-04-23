'use client';

import { Trash2, FolderOpen, CopyPlus, X } from 'lucide-react';
import { SavedDraftMeta } from '@/lib/storage/localStorage';
import { Market } from '@/types/cv.types';

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
  if (!open) return null;

  const marketDrafts = drafts.filter((draft) => draft.market === market);

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
          <button
            onClick={onDuplicateCurrent}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            <CopyPlus size={14} />
            Save current as a new draft
          </button>

          <div className="space-y-3 max-h-[360px] overflow-y-auto">
            {marketDrafts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                No saved drafts yet for this market.
              </div>
            ) : marketDrafts.map((draft) => (
              <div
                key={draft.id}
                className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${
                  draft.id === currentDraftId ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{draft.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Saved {new Date(draft.savedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onOpenDraft(draft.id)}
                    disabled={draft.id === currentDraftId}
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
