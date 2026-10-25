'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Save, CheckCircle, Download, Sparkles, Loader2, AlertCircle, Trash2, ShieldCheck, Undo2, Redo2, HardDriveDownload, FolderOpen, Copy, ChevronDown, Wrench, Files, FilePlus2, ScrollText, Keyboard, Moon, Sun, ShieldX, Archive } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
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
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import { clearCV as clearDraft, listSavedDrafts, saveCV, restoreFullLocalExport } from '@/lib/storage/localStorage';
import { parseBackupFile, MAX_BACKUP_BYTES } from '@/lib/cv/backupImport';
import { downloadCurrentCV, downloadFullLocalExport } from '@/lib/storage/downloads';

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
  const { isDirty, isSaving, lastSaved, save, cv, restoreCV, initializeMarket, privacyMode, togglePrivacyMode, undo, redo, history, historyIndex,
          clearCurrentCV, eraseAllData, importAsNewDraft, saveError } = useCVStore();
  const router = useRouter();
  const [confirmErase, setConfirmErase] = useState(false);
  const [eraseWord, setEraseWord] = useState('');
  const [notice, setNotice] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const { dark, toggle: toggleDarkMode } = useDarkMode();
  const { exportPDF, state: pdfState, error: pdfError } = usePDFExport();
  const [importOpen, setImportOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
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
      if (mod) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
        if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
        if (e.key === 's') { e.preventDefault(); save(); return; }
      }
      if (e.key === '?' && !mod && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        setShortcutsOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, save]);

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
    const result = clearCurrentCV();
    setConfirmClear(false);
    refreshDrafts();
    setNotice(result.ok
      ? { tone: 'info', text: 'The CV was deleted from this device.' }
      : { tone: 'error', text: result.message });
  }

  function handleEraseAll() {
    const result = eraseAllData();
    setConfirmErase(false);
    setEraseWord('');
    refreshDrafts();
    setNotice(result.remaining.length === 0
      ? { tone: 'info', text: `All GlobalCV data was erased from this browser (${result.removed} item(s) removed).` }
      : { tone: 'error', text: `Some data could not be removed (${result.remaining.length} item(s)). Clear this site's data in your browser settings.` });
  }

  function refreshDrafts() {
    setDrafts(listSavedDrafts());
  }

  function handleBackupJSON() {
    downloadCurrentCV(cv);
  }

  function handleRestoreJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setNotice({ tone: 'error', text: 'This file is too large to be a GlobalCV backup (limit 10 MB).' });
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setNotice({ tone: 'error', text: 'The file could not be read.' });
    reader.onload = (ev) => {
      const parsed = parseBackupFile(String(ev.target?.result ?? ''), market);
      if (parsed.kind === 'error') {
        setNotice({ tone: 'error', text: parsed.message });
        return;
      }
      if (parsed.kind === 'full-export') {
        const restored = restoreFullLocalExport(parsed.data);
        refreshDrafts();
        setNotice({
          tone: restored.failed ? 'error' : 'info',
          text: `Restored ${restored.restoredDrafts} draft(s) and ${restored.restoredKeys} item(s). ${restored.skippedExisting} existing item(s) were kept unchanged${restored.failed ? `; ${restored.failed} could not be written (storage full?)` : ''}.`,
        });
        return;
      }
      // Always restore as a new draft: never overwrite an existing one.
      if (!importAsNewDraft(parsed.cv, parsed.cv.market)) {
        setNotice({ tone: 'error', text: 'Your current changes could not be saved, so the backup was not opened. Download a backup of the current CV first.' });
        return;
      }
      const repairedNote = parsed.repaired ? ' Some invalid fields were reset to defaults.' : '';
      if (parsed.marketMismatch) {
        setNotice({ tone: 'info', text: `This backup is for the ${parsed.cv.market.toUpperCase()} market and was opened there as a new draft.${repairedNote}` });
        router.push(`/${parsed.cv.market}`);
      } else {
        setNotice({ tone: 'info', text: `Backup restored as a new draft.${repairedNote}` });
      }
      refreshDrafts();
    };
    reader.readAsText(file);
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
    if (draftId === cv.id) {
      const result = clearCurrentCV();
      if (!result.ok) setNotice({ tone: 'error', text: result.message });
      else initializeMarket(market);
    } else {
      const result = clearDraft(market, draftId);
      if (!result.ok) setNotice({ tone: 'error', text: result.message });
    }
    refreshDrafts();
  }

  function handleDuplicateCurrentDraft() {
    const nextTitle = `${cv.title ?? `${config.name} Draft`} Copy`;
    const duplicated = {
      ...cv,
      id: `cv_${market}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: nextTitle,
      lastModified: new Date().toISOString(),
    };
    const result = saveCV(duplicated, { expectedRevision: null });
    if (!result.ok) {
      setNotice({ tone: 'error', text: result.message });
      return;
    }
    restoreCV({ ...duplicated, lastModified: result.savedAt }, { markDirty: false, setActive: true, revision: result.revision });
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
          ) : saveError ? (
            <button onClick={() => save()} className="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-800 transition-colors">
              <AlertCircle size={12} /> {config.ui.notSaved}
            </button>
          ) : isDirty ? (
            <button onClick={() => save()} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors">
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
                  <input type="file" accept=".json,application/json" className="sr-only" onChange={handleRestoreJSON} />
                </label>
                <button
                  onClick={() => { downloadFullLocalExport(); setToolsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Archive size={14} />
                  {config.ui.exportAll}
                </button>
                <button
                  onClick={() => { setCoverLetterOpen(true); setToolsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ScrollText size={14} />
                  Generate cover letter
                </button>
                <button
                  onClick={() => { setShortcutsOpen(true); setToolsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Keyboard size={14} />
                  Keyboard shortcuts
                  <kbd className="ml-auto text-[10px] font-semibold text-slate-400 border border-slate-200 rounded px-1">?</kbd>
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
                  onClick={toggleDarkMode}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {dark ? <Sun size={14} /> : <Moon size={14} />}
                  {dark ? 'Light mode' : 'Dark mode'}
                </button>
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
                <button
                  onClick={() => { setConfirmErase(true); setEraseWord(''); setToolsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <ShieldX size={14} />
                  {config.ui.eraseAll}
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
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {notice && (
        <div
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-[95] flex items-start gap-3 max-w-md w-[calc(100%-2rem)] px-4 py-3 rounded-xl shadow-lg text-xs ${
            notice.tone === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-slate-900 text-white'
          }`}
        >
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)} className="font-semibold underline">OK</button>
        </div>
      )}

      {confirmErase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div role="alertdialog" aria-modal="true" aria-labelledby="erase-all-title" aria-describedby="erase-all-body" className="bg-white rounded-xl shadow-xl p-6 w-96 max-w-[calc(100vw-2rem)] mx-4">
            <h2 id="erase-all-title" className="text-sm font-semibold text-gray-900 mb-2">{config.ui.eraseAllConfirmTitle}</h2>
            <p id="erase-all-body" className="text-xs text-gray-600 mb-3">{config.ui.eraseAllConfirmBody}</p>
            <button onClick={() => downloadFullLocalExport()} className="mb-3 text-xs font-medium text-blue-700 underline">
              {config.ui.exportAll}
            </button>
            <label htmlFor="erase-all-word" className="block text-xs text-gray-700 mb-1">
              Type <strong>{config.ui.eraseAllConfirmWord}</strong> to confirm
            </label>
            <input
              id="erase-all-word"
              value={eraseWord}
              onChange={(e) => setEraseWord(e.target.value)}
              autoComplete="off"
              className="w-full mb-4 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setConfirmErase(false); setEraseWord(''); }}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {config.ui.cancel}
              </button>
              <button
                onClick={handleEraseAll}
                disabled={eraseWord.trim().toUpperCase() !== config.ui.eraseAllConfirmWord.toUpperCase()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {config.ui.eraseAll}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div role="alertdialog" aria-modal="true" aria-labelledby="clear-cv-title" aria-describedby="clear-cv-body" className="bg-white rounded-xl shadow-xl p-6 w-80 mx-4">
            <h2 id="clear-cv-title" className="text-sm font-semibold text-gray-900 mb-2">{config.ui.clearConfirmTitle}</h2>
            <p id="clear-cv-body" className="text-xs text-gray-500 mb-3">{config.ui.clearConfirmBody}</p>
            <button onClick={() => downloadCurrentCV(cv)} className="mb-4 text-xs font-medium text-blue-700 underline">
              Download a backup of this CV first
            </button>
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
