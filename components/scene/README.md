# `components/scene/` — the immersive shell

One fixed, full-bleed landscape that never moves, with the page travelling over
it. This folder is the whole apparatus: the root, the picture, the scrims, the
navbar, the rail, the depth engine and the surfaces. A page brings its content
and nothing else.

Read this before converting a page. It is short on purpose.

---

## The files

| file | what it is |
| --- | --- |
| `tokens.ts` | Every colour, surface, gutter and scrim class. Plain strings, no imports — a **server component may import it**. |
| `useSceneDepth.ts` | The scroll engine. `SceneShell` runs it; **you never call it**. |
| `SceneBackdrop.tsx` | The fixed picture + the four scrims. `SceneShell` renders it; you only choose its mode. |
| `SceneRail.tsx` | The sidebar replacement: a rail that rests at 64px, widens **into its own gutter** (96px at `lg`, 112px at `xl`) on hover/focus and becomes a pill strip below `lg`. |
| `SceneShell.tsx` | **What a page uses.** |
| `pieces.tsx` | `Panel`, `SectionHeading`, `SceneSkeleton`, `GlassStat`, `Total`, `WeekStrip`. No `"use client"` — usable from a server component. |
| `scene-svg.ts` | `sceneSvg()` and `SCENE_TREE`: the public scene, rendered to an SVG string **on the server**. Never import this from a client component. |

Motion lives in `app/globals.css`: `.scene-sky` and `.scene-horizon`.

---

## A signed-in page

```tsx
"use client"

import SceneShell from "../../components/scene/SceneShell"
import { GlassStat, Panel, SceneSkeleton, SectionHeading } from "../../components/scene/pieces"
import { EYEBROW, PANEL, TEAL_ON_DARK } from "../../components/scene/tokens"

export default function NotitiesPage() {
  const { notes, loading } = useNotes()

  return (
    <SceneShell backdrop="reader" header rail>
      {/* 1. the sky: one screen of copy set straight into the landscape */}
      <section aria-labelledby="notities-titel" className="flex min-h-[calc(100vh-3.5rem)] flex-col justify-between pb-32 pt-5">
        <div className="scene-sky max-w-[46rem]">
          <p className={EYEBROW}>Notities</p>
          <h1 id="notities-titel" className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Wat je opviel
          </h1>
        </div>
      </section>

      {/* 2. the horizon: what breaks the fold */}
      <div className="scene-horizon -mt-24">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <GlassStat label="Notities" value={loading ? null : `${notes.length}`} unit="totaal" />
        </dl>
      </div>

      {/* 3. the desk: the working panels */}
      <div className="pb-20 pt-14">
        <Panel className="p-6" labelledBy="notities-recent">
          <SectionHeading id="notities-recent" title="Recent" />
          {loading ? <SceneSkeleton className="mt-4 h-3.5 w-full" /> : <NoteList notes={notes} />}
        </Panel>
      </div>
    </SceneShell>
  )
}
```

`header` and `rail` are **off by default** and must be turned on for a signed-in
page. Both read the session, so the route needs a `SessionProvider` — every
signed-in layout already has one.

**The route's layout has to let the document scroll.** The depth engine measures
`window.scrollY`. Most signed-in layouts wrap the page in
`h-screen overflow-hidden` with an inner `overflow-y-auto`; inside one of those
the scene never moves. Strip the layout back to its providers, the way
`app/dashboard/layout.tsx` does — keep `SessionProvider` and `SidebarProvider`,
drop the wrapper, the `AppSidebar` and the `Header` (the shell draws its own).

---

## A public / signed-out page

```tsx
// no "use client" — this stays a server component
import SceneShell from "../../components/scene/SceneShell"
import { SCENE_TREE, sceneSvg } from "../../components/scene/scene-svg"
import { PANEL, SCENE_X_EDGE } from "../../components/scene/tokens"

export default function HulpbronnenPage() {
  return (
    <SceneShell svg={sceneSvg()} {...SCENE_TREE} gateId="hulpbronnen-hero">
      <section id="hulpbronnen-hero" className="flex min-h-[calc(100vh-3.5rem)] flex-col justify-center pb-32">
        <div className="scene-sky max-w-[46rem]">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Hulpbronnen</h1>
        </div>
      </section>
      ...
    </SceneShell>
  )
}
```

- `backdrop` defaults to `"static"`: the tree is rendered to an SVG **on the
  server**, so it is in the HTML of the first paint and it is what crawlers get.
  Never use `backdrop="reader"` where a session is not guaranteed — signed out it
  falls back to a level disc, which is not a landscape.
