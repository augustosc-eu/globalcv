import { CVData, WorkExperience, Education, Skill, Language, Market } from '@/types/cv.types';
import { createEmptyCVData } from '@/store/cvStore';

export type ImportFormat = 'plain' | 'markdown';

export interface ParseResult {
  data: Partial<CVData>;
  warnings: string[];
  detectedFormat: ImportFormat;
}

type SectionKey =
  | 'header'
  | 'objective'
  | 'workExperience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'certifications'
  | 'references'
  | '_ignore';

interface Section {
  key: SectionKey;
  lines: string[];
}

interface NormalizedInput {
  lines: string[];
  stats: {
    headingCount: number;
    markdownLinkCount: number;
    bulletCount: number;
  };
}

const SECTION_PATTERNS: Record<Exclude<SectionKey, 'header'>, RegExp> = {
  objective: /^(summary|profile|objective|about(?: me)?|professional summary|personal statement|career summary|objetivo|resumen|perfil)$/i,
  workExperience: /^(work experience|experience|employment|career history|professional experience|experiencia|職歴)$/i,
  education: /^(education|academic|qualifications|estudios|formaci[oó]n|academic background|学歴)$/i,
  skills: /^(skills|technical skills|core skills|key skills|competencies|tech stack|technologies|tools|habilidades(?: t[eé]cnicas)?|スキル|免許)$/i,
  languages: /^(languages|language skills|idiomas|語学)$/i,
  certifications: /^(certifications?|licenses?|licences?|awards|certificates?|certificaciones|資格)$/i,
  references: /^(references|referees|referencias)$/i,
  _ignore: /^(projects?|publications?|additional info|additional information|otros datos|soft skills|alineaci[oó]n|disponibilidad|habilidades personales)$/i,
};

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /(\+?[\d\s\-().]{7,20})/;
const LINKEDIN_RE = /linkedin\.com\/in\/[\w-]+/i;
const URL_RE = /https?:\/\/[^\s]+/i;

const MONTH_NAMES = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|ene|abr|ago|dic|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre';
const DATE_TOKEN = `(?:${MONTH_NAMES}|\\d{1,2}\\/\\d{4}|\\d{4}-\\d{2}|\\d{4})`;
const DATE_RANGE_RE = new RegExp(
  `(\\b(?:${MONTH_NAMES}|\\d{1,2}\\/\\d{4}|\\d{4}-\\d{2}|\\d{4})[^\\n]*?(?:–|—|-|to)\\s*(?:present|current|now|actualidad|actual|hoy|\\b${DATE_TOKEN}[\\w\\s,\\/]*))`,
  'i'
);

const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
  ene: '01', enero: '01',
  febrero: '02',
  marzo: '03',
  abr: '04', abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  ago: '08', agosto: '08',
  septiembre: '09',
  octubre: '10',
  noviembre: '11',
  dic: '12', diciembre: '12',
};

export function parseCVInput(text: string, market: Market): ParseResult {
  const detectedFormat = detectInputFormat(text);
  const normalized = detectedFormat === 'markdown'
    ? normalizeMarkdownResume(text)
    : { lines: normalizePlainText(text), stats: { headingCount: 0, markdownLinkCount: 0, bulletCount: 0 } };

  const result = parseNormalizedLines(normalized.lines, market, detectedFormat, normalized.stats);
  return {
    data: result.data,
    warnings: result.warnings,
    detectedFormat,
  };
}

export function parseRawCV(text: string, market: Market): ParseResult {
  return parseCVInput(text, market);
}

export function detectInputFormat(text: string): ImportFormat {
  let score = 0;
  if (/^\s{0,3}#{1,6}\s+\S+/m.test(text)) score += 2;
  if (/^\s{0,3}(?:[-*+]\s+|\d+[.)]\s+)\S+/m.test(text)) score += 1;
  if (/\[[^\]]+\]\((https?:\/\/[^)]+)\)/.test(text)) score += 2;
  if (/^.+\n(?:={3,}|-{3,})\s*$/m.test(text)) score += 1;
  if (/^\s{0,3}>/.test(text)) score += 1;
  return score >= 2 ? 'markdown' : 'plain';
}

