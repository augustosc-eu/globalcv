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

const cefrDescriptions: Record<string, string> = {
  A1: 'Basic User', A2: 'Basic User',
  B1: 'Independent User', B2: 'Independent User',
  C1: 'Proficient User', C2: 'Proficient User',
};

export default function EUEuropassRenderer({ cv, config }: Props) {
  const { personalInfo: p } = cv;
  const theme = getActiveTheme(cv, config);
  const accent = theme.primary; // indigo

  return (
    <div className="font-sans text-[10px] leading-relaxed min-h-[1190px]" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Blue header bar */}
      <div className="px-8 py-6 text-white flex items-start gap-5" style={{ backgroundColor: accent }}>
        {p.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photo} alt="" className="w-20 h-20 object-cover rounded border-2 border-white/40 flex-shrink-0" />
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight">{p.firstName} {p.lastName}</h1>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-indigo-100 text-[9px]">
            {p.email && <span>✉ {p.email}</span>}
            {p.phone && <span>📞 {p.phone}</span>}
            {p.address?.city && <span>📍 {p.address.city}, {p.address.country}</span>}
            {p.linkedIn && <span>🔗 {p.linkedIn}</span>}
            {p.dateOfBirth && <span>🎂 {p.dateOfBirth}</span>}
            {p.nationality && <span>🌍 {p.nationality}</span>}
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* Personal statement */}
        {cv.objective && (
          <EUSection title="Personal Statement" accent={accent}>
            <p className="text-gray-700 leading-relaxed">{cv.objective}</p>
          </EUSection>
        )}

        {/* Work Experience */}
        {cv.workExperience.length > 0 && (
          <EUSection title="Work Experience" accent={accent}>
            {cv.workExperience.map((exp) => (
              <div key={exp.id} className="grid grid-cols-[100px_1fr] gap-3 mb-3">
                <div className="text-gray-500 text-[9px] pt-0.5">{dateRange(exp.startDate, exp.endDate, exp.isPresent)}</div>
                <div>
                  <p className="font-bold text-gray-900">{exp.title}</p>
                  <p className="text-gray-600">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>
                  {exp.description && <p className="text-gray-700 mt-1 whitespace-pre-line">{exp.description}</p>}
                </div>
              </div>
            ))}
          </EUSection>
        )}

        {/* Education */}
        {cv.education.length > 0 && (
          <EUSection title="Education & Training" accent={accent}>
            {cv.education.map((edu) => (
              <div key={edu.id} className="grid grid-cols-[100px_1fr] gap-3 mb-3">
                <div className="text-gray-500 text-[9px] pt-0.5">{dateRange(edu.startDate, edu.endDate, edu.isPresent)}</div>
                <div>
                  <p className="font-bold">{edu.degree}{edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}</p>
                  <p className="text-gray-600">{edu.institution}</p>
                  {edu.gpa && <p className="text-gray-500">Grade: {edu.gpa}</p>}
                  {edu.honors && <p className="text-gray-500">{edu.honors}</p>}
                </div>
              </div>
            ))}
          </EUSection>
        )}

        {/* Languages — CEFR grid */}
        {cv.languages.length > 0 && (
          <EUSection title="Language Skills" accent={accent}>
            <table className="w-full text-[9px] border-collapse">
              <thead>
                <tr style={{ backgroundColor: accent }} className="text-white">
                  <th className="text-left px-2 py-1">Language</th>
                  <th className="px-2 py-1">Level</th>
                  <th className="px-2 py-1 text-[8px]">Listening</th>
                  <th className="px-2 py-1 text-[8px]">Reading</th>
                  <th className="px-2 py-1 text-[8px]">Speaking</th>
                  <th className="px-2 py-1 text-[8px]">Writing</th>
                </tr>
              </thead>
              <tbody>
                {cv.languages.map((l, i) => {
                  const level = l.isNative ? 'C2' : (l.proficiency as string);
                  return (
                    <tr key={l.id} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="px-2 py-1 font-medium">{l.language}</td>
                      <td className="px-2 py-1 text-center font-bold" style={{ color: accent }}>{l.isNative ? 'Native' : level}</td>
                      <td className="px-2 py-1 text-center text-gray-500">{level}</td>
                      <td className="px-2 py-1 text-center text-gray-500">{level}</td>
                      <td className="px-2 py-1 text-center text-gray-500">{level}</td>
                      <td className="px-2 py-1 text-center text-gray-500">{level}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-[8px] text-gray-400 mt-1">Levels: A1/A2: Basic user · B1/B2: Independent user · C1/C2: Proficient user (CEFR)</p>
          </EUSection>
        )}

        {/* Skills */}
        {cv.skills.length > 0 && (
          <EUSection title="Digital & Technical Skills" accent={accent}>
            <div className="flex flex-wrap gap-1.5">
              {cv.skills.map((s) => (
                <span key={s.id} className="px-2 py-0.5 border border-gray-200 rounded text-gray-700">{s.name}</span>
              ))}
            </div>
          </EUSection>
        )}

        {/* Certifications */}
        {cv.certifications.length > 0 && (
          <EUSection title="Courses & Certifications" accent={accent}>
            {cv.certifications.map((c) => (
              <div key={c.id} className="grid grid-cols-[100px_1fr] gap-3 mb-1">
                <div className="text-gray-500 text-[9px]">{fmtDate(c.dateIssued)}</div>
                <div><strong>{c.name}</strong>{c.issuer ? ` · ${c.issuer}` : ''}</div>
              </div>
            ))}
          </EUSection>
        )}

        {/* References */}
        {cv.references.length > 0 && (
          <EUSection title="References" accent={accent}>
            <div className="grid grid-cols-2 gap-4">
              {cv.references.map((r) => (
                <div key={r.id}>
                  <p className="font-bold">{r.name}</p>
                  <p className="text-gray-600">{r.title}, {r.company}</p>
                  {r.email && <p className="text-gray-500">{r.email}</p>}
                  {r.phone && <p className="text-gray-500">{r.phone}</p>}
                </div>
              ))}
            </div>
          </EUSection>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-3 text-[8px] text-gray-400 border-t border-gray-200 flex justify-between">
        <span>Curriculum Vitae — {p.firstName} {p.lastName}</span>
        <span>GlobalCV by Augusto Santa Cruz</span>
      </div>
    </div>
  );
}

function EUSection({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>{title}</h2>
        <div className="flex-1 h-px" style={{ backgroundColor: accent + '40' }} />
      </div>
      {children}
    </div>
  );
}
