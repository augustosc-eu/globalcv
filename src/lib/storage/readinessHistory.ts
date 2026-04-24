export interface ReadinessSnapshot {
  score: number;
  createdAt: string;
}

const KEY_PREFIX = 'globalcv_readiness_history_';
const MAX_SNAPSHOTS = 20;

function keyForDraft(draftId: string): string {
  return `${KEY_PREFIX}${draftId}`;
}

export function loadReadinessHistory(draftId: string): ReadinessSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(keyForDraft(draftId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReadinessSnapshot[];
    return Array.isArray(parsed) ? parsed.filter((item) => Number.isFinite(item.score)) : [];
  } catch {
    return [];
  }
}

export function recordReadinessSnapshot(draftId: string, score: number): ReadinessSnapshot[] {
  if (typeof window === 'undefined') return [];
  const history = loadReadinessHistory(draftId);
  const last = history.at(-1);
  if (last && Math.abs(last.score - score) < 5) return history;

  const next = [...history, { score, createdAt: new Date().toISOString() }].slice(-MAX_SNAPSHOTS);
  try {
    window.localStorage.setItem(keyForDraft(draftId), JSON.stringify(next));
  } catch {
    // no-op
  }
  return next;
}
