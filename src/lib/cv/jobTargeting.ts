import { CVData } from '@/types/cv.types';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'that', 'this', 'have', 'from',
  'our', 'will', 'are', 'about', 'into', 'who', 'their', 'role', 'team',
  'experience', 'years', 'year', 'required', 'preferred', 'work', 'remote',
  'job', 'using', 'build', 'strong', 'ability', 'plus',
]);

export interface TargetingInsight {
  keywords: string[];
  matchedSkills: string[];
  missingKeywords: string[];
  suggestedBullets: string[];
}

export function analyzeJobTargeting(cv: CVData): TargetingInsight | null {
  const raw = cv.jobDescriptionNotes?.trim();
  if (!raw) return null;

  const keywords = extractKeywords(raw);
  const skillNames = cv.skills.map((skill) => skill.name.toLowerCase());
  const matchedSkills = keywords.filter((keyword) => skillNames.some((skill) => skill.includes(keyword)));
  const missingKeywords = keywords.filter((keyword) => !matchedSkills.includes(keyword)).slice(0, 8);

  const suggestedBullets = cv.workExperience
    .filter((item) => item.description)
    .map((item) => ({
      title: item.title || item.company,
      score: keywords.filter((keyword) => `${item.title} ${item.description}`.toLowerCase().includes(keyword)).length,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.title);

  return {
    keywords,
    matchedSkills,
    missingKeywords,
    suggestedBullets,
  };
}

function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9+\-#/.\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));

  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([word]) => word);
}
