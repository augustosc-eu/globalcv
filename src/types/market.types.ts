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
}
