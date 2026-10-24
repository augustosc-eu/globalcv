# GlobalCV — Remaining Risks

*Date: 2026-10-24 · After the remediation on branch `claude/awesome-einstein-7cofem`*

The audited P0 and P1 issues are resolved. These are the risks that remain, ordered by priority, each with the reason it was left open and a workable next step.

## Security

| # | Risk | Severity | Why it remains | Recommended next step |
|---|---|---|---|---|
| R1 | CSP keeps `script-src 'unsafe-inline'` | Medium | Next.js App Router needs inline bootstrap scripts. Nonce-based CSP would make all statically prerendered pages dynamic (cost and latency) | If XSS risk grows (new rich-text features, third-party embeds), add `proxy.ts` that sets a per-request nonce and accept dynamic rendering. Today there is no known HTML injection sink: no `dangerouslySetInnerHTML`, and React escapes all CV text |
| R2 | Rate limiting is per serverless instance | Medium | No free shared store is assumed. Upstream amplification is bounded independently by the per-source cache | Add a Vercel Firewall rate-limit rule for `/api/*` (platform-level, global), or back `createRateLimiter` with Upstash/Vercel KV if available |
| R3 | 3 moderate advisories in `tailwindcss@3` → `postcss-selector-parser` | Low | Dev and build-time only, processing our own CSS. Fixing requires Tailwind 4, a breaking migration outside this scope | Schedule the Tailwind 4 migration separately and re-run `verify:pdf` and E2E after it |
| R4 | Legacy `?share=` links already sent CV data to the server when they were opened | Low (historical) | Cannot be undone. New links use the fragment | Optionally ask Vercel to purge or shorten access-log retention. Tell users who shared links before this release that those links contain their data |
| R5 | Share links are compressed, not encrypted | Low–Medium (by design) | Encryption was out of scope and would change UX (a passphrase or key in the fragment) | Optional: encrypt the payload with a random key carried in a second fragment part, so URL previews that keep only part of the link reveal nothing |
| R6 | Action SHAs in `ci.yml`/`mirror.yml` and GitHub's SSH host key were written from published references and not verified online from this environment | Low | No network access to GitHub's metadata from the sandbox | Confirm on the first CI run, then let Dependabot keep pins updated (`.github/dependabot.yml` with `github-actions`) |
| R7 | Branch protection and required status checks are **not configured** | Medium (process) | A repository setting, not code. Not verified | In GitHub settings require the `CI / Lint, typecheck, test, audit, build, E2E` check on `main` |

## Data integrity

| # | Risk | Severity | Notes |
|---|---|---|---|
| D1 | localStorage is still the only copy of user data | Medium | Browser data clearing, profile loss or device loss lose everything. Mitigated by "Download all my data", the per-CV JSON backup and clearer messaging. Optional end-to-end-encrypted sync would be a larger product decision |
| D2 | Quarantine copies use storage quota | Low | Each distinct unreadable payload is stored once (content-hashed). They are kept until "Erase all". Consider a "Discard recovery copies" action after the user has downloaded them |
| D3 | Cross-tab conflicts are detected per draft, not merged | Low | The user chooses keep both, theirs or mine. Field-level merge is not implemented |
| D4 | Rolling back to the pre-remediation build | Medium (operational) | The old build's destructive read path would return, and photos saved by the new build (`stored-photo:` refs) would not display there. Prefer rolling forward; see the summary §4 |
| D5 | Parser accuracy beyond the fixture set | Low | Heuristic parsing still varies with layout. The preview/apply step and warnings let users review before applying. Add fixtures as real-world failures are reported |

## Product, compliance and operations

| # | Risk | Notes |
|---|---|---|
| O1 | Job-provider terms of use (attribution, request frequency, commercial use) are unverified | Requires the owner to read each provider's terms (Remotive, RemoteOK, Jobicy, Himalayas, optional Arbeitnow, 4DayWeek and The Muse). The 5-minute per-source cache keeps request frequency low. Add attribution where required |
| O2 | No error monitoring | Only server `console.warn` for provider failures and `/api/health`. A client error reporter needs a privacy review because CV text could appear in errors |
| O3 | Accessibility not fully audited | Labels, dialog roles and alerts were added. An axe or screen-reader pass, keyboard alternatives for drag-and-drop reordering, and focus trapping in custom modals remain |
| O4 | Duplicated template implementations (HTML preview and react-pdf) and the 1,232-line `CVPDFDocument.tsx` | Left unchanged to avoid a risky rewrite. Date formatting is now shared. Splitting per template is the recommended next refactor |
| O5 | Committed developer-local files (`.claude/settings.local.json`, `.vscode/mcp.json`, `.cursor/mcp.json` with personal absolute paths) | Untracking them in a PR would delete them from the owner's working tree on pull. The owner can `git rm --cached` them deliberately and add them to `.gitignore` |
| O6 | Upstream search relevance | The free-text search is now applied locally to each provider's latest feed, which bounds traffic. Provider-side search could surface older matches; this is an accepted trade-off |
| O7 | Real CI run and live-provider behaviour not observed | Verify on the pull request's first CI run and on a preview deployment (see manual verification steps in the PR description) |
