# Test environment

How to exercise a change on a real deployment before it reaches anyone.

The shape of it: a long-lived **`staging` branch** that Vercel builds to a
stable URL, running against **its own database**, with the phone app pointed at
it by a one-word build flag. Nothing here is automatic — the two setup steps in
§1 and §2 have to be done once, by hand, in the Vercel and Atlas dashboards.

---

## 0. Why a separate database is the whole thing

A preview deployment with the production `MONGODB_URI` is not a test
environment. It is production with a different URL. Every account, note,
subscription and streak you touch while "testing" is somebody's real data, and
nothing on screen tells you so — a URI naming the wrong database connects
perfectly happily.

`lib/appEnv.ts` therefore **refuses to connect** when `VERCEL_ENV=preview` and
the URI names the production database. That check runs in `lib/mongodb.ts`, the
one place every read and write passes through, so it cannot be bypassed by
forgetting it in a new route. A preview in that state answers 503 and says why.

Production is never blocked, and a local `next dev` is left alone — pointing
your own machine at whatever you like is a choice you make at a keyboard.

## 1. One-time: the staging database

1. In MongoDB Atlas, on the existing cluster, nothing needs creating up front —
   Mongo makes a database on first write. Just pick a name that is **not**
   `scriptura`. The convention here is `scriptura_staging`.
2. Take the production connection string and change **only the path segment**:

   ```
   mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/scriptura_staging?retryWrites=true&w=majority
                                                     ^^^^^^^^^^^^^^^^^^
   ```

   Check the tail of the value, not just the host. That one word is the entire
   safety boundary.
3. Optionally seed it by restoring an Atlas snapshot of production into the new
   database name, so staging has realistic content. Do this **into**
   `scriptura_staging`, never the other way.

## 2. One-time: Vercel

> **Do §2.2 before §2.1.** The guard is not decorative: a staging deployment
> with no Preview-scoped `MONGODB_URI` inherits the production one, and will
> refuse to serve (and can fail the build, if a page pre-renders a query). That
> is the intended behaviour — but it is confusing if you meet it before you know
> the setting exists. Set the variables, then push the branch.

### 2.1 The branch

Create the branch and push it:

```bash
git checkout -b staging main
git push -u origin staging
```

Vercel builds every branch as a Preview by default, at a **stable** URL derived
from the branch name (not the commit):

```
https://bijbelstudie-git-staging-<scope>.vercel.app
```

That URL is what the app's `ENV=staging` flag points at
(`core/config/app_config.dart`). If your Vercel scope differs from the constant
in that file, fix the constant.

### 2.2 Environment variables

In **Project → Settings → Environment Variables**, add these with the
**Preview** scope ticked and **Production unticked**. This is the step that
actually creates the separate environment.

| Variable | Preview value | Why |
|---|---|---|
| `MONGODB_URI` | the `scriptura_staging` URI from §1 | the boundary. Without this the deployment refuses to start. |
| `NEXTAUTH_URL` | `https://bijbelstudie-git-staging-<scope>.vercel.app` | NextAuth builds callback URLs from this; sign-in fails on a mismatch |
| `NEXTAUTH_SECRET` | a **different** random secret | a staging session token must not be valid against production |
| `GITHUB_TOKEN` | same as production | `scripts/sync-data.mjs` runs on `prebuild`; without it the licensed bible data is missing and the build degrades |
| `STRIPE_SECRET_KEY` / price ids | Stripe **test-mode** keys | never let a test checkout touch live billing |
| `REVENUECAT_*` | sandbox project values | same reasoning |
| `RESEND_API_KEY` | leave **unset** | `sendEmail()` then logs and skips, so staging cannot mail real users |

Anything you do not set for Preview falls through to the Production value —
which is exactly the trap for `MONGODB_URI`, and exactly why the guard exists.

### 2.3 OAuth callbacks

Google/Apple sign-in will reject the staging origin until it is registered. Add
`https://bijbelstudie-git-staging-<scope>.vercel.app/api/auth/callback/google`
(and the Apple equivalent) to the provider consoles. Until then, use
email/password on staging.

### 2.4 Crons

`vercel.json` schedules `/api/internal/reconcile-subscriptions`. Vercel runs
crons on **production deployments only**, so staging will not fire it. Trigger
it by hand with its secret if you need to test it.

## 3. Using it

### Web

```bash
git checkout staging
git merge levensboom     # or whatever branch is under test
git push
```

Then, before testing anything, confirm what you are looking at:

```bash
curl https://bijbelstudie-git-staging-<scope>.vercel.app/api/health
```

```jsonc
{
  "ok": true,
  "env": "preview",
  "database": { "status": "up", "name": "scriptura_staging", "isProductionDatabase": false },
  "commit": "3ef8005",
  "branch": "staging"
}
```

Three things to read every time: `env` is `preview`, `database.name` is **not**
`scriptura`, and `commit` matches what you just pushed. If
`database.status` is `"blocked"`, the guard has stopped a misconfigured
deployment — fix `MONGODB_URI`, do not work around it.

Every non-production page also carries a badge in the bottom-left naming the
environment, the database and the branch. It turns **red** and reads `LIVE DATA`
if a preview is somehow on the production database.

### App

```bash
flutter run --dart-define=ENV=staging
```

For a TestFlight build against staging:

```bash
flutter build ipa --dart-define=ENV=staging
```

A staging build shows a teal `STAGING` badge in the bottom-left. A build with no
badge is talking to the live site.

Other targets:

```bash
flutter run                                    # localhost:3000
flutter run --dart-define=ENV=production       # the live API, from a debug build
flutter run --dart-define=API_BASE_URL=https://<any-preview>.vercel.app/api/v1
```

The last form targets an ad-hoc per-commit preview URL, for when you want a
single branch rather than staging.

## 4. Promoting to production

```bash
git checkout main
git merge staging
git push
```

Vercel builds `main` as Production. Confirm with `/api/health` that `env` is
`production` and `database.name` is `scriptura`.

## 5. What this does not cover

- **Push notifications** are scheduled locally by the app, so they work on
  staging without any server involvement.
- **App Store / Play purchases** cannot be exercised against staging without a
  sandbox RevenueCat project; the paywall renders but a purchase will not
  unlock Pro unless §2.2's RevenueCat values point at a sandbox.
- **The bible corpus** is fetched at build time from the private data repo. If
  `GITHUB_TOKEN` is missing on Preview, restricted translations will be absent
  on staging while everything else works — which looks like a content bug and
  is not.
