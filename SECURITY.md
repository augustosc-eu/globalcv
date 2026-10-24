# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `main` (latest) | ✅ |
| Older commits / forks | ❌ |

Only the latest version on `main` receives security fixes.

---

## Reporting a Vulnerability

If you discover a security vulnerability, **please do not open a public GitHub issue.**

Report it privately by emailing:

**acroix2020@gmail.com**

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

You will receive a response within **72 hours**. If the issue is confirmed, a fix will be prioritized and released as soon as possible. You will be credited in the release notes unless you prefer to remain anonymous.

---

## Security Model

The GlobalCV CV builder runs client-side. Two optional server routes exist: `GET /api/jobs` (aggregates public job feeds) and `POST /api/post-job` (feature-flagged; emails a job-posting request via Resend). Understanding the security model helps clarify what is and is not in scope.

**What we control:**
- All code that runs in the browser
- HTTP security headers served with the app
- Third-party dependencies

**What we do not control:**
- The user's local browser environment
- The device or network the user runs the app on

### Data handling

- CV data is not transmitted to our servers by the CV editor
- CV data is stored in `localStorage` in the user's browser (not encrypted at rest)
- Share links put the CV in the URL fragment (`#cv=…`), which browsers do not send to servers. They are LZ-compressed, **not encrypted**: anyone with the link can read it. Photo and ID number are never included; other sensitive fields only on explicit opt-in
- Post-a-job submissions (when enabled) send the submitted business contact details to our inbox via Resend
- No analytics, tracking scripts, or third-party data collection

### HTTP security headers

The following headers are set on every response:

| Header | Value |
|---|---|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Content-Security-Policy` | Self-hosted scripts/styles/fonts; no `unsafe-eval` in production; `object-src 'none'`; images only from self and allow-listed job-logo hosts. `'unsafe-inline'` scripts remain (Next.js static pages) — see `docs/remediation/GLOBALCV_SECURITY_FIXES.md` |

### Dependencies

CI runs `npm audit --omit=dev --audit-level=high` on every pull request and fails on high or critical advisories in production dependencies. Known, accepted lower-severity findings are listed in `docs/remediation/GLOBALCV_REMAINING_RISKS.md`.

---

## Scope

The following are considered in scope for vulnerability reports:

- Cross-site scripting (XSS) via CV input fields or imported text
- Content Security Policy bypasses
- Malicious share URL payloads that execute code or exfiltrate data
- Malicious PDF or JSON files that execute code or corrupt stored data when imported
- Abuse of `/api/jobs` or `/api/post-job` (rate-limit bypass, upstream amplification, email injection)
- Dependency vulnerabilities with direct exploitability in this app

The following are considered out of scope:

- Vulnerabilities requiring physical access to the user's device
- Self-XSS (attacks that require the victim to run code themselves)
- Theoretical vulnerabilities with no practical exploit path
- Issues in the user's browser or operating system

---

*This policy applies to the open-source GlobalCV codebase. If you are using a self-hosted or forked version, the maintainer of that deployment is responsible for their own security posture.*
