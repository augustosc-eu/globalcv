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
          'relative w-8 h-8 rounded-xl border flex items-center justify-center transition-all hover:-translate-y-0.5',
          isActive
            ? 'border-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.25)]'
            : 'border-slate-200 hover:border-slate-300 shadow-[0_2px_8px_rgba(15,23,42,0.08)]'
        )}
        style={{
          background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.accent} 58%, ${theme.light} 100%)`,
        }}
      >
        <span className="absolute inset-[2px] rounded-lg border border-white/40" />
        {isActive && <Check size={11} className="text-white drop-shadow-sm" strokeWidth={3} />}
      </button>
    );
  });

  if (inline) {
    return <div className="flex items-center gap-2.5 flex-wrap">{dots}</div>;
  }

  // Header mode: hide entirely on mobile (< sm), show on sm+
  return (
    <div className="hidden sm:flex items-center gap-2">{dots}</div>
  );
}
