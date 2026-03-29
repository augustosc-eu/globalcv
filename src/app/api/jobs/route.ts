import { NextRequest, NextResponse } from 'next/server';
import { Job } from '@/lib/jobs/types';

const JOBS_PER_PAGE = 20;
const FETCH_TIMEOUT = 8000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripHtml(html: string, maxLen = 500): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(p|li|div|h[1-6])[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxLen);
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Category inference ────────────────────────────────────────────────────────

const DEV_KW     = ['react', 'node', 'python', 'javascript', 'typescript', 'java', 'golang', 'ruby', 'php', 'ios', 'android', 'fullstack', 'backend', 'frontend', 'mobile', 'engineer', 'developer', 'software', 'rails', 'django', 'laravel', 'kotlin', 'swift', 'rust', 'scala', '.net', 'c++', 'c#'];
const DEVOPS_KW  = ['devops', 'aws', 'gcp', 'azure', 'kubernetes', 'docker', 'infrastructure', 'sre', 'ops', 'cloud', 'terraform', 'ci/cd', 'platform engineer', 'reliability'];
const DESIGN_KW  = ['design', 'ux', 'ui', 'figma', 'sketch', 'creative', 'brand', 'graphic', 'visual', 'illustrator', 'motion'];
const DATA_KW    = ['data', 'analytics', 'ml ', 'ai ', 'machine learning', 'data science', 'sql', 'spark', 'tableau', 'bi ', 'data engineer', 'scientist', 'llm', 'nlp'];
const MKTG_KW    = ['marketing', 'seo', 'growth', 'social media', 'email marketing', 'ads', 'paid media', 'ppc', 'campaign', 'demand gen'];
const SUPPORT_KW = ['support', 'customer success', 'customer service', 'helpdesk', 'success manager', 'technical support'];
const SALES_KW   = ['sales', 'account executive', 'business development', 'revenue', 'bdr', 'sdr', 'partnerships', 'account manager'];
const WRITING_KW = ['writing', 'writer', 'copywriter', 'editor', 'journalist', 'technical writer', 'documentation', 'content strategist'];
const FINANCE_KW = ['finance', 'accounting', 'bookkeeper', 'controller', 'cfo', 'financial', 'payroll', 'tax', 'audit'];
const HR_KW      = ['hr ', 'recruiter', 'human resources', 'talent', 'people ops', 'hiring manager', 'hrbp'];
const PRODUCT_KW = ['product manager', 'product owner', 'pm ', 'roadmap', 'product strategy', 'head of product'];

function inferCategory(title: string, tags: string[]): string {
  const h = [title, ...tags].join(' ').toLowerCase();
  if (DEVOPS_KW.some(k => h.includes(k)))  return 'devops';
  if (DATA_KW.some(k => h.includes(k)))    return 'data';
  if (DESIGN_KW.some(k => h.includes(k)))  return 'design';
  if (MKTG_KW.some(k => h.includes(k)))    return 'marketing';
  if (SUPPORT_KW.some(k => h.includes(k))) return 'customer-support';
  if (SALES_KW.some(k => h.includes(k)))   return 'sales';
  if (WRITING_KW.some(k => h.includes(k))) return 'writing';
  if (FINANCE_KW.some(k => h.includes(k))) return 'finance';
  if (HR_KW.some(k => h.includes(k)))      return 'hr';
  if (PRODUCT_KW.some(k => h.includes(k))) return 'product';
  if (DEV_KW.some(k => h.includes(k)))     return 'software-dev';
  return 'other';
}

// ── Region inference ──────────────────────────────────────────────────────────

