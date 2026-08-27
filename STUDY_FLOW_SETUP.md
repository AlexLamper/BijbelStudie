# Begeleide studieflow — configuratie

De code staat in de repository. Wat hieronder staat kan alleen buiten de code
gebeuren: environment variables, een eenmalig backfill-script en (later) een
cron.

Zonder deze stappen werkt de flow gewoon — alleen de quizstap valt weg en er
worden geen herinneringen verstuurd.

---

## 1. Quizkoppeling met BijbelQuiz

De laatste stap van elke les leent vragen van bijbelquiz.com. Twee servers, één
gedeeld geheim.

### Genereer één sleutel

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Diezelfde waarde gaat in **beide** projecten:

| Project | Variabele |
|---|---|
| `bijbelstudie` | `BIJBELQUIZ_SERVICE_KEY` |
| `bijbelquiz` | `BIJBELSTUDIE_SERVICE_KEY` |

En in `bijbelstudie` daarnaast:

```bash
BIJBELQUIZ_API_BASE=https://www.bijbelquiz.com
```

> Staat de sleutel in BijbelQuiz niet ingesteld, dan weigeren de
> `/api/service/*`-routes **elk** verzoek. Dat is expres: een lege env-var mag
> nooit "laat iedereen binnen" betekenen.

### Eenmalige backfill in BijbelQuiz

Vragen worden aan een bijbelgedeelte gekoppeld via `bibleReference`. Dat veld is
vrije tekst, dus doorzoeken zou betekenen: elke vraag van elke quiz scannen bij
elk verzoek. Het `Quiz`-model slaat de ontlede verwijzing nu op en indexeert die,
maar bestaande vragen moeten één keer worden bijgewerkt:

```bash
cd C:\Projects\bijbelquiz
$env:MONGODB_URI="<je mongodb uri>"

npm run quiz:backfill-refs            # droogloop, rapporteert alleen
npm run quiz:backfill-refs -- --apply  # schrijft
```

De droogloop toont ook welke verwijzingen **niet** te ontleden zijn. Die matchen
daarna nooit — dat is de juiste manier om te falen, want gokken zou vragen over
het ene gedeelte in een les over het andere stoppen.

### Waarom een aparte boekcodemap

De projecten spellen verschillende boeknamen anders:

| bijbelstudie (SV) | bijbelquiz |
|---|---|
| Mattheüs | Matteüs |
| Markus | Marcus |
| Lukas | Lucas |
| 1 Korinthe | 1 Korintiërs |
| 1 Thessalonicenzen | 1 Tessalonicenzen |

Een directe string-vergelijking geeft voor die boeken **stil nul vragen**.
Daarom mappen beide kanten naar canonieke codes via `lib/bookCanon.ts` (A) en
`src/lib/book-canon.ts` (B). Die twee bestanden zijn bewust identiek —
gedupliceerd, niet gedeeld, want een package voor een lijst van 66 regels die
nooit verandert is de buildcomplexiteit niet waard. **Wijzig je de één, wijzig
dan de ander.**

---

## 2. Herinneringen

Er is nog **geen** e-mail- of pushverzender in dit project. De cron-route bestaat
al en is bewust nog niet aan `vercel.json` gekoppeld.

```bash
STUDY_REMINDER_CRON_SECRET=<geheim>   # valt terug op CRON_SECRET
```

Droogloop, zelfde patroon als `/api/internal/reconcile-subscriptions`:

```bash
curl -H "Authorization: Bearer <geheim>" \
  "https://www.bijbelstudie.io/api/internal/study-reminders?dryRun=1"
```

Dat toont wie er aan de beurt is en wanneer hun volgende moment zou vallen,
zonder iets te schrijven. `?send=1` schrijft wél (en schuift `nextReminderAt`
door), maar verstuurt nog niets — de plek waar een verzender komt staat als
`TODO` in de route.

**Voeg de cron pas toe aan `vercel.json` als er echt verstuurd wordt.**

Twee dingen om te weten:

- De mobiele app plant zijn herinnering **lokaal op het toestel**. Een servercron
  zou app-gebruikers een tweede melding geven; daarom staat `reminderChannel`
  standaard op `email`.
- De backfill van bestaande studies zet `nextReminderAt` bewust op `null`.
  Anders mailt de eerste cronrun iedereen die ooit een studie aanraakte — zo
  raakt een verzenddomein op een blocklist.

---

## 3. Content schrijven

De flow werkt met **nul** geschreven tekst: elk veld heeft een fallback. Je
verbetert per studie.

- Index (titels, lessen, `about`, `outcomes`): `lib/data/curated-studies.ts` —
  client-safe, dus hier géén proza.
- Proza per les: `lib/data/study-lessons/<studyId>.ts` — server-only.
- Registreer een nieuwe studie in `lib/data/study-lessons/index.ts`.

`lib/data/study-lessons/opstanding.ts` is volledig ingevuld als voorbeeld: alle
optionele velden staan erin, zodat de vorm in één blik zichtbaar is.

Wat er gebeurt als je iets weglaat:

| Stap | Zonder tekst |
|---|---|
| Intro | stap wordt **overgeslagen** (leeg is erger dan niets) |
| Het Woord | passage uit de les zelf |
| Verdieping | commentaar + context uit het gedeelte |
| Reflectie | `lesson.focus` wordt de vraag |
| Toetsing | "Geen quiz voor dit gedeelte", les is af te ronden |

> `Lesson.focus` nooit hernoemen of verwijderen. `/api/v1/studies` geeft
> `curatedStudies` letterlijk terug en de uitgebrachte Flutter-app rendert dat
> veld. Optionele velden toevoegen is veilig.

Wil je een quiz exact koppelen, zet dan de slugs in de les:

```ts
quiz: { quizSlugs: ['de-opstanding'], questionCount: 5 }
```

Dat is deterministisch en hangt niet af van het ontleden van vrije tekst.

---

## Wat er is gewijzigd aan bestaande routes

| Route | Nu |
|---|---|
| `/studie` | Dispatcher. Hervat je laatste studie; `?book=&chapter=` gaat 1-op-1 naar `/lezen` |
| `/studie/<studyId>/<dag>` | De vijfstapsflow |
| `/studies/<id>` | Was een redirect-stub, nu de publieke detail- en instelpagina |
| `/lezen` | Vrij lezen **plus** de vijf bronnen-tabs die eerst op `/studie` stonden |

De 66 publieke boekpagina's, het dashboard en de zijbalk wijzen nu naar
`/lezen`. `robots.ts` blokkeert ook `/studie/`, en de tien studiepagina's staan
in de sitemap.
