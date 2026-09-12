# Harde regels

## 1. Alleen layout en weergave — niets functioneel

Dit is een herontwerp van de presentatielaag. Alles wat vandaag werkt, werkt daarna precies zo. **Raak niet aan:**

- `app/api/**`, server actions, route handlers
- data fetching, queries, ORM/Prisma-schema's, migraties
- auth, middleware, rechten, de admin-afscherming
- state management, context providers, hooks met business logic
- routing en URL's — met één uitzondering: er komt geen nieuwe route bij, alle negen bestaan al
- `.env`, config, build setup

**Wel veranderen:** de JSX-boom binnen een pagina, componentopdeling voor presentatie, classNames, spacing, kleur, typografie, iconen, koppen, en de volgorde waarin bestaande onderdelen op het scherm staan.

Werkwijze per pagina: laat de bestaande data-aanroepen en hooks staan zoals ze zijn, en vervang alleen wat ze renderen. Als een pagina nu `const { data } = useStudies()` doet, blijft die regel staan.

## 2. Botst het ontwerp met bestaand gedrag? Het gedrag wint.

Meld het en pas het ontwerp aan. Herschrijf nooit werkende logica om een mock te laten kloppen. Verwijder ook geen functie omdat die niet in een mock staat — de mocks tonen één toestand van een scherm, niet de volledige functieset.

## 3. Twee plekken waar de UI nieuwe data nodig heeft

Voeg die toe als **lees-alleen afgeleide** van wat er al is, zonder het datamodel te wijzigen:

1. een voortgangsstatus per bijbelboek (0–4, voor de heatmap op het dashboard);
2. het aantal notities en markeringen van het geopende hoofdstuk (voor de kop van de lezer).

## 4. Wat je van /profiel/boom wél en níet overneemt

Dit scherm is het enige waar de **inhoud** van het linkerpaneel niet uit het ontwerp komt.

**Niet overnemen:** de boom, de heuvels, de dieren en de scène-illustratie zoals ze in het prototype getekend zijn. Dat zijn gradiënt-benaderingen. De echte boom wordt runtime gerenderd door de bestaande boomcomponent; die blijft ongewijzigd en vult het linkerpaneel.

**Wel exact overnemen:**

- de tweedeling: linkerpaneel `flex:1` met de scène, rechterpaneel **446 px** vast;
- de achtergrondkleur van het rechterpaneel: `#152229`;
- de tabbalk in dat paneel (Boomsoort · Omgeving · Dieren · Ring · Groei) met hoogte, typografie en de 2 px teal onderstreping;
- de hintregel onder de tabs;
- het keuzeraster: twee kolommen, gap 14, tegels met een 108 px hoge afbeelding boven en tekst eronder, en de drie toestanden (gekozen / beschikbaar / vergrendeld);
- de niveaukaart linksonder over de scène: positie, `rgba(15,23,42,.82)`, rand `rgba(255,255,255,.12)`, radius 14, de XP-balk met het label erin, en de twee regels eronder;
- de twee pillen linksboven (terug naar Profiel, Deel link) met `rgba(17,24,39,.72)`;
- de kop VOORTGANG / Je boom over de scène;
- dezelfde zijbalk en kopbalk als elke andere route.

Kort gezegd: **de chrome, de structuur en de styling zijn spec; de boom zelf is een placeholder.** Dezelfde regel geldt overal waar in het prototype een gradiëntvlak staat voor beeldmateriaal van de server: studiebanners, de versscène en de boomavatar. Structuur en maten overnemen, de illustratie niet.

## 5. Verzin geen data

De getallen in de mocks (MRR € 1.842, 19 dagen reeks, 13 van 66 boeken) zijn voorbeelden. Sluit aan op wat de bestaande bron teruggeeft. Als een veld nog niet bestaat: bouw de UI, laat de waarde leeg of nul, en meld het.
