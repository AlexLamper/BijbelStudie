# Monetisation rollout — configuration steps

The code for waves 1–4 of the revenue plan is in the repository. These steps are
the parts that live in the Stripe Dashboard or in environment variables and
cannot be done from the codebase.

Nothing here is optional if you want the new behaviour to work end to end.

## Status — 2026-08-26: domain moved to bijbelstudie.io

The codebase now hard-codes `https://bijbelstudie.io` everywhere (checkout CORS
origin, billing-portal `return_url`, the ToS-consent comment, sitemap/robots via
`lib/seo/constants.ts`). The entries below this one are the historical record of
the `www.bijbel-studie.com` rollout and are left as written — do not edit them.

Two things in the **Stripe Dashboard** still need doing by hand, and nothing in
this repository can do them:

1. **Webhook endpoint.** The one below points at `www.bijbel-studie.com` and
   will keep firing at a domain that no longer serves the app. Add a new
   endpoint at `https://bijbelstudie.io/api/webhooks/stripe` with the same 8
   events (see "2. Create the webhook endpoint" further down), copy its signing
   secret into `STRIPE_WEBHOOK_SECRET` in Vercel, then delete the old endpoint
   once the new one has a few successful deliveries.
2. **Terms of Service URL**, Dashboard → Settings → Public details. It was set
   to `https://www.bijbel-studie.com/algemene-voorwaarden`; update it to
   `https://bijbelstudie.io/algemene-voorwaarden`. `STRIPE_REQUIRE_TOS_CONSENT`
   stays `true` — if the URL is out of date before this is changed, Checkout
   sessions still succeed, they just record consent against a stale link.

## Status — 2026-08-20

Stripe account `acct_1QkiMOGkd9Br8GXY` ("Bijbel-studie").

**Live mode is now done.**

| Object | Live id |
|---|---|
| Monthly price €9,99 | `price_1R6ap2Gkd9Br8GXY20SfFyzw` (pre-existing, `tax_behavior: unspecified`) |
| Annual price €89,99 | `price_1U6SmcGkd9Br8GXYiQJ0AnKI` (new, `unspecified` to match monthly) |
| Product | `prod_S0c3528EdTZI6H` — "Scriptura Pro" → **BijbelStudie Pro** |
| Webhook endpoint | `we_1U6Sn6Gkd9Br8GXYRksSZHxW` → `https://www.bijbel-studie.com/api/webhooks/stripe`, 8 events |
| Billing Portal config | `bpc_1U6SnNGkd9Br8GXY1pGZje90` (default, cancellation off) |
| Strays archived | `prod_Sj4gjhgI70JHuA` ("Pro" €29/mo), `prod_Sj4eBGluJmQ65Q` ("Basic" €9/mo) |

Vercel **production** now carries `STRIPE_ANNUAL_PRICE_ID`,
`NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID`, `NEXT_PUBLIC_STRIPE_PRICE_ID`, a fresh
`STRIPE_WEBHOOK_SECRET` for the new endpoint (the 513-day-old orphan was
removed — including from Preview, which had no endpoint pointing at it), and
`STRIPE_REQUIRE_TOS_CONSENT=true`.

The ToS URL in Dashboard → Settings → Public details was already set: a live
Checkout Session created with `consent_collection[terms_of_service]=required`
was accepted rather than rejected, which is the only way to prove it from
outside the Dashboard. That session was expired immediately.

Only one live subscription has ever existed (`sub_1RQW5z…`, canceled, on the
monthly price), so the rename and the archiving touched nothing billable.

## Status — 2026-08-19

Stripe account `acct_1QkiMOGkd9Br8GXY` ("Bijbel-studie").

**Test mode is done and verified.**

| Object | Id |
|---|---|
| Monthly price €9,99 | `price_1R6CRIGkd9Br8GXYcZSWTg1p` |
| Annual price €89,99 | `price_1U6FM9Gkd9Br8GXYOqR92rN6` |
| Billing Portal config | `bpc_1U6FNNGkd9Br8GXYOh29QTVE` (default) |
| Product (renamed) | `prod_S0CraioZk9wZ6u` — "Scriptura Pro" → **BijbelStudie Pro** |
| Stray product archived | `prod_Re0U4nMY2UmzuP` ("Test", €2/mo) |

Verified locally against `stripe listen`: 33/33 events returned 200, signature
verification passed on every one, Mongo idempotency rows were written, a
redelivered event short-circuited on the duplicate-key gate (224 ms, no handler
run) and an unsigned POST was rejected with 400.

