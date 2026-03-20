'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Market } from '@/types/cv.types';

interface Props { market: Market }

const STORAGE_KEY_RE = /^cv_maker_v\d+_/;

export default function CrossTabSyncBanner({ market }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (!e.key || !STORAGE_KEY_RE.test(e.key)) return;
      if (!e.key.endsWith(`_${market}`)) return;
      // Only show when another tab made the change (newValue differs)
      if (e.newValue && e.newValue !== e.oldValue) {
        setVisible(true);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [market]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-gray-900 text-white text-sm rounded-xl shadow-lg max-w-sm w-full mx-4">
      <span className="flex-1">Another tab saved your CV. Reload to get the latest version.</span>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-900 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
      >
        <RefreshCw size={12} />
        Reload
      </button>
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
