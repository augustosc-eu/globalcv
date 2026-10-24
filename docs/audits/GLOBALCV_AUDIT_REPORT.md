# GlobalCV — Technical, Security & Product Audit Report

*Audit date: 2026-10-24 · Commit: `9dbaf3f` · Scope: entire repository · Auditor: Claude Code (static review plus local execution)*

Companion documents: [Executive summary](GLOBALCV_EXECUTIVE_SUMMARY.md) · [Remediation roadmap](GLOBALCV_REMEDIATION_ROADMAP.md) · [Architecture](GLOBALCV_ARCHITECTURE.md) · [Test gaps](GLOBALCV_TEST_GAPS.md)

---

## 1. Methodology

1. **Discovery.** I read every config file, both API routes, the storage, share, schema and store modules, the import/parse/PDF paths and the job pages. I used targeted searches for risky sinks (`href`, `dangerouslySetInnerHTML`, `eval`, `JSON.parse`, `localStorage`, `fetch`).
2. **Execution.** All commands ran on Node 22.22 / npm 10.9 in an isolated container:
   - `npm ci`, `npx tsc --noEmit`, `npm run build`, `npm run verify:pdf`, `npx eslint src`, `npm audit`, `npm outdated`.
   - `next start` with `curl` probes of `/api/jobs`, `/api/post-job` and the response headers.
3. **Behavioural probes.** I wrote throwaway `tsx` scripts, kept outside the repo, that drive the real store, storage, share and parser modules against an in-memory `localStorage`. Findings marked **Confirmed (reproduced)** were observed this way.
4. **Rules.** I modified no application code, deployed nothing and made no external writes. Upstream job APIs could not be reached from the sandbox, so live aggregator behaviour is **not verified**.

Confidence levels:

- **Confirmed**: reproduced, or certain from the code.
- **Likely**: strong static evidence, not reproduced.
- **Needs verification**: depends on facts outside the repo.

## 2. System inventory (summary)

See [GLOBALCV_ARCHITECTURE.md](GLOBALCV_ARCHITECTURE.md) for diagrams.

- **Type:** Next.js 16 App Router app. CV editing is fully client-side and data lives in localStorage. There are two server routes: `GET /api/jobs` (aggregator) and `POST /api/post-job` (Resend email, off by default).
- **Personal data handled:** name, contact details, address, photo, date of birth, nationality, marital status, gender, ID number, emergency contact, references' contact details, and employment and education history. Several of these are GDPR Art. 9-adjacent or high-sensitivity, in the JP and LATAM markets especially.
- **Code size:** 135 tracked files, about 17.2k lines in `src/` and `scripts/`.
- **Tests:** none. The only verification script is `verify:pdf`, which renders 64 PDF fixtures with no assertions.
- **CI/CD:** a single mirror workflow with no build, lint or test gate. Deployment is assumed to be Vercel Git integration.

## 3. Validation results

| Command | Result | Notes |
|---|---|---|
| `npm ci` | ✅ pass | Reports 18 vulnerabilities |
| `npx tsc --noEmit` (`npm run lint`) | ✅ pass, 0 errors | `strict: true` is on |
| `npm run build` | ✅ pass | 9 static routes, 3 dynamic. Warns that browserslist data is 7 months old |
| `npm run verify:pdf` | ✅ pass | 64 PDFs written to `tmp/pdf-fixtures` (gitignored). Checks only that rendering completes |
| `npx eslint src` | ❌ fails | No `eslint.config.*` exists, so ESLint 10 refuses to run. The README says `npm run lint` is ESLint; it is actually `tsc` |
| Unit/integration/E2E tests | ⚠️ none exist | No test runner installed |
| `npm audit` | ❌ 18 vulns: 1 critical, 9 high, 6 moderate, 2 low | Details in §7 |
| `GET /api/jobs` (local) | ⚠️ 200, but returns only the hard-coded "Example Labs" job | Upstreams unreachable from the sandbox, and the failure was silent (see F-P2-6) |
| `GET /api/jobs?page=abc` | ❌ `{"jobs":[],"page":null}` | `parseInt` gives NaN, which is not handled (F-P3-3) |
| `POST /api/post-job` | ✅ 404 "disabled" | Feature flag works |
| Response headers | ✅ CSP, HSTS, XFO, nosniff, Referrer-Policy, Permissions-Policy present | `X-Powered-By: Next.js` is still sent. CSP is weak (F-P2-1) |

