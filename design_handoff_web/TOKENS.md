# Tokens

Eén bron van waarheid. Geen enkele pagina schrijft een hexwaarde die hier niet staat.

## Kleur

| Token | Waarde | Gebruik |
| --- | --- | --- |
| `teal` | `#0D9488` | primaire knoppen, actieve pill, actieve tab, links, voortgang |
| `teal-dark` | `#0F766E` | gradiëntstart banners, groepskoppen, vandaag-staaf, AI-glyph, streakcijfer |
| `teal-soft` | `#CCFBF1` | heatmap stap 2, versstreep |
| `teal-wash` | `rgba(13,148,136,.10)` | actief zijbalkitem, icoonvak achter een teal glyph |
| `teal-wash-2` | `rgba(13,148,136,.08)` | actief subitem in de zijbalk |
| `teal-faint` | `#F0FDFA` | lichte icoonvakken, citaatblok in commentaar |
| `teal-tint` | `#E6F5F1` | icoonvak Bijbelboeken-kaart |
| `ink` | `#111827` | koppen, primaire tekst |
| `ink-body` | `#374151` | lopende tekst, inactief zijbalklabel |
| `ink-muted` | `#6B7280` | secundaire tekst, placeholders |
| `ink-faint` | `#9CA3AF` | meta: datums, tellingen, hints |
| `line` | `#E5E7EB` | randen, hairlines, lege voortgangsbalk, heatmap stap 1 |
| `line-strong` | `#D1D5DB` | rand van het zoekveld op Studies |
| `line-soft` | `#F3F4F6` | paginaachtergrond, hairline in kaarten, chip-achtergrond |
| `surface` | `#FFFFFF` | kaarten, zijbalk, kopbalk |
| `success` | `#047857` | groeicijfers in Beheer |
| `success-fill` | `#059669` | afgeronde voortgang |
| `warn` | `#EA580C` | meldingsstip |
| `danger` | `#DC2626` | Uitloggen, negatieve delta |
| `gold` | `#CA9A16` | gouden vlakken |
| `gold-ink` | `#422E04` | **alle** tekst op een gouden vlak (nooit wit) |
| `gold-badge` | `#7A5E08` | niveaucijfer in de zijbalk, op wit |

**Nooit wit op goud.** Elk gouden vlak krijgt `gold-ink`. Dat is een bewuste correctie: wit op `#CA9A16` haalt 2,6:1.

## Gradiënten

| Naam | Waarde |
| --- | --- |
| Tekst van de dag | `linear-gradient(#4B3A63 0%, #7E5E6E 45%, #C88463 100%)` |
| heuvels in die banner | voor `#6C8C4E`, achter `#3F6B3C` |
| studiebanner (standaard) | `linear-gradient(135deg, #0F766E, #0F172A)` |
| studiebanner (varianten) | `#0D9488→#0F172A`, `#3B2C55→#6B4A6E`, `#6B4A2E→#0F172A`, `#1E3A5F→#0F172A` |
| boomavatar (lucht) | `radial-gradient(circle at 50% 28%, #CFE9F2, #A9D7E4 70%)` |
| Pro-pill | `linear-gradient(135deg, #F4DFA4, #FFFDF6)`, rand `#E6D2A0`, ink `#4A3506` |
| Pro-badge (Abonnement) | `linear-gradient(135deg, #CA9A16, #F2D98C 70%, #FFFBEF)`, rand `#D9B95E`, ink `#422E04` |
| scène /profiel/boom | `linear-gradient(#243A4A 0%, #3C5A60 42%, #5E7A63 74%, #2F4A3A 100%)` |

Heatmap (vijf stappen, laag → hoog): `#E5E7EB` · `#CCFBF1` · `#99D9CE` · `#4FB3A4` · `#0D9488`
Weekstaven: leeg `#E5E7EB`, gelezen `#9FD8CD`, vandaag `#0F766E`

## Typografie

**Inter** voor alle UI. **Lora** voor bijbeltekst en versfragmenten. Laad beide via `next/font`.

| Rol | Stijl |
| --- | --- |
| paginatitel (kopbalk) | Inter 700 · 18 px · ls −0.2 |
| kaarttitel groot | Inter 700 · 21 px · ls −0.3 |
| sectiekop | Inter 700 · 16 px |
| kaartkop | Inter 700 · 14.5–15.5 px |
| groepskop (caps) | Inter 600 · 10–11 px · ls 1.1 · uppercase · `ink-faint` |
| lijsttitel | Inter 600 · 14.5 px |
| body | Inter 400 · 14.5 px / 1.75 · `ink-body` |
| meta | Inter 400 · 12–12.5 px · `ink-faint` |
| chip / pill | Inter 500–600 · 13 px |
| knoplabel | Inter 600 · 13.5–14 px |
| tabellabel | Inter 600 · 10.5 px · ls 0.8 · uppercase · `ink-faint` |
| groot getal | Inter 700 · 24–26 px · ls −0.5 |
| bijbeltekst | Lora 400 · 17 px / 1.8 · `#1F2937` |
| versnummer | Inter 600 · 11 px · `ink-faint` · superscript |

**Niets onder 10 px.** Ook badges niet.

## Spacing, radius, elevatie

- Frame 1440 × 900. Zijbalk **196 px** + 1 px rand. Kopbalk **64 px**. Body-padding **26 px 28 px**.
- Kolomafstand tussen hoofdkolom en rail: **20 px**. Verticale afstand tussen blokken: **16–18 px**.
- Radius: pill `9999`, tegel 7–10, kaart **16**, knop 10, paneel 14.
- Rand: 1 px `line`. Gekozen tegel 2 px `teal`. Niveau-ring 3–4 px `gold`.
- Schaduw: alleen op de FAB (`0 6px 16px rgba(13,148,136,.35)`), de streakbadge (`0 1px 5px rgba(17,24,39,.22)`) en het zoekveld op Studies (`0 1px 2px rgba(17,24,39,.04)`). Kaarten hebben een rand, geen schaduw.
- Rail-breedtes: dashboard 320, Studies 290, Profiel 326, Notities 300, Feedback 350, Beheer 340, /profiel/boom 446.
