# GlobalCV — Remediation Summary

*Date: 2026-10-24 · Base: `main` @ `9dbaf3f` · Branch: `claude/awesome-einstein-7cofem`*
*Source audit: [`docs/audits/GLOBALCV_AUDIT_REPORT.md`](../audits/GLOBALCV_AUDIT_REPORT.md)*

Companion documents:

- [Security fixes](GLOBALCV_SECURITY_FIXES.md)
- [Test results](GLOBALCV_TEST_RESULTS.md)
- [Remaining risks](GLOBALCV_REMAINING_RISKS.md)

## 1. Outcome

- **All P0 findings are resolved.** Each fix has regression tests.
- **All P1 findings are resolved.** Each has unit or integration tests, and the user-facing flows are also covered by browser E2E tests.
- **P2 findings are resolved or partly resolved where technically feasible.** Items left open are listed with reasons in §3 and in the remaining-risks document.
- **Nothing was merged into `main` and nothing was deployed.**

### Production-readiness re-score

The rubric is the same as in the audit.

| Dimension (weight) | Before | After | Why |
|---|---|---|---|
| Security hardening (20) | 11 | 17 | Patched framework and pdf.js. 0 production audit findings. Tighter CSP. Rate limits. URL and file validation |
| Data integrity & reliability (15) | 6 | 13 | No destructive reads. Quarantine copies. Truthful save state. Revision-based conflict detection |
| Privacy & compliance (10) | 5 | 8 | Real erasure. Fragment share links that exclude sensitive fields by default. Accurate policy text |
| Testing & CI (15) | 2 | 12 | 98 unit/integration tests, 13 browser checks and a CI workflow. Branch protection is **not** configured or verified |
| Observability & ops (10) | 2 | 4 | Per-source job status, `/api/health`, and recovery and troubleshooting docs. Still no error monitoring |
| Deployment reproducibility (10) | 7 | 9 | Node pinned (`.nvmrc`, `engines`). CI builds the production bundle |
| Performance (10) | 7 | 8 | Jobs fan-out is bounded and cached. Reads no longer write. Photos de-duplicated |
| Maintainability (10) | 6 | 7 | Jobs route split into modules. Single market registry. Centralised date formatting |
| **Total** | **46** | **78** | |

## 2. What changed

### Workstream 1 — Data-loss prevention (P0-2)

The storage layer (`src/lib/storage/localStorage.ts`) was rewritten around these rules:

- **Reads have no side effects.** Loading a market never rewrites or deletes storage.
- **Non-destructive validation.** A draft that fails the schema is repaired in memory by `repairCVData` (`src/lib/cv/schema.ts`):
  - type slips are coerced;
  - invalid optional values are dropped;
  - required fields get neutral defaults.
  
  A draft that cannot be repaired is kept verbatim in the index and listed for recovery.
- **Quarantine.** Unparseable JSON (a market index, a legacy key or the tracker) is copied to `cv_maker_quarantine_<label>_<hash>` before anything may overwrite it.
  - If the copy cannot be written (storage full), the save is refused with `unrecoverable-existing-data`.
  - Before a repaired draft is first replaced, its original entry is quarantined too.
- **Truthful saves.** `saveCV` returns a `SaveResult`: `{ ok: true, savedAt, revision }` or `{ ok: false, reason: 'quota' | 'unavailable' | 'conflict' | 'deleted-elsewhere' | 'unrecoverable-existing-data', message }`.
  - Every write is verified by reading it back.
  - The store keeps `isDirty = true` and sets `saveError` on failure.
  - The header shows **Not saved**, and a banner offers *Retry* and *Download backup*.
  - Autosave now retries on the next edit.
- **Recoverable writes.** Each market index is a single `localStorage` key, which is an atomic write. A failed write leaves the previous version intact (tested).
- **Multi-tab safety.**
  - A save re-reads the index immediately before writing and replaces only its own draft, so other tabs' drafts survive.
  - Each draft carries a `revision`. A save based on a stale revision returns `conflict` and is not applied.
  - The user chooses: *Load the other tab's version*, *Save mine as a new draft* or *Overwrite with mine*.
  - A draft deleted in another tab is never resurrected silently.
  - `CrossTabSyncBanner` now reacts only when the open draft's revision actually changed.