**Environment limitations:** there was no outbound access to job APIs or Resend, and no browser-based E2E or Lighthouse run. Bundle sizes were read from `.next/static`, not measured in a browser.

## 4. Findings

Priority definitions follow the brief: **P0** critical, **P1** high, **P2** medium, **P3** low. The roadmap orders them by risk reduction against effort.

### P0 — Critical

#### P0-1 · Next.js 16.2.0 has a critical-rated advisory set; upgrade within the 16.x line
- **Category:** Security / dependencies · **Confidence:** Confirmed vulnerable version. Applicability of individual advisories was assessed below.
- **Evidence:** `package.json` (`"next": "^16.2.0"`) and the lockfile resolve to 16.2.0. `npm audit` flags `next 9.3.4-canary.0 – 16.4.0` as **critical**, with roughly 35 GHSA advisories. A non-breaking fix exists (16.4.3).
- **Applicability:**
  - The RCE advisories need next/image optimisation of AVIF/SVG, `next/og`, `use cache`, or Windows hosting. None of these are used (`next/image`, `middleware`/`proxy`, server actions and `next/og` are all absent).
  - **Applicable:** the App Router / React Server Components DoS advisories (GHSA-q4gf-8mx6-v5v3, GHSA-8h8q-6873-q5fj) and the RSC cache-poisoning advisories (GHSA-wfc6-r584-vfw7, GHSA-vfv6-92ff-j949). Every page here is App Router.
- **Impact:** the internet-facing app can be taken down or have cached responses poisoned.
- **Recommendation:** `npm i next@^16.4.3 eslint-config-next@^16.4.3`, then rebuild and smoke-test. Add a CI `npm audit --omit=dev --audit-level=high` gate.
- **Effort:** S · **Validation:** `npm audit` shows no `next` entry, and the build and the PDF fixtures still pass.

#### P0-2 · Silent, permanent loss of saved CVs in the storage layer
- **Category:** Data integrity · **Confidence:** Confirmed (reproduced)
- **Evidence:** `src/lib/storage/localStorage.ts`
  - **L103–112:** every read validates each draft with `parseCVData`. Drafts that fail are skipped, and the trimmed index is written back by `persistIndex`. Probe: a GB draft with a language entry missing `proficiency` came back from `loadCV('gb')` as `null`, and the stored draft count went from 1 to 0.
  - **L114–121:** if the stored JSON fails to parse, the catch block overwrites the key with an empty index. Probe: the raw value `{not json` was replaced by `{"drafts":{},"corruptedAt":…}`, so the original bytes are gone. `hasCorruptedDrafts()` exists but nothing calls it.
  - **L125–131 with `src/store/cvStore.ts` L632–654:** `persistIndex` catches `QuotaExceededError` and only logs it. `save()` then sets `isDirty=false` and `lastSaved=now`. Probe: with `setItem` throwing, the UI state reported "saved". Base64 photos (up to 800 px JPEG) are stored inside every draft, which makes hitting the ~5 MB quota realistic.
- **Impact:**
  - Users lose CVs without warning after any schema tightening, a partial write, a manual edit, or a quota overflow, and the UI tells them the work was saved.
  - This product has no server copy, so lost data cannot be recovered.
- **Recommendation:**
  - Never delete on read. Move invalid or unparseable payloads to a `…_quarantine_{ts}` key, then surface `hasCorruptedDrafts` in the UI with "download raw backup".
  - Make `persistIndex` return or throw success, and have `save()` show an error state when the write fails.
  - Use `safeParse` with a lenient "repair" schema (defaults for missing enums) before rejecting a draft.
  - Store photos once per market instead of in every draft, or warn as usage approaches the quota.
- **Effort:** M · **Validation:** unit tests for (a) an invalid draft being preserved in quarantine, (b) corrupt JSON being preserved, (c) a quota error showing "not saved".

### P1 — High

