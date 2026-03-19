'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, X } from 'lucide-react';

const BANNER_KEY = 'globalcv_privacy_notice_dismissed';

export default function PrivacyBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(BANNER_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (privacy mode or blocked) — don't show banner
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(BANNER_KEY, '1');
    } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-100 px-4 py-2.5 flex items-center gap-3 text-xs text-blue-800">
      <Shield size={14} className="flex-shrink-0 text-blue-500" />
      <p className="flex-1">
        <strong>Your data never leaves your browser.</strong>{' '}
        CV data is saved in localStorage on this device only. On a shared or public computer,{' '}
        use <strong>Clear Data</strong> before leaving or enable <strong>Privacy Mode</strong>.{' '}
        <Link href="/privacy" className="underline hover:text-blue-900">Privacy Policy</Link>
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="flex-shrink-0 p-1 rounded hover:bg-blue-100 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
