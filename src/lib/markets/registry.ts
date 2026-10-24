import type { Market } from '@/types/cv.types';

/**
 * Single source of truth for the list of supported markets.
 *
 * This module intentionally has no imports beyond types so it can be used from
 * low-level modules (schema, storage) without creating import cycles with the
 * market config files.
 */
export const MARKETS = ['us', 'eu', 'latam', 'jp', 'gb', 'au', 'in', 'br'] as const satisfies readonly Market[];

// Compile-time guard: fails if a Market is added to the union but not to MARKETS.
type MissingMarkets = Exclude<Market, (typeof MARKETS)[number]>;
const assertAllMarketsListed: MissingMarkets extends never ? true : never = true;
void assertAllMarketsListed;

export function isMarket(value: unknown): value is Market {
  return typeof value === 'string' && (MARKETS as readonly string[]).includes(value);
}
