# Privacybeleid — concept voor juridische review

**Status: NIET PUBLICEREN zonder review.** Dit is een concept dat de feitelijke
gegevensstromen van de app beschrijft, zodat een jurist het kan omzetten in een
definitief beleid. De live pagina (`app/privacybeleid/page.tsx`) is nog de oude,
algemene tekst en is met opzet niet aangepast.

Wat de owner nog moet aanvullen (staat hieronder als `«…»`):

- juridische naam van de verwerkingsverantwoordelijke, adres, KVK, BTW-nummer
- of er een functionaris gegevensbescherming is (waarschijnlijk niet verplicht)
- of er verwerkersovereenkomsten (DPA's) liggen bij de partijen in §3
- definitieve bewaartermijn voor een actief account dat niemand verwijdert

---

## 1. Verwerkingsverantwoordelijke

«Juridische naam», «adres», KVK «nummer», BTW «nummer». Contact:
info@bijbelstudie.io.

## 2. Welke gegevens we verwerken

Feitelijk, uit `models/`:

| Categorie | Velden | Bron |
|---|---|---|
| Account | naam, e-mailadres, wachtwoord-hash (bcrypt), bio, profielfoto-URL, `googleId` / `appleId` | `models/User.js` |
| Voortgang | gelezen hoofdstukken, streak, langste streak, XP, level, badges, laatst gelezen hoofdstuk, boom-/avatarkeuze | `models/User.js`, `StudyProgress`, `StudyLessonState`, `ReadingHistory`, `ReadingSession`, `PlanEnrollment`, `StudyEnrollment`, `DailyBibleProgress` |
| Eigen inhoud | notities, bookmarks, groepsberichten | `Note`, `Bookmark`, `GroupMessage`, `StudyGroup` |
| Abonnement | `stripeCustomerId`, `stripeSubscriptionId`, status, interval, periode-einde, opzegreden en -toelichting, store-aankoopstatus (Apple/Google) | `models/User.js`, `WebhookEvent` |
| AI-gebruik | gestelde vragen en gegenereerde antwoorden, verbruik per gebruiker | `AiUsage`, `AiAnswer`, `AiSpend` |
| Spraak | tekst die naar spraak is omgezet, verbruik per gebruiker | `TtsUsage` |
| Gebruiksstatistiek | gebeurtenissen in de app (welke pagina, welk hoofdstuk, welke les) | `AnalyticsEvent` |
| Feedback | beoordeling en vrije tekst | `Feedback` |
| Sessies | vernieuwingstokens voor de mobiele app | `RefreshToken` |

Wachtwoorden worden nooit als leesbare tekst opgeslagen. Betaalgegevens
(kaartnummers) komen nooit op onze servers: die gaan rechtstreeks naar Stripe
respectievelijk de App Store / Google Play.

## 3. Verwerkers (ontvangers)

Alle partijen die namens ons gegevens verwerken, met de rechtsgrond en de
plaats van verwerking. «Controleer per partij of er een DPA ligt.»

| Partij | Waarvoor | Gegevens | Locatie |
|---|---|---|---|
| Vercel Inc. | hosting, logging, Speed Insights | alle verkeer, IP-adres, geanonimiseerde prestatiemetingen | EU-regio + VS (moederbedrijf) |
| MongoDB Atlas | database | alles in §2 | «EU-regio bevestigen in Atlas» |
| Stripe | betalingen en abonnementen web | naam, e-mailadres, betaalgegevens, abonnementsstatus | EU + VS |
| RevenueCat | abonnementen in de mobiele app | app-gebruikers-id, aankoopstatus | VS |
| Apple / Google | aankopen in de app, "Sign in with Apple", Google-inloggen | account-identificatie, aankopen | VS |
| Google (Gemini API) | AI-antwoorden | de vraag en de bijbelcontext | VS |
| Google (Cloud Text-to-Speech) | voorgelezen tekst | de aangeboden tekst | VS |
| Resend | transactionele e-mail (wachtwoord herstellen, herinneringen) | naam, e-mailadres, inhoud van de e-mail | EU + VS |

Doorgifte buiten de EER gebeurt op basis van de standaardcontractbepalingen
(SCC's) van de betreffende leverancier. «Jurist: vermeld dit expliciet en
verwijs naar de DPA's.»

## 4. Rechtsgronden

- Uitvoering van de overeenkomst: account, voortgang, abonnement, AI-antwoorden.
- Gerechtvaardigd belang: beveiliging, misbruikpreventie, geaggregeerde
  gebruiksstatistiek om de app te verbeteren.
- Toestemming: optionele e-mailherinneringen, niet-noodzakelijke cookies.
- Wettelijke plicht: fiscale bewaarplicht voor facturen (7 jaar).

## 5. Bewaartermijnen

| Gegeven | Termijn | Waar geregeld |
|---|---|---|
| Account en voortgang | zolang het account bestaat, «+ x maanden na laatste login» | — |
| Archiefkopie na accountverwijdering | **90 dagen**, daarna verwijderd | `models/DeletedAccount.js`, `scripts/purge-deleted-accounts.mjs` |
| Facturen en betaalgegevens | 7 jaar (fiscale bewaarplicht) | Stripe |
| AI-vragen en -antwoorden | «termijn kiezen; nu onbeperkt» | `AiUsage`, `AiAnswer` |
| Gebruiksstatistiek | «termijn kiezen; nu onbeperkt» | `AnalyticsEvent` |
| Vernieuwingstokens | tot uitloggen of verlopen | `RefreshToken` |

**Let op bij het verwijderen van een account:** de app kopieert het account en
alle bijbehorende documenten eerst naar `deletedaccounts` en verwijdert daarna.
Dat is een bewuste veiligheidsmaatregel na het incident van 2026-09-08 (zie
`models/DeletedAccount.js`). Dit betekent dat "verwijderen" in de praktijk
"binnen 90 dagen definitief verwijderd" is, en dat moet het beleid ook zeggen.
De kopie van een adminaccount blijft staan tot die handmatig wordt verwijderd.

## 6. Rechten van de gebruiker

Inzage, rectificatie, verwijdering, beperking, bezwaar, overdraagbaarheid, en
het recht een klacht in te dienen bij de Autoriteit Persoonsgegevens.
Verwijderen kan de gebruiker zelf: Profiel → Account verwijderen (in de app).
«Web: er is nog geen selfservice-verwijdering op de website — of toevoegen, of
in het beleid vermelden dat het per e-mail gaat.»

## 7. Cookies

Noodzakelijk: sessiecookie (NextAuth), taalcookie, cookie voor "herhaalbezoek"
die het landingsverhaal overslaat. Analytisch: Vercel Speed Insights. «Jurist:
bepaal of een cookiebanner nodig is; nu is er geen.»

## 8. Beveiliging

Versleuteling in transport (HTTPS) en in rust (Atlas), wachtwoord-hashing met
bcrypt, toegang tot de productiedatabase alleen voor de beheerder,
archief-voor-verwijdering als bescherming tegen gegevensverlies.

## 9. Kinderen

«Minimumleeftijd bepalen (16 in NL zonder ouderlijke toestemming) en vermelden.»

## 10. Wijzigingen

Datum van laatste wijziging op de pagina zetten en een korte wijzigingslog
bijhouden.
