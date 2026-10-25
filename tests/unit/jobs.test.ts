import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterSortPaginate,
  getJobs,
  JobsEnv,
  MAX_QUERY_LENGTH,
  parseJobsQuery,
  planSources,
  readJobsEnv,
  resetJobsCacheForTests,
} from '@/lib/jobs/aggregate';
import { normalizeLogoUrl, parseSalaryMin } from '@/lib/jobs/sources';
import { createRateLimiter, clientKey } from '@/lib/jobs/rateLimit';
import type { Job } from '@/lib/jobs/types';

const realFetch = globalThis.fetch;
let calls: string[] = [];

const ENV: JobsEnv = { safeMode: true, enableArbeitnow: false, enable4DayWeek: false, enableTheMuse: false, enableDemoJobs: false };

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    return handler(url);
  }) as typeof fetch;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function upstream(url: string): Response {
  if (url.includes('remotive.com')) {
    return json({ jobs: [
      { id: 1, title: 'React Developer', company_name: 'Acme', url: 'https://remotive.com/job/1', candidate_required_location: 'Worldwide', category: 'software-dev', job_type: 'full_time', tags: ['react'], publication_date: '2026-10-01', salary: '$90k - $100k' },
      { id: 2, title: 'Evil', company_name: 'Bad', url: 'javascript:alert(1)', candidate_required_location: 'USA', category: 'software-dev', publication_date: '2026-10-02' },
    ] });
  }
  if (url.includes('jobicy.com')) {
    return json({ jobs: [{ id: 7, jobTitle: 'Data Engineer', companyName: 'Jobi', url: 'https://jobicy.com/jobs/7', jobGeo: 'Europe', jobIndustry: ['data'], jobType: ['full-time'], annualSalaryMin: 120000, annualSalaryMax: 140000, pubDate: '2026-09-30' }] });
  }
  if (url.includes('remoteok.com')) return json({ error: 'down' }, 503);
  if (url.includes('himalayas.app')) {
    return json({ jobs: [{ title: 'Product Manager', companyName: 'Hima', applicationLink: 'https://himalayas.app/jobs/pm', minSalary: 150000, maxSalary: 170000, currency: 'USD', pubDate: 1790000000, companyLogo: 'https://evil.example/logo.png' }] });
  }
  return json({}, 404);
}

describe('jobs API: input validation', () => {
  it('accepts defaults and bounded values', () => {
    const r = parseJobsQuery(new URLSearchParams('q=React&page=2&region=eu&sort=salary'));
    assert.ok(r.ok);
    assert.equal(r.ok && r.query.q, 'react');
    assert.equal(r.ok && r.query.page, 2);
  });
  it('rejects unknown enums, bad pages and over-long queries', () => {
    assert.equal(parseJobsQuery(new URLSearchParams('page=abc')).ok, false);
    assert.equal(parseJobsQuery(new URLSearchParams('page=-1')).ok, false);
    assert.equal(parseJobsQuery(new URLSearchParams('category=__proto__')).ok, false);
    assert.equal(parseJobsQuery(new URLSearchParams('source=evil')).ok, false);
    assert.equal(parseJobsQuery(new URLSearchParams('sort=random')).ok, false);
    assert.equal(parseJobsQuery(new URLSearchParams(`q=${'x'.repeat(MAX_QUERY_LENGTH + 1)}`)).ok, false);
  });
  it('clamps very large pages', () => {
    const r = parseJobsQuery(new URLSearchParams('page=9999'));
    assert.ok(r.ok && r.query.page <= 200);
  });
});

