import { NextRequest, NextResponse } from 'next/server';
import { Job } from '@/lib/jobs/types';
import { INTERNAL_JOBS } from '@/lib/jobs/internal';

const JOBS_PER_PAGE = 20;
const FETCH_TIMEOUT = 8000;
const JOBS_SAFE_MODE = process.env.JOBS_SAFE_MODE !== 'false';
const ENABLE_4DAYWEEK_SOURCE = process.env.ENABLE_4DAYWEEK_SOURCE === 'true';
const ENABLE_THEMUSE_SOURCE = process.env.ENABLE_THEMUSE_SOURCE === 'true';
const ENABLE_ARBEITNOW_SOURCE = process.env.ENABLE_ARBEITNOW_SOURCE === 'true';
const LOGO_BASE_URL: Record<Job['source'], string> = {
  globalcv: 'https://globalcv.example',
  remotive: 'https://remotive.com',
  arbeitnow: 'https://www.arbeitnow.com',
  jobicy: 'https://jobicy.com',
  remoteok: 'https://remoteok.com',
  '4dayweek': 'https://4dayweek.io',
  himalayas: 'https://himalayas.app',
  'himalayas-emea': 'https://himalayas.app',
  'themuse-emea': 'https://www.themuse.com',
};
const LATAM_COUNTRIES = ['Brazil', 'Mexico', 'Argentina', 'Colombia', 'Chile', 'Peru'] as const;
const EMEA_COUNTRIES = [
  'United Kingdom',
  'Germany',
  'France',
  'Spain',
  'Portugal',
  'Netherlands',
  'Poland',
  'United Arab Emirates',
  'Saudi Arabia',
  'South Africa',
] as const;

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

function normalizeLogoUrl(raw: unknown, source: Job['source']): string | undefined {
  if (typeof raw !== 'string') return undefined;

  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('data:image/')) return trimmed;

  const base = LOGO_BASE_URL[source];

  try {
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('/')) return new URL(trimmed, base).toString();

    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
      return parsed.toString();
    }
    if (parsed.protocol === 'https:') return parsed.toString();
    return undefined;
  } catch {
    try {
      const parsed = new URL(trimmed, base);
      if (parsed.protocol === 'http:') parsed.protocol = 'https:';
      return parsed.protocol === 'https:' ? parsed.toString() : undefined;
    } catch {
      return undefined;
    }
  }
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractXmlTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return match?.[1]?.trim() ?? '';
}

function humanizeSlug(slug: string): string {
  const upper = new Set(['uk', 'usa', 'eu', 'ai', 'hr', 'qa', 'cto', 'cfo', 'coo', 'ceo']);
  return slug
    .split('-')
    .filter(Boolean)
    .map((p) => {
      const low = p.toLowerCase();
      if (upper.has(low)) return low.toUpperCase();
      return low.charAt(0).toUpperCase() + low.slice(1);
    })
    .join(' ');
}

function extractCompanyFrom4DayWeekUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const slug = pathname.split('/').filter(Boolean).pop() ?? '';
    const match = slug.match(/-[A-Za-z0-9]{5}-([a-z0-9-]+)$/i) || slug.match(/-([a-z0-9-]+)$/i);
    if (!match?.[1]) return '4 Day Week';
    return humanizeSlug(match[1]);
  } catch {
    return '4 Day Week';
  }
}

function inferJobTypeFromText(text: string): string {
  const h = text.toLowerCase();
  if (h.includes('part-time') || h.includes('part time')) return 'part-time';
  if (h.includes('contract')) return 'contract';
  if (h.includes('freelance')) return 'freelance';
  if (h.includes('intern')) return 'internship';
  return 'full-time';
}

