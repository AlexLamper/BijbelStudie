# De negen routes

Per route: doel, opbouw van boven naar beneden, en de waarden die afwijken van de tokens. Alles wat hier niet staat komt uit `TOKENS.md`. Screenshot per route in `screenshots/`.

Body = 1168 × 835 px (1440 − 196 zijbalk − 56 padding; 900 − 64 kopbalk). De ontwerpen passen daar exact in; dat is de maat waarop je controleert.

---

## 1. `/` — Dashboard  · `screenshots/w1-dashboard.png`

Twee kolommen: hoofdkolom `flex-1` en een rail van **320 px**, gap 20. Verticale gap in beide 16–18.

**Hoofdkolom**

1. **Tekst van de dag** — hoogte 218, radius 16, `--grad-verse`, `overflow:hidden`, `flex`-kolom. Binnenin padding 22 26 20 met `flex-1`:
   - eyebrow "Tekst van de dag · Lukas 21:38": Inter 600 · 10.5 px · ls 1.5 · uppercase · `rgba(255,255,255,.82)`
   - het vers: Lora 400 · 24 px / 1.45 · wit · `text-shadow:0 1px 3px rgba(0,0,0,.28)` · `max-width:680px`
   - `flex-1` spacer, dan de actierij onderaan uitgelijnd: **drie ronde knoppen** van 40 px, `rgba(17,24,39,.45)`, rand 1 px `rgba(255,255,255,.32)`, witte glyph 19 px — `Heart`, `Share2` (of upload-pijl), `MoreHorizontal`. Gap 10.
   - heuvels onderin: band van 62 px, twee ellipsen (`#6C8C4E` voor, `#3F6B3C` achter), `pointer-events:none`
2. **Verder waar je was** — `Card`, `flex`, `overflow:hidden`: links een strook van 124 px met de bannergradiënt; rechts padding 20 22 met eyebrow (`teal`, caps 10.5), titel "Genesis · les 6 — Noach" Inter 700 · 21 px ls −0.3, meta `ink-faint` 13, `ProgressBar` 6 px met "10 %" ernaast (max-width 420), en twee knoppen: primair `teal` met `ArrowRight`, secundair wit met rand.
3. **SectionHeading** "Aanbevolen voor jou" met actie "Alle studies →"
4. **Zes `StudyCard`** in een raster van 3 × 2, gap 14, afbeeldinghoogte 96.

**Rail (320 px)**

1. **Je boom** — `Card` padding 18, `flex` gap 15: `TreeAvatar size=64 ring=3` met niveaupil rechtsonder; rechts titel "Jonge boom · niveau 5" Inter 700 · 15, meta "nog 33 XP tot niveau 6", `ProgressBar` 6 px op 82 %; uiterst rechts "Bekijken →" Inter 600 · 13 `teal`.
2. **Deze week** — `Card` padding 18. Kop: staaficoon 16 `teal`, titel Inter 700 · 15, rechts "27× gelezen" `ink-faint` 12.5. Daaronder `WeekBars` (hoogte 76, gap 7, waarden 0/0/9/64/52/38/30, vandaag = index 6).
3. **Bijbelboeken** — `Card` padding 18, **`flex:none`** zodat de kaart bij zijn inhoud stopt. Kop: icoonvak 38 radius 10 `teal-tint` met `BookOpen` 19 `teal`; titel Inter 700 · 15; meta "13 van 66 boeken geopend" `ink-muted` 12.5. Dan de legenda "Minder ▫▫▫▫▫ Meer" met vijf tegels van 13 px. Dan twee `HeatGrid` van 12 kolommen: OUDE TESTAMENT (39) en NIEUWE TESTAMENT (27); het aantal tussen haakjes staat in dezelfde `ink-faint` als het label.

---

## 2. `/studies` — Studies · `screenshots/w2-studies.png`

Volle breedte, één kolom, gap 13.