#### P1-1 · The "Clear" control does not erase data, contrary to the privacy policy and banner
- **Category:** Privacy / GDPR · **Confidence:** Confirmed (reproduced)
- **Evidence:**
  - `AppHeader.tsx:105–108`: `handleClear()` calls `resetCV(market)`.
  - `cvStore.ts:208–217`: `resetCV` creates a **new** empty CV with a new id and marks it dirty, and autosave then adds it as a second draft.
  - Probe: after Clear, the index held `['Alice', '(empty)']`.
  - Other markets, `cv_maker_applications`, `globalcv_readiness_history_*` and the preferences are never touched.
  - The privacy policy (`privacy/page.tsx:101,106,205`) and `PrivacyBanner.tsx:38` tell users to press "Clear Data" before leaving a shared computer, and describe it as the right-to-erasure mechanism: "permanently delete all CV data from your browser".
- **Impact:**
  - Personal data, including DOB, ID number and photo, stays on shared or public computers after the user believes it was erased.
  - The published privacy statement is materially inaccurate.
- **Recommendation:**
  - Make Clear delete the current draft (`clearCV(market, cv.id)`) before resetting.
  - Add a separate "Erase all GlobalCV data on this device" action that removes every `cv_maker_*` / `globalcv_*` key.
  - Align the policy text with the real behaviour.
- **Effort:** S · **Validation:** a unit test asserting that no draft containing the old data remains after Clear, and an E2E test asserting localStorage holds no `cv_maker_` keys after "Erase all".

#### P1-2 · Share links send the full CV, including sensitive identifiers, to the server in the query string
- **Category:** Privacy / sensitive-data exposure · **Confidence:** Confirmed (code)
- **Evidence:**
  - `src/lib/sharing/shareUrl.ts:9–22`: only `photo` is removed. `dateOfBirth`, `nationality`, `maritalStatus`, `gender`, `idNumber`, `emergencyContact`, references' emails and phones, and the address are all encoded. The data goes in `?share=` (L21), which browsers send to the origin on every open.
  - `robots.txt` asks crawlers not to index these URLs. That is advisory only.
  - `privacy/page.tsx:162` says share links are "never stored or logged". Hosting access logs normally record the full request URL.
  - The privacy warning in `ShareButton.tsx:16` appears only when the URL is longer than 2,000 characters.
- **Impact:**
  - High-sensitivity personal data, including third parties' data (references, emergency contact), ends up in hosting logs, browser history, chat-app link previews and any proxy logs.
  - LZ compression is not encryption.
- **Recommendation:**
  - Move the payload to the URL **fragment** (`#share=`), which is never sent to the server.
  - Exclude `idNumber`, `dateOfBirth`, `gender`, `maritalStatus`, `emergencyContact` and reference contact details by default, with an explicit opt-in.
  - Always show the privacy notice, not only for long URLs.
  - Consider client-side encryption with the key in the fragment.
  - Correct the privacy-policy line.
- **Effort:** S–M · **Validation:** a unit test that the encoded payload has none of the excluded keys, and a check that the URL contains no `?share=`.

#### P1-3 · Opening a share link merges it into the wrong CV and market, and drops fields
- **Category:** Functional correctness / data integrity · **Confidence:** Confirmed (reproduced)
- **Evidence:**
  - `WizardShell.tsx:62–85`: when a share param is present, `initializeMarket` is **not** called. Instead, `setPersonalInfo`, `add*` and similar are applied to whatever CV is already in the store.
  - On a fresh page load that CV is `createEmptyCVData('us')` (`cvStore.ts:180`).
  - Probe: importing an EU share link left the store with `cv.market === 'us'`, and the result was autosaved under `cv_maker_v2_us`.
  - `projects`, `remoteWorkProfile`, `targetRole/Company/jobDescriptionNotes`, `hiddenSections`, `fontFamily` and `qrCodeEnabled` are never applied. Within the same SPA session, shared entries are *appended* to the user's own active draft.
- **Impact:**
  - Recipients see a CV whose market, page size and template defaults do not match the route.
  - The shared CV lands in the wrong market's storage and can pollute the recipient's own draft.
  - The sender's data loses its projects and targeting.
