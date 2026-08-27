# Domein migratie naar bijbelstudie.io

Alles wat in de code kon worden aangepast is gedaan. **`www.bijbelstudie.io`
is het canonieke domein** — de apex (`bijbelstudie.io`) wordt met een
308-redirect doorgestuurd naar `www`.

Dat is de omgekeerde richting van hoe je het domein waarschijnlijk gewend was
te schrijven, en de reden staat hieronder.

---

## Wat er misging: redirect-loop, nu gefixt

Na het live zetten gaf `bijbelstudie.io` (en `www.bijbelstudie.io`) de fout
"redirected you too many times", en Google Search Console kreeg "Fout met
omleiding" bij URL-inspectie.

**Oorzaak:** Vercel heeft, los van deze codebase, zijn eigen edge-level
domain-redirect ingesteld toen beide domeinen aan het project werden
gekoppeld — en die stuurde de apex door naar `www`. De code deed op dat moment
het omgekeerde (`www` → apex, in `middleware.ts`). Twee systemen die
recht tegenover elkaar redirecten = oneindige lus.

Er is geen Vercel CLI-commando om die eigen edge-redirect om te draaien (dat
zit alleen in de dashboard-UI, waar de "primaire domein"-instelling niet
vindbaar bleek — zie hieronder). De code is daarom aangepast om Vercel's
keuze te volgen: **`www` is nu overal canoniek**, precies zoals Vercel het al
deed. Dat is inmiddels gedeployed; geen actie van jouw kant nodig om de loop
zelf te herstellen.

**Wel belangrijk:** als je íets in Stripe of Google al had ingesteld met een
kale `bijbelstudie.io`-URL (zonder `www`), moet dat naar de `www`-variant. Zie
stap 3 en 4 hieronder — dit is de reden dat ik die secties opnieuw doorloop.

---

## 1. Domein koppelen (Hostinger + Vercel) — al gedaan

Beide domeinen staan geaccepteerd in Vercel, DNS staat goed (anders zou er
geen enkele redirect-response terugkomen). Geen "Primary Domain"-knop nodig —
die bestaat niet apart in de huidige Vercel-UI. Wat telt is de eigen
edge-redirect die Vercel al toepast (apex → www), en dat is nu precies wat de
code ook verwacht. Niets meer te doen hier.

**Oude domein.** Als je `www.bijbel-studie.com` nog bezit: `middleware.ts`
stuurt beide varianten daarvan nu al met een 301 door naar
`https://www.bijbelstudie.io`. Dat hoeft dus niet apart in Vercel te worden
ingesteld — de app doet het zelf.

---

## 2. Vercel environment variables

**Settings → Environment Variables**, voor **Production**:

| Variabele | Nieuwe waarde |
|---|---|
| `NEXTAUTH_URL` | `https://www.bijbelstudie.io` |
| `NEXT_PUBLIC_BASE_URL` | `https://www.bijbelstudie.io` |

Let op de `www.` — dat is nu het canonieke domein. Als deze nog op de kale
apex staan, corrigeer ze en redeploy (Vercel doet dit meestal automatisch bij
een env-var-wijziging op Production).

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `MONGODB_URI`, alle `STRIPE_*`
price-ids en overige variabelen hoeven niet te wijzigen.

---

## 3. Google Cloud Console (inloggen met Google)

