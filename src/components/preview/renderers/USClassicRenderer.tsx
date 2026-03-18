import { CVData } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import { format } from 'date-fns';
import { getActiveTheme } from '@/lib/utils/theme';

interface Props { cv: CVData; config: MarketConfig; }

function fmtDate(ym?: string): string {
  if (!ym) return '';
  try { return format(new Date(ym + '-01'), 'MMM yyyy'); }
  catch { return ym; }
}

function dateRange(start: string, end?: string, isPresent?: boolean): string {
  if (!start) return '';
  return `${fmtDate(start)} – ${isPresent ? 'Present' : fmtDate(end)}`;
}

export default function USClassicRenderer({ cv, config }: Props) {
  const { personalInfo: p, workExperience, education, skills, languages, certifications, objective } = cv;
  const theme = getActiveTheme(cv, config);
  const accent = theme.primary;

  return (
    <div className="font-sans text-gray-900 text-[11px] leading-relaxed p-8 min-h-[1056px]" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="text-center mb-5 pb-4 border-b-2" style={{ borderColor: accent }}>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: accent }}>
          {p.firstName} {p.lastName}
        </h1>
        <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-1 mt-2 text-gray-600 text-[10px]">
          {p.email && <span>{p.email}</span>}
          {p.phone && <><span>·</span><span>{p.phone}</span></>}
          {p.address?.city && <><span>·</span><span>{p.address.city}{p.address.state ? `, ${p.address.state}` : ''}</span></>}
          {p.linkedIn && <><span>·</span><span>{p.linkedIn}</span></>}
          {p.website && <><span>·</span><span>{p.website}</span></>}
        </div>
      </div>

      {/* Summary */}
      {objective && (
        <Section title="PROFESSIONAL SUMMARY" accent={accent}>
          <p className="text-gray-700 leading-relaxed">{objective}</p>
        </Section>
      )}

      {/* Work Experience */}
      {workExperience.length > 0 && (
        <Section title="WORK EXPERIENCE" accent={accent}>
          <div className="space-y-4">
            {workExperience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="font-bold text-gray-900">{exp.title}</span>
                    {exp.company && <span className="text-gray-600"> · {exp.company}</span>}
                  </div>
                  <span className="text-gray-500 text-[10px] flex-shrink-0 ml-2">{dateRange(exp.startDate, exp.endDate, exp.isPresent)}</span>
                </div>
                {exp.location && <p className="text-gray-500 text-[10px]">{exp.location}</p>}
                {exp.description && (
                  <div className="mt-1 text-gray-700 whitespace-pre-line">{exp.description}</div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <Section title="EDUCATION" accent={accent}>
          <div className="space-y-3">
            {education.map((edu) => (
              <div key={edu.id}>
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="font-bold">{edu.degree}</span>
                    {edu.fieldOfStudy && <span className="text-gray-600">, {edu.fieldOfStudy}</span>}
                  </div>
                  <span className="text-gray-500 text-[10px] flex-shrink-0 ml-2">{dateRange(edu.startDate, edu.endDate, edu.isPresent)}</span>
                </div>
                <p className="text-gray-600">{edu.institution}{edu.location ? ` · ${edu.location}` : ''}</p>
                {edu.gpa && <p className="text-gray-500">GPA: {edu.gpa}</p>}
                {edu.honors && <p className="text-gray-500">{edu.honors}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <Section title="SKILLS" accent={accent}>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span key={s.id} className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">{s.name}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Languages */}
      {languages.length > 0 && (
        <Section title="LANGUAGES" accent={accent}>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {languages.map((l) => (
              <span key={l.id} className="text-gray-700">
                <strong>{l.language}</strong>
                {l.isNative ? ' (Native)' : ` · ${l.proficiency}`}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <Section title="CERTIFICATIONS" accent={accent}>
          <div className="space-y-1">
            {certifications.map((c) => (
              <div key={c.id} className="flex justify-between">
                <span><strong>{c.name}</strong>{c.issuer ? ` · ${c.issuer}` : ''}</span>
                {c.dateIssued && <span className="text-gray-500 text-[10px]">{fmtDate(c.dateIssued)}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-[10px] font-black tracking-widest mb-2 pb-0.5 border-b" style={{ color: accent, borderColor: accent }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
