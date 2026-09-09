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
| `SceneRail.tsx` | The sidebar replacement: a glass rail that floats, widens on hover/focus, and becomes a pill strip below `lg`. |
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

- `TEAL` `#0D9488` — brand fill, for bars, dots and rings that carry no type.
- `TEAL_DEEP` `#0F766E` — **any solid fill under white type.** White on `#0D9488`
  measures 3.74:1 and fails; on `#0F766E` it is 5.5:1.
- `TEAL_ON_DARK` `#2DD4BF` — accents and type on the scene. Never a fill under
  white type.

Everything else is a literal white or black. **Never a theme token on a scene
page**: a token flips with the reader's light/dark setting and the landscape
does not.

---

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
sections; apply `SCENE_X` (or `SCENE_X_EDGE`) per section yourself.

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
  page, it goes on a `PLATE` — never bare and never on a `PANEL`.
- `BADGE_STYLES` in `lib/data/curated-studies.ts` gives all four study types the
  same teal chip, and white on it measures 3.7:1. It carries no information the
  word itself does not. Set the type as quiet uppercase type instead.
- `components/landing/proef/` is a separate committed experiment with its own
  copy of this idea. Leave it alone; unifying it is a later decision.
- Dutch-only copy. No decorative icons — an icon identifies a control or a data
  type or it does not appear. The tree is **"je boom"** and the section is
  **"Voortgang"**; the word "levensboom" never reaches a visitor.
