'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  Globe2,
  Laptop,
  Link2,
  MapPin,
  MessageSquareText,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import TopNav from '@/components/shared/TopNav';
import { useCVStore } from '@/store/cvStore';
import {
  RemotePath,
  buildRemoteDraft,
  remoteGuideCards,
  remotePathDescriptions,
  remotePathLabels,
} from '@/lib/remoteWorkers/content';

const ENABLE_POST_JOB = process.env.NEXT_PUBLIC_ENABLE_POST_JOB === 'true';

const pathIcons: Record<RemotePath, React.ComponentType<{ size?: number; className?: string }>> = {
  remote_employee: BriefcaseBusiness,
  freelance: Users,
  both: Globe2,
};

const initialInputs = {
  targetRole: 'Product designer, frontend engineer, operations lead, or consultant',
  timezone: '4+ hours overlap with US Eastern or Central European time',
  tools: 'Slack, Notion, Linear, GitHub, Figma, Loom, Google Workspace',
  strengths: 'written updates, async handoffs, stakeholder alignment, milestone planning',
  location: 'location-flexible with stable connectivity and scheduled overlap windows',
  proof: 'portfolio case study, GitHub repository, shipped product, client result, or writing sample',
};

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function makeBulletText(bullets: string[]): string {
  return bullets.map((bullet) => `- ${bullet}`).join('\n');
}

