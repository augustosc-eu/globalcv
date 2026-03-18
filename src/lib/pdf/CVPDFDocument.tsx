import { Document, Font, Image, Page, Text, View } from '@react-pdf/renderer';

// ─── Japanese font (Noto Sans JP via Google Fonts CDN — TTF) ─────────────────
// Loaded once and cached by the PDF renderer on first Japanese export.
Font.register({
  family: 'JP',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj35TS1g.ttf', fontWeight: 'normal' },
    { src: 'https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFPYk35TS1g.ttf', fontWeight: 'bold' },
  ],
});
import { CVData } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import { getActiveTheme } from '@/lib/utils/theme';

interface Props { cv: CVData; config: MarketConfig; }

function fmtDate(ym?: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1] ?? ''} ${y}`;
}

function dr(start: string, end?: string, isPresent?: boolean): string {
  if (!start) return '';
  return `${fmtDate(start)} – ${isPresent ? 'Present' : fmtDate(end)}`;
}

// ─── Typography scale (industry-standard CV) ──────────────────────────────────
// Body: 10pt / lineHeight 1.3   Secondary: 9pt   Labels: 8.5pt   Name: 20pt
// Section titles: 9pt bold uppercase   Entry titles: 10pt bold
// Margins: 40pt sides, 36pt top/bottom   Entry gap: 10pt   Section gap: 14pt

const T = {
  // font families
  regular: 'Helvetica',
  bold:    'Helvetica-Bold',
  // sizes
  name:    20,
  section: 9,    // section heading uppercase
  body:    10,   // entry titles, body text
  meta:    9,    // company, institution, dates
  small:   8.5,  // sidebar labels, tiny info
  // line heights
  lhBody:  1.35, // paragraph descriptions
  lhTight: 1.2,  // headings, labels
  // colours
  dark:    '#111827',
  mid:     '#4b5563',
  muted:   '#9ca3af',
  white:   '#ffffff',
  // spacing
  sectionGap:  14, // between major sections
  entryGap:    10, // between entries within a section
  intraGap:    3,  // between lines within an entry
  titleGap:    6,  // below section title rule
};

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionHeading({ accent, children }: { accent: string; children: string }) {
  return (
    <View style={{ marginBottom: T.titleGap }}>
      <Text style={{ fontFamily: T.bold, fontSize: T.section, color: accent, textTransform: 'uppercase', letterSpacing: 0.9, lineHeight: T.lhTight }}>
        {children}
      </Text>
      <View style={{ height: 0.75, backgroundColor: accent, marginTop: 3 }} />
    </View>
  );
}

function EntryHeader({ title, right, accent, sub }: { title: string; right?: string; accent?: string; sub?: string }) {
  return (
    <View style={{ marginBottom: sub ? T.intraGap : 0 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ fontFamily: T.bold, fontSize: T.body, color: T.dark, flex: 1, lineHeight: T.lhTight }}>{title}</Text>
        {right && <Text style={{ fontSize: T.meta, color: T.muted, flexShrink: 0, marginLeft: 8, lineHeight: T.lhTight }}>{right}</Text>}
      </View>
      {sub && <Text style={{ fontSize: T.meta, color: accent ?? T.mid, lineHeight: T.lhTight }}>{sub}</Text>}
    </View>
  );
}

function BodyText({ children }: { children: string }) {
  return <Text style={{ fontSize: T.body, color: T.mid, lineHeight: T.lhBody, marginTop: T.intraGap }}>{children}</Text>;
}

// ─── Classic / Traditional ────────────────────────────────────────────────────

export function ClassicPDF({ cv, accent }: { cv: CVData; accent: string }) {
  const p = cv.personalInfo;
  const isA4 = cv.pageSize === 'A4';

  return (
    <Page size={isA4 ? 'A4' : 'LETTER'} style={{ fontFamily: T.regular, fontSize: T.body, color: T.dark, backgroundColor: '#fff', paddingHorizontal: 40, paddingVertical: 36 }}>
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: accent }}>
        <Text style={{ fontFamily: T.bold, fontSize: T.name, color: accent, lineHeight: T.lhTight, marginBottom: 5 }}>
          {p.firstName} {p.lastName}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
          {p.email      && <Text style={{ fontSize: T.meta, color: T.mid, marginHorizontal: 6 }}>{p.email}</Text>}
          {p.phone      && <Text style={{ fontSize: T.meta, color: T.mid, marginHorizontal: 6 }}>{p.phone}</Text>}
          {p.address?.city && <Text style={{ fontSize: T.meta, color: T.mid, marginHorizontal: 6 }}>{p.address.city}{p.address.state ? `, ${p.address.state}` : ''}</Text>}
          {p.linkedIn   && <Text style={{ fontSize: T.meta, color: T.mid, marginHorizontal: 6 }}>{p.linkedIn}</Text>}
        </View>
      </View>

      {cv.objective && (
        <View style={{ marginBottom: T.sectionGap }}>
          <SectionHeading accent={accent}>Professional Summary</SectionHeading>
          <Text style={{ fontSize: T.body, color: T.mid, lineHeight: T.lhBody }}>{cv.objective}</Text>
        </View>
      )}

      {cv.workExperience.length > 0 && (
        <View style={{ marginBottom: T.sectionGap }}>
          <SectionHeading accent={accent}>Work Experience</SectionHeading>
          {cv.workExperience.map((exp, i) => (
            <View key={exp.id} style={{ marginBottom: i < cv.workExperience.length - 1 ? T.entryGap : 0 }}>
              <EntryHeader title={`${exp.title}${exp.company ? ` — ${exp.company}` : ''}`} right={dr(exp.startDate, exp.endDate, exp.isPresent)} accent={accent} sub={exp.location} />
              {exp.description && <BodyText>{exp.description}</BodyText>}
            </View>
          ))}
        </View>
      )}

      {cv.education.length > 0 && (
        <View style={{ marginBottom: T.sectionGap }}>
          <SectionHeading accent={accent}>Education</SectionHeading>
          {cv.education.map((edu, i) => (
            <View key={edu.id} style={{ marginBottom: i < cv.education.length - 1 ? T.entryGap : 0 }}>
              <EntryHeader title={`${edu.degree}${edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}`} right={dr(edu.startDate, edu.endDate, edu.isPresent)} accent={accent} sub={`${edu.institution}${edu.gpa ? `  ·  GPA ${edu.gpa}` : ''}`} />
            </View>
          ))}
        </View>
      )}

      {cv.skills.length > 0 && (
        <View style={{ marginBottom: T.sectionGap }}>
          <SectionHeading accent={accent}>Skills</SectionHeading>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cv.skills.map((s, i) => (
              <Text key={s.id} style={{ fontSize: T.body, color: T.mid, marginRight: 6, lineHeight: 1.5 }}>
                {s.name}{i < cv.skills.length - 1 ? '  /' : ''}
              </Text>
            ))}
          </View>
        </View>
      )}

      {cv.languages.length > 0 && (
        <View style={{ marginBottom: T.sectionGap }}>
          <SectionHeading accent={accent}>Languages</SectionHeading>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cv.languages.map((l) => (
              <Text key={l.id} style={{ fontSize: T.body, color: T.mid, marginRight: 20, lineHeight: 1.5 }}>
                {l.language}: <Text style={{ color: accent }}>{l.isNative ? 'Native' : l.proficiency}</Text>
              </Text>
            ))}
          </View>
        </View>
      )}

      {cv.certifications.length > 0 && (
        <View style={{ marginBottom: T.sectionGap }}>
          <SectionHeading accent={accent}>Certifications</SectionHeading>
          {cv.certifications.map((c, i) => (
            <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: i < cv.certifications.length - 1 ? 5 : 0 }}>
              <Text style={{ fontSize: T.body, color: T.dark }}>{c.name}{c.issuer ? <Text style={{ color: T.mid }}> — {c.issuer}</Text> : ''}</Text>
              {c.dateIssued && <Text style={{ fontSize: T.meta, color: T.muted, flexShrink: 0, marginLeft: 8 }}>{fmtDate(c.dateIssued)}</Text>}
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}

// ─── Modern two-column (US Modern / Latam Modern) ─────────────────────────────
// Sidebar background uses absolute positioning to fill page height without
// triggering Yoga layout loops (minHeight + flex: 1 combinations).

export function ModernPDF({ cv, accent, isLatam = false }: { cv: CVData; accent: string; isLatam?: boolean }) {
  const p = cv.personalInfo;
  const isA4 = cv.pageSize === 'A4';
  const SIDEBAR_W = 158;

  const sideText = { fontSize: T.meta, color: 'rgba(255,255,255,0.85)', lineHeight: T.lhTight, marginBottom: 3 } as const;
  const sideSubText = { fontSize: T.small, color: 'rgba(255,255,255,0.6)', lineHeight: T.lhTight } as const;
  const sideLabel = {
    fontFamily: T.bold, fontSize: T.small, color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase' as const, letterSpacing: 0.9,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.2)',
    paddingBottom: 3, marginBottom: 6, marginTop: 14, lineHeight: T.lhTight,
  } as const;

  return (
    <Page size={isA4 ? 'A4' : 'LETTER'} style={{ fontFamily: T.regular, fontSize: T.body, color: T.dark, backgroundColor: '#fff', padding: 0 }}>
      {/* Full-height sidebar background */}
      <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: SIDEBAR_W, backgroundColor: accent }} />

      <View style={{ flexDirection: 'row' }}>
        {/* Sidebar */}
        <View style={{ width: SIDEBAR_W, paddingHorizontal: 16, paddingVertical: 22 }}>
          <Text style={{ fontFamily: T.bold, fontSize: 15, color: T.white, lineHeight: 1.3, marginBottom: 16 }}>
            {p.firstName}{'\n'}{p.lastName}
          </Text>

          <Text style={sideLabel}>Contact</Text>
          {p.email      && <Text style={sideText}>{p.email}</Text>}
          {p.phone      && <Text style={sideText}>{p.phone}</Text>}
          {p.address?.city && <Text style={sideText}>{[p.address.city, p.address.state, p.address.country].filter(Boolean).join(', ')}</Text>}
          {p.linkedIn   && <Text style={sideText}>{p.linkedIn}</Text>}

          {isLatam && (p.dateOfBirth || p.nationality) && (
            <>
              <Text style={sideLabel}>Datos Personales</Text>
              {p.dateOfBirth && <Text style={sideText}>Nac.: {p.dateOfBirth}</Text>}
              {p.nationality && <Text style={sideText}>{p.nationality}</Text>}
            </>
          )}

          {cv.skills.length > 0 && (
            <>
              <Text style={sideLabel}>{isLatam ? 'Habilidades' : 'Skills'}</Text>
              {cv.skills.map((s) => <Text key={s.id} style={sideText}>· {s.name}</Text>)}
            </>
          )}

          {cv.languages.length > 0 && (
            <>
              <Text style={sideLabel}>{isLatam ? 'Idiomas' : 'Languages'}</Text>
              {cv.languages.map((l) => (
                <View key={l.id} style={{ marginBottom: 5 }}>
                  <Text style={{ fontFamily: T.bold, fontSize: T.meta, color: T.white, lineHeight: T.lhTight }}>{l.language}</Text>
                  <Text style={sideSubText}>{l.isNative ? (isLatam ? 'Nativo' : 'Native') : l.proficiency}</Text>
                </View>
              ))}
            </>
          )}

          {cv.certifications.length > 0 && (
            <>
              <Text style={sideLabel}>{isLatam ? 'Certificaciones' : 'Certifications'}</Text>
              {cv.certifications.map((c) => (
                <View key={c.id} style={{ marginBottom: 6 }}>
                  <Text style={{ fontFamily: T.bold, fontSize: T.small, color: T.white, lineHeight: T.lhTight }}>{c.name}</Text>
                  {c.issuer && <Text style={sideSubText}>{c.issuer}</Text>}
                </View>
              ))}
            </>
          )}
        </View>

        {/* Main column */}
        <View style={{ flex: 1, paddingHorizontal: 20, paddingVertical: 22 }}>
          {cv.objective && (
            <View style={{ marginBottom: T.sectionGap }}>
              <ModernHeading accent={accent}>{isLatam ? 'Objetivo Profesional' : 'Professional Summary'}</ModernHeading>
              <Text style={{ fontSize: T.body, color: T.mid, lineHeight: T.lhBody }}>{cv.objective}</Text>
            </View>
          )}

          {cv.workExperience.length > 0 && (
            <View style={{ marginBottom: T.sectionGap }}>
              <ModernHeading accent={accent}>{isLatam ? 'Experiencia Laboral' : 'Work Experience'}</ModernHeading>
              {cv.workExperience.map((exp, i) => (
                <View key={exp.id} style={{ marginBottom: i < cv.workExperience.length - 1 ? T.entryGap : 0 }}>
                  <EntryHeader title={exp.title} right={dr(exp.startDate, exp.endDate, exp.isPresent)} accent={accent} sub={exp.company ? `${exp.company}${exp.location ? ` · ${exp.location}` : ''}` : undefined} />
                  {exp.description && <BodyText>{exp.description}</BodyText>}
                </View>
              ))}
            </View>
          )}

          {cv.education.length > 0 && (
            <View style={{ marginBottom: T.sectionGap }}>
              <ModernHeading accent={accent}>{isLatam ? 'Formación Académica' : 'Education'}</ModernHeading>
              {cv.education.map((edu, i) => (
                <View key={edu.id} style={{ marginBottom: i < cv.education.length - 1 ? T.entryGap : 0 }}>
                  <EntryHeader title={`${edu.degree}${edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}`} right={dr(edu.startDate, edu.endDate, edu.isPresent)} accent={accent} sub={`${edu.institution}${edu.gpa ? `  ·  ${isLatam ? 'Promedio' : 'GPA'} ${edu.gpa}` : ''}`} />
                </View>
              ))}
            </View>
          )}

          {cv.references && cv.references.length > 0 && (
            <View style={{ marginBottom: T.sectionGap }}>
              <ModernHeading accent={accent}>{isLatam ? 'Referencias' : 'References'}</ModernHeading>
              {cv.references.map((r, i) => (
                <View key={r.id} style={{ marginBottom: i < cv.references.length - 1 ? T.entryGap : 0 }}>
                  <Text style={{ fontFamily: T.bold, fontSize: T.body, color: T.dark, lineHeight: T.lhTight }}>{r.name}</Text>
                  <Text style={{ fontSize: T.meta, color: T.mid, lineHeight: T.lhTight }}>{r.title}, {r.company}</Text>
                  {r.email && <Text style={{ fontSize: T.meta, color: T.muted, lineHeight: T.lhTight }}>{r.email}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Page>
  );
}

function ModernHeading({ accent, children }: { accent: string; children: string }) {
  return (
    <View style={{ marginBottom: T.titleGap }}>
      <Text style={{ fontFamily: T.bold, fontSize: T.section, color: accent, textTransform: 'uppercase', letterSpacing: 0.9, lineHeight: T.lhTight }}>
        {children}
      </Text>
      <View style={{ height: 0.75, backgroundColor: accent + '50', marginTop: 3 }} />
    </View>
  );
}

// ─── EU Modern (header banner + gray sidebar) ─────────────────────────────────

export function EUModernPDF({ cv, accent }: { cv: CVData; accent: string }) {
  const p = cv.personalInfo;
  const SIDEBAR_W = 172;

  return (
    <Page size="A4" style={{ fontFamily: T.regular, fontSize: T.body, color: T.dark, backgroundColor: '#fff', padding: 0 }}>
      {/* Full-width colored header */}
      <View style={{ backgroundColor: accent, paddingHorizontal: 28, paddingVertical: 20 }}>
        <Text style={{ fontFamily: T.bold, fontSize: T.name, color: T.white, lineHeight: T.lhTight, marginBottom: 6 }}>
          {p.firstName} {p.lastName}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {p.email      && <Text style={{ fontSize: T.meta, color: 'rgba(255,255,255,0.85)', marginRight: 12 }}>{p.email}</Text>}
          {p.phone      && <Text style={{ fontSize: T.meta, color: 'rgba(255,255,255,0.85)', marginRight: 12 }}>{p.phone}</Text>}
          {p.address?.city && <Text style={{ fontSize: T.meta, color: 'rgba(255,255,255,0.85)', marginRight: 12 }}>{p.address.city}{p.address.country ? `, ${p.address.country}` : ''}</Text>}
          {p.nationality && <Text style={{ fontSize: T.meta, color: 'rgba(255,255,255,0.85)', marginRight: 12 }}>{p.nationality}</Text>}
          {p.linkedIn   && <Text style={{ fontSize: T.meta, color: 'rgba(255,255,255,0.85)', marginRight: 12 }}>{p.linkedIn}</Text>}
        </View>
      </View>

      {/* Two-column body */}
      <View style={{ flexDirection: 'row' }}>
        {/* Left sidebar */}
        <View style={{ width: SIDEBAR_W, backgroundColor: '#f9fafb', paddingHorizontal: 18, paddingVertical: 20, borderRightWidth: 0.5, borderRightColor: '#e5e7eb' }}>
          {(p.dateOfBirth || p.nationality) && (
            <View style={{ marginBottom: T.sectionGap }}>
              <EUSideTitle accent={accent}>Personal</EUSideTitle>
              {p.dateOfBirth && <EUInfoLine label="Born" value={p.dateOfBirth} />}
              {p.nationality && <EUInfoLine label="Nationality" value={p.nationality} />}
            </View>
          )}

          {cv.skills.length > 0 && (
            <View style={{ marginBottom: T.sectionGap }}>
              <EUSideTitle accent={accent}>Skills</EUSideTitle>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 3 }}>
                {cv.skills.map((s) => (
                  <Text key={s.id} style={{ fontSize: T.small, color: accent, backgroundColor: accent + '15', paddingHorizontal: 5, paddingVertical: 2, marginRight: 4, marginBottom: 4, lineHeight: T.lhTight }}>
                    {s.name}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {cv.languages.length > 0 && (
            <View style={{ marginBottom: T.sectionGap }}>
              <EUSideTitle accent={accent}>Languages</EUSideTitle>
              {cv.languages.map((l) => (
                <View key={l.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ fontSize: T.meta, color: T.dark, lineHeight: T.lhTight }}>{l.language}</Text>
                  <Text style={{ fontFamily: T.bold, fontSize: T.small, color: accent, lineHeight: T.lhTight }}>{l.isNative ? 'Native' : l.proficiency}</Text>
                </View>
              ))}
            </View>
          )}

          {cv.certifications.length > 0 && (
            <View style={{ marginBottom: T.sectionGap }}>
              <EUSideTitle accent={accent}>Courses & Certs</EUSideTitle>
              {cv.certifications.map((c) => (
                <View key={c.id} style={{ marginBottom: 6 }}>
                  <Text style={{ fontFamily: T.bold, fontSize: T.meta, color: T.dark, lineHeight: T.lhTight }}>{c.name}</Text>
                  {c.issuer && <Text style={{ fontSize: T.small, color: T.mid, lineHeight: T.lhTight }}>{c.issuer}</Text>}
                  {c.dateIssued && <Text style={{ fontSize: T.small, color: T.muted, lineHeight: T.lhTight }}>{fmtDate(c.dateIssued)}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Right main column */}
        <View style={{ flex: 1, paddingHorizontal: 20, paddingVertical: 20 }}>
          {cv.objective && (
            <View style={{ marginBottom: T.sectionGap }}>
              <EUMainTitle accent={accent}>Profile</EUMainTitle>
              <Text style={{ fontSize: T.body, color: T.mid, lineHeight: T.lhBody }}>{cv.objective}</Text>
            </View>
          )}

          {cv.workExperience.length > 0 && (
            <View style={{ marginBottom: T.sectionGap }}>
              <EUMainTitle accent={accent}>Work Experience</EUMainTitle>
              {cv.workExperience.map((exp, i) => (
                <View key={exp.id} style={{ borderLeftWidth: 1.5, borderLeftColor: accent + '55', paddingLeft: 9, marginBottom: i < cv.workExperience.length - 1 ? T.entryGap : 0 }}>
                  <EntryHeader title={exp.title} right={dr(exp.startDate, exp.endDate, exp.isPresent)} accent={accent} sub={exp.company ? `${exp.company}${exp.location ? ` · ${exp.location}` : ''}` : undefined} />
                  {exp.description && <BodyText>{exp.description}</BodyText>}
                </View>
              ))}
            </View>
          )}

          {cv.education.length > 0 && (
            <View style={{ marginBottom: T.sectionGap }}>
              <EUMainTitle accent={accent}>Education & Training</EUMainTitle>
              {cv.education.map((edu, i) => (
                <View key={edu.id} style={{ borderLeftWidth: 1.5, borderLeftColor: accent + '55', paddingLeft: 9, marginBottom: i < cv.education.length - 1 ? T.entryGap : 0 }}>
                  <EntryHeader title={`${edu.degree}${edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}`} right={dr(edu.startDate, edu.endDate, edu.isPresent)} accent={accent} sub={`${edu.institution}${edu.gpa ? `  ·  Grade ${edu.gpa}` : ''}`} />
                </View>
              ))}
            </View>
          )}

          {cv.references && cv.references.length > 0 && (
            <View style={{ marginBottom: T.sectionGap }}>
              <EUMainTitle accent={accent}>References</EUMainTitle>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {cv.references.map((r) => (
                  <View key={r.id} style={{ width: '48%', marginRight: '2%', marginBottom: 8 }}>
                    <Text style={{ fontFamily: T.bold, fontSize: T.meta, color: T.dark, lineHeight: T.lhTight }}>{r.name}</Text>
                    <Text style={{ fontSize: T.small, color: T.mid, lineHeight: T.lhTight }}>{r.title}, {r.company}</Text>
                    {r.email && <Text style={{ fontSize: T.small, color: T.muted, lineHeight: T.lhTight }}>{r.email}</Text>}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={{ position: 'absolute', bottom: 10, left: 28, right: 28, borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: T.small, color: T.muted }}>Curriculum Vitae — {p.firstName} {p.lastName}</Text>
        <Text style={{ fontSize: T.small, color: T.muted }}>GlobalCV by Augusto Santa Cruz</Text>
      </View>
    </Page>
  );
}

function EUSideTitle({ accent, children }: { accent: string; children: string }) {
  return (
    <View style={{ marginBottom: 7 }}>
      <Text style={{ fontFamily: T.bold, fontSize: T.small, color: accent, textTransform: 'uppercase', letterSpacing: 0.9, lineHeight: T.lhTight }}>{children}</Text>
      <View style={{ height: 0.5, backgroundColor: accent + '40', marginTop: 3 }} />
    </View>
  );
}

function EUMainTitle({ accent, children }: { accent: string; children: string }) {
  return (
    <View style={{ marginBottom: T.titleGap }}>
      <Text style={{ fontFamily: T.bold, fontSize: T.section, color: accent, textTransform: 'uppercase', letterSpacing: 0.9, lineHeight: T.lhTight }}>{children}</Text>
      <View style={{ height: 0.75, backgroundColor: accent + '40', marginTop: 3 }} />
    </View>
  );
}

function EUInfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
      <Text style={{ fontSize: T.meta, color: T.muted, marginRight: 5, lineHeight: T.lhTight }}>{label}:</Text>
      <Text style={{ fontSize: T.meta, color: T.dark, lineHeight: T.lhTight }}>{value}</Text>
    </View>
  );
}

// ─── EU Europass ──────────────────────────────────────────────────────────────

export function EuropassPDF({ cv, accent }: { cv: CVData; accent: string }) {
  const p = cv.personalInfo;

  return (
    <Page size="A4" style={{ fontFamily: T.regular, fontSize: T.body, color: T.dark, backgroundColor: '#fff', paddingHorizontal: 40, paddingVertical: 34 }}>
      {/* Header bar */}
      <View style={{ backgroundColor: accent, paddingHorizontal: 24, paddingVertical: 18, marginHorizontal: -40, marginTop: -34, marginBottom: 16 }}>
        <Text style={{ fontFamily: T.bold, fontSize: T.name, color: T.white, lineHeight: T.lhTight, marginBottom: 6 }}>{p.firstName} {p.lastName}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {p.email      && <Text style={{ fontSize: T.meta, color: 'rgba(255,255,255,0.85)', marginRight: 14 }}>{p.email}</Text>}
          {p.phone      && <Text style={{ fontSize: T.meta, color: 'rgba(255,255,255,0.85)', marginRight: 14 }}>{p.phone}</Text>}
          {p.address?.city && <Text style={{ fontSize: T.meta, color: 'rgba(255,255,255,0.85)', marginRight: 14 }}>{p.address.city}{p.address.country ? `, ${p.address.country}` : ''}</Text>}
          {p.nationality && <Text style={{ fontSize: T.meta, color: 'rgba(255,255,255,0.85)', marginRight: 14 }}>{p.nationality}</Text>}
          {p.dateOfBirth && <Text style={{ fontSize: T.meta, color: 'rgba(255,255,255,0.85)', marginRight: 14 }}>DOB: {p.dateOfBirth}</Text>}
        </View>
      </View>

      {cv.objective && (
        <View style={{ marginBottom: T.sectionGap }}>
          <SectionHeading accent={accent}>Personal Statement</SectionHeading>
          <Text style={{ fontSize: T.body, color: T.mid, lineHeight: T.lhBody }}>{cv.objective}</Text>
        </View>
      )}

      {cv.workExperience.length > 0 && (
        <View style={{ marginBottom: T.sectionGap }}>
          <SectionHeading accent={accent}>Work Experience</SectionHeading>
          {cv.workExperience.map((exp, i) => (
            <View key={exp.id} style={{ flexDirection: 'row', marginBottom: i < cv.workExperience.length - 1 ? T.entryGap : 0 }}>
              <Text style={{ width: 72, fontSize: T.meta, color: T.muted, paddingTop: 1, lineHeight: T.lhTight }}>{dr(exp.startDate, exp.endDate, exp.isPresent)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: T.bold, fontSize: T.body, color: T.dark, lineHeight: T.lhTight }}>{exp.title}</Text>
                <Text style={{ fontSize: T.meta, color: T.mid, marginBottom: 2, lineHeight: T.lhTight }}>{exp.company}{exp.location ? ` · ${exp.location}` : ''}</Text>
                {exp.description && <Text style={{ fontSize: T.body, color: T.mid, lineHeight: T.lhBody }}>{exp.description}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {cv.education.length > 0 && (
        <View style={{ marginBottom: T.sectionGap }}>
          <SectionHeading accent={accent}>Education & Training</SectionHeading>
          {cv.education.map((edu, i) => (
            <View key={edu.id} style={{ flexDirection: 'row', marginBottom: i < cv.education.length - 1 ? T.entryGap : 0 }}>
              <Text style={{ width: 72, fontSize: T.meta, color: T.muted, paddingTop: 1, lineHeight: T.lhTight }}>{dr(edu.startDate, edu.endDate, edu.isPresent)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: T.bold, fontSize: T.body, color: T.dark, lineHeight: T.lhTight }}>{edu.degree}{edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}</Text>
                <Text style={{ fontSize: T.meta, color: T.mid, lineHeight: T.lhTight }}>{edu.institution}{edu.gpa ? `  ·  Grade ${edu.gpa}` : ''}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {cv.languages.length > 0 && (
        <View style={{ marginBottom: T.sectionGap }}>
          <SectionHeading accent={accent}>Language Skills</SectionHeading>
          {cv.languages.map((l) => (
            <View key={l.id} style={{ flexDirection: 'row', marginBottom: 5 }}>
              <Text style={{ width: 90, fontFamily: T.bold, fontSize: T.body, color: T.dark, lineHeight: T.lhTight }}>{l.language}</Text>
              <Text style={{ fontFamily: T.bold, fontSize: T.meta, color: accent, lineHeight: T.lhTight }}>{l.isNative ? 'Native' : l.proficiency}</Text>
            </View>
          ))}
        </View>
      )}

      {cv.skills.length > 0 && (
        <View style={{ marginBottom: T.sectionGap }}>
          <SectionHeading accent={accent}>Digital & Technical Skills</SectionHeading>
          <Text style={{ fontSize: T.body, color: T.mid, lineHeight: T.lhBody }}>{cv.skills.map((s) => s.name).join('  /  ')}</Text>
        </View>
      )}

      {cv.certifications.length > 0 && (
        <View style={{ marginBottom: T.sectionGap }}>
          <SectionHeading accent={accent}>Courses & Certifications</SectionHeading>
          {cv.certifications.map((c, i) => (
            <View key={c.id} style={{ flexDirection: 'row', marginBottom: i < cv.certifications.length - 1 ? 5 : 0 }}>
              <Text style={{ width: 72, fontSize: T.meta, color: T.muted, lineHeight: T.lhTight }}>{fmtDate(c.dateIssued)}</Text>
              <Text style={{ flex: 1, fontSize: T.body, color: T.dark, lineHeight: T.lhTight }}>{c.name}{c.issuer ? <Text style={{ color: T.mid }}> — {c.issuer}</Text> : ''}</Text>
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}

// ─── Japan 履歴書 (JIS standard Rirekisho) ────────────────────────────────────

function toJpDate(ym?: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  if (!y) return '';
  if (y > 2019 || (y === 2019 && m >= 5)) return `令和${y - 2018}年${m}月`;
  if (y > 1989 || (y === 1989 && m >= 1)) return `平成${y - 1988}年${m}月`;
  return `${y}年${m}月`;
}

// Module-level style constants (must not be inside component functions)
const JP_BK = '#000000';
const JP_GRAY = '#666666';
const JP_LIGHT_GRAY = '#f5f5f5';
const jpCell = { paddingHorizontal: 5, paddingVertical: 3, fontFamily: 'JP', fontSize: 8 } as const;
const jpLabel = { fontSize: 7, color: JP_GRAY, fontFamily: 'JP' } as const;
const jpBorderB = { borderBottomWidth: 0.75, borderBottomColor: JP_BK } as const;
const jpBorderR = { borderRightWidth: 0.75, borderRightColor: JP_BK } as const;
const jpRow = { flexDirection: 'row' as const };

export function JapanRirekishoPDF({ cv }: { cv: CVData }) {
  const p = cv.personalInfo;
  const edu = cv.education.slice(0, 4);
  const exp = cv.workExperience.slice(0, 5);
  const certs = cv.certifications.slice(0, 5);

  const BLANK_ROWS = Math.max(0, 3 - exp.length);
  const BLANK_CERT_ROWS = Math.max(0, 3 - certs.length);

  return (
    <Page size="A4" style={{ fontFamily: 'JP', fontSize: 8, padding: 18, color: JP_BK, backgroundColor: '#fff', lineHeight: 1.4 }}>
      {/* Title */}
      <Text style={{ fontFamily: 'JP', fontWeight: 'bold', fontSize: 16, textAlign: 'center', letterSpacing: 10, marginBottom: 3 }}>
        履　歴　書
      </Text>
      <Text style={{ fontFamily: 'JP', fontSize: 7, color: JP_GRAY, textAlign: 'center', marginBottom: 8 }}>（JIS規格）</Text>

      {/* Main bordered table */}
      <View style={{ borderWidth: 0.75, borderColor: JP_BK }}>

        {/* 記入日 */}
        <View style={{ ...jpBorderB, ...jpCell }}>
          <Text style={jpLabel}>記入日　　　　　年　　月　　日現在</Text>
        </View>

        {/* ふりがな / 氏名 + Photo */}
        <View style={{ ...jpBorderB, ...jpRow }}>
          <View style={{ flex: 1 }}>
            <View style={{ ...jpBorderB, ...jpCell, ...jpRow }}>
              <Text style={{ ...jpLabel, marginRight: 8 }}>ふりがな</Text>
              <Text>{p.furiganaLastName ?? ''} {p.furiganaFirstName ?? ''}</Text>
            </View>
            <View style={{ ...jpCell, ...jpRow, alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ ...jpLabel, marginRight: 10 }}>氏名</Text>
              <Text style={{ fontFamily: 'JP', fontWeight: 'bold', fontSize: 14 }}>{p.lastName ?? ''}　{p.firstName ?? ''}</Text>
            </View>
          </View>
          {/* 証明写真 */}
          <View style={{ width: 68, ...jpBorderR, borderRightWidth: 0, borderLeftWidth: 0.75, borderLeftColor: JP_BK, alignItems: 'center', justifyContent: 'center', minHeight: 75 }}>
            {p.photo ? (
              <Image src={p.photo} style={{ width: 68, height: 90, objectFit: 'cover' }} />
            ) : (
              <>
                <Text style={{ fontSize: 7, color: '#aaa', fontFamily: 'JP' }}>写真</Text>
                <Text style={{ fontSize: 6, color: '#ccc', fontFamily: 'JP' }}>3×4cm</Text>
              </>
            )}
          </View>
        </View>

        {/* 生年月日 + 性別 */}
        <View style={{ ...jpBorderB, ...jpRow }}>
          <View style={{ flex: 1, ...jpBorderR, ...jpCell, ...jpRow }}>
            <Text style={{ ...jpLabel, marginRight: 8 }}>生年月日</Text>
            <Text>{p.dateOfBirth ? toJpDate(p.dateOfBirth.slice(0, 7)) : '　　年　月　日生'}</Text>
            <Text style={{ ...jpLabel, marginLeft: 8 }}>（満　　歳）</Text>
          </View>
          <View style={{ ...jpCell, ...jpRow }}>
            <Text style={{ ...jpLabel, marginRight: 8 }}>性別</Text>
            <Text>{p.gender === 'male' ? '男' : p.gender === 'female' ? '女' : '　'}</Text>
          </View>
        </View>

        {/* 現住所 */}
        <View style={{ ...jpBorderB, ...jpCell, ...jpRow }}>
          <Text style={{ ...jpLabel, marginRight: 8 }}>現住所</Text>
          <Text>
            {p.address
              ? `〒　 ${p.address.prefecture ?? ''}${p.address.city ?? ''}${p.address.street ?? ''}`
              : '〒　　　-　　　　'}
          </Text>
        </View>

        {/* 電話 / 最寄駅 / 通勤時間 */}
        <View style={{ ...jpBorderB, ...jpRow }}>
          <View style={{ flex: 1, ...jpBorderR, ...jpCell, ...jpRow }}>
            <Text style={{ ...jpLabel, marginRight: 8 }}>電話</Text>
            <Text>{p.phone ?? '　　　-　　　-　　　　'}</Text>
          </View>
          <View style={{ flex: 1, ...jpBorderR, ...jpCell, ...jpRow }}>
            <Text style={{ ...jpLabel, marginRight: 8 }}>最寄駅</Text>
            <Text>{(p as any).nearestStation ?? '　　　駅'}</Text>
          </View>
          <View style={{ ...jpCell, ...jpRow }}>
            <Text style={{ ...jpLabel, marginRight: 4 }}>通勤時間</Text>
            <Text>{(p as any).commuteTime ? `約${(p as any).commuteTime}分` : '約　　分'}</Text>
          </View>
        </View>

        {/* Email */}
        <View style={{ ...jpBorderB, ...jpCell, ...jpRow }}>
          <Text style={{ ...jpLabel, marginRight: 8 }}>E-mail</Text>
          <Text>{p.email ?? ''}</Text>
        </View>

        {/* 学歴・職歴 header */}
        <View style={{ ...jpBorderB, ...jpRow, backgroundColor: JP_LIGHT_GRAY }}>
          <View style={{ width: 55, ...jpBorderR, ...jpCell, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'JP', fontWeight: 'bold' }}>年　月</Text>
          </View>
          <View style={{ flex: 1, ...jpCell }}>
            <Text style={{ fontFamily: 'JP', fontWeight: 'bold' }}>学歴・職歴</Text>
          </View>
        </View>

        {/* 学歴 label */}
        <View style={{ ...jpBorderB, ...jpCell }}>
          <Text style={{ color: JP_GRAY, fontFamily: 'JP' }}>学歴</Text>
        </View>

        {/* Education entries — start then end */}
        {edu.map((e) => (
          <View key={e.id + '_s'} style={{ ...jpBorderB, ...jpRow }}>
            <View style={{ width: 55, ...jpBorderR, ...jpCell, alignItems: 'center' }}>
              <Text>{e.startDate ? toJpDate(e.startDate) : ''}</Text>
            </View>
            <View style={{ flex: 1, ...jpCell }}>
              <Text>{e.institution}　{e.degree}{e.fieldOfStudy ? `　${e.fieldOfStudy}` : ''}　入学</Text>
            </View>
          </View>
        ))}
        {edu.map((e) => (
          <View key={e.id + '_e'} style={{ ...jpBorderB, ...jpRow }}>
            <View style={{ width: 55, ...jpBorderR, ...jpCell, alignItems: 'center' }}>
              <Text>{e.isPresent ? '在学中' : e.endDate ? toJpDate(e.endDate) : ''}</Text>
            </View>
            <View style={{ flex: 1, ...jpCell }}>
              <Text>{e.institution}　{e.degree}　{e.isPresent ? '在学中' : '卒業'}</Text>
            </View>
          </View>
        ))}

        {/* 職歴 label */}
        <View style={{ ...jpBorderB, ...jpCell }}>
          <Text style={{ color: JP_GRAY, fontFamily: 'JP' }}>職歴</Text>
        </View>

        {/* Work experience entries */}
        {exp.map((e) => (
          <View key={e.id}>
            <View style={{ ...jpBorderB, ...jpRow }}>
              <View style={{ width: 55, ...jpBorderR, ...jpCell, alignItems: 'center' }}>
                <Text>{e.startDate ? toJpDate(e.startDate) : ''}</Text>
              </View>
              <View style={{ flex: 1, ...jpCell }}>
                <Text>
                  {e.company}{(e as any).departmentName ? `　${(e as any).departmentName}` : ''}　入社
                  {(e as any).employmentType === 'contract' ? '（契約社員）'
                   : (e as any).employmentType === 'part_time' ? '（アルバイト）' : ''}
                </Text>
              </View>
            </View>
            <View style={{ ...jpBorderB, ...jpRow }}>
              <View style={{ width: 55, ...jpBorderR, ...jpCell, alignItems: 'center' }}>
                <Text>{!e.isPresent && e.endDate ? toJpDate(e.endDate) : ''}</Text>
              </View>
              <View style={{ flex: 1, ...jpCell }}>
                <Text>{e.isPresent ? '現在に至る' : `退職${(e as any).reasonForLeaving ? `（${(e as any).reasonForLeaving}）` : ''}`}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* 以上 */}
        <View style={{ ...jpBorderB, ...jpRow }}>
          <View style={{ width: 55, ...jpBorderR, ...jpCell }} />
          <View style={{ flex: 1, ...jpCell, alignItems: 'flex-end' }}>
            <Text>以上</Text>
          </View>
        </View>

        {/* Blank filler rows */}
        {Array.from({ length: BLANK_ROWS }).map((_, i) => (
          <View key={`bexp-${i}`} style={{ ...jpBorderB, ...jpRow, height: 18 }}>
            <View style={{ width: 55, ...jpBorderR }} />
            <View style={{ flex: 1 }} />
          </View>
        ))}

        {/* 免許・資格 header */}
        <View style={{ ...jpBorderB, ...jpCell, backgroundColor: JP_LIGHT_GRAY }}>
          <Text style={{ fontFamily: 'JP', fontWeight: 'bold' }}>免許・資格</Text>
        </View>

        {certs.map((c) => (
          <View key={c.id} style={{ ...jpBorderB, ...jpRow }}>
            <View style={{ width: 55, ...jpBorderR, ...jpCell, alignItems: 'center' }}>
              <Text>{c.dateIssued ? toJpDate(c.dateIssued) : ''}</Text>
            </View>
            <View style={{ flex: 1, ...jpCell }}>
              <Text>{c.name}　取得</Text>
            </View>
          </View>
        ))}

        {Array.from({ length: BLANK_CERT_ROWS }).map((_, i) => (
          <View key={`bcert-${i}`} style={{ ...jpBorderB, ...jpRow, height: 18 }}>
            <View style={{ width: 55, ...jpBorderR }} />
            <View style={{ flex: 1 }} />
          </View>
        ))}

        {/* 自己PR + 志望動機 */}
        <View style={{ ...jpBorderB, ...jpRow }}>
          <View style={{ flex: 1, ...jpBorderR, ...jpCell, minHeight: 70 }}>
            <Text style={{ fontFamily: 'JP', fontWeight: 'bold', fontSize: 7, marginBottom: 4 }}>自己PR</Text>
            <Text style={{ color: '#333', lineHeight: 1.5 }}>{(cv as any).selfPromotion ?? ''}</Text>
          </View>
          <View style={{ flex: 1, ...jpCell, minHeight: 70 }}>
            <Text style={{ fontFamily: 'JP', fontWeight: 'bold', fontSize: 7, marginBottom: 4 }}>志望動機</Text>
            <Text style={{ color: '#333', lineHeight: 1.5 }}>{(cv as any).reasonForApplication ?? ''}</Text>
          </View>
        </View>

        {/* 希望条件 */}
        <View style={{ ...jpBorderB, ...jpCell, ...jpRow }}>
          <Text style={{ fontFamily: 'JP', fontWeight: 'bold', fontSize: 7, marginRight: 8 }}>希望条件</Text>
          <Text style={{ color: '#333' }}>{(cv as any).desiredConditions ?? '貴社の規定に従います。'}</Text>
        </View>

        {/* 緊急連絡先 + 捺印 */}
        <View style={{ ...jpRow }}>
          <View style={{ flex: 1, ...jpBorderR, ...jpCell, minHeight: 50 }}>
            <Text style={{ fontFamily: 'JP', fontWeight: 'bold', fontSize: 7, marginBottom: 4 }}>緊急連絡先</Text>
            {(p as any).emergencyContact ? (
              <>
                <Text>{(p as any).emergencyContact.name}（{(p as any).emergencyContact.relationship}）</Text>
                <Text>{(p as any).emergencyContact.phone}</Text>
              </>
            ) : (
              <Text style={{ color: '#aaa' }}>氏名：{'\n'}続柄：{'\n'}電話：</Text>
            )}
          </View>
          <View style={{ width: 60, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
            <Text style={{ fontSize: 7, color: JP_GRAY, marginBottom: 4 }}>捺印</Text>
            <View style={{ width: 36, height: 36, borderWidth: 0.75, borderColor: '#aaa', borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 7, color: '#ccc' }}>{(p as any).personalSeal ? '印' : ''}</Text>
            </View>
          </View>
        </View>

      </View>
    </Page>
  );
}

// ─── Root document ─────────────────────────────────────────────────────────────

export function CVPDFDocument({ cv, config }: Props) {
  const theme = getActiveTheme(cv, config);
  const accent = theme.primary;
  const tpl = cv.templateId;

  let page: React.ReactElement;
  if (tpl === 'jp-rirekisho' || tpl === 'jp-shokumu') {
    page = <JapanRirekishoPDF cv={cv} />;
  } else if (tpl === 'us-modern') {
    page = <ModernPDF cv={cv} accent={accent} />;
  } else if (tpl === 'eu-modern') {
    page = <EUModernPDF cv={cv} accent={accent} />;
  } else if (tpl === 'latam-modern') {
    page = <ModernPDF cv={cv} accent={accent} isLatam />;
  } else if (tpl === 'eu-europass') {
    page = <EuropassPDF cv={cv} accent={accent} />;
  } else {
    page = <ClassicPDF cv={cv} accent={accent} />;
  }

  return (
    <Document title={`${cv.personalInfo.firstName} ${cv.personalInfo.lastName} - CV`}>
      {page}
    </Document>
  );
}
