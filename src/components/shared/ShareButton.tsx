'use client';

import { useState } from 'react';
import { Share2, Check, AlertTriangle, X } from 'lucide-react';
import { CVData } from '@/types/cv.types';
import { encodeCVToURL, URL_WARN_THRESHOLD } from '@/lib/sharing/shareUrl';

interface Props { cv: CVData }

export default function ShareButton({ cv }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'warning'>('idle');
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const handleShare = async () => {
    const url = encodeCVToURL(cv);
    if (url.length > URL_WARN_THRESHOLD) {
      setPendingUrl(url);
      setState('warning');
      return;
    }
    await copyAndConfirm(url);
  };

  const copyAndConfirm = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setState('copied');
    setPendingUrl(null);
    setTimeout(() => setState('idle'), 2500);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(cv, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cv-share-${cv.market}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setState('idle');
  };

  return (
    <>
      <button
        onClick={handleShare}
        title="Copy shareable link — photo excluded, personal data in URL"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
      >
        {state === 'copied' ? (
          <><Check size={12} className="text-green-600" /> <span className="text-green-600">Copied!</span></>
        ) : (
          <><Share2 size={12} /> Share</>
        )}
      </button>

      {/* Long URL warning modal */}
      {state === 'warning' && pendingUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 mx-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                <h2 className="text-sm font-semibold text-gray-900">Long share link</h2>
              </div>
              <button onClick={() => setState('idle')} className="p-1 text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
            <p className="text-xs text-gray-600 mb-2">
              This link is <strong>{pendingUrl.length.toLocaleString()} characters</strong> long, which may break in some email clients and chat apps.
            </p>
            <p className="text-xs text-gray-500 mb-5">
              The link contains your CV data (except photos) in plain text. Anyone with the link can read it. If you want a safer handoff, export a JSON backup instead.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={downloadJson}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Download JSON
              </button>
              <button
                onClick={() => setState('idle')}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => copyAndConfirm(pendingUrl)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Copy anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
