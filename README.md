# GlobalCV

**Free, privacy-first CV and resume builder for the global job market.**

Built by [Bagalinis Consulting](https://bagalinis.com). No account required. Your CV is stored in your browser, not on our servers.

---

## What it does

GlobalCV generates professional CVs and resumes tailored to the conventions of eight major job markets. Each market has its own templates, fields, labels, and formatting rules — so your CV looks like it was built by someone who knows the local standards, not a generic online tool.

**Supported markets:**

| Market | Page size | Templates | Language |
|---|---|---|---|
| 🇺🇸 United States | Letter | Classic, Modern | English |
| 🇬🇧 United Kingdom | A4 | Classic CV, Modern CV | English |
| 🇦🇺 Australia & NZ | A4 | Classic, Modern | English |
| 🇮🇳 India | A4 | Classic CV, Modern CV | English |
| 🇪🇺 European Union | A4 | Europass, Modern | English |
| 🌎 Latin America | Letter | Traditional, Modern | Spanish |
| 🇧🇷 Brasil | A4 | Tradicional, Moderno | Portuguese |
| 🇯🇵 Japan | A4 | 履歴書 (Rirekisho), 職務経歴書 (Shokumu) | Japanese |

**Market conventions enforced per locale:**

| Market | Photo | DOB | Nationality | Marital status | Page limit |
|---|---|---|---|---|---|
| 🇺🇸 US | Hidden (discrimination law) | Hidden | Hidden | Hidden | 1 |
| 🇬🇧 GB | Hidden (equality law) | Hidden | Hidden | Hidden | 2 |
| 🇦🇺 AU | Hidden | Hidden | Hidden | Hidden | 3 |
| 🇮🇳 IN | Optional | Optional | Optional | Optional | 2 |
| 🇪🇺 EU | Optional | Optional | Optional | Hidden | 2 |
| 🌎 LATAM | Required | Required | Required | Required | 2 |
| 🇧🇷 BR | Optional | Optional | Optional | Optional | 2 |
| 🇯🇵 JP | Required | Required | Required | Optional | — |

---

## Features

### Editing
- **Market-aware fields** — US hides date of birth and photo (anti-discrimination); Latam requires them; Japan requires a 証明写真, 生年月日, 通勤時間, and more
- **Multiple templates per market** — 2 layouts per market with distinct visual styles
- **6 color themes per market** — Swap accent colors in the header (desktop) or in the Template step (mobile)
- **Undo / Redo** — 20-snapshot history with Cmd/Ctrl+Z / Y keyboard shortcuts; history is preserved for 2 seconds after each change
- **Inline form validation** — Required fields, email format, and date range errors shown on blur

### Preview & Export
- **Live preview** — Zoomable (40–150%) side panel with page-count estimate
- **Page limit warning** — Amber badge when content is estimated to exceed the market's recommended page count
- **PDF export** — Downloads a print-ready PDF matching the selected template exactly, with correct page breaks and multi-page sidebars
- **Mobile preview** — Full-screen preview modal accessible on small screens via a floating button

### Import & Backup
- **CV text / PDF import** — Paste CV text or upload a PDF (≤ 10 MB, ≤ 15 pages); the parser detects sections, dates (year-only dates stay year-only), name, email, phone, LinkedIn and languages
- **Import warnings** — Shows which fields weren't detected and warns if the 30-skill cap is hit
- **JSON backup** — Download your full CV as a `.json` file; restoring always creates a new draft (in the backup's market) and never overwrites an existing one
- **Copy to market** — Copy all CV content to a different market's slot (preserves target market's template and theme defaults)

### Sharing & Sync
- **Share link** — Generates a compressed link with your CV in the URL *fragment* (after `#`, not sent to servers). Photo and ID number are never included; other sensitive fields (DOB, nationality, marital status, gender, emergency contact, street address, references' contacts) only on explicit opt-in. Not encrypted — anyone with the link can read it
- **Shared CVs open as new drafts** — after confirmation, in the link's own market; existing drafts are never overwritten
- **Cross-tab safety** — per-draft revisions stop one tab from silently overwriting another tab's newer save; you choose which version to keep

### Privacy & Safety
- **Privacy Mode** — Nothing is written to localStorage while it is on
- **Delete this CV / Erase all data on this device** — permanently remove one draft, or every GlobalCV entry in this browser (other sites' data untouched)
- **Download all my data** — JSON export of everything GlobalCV stores locally (also restorable)
- **Never silently loses data** — unreadable or outdated saved data is repaired or kept as a recovery copy, never deleted; failed saves (e.g. storage full) are shown as "Not saved"
- **Photo compression** — Uploaded photos are automatically resized to 800 px max (JPEG 85%) before storage; files over 8 MB are rejected; identical photos are stored once
- **Error boundary** — Catches render crashes with a "Reload page" fallback so a broken CV doesn't leave you stuck
- **No CV backend** — CV data stays in your browser. The only server routes are the optional jobs feed and the optional post-a-job form
- **No account** — Open the app, fill in your details, export your PDF

### ATS (US market)
- **ATS suggestions panel** — 10-point checklist (name, email, phone, LinkedIn, summary length, work entries, description length, quantified achievements, education, skills count) with a score bar and per-check tips

---

## Privacy

> **Your CV never leaves your device.**

GlobalCV is a fully client-side app. No data is collected, stored on a server, or shared with third parties. See the full [Privacy Policy](/privacy) and [Terms of Service](/terms) inside the app.

Hosting is provided by [Vercel](https://vercel.com). No analytics or tracking scripts are used.

The share link embeds CV content as LZ-compressed plain text in the URL fragment — anyone with the link can read it. A privacy notice is shown before every copy.

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 3, Radix UI |
| State | Zustand 4 + Immer |
| Forms | react-hook-form 7 |
| Drag & drop | @dnd-kit/core + sortable |
| PDF generation | @react-pdf/renderer 4 |
| Share URL compression | lz-string |
| Icons | lucide-react |
| Language | TypeScript 5.9 |

---

## Getting Started

```bash
git clone https://github.com/augustosc-eu/globalcv.git
cd globalcv
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint       # ESLint (eslint.config.mjs)
npm run typecheck  # TypeScript
npm test           # unit + integration tests (node:test via tsx)
npm run verify:pdf # render every market/template/export-mode PDF fixture
npm run test:e2e   # browser smoke tests against a production build (needs Playwright + Chromium)
```

Open [http://localhost:3000](http://localhost:3000) and select a market to begin.

**Requirements:** Node.js 22.13+ (see `.nvmrc`; required by pdfjs-dist 6 and Next.js 16)

CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests, `npm audit --omit=dev --audit-level=high`, build, PDF fixtures and the browser smoke tests on every pull request.

After upgrading `pdfjs-dist`, run `npm run sync:pdf-worker` (a test fails if `public/pdf.worker.min.mjs` is out of sync).

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Market selector landing page
│   ├── [market]/
│   │   ├── layout.tsx            # Market validation + ErrorBoundary + PrivacyBanner
│   │   └── page.tsx              # Renders WizardShell for the market
│   ├── privacy/page.tsx
│   └── terms/page.tsx
│
├── types/
│   ├── cv.types.ts               # CVData, PersonalInfo, WorkExperience, …
│   └── market.types.ts           # MarketConfig shape
│
├── lib/
│   ├── markets/
│   │   ├── us.config.ts          # US market config
│   │   ├── eu.config.ts          # EU market config
│   │   ├── latam.config.ts       # Latam market config
│   │   ├── jp.config.ts          # Japan market config
│   │   ├── ui.ts                 # Shared UI label helpers
│   │   └── index.ts              # getMarketConfig(), isValidMarket()
│   ├── parser/
│   │   └── cvParser.ts           # Paste-import parser → ParseResult { data, warnings }
│   ├── pdf/
│   │   └── CVPDFDocument.tsx     # All PDF layouts (Classic, Modern, Europass, Shokumu, …)
│   ├── sharing/
│   │   └── shareUrl.ts           # encodeCVToURL / decodeCVFromURL (lz-string)
│   ├── storage/
│   │   └── localStorage.ts       # saveCV / loadCV / clearCV — versioned + migration
│   └── utils/
│       ├── cn.ts                 # Tailwind class merge helper
│       ├── dateFormat.ts         # Wareki + locale date formatting
│       └── theme.ts              # Color theme utilities
│
├── store/
│   └── cvStore.ts                # Zustand store — state, autosave, undo/redo, restoreCV
│
├── hooks/
│   └── usePDFExport.ts           # PDF generation state machine (idle/generating/done/error)
│
└── components/
    ├── form-fields/
    │   ├── DateRangePicker.tsx   # Start/end date + "present" toggle + validation
    │   └── PhotoUpload.tsx       # Canvas compression + 8 MB limit
    │
    ├── preview/
    │   ├── PreviewPane.tsx       # Zoomable preview with page-count warning
    │   └── renderers/
    │       ├── USClassicRenderer.tsx
    │       ├── USModernRenderer.tsx
    │       ├── EUEuropassRenderer.tsx
    │       ├── EUModernRenderer.tsx
    │       ├── LatamTraditionalRenderer.tsx
    │       ├── LatamModernRenderer.tsx
    │       ├── JapanRirekishoRenderer.tsx
    │       └── JapanShokumuRenderer.tsx
    │
    ├── shared/
    │   ├── AppHeader.tsx            # Save status, undo/redo, import, share, backup, PDF export
    │   ├── ATSSuggestionsPanel.tsx  # 10-point ATS score with tips (US market)
    │   ├── CopyToMarketModal.tsx    # Copy CV content to another market
    │   ├── CrossTabSyncBanner.tsx   # Reload prompt when another tab saves the same market
    │   ├── ErrorBoundary.tsx        # React error boundary with reload fallback
    │   ├── PasteImportModal.tsx     # 3-step paste → preview → apply import flow
    │   ├── PrivacyBanner.tsx        # Top-of-page privacy notice
    │   ├── ShareButton.tsx          # Copy share link with long-URL warning modal
    │   └── ThemeSelector.tsx        # Color theme picker
    │
    └── wizard/
        ├── WizardShell.tsx          # Main layout: sidebar nav + form area + preview pane
        ├── WizardProgress.tsx       # Step list with completion indicators
        ├── WizardNavigation.tsx     # Prev / Next buttons
        ├── StepRouter.tsx           # Maps step key → step component
        └── steps/
            ├── PersonalInfoStep.tsx    # Name, contact, photo, address (validated)
            ├── ObjectiveStep.tsx       # Summary / objective text
            ├── WorkExperienceStep.tsx  # DnD-sortable work entries
            ├── EducationStep.tsx       # DnD-sortable education entries
            ├── SkillsStep.tsx          # Tag-based skills with proficiency level
            ├── LanguagesStep.tsx       # Language + CEFR proficiency
            ├── CertificationsStep.tsx
            ├── ReferencesStep.tsx
            ├── TemplatePickerStep.tsx  # Template + theme picker + ATS panel (US)
            ├── JapanSpecificStep.tsx   # 通勤時間, 扶養家族, 配偶者, 自己PR, 志望動機
            └── StepHeader.tsx          # Shared step title/description
```

---

## Architecture Notes

### Config-over-code
Every market's wizard steps, fields, validation rules, UI labels, and PDF layout are driven by `MarketConfig`. Components read the config at runtime — no market-specific `if` branches in shared components. To change what a market shows, edit its config file.

### Data model
`CVData` is a single flat object shared across all markets. Market-specific optional fields (`nearestStation`, `commuteTime`, `selfPromotion`, `reasonForApplication`, etc.) are declared as optional on the shared type. The config controls which fields are rendered.

### Storage
CV drafts are stored in `localStorage` under `cv_maker_v2_{market}` (legacy `cv_maker_v1_{market}` is migrated on first save). Reads never modify storage. Drafts that no longer match the schema are repaired in memory, and their original is copied to a `cv_maker_quarantine_*` key before it is replaced; unparseable data is quarantined, never overwritten. Every save reports success or a typed failure (`quota`, `unavailable`, `conflict`, …) and the header shows "Not saved" on failure. Each draft carries a revision so concurrent tabs cannot overwrite each other silently. See [docs/remediation/GLOBALCV_REMEDIATION_SUMMARY.md](docs/remediation/GLOBALCV_REMEDIATION_SUMMARY.md) for recovery and troubleshooting.

### Undo / Redo
A Zustand subscriber (outside React) captures CV snapshots every 2 seconds when the store is dirty. History is capped at 20 entries. The redo future is dropped on any new edit.

### PDF generation
`@react-pdf/renderer` v4 is lazy-loaded and renders on the main thread when you export. `wrap={false}` on entry `<View>`s prevents mid-entry page breaks. The ModernPDF sidebar uses `minHeight: '100%'` on the outer flex row with `backgroundColor` directly on the sidebar `<View>` so it extends correctly across multiple pages.

### Import parser
`parseRawCV(text, market)` returns `{ data: Partial<CVData>, warnings: string[] }`. It detects sections by heading patterns, extracts contact info from the first 15 lines, and parses date ranges in many formats: ISO `YYYY-MM`, `MMM YYYY`, `MMM-YYYY`, `MM/YYYY`, Spanish month names, and plain year. Skills are capped at 30 with a warning.

### Share URL
CV data (minus never-shared and, by default, sensitive fields) is JSON-serialized, LZ-compressed and placed in the URL fragment (`/{market}#cv=2.<payload>`). Payloads are size-limited and schema-validated on open. Legacy `?share=` links still open (sensitive fields dropped) and are removed from the address bar immediately.

---

## Adding a New Market

1. Create `src/lib/markets/{market}.config.ts` implementing `MarketConfig`
2. Register it in `src/lib/markets/index.ts`
3. Add the market to the `Market` union in `src/types/cv.types.ts` and to `MARKETS` in `src/lib/markets/registry.ts` (a compile-time check fails if they differ; routes, schema and storage all read this list)
4. Add HTML preview renderers to `src/components/preview/renderers/`
5. Add PDF components to `src/lib/pdf/CVPDFDocument.tsx`

---

## Deploying

The app is fully static-compatible. Deploy on [Vercel](https://vercel.com) with zero configuration:

1. Fork or clone the repo
2. Import into Vercel — auto-detects Next.js
3. Deploy

Optional environment variables:

- `ENABLE_POST_JOB=true` and `NEXT_PUBLIC_ENABLE_POST_JOB=true` to enable the job submission module
- `RESEND_API_KEY` to enable server-side email delivery for `/post-job` submissions
- `RESEND_FROM` to control sender identity (default: `GlobalCV Jobs <hello@augustosc.com>`)

For Jobs source compliance hardening, you can optionally gate higher-risk providers:

- `JOBS_SAFE_MODE=false` and `NEXT_PUBLIC_JOBS_SAFE_MODE=false` to disable strict safe mode (not recommended for public launch)
- `ENABLE_ARBEITNOW_SOURCE=true` and `NEXT_PUBLIC_ENABLE_ARBEITNOW_SOURCE=true` to allow Arbeitnow while safe mode is on
- `ENABLE_4DAYWEEK_SOURCE=true` and `NEXT_PUBLIC_ENABLE_4DAYWEEK_SOURCE=true`
- `ENABLE_THEMUSE_SOURCE=true` and `NEXT_PUBLIC_ENABLE_THEMUSE_SOURCE=true`

By default, safe mode is ON and uncertain sources stay disabled.

The jobs API never forwards the free-text search to providers: each provider is fetched at most once per 5 minutes per server instance (single-flight, max 4 concurrent, 6 s timeout per request) and filtered locally. Requests are validated (search ≤ 100 chars, known filter values only) and rate-limited per client per instance (60/min). For a global limit across serverless instances, add a platform rule (e.g. a Vercel Firewall rate-limit rule on `/api/*`). Demo listings are served only outside production, or with `ENABLE_DEMO_JOBS=true`.

---

## Security

- CV builder data is not sent to a server; optional `/post-job` submissions are sent to the backend and emailed via Resend
- CV data is stored in `localStorage` and, when you share, in the URL fragment (LZ-compressed, not encrypted)
- **Privacy Mode** keeps everything in memory — nothing written to disk
- Security headers enforced via `next.config.mjs`: CSP (no `unsafe-eval` in production, `object-src 'none'`, logo hosts allow-listed), `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`; `X-Powered-By` disabled
- See [docs/remediation/GLOBALCV_SECURITY_FIXES.md](docs/remediation/GLOBALCV_SECURITY_FIXES.md) for the remaining CSP exceptions and why they exist
- See [SECURITY.md](SECURITY.md) for the full security policy and vulnerability reporting

---

## License

MIT — free to use, modify, and distribute.

---

*Made with care by [Bagalinis Consulting](https://bagalinis.com)*
