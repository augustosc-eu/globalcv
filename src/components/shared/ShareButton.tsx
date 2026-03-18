'use client';

import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { CVData } from '@/types/cv.types';
import { encodeCVToURL } from '@/lib/sharing/shareUrl';

interface Props { cv: CVData }

export default function ShareButton({ cv }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = encodeCVToURL(cv);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <button
      onClick={handleShare}
      title="Copy shareable link (photo excluded)"
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
    >
      {copied ? (
        <><Check size={12} className="text-green-600" /> <span className="text-green-600">Copied!</span></>
      ) : (
        <><Share2 size={12} /> Share</>
      )}
    </button>
  );
}