- **Recommendation:**
  - Replace the field-by-field merge with `restoreCV({ ...shared, id: newId(), market }, { setActive: true })`, after an explicit "Open shared CV as new draft?" confirmation.
  - Never merge into an existing draft.
- **Effort:** S · **Validation:** a unit or E2E test that an EU share link opened on a fresh load gives `cv.market==='eu'`, an `eu` storage key, and all fields round-tripped.

#### P1-4 · PDF import uses a pdfjs-dist version with a "JavaScript execution on opening a malicious PDF" advisory
- **Category:** Security / file upload · **Confidence:** Vulnerable version confirmed. Exploitability in this usage **needs verification**.
- **Evidence:**
  - `package.json` pins `pdfjs-dist ^5.7.284` (installed 5.7.284). `npm audit`: GHSA-hq66-cqwq-w95j (CWE-79), range `>=5.6.83 <6.2.108`.
  - `src/lib/pdf/extractPdfText.ts:7` calls `getDocument({ data })` on arbitrary user-chosen files, with no size, page-count or `isEvalSupported: false` hardening.
  - The CSP allows `'unsafe-eval' 'unsafe-inline'` and `img-src https:` (`next.config.mjs:18,22`), so it would neither block the script nor block exfiltration through image beacons.
- **Exploitability:** an attacker has to persuade the user to import a crafted PDF, for example "use my CV template". The extraction path calls only `getTextContent`. Whether the advisory's trigger is reachable without rendering is not established. If it is, script runs in the GlobalCV origin and can read every stored CV.
- **Recommendation:**
  - Upgrade to `pdfjs-dist@>=6.2.108`, replacing `public/pdf.worker.min.mjs` with the matching worker.
  - Pass `isEvalSupported: false` and set limits (for example 10 MB / 10 pages).
  - Tighten the CSP (F-P2-1).
- **Effort:** S–M · **Validation:** `npm audit` is clean for pdfjs, and an import smoke test against fixture PDFs passes.

#### P1-5 · `/api/jobs` is an unauthenticated, uncached fan-out with no rate limiting
- **Category:** Security (abuse/DoS) / reliability / cost · **Confidence:** Likely (static). Not load-tested.
- **Evidence:**
  - `src/app/api/jobs/route.ts:808–819`: one request can trigger up to ~20 upstream fetches: Remotive, Jobicy, RemoteOK, plus Himalayas ×6 LATAM (L559), ×10 EMEA (L614) and ×1 JP. Each has an 8 s timeout (L6).
  - The free-text `q` is forwarded to Remotive and Himalayas (L351, L565, L620), so every distinct `q` makes new URLs and bypasses the `revalidate: 300` data cache.
  - There is no rate limiting, auth, input length bound or concurrency cap.
- **Impact:**
  - An attacker can drive heavy outbound traffic from the deployment's IPs. That costs serverless function time and risks the app's IPs being throttled or banned by upstream providers, which would break the jobs board for every user.
  - Worst-case latency is about 8 s per request.
- **Recommendation:**
  - Fetch upstream feeds **without** `q`, so they cache per source, and filter `q` locally. The route already does that at L844.
  - Bound `q` (for example 100 characters).
  - Add per-IP rate limiting (Vercel WAF / Upstash) and `Cache-Control: s-maxage=300, stale-while-revalidate`.
  - Consider a cron-built snapshot.
- **Effort:** M · **Validation:** a unit test that upstream URLs are independent of `q`, and a load test showing a bounded upstream request count.

#### P1-6 · No automated tests and no CI quality gate
- **Category:** Testing / CI · **Confidence:** Confirmed
- **Evidence:** there are no test files or test runner. The only workflow is `.github/workflows/mirror.yml`. ESLint is installed but has no config, so it cannot run.
- **Impact:**
  - The defects above (P0-2, P1-1, P1-3) are exactly the kind that unit tests on the pure modules catch.
  - Regressions in 16 templates and 8 markets ship unchecked.
- **Recommendation:**
  - Add Vitest with tests for the storage, share, schema, parser, store and jobs normalisers. See [GLOBALCV_TEST_GAPS.md](GLOBALCV_TEST_GAPS.md).
  - Add `eslint.config.mjs` using `eslint-config-next`.
  - Add a `ci.yml` running `npm ci`, typecheck, lint, test, build, `verify:pdf` and `npm audit --audit-level=high`.
