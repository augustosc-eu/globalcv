# GlobalCV — Test Results

*Date: 2026-10-24 · Environment: Linux container, Node 22.22.0, npm 10.9.4, Chromium (Playwright 1.63) · Branch `claude/awesome-einstein-7cofem`*

All commands were run on the final code, after the last source change. They are the same commands CI runs (`.github/workflows/ci.yml`).

## Summary

| Check | Command | Result |
|---|---|---|
| Type checking | `npm run typecheck` | ✅ 0 errors |
| Lint | `npm run lint` (ESLint flat config, `--max-warnings=20`) | ✅ 0 errors, 14 warnings (see below) |
| Unit + integration tests | `npm test` | ✅ **98 / 98 passed** (24 suites) |
| Production dependency audit | `npm audit --omit=dev --audit-level=high` | ✅ **0 vulnerabilities** |
| Full dependency audit | `npm audit` | ⚠️ 3 moderate, all in the dev-only Tailwind 3 → postcss-selector-parser chain (accepted; see Remaining risks) |
| Production build | `npm run build` | ✅ Next.js 16.4.3. 9 static routes plus `/[market]`, `/api/jobs`, `/api/post-job`, `/api/health` |
| PDF rendering fixtures | `npm run verify:pdf` | ✅ 64 PDFs (8 markets × 2 templates × 4 export modes) |
| Browser E2E (production build, real CSP) | `npm run test:e2e` | ✅ **13 / 13 checks passed** |

The unit suite was run 3 times in a row after the final changes, with no flaky failures. One intermittent failure seen earlier was traced to a real defect: draft ids collided when two drafts were created in the same millisecond. It was fixed by adding a random suffix to ids. The new conflict detection had refused to overwrite in that case, which is the correct behaviour.

### Before → after

| | Audit baseline | Now |
|---|---|---|
| Automated tests | 0 | 98 unit/integration + 13 browser checks |
| ESLint | could not run (no config) | runs; 0 errors |
| `npm audit` (all) | 18 (1 critical, 9 high) | 3 moderate (dev only) |
| `npm audit --omit=dev` | critical + high | 0 |
| CI quality gate | none | `ci.yml` |

## Unit and integration tests (`tests/unit/`)

They run with Node's built-in `node:test` through `tsx`, against an in-memory `Storage` (`tests/helpers/browserEnv.ts`) that can simulate quota errors, failing writes and dropped writes. Vitest was evaluated but dropped: installing it triggers an npm arborist bug (`Cannot read properties of null (reading 'edgesOut')`) in this environment.

| File | Tests | Covers (audit ID) |
|---|---|---|
| `storage.test.ts` | 19 | **P0-2**: invalid drafts kept and repaired (storage unchanged on read); unrepairable drafts kept and reported; corrupt JSON quarantined before overwrite; save refused when the quarantine copy cannot be written; legacy v1 migration with v1 kept on failed write; quota errors reported; dropped writes detected; interrupted save keeps the previous version. **P2-10**: other tabs' drafts preserved; stale-revision save refused; deleted-elsewhere not resurrected. Photo dedup and GC; legacy inline photos; deletion persists after "reload"; full export; erase-all scope; tracker URL sanitising, write-failure reporting, malformed-entry preservation, quarantine |
| `store.test.ts` | 10 | **P0-2**: truthful saved/not-saved state and retry; no discard when switching fails to save. **P1-1**: Clear deletes from storage and keeps other drafts; Erase all removes only GlobalCV keys and persists. **P1-3**: import as new draft never overwrites, even with a colliding id; correct market; projects and targeting preserved; template fallback. Conflict resolution (keep both, reload) |
| `share.test.ts` | 14 | **P1-2/P1-3**: round-trip for **all 8 markets** via the fragment (no query string), preserving projects, targeting and remote profile; sensitive-field exclusion by default; opt-in inclusion (never photo or ID); legacy `?share=` decode with sensitive fields stripped; truncated, corrupt, wrong-version, oversized and non-CV payloads rejected; wrong-market redirect stays in the fragment; offer and invalid actions |
| `parser.test.ts` | 13 | **P2-4**: UK title/company split; no description leakage; Present and MM/YYYY ranges; year-only dates preserved; comma-separated languages. Pipe layout, "Title at Company"; Spanish months and "Actualidad"; separate title/company lines; Portuguese with `;` languages; ISO ranges; warnings for dropped content; `splitTitleCompany` orientation |
| `jobs.test.ts` | 15 | **P1-5**: input validation (enums, page, query length); upstream plan independent of `q`; one upstream load per source across distinct searches; `q` never sent upstream; failing provider isolated and reported (**P2-6**); unsafe URLs and non-allow-listed logos dropped; numeric salary sort (**P2-7**); demo jobs off in production; safe-mode gating; page clamping (**P3-3**); salary parsing; logo normalisation; rate limiter limit, recovery and bounded memory; client key |
| `hardening.test.ts` | 20 | **P2-2**: `safeHttpUrl`, including obfuscated `javascript:` and data URIs. Partial-date formatting (year-only and JP era; existing YYYY-MM output unchanged). Schema repair. **P2-5**: backup import (valid, market mismatch, non-JSON, non-CV, oversized, full export, repair). **P1-4**: real text extraction with patched pdf.js; size, signature, malformed, page-limit and timeout rejection with document release; hardening options passed; pdfjs ≥ 6.2.108 and `public/` worker hash matches the package. Market registry (8 markets, each with ≥ 2 templates) |
| `postJobRoute.test.ts` | 7 | **P2-3**: 415 non-JSON, 403 cross-origin and missing Origin, 400 invalid email, `javascript:` URL and malformed JSON, honeypot, fail-closed without an email key, 429 rate limit. `/api/health` |

