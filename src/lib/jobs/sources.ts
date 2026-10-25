import { Job } from '@/lib/jobs/types';
import { safeHttpUrl } from '@/lib/utils/safeUrl';
import logoHosts from '@/lib/jobs/logoHosts.json';

/*
 * Upstream job-board adapters. Each fetcher returns normalised Job objects and
 * THROWS on failure (the aggregator isolates failures per source).
 *
 * Upstream URLs never include the user's free-text search: results are
 * fetched once per source (and category where the provider supports it) and
 * filtered locally, so arbitrary queries cannot multiply upstream traffic.
 */

export const FETCH_TIMEOUT_MS = 6000;
const UPSTREAM_REVALIDATE_SECONDS = 300;
const LOGO_BASE_URL: Record<Job['source'], string> = {
  globalcv: 'https://globalcv.example',
  remotive: 'https://remotive.com',
  arbeitnow: 'https://www.arbeitnow.com',
  jobicy: 'https://jobicy.com',
  remoteok: 'https://remoteok.com',
  '4dayweek': 'https://4dayweek.io',
  himalayas: 'https://himalayas.app',
  'himalayas-jp': 'https://himalayas.app',
  'himalayas-emea': 'https://himalayas.app',
  'themuse-emea': 'https://www.themuse.com',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function stripHtml(html: string, maxLen = 500): string {
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
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      next: { revalidate: UPSTREAM_REVALIDATE_SECONDS },
    } as RequestInit);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

const ALLOWED_LOGO_HOSTS: readonly string[] = logoHosts;

/** True when the hostname is one of the CSP-allowed logo hosts (or a subdomain). */
export function isAllowedLogoHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_LOGO_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export function normalizeLogoUrl(raw: unknown, source: Job['source']): string | undefined {
  const url = resolveLogoUrl(raw, source);
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  try {
    return isAllowedLogoHost(new URL(url).hostname) ? url : undefined;
  } catch {
    return undefined;
  }
}

function resolveLogoUrl(raw: unknown, source: Job['source']): string | undefined {
  if (typeof raw !== 'string') return undefined;

  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('data:')) return safeHttpUrl(trimmed, { allowDataImage: true });

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

