import { usConfig } from './us.config';
import { euConfig } from './eu.config';
import { latamConfig } from './latam.config';
import { jpConfig } from './jp.config';
import { Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';

const configs: Record<Market, MarketConfig> = {
  us: usConfig,
  eu: euConfig,
  latam: latamConfig,
  jp: jpConfig,
};

export function getMarketConfig(market: Market): MarketConfig {
  return configs[market];
}

export function isValidMarket(value: string): value is Market {
  return ['us', 'eu', 'latam', 'jp'].includes(value);
}

export { usConfig, euConfig, latamConfig, jpConfig };
