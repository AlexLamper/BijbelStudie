# Reward moments

A plan for what happens the instant a reader finishes something. Research first, then
what the repo already has, then the build.

Scope note on vocabulary: the word *levensboom* is being retired from UI copy. Code
paths, modules and this document keep it (renaming `lib/levensboom/` would break the
three-copies parity rule for no gain). Reader-facing copy says **"je boom"** and
**"voortgang"**.

---

## Part 1 — Research

### 1.1 How Duolingo structures the end of a lesson

The sequence is a series of single-purpose screens, each advanced by one tap, never a
single crowded summary:

1. **Scorecard.** XP counts up from zero. Bonus lines (combo, "perfect lesson") are
   added one at a time rather than pre-summed, so each is its own small event.
2. **Streak beat.** The number increments and the week strip fills today's cell.
3. **Milestone beat**, only on notable days — since the 2023 redesign a phoenix
   transformation of the mascot.
4. **Economy beat** where applicable: chest, gems, league placement.
5. **Continue.**

Published numbers worth knowing, because they all point the same way:

| Change | Result | Source |
|---|---|---|
| New streak-milestone animations | **+1.7% D7 retention** (new learners) | Duolingo blog, habit post |
| Streak freezes: 1 → 2 held at once | **+0.38% DAU** | same |
| Reaching a 7-day streak | **3.6× more likely to complete the course** | same |
| Streak decoupled from the daily goal (one lesson extends it) | **+3.3% D14 retention**, **+1% DAU**, **+10.5%** of daily learners on a streak (+19% for new users) | Duolingo blog, "Improving the streak" |

The lesson from that last row is the important one: Duolingo's biggest streak win came
from **lowering the bar, not raising the reward**. Their own conclusion — "lowering the
barriers to building a consistent daily habit is more important … than how much you
learn each day, at least early on."

Duolingo also frames the psychology explicitly: early streaks are proportionally huge
wins (2→3 days is +50%; 200→201 days is +0.5%), so the early days need celebration and
the late ones lean on loss aversion instead. Their design brief for the milestone
redesign was three things: make the metaphor legible across cultures, raise celebratory
energy (the balloon draft was "cute, but not quite celebratory enough, energy-wise"),
and make it shareable. On execution: "timing is everything in animation."

Sound design is not documented by Duolingo in engineering detail. What is observable and
worth borrowing: a very short tonal chime on a correct answer, a **rising pitch ladder**
as consecutive correct answers accumulate (the pitch itself carries the combo count), and
a longer tonal fanfare at the end. Treat the ladder as a borrowed idea, not a spec.

### 1.2 What the behavioural literature supports, and what backfires

- **Endowed progress** — Nunes & Drèze (2006), *Journal of Consumer Research* 32(4)
  504–512. Pre-filled loyalty cards nearly doubled completion (34% vs 19%) for identical
  remaining effort. → Never show an empty bar. A reader at 0 XP into a level should still
  see a sliver, and the tree already renders half its leaves open at `frac = 0`.
- **Goal gradient** — effort rises as the goal nears. → Frame the *remainder*
  ("nog 40 XP"), never the total earned.
- **Loss aversion** powers streaks and is also where streaks turn cruel. Duolingo's own
  data says *slack* increases engagement. → Freezes, forgiving repair, and never shaming
  copy.
- **Immediacy** — NN/g: 100 ms reads as instant; 100–400 ms is the working band for UI
  motion; 400 ms is already slow; past ~500 ms motion "starts to feel like a real drag";
  1 s is the limit of uninterrupted thought. → First frame of feedback inside 100 ms;
  whole micro-reward done inside 400 ms.
