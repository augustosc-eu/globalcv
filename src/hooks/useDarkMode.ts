'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'globalcv_dark_mode';

function getInitialDark(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === 'true';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(false);

  useEffect(() => {
    const initial = getInitialDark();
    setDark(initial);
    document.documentElement.classList.toggle('dark', initial);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // quota exceeded
    }
  };

  return { dark, toggle };
}
