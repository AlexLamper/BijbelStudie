# Learning & habit UX: what the big platforms actually do

An internal working doc. Companion to `docs/reward-moments-plan.md`, which covers the
*reward screen* in detail. This one covers everything around it: what the user sees in
what order, how the unit of work is defined, where animation is worth paying for, and
which retention mechanics survive contact with a devotional product.

Every non-obvious claim is cited. Where a number could not be verified from a primary
source it is marked **[secondary]** or **[unverified]** rather than dressed up.

Vocabulary, same as the reward plan: the feature is **"je boom"** in reader-facing copy.
`levensboom` survives in code paths only.

---

## 1. What the user should see, in order

### 1.1 The comparison

| | First 5 seconds | First session | Day 2 | Day 7 | Day 30 |
|---|---|---|---|---|---|
| **Duolingo** | A lesson, not a signup. Profile is asked for after the first taste of the product [secondary] | 7-step placement, then one lesson, then the end-of-lesson beat sequence | Push notification chosen by a bandit from a template pool; streak at 1 is fragile and they know it | The 7-day threshold: learners who reach it are 3.6x more likely to complete the course | Leagues, monthly challenges, streak milestone animations |
| **Khan Academy** | Course/grade pick, then a mastery-levelled skill | Practice to "familiar", progress bar per skill | Same next-skill pointer; the path decides, not the student | Skills-to-proficient counter — their stated dose is 2+ skills/week | 60+ skills to proficient over a year is the "deep use" line |
| **Headspace** | The session, immediately. Course structure is secondary | Play, breathe, done. Calm summary: minutes, total, one line | Run streak visible but unweaponised | Streak number; no leagues, no XP, no levels [secondary] | Total mindful minutes and course progress |
| **Calm** | Daily Calm of the day — one dated piece of content | Session, then a completion modal | Streak and mindful minutes [secondary] | Longest-streak display [secondary] | 30-day challenges |
| **Strava** | The feed — other people's activity, not yours | Record or upload one activity | Kudos and comments arrive from other humans | Weekly totals, segment placements | Monthly/annual challenges, year-in-sport |
| **Apple Fitness** | Three rings, already partly filled by walking around | Close one ring | The rings reset; yesterday is in the weekly strip | 7-consecutive-day awards ("Ring in the New Year") | Monthly challenge, streak, trends |
| **Finch** | Your bird, named by you in the first minute | Pick 2-3 tiny goals, complete one, bird gains energy | Bird waits. No decay, no debt | Bird has visibly grown; accessories unlocked | Journeys, collections, decorating |
| **Forest** | A sapling and a timer | Plant, focus, tree matures | Yesterday's forest is a filled grid | A week of the forest grid | A forest you don't want a gap in |
| **YouVersion** | Verse of the Day | Pick a plan, read day 1 | Plan day 2 + streak | Streak milestone mini-celebration | Plan completion badge; 1-year plans are the anchor |
| **Brilliant** | One interactive problem | A lesson (or 3 problems — either extends the streak) | Streak animation on extension | Streak + path colour progression | Leagues |
| **Habitica** | Character creation | Add tasks, check one off, gain XP/gold | Dailies come due; HP drops if missed | A party or quest | Level, gear, and the risk of death |

### 1.2 The pattern that repeats