### Code gaps found and closed on 2026-08-19

Auditing the funnel against `lib/analyticsSchema.ts` turned up events that were
declared but never emitted, and two customer-facing defects on the pages Stripe
itself redirects to.

* `checkout_completed` was fired only by the iOS app. The website had a funnel
  start (`checkout_started`) and no end, so **web conversion rate was not
  measurable at all**. Now fired from `/succes` once `verify-subscription`
  confirms, carrying the real interval.
* `checkout_abandoned` was emitted nowhere. Now fired from `/geannuleerd`, which
  is Stripe's `cancel_url` and the only place that knows a checkout was started
  and not finished — Stripe sends no webhook for an abandoned session.
* `platform` was stamped by the Flutter client on every event but by nothing on
  the web, so no web row carried it. `/api/analytics` now stamps `web`
  server-side, which is what makes the two funnels comparable rather than merely
  co-mingled.
* `/succes` claimed **"Maandelijkse facturering … €9,99"** unconditionally. An
  annual subscriber who had just paid €89,99 was told they would be billed €9,99
  a month. The copy is now interval-aware in nl/en/de, and
  `verify-subscription` returns and persists the interval so the page has
  something true to render before the webhook lands.
* `/succes` linked to `/courses`, which does not exist and has no redirect — a
  404 on the page a customer reaches immediately after paying. Now `/studies`.
  `/study` likewise became `/studie`, removing a needless 308.
