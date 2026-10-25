/*
 * Browser-level smoke test against a production build (`npm run build` first).
 *
 *   npm run test:e2e            # starts `next start` on a free port
 *   E2E_BASE_URL=http://localhost:3000 npm run test:e2e   # use a running server
 *
 * Verifies, in Chromium, with the real production CSP:
 *  - no CSP violations or page errors on the main routes,
 *  - autosave + reload persistence, truthful "Not saved" on storage failure,
 *  - "Delete this CV" and "Erase all data" actually remove data (after reload),
 *  - share links use the URL fragment, never reach the server, and open as a new draft,
 *  - PDF export (incl. Japanese fonts) and PDF import work.
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = new URL('../..', import.meta.url).pathname;

async function freePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function startServer() {
  if (process.env.E2E_BASE_URL) return { base: process.env.E2E_BASE_URL, stop: () => undefined, log: () => '' };
  const port = await freePort();
  let output = '';
  const child = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'start', '-p', String(port)], {
    cwd: root,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => { output += d; });
  child.stderr.on('data', (d) => { output += d; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(base);
      if (res.ok) break;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return { base, stop: () => child.kill('SIGTERM'), log: () => output };
}

const results = [];
async function step(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`  ✔ ${name} (${Date.now() - started}ms)`);
  } catch (err) {
    results.push({ name, ok: false, ms: Date.now() - started, error: String(err?.stack ?? err) });
    console.log(`  ✖ ${name}\n    ${String(err?.message ?? err).split('\n').join('\n    ')}`);
  }
}

const server = await startServer();
const browser = await chromium.launch();
const requestUrls = [];
const violations = [];
const pageErrors = [];

async function newPage(context) {
  const page = await context.newPage();
  page.on('request', (req) => requestUrls.push(req.url()));
  page.on('pageerror', (err) => pageErrors.push(`${page.url()}: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && /Content Security Policy|Refused to/i.test(msg.text())) violations.push(`${page.url()}: ${msg.text()}`);
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error(`Refused to load (CSP) ${e.violatedDirective} ${e.blockedURI}`);
    });
    try { localStorage.setItem('globalcv_privacy_notice_dismissed', '1'); } catch { /* ignore */ }
  });
  return page;
}

const storageDump = (page) => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
const firstName = (page) => page.locator('input[name="firstName"]');
async function openTools(page) {
  await page.getByRole('button', { name: /tools/i }).click();
}