- **Juice** — Jonasson & Purho, *Juice it or lose it*, GDC Europe 2012: "maximum output
  for minimum input" via tweening, easing, scale bounce, sound, particles. The
  counter-argument is equally published (Game Developer, "Indies, resist the urge to
  'juice it or lose it'"): juice on a weak core only decorates it, and over-juicing costs
  legibility. Our core is the tree; juice serves it or it goes.
- **Variable-ratio reinforcement** is the most extinction-resistant schedule — and the
  reason slot machines work. Ethical use, per the design literature: align the reward
  with the user's actual goal, keep it rare, don't hide the odds, add no fake scarcity or
  fake social proof, and measure regret alongside retention.
- **Habituation** — a fixed celebration shown daily stops registering within weeks. The
  fix is *tiering* (micro/meso/macro) and keeping the macro genuinely rare. Not making
  the daily one louder.

### 1.3 Three non-game apps to borrow from

**Apple Fitness rings.** The reward *is* the progress display: one glanceable object,
closing it is the entire event, and the close is a short animation with a distinct
haptic. Apple's HIG on haptics defines the vocabulary — notification (success / warning /
error), impact (light / medium / heavy), selection — and is explicit that haptics are for
meaningful moments only, must not fatigue the user, and must respect the system setting.
*Borrow:* one persistent object that **is** the score, plus a three-level haptic
vocabulary.

**Headspace.** End-of-session is a calm summary: minutes, running total, one line of
encouragement. No points economy, no leaderboard, no urgency. *Borrow:* the tone. A
devotional product's reward can be a quiet acknowledgement and still land as a reward.

**YouVersion Bible App.** Streaks with "special, mini-celebrations" at milestones **and
when you beat your own previous record**, plus badges for finishing a plan, sharing a
verse, highlighting. Personal-record framing rather than competitive. *Borrow:* "beat
your own best" as a milestone type, and badges tied to acts of devotion rather than raw
volume.

---

## Part 2 — What already exists

### 2.1 Trigger events the server already emits

`lib/gamification.ts` defines `XpEvent` and `grantXp()` returns
`{ xp, level, levelledUp, awarded, newBadges }` — every reward the UI needs, already in
one payload.

| Trigger | `XpEvent` | XP | Where the UI reacts today |
|---|---|---|---|
| Lesson complete | `study_lesson` | 25 | `LessonCompleteCard` + `LessonTreeMoment` |
| Study complete | `study_completed` | 60 | same card |
| Chapter read | `chapter_read` | 5 | nothing |
| Plan day read / studied | `plan_day_read` / `plan_day_studied` | 10 / 30 | nothing |
| Plan complete | `plan_completed` | 150 | nothing |
| Note written | `note_written` | 8 (min 15 chars, cap 3/day, `lib/noteXp.ts`) | nothing |
| Streak day | `streak_day` | 3 | nothing |
| Level up | `levelledUp` flag | — | `LevelUpDialog` via provider |
| Item unlock | `itemsUnlockedAtLevel()` | — | inside `LevelUpDialog` / `LessonTreeMoment` |
| Badge earned | `newBadges[]` | — | chips on `LessonCompleteCard`; grid on `components/profile/badges.tsx` |

Levels: `xpForLevel(n) = 50·(n−1)·n` → 100, 300, 600, 1000, 1500 … `describeLevel(xp)`
yields `xpIntoLevel` / `xpForNextLevel`, and `fracOf()` turns that into the `frac` the
tree consumes.

Streak lives on `User` (`streak`, `lastStreakDate`, `freezeCount`), advanced by
`app/api/streak/route.ts` (web) and `app/api/v1/streak/route.ts` (mobile). Freezes are
consumed only for `subscribed` users. **There is no streak celebration UI anywhere.**
Badge thresholds are `streak30/60/90/120` — no 7, no 100, no 365.

### 2.2 The reward UI that exists

- **`components/providers/levensboom-provider.tsx`** — `applyXp(grant)` optimistically
  patches the summary, sets `health: 1`, and on `levelledUp` sets `celebrate = level` and
  refreshes. `dismissCelebration()` POSTs `/api/v1/gamification/seen`, which moves
  `levensboom.lastSeenLevel` forward-only and never past the real level. That marker is
  the de-dup gate and is **account-level**, so a level-up earned on the web celebrates
  once, on whichever device opens next. This is the right foundation and every new macro
  moment should reuse it.
- **`components/levensboom/LevelUpDialog.tsx`** — the existing macro moment. `GROW_MS =
  1200`, ease-out cubic `1−(1−t)³`, `reveal` tweened from
  `min(0.92, maxDepthForLevel(level−1)/(maxDepthForLevel(level)+1))` to 1, plus a camera
  push `scale 1 → 1.08` over 1600 ms ease-out, palette forced to night, `playLevelUp()`,
  unlocked items listed, one "Verder" button. No claim button, deliberately.
