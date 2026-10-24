# GlobalCV — Remediation Roadmap

*Derived from [GLOBALCV_AUDIT_REPORT.md](GLOBALCV_AUDIT_REPORT.md). Effort sizes: S ≤ ½ day, M ≤ 3 days, L ≤ 2 weeks, XL > 2 weeks.*

The ranking weighs risk reduction first, then user impact, effort, and architectural value. No item requires a rewrite.

---

## Phase 0 — Immediate fixes (days 1–2)

| Order | ID | Action | Effort | Validation |
|---|---|---|---|---|
| 1 | P0-1 | `npm i next@^16.4.3 eslint-config-next@^16.4.3`, then `npm audit fix` (non-breaking transitive fixes) | S | `npm audit` shows no critical or high for `next`. `npm run build` and `npm run verify:pdf` pass |
| 2 | P0-2 | Storage safety. (a) `readMarketIndex` must not write on read or drop drafts: move invalid entries or raw JSON to `cv_maker_quarantine_{market}_{ts}`. (b) `persistIndex` returns a boolean and `save()` sets a `saveError` state when it is false; `AppHeader` shows "Not saved — storage full". (c) Call `hasCorruptedDrafts()` and offer to download the quarantined data | M | New unit tests (see Test Gaps T1–T4). Manual check: fill storage, edit, and see the error state |
| 3 | P1-1 | `handleClear` deletes the current draft (`clearCV(market, cv.id)`) and then resets. Add "Erase all GlobalCV data on this device", which removes every `cv_maker_*` and `globalcv_*` key. Update the privacy policy and banner wording | S | Unit test: no draft with the old data remains. E2E test: no keys remain after "Erase all" |

## Phase 1 — Short-term improvements (sprint 1, about 2 weeks)

| Order | ID | Action | Effort | Validation |
|---|---|---|---|---|
| 4 | P1-3 | Share import: on `?share=` / `#share=`, ask the user, then `restoreCV({...shared, id: newId, market})` as a **new** draft. Remove the field-by-field merge in `WizardShell.tsx:62–85` | S | Round-trip test across all `CVData` fields. EU link on a fresh load gives `market==='eu'` |
| 5 | P1-2 | Move the share payload to the fragment (`#share=`), and keep reading legacy `?share=` once, then redirect. Default-exclude `idNumber`, `dateOfBirth`, `gender`, `maritalStatus`, `emergencyContact` and reference contacts, with an opt-in checkbox. Always show the privacy notice. Fix the privacy-policy "never logged" line | S–M | Unit test: payload has none of the excluded keys and the URL has no `?share` |
| 6 | P1-4 | Upgrade `pdfjs-dist` to ≥6.2.108 and replace `public/pdf.worker.min.mjs` with the matching build (ideally copied at build time, not committed by hand). Pass `isEvalSupported: false`, and cap at 10 MB and 15 pages | S–M | `npm audit` is clean. Fixture PDFs import correctly (Test Gaps T9) |
| 7 | P1-6 | Testing and CI foundation: add Vitest and `eslint.config.mjs`, and add `.github/workflows/ci.yml` (`npm ci` → `tsc` → `eslint` → `vitest` → `next build` → `verify:pdf` → `npm audit --omit=dev --audit-level=high`). Pin actions by SHA and set `permissions: contents: read` | M | CI is green and required on PRs |
| 8 | P1-5 | Jobs aggregator: fetch upstream feeds without `q` (cached per source) and filter `q` locally. Bound `q` to 100 characters. Add `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`. Add per-IP rate limiting (Vercel Firewall rule or an Upstash limiter) | M | Unit test: upstream URLs do not depend on `q`. Load test: N distinct `q` values give a constant upstream call count |
| 9 | P2-8 | Delete `mirror.yml` from the public repo, or guard it with `if: github.repository == '<private>'`. Pin checkout by SHA and use GitHub's published SSH host key | S | The workflow no longer runs, or no longer fails, on the public repo |
| 10 | P2-2 | `safeHttpUrl()` helper used in the jobs normalisers (server) and at every external `href` (`jobs/page.tsx:378`, `applications/page.tsx:219`, `ProjectsStep.tsx:120`) | S | Unit tests for `javascript:`, `data:`, relative and `https` inputs |
| 11 | P2-5 | JSON restore: check the market, confirm before overwriting, and show an error toast on invalid files | S | Component test |
| 12 | P2-6, P2-7, P3-3 | Jobs correctness: return `sources: {name, ok}`, show a UI notice when some sources fail, remove or gate the `Example Labs` entry, add numeric salary fields for sorting, and validate `page` | S | Unit tests on the route handler with mocked fetch |
| 13 | P2-3 | Post-job hardening, before it is ever enabled: require JSON content type and same-origin `Origin`, add a honeypot or Turnstile, add a per-IP limit | S | Route tests: `text/plain` gets 415 and a foreign origin gets 403 |
| 14 | P3-1, P3-2, P3-5 | Docs and hygiene: correct the README and SECURITY.md, add `engines`/`.nvmrc` (Node ≥20.9), set `poweredByHeader: false`, gitignore local MCP and settings files | S | Review |

