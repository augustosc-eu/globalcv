'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Search, Briefcase, FileText, ExternalLink, Globe,
  ArrowLeft, ChevronLeft, ChevronRight, Building2, MapPin,
  RefreshCw, X, DollarSign, Clock, ChevronDown, Check,
  ChevronUp,
} from 'lucide-react';
import {
  Job, JobsResponse,
  JOB_CATEGORIES, JOB_REGIONS, JOB_TYPES, JOB_SOURCES,
  CATEGORY_STYLE,
} from '@/lib/jobs/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_BADGE: Record<string, string> = {
  globalcv: 'bg-slate-100 text-slate-700',
  remotive:  'bg-blue-100 text-blue-700',
  arbeitnow: 'bg-violet-100 text-violet-700',
  jobicy:    'bg-emerald-100 text-emerald-700',
  remoteok:  'bg-orange-100 text-orange-700',
  '4dayweek':'bg-fuchsia-100 text-fuchsia-700',
  himalayas: 'bg-cyan-100 text-cyan-700',
  'himalayas-emea': 'bg-sky-100 text-sky-700',
  'themuse-emea': 'bg-indigo-100 text-indigo-700',
};

const SOURCE_HOME: Record<string, string> = {
  globalcv: '/',
  remotive: 'https://remotive.com',
  arbeitnow: 'https://www.arbeitnow.com',
  jobicy: 'https://jobicy.com',
  remoteok: 'https://remoteok.com',
  '4dayweek': 'https://4dayweek.io',
  himalayas: 'https://himalayas.app',
  'himalayas-emea': 'https://himalayas.app',
  'themuse-emea': 'https://www.themuse.com',
};

const REGION_FLAG: Record<string, string> = {
  worldwide: '🌍', us: '🇺🇸', eu: '🇪🇺', uk: '🇬🇧',
  ca: '🇨🇦', au: '🇦🇺', latam: '🌎', apac: '🌏',
};

const JOB_TYPE_COLOR: Record<string, string> = {
  'full-time':  'bg-blue-50 text-blue-700',
  'part-time':  'bg-sky-50 text-sky-700',
  'contract':   'bg-amber-50 text-amber-700',
  'freelance':  'bg-violet-50 text-violet-700',
  'internship': 'bg-green-50 text-green-700',
};

type MarketRoute = 'us' | 'eu' | 'latam' | 'jp' | 'gb' | 'au' | 'in' | 'br';

const MARKET_LABEL: Record<MarketRoute, string> = {
  us: 'US Resume',
  eu: 'EU CV',
  latam: 'LATAM CV',
  jp: 'Japan CV',
  gb: 'UK CV',
  au: 'AU/NZ Resume',
  in: 'India CV',
  br: 'Brasil CV',
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const d = Math.floor(diff / 86_400_000);
    if (d === 0) return 'Today';
    if (d === 1) return '1d ago';
    if (d < 7) return `${d}d ago`;
    if (d < 30) return `${Math.floor(d / 7)}w ago`;
    return `${Math.floor(d / 30)}mo ago`;
  } catch { return ''; }
}

function inferMarketFromJob(job: Job): MarketRoute {
  const haystack = `${job.location} ${job.title} ${job.company} ${job.tags.join(' ')}`.toLowerCase();

  if (/(^|[^a-z])(brazil|brasil|sao paulo|são paulo|rio de janeiro|belo horizonte)([^a-z]|$)/.test(haystack)) return 'br';
  if (/(^|[^a-z])(india|bengaluru|bangalore|mumbai|new delhi|delhi|hyderabad|pune|chennai)([^a-z]|$)/.test(haystack)) return 'in';
  if (/(^|[^a-z])(japan|tokyo|osaka|kyoto|yokohama|jpn)([^a-z]|$)/.test(haystack)) return 'jp';

  switch (job.region) {
    case 'us':
      return 'us';
    case 'uk':
      return 'gb';
    case 'eu':
      return 'eu';
    case 'latam':
      return 'latam';
    case 'au':
      return 'au';
    case 'apac':
      return 'in';
    case 'ca':
      return 'us';
    default:
      break;
  }

  if (/(^|[^a-z])(latin america|latam|mexico|argentina|colombia|chile|peru)([^a-z]|$)/.test(haystack)) return 'latam';
  if (/(^|[^a-z])(united kingdom|london|manchester|glasgow)([^a-z]|$)/.test(haystack)) return 'gb';
  if (/(^|[^a-z])(germany|france|spain|italy|netherlands|portugal|poland|europe|eu)([^a-z]|$)/.test(haystack)) return 'eu';
  if (/(^|[^a-z])(australia|new zealand|sydney|melbourne|brisbane|auckland|wellington)([^a-z]|$)/.test(haystack)) return 'au';

  return 'us';
}