## Browser E2E (`tests/e2e/smoke.mjs`)

This runs Chromium against `next start` (the production build), so the real production CSP and headers apply. It listens for `securitypolicyviolation` events, CSP console errors and uncaught page errors.

| # | Check | Result |
|---|---|---|
| 1 | All routes render with 200: `/`, all 8 markets, `/jobs`, `/applications`, `/privacy`, `/terms`, `/remote-workers` | ✅ |
| 2 | Autosave persists across reload | ✅ |
| 3 | A storage failure (forced `QuotaExceededError`) shows **Not saved** and the error banner, never "Saved"; *Retry save* then persists | ✅ |
| 4 | **Delete this CV** removes the CV from storage; verified after reload | ✅ |
| 5 | The share link is `/gb#cv=2.…`. In a fresh browser context the prompt appears, the fragment is removed from the address bar, the CV opens as a new draft, and **no request URL contains the payload** | ✅ |
| 6 | PDF export works for GB (designed) and JP (rirekisho with Noto Sans JP); output starts with `%PDF-` | ✅ |
| 7 | PDF import via the patched pdf.js worker reaches the preview/apply step | ✅ |
| 8 | A non-PDF upload shows "This file is not a valid PDF." | ✅ |
| 9 | **Erase all data on this device** with typed confirmation removes every `cv_maker_*` key, keeps an unrelated key, and holds after reload | ✅ |
| 10 | `/api/jobs?page=abc` → 400; `/api/jobs` → 200 with `sources[]`; no demo job in production | ✅ |
| 11 | `/api/health` → 200 `ok` | ✅ |
| 12 | Production CSP has no `unsafe-eval`, has `object-src 'none'` and no blanket `https:` image source; no `X-Powered-By` | ✅ |
| 13 | **Zero CSP violations and zero uncaught page errors** across all of the above | ✅ |

The first E2E run found two CSP problems:

- zod 4's `new Function` probe was reported on every page. Fixed with `z.config({ jitless: true })`.
- yoga's WASM loader was blocked from fetching its `data:` URL. Fixed by adding `connect-src data:`.

Both were fixed and re-verified.

## Lint warnings (14, non-blocking)

| Rule | Count | Reason |
|---|---|---|
| `react-hooks/set-state-in-effect` | 13 | React Compiler advisory. These effects read browser-only state (localStorage, `matchMedia`) after hydration, the SSR-safe pattern. Downgraded to `warn` with justification in `eslint.config.mjs` |
| `react-hooks/incompatible-library` | 1 | react-hook-form's `watch()` cannot be auto-memoised by React Compiler; informational |

## Not verified here

- **Live upstream job providers.** The sandbox has no outbound access to them, so all providers failed. That exercised the degraded path in the E2E. The happy path is covered with mocked `fetch` in `jobs.test.ts`.
- **Resend email delivery.** No API key was available. Only the fail-closed path was tested.
- **Real GitHub Actions run.** `ci.yml` has not executed yet; it will on the pull request. The pinned action SHAs and the Playwright CI install step are unverified until then.
- **Other browsers.** Firefox and Safari behaviour, and mobile viewports beyond layout, were not tested. Screen-reader and axe accessibility scans were not run.
- **Load testing.** None was done against a deployed instance. The rate limiter and cache behaviour are unit-tested only.
