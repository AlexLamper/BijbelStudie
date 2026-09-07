# Test environment

How to exercise a change on a real deployment before it reaches anyone.

**Setup required: none.** Vercel already builds every branch to its own URL, and
this project deliberately runs those previews against the same database as the
live site. What was added is the ability to tell, at a glance and from a script,
*which* deployment you are looking at — plus a `staging` branch convention so
there is a fixed place to merge into before `main`.

---

## 0. What this is, and what it is not

| | Preview (a branch) | Production (`main`) |
|---|---|---|
| URL | `bijbelstudie-git-<branch>-<scope>.vercel.app` | `www.bijbelstudie.io` |
| Code | whatever you pushed | `main` |
| Database | **the same one as production** | the same one |
| Badge | red `LIVE DATA · scriptura · <branch>` | none |

So a preview is a **safe place to test code**, and **not** a safe place to test
data. New routes, new UI, a migration you can undo, the Levensboom rendering —
all fine. What is not fine is anything you would not want to happen for real:
mass deletes, a script over every user, testing the cancellation flow on a live
subscription.

That is a deliberate trade. One small cluster, one developer, and testing with
your own real account is how this app actually gets exercised. A second database
would mean a second set of secrets to keep in step, an empty account to
re-create every time, and no realistic content — for a risk that a solo project
mostly does not run.

The badge exists so the trade stays visible while you work. "The notes I just
made are real notes" is easy to forget an hour into a session.

## 1. Using it

```bash
git checkout -b staging main      # once
git push -u origin staging
```

Then for each thing you want to try:

```bash
git checkout staging
git merge levensboom      # or whichever branch is under test
git push
```

Vercel builds it at a URL that is stable per branch, so it does not change
between deployments:

```
https://bijbelstudie-git-staging-<scope>.vercel.app
```

Before trusting what you see, confirm what it is:

```bash
curl https://bijbelstudie-git-staging-<scope>.vercel.app/api/health
```

```jsonc
{
  "ok": true,
  "env": "preview",
  "database": {
    "status": "up",
    "name": "scriptura",
    "isProductionDatabase": true,
    "sharesProductionData": true,
    "note": "This preview deployment shares the production database (scriptura). Anything you do here writes to real data. That is the configured behaviour for this project."
  },
  "commit": "4cf2a84",
  "branch": "staging"
}
```

Read two things: `commit` matches what you just pushed, and `env` is `preview`.
`sharesProductionData: true` is expected here.

Every non-production page also carries the badge in the bottom-left. On the live
site it renders nothing.

## 2. The app

```bash
flutter run --dart-define=ENV=staging
```

Points the app at the staging deployment. Works in release builds too, which is
what makes a TestFlight build testable before anything reaches the store:

```bash
flutter build ipa --dart-define=ENV=staging
```

A staging build shows a teal `STAGING` badge bottom-left. **A build with no
badge is talking to the live site.**

Other targets:

```bash
flutter run                                    # localhost:3000
flutter run --dart-define=ENV=production       # live API, from a debug build
flutter run --dart-define=API_BASE_URL=https://<any-preview>.vercel.app/api/v1
```

The last form targets a single branch's preview rather than staging.

The staging URL is a constant in `core/config/app_config.dart`. If your Vercel
scope is not `alexlampers-projects`, fix it there.

## 3. Promoting to production

```bash
git checkout main
git merge staging
git push
```

Confirm with `/api/health` that `env` is `production`.

## 4. If you ever do want a separate database

Everything needed is already in place; it is two dashboard steps and one flag.

1. **Atlas** — nothing to create. Mongo makes a database on first write. Copy
   the production connection string and change only the path segment:

   ```
   .../cluster0.xxxxx.mongodb.net/scriptura?retryWrites=true
                                  ^^^^^^^^^ becomes scriptura_staging
   ```

2. **Vercel → Settings → Environment Variables** — click **Add New**, key
   `MONGODB_URI`, paste the new value, tick **Preview only**. Vercel holds one
   value per environment, so the existing Production value is untouched. (Your
   current row is scoped to Production *and* Preview; adding a Preview-only row
   overrides it for previews.)

3. Add `BLOCK_PRODUCTION_DB_ON_PREVIEW = true`, Preview scope, so a preview that
   somehow falls back to the production URI refuses to serve rather than
   silently writing to it.

To undo: delete the rows you added. Nothing else changes.

`PRODUCTION_DATABASE` in `lib/appEnv.ts` is the name the guard compares against.
It is set to `scriptura`, taken from the comment in `.env.example`. If that is
wrong, the badge and `/api/health` will report `isProductionDatabase: false` on
a preview and the guard would never fire — so check it before relying on step 3.

## 5. What a preview cannot cover

- **Crons.** `vercel.json` schedules `/api/internal/reconcile-subscriptions`.
  Vercel runs crons on production deployments only. Trigger it by hand with its
  secret if you need to test it.
- **OAuth sign-in**, until the staging origin is registered in the Google and
  Apple consoles (`/api/auth/callback/google` on the staging URL). Use
  email/password on staging until then.
- **Store purchases.** The paywall renders, but a purchase will not unlock Pro
  unless the RevenueCat values point at a sandbox project.
- **Outbound email.** Preview inherits the production `RESEND_API_KEY`, so a
  password-reset test on staging sends a real email. Set `RESEND_API_KEY` to an
  empty Preview-scoped value if you want `sendEmail()` to log and skip instead.
