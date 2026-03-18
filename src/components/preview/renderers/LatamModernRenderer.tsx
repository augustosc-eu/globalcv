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
  single: 'Soltero/a', married: 'Casado/a', divorced: 'Divorciado/a', widowed: 'Viudo/a', prefer_not: '-',
};

export default function LatamModernRenderer({ cv, config }: Props) {
  const { personalInfo: p } = cv;
  const theme = getActiveTheme(cv, config);
  const accent = theme.primary;
  const light = theme.light;

  return (
    <div className="font-sans text-[10px] leading-relaxed min-h-[1190px]" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header banner */}
      <div className="px-8 py-6 text-white flex items-center gap-5" style={{ backgroundColor: accent }}>
        {p.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photo} alt="" className="w-20 h-24 object-cover rounded border-2 border-white/40 flex-shrink-0" />
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">{p.firstName} {p.lastName}</h1>
          {(p.address?.city || p.nationality) && (
            <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {[p.address?.city, p.address?.country].filter(Boolean).join(', ')}
              {p.nationality ? ` · ${p.nationality}` : ''}
            </p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-[9px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {p.email && <span>{p.email}</span>}
            {p.phone && <span>{p.phone}</span>}
            {p.linkedIn && <span>{p.linkedIn}</span>}
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-[32%] flex-shrink-0 px-5 py-5 space-y-4 border-r border-gray-100" style={{ backgroundColor: light + '60' }}>
          {/* Personal data */}
          {(p.dateOfBirth || p.maritalStatus || p.idNumber) && (
            <SideBlock title="Datos personales" accent={accent}>
              {p.dateOfBirth && <InfoRow label="Nacimiento" value={p.dateOfBirth} />}
              {p.maritalStatus && <InfoRow label="Est. civil" value={maritalLabels[p.maritalStatus]} />}
              {p.idNumber && <InfoRow label="DNI" value={p.idNumber} />}
            </SideBlock>
          )}

          {/* Skills */}
          {cv.skills.length > 0 && (
            <SideBlock title="Habilidades" accent={accent}>
              <div className="flex flex-wrap gap-1 mt-1">
                {cv.skills.map((s) => (
                  <span key={s.id} className="px-1.5 py-0.5 rounded text-[8px] font-medium" style={{ backgroundColor: accent + '20', color: accent }}>
                    {s.name}
                  </span>
                ))}
              </div>
            </SideBlock>
          )}

          {/* Languages */}
          {cv.languages.length > 0 && (
            <SideBlock title="Idiomas" accent={accent}>
              <div className="space-y-1">
                {cv.languages.map((l) => (
                  <div key={l.id} className="flex justify-between">
                    <span className="font-medium text-gray-800">{l.language}</span>
                    <span className="text-gray-500">{l.isNative ? 'Nativo' : l.proficiency}</span>
                  </div>
                ))}
              </div>
            </SideBlock>
          )}

          {/* Certifications */}
          {cv.certifications.length > 0 && (
            <SideBlock title="Certificaciones" accent={accent}>
              <div className="space-y-1.5">
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

        {/* Main column */}
        <div className="flex-1 px-6 py-5 space-y-4">
          {cv.objective && (
            <MainBlock title="Objetivo Profesional" accent={accent}>
              <p className="text-gray-700 leading-relaxed">{cv.objective}</p>
            </MainBlock>
          )}

          {cv.workExperience.length > 0 && (
            <MainBlock title="Experiencia Laboral" accent={accent}>
              <div className="space-y-4">
                {cv.workExperience.map((exp) => (
                  <div key={exp.id}>
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
            <MainBlock title="Formación Académica" accent={accent}>
              <div className="space-y-3">
                {cv.education.map((edu) => (
                  <div key={edu.id}>
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-gray-900 leading-tight">
                        {edu.degree}{edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}
                      </p>
                      <span className="text-[9px] text-gray-500 flex-shrink-0">{dateRange(edu.startDate, edu.endDate, edu.isPresent)}</span>
                    </div>
                    <p className="text-[9px] mt-0.5" style={{ color: accent }}>{edu.institution}</p>
                    {edu.gpa && <p className="text-gray-500">Promedio: {edu.gpa}</p>}
                  </div>
                ))}
              </div>
            </MainBlock>
          )}

          {cv.references.length > 0 && (
            <MainBlock title="Referencias" accent={accent}>
              <div className="grid grid-cols-2 gap-3">
                {cv.references.map((r) => (
                  <div key={r.id} className="border-l-2 pl-3" style={{ borderColor: accent }}>
                    <p className="font-bold">{r.name}</p>
                    <p className="text-gray-600">{r.title}</p>
                    <p className="text-gray-500">{r.company}</p>
                    {r.phone && <p className="text-gray-500">{r.phone}</p>}
                  </div>
                ))}
              </div>
            </MainBlock>
          )}
        </div>
      </div>
    </div>
  );
}

function SideBlock({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[8px] font-black uppercase tracking-widest mb-1.5" style={{ color: accent }}>{title}</h2>
      <div className="w-full h-px mb-2" style={{ backgroundColor: accent + '40' }} />
      {children}
    </div>
  );
}

function MainBlock({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1 text-[9px]">
      <span className="text-gray-500 flex-shrink-0">{label}:</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}
