# Studie-detail en de lesflow

Vervolg op `PAGES.md`. Zelfde regels: `RULES.md` geldt onverkort, alle waarden komen uit `TOKENS.md` en `TOKENS-LES.md`.

Routes in deze set:

| # | Route | Scherm |
| --- | --- | --- |
| 10 | `/studies/[slug]` | Studie-detail |
| 11 | `/studies/[slug]/les/[n]` · stap 1 | Het Woord |
| 12 | idem · stap 2 | Verdieping |
| 13 | idem · stap 3 | Reflectie |
| 14 | idem · stap 4 | Toetsing |
| 15 | idem · afronding | Les afgerond |

---

## 10. `/studies/[slug]` — Studie-detail · `screenshots/w10-studie-detail.png`

Gewone `AppShell`, `active="studies"`, titel = de naam van de studie ("Exodus"). Eén kolom, gap 16.

1. **Banner** — hoogte **142**, radius 16, `--grad-banner`, `overflow:hidden`, inhoud onderaan uitgelijnd, padding 22 26:
   - kruimelpad "Studies › **Exodus**" Inter 400 · 12.5 px `rgba(255,255,255,.7)`, actieve deel wit 600
   - titel "Exodus" Inter 700 · 34 px ls −0.7 wit
   - drie pillen, gap 8, radius 9999, padding 5 11, Inter 600 · 12 px: wit vlak met `teal-dark` ("Bijbelboek"), en twee met `rgba(17,24,39,.5)` en witte tekst ("40 lessen · ±6,5 uur", "Oude Testament")
2. **Vier cijferkaarten** in één rij, gap 14 — `StatCard` met een teal icoon van 17 px voor het label:
   Lessen **40** *lessen* · Tijd **6,5 uur** *totaal* · Bijbelboeken **1** *boek* · Voortgang **15 %** *6 van 40*
   Label Inter 400 · 12 `ink-muted`; waarde Inter 700 · 24 ls −0.5; het woord erachter Inter 400 · 12 `ink-faint`.
3. **Twee kolommen** `flex:1`, gap 20 — links `flex:1`, rechts **326 px**.

**Linkerkolom**
- `Card` **Waar gaat deze studie over?** padding 19 21: kop Inter 700 · 16; tekst Inter 400 · 14.5 / 1.7 `ink-body`; "Lees meer" Inter 600 · 13.5 `teal`.
- `Card` **De lessen** `flex:1`, `overflow:hidden`: tabbalk (De lessen · Over · Notities) met rechts "6 van 40 afgerond"; daaronder de lijst met een verticale lijn van 2 px `line` op x = 32 en per les een rij van padding 11 18 met bovenrand `line-soft`:
  - **afgerond**: bol 26 px `success-fill` met wit vinkje; titel Inter 500 · 14.5 `ink`; actie "Herhalen"
  - **nu**: bol 26 px wit met 2.5 px `teal` rand; titel Inter 700; meta `teal` 600 met "· nu"; actie "Verder"
  - **nog te doen**: bol 26 px `line-soft` met 1 px `line`; titel en meta `ink-faint`; actie "Openen"
  Onderaan een `FadeBottom` van 64 px, want de lijst scrollt.

**Rail**
- `Card` **Verder waar je was**: eyebrow `teal` caps, "Les 7 — Slavernij en bevrijding" Inter 700 · 17, meta, `ProgressBar` met "15 %", primaire knop "Verder met les 7" (hoogte 44), en twee secundaire knoppen naast elkaar: Bewaren en Delen.
- `Card` **Over deze studie**: kop + hairline, dan vijf label/waarde-rijen (Soort, Gedeelte, Vertaling, Commentaar, Bijgewerkt), padding 8 0, hairline `line-soft` tussen.

---

## De lesflow — gedeelde chrome (11 t/m 15)

De les is een **focusmodus**: een eigen laag over de app, niet de gewone pagina-layout. Wat op alle vijf gelijk is:

**Ingeklapte zijbalk — 64 px.** Dezelfde zijbalk als elders, alleen icoon-only: app-icoon in een kop van 64 px met onderrand; daaronder de items als vierkanten van 40 px, radius 10, gap 4, in de bekende volgorde (Dashboard, Studies, Lezen, Notities — scheidingslijntje van 26 × 1 — Profiel, Instellingen, Feedback — scheidingslijntje — Beheer); actief item krijgt `teal-wash` met een `teal` glyph. Onderaan een boomavatar van 32 px met het niveaubolletje. Geen labels, geen tooltips in het ontwerp.

