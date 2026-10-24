import { CVData } from '@/types/cv.types';
import { exportAllLocalData } from './localStorage';

function downloadJSON(value: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const today = () => new Date().toISOString().slice(0, 10);

/** Download the CV currently in the editor (includes unsaved changes). */
export function downloadCurrentCV(cv: CVData): void {
  downloadJSON(cv, `cv-backup-${cv.market}-${today()}.json`);
}

/** Download every GlobalCV entry stored on this device, including recovery copies. */
export function downloadFullLocalExport(): void {
  downloadJSON(exportAllLocalData(), `globalcv-all-data-${today()}.json`);
}
