'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Save, CheckCircle, Download, Sparkles, Loader2, AlertCircle, Trash2, ShieldCheck, Undo2, Redo2, HardDriveDownload, FolderOpen, Copy } from 'lucide-react';
import { useCVStore } from '@/store/cvStore';
import { Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import { usePDFExport } from '@/hooks/usePDFExport';
import ShareButton from './ShareButton';
import ThemeSelector from './ThemeSelector';
import PasteImportModal from './PasteImportModal';
import CopyToMarketModal from './CopyToMarketModal';

const marketFlags: Record<Market, string> = {
  us: '🇺🇸', eu: '🇪🇺', latam: '🌎', jp: '🇯🇵',
};

interface Props { market: Market; config: MarketConfig }

export default function AppHeader({ market, config }: Props) {
  const { isDirty, isSaving, lastSaved, save, cv, resetCV, restoreCV, privacyMode, togglePrivacyMode, undo, redo, history, historyIndex } = useCVStore();
  const { exportPDF, state: pdfState, error: pdfError } = usePDFExport();
  const [importOpen, setImportOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  function handleClear() {
    resetCV(market);
    setConfirmClear(false);
  }

  function handleBackupJSON() {
    const blob = new Blob([JSON.stringify(cv, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cv-backup-${market}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRestoreJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data && typeof data === 'object' && data.personalInfo) {
          restoreCV(data);
        }
      } catch {
        // silently ignore corrupt files
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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

        {/* Divider + color themes — hidden on mobile (themes are in Template step) */}
        <div className="hidden sm:block w-px h-5 bg-gray-200 flex-shrink-0" />
        <ThemeSelector config={config} />

        <div className="ml-auto flex items-center gap-2">
          {/* Save status */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            {isSaving ? (
              <span className="text-gray-400">{config.ui.saving}</span>
            ) : isDirty ? (
              <button onClick={save} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors">
                <Save size={12} /> {config.ui.save}
              </button>
            ) : savedTime ? (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle size={12} /> {config.ui.saved} {savedTime}
              </span>
            ) : null}
          </div>

          {/* Undo / Redo */}
          <div className="hidden sm:flex items-center gap-0.5">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (⌘Z)"
              className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:cursor-default transition-colors"
            >
              <Undo2 size={13} />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (⌘Y)"
              className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:cursor-default transition-colors"
            >
              <Redo2 size={13} />
            </button>
          </div>

          {/* Privacy Mode — hidden on mobile, accessible via Template step */}
          <button
            onClick={togglePrivacyMode}
            title={privacyMode ? config.ui.privacyOn : config.ui.privacyOff}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              privacyMode
                ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                : 'border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-200 hover:bg-green-50'
            }`}
          >
            <ShieldCheck size={12} />
            <span className="hidden md:inline">{privacyMode ? config.ui.privacyOn : config.ui.privacyOff}</span>
          </button>

          {/* Clear — hidden on mobile */}
          <button
            onClick={() => setConfirmClear(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
            title={config.ui.clearConfirmTitle}
          >
            <Trash2 size={12} />
            <span className="hidden md:inline">{config.ui.clear}</span>
          </button>

          {/* Import */}
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <Sparkles size={12} />
            <span className="hidden sm:inline">{config.ui.import}</span>
          </button>

          {/* Copy to another market — hidden on mobile */}
          <button
            onClick={() => setCopyOpen(true)}
            title="Copy CV to another market"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <Copy size={12} />
            <span className="hidden md:inline">Copy to</span>
          </button>

          {/* JSON Backup / Restore — hidden on mobile */}
          <button
            onClick={handleBackupJSON}
            title="Download CV as JSON backup"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <HardDriveDownload size={12} />
            <span className="hidden md:inline">Backup</span>
          </button>
          <label
            title="Restore CV from JSON backup"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
          >
            <FolderOpen size={12} />
            <span className="hidden md:inline">Restore</span>
            <input type="file" accept=".json" className="sr-only" onChange={handleRestoreJSON} />
          </label>

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
                <><Loader2 size={12} className="animate-spin" /> {config.ui.generating}</>
              ) : pdfState === 'done' ? (
                <><CheckCircle size={12} /> {config.ui.done}</>
              ) : pdfState === 'error' ? (
                <><AlertCircle size={12} /> {config.ui.failed}</>
              ) : (
                <><Download size={12} /> {config.ui.exportPDF}</>
              )}
            </button>
          </div>

          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors hidden md:inline">
            {config.ui.markets}
          </Link>
        </div>
      </header>

      <PasteImportModal market={market} open={importOpen} onClose={() => setImportOpen(false)} />
      <CopyToMarketModal cv={cv} currentMarket={market} open={copyOpen} onClose={() => setCopyOpen(false)} />

      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 mx-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">{config.ui.clearConfirmTitle}</h2>
            <p className="text-xs text-gray-500 mb-5">{config.ui.clearConfirmBody}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmClear(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {config.ui.cancel}
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                {config.ui.clear}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
