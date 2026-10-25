import '../helpers/browserEnv';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { safeHttpUrl } from '@/lib/utils/safeUrl';
import { formatPartialDate } from '@/lib/utils/partialDate';
import { formatDateRange } from '@/lib/utils/dateFormat';
import { repairCVData } from '@/lib/cv/schema';
import { parseBackupFile, MAX_BACKUP_BYTES } from '@/lib/cv/backupImport';
import { extractTextFromPdf, PdfImportError, MAX_PDF_BYTES, MAX_PDF_PAGES, PdfJsLike } from '@/lib/pdf/extractPdfText';
import { createEmptyCVData } from '@/store/cvStore';
import { MARKETS } from '@/lib/markets/registry';
import { getMarketConfig, isValidMarket } from '@/lib/markets';

const root = join(__dirname, '..', '..');

describe('safeHttpUrl', () => {
  it('allows http(s) and bare domains', () => {
    assert.equal(safeHttpUrl('https://example.com/a'), 'https://example.com/a');
    assert.equal(safeHttpUrl('linkedin.com/in/jane'), 'https://linkedin.com/in/jane');
    assert.equal(safeHttpUrl('//cdn.example.com/x.png'), 'https://cdn.example.com/x.png');
  });
  it('rejects dangerous or non-web schemes, including obfuscated ones', () => {
    for (const bad of ['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'java\nscript:alert(1)', 'data:text/html,<script>', 'vbscript:x', 'file:///etc/passwd', 'mailto:a@b.c', '', '   ', 'http://localhostx']) {
      assert.equal(safeHttpUrl(bad), undefined, bad);
    }
  });
  it('allows data images only when asked', () => {
    const img = 'data:image/png;base64,iVBORw0KGgo=';
    assert.equal(safeHttpUrl(img), undefined);
    assert.equal(safeHttpUrl(img, { allowDataImage: true }), img);
    assert.equal(safeHttpUrl('data:image/svg+xml;base64,PHN2Zz4=', { allowDataImage: true }), undefined);
  });
});

describe('partial dates keep their precision', () => {
  it('formats year-only dates without inventing a month', () => {
    assert.equal(formatPartialDate('2012', 'MMM yyyy'), '2012');
    assert.equal(formatPartialDate('2012', 'MM/yyyy'), '2012');
    assert.equal(formatPartialDate('2012', 'jp-era'), '平成24年');
    assert.equal(formatPartialDate('2019', 'jp-era'), '2019年');
    assert.equal(formatDateRange('2012', '2016', false, 'gb'), '2012 – 2016');
  });
  it('keeps existing YYYY-MM output unchanged', () => {
    assert.equal(formatPartialDate('2020-03', 'MMM yyyy'), 'Mar 2020');
    assert.equal(formatPartialDate('2020-03', 'MM/yyyy'), '03/2020');
    assert.equal(formatPartialDate('2019-04', 'jp-era'), '平成31年4月');
    assert.equal(formatPartialDate('2019-05', 'jp-era'), '令和1年5月');
    assert.equal(formatPartialDate('garbage', 'MMM yyyy'), 'garbage');
  });
});

describe('schema repair', () => {
  const ctx = { market: 'eu' as const, templateId: 'eu-europass', pageSize: 'A4' as const };
  it('repairs missing/invalid fields without dropping user text', () => {
    const cv = createEmptyCVData('eu') as unknown as Record<string, unknown>;
    (cv.personalInfo as Record<string, unknown>).firstName = 'Zoë';
    (cv.personalInfo as Record<string, unknown>).maritalStatus = 'complicated';
    (cv.personalInfo as Record<string, unknown>).commuteTime = '45';
    cv.languages = [{ id: 'l', language: 'Dutch' }];
    cv.workExperience = [{ id: 'w', company: 'Acme', title: 'Dev', startDate: '2020-01', description: 'Built things', achievements: [1, 'two'] }];
    delete cv.pageSize;
    const repaired = repairCVData(cv, ctx);
    assert.ok(repaired);
    assert.equal(repaired.personalInfo.firstName, 'Zoë');
    assert.equal(repaired.personalInfo.maritalStatus, undefined);
    assert.equal(repaired.personalInfo.commuteTime, 45);
    assert.equal(repaired.languages[0].language, 'Dutch');
    assert.equal(repaired.workExperience[0].description, 'Built things');
    assert.deepEqual(repaired.workExperience[0].achievements, ['1', 'two']);
    assert.equal(repaired.pageSize, 'A4');
  });
  it('refuses inputs that are not CVs', () => {
    assert.equal(repairCVData('nope', ctx), null);
    assert.equal(repairCVData([1, 2], ctx), null);
  });
});

describe('backup import validation', () => {
  it('accepts a valid backup and flags a market mismatch', () => {
    const cv = createEmptyCVData('jp');
    const r = parseBackupFile(JSON.stringify(cv), 'us');
    assert.equal(r.kind, 'cv');
    assert.ok(r.kind === 'cv' && r.marketMismatch);
  });
  it('rejects non-JSON, non-CV and oversized files with a message', () => {
    for (const text of ['not json', '[]', '{"hello":1}', 'x'.repeat(MAX_BACKUP_BYTES + 1)]) {
      const r = parseBackupFile(text, 'us');
      assert.equal(r.kind, 'error', text.slice(0, 20));
    }
  });
  it('recognises a full local export', () => {
    const r = parseBackupFile(JSON.stringify({ app: 'GlobalCV', kind: 'full-local-export', exportedAt: 'x', entries: {} }), 'us');
    assert.equal(r.kind, 'full-export');
  });
  it('repairs a damaged backup instead of failing', () => {
    const cv = createEmptyCVData('gb') as unknown as Record<string, unknown>;
    cv.languages = [{ id: 'l', language: 'Welsh', proficiency: 'superb' }];
    const r = parseBackupFile(JSON.stringify(cv), 'gb');
    assert.equal(r.kind, 'cv');
    assert.ok(r.kind === 'cv' && r.repaired && r.cv.languages[0].language === 'Welsh');
  });
});

// Minimal single-page PDF with the text "Jane Doe CV" (xref offsets are
// reconstructed by pdf.js, which tolerates hand-written files).
const SAMPLE_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 18 Tf 20 100 Td (Jane Doe CV) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`;

const fileOf = (text: string | Uint8Array, size?: number) => {
  const bytes = typeof text === 'string' ? new TextEncoder().encode(text) : text;
  return { size: size ?? bytes.length, arrayBuffer: async () => bytes.slice().buffer };
};

async function nodePdfJs(): Promise<PdfJsLike> {
  const lib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsLike;
  return lib;
}

describe('PDF import hardening', () => {
  it('extracts text from a valid PDF using the patched pdf.js', async () => {
    const text = await extractTextFromPdf(fileOf(SAMPLE_PDF), { lib: await nodePdfJs() });
    assert.match(text, /Jane Doe CV/);
  });

  it('rejects oversized files before reading them', async () => {
    await assert.rejects(extractTextFromPdf(fileOf('%PDF-1.4', MAX_PDF_BYTES + 1)), (e: unknown) => e instanceof PdfImportError && e.code === 'too-large');
  });

  it('rejects files without a PDF signature', async () => {
    await assert.rejects(extractTextFromPdf(fileOf('<html>not a pdf</html>')), (e: unknown) => e instanceof PdfImportError && e.code === 'not-pdf');
  });

  it('rejects malformed PDFs with a friendly error', async () => {
    await assert.rejects(
      extractTextFromPdf(fileOf('%PDF-1.4\n garbage garbage'), { lib: await nodePdfJs() }),
      (e: unknown) => e instanceof PdfImportError && ['not-pdf', 'failed'].includes(e.code)
    );
  });

  it('enforces the page limit', async () => {
    const lib: PdfJsLike = {
      getDocument: () => ({
        promise: Promise.resolve({ numPages: MAX_PDF_PAGES + 1, getPage: async () => ({ getTextContent: async () => ({ items: [] }) }) }),
        destroy: async () => undefined,
      }),
    };
    await assert.rejects(extractTextFromPdf(fileOf(SAMPLE_PDF), { lib }), (e: unknown) => e instanceof PdfImportError && e.code === 'too-many-pages');
  });

  it('times out and releases the document on slow parsing', async () => {
    let destroyed = false;
    const lib: PdfJsLike = {
      getDocument: () => ({ promise: new Promise(() => undefined), destroy: async () => { destroyed = true; } }),
    };
    await assert.rejects(extractTextFromPdf(fileOf(SAMPLE_PDF), { lib, timeoutMs: 30 }), (e: unknown) => e instanceof PdfImportError && e.code === 'timeout');
    assert.ok(destroyed);
  });

  it('passes hardening options to pdf.js', async () => {
    let params: Record<string, unknown> = {};
    const lib: PdfJsLike = {
      getDocument: (p) => {
        params = p;
        return { promise: Promise.resolve({ numPages: 0, getPage: async () => ({ getTextContent: async () => ({ items: [] }) }) }), destroy: async () => undefined };
      },
    };
    await extractTextFromPdf(fileOf(SAMPLE_PDF), { lib });
    assert.equal(params.disableFontFace, true);
    assert.equal(params.enableXfa, false);
  });

  it('ships a pdf.js worker that matches the installed (patched) library', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'node_modules/pdfjs-dist/package.json'), 'utf8')) as { version: string };
    const [major, minor] = pkg.version.split('.').map(Number);
    assert.ok(major > 6 || (major === 6 && minor >= 2), `pdfjs-dist ${pkg.version} must be >= 6.2.108`);
    const hash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
    assert.equal(
      hash(join(root, 'public/pdf.worker.min.mjs')),
      hash(join(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs')),
      'public/pdf.worker.min.mjs is out of sync — run `npm run sync:pdf-worker`'
    );
  });
});

describe('market registry', () => {
  it('every registered market has a config and is valid', () => {
    assert.equal(MARKETS.length, 8);
    for (const market of MARKETS) {
      assert.ok(isValidMarket(market));
      assert.equal(getMarketConfig(market).market, market);
      assert.ok(getMarketConfig(market).templates.length >= 2, `${market} keeps its templates`);
    }
    assert.equal(isValidMarket('xx'), false);
  });
});
