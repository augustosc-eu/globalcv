# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.x (latest) | ✅ |
| < 1.0 | ❌ |

Only the latest release receives security fixes.

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

GlobalCV is a fully client-side application. Understanding the security model helps clarify what is and is not in scope.

**What we control:**
- All code that runs in the browser
- HTTP security headers served with the app
- Third-party dependencies

**What we do not control:**
- The user's local browser environment
- The device or network the user runs the app on

### Data handling

- No user data is ever transmitted to a server
- CV data is stored exclusively in `localStorage` and/or encoded in the share URL
- Share URLs use LZ-string compression — they are not encrypted. Treat them as you would any URL: anyone with the link can read the CV data it contains
- No analytics, tracking scripts, or third-party data collection of any kind

### HTTP security headers

The following headers are set on every response:

| Header | Value |
|---|---|
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Content-Security-Policy` | Restricts scripts, styles, fonts, and connections to trusted origins |

### Dependencies

Dependencies are kept up to date and audited with `npm audit` on every release. The project targets zero known vulnerabilities at time of release.

---

## Scope

The following are considered in scope for vulnerability reports:

- Cross-site scripting (XSS) via CV input fields or imported text
- Content Security Policy bypasses
- Malicious share URL payloads that execute code or exfiltrate data
- Dependency vulnerabilities with direct exploitability in this app

The following are considered out of scope:

- Vulnerabilities requiring physical access to the user's device
- Self-XSS (attacks that require the victim to run code themselves)
- Theoretical vulnerabilities with no practical exploit path
- Issues in the user's browser or operating system

---

*This policy applies to the open-source GlobalCV codebase. If you are using a self-hosted or forked version, the maintainer of that deployment is responsible for their own security posture.*