function normalizePlainText(text: string): string[] {
  return text.split('\n').map((line) => line.trimEnd());
}

export function normalizeMarkdownResume(text: string): NormalizedInput {
  const markdownLinkCount = (text.match(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g) ?? []).length;
  const bulletCount = (text.match(/^\s{0,3}(?:[-*+]\s+|\d+[.)]\s+)/gm) ?? []).length;

  const withoutCodeFences = text.replace(/```[\s\S]*?```/g, '\n');
  const lines = withoutCodeFences.split('\n');
  const normalized: string[] = [];
  let headingCount = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i] ?? '';
    const next = lines[i + 1] ?? '';

    if (/^\s*(={3,}|-{3,})\s*$/.test(next) && current.trim()) {
      normalized.push(current.trim());
      headingCount += 1;
      i += 1;
      continue;
    }

    const line = normalizeLine(current);
    if (/^\s{0,3}#{1,6}\s+\S+/.test(current)) headingCount += 1;
    normalized.push(line);
  }

  return {
    lines: collapseBlankLines(normalized),
    stats: { headingCount, markdownLinkCount, bulletCount },
  };
}

export function normalizeLine(line: string): string {
  let normalized = line.replace(/\r/g, '').trimEnd();
  normalized = extractMarkdownLinks(normalized);
  normalized = normalized.replace(/^\s{0,3}#{1,6}\s+/, '');
  normalized = normalized.replace(/^\s{0,3}>+\s?/, '');
  normalized = normalized.replace(/^\s{0,3}(?:[-*+]\s+|\d+[.)]\s+)/, '');
  normalized = normalized.replace(/`([^`]+)`/g, '$1');
  normalized = normalized.replace(/(\*\*|__)(.*?)\1/g, '$2');
  normalized = normalized.replace(/(^|[^\w])(?:\*|_)([^*_]+)(?:\*|_)(?=[^\w]|$)/g, '$1$2');
  normalized = normalized.replace(/\\([\\`*_{}\[\]()#+.!-])/g, '$1');
  normalized = normalized.replace(/\s{2,}/g, ' ').trim();
  return normalized;
}

export function extractMarkdownLinks(line: string): string {
  return line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, target: string) => {
    const cleanTarget = target.trim();
    if (/^https?:\/\//i.test(cleanTarget)) return `${label} ${cleanTarget}`;
    return label;
  });
}

function collapseBlankLines(lines: string[]): string[] {
  const collapsed: string[] = [];
  for (const line of lines) {
    if (!line.trim() && !collapsed[collapsed.length - 1]?.trim()) continue;
    collapsed.push(line.trimEnd());
  }
  return collapsed;
}

