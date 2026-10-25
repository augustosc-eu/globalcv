import { z } from 'zod';
import { CVData, Market } from '@/types/cv.types';
import { MARKETS, isMarket as isRegisteredMarket } from '@/lib/markets/registry';

// Our CSP forbids eval; jitless mode stops zod from probing `new Function`
// (which would otherwise be reported as a CSP violation on every page).
z.config({ jitless: true });

const marketSchema = z.enum(MARKETS);
const pageSizeSchema = z.enum(['A4', 'Letter']);
const employmentTypeSchema = z.enum(['full_time', 'part_time', 'contract', 'freelance', 'internship']);
const remoteWorkModeSchema = z.enum(['remote_employee', 'freelance', 'both']);
const skillLevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
const languageProficiencySchema = z.enum([
  'A1', 'A2', 'B1', 'B2', 'C1', 'C2',
  'N1', 'N2', 'N3', 'N4', 'N5',
  'basic', 'conversational', 'professional', 'fluent', 'native',
]);

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().default(''),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default(''),
  prefecture: z.string().optional(),
});

const emergencyContactSchema = z.object({
  name: z.string().default(''),
  relationship: z.string().default(''),
  phone: z.string().default(''),
});

const personalInfoSchema = z.object({
  firstName: z.string().default(''),
  lastName: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  linkedIn: z.string().optional(),
  website: z.string().optional(),
  address: addressSchema.optional(),
  photo: z.string().optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed', 'prefer_not']).optional(),
  idNumber: z.string().optional(),
  furiganaFirstName: z.string().optional(),
  furiganaLastName: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not']).optional(),
  nearestStation: z.string().optional(),
  commuteTime: z.number().optional(),
  emergencyContact: emergencyContactSchema.optional(),
  personalSeal: z.boolean().optional(),
});

const workExperienceSchema = z.object({
  id: z.string().default(''),
  company: z.string().default(''),
  title: z.string().default(''),
  location: z.string().optional(),
  startDate: z.string().default(''),
  endDate: z.string().optional(),
  isPresent: z.boolean().default(false),
  description: z.string().default(''),
  achievements: z.array(z.string()).optional(),
  employmentType: employmentTypeSchema.optional(),
  departmentName: z.string().optional(),
  companyScale: z.string().optional(),
  reasonForLeaving: z.string().optional(),
});

const educationSchema = z.object({
  id: z.string().default(''),
  institution: z.string().default(''),
  degree: z.string().default(''),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().default(''),
  endDate: z.string().optional(),
  isPresent: z.boolean().default(false),
  gpa: z.string().optional(),
  honors: z.string().optional(),
  location: z.string().optional(),
});

const skillSchema = z.object({
  id: z.string().default(''),
  name: z.string().default(''),
  level: skillLevelSchema.optional(),
  category: z.string().optional(),
});

const languageSchema = z.object({
  id: z.string().default(''),
  language: z.string().default(''),
  proficiency: languageProficiencySchema,
  isNative: z.boolean().default(false),
  certification: z.string().optional(),
});

const certificationSchema = z.object({
  id: z.string().default(''),
  name: z.string().default(''),
  issuer: z.string().default(''),
  dateIssued: z.string().optional(),
  expiryDate: z.string().optional(),
  credentialId: z.string().optional(),
  url: z.string().optional(),
});

const referenceSchema = z.object({
  id: z.string().default(''),
  name: z.string().default(''),
  title: z.string().default(''),
  company: z.string().default(''),
  email: z.string().optional(),
  phone: z.string().optional(),
  relationship: z.string().default(''),
});

const remoteWorkProfileSchema = z.object({
  workModeTarget: remoteWorkModeSchema.default('both'),
  preferredTimezoneOverlap: z.string().optional(),
  collaborationTools: z.array(z.string()).default([]),
  asyncStrengths: z.array(z.string()).default([]),
  locationFlexibility: z.string().optional(),
  portfolioProof: z.array(z.string()).default([]),
});

export const cvDataSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  market: marketSchema,
  templateId: z.string(),
  lastModified: z.string(),
  version: z.number(),
  personalInfo: personalInfoSchema,
  objective: z.string().optional(),
  workExperience: z.array(workExperienceSchema).default([]),
  education: z.array(educationSchema).default([]),
  skills: z.array(skillSchema).default([]),
  languages: z.array(languageSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
  references: z.array(referenceSchema).default([]),
  projects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    role: z.string().optional(),
    url: z.string().optional(),
    techStack: z.array(z.string()).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })).default([]),
  selfPromotion: z.string().optional(),
  reasonForApplication: z.string().optional(),
  desiredConditions: z.string().optional(),
  targetRole: z.string().optional(),
  targetCompany: z.string().optional(),
  jobDescriptionNotes: z.string().optional(),
  remoteWorkProfile: remoteWorkProfileSchema.optional(),
  hiddenSections: z.array(z.string()).optional(),
  pageSize: pageSizeSchema,
  colorTheme: z.string().optional(),
  qrCodeEnabled: z.boolean().optional(),
  fontFamily: z.enum(['inter', 'georgia', 'roboto', 'playfair']).optional(),
});

