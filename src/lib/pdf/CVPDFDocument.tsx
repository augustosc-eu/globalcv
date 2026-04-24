import { Document, Font, Image, Page, Text, View } from '@react-pdf/renderer';

// ─── Japanese font (Noto Sans JP — self-hosted in /public/fonts) ─────────────
// Self-hosted to avoid runtime requests to Google Fonts CDN (GDPR compliance).
const JP_REGULAR_FONT = typeof window === 'undefined'
  ? `${process.cwd()}/public/fonts/NotoSansJP-Regular.ttf`
  : '/fonts/NotoSansJP-Regular.ttf';
const JP_BOLD_FONT = typeof window === 'undefined'
  ? `${process.cwd()}/public/fonts/NotoSansJP-Bold.ttf`
  : '/fonts/NotoSansJP-Bold.ttf';

Font.register({
  family: 'JP',
  fonts: [
    { src: JP_REGULAR_FONT, fontWeight: 'normal' },
    { src: JP_BOLD_FONT, fontWeight: 'bold' },
  ],
});
import { CVData } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import { getActiveTheme } from '@/lib/utils/theme';

type PdfExportMode = 'designed' | 'ats' | 'privacy' | 'compact';

interface Props { cv: CVData; config: MarketConfig; exportMode?: PdfExportMode; }

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

function isHidden(cv: CVData, section: string): boolean {
  return cv.hiddenSections?.includes(section) ?? false;
}

function hasText(value?: string): boolean {
  return Boolean(value?.trim());
}

function hasReferenceContent(reference: CVData['references'][number]): boolean {
  return hasText(reference.name) || hasText(reference.title) || hasText(reference.company) || hasText(reference.email) || hasText(reference.phone);
}

// Strip markdown formatting and raw URLs from user-provided text before PDF rendering.
// Markdown renders as literal syntax in react-pdf, and long URLs overflow containers.
function sanitizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // [text](url) → text
    .replace(/\*\*([^*]*)\*\*/g, '$1')          // **bold** → bold
    .replace(/\*([^*]*)\*/g, '$1')               // *italic* → italic
    .replace(/__([^_]*)__/g, '$1')               // __bold__ → bold
    .replace(/_([^_]*)_/g, '$1')                 // _italic_ → italic
    .replace(/https?:\/\/(?:www\.)?([^/\s]+)\S*/g, '$1')  // shorten URLs to domain (e.g. facebook.com)
    .replace(/[?&][a-zA-Z_]\w*=\S*/g, '')                 // strip stray URL query params (e.g. ?source=linked_in_profile)
    .replace(/[ \t]{2,}/g, ' ')                  // collapse horizontal whitespace
    .replace(/(\n\s*){3,}/g, '\n\n')             // collapse excessive blank lines
    .trim();
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

const PDF_FOOTER_H = 30;
const EU_HEADER_H = 92;

function SafeFooter({
  left,
  right = 'GlobalCV by Bagalinis Consulting',
  fontFamily = T.regular,
}: {
  left: string;
  right?: string;
  fontFamily?: string;
}) {
  return (
    <View fixed style={{ position: 'absolute', bottom: 10, left: 28, right: 28, borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontFamily, fontSize: T.small, color: T.muted }}>{left}</Text>
      <Text style={{ fontFamily, fontSize: T.small, color: T.muted }}>{right}</Text>
    </View>
  );
}

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
  return <Text style={{ fontSize: T.body, color: T.mid, lineHeight: T.lhBody, marginTop: T.intraGap }}>{sanitizeText(children)}</Text>;
}

// ─── Classic / Traditional ────────────────────────────────────────────────────