- **Effort:** M · **Validation:** CI is required on PRs.

### P2 — Medium

| ID | Category | Finding | Evidence | Confidence | Recommendation | Effort |
|---|---|---|---|---|---|---|
| P2-1 | Security | The CSP allows `'unsafe-eval' 'unsafe-inline'` scripts in production. The comment says this is "dev only", but it is unconditional. `img-src https:` opens an exfiltration channel to any host | `next.config.mjs:18,22` | Confirmed | Use nonce-based CSP (or at least drop `unsafe-eval` in prod). Restrict `img-src` to known logo hosts, or proxy logos. Set `poweredByHeader: false` | M |
| P2-2 | Security | External URLs are rendered as `href` without scheme validation: `job.url` comes from upstream APIs, `entry.jobUrl` from localStorage, `project.url` from user input or JSON restore. React 19 blocks `javascript:` URLs (verified in `react-dom` production build), so XSS is mitigated, but `data:` and other schemes are not filtered | `jobs/page.tsx:378`, `applications/page.tsx:219`, `ProjectsStep.tsx:120`, `api/jobs/route.ts:374,456,494,595` | Confirmed (mitigated) | Add a `safeHttpUrl()` helper (allow only `http:`/`https:`). Apply it server-side in normalisers and client-side at render | S |
| P2-3 | Security | `/api/post-job` has no rate limit or CAPTCHA, and `request.json()` parses any content type, so a cross-site `text/plain` form can submit it (CSRF-style spam). It is disabled by default | `api/post-job/route.ts:35` | Likely | Require `content-type: application/json` and a same-origin `Origin`. Add a honeypot or Turnstile and a per-IP limit before enabling | S |
| P2-4 | Product / correctness | The paste-import parser mis-structures a standard UK CV. "Senior Engineer — Acme Ltd" stays as the title with an empty company. The next job's header leaks into the previous description. A bullet becomes the second job's company. "German (B2)" is dropped with no warning. A year-only `2012` becomes `2012-01` | `lib/parser/cvParser.ts` (probe output in §5) | Confirmed (reproduced) | Split title/company on `—`, `–`, `|`, ` at `, `,`. Treat date lines as entry boundaries. Parse comma or newline language lists. Keep year-only dates as `YYYY`. Add fixture tests | M |
| P2-5 | Data integrity | JSON restore accepts a backup from any market while on another market's route, overwrites a same-id draft, and fails silently on invalid files | `AppHeader.tsx:124–140` | Confirmed (code) | Check `data.market === market` (or offer to switch). Show an error toast for invalid files. Confirm before overwriting | S |
| P2-6 | Reliability / product | Upstream failures are swallowed (`catch { return [] }` in every fetcher), so users see an empty or near-empty board with no error. The hard-coded "Example Labs" job (`example.com`) is served in production | `api/jobs/route.ts:379–381,416–418,…`, `lib/jobs/internal.ts` | Confirmed (reproduced) | Return per-source status. Show a "some sources unavailable" notice. Log failures. Remove the example job or gate it on `NODE_ENV` | S |
| P2-7 | Correctness | "Sort by salary" parses only `$NNk`. Himalayas salaries (`$120,000 - $150,000`), non-USD values and the internal `€70k` all sort as 0 | `api/jobs/route.ts:148–159` vs `870–877` | Confirmed (code) | Store numeric `salaryMin`/`salaryMax`/`currency` on `Job` and sort on those | S |
| P2-8 | CI/CD / supply chain | The mirror workflow force-pushes `main` to `augustosc-eu/globalcv`, which is the repo it lives in, using an SSH deploy key. `actions/checkout@v4` is not SHA-pinned. `ssh-keyscan` trusts on first use. There is no `permissions:` block. In this repo it either fails on every push (no secret) or force-pushes to itself | `.github/workflows/mirror.yml` | Confirmed (code) | Remove it from the public repo, or guard with `if: github.repository == '<private-repo>'`. Pin the action SHA. Hard-code GitHub's published host key. Add `permissions: contents: read` | S |
| P2-9 | Accessibility | Form labels are not programmatically associated with inputs: 56 `<label>` elements, 0 `htmlFor`, and most labels are siblings rather than wrappers. Only 10 `aria-*`/`role` attributes app-wide. Inline errors are not linked with `aria-describedby` | e.g. `PersonalInfoStep.tsx:74–108` | Likely | Use `useId()` with `htmlFor`/`id`, `aria-invalid`, `aria-describedby`. Run axe in E2E | M |
| P2-10 | Performance / concurrency | Each autosave re-parses, zod-validates and rewrites the whole market index twice (read path `persistIndex` L112, then the save). Two tabs editing the same market overwrite each other's index (last writer wins), and only a banner mitigates this | `localStorage.ts:84–113,161–179` | Confirmed (code) | Make reads side-effect free. Store one key per draft plus a small index. Use `storage` events or `BroadcastChannel` with a version check | M |
| P2-11 | Maintainability | Large modules with duplication: `CVPDFDocument.tsx` (1,232 lines, every layout), `api/jobs/route.ts` (891 lines, 3 near-identical Himalayas fetchers), `cvStore.ts` (822 lines). Each template is implemented twice (HTML and PDF). The market list is hard-coded in 5 files | see Architecture §7 | Confirmed | Split per template and per source. Derive market lists from `MARKETS` in `lib/markets/index.ts`. Use a single `fetchHimalayas(countries, label)` | M |
| P2-12 | Compliance | Third-party job-feed terms (attribution, request frequency, commercial use) are not documented. Safe mode exists, but Remotive, RemoteOK, Jobicy and Himalayas are on by default | `api/jobs/route.ts:789–798` | Needs verification | Record each provider's ToS and required attribution in `docs/`, and add a link-back where required | S |
| P2-13 | Observability | No error monitoring, structured logging, health endpoint or uptime checks. Client PDF failures only reach `console.error` | `usePDFExport.ts:209` | Confirmed | Add a privacy-preserving error reporter (self-hosted Sentry or similar with PII scrubbing), a `GET /api/health`, and Vercel log drains | M |

