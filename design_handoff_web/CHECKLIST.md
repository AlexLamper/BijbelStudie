# Acceptatiecriteria

Meet op een viewport van **1440 × 900**. Een punt is goed of niet goed; "ziet er ongeveer zo uit" bestaat niet. Neem de screenshot ernaast.

## Shell — geldt op alle negen routes

- [ ] Zijbalk is **196 px** breed (197 inclusief rand) — op alle negen identiek
- [ ] Kopbalk is **64 px** hoog, wit, 1 px onderrand `#E5E7EB`
- [ ] Kopbalk heeft precies **vijf** onderdelen: titel · spacer · zoekveld 260 px · bel 38 px · profiel 34 px
- [ ] Kopbalk toont **alleen de paginatitel** — geen subtitel, datum, breadcrumb of telling
- [ ] Zoekveld: overal dezelfde breedte, placeholder overal exact "Zoek vers, studie of notitie", `⌘K` tegen de rechterrand
- [ ] Streakbadge is een sibling van de avatarcirkel en wordt niet afgeknipt; wit met het cijfer in `#0F766E`
- [ ] Het juiste zijbalkitem is actief per route; subitem Levensboom alleen op `/profiel` en `/profiel/boom`
- [ ] Zijbalkiconen: huis, mortarboard met tassel, boek met leeslint, notitieblok met pen
- [ ] App-icoon linksboven is `public/app-icon.png`, 30 × 30, radius 8

## Tokens en toegankelijkheid

- [ ] Geen enkele hexwaarde buiten `tokens.css` / de Tailwind-extensie
- [ ] **Geen tekst onder 10 px**, ook niet in badges
- [ ] **Geen witte tekst op goud.** Elk `#CA9A16`-vlak heeft `#422E04`
- [ ] Groeicijfers in Beheer zijn `#047857`, niet `#059669`
- [ ] Alle lopende tekst haalt 4,5:1; `#9CA3AF` alleen voor meta op 11 px en groter
- [ ] Inter voor UI, Lora voor bijbeltekst en versfragmenten — nergens omgekeerd

## Per route

**`/` Dashboard**
- [ ] Versbanner 218 px hoog; de drie ronde knoppen staan **onderaan** in de kaart
- [ ] Drie knoppen, in deze volgorde: hart · delen · drie puntjes
- [ ] Zes studiekaarten in 3 × 2
- [ ] Rail 320 px met drie kaarten: Je boom · Deze week · Bijbelboeken
- [ ] "Deze week": staven met afgeronde bovenkant, lege dagen grijs, vandaag `#0F766E`
- [ ] "Bijbelboeken" stopt bij zijn inhoud (`flex:none`), niet uitgerekt tot de bodem
- [ ] Heatmap: 39 + 27 tegels, vijf stappen, legenda Minder → Meer

**`/studies`**
- [ ] Zoekveld is **440 px**, niet de volle breedte, en zichtbaar als veld (witte vulling, rand `#D1D5DB`)
- [ ] Vier kaarten in "Nieuw deze maand", afbeeldinghoogte 88
- [ ] "Per bijbelboek →" staat rechts uitgelijnd naast "Alle studies"
- [ ] Vijf lijstrijen, allemaal **heel** — geen rij die door de kaartrand wordt gesneden

**`/lezen`**
- [ ] Body heeft **geen** padding; de panelen raken de schermrand, geen radius, geen kaartranden
- [ ] Werkbalk begint links met de leesvoorkeuren-knop, daarna de scheidingslijn
- [ ] Voorlezen is een **icoonknop van 32 px**, geen knop met label — in beide panelen
- [ ] Geen hoofdstuknavigatie onderin het leespaneel
- [ ] Beide panelen: inhoud is hoger dan het paneel, zodat de vervaging van 96 px op echte tekst valt
- [ ] Vijf tabs passen binnen het rechterpaneel; AI-assistent heeft een donkergroen sterretje; Grondtekst heeft een PRO-label

**`/notities`**
- [ ] Notities zijn **regels**, geen kaarten: rand tot rand met één hairline ertussen
- [ ] Geen datumkoppen
- [ ] Notitietekst 14.5 px regular, niet vet; versfragment in Lora achter een streep van 2 px

