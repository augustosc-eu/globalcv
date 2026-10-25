/**
 * Minimal browser-like environment for unit tests: an in-memory Storage that
 * can simulate quota limits and failing writes, plus `window`/`location`.
 * Import this module FIRST in a test file (before any app modules).
 */
export class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  /** Max total characters (keys + values); Infinity = unlimited. */
  quota = Infinity;
  /** When > 0, the next N setItem calls throw a QuotaExceededError. */
  failNextWrites = 0;
  /** When true, setItem silently drops writes (simulates broken shims). */
  dropWrites = false;

  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    if (this.failNextWrites > 0) {
      this.failNextWrites -= 1;
      throw quotaError();
    }
    const size = this.usedChars() - (this.data.has(key) ? key.length + (this.data.get(key) as string).length : 0) + key.length + value.length;
    if (size > this.quota) throw quotaError();
    if (this.dropWrites) return;
    this.data.set(key, String(value));
  }
  usedChars(): number {
    let total = 0;
    for (const [k, v] of this.data) total += k.length + v.length;
    return total;
  }
  keys(): string[] {
    return Array.from(this.data.keys());
  }
  reset(): void {
    this.data.clear();
    this.quota = Infinity;
    this.failNextWrites = 0;
    this.dropWrites = false;
  }
}

function quotaError(): Error {
  const err = new Error('The quota has been exceeded.');
  err.name = 'QuotaExceededError';
  return err;
}

export const localStore = new MemoryStorage();
export const sessionStore = new MemoryStorage();

const location = { href: 'https://globalcv.test/us', search: '', hash: '', pathname: '/us', origin: 'https://globalcv.test' };

const g = globalThis as unknown as Record<string, unknown>;
g.window = {
  localStorage: localStore,
  sessionStorage: sessionStore,
  location,
  history: {
    replaceState: (_s: unknown, _t: string, url: string) => {
      const u = new URL(url, location.href);
      location.href = u.toString();
      location.search = u.search;
      location.hash = u.hash;
      location.pathname = u.pathname;
    },
  },
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};
g.localStorage = localStore;
g.sessionStorage = sessionStore;

export function setLocation(url: string): void {
  const u = new URL(url);
  location.href = u.toString();
  location.search = u.search;
  location.hash = u.hash;
  location.pathname = u.pathname;
}

export function resetEnv(): void {
  localStore.reset();
  sessionStore.reset();
  setLocation('https://globalcv.test/us');
}
