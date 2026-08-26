# Domein migratie naar bijbelstudie.io

Alles wat in de code kon worden aangepast is gedaan. `bijbelstudie.io` (zonder
`www`) is nu overal het canonieke domein — `www.bijbelstudie.io` wordt met een
308-redirect doorgestuurd naar de apex, hetzelfde patroon als voorheen met
`www.bijbel-studie.com`.

Wat hieronder staat kan alleen buiten deze repository gebeuren: bij Hostinger,
Vercel, Google Cloud Console, Google Search Console en Stripe. Doorloop ze in
deze volgorde — latere stappen hangen van eerdere af.

---

## 1. Domein kopen en koppelen (Hostinger + Vercel)

1. Koop `bijbelstudie.io` bij Hostinger.
2. Ga in Vercel naar je project **bijbelstudie** → **Settings → Domains**.
3. Voeg **beide** toe: `bijbelstudie.io` en `www.bijbelstudie.io`.
4. Vercel toont welke DNS-records je nodig hebt (meestal een `A`-record naar
   `76.76.21.21` voor de apex, en een `CNAME` naar `cname.vercel-dns.com` voor
   `www`). Zet die exacte records bij Hostinger neer, onder **DNS / Nameservers**.
5. Stel in Vercel `bijbelstudie.io` in als **Primary Domain** — `www` staat er
   al als redirect naar toe zodra beide domeinen gekoppeld zijn (Vercel doet
   dit automatisch bovenop de eigen 308 in `middleware.ts`).
6. Wachten op DNS-propagatie (meestal minuten tot een paar uur). Vercel zet het
   SSL-certificaat automatisch klaar zodra de records kloppen.

**Oude domein.** Als je `www.bijbel-studie.com` nog bezit: laat 'm gewoon in
Vercel staan en voeg een redirect toe (**Settings → Domains** → bewerk het oude
domein → "Redirect to" → `bijbelstudie.io`). Dat behoudt SEO-waarde van
binnenkomende links. Ga je het domein opzeggen, dan hoeft dit niet.

---

## 2. Vercel environment variables

**Settings → Environment Variables**, voor **Production**:

| Variabele | Nieuwe waarde |
|---|---|
| `NEXTAUTH_URL` | `https://bijbelstudie.io` |
| `NEXT_PUBLIC_BASE_URL` | `https://bijbelstudie.io` |

Redeploy na het wijzigen (Vercel doet dit meestal automatisch bij een
env-var-wijziging op Production; zo niet, trigger een redeploy vanaf de laatste
commit).

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `MONGODB_URI`, alle `STRIPE_*` price-ids en
overige variabelen hoeven **niet** te wijzigen — die zijn domein-onafhankelijk.

---

## 3. Google Cloud Console (inloggen met Google)

Zonder deze stap breekt "Inloggen met Google" zodra het oude domein niet meer
bereikbaar is.