function toIsoDateOrNow(raw: string): string {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function formatSalaryRange(min?: number | null, max?: number | null, currency = 'USD'): string | undefined {
  if (!min && !max) return undefined;

  const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
  if (min && max) return `${fmt.format(min)} - ${fmt.format(max)}`;
  if (min) return `${fmt.format(min)}+`;
  return max ? `Up to ${fmt.format(max)}` : undefined;
}

interface HimalayasApiJob {
  title?: string;
  excerpt?: string;
  companyName?: string;
  companyLogo?: string;
  employmentType?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  currency?: string;
  locationRestrictions?: string[];
  categories?: string[];
  parentCategories?: string[];
  description?: string;
  pubDate?: number;
  applicationLink?: string;
  guid?: string;
}

interface HimalayasApiResponse {
  jobs?: HimalayasApiJob[];
}

interface TheMuseLocation {
  name?: string;
}

interface TheMuseLevel {
  name?: string;
}

interface TheMuseRefs {
  landing_page?: string;
}

interface TheMuseCompany {
  name?: string;
}

interface TheMuseJob {
  id?: number;
  name?: string;
  publication_date?: string;
  locations?: TheMuseLocation[];
  levels?: TheMuseLevel[];
  refs?: TheMuseRefs;
  company?: TheMuseCompany;
  contents?: string;
}

interface TheMuseApiResponse {
  results?: TheMuseJob[];
}

function isFourDaySchedule(text: string): boolean {
  const h = text.toLowerCase();
  if (h.includes('4.5 day') || h.includes('5 day') || h.includes('9 day')) return false;
  return (
    /\b4\s*day(\s*week|\s*work\s*week|\s*workweek|\s*job)?\b/.test(h) ||
    /\bfour[-\s]?day(\s*week|\s*work\s*week|\s*workweek)?\b/.test(h) ||
    /\b4\s*x\s*8\s*hr\b/.test(h) ||
    /\b32\s*h(ours?)?\b/.test(h) ||
    /\bcompressed\s+week\b/.test(h)
  );
}

function isEmeaLocationText(location: string): boolean {
  const l = location.toLowerCase();
  if (!l) return false;
  if (inferRegion(l) === 'eu' || inferRegion(l) === 'uk') return true;

  return [
    'emea', 'middle east', 'africa',
    'uae', 'united arab emirates', 'dubai', 'abu dhabi',
    'saudi', 'riyadh', 'qatar', 'doha', 'oman', 'bahrain', 'kuwait',
    'egypt', 'cairo', 'morocco', 'casablanca',
    'south africa', 'cape town', 'johannesburg',
    'nigeria', 'lagos', 'kenya', 'nairobi',
  ].some((k) => l.includes(k));
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
      companyLogo: normalizeLogoUrl(j.company_logo_url || j.company_logo, 'remotive'),
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
        companyLogo: normalizeLogoUrl(j.company_logo || j.logo, 'arbeitnow'),
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
        companyLogo: normalizeLogoUrl(j.companyLogo || j.logo, 'jobicy'),
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
        companyLogo: normalizeLogoUrl(j.company_logo || j.logo, 'remoteok'),
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

async function fetch4DayWeek(): Promise<Job[]> {
  try {
    const res = await fetchWithTimeout('https://4dayweek.io/rss', {
      next: { revalidate: 300 },
    } as RequestInit);
    if (!res.ok) return [];
    const xml = await res.text();

    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    return items.slice(0, 120).map((item, idx): Job | null => {
      const rawTitle = decodeXmlEntities(extractXmlTag(item, 'title'));
      const url = decodeXmlEntities(extractXmlTag(item, 'link')) || decodeXmlEntities(extractXmlTag(item, 'guid'));
      if (!rawTitle || !url) return null;

      const [jobTitlePart = rawTitle, schedulePart = '', locationPart = 'Remote'] = rawTitle
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);

      const location = locationPart || 'Remote';
      const schedule = schedulePart || 'Reduced hours';
      const company = extractCompanyFrom4DayWeekUrl(url);
      const plainDescription = stripHtml(decodeXmlEntities(extractXmlTag(item, 'description')));
      const tags = [schedule, '4 Day Week'].filter(Boolean).slice(0, 6);
      const isFourDay = isFourDaySchedule(`${rawTitle} ${plainDescription}`);

      // Keep the board mostly remote as intended by this page.
      const maybeRemote = /\/remote-job\//.test(url) || location.toLowerCase().includes('remote');
      if (!maybeRemote || !isFourDay) return null;

      return {
        id: `4dayweek-${idx}-${jobTitlePart.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)}`,
        title: jobTitlePart,
        company,
        companyLogo: undefined,
        location,
        region: inferRegion(location),
        category: inferCategory(jobTitlePart, tags),
        jobType: inferJobTypeFromText(`${jobTitlePart} ${schedule} ${plainDescription}`),
        tags,
        salary: undefined,
        url,
        postedAt: toIsoDateOrNow(decodeXmlEntities(extractXmlTag(item, 'pubDate'))),
        source: '4dayweek',
        description: plainDescription || undefined,
      };
    }).filter((job): job is Job => !!job);
  } catch {
    return [];
  }
}

async function fetchHimalayasLatam(search: string): Promise<Job[]> {
  try {
    const requests = LATAM_COUNTRIES.map(async (country) => {
      const params = new URLSearchParams({
        country,
        sort: 'recent',
        page: '1',
      });
      if (search) params.set('q', search);

      const res = await fetchWithTimeout(`https://himalayas.app/jobs/api/search?${params}`, {
        next: { revalidate: 300 },
      } as RequestInit);
      if (!res.ok) return [] as Job[];

      const data = await res.json() as HimalayasApiResponse;
      return (data.jobs ?? []).map((j): Job => {
        const restrictions = Array.isArray(j.locationRestrictions) ? j.locationRestrictions : [];
        const location = restrictions.length > 0
          ? `Remote (${restrictions.slice(0, 2).join(', ')}${restrictions.length > 2 ? ' + more' : ''})`
          : 'Remote, Worldwide';
        const tags = [
          ...(j.categories ?? []).map((t) => t.replace(/-/g, ' ')),
          ...(j.parentCategories ?? []).map((t) => t.replace(/-/g, ' ')),
        ].slice(0, 6);
        const description = j.excerpt || (j.description ? stripHtml(j.description) : undefined);

        return {
          id: `himalayas-${j.guid ?? `${j.companyName ?? 'company'}-${j.title ?? 'job'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          title: j.title ?? '',
          company: j.companyName ?? '',
          companyLogo: normalizeLogoUrl(j.companyLogo, 'himalayas'),
          location,
          region: inferRegion(restrictions.join(', ') || location),
          category: inferCategory(j.title ?? '', tags),
          jobType: normalizeJobType(j.employmentType),
          tags,
          salary: formatSalaryRange(j.minSalary, j.maxSalary, j.currency ?? 'USD'),
          url: j.applicationLink || j.guid || '',
          postedAt: typeof j.pubDate === 'number'
            ? new Date(j.pubDate * 1000).toISOString()
            : new Date().toISOString(),
          source: 'himalayas',
          description,
        };
      });
    });

    const all = await Promise.all(requests);
    return all.flat();
  } catch {
    return [];
  }
}

async function fetchHimalayasEmea(search: string): Promise<Job[]> {
  try {
    const requests = EMEA_COUNTRIES.map(async (country) => {
      const params = new URLSearchParams({
        country,
        sort: 'recent',
        page: '1',
      });
      if (search) params.set('q', search);

      const res = await fetchWithTimeout(`https://himalayas.app/jobs/api/search?${params}`, {
        next: { revalidate: 300 },
      } as RequestInit);
      if (!res.ok) return [] as Job[];

      const data = await res.json() as HimalayasApiResponse;
      return (data.jobs ?? []).map((j): Job => {
        const restrictions = Array.isArray(j.locationRestrictions) ? j.locationRestrictions : [];
        const location = restrictions.length > 0
          ? `Remote (${restrictions.slice(0, 2).join(', ')}${restrictions.length > 2 ? ' + more' : ''})`
          : 'Remote, EMEA';
        const tags = [
          ...(j.categories ?? []).map((t) => t.replace(/-/g, ' ')),
          ...(j.parentCategories ?? []).map((t) => t.replace(/-/g, ' ')),
        ].slice(0, 6);
        const description = j.excerpt || (j.description ? stripHtml(j.description) : undefined);

        return {
          id: `himalayas-emea-${j.guid ?? `${j.companyName ?? 'company'}-${j.title ?? 'job'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          title: j.title ?? '',
          company: j.companyName ?? '',
          companyLogo: normalizeLogoUrl(j.companyLogo, 'himalayas-emea'),
          location,
          region: inferRegion(restrictions.join(', ') || location),
          category: inferCategory(j.title ?? '', tags),
          jobType: normalizeJobType(j.employmentType),
          tags,
          salary: formatSalaryRange(j.minSalary, j.maxSalary, j.currency ?? 'USD'),
          url: j.applicationLink || j.guid || '',
          postedAt: typeof j.pubDate === 'number'
            ? new Date(j.pubDate * 1000).toISOString()
            : new Date().toISOString(),
          source: 'himalayas-emea',
          description,
        };
      });
    });

    const all = await Promise.all(requests);
    return all.flat();
  } catch {
    return [];
  }
}

async function fetchTheMuseEmea(): Promise<Job[]> {
  try {
    const pages = [1, 2, 3];
    const reqs = pages.map(async (page) => {
      const res = await fetchWithTimeout(`https://www.themuse.com/api/public/jobs?page=${page}`, {
        next: { revalidate: 300 },
      } as RequestInit);
      if (!res.ok) return [] as Job[];

      const data = await res.json() as TheMuseApiResponse;
      return (data.results ?? []).map((j): Job | null => {
        const locations = (j.locations ?? [])
          .map((loc) => (loc.name ?? '').trim())
          .filter(Boolean);
        const locationText = locations.join(', ');
        if (!isEmeaLocationText(locationText)) return null;

        const levelTags = (j.levels ?? [])
          .map((lvl) => (lvl.name ?? '').trim())
          .filter(Boolean);
        const tags = [...levelTags, 'The Muse', 'EMEA'].slice(0, 6);

        return {
          id: `themuse-emea-${j.id ?? `${j.company?.name ?? 'company'}-${j.name ?? 'job'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          title: j.name ?? '',
          company: j.company?.name ?? '',
          companyLogo: undefined,
          location: locationText || 'EMEA',
          region: inferRegion(locationText || 'EMEA'),
          category: inferCategory(j.name ?? '', tags),
          jobType: 'full-time',
          tags,
          salary: undefined,
          url: j.refs?.landing_page ?? '',
          postedAt: toIsoDateOrNow(j.publication_date ?? ''),
          source: 'themuse-emea',
          description: j.contents ? stripHtml(j.contents) : undefined,
        };
      }).filter((job): job is Job => !!job);
    });

    const all = await Promise.all(reqs);
    return all.flat();
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
  const fourDay  = sp.get('fourDay')  === 'true'; // only 4-day-week style roles
  const sort     = sp.get('sort')     ?? 'newest'; // newest | salary
  const page     = Math.max(1, parseInt(sp.get('page') ?? '1', 10));

  const includeRemotive = source === 'all' || source === 'remotive';
  const includeInternal = source === 'all' || source === 'globalcv';
  const includeRemoteOk = source === 'all' || source === 'remoteok';
  const includeJobicy = source === 'all' || source === 'jobicy';
  const includeArbeitnow =
    (source === 'all' || source === 'arbeitnow') &&
    (!JOBS_SAFE_MODE || ENABLE_ARBEITNOW_SOURCE);
  const includeHimalayas = source === 'himalayas' || (source === 'all' && (region === 'all' || region === 'latam'));
  const includeHimalayasEmea = source === 'himalayas-emea' || (source === 'all' && (region === 'all' || region === 'eu' || region === 'uk'));
  const includeFourDayWeek =
    ENABLE_4DAYWEEK_SOURCE &&
    (!JOBS_SAFE_MODE) &&
    (source === 'all' || source === '4dayweek');
  const includeTheMuseEmea =
    ENABLE_THEMUSE_SOURCE &&
    (!JOBS_SAFE_MODE) &&
    (source === 'themuse-emea' || (source === 'all' && (region === 'all' || region === 'eu' || region === 'uk')));

  const [internal, remotive, arbeitnow, jobicy, remoteok, fourDayWeek, himalayas, himalayasEmea, theMuseEmea] = await Promise.all([
    includeInternal ? Promise.resolve(INTERNAL_JOBS) : Promise.resolve([]),
    includeRemotive ? fetchRemotive(category, q) : Promise.resolve([]),
    includeArbeitnow ? fetchArbeitnow() : Promise.resolve([]),
    includeJobicy ? fetchJobicy(category) : Promise.resolve([]),
    includeRemoteOk ? fetchRemoteOK() : Promise.resolve([]),
    includeFourDayWeek ? fetch4DayWeek() : Promise.resolve([]),
    includeHimalayas ? fetchHimalayasLatam(q) : Promise.resolve([]),
    includeHimalayasEmea ? fetchHimalayasEmea(q) : Promise.resolve([]),
    includeTheMuseEmea ? fetchTheMuseEmea() : Promise.resolve([]),
  ]);

  let jobs: Job[] = [
    ...internal,
    ...remotive,
    ...arbeitnow,
    ...jobicy,
    ...remoteok,
    ...fourDayWeek,
    ...himalayas,
    ...himalayasEmea,
    ...theMuseEmea,
  ];

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

  // 4-day-week filter
  if (fourDay) {
    jobs = jobs.filter((j) => isFourDaySchedule(`${j.title} ${j.tags.join(' ')} ${j.description ?? ''}`));
  }

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