1. **Zoekveld** — **440 px breed** (niet volledige breedte), hoogte 46, radius 12, wit, rand 1 px `line-strong`, schaduw `--shadow-field`, padding 0 15: `Search` 18 `ink-muted`, placeholder "Bijbelboek, persoon of thema" Inter 400 · 14 `ink-muted` met `flex-1`, rechts `⌘K`.
2. **Filterchips** — Voor jou (actief) · Bijbelboeken · Personen · Thema's · Gedeelten. Gap 9.
3. **Verder waar je was** — `Card` padding 14 18, gap 15: ring van 48 px `conic-gradient(#0D9488 0 10%, #E5E7EB 10%)` met een miniatuur van 37 px erin; eyebrow caps `ink-faint`; titel "Genesis · les 6" Inter 700 · 17; rechts knop "Lezen" `teal` hoogte 40.
4. **SectionHeading** "Nieuw deze maand" + "Alle 8"
5. **Vier `StudyCard`** in één rij, gap 16, afbeeldinghoogte **88**.
6. **SectionHeading** "Alle studies" met meta "77 studies · 4 begonnen" en rechts de link **"Per bijbelboek →"** (opent het boekenoverzicht).
7. **Lijstkaart** `flex-1` met `overflow:hidden` en **vijf `ListRow`**: Genesis (10 %, Verder) · Exodus (100 %, Herhalen) · Het leven van Mozes (Start) · Geloof in de storm (Start) · De Psalmen lezen (8 %, Verder).

---

## 3. `/lezen` — Lezen · `screenshots/w3-lezen.png`

`AppShell padded={false}`. Twee panelen, geen marge, geen radius: links `flex:1.05` met 1 px rechterrand `line`, rechts `flex:1`.

**Linkerpaneel — de tekst**

1. **Werkbalk** hoogte 56, padding 0 16, gap 9, onderrand 1 px `line`, in deze volgorde:
   `IconButton` leesvoorkeuren (`Type`, 17) · scheidingslijn 1 × 22 `line` · `IconButton` terug (`ChevronLeft`) · select "Statenvertaling" 176 px · select "Genesis" 140 px (600) · select "5" 62 px (600) · `IconButton` volgende (`ChevronRight`) · `flex-1` · **`IconButton` voorlezen** (`Volume2`, 32 × 32, glyph `teal`).
   Selects: hoogte 36, radius 9, wit, rand 1 px `line`, label Inter 500 · 13 `ink-body`, `ChevronDown` 15.
2. **Hoofdstukregel** padding 14 30 0: links "GENESIS 5" Inter 700 · 12 ls 1.3 uppercase `ink-muted`; rechts `NotebookPen` 15 `teal` + "2" + punt + "3 markeringen".
3. **Tekst** `relative`, daarin een absolute scroller met padding 14 30 0, Lora 400 · 17 / 1.8 `scripture`, alinea-afstand 14. Versnummer superscript Inter 600 · 11 `ink-faint`. Een gemarkeerd vers krijgt `#FEF3C7`, radius 4. De tekst loopt door tot onderaan; onderop een `FadeBottom`.
   **Geen hoofdstuknavigatie onderin** — boek en hoofdstuk staan alleen in de werkbalk.

**Rechterpaneel — studie**

1. **Tabbalk** hoogte 56, padding 0 16, gap 14: Commentaar (actief, met `MessageSquare` 15) · Grondtekst met `PRO`-label · Algemene info · Mijn notities · **AI-assistent met een sterretje van 14 px, gevuld `teal-dark`**. PRO-label: `gold` vlak, `gold-ink`, Inter 700 · 10 px ls 0.6, radius 4, padding 2 5.
2. **Bronregel** padding 11 20, onderrand 1 px `line-soft`: links "COMMENTAARBRON" Inter 600 · 12 ls 1.2 uppercase `ink-muted`; rechts een select "Matthew Henry (NL)" 186 px; daarnaast **`IconButton` voorlezen** (32 px).
3. **Commentaar** zelfde scroller + `FadeBottom`: kop "Inleiding" Inter 700 · 17; body Inter 400 · 14.5 / 1.75 `ink-body`; het uitgelichte overzicht in een blok met `border-left:3px teal`, `teal-faint`, radius `0 10 10 0`, padding 13 16, Inter 600 · 13.5 / 1.7; verskoppen Inter 700 · 15.5. Zorg dat de inhoud hoger is dan het paneel, zodat de vervaging op echte tekst valt.
4. **FAB** rechtsonder: 52 px, `teal`, sterretje 24 px wit, schaduw `--shadow-fab`.

---

## 4. `/notities` — Notities · `screenshots/w4-notities.png`

Hoofdkolom `flex-1` + rail 300, gap 20.

