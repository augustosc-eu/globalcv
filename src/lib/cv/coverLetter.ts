import { CVData } from '@/types/cv.types';

export function buildCoverLetter(cv: CVData): string {
  const name = `${cv.personalInfo.firstName} ${cv.personalInfo.lastName}`.trim() || 'Candidate';
  const targetRole = cv.targetRole?.trim() || 'the role';
  const targetCompany = cv.targetCompany?.trim() || 'your team';
  const latestRole = cv.workExperience[0];
  const topSkills = cv.skills.slice(0, 4).map((skill) => skill.name).join(', ');

  const intro = `Dear Hiring Team,\n\nI am excited to apply for ${targetRole} at ${targetCompany}.`;
  const background = latestRole
    ? ` In my recent work as ${latestRole.title} at ${latestRole.company}, I focused on ${trimSentence(latestRole.description)}`
    : '';
  const skills = topSkills
    ? ` My background includes ${topSkills}, and I enjoy translating those strengths into measurable outcomes.`
    : '';
  const close = `\n\nI would welcome the chance to discuss how ${name} can contribute to ${targetCompany}. Thank you for your time and consideration.\n\nSincerely,\n${name}`;

  return `${intro}${background}${skills}${close}`;
}

function trimSentence(value: string): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (!clean) return 'delivering impact in collaborative teams.';
  const sentence = clean.length > 180 ? `${clean.slice(0, 177).trimEnd()}...` : clean;
  return sentence.endsWith('.') ? sentence : `${sentence}.`;
}
