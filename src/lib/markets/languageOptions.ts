import { Market } from '@/types/cv.types';

export interface LanguageOption {
  label: string;
  nativeLabel?: string;
}

const euLanguageOptions: LanguageOption[] = [
  { label: 'Bulgarian', nativeLabel: 'български' },
  { label: 'Croatian', nativeLabel: 'hrvatski' },
  { label: 'Czech', nativeLabel: 'čeština' },
  { label: 'Danish', nativeLabel: 'dansk' },
  { label: 'Dutch', nativeLabel: 'Nederlands' },
  { label: 'English' },
  { label: 'Estonian', nativeLabel: 'eesti' },
  { label: 'Finnish', nativeLabel: 'suomi' },
  { label: 'French', nativeLabel: 'français' },
  { label: 'German', nativeLabel: 'Deutsch' },
  { label: 'Greek', nativeLabel: 'ελληνικά' },
  { label: 'Hungarian', nativeLabel: 'magyar' },
  { label: 'Irish', nativeLabel: 'Gaeilge' },
  { label: 'Italian', nativeLabel: 'italiano' },
  { label: 'Latvian', nativeLabel: 'latviešu' },
  { label: 'Lithuanian', nativeLabel: 'lietuvių' },
  { label: 'Maltese', nativeLabel: 'Malti' },
  { label: 'Polish', nativeLabel: 'polski' },
  { label: 'Portuguese', nativeLabel: 'português' },
  { label: 'Romanian', nativeLabel: 'română' },
  { label: 'Slovak', nativeLabel: 'slovenčina' },
  { label: 'Slovenian', nativeLabel: 'slovenščina' },
  { label: 'Spanish', nativeLabel: 'español' },
  { label: 'Swedish', nativeLabel: 'svenska' },
];

export function getLanguageOptions(market: Market): LanguageOption[] {
  return market === 'eu' ? euLanguageOptions : [];
}