try {
  console.log(`E2E against ${server.base}`);
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: server.base });
  const page = await newPage(context);

  await step('main routes render without errors', async () => {
    for (const path of ['/', '/us', '/gb', '/eu', '/latam', '/br', '/in', '/au', '/jp', '/jobs', '/applications', '/privacy', '/terms', '/remote-workers']) {
      const res = await page.goto(server.base + path, { waitUntil: 'networkidle' });
      assert.equal(res.status(), 200, path);
    }
  });

  await step('autosave persists across reload', async () => {
    await page.goto(`${server.base}/gb`, { waitUntil: 'networkidle' });
    await firstName(page).fill('E2EAlice');
    await page.waitForFunction(() => (localStorage.getItem('cv_maker_v2_gb') ?? '').includes('E2EAlice'), null, { timeout: 8000 });
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await firstName(page).inputValue(), 'E2EAlice');
  });

  await step('a failed save is shown as "Not saved", never "Saved"', async () => {
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      window.__restoreSetItem = () => { Storage.prototype.setItem = original; };
      Storage.prototype.setItem = function () { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
    });
    await firstName(page).fill('E2EQuota');
    await page.getByText(/Browser storage is full/).waitFor({ timeout: 8000 });
    await page.getByRole('button', { name: /not saved/i }).waitFor();
    await page.evaluate(() => window.__restoreSetItem());
    await page.getByRole('button', { name: /retry save/i }).click();
    await page.waitForFunction(() => (localStorage.getItem('cv_maker_v2_gb') ?? '').includes('E2EQuota'), null, { timeout: 8000 });
  });

  await step('"Delete this CV" removes it from storage (survives reload)', async () => {
    await openTools(page);
    await page.getByRole('button', { name: 'Delete this CV' }).click();
    const dialog = page.getByRole('alertdialog');
    await dialog.getByRole('button', { name: 'Delete this CV' }).click();
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await firstName(page).inputValue(), '');
    const dump = JSON.stringify(await storageDump(page));
    assert.ok(!dump.includes('E2EQuota') && !dump.includes('E2EAlice'), 'deleted CV still in storage');
  });

  await step('share link uses the fragment, never reaches the server, and opens as a new draft', async () => {
    await firstName(page).fill('E2EShare');
    await page.waitForTimeout(1800);
    await page.getByRole('button', { name: /^share$/i }).click();
    await page.getByRole('button', { name: 'Copy link' }).click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(link, /\/gb#cv=2\./);

    const other = await browser.newContext();
    const recipient = await newPage(other);
    const before = requestUrls.length;
    await recipient.goto(link, { waitUntil: 'networkidle' });
    await recipient.getByRole('dialog', { name: /open shared cv/i }).waitFor();
    assert.ok(!recipient.url().includes('cv=2.'), 'fragment removed from address bar');
    await recipient.getByRole('button', { name: 'Open as new draft' }).click();
    await recipient.waitForFunction(() => document.querySelector('input[name="firstName"]')?.value === 'E2EShare', null, { timeout: 8000 });
    await recipient.waitForFunction(() => (localStorage.getItem('cv_maker_v2_gb') ?? '').includes('E2EShare'), null, { timeout: 8000 });
    const sent = requestUrls.slice(before).filter((u) => u.includes('cv=2.') || u.includes('share='));
    assert.deepEqual(sent, [], 'share payload must not be sent in any request');
    await other.close();
  });

  await step('PDF export works (GB designed + JP rirekisho with Japanese fonts)', async () => {
    for (const market of ['gb', 'jp']) {
      await page.goto(`${server.base}/${market}`, { waitUntil: 'networkidle' });
      if (market === 'jp') await firstName(page).fill('太郎');
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 60000 }),
        page.locator('header').getByRole('button', { name: /PDF/ }).first().click(),
      ]);
      const path = await download.path();
      const bytes = readFileSync(path);
      assert.ok(bytes.length > 1000, `${market} PDF too small`);
      assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    }
  });

  await step('PDF import extracts text through the patched pdf.js worker', async () => {
    const fixtureDir = join(root, 'tmp/pdf-fixtures');
    const fixture = existsSync(fixtureDir) ? readdirSync(fixtureDir).find((f) => f.startsWith('gb-') && f.endsWith('designed.pdf')) : null;
    assert.ok(fixture, 'run `npm run verify:pdf` first to create PDF fixtures');
    await page.goto(`${server.base}/gb`, { waitUntil: 'networkidle' });
    await openTools(page);
    await page.getByRole('button', { name: /^import$/i }).click();
    await page.getByRole('button', { name: 'Upload PDF' }).click();
    await page.locator('input[type="file"][accept*="pdf"]').setInputFiles(join(fixtureDir, fixture));
    await page.getByRole('button', { name: /apply/i }).waitFor({ timeout: 20000 });
  });

  await step('PDF import rejects a non-PDF file with a clear error', async () => {
    await page.getByRole('button', { name: /back|close|cancel/i }).first().click().catch(() => undefined);
    await page.goto(`${server.base}/gb`, { waitUntil: 'networkidle' });
    await openTools(page);
    await page.getByRole('button', { name: /^import$/i }).click();
    await page.getByRole('button', { name: 'Upload PDF' }).click();
    await page.locator('input[type="file"][accept*="pdf"]').setInputFiles({ name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('<html>not a pdf</html>') });
    await page.getByText('This file is not a valid PDF.').waitFor({ timeout: 10000 });
  });

  await step('"Erase all data on this device" removes every GlobalCV key and nothing else', async () => {
    await page.goto(`${server.base}/eu`, { waitUntil: 'networkidle' });
    await firstName(page).fill('E2EErase');
    await page.waitForFunction(() => (localStorage.getItem('cv_maker_v2_eu') ?? '').includes('E2EErase'), null, { timeout: 8000 });
    await page.evaluate(() => localStorage.setItem('unrelated_key', 'keep'));
    await openTools(page);
    await page.getByRole('button', { name: 'Erase all data on this device' }).click();
    const dialog = page.getByRole('alertdialog');
    await dialog.getByLabel(/type/i).fill('ERASE');
    await dialog.getByRole('button', { name: 'Erase all data on this device' }).click();
    await page.reload({ waitUntil: 'networkidle' });
    const keys = Object.keys(await storageDump(page));
    assert.ok(keys.includes('unrelated_key'));
    assert.deepEqual(keys.filter((k) => k.startsWith('cv_maker_')), [], `left: ${keys.join(',')}`);
    assert.equal(await firstName(page).inputValue(), '');
  });

  await step('jobs API rejects invalid input and reports sources', async () => {
    const bad = await fetch(`${server.base}/api/jobs?page=abc`);
    assert.equal(bad.status, 400);
    const ok = await fetch(`${server.base}/api/jobs`);
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.ok(Array.isArray(body.sources));
    assert.ok(!body.jobs.some((j) => j.company === 'Example Labs'), 'demo job must not appear in production');
  });

  await step('health endpoint responds', async () => {
    const res = await fetch(`${server.base}/api/health`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'ok');
  });

  await step('security headers are present', async () => {
    const res = await fetch(server.base);
    const csp = res.headers.get('content-security-policy') ?? '';
    assert.ok(!csp.includes("'unsafe-eval'"), 'no unsafe-eval in production');
    assert.ok(csp.includes("object-src 'none'"));
    assert.ok(!/img-src[^;]*\shttps:(\s|;|$)/.test(csp), 'img-src must not allow every https host');
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  await step('no CSP violations or uncaught page errors', async () => {
    assert.deepEqual(violations, []);
    assert.deepEqual(pageErrors, []);
  });
} finally {
  await browser.close();
  server.stop();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} E2E checks passed`);
if (failed.length) {
  if (!process.env.E2E_BASE_URL) console.log('--- server log (tail) ---\n' + server.log().slice(-3000));
  process.exit(1);
}