export function decodeXmlEntities(input: string): string {
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

export function formatSalaryRange(min?: number | null, max?: number | null, currency = 'USD'): string | undefined {
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

export function isFourDaySchedule(text: string): boolean {
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

export function inferCategory(title: string, tags: string[]): string {
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

export function inferRegion(location: string): string {
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

export function normalizeJobType(raw: string | string[] | undefined): string {
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

/** Parse the lowest annual amount from salary text like "$90k–$100k/yr", "$120,000 - $150,000", "€70k". */
export function parseSalaryMin(text?: string): number | undefined {
  if (!text) return undefined;
  const match = text.replace(/\s+/g, ' ').match(/(\d{1,3}(?:[.,]\d{3})+|\d+(?:\.\d+)?)\s*(k|K)?/);
  if (!match) return undefined;
  const value = Number(match[1].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return match[2] ? value * 1000 : value;
}

function cleanUrl(value: unknown): string {
  return safeHttpUrl(value) ?? '';
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function strArray(value: unknown, max = 6): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').slice(0, max) : [];
}

export async function fetchRemotive(category: string): Promise<Job[]> {
  const params = new URLSearchParams({ limit: '100' });
  if (category !== 'all') {
    const mapped = mapToRemotiveCategory(category);
    if (mapped) params.set('category', mapped);
  }
  const res = await fetchWithTimeout(`https://remotive.com/api/remote-jobs?${params}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Array.isArray(data?.jobs) ? data.jobs : []).map((j: any): Job => {
    const location = str(j.candidate_required_location) || 'Remote';
    const salary = str(j.salary) || undefined;
    return {
      id: `remotive-${str(j.id)}`,
      title: str(j.title),
      company: str(j.company_name),
      companyLogo: normalizeLogoUrl(j.company_logo_url || j.company_logo, 'remotive'),
      location,
      region: inferRegion(location),
      category: mapFromRemotiveCategory(str(j.category)),
      jobType: normalizeJobType(str(j.job_type)),
      tags: strArray(j.tags),
      salary,
      salaryMin: parseSalaryMin(salary),
      url: cleanUrl(j.url),
      postedAt: str(j.publication_date) || new Date().toISOString(),
      source: 'remotive',
      description: j.description ? stripHtml(str(j.description)) : undefined,
    };
  });
}

export async function fetchArbeitnow(): Promise<Job[]> {
  const res = await fetchWithTimeout('https://www.arbeitnow.com/api/job-board-api');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Array.isArray(data?.data) ? data.data : []).filter((j: any) => j.remote).map((j: any): Job => {
    const loc = str(j.location) || 'Remote';
    const tags = strArray(j.tags);
    return {
      id: `arbeitnow-${str(j.slug)}`,
      title: str(j.title),
      company: str(j.company_name),
      companyLogo: normalizeLogoUrl(j.company_logo || j.logo, 'arbeitnow'),
      location: loc,
      region: inferRegion(loc),
      category: inferCategory(str(j.title), tags),
      jobType: normalizeJobType(strArray(j.job_types)[0]),
      tags,
      salary: undefined,
      url: cleanUrl(j.url),
      postedAt: typeof j.created_at === 'number' ? new Date(j.created_at * 1000).toISOString() : new Date().toISOString(),
      source: 'arbeitnow',
      description: j.description ? stripHtml(str(j.description)) : undefined,
    };
  });
}

const JOBICY_INDUSTRY: Record<string, string> = {
  'software-dev': 'engineering', 'devops': 'engineering', 'design': 'design',
  'marketing': 'marketing', 'customer-support': 'customer-support', 'sales': 'sales',
  'writing': 'writing-editing', 'finance': 'finance', 'hr': 'human-resources',
  'data': 'data-analytics', 'product': 'product',
};

export async function fetchJobicy(category: string): Promise<Job[]> {
  const params = new URLSearchParams({ count: '50' });
  if (category !== 'all' && JOBICY_INDUSTRY[category]) params.set('industry', JOBICY_INDUSTRY[category]);
  const res = await fetchWithTimeout(`https://jobicy.com/api/v2/remote-jobs?${params}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Array.isArray(data?.jobs) ? data.jobs : []).map((j: any): Job => {
    const min = Number(j.annualSalaryMin) || 0;
    const max = Number(j.annualSalaryMax) || 0;
    const loc = str(j.jobGeo) || 'Remote';
    const jobTypes = Array.isArray(j.jobType) ? strArray(j.jobType) : j.jobType ? [str(j.jobType)] : [];
    return {
      id: `jobicy-${str(j.id)}`,
      title: str(j.jobTitle),
      company: str(j.companyName),
      companyLogo: normalizeLogoUrl(j.companyLogo || j.logo, 'jobicy'),
      location: loc,
      region: inferRegion(loc),
      category: mapFromJobicyIndustries(j.jobIndustry ?? []),
      jobType: normalizeJobType(jobTypes),
      tags: jobTypes.slice(0, 6),
      salary: min && max ? `$${Math.round(min / 1000)}k–$${Math.round(max / 1000)}k/yr` : undefined,
      salaryMin: min || undefined,
      salaryCurrency: min ? str(j.salaryCurrency) || 'USD' : undefined,
      url: cleanUrl(j.url),
      postedAt: str(j.pubDate) || new Date().toISOString(),
      source: 'jobicy',
      description: j.jobExcerpt ? stripHtml(str(j.jobExcerpt)) : undefined,
    };
  });
}

export async function fetchRemoteOK(): Promise<Job[]> {
  const res = await fetchWithTimeout('https://remoteok.com/api', {
    headers: { 'User-Agent': 'GlobalCV/1.0 (remote job aggregator)' },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Array.isArray(data) ? data.slice(1) : []).filter((j: any) => j && j.id && j.position).map((j: any): Job => {
    const min = Number(j.salary_min) || 0;
    const max = Number(j.salary_max) || 0;
    const tags = strArray(j.tags);
    const loc = str(j.location) || 'Remote';
    return {
      id: `remoteok-${str(j.id)}`,
      title: str(j.position),
      company: str(j.company),
      companyLogo: normalizeLogoUrl(j.company_logo || j.logo, 'remoteok'),
      location: loc,
      region: inferRegion(loc),
      category: inferCategory(str(j.position), tags),
      jobType: inferJobTypeFromTags(tags),
      tags,
      salary: min && max ? `$${Math.round(min / 1000)}k–$${Math.round(max / 1000)}k/yr` : undefined,
      salaryMin: min || undefined,
      salaryCurrency: min ? 'USD' : undefined,
      url: cleanUrl(j.url) || `https://remoteok.com/l/${encodeURIComponent(str(j.id))}`,
      postedAt: str(j.date) || new Date().toISOString(),
      source: 'remoteok',
      description: j.description ? stripHtml(str(j.description)) : undefined,
    };
  });
}

export async function fetch4DayWeek(): Promise<Job[]> {
  const res = await fetchWithTimeout('https://4dayweek.io/rss');
  const xml = (await res.text()).slice(0, 2_000_000);
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, 120).map((item, idx): Job | null => {
    const rawTitle = decodeXmlEntities(extractXmlTag(item, 'title'));
    const url = cleanUrl(decodeXmlEntities(extractXmlTag(item, 'link')) || decodeXmlEntities(extractXmlTag(item, 'guid')));
    if (!rawTitle || !url) return null;

    const [jobTitlePart = rawTitle, schedulePart = '', locationPart = 'Remote'] = rawTitle
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);

    const location = locationPart || 'Remote';
    const schedule = schedulePart || 'Reduced hours';
    const company = extractCompanyFrom4DayWeekUrl(url);
    const plainDescription = stripHtml(decodeXmlEntities(extractXmlTag(item, 'description')));
    const tags = [schedule, '4 Day Week'].filter(Boolean).slice(0, 6);
    const isFourDay = isFourDaySchedule(`${rawTitle} ${plainDescription}`);
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
}

export const HIMALAYAS_FEEDS = {
  himalayas: { countries: ['Brazil', 'Mexico', 'Argentina', 'Colombia', 'Chile', 'Peru'], fallbackLocation: 'Remote, Worldwide', extraTag: undefined },
  'himalayas-emea': {
    countries: ['United Kingdom', 'Germany', 'France', 'Spain', 'Portugal', 'Netherlands', 'Poland', 'United Arab Emirates', 'Saudi Arabia', 'South Africa'],
    fallbackLocation: 'Remote, EMEA',
    extraTag: undefined,
  },
  'himalayas-jp': { countries: ['Japan'], fallbackLocation: 'Remote, Japan', extraTag: 'Japan' },
} as const satisfies Record<string, { countries: readonly string[]; fallbackLocation: string; extraTag: string | undefined }>;

export type HimalayasFeed = keyof typeof HIMALAYAS_FEEDS;

function mapHimalayasJob(j: HimalayasApiJob, feed: HimalayasFeed): Job {
  const { fallbackLocation, extraTag } = HIMALAYAS_FEEDS[feed];
  const restrictions = Array.isArray(j.locationRestrictions) ? j.locationRestrictions.filter((r) => typeof r === 'string') : [];
  const location = restrictions.length > 0
    ? `Remote (${restrictions.slice(0, 2).join(', ')}${restrictions.length > 2 ? ' + more' : ''})`
    : fallbackLocation;
  const tags = [
    ...(j.categories ?? []).map((t) => String(t).replace(/-/g, ' ')),
    ...(j.parentCategories ?? []).map((t) => String(t).replace(/-/g, ' ')),
    ...(extraTag ? [extraTag] : []),
  ].slice(0, 6);
  const description = j.excerpt || (j.description ? stripHtml(j.description) : undefined);
  const prefix = feed === 'himalayas' ? 'himalayas' : feed;
  const salary = formatSalaryRange(j.minSalary, j.maxSalary, j.currency ?? 'USD');
  return {
    id: `${prefix}-${j.guid ?? `${j.companyName ?? 'company'}-${j.title ?? 'job'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title: j.title ?? '',
    company: j.companyName ?? '',
    companyLogo: normalizeLogoUrl(j.companyLogo, feed),
    location,
    region: inferRegion(restrictions.join(', ') || location),
    category: inferCategory(j.title ?? '', tags),
    jobType: normalizeJobType(j.employmentType),
    tags,
    salary,
    salaryMin: typeof j.minSalary === 'number' && j.minSalary > 0 ? j.minSalary : undefined,
    salaryCurrency: typeof j.minSalary === 'number' && j.minSalary > 0 ? j.currency ?? 'USD' : undefined,
    url: cleanUrl(j.applicationLink) || cleanUrl(j.guid),
    postedAt: typeof j.pubDate === 'number' ? new Date(j.pubDate * 1000).toISOString() : new Date().toISOString(),
    source: feed,
    description,
  };
}

/** Fetch one Himalayas feed (one request per country). Fails only if every country request fails. */
export async function fetchHimalayas(feed: HimalayasFeed, fetchCountry = fetchHimalayasCountry): Promise<Job[]> {
  const results = await Promise.allSettled(HIMALAYAS_FEEDS[feed].countries.map((country) => fetchCountry(country)));
  const ok = results.filter((r): r is PromiseFulfilledResult<HimalayasApiJob[]> => r.status === 'fulfilled');
  if (ok.length === 0) {
    const first = results[0];
    throw first && first.status === 'rejected' ? first.reason : new Error('No Himalayas results');
  }
  return ok.flatMap((r) => r.value.map((j) => mapHimalayasJob(j, feed)));
}

async function fetchHimalayasCountry(country: string): Promise<HimalayasApiJob[]> {
  const params = new URLSearchParams({ country, sort: 'recent', page: '1' });
  const res = await fetchWithTimeout(`https://himalayas.app/jobs/api/search?${params}`);
  const data = (await res.json()) as HimalayasApiResponse;
  return Array.isArray(data.jobs) ? data.jobs : [];
}

export async function fetchTheMuseEmea(): Promise<Job[]> {
  const results = await Promise.allSettled([1, 2, 3].map(async (page) => {
    const res = await fetchWithTimeout(`https://www.themuse.com/api/public/jobs?page=${page}`);
    return (await res.json()) as TheMuseApiResponse;
  }));
  const ok = results.filter((r): r is PromiseFulfilledResult<TheMuseApiResponse> => r.status === 'fulfilled');
  if (ok.length === 0) throw new Error('The Muse unavailable');
  return ok.flatMap(({ value }) => (value.results ?? []).map((j): Job | null => {
    const locations = (j.locations ?? []).map((loc) => (loc.name ?? '').trim()).filter(Boolean);
    const locationText = locations.join(', ');
    if (!isEmeaLocationText(locationText)) return null;
    const levelTags = (j.levels ?? []).map((lvl) => (lvl.name ?? '').trim()).filter(Boolean);
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
      url: cleanUrl(j.refs?.landing_page),
      postedAt: toIsoDateOrNow(j.publication_date ?? ''),
      source: 'themuse-emea',
      description: j.contents ? stripHtml(j.contents) : undefined,
    };
  }).filter((job): job is Job => !!job));
}

export function inferJobTypeFromTags(tags: string[]): string {
  const h = tags.join(' ').toLowerCase();
  if (h.includes('part-time') || h.includes('part time')) return 'part-time';
  if (h.includes('contract')) return 'contract';
  if (h.includes('freelance')) return 'freelance';
  if (h.includes('intern')) return 'internship';
  return 'full-time';
}