function inferRegion(location: string): string {
  const l = location.toLowerCase();
  if (!l || l === 'remote' || l === 'anywhere' || l.includes('worldwide') || l.includes('global') || l.includes('anywhere')) return 'worldwide';
  if (l.includes('united states') || l.includes('usa') || l === 'us' || l.includes(' us,') || l.startsWith('us ') || l.includes('north america')) return 'us';
  if (l.includes('united kingdom') || l === 'uk' || l.includes(' uk,') || l.includes('england') || l.includes('london')) return 'uk';
  if (l.includes('canada') || l === 'ca' || l.includes(' ca,')) return 'ca';
  if (l.includes('australia') || l.includes('new zealand') || l === 'au') return 'au';
  if (l.includes('latin america') || l.includes('latam') || l.includes('brazil') || l.includes('brasil') || l.includes('mexico') || l.includes('argentina') || l.includes('colombia') || l.includes('chile')) return 'latam';
  if (l.includes('asia') || l.includes('apac') || l.includes('india') || l.includes('japan') || l.includes('singapore') || l.includes('philippines') || l.includes('vietnam') || l.includes('china')) return 'apac';
  if (l.includes('europe') || l.includes('eu ') || l === 'eu' || l.includes('germany') || l.includes('france') || l.includes('spain') || l.includes('italy') || l.includes('netherlands') || l.includes('poland') || l.includes('portugal') || l.includes('sweden') || l.includes('denmark') || l.includes('norway') || l.includes('finland')) return 'eu';
  // if it contains only US/CA-only patterns like "US, Canada" it's us
  if (l.match(/\bus\b/) || l.includes('u.s.')) return 'us';
  return 'worldwide';
}

// ── Job type normalization ────────────────────────────────────────────────────

function normalizeJobType(raw: string | string[] | undefined): string {
  const val = Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
  const v = val.toLowerCase().replace(/[_\s-]+/g, '-');
  if (v.includes('full')) return 'full-time';
  if (v.includes('part')) return 'part-time';
  if (v.includes('contract')) return 'contract';
  if (v.includes('freelance')) return 'freelance';
  if (v.includes('intern')) return 'internship';
  return 'full-time'; // safe default for remote job boards
}

// ── Category mapping (Remotive native → unified) ──────────────────────────────

function mapToRemotiveCategory(cat: string): string {
  const m: Record<string, string> = {
    'software-dev': 'software-dev', 'devops': 'devops-sysadmin',
    'design': 'design', 'marketing': 'marketing',
    'customer-support': 'customer-support', 'sales': 'sales',
    'product': 'product', 'data': 'data', 'finance': 'finance-legal',
    'hr': 'human-resources', 'writing': 'writing',
  };
  return m[cat] || '';
}

function mapFromRemotiveCategory(cat: string): string {
  const m: Record<string, string> = {
    'software-dev': 'software-dev', 'devops-sysadmin': 'devops',
    'design': 'design', 'marketing': 'marketing',
    'customer-support': 'customer-support', 'sales': 'sales',
    'product': 'product', 'data': 'data', 'finance-legal': 'finance',
    'human-resources': 'hr', 'writing': 'writing', 'qa': 'other',
    'business-exec-management': 'other', 'all-other': 'other',
  };
  return m[cat] || 'other';
}

function mapFromJobicyIndustries(industries: string | string[]): string {
  const raw = (Array.isArray(industries) ? industries[0] : industries ?? '').toLowerCase();
  if (raw.includes('engineer') || raw.includes('software') || raw.includes('develop')) return 'software-dev';
  if (raw.includes('devops') || raw.includes('infra') || raw.includes('cloud') || raw.includes('sre')) return 'devops';
  if (raw.includes('design')) return 'design';
  if (raw.includes('marketing')) return 'marketing';
  if (raw.includes('support') || raw.includes('customer')) return 'customer-support';
  if (raw.includes('sales')) return 'sales';
  if (raw.includes('data') || raw.includes('analytic')) return 'data';
  if (raw.includes('finance') || raw.includes('account')) return 'finance';
  if (raw.includes('hr') || raw.includes('human')) return 'hr';
  if (raw.includes('writing') || raw.includes('content')) return 'writing';
  if (raw.includes('product')) return 'product';
  return 'other';
}

// ─── Source fetchers ──────────────────────────────────────────────────────────