**Hoofdkolom** — één `Card` met `overflow:hidden`:
- tabbalk padding 0 22, gap 22: Notities (actief) · Markeringen · Bladwijzers; rechts "2 notities · 7 markeringen" `ink-faint` 12.5
- **notitieregels, geen kaarten**: padding 18 22, onderrand 1 px `line`. Per regel: metarij (bron `teal` 600 12.5 · punt 3 px · datum `ink-faint` · rechts `MoreHorizontal` 17), dan de notitie Inter 400 · 14.5 / 1.6 `ink` (max-width 720), dan het versfragment achter een streep van 2 px `teal-soft`, Lora 400 · 13 / 1.6 `ink-muted`.
- geen datumkoppen, geen groepering

**Rail** — knop "Nieuwe notitie" (`teal`, hoogte 44, `Plus`), `Card` "Filteren" met vier rijen van 34 px en tellingen, sorteerselect "Nieuwste eerst", en `Card` "Exporteren".

---

## 5. `/beheer` — Beheer · `screenshots/w5-beheer.png`

Alleen voor beheerders. Eén kolom, gap 16.

1. **Vijf `StatCard`** in één rij, gap 13: MRR € 1.842 (+7,4 %) · Betalende gebruikers 248 (+11) · Gebruikers totaal 1.284 (+64) · Conversie 19,3 % (+0,8 pt) · Actief deze week 312 (+12).
2. **Gebruikers beheren** — `Card` `overflow:hidden`. Kop padding 14 20: titel Inter 700 · 15.5, meta "1.284 accounts", `flex-1`, filterveld 210 px, select "Alle abonnementen", knop "Exporteren", primaire knop "Gebruiker toevoegen" met `Plus`.
   Tabel met `grid-template-columns:1.9fr 1fr .9fr .8fr .9fr 38px`, gap 14. Kolomkoppen Inter 600 · 10.5 ls 0.8 uppercase `ink-faint`, padding 0 20 10. Rijen padding 12 20, bovenrand 1 px `line-soft`: avatar 32 rond, naam Inter 600 · 13 met e-mailadres eronder (`ink-faint` 11.5), abonnementspil (Pro = `--grad-pro-pill`-achtig `#FEF6E0` met `gold-ink`; Gratis = `line-soft` met `ink-muted`), lid sinds, laatst actief met een statusstip van 7 px (`success-fill` bij "nu"), voortgang, `MoreHorizontal`.
   Vier rijen in het ontwerp.
3. **Onderste rij**, gap 16, `flex-1`:
   - **Recente feedback** `flex-1`, padding 17: drie regels met avatar 30, "**Naam** — tekst" Inter 400 · 13 / 1.5 `ink-body`, tijd `ink-faint` 11.
   - **Snel naar** 340 px, padding 14: vijf rijen, rand 1 px `line`, radius 10, min-hoogte 40, padding 7 13, gap 6, icoon 18 `ink-body`, label Inter 600 · 13, `ChevronRight` 15 `ink-faint`:
     Gebruikersbeheer · Inzichten & analytics · Abonnementen · Mijn instellingen · Onboarding afspelen met de subregel "Niets wordt opgeslagen" (Inter 400 · 11 `ink-faint`).

---

## 6. `/profiel` — Profiel · `screenshots/w6-profiel.png`

Hoofdkolom `flex-1` + rail **326 px**, gap 20.

**Hoofdkolom**

1. **Profielkop** — `Card` padding 20, gap 20: `TreeAvatar size=96 ring=4` met niveaubolletje van 30 px (`gold` vlak, `gold-ink`, 2.5 px witte rand); naam Inter 700 · 26 ls −0.5 met `Pencil` 17 ernaast; e-mailadres `ink-muted` 13.5; drie pillen: "Pro actief" (gold-gradiënt), "19 dagen reeks" (`#FFF7ED` / `#EA580C`), "Lid sinds september 2026" (wit met rand).
2. **Vier `StatCard`**: Bladwijzers 0 · Notities 2 · Bijbelboeken 12/66 · Leesreeks 19.
3. **Activiteit** — `Card` `flex-1`: tabs (Alle activiteit · Markeringen · Notities) en drie regels met avatar 32, "**Alex Lamper** schreef een notitie", meta met `Lock` 12 + "Alleen jij", en bij de eerste een citaatblok `line-soft` radius 10 padding 11.

