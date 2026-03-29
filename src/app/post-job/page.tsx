'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { Briefcase, CheckCircle2, FileText, Mail, Sparkles, Users } from 'lucide-react';
import { CONTACT_EMAIL } from '@/lib/site';

const ENABLE_POST_JOB = process.env.NEXT_PUBLIC_ENABLE_POST_JOB === 'true';

interface JobPostFormState {
  companyName: string;
  companyWebsite: string;
  contactName: string;
  contactEmail: string;
  jobTitle: string;
  location: string;
  employmentType: string;
  applicationUrl: string;
  salary: string;
  regionFocus: string;
  description: string;
}

const INITIAL_FORM: JobPostFormState = {
  companyName: '',
  companyWebsite: '',
  contactName: '',
  contactEmail: '',
  jobTitle: '',
  location: '',
  employmentType: 'Full-time',
  applicationUrl: '',
  salary: '',
  regionFocus: 'Global',
  description: '',
};

export default function PostJobPage() {
  if (!ENABLE_POST_JOB) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Job posting is currently disabled</h1>
          <p className="text-sm text-gray-500 mb-5">
            We are not accepting new job submissions right now.
          </p>
          <Link href="/jobs" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            Back to Jobs
          </Link>
        </div>
      </main>
    );
  }

  const [form, setForm] = useState<JobPostFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      form.companyName.trim().length > 1 &&
      form.contactName.trim().length > 1 &&
      form.contactEmail.trim().includes('@') &&
      form.jobTitle.trim().length > 1 &&
      form.applicationUrl.trim().length > 5
    );
  }, [form]);

  function setField<K extends keyof JobPostFormState>(key: K, value: JobPostFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitted(false);
    setErrorMessage(null);

    fetch('/api/post-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error || 'Could not submit your request.');
        }
        setSubmitted(true);
        setForm(INITIAL_FORM);
      })
      .catch((err: unknown) => {
        setErrorMessage(err instanceof Error ? err.message : 'Could not submit your request.');
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-900 font-bold text-sm hover:text-gray-600 transition-colors">
            <FileText size={17} className="text-blue-600" />
            GlobalCV
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/jobs" className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              Browse Jobs
            </Link>
            <Link href="/" className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
              Build CV
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles size={13} />
            For Hiring Teams
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
            Post with us and reach top talent
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Publish your job on GlobalCV and connect with candidates who are actively building market-ready CVs for global hiring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-1"><Users size={14} className="text-blue-600" /> Qualified Audience</p>
            <p className="text-xs text-gray-500">Candidates preparing tailored CVs for US, UK, EU, LATAM, BR, IN, and JP markets.</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-1"><Briefcase size={14} className="text-blue-600" /> Remote-First Reach</p>
            <p className="text-xs text-gray-500">Ideal for distributed teams hiring across regions and time zones.</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-1"><Mail size={14} className="text-blue-600" /> Fast Onboarding</p>
            <p className="text-xs text-gray-500">Submit your role details and we will review and coordinate publication quickly.</p>
          </div>
        </div>

        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Job Posting Request</h2>
          <p className="text-sm text-gray-500 mb-5">
            Fill out the form below and we will review your free listing request.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">Current plan: Free Standard</p>
              <p className="text-xs text-blue-700 mt-1">
                We&apos;re currently onboarding employers with free listings.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={form.companyName} onChange={(e) => setField('companyName', e.target.value)} placeholder="Company name *" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={form.companyWebsite} onChange={(e) => setField('companyWebsite', e.target.value)} placeholder="Company website" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={form.contactName} onChange={(e) => setField('contactName', e.target.value)} placeholder="Contact name *" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="email" value={form.contactEmail} onChange={(e) => setField('contactEmail', e.target.value)} placeholder="Contact email *" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={form.jobTitle} onChange={(e) => setField('jobTitle', e.target.value)} placeholder="Job title *" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={form.location} onChange={(e) => setField('location', e.target.value)} placeholder="Location (e.g. Remote, UK, São Paulo)" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={form.employmentType} onChange={(e) => setField('employmentType', e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Freelance</option>
                <option>Internship</option>
              </select>
              <input value={form.salary} onChange={(e) => setField('salary', e.target.value)} placeholder="Salary (optional)" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={form.applicationUrl} onChange={(e) => setField('applicationUrl', e.target.value)} placeholder="Application URL *" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2" />
              <select value={form.regionFocus} onChange={(e) => setField('regionFocus', e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2">
                <option>Global</option>
                <option>United States</option>
                <option>United Kingdom</option>
                <option>Europe</option>
                <option>Latin America</option>
                <option>Brazil</option>
                <option>India</option>
                <option>Japan</option>
              </select>
              <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Short job description / notes" rows={5} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Mail size={14} />
                {submitting ? 'Sending...' : 'Send posting request'}
              </button>
              <p className="text-xs text-gray-500">
                Prefer direct email? <a className="text-blue-600 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </p>
            </div>

            {submitted && (
              <p className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                <CheckCircle2 size={15} />
                Request sent. We&apos;ll review your role and follow up shortly.
              </p>
            )}

            {errorMessage && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {errorMessage}
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
