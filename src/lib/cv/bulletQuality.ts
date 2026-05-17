const WEAK_OPENERS = [
  'managed', 'helped', 'assisted', 'responsible for', 'worked on',
  'involved in', 'participated in', 'supported', 'contributed to',
  'was part of', 'helped with',
];

const METRIC_PATTERN = /(\d+\s*%|\$\d|\€\d|£\d|¥\d|\d+[kmb]\b|\d+\s*(users|customers|clients|employees|team|million|billion|thousand|revenue|cost|hours|days|weeks|months))/i;
const DIGIT_PATTERN = /\d/;
const OUTCOME_WORDS = /(reduced|increased|improved|grew|saved|launched|delivered|exceeded|achieved|generated|built|created|designed|led|owned|drove)/i;

export interface BulletQuality {
  score: 'strong' | 'ok' | 'weak';
  hint: string;
}

export function assessBullet(text: string): BulletQuality {
  const trimmed = text.trim();
  if (!trimmed) return { score: 'ok', hint: '' };

  const lower = trimmed.toLowerCase();
  const firstWord = lower.split(/\s+/)[0];

  const isWeak = WEAK_OPENERS.some((w) => lower.startsWith(w));
  const hasMetric = METRIC_PATTERN.test(trimmed) || DIGIT_PATTERN.test(trimmed);
  const hasOutcome = OUTCOME_WORDS.test(trimmed);
  const tooShort = trimmed.length < 40;
  const tooLong = trimmed.length > 300;

  if (tooShort && trimmed.length > 0) {
    return { score: 'weak', hint: 'Too brief — expand with context or outcome.' };
  }
  if (tooLong) {
    return { score: 'ok', hint: 'Consider splitting into two bullets.' };
  }
  if (isWeak) {
    return { score: 'weak', hint: `"${firstWord.charAt(0).toUpperCase() + firstWord.slice(1)}" is a weak opener — use an action verb (Led, Built, Delivered…).` };
  }
  if (!hasMetric && !hasOutcome) {
    return { score: 'ok', hint: 'Add a metric or outcome to strengthen impact.' };
  }
  return { score: 'strong', hint: 'Strong — includes an action verb and measurable outcome.' };
}