function parseNormalizedLines(
  lines: string[],
  market: Market,
  format: ImportFormat,
  stats: NormalizedInput['stats']
): ParseResult {
  const result = createEmptyCVData(market);
  const warnings: string[] = [];
  const sections = splitIntoSections(lines);
  const recognizedSectionCount = sections.filter((section) => section.key !== 'header' && section.key !== '_ignore' && section.lines.length > 0).length;

  extractPersonalInfo(lines, result);

  const allSkills: Skill[] = [];
  for (const section of sections) {
    const sectionText = section.lines.join('\n').trim();
    if (!sectionText || section.key === '_ignore') continue;

    switch (section.key) {
      case 'objective':
        result.objective = sectionText.replace(/\n{2,}/g, '\n').trim();
        break;
      case 'workExperience':
        result.workExperience.push(...parseExperienceSection(section.lines, warnings));
        if (format === 'markdown' && section.lines.length > 0 && result.workExperience.length === 0) {
          warnings.push('Markdown experience section was found, but no dated roles were recognized. Keep role and date lines close together.');
        }
        break;
      case 'education':
        result.education.push(...parseEducationSection(section.lines));
        if (format === 'markdown' && section.lines.length > 0 && result.education.length === 0) {
          warnings.push('Markdown education section was found, but no dated education entries were recognized.');
        }
        break;
      case 'skills':
        allSkills.push(...parseSkillsSection(sectionText));
        break;
      case 'languages':
        result.languages = parseLanguagesSection(section.lines, warnings);
        break;
      case 'certifications':
        result.certifications = parseCertificationsSection(section.lines);
        break;
      case 'references':
      case 'header':
        break;
    }
  }

  const dedupedSkills = dedupeSkills(allSkills);
  if (dedupedSkills.total > dedupedSkills.items.length) {
    warnings.push(`${dedupedSkills.total} skills found — only the first ${dedupedSkills.items.length} were imported.`);
  }
  result.skills = dedupedSkills.items;

  if (!result.personalInfo.firstName && !result.personalInfo.lastName) {
    warnings.push('Name not detected — please fill it in manually.');
  }

  if (format === 'markdown') {
    if (stats.headingCount > 0 && recognizedSectionCount === 0) {
      warnings.push('Markdown headings were detected, but none matched the expected resume sections such as Summary, Experience, Education, or Skills.');
    } else if (stats.headingCount > 2 && recognizedSectionCount < 2) {
      warnings.push('Only a few Markdown headings were recognized. Consider using clearer headings like "Experience", "Education", and "Skills".');
    }
    if (stats.markdownLinkCount > 0 && !result.personalInfo.linkedIn && !result.personalInfo.website) {
      warnings.push('Markdown links were detected, but no LinkedIn or website field could be inferred.');
    }
  }

  return {
    data: result,
    warnings,
    detectedFormat: format,
  };
}

function splitIntoSections(lines: string[]): Section[] {
  const sections: Section[] = [];
  let currentSection: Section = { key: 'header', lines: [] };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const sectionKey = detectSection(line);
    if (sectionKey && line.length < 90) {
      sections.push(currentSection);
      currentSection = { key: sectionKey, lines: [] };
    } else {
      currentSection.lines.push(rawLine);
    }
  }
  sections.push(currentSection);
  return sections;
}

function extractPersonalInfo(lines: string[], result: CVData): void {
  const topLines = lines.slice(0, 15).map((line) => normalizeLine(line)).filter(Boolean);
  const topBlock = topLines.join('\n');

  const emailMatch = topBlock.match(EMAIL_RE);
  if (emailMatch) result.personalInfo.email = emailMatch[0];

  const phoneMatch = topBlock.match(PHONE_RE);
  if (phoneMatch) result.personalInfo.phone = phoneMatch[1].trim();

  const linkedInMatch = topBlock.match(LINKEDIN_RE);
  if (linkedInMatch) result.personalInfo.linkedIn = linkedInMatch[0];

  const urlMatch = topBlock.match(URL_RE);
  if (urlMatch && !urlMatch[0].includes('linkedin')) result.personalInfo.website = urlMatch[0];

  for (const line of topLines.slice(0, 5)) {
    if (!line) continue;
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || URL_RE.test(line)) continue;
    if (detectSection(line)) continue;
    if (line.length < 60) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        result.personalInfo.firstName = parts[0] ?? '';
        result.personalInfo.lastName = parts.slice(1).join(' ') ?? '';
      } else {
        result.personalInfo.firstName = line;
        result.personalInfo.lastName = '';
      }
      break;
    }
  }

  for (const line of topLines.slice(0, 8)) {
    const clean = stripLeadingSymbols(line).replace(/\(.*?\)/g, '').trim();
    if (!clean || EMAIL_RE.test(clean) || PHONE_RE.test(clean)) continue;
    const cityCountry = clean.match(/^([^,\d@|]{2,40}),\s*([^,\d@|]{2,40})$/);
    if (cityCountry) {
      result.personalInfo.address = {
        ...(result.personalInfo.address ?? {}),
        city: cityCountry[1].trim(),
        country: cityCountry[2].trim(),
      };
      break;
    }
  }
}