async function fetchRemotive(category: string, search: string): Promise<Job[]> {
  try {
    const params = new URLSearchParams({ limit: '100' });
    if (category !== 'all') {
      const mapped = mapToRemotiveCategory(category);
      if (mapped) params.set('category', mapped);
    }
    if (search) params.set('search', search);

    const res = await fetchWithTimeout(
      `https://remotive.com/api/remote-jobs?${params}`,
      { next: { revalidate: 300 } } as RequestInit,
    );
    if (!res.ok) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const location = (j: any) => j.candidate_required_location || 'Remote';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.jobs ?? []).map((j: any): Job => ({
      id: `remotive-${j.id}`,
      title: j.title ?? '',
      company: j.company_name ?? '',
      companyLogo: j.company_logo_url || j.company_logo || undefined,
      location: location(j),
      region: inferRegion(location(j)),
      category: mapFromRemotiveCategory(j.category ?? ''),
      jobType: normalizeJobType(j.job_type),
      tags: Array.isArray(j.tags) ? j.tags.slice(0, 6) : [],
      salary: j.salary || undefined,
      url: j.url ?? '',
      postedAt: j.publication_date ?? new Date().toISOString(),
      source: 'remotive',
      description: j.description ? stripHtml(j.description) : undefined,
    }));
  } catch {
    return [];
  }
}

async function fetchArbeitnow(): Promise<Job[]> {
  try {
    const res = await fetchWithTimeout(
      'https://www.arbeitnow.com/api/job-board-api',
      { next: { revalidate: 300 } } as RequestInit,
    );
    if (!res.ok) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.data ?? []).filter((j: any) => j.remote).map((j: any): Job => {
      const loc = j.location || 'Remote';
      return {
        id: `arbeitnow-${j.slug}`,
        title: j.title ?? '',
        company: j.company_name ?? '',
        companyLogo: undefined,
        location: loc,
        region: inferRegion(loc),
        category: inferCategory(j.title ?? '', j.tags ?? []),
        jobType: normalizeJobType(j.job_types?.[0]),
        tags: (j.tags ?? []).slice(0, 6),
        salary: undefined,
        url: j.url ?? '',
        postedAt: typeof j.created_at === 'number'
          ? new Date(j.created_at * 1000).toISOString()
          : new Date().toISOString(),
        source: 'arbeitnow',
        description: j.description ? stripHtml(j.description) : undefined,
      };
    });
  } catch {
    return [];
  }
}

async function fetchJobicy(category: string): Promise<Job[]> {
  try {
    const params = new URLSearchParams({ count: '50' });
    const industryMap: Record<string, string> = {
      'software-dev': 'engineering', 'devops': 'engineering', 'design': 'design',
      'marketing': 'marketing', 'customer-support': 'customer-support', 'sales': 'sales',
      'writing': 'writing-editing', 'finance': 'finance', 'hr': 'human-resources',
      'data': 'data-analytics', 'product': 'product',
    };
    if (category !== 'all' && industryMap[category]) params.set('industry', industryMap[category]);

    const res = await fetchWithTimeout(
      `https://jobicy.com/api/v2/remote-jobs?${params}`,
      { next: { revalidate: 300 } } as RequestInit,
    );
    if (!res.ok) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.jobs ?? []).map((j: any): Job => {
      const salaryMin = j.annualSalaryMin ? Math.round(j.annualSalaryMin / 1000) : null;
      const salaryMax = j.annualSalaryMax ? Math.round(j.annualSalaryMax / 1000) : null;
      const loc = j.jobGeo || 'Remote';
      return {
        id: `jobicy-${j.id}`,
        title: j.jobTitle ?? '',
        company: j.companyName ?? '',
        companyLogo: j.companyLogo || undefined,
        location: loc,
        region: inferRegion(loc),
        category: mapFromJobicyIndustries(j.jobIndustry ?? []),
        jobType: normalizeJobType(j.jobType),
        tags: (Array.isArray(j.jobType) ? j.jobType : j.jobType ? [j.jobType] : []).slice(0, 6),
        salary: salaryMin && salaryMax ? `$${salaryMin}k–$${salaryMax}k/yr` : undefined,
        url: j.url ?? '',
        postedAt: j.pubDate ?? new Date().toISOString(),
        source: 'jobicy',
        description: j.jobExcerpt ? stripHtml(j.jobExcerpt) : undefined,
      };
    });
  } catch {
    return [];
  }
}