export function ClassicPDF({
  cv,
  accent,
  showPhoto = true,
  compact = false,
}: {
  cv: CVData;
  accent: string;
  showPhoto?: boolean;
  compact?: boolean;
}) {
  const p = cv.personalInfo;
  const isA4 = cv.pageSize === 'A4';
  const bodySize = compact ? T.body - 0.5 : T.body;
  const sectionGap = compact ? T.sectionGap - 4 : T.sectionGap;
  const workExperience = compact ? cv.workExperience.slice(0, 3) : cv.workExperience;
  const education = compact ? cv.education.slice(0, 2) : cv.education;
  const skills = compact ? cv.skills.slice(0, 8) : cv.skills;
  const languages = compact ? cv.languages.slice(0, 4) : cv.languages;
  const certifications = compact ? cv.certifications.slice(0, 2) : cv.certifications;

  return (
    <Page size={isA4 ? 'A4' : 'LETTER'} style={{ fontFamily: T.regular, fontSize: bodySize, color: T.dark, backgroundColor: '#fff', paddingHorizontal: compact ? 32 : 40, paddingVertical: compact ? 28 : 36 }}>
      {/* Header */}
      <View style={{ marginBottom: 14, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: accent }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: T.bold, fontSize: T.name, color: accent, lineHeight: T.lhTight, marginBottom: 5 }}>
              {p.firstName} {p.lastName}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {p.email      && <Text style={{ fontSize: T.meta, color: T.mid, marginRight: 10 }}>{p.email}</Text>}
              {p.phone      && <Text style={{ fontSize: T.meta, color: T.mid, marginRight: 10 }}>{p.phone}</Text>}
              {p.address?.city && <Text style={{ fontSize: T.meta, color: T.mid, marginRight: 10 }}>{p.address.city}{p.address.state ? `, ${p.address.state}` : ''}</Text>}
              {p.linkedIn   && <Text style={{ fontSize: T.meta, color: T.mid, marginRight: 10 }}>{p.linkedIn}</Text>}
            </View>
          </View>
          {showPhoto && p.photo && (
            <View style={{ width: 66, height: 86, borderWidth: 0.75, borderColor: '#d1d5db' }}>
              <Image src={p.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </View>
          )}
        </View>
      </View>

      {!isHidden(cv, 'objective') && cv.objective && (
        <View style={{ marginBottom: sectionGap }}>
          <SectionHeading accent={accent}>Professional Summary</SectionHeading>
          <Text style={{ fontSize: bodySize, color: T.mid, lineHeight: compact ? 1.25 : T.lhBody }}>{sanitizeText(cv.objective)}</Text>
        </View>
      )}

      {!isHidden(cv, 'workExperience') && workExperience.length > 0 && (
        <View style={{ marginBottom: sectionGap }}>
          <SectionHeading accent={accent}>Work Experience</SectionHeading>
          {workExperience.map((exp, i) => (
            <View key={exp.id} wrap={false} style={{ marginBottom: i < workExperience.length - 1 ? T.entryGap : 0 }}>
              <EntryHeader title={`${exp.title}${exp.company ? ` — ${exp.company}` : ''}`} right={dr(exp.startDate, exp.endDate, exp.isPresent)} accent={accent} sub={exp.location} />
              {exp.description && <BodyText>{exp.description}</BodyText>}
            </View>
          ))}
        </View>
      )}

      {!isHidden(cv, 'education') && education.length > 0 && (
        <View style={{ marginBottom: sectionGap }}>
          <SectionHeading accent={accent}>Education</SectionHeading>
          {education.map((edu, i) => (
            <View key={edu.id} wrap={false} style={{ marginBottom: i < education.length - 1 ? T.entryGap : 0 }}>
              <EntryHeader title={`${sanitizeText(edu.degree)}${edu.fieldOfStudy ? `, ${sanitizeText(edu.fieldOfStudy)}` : ''}`} right={dr(edu.startDate, edu.endDate, edu.isPresent)} accent={accent} sub={`${sanitizeText(edu.institution)}${edu.gpa ? `  ·  GPA ${edu.gpa}` : ''}`} />
            </View>
          ))}
        </View>
      )}

      {!isHidden(cv, 'skills') && skills.length > 0 && (
        <View style={{ marginBottom: sectionGap }}>
          <SectionHeading accent={accent}>Skills</SectionHeading>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {skills.map((s, i) => (
              <Text key={s.id} style={{ fontSize: T.body, color: T.mid, marginRight: 6, lineHeight: 1.5 }}>
                {s.name}{i < skills.length - 1 ? '  /' : ''}
              </Text>
            ))}
          </View>
        </View>
      )}

      {!isHidden(cv, 'languages') && languages.length > 0 && (
        <View style={{ marginBottom: sectionGap }}>
          <SectionHeading accent={accent}>Languages</SectionHeading>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {languages.map((l) => (
              <Text key={l.id} style={{ fontSize: T.body, color: T.mid, marginRight: 20, lineHeight: 1.5 }}>
                {l.language}: <Text style={{ color: accent }}>{l.isNative ? 'Native' : l.proficiency}</Text>
              </Text>
            ))}
          </View>
        </View>
      )}

      {!isHidden(cv, 'certifications') && certifications.length > 0 && (
        <View style={{ marginBottom: sectionGap }}>
          <SectionHeading accent={accent}>Certifications</SectionHeading>
          {certifications.map((c, i) => (
            <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: i < certifications.length - 1 ? 5 : 0 }}>
              <Text style={{ fontSize: T.body, color: T.dark }}>{sanitizeText(c.name)}{c.issuer ? <Text style={{ color: T.mid }}> — {sanitizeText(c.issuer)}</Text> : ''}</Text>
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

export function ModernPDF({ cv, accent, isLatam = false, compact = false }: { cv: CVData; accent: string; isLatam?: boolean; compact?: boolean }) {
  const p = cv.personalInfo;
  const isA4 = cv.pageSize === 'A4';
  const SIDEBAR_W = compact ? 142 : 158;
  const sectionGap = compact ? T.sectionGap - 4 : T.sectionGap;
  const workExperience = compact ? cv.workExperience.slice(0, 3) : cv.workExperience;
  const education = compact ? cv.education.slice(0, 2) : cv.education;
  const skills = cv.skills.slice(0, compact ? 8 : 12);
  const languages = cv.languages.slice(0, compact ? 4 : 6);
  const certifications = cv.certifications.slice(0, compact ? 2 : 4);
  const references = cv.references.filter(hasReferenceContent);

  const sideText = { fontSize: compact ? T.small : T.meta, color: 'rgba(255,255,255,0.85)', lineHeight: T.lhTight, marginBottom: 3 } as const;
  const sideSubText = { fontSize: T.small, color: 'rgba(255,255,255,0.6)', lineHeight: T.lhTight } as const;
  const sideLabel = {
    fontFamily: T.bold, fontSize: T.small, color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase' as const, letterSpacing: 0.9,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.2)',
    paddingBottom: 3, marginBottom: 6, marginTop: 14, lineHeight: T.lhTight,
  } as const;

  const sidebarContent = (
    <View fixed style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: SIDEBAR_W, paddingHorizontal: compact ? 12 : 16, paddingVertical: compact ? 16 : 22 }}>
      {p.photo && (
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <View style={{ width: 68, height: 90, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }}>
            <Image src={p.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </View>
        </View>
      )}
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

      {!isHidden(cv, 'skills') && skills.length > 0 && (
        <>
          <Text style={sideLabel}>{isLatam ? 'Habilidades' : 'Skills'}</Text>
          {skills.map((s) => <Text key={s.id} style={sideText}>· {s.name}</Text>)}
        </>
      )}

      {!isHidden(cv, 'languages') && languages.length > 0 && (
        <>
          <Text style={sideLabel}>{isLatam ? 'Idiomas' : 'Languages'}</Text>
          {languages.map((l) => (
            <View key={l.id} style={{ marginBottom: 5 }}>
              <Text style={{ fontFamily: T.bold, fontSize: T.meta, color: T.white, lineHeight: T.lhTight }}>{l.language}</Text>
              <Text style={sideSubText}>{l.isNative ? (isLatam ? 'Nativo' : 'Native') : l.proficiency}</Text>
            </View>
          ))}
        </>
      )}

      {!isHidden(cv, 'certifications') && certifications.length > 0 && (
        <>
          <Text style={sideLabel}>{isLatam ? 'Certificaciones' : 'Certifications'}</Text>
          {certifications.map((c) => (
            <View key={c.id} style={{ marginBottom: 6 }}>
              <Text style={{ fontFamily: T.bold, fontSize: T.small, color: T.white, lineHeight: T.lhTight }}>{c.name}</Text>
              {c.issuer && <Text style={sideSubText}>{c.issuer}</Text>}
            </View>
          ))}
        </>
      )}
    </View>
  );

  return (
    <Page size={isA4 ? 'A4' : 'LETTER'} style={{ fontFamily: T.regular, fontSize: T.body, color: T.dark, backgroundColor: '#fff', paddingLeft: SIDEBAR_W }}>
      <View fixed style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: SIDEBAR_W, backgroundColor: accent }} />
      {sidebarContent}
      <View style={{ paddingHorizontal: compact ? 16 : 20, paddingTop: compact ? 16 : 22, paddingBottom: compact ? 16 : PDF_FOOTER_H + 12 }}>
          {!isHidden(cv, 'objective') && cv.objective && (
            <View style={{ marginBottom: sectionGap }}>
              <ModernHeading accent={accent}>{isLatam ? 'Objetivo Profesional' : 'Professional Summary'}</ModernHeading>
              <Text style={{ fontSize: compact ? T.body - 0.5 : T.body, color: T.mid, lineHeight: compact ? 1.25 : T.lhBody }}>{sanitizeText(cv.objective)}</Text>
            </View>
          )}

          {!isHidden(cv, 'workExperience') && workExperience.length > 0 && (
            <View style={{ marginBottom: sectionGap }}>
              <ModernHeading accent={accent}>{isLatam ? 'Experiencia Laboral' : 'Work Experience'}</ModernHeading>
              {workExperience.map((exp, i) => (
                <View key={exp.id} wrap={false} style={{ marginBottom: i < workExperience.length - 1 ? T.entryGap : 0 }}>
                  <EntryHeader title={exp.title} right={dr(exp.startDate, exp.endDate, exp.isPresent)} accent={accent} sub={exp.company ? `${exp.company}${exp.location ? ` · ${exp.location}` : ''}` : undefined} />
                  {exp.description && <BodyText>{exp.description}</BodyText>}
                </View>
              ))}
            </View>
          )}

          {!isHidden(cv, 'education') && education.length > 0 && (
            <View style={{ marginBottom: sectionGap }}>
              <ModernHeading accent={accent}>{isLatam ? 'Formación Académica' : 'Education'}</ModernHeading>
              {education.map((edu, i) => (
                <View key={edu.id} wrap={false} style={{ marginBottom: i < education.length - 1 ? T.entryGap : 0 }}>
                  <EntryHeader title={`${sanitizeText(edu.degree)}${edu.fieldOfStudy ? `, ${sanitizeText(edu.fieldOfStudy)}` : ''}`} right={dr(edu.startDate, edu.endDate, edu.isPresent)} accent={accent} sub={`${sanitizeText(edu.institution)}${edu.gpa ? `  ·  ${isLatam ? 'Promedio' : 'GPA'} ${edu.gpa}` : ''}`} />
                </View>
              ))}
            </View>
          )}

          {!isHidden(cv, 'references') && references.length > 0 && (
            <View style={{ marginBottom: sectionGap }}>
              <ModernHeading accent={accent}>{isLatam ? 'Referencias' : 'References'}</ModernHeading>
              {references.map((r, i) => (
                <View key={r.id} style={{ marginBottom: i < references.length - 1 ? T.entryGap : 0 }}>
                  <Text style={{ fontFamily: T.bold, fontSize: T.body, color: T.dark, lineHeight: T.lhTight }}>{r.name}</Text>
                  <Text style={{ fontSize: T.meta, color: T.mid, lineHeight: T.lhTight }}>{r.title}, {r.company}</Text>
                  {r.email && <Text style={{ fontSize: T.meta, color: T.muted, lineHeight: T.lhTight }}>{r.email}</Text>}
                </View>
              ))}
            </View>
          )}
      </View>
      {!compact && <SafeFooter left={`Curriculum Vitae — ${p.firstName} ${p.lastName}`} />}
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

export function EUModernPDF({ cv, accent, compact = false }: { cv: CVData; accent: string; compact?: boolean }) {
  const p = cv.personalInfo;
  const SIDEBAR_W = compact ? 156 : 172;
  const sectionGap = compact ? T.sectionGap - 4 : T.sectionGap;
  const workExperience = compact ? cv.workExperience.slice(0, 3) : cv.workExperience;
  const education = compact ? cv.education.slice(0, 2) : cv.education;
  const skills = cv.skills.slice(0, compact ? 8 : 12);
  const languages = cv.languages.slice(0, compact ? 4 : 6);
  const certifications = cv.certifications.slice(0, compact ? 2 : 4);
  const references = cv.references.filter(hasReferenceContent);

  const header = (
    <View fixed style={{ position: 'absolute', top: 0, left: 0, right: 0, height: compact ? 76 : EU_HEADER_H, backgroundColor: accent, paddingHorizontal: compact ? 22 : 28, paddingVertical: compact ? 12 : 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1 }}>
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
      {p.photo && (
        <View style={{ width: 60, height: 76, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}>
          <Image src={p.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </View>
      )}
    </View>
  );

  const sidebar = (
    <View fixed style={{ position: 'absolute', left: 0, top: compact ? 76 : EU_HEADER_H, bottom: compact ? 0 : PDF_FOOTER_H, width: SIDEBAR_W, backgroundColor: '#f9fafb', paddingHorizontal: compact ? 14 : 18, paddingVertical: compact ? 14 : 18, borderRightWidth: 0.5, borderRightColor: '#e5e7eb' }}>
      {(p.dateOfBirth || p.nationality) && (
        <View style={{ marginBottom: sectionGap }}>
          <EUSideTitle accent={accent}>Personal</EUSideTitle>
          {p.dateOfBirth && <EUInfoLine label="Born" value={p.dateOfBirth} />}
          {p.nationality && <EUInfoLine label="Nationality" value={p.nationality} />}
        </View>
      )}

      {!isHidden(cv, 'skills') && skills.length > 0 && (
        <View style={{ marginBottom: sectionGap }}>
          <EUSideTitle accent={accent}>Skills</EUSideTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 3 }}>
            {skills.map((s) => (
              <Text key={s.id} style={{ fontSize: T.small, color: accent, backgroundColor: accent + '15', paddingHorizontal: 5, paddingVertical: 2, marginRight: 4, marginBottom: 4, lineHeight: T.lhTight }}>
                {s.name}
              </Text>
            ))}
          </View>
        </View>
      )}

      {!isHidden(cv, 'languages') && languages.length > 0 && (
        <View style={{ marginBottom: sectionGap }}>
          <EUSideTitle accent={accent}>Languages</EUSideTitle>
          {languages.map((l) => (
            <View key={l.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ fontSize: T.meta, color: T.dark, lineHeight: T.lhTight }}>{l.language}</Text>
              <Text style={{ fontFamily: T.bold, fontSize: T.small, color: accent, lineHeight: T.lhTight }}>{l.isNative ? 'Native' : l.proficiency}</Text>
            </View>
          ))}
        </View>
      )}

      {!isHidden(cv, 'certifications') && certifications.length > 0 && (
        <View style={{ marginBottom: sectionGap }}>
          <EUSideTitle accent={accent}>Courses & Certs</EUSideTitle>
          {certifications.map((c) => (
            <View key={c.id} style={{ marginBottom: 6 }}>
              <Text style={{ fontFamily: T.bold, fontSize: T.meta, color: T.dark, lineHeight: T.lhTight }}>{c.name}</Text>
              {c.issuer && <Text style={{ fontSize: T.small, color: T.mid, lineHeight: T.lhTight }}>{c.issuer}</Text>}
              {c.dateIssued && <Text style={{ fontSize: T.small, color: T.muted, lineHeight: T.lhTight }}>{fmtDate(c.dateIssued)}</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Page size="A4" style={{ fontFamily: T.regular, fontSize: compact ? T.body - 0.5 : T.body, color: T.dark, backgroundColor: '#fff', paddingTop: compact ? 76 : EU_HEADER_H, paddingBottom: compact ? 18 : PDF_FOOTER_H + 10, paddingLeft: SIDEBAR_W }}>
      {header}
      {sidebar}
      <View style={{ paddingHorizontal: compact ? 16 : 20, paddingVertical: compact ? 14 : 18 }}>
          {!isHidden(cv, 'objective') && cv.objective && (
            <View style={{ marginBottom: sectionGap }}>
              <EUMainTitle accent={accent}>Profile</EUMainTitle>
              <Text style={{ fontSize: compact ? T.body - 0.5 : T.body, color: T.mid, lineHeight: compact ? 1.25 : T.lhBody }}>{sanitizeText(cv.objective)}</Text>
            </View>
          )}

          {!isHidden(cv, 'workExperience') && workExperience.length > 0 && (
            <View style={{ marginBottom: sectionGap }}>
              <EUMainTitle accent={accent}>Work Experience</EUMainTitle>
              {workExperience.map((exp, i) => (
                <View key={exp.id} wrap={false} style={{ borderLeftWidth: 1.5, borderLeftColor: accent + '55', paddingLeft: 9, marginBottom: i < workExperience.length - 1 ? T.entryGap : 0 }}>
                  <EntryHeader title={exp.title} right={dr(exp.startDate, exp.endDate, exp.isPresent)} accent={accent} sub={exp.company ? `${exp.company}${exp.location ? ` · ${exp.location}` : ''}` : undefined} />
                  {exp.description && <BodyText>{exp.description}</BodyText>}
                </View>
              ))}
            </View>
          )}

          {!isHidden(cv, 'education') && education.length > 0 && (
            <View style={{ marginBottom: sectionGap }}>
              <EUMainTitle accent={accent}>Education & Training</EUMainTitle>
              {education.map((edu, i) => (
                <View key={edu.id} wrap={false} style={{ borderLeftWidth: 1.5, borderLeftColor: accent + '55', paddingLeft: 9, marginBottom: i < education.length - 1 ? T.entryGap : 0 }}>
                  <EntryHeader title={`${sanitizeText(edu.degree)}${edu.fieldOfStudy ? `, ${sanitizeText(edu.fieldOfStudy)}` : ''}`} right={dr(edu.startDate, edu.endDate, edu.isPresent)} accent={accent} sub={`${sanitizeText(edu.institution)}${edu.gpa ? `  ·  Grade ${edu.gpa}` : ''}`} />
                </View>
              ))}
            </View>
          )}

          {!isHidden(cv, 'references') && references.length > 0 && (
            <View style={{ marginBottom: sectionGap }}>
              <EUMainTitle accent={accent}>References</EUMainTitle>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {references.map((r) => (
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
      {!compact && <SafeFooter left={`Curriculum Vitae — ${p.firstName} ${p.lastName}`} />}
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

export function EuropassPDF({ cv, accent, compact = false }: { cv: CVData; accent: string; compact?: boolean }) {
  const p = cv.personalInfo;
  const pageMarginX = compact ? 32 : 40;
  const pageMarginY = compact ? 26 : 34;
  const sectionGap = compact ? T.sectionGap - 4 : T.sectionGap;
  const workExperience = compact ? cv.workExperience.slice(0, 3) : cv.workExperience;
  const education = compact ? cv.education.slice(0, 2) : cv.education;
  const skills = compact ? cv.skills.slice(0, 8) : cv.skills;
  const languages = compact ? cv.languages.slice(0, 4) : cv.languages;
  const certifications = compact ? cv.certifications.slice(0, 2) : cv.certifications;

  return (
    <Page size="A4" style={{ fontFamily: T.regular, fontSize: compact ? T.body - 0.5 : T.body, color: T.dark, backgroundColor: '#fff', paddingHorizontal: pageMarginX, paddingVertical: pageMarginY }}>
      {/* Header bar */}
      <View style={{ backgroundColor: accent, paddingHorizontal: compact ? 20 : 24, paddingVertical: compact ? 13 : 18, marginHorizontal: -pageMarginX, marginTop: -pageMarginY, marginBottom: compact ? 12 : 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: T.bold, fontSize: T.name, color: T.white, lineHeight: T.lhTight, marginBottom: 6 }}>{p.firstName} {p.lastName}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {p.email      && <Text style={{ fontSize: T.meta, color: 'rgba(255,255,255,0.85)', marginRight: 14 }}>{p.email}</Text>}
            {p.phone      && <Text style={{ fontSize: T.meta, color: 'rgba(255,255,255,0.85)', marginRight: 14 }}>{p.phone}</Text>}
            {p.address?.city && <Text style={{ fontSize: T.meta, color: 'rgba(255,255,255,0.85)', marginRight: 14 }}>{p.address.city}{p.address.country ? `, ${p.address.country}` : ''}</Text>}
            {p.nationality && <Text style={{ fontSize: T.meta, color: 'rgba(255,255,255,0.85)', marginRight: 14 }}>{p.nationality}</Text>}
            {p.dateOfBirth && <Text style={{ fontSize: T.meta, color: 'rgba(255,255,255,0.85)', marginRight: 14 }}>DOB: {p.dateOfBirth}</Text>}
          </View>
        </View>
        {p.photo && (
          <View style={{ width: 60, height: 76, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}>
            <Image src={p.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </View>
        )}
      </View>
      
      {!isHidden(cv, 'objective') && cv.objective && (
        <View style={{ marginBottom: sectionGap }}>
          <SectionHeading accent={accent}>Personal Statement</SectionHeading>
          <Text style={{ fontSize: compact ? T.body - 0.5 : T.body, color: T.mid, lineHeight: compact ? 1.25 : T.lhBody }}>{sanitizeText(cv.objective)}</Text>
        </View>
      )}

      {!isHidden(cv, 'workExperience') && workExperience.length > 0 && (
        <View style={{ marginBottom: sectionGap }}>
          <SectionHeading accent={accent}>Work Experience</SectionHeading>
          {workExperience.map((exp, i) => (
            <View key={exp.id} wrap={false} style={{ flexDirection: 'row', marginBottom: i < workExperience.length - 1 ? T.entryGap : 0 }}>
              <Text style={{ width: 72, fontSize: T.meta, color: T.muted, paddingTop: 1, lineHeight: T.lhTight }}>{dr(exp.startDate, exp.endDate, exp.isPresent)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: T.bold, fontSize: T.body, color: T.dark, lineHeight: T.lhTight }}>{exp.title}</Text>
                <Text style={{ fontSize: T.meta, color: T.mid, marginBottom: 2, lineHeight: T.lhTight }}>{exp.company}{exp.location ? ` · ${exp.location}` : ''}</Text>
                {exp.description && <Text style={{ fontSize: T.body, color: T.mid, lineHeight: T.lhBody }}>{sanitizeText(exp.description)}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {!isHidden(cv, 'education') && education.length > 0 && (
        <View style={{ marginBottom: sectionGap }}>
          <SectionHeading accent={accent}>Education & Training</SectionHeading>
          {education.map((edu, i) => (
            <View key={edu.id} wrap={false} style={{ flexDirection: 'row', marginBottom: i < education.length - 1 ? T.entryGap : 0 }}>
              <Text style={{ width: 72, fontSize: T.meta, color: T.muted, paddingTop: 1, lineHeight: T.lhTight }}>{dr(edu.startDate, edu.endDate, edu.isPresent)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: T.bold, fontSize: T.body, color: T.dark, lineHeight: T.lhTight }}>{sanitizeText(edu.degree)}{edu.fieldOfStudy ? `, ${sanitizeText(edu.fieldOfStudy)}` : ''}</Text>
                <Text style={{ fontSize: T.meta, color: T.mid, lineHeight: T.lhTight }}>{sanitizeText(edu.institution)}{edu.gpa ? `  ·  Grade ${edu.gpa}` : ''}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {!isHidden(cv, 'languages') && languages.length > 0 && (
        <View style={{ marginBottom: sectionGap }}>
          <SectionHeading accent={accent}>Language Skills</SectionHeading>
          {languages.map((l) => (
            <View key={l.id} style={{ flexDirection: 'row', marginBottom: 5 }}>
              <Text style={{ width: 90, fontFamily: T.bold, fontSize: T.body, color: T.dark, lineHeight: T.lhTight }}>{l.language}</Text>
              <Text style={{ fontFamily: T.bold, fontSize: T.meta, color: accent, lineHeight: T.lhTight }}>{l.isNative ? 'Native' : l.proficiency}</Text>
            </View>
          ))}
        </View>
      )}

      {!isHidden(cv, 'skills') && skills.length > 0 && (
        <View style={{ marginBottom: sectionGap }}>
          <SectionHeading accent={accent}>Digital & Technical Skills</SectionHeading>
          <Text style={{ fontSize: T.body, color: T.mid, lineHeight: T.lhBody }}>{skills.map((s) => s.name).join('  /  ')}</Text>
        </View>
      )}

      {!isHidden(cv, 'certifications') && certifications.length > 0 && (
        <View style={{ marginBottom: sectionGap }}>
          <SectionHeading accent={accent}>Courses & Certifications</SectionHeading>
          {certifications.map((c, i) => (
            <View key={c.id} style={{ flexDirection: 'row', marginBottom: i < certifications.length - 1 ? 5 : 0 }}>
              <Text style={{ width: 72, fontSize: T.meta, color: T.muted, lineHeight: T.lhTight }}>{fmtDate(c.dateIssued)}</Text>
              <Text style={{ flex: 1, fontSize: T.body, color: T.dark, lineHeight: T.lhTight }}>{sanitizeText(c.name)}{c.issuer ? <Text style={{ color: T.mid }}> — {sanitizeText(c.issuer)}</Text> : ''}</Text>
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
            <Text>{p.nearestStation ?? '　　　駅'}</Text>
          </View>
          <View style={{ ...jpCell, ...jpRow }}>
            <Text style={{ ...jpLabel, marginRight: 4 }}>通勤時間</Text>
            <Text>{p.commuteTime ? `約${p.commuteTime}分` : '約　　分'}</Text>
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
                  {e.company}{e.departmentName ? `　${e.departmentName}` : ''}　入社
                  {e.employmentType === 'contract' ? '（契約社員）'
                   : e.employmentType === 'part_time' ? '（アルバイト）' : ''}
                </Text>
              </View>
            </View>
            <View style={{ ...jpBorderB, ...jpRow }}>
              <View style={{ width: 55, ...jpBorderR, ...jpCell, alignItems: 'center' }}>
                <Text>{!e.isPresent && e.endDate ? toJpDate(e.endDate) : ''}</Text>
              </View>
              <View style={{ flex: 1, ...jpCell }}>
                <Text>{e.isPresent ? '現在に至る' : `退職${e.reasonForLeaving ? `（${e.reasonForLeaving}）` : ''}`}</Text>
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
            <Text style={{ color: '#333', lineHeight: 1.5 }}>{cv.selfPromotion ?? ''}</Text>
          </View>
          <View style={{ flex: 1, ...jpCell, minHeight: 70 }}>
            <Text style={{ fontFamily: 'JP', fontWeight: 'bold', fontSize: 7, marginBottom: 4 }}>志望動機</Text>
            <Text style={{ color: '#333', lineHeight: 1.5 }}>{cv.reasonForApplication ?? ''}</Text>
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

// ─── Japan 職務経歴書 (Shokumu Keirekisho — free-form career history) ──────────

export function JapanShokumuPDF({ cv }: { cv: CVData }) {
  const p = cv.personalInfo;

  const shLabel = {
    fontFamily: 'JP', fontWeight: 'bold' as const, fontSize: 8,
    color: '#374151', textTransform: 'uppercase' as const,
    letterSpacing: 0.5, borderBottomWidth: 0.5, borderBottomColor: '#d1d5db',
    paddingBottom: 3, marginBottom: 6,
  } as const;

  const shCell = { fontFamily: 'JP', fontSize: 8, color: '#1f2937', lineHeight: 1.5 } as const;
  const shMeta = { fontFamily: 'JP', fontSize: 7.5, color: '#6b7280', lineHeight: 1.4 } as const;

  return (
    <Page size="A4" style={{ fontFamily: 'JP', fontSize: 8, paddingTop: 36, paddingHorizontal: 36, paddingBottom: 58, color: '#111827', backgroundColor: '#fff', lineHeight: 1.5 }}>
      {/* Title */}
      <Text style={{ fontFamily: 'JP', fontWeight: 'bold', fontSize: 18, textAlign: 'center', letterSpacing: 6, marginBottom: 4 }}>
        職務経歴書
      </Text>
      <Text style={{ fontFamily: 'JP', fontSize: 7.5, color: '#9ca3af', textAlign: 'center', marginBottom: 20 }}>
        Shokumu Keirekisho
      </Text>

      {/* 氏名 + 日付 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'JP', fontWeight: 'bold', fontSize: 13 }}>
            {p.lastName}　{p.firstName}
          </Text>
          <Text style={{ fontFamily: 'JP', fontSize: 7.5, color: '#6b7280', marginTop: 2 }}>
            作成日：　　　年　　月　　日
          </Text>
        </View>
        {p.photo && (
          <View style={{ width: 56, height: 72, borderWidth: 0.75, borderColor: '#d1d5db' }}>
            <Image src={p.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </View>
        )}
      </View>

      {/* 連絡先 */}
      <View style={{ marginBottom: 16, borderWidth: 0.5, borderColor: '#e5e7eb', borderRadius: 4, padding: 8 }}>
        <Text style={{ ...shLabel, borderBottomColor: '#e5e7eb' }}>連絡先</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {p.email && <Text style={{ ...shMeta, marginRight: 20 }}>Email: {p.email}</Text>}
          {p.phone && <Text style={{ ...shMeta, marginRight: 20 }}>Tel: {p.phone}</Text>}
          {p.address?.city && (
            <Text style={{ ...shMeta, marginRight: 20 }}>
              {p.address.prefecture ?? ''}{p.address.city}
            </Text>
          )}
          {p.linkedIn && <Text style={shMeta}>LinkedIn: {p.linkedIn}</Text>}
        </View>
      </View>

      {/* 職務要約 */}
      {!isHidden(cv, 'objective') && cv.objective && (
        <View style={{ marginBottom: 14 }}>
          <Text style={shLabel}>職務要約</Text>
          <Text style={shCell}>{sanitizeText(cv.objective)}</Text>
        </View>
      )}

      {/* 職務経歴 */}
      {!isHidden(cv, 'workExperience') && cv.workExperience.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          <Text style={shLabel}>職務経歴</Text>
          {cv.workExperience.map((exp) => (
            <View key={exp.id} wrap={false} style={{ marginBottom: 10, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#d1d5db' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontFamily: 'JP', fontWeight: 'bold', fontSize: 9, color: '#111827' }}>
                  {exp.company}
                  {exp.departmentName ? `　${exp.departmentName}` : ''}
                </Text>
                <Text style={shMeta}>
                  {exp.startDate ? toJpDate(exp.startDate) : ''}
                  {' 〜 '}
                  {exp.isPresent ? '現在' : (exp.endDate ? toJpDate(exp.endDate) : '')}
                </Text>
              </View>
              <Text style={{ fontFamily: 'JP', fontWeight: 'bold', fontSize: 8, color: '#374151', marginBottom: 3 }}>
                {exp.title}
                {exp.employmentType === 'contract' ? '（契約社員）' : exp.employmentType === 'part_time' ? '（アルバイト）' : ''}
              </Text>
              {exp.description && <Text style={shCell}>{exp.description}</Text>}
            </View>
          ))}
        </View>
      )}

      {/* 学歴 */}
      {!isHidden(cv, 'education') && cv.education.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          <Text style={shLabel}>学歴</Text>
          {cv.education.map((edu) => (
            <View key={edu.id} style={{ flexDirection: 'row', marginBottom: 5 }}>
              <Text style={{ ...shMeta, width: 90 }}>
                {edu.startDate ? toJpDate(edu.startDate) : ''}
                {' 〜 '}
                {edu.isPresent ? '現在' : (edu.endDate ? toJpDate(edu.endDate) : '')}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'JP', fontWeight: 'bold', fontSize: 8, color: '#111827' }}>
                  {sanitizeText(edu.institution)}　{sanitizeText(edu.degree)}{edu.fieldOfStudy ? `　${sanitizeText(edu.fieldOfStudy)}` : ''}
                </Text>
                {edu.gpa && <Text style={shMeta}>GPA: {edu.gpa}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* スキル */}
      {!isHidden(cv, 'skills') && cv.skills.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          <Text style={shLabel}>スキル・ツール</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cv.skills.map((s) => (
              <Text key={s.id} style={{ ...shCell, marginRight: 12 }}>・{s.name}</Text>
            ))}
          </View>
        </View>
      )}

      {/* 語学 */}
      {!isHidden(cv, 'languages') && cv.languages.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          <Text style={shLabel}>語学</Text>
          {cv.languages.map((l) => (
            <Text key={l.id} style={{ ...shCell, marginBottom: 2 }}>
              {l.language}：{l.isNative ? 'ネイティブ' : l.proficiency}
              {l.certification ? `（${l.certification}）` : ''}
            </Text>
          ))}
        </View>
      )}

      {/* 資格・免許 */}
      {!isHidden(cv, 'certifications') && cv.certifications.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          <Text style={shLabel}>資格・免許</Text>
          {cv.certifications.map((c) => (
            <View key={c.id} style={{ flexDirection: 'row', marginBottom: 3 }}>
              {c.dateIssued && <Text style={{ ...shMeta, width: 70 }}>{toJpDate(c.dateIssued)}</Text>}
              <Text style={shCell}>{sanitizeText(c.name)}{c.issuer ? `（${sanitizeText(c.issuer)}）` : ''}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 自己PR */}
      {cv.selfPromotion && (
        <View style={{ marginBottom: 14 }}>
          <Text style={shLabel}>自己PR</Text>
          <Text style={shCell}>{cv.selfPromotion}</Text>
        </View>
      )}

      {/* 志望動機 */}
      {cv.reasonForApplication && (
        <View style={{ marginBottom: 14 }}>
          <Text style={shLabel}>志望動機</Text>
          <Text style={shCell}>{cv.reasonForApplication}</Text>
        </View>
      )}

      {/* Footer */}
      <View fixed style={{ position: 'absolute', bottom: 18, left: 36, right: 36, borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: 'JP', fontSize: 7, color: '#9ca3af' }}>
          {p.lastName} {p.firstName}　職務経歴書
        </Text>
        <Text style={{ fontFamily: 'JP', fontSize: 7, color: '#9ca3af' }}>GlobalCV by Bagalinis Consulting</Text>
      </View>
    </Page>
  );
}

// ─── Root document ─────────────────────────────────────────────────────────────

export function CVPDFDocument({ cv, config, exportMode = 'designed' }: Props) {
  const theme = getActiveTheme(cv, config);
  const accent = theme.primary;
  const tpl = cv.templateId;
  const compact = exportMode === 'compact';

  let page: React.ReactElement;
  if (tpl === 'jp-rirekisho') {
    page = <JapanRirekishoPDF cv={cv} />;
  } else if (tpl === 'jp-shokumu') {
    page = <JapanShokumuPDF cv={cv} />;
  } else if (tpl === 'in-modern' || tpl === 'latam-modern' || tpl === 'br-modern') {
    page = <ModernPDF cv={cv} accent={accent} isLatam compact={compact} />;
  } else if (tpl === 'us-modern' || tpl === 'gb-modern' || tpl === 'au-modern') {
    page = <ModernPDF cv={cv} accent={accent} compact={compact} />;
  } else if (tpl === 'eu-modern') {
    page = <EUModernPDF cv={cv} accent={accent} compact={compact} />;
  } else if (tpl === 'in-classic' || tpl === 'latam-traditional' || tpl === 'br-classic') {
    page = <ClassicPDF cv={cv} accent={accent} showPhoto compact={compact} />;
  } else if (tpl === 'eu-europass') {
    page = <EuropassPDF cv={cv} accent={accent} compact={compact} />;
  } else {
    // gb-classic, au-classic, us-classic → ClassicPDF
    page = <ClassicPDF cv={cv} accent={accent} compact={compact} />;
  }

  return (
    <Document title={`${cv.personalInfo.firstName} ${cv.personalInfo.lastName} - CV`}>
      {page}
    </Document>
  );
}
