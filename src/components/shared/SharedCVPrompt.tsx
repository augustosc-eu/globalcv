'use client';

import { useId } from 'react';
import { FileInput } from 'lucide-react';
import { CVData } from '@/types/cv.types';

interface Props {
  cv: CVData;
  legacy: boolean;
  onOpen: () => void;
  onDismiss: () => void;
}

export default function SharedCVPrompt({ cv, legacy, onOpen, onDismiss }: Props) {
  const titleId = useId();
  const name = `${cv.personalInfo.firstName} ${cv.personalInfo.lastName}`.trim() || cv.title || 'Untitled CV';
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" onKeyDown={(e) => { if (e.key === 'Escape') onDismiss(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-white rounded-xl shadow-xl p-6 w-96 max-w-full">
        <div className="flex items-center gap-2 mb-3">
          <FileInput size={16} className="text-blue-600" aria-hidden="true" />
          <h2 id={titleId} className="text-sm font-semibold text-gray-900">Open shared CV?</h2>
        </div>
        <p className="text-xs text-gray-600 mb-2">
          This link contains a CV for <strong>{name}</strong>. It will be opened as a <strong>new draft</strong>.
          Your existing drafts are not changed.
        </p>
        {legacy && (
          <p className="text-xs text-amber-700 mb-2">
            This is an older link format. For privacy, sensitive details (date of birth, nationality, marital status,
            gender, ID number, emergency contact, street address, references&apos; contact details) were not imported.
          </p>
        )}
        <p className="text-xs text-gray-500 mb-5">The shared data has already been removed from the address bar.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onDismiss} className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            Don&apos;t open
          </button>
          <button onClick={onOpen} className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700" autoFocus>
            Open as new draft
          </button>
        </div>
      </div>
    </div>
  );
}
