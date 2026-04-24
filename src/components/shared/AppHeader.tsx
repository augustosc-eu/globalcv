'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Save, CheckCircle, Download, Sparkles, Loader2, AlertCircle, Trash2, ShieldCheck, Undo2, Redo2, HardDriveDownload, FolderOpen, Copy, ChevronDown, Wrench, Files, FilePlus2, ScrollText } from 'lucide-react';
import { useCVStore } from '@/store/cvStore';
import { Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import { ExportMode, usePDFExport } from '@/hooks/usePDFExport';
import ShareButton from './ShareButton';
import ThemeSelector from './ThemeSelector';
import PasteImportModal from './PasteImportModal';
import CopyToMarketModal from './CopyToMarketModal';
import BrandLink from './BrandLink';
import DraftManagerModal from './DraftManagerModal';
import CoverLetterModal from './CoverLetterModal';
import { clearCV, listSavedDrafts, saveCV } from '@/lib/storage/localStorage';
import { parseCVData } from '@/lib/cv/schema';

const marketFlags: Record<Market, string> = {
  us: '🇺🇸', eu: '🇪🇺', latam: '🌎', jp: '🇯🇵',
  gb: '🇬🇧', au: '🇦🇺', in: '🇮🇳', br: '🇧🇷',
};

const exportModeLabels: Record<ExportMode, string> = {
  designed: 'Designed',
  ats: 'ATS-safe',
  privacy: 'Privacy',
  compact: 'Compact',
};

interface Props { market: Market; config: MarketConfig }

export default function AppHeader({ market, config }: Props) {
  const { isDirty, isSaving, lastSaved, save, cv, resetCV, restoreCV, initializeMarket, privacyMode, togglePrivacyMode, undo, redo, history, historyIndex } = useCVStore();
  const { exportPDF, state: pdfState, error: pdfError } = usePDFExport();
  const [importOpen, setImportOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [hidePhotoInPdf, setHidePhotoInPdf] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>('designed');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [drafts, setDrafts] = useState(() => listSavedDrafts());
  const toolsRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('globalcv_hide_photo_pdf');
      const savedMode = window.localStorage.getItem('globalcv_export_mode') as ExportMode | null;
      setHidePhotoInPdf(saved === 'true');
      if (savedMode && ['designed', 'ats', 'privacy', 'compact'].includes(savedMode)) {
        setExportMode(savedMode);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    setDrafts(listSavedDrafts());
  }, [cv.id, cv.lastModified, market]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setToolsOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  function handleClear() {
    resetCV(market);
    setConfirmClear(false);
  }

  function refreshDrafts() {
    setDrafts(listSavedDrafts());
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
        const data = parseCVData(JSON.parse(ev.target?.result as string));
        if (data) {
          restoreCV(data, { markDirty: true, setActive: true });
          refreshDrafts();
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

  function updateHidePhotoPreference(checked: boolean) {
    setHidePhotoInPdf(checked);
    try {
      window.localStorage.setItem('globalcv_hide_photo_pdf', String(checked));
    } catch {
      // no-op
    }
  }

  function updateExportModePreference(mode: ExportMode) {
    setExportMode(mode);
    try {
      window.localStorage.setItem('globalcv_export_mode', mode);
    } catch {
      // no-op
    }
  }

  function handleDeleteDraft(draftId: string) {
    clearCV(market, draftId);
    if (draftId === cv.id) {
      initializeMarket(market);
    }
    refreshDrafts();
  }

  function handleDuplicateCurrentDraft() {
    const nextTitle = `${cv.title ?? `${config.name} Draft`} Copy`;
    const duplicated = {
      ...cv,
      id: `cv_${market}_${Date.now()}`,
      title: nextTitle,
      lastModified: new Date().toISOString(),
    };
    saveCV(duplicated);
    restoreCV(duplicated, { markDirty: false, setActive: true });
    refreshDrafts();
  }

  return (
    <>
      <header className="relative z-[80] overflow-visible h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center px-3 sm:px-4 gap-3 flex-shrink-0">
        <BrandLink href="/" variant="editor" className="flex-shrink-0" />

        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700">
          <span>{marketFlags[market]}</span>
          <span className="font-semibold">{config.name}</span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500">
          {isSaving ? (
            <span>{config.ui.saving}</span>
          ) : isDirty ? (
            <button onClick={save} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors">
              <Save size={12} /> {config.ui.save}
            </button>
          ) : savedTime ? (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <CheckCircle size={12} /> {config.ui.saved} {savedTime}
            </span>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden xl:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Draft</p>
              <p className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">{cv.title ?? `${config.name} Draft`}</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-0.5 py-0.5">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl/Cmd + Z)"
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              <Undo2 size={13} />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl/Cmd + Y)"
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              <Redo2 size={13} />
            </button>
          </div>

          <ThemeSelector config={config} />

          <ShareButton cv={cv} />

          <button
            onClick={() => exportPDF(cv, config, { hidePhoto: hidePhotoInPdf, mode: exportMode })}
            disabled={pdfState === 'generating'}
            title={pdfState === 'error' && pdfError ? pdfError : undefined}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-white transition-colors disabled:opacity-60 shadow-sm"
            style={{ backgroundColor: pdfState === 'error' ? '#dc2626' : config.color }}
          >
            {pdfState === 'generating' ? (
              <><Loader2 size={12} className="animate-spin" /> {config.ui.generating}</>
            ) : pdfState === 'done' ? (
              <><CheckCircle size={12} /> {config.ui.done}</>
            ) : pdfState === 'error' ? (
              <><AlertCircle size={12} /> {config.ui.failed}</>
            ) : (
              <><Download size={12} /> {config.ui.exportPDF}<span className="hidden lg:inline opacity-80">({exportModeLabels[exportMode]})</span></>
            )}
          </button>

          <div ref={toolsRef} className="relative">
            <button
              onClick={() => setToolsOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Wrench size={12} />
              <span className="hidden sm:inline">Tools</span>
              <ChevronDown size={12} className={`transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
            </button>

            {toolsOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white shadow-xl p-2 z-[95]">
                <button
                  onClick={() => { setImportOpen(true); setToolsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Sparkles size={14} />
                  {config.ui.import}
                </button>
                <button
                  onClick={() => { setCopyOpen(true); setToolsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Copy size={14} />
                  Copy to another market
                </button>
                <button
                  onClick={() => { setDraftsOpen(true); setToolsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Files size={14} />
                  Manage drafts
                </button>
                <button
                  onClick={() => { handleDuplicateCurrentDraft(); setToolsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <FilePlus2 size={14} />
                  Save as new draft
                </button>
                <button
                  onClick={() => { handleBackupJSON(); setToolsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <HardDriveDownload size={14} />
                  Backup JSON
                </button>
                <label className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                  <FolderOpen size={14} />
                  Restore JSON
                  <input type="file" accept=".json" className="sr-only" onChange={handleRestoreJSON} />
                </label>
                <button
                  onClick={() => { setCoverLetterOpen(true); setToolsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ScrollText size={14} />
                  Generate cover letter
                </button>
                <div className="my-1 h-px bg-slate-200" />
                <label className="flex flex-col gap-1 px-3 py-2 text-sm text-slate-700 rounded-lg">
                  <span className="text-xs font-semibold text-slate-500">Export mode</span>
                  <select
                    value={exportMode}
                    onChange={(e) => updateExportModePreference(e.target.value as ExportMode)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
                  >
                    <option value="designed">Designed PDF</option>
                    <option value="ats">ATS-safe</option>
                    <option value="privacy">Privacy copy</option>
                    <option value="compact">One-page compact</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 rounded-lg">
                  <input
                    type="checkbox"
                    checked={hidePhotoInPdf}
                    onChange={(e) => updateHidePhotoPreference(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Hide photo in PDF
                </label>
                <button
                  onClick={() => togglePrivacyMode()}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                    privacyMode ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck size={14} />
                  {privacyMode ? config.ui.privacyOn : config.ui.privacyOff}
                </button>
                <button
                  onClick={() => { setConfirmClear(true); setToolsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                  {config.ui.clear}
                </button>
                <Link
                  href="/"
                  onClick={() => setToolsOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {config.ui.markets}
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <PasteImportModal market={market} open={importOpen} onClose={() => setImportOpen(false)} />
      <CopyToMarketModal cv={cv} currentMarket={market} open={copyOpen} onClose={() => setCopyOpen(false)} />
      <DraftManagerModal
        open={draftsOpen}
        currentDraftId={cv.id}
        drafts={drafts}
        market={market}
        onClose={() => setDraftsOpen(false)}
        onOpenDraft={(draftId) => {
          initializeMarket(market, draftId);
          setDraftsOpen(false);
          refreshDrafts();
        }}
        onDeleteDraft={handleDeleteDraft}
        onDuplicateCurrent={handleDuplicateCurrentDraft}
      />
      <CoverLetterModal open={coverLetterOpen} cv={cv} onClose={() => setCoverLetterOpen(false)} />

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