## Phase 2 — Medium-term (sprints 2–3)

| ID | Action | Effort |
|---|---|---|
| P2-1 | Nonce-based CSP via Next `proxy`/headers (no `unsafe-eval` and no `unsafe-inline` for scripts in production). Restrict `img-src` to `'self' data: blob:` plus an allow-list of logo hosts, or proxy and cache logos through `/api/logo` | M |
| P2-4 | Parser quality: title/company separators, date-line entry boundaries, language lists, year-only dates kept as `YYYY`, and a warning for every dropped line. Build a fixture corpus of 20+ real-world CV shapes across EN, ES, PT and JA | M |
| P2-9 | Accessibility pass: `useId` label association, `aria-invalid`/`aria-describedby`, focus management in modals (Radix Dialog is already a dependency, so use it consistently), keyboard drag-and-drop alternatives. Add axe to E2E | M |
| P2-10 | Storage v3: one key per draft plus a small index, side-effect-free reads, `BroadcastChannel` change notifications with a `lastModified` conflict check, photos de-duplicated per market, and a quota meter | M–L |
| P2-13 | Observability: privacy-scrubbed client error reporting (opt-in, or one that strips all CV fields), structured server logs for the jobs aggregator per source, `GET /api/health`, uptime monitor | M |
| P2-12 | Document each job provider's terms and attribution requirements and implement what they require. Keep safe mode as the default | S |

## Phase 3 — Longer-term architectural changes (as the product grows)

| Theme | Change | Why | Effort |
|---|---|---|---|
| Single template source | Generate HTML preview and PDF from one layout description, or render the preview from the react-pdf output with `pdfjs` | Removes the 16 duplicated template implementations and visual drift | L–XL |
| Market registry | Derive every market list, route validation, schema enum and storage enumeration from `lib/markets/index.ts` | Adding a market currently needs edits in 5+ places | S–M |
| Modularise big files | Split `CVPDFDocument.tsx` per template, `api/jobs/route.ts` into a `sources/*` adapter per provider, and `cvStore.ts` into slices | Reviewability and testability | M |
| PDF in a Worker | Move `pdf().toBlob()` to a Web Worker (as the README already claims) | No UI freeze on large or JP documents | M |
| Jobs snapshot | Scheduled job (Vercel Cron) builds a normalised feed into KV or Blob storage, and `/api/jobs` serves from the snapshot | Predictable latency and cost, upstream-friendly | M |
| Optional encrypted sync | If cross-device persistence is ever added, do end-to-end encryption with the key held only in the client | Keeps the privacy promise | XL |

## Suggested first sprint (sequenced)

1. **Day 1:** P0-1 (Next upgrade + `npm audit fix`). Vitest scaffolding and ESLint config (start of P1-6).
2. **Days 2–3:** P0-2 storage safety, with tests T1–T4 written first.
3. **Day 4:** P1-1 Clear / Erase all, plus privacy-text corrections. P1-3 share import as a new draft.
4. **Day 5:** P1-2 share via fragment and sensitive-field exclusion, with tests.
5. **Days 6–7:** P1-4 pdfjs upgrade and limits. P2-2 URL validation. P2-5 restore checks.
6. **Days 8–9:** P1-5 aggregator caching and rate limit. P2-6/P2-7/P3-3 jobs correctness, with mocked-fetch tests.
7. **Day 10:** `ci.yml` required on PRs. Remove or guard the mirror workflow. Docs fixes. Re-run the audit commands to confirm.

**Exit criteria:** `npm audit --omit=dev` shows no high or critical findings, CI is green and required, every P0 and P1 item is closed with tests, and the privacy policy matches the code's behaviour.
