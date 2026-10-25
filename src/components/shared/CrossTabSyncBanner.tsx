'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Market } from '@/types/cv.types';
import { useCVStore } from '@/store/cvStore';
import { revisionFromSerializedIndex } from '@/lib/storage/localStorage';

interface Props { market: Market }

/**
 * Shown when another tab saves (or deletes) the draft open in this tab.
 * Saves from this tab are blocked by revision checks until the user decides,
 * so nothing is overwritten silently; this banner just surfaces it early.
 */
export default function CrossTabSyncBanner({ market }: Props) {
  const [visible, setVisible] = useState(false);
  const cvId = useCVStore((s) => s.cv.id);
  const isDirty = useCVStore((s) => s.isDirty);
  const initializeMarket = useCVStore((s) => s.initializeMarket);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== `cv_maker_v2_${market}`) return;
      const { loadedRevision, cv } = useCVStore.getState();
      const nextRevision = revisionFromSerializedIndex(e.newValue, cv.id);
      if (nextRevision === loadedRevision) return;
      setVisible(true);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [market, cvId]);

  if (!visible) return null;

  return (
    <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-gray-900 text-white text-sm rounded-xl shadow-lg max-w-md w-full mx-4">
      <span className="flex-1">
        Another tab changed this CV.{' '}
        {isDirty ? 'Your unsaved edits here will not overwrite it without asking you.' : 'Load the latest version?'}
      </span>
      {!isDirty && (
        <button
          onClick={() => { initializeMarket(market, cvId); setVisible(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-900 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
        >
          <RefreshCw size={12} />
          Load latest
        </button>
      )}
      <button
        onClick={() => setVisible(false)}
        className="p-1 text-gray-400 hover:text-white transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
