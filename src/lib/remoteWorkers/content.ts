import type { RemoteWorkMode } from '@/types/cv.types';

export type RemotePath = RemoteWorkMode;

export interface RemoteGuideCard {
  title: string;
  summary: string;
  checklist: string[];
  updated: string;
}

export interface RemoteGeneratedDraft {
  summary: string;
  availability: string;
  bullets: string[];
  skills: string[];
  projectName: string;
  projectRole: string;
  projectDescription: string;
  targetNotes: string;
}

export const remotePathLabels: Record<RemotePath, string> = {
  remote_employee: 'Remote employee',
  freelance: 'Freelance client work',
  both: 'Global portfolio',
};

export const remotePathDescriptions: Record<RemotePath, string> = {
  remote_employee: 'Position your CV for distributed teams, async collaboration, and remote-first hiring screens.',
  freelance: 'Turn project outcomes, client trust, and operating habits into a stronger contract pitch.',
  both: 'Create a flexible remote profile that works for job applications, retainers, and project-based opportunities.',
};

export const remoteGuideCards: RemoteGuideCard[] = [
  {
    title: 'Remote hiring expectations',
    summary: 'In 2026, remote hiring signals are less about where you work and more about how reliably you create visibility, momentum, and handoffs.',
    checklist: [
      'Show async ownership, not just "remote experience".',
      'Name collaboration rhythms such as written updates, decision logs, demos, and handoffs.',
      'Tie remote work to measurable outcomes, delivery speed, retention, revenue, or quality.',
    ],
    updated: 'Curated guidance updated Jan 2026',
  },
  {
    title: 'Proof of async communication',
    summary: 'Recruiters and clients look for evidence that you can reduce meetings and keep teams aligned across time zones.',
    checklist: [
      'Mention concise specs, status notes, Loom-style walkthroughs, RFCs, or issue hygiene.',
      'Include examples of cross-functional work with product, design, engineering, support, or clients.',
      'Avoid vague claims like "great communicator" unless the bullet proves the behavior.',
    ],
    updated: 'Curated guidance updated Jan 2026',
  },
  {
    title: 'Portfolio and case-study evidence',
    summary: 'A remote-ready portfolio should prove trust: scope, context, constraints, your role, outcome, and how collaboration happened.',
    checklist: [
      'Add two or three proof links: case study, GitHub, writing sample, dashboard, shipped product, or client result.',
      'Frame projects around outcomes and decision quality rather than screenshots alone.',
      'For confidential work, summarize the problem, role, and anonymized result.',
    ],
    updated: 'Curated guidance updated Jan 2026',
  },
  {
    title: 'Time-zone and availability positioning',
    summary: 'A useful CV sets expectations without sounding unavailable. State overlap windows and communication norms plainly.',
    checklist: [
      'Use overlap windows such as "4+ hours with US Eastern" or "EU mornings to US East mid-day".',
      'Mention travel cadence only when it affects availability or client confidence.',
      'Avoid over-sharing personal logistics that do not help hiring decisions.',
    ],
    updated: 'Curated guidance updated Jan 2026',
  },
  {
    title: 'Digital nomad cautions',
    summary: 'Keep legal, tax, immigration, and employment-status claims off the CV unless the employer specifically requests them.',
    checklist: [
      'Do not imply work authorization, visa status, or tax residency unless it is accurate and relevant.',
      'Use neutral phrasing such as "location-flexible" or "available for agreed overlap hours".',
      'This hub provides career guidance only, not legal, tax, immigration, or labor-law advice.',
    ],
    updated: 'Curated guidance updated Jan 2026',
  },
];

