'use client';

import Link from 'next/link';
import { ArrowRight, Briefcase, FileText, Globe, Repeat2, Sparkles, Star, Target } from 'lucide-react';
import TopNav from '@/components/shared/TopNav';
import { SITE_OWNER_NAME, SITE_OWNER_URL } from '@/lib/site';

const ENABLE_POST_JOB = process.env.NEXT_PUBLIC_ENABLE_POST_JOB === 'true';

const markets = [
  {
    id: 'us',
    name: 'United States',
    flag: '🇺🇸',
    gradient: 'from-blue-600 to-cyan-500',
    border: 'border-blue-200 hover:border-blue-400',
    badge: 'bg-blue-100 text-blue-700',
    format: 'Resume',
    highlights: [
      'ATS-optimized single-page format',
      'No photo, age, or personal info',
      'Action-verb bullet points',
      'Tailored for US recruiters',
    ],
  },
  {
    id: 'eu',
    name: 'European Union',
    flag: '🇪🇺',
    gradient: 'from-indigo-600 to-sky-500',
    border: 'border-indigo-200 hover:border-indigo-400',
    badge: 'bg-indigo-100 text-indigo-700',
    format: 'Curriculum Vitae',
    highlights: [
      'Europass-compatible format',
      'CEFR language proficiency grid',
      'Optional photo & personal details',
      'Multi-page format accepted',
    ],
  },
  {
    id: 'gb',
    name: 'United Kingdom',
    flag: '🇬🇧',
    gradient: 'from-blue-700 to-indigo-700',
    border: 'border-blue-200 hover:border-blue-500',
    badge: 'bg-blue-100 text-blue-800',
    format: 'CV',
    highlights: [
      'A4 format, 2-page standard',
      'No photo, DOB, or nationality (equality law)',
      'Personal Profile section',
      'References on request convention',
    ],
  },
  {
    id: 'au',
    name: 'Australia & NZ',
    flag: '🇦🇺',
    gradient: 'from-sky-600 to-cyan-500',
    border: 'border-sky-200 hover:border-sky-400',
    badge: 'bg-sky-100 text-sky-700',
    format: 'Resume',
    highlights: [
      'A4, 2–3 pages acceptable',
      'No photo convention',
      'Referees section expected',
      'Career Objective section',
    ],
  },
  {
    id: 'latam',
    name: 'Latin America',
    flag: '🌎',
    gradient: 'from-orange-500 to-amber-500',
    border: 'border-orange-200 hover:border-orange-400',
    badge: 'bg-orange-100 text-orange-700',
    format: 'Curriculum Vitae',
    highlights: [
      'Photo & personal data expected',
      'Objective / career statement',
      'References section included',
      'Nationality & marital status',
    ],
  },
  {
    id: 'br',
    name: 'Brasil',
    flag: '🇧🇷',
    gradient: 'from-emerald-600 to-teal-500',
    border: 'border-green-200 hover:border-green-500',
    badge: 'bg-green-100 text-green-700',
    format: 'Currículo',
    highlights: [
      'Portuguese (pt-BR) interface',
      'Photo & personal details block',
      'Objetivo Profissional required',
      'CLT / PJ employment types',
    ],
  },
  {
    id: 'in',
    name: 'India',
    flag: '🇮🇳',
    gradient: 'from-amber-600 to-orange-500',
    border: 'border-amber-200 hover:border-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    format: 'CV / Resume',
    highlights: [
      'Career Objective required',
      'Photo, DOB, marital status optional',
      'Technical Skills section highlighted',
      'A4, up to 2 pages',
    ],
  },
  {
    id: 'jp',
    name: '日本 / Japan',
    flag: '🇯🇵',
    gradient: 'from-rose-600 to-red-500',
    border: 'border-red-200 hover:border-red-400',
    badge: 'bg-red-100 text-red-700',
    format: '履歴書 / 職務経歴書',
    highlights: [
      'Official JIS rirekisho grid format',
      'Furigana, photo (3×4cm) required',
      'Nearest station & commute time',
      '自己PR and 志望動機 sections',
    ],
  },
];

const platformStats = [
  { label: 'Markets', value: '8+' },
  { label: 'Job Sources', value: '10+' },
  { label: 'Templates', value: 'Local-first' },
];

const concreteMarketDifferences = [
  {
    market: 'United States',
    flag: '🇺🇸',
    accent: 'border-blue-200 bg-blue-50/70 text-blue-700',
    points: [
      { label: 'Page', value: 'Letter resume with a 1-page target' },
      { label: 'Personal info', value: 'No photo, date of birth, or nationality' },
      { label: 'Content', value: 'ATS headings and quantified impact bullets' },
      { label: 'Best for', value: 'US recruiter and ATS review' },
    ],
  },
  {
    market: 'European Union',
    flag: '🇪🇺',
    accent: 'border-indigo-200 bg-indigo-50/70 text-indigo-700',
    points: [
      { label: 'Page', value: 'A4 CV, commonly 1-2 pages' },
      { label: 'Personal info', value: 'Photo and details vary by country' },
      { label: 'Content', value: 'CEFR languages and Europass option' },
      { label: 'Best for', value: 'Cross-border European applications' },
    ],
  },
  {
    market: 'Japan',
    flag: '🇯🇵',
    accent: 'border-rose-200 bg-rose-50/70 text-rose-700',
    points: [
      { label: 'Page', value: 'A4 rirekisho and shokumu formats' },
      { label: 'Personal info', value: 'Photo, furigana, gender, station, commute' },
      { label: 'Content', value: 'Formal chronology, 自己PR, and 志望動機' },
      { label: 'Best for', value: 'Japanese hiring conventions' },
    ],
  },
];