function stripLeadingSymbols(s: string): string {
  return s.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F300}-\u{1F9FF}\s📍📞📧🪪🚀⚙️🛠💼🎓🌍]+/u, '').trim();
}

function isHeaderLike(line: string): boolean {
  const stripped = stripLeadingSymbols(line.trim());
  if (!stripped || stripped.length > 70) return false;
  const words = stripped.split(/\s+/).filter((word) => /[a-zA-ZÀ-ÿ]/.test(word));
  if (words.length === 0) return false;
  const allCapsCount = words.filter((word) => word.length > 1 && word === word.toUpperCase()).length;
  if (allCapsCount / words.length >= 0.6) return true;
  if (words.length <= 4) return true;
  return false;
}

function detectSection(line: string): SectionKey | null {
  if (!isHeaderLike(line)) return null;
  const trimmed = stripLeadingSymbols(line.trim()).replace(/[:\-–—]+$/, '').toLowerCase();
  for (const [key, re] of Object.entries(SECTION_PATTERNS)) {
    if (re.test(trimmed)) return key as SectionKey;
  }
  return null;
}

function parseDateToYM(str: string): string {
  const s = str.trim().toLowerCase();
  const slash = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[2]}-${slash[1].padStart(2, '0')}`;
  const isoYM = s.match(/^(\d{4})-(\d{2})$/);
  if (isoYM) return `${isoYM[1]}-${isoYM[2]}`;
  const monthYear = s.match(/^([a-záéíóúñ]+)[.,\s\-]+(\d{4})$/);
  if (monthYear) return MONTH_MAP[monthYear[1]] ? `${monthYear[2]}-${MONTH_MAP[monthYear[1]]}` : monthYear[2];
  const yearMonth = s.match(/^(\d{4})[.\s\-]+([a-záéíóúñ]+)$/);
  if (yearMonth) return MONTH_MAP[yearMonth[2]] ? `${yearMonth[1]}-${MONTH_MAP[yearMonth[2]]}` : yearMonth[1];
  // Year only: keep year precision — never invent a month.
  const year = s.match(/^(\d{4})$/);
  if (year) return year[1];
  return '';
}

const PRESENT_RE = /^(?:present|current|now|today|actualidad|actual|hoy|presente|atual|atualmente|現在)$/i;
const DATE_PIECE_RE = new RegExp(
  `(\\d{4}-\\d{2}|\\d{1,2}\\/\\d{4}|(?:${MONTH_NAMES}|sept)\\.?[\\s,\\-]+\\d{4}|\\d{4}|present|current|now|today|actualidad|actual|hoy|presente|atualmente|atual|現在)`,
  'gi'
);

/** Extract start/end from strings like "Jan 2020 – Present", "2020-01 - 2021-03", "03/2016 - 12/2019", "2012 - 2016". */
function parseDateRange(str: string): { startDate: string; endDate: string; isPresent: boolean } {
  const pieces = (str.match(DATE_PIECE_RE) ?? []).map((piece) => piece.trim());
  const [left = '', right = ''] = pieces;
  const isPresent = PRESENT_RE.test(right);
  return {
    startDate: parseDateToYM(left),
    endDate: isPresent ? '' : parseDateToYM(right),
    isPresent,
  };
}

function genId(): string {
  return `parsed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function cleanText(s: string): string {
  return normalizeLine(stripLeadingSymbols(s)).replace(/^[|\s·•▪▸✔✓*,–\-]+/, '').replace(/[|\s]+$/, '').trim();
}

interface ParsedLine {
  text: string;
  bullet: boolean;
}

const BULLET_RE = /^\s*(?:[-*+•·▪▸✔✓]|\d+[.)])\s+/;