- **`components/levensboom/LessonTreeMoment.tsx`** — the same 1200 ms grow-in, but only
  when `levelledUp`; otherwise a static tree with a `+N XP` pill.
- **`components/study/flow/LessonCompleteCard.tsx`** — `useCountUp(target, enabled)`,
  900 ms, ease-out cubic. Level-up chip and badge chips (labels via
  `lib/badgeCatalog.ts`, which exists precisely so ids like `completed10` never reach the
  reader).
- **`components/study/flow/StudyFlowShell.tsx`** — `playSwipe(±1)` per page turn,
  `playComplete()` on finish, fire-and-forget `POST /api/streak`, and `soundOn`
  persisted in `localStorage['study:sound']` with an icon-rail toggle. Sound is gated on
  `soundOn && !reduceMotion`.

### 2.3 Sound and animation primitives (reuse, do not replace)

`lib/studySound.ts` and `lib/levensboomSound.ts` are already the right architecture: a
lazily created shared `AudioContext`, `resume()` attempted per call, everything wrapped
in `try {} catch {}` because "audio is decoration and fails silently".

- `playSwipe(dir)` — 240 ms pink-weighted noise burst, bandpass Q 0.9, swept 1100→320 Hz
  forward and 420→1400 Hz back, peak gain 0.09.
- `playComplete()` — sine D5 587.33 Hz then A5 880 Hz at +0.11 s, peak 0.075, 380 ms
  tail. A fifth, arpeggiated: "and… done".
- `playLevelUp()` — sine D5 / F♯5 / A5 / D6 at 0 / 0.13 / 0.26 / 0.46 s, peak 0.055
  (0.07 on the last), 0.5 s tails and 1.1 s on the octave.

### 2.4 The tree, and how to animate it without randomness

`lib/levensboom/rng.ts` is the only permitted random source: FNV-1a 32 → mulberry32,
seeded from the user id. `generateTree({ seed, level, frac, … })` consumes that stream in
a fixed order that **does not depend on `frac` or `reveal`**. `frac` only sets
`openCut = ceil(leaves.length · (0.5 + 0.5·frac))` — how many of the already-generated
leaves are drawn open — and `reveal` is a depth cut over the same geometry.

**So the answer to "how do we animate `frac` without randomness" is: `frac` and `reveal`
are pure scalar inputs. Tween them.** Same seed, same level, same geometry, more leaves
open. No RNG draw is added, the result is byte-identical across reloads and across
Dart, and the generator is untouched — which is what the three-copies parity rule
requires.

Two caveats: `openCut` is quantised by `ceil`, so on a small tree the unfurl is steppy —
cross-fade per-leaf opacity there rather than adding leaves. And `generateTree` must be
memoised on `(seed, level, species, scene)` so a 60 fps `frac` tween re-runs the draw
pass, not the generator.

### 2.5 Flutter app

`bijbelstudie_mobile/lib/features/levensboom/present/levensboom_celebration.dart` is the
line-for-line mirror of `LevelUpDialog` and already fires
`HapticFeedback.mediumImpact()`. `HapticFeedback.selectionClick()` is used in
`read_screen.dart` and `notes_screen.dart`; `lightImpact()` in `verse_action_sheet.dart`.
`lesson_complete_card.dart` and `lesson_screen.dart` mirror the web card. **No audio
playback and no confetti package anywhere** — the app is currently haptics-only.
`domain/tree_generator.dart`, `species.dart`, `catalog.dart`, `stages.dart` mirror the TS
and `test/levensboom_parity_test.dart` asserts identical output from one seed.

### 2.6 Gaps

Chapter read, note saved, plan day and plan complete grant XP **silently**. Streak has no
celebration at any threshold. There is no persistent progress display outside the header
avatar. There is no sound at all outside `/studie`. And landing-page copy still says
"Levensboom" in ~8 places even though the in-flow copy has been renamed to "je boom".

---

## Part 3 — The plan

### 3.1 Principles

- **Warm, not loud.** This is a devotional product. Nothing may read as a slot machine:
  no coin showers, no confetti cannons, no "CLAIM" buttons, no countdown timers.
- **The tree is the hero.** Every reward is expressed as something happening *to the
  tree*. If a beat can't be told through the tree or the number, it doesn't ship.
