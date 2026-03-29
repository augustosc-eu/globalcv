'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Briefcase, Menu, PlusCircle, Shield, X } from 'lucide-react';
import BrandLink from './BrandLink';

type NavKey = 'home' | 'jobs' | 'post-job' | 'privacy' | 'terms';

interface TopNavProps {
  current?: NavKey;
  showPostJob?: boolean;
}

const NAV_ITEMS: Array<{ key: NavKey; label: string; href: string; icon?: React.ComponentType<{ size?: number }> }> = [
  { key: 'home', label: 'Markets', href: '/' },
  { key: 'jobs', label: 'Jobs', href: '/jobs', icon: Briefcase },
  { key: 'privacy', label: 'Privacy', href: '/privacy', icon: Shield },
  { key: 'terms', label: 'Terms', href: '/terms' },
];

export default function TopNav({ current = 'home', showPostJob = false }: TopNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <BrandLink href="/" variant="nav" />

        <nav className="hidden md:flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.key === current;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {Icon && <Icon size={12} />}
                {item.label}
              </Link>
            );
          })}
          {showPostJob && (
            <Link
              href="/post-job"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                current === 'post-job'
                  ? 'bg-indigo-700 text-white'
                  : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
              }`}
            >
              <PlusCircle size={12} />
              Post a Job
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link href="/us" className="inline-flex items-center px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            Build CV
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-700"
          aria-label="Toggle menu"
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  item.key === current ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {showPostJob && (
              <Link
                href="/post-job"
                onClick={() => setOpen(false)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  current === 'post-job'
                    ? 'bg-indigo-700 text-white'
                    : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                }`}
              >
                Post a Job
              </Link>
            )}
            <Link
              href="/us"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50"
            >
              Build CV
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