function toParsedLines(lines: string[]): ParsedLine[] {
  return lines
    .map((line) => ({ text: cleanText(line), bullet: BULLET_RE.test(normalizeLine(line)) }))
    .filter((line) => Boolean(line.text));
}

const COMPANY_HINT_RE = /\b(ltd|limited|inc|llc|llp|plc|gmbh|ag|s\.?a\.?|s\.?l\.?|b\.?v\.?|pty|corp|corporation|company|co\.|group|holdings|bank|university|universidad|universidade|college|school|hospital|agency|studio|labs?|technologies|solutions|consulting|partners|foundation|ministry|council|nhs)\b/i;
const TITLE_HINT_RE = /\b(engineer|developer|manager|director|analyst|designer|consultant|lead|head|officer|specialist|intern|assistant|associate|coordinator|architect|scientist|administrator|advisor|adviser|executive|representative|technician|accountant|teacher|nurse|editor|writer|researcher|programmer|tester|owner|founder|president|vp|cto|ceo|cfo|chief|supervisor|clerk|trainee|apprentice|ingeniero|desarrollador|gerente|analista|diseñador|desenvolvedor|engenheiro)\b/i;

/** Split "Title — Company", "Company | Title", "Title at Company", "Title, Company". */
export function splitTitleCompany(value: string): { title: string; company: string } | null {
  const text = value.replace(/[•]/g, '|').trim();
  if (!text) return null;
  let parts: string[] | null = null;
  const strong = text.split(/\s+[|—–]\s+|\s+-\s+|\s*\|\s*/).map((p) => cleanText(p)).filter(Boolean);
  if (strong.length >= 2) parts = strong;
  if (!parts) {
    const at = text.match(/^(.+?)\s+(?:at|@|en|na|no)\s+(.+)$/i);
    if (at && TITLE_HINT_RE.test(at[1])) parts = [at[1], at[2]];
  }
  if (!parts && (text.match(/,/g) ?? []).length === 1) {
    const [left, right] = text.split(',').map((p) => cleanText(p));
    if (left && right) parts = [left, right];
  }
  if (!parts) return null;
  const [first, second, ...rest] = parts;
  const restText = rest.join(', ');
  const firstLooksCompany = COMPANY_HINT_RE.test(first) && !TITLE_HINT_RE.test(first);
  const secondLooksTitle = TITLE_HINT_RE.test(second) && !COMPANY_HINT_RE.test(second);
  if (firstLooksCompany || (secondLooksTitle && !TITLE_HINT_RE.test(first))) {
    return { title: second, company: [first, restText].filter(Boolean).join(', ') };
  }
  return { title: first, company: [second, restText].filter(Boolean).join(', ') };
}

function looksLikeHeader(line: ParsedLine | undefined): boolean {
  if (!line || line.bullet) return false;
  const t = line.text;
  if (t.length > 90) return false;
  if (/\s[|—–]\s|\s-\s|\|/.test(t)) return true;
  if (/[.!?]$/.test(t) && t.split(/\s+/).length > 8) return false;
  return true;
}

interface EntryHeader {
  title: string;
  company: string;
  /** Number of lines before the date line that belong to this entry's header. */
  consumedBefore: number;
}