**Kopbalk — 52 px**, onderrand 1 px `line`:
- links een sluitknop van 32 px (`X`, `ink-muted`)
- gecentreerd: de lestitel "7. Slavernij en bevrijding" Inter 700 · 13.5 px met een klein stappen-glyph van 13 px (`ink-faint`) erachter, en daaronder "Les 7 van 40 · stap 2 van 4" Inter 400 · 11.5 px `ink-faint`
- rechts: drie knoppen van 32 px (volledig scherm, voorlezen, instellingen) en daarnaast de **AI-knop**: `teal` pil, hoogte 30, padding 0 12, wit sterretje van 14 px met "AI" Inter 700 · 12.5 wit

**Stappenpaneel links — 212 px**, rechterrand 1 px `line`, padding 16 0:
- "DEZE LES" caps 10 px `ink-faint`, daaronder de lestitel Inter 700 · 14.5 / 1.35
- vijf staprijen van 34 px: nummer Inter 600 · 11 px in 16 px breedte, label Inter 500 · 13 px. **Actief**: 2 px `teal` linkerrand, achtergrond `rgba(13,148,136,.07)`, nummer en label `teal-dark` 600. **Afgerond**: label `ink`, rechts een vinkje van 13 px `success-fill`. **Nog te doen**: `ink-muted`.
- onderaan, met een bovenrand: drie meta-rijen — Gedeelte → Exodus 7 · Tijd → ± 10 min · Van de studie → 6/40

**Voet — 68 px**, bovenrand 1 px `line`, padding 0 22: links "Vorige" (rand 1 px, hoogte 42, radius 10) of niets bij stap 1; midden de naam van de stap Inter 500 · 12.5 `ink-faint`; rechts de primaire knop (`teal`, hoogte 42, radius 10) — "Volgende", en op stap 4 "Les afronden".

Voor de donkere variant: zelfde maten, andere tokens. Zie `TOKENS-LES.md`.

---

## 11. Stap 1 — Het Woord · `screenshots/w11-het-woord.png`

Midden `flex:1`, `relative`, met een absolute scroller (padding 26 34 0) en een `FadeBottom` van 88 px. Binnen `max-width:640px`:
- eyebrow "Stap 01 · Het Woord" Inter 600 · 11 px ls 1.4 uppercase `teal-dark`
- titel "Exodus 7" Inter 700 · 30 px ls −0.5
- "STATENVERTALING" Inter 600 · 11 px ls 1.3 uppercase `ink-faint`
- hairline, dan de tekst in **Lora 400 · 17.5 px / 1.85** `scripture`, alinea-afstand 15, versnummer superscript Inter 600 · 11 px `ink-faint`

Rail **262 px**, padding 26 22 0, gap 14 — drie kaarten (`card`-stijl: achtergrond `#F9FAFB`, rand 1 px `line`, radius 12, padding 14 16), elk met een caps-kop van 10 px in `teal-dark`:
1. **VERTALING** — select "Statenvertaling" (hoogte 36, radius 9, wit), daaronder twee knoppen: "Voorlezen" met een teal play-glyph en een vierkant van 40 px met "Aa" in Lora.
2. **STRAKS DE VRAAG** — de reflectievraag in Lora 13 / 1.6 cursief `ink-muted`. Zo weet je tijdens het lezen waar je op let.
3. **MARKEREN** — "Selecteer een vers om het te markeren of er een notitie bij te schrijven."

## 12. Stap 2 — Verdieping · `screenshots/w12-verdieping.png`

Drie kolommen binnen de lesruimte: stappenpaneel · commentaar `flex:1` · paneel **344 px**.

**Commentaar** (rechterrand 1 px `line`):
- bronregel padding 14 26, onderrand: "COMMENTAARBRON" caps 12 `ink-faint`, een teal play-glyph, en een select "Matthew Henry (NL)"
- scroller met "Inleiding" Inter 700 · 19, body Inter 400 · 14.5 / 1.8, hairlines tussen verzen, verskoppen Inter 700 · 16, en uitgelichte blokken met `border-left:3px teal` op `teal-faint`, radius `0 10 10 0`, Inter 600 · 13.5 / 1.7. Subpunten springen 16 px in. `FadeBottom` 88 px.

