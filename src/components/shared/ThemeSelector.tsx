'use client';

import { useCVStore } from '@/store/cvStore';
import { MarketConfig } from '@/types/market.types';
import { cn } from '@/lib/utils/cn';
import { Check } from 'lucide-react';

interface Props {
  config: MarketConfig;
  /** When true renders full row (for use inside steps). Defaults to header mode (hidden on mobile). */
  inline?: boolean;
}

export default function ThemeSelector({ config, inline = false }: Props) {
  const { cv, setColorTheme } = useCVStore();
  const activeId = cv.colorTheme ?? config.themes[0]?.id;

  const dots = config.themes.map((theme) => {
    const isActive = activeId === theme.id;
    return (
      <button
        key={theme.id}
        onClick={() => setColorTheme(theme.id)}
        title={theme.name}
        className={cn(
          'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110',
          isActive ? 'border-gray-900 scale-110' : 'border-transparent'
        )}
        style={{ backgroundColor: theme.primary }}
      >
        {isActive && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>
    );
  });

  if (inline) {
    return <div className="flex items-center gap-2 flex-wrap">{dots}</div>;
  }

  // Header mode: hide entirely on mobile (< sm), show on sm+
  return (
    <div className="hidden sm:flex items-center gap-1.5">{dots}</div>
  );
}