function inferEntryHeader(lines: ParsedLine[], dateIdx: number, withoutDate: string, minIdx: number): EntryHeader {
  const prev = dateIdx - 1 >= minIdx && looksLikeHeader(lines[dateIdx - 1]) ? lines[dateIdx - 1].text : '';
  const prevPrev = prev && dateIdx - 2 >= minIdx && looksLikeHeader(lines[dateIdx - 2]) ? lines[dateIdx - 2].text : '';

  // Date line itself carries "Title — Company".
  if (withoutDate) {
    const split = splitTitleCompany(withoutDate);
    if (split) return { ...split, consumedBefore: 0 };
    if (prev) {
      const prevSplit = splitTitleCompany(prev);
      if (prevSplit) return { ...prevSplit, consumedBefore: 1 };
      // Two separate lines: one is the title, one the company.
      return COMPANY_HINT_RE.test(prev) && !TITLE_HINT_RE.test(prev)
        ? { title: withoutDate, company: prev, consumedBefore: 1 }
        : { title: prev, company: withoutDate, consumedBefore: 1 };
    }
    return { title: withoutDate, company: '', consumedBefore: 0 };
  }

  if (prev) {
    const split = splitTitleCompany(prev);
    if (split) return { ...split, consumedBefore: 1 };
    if (prevPrev) {
      const prevPrevIsCompany = COMPANY_HINT_RE.test(prevPrev) && !COMPANY_HINT_RE.test(prev);
      const prevIsTitle = TITLE_HINT_RE.test(prev) && !TITLE_HINT_RE.test(prevPrev);
      if (prevPrevIsCompany || prevIsTitle) return { title: prev, company: prevPrev, consumedBefore: 2 };
      return { title: prevPrev, company: prev, consumedBefore: 2 };
    }
    return { title: prev, company: '', consumedBefore: 1 };
  }
  return { title: '', company: '', consumedBefore: 0 };
}

function parseExperienceSection(lines: string[], warnings: string[] = []): WorkExperience[] {
  const parsed = toParsedLines(lines);
  const dateIndices = parsed
    .map((line, i) => ({ i, line: line.text }))
    .filter(({ line }) => DATE_RANGE_RE.test(line));

  if (dateIndices.length === 0) return [];

  // First pass: headers (so each description stops where the next header starts).
  const headers: EntryHeader[] = [];
  for (let d = 0; d < dateIndices.length; d += 1) {
    const { i: dateIdx, line: dateLine } = dateIndices[d];
    const dateMatch = dateLine.match(DATE_RANGE_RE);
    const withoutDate = dateMatch ? cleanText(dateLine.replace(dateMatch[1], '')) : '';
    const minIdx = d === 0 ? 0 : dateIndices[d - 1].i + 1;
    headers.push(inferEntryHeader(parsed, dateIdx, withoutDate, minIdx));
  }

  const firstHeaderStart = dateIndices[0].i - headers[0].consumedBefore;
  if (firstHeaderStart > 0) {
    warnings.push(`${firstHeaderStart} line(s) before the first dated role in Experience were not imported.`);
  }

  const entries: WorkExperience[] = [];
  for (let d = 0; d < dateIndices.length; d += 1) {
    const { i: dateIdx, line: dateLine } = dateIndices[d];
    const dateMatch = dateLine.match(DATE_RANGE_RE);
    if (!dateMatch) continue;

    const { startDate, endDate, isPresent } = parseDateRange(dateMatch[1]);
    const context = headers[d];
    const nextStart = d + 1 < dateIndices.length
      ? dateIndices[d + 1].i - headers[d + 1].consumedBefore
      : parsed.length;
    const description = cleanDescriptionLines(
      parsed.slice(dateIdx + 1, Math.max(dateIdx + 1, nextStart)).map((line) => line.text),
      context
    ).join('\n');

    if (context.title || context.company || description) {
      entries.push({
        id: genId(),
        company: context.company,
        title: context.title,
        startDate,
        endDate,
        isPresent,
        description,
        employmentType: 'full_time',
      });
    }
  }

  return entries;
}

function cleanDescriptionLines(
  lines: string[],
  context: { title: string; company: string }
): string[] {
  const seen = new Set<string>();
  const normalizedTitle = normalizeComparison(context.title);
  const normalizedCompany = normalizeComparison(context.company);
  const normalizedCombined = normalizeComparison(
    [context.title, context.company].filter(Boolean).join(' ')
  );

  return lines.filter((line) => {
    const trimmed = cleanText(line);
    if (!trimmed) return false;
    if (isArtifactOnlyLine(trimmed)) return false;

    const comparable = normalizeComparison(trimmed);
    if (comparable === normalizedTitle || comparable === normalizedCompany || comparable === normalizedCombined) {
      return false;
    }
    if (seen.has(comparable)) return false;
    seen.add(comparable);
    return true;
  });
}

