# Aivoryx

Marketing site for Aivoryx — custom websites, web apps and mobile apps for local
businesses and startups.

Plain HTML, CSS and JavaScript. No build step, no framework, no dependencies.
Open it, edit it, upload it.

## Structure

```
Aivoryx/
├── index.html              Homepage
├── work.html               Case studies, with each build's mechanism rebuilt live
├── services.html           Six services + the scope builder that prices your build
├── process.html            The fifteen-day build, opened up day by day
├── pricing.html            Three tiers, a comparison table and the break-even chart
├── tools.html              Five free tools, and the service each one demonstrates
├── 404.html                Not-found page
├── robots.txt
├── sitemap.xml
├── site.webmanifest
├── api/                    The only server-side code in the project
│   ├── send.php            Enquiry endpoint: validates, emails the inbox, auto-replies
│   ├── mailer.php          Small SMTP client, falling back to the server's mail()
│   └── config.example.php  Template — copy to config.php ON THE SERVER and fill in
└── assets/
    ├── css/
    │   ├── tokens.css      Design tokens: colour, type scale, spacing, easing
    │   ├── base.css        Reset, document base, typography roles, motion primitives
    │   ├── components.css  Buttons, nav, ticker, browser frame, form, sub-page shell
    │   ├── sections.css    Hero, work, services, why, process, pricing, contact, footer
    │   ├── work.css        Work page only
    │   ├── services.css    Services page only
    │   ├── process.css     Process page only
    │   ├── pricing.css     Pricing page only — carries the chart's series colours
    │   └── responsive.css  All media queries: 1280 / 1024 / 760 / 480, reduced motion, print
    ├── js/
    │   ├── config.js       Phone, email, WhatsApp number — edit this first
    │   ├── utils.js        Shared helpers + the module registry
    │   ├── contact.js      Paints config values into the markup
    │   ├── nav.js          Smooth scroll, sticky nav, scroll spy, progress, parallax
    │   ├── reveal.js       Scroll reveals, counters, ticker, magnetic buttons
    │   ├── form.js         Quote form validation → POST to api/send.php
    │   ├── constellation.js  Hero canvas — particles assembling into the logo
    │   ├── work.js         Work page — the live rebuilt demos
    │   ├── services.js     Services page — scope builder and pricing table
    │   ├── process.js      Process page — the day-by-day scrubber
    │   ├── pricing.js      Pricing page — the break-even chart
    │   └── main.js         Boot: runs every registered module
    └── img/                Favicon, social cover, future screenshots
```

Each page loads only the stylesheet and script it needs, on top of the four shared
CSS files. Pricing lives in `services.js`; the fifteen days and everything handed
over live in `process.html` itself, and `process.js` sums the totals from the markup
so the copy can never disagree with the data.

CSS files load in that order and the order matters — tokens before everything,
responsive last.

JS files use a tiny registry: each file calls `AX.module(fn)`, and `main.js` runs
them in load order. A module that throws is logged and skipped; the rest still run.

## Running it locally

Double-clicking `index.html` works. For a proper local URL:

```powershell
# Python
python -m http.server 5500

# or Node
npx serve .
```

Then open <http://localhost:5500>.

## Before going live

1. ~~**`assets/js/config.js`** — WhatsApp number, phone and email.~~ Done:
   `+91 93995 93499` / `pradeep952025@gmail.com`. Everything on the page reads
   from here, so change it in one place if it ever moves.
2. **`index.html`** — replace `https://aivoryx.com/` in the canonical tag, the Open
   Graph tags and the JSON-LD block with the real domain.
3. **`sitemap.xml`** and **`robots.txt`** — same domain swap.
4. **`assets/img/`** — add `og-cover.png` (1200×630), `apple-touch-icon.png` (180×180),
   `icon-192.png` and `icon-512.png`. The SVG favicon is already there.
5. Analytics snippet, if you want one, goes just before `</body>` in `index.html`.

## Responsive behaviour

| Width | What changes |
|---|---|
| > 1280px | Full layout: two-column hero, side-by-side work items, 4-across process, 3-across pricing |
| ≤ 1280px | Display type steps down |
| ≤ 1024px | Hero stacks (canvas on top), work items stack, process → 2 columns, pricing and contact → 1 column, parallax off |
| ≤ 760px | Full-screen burger menu, service descriptions hidden, form → single column, WhatsApp button collapses to the icon |
| ≤ 480px | Tighter spacing, full-width buttons, hero meta stacks |

Also handled: short landscape phones, coarse pointers (hover effects dropped),
`prefers-reduced-motion`, and print.

## Text under the headlines

Headlines are fine as they are. Everything below them (subtitles, descriptions,
lists, labels) used to be Inter 200 at 10–14px in near-black greys, and on a
black page it disappeared. Those roles now have floors in `tokens.css`, and
every rule should use one of them instead of its own `px`:

| Role | Token | Size | Weight | Colour |
|---|---|---|---|---|
| Lede — the paragraph that answers a headline | `--t-lede` | 17→20px | `--fw-xl` (300) | `--mist` |
| Card copy, story paragraphs, row descriptions | `--t-text` | 16.5px | `--fw-xl` (300) | `--mist` |
| List items, notes | `--t-small` | 15px | `--fw-xl` (300) | `--mist` / `--ash` |
| Captions, chips, small print | `--t-caption` | 13px | `--fw-text` (400) | `--ash` |
| Uppercase / mono labels | `--t-label` | 12px | `--fw-label` (500) | `--ash` or an accent |

The tokens grow at 1600 and 1920 in `responsive.css`, so nothing needs its own
large-screen override.

Rules:

- Nothing that carries words is set below 11px, or in a grey darker than
  `--dim` (`#8a8a8a`). Darker greys are for rules and icons only.
- Text at 14px or under is never `--fw-xl`: light strokes break up that small.
- Descriptions are `--mist`, not `--ash`. `--ash` is for the secondary half of
  a pair, such as "what's not included".
- Violet as text uses `--iris-ink`. A per-item `--c` colouring words is mixed
  toward white first: `color:color-mix(in srgb,var(--c) 65%,#fff)`.
- `p`, `li` and `dd` wrap with `text-wrap:pretty` (no lone last word), and a
  section-head lede uses `balance`.
- `.secHead` sizes its title column to the title, so a two-line headline stays
  on two lines and its lede sits beside it, not under a four-line stack.

Done: **home, work, services**. Still to bring across, page by page:

- **pricing.css / process.css / tools.css**: their own 10–11px labels,
  `--fw-xl` on 13–15px text and hard-coded dark greys (`#3d3d3d` … `#6a6a6a`).
  The shared parts (ledes, captions, chips, form labels, demo panels) are
  already fixed, because they come from the shared sheets.
- **Closing band on pricing, process and tools**: the form stretches to the
  height of the copy beside it. The fix is in `services.css` under "Closing
  band"; move it into `components.css` once all three pages are checked.
- **Scroll choreography on pricing, process, tools and contact**: none of
  them use `data-sect` / `data-seq` yet, and none have the hero atmosphere
  (`.hero__atmos`). The services page shows the pattern: a `data-sect` variant
  per section, `data-seq` on grids, and first-screen rows landing on load
  with the rest landing as they're scrolled to.
