'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { CVData } from '@/types/cv.types';
import { buildCoverLetter } from '@/lib/cv/coverLetter';

interface Props {
  open: boolean;
  cv: CVData;
  onClose: () => void;
}

export default function CoverLetterModal({ open, cv, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const content = useMemo(() => buildCoverLetter(cv), [cv]);

  if (!open) return null;

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Cover letter draft</h2>
            <p className="text-xs text-slate-500 mt-1">Generated from your current CV, target role, and target company fields.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <textarea
            readOnly
            value={content}
            rows={18}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 resize-none focus:outline-none"
          />

          <div className="flex justify-end">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
