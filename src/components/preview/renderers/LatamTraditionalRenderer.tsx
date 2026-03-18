import { CVData, MaritalStatus } from '@/types/cv.types';
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
  return `${fmtDate(start)} – ${isPresent ? 'Actualidad' : fmtDate(end)}`;
}

const maritalLabels: Record<MaritalStatus, string> = {
  single: 'Soltero/a',
  married: 'Casado/a',
  divorced: 'Divorciado/a',
  widowed: 'Viudo/a',
  prefer_not: '-',
};

export default function LatamTraditionalRenderer({ cv, config }: Props) {
  const { personalInfo: p } = cv;
  const theme = getActiveTheme(cv, config);
  const accent = theme.primary;

  return (
    <div className="font-sans text-[10px] leading-relaxed min-h-[1190px]" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header with optional photo */}
      <div className="px-8 pt-8 pb-5 border-b-4" style={{ borderColor: accent }}>
        <div className="flex items-start gap-6">
          {p.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photo} alt="" className="w-24 h-32 object-cover border border-gray-300 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ color: accent }}>{p.firstName} {p.lastName}</h1>

            {/* Personal data table */}
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[9px]">
              {p.dateOfBirth && <InfoRow label="Fecha de nacimiento" value={p.dateOfBirth} />}
              {p.nationality && <InfoRow label="Nacionalidad" value={p.nationality} />}
              {p.maritalStatus && <InfoRow label="Estado civil" value={maritalLabels[p.maritalStatus]} />}
              {p.idNumber && <InfoRow label="DNI / Documento" value={p.idNumber} />}
              {p.address?.city && <InfoRow label="Ciudad" value={`${p.address.city}${p.address.country ? `, ${p.address.country}` : ''}`} />}
              {p.email && <InfoRow label="Email" value={p.email} />}
              {p.phone && <InfoRow label="Teléfono" value={p.phone} />}
              {p.linkedIn && <InfoRow label="LinkedIn" value={p.linkedIn} />}
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* Objective */}
        {cv.objective && (
          <LatamSection title="Objetivo Profesional" accent={accent}>
            <p className="text-gray-700 leading-relaxed">{cv.objective}</p>
          </LatamSection>
        )}

        {/* Work Experience */}
        {cv.workExperience.length > 0 && (
          <LatamSection title="Experiencia Laboral" accent={accent}>
            <div className="space-y-4">
              {cv.workExperience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900">{exp.title}</p>
                      <p className="text-gray-600 font-medium">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>
                    </div>
                    <span className="text-gray-500 text-[9px] flex-shrink-0 ml-2 mt-0.5">{dateRange(exp.startDate, exp.endDate, exp.isPresent)}</span>
                  </div>
                  {exp.description && <p className="text-gray-700 mt-1 whitespace-pre-line">{exp.description}</p>}
                </div>
              ))}
            </div>
          </LatamSection>
        )}

        {/* Education */}
        {cv.education.length > 0 && (
          <LatamSection title="Formación Académica" accent={accent}>
            <div className="space-y-3">
              {cv.education.map((edu) => (
                <div key={edu.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{edu.degree}{edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}</p>
                      <p className="text-gray-600">{edu.institution}{edu.location ? ` · ${edu.location}` : ''}</p>
                      {edu.gpa && <p className="text-gray-500">Promedio: {edu.gpa}</p>}
                    </div>
                    <span className="text-gray-500 text-[9px] flex-shrink-0 ml-2">{dateRange(edu.startDate, edu.endDate, edu.isPresent)}</span>
                  </div>
                </div>
              ))}
            </div>
          </LatamSection>
        )}

        {/* Skills */}
        {cv.skills.length > 0 && (
          <LatamSection title="Habilidades" accent={accent}>
            <div className="flex flex-wrap gap-1.5">
              {cv.skills.map((s) => (
                <span key={s.id} className="px-2 py-0.5 border rounded text-gray-700" style={{ borderColor: accent + '60' }}>{s.name}</span>
              ))}
            </div>
          </LatamSection>
        )}

        {/* Languages */}
        {cv.languages.length > 0 && (
          <LatamSection title="Idiomas" accent={accent}>
            <div className="space-y-1">
              {cv.languages.map((l) => (
                <div key={l.id} className="flex items-center gap-3">
                  <span className="font-medium w-24">{l.language}</span>
                  <span className="text-gray-600">{l.isNative ? 'Nativo' : l.proficiency}</span>
                  {l.certification && <span className="text-gray-500">({l.certification})</span>}
                </div>
              ))}
            </div>
          </LatamSection>
        )}

        {/* Certifications */}
        {cv.certifications.length > 0 && (
          <LatamSection title="Certificaciones" accent={accent}>
            <div className="space-y-1">
              {cv.certifications.map((c) => (
                <div key={c.id} className="flex justify-between">
                  <span><strong>{c.name}</strong>{c.issuer ? ` — ${c.issuer}` : ''}</span>
                  {c.dateIssued && <span className="text-gray-500">{fmtDate(c.dateIssued)}</span>}
                </div>
              ))}
            </div>
          </LatamSection>
        )}

        {/* References */}
        {cv.references.length > 0 && (
          <LatamSection title="Referencias" accent={accent}>
            <div className="grid grid-cols-2 gap-4">
              {cv.references.map((r) => (
                <div key={r.id} className="border-l-2 pl-3" style={{ borderColor: accent }}>
                  <p className="font-bold">{r.name}</p>
                  <p className="text-gray-600">{r.title}</p>
                  <p className="text-gray-600">{r.company}</p>
                  {r.phone && <p className="text-gray-500">{r.phone}</p>}
                  {r.email && <p className="text-gray-500">{r.email}</p>}
                </div>
              ))}
            </div>
          </LatamSection>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <span className="text-gray-500 flex-shrink-0">{label}:</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}

function LatamSection({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-4 rounded flex-shrink-0" style={{ backgroundColor: accent }} />
        <h2 className="font-black uppercase tracking-wide text-[10px]" style={{ color: accent }}>{title}</h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      {children}
    </div>
  );
}