1. [Google Cloud Console](https://console.cloud.google.com) → jouw project →
   **APIs & Services → Credentials**.
2. Open de OAuth 2.0 Client ID die `GOOGLE_ID` / `GOOGLE_SECRET` levert.
3. Onder **Authorized JavaScript origins**, voeg toe:
   - `https://bijbelstudie.io`
   - `https://www.bijbelstudie.io`
4. Onder **Authorized redirect URIs**, voeg toe:
   - `https://bijbelstudie.io/api/auth/callback/google`
   - `https://www.bijbelstudie.io/api/auth/callback/google`
5. Laat de oude `bijbel-studie.com`-regels staan totdat je zeker weet dat
   niemand meer via de oude links inlogt — verwijderen kan later.
6. Als je ook een **OAuth consent screen** hebt met een "Homepage" of "Privacy
   policy"-link naar het oude domein: werk die bij naar `bijbelstudie.io`.

`GOOGLE_ID` en `GOOGLE_SECRET` zelf blijven ongewijzigd — dat zijn credentials,
geen domeinreferenties.

---

## 4. Stripe

Zie ook de nieuwe sectie bovenaan `MONETISATION_SETUP.md` — dit is de
samenvatting met de exacte stappen.

1. **Webhook endpoint.** Dashboard → **Developers → Webhooks** → **Add
   endpoint**:
   - URL: `https://bijbelstudie.io/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`,
     `customer.subscription.paused`, `customer.subscription.resumed`,
     `invoice.payment_failed`, `invoice.payment_succeeded`
   - Kopieer de signing secret (`whsec_...`) naar `STRIPE_WEBHOOK_SECRET` in
     Vercel (Production).
   - Laat de oude endpoint (naar `www.bijbel-studie.com`) actief staan totdat de
     nieuwe een paar succesvolle deliveries heeft gehad, verwijder 'm dan.
2. **Terms of Service URL.** Dashboard → **Settings → Public details** → zet de
   URL op `https://bijbelstudie.io/algemene-voorwaarden`.
3. **Customer portal** (als geconfigureerd onder **Settings → Billing → Customer
   portal**): controleer of daar een "return to business website"-link met het
   oude domein staat en werk die bij.

Prijzen, producten en de Stripe-account zelf zijn domein-onafhankelijk — die
hoef je niet aan te raken.

---

## 5. Google Search Console (SEO)

1. Voeg `bijbelstudie.io` toe als nieuwe property (Domain property heeft de
   voorkeur — dekt automatisch zowel `https://` als `www`).
2. Verifieer via de DNS-`TXT`-record die Search Console geeft (zet 'm bij
   Hostinger naast de records uit stap 1).
3. Dien de sitemap in: `https://bijbelstudie.io/sitemap.xml` (deze URL is al
   correct — `app/sitemap.ts` genereert 'm uit `lib/seo/constants.ts`).
4. Gebruik **URL-inspectie** op een paar belangrijke pagina's (home, `/studie`,
   `/hulpbronnen`) en vraag indexering aan, dat versnelt de eerste crawl.
5. Laat de oude property voor `www.bijbel-studie.com` staan (als je die had) —
   die blijft nuttig om de overgang te monitoren, ook al bezit je het domein
   straks niet meer actief.
6. **Optioneel, sterk aanbevolen als je het oude domein behoudt:** gebruik
   Search Console's **Change of Address**-tool op de oude property, wijzend
   naar de nieuwe. Dat is het officiële signaal aan Google dat dit een verhuizing
   is, geen nieuwe site — voorkomt een tijdelijke ranking-dip.

---

## 6. Overig, geen actie nodig

- **Apple Sign-In bundle-ID's** (`com.bijbel-studie.app`,
  `com.bijbel-studie.app.signin` in `lib/oauthVerify.ts` / `APPLE_CLIENT_IDS`).
  Dit zijn **geen domeinen** maar vaste bundle-identifiers van de iOS-app,
  geregistreerd bij Apple. Los van de website-domeinnaam. **Niet aanpassen** —
  dat zou Apple-inloggen in de app breken.
- **NBG51-licentie** (`lib/mobileLicensing.ts`): de tekst noemt expliciet dat
  het NBG-contract is "scoped to www.bijbel-studie.com only, valid to
  2029-12-31". Dat is een juridisch feit uit een getekend contract, geen
  configuratiewaarde — ik heb 'm daarom niet aangepast. Als je vertaling nu
  ook via `bijbelstudie.io` aangeboden moet worden, moet dat eerst met de
  rechthebbende worden afgestemd en dan pas in de code worden bijgewerkt.
- **`sitemap.xml`, `robots.txt`, canonicals, OG-afbeeldingen, JSON-LD**: volgen
  automatisch mee, want alles leest uit `lib/seo/constants.ts`.
- **MongoDB, AI-providers, TTS**: geen domeinafhankelijkheid.

---

## Volgorde-samenvatting

1. Hostinger DNS + Vercel domeinen koppelen
2. Vercel env vars (`NEXTAUTH_URL`, `NEXT_PUBLIC_BASE_URL`) + redeploy
3. Google Cloud Console OAuth origins/redirects
4. Stripe: nieuwe webhook + ToS-URL
5. Google Search Console: property + sitemap + (optioneel) change-of-address

Test na afloop, in deze volgorde: inloggen met Google → een pagina laden op
`https://bijbelstudie.io` → een testbetaling (test mode) → check dat de
webhook een 200 teruggeeft in het Stripe Dashboard.
