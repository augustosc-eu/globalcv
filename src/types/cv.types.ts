export type Market = 'us' | 'eu' | 'latam' | 'jp' | 'gb' | 'au' | 'in' | 'br';
export type PageSize = 'A4' | 'Letter';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | 'prefer_not';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship';
export type SkillLevel = 1 | 2 | 3 | 4 | 5;
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type JLPTLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
export type GenericLevel = 'basic' | 'conversational' | 'professional' | 'fluent' | 'native';

export interface Address {
  street?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  prefecture?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedIn?: string;
  website?: string;
  address?: Address;
  photo?: string;
  dateOfBirth?: string;
  nationality?: string;
  maritalStatus?: MaritalStatus;
  idNumber?: string;
  furiganaFirstName?: string;
  furiganaLastName?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not';
  nearestStation?: string;
  commuteTime?: number;
  emergencyContact?: EmergencyContact;
  personalSeal?: boolean;
}

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isPresent: boolean;
  description: string;
  achievements?: string[];
  employmentType?: EmploymentType;
  departmentName?: string;
  companyScale?: string;
  reasonForLeaving?: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: string;
  endDate?: string;
  isPresent: boolean;
  gpa?: string;
  honors?: string;
  location?: string;
}

export interface Skill {
  id: string;
  name: string;
  level?: SkillLevel;
  category?: string;
}

export interface Language {
  id: string;
  language: string;
  proficiency: CEFRLevel | JLPTLevel | GenericLevel;
  isNative: boolean;
  certification?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  dateIssued?: string;
  expiryDate?: string;
  credentialId?: string;
  url?: string;
}

export interface Reference {
  id: string;
  name: string;
  title: string;
  company: string;
  email?: string;
  phone?: string;
  relationship: string;
}

export interface CVData {
  id: string;
  title?: string;
  market: Market;
  templateId: string;
  lastModified: string;
  version: number;
  personalInfo: PersonalInfo;
  objective?: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  languages: Language[];
  certifications: Certification[];
  references: Reference[];
  selfPromotion?: string;
  reasonForApplication?: string;
  desiredConditions?: string;
  targetRole?: string;
  targetCompany?: string;
  jobDescriptionNotes?: string;
  hiddenSections?: string[];
  pageSize: PageSize;
  colorTheme?: string;
}
