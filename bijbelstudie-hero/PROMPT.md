# Task: rebuild the homepage hero of bijbelstudie.io

You are working in the existing BijbelStudie codebase (bijbelstudie.io). Replace the current homepage **hero section** with the approved new design described below. Everything else on the page stays as it is.

Files in this folder:

| File | What it is |
|---|---|
| `reference/hero-desktop.png` | Screenshot of the approved desktop design at 1440 × 900. **This is the visual target for desktop.** |
| `reference/hero-desktop.html` | Static HTML/CSS of that exact design. Use it for exact sizes, colors and spacing. It is a reference, not production code. |
| `reference/hero-mobile.png` | Screenshot of the approved mobile design at 390 px wide (2×). **This is the visual target for mobile.** |
| `reference/hero-mobile.html` | Static HTML/CSS of the mobile design. |
| `assets/app-store-badge.png` | Official Apple "Download on the App Store" badge (800 × 238). |
| `assets/screenshot-lezer-commentaar.png` | Product screenshot: Genesis 7 reader with Matthew Henry commentary. |
| `assets/screenshot-studies-overzicht.png` | Product screenshot: the studies overview. |
| `assets/genesis-cover.png` | Low-res crop of the Genesis study cover, used on mobile. Replace it with the original image from the app. |

## Ground rules

1. **Use the project's existing stack, components, fonts and design tokens.** Do not paste the reference HTML in as-is. Rebuild it with the site's own conventions (framework, CSS approach, button components, and so on).
2. **Navbar: do not change it.** The only change is adding one link, **"Studies"**, as the first item before "Prijzen". It links to the existing studies page. Keep everything else in the navbar exactly as it is, including logo, "Inloggen" and "Gratis beginnen".
3. Only touch the hero. Do not change sections below it.
4. All copy is Dutch and must be used **exactly** as written below.
5. Match the screenshot closely on desktop. Follow the responsive rules below for smaller screens.

## Layout overview (desktop, 1440 px wide)

From top to bottom:

1. **Promo banner:** full width, 48 px high, dark green.
2. **Navbar:** existing, plus the "Studies" link.
3. **Hero section:** fills the rest of the first screen (about 100vh minus banner and navbar).
   - **Left column** (fixed 540 px wide, starts at the page's normal left content edge, 120 px on a 1440 screen), vertically centered, stacked with 24 px gaps:
     eyebrow → H1 → subtitle → button row → divider + reviews row.
   - **Right side:** the product visual. It takes the remaining width and is allowed to **bleed off the right edge of the viewport** (clipped, no horizontal scroll). There's 64 px gap between the columns.
   - **Scroll hint:** a small round arrow button, centered horizontally, 22 px from the bottom of the hero.

## 1. Promo banner

- Background `#0b3f37`, height 48 px. Contents centered in one row, gap 20 px, font size 15 px.
- Contents, left to right:
  1. **"BijbelStudie Pro 7 dagen gratis"** (white, weight 800), followed directly by **" · alle commentaren en de grondtekst"** (color `#a9d8ca`, normal weight).
  2. A 1 × 20 px vertical divider, `rgba(255,255,255,0.2)`.
  3. "Actie eindigt over" (14 px, `#a9d8ca`) + the live countdown **`12d 09u 17m 22s`** (white, weight 800, `font-variant-numeric: tabular-nums`).
  4. Text link **"Probeer Pro →"**: white, 14 px, weight 700, no button styling. It has a 1 px bottom border `rgba(255,255,255,0.45)` and an arrow icon. It links to the Pro/pricing page.
- **Countdown behavior:**
  - Counts down every second to a **fixed end date** that comes from config or an environment variable (for example `PROMO_END = "2026-09-30T23:59:00+02:00"`). Don't hardcode it deep in a component.
  - Format: `{days}d {hh}u {mm}m {ss}s`. Hours, minutes and seconds are zero-padded; days are not.
  - When the end date has passed, **hide the entire banner**. Never reset or loop the timer. Fake urgency is not allowed.
  - Render it hydration-safe: no server/client mismatch. For example, render a placeholder on the server and start the timer on the client.
  - Also make the whole banner easy to switch off with a config flag (`PROMO_ENABLED`).

## 2. Navbar

Existing component. Add **"Studies"** as the first nav link. Nothing else changes.

## 3. Left column (copy and styling)

| Element | Content | Style |
|---|---|---|
| Eyebrow | `Voor iedereen die de Bijbel dieper wil leren kennen` | 13 px, weight 700, uppercase, letter-spacing 0.12em, color `#0b5f52` |
| H1 | `Begrijp wat je leest in de Bijbel.` The word **"Begrijp"** is green `#0d7a66`, the rest `#0f172a`. | 64 px, weight 800, line-height 1.04, letter-spacing −0.035em, `text-wrap: balance`. On desktop it breaks into 2 lines: "Begrijp wat je / leest in de Bijbel." |
| Subtitle | `Lees de tekst en het commentaar naast elkaar, met de grondtekst en je eigen notities één klik verder.` | 20 px, line-height 1.55, color `#475569`, max-width 520 px |
| Button row | See below | Flex row, gap 12 px |
| Reviews row | See below | Top border 1 px `#e6e9e7`, padding-top 22 px, full column width |

### Button row: two buttons of **exactly equal size (202 × 60 px)**

1. **Primary:** "Start gratis →"
   - Background `#0d7a66` (hover `#095c4d`), white text 17 px weight 700, radius 10 px, arrow icon 17 px after the text, gap 10 px.
   - Shadow `0 10px 24px -8px rgba(13,122,102,0.55)`.
   - Links to the existing sign-up / "start" flow, the same target as "Gratis beginnen" in the navbar.
2. **App Store badge:** `assets/app-store-badge.png` shown at 202 × 60 px, wrapped in a link to `https://apps.apple.com/nl/app/bijbelstudie-lees-leer/id6800668187`.
   - `aria-label="Download BijbelStudie in de App Store"`.
   - Do not restyle or recolor the badge (Apple's rules). If available, you may swap in Apple's official Dutch badge ("Download in de App Store") at the same height.

### Reviews row

- Left: 5 overlapping round avatars, 40 × 40 px, 2.5 px border in the page background color, −12 px overlap.
- Right, two lines:
  - Line 1: five gold stars (`#e0a526`, 15 px) + the average rating in bold `#0f172a`.
  - Line 2: "`{count}` beoordelingen in de App Store" (14 px, `#475569`).
- **Important: use only real data.** Build this as a component that takes `rating`, `count` and `avatars[]` as props or config. The app has too few App Store ratings right now for an average, so:
  - Until real values are provided, **do not render the reviews row at all**. Do not ship placeholder numbers or invented reviews.
  - Avatars must be real reviewers' photos, used with their permission. If there's no photo, use a neutral fallback: a tinted circle with a person silhouette, like in the reference.

## 4. Right side: product visual

A composition of two browser-window frames with real product screenshots, plus one floating card. It sits in a `position: relative` box 600 px high, vertically centered next to the text.

**Browser frame style (used twice):**
- White background, 1 px border `#dfe5e2`, radius 14 px, `overflow: hidden`, shadow `0 30px 60px -26px rgba(15,42,36,0.35)`.
- 30 px top bar with background `#f4f6f5` and bottom border `#e6ebe9`.
- The top bar holds three 9 px grey dots (`#d5dbd8`) and a small white pill reading "bijbelstudie.io" (11 px, `#64748b`).
- The image goes below the bar, `width: 100%`, `height: auto`.

**Placement inside the visual box** (desktop):
1. **Back frame:** `screenshot-studies-overzicht.png`, 640 px wide, at `left: 150px; top: 0`. It runs off the right edge of the viewport.
2. **Front frame:** `screenshot-lezer-commentaar.png`, 620 px wide, at `left: 0; top: 196px`. It overlaps the back frame.
3. **Floating "Les van vandaag" card:** at `left: 470px; top: 36px`, 210 px wide.
   - White, 1 px border `#e3e8e5`, radius 16 px, padding 16 px, shadow `0 24px 48px -20px rgba(15,42,36,0.4)`, vertical stack with 10 px gap.
   - Header row: "LES VAN VANDAAG" (10.5 px, weight 700, uppercase, letter-spacing 0.08em, `#64748b`) on the left, "± 15 min" (11 px, weight 600, `#64748b`) on the right.
   - Seven steps (13 px), each with an 18 px status circle and a 10 px gap. The steps in order:
     1. Inleiding: done
     2. Bijbelse context: done
     3. Het Woord lezen: done
     4. Verdieping: **current**
     5. Toetsing: to do
     6. Reflectie: to do
     7. Gebed: to do
   - Status styles:
     - Done: filled `#0d7a66` circle with a white check; text `#334155`, weight 500.
     - Current: white circle with a 3 px `#0d7a66` border; text `#0f172a`, weight 700.
     - To do: 2 px `#cbd5d1` border circle; text `#64748b`.
   - This card is decorative. Mark it `aria-hidden="true"`, or give it a sensible label.

Use optimized images: WebP/AVIF, 2× resolution for sharpness, and `alt` texts:
- Studies frame: "Het studie-overzicht van BijbelStudie met 76 studies"
- Reader frame: "Genesis 7 in de Statenvertaling met het commentaar van Matthew Henry ernaast"

Load hero images eagerly: they are above the fold, so they matter for LCP.

## 5. Scroll hint

- 32 px circle with a 1.5 px `#cfd8d4` border and a 14 px down-arrow icon (`#475569`). No text.
- Centered, 22 px from the bottom of the hero.
- Gently bobs up and down (translateY 0 → 5px, 1.8s ease-in-out, infinite). Disable the bob under `prefers-reduced-motion`.
- It's a link to the next section ("Zo werkt een les" / "Vijf stappen…"), with smooth scroll and `aria-label="Scroll naar: zo werkt een les"`.

## Colors and type (summary)

- Page background `#fbfbf8`. Navbar background white with a bottom border `#edf0ee`.
- Brand green `#0d7a66` (hover `#095c4d`), dark green `#0b5f52`, banner `#0b3f37`, mint text `#a9d8ca`.
- Text `#0f172a`, body `#475569`, secondary `#334155`, muted `#64748b`.
- Font: **Inter** (400/500/600/700/800), or the site's existing Inter setup.

## Responsive behavior

- **≥ 1280 px:** as described above.
- **1024–1279 px:**
  - Left column shrinks to about 460 px and the H1 goes to about 54 px.
  - Scale the visual box down proportionally, for example with `transform: scale()` on a fixed-size inner box, so the composition keeps its proportions.
- **< 1024 px (tablet and mobile):** follow the approved mobile design in **`reference/hero-mobile.png`** and **`reference/hero-mobile.html`** (390 px viewport).
  - **Banner:** two centered lines, 13 px, padding 10 × 20 px.
    - Line 1: "**Pro 7 dagen gratis**" + " · nog " (mint `#a9d8ca`) + the countdown in bold white.
    - Line 2: the "Probeer Pro →" text link.
    - Never hide the end date.
  - **Navbar:** use the site's **existing** mobile navbar and menu. The hamburger in the reference is only a stand-in. Make sure "Studies" is also in the mobile menu.
  - **Hero:** single column, padding 28 px 20 px, 18 px gaps. Order: eyebrow (11 px) → H1 (42 px, line-height 1.05; `clamp(40px, 7vw, 64px)`) → subtitle (17 px) → buttons → reviews → visual.
  - **Buttons:** stay **side by side** in a 2-column grid with 10 px gap, both 52 px high and equal width. "Start gratis →" is on the left at 16 px, and the App Store badge is on the right, scaled to 52 px high.
  - **Reviews row:** 34 px avatars (−10 px overlap), 13 px stars and text.
  - **Visual:** on mobile, **do not use the desktop screenshots** (they are unreadable at this size). Hide both browser frames and the large "Les van vandaag" card.
    - Instead, show one **compact lesson card** at full content width. It's white, with a 1 px border `#e3e8e5`, 16 px radius, 14 px padding, 12 px gaps and shadow `0 18px 36px -22px rgba(15,42,36,0.4)`. It's decorative, so mark it `aria-hidden="true"`.
    - Row 1: a 48 × 48 px thumbnail of the Genesis study cover (radius 10 px, `object-fit: cover`), then "Genesis" (15 px, weight 700) with "Les 8 van 50 · ± 15 min" (12.5 px, `#64748b`) below it. On the right, a pill "Stap 4 van 7" (11 px, weight 700, `#0b5f52` on `#e6f4f0`). Use the **original Genesis cover image from the app**; `assets/genesis-cover.png` is only a low-res reference crop.
    - Row 2: a segmented progress bar with 7 equal segments, 6 px high and 4 px gaps. Segments 1–3 are `#0d7a66` (done), segment 4 is `#7fcab5` (current), segments 5–7 are `#e3e8e5`.
    - Row 3, at 12.5 px: "Het Woord lezen ✓" (`#64748b`, green check) on the left and "Nu: Verdieping" (weight 700, `#0f172a`) on the right.
  - Hide the scroll hint on mobile.
- **No horizontal scrollbar** at any width. The hero clips the bleeding visual with `overflow-x: clip` (or hidden).

## Accessibility

- Real `<a>`/`<button>` elements. Visible focus styles. Contrast is at least 4.5:1 (all colors above pass).
- One `<h1>` on the page: this one.
- The countdown is not announced every second: no `aria-live`. Optionally give it an `aria-label` like "Actie eindigt op 30 september".

## Acceptance checklist

- [ ] At 1440 × 900, the hero visually matches `reference/hero-desktop.png`.
- [ ] At 390 px, the hero visually matches `reference/hero-mobile.png`.
- [ ] Navbar unchanged except for the new "Studies" link.
- [ ] Only one primary button ("Start gratis") plus the App Store badge, both 202 × 60 px.
- [ ] Countdown uses a configured real end date, hides the banner after it, and never resets.
- [ ] The reviews row only renders with real rating, count and avatar data.
- [ ] No horizontal or vertical scrollbars caused by the hero. The first screen fits 100vh on desktop.
- [ ] Works at 390 px (mobile), 768 px, 1024 px, 1280 px and 1440 px+.
- [ ] Lighthouse: no layout shift from the images (set width/height or aspect-ratio).
