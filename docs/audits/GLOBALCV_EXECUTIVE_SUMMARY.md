# GlobalCV — Executive Summary

*Audit date: 2026-10-24 · Commit `9dbaf3f` · Full details: [GLOBALCV_AUDIT_REPORT.md](GLOBALCV_AUDIT_REPORT.md)*

## Overall assessment

GlobalCV is a privacy-first CV builder that runs in the browser (Next.js 16, React 19, Zustand, react-pdf). It supports 8 market-specific formats, has a jobs aggregator and an application tracker, and has no accounts or database. The domain modelling is thoughtful. The client-only design keeps the attack surface small. Typecheck, production build and PDF fixture rendering all pass.

**It is not ready for production as a product that people trust with their only copy of their CV.**

- The issues that matter most are data-integrity and privacy defects, not classic web vulnerabilities. Saved CVs can disappear silently. The "Clear" control does not erase anything. Share links send the whole CV, including ID number and date of birth, to the server in the URL.
- The framework version carries a critical-rated advisory set.
- There are no automated tests or CI gates to stop regressions.

All of this is fixable in one or two focused sprints, without architectural rewrites.

**Production-readiness score: 46/100.** This is a weighted rubric across 8 dimensions; see the table at the end.

## Top 10 findings (ranked by real risk)

| # | ID | Priority | Finding | Confidence |
|---|---|---|---|---|
| 1 | P0-2 | P0 | **Silent, permanent loss of saved CVs.** Invalid drafts are deleted on read, corrupt storage is overwritten, and a quota failure is shown as "Saved" | Confirmed (reproduced) |
| 2 | P0-1 | P0 | **Next.js 16.2.0 has a critical-rated advisory set.** The RSC DoS and cache-poisoning advisories apply; a non-breaking fix exists in 16.4.3 | Confirmed version |
| 3 | P1-1 | P1 | **"Clear" does not erase data.** It creates a new blank draft and leaves the old one in place, while the privacy policy presents it as the right-to-erasure mechanism | Confirmed (reproduced) |
| 4 | P1-2 | P1 | **Share links put the full CV in `?share=`,** including ID number, DOB, gender, emergency contact and references, so it reaches server logs and history | Confirmed |
| 5 | P1-3 | P1 | **Opening a share link merges it into a `us`-market CV,** saves it under the wrong market and drops projects and targeting | Confirmed (reproduced) |
| 6 | P1-4 | P1 | **PDF import uses pdfjs-dist 5.7.284,** which has a "JS execution on opening a malicious PDF" advisory; the CSP would not contain it | Version confirmed; trigger needs verification |
| 7 | P1-5 | P1 | **`/api/jobs` fans out to about 20 upstream calls per request,** and the cache is bypassed by any search term. There is no rate limit, so it can be abused and upstream providers may ban the app | Likely |
| 8 | P1-6 | P1 | **There are no tests and no CI quality gate,** and ESLint cannot run because it has no config | Confirmed |
| 9 | P2-1 | P2 | **The production CSP allows `unsafe-eval`/`unsafe-inline` scripts,** and `img-src https:` opens an exfiltration path | Confirmed |
| 10 | P2-4 | P2 | **The paste/PDF import parser mis-assigns title and company,** leaks lines between jobs, drops languages and invents months | Confirmed (reproduced) |

## Critical vulnerabilities (confirmed only)

- **None that are remotely exploitable in the application's own code.** I found no XSS, injection, SSRF or secrets exposure. React 19 neutralises `javascript:` URLs from job feeds.
- **Confirmed critical-class risk:** the vulnerable framework version (P0-1).
- **Confirmed data-loss defect:** silent CV deletion (P0-2).
- The pdfjs advisory (P1-4) is a credible client-side code-execution path, but its trigger in this text-extraction-only usage has not been verified.

## Production readiness

| Dimension | Weight | Score |
|---|---|---|
| Security hardening | 20 | 11 |
| Data integrity & reliability | 15 | 6 |
| Testing & CI | 15 | 2 |
| Privacy & compliance | 10 | 5 |
| Observability & operations | 10 | 2 |
| Deployment reproducibility | 10 | 7 |
| Performance | 10 | 7 |
| Maintainability | 10 | 6 |
| **Total** | **100** | **46** |

**Method:** each dimension was scored against what a small public SaaS needs at launch. Full marks means no known high-risk gaps and automated enforcement.

**Not assessable:** Vercel project configuration (WAF, log retention, preview protection), live upstream behaviour, and browser-measured accessibility and performance.

## Recommended next actions

1. **Today (P0):**
   - Upgrade `next` to ≥16.4.3.
   - Stop deleting drafts on read: quarantine instead.
   - Show "Not saved" when a write fails.
2. **This week (P1):**
   - Fix Clear and add "Erase all data".
   - Move share data to the URL fragment and strip sensitive fields.
   - Make share import open as a new draft in the correct market.
   - Upgrade pdfjs and add limits.
   - Decouple `q` from upstream fetches and add rate limiting.
3. **Sprint 1 foundation:**
   - Vitest suite for storage, share, store, parser and jobs normalisers.
   - ESLint config.
   - `ci.yml` gate: typecheck, lint, test, build, `verify:pdf`, audit.
   - Remove or guard the mirror workflow.
4. **Then (P2):**
   - CSP nonces.
   - URL scheme validation.
   - Parser fixes with fixtures.
   - Jobs error surfacing and salary sort.
   - Accessibility labelling.
   - Error monitoring.

See [GLOBALCV_REMEDIATION_ROADMAP.md](GLOBALCV_REMEDIATION_ROADMAP.md) and [GLOBALCV_TEST_GAPS.md](GLOBALCV_TEST_GAPS.md).