**`/beheer`**
- [ ] Vijf cijferkaarten in één rij, met MRR als eerste; **geen** Opzeggingen-kaart
- [ ] De tabel gaat over **gebruikers**, niet over studies
- [ ] "Recente feedback" en "Snel naar" zijn **siblings** van de tabelkaart, niet erin genest
- [ ] "Snel naar" bevat vijf items en alle vijf staan binnen de kaartrand
- [ ] E-mailadressen staan onder de namen in de tabel

**`/profiel`**
- [ ] Rail bevat vier kaarten op gelijke breedte (326 px): Je boom · Badges · Abonnement · Account
- [ ] Pro-labels gebruiken het goudverloop met rand, niet vlak goud, en `#422E04` als ink
- [ ] Account-kaart heeft drie label/waarde-rijen met hairlines

**`/profiel/boom`**
- [ ] Zijbalk en kopbalk zoals elke andere route (geen smalle rail, geen kaal scherm)
- [ ] Rechterpaneel is **446 px** en `#152229`
- [ ] Zes keuzetegels in twee kolommen, met de drie toestanden gekozen / beschikbaar / vergrendeld
- [ ] Niveaukaart linksonder met de XP-balk van 22 px en het label in de vulling
- [ ] De boom komt uit de bestaande component — niet uit het prototype nagebouwd

**`/instellingen`**
- [ ] Secties staan als **knoppenrij boven** de panelen, niet als lijst links
- [ ] Voorbeeldblok staat in de rail, niet in het paneel
- [ ] Toggles 46 × 27 met een knop van 21 px

**`/feedback`**
- [ ] Formulier gebruikt de volle breedte naast de rail (geen max-width van 700)
- [ ] Sterbeoordeling staat boven "Soort", met vijf sterren en het cijfer rechts
- [ ] Rail toont "Waarom feedback geven?" met drie genummerde regels

## Studie-detail en de lesflow

**`/studies/[slug]`**
- [ ] Banner 142 px met kruimelpad, titel en drie pillen
- [ ] Vier cijferkaarten: Lessen · Tijd · Bijbelboeken · Voortgang, met de eenheid in `ink-faint` naast de waarde
- [ ] Lessenlijst heeft een doorlopende verticale lijn en drie toestanden (afgerond / nu / nog te doen)
- [ ] Rail 326 px met "Verder waar je was" en "Over deze studie"

**Lesflow — geldt op alle vijf**
- [ ] Zijbalk is de **gewone zijbalk, ingeklapt**: 64 px, app-icoon in een kop van 64 px, dezelfde itemvolgorde met scheidingslijntjes, avatar onderaan
- [ ] Kopbalk 52 px: sluitknop links; gecentreerd de lestitel met het stappen-glyph erachter en daaronder "Les 7 van 40 · stap N van 4"; rechts drie knoppen plus de teal AI-pil
- [ ] Stappenpaneel 212 px met vijf stappen; actief met 2 px teal linkerrand, afgerond met een vinkje
- [ ] Meta onderaan het stappenpaneel: Gedeelte · Tijd · Van de studie
- [ ] Voet 68 px: Vorige links (niet op stap 1), stapnaam in het midden, primaire knop rechts; op stap 4 heet die "Les afronden"
- [ ] Licht en donker gebruiken dezelfde componenten, alleen andere tokens
- [ ] Op donker zijn kopjes en links `#2DD4BF`, op licht `#0F766E` — nergens `#0D9488` als kleine tekst op wit

**Per stap**
- [ ] Stap 1: leesmaat 640 px, Lora 17.5/1.85, vervaging van 88 px die op **echte tekst** valt
- [ ] Stap 2: paneel 344 px, tabs Beeld/Grondtekst/Notities, vraagbalk vast onderaan
- [ ] Stap 3: de vraag is de kop; veld van 250 px; teller rechtsonder
- [ ] Stap 4: vijf voortgangssegmenten; antwoorden met letterblok; gekozen optie in teal
- [ ] Afronding: geen stappenpaneel en geen voet; scène met 3 px gouden rand; vier tegels; volgende les

## Functioneel — na elke route

- [ ] Geen bestand buiten de presentatielaag gewijzigd (`git diff --stat` bevat geen `api/`, geen schema, geen middleware)
- [ ] Alles wat vóór de wijziging werkte, werkt nog: inloggen, lezen, een notitie maken, een les afronden, de adminpagina alleen als beheerder
- [ ] Geen nieuwe dependencies
- [ ] Geen console-errors of hydration-warnings