1. [Google Cloud Console](https://console.cloud.google.com) → jouw project →
   **APIs & Services → Credentials**.
2. Open de OAuth 2.0 Client ID die `GOOGLE_ID` / `GOOGLE_SECRET` levert.
3. Onder **Authorized JavaScript origins**, controleer dat beide erin staan
   (geen kwaad om allebei te laten staan, ook al is alleen `www` canoniek):
   - `https://bijbelstudie.io`
   - `https://www.bijbelstudie.io`
4. Onder **Authorized redirect URIs**, controleer:
   - `https://www.bijbelstudie.io/api/auth/callback/google` ← deze moet er
     zijn, dit is de URL die daadwerkelijk wordt gebruikt
   - `https://bijbelstudie.io/api/auth/callback/google` (optioneel, onschadelijk)
5. Laat de oude `bijbel-studie.com`-regels staan totdat je zeker weet dat
   niemand meer via de oude links inlogt.

---

## 4. Stripe — controleer dit als eerste, kan livebetalingen raken

Zie ook de sectie bovenaan `MONETISATION_SETUP.md`.

1. **Webhook endpoint — check de exacte URL die je al hebt toegevoegd.** Als
   die zonder `www` is aangemaakt (`https://bijbelstudie.io/api/webhooks/stripe`),
   werkt hij zoals de situatie nu is **niet betrouwbaar**: de apex redirect
   naar `www`, en Stripe volgt bij webhook-afleveringen geen 3xx-redirects
   voor een POST — precies het "Failed to connect to remote host"-patroon dat
   je net bij de oude endpoint zag. Open Dashboard → **Developers → Webhooks**
   en controleer de URL van de endpoint die je vandaag hebt toegevoegd:
   - Moet zijn: `https://www.bijbelstudie.io/api/webhooks/stripe`
   - Staat er de kale apex, bewerk de endpoint (of maak 'm opnieuw aan) met de
     `www`-variant. De signing secret hoeft dan niet te wijzigen als je de
     bestaande endpoint bewerkt; maak je 'm opnieuw aan, dan wel een nieuwe
     secret naar `STRIPE_WEBHOOK_SECRET` in Vercel kopiëren.
   - Events (ter controle): `checkout.session.completed`,
     `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
     `customer.subscription.created`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `customer.subscription.paused`,
     `customer.subscription.resumed`, `invoice.payment_failed`,
     `invoice.payment_succeeded`
2. **Oude endpoint** (`www.bijbel-studie.com/api/webhooks/stripe`) — zet deze
   nu uit. Die faalt sinds de 301-redirect op het oude domein sowieso
   gegarandeerd bij elke aflevering; er is geen reden 'm nog aan te laten.
3. **Terms of Service URL.** Dashboard → **Settings → Public details** → zet
   de URL op `https://www.bijbelstudie.io/algemene-voorwaarden`.
4. **Customer portal** (**Settings → Billing → Customer portal**): controleer
   of daar een "return to business website"-link met het oude domein staat.

Prijzen, producten en de Stripe-account zelf zijn domein-onafhankelijk.

---

## 5. Google Search Console (SEO)

1. Property voor `bijbelstudie.io` (Domain property dekt automatisch zowel
   `https://` als `www` — dat is dus al goed zo, geen aparte www-property
   nodig).
2. Sitemap: `https://www.bijbelstudie.io/sitemap.xml` (let op de `www.` — dit
   is de URL die de site nu daadwerkelijk zelf opgeeft in `robots.txt`).
3. **URL-inspectie op `/studie` gaf "Geblokkeerd door robots.txt" — dat is
   correct, geen bug.** Die pagina redirect anonieme bezoekers altijd naar
   `/`, en staat daarom bewust op de blocklist. Test in plaats daarvan een
   publieke pagina: `/`, `/bijbelstudie`, `/studies` of `/hulpbronnen`.
4. **Change of Address**, als je het oude domein nog bezit: wijs naar de
   nieuwe property. De eerdere foutmelding ("301-omleiding vanaf homepage:
   omgeleid naar locatie buiten de bestemmingssite") kwam doordat er nog geen
   redirect van het oude domein naar het nieuwe bestond — dat staat er nu wel
   (zie boven), dus dit zou nu moeten slagen. Probeer het opnieuw.

---

## 6. Overig, geen actie nodig

- **Apple Sign-In bundle-ID's** (`com.bijbel-studie.app`,
  `com.bijbel-studie.app.signin` in `lib/oauthVerify.ts` / `APPLE_CLIENT_IDS`).
  Geen domeinen, vaste bundle-identifiers van de iOS-app bij Apple. **Niet
  aanpassen** — dat breekt Apple-inloggen in de app.
- **NBG51-licentie** (`lib/mobileLicensing.ts`): tekst noemt expliciet dat het
  NBG-contract is "scoped to www.bijbel-studie.com only, valid to 2029-12-31".
  Juridisch feit uit een getekend contract, geen configuratiewaarde — niet
  aangepast. Moet je vertaling ook via `bijbelstudie.io` aanbieden, stem dat
  eerst af met de rechthebbende.
- **`sitemap.xml`, `robots.txt`, canonicals, OG-afbeeldingen, JSON-LD**:
  volgen automatisch mee uit `lib/seo/constants.ts`.
- **MongoDB, AI-providers, TTS**: geen domeinafhankelijkheid.

---

## Volgorde-samenvatting

1. ~~Hostinger DNS + Vercel domeinen koppelen~~ — al gedaan
2. Vercel env vars checken: staat er `www.` voor `NEXTAUTH_URL` en
   `NEXT_PUBLIC_BASE_URL`?
3. Google Cloud Console: `www`-redirect-URI aanwezig?
4. **Stripe: check of de nieuwe webhook-URL `www.` heeft — dit is de
   belangrijkste, kan live betalingen raken. Zet de oude endpoint uit.**
5. Search Console: sitemap opnieuw indienen met `www.`-URL, test een publieke
   pagina i.p.v. `/studie`, probeer Change of Address opnieuw.

Test na afloop, in deze volgorde: `https://bijbelstudie.io` moet direct
doorschieten naar `https://www.bijbelstudie.io` (geen loop meer) → inloggen
met Google → een testbetaling (test mode) → check in het Stripe Dashboard dat
de webhook een 200 teruggeeft.
