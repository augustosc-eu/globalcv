export interface CountryGuidance {
  country: string;
  photo: string;
  length: string;
  personalDetails: string;
  emphasis: string;
}

export const euCountryGuidance: CountryGuidance[] = [
  {
    country: 'Germany',
    photo: 'Often accepted and still common in traditional sectors.',
    length: '1-2 A4 pages.',
    personalDetails: 'Date of birth and nationality may appear, but keep them optional.',
    emphasis: 'Clear chronology, education, certifications, and concise role scope.',
  },
  {
    country: 'France',
    photo: 'Optional; common in some industries.',
    length: '1 page for junior profiles, 2 for experienced candidates.',
    personalDetails: 'Keep personal details minimal unless relevant.',
    emphasis: 'Languages, education, and measurable responsibilities.',
  },
  {
    country: 'Spain',
    photo: 'Optional and industry-dependent.',
    length: '1-2 pages.',
    personalDetails: 'Location and languages are useful; avoid unnecessary sensitive details.',
    emphasis: 'Professional summary, languages, and role-relevant achievements.',
  },
  {
    country: 'Italy',
    photo: 'Optional and role-dependent.',
    length: '1-2 pages.',
    personalDetails: 'Include privacy-conscious contact details; avoid over-sharing.',
    emphasis: 'Education, chronology, languages, and practical project outcomes.',
  },
  {
    country: 'Netherlands',
    photo: 'Usually omitted unless requested.',
    length: '1-2 pages.',
    personalDetails: 'Minimal personal details are preferred.',
    emphasis: 'Direct, concise achievements and clear skills.',
  },
  {
    country: 'Portugal',
    photo: 'Optional and sector-dependent.',
    length: '1-2 pages.',
    personalDetails: 'Languages and location are useful for local and EU roles.',
    emphasis: 'Clear experience, languages, and certifications.',
  },
];
