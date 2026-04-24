import { WorkExperience } from '@/types/cv.types';

export function getBulletSuggestions(exp: WorkExperience): string[] {
  const role = exp.title || 'the role';
  const company = exp.company || 'the team';
  const scope = exp.departmentName || exp.location || 'cross-functional teams';

  return [
    `Led ${scope} to deliver a key ${role.toLowerCase()} initiative, improving [metric] by [result].`,
    `Built and improved [process/product/system] at ${company}, reducing [cost/time/risk] by [result].`,
    `Collaborated with [teams/stakeholders] to launch [project], supporting [business/user outcome].`,
  ];
}
