import { z } from 'zod';
import { CVData, Market } from '@/types/cv.types';

const marketSchema = z.enum(['us', 'eu', 'latam', 'jp', 'gb', 'au', 'in', 'br']);
const pageSizeSchema = z.enum(['A4', 'Letter']);
const employmentTypeSchema = z.enum(['full_time', 'part_time', 'contract', 'freelance', 'internship']);
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
  selfPromotion: z.string().optional(),
  reasonForApplication: z.string().optional(),
  desiredConditions: z.string().optional(),
  targetRole: z.string().optional(),
  targetCompany: z.string().optional(),
  jobDescriptionNotes: z.string().optional(),
  hiddenSections: z.array(z.string()).optional(),
  pageSize: pageSizeSchema,
  colorTheme: z.string().optional(),
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
  return marketSchema.safeParse(value).success;
}