- **Dignity.** No shaming, no loss framing in copy. "Je hebt 4 dagen op rij" — never "Je
  verliest je reeks!"
- **Immediacy.** First visible frame inside 100 ms of the tap that earned it. The reward
  must never wait on a network round-trip; the provider's optimistic `applyXp` already
  makes this possible.
- **Cap frequency.** One macro moment per session, maximum. Everything else degrades to
  meso or micro. Habituation is the real risk, not insufficient fanfare.
- **`prefers-reduced-motion` and the sound toggle are hard gates.** Reduced motion means
  no tween *and no sound* — the existing code already couples them, keep it that way.
  Promote `localStorage['study:sound']` to a global key so it applies outside `/studie`.
- **Never block the next action for more than ~1.5 s without a skip.** Any full-screen
  beat is dismissible from frame one by tap, Escape, or the primary button.

### 3.2 Reward taxonomy

| Tier | Trigger | What the reader sees | Duration | Sound | Haptic (app) | Dutch copy | Lives in |
|---|---|---|---|---|---|---|---|
| **Micro** | Correct quiz answer | Answer chip settles, tiny scale bounce | 180 ms | `playTick(n)` — pitch ladder | `selectionClick` | — | `StepQuiz.tsx` |
| **Micro** | Chapter marked read | Header avatar leaf-unfurl pulse + `+5 XP` toast | 300 ms | `playTick(0)` | `lightImpact` | "+5 XP · Hoofdstuk gelezen" | `VerseMarkers.tsx`, `NavTreeAvatar.tsx` |
| **Micro** | Step advance in `/studie` | existing page-swipe | 240 ms | `playSwipe` (exists) | `selectionClick` | — | `StudyFlowShell.tsx` |
| **Meso** | Note saved (XP-earning) | Inline `+8 XP` badge on the note, avatar pulse | 400 ms | `playTick(0)` | `lightImpact` | "+8 XP · Aantekening bewaard" | `CreateNoteModal.tsx` |
| **Meso** | Lesson complete | Full card: XP count-up, bar fill, tree unfurl in place | 1200 ms total | `playComplete` (exists) | `mediumImpact` | "Les afgerond" / "Nog 40 XP tot niveau 6" | `LessonCompleteCard.tsx` |
| **Meso** | Streak extended | Streak row on the lesson card: number ticks, day cell fills | 400 ms | `playStreak` | `lightImpact` | "5 dagen op rij" | new `StreakBeat.tsx` |
| **Meso** | Plan day complete | Day cell fills on the plan strip + XP toast | 400 ms | `playTick(0)` | `lightImpact` | "+30 XP · Plandag bestudeerd" | plan detail page |
| **Macro** | Level up | `LevelUpDialog` — night palette, new wood grows in, camera push | 1600 ms, skippable | `playLevelUp` (exists) | `mediumImpact` | "Niveau 6 · Je boom is gegroeid" | `LevelUpDialog.tsx` |
| **Macro** | Growth-stage change | Same dialog, stage headline takes over | 1600 ms | `playLevelUp` + low swell | `heavyImpact` | "Je boom is nu een jonge boom" | `LevelUpDialog.tsx` |
| **Macro** | Species / scene / animal unlock | Item row inside the dialog, `→ Bekijk je boom` | within the above | — | — | "Nieuw voor je boom: Olijfboom" | `LevelUpDialog.tsx` |
| **Macro** | Badge earned | Chip on the lesson card; dialog only if no level-up fired | 900 ms | `playBadge` | `success` notification | "Nieuwe badge: Eerste studie af" | `LessonCompleteCard.tsx`, new `BadgeBeat.tsx` |
| **Macro** | Streak milestone 7 / 30 / 100 / 365 | Full-screen: tree at dusk, number large, day ring completes | 1800 ms, skippable | `playMilestone` | `heavyImpact` | "7 dagen op rij. Een week trouw gelezen." | new `StreakMilestone.tsx` |
| **Macro** | Personal record beaten | Same component, different headline | 1400 ms | `playStreak` (up an octave) | `mediumImpact` | "Je langste reeks ooit: 23 dagen" | `StreakMilestone.tsx` |