export default function RemoteWorkersPage() {
  const {
    cv,
    initializeMarket,
    setObjective,
    setDesiredConditions,
    setTargeting,
    setRemoteWorkProfile,
    addSkill,
    addProject,
  } = useCVStore();
  const [path, setPath] = useState<RemotePath>('both');
  const [inputs, setInputs] = useState(initialInputs);
  const generated = useMemo(() => buildRemoteDraft(path, inputs), [path, inputs]);
  const [summary, setSummary] = useState(generated.summary);
  const [availability, setAvailability] = useState(generated.availability);
  const [bulletsText, setBulletsText] = useState(makeBulletText(generated.bullets));
  const [skillsText, setSkillsText] = useState(generated.skills.join(', '));
  const [projectName, setProjectName] = useState(generated.projectName);
  const [projectDescription, setProjectDescription] = useState(generated.projectDescription);
  const [inserted, setInserted] = useState<string[]>([]);

  useEffect(() => {
    initializeMarket('us');
  }, [initializeMarket]);

  useEffect(() => {
    setSummary(generated.summary);
    setAvailability(generated.availability);
    setBulletsText(makeBulletText(generated.bullets));
    setSkillsText(generated.skills.join(', '));
    setProjectName(generated.projectName);
    setProjectDescription(generated.projectDescription);
  }, [generated]);

  const bullets = bulletsText
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
  const skills = splitList(skillsText);
  const profileTools = splitList(inputs.tools);
  const profileStrengths = splitList(inputs.strengths);
  const profileProof = splitList(inputs.proof);

  function markInserted(label: string) {
    setInserted((current) => [label, ...current.filter((item) => item !== label)].slice(0, 4));
  }

  function saveProfile() {
    setRemoteWorkProfile({
      workModeTarget: path,
      preferredTimezoneOverlap: inputs.timezone,
      collaborationTools: profileTools,
      asyncStrengths: profileStrengths,
      locationFlexibility: inputs.location,
      portfolioProof: profileProof,
    });
    markInserted('Remote profile saved');
  }

  function insertSummary() {
    setObjective(summary);
    markInserted('Summary inserted');
  }

  function insertAvailability() {
    setDesiredConditions(availability);
    markInserted('Availability inserted');
  }

  function insertSkills() {
    const existing = new Set(cv.skills.map((skill) => skill.name.toLowerCase()));
    for (const skill of skills) {
      if (!existing.has(skill.toLowerCase())) {
        addSkill({ name: skill, category: 'Remote work', level: 4 });
      }
    }
    markInserted('Remote skills inserted');
  }

  function insertProject() {
    addProject({
      name: projectName,
      role: generated.projectRole,
      description: `${projectDescription}\n\nRemote proof bullets:\n${makeBulletText(bullets)}`,
      url: profileProof[0],
      techStack: profileTools,
    });
    markInserted('Portfolio proof inserted');
  }

  function insertTargeting() {
    setTargeting({
      targetRole: inputs.targetRole,
      targetCompany: cv.targetCompany,
      jobDescriptionNotes: generated.targetNotes,
    });
    markInserted('Targeting notes inserted');
  }

  function insertAll() {
    saveProfile();
    insertSummary();
    insertAvailability();
    insertSkills();
    insertProject();
    insertTargeting();
    markInserted('Full workflow inserted');
  }

  return (
    <main className="app-shell-bg soft-grid-bg min-h-screen">
      <TopNav current="remote-workers" showPostJob={ENABLE_POST_JOB} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-10">
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
          <div className="surface-card rounded-2xl p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
              <div className="max-w-2xl">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Nomads & Remote Workers</h1>
                <p className="mt-2 text-sm md:text-base text-slate-600">
                  Build a remote-ready CV workflow for late-2026 hiring: async proof, verifiable portfolio evidence, location clarity, and insert-ready sections for jobs or client work.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={insertAll}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <PlusCircle size={16} />
                  Insert workflow
                </button>
                <Link
                  href="/us"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Open builder
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['remote_employee', 'freelance', 'both'] as RemotePath[]).map((item) => {
                const Icon = pathIcons[item];
                const active = path === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPath(item)}
                    className={`text-left rounded-xl border p-4 transition-colors ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Icon size={17} />
                      {remotePathLabels[item]}
                    </span>
                    <span className={`mt-2 block text-xs leading-5 ${active ? 'text-slate-200' : 'text-slate-500'}`}>
                      {remotePathDescriptions[item]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="surface-card rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck size={17} />
              Draft status
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Current draft</dt>
                <dd className="font-semibold text-slate-800 truncate">{cv.title ?? 'US Draft'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Remote profile</dt>
                <dd className="font-semibold text-slate-800">
                  {cv.remoteWorkProfile ? remotePathLabels[cv.remoteWorkProfile.workModeTarget] : 'Not saved'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Remote skills</dt>
                <dd className="font-semibold text-slate-800">{cv.skills.filter((skill) => skill.category === 'Remote work').length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Proof projects</dt>
                <dd className="font-semibold text-slate-800">{cv.projects.length}</dd>
              </div>
            </dl>
            {inserted.length > 0 && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-semibold text-emerald-800">Latest updates</p>
                <ul className="mt-2 space-y-1 text-xs text-emerald-700">
                  {inserted.map((item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </section>

        <section className="mt-5 grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5 items-start">
          <div className="surface-card rounded-2xl p-5 md:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Laptop size={17} />
              Workflow inputs
            </div>
            <div className="mt-5 space-y-4">
              <Field
                icon={FileText}
                label="Target role or offer"
                value={inputs.targetRole}
                onChange={(value) => setInputs((current) => ({ ...current, targetRole: value }))}
              />
              <Field
                icon={Clock3}
                label="Preferred overlap"
                value={inputs.timezone}
                onChange={(value) => setInputs((current) => ({ ...current, timezone: value }))}
              />
              <Field
                icon={MessageSquareText}
                label="Tools"
                value={inputs.tools}
                onChange={(value) => setInputs((current) => ({ ...current, tools: value }))}
              />
              <Field
                icon={Sparkles}
                label="Async strengths"
                value={inputs.strengths}
                onChange={(value) => setInputs((current) => ({ ...current, strengths: value }))}
              />
              <Field
                icon={MapPin}
                label="Location setup"
                value={inputs.location}
                onChange={(value) => setInputs((current) => ({ ...current, location: value }))}
              />
              <Field
                icon={Link2}
                label="Portfolio proof"
                value={inputs.proof}
                onChange={(value) => setInputs((current) => ({ ...current, proof: value }))}
              />
              <button
                type="button"
                onClick={saveProfile}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <CheckCircle2 size={16} />
                Save remote profile
              </button>
            </div>
          </div>

          <div className="surface-card rounded-2xl p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Editable CV output</h2>
                <p className="mt-1 text-sm text-slate-500">Review every suggestion before inserting it into the active CV draft.</p>
              </div>
              <button
                type="button"
                onClick={insertAll}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <PlusCircle size={16} />
                Insert all sections
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DraftBox label="Remote-ready summary" value={summary} onChange={setSummary} onInsert={insertSummary} rows={7} />
              <DraftBox label="Availability statement" value={availability} onChange={setAvailability} onInsert={insertAvailability} rows={7} />
              <DraftBox label="Async proof bullets for portfolio" value={bulletsText} onChange={setBulletsText} onInsert={insertProject} rows={8} />
              <DraftBox label="Remote skills" value={skillsText} onChange={setSkillsText} onInsert={insertSkills} rows={8} />
              <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-3">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project name</span>
                    <input
                      value={projectName}
                      onChange={(event) => setProjectName(event.target.value)}
                      className="form-input"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Portfolio proof description</span>
                    <textarea
                      value={projectDescription}
                      onChange={(event) => setProjectDescription(event.target.value)}
                      rows={3}
                      className="form-textarea"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={insertProject}
                    className="self-end inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    <PlusCircle size={16} />
                    Insert proof
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={insertTargeting}
                className="lg:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                <FileText size={16} />
                Insert remote targeting notes
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900">Curated 2026 guidance</h2>
            <p className="hidden sm:block text-xs font-medium text-slate-500">Career guidance only. Not legal, tax, immigration, or labor-law advice.</p>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {remoteGuideCards.map((card) => (
              <article key={card.title} className="surface-card rounded-2xl p-4">
                <h3 className="text-sm font-bold text-slate-900">{card.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">{card.summary}</p>
                <ul className="mt-3 space-y-2">
                  {card.checklist.map((item) => (
                    <li key={item} className="flex gap-2 text-xs leading-5 text-slate-600">
                      <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-blue-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] font-semibold text-slate-400">{card.updated}</p>
              </article>
            ))}
          </div>
          <p className="sm:hidden mt-3 text-xs font-medium text-slate-500">Career guidance only. Not legal, tax, immigration, or labor-law advice.</p>
        </section>
      </div>
    </main>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon size={14} />
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        className="form-textarea min-h-[68px]"
      />
    </label>
  );
}

function DraftBox({
  label,
  value,
  onChange,
  onInsert,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onInsert: () => void;
  rows: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
        <button
          type="button"
          onClick={onInsert}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <PlusCircle size={13} />
          Insert
        </button>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="form-textarea mt-3"
      />
    </div>
  );
}
