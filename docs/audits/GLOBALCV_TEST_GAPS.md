# GlobalCV — Test Coverage Assessment & Proposal

*Audit date: 2026-10-24 · Commit `9dbaf3f`*

## 1. Current state

| Layer | What exists | Status |
|---|---|---|
| Static typing | `tsc --noEmit` with `strict: true` (`npm run lint`) | ✅ Passes, 0 errors. Runs only locally |
| Lint | ESLint 10 and `eslint-config-next` are installed, but there is **no `eslint.config.*`** | ❌ `npx eslint src` refuses to run |
| Unit tests | None. No runner (Jest/Vitest) is installed | ❌ 0% |
| Integration tests (API routes) | None | ❌ |
| E2E / accessibility | None. Playwright is not a dependency | ❌ |
| Rendering smoke | `npm run verify:pdf` renders 64 PDF fixtures (8 markets × 2 templates × 4 variants) to `tmp/pdf-fixtures` | ⚠️ Passes. It checks only that rendering does not throw; there are no assertions on content or page count |
| CI | `.github/workflows/mirror.yml` only | ❌ No check runs on push or PR |

**Effective automated coverage of behaviour is zero.** All three P0/P1 data defects found in this audit (silent draft deletion, Clear not erasing, share import into the wrong market) sit in small, pure, easy-to-test modules. They would have been caught by the tests T1–T7 below.

## 2. Recommended tooling (cost-conscious)

- **Vitest** with `jsdom` (or a simple in-memory `localStorage` shim). It works with the existing `tsconfig` `@/*` paths through `vite-tsconfig-paths`. The audit's throwaway probes already showed that the store, storage, share and parser modules run headless under `tsx` with no refactoring.
- **Playwright** for a small E2E and axe suite. Chromium is already a typical CI image component.
- **ci.yml:** `npm ci` → `tsc` → `eslint` → `vitest run --coverage` → `next build` → `verify:pdf` → `npm audit --omit=dev --audit-level=high`.

## 3. Prioritised test proposal

### Tier 1 — data integrity and privacy (write first, before fixing P0/P1)

| ID | Module | Test case | Guards against |
|---|---|---|---|
| T1 | `lib/storage/localStorage` | A draft that fails `parseCVData` (e.g. a language without `proficiency`) is **preserved** (quarantined), not deleted, and `hasCorruptedDrafts()` is true | P0-2 |
| T2 | `lib/storage/localStorage` | Unparseable JSON under `cv_maker_v2_{market}` is kept in a backup key, and the original bytes can be recovered | P0-2 |
| T3 | `store/cvStore` + storage | When `localStorage.setItem` throws `QuotaExceededError`, `save()` leaves `isDirty=true` and exposes an error, and `lastSaved` does not change | P0-2 |
| T4 | `lib/storage/localStorage` | Legacy v1 → v2 migration keeps all fields. Idempotent: reading twice causes no writes | Regression in migration |
| T5 | `store/cvStore` / AppHeader clear handler | After Clear, no stored draft contains the previous personal data. "Erase all" leaves no `cv_maker_*` or `globalcv_*` keys | P1-1 |
| T6 | `lib/sharing/shareUrl` | `encode → decode` round-trips every `CVData` field except excluded ones. The payload excludes `photo`, `idNumber`, `dateOfBirth`, `gender`, `maritalStatus`, `emergencyContact` and reference contacts by default. The URL uses a fragment | P1-2 |
| T7 | Share import (WizardShell logic, extracted into a function) | An EU share link on a fresh store gives `cv.market==='eu'` and a new draft id, the existing drafts are untouched, and projects and targeting are preserved | P1-3 |
| T8 | `lib/sharing/shareUrl` | A malformed, oversized or garbage `share` param returns `null` without throwing. Unknown keys are stripped | Robustness |

### Tier 2 — security-relevant inputs

| ID | Module | Test case | Guards against |
|---|---|---|---|
| T9 | `lib/pdf/extractPdfText` | Text extraction from 3–5 fixture PDFs (single column, two column, JP). PDFs over the limit are rejected. The pdfjs version is at least the patched floor (assert in test) | P1-4, regressions |
| T10 | `safeHttpUrl` (new) | Rejects `javascript:`, `data:`, `vbscript:`, mixed-case and whitespace-prefixed schemes. Accepts `https://`. Upgrades or rejects `http:` per policy | P2-2 |
| T11 | `api/post-job/route` | Flag off gives 404. Invalid payload gives 400. `text/plain` gives 415. Foreign `Origin` gives 403. Missing API key gives 500 with a generic message. Resend is called with a fixed `to` and the user email only in `replyTo` (mock `resend`) | P2-3 |
| T12 | `components/form-fields/PhotoUpload` | Non-image MIME rejected, files over 8 MB rejected, output is a JPEG data URL of 800 px or less | Upload hardening |
| T13 | JSON restore handler | A backup from another market prompts or refuses. Invalid JSON shows an error. Overwriting the same id asks for confirmation | P2-5 |

