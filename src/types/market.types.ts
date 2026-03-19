import { Market, PageSize } from './cv.types';

export type FieldVisibility = 'hidden' | 'optional' | 'required';

export interface ColorTheme {
  id: string;
  name: string;
  primary: string;
  accent: string;
  light: string;
}

export interface FieldConfig {
  visibility: FieldVisibility;
  label?: string;
  placeholder?: string;
  helpText?: string;
}

export interface SectionConfig {
  enabled: boolean;
  required: boolean;
  order: number;
  maxItems?: number;
  label?: string;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
}

/** Localised UI strings — one set per market */
export interface MarketUI {
  // Navigation / header
  back: string;
  next: string;
  save: string;
  saving: string;
  saved: string;
  clear: string;
  clearConfirmTitle: string;
  clearConfirmBody: string;
  import: string;
  exportPDF: string;
  generating: string;
  done: string;
  failed: string;
  cancel: string;
  add: string;
  apply: string;
  markets: string;
  privacyOn: string;
  privacyOff: string;

  // Personal info
  personalInfoTitle: string;
  personalInfoDesc: string;
  firstName: string;
  firstNamePlaceholder: string;
  lastName: string;
  lastNamePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  city: string;
  cityPlaceholder: string;
  country: string;
  countryPlaceholder: string;
  linkedIn: string;
  website: string;

  // Marital status options
  maritalSelect: string;
  maritalSingle: string;
  maritalMarried: string;
  maritalDivorced: string;
  maritalWidowed: string;
  maritalPreferNot: string;

  // Work experience
  workJobTitle: string;
  workJobTitlePlaceholder: string;
  workCompany: string;
  workCompanyPlaceholder: string;
  workLocation: string;
  workLocationPlaceholder: string;
  workEmploymentType: string;
  workDescription: string;
  workDescPlaceholder: string;
  addWork: string;
  newPosition: string;
  newCompany: string;
  employmentTypes: { fullTime: string; partTime: string; contract: string; freelance: string; internship: string };

  // Education
  addEducation: string;
  newDegree: string;
  newInstitution: string;
  degree: string;
  degreePlaceholder: string;
  fieldOfStudy: string;
  fieldOfStudyPlaceholder: string;
  institution: string;
  institutionPlaceholder: string;
  location: string;
  locationPlaceholder: string;
  gpa: string;
  honors: string;

  // Skills
  addSkill: string;
  skillPlaceholder: string;
  skillCategory: string;
  skillCategoryPlaceholder: string;
  noSkillsYet: string;
  skillLevels: [string, string, string, string, string];

  // Languages
  addLanguage: string;
  languagePlaceholder: string;
  noLanguagesYet: string;
  nativeLabel: string;
  langCertLabel: string;
  langCertPlaceholder: string;

  // Certifications
  addCertification: string;
  newCertification: string;
  certName: string;
  certNamePlaceholder: string;
  certIssuer: string;
  certIssuerPlaceholder: string;
  certDate: string;
  certExpiry: string;
  certCredential: string;
  certCredentialPlaceholder: string;

  // References
  addReference: string;
  newReference: string;
  newReferenceSubtitle: string;
  refName: string;
  refNamePlaceholder: string;
  refJobTitle: string;
  refJobTitlePlaceholder: string;
  refCompany: string;
  refCompanyPlaceholder: string;
  refRelationship: string;
  refRelationshipPlaceholder: string;

  // Template picker
  templateTitle: string;
  templateDesc: string;
  colorTheme: string;
  selectedLabel: string;

  // Import modal
  importTitle: string;
  importDesc: string;
  importWarning: string;
  importPlaceholder: string;
  parseCV: string;
  applyToBuilder: string;
  editText: string;
  importSuccess: string;
  importSuccessDesc: string;
  previewLabels: {
    name: string; email: string; phone: string; linkedin: string;
    summary: string; workExperience: string; entries: string;
    education: string; skills: string; languages: string; certifications: string;
    workPreview: string; noTitle: string; notFound: string; moreSuffix: string;
  };

  // Misc
  characters: string;
  noItemsYet: string;
}

export interface MarketConfig {
  market: Market;
  name: string;
  locale: string;
  pageSize: PageSize;
  direction: 'ltr' | 'rtl';
  fields: {
    photo: FieldConfig;
    dateOfBirth: FieldConfig;
    nationality: FieldConfig;
    maritalStatus: FieldConfig;
    idNumber: FieldConfig;
    furigana: FieldConfig;
    gender: FieldConfig;
    nearestStation: FieldConfig;
    commuteTime: FieldConfig;
    emergencyContact: FieldConfig;
    personalSeal: FieldConfig;
  };
  sections: {
    objective: SectionConfig;
    workExperience: SectionConfig;
    education: SectionConfig;
    skills: SectionConfig;
    languages: SectionConfig;
    certifications: SectionConfig;
    references: SectionConfig;
    selfPromotion: SectionConfig;
    reasonForApplication: SectionConfig;
  };
  pageLimitSuggestion?: number;
  languageLevelSystem: 'cefr' | 'jlpt' | 'generic';
  dateFormat: string;
  enableATSSuggestions: boolean;
  photoAspectRatio?: number;
  templates: TemplateDefinition[];
  themes: ColorTheme[];
  color: string;
  accentColor: string;
  ui: MarketUI;
}