function isArtifactOnlyLine(line: string): boolean {
  if (!line) return true;
  if (/^\[[^\]]+\]$/.test(line)) return true;
  if (/^\([^)]*\)$/.test(line) && /%[0-9a-f]{2}|\/|\.md\b/i.test(line)) return true;
  if (/^(https?:\/\/|www\.)\S+$/i.test(line)) return true;
  if (/^[\w.\-/%]+\/[\w.\-/%]+(?:\.\w+)?$/i.test(line) && /%[0-9a-f]{2}|\.md\b|portfolio|github|linkedin/i.test(line)) return true;
  return false;
}

function normalizeComparison(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function parseEducationSection(lines: string[]): Education[] {
  const nonEmpty = lines.map((line) => cleanText(line)).filter(Boolean);
  const dateIndices = nonEmpty
    .map((line, i) => ({ i, line }))
    .filter(({ line }) => DATE_RANGE_RE.test(line));

  if (dateIndices.length === 0) return [];

  const entries: Education[] = [];

  for (let d = 0; d < dateIndices.length; d += 1) {
    const { i: dateIdx, line: dateLine } = dateIndices[d];
    const dateMatch = dateLine.match(DATE_RANGE_RE);
    if (!dateMatch) continue;

    const { startDate, endDate, isPresent } = parseDateRange(dateMatch[1]);
    const withoutDate = cleanText(dateLine.replace(dateMatch[1], ''));
    const prev = dateIdx > 0 ? nonEmpty[dateIdx - 1] : '';
    const prevPrev = dateIdx > 1 ? nonEmpty[dateIdx - 2] : '';
    let degree = '';
    let institution = '';
    let fieldOfStudy: string | undefined;

    if (prev && withoutDate) {
      degree = prev;
      institution = withoutDate;
    } else if (withoutDate) {
      const parts = withoutDate.replace(/[·|,]/g, '|').split('|').map((s) => cleanText(s)).filter(Boolean);
      degree = parts[0] ?? '';
      institution = parts[1] ?? prevPrev ?? '';
    } else if (prev) {
      const parts = prev.replace(/[·|,]/g, '|').split('|').map((s) => cleanText(s)).filter(Boolean);
      degree = parts[0] ?? '';
      institution = parts[1] ?? prevPrev ?? '';
    }

    const nextIdx = dateIndices[d + 1]?.i ?? nonEmpty.length;
    const extraLines = nonEmpty.slice(dateIdx + 1, nextIdx);
    let gpa: string | undefined;
    for (const line of extraLines) {
      const gpaMatch = line.match(/gpa[:\s]+([0-9.]+)/i);
      if (gpaMatch) {
        gpa = gpaMatch[1];
        continue;
      }
      if (!fieldOfStudy && line.length < 80) fieldOfStudy = line;
    }

    if (degree || institution) {
      entries.push({
        id: genId(),
        institution,
        degree,
        fieldOfStudy,
        startDate,
        endDate,
        isPresent,
        gpa,
      });
    }
  }

  return entries;
}

function parseSkillsSection(text: string): Skill[] {
  const items = text
    .replace(/[•·▪▸\-✔✓]/g, ',')
    .split(/[,|\n]/)
    .map((s) => cleanText(s).replace(/\s*\(.*?\)\s*$/, ''))
    .filter((s) => s.length > 1 && s.length < 60);

  return [...new Set(items)].slice(0, 30).map((name) => ({
    id: genId(),
    name,
    level: 3,
  }));
}

const LANGUAGE_NAME = `[A-Za-zÀ-ÿ\\u3040-\\u30FF\\u4E00-\\u9FFF][A-Za-zÀ-ÿ\\u3040-\\u30FF\\u4E00-\\u9FFF\\s'.]{0,40}`;
const LANGUAGE_PATTERNS = [
  new RegExp(`^(${LANGUAGE_NAME}?)\\s*\\(([^)]*)\\)\\s*$`),
  new RegExp(`^(${LANGUAGE_NAME}?)\\s*[:\\-–—]\\s*(.+)$`),
  new RegExp(`^(${LANGUAGE_NAME})$`),
];

function matchLanguageItem(item: string): { name: string; level: string } | null {
  for (const re of LANGUAGE_PATTERNS) {
    const m = item.match(re);
    if (m && m[1]?.trim()) return { name: m[1].trim(), level: (m[2] ?? '').trim() };
  }
  return null;
}

/** Split "English (Native), German (B2); French – A2" into items, ignoring commas inside parentheses. */
function splitLanguageItems(line: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of line) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && /[,;|•·\/]/.test(ch)) {
      items.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  items.push(current);
  return items.map((item) => item.trim()).filter(Boolean);
}

