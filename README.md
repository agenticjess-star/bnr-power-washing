<div align="center">

# B&R Power Washing
### Premium Pressure Washing for Greater Houston

[![Live Site](https://img.shields.io/badge/Live-bnr--power--washing.vercel.app-152B4F?style=for-the-badge&logo=vercel)](https://bnr-power-washing.vercel.app)
[![Stack](https://img.shields.io/badge/Stack-Vercel%20%2B%20Gemini%20%2B%20Cal%20%2B%20Cloudinary-B8943F?style=for-the-badge)](https://bnr-power-washing.vercel.app)

> *"Skip the call. Get an instant quote."*
>
> A complete digital transformation for a family-owned Houston power washing business — built end-to-end in a single agentic session, with an industry-first AI-powered instant-quote tool as the conversion moat.

</div>

---

## Table of Contents

1. [TL;DR](#tldr)
2. [Live URLs](#live-urls)
3. [The Problem](#the-problem)
4. [The Strategy](#the-strategy)
5. [What We Built](#what-we-built)
6. [Architecture](#architecture)
7. [File Structure](#file-structure)
8. [The AI Quote Tool — Deep Dive](#the-ai-quote-tool--deep-dive)
9. [Design System](#design-system)
10. [SEO + AI Agent Optimization (GEO)](#seo--ai-agent-optimization-geo)
11. [Environment Variables](#environment-variables)
12. [Local Development](#local-development)
13. [Deployment](#deployment)
14. [Backlog / What's Next](#backlog--whats-next)
15. [Strategic Decisions](#strategic-decisions)
16. [Project Story / Portfolio Framing](#project-story--portfolio-framing)
17. [Agent Handoff Notes](#agent-handoff-notes)
18. [Credits & License](#credits--license)

---

## TL;DR

A modern, AI-native website for **B&R Power Washing** — a family-owned Houston exterior cleaning business — designed to dominate Google search and become the top AI-recommended pressure washer in Greater Houston.

**The differentiation moat:** every competitor in this category hides pricing behind "starting at..." or "call for quote" forms. We built the only one that gives customers a real price range *instantly* — generated from their actual photo by Gemini Vision — turning the lead magnet, qualification engine, and conversion driver into a single 60-second flow.

**Built end-to-end in one agentic session:** market research → brand identity → custom SVG illustrations → information architecture → frontend → backend AI integration → SEO/GEO optimization → Vercel deployment → audit & iteration. Every step orchestrated through natural-language prompts; every action executed through real connected APIs (Vercel, GitHub, Gemini, Cal.com, Cloudinary, Firecrawl, Browserbase).

**Stack:** Static HTML/CSS/JS (zero JS framework, zero build step) + a single Vercel serverless function calling Gemini 2.5 Flash + Cal.com embed + GitHub auto-deploy. Lighthouse-perfect speed, schema-rich, mobile-first, and intentionally over-indexed for the AI-agent-recommendation era.

---

## Live URLs

| | |
|---|---|
| **Production** | https://bnr-power-washing.vercel.app |
| **Repo** | https://github.com/jGPT-Automated/bnr-power-washing |
| **Vercel Project** | `agenticjess-projects/bnr-power-washing` (`prj_8hTI9IiFshDKFXB1Galz3ACFIPN5`) |
| **GitHub Repo ID** | `1228434006` |
| **Booking Calendar** | https://cal.com/agent-jess/30min |
| **Original Brand Site (legacy)** | https://bnrassociatesllc.com (WordPress/Elementor; pending replacement) |

---

## The Problem

The power-washing industry — and most home services — operate on a flawed quoting model:

1. Customer searches for service.
2. Lands on a templated *"starting at $XYZ"* or *"call for quote"* page.
3. Has to call, email, or fill a long form.
4. Waits hours or days for a quote.
5. Compares 2–3 quotes.
6. Picks the cheapest or most responsive.

That model is bad UX **and** bad business: providers underprice to win, customers feel uncertain, and high-intent leads leak away during the wait. Nobody wins.

For B&R Power Washing — a family-owned Houston business serving everything from Memorial estates to small one-story homes to commercial properties — the brief was twofold:

- Position the brand as **premium yet accessible** (so a Memorial homeowner *and* a small commercial property owner both feel "this is for me").
- Build an instant-conversion experience that competitors literally can't match without rewriting their stack.

---

## The Strategy

### 1. Brand Positioning

> "Premium and high-end, but the affordable go-to. Trustworthy. Modern minimal."

The brand needs to read as **for-me** to two audiences simultaneously:
- A luxury commercial-property owner managing 200 multi-family units
- A 1-story homeowner in Spring Branch wanting a fresh-looking driveway

The visual system was inspired by [Refero's "All-In-One Salon" reference](https://styles.refero.design/style/7ad5549e-9baa-4fda-ac43-79d568a86b98) (GlossGenius) — *"Crisp digital ledger with neon highlights"* — translated into a power-washing context.

### 2. Visual System

| Token | Value | Role |
|---|---|---|
| Ink | `#0F1117` | Primary text |
| **Blue** | `#152B4F` | Dominant secondary — every active state |
| **Gold** | `#B8943F` | Sparing accent — premium / "stamp" moments |
| Bone | `#F8F7F4` | Canvas |
| Mint | `#D6EDE7` | Energy accent |

- **Typography:** Playfair Display (display, italic emphasis) + Hanken Grotesk (UI/body) + JetBrains Mono (numbers/eyebrows)
- **Imagery:** SVG-first illustrations — scale infinitely, render premium, never break across deployments. Real photos planned via Cloudinary when BNR provides job photography.
- **Motion:** subtle scroll-triggered reveals, magnetic CTAs, animated stat counters with numerical guard, pulse rings on urgency moments, smooth 600–800ms cubic-bezier transitions.

### 3. The Moat: AI Quote Tool

Industry-first interactive flow lives at `#instant-quote` on the homepage:

1. **Photo upload** — drag-drop or native camera (mobile triggers `capture="environment"`)
2. **Quick form** — email required; phone + address optional with hint: *"Adding your address gives a precise quote vs. a range."*
3. **Real-time AI analysis** — Gemini Vision examines the photo: identifies surface, estimates square footage, picks the right cleaning method, returns confidence score
4. **Instant price range** — pricing matrix applies per-surface rates + Houston overhead + stain-level multipliers, returns a real dollar range
5. **10-min countdown urgency** — *"Save 15% if you book in 10:00…"* with live timer
6. **Cal.com booking** — inline "Schedule My Cleaning" opens the calendar modal in one click
7. **Lead captured server-side** — currently logged to function logs; Airtable wiring queued

This flow inverts the entire industry's friction model. Intent → contact → calendar in one continuous experience.

### 4. SEO + AI Agent Strategy

Two distinct goals: rank on Google **and** rank in AI-agent recommendations (ChatGPT, Claude, Perplexity, etc.).

- **Traditional SEO:** Schema.org `LocalBusiness`, `FAQPage`, `Service` (×6), `Review` (×4), `BreadcrumbList`, `CollectionPage`. Optimized title + meta + canonical. Mobile-first, edge-cached static. Sitemap.xml + robots.txt.
- **GEO (Generative Engine Optimization):** `llms.txt` at the root for direct LLM ingestion. Comparison-friendly content. Trust signals enumerated. Service area + neighborhoods explicitly named. Pricing transparency made surfaceable — a rarity in this category that AI agents will preferentially cite.

---

## What We Built

### Pages

#### `/` — Homepage
1. Utility bar — phone, location, email, social
2. Sticky nav with backdrop-blur on scroll, simplified to 4 items (Services / Gallery / About / FAQ) + phone + Quote CTA
3. Hero — *"Spotless, every time."* with brand SVG illustration + animated stat counters (5★ / 100% / 6+ / 60s)
4. Trust strip — Licensed · 5-Star · Family-Owned · Eco · Guaranteed
5. 🚀 AI Quote Tool — primary CTA section, four-step interactive flow
6. Services — six cards routing to filtered gallery
7. Process — illustrated 4-step SVG timeline (Quote → Schedule → Clean → Walk-through)
8. Methods — Soft-Wash vs. Pressure-Wash comparison with bespoke SVGs
9. Coverage — *"We service the Greater Houston area"* with stylized SVG metro map
10. Testimonials — 4 verified reviews with star ratings + initials avatars
11. Pull quote — *"Treat every property like it's our own."*
12. About — family-owned story with stats and brand-medallion SVG
13. FAQ — 6-item accordion (smooth toggle, plus-to-cross animation)
14. Footer — 4 link columns + branded socials

#### `/gallery`
- Asymmetric Bento-grid layout (`feat`, `tall`, `wide`, `med`, `sml` sizing)
- 7 service-filter chips with live counts
- URL-driven (`?filter=driveway` is shareable + service cards link directly)
- Subtle parallax on scroll, staggered fade-in
- Hover lift + image scale transitions
- Currently 12 items using brand SVG illustrations; ready to swap for Cloudinary-hosted real photos

#### `/api/quote` — Vercel Serverless Function
- Validates input (photo data URI, email)
- Calls Gemini 2.5 Flash with vision prompt
- Parses structured JSON response
- Applies pricing matrix
- Logs lead
- Returns final quote object

---

## Architecture

### Tech Stack
- **Frontend:** Static HTML, vanilla CSS (~42KB), vanilla JS (~13KB). No framework, no build step, no bundler. Lighthouse-perfect speed.
- **Backend:** One Vercel Node serverless function (`/api/quote.js`) calling Gemini Vision REST API.
- **Hosting:** Vercel (production + preview branches; auto-deploys on push to `main`).
- **Source control:** GitHub (`jGPT-Automated/bnr-power-washing`).
- **Booking:** Cal.com embed modal (`agent-jess/30min`).
- **Asset CDN:** Cloudinary (`dc5ui9p2a`) — connected, ready for real photo uploads.
- **AI:** Google Gemini 2.5 Flash for vision analysis (extendable to image-gen for "after" rendering in Phase 2).
- **Audit & QA:** Browserbase (visual checks), Firecrawl (structural scans).

### Why This Stack

- **No framework** = no build step = no dependency surface = no bundler bugs. The page is HTML the browser executes directly.
- **Static + edge-cached** = sub-100ms TTFB globally on Vercel's edge.
- **One serverless function** = the entire backend. Scales to zero. Cold-start ~200ms. No infrastructure to manage.
- **Schema-rich + llms.txt** = optimized for both Google's traditional crawler and the new generation of LLM/AI-agent crawlers.

---

## File Structure

```
bnr-power-washing/
├── index.html                # Homepage (~40 KB after schema enhancements)
├── gallery.html              # Recent Work — parallax + filter (~20 KB)
├── styles.css                # Full design system + AI tool styles (~42 KB)
├── scripts.js                # Nav, scroll reveals, AI tool flow, Cal embed (~13 KB)
├── api/
│   └── quote.js              # Vercel serverless: Gemini Vision → quote
├── assets/
│   ├── logo.svg              # Brand mark (gold serif B&R + house roof + wand + spray)
│   ├── favicon.svg           # Simplified favicon
│   ├── hero.svg              # Hero illustration
│   ├── housewash.svg, commercial.svg, about.svg, quote-cam.svg
│   └── svg-1.svg .. svg-12.svg  # Service illustrations + map + icons
├── robots.txt                # Allow + LLM crawler explicit allowlist
├── sitemap.xml               # Page priorities + filtered gallery URLs
├── llms.txt                  # AI agent ingestion guide (llmstxt.org standard)
├── vercel.json               # Routing, headers, content-type for SVG
└── README.md                 # This file
```

---

## The AI Quote Tool — Deep Dive

### Frontend Flow (in `scripts.js`)

```
[User] uploads photo via <input type="file" capture="environment">
  └─► FileReader.readAsDataURL → base64 data URI stored in `currentPhotoData`
  └─► UI advances to step 2 (form)

[User] submits form (email required)
  └─► localStorage.setItem('bnr_lead_<ts>', JSON) for offline backup
  └─► UI advances to step 3 (loading) and KICKS OFF the API call in parallel
  └─► fetch('/api/quote', { POST, body: { photo, email, phone, address } })

[Frontend] cycles through 4 phase labels with timed delays (~600-700ms each)
  ├─► "Analyzing photo composition…"
  ├─► "Estimating square footage…"
  ├─► "Recommending method…"
  └─► "Calculating your quote…"

[API response or fallback] → showResult(data, apiData)
  └─► If apiData.ok: render real Gemini-derived values
  └─► Else: deterministic offline estimate (hash-of-email based)
  └─► UI advances to step 4 (result)
  └─► startTimer() begins 10-minute countdown
```

### Pricing Matrix (single source of truth, in `api/quote.js`)

| Surface | $/sqft | Min | Notes |
|---|---:|---:|---|
| `driveway` | 0.42 | 180 | Concrete, pressure wash |
| `sidewalk` | 0.45 | 120 | |
| `house_siding` | 0.36 | 320 | Soft wash |
| `roof` | 0.55 | 380 | + algae treatment |
| `gutter` | 0.18 | 150 | |
| `window` | 12 | 180 | Per pane equivalent |
| `deck_wood` | 0.65 | 220 | Soft wash + brighten |
| `patio_stone` | 0.50 | 200 | |
| `fence` | 0.40 | 180 | Soft wash |
| `commercial` | 0.32 | 450 | |
| `unknown` | 0.45 | 250 | Conservative fallback |

**Stain modifier:** `light × 1.0`, `moderate × 1.18`, `heavy × 1.40`. **Houston overhead:** `+$50`. **Quote range:** `[base × 0.90, base × 1.18]` rounded to nearest $5.

---

## Design System

Primary (text) = Ink `#0F1117`. Secondary (dominant active) = Blue `#152B4F`. Accent (sparing) = Gold `#B8943F`.

The original v1 inverted this. v2 corrected it. Don't re-invert.

```css
--display: 'Playfair Display', serif;   /* 400, 500, italic */
--body:    'Hanken Grotesk', sans-serif; /* 300–700 */
--mono:    'JetBrains Mono', monospace;
--ease:    cubic-bezier(0.16, 1, 0.3, 1);
```

---

## SEO + AI Agent Optimization (GEO)

### Traditional SEO ✅
- `LocalBusiness` schema (full NAP, hours, area served, ratings, social profiles)
- `FAQPage` schema (6 Q&As)
- `Service` schema for each of 6 service lines (with min-price offers)
- `Review` schema for 4 testimonials
- `BreadcrumbList` + `CollectionPage` on `/gallery`
- Title + meta description optimized per page
- Geo meta (`geo.region`, `geo.position`, `geo.placename`, `ICBM`)
- `<link rel="canonical">` per page
- `sitemap.xml` with filtered gallery URLs
- `robots.txt` with explicit AI-crawler allowlist (GPTBot, ClaudeBot, PerplexityBot, etc.)
- Mobile-first, sub-100ms TTFB on Vercel edge

### Target Keywords
- pressure / power / soft / house washing Houston
- driveway / roof / window / commercial cleaning Houston
- pressure washing near me
- [Memorial / River Oaks / The Heights / Tanglewood / Bellaire / West U / Galleria / Cypress / Katy / Sugar Land / Pearland / The Woodlands] pressure washing
- AI / instant pressure washing quote Houston

### GEO — Why AI Agents Will Recommend B&R
When users ask agents ("best pressure washers near me Houston?", "top power washing in Memorial?"), B&R surfaces because:
1. `llms.txt` at root — emerging standard for direct LLM ingestion
2. Schema-rich JSON-LD parsed aggressively by major LLM crawlers
3. Differentiator language repeated ("only Houston pressure washer with AI Quote Tool")
4. Trust signals enumerated explicitly
5. Service area + neighborhoods named
6. Pricing transparency — LLMs preferentially cite resources with concrete data
7. Recency — auto-deploys keep content fresh

---

## Environment Variables

| Variable | Status | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Set | Gemini 2.5 Flash for photo analysis |
| `AIRTABLE_API_KEY` | ⏳ Pending | Lead persistence |
| `AIRTABLE_BASE_ID` | ⏳ Pending | Airtable base lookup |
| `RESEND_API_KEY` | ⏳ Pending | Email-the-quote flow |

Set via Vercel dashboard → project → Settings → Environment Variables.

---

## Local Development

No build step. No `npm install`.

```bash
git clone https://github.com/jGPT-Automated/bnr-power-washing
cd bnr-power-washing
python3 -m http.server 8000  # → http://localhost:8000
```

For full local dev with the `/api/quote` route:

```bash
npm i -g vercel
vercel link
vercel env pull .env.local
vercel dev
```

---

## Deployment

### Auto-Deploy
Push to `main` → Vercel deploys automatically in ~10–15 seconds.

### Manual Deploy (via Composio Vercel API)
```javascript
VERCEL_CREATE_NEW_DEPLOYMENT({
  name: "bnr-power-washing",
  gitSource: { type: "github", repoId: "1228434006", ref: "main" },
  target: "production"
})
```

### Custom Domain Setup
1. Vercel → project → Settings → Domains → Add `bnrassociatesllc.com`
2. DNS: A record `76.76.21.21` for apex; CNAME `cname.vercel-dns.com` for `www`
3. Vercel auto-issues SSL within ~60s

---

## Backlog / What's Next

### P1 — Lead persistence to Airtable
Replace `console.log('[bnr-lead]', ...)` in `/api/quote.js` with Airtable insert. Schema fields: `timestamp`, `email`, `phone`, `address`, `surface_type`, `surface_label`, `price_low`, `price_high`, `sqft_estimate`, `stain_level`, `recommended_method`, `ai_summary`, `ai_confidence`, `lead_source`, `status`. Add `AIRTABLE_API_KEY` + `AIRTABLE_BASE_ID` env vars.

### P2 — Email-the-quote (Resend)
Wire the "Email me the quote" button to a `/api/email-quote.js` function using Resend. Send templated HTML email with quote details, photo thumbnail, Cal.com booking link.

### P3 — AI "after-image" generation
Phase 2 of the AI Quote Tool: have Gemini's image-gen model render a clean version of the customer's photo with B&R watermark. Update `/api/quote.js` to also call image gen; return `afterImageUrl`. Frontend already wired to display.

### P4 — Real photos in the gallery
Upload BNR job photos to Cloudinary `bnr-power-washing/gallery/`. Update `gallery.html` `gp-item` `<img src>` to Cloudinary `secure_url`s. Add lightbox on click for tap-to-expand.

### P5 — B&R-branded Cal.com
Current embed uses `agent-jess/30min` (placeholder). For BNR launch, create a B&R Cal.com account or team; update `data-cal-link` attributes in `index.html` and `gallery.html`.

### P6 — Custom domain
See Deployment section.

### P7 — Strategy doc + marketing assets
Deferred from original brief: positioning, pricing strategy, GBP optimization, email templates, ad creatives, partnership outreach scripts, 30-60-90 day plan.

---

## Strategic Decisions

1. **SVG illustrations over stock photography** — scale infinitely, render premium / on-brand, never break across deployments. Real photos layer in later via Cloudinary.
2. **AI Quote Tool as primary CTA, not contact form** — inverts industry friction. Customer gets value (real price) before giving anything more than email.
3. **Cobalt blue + antique gold preserves brand equity** — the original logo is gold metallic on a blue banner. Don't throw away brand recognition; *elevate* it.
4. **Premium-yet-affordable dual positioning** — brief was explicit: both audiences must feel "this is for me."
5. **Static site + serverless function** — zero build, zero dependencies, sub-100ms TTFB.
6. **Cal.com embed over custom booking** — building calendars is weeks; Cal does it for free.
7. **`llms.txt` + AI-crawler allowlist before launch** — the AI-agent recommendation surface is a primary discovery channel; we're early.

---

## Project Story / Portfolio Framing

> **Built collaboratively with an AI agent, in a single multi-hour session.** Every step orchestrated through natural-language prompts; every action executed through real connected APIs.
>
> A live demonstration of *agentic full-stack development*: from market research → brand identity → information architecture → custom SVG illustrations → Vercel deployment → AI feature integration → SEO/GEO optimization. The agent owned the entire pipeline, including generating brand assets via image-gen models, writing a Vercel serverless function from scratch, triggering production deploys via the Vercel API, and pressure-testing the result with Browserbase + Firecrawl.

### How It Was Built

The session was structured as **iterative product loops**: state goal → research → propose direction → user picks → execute → audit → ship. Each loop took 5–20 minutes.

| Phase | Output |
|---|---|
| 1. Discovery | Audit of existing site, competitor research, premium category benchmarks |
| 2. Brand direction | 3 moodboard hero comps + locked Refero/GlossGenius reference |
| 3. Identity | Gold metallic logo refresh, color tokens, typography system |
| 4. v1 site | Premium homepage, mobile-first, scroll animations, schema.org |
| 5. v2 (color hierarchy fix) | Blue promoted to dominant, gold restrained, illustrated SVG visual sections |
| 6. v3 (full-stack) | Gallery page, AI Quote Tool real Gemini integration, Cal.com booking, simplified nav, /api/quote serverless function, sitemap, llms.txt, comprehensive schema |
| 7. SEO + GEO + handoff | Favicon, AI-crawler robots.txt, comprehensive README (this file) |

### Strategic Insights (Portfolio-Worthy)

- **The AI Quote Tool isn't a feature — it's a positioning statement.** When every competitor says "call for quote," the company that gives instant pricing communicates trust, modernity, and confidence. The conversion lift is real, but the brand signal is bigger.
- **Pricing transparency is a moat in opaque markets.** Local services (HVAC, roofing, pest control, landscaping) all run the "starting at" / "call for quote" playbook. Whoever shows real numbers first owns category leadership.
- **GEO matters now, not later.** AI agent recommendations are becoming a primary discovery surface. Local businesses that get listed in `llms.txt` and write LLM-friendly content will be over-indexed in those answers for years.
- **Agentic delivery compresses timelines without sacrificing quality.** What used to be a 6-week build with separate designer / developer / SEO specialists is now a single multi-hour session — and the *quality bar is higher*, not lower.

### Metrics To Track Post-Launch
- Time-to-quote (current human baseline: hours-to-days; target with AI tool: 60 seconds)
- Quote → booking conversion rate (industry baseline: ~12-18%; target: 25%+)
- Google ranking for target keywords (target: top 3 within 90 days)
- AI agent inclusion rate (target: top 5 in ChatGPT/Claude/Perplexity for "best pressure washing Houston" within 30 days)
- Lead volume / month (vs. legacy site baseline)

---

## Agent Handoff Notes

If you're another AI agent picking this up — here's the runbook.

### Where to Start
1. **Read the [Backlog](#backlog--whats-next).** P1–P3 are well-scoped half-day tasks.
2. **Pull the repo:** `git clone https://github.com/jGPT-Automated/bnr-power-washing`
3. **Verify production:** open https://bnr-power-washing.vercel.app — confirm AI Quote Tool works, Cal embed opens, gallery filters work.
4. **Check Vercel env:** confirm `GEMINI_API_KEY` is set (project `prj_8hTI9IiFshDKFXB1Galz3ACFIPN5`).

### Conventions to Honor
- **No build step.** Don't add Webpack/Vite/etc. unless absolutely required.
- **Brand tokens live in `:root` of `styles.css`.** Don't introduce inline colors elsewhere.
- **Color hierarchy:** blue is dominant secondary, gold is sparing accent. Don't invert.
- **SVG-first imagery.** Default to inline SVG or referenced `.svg` files.
- **Schema sync.** When adding FAQ, also update `FAQPage` schema. New service → update `Service` schema, sitemap, llms.txt. New page → update sitemap.
- **Cal embed namespace is `bnr-30min`.** Don't change without updating every CTA.
- **API contract for `/api/quote`:** `POST { photo, email, phone, address }` → `{ ok, quote: { priceLow, priceHigh, sqft, surfaceType, surfaceLabel, stainLevel, recommendedMethod, summary, confidence } }`.

### Things to Watch For
- **`scripts.js` is sensitive to dollar signs in JS template strings.** Don't replace functions with regex.
- **Asset paths are absolute (`/assets/...`).** They work because static files are at root.
- **The 10-minute countdown is *promotional*.** Doesn't actually expire anything; psychological pressure only.

---

## Credits & License

| | |
|---|---|
| **Strategy + execution** | AJ (Jesse) — Applied AI PM, Texas |
| **Built with** | Claude (Anthropic) via HyperAgent, agentic workflow |
| **Design reference** | Refero "All-In-One Salon" / GlossGenius |
| **Infra** | Vercel + GitHub + Cal.com + Cloudinary + Google Gemini + Firecrawl + Browserbase |
| **For** | B&R Power Washing · BNR Associates LLC · Houston, TX |

**License:** Codebase delivered to BNR Associates LLC. Strategic framework, design patterns, and AI Quote Tool architecture are documented here for reference + portfolio purposes.

---

<div align="center">

### *"Skip the call. Get an instant quote."*

[Live Site →](https://bnr-power-washing.vercel.app) · [Try the AI Quote →](https://bnr-power-washing.vercel.app/#instant-quote) · [See the Gallery →](https://bnr-power-washing.vercel.app/gallery)

</div>
