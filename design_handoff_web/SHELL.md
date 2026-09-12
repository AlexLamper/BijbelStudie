# De shell — zijbalk en kopbalk

Op alle negen routes identiek. Bouw dit één keer en importeer het; wijk er nooit per pagina van af. Dit is het onderdeel waar drift het snelst zichtbaar wordt.

```
<AppShell title="Studies" active="studies">…</AppShell>
```

`AppShell` = `<div class="flex h-screen bg-line-soft">` met `<Sidebar/>` en `<main class="flex-1 flex flex-col min-w-0">` met `<TopBar/>` en `<div class="flex-1 overflow-auto p-[26px_28px]">{children}</div>`.

## Zijbalk — 196 px, wit, 1 px rechterrand `line`

**Merkregel** (hoogte 64, padding 0 18, gap 10, onderrand 1 px `line`)
- app-icoon: `public/app-icon.png`, 30 × 30, radius 8. Ligt in `prototype/app-icon.png`.
- woordmerk "BijbelStudie": Inter 700 · 15.5 px · ls −0.2

**Navigatie** (padding 12 10, items met 2 px tussenruimte), drie groepen:

| Groep | Items |
| --- | --- |
| STUDEREN | Dashboard `/` · Studies `/studies` · Lezen `/lezen` · Notities `/notities` |
| ACCOUNT | Profiel `/profiel` (met subitem Levensboom `/profiel/boom`) · Instellingen `/instellingen` · Feedback `/feedback` |
| BEHEER | Beheer `/beheer` met label `admin` |

- groepskop: Inter 600 · 10 px · ls 1.1 · uppercase · `ink-faint` · padding 6 11 7
- item: hoogte 38, radius 9, padding 0 11, gap 11; icoon 18 px stroke 1.8 `ink-muted`; label Inter 500 · 13.5 px · `ink-body`
- item actief: achtergrond `teal-wash`, icoon en label `teal`, label 600
- subitem Levensboom: alleen zichtbaar op `/profiel` en `/profiel/boom`. Hoogte 32, radius 8, padding 0 11 0 40, Inter 12.5; actief 600 `teal` op `teal-wash-2`
- `admin`-label: Inter 600 · 10 px · ls 0.6 · uppercase · `ink-muted`, rand 1 px `line`, radius 4, padding 2 5

**Iconen** (lucide): Dashboard `House`, Studies `GraduationCap`, Lezen `BookMarked`, Notities `NotebookPen`, Profiel `User`, Instellingen `Settings`, Feedback `MessageSquare`, Beheer `Shield`.

**Voet** (bovenrand 1 px `line`, padding 11, gap 10)
- boomavatar 32 px met het niveaucijfer als pil rechtsonder: wit, rand 1 px `line`, radius 9999, padding 1 5, Inter 700 · 10 px · `gold-badge`
- naam Inter 600 · 13 px; eronder "Pro via web" Inter 400 · 11 px · `ink-faint`
- rechts `MoreHorizontal` 17 px `ink-faint`

## Kopbalk — 64 px, wit, 1 px onderrand `line`, padding 0 28, gap 16

Van links naar rechts, precies vijf onderdelen:

1. **Titel** — alleen de paginanaam, Inter 700 · 18 px · ls −0.2. Geen subtitel, geen breadcrumb, geen datum.
2. **Spacer** `flex-1`
3. **Globaal zoekveld** — 260 px, hoogte 38, radius 10, `line-soft`, padding 0 12, gap 9: `Search` 17 px `ink-muted`, placeholder "Zoek vers, studie of notitie" Inter 400 · 13 px · `ink-faint` met `flex-1`, en helemaal rechts de toets-hint `⌘K`: Inter 600 · 10.5 px monospace · `ink-faint`, rand 1 px `line`, radius 5, padding 2 5, wit.
4. **Meldingen** — 38 × 38, radius 10, `Bell` 19 px `ink-body`, met een stip van 7 px `warn` met 1.5 px witte rand op `right:9 top:9`.
5. **Profiel** — wrapper `relative`; boomavatar 34 px (`overflow:hidden`, radius 50%) en **als sibling daarnaast, niet erin**, de streakbadge: wit, radius 9999, padding 2 8, schaduw `0 1px 5px rgba(17,24,39,.22)`, Inter 700 · 12 px · `teal-dark`, op `right:-9 bottom:-3`.

De badge moet buiten de avatarcirkel staan; binnen de cirkel wordt hij door `overflow:hidden` en de 50 % radius weggeknipt.

## Paginatitels

`/` Dashboard · `/studies` Studies · `/lezen` Lezen · `/notities` Notities · `/beheer` Beheer · `/profiel` Profiel · `/profiel/boom` Levensboom · `/instellingen` Instellingen · `/feedback` Feedback