**Rail — vier kaarten, alle vier 326 px breed**

1. **Je boom** — kop "Je boom" + hairline; gecentreerde `TreeAvatar size=112 ring=4` met niveaubolletje; "Jonge boom · niveau 5" Inter 700 · 14.5; "nog 33 XP" `ink-faint` 12.5; "Naar je boom →" `teal` 600 13.
2. **Badges** — titel links, "12" Inter 700 · 21 met "van 19" ernaast; hairline; vijf overlappende ringen van 44 px (`#F5F3FF`, rand 2.5 px `#7C3AED`, `margin-left:-9`, `box-shadow:0 0 0 3px #fff`), laatste is "+15" op `line`; onderregel "Volgende: Vijftig (42/50)" met "Alle badges →".
3. **Abonnement** — kop + hairline; badge "PRO ACTIEF" met `--grad-pro-badge`, rand `#D9B95E`, `gold-ink`, Inter 700 · 11 ls 0.8 uppercase, radius 9999, padding 6 13; tekst "Je hebt een actief Pro-abonnement met toegang tot alle premium functies."; "Beheer abonnement →".
4. **Account** — kop + hairline; drie rijen label/waarde, padding 8 0, hairline tussen: Lid sinds → september 2026 · Dagelijkse reeks → 19 dagen · Badges verdiend → 9. Label Inter 400 · 13 `ink-muted`, waarde Inter 700 · 13 `ink`.

---

## 7. `/profiel/boom` — Levensboom · `screenshots/w7-levensboom.png`

⚠️ Lees eerst regel 4 in `RULES.md`. De boom komt uit de bestaande component; alles hieronder is spec.

`AppShell padded={false}`. Body is een rij: scène `flex-1` + paneel **446 px**.

**Scène** `relative overflow-hidden` met de bestaande boomcomponent als vulling. Daarover:
- linksboven op 26 / 22: twee pillen `rgba(17,24,39,.72)`, radius 9999, padding 8 14, Inter 600 · 12.5 wit, met `ArrowLeft` en `Link2`: "Profiel" en "Deel link"
- daaronder op 86: "VOORTGANG" Inter 700 · 11.5 ls 1.4 uppercase `#5EEAD4`, en "Je boom" Inter 700 · 40 ls −0.8 wit met `text-shadow:0 2px 6px rgba(0,0,0,.3)`
- **niveaukaart** linksonder op 26 / 26, breedte 352, `--panel-card`, rand 1 px `--panel-border`, radius 14, padding 16:
  - blok van 58 px radius 11 `teal` met "NIVEAU" (Inter 700 · 10 ls 0.9 `rgba(255,255,255,.8)`) en "5" (Inter 700 · 22 wit)
  - "Jonge boom" Inter 700 · 17 wit; "Nog **33 XP** tot niveau 6" `rgba(255,255,255,.7)` 13
  - XP-balk: hoogte 22, radius 9999, spoor `rgba(255,255,255,.14)`, vulling `teal` op 82 % met "467 / 500 XP" erin (Inter 700 · 11.5 wit, gecentreerd); onder de balk "Niveau 5" en "Niveau 6"
  - hairline `rgba(255,255,255,.14)`, dan twee regels: "Hierna ontgrendel je → Meer van Galilea · niveau 6" (`#5EEAD4`) en "Volgende fase → Volwassen boom · niveau 8" (wit)

**Paneel (446 px, `--panel-dark`)**
- tabbalk padding 0 20, gap 20, onderrand 1 px `rgba(255,255,255,.1)`: Boomsoort (actief: wit 700 met 2 px `teal` onderstreping) · Omgeving · Dieren · Ring · Groei (`rgba(255,255,255,.6)` 500)
- hintregel padding 14 20, Inter 400 · 12.5 / 1.55 `rgba(255,255,255,.6)`, onderrand 1 px `rgba(255,255,255,.08)`
- keuzeraster padding 16 20, twee kolommen, gap 14, `align-content:start`. Tegel: radius 12, rand 1 px `rgba(255,255,255,.14)`, achtergrond `rgba(255,255,255,.06)`; bovenin een beeldvlak van 108 px; eronder padding 10 12 met naam Inter 700 · 13 wit en omschrijving Inter 400 · 11.5 / 1.4 `rgba(255,255,255,.62)`.
  - **gekozen**: rand 2 px `teal` + vinkje rechtsboven in een cirkel van 24 px `teal`
  - **vergrendeld**: grijs beeldvlak, geen naam/omschrijving maar "Vergrendeld" + "Bereik niveau N om te openen", en midden in het beeld een pil `rgba(17,24,39,.7)` met `Lock` 12 en "Niveau N"
  - **pro**: goudlabel "PRO" rechtsonder in het beeldvlak (`gold` vlak, `gold-ink`)

