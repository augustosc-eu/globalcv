import { Job, JobSourceStatus, JobsResponse, JOB_CATEGORIES, JOB_REGIONS, JOB_SOURCES, JOB_TYPES } from '@/lib/jobs/types';
import { DEMO_JOBS } from '@/lib/jobs/internal';
import {
  fetch4DayWeek,
  fetchArbeitnow,
  fetchHimalayas,
  fetchJobicy,
  fetchRemoteOK,
  fetchRemotive,
  fetchTheMuseEmea,
  isFourDaySchedule,
  parseSalaryMin,
} from '@/lib/jobs/sources';

export const JOBS_PER_PAGE = 20;
export const MAX_QUERY_LENGTH = 100;
export const MAX_PAGE = 200;
/** How long a source's normalised result is reused within one server instance. */
export const SOURCE_CACHE_TTL_MS = 5 * 60 * 1000;
/** Upper bound on simultaneous upstream source fetches per instance. */
export const MAX_CONCURRENT_SOURCES = 4;
/** Overall time budget for one source (including multi-request feeds). */
export const SOURCE_BUDGET_MS = 9000;

type SourceId = Exclude<Job['source'], 'globalcv'>;

export interface JobsQuery {
  q: string;
  category: string;
  region: string;
  jobType: string;
  source: string;
  salary: boolean;
  fourDay: boolean;
  sort: 'newest' | 'salary';
  page: number;
}

export interface JobsEnv {
  safeMode: boolean;
  enableArbeitnow: boolean;
  enable4DayWeek: boolean;
  enableTheMuse: boolean;
  enableDemoJobs: boolean;
}

export function readJobsEnv(env: Record<string, string | undefined> = process.env): JobsEnv {
  return {
    safeMode: env.JOBS_SAFE_MODE !== 'false',
    enableArbeitnow: env.ENABLE_ARBEITNOW_SOURCE === 'true',
    enable4DayWeek: env.ENABLE_4DAYWEEK_SOURCE === 'true',
    enableTheMuse: env.ENABLE_THEMUSE_SOURCE === 'true',
    enableDemoJobs: env.ENABLE_DEMO_JOBS === 'true' || (env.NODE_ENV !== 'production' && env.ENABLE_DEMO_JOBS !== 'false'),
  };
}

const ids = (list: readonly { id: string }[]) => new Set(list.map((item) => item.id));
const CATEGORY_IDS = ids(JOB_CATEGORIES);
const REGION_IDS = ids(JOB_REGIONS);
const TYPE_IDS = ids(JOB_TYPES);
const SOURCE_IDS = ids(JOB_SOURCES);

export type QueryParseResult = { ok: true; query: JobsQuery } | { ok: false; error: string };

/** Validate and normalise query-string input. Unknown enum values are rejected, not passed upstream. */
export function parseJobsQuery(sp: URLSearchParams): QueryParseResult {
  const rawQ = (sp.get('q') ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (rawQ.length > MAX_QUERY_LENGTH) return { ok: false, error: `Search text must be at most ${MAX_QUERY_LENGTH} characters.` };

  const pick = (name: string, allowed: Set<string>): string | null => {
    const value = sp.get(name) ?? 'all';
    return allowed.has(value) ? value : null;
  };
  const category = pick('category', CATEGORY_IDS);
  const region = pick('region', REGION_IDS);
  const jobType = pick('jobType', TYPE_IDS);
  const source = pick('source', SOURCE_IDS);
  if (!category || !region || !jobType || !source) return { ok: false, error: 'Unknown filter value.' };

  const sortRaw = sp.get('sort') ?? 'newest';
  if (sortRaw !== 'newest' && sortRaw !== 'salary') return { ok: false, error: 'Unknown sort value.' };

  const pageRaw = sp.get('page') ?? '1';
  if (!/^\d{1,4}$/.test(pageRaw)) return { ok: false, error: 'Page must be a positive integer.' };
  const page = Math.min(MAX_PAGE, Math.max(1, Number(pageRaw)));

  return {
    ok: true,
    query: {
      q: rawQ.toLowerCase(),
      category,
      region,
      jobType,
      source,
      salary: sp.get('salary') === 'true',
      fourDay: sp.get('fourDay') === 'true',
      sort: sortRaw,
      page,
    },
  };
}

interface SourcePlan {
  id: SourceId;
  /** Cache key: depends only on bounded inputs (never on free-text search). */
  key: string;
  load: () => Promise<Job[]>;
}

/** Which upstream sources a query needs. Only enum values influence upstream requests. */
export function planSources(query: JobsQuery, env: JobsEnv): SourcePlan[] {
  const { source, region, category } = query;
  const all = source === 'all';
  const plans: SourcePlan[] = [];
  const add = (id: SourceId, wanted: boolean, key: string, load: () => Promise<Job[]>) => {
    if (wanted) plans.push({ id, key, load });
  };
  const upstreamCategory = category === 'other' ? 'all' : category;

  add('remotive', all || source === 'remotive', `remotive:${upstreamCategory}`, () => fetchRemotive(upstreamCategory));
  add('jobicy', all || source === 'jobicy', `jobicy:${upstreamCategory}`, () => fetchJobicy(upstreamCategory));
  add('remoteok', all || source === 'remoteok', 'remoteok', () => fetchRemoteOK());
  add('arbeitnow', (all || source === 'arbeitnow') && (!env.safeMode || env.enableArbeitnow), 'arbeitnow', () => fetchArbeitnow());
  add('himalayas', source === 'himalayas' || (all && (region === 'all' || region === 'latam')), 'himalayas', () => fetchHimalayas('himalayas'));
  add('himalayas-jp', source === 'himalayas-jp' || (all && (region === 'all' || region === 'apac')), 'himalayas-jp', () => fetchHimalayas('himalayas-jp'));
  add('himalayas-emea', source === 'himalayas-emea' || (all && (region === 'all' || region === 'eu' || region === 'uk')), 'himalayas-emea', () => fetchHimalayas('himalayas-emea'));
  add('4dayweek', env.enable4DayWeek && !env.safeMode && (all || source === '4dayweek'), '4dayweek', () => fetch4DayWeek());
  add('themuse-emea', env.enableTheMuse && !env.safeMode && (source === 'themuse-emea' || (all && (region === 'all' || region === 'eu' || region === 'uk'))), 'themuse-emea', () => fetchTheMuseEmea());
  return plans;
}

// ─── Per-instance cache with single-flight and bounded concurrency ───────────

interface CacheEntry {
  jobs: Job[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<Job[]>>();
let active = 0;
const waiters: (() => void)[] = [];

async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT_SOURCES) await new Promise<void>((resolve) => waiters.push(resolve));
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
    waiters.shift()?.();
  }
}