describe('jobs API: aggregation', () => {
  beforeEach(() => {
    calls = [];
    resetJobsCacheForTests();
    mockFetch(upstream);
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('upstream requests never depend on the free-text query (no fan-out amplification)', async () => {
    const base = parseJobsQuery(new URLSearchParams(''));
    const planned = planSources(base.ok ? base.query : (null as never), ENV).map((p) => p.key);
    for (const q of ['react', 'python', 'a'.repeat(50), '"; DROP TABLE']) {
      const r = parseJobsQuery(new URLSearchParams({ q }));
      assert.ok(r.ok);
      assert.deepEqual(planSources(r.ok ? r.query : (null as never), ENV).map((p) => p.key), planned);
    }
  });

  it('caches per source: many distinct searches cause one upstream load per source', async () => {
    for (const q of ['react', 'data', 'product', 'zzz', 'acme']) {
      const r = parseJobsQuery(new URLSearchParams({ q }));
      assert.ok(r.ok);
      await getJobs(r.ok ? r.query : (null as never), ENV);
    }
    const remotiveCalls = calls.filter((u) => u.includes('remotive.com')).length;
    assert.equal(remotiveCalls, 1);
    assert.ok(calls.every((u) => !u.includes('q=') && !u.includes('search=')), 'search text is never sent upstream');
  });

  it('isolates failing providers and reports them', async () => {
    const r = parseJobsQuery(new URLSearchParams(''));
    const res = await getJobs(r.ok ? r.query : (null as never), ENV);
    assert.equal(res.degraded, true);
    const remoteok = res.sources.find((s) => s.id === 'remoteok');
    assert.equal(remoteok?.ok, false);
    assert.ok(res.sources.find((s) => s.id === 'remotive')?.ok);
    assert.ok(res.total >= 3);
  });

  it('drops listings with unsafe URLs and logos from non-allowed hosts', async () => {
    const r = parseJobsQuery(new URLSearchParams(''));
    const res = await getJobs(r.ok ? r.query : (null as never), ENV);
    assert.ok(!res.jobs.some((j) => j.title === 'Evil'));
    const hima = res.jobs.find((j) => j.company === 'Hima');
    assert.equal(hima?.companyLogo, undefined);
    assert.ok(res.jobs.every((j) => /^https:\/\//.test(j.url)));
  });

  it('sorts by salary numerically across formats', async () => {
    const r = parseJobsQuery(new URLSearchParams('sort=salary'));
    const res = await getJobs(r.ok ? r.query : (null as never), ENV);
    const order = res.jobs.map((j) => j.company);
    assert.ok(order.indexOf('Hima') < order.indexOf('Jobi'));
    assert.ok(order.indexOf('Jobi') < order.indexOf('Acme'));
  });

  it('does not serve demo jobs in production', () => {
    assert.equal(readJobsEnv({ NODE_ENV: 'production' }).enableDemoJobs, false);
    assert.equal(readJobsEnv({ NODE_ENV: 'production', ENABLE_DEMO_JOBS: 'true' }).enableDemoJobs, true);
    assert.equal(readJobsEnv({ NODE_ENV: 'development' }).enableDemoJobs, true);
  });

  it('respects safe mode for optional sources', () => {
    const r = parseJobsQuery(new URLSearchParams(''));
    const ids = (env: JobsEnv) => planSources(r.ok ? r.query : (null as never), env).map((p) => p.id);
    assert.ok(!ids(ENV).includes('arbeitnow'));
    assert.ok(!ids({ ...ENV, enable4DayWeek: true }).includes('4dayweek'));
    assert.ok(ids({ ...ENV, safeMode: false, enable4DayWeek: true }).includes('4dayweek'));
  });
});

describe('jobs API: helpers', () => {
  it('clamps pagination to the last page', () => {
    const jobs: Job[] = Array.from({ length: 25 }, (_, i) => ({
      id: String(i), title: `T${i}`, company: 'C', location: '', region: 'worldwide', category: 'other', jobType: 'full-time',
      tags: [], url: 'https://example.com', postedAt: '2026-01-01', source: 'remotive',
    }));
    const res = filterSortPaginate(jobs, { q: '', category: 'all', region: 'all', jobType: 'all', source: 'all', salary: false, fourDay: false, sort: 'newest', page: 50 });
    assert.equal(res.page, 2);
    assert.equal(res.jobs.length, 5);
  });

  it('parses salary text', () => {
    assert.equal(parseSalaryMin('$120,000 - $150,000'), 120000);
    assert.equal(parseSalaryMin('$90k–$100k/yr'), 90000);
    assert.equal(parseSalaryMin('€70k–€90k/yr'), 70000);
    assert.equal(parseSalaryMin('Competitive'), undefined);
  });

  it('normalises logo URLs', () => {
    assert.equal(normalizeLogoUrl('//remotive.com/logo.png', 'remotive'), 'https://remotive.com/logo.png');
    assert.equal(normalizeLogoUrl('/logo.png', 'remotive'), 'https://remotive.com/logo.png');
    assert.equal(normalizeLogoUrl('http://cdn.remoteok.com/x.png', 'remoteok'), 'https://cdn.remoteok.com/x.png');
    assert.equal(normalizeLogoUrl('javascript:alert(1)', 'remotive'), undefined);
    assert.equal(normalizeLogoUrl('https://tracker.example/pixel.gif', 'remotive'), undefined);
  });

  it('rate limiter blocks after the limit and recovers after the window', () => {
    const limit = createRateLimiter({ limit: 3, windowMs: 1000, maxKeys: 2 });
    assert.ok(limit('a', 0).allowed);
    assert.ok(limit('a', 1).allowed);
    assert.ok(limit('a', 2).allowed);
    const blocked = limit('a', 3);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds >= 1);
    assert.ok(limit('a', 1001).allowed);
    // Bounded memory: extra keys evict old ones instead of growing.
    limit('b', 1001);
    limit('c', 1001);
    assert.ok(limit('d', 1001).allowed);
  });

  it('derives the client key from forwarding headers', () => {
    assert.equal(clientKey(new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' })), '203.0.113.5');
    assert.equal(clientKey(new Headers()), 'unknown');
  });
});