// ─── FilterDropdown component ─────────────────────────────────────────────────

interface FilterDropdownProps {
  label: string;
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  openKey: string;
  openDropdown: string | null;
  setOpenDropdown: (k: string | null) => void;
}

function FilterDropdown({
  label, options, value, onChange,
  openKey, openDropdown, setOpenDropdown,
}: FilterDropdownProps) {
  const isActive = value !== 'all';
  const isOpen = openDropdown === openKey;
  const selectedLabel = options.find(o => o.id === value)?.label ?? label;
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside this specific dropdown
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, setOpenDropdown]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpenDropdown(isOpen ? null : openKey)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
          isActive
            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
        }`}
      >
        {isActive ? selectedLabel : label}
        <ChevronDown size={11} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 min-w-[160px] bg-white rounded-xl border border-gray-200 shadow-lg z-30 overflow-hidden py-1">
          {options.map(opt => {
            const flag = REGION_FLAG[opt.id];
            const optLabel = flag && opt.id !== 'all' ? `${flag} ${opt.label}` : opt.label;
            return (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setOpenDropdown(null); }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors hover:bg-gray-50 ${
                  value === opt.id ? 'text-blue-700 font-semibold' : 'text-gray-700'
                }`}
              >
                <span>{optLabel}</span>
                {value === opt.id && <Check size={13} className="text-blue-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: Job }) {
  const [expanded, setExpanded] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const style = CATEGORY_STYLE[job.category] ?? CATEGORY_STYLE['other'];
  const catLabel = JOB_CATEGORIES.find(c => c.id === job.category)?.label ?? job.category;
  const regionFlag = REGION_FLAG[job.region] ?? '🌍';
  const fallbackRegionLabel = JOB_REGIONS.find(r => r.id === job.region)?.label ?? 'Worldwide';
  const rawLocation = (job.location ?? '').trim();
  const useFallbackRegion = !rawLocation || /^(remote|anywhere)$/i.test(rawLocation);
  const displayLocation = useFallbackRegion ? fallbackRegionLabel : rawLocation;
  const typeColor = JOB_TYPE_COLOR[job.jobType] ?? 'bg-gray-100 text-gray-600';
  const typeLabel = JOB_TYPES.find(t => t.id === job.jobType)?.label;
  const recommendedMarket = inferMarketFromJob(job);
  const marketCtaLabel = MARKET_LABEL[recommendedMarket];

  const hasDesc = !!job.description && job.description.length > 10;
  const shortDesc = hasDesc && job.description!.length > 200
    ? job.description!.slice(0, 200).replace(/\s+\S*$/, '') + '…'
    : job.description;

  return (
    <article className={`group bg-white rounded-2xl border border-gray-100 border-l-4 ${style.border} shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}>
      <div className="p-5">

        {/* ── Header row ── */}
        <div className="flex gap-4">
          {/* Logo */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden">
            {job.companyLogo && !logoFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.companyLogo}
                alt={job.company}
                className="w-full h-full object-contain p-1.5"
                loading="lazy"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span className="inline-flex items-center justify-center w-full h-full bg-gradient-to-br from-gray-100 to-gray-50 text-gray-500 font-semibold text-sm">
                {job.company.slice(0, 1).toUpperCase() || <Building2 size={18} className="text-gray-300" />}
              </span>
            )}
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-[15px] leading-snug group-hover:text-blue-700 transition-colors">
                  {job.title}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">{job.company}</p>
              </div>
              <a
                href={SOURCE_HOME[job.source]}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide hover:brightness-95 transition-colors ${SOURCE_BADGE[job.source] ?? 'bg-gray-100 text-gray-600'}`}
                title={`Source: ${job.source}`}
              >
                {job.source}
              </a>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                {catLabel}
              </span>

              {typeLabel && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${typeColor}`}>
                  {typeLabel}
                </span>
              )}

              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                <MapPin size={10} className="text-gray-400" />
                {regionFlag} {displayLocation}
              </span>

              {job.salary && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <DollarSign size={10} />
                  {job.salary}
                </span>
              )}

              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                <Clock size={10} />
                {timeAgo(job.postedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Description ── */}
        {hasDesc && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              {expanded ? job.description : shortDesc}
            </p>
            {job.description!.length > 200 && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                {expanded ? (
                  <><ChevronUp size={12} /> Show less</>
                ) : (
                  <><ChevronDown size={12} /> Show more</>
                )}
              </button>
            )}
          </div>
        )}

        {/* ── Tags ── */}
        {job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {job.tags.slice(0, 6).map((tag, index) => (
              <span key={`${tag}-${index}`} className="text-[11px] px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-gray-100 gap-2">
          <span className="text-[11px] text-gray-400 truncate max-w-[58%]">
            {job.company} • {regionFlag} {displayLocation}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/${recommendedMarket}`}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all"
              title={`Build a ${marketCtaLabel} with GlobalCV`}
            >
              <FileText size={11} />
              Build {marketCtaLabel}
            </Link>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
            >
              Open listing <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-gray-200 p-5 animate-pulse shadow-sm">
      <div className="flex gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-xl flex-shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded-lg w-2/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded-lg w-1/3 mb-3" />
          <div className="flex gap-2">
            <div className="h-5 bg-gray-100 rounded-full w-20" />
            <div className="h-5 bg-gray-100 rounded-full w-16" />
            <div className="h-5 bg-gray-100 rounded-full w-24" />
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-4/5" />
      </div>
      <div className="flex gap-2 mt-4">
        <div className="h-5 bg-gray-100 rounded-full w-14" />
        <div className="h-5 bg-gray-100 rounded-full w-20" />
        <div className="h-5 bg-gray-100 rounded-full w-12" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Filters {
  search: string;
  category: string;
  region: string;
  jobType: string;
  source: string;
  salary: boolean;
  fourDay: boolean;
  sort: 'newest' | 'salary';
}

const DEFAULT: Filters = {
  search: '', category: 'all', region: 'all',
  jobType: 'all', source: 'all', salary: false, fourDay: false, sort: 'newest',
};

const JOBS_SAFE_MODE = process.env.NEXT_PUBLIC_JOBS_SAFE_MODE !== 'false';
const ENABLE_POST_JOB = process.env.NEXT_PUBLIC_ENABLE_POST_JOB === 'true';
const ENABLE_4DAYWEEK_SOURCE = process.env.NEXT_PUBLIC_ENABLE_4DAYWEEK_SOURCE === 'true';
const ENABLE_THEMUSE_SOURCE = process.env.NEXT_PUBLIC_ENABLE_THEMUSE_SOURCE === 'true';
const ENABLE_ARBEITNOW_SOURCE = process.env.NEXT_PUBLIC_ENABLE_ARBEITNOW_SOURCE === 'true';

const VISIBLE_JOB_SOURCES = JOB_SOURCES.filter((s) => {
  if (s.id === 'arbeitnow' && JOBS_SAFE_MODE && !ENABLE_ARBEITNOW_SOURCE) return false;
  if (s.id === '4dayweek') return ENABLE_4DAYWEEK_SOURCE && !JOBS_SAFE_MODE;
  if (s.id === 'themuse-emea') return ENABLE_THEMUSE_SOURCE && !JOBS_SAFE_MODE;
  return true;
});

const HERO_SOURCE_NAMES = VISIBLE_JOB_SOURCES
  .filter((s) => s.id !== 'all')
  .map((s) => s.label);

function activeCount(f: Filters) {
  return [
    f.category !== 'all', f.region !== 'all', f.jobType !== 'all',
    f.source !== 'all', f.salary, f.fourDay, f.sort !== 'newest',
  ].filter(Boolean).length;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const [searchInput, setSearchInput] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({ page: String(page) });
      if (filters.search)             p.set('q', filters.search);
      if (filters.category !== 'all') p.set('category', filters.category);
      if (filters.region !== 'all')   p.set('region', filters.region);
      if (filters.jobType !== 'all')  p.set('jobType', filters.jobType);
      if (filters.source !== 'all')   p.set('source', filters.source);
      if (filters.salary)             p.set('salary', 'true');
      if (filters.fourDay)            p.set('fourDay', 'true');
      if (filters.sort !== 'newest')  p.set('sort', filters.sort);

      const res = await fetch(`/api/jobs?${p}`);
      if (!res.ok) throw new Error();
      const data: JobsResponse = await res.json();
      setJobs(data.jobs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setError('Could not load jobs — please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setFilter('search', searchInput);
  }

  const numActive = activeCount(filters);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* ── Top nav ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-gray-900 font-bold text-sm hover:text-gray-600 transition-colors">
              <FileText size={17} className="text-blue-600" />
              GlobalCV
            </Link>
            <span className="text-gray-300">/</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-blue-600">
              <Briefcase size={14} />
              Remote Jobs
            </span>
          </div>
          <div className="flex items-center gap-2">
            {ENABLE_POST_JOB && (
              <Link href="/post-job" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                <Briefcase size={11} />
                Post a Job
              </Link>
            )}
            <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              <ArrowLeft size={11} />
              Build your CV
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero: search + filters ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Globe size={13} />
              Live listings — refreshed every 5 min
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
              Find your next{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                remote job
              </span>
            </h1>
            <p className="text-gray-500 text-[15px]">
              Aggregated from {HERO_SOURCE_NAMES.join(', ')}.
            </p>
          </div>

          {ENABLE_POST_JOB && (
            <div className="mt-6 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-indigo-900">Hiring now?</p>
                <p className="text-xs text-indigo-700">
                  Post with GlobalCV to reach top talent actively preparing market-ready CVs.
                </p>
              </div>
              <Link
                href="/post-job"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Post with us
                <ExternalLink size={11} />
              </Link>
            </div>
          )}

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Job title, company, or skill — e.g. React, Stripe, Product Manager…"
                className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
              />
            </div>
            <button type="submit" className="px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm sm:w-auto">
              Search
            </button>
            {filters.search && (
              <button type="button" onClick={() => { setFilter('search', ''); setSearchInput(''); }}
                className="px-3 py-3 text-gray-400 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors sm:w-auto">
                <X size={14} />
              </button>
            )}
          </form>

          {/* ── Filter bar ── */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
            <FilterDropdown
              label="Category"
              options={JOB_CATEGORIES}
              value={filters.category}
              onChange={v => setFilter('category', v)}
              openKey="category"
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
            />
            <FilterDropdown
              label="Region"
              options={JOB_REGIONS}
              value={filters.region}
              onChange={v => setFilter('region', v)}
              openKey="region"
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
            />
            <FilterDropdown
              label="Job Type"
              options={JOB_TYPES}
              value={filters.jobType}
              onChange={v => setFilter('jobType', v)}
              openKey="jobType"
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
            />
            <FilterDropdown
              label="Source"
              options={VISIBLE_JOB_SOURCES}
              value={filters.source}
              onChange={v => setFilter('source', v)}
              openKey="source"
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
            />

            {/* Has salary toggle */}
            <button
              onClick={() => setFilter('salary', !filters.salary)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filters.salary
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              <DollarSign size={11} />
              Has salary
            </button>

            {/* 4 day week toggle */}
            <button
              onClick={() => setFilter('fourDay', !filters.fourDay)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filters.fourDay
                  ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              <Clock size={11} />
              4-day week
            </button>

            {/* Sort */}
            <div className="relative flex items-center ml-auto">
              <select
                value={filters.sort}
                onChange={e => setFilter('sort', e.target.value as 'newest' | 'salary')}
                className="appearance-none pl-3 pr-7 py-1.5 text-xs font-medium border border-gray-200 rounded-full bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer hover:border-gray-400 transition-colors"
              >
                <option value="newest">Newest first</option>
                <option value="salary">Highest salary</option>
              </select>
              <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Clear all */}
            {numActive > 0 && (
              <button
                onClick={() => { setFilters(DEFAULT); setSearchInput(''); setPage(1); }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
              >
                <X size={11} />
                Clear ({numActive})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Count + refresh bar */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">
            {loading
              ? 'Loading…'
              : total > 0
                ? <><span className="font-semibold text-gray-800">{total.toLocaleString()}</span> remote job{total !== 1 ? 's' : ''}{filters.search ? ` for "${filters.search}"` : ''}</>
                : 'No jobs found'
            }
          </p>
          <button onClick={() => fetchJobs()} title="Refresh" className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Briefcase size={36} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium mb-4">{error}</p>
            <button onClick={() => fetchJobs()} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && jobs.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Briefcase size={40} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-700 font-semibold mb-1">No jobs found</p>
            <p className="text-sm text-gray-400 mb-5">Try different keywords or relax your filters</p>
            {numActive > 0 && (
              <button onClick={() => { setFilters(DEFAULT); setSearchInput(''); setPage(1); }}
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Job list */}
        {!loading && !error && jobs.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {jobs.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default transition-colors"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="text-sm text-gray-500 bg-white px-4 py-2 rounded-xl border border-gray-200 tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── CTA ── */}
      <div className="bg-white border-t border-gray-200 mt-4">
        <div className="max-w-5xl mx-auto px-6 py-10 text-center">
          <p className="text-gray-800 font-semibold mb-1">Found your dream job?</p>
          <p className="text-sm text-gray-500 mb-5">Build a market-tailored CV that gets you past the first screen</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
            <FileText size={14} />
            Build your CV — it&apos;s free
          </Link>
        </div>
      </div>

      <footer className="text-center text-sm text-gray-400 py-8 border-t border-gray-200 space-y-2">
        <p>GlobalCV — by Augusto Santa Cruz</p>
        <p className="flex items-center justify-center gap-4 text-xs">
          <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms of Service</Link>
        </p>
      </footer>
    </main>
  );
}