### P3 — Low

| ID | Category | Finding | Evidence | Recommendation | Effort |
|---|---|---|---|---|---|
| P3-1 | Docs drift | The README says `npm run lint` is ESLint (it is `tsc`), "Node.js 18+" (Next 16 needs ≥20.9), and that PDF runs "in a Web Worker" (it runs on the main thread, `usePDFExport.ts:167–197`). SECURITY.md lists "1.x supported" while the package is 0.1.0, and says "No user data is ever transmitted to a server", which the jobs and post-job features contradict | README, SECURITY.md | Correct the docs. Add `"engines": {"node": ">=20.9"}` and `.nvmrc` | S |
| P3-2 | Hygiene | Developer-local files are committed: `.claude/settings.local.json`, and `.vscode/mcp.json` / `.cursor/mcp.json` containing absolute personal paths (`/Users/…`, `/Volumes/…`). `AGENTS.md` and `.claude/CLAUDE.md` mandate an editor-specific tool | repo root | Gitignore `*.local.json` and the MCP configs, or replace paths with placeholders | S |
| P3-3 | Input validation | `page` is not validated: `?page=abc` returns `page:null` and an empty list | `api/jobs/route.ts:787` (reproduced) | `Number.isFinite` check, clamped to `totalPages` | S |
| P3-4 | Dependencies | `@types/qrcode` is in `dependencies`. Several majors are behind (zod 3 → 4, zustand 4 → 5, tailwind 3 → 4, pdfjs 5 → 6, lucide 0.x → 1.x). Transitive dev advisories exist (brace-expansion, picomatch, postcss, browserslist, nanoid, esbuild); `npm audit fix` resolves them without breaking changes | `package.json`, `npm outdated` | Run `npm audit fix` (non-breaking). Plan majors deliberately. Move `@types/*` to dev | S |
| P3-5 | Security headers | `X-Powered-By: Next.js` is exposed. HSTS has no `preload`. `X-Frame-Options: SAMEORIGIN` conflicts with `frame-ancestors 'none'` (harmless) | `next.config.mjs` | `poweredByHeader: false`. Align XFO to `DENY` | S |
| P3-6 | UX | The share privacy warning appears only for URLs over 2,000 characters. PDF import has no size or page limit, so a large PDF freezes the tab | `ShareButton.tsx:16`, `extractPdfText.ts` | Always warn. Cap the file size | S |
| P3-7 | Naming | The package name is `cv-maker`, the storage prefix is `cv_maker_`, and the brand is GlobalCV | `package.json` | Cosmetic. Do not rename storage keys without a migration | S |

