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

export default function USModernRenderer({ cv, config }: Props) {
  const { personalInfo: p, workExperience, education, skills, languages, certifications, objective } = cv;
  const theme = getActiveTheme(cv, config);
  const accent = theme.primary;
  const light = theme.light;

  return (
    <div className="font-sans text-[10px] leading-relaxed min-h-[1056px] flex" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Sidebar */}
      <div className="w-[30%] flex-shrink-0 text-white p-5 space-y-5" style={{ backgroundColor: accent }}>
        {p.photo && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.photo} alt="" className="w-20 h-24 object-cover rounded border-2 border-white/40 flex-shrink-0" />
          </div>
        )}
        {/* Name in sidebar */}
        <div>
          <h1 className="text-base font-bold leading-tight tracking-tight text-white">
            {p.firstName}<br />{p.lastName}
          </h1>
        </div>

        {/* Contact */}
        <SideSection title="CONTACT">
          <div className="space-y-1 text-[9px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {p.email && <p className="break-all">{p.email}</p>}
            {p.phone && <p>{p.phone}</p>}
            {p.address?.city && <p>{p.address.city}{p.address.state ? `, ${p.address.state}` : ''}</p>}
            {p.linkedIn && <p className="break-all">{p.linkedIn}</p>}
            {p.website && <p className="break-all">{p.website}</p>}
          </div>
        </SideSection>

        {/* Skills */}
        {skills.length > 0 && (
          <SideSection title="SKILLS">
            <div className="space-y-1">
              {skills.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full flex-shrink-0 bg-white opacity-70" />
                  <span style={{ color: 'rgba(255,255,255,0.9)' }}>{s.name}</span>
                </div>
              ))}
            </div>
          </SideSection>
        )}

        {/* Languages */}
        {languages.length > 0 && (
          <SideSection title="LANGUAGES">
            <div className="space-y-1">
              {languages.map((l) => (
                <div key={l.id}>
                  <p className="font-semibold text-white">{l.language}</p>
                  <p style={{ color: 'rgba(255,255,255,0.7)' }}>{l.isNative ? 'Native' : l.proficiency}</p>
                </div>
              ))}
            </div>
          </SideSection>
        )}

        {/* Certifications in sidebar */}
        {certifications.length > 0 && (
          <SideSection title="CERTIFICATIONS">
            <div className="space-y-1.5">
              {certifications.map((c) => (
                <div key={c.id}>
                  <p className="font-semibold text-white leading-tight">{c.name}</p>
                  {c.issuer && <p style={{ color: 'rgba(255,255,255,0.7)' }}>{c.issuer}</p>}
                  {c.dateIssued && <p style={{ color: 'rgba(255,255,255,0.6)' }}>{fmtDate(c.dateIssued)}</p>}
                </div>
              ))}
            </div>
          </SideSection>
        )}
      </div>

      {/* Main column */}
      <div className="flex-1 p-6 space-y-5">
        {/* Summary */}
        {objective && (
          <MainSection title="PROFESSIONAL SUMMARY" accent={accent} light={light}>
            <p className="text-gray-700 leading-relaxed">{objective}</p>
          </MainSection>
        )}

        {/* Work Experience */}
        {workExperience.length > 0 && (
          <MainSection title="WORK EXPERIENCE" accent={accent} light={light}>
            <div className="space-y-4">
              {workExperience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between items-baseline gap-2">
                    <p className="font-bold text-gray-900 leading-tight">{exp.title}</p>
                    <span className="text-[9px] text-gray-500 flex-shrink-0">{dateRange(exp.startDate, exp.endDate, exp.isPresent)}</span>
                  </div>
                  {exp.company && <p className="font-medium text-[9px]" style={{ color: accent }}>{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>}
                  {exp.description && <p className="text-gray-700 mt-1 whitespace-pre-line">{exp.description}</p>}
                </div>
              ))}
            </div>
          </MainSection>
        )}

        {/* Education */}
        {education.length > 0 && (
          <MainSection title="EDUCATION" accent={accent} light={light}>
            <div className="space-y-3">
              {education.map((edu) => (
                <div key={edu.id}>
                  <div className="flex justify-between items-baseline gap-2">
                    <p className="font-bold text-gray-900 leading-tight">
                      {edu.degree}{edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}
                    </p>
                    <span className="text-[9px] text-gray-500 flex-shrink-0">{dateRange(edu.startDate, edu.endDate, edu.isPresent)}</span>
                  </div>
                  <p className="text-[9px]" style={{ color: accent }}>{edu.institution}</p>
                  {edu.gpa && <p className="text-gray-500">GPA: {edu.gpa}</p>}
                </div>
              ))}
            </div>
          </MainSection>
        )}
      </div>
    </div>
  );
}

function SideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[8px] font-black tracking-widest mb-1.5 pb-0.5 border-b border-white/30 text-white/80 uppercase">{title}</p>
      {children}
    </div>
  );
}

function MainSection({ title, accent, light, children }: { title: string; accent: string; light: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-[9px] font-black tracking-widest whitespace-nowrap" style={{ color: accent }}>{title}</h2>
        <div className="flex-1 h-px" style={{ backgroundColor: accent + '40' }} />
      </div>
      {children}
    </div>
  );
}
