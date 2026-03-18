import { CVData } from '@/types/cv.types';
import { ColorTheme, MarketConfig } from '@/types/market.types';

export function getActiveTheme(cv: CVData, config: MarketConfig): ColorTheme {
  const found = config.themes.find((t) => t.id === cv.colorTheme);
  return found ?? config.themes[0] ?? { id: 'default', name: 'Default', primary: config.color, accent: config.accentColor, light: '#f3f4f6' };
}
