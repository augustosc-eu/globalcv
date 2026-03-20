'use client';

import Link from 'next/link';
import { ArrowRight, FileText, Globe, Star } from 'lucide-react';

const markets = [
  {
    id: 'us',
    name: 'United States',
    flag: '🇺🇸',
    gradient: 'from-blue-600 to-blue-800',
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
    gradient: 'from-indigo-600 to-indigo-800',
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
    gradient: 'from-blue-700 to-blue-900',
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
    gradient: 'from-sky-500 to-sky-700',
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
    gradient: 'from-orange-500 to-orange-700',
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
    gradient: 'from-green-600 to-green-800',
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
    gradient: 'from-amber-600 to-amber-800',
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
    gradient: 'from-red-600 to-red-800',
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

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Star size={14} className="fill-current" />
            Multi-market CV &amp; Resume Builder
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            Build your CV for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              any market
            </span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            Each market has its own conventions. We handle the differences so your
            application looks local — whether you&apos;re targeting San Francisco,
            Berlin, São Paulo, or Tokyo.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <FileText size={16} /> Professional templates
            </span>
            <span className="flex items-center gap-1.5">
              <Globe size={16} /> 8 global markets
            </span>
            <span className="flex items-center gap-1.5">
              <ArrowRight size={16} /> PDF export
            </span>
          </div>
        </div>
      </div>

      {/* Market cards */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2 text-center">
          Choose your target market
        </h2>
        <p className="text-gray-500 text-center mb-10">
          The builder adapts its fields, templates, and conventions to each market automatically.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {markets.map((market) => (
            <Link
              key={market.id}
              href={`/${market.id}`}
              className={`group bg-white rounded-2xl border-2 ${market.border} p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-4xl">{market.flag}</span>
                  <div className="mt-2">
                    <h3 className="text-xl font-bold text-gray-900">{market.name}</h3>
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${market.badge}`}>
                      {market.format}
                    </span>
                  </div>
                </div>
                <div className={`p-2 rounded-xl bg-gradient-to-br ${market.gradient} text-white opacity-0 group-hover:opacity-100 transition-opacity`}>
                  <ArrowRight size={20} />
                </div>
              </div>

              <ul className="space-y-2">
                {market.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-gray-700 group-hover:text-gray-900">
                Start building
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-400 py-10 border-t border-gray-200 space-y-2">
        <p>GlobalCV — by Augusto Santa Cruz</p>
        <p className="flex items-center justify-center gap-4 text-xs">
          <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms of Service</Link>
        </p>
      </footer>
    </main>
  );
}