- `gateId` names the element whose visibility decides whether the live canvas
  runs. **Leave it out and the page keeps the still SVG**, which is a perfectly
  good page. A fixed full-bleed canvas never scrolls out of view, so without a
  gate nothing can ever stop the loop.
- The page keeps its own public navbar; do not pass `header`.

---

## Which surface for what

| you have | use |
| --- | --- |
| a section of working content | `<Panel className="p-6">` or the `PANEL` class on your own element |
| a long ledger, a table, an accordion | `PANEL_DEEP` — sparingly; three in a row and the scene is gone |
| **a list of records** (notes, studies, results) | **no panel.** `<SectionHeading rule action={…} />` and hairline-divided rows — see the two ledgers at the bottom of `app/dashboard/page.tsx`. A list of cards inside a panel is a box inside a box and reads as generic; type straight on the landscape does not. |
| a figure that breaks the fold | `<GlassStat>` (its surface is `TILE`) |
| a component drawn for a white page (a card with `#4B5563` captions) | `PLATE` — lay it on the scene as a lit object rather than forking it |
| a heading over a section | `<SectionHeading id=… eyebrow=… title=… action=… rule />` |
| a small label above a figure | the `EYEBROW` class |
| a waiting state | `<SceneSkeleton className="h-3.5 w-36" />` |
| the primary action on the landscape | `CTA_PRIMARY` (white pill) |
| a solid brand button inside a panel | `CTA_BRAND` + `style={{ backgroundColor: TEAL_DEEP }}` |

Colour is rationed. The dashboard's whole first screen carries exactly two teal
accents — the reader's stage line and the quiet action next to the white pill —
and everything else on it is white. Copy that ratio rather than the individual
choices: an accent marks the one thing on a screen that has earned it.

Colour, in one line each:

- `SCENE_BG` `#081A1D` — **the ground, and the only place it is written down.**
  A very dark teal-leaning slate: hue 189, between slate-900 and teal-950, so it
  shares its family with the accents that land on it instead of arguing with
  them. It replaced `#0B1220`, a cold navy that was invisible behind a landscape
  and was the whole screen on the two pages that have none. White on it measures
  18.5:1. Tailwind cannot build a class from a constant, so a page that needs the
  colour sets it through `style` — never a fresh `bg-[#…]`.
- `TEAL` `#0D9488` — brand fill, for bars, dots and rings that carry no type.
- `TEAL_DEEP` `#0F766E` — **any solid fill under white type.** White on `#0D9488`
  measures 3.74:1 and fails; on `#0F766E` it is 5.5:1.
- `TEAL_ON_DARK` `#2DD4BF` — accents and type on the scene (9.9:1 on the ground).
  Never a fill under white type.
- `VERSE_NUMBER_INK` `#BFC9CC` (11.0:1) and `ATTRIBUTION_INK` `#A6B3B5` (8.6:1) —
  the two inks the reading screens pin rather than leave on a token, because a
  superscript and a required copyright notice are where "one step quieter" must
  not become "one step unreadable".

Everything else is a literal white or black. **Never a theme token on a scene
page**: a token flips with the reader's light/dark setting and the landscape
does not.

---

## The background rule — read this before converting anything

**The bar shows what the page stands on.** The scene navbar is transparent with
its own scoped `dark`, so it shows whatever is behind it. A page therefore has
to be one of exactly two things, and it says which through `backdrop`:

| the page | `backdrop` | what the shell does |
| --- | --- | --- |
| has a landscape | `"static"` / `"reader"` | the picture runs full-bleed from the very top, the bar stays transparent over it, and the top scrims keep the bar legible over a bright sky |
| has no landscape | `"none"` | the shell paints the flat ground (`SCENE_BG`) across the whole viewport, bar included, and draws **no** scrim and **no** wash — a reading screen's type sits straight on this colour, and every contrast figure is measured on it |
| has a landscape, quietly | `"static"` / `"reader"` **+ `muted`** | the same picture, drawn faint and still with the ground's own colour laid back over it and none of the scrims — for a reading screen whose panes let the ground through (`/lezen`). The numbers and the contrast they leave are at `MUTED_PICTURE_OPACITY` in tokens.ts |

The third case is a bug, and it is the one that shipped: a picture behind the
bar and a page that paints its own opaque ground under it. On `/lezen` that put
a landscape in the top 3.5rem and flat ground everywhere else, meeting at a hard
line — two designs stitched at a seam, for a picture nobody could see any of.