- **No silent discard on switch.** `initializeMarket` and `importAsNewDraft` save pending edits first. If that fails they refuse to switch, so the edits are kept.
- **Legacy migration.** `cv_maker_v1_*` drafts are read in memory. The v1 key is removed only after the v2 write succeeds.
- **Photo de-duplication.** Photos are stored once per content hash (`cv_maker_photo_*`) and drafts reference them as `stored-photo:<hash>`.
  - Unreferenced photos are garbage-collected on delete.
  - Inline photos in older data still load.
- **Export and recovery.**
  - *Tools → Download all my data* exports every GlobalCV key verbatim, quarantine copies included.
  - *Restore JSON* accepts that file and merges it **without overwriting** existing entries.
  - A recovery banner appears whenever data was repaired or could not be read.
- **Application tracker.** Writes return success. Malformed entries are kept (not filtered out on rewrite). Unreadable data is quarantined.

### Workstream 2 — Framework and dependency security (P0-1, P1-4)

See [Security fixes](GLOBALCV_SECURITY_FIXES.md#dependencies).

| Package | Before | After | Reason |
|---|---|---|---|
| `next` | 16.2.0 | **16.4.3** | Critical advisory set (RSC DoS, cache poisoning, …) |
| `eslint-config-next` | 16.2.0 | 16.4.3 (dev) | Must match Next |
| `pdfjs-dist` | 5.7.284 | **6.4.299** | GHSA-hq66-cqwq-w95j (JS execution from malicious PDF). The worker in `public/` was synced |
| `zod` | 3.25.76 | **4.6.7** | GHSA-mrhx-c7xc-m3w5 (high). The API used is compatible. Runs `jitless` for CSP |
| `resend` | 6.9.4 | 6.34.1 | Transitive `svix` → `uuid` advisory |
| `tsx` | 4.21.0 | 4.23.15 (dev) | Transitive `esbuild` advisory |
| Transitive (`npm audit fix`, non-breaking) | — | — | brace-expansion, picomatch, postcss, browserslist, nanoid, source-map-js, sharp, @babel/core, … |
| **Removed (unused):** `@hookform/resolvers`, 10 × `@radix-ui/*`, `class-variance-authority`, `react-image-crop` | — | — | Smaller supply-chain surface. Verified there are no imports |
| `@types/qrcode` | dependency | devDependency | Types only |

`npm audit --omit=dev` reports **0 vulnerabilities**. Three moderate dev-only findings remain in Tailwind 3's build chain (see Remaining risks). No `npm audit fix --force` was run, and no unrelated major upgrades were made.

### Workstream 3 — Privacy and deletion (P1-1)

- **Delete this CV** (`clearCurrentCV`):
  - shows a confirmation dialog explaining the action, with an optional "download a backup first";
  - deletes the draft and its readiness history from storage, and garbage-collects its photo;
  - resets the editor, and does **not** auto-save the empty CV as a new draft.
- **Erase all data on this device** (`eraseAllData` → `eraseAllLocalData`):
  - requires typing a confirmation word;
  - removes every `cv_maker_*` and `globalcv_*` key from localStorage and sessionStorage, and reports anything it could not remove;
  - leaves unrelated keys untouched.
- `PersonalInfoStep` now re-syncs its form whenever another draft is loaded, and ignores programmatic resets. Before this, stale contact fields could be written back after a clear or a draft switch.
- The privacy policy, the privacy banner and the README were rewritten to match this behaviour, including the storage-key table and the GDPR rights section.

### Workstream 4 — Secure sharing and import (P1-2, P1-3, P2-5)

- **Links.** New links are `/{market}#cv=2.<lz-string>`: the payload is in the fragment and carries a version prefix. The UI and docs state clearly that this is **not encryption**.
- **Fields.** The photo and `idNumber` are never shared. These are excluded unless the author opts in:
  - date of birth, nationality, marital status, gender;
  - emergency contact, nearest station, commute time, personal seal;
  - street address and postal code;
  - references' email and phone.
- **Validation on open.** Size limits apply before and after decompression (60k / 300k characters), the payload must match the version prefix, and a zod schema check runs. Invalid or truncated links show a clear message.
- **Wrong market.** Links opened on another market's route are redirected to the right one, in fragment form.
- **Confirmation.** Opening a link asks *Open shared CV?* and then calls `importAsNewDraft`, which gives it a new id in the link's market. It never merges into or overwrites existing drafts.
- **What is kept.** Projects, job targeting, remote-work profile, hidden sections, font and QR settings are preserved. An unknown template falls back to the market default.
- **Legacy `?share=` links** still open. The query is removed from the address bar immediately, and sensitive fields are not imported from them.
- **JSON restore.** The file is validated (size, JSON, schema, repair). It always opens as a new draft in its own market (navigating there if needed), and errors are shown instead of being swallowed silently.

### Workstream 5 — PDF import (P1-4)

`src/lib/pdf/extractPdfText.ts`:

- **Limits:** 10 MB, a `%PDF-` signature check, at most 15 pages, 200k extracted characters, and a 20 s time budget. The document is always destroyed afterwards, including on timeout.
- **pdf.js options:** `disableFontFace`, `enableXfa: false`, `isOffscreenCanvasSupported: false`, `disableAutoFetch`, `disableStream`, and a `maxImageSize` cap.
- **No embedded scripts:** pdf.js 6 runs no PDF JavaScript, because no scripting sandbox is loaded.
- **Errors:** typed `PdfImportError` codes with user-facing messages (encrypted, malformed, too large, and so on).

### Workstream 6 — Jobs API (P1-5, P2-6, P2-7, P3-3)

`/api/jobs` is now a 40-line handler over `src/lib/jobs/{sources,aggregate,rateLimit}.ts`:

- **Bounded fan-out.**
  - Upstream URLs depend only on enum values, never on the free-text `q`.
  - Each source is cached per instance for 5 minutes, with single-flight de-duplication.
  - At most 4 sources load concurrently, with a 6 s per-request timeout and a 9 s per-source budget.
- **Validation.** `q` is limited to 100 characters with control characters stripped. Enums are allow-listed, and `page` must be an integer from 1 to 200 and is clamped. Invalid input gets a 400 with a message.
- **Failure isolation.** A failed provider never fails the response. The response includes `sources[]` and `degraded`, stale cache is served when available, and the UI shows a notice.
- **Rate limiting.** 60 requests/min per client per instance, returning 429 with `Retry-After`. `Cache-Control: s-maxage` lets the CDN absorb repeated queries. The limits of an in-memory limiter are documented, with a Vercel Firewall rule as the global option.
- **Demo data.** The "Example Labs" job is now `DEMO_JOBS`, served only when `NODE_ENV !== 'production'` or `ENABLE_DEMO_JOBS=true`.
- **Salary sort.** Uses numeric `salaryMin`, so every source's format sorts correctly.
- **URL safety.** Job and logo URLs are sanitised server-side. Logos are kept only from CSP-allow-listed hosts.
- **Code consolidation.** The three Himalayas fetchers were merged into one.

### Workstream 7 — CI, testing and tooling (P1-6)

- `eslint.config.mjs` (flat config using `eslint-config-next`).
- `npm run lint` now runs ESLint. `npm run typecheck` runs tsc.
- `npm test` runs `node:test` via `tsx`. There are no new test dependencies; vitest was dropped after an npm installer bug.
- `npm run test:e2e` is a Playwright smoke test against the production build.
- `npm run sync:pdf-worker` copies the pdf.js worker.
- `.github/workflows/ci.yml` runs: typecheck → lint → tests → `npm audit --omit=dev --audit-level=high` → build → `verify:pdf` → browser E2E. Actions are pinned by SHA, with `permissions: contents: read` and `persist-credentials: false`.
- Fixed the lint errors this surfaced:
  - conditional hooks in `post-job/page.tsx` (a real rules-of-hooks bug);
  - `any` casts;
  - unused variables and imports.
- **Branch protection was not configured or verified** (it is a repository setting and outside this change).

### Workstream 8 — Parser (P2-4)

`src/lib/parser/cvParser.ts`:

- Title and company are split on `—`, `–`, `|`, ` - `, "at", and a single comma, guided by company and title keyword hints. Company-first headers are detected.
- Each description stops where the next entry's header begins, so text no longer leaks between jobs.
- Bullets are never used as headers.
- Dates are tokenised instead of split on separators. This fixes `- Present` and ISO `2020-01 - 2021-03`.
- Year-only dates stay `YYYY`. The previously invented `-01` month is gone.
- Language lists split on `, ; | / •`, ignoring separators inside parentheses. CEFR, JLPT, native, fluent, professional and conversational levels are mapped. The `fluent → native` error is fixed.
- Warnings are emitted for dropped lines and unrecognised languages.
- **Display side:** a shared `formatPartialDate` (`src/lib/utils/partialDate.ts`) is used by all 8 HTML renderers, the PDF document and `dateFormat.ts`. Year-only dates render as `2012` (or `平成24年` in JP) instead of `Jan 2012` / `NaN月`. Existing `YYYY-MM` output is unchanged.
- Fixtures in `tests/fixtures/cv-text/` (all synthetic): a UK standard layout, US pipes / "Title at Company", LATAM Spanish, BR Portuguese.

### Workstream 9 — Security hardening (P2-1, P2-2, P2-3, P3-5)

See [Security fixes](GLOBALCV_SECURITY_FIXES.md). In summary:

- **CSP:** `unsafe-eval` removed in production; `img-src` restricted to allow-listed logo hosts; `object-src 'none'`, `base-uri`, `form-action` and `upgrade-insecure-requests` added.
- **Headers:** XFO `DENY`, COOP, and `poweredByHeader: false`.
- **Links:** `safeHttpUrl` applied to every external link.
- **post-job:** JSON-only, same-origin, honeypot, 5 submissions per 10 minutes per client per instance, a 20 KB body cap, and header-safe subjects.
- **Verification:** the browser test asserts there are **zero CSP violations** across all routes and flows.

### Workstream 10 — Maintainability and operations

- `MARKETS` in `src/lib/markets/registry.ts` is the single market list. A compile-time check ties it to the `Market` union, and the schema, storage, route validation and copy modal all use it.
- Reads no longer write. A save re-reads once and writes once.
- **Mirror workflow:** confirmed it force-pushed `augustosc-eu/globalcv` to itself. It is now skipped in this repo (guarded by repository and `vars.MIRROR_SOURCE_REPO`), the action is SHA-pinned, GitHub's published SSH host key replaces `ssh-keyscan`, and pushes are fast-forward only (`--force` removed).
- **Docs:** README (Node 22.13+, commands, storage, sharing, PDF, jobs), SECURITY.md (supported versions, data handling, scope) and `.env.example` (`ENABLE_DEMO_JOBS`).
- **Node version:** `.nvmrc` = 22 and `engines.node >= 22.13.0`, as required by pdfjs-dist 6.
- **Health check:** `GET /api/health` liveness endpoint.
- **Accessibility:** wizard step fields are now labelled (implicit `<label>` wrapping in `Field`, plus 28 `aria-label`s), dialogs have `role="dialog"`/`alertdialog` with labelled titles, and errors use `role="alert"`.

## 3. Audit finding status

| ID | Finding | Status | Evidence |
|---|---|---|---|
| P0-1 | Next.js critical advisory set | ✅ Resolved | next 16.4.3. `npm audit --omit=dev`: 0 |
| P0-2 | Silent CV data loss | ✅ Resolved | `tests/unit/storage.test.ts`, `store.test.ts`, E2E "Not saved" |
| P1-1 | Clear did not erase | ✅ Resolved | `store.test.ts`, E2E delete and erase-all with reload |
| P1-2 | Share links leak PII to the server | ✅ Resolved | `share.test.ts`. E2E asserts no request carries the payload |
| P1-3 | Share import into the wrong market | ✅ Resolved | `share.test.ts`, `store.test.ts`, E2E |
| P1-4 | Vulnerable pdfjs-dist | ✅ Resolved | pdfjs 6.4.299 and worker sync test. `hardening.test.ts`, E2E import |
| P1-5 | Jobs fan-out and no rate limit | ✅ Resolved (per-instance limiter, documented) | `jobs.test.ts` |
| P1-6 | No tests or CI | ✅ Resolved (branch protection not verified) | `ci.yml`, 98 tests, 13 E2E checks |
| P2-1 | Weak CSP | 🟡 Partly | `unsafe-eval` gone in production and `img-src` restricted. `unsafe-inline` remains (justified in Security fixes) |
| P2-2 | Unvalidated external hrefs | ✅ Resolved | `safeHttpUrl` tests |
| P2-3 | post-job abuse and CSRF | ✅ Resolved | `postJobRoute.test.ts` |
| P2-4 | Parser mis-structuring | ✅ Resolved for the reported cases, plus new layouts | `parser.test.ts` |
| P2-5 | JSON restore unsafe | ✅ Resolved | `hardening.test.ts` (backup import), `store.test.ts` |
| P2-6 | Silent upstream failures and demo job in production | ✅ Resolved | `jobs.test.ts`, E2E |
| P2-7 | Salary sort | ✅ Resolved | `jobs.test.ts` |
| P2-8 | Mirror workflow | ✅ Resolved (guarded) | `.github/workflows/mirror.yml` |
| P2-9 | Accessibility labels | 🟡 Partly | Wizard and dialog labels fixed. No axe audit run, and drag-and-drop keyboard alternatives not added |
| P2-10 | Storage writes and multi-tab | ✅ Resolved | `storage.test.ts` multi-tab suite |
| P2-11 | Large duplicated modules | 🟡 Partly | Jobs split, registry, dates. `CVPDFDocument.tsx` and the duplicated HTML/PDF templates are untouched (rewrite risk) |
| P2-12 | Job-provider terms | ⛔ Not resolvable in code | Needs the owner to review each provider's terms (see Remaining risks) |
| P2-13 | Observability | 🟡 Partly | `/api/health`, per-source status and logs. No error monitoring service (would need a vendor and a privacy review) |
| P3-1 | Docs drift | ✅ Resolved | README, SECURITY.md |
| P3-2 | Committed local tool configs | ⏸ Unchanged | Untracking them would delete the owner's local files on pull. Recommend the owner removes them manually |
| P3-3 | `page=abc` → `null` | ✅ Resolved | `jobs.test.ts`, E2E |
| P3-4 | Dependency hygiene | ✅ Resolved (security majors only) | 13 unused packages removed |
| P3-5 | Header polish | ✅ Resolved | E2E header check |
| P3-6 | Share warning and PDF limits | ✅ Resolved | Privacy dialog on every share, 10 MB / 15-page limits |
| P3-7 | Package naming | ✅ Package renamed to `globalcv` | Storage keys intentionally unchanged |

## 4. Migration implications

- **Storage format.** Keys are unchanged (`cv_maker_v2_*`) and existing data loads as before. Saving adds a `revision` field to each draft entry and moves photos into `cv_maker_photo_*` keys. No user action is needed.
- **Rollback caveat.** If you roll back to the previous release after users have saved with this version:
  - photos saved by the new version show as missing in the old one (the data is still in storage and returns on re-upgrade);
  - the old code's destructive read path would also come back.
  
  Prefer rolling forward.
- **Share links.** Old `?share=` links still work, without their sensitive fields. Links created by this version (`#cv=2.`) do not open in the old version.
- **Behaviour changes users may notice:**
  - Clear is now "Delete this CV" and actually deletes;
  - shared links and restored backups open as new drafts;
  - year-only dates stay year-only;
  - the jobs board no longer shows the demo listing and shows a notice when sources are down;
  - search results come from each provider's latest feed, filtered locally, so provider-side relevance search is no longer used.
- **Environment.** Node 22.13 or newer is required. The new optional variable is `ENABLE_DEMO_JOBS`.

## 5. Recovery and troubleshooting

| Symptom | What it means | What to do |
|---|---|---|
| Header shows **Not saved**, red banner "Browser storage is full" | A write failed (quota). Nothing was lost; your edits are still in the page | Click **Download backup**. Delete old drafts or remove a photo, then **Retry save** |
| Red banner "storage is unavailable" | Private mode or blocked storage | Download a backup. Use a normal window |
| "This draft was changed in another tab" | Two tabs edited the same draft | Choose *Load the other tab's version*, *Save mine as a new draft* (keeps both) or *Overwrite with mine* |
| Amber banner "Some saved data could not be read as-is" | A draft was repaired automatically, or unreadable data was preserved | Click **Download recovery file**. The JSON contains every original entry, including `cv_maker_quarantine_*` copies. To restore, use *Tools → Restore JSON* with that file (merges, never overwrites) |
| Share link says "incomplete or damaged" | The link was truncated by a mail or chat client | Ask for a JSON file (*Share → Download JSON instead*) |
| PDF import error | The file is too large, encrypted, not a PDF, longer than 15 pages, or slow to parse | Paste the text instead |
| `/jobs` shows "Some job sources are temporarily unavailable" | Provider down or rate-limited | Results from other providers are still shown. Check `GET /api/jobs` → `sources[]` |
| CI fails "pdf.worker.min.mjs is out of sync" | pdfjs-dist was upgraded | `npm run sync:pdf-worker`, then commit |

## 6. Files

- **New:**
  - `src/lib/markets/registry.ts`
  - `src/lib/utils/safeUrl.ts`
  - `src/lib/utils/partialDate.ts`
  - `src/lib/cv/backupImport.ts`
  - `src/lib/storage/downloads.ts`
  - `src/lib/jobs/sources.ts`
  - `src/lib/jobs/aggregate.ts`
  - `src/lib/jobs/rateLimit.ts`
  - `src/lib/jobs/logoHosts.json`
  - `src/app/api/health/route.ts`
  - `src/components/shared/StorageStatusBanner.tsx`
  - `src/components/shared/SharedCVPrompt.tsx`
  - `eslint.config.mjs`
  - `.nvmrc`
  - `.github/workflows/ci.yml`
  - `tests/**` (7 unit/integration files, 1 E2E script, 4 parser fixtures)
  - `docs/remediation/*`
- **Substantially rewritten:**
  - `src/lib/storage/localStorage.ts`
  - `src/lib/sharing/shareUrl.ts`
  - `src/lib/pdf/extractPdfText.ts`
  - `src/app/api/jobs/route.ts`
  - `src/components/shared/ShareButton.tsx`
  - `src/components/shared/CrossTabSyncBanner.tsx`
  - `.github/workflows/mirror.yml`
- **Modified:**
  - `src/store/cvStore.ts`
  - `src/lib/cv/schema.ts`
  - `src/lib/parser/cvParser.ts`
  - `src/lib/utils/dateFormat.ts`
  - `src/lib/pdf/CVPDFDocument.tsx` (date formatting and types only)
  - 8 preview renderers (date formatting only)
  - `AppHeader.tsx`, `WizardShell.tsx`, `PasteImportModal.tsx`, `CopyToMarketModal.tsx`, `PrivacyBanner.tsx`
  - wizard steps (labels; PersonalInfo form re-sync)
  - `src/app/{jobs,applications,post-job,privacy}/page.tsx`
  - `src/app/[market]/layout.tsx`
  - `src/app/api/post-job/route.ts`
  - `src/lib/jobs/{internal,types}.ts`
  - `src/lib/markets/{index,ui}.ts`
  - `src/types/market.types.ts`
  - `next.config.mjs`, `package.json`, `package-lock.json`, `public/pdf.worker.min.mjs`
  - README, SECURITY.md, `.env.example`
  - `scripts/render-pdf-fixtures.tsx` (type only)