const onboardingChoices = [
  {
    title: 'Applying to a job',
    description: 'Start with a target role and tailor your CV around keywords, skills, and recruiter scan checks.',
    href: '/jobs',
    icon: Target,
    cta: 'Find a job to tailor',
  },
  {
    title: 'Building a general CV',
    description: 'Open the builder with market defaults and create a strong reusable CV from scratch.',
    href: '/us?mode=general',
    icon: FileText,
    cta: 'Start a general CV',
  },
  {
    title: 'Converting to another market',
    description: 'Use market previews to see which fields, templates, and conventions change before copying.',
    href: '/us?mode=convert',
    icon: Repeat2,
    cta: 'Start conversion flow',
  },
];

export default function HomePage() {
  return (
    <main className="app-shell-bg soft-grid-bg">
      <TopNav current="home" showPostJob={ENABLE_POST_JOB} />
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <section className="surface-card rounded-3xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="absolute -left-16 -bottom-20 h-52 w-52 rounded-full bg-cyan-200/30 blur-3xl" />

          <div className="relative grid grid-cols-1 md:grid-cols-[1.3fr_0.9fr] gap-8 items-start">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-semibold mb-5 border border-blue-100">
                <Sparkles size={13} />
                Multi-market CV and Resume Builder
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                Build job-ready CVs for
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500"> every target market</span>
              </h1>

              <p className="text-slate-600 text-base md:text-lg mt-4 max-w-2xl">
                Switch markets and see the fields, page size, photo rules, language scale, and templates change so your application looks local in the US, UK, EU, LATAM, Brazil, India, and Japan.
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-7">
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
                >
                  Browse Remote Jobs
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/us"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Start with US Resume
                  <FileText size={15} />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-5">
              <p className="text-sm font-semibold text-slate-900 mb-4">Why teams and candidates choose GlobalCV</p>
              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm text-slate-700">Local conventions by market, not one generic template.</div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm text-slate-700">Live jobs with region-aware CV recommendations.</div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm text-slate-700">Privacy-first editing in the browser.</div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {platformStats.map((item) => (
                  <div key={item.label} className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-center">
                    <p className="text-sm font-bold text-blue-700">{item.value}</p>
                    <p className="text-[11px] text-blue-600">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">What are you trying to do today?</h2>
              <p className="text-sm text-slate-500 mt-1">Start from the workflow that matches your goal.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {onboardingChoices.map((choice) => {
              const Icon = choice.icon;
              return (
                <Link key={choice.title} href={choice.href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Icon size={18} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{choice.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{choice.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-800">
                    {choice.cta}
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide font-semibold text-slate-500 mb-2">
                <Globe size={13} />
                Concrete Market Differences
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">See exactly what changes by country</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                GlobalCV does more than swap labels. It changes the format, required fields, page expectations, and writing cues for the market you are targeting.
              </p>
            </div>
            <Link
              href="/jp"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors w-fit"
            >
              Compare with Japan
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {concreteMarketDifferences.map((item) => (
              <div key={item.market} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{item.flag}</span>
                    <h3 className="text-lg font-bold text-slate-900">{item.market}</h3>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.accent}`}>
                    Local rules
                  </span>
                </div>

                <dl className="space-y-2.5">
                  {item.points.map((point) => (
                    <div key={`${item.market}-${point.label}`} className="grid grid-cols-[88px_1fr] gap-3 border-t border-slate-100 pt-2.5 first:border-t-0 first:pt-0">
                      <dt className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">{point.label}</dt>
                      <dd className="text-sm text-slate-700 leading-relaxed">{point.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Choose your market</h2>
              <p className="text-sm text-slate-500">Each profile below opens a market-specific CV workflow.</p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-white/80 border border-slate-200 rounded-full px-3 py-1.5 w-fit">
              <Globe size={12} />
              More markets coming soon
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {markets.map((market) => (
              <Link
                key={market.id}
                href={`/${market.id}`}
                className={`group relative overflow-hidden rounded-2xl border ${market.border} bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg`}
              >
                <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-slate-100 group-hover:bg-slate-200/70 transition-colors" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-3xl">{market.flag}</span>
                      <h3 className="text-lg font-bold text-slate-900 mt-2 leading-tight">{market.name}</h3>
                      <span className={`inline-flex mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${market.badge}`}>
                        {market.format}
                      </span>
                    </div>
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${market.gradient} text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <ArrowRight size={16} />
                    </div>
                  </div>

                  <ul className="space-y-1.5">
                    {market.highlights.map((h) => (
                      <li key={`${market.id}-${h}`} className="text-xs text-slate-600 leading-relaxed flex gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                    Open market builder
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 p-8 md:p-10 text-white shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide font-semibold bg-white/15 border border-white/20 px-3 py-1 rounded-full mb-3">
                  <Star size={12} className="fill-current" />
                  New Remote Jobs Hub
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Find jobs and build the right CV in one flow</h2>
                <p className="text-sm md:text-base text-blue-100 max-w-2xl">
                  Discover remote roles from multiple sources, then jump straight into the best market format for that listing.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/jobs"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 transition-colors"
                >
                  <Briefcase size={14} />
                  Explore Jobs
                </Link>
                {ENABLE_POST_JOB && (
                  <Link
                    href="/post-job"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-950/40 border border-blue-200/30 text-white font-semibold text-sm hover:bg-blue-950/55 transition-colors"
                  >
                    Post a Job
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-slate-200 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>
            GlobalCV by{' '}
            <a href={SITE_OWNER_URL} target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 underline-offset-2 hover:underline">
              {SITE_OWNER_NAME}
            </a>
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-slate-700 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-700 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
