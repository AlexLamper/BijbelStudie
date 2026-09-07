# Test environment

How to exercise a change on a real deployment before it reaches anyone.

The shape of it: a long-lived **`staging` branch** that Vercel builds to a
stable URL, running against **its own database**, with the phone app pointed at
it by a one-word build flag. Nothing here is automatic — the two setup steps in
§1 and §2 have to be done once, by hand, in the Vercel and Atlas dashboards.

---

## 0. What this does and does not change

**Nothing about production is edited.** Not the production `MONGODB_URI`, not
the cluster, not the `scriptura` database, not a single existing environment
variable value. Vercel stores an environment variable *per environment*, so the
work below is adding a **second, Preview-only value** for `MONGODB_URI` beside
the production one. The production value keeps whatever it has today and is
never read by, or changed for, staging.

The guard in `lib/appEnv.ts` cannot fire in production either: it requires
`VERCEL_ENV=preview`, and Vercel sets that to `production` on the live
deployment. It cannot fire on your laptop, where `VERCEL_ENV` is unset. There
is a test for both (`tests/appEnv.test.ts`).

What it **does** change: a Vercel **preview** deployment that inherits the
production `MONGODB_URI` now refuses to serve, and answers with an error naming
the fix. That is new behaviour for every preview branch on this project. If you
want the old behaviour back, on any preview, set

```
ALLOW_PRODUCTION_DB_ON_PREVIEW = true      (Preview scope)
```

in the Vercel dashboard. No code change, no redeploy of `main`. The banner and
`/api/health` will still say the preview is on live data — allowed is not the
same as unremarkable.

## 0.1 Why a separate database is the whole thing

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

Nothing is created, deleted or renamed in Atlas. A MongoDB database springs
into existence on its first write, so "making" `scriptura_staging` is just a
matter of writing a connection string that names it.

1. **Copy** the production connection string out of Vercel (Settings →
   Environment Variables → `MONGODB_URI` → the Production value → reveal, copy).
   Copy it. Do not edit it there.
2. In a text editor, change **only the path segment** — the bit between the
   host's `/` and the `?`:

   ```
   mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/scriptura?retryWrites=true&w=majority
                                                     ^^^^^^^^^  before

   mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/scriptura_staging?retryWrites=true&w=majority
                                                     ^^^^^^^^^^^^^^^^^  after
   ```

   Same user, same password, same cluster, same options. One word different.
   That word is the entire safety boundary, so check the tail of the value and
   not just the host.

   **Confirm the "before" really is `scriptura`.** That name is hardcoded as
   `PRODUCTION_DATABASE` in `lib/appEnv.ts`, taken from the comment in
   `.env.example`. If production actually uses some other name, change the
   constant to match or the guard protects nothing.
3. Optional: give staging realistic content by restoring an Atlas snapshot of
   production **into** `scriptura_staging`. Never the other direction.

The production database is untouched by all of this. The staging database
starts empty and fills up as you use it.

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

In **Project → Settings → Environment Variables**, for each row below:

1. click **Add New**;
2. type the **same key** that already exists (`MONGODB_URI` and friends) —
   Vercel allows one key to hold a different value per environment, so this
   does not overwrite anything;
3. paste the Preview value;
4. tick **Preview** only. Leave **Production** and **Development** unticked.
   This is the step that keeps production's own value in place.

If you ever want to undo the whole thing: delete the rows you added here. The
production values were never modified, so nothing needs restoring.

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

The only genuinely required row is `MONGODB_URI`. Without it a preview refuses
to serve; with it, everything else falling through to production values is
merely untidy rather than dangerous. Add the rest as you need them.

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
