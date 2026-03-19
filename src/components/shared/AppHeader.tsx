'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Save, CheckCircle, Download, Sparkles, Loader2, AlertCircle, Trash2, ShieldCheck } from 'lucide-react';
import { useCVStore } from '@/store/cvStore';
import { Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import { usePDFExport } from '@/hooks/usePDFExport';
import ShareButton from './ShareButton';
import ThemeSelector from './ThemeSelector';
import PasteImportModal from './PasteImportModal';

const marketFlags: Record<Market, string> = {
  us: '🇺🇸', eu: '🇪🇺', latam: '🌎', jp: '🇯🇵',
};

interface Props { market: Market; config: MarketConfig }

export default function AppHeader({ market, config }: Props) {
  const { isDirty, isSaving, lastSaved, save, cv, resetCV, privacyMode, togglePrivacyMode } = useCVStore();
  const { exportPDF, state: pdfState, error: pdfError } = usePDFExport();
  const [importOpen, setImportOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  function handleClear() {
    resetCV(market);
    setConfirmClear(false);
  }

  const savedTime = lastSaved
    ? new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <>
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-gray-900 font-bold text-sm hover:text-gray-600 transition-colors flex-shrink-0">
          <FileText size={18} style={{ color: config.color }} />
          GlobalCV
        </Link>

        <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

        {/* Market badge */}
        <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 flex-shrink-0">
          {marketFlags[market]}
          <span className="hidden sm:inline">{config.name}</span>
        </span>

        <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

        {/* Color themes */}
        <ThemeSelector config={config} />

        <div className="ml-auto flex items-center gap-2">
          {/* Save status */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            {isSaving ? (
              <span className="text-gray-400">Saving…</span>
            ) : isDirty ? (
              <button onClick={save} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors">
                <Save size={12} /> Save
              </button>
            ) : savedTime ? (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle size={12} /> Saved {savedTime}
              </span>
            ) : null}
          </div>

          {/* Privacy Mode */}
          <button
            onClick={togglePrivacyMode}
            title={privacyMode ? 'Privacy Mode ON — data is not saved to localStorage. Click to disable.' : 'Enable Privacy Mode — data will not be saved to localStorage'}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              privacyMode
                ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                : 'border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-200 hover:bg-green-50'
            }`}
          >
            <ShieldCheck size={12} />
            <span className="hidden sm:inline">{privacyMode ? 'Private' : 'Privacy'}</span>
          </button>

          {/* Clear */}
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
            title="Clear all CV data"
          >
            <Trash2 size={12} />
            <span className="hidden sm:inline">Clear</span>
          </button>

          {/* Import */}
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <Sparkles size={12} /> Import
          </button>

          {/* Share */}
          <ShareButton cv={cv} />

          {/* Export PDF */}
          <div className="flex flex-col items-end">
            <button
              onClick={() => exportPDF(cv, config)}
              disabled={pdfState === 'generating'}
              title={pdfState === 'error' && pdfError ? pdfError : undefined}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: pdfState === 'error' ? '#dc2626' : config.color }}
            >
              {pdfState === 'generating' ? (
                <><Loader2 size={12} className="animate-spin" /> Generating…</>
              ) : pdfState === 'done' ? (
                <><CheckCircle size={12} /> Done!</>
              ) : pdfState === 'error' ? (
                <><AlertCircle size={12} /> Failed</>
              ) : (
                <><Download size={12} /> Export PDF</>
              )}
            </button>
          </div>

          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors hidden md:inline">
            ← Markets
          </Link>
        </div>
      </header>

      <PasteImportModal market={market} open={importOpen} onClose={() => setImportOpen(false)} />

      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 mx-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Clear all data?</h2>
            <p className="text-xs text-gray-500 mb-5">This will erase everything on this CV. This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmClear(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
