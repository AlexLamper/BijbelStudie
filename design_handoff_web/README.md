# Handoff: BijbelStudie — webplatform (Next.js)

Negen routes, ontworpen op 1440 × 900, in dezelfde tokens als de mobiele app. Dit pakket is gemaakt om door Claude Code in een bestaand Next.js-project te worden uitgevoerd.

## Wat er in dit pakket zit

| Bestand | Waarvoor |
| --- | --- |
| `RULES.md` | **Lees dit eerst.** De harde grenzen: alleen UI, niets functioneel. Ook: wat je van /profiel/boom wél en níet overneemt. |
| `TOKENS.md` | Alle kleuren, typografie, spacing, radii en gradiënten met exacte waarden. |
| `tokens.css` | Dezelfde tokens als CSS-variabelen — kopieer in `app/globals.css`. |
| `tailwind-tokens.md` | Dezelfde tokens als Tailwind-theme-extensie, als je Tailwind gebruikt. |
| `SHELL.md` | De zijbalk en kopbalk die op alle negen routes identiek zijn. Bouw dit één keer. |
| `COMPONENTS.md` | De componenten die je nodig hebt, met props. |
| `PAGES.md` | Per route de volledige opbouw met exacte waarden (de negen basisroutes). |
| `PAGES-STUDIE-EN-LES.md` | Studie-detail en de vijf lesschermen, met de gedeelde chrome van de lesflow. |
| `TOKENS-LES.md` | De extra tokens van de lesflow, licht en donker naast elkaar. |
| `PROMPTS.md` | Kant-en-klare prompts, één per route, in de juiste volgorde. |
| `CHECKLIST.md` | Meetbare acceptatiecriteria. Een pagina is pas af als alles klopt. |
| `prototype/` | De werkende HTML-prototypes: `BijbelStudie Screens` (alle schermen, licht) en `BijbelStudie Lesschermen donker` (de vijf lesschermen in donkere modus). Open naast je editor. |
| `screenshots/` | Eén PNG per route op 2×, inclusief studie-detail en de vijf lesschermen. |

## Werkwijze die de hoogste kwaliteit geeft

1. **Fase 0 — tokens.** Zet `tokens.css` (of de Tailwind-extensie) in het project. Niets anders. Geen enkele pagina bouwt met losse hexwaarden.
2. **Fase 1 — de shell.** Bouw `AppShell`, `Sidebar` en `TopBar` uit `SHELL.md`. Negen routes hangen eraan; één keer goed is negen keer goed. Lever deze fase af en controleer hem tegen `CHECKLIST.md` vóór je verder gaat.
3. **Fase 2 — de primitieven.** `Card`, `StatCard`, `Chip`, `Pill`, `ProgressBar`, `SectionHeading`, `ListRow`, `StudyCard`, `TreeAvatar`. Zie `COMPONENTS.md`.
4. **Fase 3 — de routes, één prompt per route.** Volgorde uit `PROMPTS.md`. Niet twee routes in één prompt: dat levert altijd slordiger werk.
5. **Fase 4 — de lesflow.** Pas als de negen basisroutes staan: studie-detail, daarna de vijf stappen. Zie `PAGES-STUDIE-EN-LES.md` en de prompts in `PROMPTS.md`.
6. **Fase 5 — nalopen.** `CHECKLIST.md` per route afvinken op 1440 × 900.

## Waarom één route per prompt

De pagina's delen 80 % van hun opbouw. Als je ze in één keer laat bouwen, gaat de shell per pagina iets afwijken — een andere zoekveldbreedte, een ander badgekleurtje. Dat is precies wat dit ontwerp niet moet hebben. Bouw de shell één keer als component en importeer hem; wijk er per pagina nooit van af.

## Technische uitgangspunten

- Next.js App Router. Elke route is een `page.tsx` die `AppShell` gebruikt.
- Alle schermen zijn ontworpen op **1440 × 900**. De body onder de kopbalk is dus 835 px hoog; de ontwerpen passen daar exact in. Bouw met `min-h-screen` en een scrollende body — de vaste hoogte is een ontwerpmaat, geen eis aan de implementatie.
- Server components waar het kan; `"use client"` alleen voor componenten met state (tabs, filters, schakelaars).
- Geen nieuwe dependencies. Iconen: gebruik wat het project al heeft (lucide-react is de aanname); de iconen in het prototype zijn 24×24 stroke-outlines en komen 1-op-1 overeen met de lucide-set — namen staan per plek in `PAGES.md`.
