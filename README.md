# GlobalCV

**Free, privacy-first CV and resume builder for the global job market.**

Built by [Augusto Santa Cruz](https://github.com/augustosc-eu). No account required. No data leaves your browser.

---

## What it does

GlobalCV generates professional CVs and resumes tailored to the conventions of four major job markets. Each market has its own templates, fields, labels, and formatting rules — so your CV looks like it was built by someone who knows the local standards, not a generic online tool.

**Supported markets:**

| Market | Page size | Templates | Language |
|---|---|---|---|
| 🇺🇸 United States | Letter | Classic, Modern | English |
| 🇪🇺 European Union | A4 | Europass, Modern | English |
| 🌎 Latin America | Letter | Traditional, Modern | Spanish |
| 🇯🇵 Japan | A4 | 履歴書 (Rirekisho) | Japanese |

---

## Features

- **Market-aware fields** — US hides date of birth and photo (anti-discrimination); LATAM requires them; Japan requires a 証明写真 and 生年月日
- **Multiple templates per market** — Classic and Modern layouts with distinct visual styles
- **6 color themes per market** — Swap accent colors in the header (desktop) or in the Template step (mobile)
- **PDF export** — Downloads a print-ready PDF matching the selected template layout exactly
- **CV text import** — Paste your existing CV text and the parser extracts sections automatically (supports English and Spanish)
- **Photo upload** — Crop and embed a profile photo (shown in markets where expected)
- **Share link** — Generates a compressed URL with your full CV data — share or bookmark it
- **Clear Data** — Wipes all CV data from your browser in one click
- **Privacy Mode** — Disables localStorage entirely; data lives in memory only and is erased when the tab closes
- **No backend** — All data stays in your browser (localStorage + URL state). Nothing is sent to a server
- **No account** — Open the app, fill in your details, export your PDF
- **Mobile-friendly** — Responsive layout; all features accessible on small screens

---

## Privacy

> **Your CV never leaves your device.**

GlobalCV is a fully client-side app. No data is collected, stored on a server, or shared with third parties. See the full [Privacy Policy](/privacy) and [Terms of Service](/terms) inside the app.

Hosting is provided by [Vercel](https://vercel.com). No analytics or tracking scripts are used.

---

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS, Radix UI |
| State | Zustand 4 + Immer |
| PDF generation | @react-pdf/renderer 4 |
| Validation | Zod 3 |
| Language | TypeScript 5.9 |

---

## Getting started

```bash
git clone https://github.com/augustosc-eu/globalcv.git
cd globalcv
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and select a market to begin.

**Requirements:** Node.js 18+

---

## Project structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── [market]/           # Dynamic route per market (us, eu, latam, jp)
│   ├── privacy/            # Privacy Policy page
│   └── terms/              # Terms of Service page
├── components/
│   ├── preview/
│   │   └── renderers/      # HTML preview renderers (one per template)
│   ├── wizard/             # Step-by-step form wizard
│   └── shared/             # Header, modals, theme selector, privacy banner
├── hooks/
│   └── usePDFExport.ts     # PDF generation hook
├── lib/
│   ├── markets/            # Per-market config (fields, templates, themes, labels)
│   ├── parser/             # CV text import parser
│   └── pdf/                # PDF layout components (@react-pdf/renderer)
├── store/
│   └── cvStore.ts          # Global Zustand store (includes Privacy Mode)
└── types/                  # TypeScript types
```

---

## Deploying

The app is fully static-compatible. Deploy on [Vercel](https://vercel.com) with zero configuration:

1. Fork or clone the repo
2. Import into Vercel → auto-detects Next.js
3. Deploy

No environment variables required.

---

## Security

- No user data is ever sent to a server
- All CV data is stored in `localStorage` and/or encoded in the share URL (LZ-compressed)
- **Privacy Mode** keeps everything in memory — nothing written to disk
- Security headers enforced via `next.config.mjs`: `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Permissions-Policy`, and a Content Security Policy
- See [SECURITY.md](SECURITY.md) for the full security policy and vulnerability reporting

---

## License

MIT — free to use, modify, and distribute.

---

*Made with care by [Augusto Santa Cruz](https://github.com/augustosc-eu)*