* `/geannuleerd` was still entirely in English ("Payment Canceled", "Try
  Again") after every other route was Dutchified. Rewritten in Dutch.

Everything else in the plan is present and wired: pause/cancel/upgrade-annual
routes, the `billingIssueSince` banner (`BillingNotices` on `/dashboard`), the
cancel-reason capture, the signup→checkout resume, and the iOS paywall's
required elements. `tsc --noEmit` clean; 71/71 tests pass.

**Live mode was NOT done at the time of writing.** Both items below were completed on 2026-08-20; kept for the record.

1. The key `stripe login` issues is a *restricted* key and cannot write. Grant
   **Prices Write**, **Products Write**, **Features Write**, **Webhook Endpoints
   Write** and **Billing Portal Configurations Write** on it, or use a full
   secret key, before retrying.
2. Vercel production has **no** `STRIPE_ANNUAL_PRICE_ID` and no
   `NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID`, so annual checkout currently returns
   500 `no_price` in production. They must be added and the project redeployed.

### Two facts the rest of this document got wrong

* **There has never been an annual price**, in either mode. The €69,99 price
  described in step 3 does not exist, so there are no annual subscribers and
  nothing to grandfather. That section is kept below only for the pricing
  rationale.
* The live product is still named **"Scriptura Pro"** (`prod_S0c3528EdTZI6H`).
  That string is what a customer sees on the Checkout page and on their card
  statement. Two further live products, `Pro` (€29,00/mo) and `Basic`
  (€9,00/mo), are unreferenced by any environment variable.

The only live webhook endpoint is `https://bijbel-api.nl/stripe/webhook`
(a different service, 3 events). Nothing points at
`www.bijbel-studie.com/api/webhooks/stripe`, which means the 512-day-old
`STRIPE_WEBHOOK_SECRET` in Vercel is orphaned and safe to replace.

---

## 1. Environment variables

Add to `.env.local` and to the production environment:

```bash
# Signing secret for the new webhook endpoint. Without it the route returns 500
# and no subscription state is ever written.
STRIPE_WEBHOOK_SECRET=whsec_...

# Server-side price ids. The checkout route prefers these over the NEXT_PUBLIC_
# ones so a price id is never taken from the browser.
STRIPE_PRICE_ID=price_...          # monthly, €9,99
STRIPE_ANNUAL_PRICE_ID=price_...   # annual,  €89,99 (new price, see step 3)

# Optional. Turn on only AFTER step 4, or Stripe rejects every checkout session.
STRIPE_REQUIRE_TOS_CONSENT=false
```

`NEXT_PUBLIC_STRIPE_PRICE_ID` and `NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID` are still
read as a fallback, so existing deployments keep working before these are set.

---

## 2. Create the webhook endpoint

Dashboard → Developers → Webhooks → Add endpoint.

- URL: `https://www.bijbel-studie.com/api/webhooks/stripe`
- Events to send:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.paused`
  - `customer.subscription.resumed`
  - `invoice.payment_failed`
  - `invoice.payment_succeeded`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

**Why this matters:** before this endpoint existed, a user got Pro access only if
their browser reached `/succes` and called `/api/verify-subscription`. A closed
tab meant a completed payment with no access, and a cancelled or expired
subscription never revoked access at all. `verify-subscription` is still in place
as a belt-and-braces path for the redirect; the webhook is now the authority.

Test locally with:

```bash
# 127.0.0.1, not localhost. On Windows `localhost` resolves to ::1 first, and
# `next dev` binds 0.0.0.0 (IPv4). Forwarding to localhost silently delivered
# every event to an unrelated process listening on [::1]:3000 and logged 404.
stripe listen --forward-to http://127.0.0.1:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
```

Put the `whsec_` that `stripe listen` prints into `STRIPE_WEBHOOK_SECRET` in
`.env.local` **before** starting `next dev`; the route reads it at request time
but the dev server only loads `.env.local` at boot.

---

## 3. Create the new annual price

Create a **new** Price of **€89,99 / year** on the existing product.

> Corrected 2026-08-19: no €69,99 price exists in either mode, and no annual
> subscription has ever been sold. The grandfathering paragraph below therefore
> describes a situation that does not arise — it is retained because the same
> reasoning will apply the next time the annual price moves.

- Put the new price id in `STRIPE_ANNUAL_PRICE_ID`.
- Match the `tax_behavior` of the monthly price in the **same mode**, or the two
  plans get taxed differently. Test is `inclusive`; live is `unspecified`.

**Grandfathering is automatic and requires no code:** Stripe keeps charging each
subscription whatever Price it was created with. Existing annual subscribers stay
at €69,99 indefinitely as long as nothing calls `subscriptions.update` with a new
price on them. The only code path that changes a price is
`/api/subscription/upgrade-annual`, which only ever runs on a *monthly*
subscription the user themselves asked to convert.

Consider emailing existing annual subscribers to tell them they are grandfathered.
It costs nothing and it is the kind of thing people remember.

If you decide against the price rise, change `amountCents` for `annual` in
`lib/pricing.ts` back to `6999` and point the env var at the old price. Every
surface — the pricing page, the paywalls, the upsell banner, the badge — is
derived from that one number and recalculates on its own.

### A note on the badge wording

The plan proposed a "3 maanden gratis" badge. The real numbers do not support it:
€119,88 − €89,99 = €29,89, which is 2,99 months of the monthly price, and rounding
that up is a factual claim you cannot substantiate. The badge therefore reads
**"25% goedkoper"**, a comparison between two tariffs you genuinely charge —
factual, permanent, and outside the price-reduction rules. `freeMonthsOnAnnual()`
in `lib/pricing.ts` floors rather than rounds for the same reason; if you ever
want an honest "3 maanden gratis", the annual price has to be €89,91 or lower.

---

## 4. Terms of service URL (before enabling ToS consent)

Dashboard → Settings → Public details → Terms of service URL:
`https://www.bijbel-studie.com/algemene-voorwaarden`

Then set `STRIPE_REQUIRE_TOS_CONSENT=true`. This makes Checkout collect an
explicit agreement, which is the evidence you need for the 14-day withdrawal
right on a digital service.

---

## 5. Turn on dunning (recovers the most money per minute spent)

Dashboard → Settings → Billing → Subscriptions and emails:

- **Smart Retries**: on.
- **Failed payment emails**: on, all reminders.
- **Send emails about expiring cards**: on.
- After all retries fail: **Cancel subscription** (the webhook then revokes
  access; the in-app banner has been warning them throughout).

The in-app banner on `/dashboard` is driven by `billingIssueSince`, written by
the `invoice.payment_failed` handler and cleared on the next success.

---

## 6. Enable the Billing Portal

Dashboard → Settings → Billing → Customer portal → activate. Allow at minimum
"update payment method" and "view invoices". The dunning banner and the settings
page both open this portal, and both are dead ends without it.

Leave **cancellation** disabled in the portal — the in-app flow captures a reason
and offers a pause first, which the portal cannot do.

---

## Verifying the whole path

1. Subscribe as a test user → check `subscribed`, `subscriptionStatus`,
   `subscriptionInterval` and `subscriptionStartedAt` are written by the webhook.
2. `stripe trigger invoice.payment_failed` → dashboard banner appears.
3. Pause from Settings → banner switches to the paused state, Stripe shows
   `pause_collection`.
4. Cancel from Settings → reason is stored on the user and an
   `subscription_canceled` analytics event is written server-side.
5. Log out, open `/abonnement`, pick annual → you should land in signup and
   arrive back at checkout automatically after registering.
