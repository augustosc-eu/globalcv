# GlobalCV — Security Fixes

*Date: 2026-10-24 · Branch `claude/awesome-einstein-7cofem` · Builds on audit findings in [`GLOBALCV_AUDIT_REPORT.md`](../audits/GLOBALCV_AUDIT_REPORT.md)*

No secrets or personal data were added to the repository. All test fixtures are synthetic.

## Dependencies

| Advisory | Package | Severity | Action | Verified by |
|---|---|---|---|---|
| ~35 GHSA (RSC DoS, cache poisoning, middleware bypass, …) | `next` 16.2.0 | critical | → 16.4.3 (latest 16.x) | `npm audit --omit=dev` = 0, build, E2E |
| GHSA-hq66-cqwq-w95j — JS execution on opening a malicious PDF | `pdfjs-dist` 5.7.284 | high | → 6.4.299, worker re-synced, and hardened options (below) | `hardening.test.ts` (version floor and worker hash), E2E import |
| GHSA-mrhx-c7xc-m3w5 — memory exhaustion on oversized constrained collections | `zod` 3.25.76 | high | → 4.6.7. Share payloads are also capped at 60k/300k characters before parsing | full test suite (schema round-trips for 8 markets) |
| `svix` → `uuid` buffer bounds | `resend` 6.9.4 | moderate | → 6.34.1 | audit |
| esbuild dev-server file read (Windows) | `tsx` → `esbuild` | low | `tsx` → 4.23.15 | audit |
| brace-expansion, picomatch, postcss, browserslist, nanoid, source-map-js, sharp, @babel/core, @humanfs/node, baseline-browser-mapping | transitive | low–high | `npm audit fix` (non-breaking only) | audit |
| postcss-selector-parser quadratic parsing | `tailwindcss@3` (dev, build-time) | moderate | **Not fixed.** The fix requires Tailwind 4, a breaking upgrade unrelated to this remediation. Input is our own CSS only | listed in Remaining risks |

13 unused packages were removed. Final state:

- `npm audit --omit=dev`: **0 vulnerabilities**.
- Full `npm audit`: 3 moderate (the Tailwind 3 chain above).
- CI fails on any new high or critical advisory in production dependencies.

## Application fixes

### Sharing (P1-2)

- **Transport.** The payload moved from `?share=` (sent to the server, written to access logs) to the URL fragment `#cv=2.…`, which user agents do not send in requests or `Referer` headers. The E2E test intercepts every browser request during a share round-trip and asserts that none contains the payload.
- **Field exclusion.**
  - **Never shared:** photo, ID number.
  - **Opt-in only:** date of birth, nationality, marital status, gender, emergency contact, nearest station, commute time, personal seal, street address and postal code, references' email and phone.
- **Limits.** Encoded payloads over 60,000 characters and decoded payloads over 300,000 are rejected before `JSON.parse`. A versioned prefix and zod schema validation apply.
- **Wording.** The UI and policy say plainly that a link is *compressed, not encrypted*, and that it can persist in history, chats, previews and bookmarks.
- **Legacy links** are imported with sensitive fields stripped and removed from the address bar immediately.
- **Limitation.** Opening a legacy link has already sent it to the server by the time the page loads. That cannot be undone retroactively.

### File imports (P1-4, P2-5)

- **PDF:**
  - 10 MB limit, checked before reading;
  - `%PDF-` signature check, 15-page cap, 200k-character output cap, 20 s wall-clock budget (the document is destroyed on every exit path);
  - `disableFontFace: true` (no FontFace objects; the historical CVE-2024-4367 path), `enableXfa: false`, `isOffscreenCanvasSupported: false`, `maxImageSize` cap.
  
  pdf.js 6 removed the eval-based font path. PDF-embedded JavaScript is never executed, because the scripting sandbox (`pdf.sandbox.mjs`) is not loaded.
- **JSON backups:** 10 MB limit, JSON parse, schema validation, then conservative repair. Always applied as a new draft, never merged and never overwriting. Full-data exports restore without overwriting existing keys.

### External links (P2-2)

`safeHttpUrl()` (`src/lib/utils/safeUrl.ts`):

- accepts only `http:`/`https:` URLs with a real host;
- strips control characters, so `java\nscript:` is caught;
- upgrades bare domains to `https://`.

It is applied:

- server-side to every job URL, with logos filtered by host allow-list;
- when saving tracker entries;
- at render time for `job.url`, `entry.jobUrl` and `project.url`.

Listings without a safe URL are dropped. React 19's `javascript:` blocking remains as a second layer.

### Jobs API abuse (P1-5)

The fan-out is now independent of user input:

- the free-text search is never sent upstream;
- each source is loaded at most once per 5 minutes per instance (single-flight), with at most 4 concurrent loads and 6 s / 9 s timeouts.

