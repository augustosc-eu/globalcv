import { auUI } from './ui';
import { MarketConfig } from '@/types/market.types';

export const auConfig: MarketConfig = {
  market: 'au',
  name: 'Australia & New Zealand',
  locale: 'en-AU',
  pageSize: 'A4',
  direction: 'ltr',
  color: '#0284c7',
  accentColor: '#0369a1',
  themes: [
    { id: 'au-sky',    name: 'Sky Blue',    primary: '#0284c7', accent: '#0369a1', light: '#e0f2fe' },
    { id: 'au-teal',   name: 'Teal',        primary: '#0d9488', accent: '#0f766e', light: '#ccfbf1' },
    { id: 'au-slate',  name: 'Slate',       primary: '#475569', accent: '#334155', light: '#f1f5f9' },
    { id: 'au-green',  name: 'Eucalyptus',  primary: '#15803d', accent: '#166534', light: '#dcfce7' },
    { id: 'au-orange', name: 'Ochre',       primary: '#c2410c', accent: '#9a3412', light: '#ffedd5' },
    { id: 'au-mono',   name: 'Monochrome',  primary: '#111827', accent: '#374151', light: '#f3f4f6' },
  ],
  fields: {
    // AU discrimination law: no photo, DOB, nationality expected on resume
    photo:            { visibility: 'hidden' },
    dateOfBirth:      { visibility: 'hidden' },
    nationality:      { visibility: 'hidden' },
    maritalStatus:    { visibility: 'hidden' },
    idNumber:         { visibility: 'hidden' },
    furigana:         { visibility: 'hidden' },
    gender:           { visibility: 'hidden' },
    nearestStation:   { visibility: 'hidden' },
    commuteTime:      { visibility: 'hidden' },
    emergencyContact: { visibility: 'hidden' },
    personalSeal:     { visibility: 'hidden' },
  },
  sections: {
    objective:            { enabled: true,  required: false, order: 0, label: 'Career Objective' },
    workExperience:       { enabled: true,  required: true,  order: 1, label: 'Work Experience' },
    education:            { enabled: true,  required: true,  order: 2, label: 'Education' },
    skills:               { enabled: true,  required: false, order: 3, label: 'Key Skills' },
    languages:            { enabled: true,  required: false, order: 4, label: 'Languages' },
    certifications:       { enabled: true,  required: false, order: 5, label: 'Certifications & Licences' },
    references:           { enabled: true,  required: false, order: 6, label: 'Referees' },
    selfPromotion:        { enabled: false, required: false, order: 7 },
    reasonForApplication: { enabled: false, required: false, order: 8 },
  },
  pageLimitSuggestion: 3,
  languageLevelSystem: 'generic',
  dateFormat: 'MMM yyyy',
  enableATSSuggestions: false,
  templates: [
    { id: 'au-classic', name: 'Classic',  description: 'Clean, professional format preferred by Australian recruiters' },
    { id: 'au-modern',  name: 'Modern',   description: 'Contemporary two-column layout with colour sidebar' },
  ],
  ui: auUI,
};