### Tier 3 — server aggregator correctness (mock `fetch`)

| ID | Test case | Guards against |
|---|---|---|
| T14 | Upstream URLs are identical for different `q` values (after the P1-5 fix), and `q` is filtered locally | P1-5 |
| T15 | A failing or timing-out source does not fail the response, and the response reports `sources[].ok=false` | P2-6 |
| T16 | Salary sort orders `$120,000 - $150,000`, `$90k–$100k/yr` and `€70k` numerically | P2-7 |
| T17 | `page=abc`, `page=-1` and `page=9999` give valid, clamped pagination | P3-3 |
| T18 | `normalizeLogoUrl`: protocol-relative, relative, `http`→`https`, `javascript:` rejected. `stripHtml` and `decodeXmlEntities` on hostile input | Data hygiene |
| T19 | `inferRegion` / `inferCategory` table tests, e.g. "Remote (US)", "EMEA", "Brazil", "UK only" | Filter correctness |
| T20 | Dedup by `title|company` is case-insensitive and keeps the first source's entry | Stability |

### Tier 4 — product logic and domain rules

| ID | Module | Test case |
|---|---|---|
| T21 | `lib/parser/cvParser` | Fixture corpus of at least 20 CV texts (EN, ES, PT, JA; plain and Markdown; LinkedIn export). Assert title/company split (`—`, `|`, `at`, `,`), entry boundaries, language lists (`English (Native), German (B2)`), year-only dates preserved, and a warning for every dropped line |
| T22 | `lib/utils/dateFormat` | Wareki conversion at era boundaries (2019-04-30 / 2019-05-01, Heisei → Reiwa). Locale month names. `isPresent` rendering |
| T23 | Market configs | For each market, hidden fields (US/GB/AU: photo, DOB, nationality, marital status) are absent from the preview, the PDF and the `ats` export mode. Snapshot of `prepareCVForExportMode` |
| T24 | `lib/cv/completeness`, `recruiterScan`, `bulletQuality`, `jobTargeting`, `coverLetter` | Deterministic table tests for scores and suggestions (empty CV, full CV, edge lengths) |
| T25 | `store/cvStore` undo/redo | Edits produce at most 20 snapshots. Undo then a new edit drops redo. Undo does not trigger an autosave loop |
| T26 | `CopyToMarketModal` logic | Copying into a market keeps the target's template and theme and does not carry fields that are hidden in the target market |

### Tier 5 — E2E and accessibility (Playwright, about 8 specs)

1. Create a US résumé end-to-end, export the PDF, and assert the download exists, is 1 page and contains the name.
2. JP Rirekisho with a photo: export succeeds and the JP font loads.
3. Reload the page and the draft persists. With privacy mode on, nothing is written to storage.
4. Share link: open it in a new context and get a new draft in the correct market with no `?share` in the server request log.
5. Clear, then "Erase all": localStorage is empty.
6. Paste import of a fixture CV gives the expected fields.
7. Jobs page with mocked `/api/jobs`: filters, pagination, save to tracker, tracker status update.
8. Axe scan of `/`, `/us`, `/jp`, `/jobs` and `/applications` with no serious or critical violations.

### Tier 6 — PDF verification upgrade

Extend `scripts/render-pdf-fixtures.tsx` to assert, per fixture:

- page count is within the market limit;
- the name and section headings appear in the extracted text (use the existing pdfjs extractor);
- the file size is under a threshold.

This turns the current smoke run into a regression gate.

## 4. Coverage targets

| Area | Target (line coverage) |
|---|---|
| `src/lib/storage`, `src/lib/sharing`, `src/lib/cv/schema.ts` | ≥ 90% |
| `src/store/cvStore.ts` | ≥ 70% |
| `src/lib/parser`, `src/lib/cv/*`, `src/lib/utils/*` | ≥ 75% |
| `src/app/api/**` | ≥ 80% (mocked fetch / resend) |
| UI components | Covered by E2E specs, not by line targets |