---

## 8. `/instellingen` — Instellingen · `screenshots/w8-instellingen.png`

Eén kolom, gap 18.

1. **Sectieknoppen** — één rij, `align-self:flex-start`, wit, rand 1 px `line`, radius 12, padding 5: Weergave (actief: `teal` vlak, witte tekst 600, radius 9, hoogte 36, padding 0 14) · Leesweergave · Meldingen · Account · Abonnement · Privacy · Over.
2. **Panelen links** `flex-1` + **rail 330** rechts, gap 18.
   - `Card` **Weergave** padding 20 22: kop Inter 700 · 16.5; rij "Thema" met subregel en select "Licht".
   - `Card` **Leesweergave**: rijen Tekstgrootte (Normaal) · Regelafstand (Ruim) · Lettertype (Schreefloos, met subregel) · Versnummers tonen (toggle aan).
   - `Card` **Meldingen**: Herinneringen (toggle aan, met subregel) · Studieherinnering (select 08:00 + toggle).
   - Instellingrij: padding 14 0, hairline `line-soft` tussen; label Inter 400 · 14.5 `ink`, subregel Inter 400 · 12 `ink-faint`; select hoogte 36 radius 9 min-breedte 148; toggle 46 × 27 radius 9999 (`teal` aan, `line-strong` uit) met knop van 21 px.
   - **Rail**: `Card` "Voorbeeld" met een blok `#F9FAFB` rand 1 px `line` radius 12 padding 16 18, daarin "¹In den beginne schiep God den hemel en de aarde." in Lora 17 / 1.9, plus de regel "Het voorbeeld verandert mee met de instellingen hiernaast."; en `Card` "Snel terugzetten" met de knop "Standaard herstellen".

---

## 9. `/feedback` — Feedback · `screenshots/w9-feedback.png`

Hoofdkolom `flex-1` (volle breedte, geen max-width) + rail **350**, gap 20.

**Formulierkaart** padding 22:
1. kop "Wat kan er beter?" Inter 700 · 19 ls −0.2 + inleiding `ink-muted` 13.5 / 1.6 (max-width 520)
2. **Beoordeling** — blok `#F9FAFB`, rand 1 px `line`, radius 12, padding 15 18, gap 18: links "Hoe beoordeel je BijbelStudie?" Inter 600 · 14.5 met "Optioneel — één tik" `ink-faint` 12; midden vijf sterren van 30 px (gevuld `gold`, leeg `line-strong`); rechts het cijfer Inter 700 · 15 in `gold-ink`.
3. **Soort** — caps-label + vier keuzevakken `flex-1`, radius 11, padding 13, Inter 600 · 13.5; gekozen: rand 2 px `teal`, achtergrond `rgba(13,148,136,.06)`, tekst `teal`. Idee · Probleem · Vraag · Anders.
4. **Onderwerp** — veld hoogte 44, radius 10, rand 1 px `line`.
5. **Toelichting** — veld hoogte 116, radius 10, padding 13 14.
6. checkbox 20 px radius 5 + "Stuur mijn app-versie en apparaat mee"
7. knop "Versturen" `teal` hoogte 44 padding 0 22, met ernaast "Je krijgt antwoord op …" `ink-faint` 12.5

**Rail**
1. `Card` **Waarom feedback geven?** — titel Inter 700 · 15, inleiding `ink-muted` 12.5 / 1.6, en drie genummerde regels: vierkant van 28 px radius 8 `teal-faint` met het cijfer `teal` 700 12, titel Inter 600 · 13.5, omschrijving Inter 400 · 12.5 / 1.55 `ink-muted`, hairline `line-soft` boven elke regel.
2. `Card` **Liever direct contact?** met de knop "Mail het team".
