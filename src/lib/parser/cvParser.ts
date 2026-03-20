import { CVData, WorkExperience, Education, Skill, Language, Market } from '@/types/cv.types';
import { createEmptyCVData } from '@/store/cvStore';

export interface ParseResult {
  data: Partial<CVData>;
  warnings: string[];
}

// ─── Section heading detection ────────────────────────────────────────────────

const SECTION_PATTERNS: Record<string, RegExp> = {
  objective:      /^(summary|profile|objective|about me|professional summary|personal statement|objetivo|resumen|perfil)/i,
  workExperience: /^(work experience|experience|employment|career history|professional experience|experiencia|職歴)/i,
  education:      /^(education|academic|qualifications|estudios|formaci[oó]n|学歴)/i,
  skills:         /^(skills|technical skills|competencies|habilidades t[eé]cnicas|スキル|免許)/i,
  languages:      /^(languages|language skills|idiomas|語学)/i,
  certifications: /^(certifications?|licenses?|awards|certificaciones|資格)/i,
  references:     /^(references|referees|referencias)/i,
  _ignore:        /^(alineaci[oó]n|disponibilidad|habilidades personales|soft skills|otros datos|additional info)/i,
};

// Strip leading emoji / symbols so "💼 EXPERIENCIA PROFESIONAL" → "EXPERIENCIA PROFESIONAL"
function stripLeadingSymbols(s: string): string {
  return s.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F300}-\u{1F9FF}\s📍📞📧🪪🚀⚙️🛠💼🎓🌍]+/u, '').trim();
}

// Returns true only for lines that look like deliberate section headers:
// mostly ALL-CAPS words (Spanish CVs) or short title-cased English headers.
function isHeaderLike(line: string): boolean {
  const stripped = stripLeadingSymbols(line.trim());
  if (!stripped || stripped.length > 70) return false;
  const words = stripped.split(/\s+/).filter((w) => /[a-zA-ZÀ-ÿ]/.test(w));
  if (words.length === 0) return false;
  // Count words that are fully uppercase (length > 1 to skip single letters like "I")
  const allCapsCount = words.filter((w) => w.length > 1 && w === w.toUpperCase()).length;
  if (allCapsCount / words.length >= 0.6) return true;
  // Short headers (≤ 4 words) that are title-cased — covers English "Work Experience" etc.
  if (words.length <= 4) return true;
  return false;
}

function detectSection(line: string): string | null {
  if (!isHeaderLike(line)) return null;
  const trimmed = stripLeadingSymbols(line.trim()).replace(/[:\-–—]+$/, '').toLowerCase();
  for (const [key, re] of Object.entries(SECTION_PATTERNS)) {
    if (re.test(trimmed)) return key;
  }
  return null;
}

// ─── Personal info extraction ─────────────────────────────────────────────────

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /(\+?[\d\s\-().]{7,20})/;
const LINKEDIN_RE = /linkedin\.com\/in\/[\w-]+/i;
const URL_RE = /https?:\/\/[^\s]+/i;

// Matches: "YYYY - YYYY", "MMM YYYY - MMM YYYY", "MM/YYYY - MM/YYYY", "YYYY-MM - YYYY-MM", mixed
const MONTH_NAMES = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|ene|abr|ago|dic|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre';
const DATE_TOKEN = `(?:${MONTH_NAMES}|\\d{1,2}\\/\\d{4}|\\d{4}-\\d{2}|\\d{4})`;
const DATE_RANGE_RE = new RegExp(
  `(\\b(?:${MONTH_NAMES}|\\d{1,2}\\/\\d{4}|\\d{4}-\\d{2}|\\d{4})[^\\n]*?(?:–|—|-|to)\\s*(?:present|current|now|actualidad|actual|hoy|\\b${DATE_TOKEN}[\\w\\s,\\/]*))`,
  'i'
);