async function fetchRemoteOK(): Promise<Job[]> {
  try {
    const res = await fetchWithTimeout('https://remoteok.com/api', {
      headers: { 'User-Agent': 'GlobalCV/1.0 (remote job aggregator)' },
      next: { revalidate: 300 },
    } as RequestInit);
    if (!res.ok) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (Array.isArray(data) ? data.slice(1) : []).filter((j: any) => j.id && j.position).map((j: any): Job => {
      const sMin = j.salary_min ? Math.round(j.salary_min / 1000) : null;
      const sMax = j.salary_max ? Math.round(j.salary_max / 1000) : null;
      const tags: string[] = Array.isArray(j.tags) ? j.tags.slice(0, 6) : [];
      const loc = j.location || 'Remote';
      return {
        id: `remoteok-${j.id}`,
        title: j.position ?? '',
        company: j.company ?? '',
        companyLogo: j.company_logo || j.logo || undefined,
        location: loc,
        region: inferRegion(loc),
        category: inferCategory(j.position ?? '', tags),
        jobType: inferJobTypeFromTags(tags),
        tags,
        salary: sMin && sMax ? `$${sMin}k–$${sMax}k/yr` : undefined,
        url: j.url ?? `https://remoteok.com/l/${j.id}`,
        postedAt: j.date ?? new Date().toISOString(),
        source: 'remoteok',
        description: j.description ? stripHtml(j.description) : undefined,
      };
    });
  } catch {
    return [];
  }
}

function inferJobTypeFromTags(tags: string[]): string {
  const h = tags.join(' ').toLowerCase();
  if (h.includes('part-time') || h.includes('part time')) return 'part-time';
  if (h.includes('contract')) return 'contract';
  if (h.includes('freelance')) return 'freelance';
  if (h.includes('intern')) return 'internship';
  return 'full-time';
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q        = sp.get('q')?.trim().toLowerCase() ?? '';
  const category = sp.get('category') ?? 'all';
  const region   = sp.get('region')   ?? 'all';
  const jobType  = sp.get('jobType')  ?? 'all';
  const source   = sp.get('source')   ?? 'all';
  const salary   = sp.get('salary')   === 'true'; // only jobs with salary info
  const sort     = sp.get('sort')     ?? 'newest'; // newest | salary
  const page     = Math.max(1, parseInt(sp.get('page') ?? '1', 10));

  const [remotive, arbeitnow, jobicy, remoteok] = await Promise.all([
    source === 'all' || source === 'remotive' ? fetchRemotive(category, q) : Promise.resolve([]),
    source === 'all' || source === 'arbeitnow' ? fetchArbeitnow() : Promise.resolve([]),
    source === 'all' || source === 'jobicy' ? fetchJobicy(category) : Promise.resolve([]),
    source === 'all' || source === 'remoteok' ? fetchRemoteOK() : Promise.resolve([]),
  ]);

  let jobs: Job[] = [...remotive, ...arbeitnow, ...jobicy, ...remoteok];

  // Deduplicate by title+company
  const seen = new Set<string>();
  jobs = jobs.filter(j => {
    const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Text search
  if (q) {
    jobs = jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.tags.some(t => t.toLowerCase().includes(q)),
    );
  }

  // Category
  if (category !== 'all') jobs = jobs.filter(j => j.category === category);

  // Region
  if (region !== 'all') jobs = jobs.filter(j => j.region === region);

  // Job type
  if (jobType !== 'all') jobs = jobs.filter(j => j.jobType === jobType);

  // Salary filter
  if (salary) jobs = jobs.filter(j => !!j.salary);

  // Sort
  if (sort === 'salary') {
    jobs.sort((a, b) => {
      const parseMin = (s?: string) => {
        const m = s?.match(/\$(\d+)k/);
        return m ? parseInt(m[1], 10) : 0;
      };
      return parseMin(b.salary) - parseMin(a.salary);
    });
  } else {
    jobs.sort((a, b) => {
      const ta = new Date(a.postedAt).getTime();
      const tb = new Date(b.postedAt).getTime();
      return isNaN(ta) || isNaN(tb) ? 0 : tb - ta;
    });
  }

  const total = jobs.length;
  const totalPages = Math.max(1, Math.ceil(total / JOBS_PER_PAGE));
  const start = (page - 1) * JOBS_PER_PAGE;

  return NextResponse.json({ jobs: jobs.slice(start, start + JOBS_PER_PAGE), total, page, totalPages });
}
