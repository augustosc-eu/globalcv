'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Download, LifeBuoy } from 'lucide-react';
import { Market } from '@/types/cv.types';
import { useCVStore } from '@/store/cvStore';
import { getRecoveryStatus, RecoveryStatus } from '@/lib/storage/localStorage';
import { downloadCurrentCV, downloadFullLocalExport } from '@/lib/storage/downloads';

interface Props { market: Market }

/**
 * Persistent, non-dismissable-by-accident notices about persistence problems:
 *  - the latest save failed (quota, storage unavailable, …),
 *  - another tab changed or deleted this draft (explicit choice required),
 *  - saved data needed repair or could not be read (recovery download).
 */
export default function StorageStatusBanner({ market }: Props) {
  const saveError = useCVStore((s) => s.saveError);
  const cv = useCVStore((s) => s.cv);
  const loadedFromRepair = useCVStore((s) => s.loadedFromRepair);
  const resolveSaveConflict = useCVStore((s) => s.resolveSaveConflict);
  const save = useCVStore((s) => s.save);
  const [recovery, setRecovery] = useState<RecoveryStatus | null>(null);
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);

  useEffect(() => {
    setRecovery(getRecoveryStatus());
  }, [market, cv.id]);

  const isConflict = saveError?.reason === 'conflict' || saveError?.reason === 'deleted-elsewhere';

  return (
    <>
      {saveError && (
        <div role="alert" className="flex flex-wrap items-center gap-2 px-4 py-2 text-xs bg-red-50 border-b border-red-200 text-red-800">
          <AlertTriangle size={14} className="flex-shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-[12rem] font-medium">{saveError.message}</span>
          {isConflict ? (
            <>
              {saveError.reason === 'conflict' && (
                <button onClick={() => resolveSaveConflict('reload')} className="px-2 py-1 rounded border border-red-300 bg-white hover:bg-red-100">
                  Load the other tab&apos;s version
                </button>
              )}
              <button onClick={() => resolveSaveConflict('keep-both')} className="px-2 py-1 rounded border border-red-300 bg-white hover:bg-red-100">
                Save mine as a new draft
              </button>
              {saveError.reason === 'conflict' && (
                <button onClick={() => resolveSaveConflict('overwrite')} className="px-2 py-1 rounded border border-red-300 bg-white hover:bg-red-100">
                  Overwrite with mine
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => save()} className="px-2 py-1 rounded border border-red-300 bg-white hover:bg-red-100">Retry save</button>
              <button onClick={() => downloadCurrentCV(cv)} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-300 bg-white hover:bg-red-100">
                <Download size={12} aria-hidden="true" /> Download backup
              </button>
            </>
          )}
        </div>
      )}

      {!recoveryDismissed && (recovery?.needsAttention || loadedFromRepair) && (
        <div role="status" className="flex flex-wrap items-center gap-2 px-4 py-2 text-xs bg-amber-50 border-b border-amber-200 text-amber-900">
          <LifeBuoy size={14} className="flex-shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-[12rem]">
            Some saved data could not be read as-is
            {recovery && recovery.repairedDrafts.length > 0 ? ` (${recovery.repairedDrafts.length} draft(s) were repaired automatically)` : ''}
            {recovery && (recovery.invalidDrafts.length > 0 || recovery.unreadableMarkets.length > 0) ? '; unreadable entries were kept untouched' : ''}.
            Nothing was deleted. The original data is preserved on this device and can be downloaded.
          </span>
          <button onClick={() => downloadFullLocalExport()} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-amber-300 bg-white hover:bg-amber-100">
            <Download size={12} aria-hidden="true" /> Download recovery file
          </button>
          <button onClick={() => setRecoveryDismissed(true)} className="px-2 py-1 underline">Hide</button>
        </div>
      )}
    </>
  );
}