Add `streak7`, `streak100`, `streak365` and `record` to `BADGE_META` and
`evaluateBadges()`. Seven days is the single highest-leverage threshold in the whole
system per Duolingo's 3.6× figure, and it currently celebrates nothing.

### 3.3 The end-of-lesson storyboard

Beats run in order, each fully skippable. Total ≈ 3.0 s if the reader sits still, ≈ 0 s
if they tap through.

| t | Beat | Component |
|---|---|---|
| 0 ms | Card mounts, tree already at its **pre-lesson** `frac`. Bar at old fill. | `LessonCompleteCard` |
| 0 ms | `playComplete()`, `mediumImpact` | existing |
| 60 ms | XP count-up starts; bar begins filling; `frac` tween starts in lockstep | `useCountUp` + new `frac` tween |
| 960 ms | All three land together: number final, bar at rest after overshoot, leaves open | — |
| 1000 ms | **Streak beat** slides up from below: number ticks old→new, today's cell fills, `playStreak` | new `StreakBeat` |
| 1400 ms | **Badge chips** stagger in, 80 ms apart, `playBadge` on the first only | `LessonCompleteCard` |
| 1600 ms | Primary CTA becomes prominent: "Volgende les" / "Terug naar de studie" | `LessonCompleteCard` |
| on tap | If `levelledUp` **or** a streak milestone landed: the macro beat takes the screen. Level-up wins ties; the milestone queues behind it and shows on the next mount, gated by its own seen-marker. | `LevelUpDialog` / `StreakMilestone` |

Never stack two macro beats in one sitting. The `lastSeenLevel` pattern in
`/api/v1/gamification/seen` already solves the queueing — add `lastSeenStreakMilestone`
alongside it, same forward-only clamp.

### 3.4 Animation specs

| What | Duration | Easing | Reduced-motion fallback |
|---|---|---|---|
| Micro bounce (chip, avatar pulse) | 180 ms | `cubic-bezier(.34,1.56,.64,1)` scale 1→1.06→1 | opacity 0→1, 120 ms |
| XP count-up | 900 ms (keep) | ease-out cubic `1−(1−t)³` | final number, no tween |
| Bar fill | 900 ms | ease-out to 102% of target at 780 ms, settle to 100% by 900 ms | width set directly |
| `frac` tween (leaf unfurl) | 900 ms, same clock as the count-up | ease-out cubic | `frac` set to final |
| `reveal` tween (new wood on level-up) | 1200 ms (keep `GROW_MS`) | ease-out cubic | `reveal = 1` |
| Camera push | 1600 ms (keep) | ease-out, scale 1→1.08 | no transform |
| Streak number tick | 400 ms | ease-out, digit slides up 0.6em | number set directly |
| Badge chip stagger | 240 ms each, 80 ms apart | ease-out | all visible at once |

**The `frac` tween is the one new mechanic.** Hold `fracFrom` (pre-grant) and `fracTo`
(post-grant) in `LessonTreeMoment`, tween a scalar between them on `requestAnimationFrame`
with the same ease-out cubic already in the file, and pass it to `TreeCanvas`. `frac` is
a pure input; nothing is re-seeded and the generator is not touched. Memoise the
generated scene on `(seed, level, species, scene)` so only the draw pass repeats. On a
level-up, run the `frac` tween to 1.0 for the old level on the card, then let the dialog
run the `reveal` tween for the new level — that reads as "the level filled up, *then* it
grew".