const MONTH_MAP: Record<string, string> = {
  // English full & abbreviated
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
  // Spanish full & abbreviated
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

function parseDateToYM(str: string): string {
  const s = str.trim().toLowerCase();
  // "MM/YYYY" or "M/YYYY"
  const slash = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[2]}-${slash[1].padStart(2, '0')}`;
  // "YYYY-MM" (ISO partial)
  const isoYM = s.match(/^(\d{4})-(\d{2})$/);
  if (isoYM) return `${isoYM[1]}-${isoYM[2]}`;
  // "MMM YYYY" or "MMM-YYYY" or "MMM. YYYY"
  const mY = s.match(/^([a-záéíóúñ]+)[.\s\-]+(\d{4})$/);
  if (mY) return `${mY[2]}-${MONTH_MAP[mY[1]] ?? '01'}`;
  // "YYYY MMM" (reversed)
  const Ym = s.match(/^(\d{4})[.\s\-]+([a-záéíóúñ]+)$/);
  if (Ym) return `${Ym[1]}-${MONTH_MAP[Ym[2]] ?? '01'}`;
  // "YYYY"
  const y = s.match(/^(\d{4})$/);
  if (y) return `${y[1]}-01`;
  return '';
}

function parseDateRange(str: string): { startDate: string; endDate: string; isPresent: boolean } {
  const parts = str.split(/\s*(?:–|—| to )\s*|-(?=\s*\d)/i).map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return { startDate: parseDateToYM(str), endDate: '', isPresent: false };
  const [left, right] = parts;
  const isPresent = /present|current|now|actualidad|actual/i.test(right ?? '');
  return {
    startDate: parseDateToYM(left ?? ''),
    endDate: isPresent ? '' : parseDateToYM(right ?? ''),
    isPresent,
  };
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseRawCV(text: string, market: Market): ParseResult {
  const lines = text.split('\n').map((l) => l.trimEnd());
  const result = createEmptyCVData(market);
  const warnings: string[] = [];

  // 1. Extract contact info from the top block (first 15 lines)
  const topBlock = lines.slice(0, 15).join('\n');

  const emailMatch = topBlock.match(EMAIL_RE);
  if (emailMatch) result.personalInfo.email = emailMatch[0];

  const phoneMatch = topBlock.match(PHONE_RE);
  if (phoneMatch) result.personalInfo.phone = phoneMatch[1].trim();

  const linkedInMatch = topBlock.match(LINKEDIN_RE);
  if (linkedInMatch) result.personalInfo.linkedIn = linkedInMatch[0];

  const urlMatch = topBlock.match(URL_RE);
  if (urlMatch && !urlMatch[0].includes('linkedin')) result.personalInfo.website = urlMatch[0];

  // 2. Guess name from first non-empty line (strip leading emoji first)
  for (const line of lines.slice(0, 5)) {
    const clean = stripLeadingSymbols(line.trim());
    if (!clean) continue;
    if (EMAIL_RE.test(clean) || PHONE_RE.test(clean) || URL_RE.test(clean)) continue;
    // Reject lines that look like section headers or job titles (all-caps multi-word)
    if (detectSection(clean)) continue;
    if (clean.length < 60) {
      const parts = clean.split(/\s+/);
      if (parts.length >= 2) {
        result.personalInfo.firstName = parts[0] ?? '';
        result.personalInfo.lastName = parts.slice(1).join(' ') ?? '';
      } else {
        // Single-name (e.g. some Indonesian/Icelandic names)
        result.personalInfo.firstName = clean;
        result.personalInfo.lastName = '';
      }
      break;
    }
  }

  // 3. Try to extract city/country from top block
  for (const line of lines.slice(0, 8)) {
    const clean = stripLeadingSymbols(line.trim()).replace(/\(.*?\)/g, '').trim();
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

  // 4. Split document into sections
  type Section = { key: string; lines: string[] };
  const sections: Section[] = [];
  let currentSection: Section = { key: 'header', lines: [] };

  for (const line of lines) {
    const sectionKey = detectSection(line);
    if (sectionKey && line.trim().length < 80) {
      sections.push(currentSection);
      currentSection = { key: sectionKey, lines: [] };
    } else {
      currentSection.lines.push(line);
    }
  }
  sections.push(currentSection);

  // 5. Process each section — skills are merged across multiple skill sections
  const allSkills: Skill[] = [];

  for (const section of sections) {
    const sectionText = section.lines.join('\n').trim();
    if (!sectionText || section.key === '_ignore') continue;

    switch (section.key) {
      case 'objective':
        result.objective = sectionText.replace(/\n{2,}/g, '\n').trim();
        break;
      case 'workExperience':
        result.workExperience.push(...parseExperienceSection(section.lines));
        break;
      case 'education':
        result.education.push(...parseEducationSection(section.lines));
        break;
      case 'skills':
        allSkills.push(...parseSkillsSection(sectionText));
        break;
      case 'languages':
        result.languages = parseLanguagesSection(section.lines);
        break;
      case 'certifications':
        result.certifications = parseCertificationsSection(section.lines);
        break;
    }
  }

  const SKILL_CAP = 30;
  if (allSkills.length > 0) {
    const seen = new Set<string>();
    const deduped = allSkills.filter((s) => {
      const key = s.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (deduped.length > SKILL_CAP) {
      warnings.push(`${deduped.length} skills found — only the first ${SKILL_CAP} were imported.`);
    }
    result.skills = deduped.slice(0, SKILL_CAP);
  }

  if (!result.personalInfo.firstName && !result.personalInfo.lastName) {
    warnings.push('Name not detected — please fill it in manually.');
  }

  return { data: result, warnings };
}

// ─── Section parsers ──────────────────────────────────────────────────────────

function genId() { return `parsed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

// Clean a string that may have leading emoji/location markers (📍) or trailing pipes
function cleanText(s: string): string {
  return stripLeadingSymbols(s).replace(/^[|\s·,–\-]+/, '').replace(/[|\s]+$/, '').trim();
}

function parseExperienceSection(lines: string[]): WorkExperience[] {
  // Two-pass approach: ignore blank lines, find all date lines, then slice entries between them.
  const nonEmpty = lines
    .map((l) => l.trim())
    .filter(Boolean);

  const dateIndices = nonEmpty
    .map((line, i) => ({ i, line }))
    .filter(({ line }) => DATE_RANGE_RE.test(line));

  if (dateIndices.length === 0) return [];

  const entries: WorkExperience[] = [];

  for (let d = 0; d < dateIndices.length; d++) {
    const { i: dateIdx, line: dateLine } = dateIndices[d];
    const dateMatch = dateLine.match(DATE_RANGE_RE)!;
    const { startDate, endDate, isPresent } = parseDateRange(dateMatch[1]);

    // Text on the date line after removing the date portion
    const withoutDate = cleanText(dateLine.replace(dateMatch[1], ''));

    // The non-empty line immediately before the date line, within this entry's region
    // (region starts after the previous entry's date line)
    const prevEntryDateIdx = d === 0 ? -1 : dateIndices[d - 1].i;
    const lineBeforeIdx = dateIdx - 1;
    const lineBeforeDate = lineBeforeIdx > prevEntryDateIdx && lineBeforeIdx >= 0
      ? nonEmpty[lineBeforeIdx]
      : null;
    const lineBeforeIsTitle =
      lineBeforeDate !== null &&
      lineBeforeDate.length < 100 &&
      !DATE_RANGE_RE.test(lineBeforeDate);

    let title = '';
    let company = '';

    if (lineBeforeIsTitle && withoutDate) {
      // Most common Latam format: TITLE on line above, COMPANY | DATE on date line
      title = lineBeforeDate!;
      company = withoutDate;
    } else if (lineBeforeIsTitle && !withoutDate) {
      // Date on its own line, previous line has "Title · Company"
      const parts = lineBeforeDate!.replace(/[·–\-]/g, '|').split('|').map((s) => cleanText(s)).filter(Boolean);
      title = parts[0] ?? '';
      company = parts[1] ?? '';
    } else if (withoutDate) {
      // Everything on the date line: "Title · Company | DATE"
      const parts = withoutDate.replace(/[·]/g, '|').split('|').map((s) => cleanText(s)).filter(Boolean);
      title = parts[0] ?? '';
      company = parts[1] ?? '';
    }

    // Description: from after date line up to (but not including) the title line of the next entry
    const nextD = dateIndices[d + 1];
    let descEnd = nonEmpty.length;

    if (nextD) {
      const nextDateLine = nextD.line;
      const nextDateMatch = nextDateLine.match(DATE_RANGE_RE)!;
      const nextWithoutDate = cleanText(nextDateLine.replace(nextDateMatch[1], ''));
      const lineBeforeNextIdx = nextD.i - 1;
      const lineBeforeNext = lineBeforeNextIdx > dateIdx && lineBeforeNextIdx >= 0
        ? nonEmpty[lineBeforeNextIdx]
        : null;
      const nextHasTitleLine =
        lineBeforeNext !== null &&
        lineBeforeNext.length < 100 &&
        !DATE_RANGE_RE.test(lineBeforeNext) &&
        nextWithoutDate !== ''; // next date line also carries company info
      descEnd = nextHasTitleLine ? nextD.i - 1 : nextD.i;
    }

    const description = nonEmpty
      .slice(dateIdx + 1, descEnd)
      .join('\n');

    if (title || company) {
      entries.push({
        id: genId(),
        company,
        title,
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

function parseEducationSection(lines: string[]): Education[] {
  const nonEmpty = lines.map((l) => l.trim()).filter(Boolean);

  const dateIndices = nonEmpty
    .map((line, i) => ({ i, line }))
    .filter(({ line }) => DATE_RANGE_RE.test(line));

  if (dateIndices.length === 0) return [];

  const entries: Education[] = [];

  for (let d = 0; d < dateIndices.length; d++) {
    const { i: dateIdx, line: dateLine } = dateIndices[d];
    const dateMatch = dateLine.match(DATE_RANGE_RE)!;
    const { startDate, endDate, isPresent } = parseDateRange(dateMatch[1]);

    const withoutDate = cleanText(dateLine.replace(dateMatch[1], ''));

    const prevEntryDateIdx = d === 0 ? -1 : dateIndices[d - 1].i;
    const lineBeforeIdx = dateIdx - 1;
    const lineBeforeDate = lineBeforeIdx > prevEntryDateIdx && lineBeforeIdx >= 0
      ? nonEmpty[lineBeforeIdx]
      : null;
    const lineBeforeIsTitle =
      lineBeforeDate !== null &&
      lineBeforeDate.length < 100 &&
      !DATE_RANGE_RE.test(lineBeforeDate);

    let degree = '';
    let institution = '';
    let fieldOfStudy: string | undefined;

    if (lineBeforeIsTitle && withoutDate) {
      degree = lineBeforeDate!;
      institution = withoutDate;
    } else if (withoutDate) {
      const parts = withoutDate.replace(/[·|,]/g, '|').split('|').map((s) => cleanText(s)).filter(Boolean);
      degree = parts[0] ?? '';
      institution = parts[1] ?? '';
    } else if (lineBeforeIsTitle) {
      const parts = lineBeforeDate!.replace(/[·|,]/g, '|').split('|').map((s) => cleanText(s)).filter(Boolean);
      degree = parts[0] ?? '';
      institution = parts[1] ?? '';
    }

    const nextDIdx = dateIndices[d + 1]?.i ?? nonEmpty.length;
    const extraLines = nonEmpty.slice(dateIdx + 1, nextDIdx);
    let gpa: string | undefined;
    for (const l of extraLines) {
      const gpaMatch = l.match(/gpa[:\s]+([0-9.]+)/i);
      if (gpaMatch) { gpa = gpaMatch[1]; continue; }
      if (!institution && l.length < 100) { institution = l; continue; }
      if (!fieldOfStudy && l.length < 80) fieldOfStudy = l;
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
        location: undefined,
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

function parseLanguagesSection(lines: string[]): Language[] {
  const langs: Language[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^([A-Za-zÀ-ÿ\u3040-\u30FF\u4E00-\u9FFF\s]+)[:\-–—()\s]+(.+)/);
    if (match) {
      const langName = match[1].trim();
      const level = match[2].replace(/[\[\]()]/g, '').trim();
      const isNative = /native|nativo|母語|fluent/i.test(level);
      langs.push({
        id: genId(),
        language: langName,
        proficiency: mapProficiency(level),
        isNative,
      });
    }
  }
  return langs.slice(0, 10);
}

function mapProficiency(raw: string): Language['proficiency'] {
  const s = raw.toLowerCase();
  if (/native|nativo|母語/i.test(s)) return 'native';
  if (/básico|basico|basic|a1|a2/i.test(s)) return 'A2';
  if (/intermedio|intermediate|b1/i.test(s)) return 'B1';
  if (/upper.inter|b2/i.test(s)) return 'B2';
  if (/avanzado|advanced|c1/i.test(s)) return 'C1';
  if (/maestría|mastery|profici|c2/i.test(s)) return 'C2';
  if (/^[abcABC][12]$/.test(s.trim())) return s.trim().toUpperCase() as Language['proficiency'];
  return 'B1';
}

function parseCertificationsSection(lines: string[]) {
  const certs = [];
  for (const line of lines) {
    const trimmed = line.trim();
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