function parseLanguagesSection(lines: string[], warnings: string[] = []): Language[] {
  const languages: Language[] = [];
  for (const line of lines) {
    const trimmed = cleanText(line);
    if (!trimmed) continue;
    for (const item of splitLanguageItems(trimmed)) {
      const match = matchLanguageItem(item);
      if (!match) {
        warnings.push(`Language not recognised and skipped: "${item}".`);
        continue;
      }
      const languageName = match.name;
      const level = match.level.replace(/[\[\]()]/g, '').trim();
      const isNative = /native|nativo|nativa|mother tongue|lengua materna|língua materna|母語|ネイティブ/i.test(level);
      const proficiency = level ? mapProficiency(level) : 'professional';
      if (!level) warnings.push(`No level found for ${languageName} — set to "professional"; please review.`);
      languages.push({ id: genId(), language: languageName, proficiency, isNative });
    }
  }
  if (languages.length > 10) warnings.push(`${languages.length} languages found — only the first 10 were imported.`);
  return languages.slice(0, 10);
}

function mapProficiency(raw: string): Language['proficiency'] {
  const s = raw.toLowerCase().trim();
  const cefr = s.match(/\b([abc][12])\b/i);
  if (cefr) return cefr[1].toUpperCase() as Language['proficiency'];
  const jlpt = s.match(/\b(n[1-5])\b/i);
  if (jlpt) return jlpt[1].toUpperCase() as Language['proficiency'];
  if (/native|nativo|nativa|mother tongue|materna|母語|ネイティブ/i.test(s)) return 'native';
  if (/fluent|fluido|fluente|fluida|bilingual|bilingüe|bilíngue|流暢/i.test(s)) return 'fluent';
  if (/profici|professional|profesional|profissional|business|negocios|ビジネス/i.test(s)) return 'professional';
  if (/conversational|conversacional|日常会話/i.test(s)) return 'conversational';
  if (/upper.?inter/i.test(s)) return 'B2';
  if (/avanzado|avançado|advanced|上級/i.test(s)) return 'C1';
  if (/intermedio|intermediário|intermediate|中級/i.test(s)) return 'B1';
  if (/básico|basico|basic|elementary|beginner|初級/i.test(s)) return 'basic';
  if (/maestría|mastery/i.test(s)) return 'C2';
  return 'professional';
}

function parseCertificationsSection(lines: string[]) {
  const certs = [];
  for (const line of lines) {
    const trimmed = cleanText(line);
    if (!trimmed) continue;
    const parts = trimmed.split(/[·—\-,|]/);
    certs.push({
      id: genId(),
      name: parts[0]?.trim() ?? trimmed,
      issuer: parts[1]?.trim() ?? '',
      dateIssued: parts[2]?.trim() ?? '',
    });
  }
  return certs.slice(0, 10);
}

function dedupeSkills(skills: Skill[]): { total: number; items: Skill[] } {
  const total = skills.length;
  const seen = new Set<string>();
  const items = skills.filter((skill) => {
    const key = skill.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 30);
  return { total, items };
}