Input is validated: an enum allow-list, `q` ≤ 100 characters, and integer pages from 1 to 200. Rate limiting is 60/min per client per instance, returning 429 with `Retry-After`. Responses carry CDN caching headers. Provider errors are isolated and reported in `sources[]`.

**Rate-limiter limitation.** The limiter keeps state in process memory, so each serverless instance enforces its own limit. Upstream amplification is still bounded, because it depends on the cache rather than the limiter. For a global per-client limit, configure a platform rule such as a Vercel Firewall rate-limit rule on `/api/*`, or back the limiter with a shared store. The code documents this in `src/lib/jobs/rateLimit.ts`.

### Post-a-job endpoint (P2-3), feature-flagged off by default

- Requires `Content-Type: application/json`, which blocks cross-site `text/plain` form posts (415).
- Requires a same-origin `Origin` header (403 otherwise).
- 20 KB body cap (413). Malformed JSON gets 400.
- Honeypot field (`website2`): bot submissions are acknowledged and dropped.
- 5 submissions per 10 minutes per client per instance (429).
- `applicationUrl` must be `http(s)` (zod 4 `z.url({ protocol })`). The email subject is newline-stripped.
- Responses carry no secrets or stack traces.

### Content Security Policy and headers (P2-1, P3-5)

Production policy:

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline';
font-src 'self';
connect-src 'self' data:;
img-src 'self' data: blob: https://remotive.com https://*.remotive.com https://himalayas.app https://*.himalayas.app https://remoteok.com https://*.remoteok.com https://remoteok.io https://*.remoteok.io https://jobicy.com https://*.jobicy.com https://arbeitnow.com https://*.arbeitnow.com;
worker-src 'self' blob:;
object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
upgrade-insecure-requests
```

**Removed or restricted:**

- `'unsafe-eval'` (production). It is still added for `next dev`.
- `img-src https:` (any host). It is now an allow-list taken from `src/lib/jobs/logoHosts.json`, the same list the API uses to filter logos.

**Added:** `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`.

**Remaining exceptions and why:**

| Directive | Why it remains | What would remove it |
|---|---|---|
| `script-src 'unsafe-inline'` | Next.js App Router injects inline bootstrap/RSC scripts. Nonces require per-request rendering, which would turn all 9 static pages dynamic | Nonce-based CSP via `proxy.ts` + `headers()`, with dynamic rendering accepted (cost/perf trade-off for the owner) |
| `script-src 'wasm-unsafe-eval'` | `@react-pdf/renderer`'s layout engine (yoga) compiles WebAssembly. This permits WASM compilation only, not JS `eval` | Not removable while using react-pdf |
| `connect-src data:` | yoga's WASM loader `fetch()`es its embedded `data:` URL. This makes no network request, so it adds no exfiltration path | Upstream change in yoga |
| `style-src 'unsafe-inline'` | React inline `style` props (theme colours) and Next.js style injection | Large refactor; low value (style injection without script is low impact) |

zod runs in `jitless` mode, so it no longer probes `new Function` (which a strict CSP reports as a violation). The browser E2E test asserts **zero CSP violations** across all market routes and through export, import, share and erase flows.

**Other headers:**

- `X-Frame-Options: DENY` (aligned with `frame-ancestors 'none'`);
- `Cross-Origin-Opener-Policy: same-origin`;
- `Permissions-Policy` now also disables `interest-cohort`;
- `X-Powered-By` removed (`poweredByHeader: false`).

### Privacy and deletion (P1-1)

- *Delete this CV* deletes the draft, its readiness history and any photo no longer used, then persists the result.
- *Erase all data on this device* removes every `cv_maker_*` and `globalcv_*` key from local and session storage, verifies that none remain, and reports any it could not remove. Other origins' and other apps' keys are untouched.
- Both are covered by unit tests and by browser tests that reload and re-inspect storage.

### Data integrity as a security property (P0-2)

Silent destruction of user data on read has been removed. See [Remediation summary §2](GLOBALCV_REMEDIATION_SUMMARY.md#workstream-1--data-loss-prevention-p0-2).

### CI / supply chain (P2-8)

- **`ci.yml`:** SHA-pinned `actions/checkout` and `actions/setup-node`, `permissions: contents: read`, `persist-credentials: false`, and a production-dependency audit gate.
- **`mirror.yml`:**
  - skipped in the public repository it previously force-pushed to itself;
  - SHA-pinned;
  - GitHub's published SSH host key replaces trust-on-first-use `ssh-keyscan`;
  - the key file is written under `umask 077`;
  - pushes are fast-forward only.

**Owner action:** confirm the pinned SHAs and the host key against GitHub's documentation, and set `vars.MIRROR_SOURCE_REPO` in the private repository if the mirror is still wanted.
