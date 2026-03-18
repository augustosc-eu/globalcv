import { CVData } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import { format } from 'date-fns';
import { getActiveTheme } from '@/lib/utils/theme';

interface Props { cv: CVData; config: MarketConfig; }

function fmtDate(ym?: string): string {
  if (!ym) return '';
  try { return format(new Date(ym + '-01'), 'MM/yyyy'); }
  catch { return ym; }
}

function dateRange(start: string, end?: string, isPresent?: boolean): string {
  if (!start) return '';
  return `${fmtDate(start)} – ${isPresent ? 'Present' : fmtDate(end)}`;
}

export default function EUModernRenderer({ cv, config }: Props) {
  const { personalInfo: p } = cv;
  const theme = getActiveTheme(cv, config);
  const accent = theme.primary;

  return (
    <div className="font-sans text-[10px] leading-relaxed min-h-[1190px]" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Full-width colored header */}
      <div className="px-8 py-7 text-white" style={{ backgroundColor: accent }}>
        <div className="flex items-center gap-5">
          {p.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photo} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white/50 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">{p.firstName} {p.lastName}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[9px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {p.email && <span>{p.email}</span>}
              {p.phone && <span>{p.phone}</span>}
              {p.address?.city && <span>{p.address.city}{p.address.country ? `, ${p.address.country}` : ''}</span>}
              {p.nationality && <span>{p.nationality}</span>}
              {p.linkedIn && <span>{p.linkedIn}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex">
        {/* Left narrow column */}
        <div className="w-[35%] flex-shrink-0 bg-gray-50 px-5 py-6 space-y-5 border-r border-gray-100">
          {/* Personal info */}
          {(p.dateOfBirth || p.maritalStatus || p.nationality) && (
            <SideBlock title="Personal" accent={accent}>
              {p.dateOfBirth && <InfoLine label="Born" value={p.dateOfBirth} />}
              {p.nationality && <InfoLine label="Nationality" value={p.nationality} />}
            </SideBlock>
          )}

          {/* Skills */}
          {cv.skills.length > 0 && (
            <SideBlock title="Skills" accent={accent}>
              <div className="flex flex-wrap gap-1 mt-1">
                {cv.skills.map((s) => (
                  <span key={s.id} className="px-1.5 py-0.5 text-[8px] rounded" style={{ backgroundColor: accent + '18', color: accent }}>{s.name}</span>
                ))}
              </div>
            </SideBlock>
          )}

          {/* Languages */}
          {cv.languages.length > 0 && (
            <SideBlock title="Languages" accent={accent}>
              <div className="space-y-1.5 mt-1">
                {cv.languages.map((l) => (
                  <div key={l.id} className="flex justify-between items-center">
                    <span className="text-gray-800">{l.language}</span>
                    <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: accent + '20', color: accent }}>
                      {l.isNative ? 'Native' : l.proficiency}
                    </span>
                  </div>
                ))}
              </div>
            </SideBlock>
          )}

          {/* Certifications */}
          {cv.certifications.length > 0 && (
            <SideBlock title="Courses & Certs" accent={accent}>
              <div className="space-y-1.5 mt-1">
                {cv.certifications.map((c) => (
                  <div key={c.id}>
                    <p className="font-semibold text-gray-800 leading-tight">{c.name}</p>
                    {c.issuer && <p className="text-gray-500">{c.issuer}</p>}
                    {c.dateIssued && <p className="text-gray-400">{fmtDate(c.dateIssued)}</p>}
                  </div>
                ))}
              </div>
            </SideBlock>
          )}
        </div>

        {/* Right main column */}
        <div className="flex-1 px-6 py-6 space-y-5">
          {cv.objective && (
            <MainBlock title="Profile" accent={accent}>
              <p className="text-gray-700 leading-relaxed">{cv.objective}</p>
            </MainBlock>
          )}

          {cv.workExperience.length > 0 && (
            <MainBlock title="Work Experience" accent={accent}>
              <div className="space-y-4">
                {cv.workExperience.map((exp) => (
                  <div key={exp.id} className="border-l-2 pl-3" style={{ borderColor: accent + '60' }}>
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-gray-900 leading-tight">{exp.title}</p>
                      <span className="text-[9px] text-gray-500 flex-shrink-0">{dateRange(exp.startDate, exp.endDate, exp.isPresent)}</span>
                    </div>
                    {exp.company && <p className="font-medium text-[9px] mt-0.5" style={{ color: accent }}>{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>}
                    {exp.description && <p className="text-gray-700 mt-1 whitespace-pre-line">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </MainBlock>
          )}

          {cv.education.length > 0 && (
            <MainBlock title="Education & Training" accent={accent}>
              <div className="space-y-3">
                {cv.education.map((edu) => (
                  <div key={edu.id} className="border-l-2 pl-3" style={{ borderColor: accent + '60' }}>
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-gray-900 leading-tight">
                        {edu.degree}{edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}
                      </p>
                      <span className="text-[9px] text-gray-500 flex-shrink-0">{dateRange(edu.startDate, edu.endDate, edu.isPresent)}</span>
                    </div>
                    <p className="text-[9px] mt-0.5" style={{ color: accent }}>{edu.institution}</p>
                    {edu.gpa && <p className="text-gray-500">Grade: {edu.gpa}</p>}
                  </div>
                ))}
              </div>
            </MainBlock>
          )}

          {cv.references.length > 0 && (
            <MainBlock title="References" accent={accent}>
              <div className="grid grid-cols-2 gap-3">
                {cv.references.map((r) => (
                  <div key={r.id}>
                    <p className="font-bold">{r.name}</p>
                    <p className="text-gray-600">{r.title}, {r.company}</p>
                    {r.email && <p className="text-gray-500">{r.email}</p>}
                  </div>
                ))}
              </div>
            </MainBlock>
          )}
        </div>
      </div>

      <div className="px-8 py-2 text-[8px] text-gray-400 border-t border-gray-200 flex justify-between">
        <span>Curriculum Vitae — {p.firstName} {p.lastName}</span>
        <span>GlobalCV by Augusto Santa Cruz</span>
      </div>
    </div>
  );
}

function SideBlock({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: accent }}>{title}</h2>
      <div className="w-full h-px mb-2" style={{ backgroundColor: accent + '40' }} />
      {children}
    </div>
  );
}

function MainBlock({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: accent }}>{title}</h2>
      <div className="w-full h-px mb-3" style={{ backgroundColor: accent + '30' }} />
      {children}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1 text-[9px]">
      <span className="text-gray-500 flex-shrink-0">{label}:</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}