## 5. Supporting evidence (behavioural probes)

The probes ran the real modules against a fake `localStorage`. The scripts are not committed.

```
store cv.market after share import on /eu: us | projects kept: 0 | targetRole kept: undefined
localStorage keys: [ 'cv_maker_v2_us' ]                                  ← P1-3
loadCV gb -> null | stored drafts now: 0                                  ← P0-2 (invalid draft deleted)
br raw after load: {"version":2,"activeDraftId":null,"drafts":{},"corruptedAt":"…"}   ← P0-2 (corrupt JSON overwritten)
after quota failure: isDirty= false lastSaved set= true                   ← P0-2 (false "saved")
drafts after Clear: [ 'Alice', '(empty)' ]                                ← P1-1
```

Parser probe (P2-4). Input: a standard 2-job UK CV. Output excerpt:

```
workExperience[0]: title "Senior Engineer — Acme Ltd", company "", description "…\nEngineer, Beta GmbH"
workExperience[1]: company "Led migration to TypeScript, cutting bugs by 30%", title "Engineer, Beta GmbH"
education[0]: startDate "2012-01", endDate "2016-01"   (source had years only)
languages: [English]   (German (B2) dropped)   warnings: []
```

## 6. Security review by OWASP area

| Area | Assessment |
|---|---|
| Authentication / session | Not applicable. There are no accounts and no cookies are set |
| Authorization / IDOR | Not applicable. There are no server-side user objects |
| XSS | No `dangerouslySetInnerHTML` or `innerHTML`. React escapes text. `javascript:` hrefs are blocked by React 19. Remaining risk: the pdfjs advisory (P1-4) and the permissive CSP (P2-1) |
| Injection (SQL/NoSQL/command) | Not applicable. There is no database or shell. Upstream query params are built with `URLSearchParams` |
| CSRF | Only `/api/post-job` mutates state (by sending an email). `text/plain` is accepted (P2-3) |
| SSRF | None found. All upstream URLs are constants with encoded params. Logo URLs are only passed to the client |
| Rate limiting | None on either API (P1-5, P2-3) |
| Secrets | No secrets found. A regex scan of full git history for Resend/AWS/GitHub tokens and private keys returned 0 hits, and only `.env.example` was ever committed. `.env*` is gitignored. `RESEND_API_KEY` is read server-side only. A public contact email is hard-coded (intentional) |
| File upload | Photos: MIME check, 8 MB limit, canvas re-encode (good). PDF: no limits, vulnerable pdfjs (P1-4). JSON: zod-validated, no market check (P2-5) |
| CORS | Next defaults apply (no `Access-Control-Allow-Origin`). `/api/jobs` is readable cross-origin only through no-cors requests. Acceptable |
| Error handling / disclosure | Generic error messages are returned, no stack traces. But failures are *too* silent (P0-2, P2-6) |
| Logging / PII | No server logging of PII. Share URLs end up in host logs (P1-2) |
| Third-party risk | Upstream job data is rendered as text (safe). Logos are loaded from arbitrary https hosts, which leaks visitor IPs; this is disclosed in the privacy policy |

### GDPR-relevant observations
- **Data minimisation:** the market configs correctly hide DOB, photo and marital status for US, GB and AU. The share link ignores those settings and includes every field (P1-2).
- **Erasure:** broken (P1-1).
- **Export / portability:** JSON backup exists (good). It is per draft; there is no "export all".
- **Retention:** indefinite in localStorage, with no expiry. Acceptable for a local tool if users are informed. Post-job emails sit in an inbox with no stated retention period.
- **Consent / special categories:** JP and LATAM collect gender, marital status and ID number. There is local-only processing, but no on-form notice explaining why each sensitive field is optional or required.
- **Processor disclosure:** Vercel and Resend are named in the privacy policy (good).

