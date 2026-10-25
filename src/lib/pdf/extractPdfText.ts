/*
 * Text extraction for CV import.
 *
 * Hardening:
 *  - pdfjs-dist >= 6.2.108 (fixes GHSA-hq66-cqwq-w95j). pdf.js never executes
 *    JavaScript embedded in PDFs unless a scripting sandbox is wired up (we
 *    don't load pdf.sandbox), and v6 removed the eval-based font path.
 *  - `disableFontFace: true` keeps embedded fonts out of the page (no FontFace
 *    objects are created); we only need text, not rendering.
 *  - Size, signature, page-count, output-length and wall-clock limits keep
 *    malformed or hostile files from exhausting the tab.
 */

export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_PAGES = 15;
export const MAX_EXTRACTED_CHARS = 200_000;
export const PDF_PARSE_TIMEOUT_MS = 20_000;

export type PdfImportErrorCode = 'too-large' | 'not-pdf' | 'too-many-pages' | 'encrypted' | 'timeout' | 'failed';

export class PdfImportError extends Error {
  constructor(public readonly code: PdfImportErrorCode, message: string) {
    super(message);
    this.name = 'PdfImportError';
  }
}

export const PDF_ERROR_MESSAGES: Record<PdfImportErrorCode, string> = {
  'too-large': `This PDF is larger than ${MAX_PDF_BYTES / 1024 / 1024} MB. Export a smaller PDF or paste the text instead.`,
  'not-pdf': 'This file is not a valid PDF.',
  'too-many-pages': `This PDF has more than ${MAX_PDF_PAGES} pages. A CV import supports up to ${MAX_PDF_PAGES} pages — paste the relevant text instead.`,
  encrypted: 'This PDF is password-protected. Remove the password or paste the text instead.',
  timeout: 'Reading this PDF took too long and was stopped. Try copying the text manually.',
  failed: 'Could not read this PDF. Try copying the text manually.',
};

interface FileLike {
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface TextItemLike { str?: string; transform?: number[] }

/** Minimal subset of the pdf.js API we use (lets tests inject the Node build). */
export interface PdfJsLike {
  GlobalWorkerOptions?: { workerSrc: string };
  getDocument(params: Record<string, unknown>): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{ getTextContent(): Promise<{ items: unknown[] }>; cleanup?: () => void }>;
      destroy?: () => Promise<void>;
    }>;
    destroy(): Promise<void>;
  };
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  // "%PDF-" may be preceded by a little garbage; spec allows it within the first 1024 bytes.
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 1024)));
  return head.includes('%PDF-');
}

async function loadBrowserPdfJs(): Promise<PdfJsLike> {
  const lib = (await import('pdfjs-dist')) as unknown as PdfJsLike;
  if (lib.GlobalWorkerOptions) lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  return lib;
}

export async function extractTextFromPdf(
  file: FileLike,
  options: { lib?: PdfJsLike; timeoutMs?: number } = {}
): Promise<string> {
  if (file.size > MAX_PDF_BYTES) throw new PdfImportError('too-large', PDF_ERROR_MESSAGES['too-large']);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > MAX_PDF_BYTES) throw new PdfImportError('too-large', PDF_ERROR_MESSAGES['too-large']);
  if (!hasPdfSignature(bytes)) throw new PdfImportError('not-pdf', PDF_ERROR_MESSAGES['not-pdf']);

  const pdfjsLib = options.lib ?? (await loadBrowserPdfJs());
  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    disableFontFace: true,
    useSystemFonts: false,
    isOffscreenCanvasSupported: false,
    disableAutoFetch: true,
    disableStream: true,
    stopAtErrors: false,
    enableXfa: false,
    maxImageSize: 1024 * 1024,
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new PdfImportError('timeout', PDF_ERROR_MESSAGES.timeout)), options.timeoutMs ?? PDF_PARSE_TIMEOUT_MS);
  });

  const work = (async () => {
    const pdf = await loadingTask.promise;
    if (pdf.numPages > MAX_PDF_PAGES) throw new PdfImportError('too-many-pages', PDF_ERROR_MESSAGES['too-many-pages']);
    const pageTexts: string[] = [];
    let total = 0;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const lines: string[] = [];
      let lastY: number | null = null;

      for (const raw of content.items) {
        const item = raw as TextItemLike;
        if (typeof item.str !== 'string') continue;
        const y = item.transform?.[5] ?? 0;
        if (lastY !== null && Math.abs(y - lastY) > 2) lines.push('\n');
        lines.push(item.str);
        lastY = y;
      }
      page.cleanup?.();

      const text = lines
        .join(' ')
        .replace(/[ \t]*\n[ \t]*/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
      total += text.length;
      pageTexts.push(text);
      if (total >= MAX_EXTRACTED_CHARS) break;
    }
    return pageTexts.join('\n\n').slice(0, MAX_EXTRACTED_CHARS);
  })();

  try {
    return await Promise.race([work, timeout]);
  } catch (err) {
    if (err instanceof PdfImportError) throw err;
    const name = (err as { name?: string })?.name;
    if (name === 'PasswordException') throw new PdfImportError('encrypted', PDF_ERROR_MESSAGES.encrypted);
    if (name === 'InvalidPDFException') throw new PdfImportError('not-pdf', PDF_ERROR_MESSAGES['not-pdf']);
    throw new PdfImportError('failed', PDF_ERROR_MESSAGES.failed);
  } finally {
    if (timer) clearTimeout(timer);
    // Always release the worker-side document (also aborts work after a timeout).
    loadingTask.destroy().catch(() => undefined);
  }
}
