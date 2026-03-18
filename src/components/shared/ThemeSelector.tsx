'use client';

import { useCVStore } from '@/store/cvStore';
import { MarketConfig } from '@/types/market.types';
import { cn } from '@/lib/utils/cn';
import { Check } from 'lucide-react';

interface Props { config: MarketConfig }

export default function ThemeSelector({ config }: Props) {
  const { cv, setColorTheme } = useCVStore();
  const activeId = cv.colorTheme ?? config.themes[0]?.id;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {config.themes.map((theme) => {
        const isActive = activeId === theme.id;
        return (
          <button
            key={theme.id}
            onClick={() => setColorTheme(theme.id)}
            title={theme.name}
            className={cn(
              'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110',
              isActive ? 'border-gray-900 scale-110' : 'border-transparent'
            )}
            style={{ backgroundColor: theme.primary }}
          >
            {isActive && <Check size={10} className="text-white" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
