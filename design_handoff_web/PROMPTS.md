# Prompts

Eén prompt per bericht. Niet combineren. Zet bij elke prompt de bijbehorende bestanden erbij.

## Vaste kop bij elke prompt

> Dit is een herontwerp van **alleen de presentatielaag** van onze bestaande Next.js-app. Lees `design_handoff_web/RULES.md` en houd je er strikt aan: geen wijzigingen in data fetching, API-routes, server actions, auth, state of routing. Laat bestaande hooks en aanroepen in de pagina staan en vervang alleen wat ze renderen. Gebruik uitsluitend de tokens uit `design_handoff_web/tokens.css`; schrijf geen losse hexwaarden. Botst het ontwerp met bestaand gedrag, dan wint het gedrag — meld het in plaats van logica te herschrijven.

## Fase 0 — tokens

> Zet `design_handoff_web/tokens.css` in `app/globals.css` en (als we Tailwind gebruiken) breid `tailwind.config.ts` uit volgens `design_handoff_web/tailwind-tokens.md`. Laad Inter en Lora via `next/font` en koppel ze aan `--font-inter` en `--font-lora`. Verander verder niets. Laat me de diff zien.

## Fase 1 — de shell

> Bouw `AppShell`, `Sidebar` en `TopBar` exact volgens `design_handoff_web/SHELL.md`. Kopieer `design_handoff_web/prototype/app-icon.png` naar `public/app-icon.png`. De zijbalk markeert het actieve item op basis van `usePathname()`. Het subitem Levensboom is alleen zichtbaar op `/profiel` en `/profiel/boom`. Let op: de streakbadge in de kopbalk is een **sibling** van de avatarcirkel, niet een kind — binnen de cirkel wordt hij weggeknipt. Sluit af met de shell-regels uit `CHECKLIST.md`.

## Fase 2 — primitieven

> Bouw de componenten uit `design_handoff_web/COMPONENTS.md` als presentatiecomponenten, met exact die props. Nog geen pagina's. Maak een tijdelijke pagina `/_kit` waar elk component in al zijn varianten staat, zodat ik ze kan nakijken; die pagina verwijderen we later.

## Fase 3 — de routes, in deze volgorde

Volgorde is niet willekeurig: de eerste drie leggen de patronen vast die de rest hergebruikt.

1. **Dashboard** — `Bouw /(dashboard) volgens paragraaf 1 van PAGES.md, screenshot screenshots/w1-dashboard.png.`
2. **Studies** — paragraaf 2, `screenshots/w2-studies.png`
3. **Lezen** — paragraaf 3, `screenshots/w3-lezen.png`. Let op `padded={false}`, de werkbalkvolgorde en dat er **geen** hoofdstuknavigatie onderin komt.
4. **Notities** — paragraaf 4. Nadrukkelijk regels zonder kaarten.
5. **Profiel** — paragraaf 6. Vier railkaarten op gelijke breedte.
6. **Levensboom** — paragraaf 7. **Lees eerst regel 4 van RULES.md**: de boom blijft de bestaande component, alleen de chrome en het rechterpaneel komen uit het ontwerp.
7. **Instellingen** — paragraaf 8
8. **Feedback** — paragraaf 9
9. **Beheer** — paragraaf 5, als laatste: dit is de zwaarste pagina en profiteert ervan dat de tabel- en kaartpatronen al staan.

## Fase 4 — studie-detail en de lesflow

Pas beginnen als de negen basisroutes staan; deze schermen hergebruiken `AppShell`, `Card`, `StatCard`, `ProgressBar` en `TreeAvatar`.

10. **Studie-detail** — `Bouw /studies/[slug] volgens paragraaf 10 van PAGES-STUDIE-EN-LES.md, screenshot screenshots/w10-studie-detail.png. Gewone AppShell met active="studies".`
11. **De lesflow-chrome** — `Bouw de gedeelde chrome van de lesflow uit PAGES-STUDIE-EN-LES.md: LessonShell met de ingeklapte zijbalk van 64 px, de kopbalk van 52 px, het stappenpaneel van 212 px en de voet van 68 px. Ondersteun licht en donker via de tokens in TOKENS-LES.md — één set componenten, twee thema's. Nog geen stapinhoud.`
12. **Stap 1 · Het Woord** — paragraaf 11, `screenshots/w11-het-woord.png` Voor de donkere variant: open `prototype/BijbelStudie Lesschermen donker.dc.html` naast de screenshot.
13. **Stap 2 · Verdieping** — paragraaf 12. Let op het bredere paneel van 344 px en de vaste vraagbalk onderaan.
14. **Stap 3 · Reflectie** — paragraaf 13
15. **Stap 4 · Toetsing** — paragraaf 14
16. **Les afgerond** — paragraaf 15. De boom is de bestaande component; alleen de gouden lijst, de pillen en de tegels komen uit het ontwerp.

## Fase 5 — nalopen

> Loop `design_handoff_web/CHECKLIST.md` af op een viewport van 1440 × 900 en rapporteer per punt of het klopt. Fix alleen wat afwijkt; verander niets anders.
