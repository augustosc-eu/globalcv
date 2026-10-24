'use client';

import { useId, useMemo, useState } from 'react';
import { Share2, Check, AlertTriangle, X } from 'lucide-react';
import { CVData } from '@/types/cv.types';
import { encodeCVToURL, SENSITIVE_PERSONAL_FIELDS, URL_WARN_THRESHOLD } from '@/lib/sharing/shareUrl';

interface Props { cv: CVData }

function hasSensitiveData(cv: CVData): boolean {
  const info = cv.personalInfo;
  const personal = SENSITIVE_PERSONAL_FIELDS.some((field) => {
    const value = info[field];
    return value !== undefined && value !== '' && value !== false;
  });
  const address = Boolean(info.address?.street || info.address?.postalCode);
  const references = (cv.references ?? []).some((ref) => ref.email || ref.phone);
  return personal || address || references;
}

export default function ShareButton({ cv }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const titleId = useId();
  const sensitiveId = useId();

  const sensitivePresent = useMemo(() => hasSensitiveData(cv), [cv]);
  const url = useMemo(
    () => (open ? encodeCVToURL(cv, { includeSensitive: sensitivePresent && includeSensitive }) : ''),
    [open, cv, includeSensitive, sensitivePresent]
  );

  const copy = async () => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setOpen(false);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError('Could not access the clipboard. Select and copy the link manually.');
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(cv, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `cv-share-${cv.market}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(href);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => { setIncludeSensitive(false); setOpen(true); }}
        title="Create a share link (photo and ID number are never included)"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
      >
        {copied ? (
          <><Check size={12} className="text-green-600" /> <span className="text-green-600">Copied!</span></>
        ) : (
          <><Share2 size={12} /> Share</>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-white rounded-xl shadow-xl p-6 w-96 max-w-[calc(100vw-2rem)] mx-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" aria-hidden="true" />
                <h2 id={titleId} className="text-sm font-semibold text-gray-900">Share this CV as a link</h2>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
            <ul className="text-xs text-gray-600 mb-3 list-disc pl-4 space-y-1">
              <li>The link <strong>contains your CV text</strong>. It is compressed, <strong>not encrypted</strong>: anyone who has the link can read it.</li>
              <li>The data sits after the <code>#</code> in the link, so browsers do not send it to our server. It can still be stored in browser history, chat previews and bookmarks.</li>
              <li>Your photo and ID number are never included.</li>
            </ul>
            {sensitivePresent && (
              <div className="flex items-start gap-2 mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                <input
                  id={sensitiveId}
                  type="checkbox"
                  className="mt-0.5"
                  checked={includeSensitive}
                  onChange={(e) => setIncludeSensitive(e.target.checked)}
                />
                <label htmlFor={sensitiveId} className="text-xs text-amber-900">
                  Also include sensitive details (date of birth, nationality, marital status, gender, emergency contact,
                  street address, commute details, references&apos; email and phone). Leave unticked unless the recipient needs them.
                </label>
              </div>
            )}
            {url.length > URL_WARN_THRESHOLD && (
              <p className="text-xs text-gray-500 mb-3">
                This link is <strong>{url.length.toLocaleString()} characters</strong> long and may break in some email clients and chat apps.
                A JSON file is a more reliable way to hand it over.
              </p>
            )}
            {copyError && <p role="alert" className="text-xs text-red-600 mb-3 break-all">{copyError}<br />{url}</p>}
            <div className="flex gap-2 justify-end flex-wrap">
              <button
                onClick={downloadJson}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Download JSON instead
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={copy}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Copy link
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