**Rechterpaneel**:
- kop padding 13 18: icoonvak 34 px radius 9 `teal-wash` met een pin-glyph; "Achtergrond bij Exodus" Inter 700 · 13.5 met "Wie het schreef, wanneer en waarom" eronder; rechts een chevron
- tabs Beeld · Grondtekst · Notities (icoon 15 + label 12.5, actief `teal-dark` met 2 px onderstreping)
- inhoud: hint 12 px, dan beeldkaarten — rand 1 px, radius 12, een vlak van 132 px met de foto en daaronder padding 10 13 met plaatsnaam Inter 700 · 13 en verwijzing Inter 400 · 11.5 `ink-faint`
- onderaan vast: **vraagbalk** — veld `line-soft` met rand, hoogte 42, radius 10, "Vraag iets over Exodus 7…", en een `teal` verzendknop van 42 px

## 13. Stap 3 — Reflectie · `screenshots/w13-reflectie.png`

Midden padding 30 34 0, `max-width:640px`:
- eyebrow "Stap 03 · Reflectie"
- **de vraag is de kop**: Inter 700 · 27 px / 1.3 ls −0.4
- "JOUW AANTEKENING" caps 10.5 `ink-faint`
- tekstveld: `#F9FAFB`, rand 1 px `line`, radius 12, **hoogte 250**, padding 15 17, placeholder Inter 400 · 14.5 / 1.7 `ink-faint`
- daaronder links "Als je de les afrondt wordt dit bewaard als notitie, terug te vinden bij Notities." en rechts de teller "0/8000"

Rail 262 px: **GELEZEN** (icoonvak + "Exodus 7 / Statenvertaling" + "Terug naar de tekst") en **HULP NODIG?** met de knop "Geef me een aanzet" (rand 1 px, hoogte 36, teal sterretje). Het antwoord blijft van de gebruiker — dat staat er ook.

## 14. Stap 4 — Toetsing · `screenshots/w14-toetsing.png`

Midden padding 30 34 0, `max-width:660px`:
- eyebrow "Stap 04 · Toetsing", titel "Wat bleef er hangen?" Inter 700 · 27
- **vraagvoortgang**: "VRAAG 1 VAN 5" caps 11 `ink-faint` met daarnaast vijf segmenten van 4 px, gap 6, actief `teal`, rest `line-soft`
- de vraag Inter 700 · 20 / 1.4
- **antwoorden**: rijen met rand 1 px `line`, achtergrond `#F9FAFB`, radius 12, padding 15 17, gap 11. Links een letterblok van 28 px radius 8 (`line-soft` met `ink-muted`); tekst Inter 400 · 14.5.
  **Gekozen**: rand 1 px `teal`, achtergrond `rgba(13,148,136,.06)`, letterblok `teal` met witte letter, tekst 600.
- onder de lijst: "Je kunt je antwoord nog wijzigen tot je de les afrondt."

Rail 262 px: **DEZE LES** (Gedeelte, Vragen, Beantwoord) en **JOUW REFLECTIE** met het antwoord van stap 3 in Lora cursief.

De primaire knop in de voet heet hier **Les afronden**.

## 15. Les afgerond · `screenshots/w15-les-afgerond.png`

Geen stappenpaneel, geen voet — alleen de rail en de kopbalk. Inhoud gecentreerd op **470 px**:
- **scène** hoogte 246, radius 14, **rand 3 px `gold`**, `overflow:hidden`. Dit is de bestaande boomcomponent; in het prototype een gradiënt. Rechtsboven "+25 XP" op `rgba(6,48,44,.72)`; linksonder twee pillen: "Niveau 6" (`gold` met `gold-ink`) en "Jonge boom" (wit met `#0F172A`).
- "LES 7 VAN 40 AFGEROND" caps 11 `teal-dark`, titel Inter 700 · 26 ls −0.4, ondertitel "Exodus · Exodus 7" `ink-muted`
- **vier tegels** gap 11: +25 XP verdiend · 7/40 18% van de studie · Exodus 7 Gelezen · 10 min Leestijd. Waarde Inter 700 · 19 `teal-dark`, label Inter 400 · 11.5 `ink-faint`.
- **volgende les**: rij met een vierkant van 32 px (`teal-wash`, cijfer `teal-dark`), "HIERNA" caps 10 `teal-dark` en "8. De plagen beginnen · Exodus 8" Inter 700 · 13.5
- twee knoppen: "Verder met les 8" (`teal`, `flex:1`, hoogte 46) en "Overzicht" (rand 1 px)