const draftByPath: Record<RemotePath, RemoteGeneratedDraft> = {
  remote_employee: {
    summary:
      'Remote-first professional with a strong record of async execution, clear written updates, and cross-functional delivery across distributed teams. Comfortable creating visibility through concise documentation, outcome-focused communication, and predictable handoffs across time zones.',
    availability:
      'Available for agreed overlap hours, async-first collaboration, and recurring team rituals across distributed teams.',
    bullets: [
      'Led distributed workstreams using written briefs, decision logs, and weekly status updates that kept stakeholders aligned without adding meeting load.',
      'Created reliable async handoffs across time zones by documenting context, risks, owners, and next actions before each transition.',
      'Partnered with remote product, design, engineering, and operations teams to convert ambiguous goals into shipped, measurable outcomes.',
    ],
    skills: [
      'Async collaboration',
      'Remote stakeholder management',
      'Written communication',
      'Distributed team operations',
      'Time-zone handoffs',
    ],
    projectName: 'Remote Operating System',
    projectRole: 'Distributed team contributor',
    projectDescription:
      'Built a repeatable async workflow with written briefs, decision records, status updates, and ownership checkpoints to improve visibility and delivery quality across a distributed team.',
    targetNotes:
      'Target remote-first roles where async communication, written clarity, ownership, and cross-time-zone delivery are explicit hiring signals.',
  },
  freelance: {
    summary:
      'Location-independent freelancer focused on clear scopes, dependable async delivery, and client-visible outcomes. Experienced turning ambiguous client goals into practical milestones, concise updates, and portfolio-ready results without requiring constant synchronous access.',
    availability:
      'Available for async client delivery, scheduled overlap windows, milestone reviews, and written progress updates.',
    bullets: [
      'Managed client projects through written scopes, milestone plans, and status updates that made progress visible across locations.',
      'Translated client goals into deliverables, acceptance criteria, and portfolio-ready outcomes while protecting delivery timelines.',
      'Maintained trust with remote clients through proactive risk notes, concise demos, and clear next-step recommendations.',
    ],
    skills: [
      'Client communication',
      'Scope definition',
      'Async project delivery',
      'Milestone planning',
      'Portfolio storytelling',
    ],
    projectName: 'Remote Client Delivery System',
    projectRole: 'Freelance lead',
    projectDescription:
      'Created a client-facing delivery workflow with scope notes, milestone check-ins, async demos, and outcome summaries to make remote freelance work predictable and easy to trust.',
    targetNotes:
      'Target freelance and contract opportunities where clients value written clarity, dependable milestones, portfolio evidence, and low-meeting delivery.',
  },
  both: {
    summary:
      'Remote-ready professional combining distributed-team discipline with client-facing delivery habits. Strong at creating written clarity, managing async work, and turning location-independent collaboration into visible business outcomes.',
    availability:
      'Available for remote roles, contract projects, agreed overlap windows, and async-first collaboration across global teams.',
    bullets: [
      'Delivered work across distributed teams and client contexts using concise documentation, milestone updates, and explicit ownership.',
      'Improved cross-time-zone collaboration by clarifying context, decisions, risks, and next actions before handoffs.',
      'Built portfolio-ready proof around shipped work, client outcomes, and repeatable async operating habits.',
    ],
    skills: [
      'Remote work strategy',
      'Async communication',
      'Client and stakeholder alignment',
      'Portfolio proof building',
      'Global collaboration',
    ],
    projectName: 'Global Remote Portfolio',
    projectRole: 'Remote contributor and client partner',
    projectDescription:
      'Packaged distributed-team and client work into a portfolio proof system covering scope, role, collaboration model, decisions, and measurable outcomes.',
    targetNotes:
      'Target remote employee and freelance opportunities where global collaboration, async ownership, and portfolio evidence matter.',
  },
};

export function buildRemoteDraft(path: RemotePath, profile: {
  targetRole: string;
  timezone: string;
  tools: string;
  strengths: string;
  location: string;
  proof: string;
}): RemoteGeneratedDraft {
  const base = draftByPath[path];
  const roleText = profile.targetRole.trim();
  const timezoneText = profile.timezone.trim();
  const toolsText = profile.tools.trim();
  const strengthsText = profile.strengths.trim();
  const locationText = profile.location.trim();
  const proofText = profile.proof.trim();

  const summaryPrefix = roleText ? `${roleText} with remote-first operating habits. ` : '';
  const timezoneLine = timezoneText
    ? ` Preferred overlap: ${timezoneText}.`
    : '';
  const toolLine = toolsText ? ` Core tools: ${toolsText}.` : '';
  const strengthLine = strengthsText ? ` Remote strengths: ${strengthsText}.` : '';
  const locationLine = locationText ? ` Location setup: ${locationText}.` : '';
  const proofLine = proofText ? ` Proof links or examples: ${proofText}.` : '';

  return {
    ...base,
    summary: `${summaryPrefix}${base.summary}${strengthLine}${toolLine}`,
    availability: `${base.availability}${timezoneLine}${locationLine}`,
    projectDescription: `${base.projectDescription}${proofLine}`,
    targetNotes: `${base.targetNotes}${timezoneLine}${proofLine}`,
  };
}