export const partialImportSchema = cvDataSchema.partial().extend({
  personalInfo: personalInfoSchema.partial().optional(),
  workExperience: z.array(workExperienceSchema.partial()).optional(),
  education: z.array(educationSchema.partial()).optional(),
  skills: z.array(skillSchema.partial()).optional(),
  languages: z.array(languageSchema.partial()).optional(),
  certifications: z.array(certificationSchema.partial()).optional(),
  references: z.array(referenceSchema.partial()).optional(),
});

export function parseCVData(input: unknown): CVData | null {
  const parsed = cvDataSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function parsePartialCVData(input: unknown): Partial<CVData> | null {
  const parsed = partialImportSchema.safeParse(input);
  return parsed.success ? (parsed.data as Partial<CVData>) : null;
}

export function isMarket(value: string): value is Market {
  return isRegisteredMarket(value);
}

// ─── Non-destructive repair ──────────────────────────────────────────────────

export interface RepairContext {
  market: Market;
  templateId: string;
  pageSize: 'A4' | 'Letter';
}

type PathKey = string | number;

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getAt(root: unknown, path: PathKey[]): unknown {
  let node: unknown = root;
  for (const key of path) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<PathKey, unknown>)[key];
  }
  return node;
}

function setAt(root: unknown, path: PathKey[], value: unknown): boolean {
  let node: unknown = root;
  for (const key of path.slice(0, -1)) {
    if (node === null || typeof node !== 'object') return false;
    node = (node as Record<PathKey, unknown>)[key];
  }
  if (node === null || typeof node !== 'object') return false;
  const leaf = path[path.length - 1];
  if (value === undefined && !Array.isArray(node)) {
    delete (node as Record<PathKey, unknown>)[leaf];
  } else {
    (node as Record<PathKey, unknown>)[leaf] = value;
  }
  return true;
}

function namedFallback(leaf: string, ctx: RepairContext): unknown {
  switch (leaf) {
    case 'market': return ctx.market;
    case 'templateId': return ctx.templateId;
    case 'pageSize': return ctx.pageSize;
    case 'lastModified': return new Date().toISOString();
    case 'version': return 2;
    case 'proficiency': return 'professional';
    case 'id': return `repaired_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    default: return undefined;
  }
}

function typedFallback(expected: unknown): unknown {
  switch (expected) {
    case 'string': return '';
    case 'boolean': return false;
    case 'array': return [];
    case 'object': return {};
    default: return undefined;
  }
}

/**
 * Attempt to turn a stored CV that no longer matches the schema into a valid
 * CVData *without discarding user-entered text*. Strategy, per failing field:
 *   1. coerce obvious type slips (number ↔ string),
 *   2. drop an invalid optional value (e.g. an unknown enum literal),
 *   3. fall back to a neutral default for required fields.
 * Returns null when the input is not recognisably a CV. Callers must keep the
 * original payload (quarantine) before persisting the repaired version.
 */
export function repairCVData(input: unknown, ctx: RepairContext): CVData | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const draft = clonePlain(input) as Record<string, unknown>;
  if (!isRegisteredMarket(draft.market)) draft.market = ctx.market;
  const attempted = new Map<string, number>();

  for (let pass = 0; pass < 40; pass += 1) {
    const result = cvDataSchema.safeParse(draft);
    if (result.success) return result.data as CVData;

    let progressed = false;
    for (const issue of result.error.issues) {
      const path = issue.path.filter((k): k is PathKey => typeof k === 'string' || typeof k === 'number');
      if (path.length === 0) return null;
      const key = path.join('.');
      const step = attempted.get(key) ?? 0;
      attempted.set(key, step + 1);
      const current = getAt(draft, path);
      const expected = (issue as { expected?: unknown }).expected;

      if (step === 0) {
        if (expected === 'string' && (typeof current === 'number' || typeof current === 'boolean')) {
          progressed = setAt(draft, path, String(current)) || progressed;
          continue;
        }
        if (expected === 'number' && typeof current === 'string' && current.trim() && Number.isFinite(Number(current))) {
          progressed = setAt(draft, path, Number(current)) || progressed;
          continue;
        }
      }
      if (step <= 1 && current !== undefined && typeof path[path.length - 1] === 'string') {
        // Remove the invalid value; optional fields/defaults then take over.
        progressed = setAt(draft, path, undefined) || progressed;
        continue;
      }
      const leaf = String(path[path.length - 1]);
      const fallback = namedFallback(leaf, ctx) ?? typedFallback(expected);
      if (fallback === undefined || step > 3) return null;
      progressed = setAt(draft, path, fallback) || progressed;
    }
    if (!progressed) return null;
  }
  return null;
}
