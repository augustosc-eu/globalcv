import { CVData } from '@/types/cv.types';

export interface SectionDiff {
  label: string;
  a: string;
  b: string;
  changed: boolean;
}

function scoreLabel(cv: CVData): string {
  const total = [
    !!cv.personalInfo.firstName,
    !!cv.personalInfo.email,
    !!cv.personalInfo.phone,
    !!cv.personalInfo.linkedIn,
    !!(cv.objective && cv.objective.length >= 40),
    cv.workExperience.length > 0,
    cv.workExperience.some((e) => /\d/.test(e.description)),
    cv.education.length > 0,
    cv.skills.length >= 3,
  ];
  const score = Math.round((total.filter(Boolean).length / total.length) * 100);
  return `${score}% ATS ready`;
}

function listSummary(items: { name?: string; title?: string; company?: string; institution?: string; degree?: string }[], limit = 4): string {
  return items
    .slice(0, limit)
    .map((i) => i.name ?? i.title ?? i.degree ?? i.company ?? i.institution ?? '')
    .filter(Boolean)
    .join(', ') || '—';
}

export function diffCV(a: CVData, b: CVData): SectionDiff[] {
  const sections: SectionDiff[] = [
    {
      label: 'Name',
      a: `${a.personalInfo.firstName} ${a.personalInfo.lastName}`.trim() || '—',
      b: `${b.personalInfo.firstName} ${b.personalInfo.lastName}`.trim() || '—',
      changed: false,
    },
    {
      label: 'Template',
      a: a.templateId || '—',
      b: b.templateId || '—',
      changed: false,
    },
    {
      label: 'Summary',
      a: a.objective ? `${a.objective.slice(0, 100)}${a.objective.length > 100 ? '…' : ''}` : '—',
      b: b.objective ? `${b.objective.slice(0, 100)}${b.objective.length > 100 ? '…' : ''}` : '—',
      changed: false,
    },
    {
      label: 'Work experience',
      a: `${a.workExperience.length} entries${a.workExperience.length > 0 ? ': ' + listSummary(a.workExperience) : ''}`,
      b: `${b.workExperience.length} entries${b.workExperience.length > 0 ? ': ' + listSummary(b.workExperience) : ''}`,
      changed: false,
    },
    {
      label: 'Education',
      a: `${a.education.length} entries${a.education.length > 0 ? ': ' + listSummary(a.education) : ''}`,
      b: `${b.education.length} entries${b.education.length > 0 ? ': ' + listSummary(b.education) : ''}`,
      changed: false,
    },
    {
      label: 'Skills',
      a: listSummary(a.skills, 6) || '—',
      b: listSummary(b.skills, 6) || '—',
      changed: false,
    },
    {
      label: 'Projects',
      a: `${(a.projects ?? []).length}${(a.projects ?? []).length > 0 ? ': ' + listSummary(a.projects) : ''}`,
      b: `${(b.projects ?? []).length}${(b.projects ?? []).length > 0 ? ': ' + listSummary(b.projects) : ''}`,
      changed: false,
    },
    {
      label: 'Languages',
      a: `${a.languages.length} language${a.languages.length !== 1 ? 's' : ''}${a.languages.length > 0 ? ': ' + a.languages.slice(0, 4).map((l) => l.language).join(', ') : ''}`,
      b: `${b.languages.length} language${b.languages.length !== 1 ? 's' : ''}${b.languages.length > 0 ? ': ' + b.languages.slice(0, 4).map((l) => l.language).join(', ') : ''}`,
      changed: false,
    },
    {
      label: 'Certifications',
      a: `${a.certifications.length}${a.certifications.length > 0 ? ': ' + listSummary(a.certifications) : ''}`,
      b: `${b.certifications.length}${b.certifications.length > 0 ? ': ' + listSummary(b.certifications) : ''}`,
      changed: false,
    },
    {
      label: 'Target role',
      a: a.targetRole || '—',
      b: b.targetRole || '—',
      changed: false,
    },
    {
      label: 'Style',
      a: `${a.fontFamily ?? 'inter'}${a.qrCodeEnabled ? ', QR on' : ', QR off'}`,
      b: `${b.fontFamily ?? 'inter'}${b.qrCodeEnabled ? ', QR on' : ', QR off'}`,
      changed: false,
    },
    {
      label: 'ATS readiness',
      a: scoreLabel(a),
      b: scoreLabel(b),
      changed: false,
    },
  ];

  return sections.map((s) => ({ ...s, changed: s.a !== s.b }));
}