## 7. Dependency & supply-chain audit

- **Direct and vulnerable:**
  - `next` (critical, P0-1).
  - `pdfjs-dist` (high, P1-4; needs a major bump).
  - `postcss` (high, build-time only; source-map path traversal).
  - `zod` (high: memory exhaustion on oversized constrained collections. The server uses zod only on the bounded post-job object, so the risk is low).
  - `resend` (moderate, through `svix` → `uuid`).
- **Transitive:** brace-expansion, picomatch, browserslist, nanoid, sharp (through next), source-map-js, @babel/core, esbuild, @humanfs/node, baseline-browser-mapping. All are fixable with `npm audit fix`.
- **Licenses:** I did not run a full license scan. All direct dependencies are well-known MIT, Apache-2.0 or ISC packages, and Noto Sans JP is OFL-1.1, which is compatible. The app license is MIT.
- **Actions:** `actions/checkout@v4` is unpinned (P2-8).
- **Install scripts:** no project `postinstall`. The lockfile is present and `npm ci` is reproducible.

## 8. Performance & scalability

| Item | Measured / inferred | Notes |
|---|---|---|
| Client JS | **Measured** (build output): 3.4 MB of chunks in total. The largest, 1.5 MB (`@react-pdf` + yoga), is **lazy** and loaded only on export. The `/[market]` page eagerly loads a 342 KB chunk; a 228 KB chunk is shared by all static pages | Acceptable. `optimizePackageImports` is on for lucide |
| Fonts | **Measured:** Noto Sans JP is 2 × 2.3 MB TTF, fetched only for JP PDF export | Subset or convert to WOFF2 for the preview if it is ever used there |
| PDF export | **Inferred:** runs on the main thread, so the UI freezes for multi-page or JP documents | Move to a Worker (as the README already claims) |
| Autosave | **Inferred:** O(drafts) parse, validate and write per save, plus deep-clone snapshots (`JSON.parse(JSON.stringify)`) including base64 photos | See P2-10 |
| `/api/jobs` | **Inferred:** up to ~20 upstream calls, an 8 s worst case, and no response caching headers | See P1-5 |
| Benchmarks | None exist in the repo. Lighthouse and E2E timing were not run (no browser session in scope) | — |

## 9. Production readiness

**Score: 46 / 100.** The executive summary has the full methodology.

| Dimension (weight) | Score | Rationale |
|---|---|---|
| Security hardening (20) | 11 | Small attack surface and good headers baseline; a critical framework advisory, pdfjs, a weak CSP, no rate limits |
| Data integrity & reliability (15) | 6 | Silent loss of drafts, false "saved" indicator, share-import corruption |
| Privacy & compliance (10) | 5 | Good intent and disclosure; erasure is broken and share links leak sensitive data |
| Testing & CI (15) | 2 | Typecheck and build only, run locally; no tests; lint broken |
| Observability & ops (10) | 2 | No monitoring, health check, runbooks or rollback docs |
| Deployment reproducibility (10) | 7 | Lockfile, deterministic build, zero-config Vercel; no Node pin, no staging docs |
| Performance (10) | 7 | Lazy PDF bundle, static pages; main-thread PDF, aggregator latency |
| Maintainability (10) | 6 | Strict TS, config-driven markets; large duplicated modules, two template stacks |

**Not assessable from the repo:** the actual Vercel project settings (preview protection, WAF, log retention), production traffic, real upstream API behaviour, and browser-level accessibility and performance.

## 10. Limitations

- No live upstream or Resend calls. Aggregator behaviour against real feeds is inferred.
- No browser E2E, Lighthouse or axe run. Accessibility findings come from static analysis.
- Advisory applicability for Next.js and pdfjs was judged from advisory titles, version ranges and code usage. Advisory bodies were not exercised with PoCs.
- No full license scan or SBOM was produced.
- The secret scan of git history used a small regex set, not a dedicated tool. Running gitleaks or trufflehog is still recommended.
