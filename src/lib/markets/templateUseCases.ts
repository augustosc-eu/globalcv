export interface TemplateUseCase {
  bestFor: string;
  traits: string[];
}

const templateUseCases: Record<string, TemplateUseCase> = {
  'us-classic': { bestFor: 'ATS-safe applications', traits: ['Single column', 'Conservative', 'Keyword friendly'] },
  'us-modern': { bestFor: 'Design-forward US roles', traits: ['Accent sidebar', 'Scannable', 'Modern'] },
  'eu-europass': { bestFor: 'Cross-border EU applications', traits: ['Europass aligned', 'A4', 'Language focused'] },
  'eu-modern': { bestFor: 'Modern European CVs', traits: ['Clean layout', 'CEFR friendly', 'Professional'] },
  'latam-traditional': { bestFor: 'Traditional LATAM CVs', traits: ['Personal details', 'References', 'Formal'] },
  'latam-modern': { bestFor: 'Contemporary LATAM roles', traits: ['Visual emphasis', 'Photo friendly', 'Readable'] },
  'jp-rirekisho': { bestFor: 'Japanese formal applications', traits: ['Rirekisho grid', 'Photo', 'Structured'] },
  'jp-shokumu': { bestFor: 'Japanese mid-career roles', traits: ['Career history', 'Achievements', 'Detailed'] },
  'gb-classic': { bestFor: 'UK recruiter review', traits: ['A4', 'No photo', 'Two-page friendly'] },
  'gb-modern': { bestFor: 'Modern UK CVs', traits: ['Concise', 'Profile led', 'Readable'] },
  'au-classic': { bestFor: 'AU/NZ applications', traits: ['A4', 'Referee friendly', 'Career summary'] },
  'in-classic': { bestFor: 'India CVs', traits: ['Objective led', 'Skills visible', 'A4'] },
  'br-classic': { bestFor: 'Brazilian resumes', traits: ['Portuguese friendly', 'Objective', 'Personal block'] },
};

export function getTemplateUseCase(templateId: string): TemplateUseCase {
  return templateUseCases[templateId] ?? { bestFor: 'General applications', traits: ['Readable', 'Market-aware', 'Export ready'] };
}