function withBudget<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Source timed out')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

export function resetJobsCacheForTests(): void {
  cache.clear();
  inFlight.clear();
}

export const sourceStats = { upstreamLoads: 0 };

async function loadSource(plan: SourcePlan, now: number): Promise<{ jobs: Job[]; status: JobSourceStatus }> {
  const hit = cache.get(plan.key);
  if (hit && hit.expiresAt > now) {
    return { jobs: hit.jobs, status: { id: plan.id, ok: true, count: hit.jobs.length, cached: true } };
  }
  let pending = inFlight.get(plan.key);
  const shared = Boolean(pending);
  if (!pending) {
    sourceStats.upstreamLoads += 1;
    pending = withConcurrencyLimit(() => withBudget(plan.load(), SOURCE_BUDGET_MS)).finally(() => inFlight.delete(plan.key));
    inFlight.set(plan.key, pending);
  }
  try {
    const jobs = await pending;
    if (!shared) cache.set(plan.key, { jobs, expiresAt: Date.now() + SOURCE_CACHE_TTL_MS });
    return { jobs, status: { id: plan.id, ok: true, count: jobs.length, cached: shared } };
  } catch (err) {
    if (!shared) console.warn(`[jobs] source ${plan.id} failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    // Serve stale data if we have it rather than nothing.
    if (hit) return { jobs: hit.jobs, status: { id: plan.id, ok: false, count: hit.jobs.length, cached: true } };
    return { jobs: [], status: { id: plan.id, ok: false, count: 0, cached: false } };
  }
}

// ─── Filtering, sorting, pagination (pure) ───────────────────────────────────

export function salarySortValue(job: Job): number {
  return job.salaryMin ?? parseSalaryMin(job.salary) ?? 0;
}

export function filterSortPaginate(all: Job[], query: JobsQuery): Pick<JobsResponse, 'jobs' | 'total' | 'page' | 'totalPages'> {
  const seen = new Set<string>();
  let jobs = all.filter((j) => {
    if (!j.title || !j.url) return false;
    const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const { q } = query;
  if (q) {
    jobs = jobs.filter((j) =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.tags.some((t) => t.toLowerCase().includes(q)) ||
      (j.description ?? '').toLowerCase().includes(q),
    );
  }
  if (query.category !== 'all') jobs = jobs.filter((j) => j.category === query.category);
  if (query.region !== 'all') jobs = jobs.filter((j) => j.region === query.region);
  if (query.jobType !== 'all') jobs = jobs.filter((j) => j.jobType === query.jobType);
  if (query.source !== 'all') jobs = jobs.filter((j) => j.source === query.source);
  if (query.salary) jobs = jobs.filter((j) => !!j.salary);
  if (query.fourDay) jobs = jobs.filter((j) => isFourDaySchedule(`${j.title} ${j.tags.join(' ')} ${j.description ?? ''}`));

  if (query.sort === 'salary') {
    jobs.sort((a, b) => salarySortValue(b) - salarySortValue(a));
  } else {
    const time = (j: Job) => {
      const t = new Date(j.postedAt).getTime();
      return Number.isNaN(t) ? 0 : t;
    };
    jobs.sort((a, b) => time(b) - time(a));
  }

  const total = jobs.length;
  const totalPages = Math.max(1, Math.ceil(total / JOBS_PER_PAGE));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * JOBS_PER_PAGE;
  return { jobs: jobs.slice(start, start + JOBS_PER_PAGE), total, page, totalPages };
}

export async function getJobs(query: JobsQuery, env: JobsEnv = readJobsEnv()): Promise<JobsResponse> {
  const now = Date.now();
  const plans = planSources(query, env);
  const loaded = await Promise.all(plans.map((plan) => loadSource(plan, now)));

  const includeInternal = env.enableDemoJobs && (query.source === 'all' || query.source === 'globalcv');
  const all: Job[] = [...(includeInternal ? DEMO_JOBS : []), ...loaded.flatMap((l) => l.jobs)];
  const result = filterSortPaginate(all, query);
  const sources = loaded.map((l) => l.status);
  return { ...result, sources, degraded: sources.some((s) => !s.ok) };
}