**Particles.** Leaf drift only, and sparingly: 3–6 leaves, 2.5–4 s fall, 12–20 px/s
drift, opacity 0.35 peak, colours drawn from `palette.ts` only (`#0D9488` and the
species' own leaf tones — never gold except on the Pro ring, never multi-colour). Emit on
macro beats only. Zero particles under reduced motion. `TreeCanvas` already accepts a
`celebration` flag; extend that path rather than adding an overlay.

### 3.5 Sound palette

New file `lib/rewardSound.ts`, same shape as the two existing synth modules (shared lazy
context, per-call `resume()`, silent `catch`). All sines — the existing palette is sine
and the product tone is calm.

| Cue | Waveform | Notes | Duration | Gain envelope | Used for |
|---|---|---|---|---|---|
| `playTick(step)` | sine | D5 587.33 Hz × 2^(step/12), capped at +7 semitones (A5) | 90 ms | 0.0001 → 0.045 @ 15 ms → 0.0001 @ 90 ms | micro; `step` is the session's consecutive-completion counter |
| `playComplete` (exists) | sine | D5 → A5 @ +0.11 s (fifth) | 400 ms | peak 0.075, 380 ms tail | lesson complete |
| `playStreak` | sine | A4 440 → D5 587.33 (fourth up) | 300 ms | peak 0.05, 280 ms tail | streak extended |
| `playBadge` | sine | F♯5 739.99 + A5 880 together (major third, as a dyad) | 350 ms | peak 0.05, 330 ms tail | badge earned |
| `playLevelUp` (exists) | sine | D5 / F♯5 / A5 / D6 arpeggio | 1.6 s | peak 0.055, 0.07 on the octave | level up |
| `playMilestone` | sine ×2 | `playLevelUp` plus D3 146.83 Hz swell underneath, 1.8 s, faded in over 400 ms | 2.0 s | swell peak 0.03 | streak milestone, stage change |

**Pitch ladder.** Keep a module-scoped `let step = 0` incremented per micro completion
and reset on a macro beat or after 90 s idle. Cap at +7 semitones so it never becomes
shrill, and never persist it — a ladder that resumes after a reload reads as a bug.
Ceiling on every gain: nothing exceeds 0.09, which is where `playSwipe` already sits.

**Global mute.** Promote `localStorage['study:sound']` to `localStorage['bs:sound']`,
read it in `lib/rewardSound.ts` so a single check gates every cue, and surface the toggle
in `/instellingen` as well as the `/studie` icon rail. Migrate the old key on read.

**iOS.** Synthesis is not worth a Dart dependency for six cues: ship six short AAC assets
generated from these exact specs and play them through the existing audio plumbing,
respecting the same account-level pref. Haptics map as in the taxonomy table —
`selectionClick` for micro, `lightImpact` for meso, `mediumImpact` for level-up,
`heavyImpact` for stage change and milestone, `HapticFeedback.vibrate` never. Per Apple's
HIG, reserve haptics for meaningful moments and respect the system setting.

### 3.6 Progress display

Three surfaces, one truth (`describeLevel` + `fracOf`):

- **Header** — `NavTreeAvatar` (already in `components/layout/header.tsx`) gains a thin
  arc at `frac`. Tooltip: "Niveau 5 · nog 40 XP". This is the Fitness-ring borrow: the
  avatar *is* the score.
- **Dashboard "Voortgang" card** — new. Level, stage word, an XP bar, streak with the
  week strip, and the next unlock from `nextLevelUnlock()`. Copy: "Nog 40 XP tot niveau 6
  — dan komt de Olijfboom vrij." Naming the reward is what makes the remainder feel
  near.
- **Lesson end** — the bar and the remainder line, per the storyboard.

Framing rules: always the **remainder** ("nog 40 XP"), never the total; never a bar at
zero (endowed progress — the tree already opens half its leaves at `frac = 0`, mirror
that in the bar with a 4% floor); the stage word carries the emotional weight, the level
number is the counter. No use of "levensboom" — and sweep the ~8 remaining instances in
`components/landing/LandingPage.tsx` and `LevensboomGroeiDemo.tsx` in the same pass.

### 3.7 Variable and scheduled delights

Two, both **server-decided and seeded**:

1. **Dubbele XP.** `grantXp()` already takes a `multiplier`. Decide it server-side with
   `mulberry32(fnv1a32(`${userId}:${isoDate}:dubbelxp`))() < 0.05` — 5%, at most once per
   calendar day, on `study_lesson` only. Deterministic per user-day, so a retry cannot
   reroll it and a client cannot gamble. Copy: "Dubbele XP — +50 in plaats van +25." The
   multiplier is already in the returned `awarded`, so the Flutter app gets it with no
   change.
2. **A visitor in the tree.** After a streak of 7+, a bird may appear for one session:
   `mulberry32(fnv1a32(`${userId}:${isoDate}:bezoek`))() < 0.15`. **Render-only** — the
   catalog rule is that season/time/scene/animal are render-only, and this must not
   mutate `avatar.animal` (which is the reader's own choice). Pass it as a separate
   transient `visitor` prop to `TreeCanvas`.

Rules for both: rare (≤5% and ≤15%), never advertised in advance, never a near-miss
display, never purchasable, and never applied to anything the reader is waiting on. The
server returns the outcome; the client only renders it. Parity comes free because both
values arrive in the existing v1 payloads — the app renders, it does not draw.

### 3.8 Anti-patterns and accessibility

Do not build: confetti cannons or coin showers; "CLAIM"/"COLLECT" buttons; countdown
timers or expiring rewards; leaderboards or any competitive comparison; loss-framed
notifications ("Je reeks gaat verloren!"); near-miss displays; streak-repair purchases;
mandatory full-screen beats that can't be skipped; any celebration louder than the last
one to fight habituation; escalating notification frequency.

Accessibility: `prefers-reduced-motion` disables tween **and** sound; every macro dialog
keeps `role="dialog"` + `aria-modal` + Escape (`LevelUpDialog` already has all three);
the XP figure and the bar carry `aria-live="polite"` so the count-up is announced once at
its final value, not per frame; every tree render keeps its `ariaLabel`; the sound toggle
is reachable from `/instellingen`, not only from the `/studie` rail; colour is never the
only carrier — the streak strip needs a filled/empty shape difference, not just teal vs
grey.

### 3.9 Measurement

`lib/analyticsSchema.ts` is a strict allowlist: fixed event names, fixed property keys,
fixed value sets, `platform` on everything, nothing free-text ever reaching Mongo. Follow
it exactly.

Add to `EVENTS`:

- `reward_shown` — `{ tier: micro|meso|macro, kind: lesson|streak|level|badge|milestone|unlock|bonus, platform }`
- `reward_dismissed` — `{ kind, how: tap|escape|cta|auto, platform }`
- `streak_milestone` — `{ milestone: 7|30|100|365|record, platform }`
- `sound_toggled` — `{ state: on|off, platform }`

Add `reward_skip`, `reward_view_tree`, `settings_sound` to `CLICK_TARGETS`
(`lib/analyticsRoutes.ts`) and tag the buttons with `data-track`, matching the existing
`data-track="study_sound"` pattern.

Metrics: D1/D7 retention (the direct comparable — Duolingo's milestone animations moved
D7 by 1.7%); lessons per active week; **dismissal speed** of macro beats (a rising median
is the habituation alarm); **sound-off rate** (if it climbs past ~15% the palette is too
loud); streak survival past day 7; freeze-consumption rate.

A/B tests, in order of expected value:

1. **Streak milestone beat at 7 days: on vs off.** Primary metric D7 retention. This is
   the closest analogue to Duolingo's published +1.7%.
2. **Remainder framing: "Nog 40 XP tot niveau 6" vs "410 / 450 XP".** Primary metric
   lessons per week. Tests goal-gradient directly.
3. **The `frac` tween on the lesson card: on vs off**, sound held constant. Isolates
   whether the tree-grows-in-place beat carries the reward or the number does — that
   answers whether Phase 2 is worth building at all.

### 3.10 Roadmap

**Phase 1 — quick wins (S).** Micro feedback where XP is currently silent: `+5 XP` toast
and header-avatar pulse on chapter read (`VerseMarkers.tsx`, `NavTreeAvatar.tsx`), `+8 XP`
on note save (`CreateNoteModal.tsx`), the streak row on the lesson card
(`LessonCompleteCard.tsx` + new `StreakBeat.tsx`), remainder framing everywhere, the
dashboard "Voortgang" card, the `levensboom`→`je boom` copy sweep on the landing page,
`streak7/100/365` in `badgeCatalog.ts` + `evaluateBadges()`. *Risk:* the badge additions
retroactively award to existing long-streak users on their next `grantXp` — acceptable,
but expect a burst of chips on first login and don't let it fire a macro beat.

**Phase 2 — sequence and sound (M).** `lib/rewardSound.ts` with the six cues and the
pitch ladder; global `bs:sound` key with migration; the `frac` tween in
`LessonTreeMoment.tsx` with memoised generation; the storyboard timing in
`LessonCompleteCard.tsx`; `StreakMilestone.tsx` plus `lastSeenStreakMilestone` in
`app/api/v1/gamification/seen/route.ts`; the analytics events. *Risks:* the `frac` tween
must not touch `lib/levensboom/generate.ts` — tween the input, keep the generator
byte-identical to the Dart mirror and the spec, or both parity suites break. Everything
here is client-side canvas work; **no new server compute**, which the tight Vercel Fluid
Active CPU budget requires. The one server change is a single extra field on an endpoint
that already writes.

**Phase 3 — variable delights and parity (M–L).** `multiplier` wiring in `grantXp` with
the seeded per-day draw; the render-only `visitor` prop on `TreeCanvas`; six AAC assets
and the Dart playback path; haptic mapping in `lesson_complete_card.dart` and
`levensboom_celebration.dart`; the three A/B tests. *Risks:* the visitor must stay
render-only or it collides with the reader's chosen `animal`; the seeded draws must live
in `lib/levensboom/rng.ts` (the one permitted source) and be mirrored in `rng.dart` if
the app ever needs to predict them — better that it doesn't, and only renders what the
server sent.

---

## Sources

- [The Duolingo Streak Uses Habit Research to Keep You Motivated](https://blog.duolingo.com/how-duolingo-streak-builds-habit/) — +1.7% D7 from milestone animations, +0.38% DAU from a second streak freeze, 3.6× course completion at 7 days, the proportional-reward and loss-aversion framing.
- [Improving the streak: Forming habits one lesson at a time](https://blog.duolingo.com/improving-the-streak/) — decoupling the streak from the daily goal: +3.3% D14, +1% DAU, +10.5% on-streak share; "lowering the barriers … is more important than how much you learn each day".
- [Animating the Duolingo Streak](https://blog.duolingo.com/streak-milestone-design-animation/) — the three-part redesign brief, balloons → phoenix, "timing is everything in animation".
- [How Streaks keep Duolingo learners committed](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/)
- [Start earning brand-new Achievements on Duolingo](https://blog.duolingo.com/achievement-badges/)
- Nunes, J. C. & Drèze, X. (2006). *The Endowed Progress Effect: How Artificial Advancement Increases Effort.* Journal of Consumer Research 32(4), 504–512. Summaries: [Loyalty & Reward Co](https://loyaltyrewardco.com/loyalty-psychology-series-endowed-progress-effect/), [goal-gradient](https://loyaltyrewardco.com/why-progress-is-motivating-the-loyalty-psychology-behind-the-goal-gradient-effect/)
- [NN/g — Executing UX Animations: Duration and Motion Characteristics](https://www.nngroup.com/articles/animation-duration/) and [The 3 Response Time Limits](https://www.nngroup.com/videos/3-response-time-limits-interaction-design/) — 100 ms instant, 100–400 ms band, 500 ms drags, 1 s thought limit.
- Jonasson, M. & Purho, P. *Juice it or lose it*, GDC Europe 2012 — [notes](https://roblog.co.uk/2024/03/juicy-games/); counterpoint: [Game Developer, "Indies, resist the urge to 'juice it or lose it'"](https://www.gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-)
- Hicks, K. et al. *Good Game Feel: An Empirically Grounded Framework for Juicy Design*, DiGRA — [paper](https://dl.digra.org/index.php/dl/article/download/936/936/933); [The effects of juiciness in an action RPG](https://www.sciencedirect.com/science/article/pii/S1875952118300879)
- [Apple HIG — Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics) — notification/impact/selection vocabulary, overuse and system-setting cautions.
- [YouVersion — Announcing Streaks](https://blog.youversion.com/2017/08/youversion-bible-app-announcing-streaks-2017/) and [Badges](https://help.youversion.com/l/en/category/p66ad7giui-badges) — mini-celebrations at milestones and on personal records.
- [Variable rewards in product design](https://www.appcues.com/blog/variable-rewards) and [Variable Reinforcement: ethical growth loops](https://buildbetterhq.substack.com/p/variable-reinforcement-why-infinite-wins) — extinction resistance, habituation, and the publish-the-odds / no-dark-patterns guardrails.
- [Duolingo — Streak System Detailed Breakdown](https://medium.com/@salamprem49/duolingo-streak-system-detailed-breakdown-design-flow-886f591c953f) and [App Teardown: How Duolingo's Streak Mechanic Actually Works](https://apptitude.io/blog/how-duolingos-streak-mechanic-actually-works/) — secondary, for the ~600-experiments figure and the beat-by-beat sequence.