So: **if a route's content covers the landscape, it takes `backdrop="none"`.**
`/studie` satisfies the rule by having no app bar at all. `/lezen` does not
cover the landscape any more — its panes are transparent — so it takes the
muted picture instead.

Both reading screens then wear `SCENE_ROOM` (tokens.ts) inside a scoped `dark`:
one object that re-points `--background`, `--card`, `--border` and the rest at
the scene's ground, so every shared component drawn for a white page — the
chapter viewer, the commentary, the grondtekst, the notes, the assistant —
lands on the night without being forked. Use it; never invent a second dark.

## The two rules

**1. Text never waits on the scene.** The picture is a background. A heading, a
paragraph or a figure renders as soon as *its own* data is there — with a
`SceneSkeleton` in the shape of what is coming while it is not. Nothing on the
page may be gated on the tree loading, and on a public page the copy must be in
the served HTML, not produced by hydration.

**2. One animated canvas per page.** The shell already owns the only one there is
allowed to be. Do not mount a `TreeCanvas`, a video loop or a Lottie in the
content on top of it. If a page needs a second tree, draw it with
`renderTreeSvg` (still) — see `lib/levensboom/svg.ts`.

---

## `SceneShell` props

```ts
backdrop?: "reader" | "static"   // default "static"
svg?: string                     // static: the server-rendered SVG
seed, level, frac, species, scene, animal, season, timeOfDay   // static: the same
                                 // tree the SVG was drawn from, for the upgrade
gateId?: string                  // static: id of the element that gates the canvas
header?: boolean                 // default false — <Header variant="scene" />
rail?: boolean                   // default false — the floating nav rail
gutter?: "rail" | "edge" | "none"// default: "rail" when rail is on, else "edge"
className?: string               // extra classes on the root
children: React.ReactNode
```

`gutter="none"` gives an unpadded content layer for a page that wants full-bleed
sections; apply `SCENE_X` (or `SCENE_X_EDGE`, or `RAIL_GUTTER` for the left inset
alone) per section yourself — **the constant, never its current value copied out
as literal classes**.

**The rail's three numbers have to agree**, and they all live together in
`tokens.ts`: `RAIL_REST` (64px) < `RAIL_WIDE` (96px at `lg`, 112px at `xl`) ≤ the
gutter (`SCENE_X`'s left inset, `RAIL_GUTTER`). That is what lets the rail float
— reserving nothing beyond the strip it already stands in — while making it
impossible for it to cover a glyph, open or shut. Both previous versions broke
one side of it: a 176px open rail over a 96px gutter ghosted over every heading,
and reserving 192/208px for it pushed every page's content a fifth of the way
across the screen. Move one of the three and you move all three.

---

## Notes for whoever comes next

- The `--lift`, `--fade` and `--veil` custom properties are public. A layer that
  wants a different distance writes its own
  `transform: translate3d(0, calc(var(--lift, 0) * -Npx), 0)`. Consume them with
  `transform` and `opacity` only — anything that triggers layout will cost a
  frame on every scroll.
- `SceneBackdrop` imports `ProgressTreeScene` from
  `components/dashboard/ProgressTree.tsx`. Do not move or delete that file.
- `components/dashboard/DailyVerseCard.tsx` is drawn for a white page. It is no
  longer on the dashboard for exactly that reason. If you put it on a scene
  page, it goes on a `PLATE` — never bare and never on a `PANEL`. `PLATE` is for
  a component you are not going to fork; it is **not** a way to make something
  important stand out. The lesson window tried that with the scripture and the
  result read as a white page dropped into a night frame.
- **Tailwind silently drops an opacity modifier that is not on its scale.** The
  scale is 0, 5, 10 … 95, 100. `text-white/78` generates *nothing at all*, the
  element inherits the already-computed `color` from `<body>` — near-black,
  because `color` does not re-resolve inside a scoped `dark` — and you get black
  type on a black tile. That was the "Straks de vraag is not visible" bug, and it
  took every marginal note in the lesson flow with it. A one-off goes in square
  brackets (`text-white/[0.78]`), which is an arbitrary value and always emitted.
- `BADGE_STYLES` in `lib/data/curated-studies.ts` gives all four study types the
  same teal chip, and white on it measures 3.7:1. It carries no information the
  word itself does not. Set the type as quiet uppercase type instead.
- `components/landing/proef/` is a separate committed experiment with its own
  copy of this idea. Leave it alone; unifying it is a later decision.
- Dutch-only copy. No decorative icons — an icon identifies a control or a data
  type or it does not appear. The tree is **"je boom"** and the section is
  **"Voortgang"**; the word "levensboom" never reaches a visitor.