**Nobody puts the product's machinery in the first five seconds.** Duolingo is "play
first, profile second" — you are inside a lesson before being asked who you are
[secondary: [Juno School teardown](https://www.junoschool.org/article/duolingo-onboarding-experience/)].
Finch gives you a bird to name; Forest gives you a sapling. None of them opens with a
dashboard of your own emptiness, because on day zero there is nothing in it.

**The close is the loudest moment in the product, and it is worth engineering.** Duolingo
displays the Session Complete screen *immediately* while data submission happens in the
background; reworking session end produced a "60%+ reduction in perceived session end
latency and significant increase in DAUs and total sessions completed"
([Android performance](https://blog.duolingo.com/android-app-performance/)). The most
transferable engineering fact here: treat the close as a screen, not as a write.

**Day 2 is a notification problem, not a UI problem.** Duolingo's bandit — optimising
*which* template to send, not how many — produced +0.5% DAU and +2% new-user retention over
a strong baseline, trained on 200 million sends across 35 days
([Yancey & Settles, KDD 2020](https://research.duolingo.com/)). Their former CPO calls
notifications "the goose that lays the golden eggs", with the wins coming *without* raising
volume ([Mazal](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)).

**Day 7 is where the habit either exists or doesn't.** A 7-day streak makes a Duolingo
learner 3.6x more likely to complete the course, and the 7+ day streak share of DAU nearly
tripled to over half during their turnaround
([habit post](https://blog.duolingo.com/how-duolingo-streak-builds-habit/);
[Mazal](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)).
BijbelStudie celebrates nothing at day 7 — badge thresholds start at 30. Still the
highest-leverage single gap in the product.

**Day 30 is where structure beats stimulation.** YouVersion's engagement peaks on plan
enrolment: 3M+ one-year plan subscriptions on New Year's Day 2025 (+18% YoY), and 40
plan-days completed *per second*
([YouVersion 2025](https://www.youversion.com/news/youversion-announces-2025-verse-of-the-year)).
People do not sustain a devotional habit on XP. They sustain it on a plan that tells them
what today is.

### 1.3 What BijbelStudie should show, in order

- **First 5 seconds (signed out, `/`):** one legible proposition and one button into
  content. Not the tree. The tree is a payoff, and showing the payoff before the work
  makes it decoration.
- **First 5 seconds (signed in, `/dashboard`):** today's single next action, above the
  fold, rendered server-side. Everything else can arrive late.
- **First session:** finish one lesson or one chapter and hit the close. The close is
  where the tree appears for the first time, seeded from the user id, already at a
  non-empty state (endowed progress — see the reward plan §1.2).
- **Day 2:** one notification from `lib/notificationCopy.ts` naming the specific book and
  chapter. Nothing else.
- **Day 7:** the macro streak beat that does not exist yet, plus a `streak7` badge.
- **Day 30:** a completed plan or a stage change on the tree — a structural milestone,
  not a bigger animation.

---

## 2. The core loop

### 2.1 How these products define one unit of work

Everyone converges on a unit that takes 3-15 minutes and has an unambiguous end.

| Product | Unit | Extends the streak | Published dose |
|---|---|---|---|
| Duolingo | One lesson | Any single lesson (decoupled from the daily XP goal) | Targets share of learners at **15+ min/day** |
| Khan Academy | One skill to "proficient" | n/a | **30+ min/week** or **2+ skills to proficient/week** |
| Brilliant | One lesson **or 3 problems** | Either | not published |
| Headspace | One session | One session | not published |
| Apple Fitness | One day's three rings | Ring closure | 3 goals, user-set |
| YouVersion | One plan day | One plan day or reading | not published |

Two findings matter more than the rest.

**Lowering the bar beats raising the reward.** Duolingo's largest streak win came from
letting *one lesson* extend the streak instead of requiring the daily XP goal: +3.3% D14
retention, +1% DAU, +10.5% of daily learners on a streak
([Improving the streak](https://blog.duolingo.com/improving-the-streak/)).
Their milestone animation redesign, by contrast, moved D7 by 1.7%
([habit post](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)).
Same product, same year: the eligibility rule was worth roughly twice the animation.

**But the unit must not be trivial.** Duolingo's Time Spent Learning Well work found that
*shorter lessons decreased* the metric, against expectation, and that lengthening the path
increased it; rebalancing XP along the path was worth about +1.8M minutes/day
([TSLW](https://blog.duolingo.com/time-spent-learning-well/)).
Khan's dose-response is the same shape: 30+ minutes/week produced ~20% greater-than-
expected learning gains, 9-18 hours/year only ~7%, effect size 0.36 across ~350K students
in grades 3-8 — and only about 9% of students hit the 30 min/week line
([Khan efficacy, Nov 2024](https://blog.khanacademy.org/khan-academy-efficacy-results-november-2024/)).
The lesson is not "make it easier". It is "make the *entry condition* easy and the *work*
substantial".

### 2.2 The wrapper: entry, work, close, return hook

Every one of these products wraps the unit in the same four parts.

1. **Entry** — a single unambiguous next action. Duolingo built the Path precisely because
   "learners are not sure whether they're using Duolingo the 'correct' or 'best' way"
   ([Path redesign](https://blog.duolingo.com/new-duolingo-home-screen-design/)).
   Khan's 2026 revamp names the same failure: students "weren't sure what to work on next"
   ([Khan blog](https://blog.khanacademy.org/khan-academy-reimagined-for-districts-2026/)).
2. **Work** — visually quiet. Content, one interaction at a time.
3. **Close** — the loud moment, single-purpose screens advanced by one tap (see the reward
   plan §1.1 for the beat sequence).
4. **Return hook** — set *inside* the close, not after it. The next lesson is named, the
   streak is shown at its new value, the reminder is implicitly scheduled.

### 2.3 Mapped onto BijbelStudie

**Studieflow lesson** (`app/studie/[studyId]/[day]`, steps `intro → word → depth →
reflection → quiz` per `lib/studyFlow.ts`):

| Part | Today | Gap |
|---|---|---|
| Entry | `/studie` dispatches to the newest active enrolment, resuming `currentStep` | Good. This is the Path pattern already built. Nothing to change. |
| Work | `StudyFlowShell` page-slide, `playSwipe`, step rail | Good. Keep it plain. |
| Close | `LessonCompleteCard` + `LessonTreeMoment` + `LevelUpDialog` | The streak beat is missing; the close waits on a network round-trip in places |
| Return hook | "Volgende les" | The *next* lesson is not named, and the reminder is not confirmed |

**Chapter read** (`/lezen`, `VerseMarkers`):

| Part | Today | Gap |
|---|---|---|
| Entry | Book/chapter picker; dashboard "verder lezen" | Fine |
| Work | Reading | Correct — nothing should happen here |
| Close | 5 XP granted **silently** | There is no close at all. This is the biggest structural hole. |
| Return hook | none | The next chapter is not offered as a named action |

A chapter read is a legitimate unit of work in a Bible product — arguably the *native*
one. It currently has no ending. Give it one: a small close card (not a full screen) with
the XP, the streak state, and one named next action ("Genesis 3 lezen"). That single
change gives the reading half of the product the loop the study half already has.

---

## 3. Where the visuals go

This is the question the tree renderer makes expensive, so it gets the most evidence.

### 3.1 What actually carries heavy visuals

| Moment | Who animates here | Who deliberately doesn't |
|---|---|---|
| App/page entry | nobody | everybody |
| Content / reading / question | nobody | Duolingo, Khan, Headspace, Calm, Brilliant |
| Answer feedback (micro) | Duolingo, Brilliant | Headspace, Calm |
| **Session close** | Duolingo, Brilliant, Calm, Apple, Finch, Forest | — |
| **Streak extension / milestone** | Duolingo, Brilliant (Rive), Apple | Headspace (number only) |
| Persistent progress object | Apple rings, Finch bird, our tree | Duolingo (number), Khan (bar) |
| Notification / widget | Duolingo (streak widget art) | most |

Brilliant is the clearest case because their animation vendor documented the placement:
Rive is used for the **path nodes** and the **streak achievement**, "seamlessly aligned
with the increasing number count", chosen because "Rive files are a fraction of the size of
videos, GIFs, image sequences, and JSON-based formats"
([Rive on Brilliant](https://rive.app/blog/how-brilliant-org-motivates-learners-with-rive-animations)).
Two moments — not a screen full.

Apple is the model we structurally resemble: **the reward is the progress display**. The
rings are on every screen and cost nothing to look at; the *animation* happens only at
closure. The behavioural data is correlational, not causal, but worth knowing: among
140,000+ Apple Heart & Movement Study participants, those closing rings >=50% of the time
versus <=10% were 48% less likely to report poor sleep quality, 73% less likely to have
elevated resting heart rate, and 57% less likely to report elevated stress (PSS-4)
([Apple, April 2025](https://www.apple.com/newsroom/2025/04/get-active-with-apple-watch/)).
On habit durability: >60% of users raised daily exercise minutes by >10% in early January,
~80% of those held it to mid-January, and 90% of *that* group through March, across
~100,000 participants over four years
([Apple, January 2026](https://www.apple.com/newsroom/2026/01/stay-active-in-the-new-year-with-apple-watch/)).

### 3.2 Where big visuals hurt

**Entry paint.** Not a taste argument — it has a price. Deferring their ads library cut
Duolingo's startup ~1.5s and was credited with saving "20,000 learners per day from quitting
before entering the app"; on entry-level devices the share seeing 5s+ startups fell from
39% to 8%, and app-open conversion went 91% → 94.7%
([Android performance](https://blog.duolingo.com/android-app-performance/)). Same
relationship on the web: Vodafone improved LCP 31% for 8% more sales, Tokopedia LCP 55% for
23% better session duration, Lazada 3x LCP for +16.9% mobile conversion
([web.dev](https://web.dev/case-studies/vitals-business-impact)).
**A canvas tree must never be the LCP element on `/dashboard`.**

**Mid-reading.** Nothing that moves belongs next to scripture. `/studie` is a window, not
the app shell, and the same rule extends to `/lezen`. Headspace and Calm are proof by
example — no XP, no levels, no leagues, because they would compete with what the user came
for [secondary].

**Every screen.** A persistently animating header avatar costs battery and buys
habituation. `TreeCanvas` already refuses to animate below 64 CSS px and halts its loop
when the tab is hidden or it scrolls out of view. Do not relax that for "the header should
feel alive".

**Celebration fatigue.** A fixed celebration shown every session stops registering within
weeks (reward plan §1.2). Calibrate on Duolingo's own numbers: the *animation* redesign
bought +1.7% D7; the *eligibility rule* change bought +3.3% D14.

**Loss as spectacle.** Do not animate the wilt. `lib/levensboom/health.ts` floors health at
0.3 and never lets the tree die; a dramatic wilting transition would undo that decision at
the presentation layer. The tree should simply *be* less full on return, and recover
silently.

### 3.3 The spending plan for the tree renderer

Ranked by return, given that the generator is already memoisable and the canvas is already
two-layered (offscreen branches redrawn under one rotation; leaves, fruit, animals and
motes live on top).

1. **Lesson/chapter close — the `frac` unfurl.** Highest value. It is the moment users are
   already stopped, it is the moment Duolingo protects, and the mechanic is a pure scalar
   tween with no generator change (reward plan §2.4, §3.4).
2. **Level-up — `reveal` tween + camera push.** Already built (`LevelUpDialog`). Rare
   enough not to fatigue.
3. **Dashboard hero, static first frame.** Draw once, no loop, no LCP dependency. The
   landscape framing in `ProgressTree` is the right component; render it under the fold or
   after hydration, and never block first paint on it.
4. **Header avatar — still, with an XP arc.** This is the Apple ring borrow. Zero
   animation, permanent presence.
5. **Streak milestone at 7/30/100/365 — full screen, dusk palette.** Rare by construction.
6. **Everything else — no tree.** Notes, plan days, quiz answers get a number and a pulse,
   not a render.

Do not build: a tree on the marketing landing page above the fold; a looping tree in the
header; a tree render inside `/studie` steps; an animated wilt; a tree in email.

---

## 4. Retention mechanics, ranked by evidence

Ranked by strength of published evidence, then judged for fit.

### 4.1 Streaks — strongest evidence, highest ethical risk

Duolingo publishes the numbers: 7-day streak → 3.6x course completion; decoupling the
streak from the daily goal → +3.3% D14 and +1% DAU; a second concurrent freeze → +0.38%
DAU; milestone animations → +1.7% D7
([habit post](https://blog.duolingo.com/how-duolingo-streak-builds-habit/),
[improving the streak](https://blog.duolingo.com/improving-the-streak/)); the share of DAU
on a 7+ day streak nearly tripled to more than half during the turnaround
([Mazal](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)).
The counter-evidence is about framing, not existence: Headspace presents the run streak as
encouragement rather than judgment, and breaking it triggers no loss messaging
[secondary: [help centre](https://help.headspace.com/hc/en-us/articles/215730567-How-does-the-run-streak-feature-work),
[article](https://www.headspace.com/articles/building-a-meditation-practice)]. Finch has no
negative state at all [secondary].

**Fit: yes, with the Headspace framing.** Streak yes, streak *threat* no. Highest-value
missing piece: a day-7 celebration and a `streak7` badge. Keep freezes; keep YouVersion's
"beat your own record" as a milestone type.

### 4.2 Notifications — strong evidence, cheap, already well-built here

Duolingo's bandit bought +0.5% DAU and +2% new-user retention by *choosing* messages, not
sending more ([KDD 2020](https://research.duolingo.com/)), and their growth writeup is
explicit that the wins came without raising volume
([Mazal](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)).
Vendor benchmarks put Android opt-in near 97% and iOS at 54% after the iOS 18.2 prompt
change ([Airship 2026](https://www.airship.com/blog/your-guide-to-airships-mobile-app-push-notification-benchmarks-for-2026/)).
The widely repeated ">6 pushes/week → 3.4x uninstall" figure traces to a Klaviyo benchmark
via aggregators and is **[unverified]** — do not cite it.

**Fit: yes, and we are ahead.** `lib/notificationCopy.ts` already encodes variety,
specificity over exhortation, back-off after ignored sends, and bans emoji, exclamation
marks and the word "moet". The remaining work is cadence discipline, not copy.

### 4.3 Plans and curricula — strong evidence, best cultural fit

Duolingo's Path solved "am I doing this right"; Khan's mastery ladder does the same job;
YouVersion's entire habit engine is plan enrolment — 3M+ one-year plan subscriptions in one
day, 40 plan-days completed per second
([YouVersion 2025](https://www.youversion.com/news/youversion-announces-2025-verse-of-the-year)).
Khan's dose data says the structure has to demand something: 30+ min/week for ~20% gains
([Khan efficacy](https://blog.khanacademy.org/khan-academy-efficacy-results-november-2024/)).

**Fit: strongest of all.** Leesplannen combine the best evidence with the least ethical
friction — a reading plan is a devotional form that predates apps by centuries. Currently
under-invested relative to the tree: plan day, plan complete and plan streak all grant XP
silently.

### 4.4 Social — good evidence, needs reshaping

Duolingo leaderboards: D1 +1%, D7 +2%, D14 +3%, learning time ~+17%, highly engaged
learners tripled ([Mazal](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth),
[follow-up](https://www.lennysnewsletter.com/p/the-secret-to-duolingos-growth)). Strava's
evidence is stronger methodologically and from a Dutch population: across 5 clubs, 329
athletes, 12 monthly waves, 19,026 kudos ties and 10,037 activities, each additional kudos
from a clubmate made a runner ~3% more likely to add a session per week, and a 1-SD
increase in kudos-indegree raised that probability by ~10%
([Franken, Bekhuis & Tolsma, *Social Networks* 2023](https://research.rug.nl/en/publications/kudos-make-you-run-how-runners-influence-each-other-on-the-online/)).

**Fit: split.** Ranking people by Bible reading is indefensible and already banned. But
kudos is not ranking, it is acknowledgement from a known person — and `/groepen` exists.
A group member marking a plan day done, and others seeing it with no score and no ordering,
is the version worth building.

### 4.5 Collection and customisation — moderate evidence, excellent fit

Finch's loop is entirely collection: energy from completed actions buys accessories,
outfits, destinations and growth stages [secondary]. Weaker evidence than streaks, but
low-risk and well-established.

**Fit: our strongest existing asset.** Species, scenes, animals, seasons and Pro cosmetics
already exist in `lib/levensboom/catalog.ts`, level-gated so they pace themselves. The
specific improvement is naming the *next* unlock: "nog 40 XP tot niveau 6 — dan komt de
Olijfboom vrij."

### 4.6 Variable reward — strong lab evidence, deliberate restraint

Covered in the reward plan §3.7: seeded, server-decided, rare, never advertised, never a
near-miss. One added guardrail — a devotional product must not leave the reader wondering
whether God or the RNG gave them a good day. **Ship at most the two seeded delights already
specified, or neither.**

### 4.7 Loss aversion — real effect, documented harm

Forest's tree dies if you leave the app; critics describe the framing as "plant murder",
and note habituation to virtual loss
[secondary: [design critique](https://medium.com/@charliezhang0731/forest-app-design-critique-65da1e7e31ef)].
Habitica is the case with research behind it: an interview study plus a two-week field
study with 45 users found **all participants experienced counterproductive effects** —
being punished during genuinely productive periods, and relabelling Dailies as Habits
purely to dodge damage. Prevalence correlated with perceived inappropriateness of the
reward system and predicted motivation change over time
([Diefenbach & Müller-Herbers, *IJHCS* 127, 2019](https://www.sciencedirect.com/science/article/abs/pii/S1071581918305135)).

Finch is the counter-case that shows gentleness is not automatically safe: a September 2026
Slate review reports "Finch burnout" after about six weeks, guilt over unchecked items, and
"I was performing wellness rather than actually feeling well"
([Slate](https://slate.com/technology/2026/09/finch-app-self-care-wellness-review.html)).
Obligation can be manufactured by notification volume and collection pressure alone.

**Fit: the current implementation is right and must not drift.** `health.ts` floors at 0.3,
never kills the tree, recovers silently on the next read. Keep all three properties, and
never write copy that attributes the wilt to the reader's failure.

### 4.8 Ranking summary

| Mechanic | Evidence | Fit for a devotional product | Verdict |
|---|---|---|---|
| Plans / curriculum | Strong | Native | **Build first** |
| Streaks (celebrated, never threatened) | Strongest | Good with Headspace framing | **Build day-7** |
| Notifications (better choice, not more) | Strong | Good, already principled | **Tune, don't expand** |
| Collection / customisation | Moderate | Excellent | **Surface the next unlock** |
| Persistent progress object | Moderate (Apple) | Excellent | **Header arc + dashboard hero** |
| Social acknowledgement (kudos-shaped) | Good | Acceptable, no ranking | **Groups only** |
| Variable reward | Strong in lab | Risky | **At most two, seeded** |
| Leaderboards | Strong | Bad | **Never** |
| Loss/punishment (dying tree, HP) | Strong effect, documented harm | Bad | **Never** |

---

## 5. What this means for BijbelStudie

### 5.1 `/dashboard`

The dashboard is currently a client component that fetches after mount, and fifteen design
variants are in a bake-off (`components/dashboard/VariantSwitcher.tsx`). Two decisions
should be made on evidence rather than taste.

**Decide the variant on "one next action above the fold".** Both Duolingo and Khan name
the same failure mode — the learner not knowing what to do next — and both solved it with
a linear path rather than a richer overview. On that test the survivors are the
single-action and journey-shaped candidates: **`Pad` (12)** is the closest thing in the set
to Duolingo's Path and is the one to beat, with `Rust` (9), `Reis` (3) and `Vandaag` (1)
behind it. The bento, newspaper and bookshelf variants optimise for browsing, which is the
*reference* product already moved to `/lezen`. **`Horizon` (11) — "de boom als hele kamer"
— is the one to be careful with:** it makes the canvas tree the LCP element on the most
visited signed-in page, which section 3.2 argues against on published numbers. If that
direction wins on aesthetics, it must ship with a static first paint and the canvas
hydrating after, or it loses more at the door than it gains inside.

**Build the "Jouw voortgang" card as specified in the reward plan §3.6, with these
additions:**

- The card is the Apple-ring borrow: the tree disc **is** the score. Static first paint,
  `ProgressTree` disc framing, XP arc bent around it.
- Copy is remainder-first and names the reward: `Nog 40 XP tot niveau 6 — dan komt de
  Olijfboom vrij.` `useTreeSummary()` already returns `remainingXp` and `nextUnlock`.
- Streak row uses the week strip with a shape difference between filled and empty cells,
  not colour alone.
- When `wilting` is true: `Je boom wacht op je.` Never `Je boom gaat dood.`
- The card must not be the LCP element. Server-render the greeting, the next action and
  the numbers; hydrate the canvas after.

**Name the next action in the reading half too.** `Verder lezen: Genesis 3` is a better
call to action than a book grid, and it is the chapter-read equivalent of Duolingo's Path.

### 5.2 `/studie`

The flow itself is right — the dispatcher, the resume cursor, the five steps, the page
slide. Three changes.

**Show the close screen immediately; submit in the background.** Duolingo's session-end
work is the direct precedent (60%+ perceived latency reduction, DAU gain). The provider's
optimistic `applyXp` already makes this possible client-side; make sure no beat in
`LessonCompleteCard` waits on a POST.

**Add the streak beat and name the next lesson.** The close currently ends the lesson; it
should also start the next one. `Volgende les: Dag 4 — Het verbond` beats `Volgende les`.

**Keep the work plain.** No tree, no XP counter, no streak inside `intro`/`word`/`depth`/
`reflection`. The quiz may keep a micro bounce and the pitch ladder. That is all.

### 5.3 The tree

**One object, four appearances, one animation budget.**

| Surface | Framing | Motion | Why |
|---|---|---|---|
| Header (`NavTreeAvatar`) | portrait, <64px | none, ever | Presence, not spectacle. The XP arc carries the state. |
| Dashboard card | portrait disc | still first paint; optional idle sway once visible | LCP protection |
| Lesson/chapter close | portrait | `frac` tween, 900 ms, same clock as the XP count-up | The one moment worth paying for |
| Level-up / stage change / streak milestone | scene | `reveal` tween + camera push, existing `LevelUpDialog` | Rare by construction |
| Studio (`/profiel/boom`) | scene | full, it is the subject of the page | User asked to look at it |

**Rules that must not drift.** Never add an unseeded random. `frac` and `reveal` stay pure
scalar inputs — the generator, `species.ts`, `catalog.ts`, their Dart mirrors and
`docs/levensboom-spec.md` must stay in lockstep, and both parity suites assert it. Memoise
generation on `(seed, level, species, scene)` so a tween re-runs the draw pass only. All of
this is client-side canvas: **no new server compute**, which the Vercel Fluid Active CPU
budget requires.

**Name the next unlock everywhere the tree appears.** That is the cheapest goal-gradient
win in the product and it makes the collection mechanic legible instead of accidental.

### 5.4 Notifications

`lib/notificationCopy.ts` is already the right architecture. The remaining decisions are
about cadence and which types are allowed to exist.

| Type | Keep? | Cadence | Copy pattern |
|---|---|---|---|
| `daily_reading` | Yes | Max 1/day, at the user's set time (`studyReminders.ts`, default 08:00 Europe/Amsterdam) | Name the book and chapter in the first 30 characters |
| `study_nudge` | Yes | Follows the study rhythm (e.g. Mon/Wed/Fri), never in addition to `daily_reading` on the same day | Name the study and the lesson |
| `streak_risk` | **Rewrite** | At most 1/week, evening, only at streak >= 3 | Invitational, never loss-framed. `Nog even tijd voor Psalm 23.` — not `Je reeks gaat verloren.` |
| `streak_lost` | **Consider dropping** | — | A notification whose only content is that the reader failed is the definition of the guilt mechanic this product refuses |
| `tree_wilting` | Keep, softened | At most 1 per absence period | `Je boom wacht op je.` Never a countdown, never a threat |

**Hard caps:** at most one push per day, at most four per week, and a hard back-off after
consecutive ignores — the back-off is already in the module's stated design. Never
escalate frequency after a lapse; that is the pattern that converts a lapsed user into a
hostile one.

**Do not build a bandit.** The evidence for one is real (+0.5% DAU) but it requires
per-user inference on every send, and the CPU budget is the binding constraint. Seeded
variant selection from a good pool captures most of the variety benefit at zero marginal
compute.

---

## 6. Anti-patterns and ethical lines

The reward plan already bans confetti cannons, CLAIM buttons, countdown timers,
leaderboards, near-miss displays, streak-repair purchases and unskippable full-screen
beats. That list stands. These are the additions this research surfaced.

**Guilt mechanics that are off-limits, specifically for a bible-study product.**

1. **No loss framing about scripture.** "Je reeks gaat verloren", "Je hebt 3 dagen niet
   gelezen", "Je boom gaat dood" — all forbidden. A person told they are failing at reading
   the Bible does not experience a retention nudge; they experience a moral accusation from
   a piece of software with no standing to make one.
2. **No death, no decay past the floor.** `HEALTH_FLOOR = 0.3` is a product ethics
   decision, not a rendering constant. Habitica's own research shows punishment mechanics
   generate counterproductive behaviour in *all* studied users
   ([IJHCS 2019](https://www.sciencedirect.com/science/article/abs/pii/S1071581918305135)),
   and Forest's dying tree works by making the user feel like a killer [secondary].
   Neither is available to us.
3. **No spiritual scoring, and no ranking of people.** XP measures activity, never
   devotion, faithfulness or growth. The critique to keep on the wall: are we building a
   tool for spiritual growth "or as religious Fitbits, tracking our steps but never really
   going anywhere?"
   ([RELEVANT](https://relevantmagazine.com/faith/your-bible-app-streak-is-impressive-but-are-you-actually-learning-anything/)).
4. **No implied divine bookkeeping.** No copy that connects a streak, a level or a badge to
   standing with God, blessing, or worthiness. Milestone copy stays descriptive:
   "7 dagen op rij. Een week trouw gelezen." — a statement of fact, not a verdict.
5. **No manufactured obligation.** The Finch failure mode is instructive because it happens
   *without* punishment: constant notifications plus a collection economy produced a user
   "performing wellness rather than actually feeling well"
   ([Slate](https://slate.com/technology/2026/09/finch-app-self-care-wellness-review.html)).
   Guard against it with frequency caps, a genuinely quiet default, and never gating
   scripture content behind cosmetic progression.
6. **No streak anxiety at scale.** Freezes are currently subscriber-only. That is
   defensible as a Pro perk but not as the *only* forgiveness in the system — a free user
   should have some non-punitive repair (a grace day, or simply a streak that shows the
   longest run alongside the current one, YouVersion-style).
7. **A visible off switch.** Reader-level settings to hide the tree, the streak, or both,
   without losing progress. `useTreeSummary()` already handles `disabled`; extend the same
   courtesy to streaks. A devotional product that cannot be used quietly has mis-set its
   defaults.

**Additions to the visual anti-pattern list**, from section 3: the tree is never the LCP
element; the header tree never loops; nothing animates during reading or a lesson step;
the wilt is never animated; no celebration is louder than the previous one.

---

## 7. Sources

**Duolingo — primary**
- [Streak + habit research](https://blog.duolingo.com/how-duolingo-streak-builds-habit/) — +1.7% D7 (milestone animations); +0.38% DAU (2nd freeze); 3.6x course completion at 7 days
- [Improving the streak](https://blog.duolingo.com/improving-the-streak/) — +3.3% D14, +1% DAU, +10.5% on-streak share from decoupling streak from daily goal
- [Time Spent Learning Well](https://blog.duolingo.com/time-spent-learning-well/) — TSLW formula; 15 min/day target; XP rebalancing ~+1.8M min/day; shorter lessons *decreased* TSLW
- [The Path redesign](https://blog.duolingo.com/new-duolingo-home-screen-design/) — "not sure whether they're using Duolingo the 'correct' or 'best' way"; no numbers published
- [Android performance](https://blog.duolingo.com/android-app-performance/) — ~20,000 learners/day saved by deferring ads init; 5s+ startups 39% → 8%; app-open conversion 91% → 94.7%; 60%+ perceived session-end latency cut; 200+ A/B tests in 2024
- [Yancey & Settles, KDD 2020](https://research.duolingo.com/) ([ACM DL](https://dl.acm.org/doi/10.1145/3394486.3403351)) — notification bandit: +0.5% DAU, +2% new-user retention; 200M sends / 35 days

**Duolingo — first-hand, published elsewhere**
- [Mazal, *How Duolingo reignited user growth*](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth) — CURR +21% (best-user churn −40%+); 7+ day streak DAU share ~3x; leagues +17% learning time; "Moves counter" gamification completely neutral; referrals only +3%
- [*The secret to Duolingo's growth*](https://www.lennysnewsletter.com/p/the-secret-to-duolingos-growth) — leaderboards D1 +1%, D7 +2%, D14 +3%; ~50% of experiments launch; hundreds per quarter

**Khan Academy**
- [Efficacy results, Nov 2024](https://blog.khanacademy.org/khan-academy-efficacy-results-november-2024/) — deep use = 30+ min/week or 2+ skills/week; ~20% vs ~7% greater-than-expected gains; effect size 0.36; ~350K students; only ~9% reached the dose
- [Motivation Meets Mastery (2026)](https://blog.khanacademy.org/khan-academy-reimagined-for-districts-2026/) — "weren't sure what to work on next"; "motivations and celebrations along the way"
- [Skills to proficient](https://blog.khanacademy.org/why-khan-academy-will-be-using-skills-to-proficient-to-measure-learning-outcomes/) — the mastery ladder

**Apple**
- [Get active with Apple Watch, Apr 2025](https://www.apple.com/newsroom/2025/04/get-active-with-apple-watch/) — 140K+ AHMS participants; ring closure >=50% vs <=10%: −48% poor sleep, −73% elevated RHR, −57% elevated stress (PSS-4). Correlational.
- [Stay active in the new year, Jan 2026](https://www.apple.com/newsroom/2026/01/stay-active-in-the-new-year-with-apple-watch/) — ~100K participants / 4 years; >60% raised exercise minutes >10% in early January, ~80% held to mid-January, 90% of those through March
- [Apple HIG — Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)

**Strava**
- [Franken, Bekhuis & Tolsma, *Kudos make you run!*, Social Networks 72 (2023)](https://research.rug.nl/en/publications/kudos-make-you-run-how-runners-influence-each-other-on-the-online/) — 5 Dutch clubs, 329 athletes, 19,026 kudos ties, 10,037 activities; +1 kudos ≈ +3% likelihood of +1 session/week; 1-SD kudos-indegree ≈ +10%

**YouVersion**
- [2025 engagement report](https://www.youversion.com/news/youversion-announces-2025-verse-of-the-year) — 3M+ one-year plan subscriptions on New Year's Day (+18% YoY); 19M opens on 1 Nov 2025; 40 plan-days/second; 2.6M in the 30-day challenge; +19% YoY daily use in November
- [Announcing Streaks (2017)](https://blog.youversion.com/2017/08/youversion-bible-app-announcing-streaks-2017/), [Badges](https://help.youversion.com/l/en/category/p66ad7giui-badges) — milestone and personal-record mini-celebrations

**Habitica, Forest, Finch, Headspace, Brilliant**
- [Diefenbach & Müller-Herbers, IJHCS 127 (2019)](https://www.sciencedirect.com/science/article/abs/pii/S1071581918305135) — Habitica: interviews + 45-user field study; all participants showed counterproductive effects; punishment-avoidance relabelling; correlation with perceived reward-system inappropriateness
- [Habitica death mechanics](https://habitica.fandom.com/wiki/Death_Mechanics) — lose a level and all XP toward the next
- [Forest design critique](https://medium.com/@charliezhang0731/forest-app-design-critique-65da1e7e31ef) **[secondary]** — dying tree as explicit loss aversion; habituation to virtual loss
- [Slate, Finch review (Sept 2026)](https://slate.com/technology/2026/09/finch-app-self-care-wellness-review.html) — "Finch burnout"; "I was performing wellness rather than actually feeling well"
- [Headspace run streak: help centre](https://help.headspace.com/hc/en-us/articles/215730567-How-does-the-run-streak-feature-work), [article](https://www.headspace.com/articles/building-a-meditation-practice) — encouragement framing, no loss messaging
- [Rive on Brilliant](https://rive.app/blog/how-brilliant-org-motivates-learners-with-rive-animations) — animation on path nodes and the streak moment only; file-size rationale
- [Brilliant: what is a streak?](https://brilliant.org/help/using-brilliant/what-is-a-streak/) — 3 problems *or* a lesson extends it

**Performance, notifications, critique**
- [web.dev — Business impact of Core Web Vitals](https://web.dev/case-studies/vitals-business-impact) — Vodafone LCP −31% / +8% sales; Tokopedia LCP −55% / +23% session duration; Lazada 3x LCP / +16.9% mobile conversion; Yelp FCP 4.4s → 1.8s / +15% conversions
- [Airship push benchmarks 2026](https://www.airship.com/blog/your-guide-to-airships-mobile-app-push-notification-benchmarks-for-2026/) **[vendor data]** — Android opt-in ~97%, iOS ~54% post-iOS 18.2
- [RELEVANT — Your Bible app streak is impressive…](https://relevantmagazine.com/faith/your-bible-app-streak-is-impressive-but-are-you-actually-learning-anything/) — "religious Fitbits"; argument only, no data

**Explicitly secondary or unverified**
- Duolingo "play first, profile second" onboarding — [Juno School](https://www.junoschool.org/article/duolingo-onboarding-experience/) **[secondary]**
- Calm's completion modal / mindful minutes / longest streak — **[secondary]**; no primary Calm design source located
- Finch's no-punishment mechanics — **[secondary]**; consistent across reviews, Finch publishes no design writeup
- ">6 pushes/week → 3.4x uninstall in 30 days" — **[unverified]**; Klaviyo benchmark via aggregators. Do not cite.

**Already cited in `docs/reward-moments-plan.md`, not repeated here:** Nunes & Drèze
(endowed progress), NN/g animation duration and response-time limits, *Juice it or lose
it* and its counter-argument, variable-reward ethics writeups.
