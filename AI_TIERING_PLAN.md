# AI tiering plan - a real Pro assistant, a cheap free one

Engineering notes, written 2026-08-30. English on purpose (this is internal);
every piece of user-facing copy proposed here is Dutch.

**Decision this document supports:** split one shared AI assistant into a cheap
free tier (roughly what exists today) and a genuinely better Pro tier, while
keeping the monthly AI bill small enough that it never threatens the margin on
a EUR 89,99/year subscription.

**Short version.** Put Pro on `claude-sonnet-5` with adaptive thinking at
`effort: "low"`, stream it, and cap it on estimated cost rather than on a
request count. Keep free on Gemini Flash-Lite but move it off the free API tier,
because the free tier's per-model daily quota - not the model - is what makes
the assistant feel broken today. At 250 Pro subscribers that is about
**USD 96/month** for Pro (about EUR 88), roughly **6% of net subscription
revenue**, or about **USD 122/month** all-in once the free tier moves to paid
Gemini.

Two things in this plan are not about money and matter more than the model
choice: **nothing streams today**, and **the web chat route has no content
licensing gate**.

---

## 1. What exists today

### 1.1 The call path

| Layer | File | Notes |
|---|---|---|
| Web UI | `components/study/AiAssistant.tsx` | The whole chat client. Also mounted inside the study flow. |
| Web UI (flow) | `components/study/flow/AiDock.tsx` | Wraps `AiAssistant`, supplies step-specific starter questions. |
| Web UI (launcher) | `components/study/AiAssistantWidget.tsx` | Floating popup on `/lezen`; hands a question to the tab. |
| Web API | `app/api/ai/chat/route.ts` | POST = ask, GET = quota. |
| Mobile API | `app/api/v1/ai/chat/route.ts` | Near-duplicate of the web route. |
| Prompt | `lib/aiPrompt.ts` | System prompt + chapter-context assembly. |
| Provider | `lib/aiGemini.ts` | Gemini call, retry, model fallback chain. |
| Answer cache | `lib/aiAnswerCache.ts`, `models/AiAnswer.js` | Shared first-turn answer cache. |
| Quota | `models/AiUsage.js` | One counter per user per UTC day. |

### 1.2 Which models are called

`lib/aiGemini.ts:6-27` defines a six-entry chain, all Gemini:

```
gemini-flash-latest        (primary; the comment says it resolves to gemini-3.7-flash)
gemini-3.6-flash
gemini-3.5-flash
gemini-flash-lite-latest
gemini-3.5-flash-lite
gemini-3.1-flash-lite
```

Configuration is fixed for every caller (`lib/aiGemini.ts:107-125`):
`temperature: 0.6`, `maxOutputTokens: 2500` (which on Gemini 3 **includes**
thinking tokens), `thinkingConfig: { thinkingLevel: "LOW" }`, and four safety
categories at `BLOCK_MEDIUM_AND_ABOVE`.

The chain exists to farm free-tier quota. The doc comment is explicit
(`lib/aiGemini.ts:8-18`): "The free tier grants its daily request quota per
project per model, so every distinct model is a separate bucket and the chain
multiplies the number of questions the app can answer per day."

**This is the root cause of the latency complaint.** See 1.6.

### 1.3 Quota enforcement

`app/api/ai/chat/route.ts:32-33`:

```ts
const FREE_DAILY_CAP = 5;
const PREMIUM_DAILY_CAP = 200; // soft anti-abuse cap for Pro/admin
```

- Window: **UTC calendar day**, computed in `currentDay()` (`route.ts:46-49`).
  Not a rolling window, so a user gets 5 at 23:55 and 5 more at 00:05.
- Increment is atomic and happens **before** the model call
  (`route.ts:124-130`), with a `refund()` on any failure (`route.ts:132`).
- Tier check is server-side: `!!user.subscribed || !!user.isAdmin ||
  isAdminEmail(...)` (`route.ts:120`).
- The mobile route repeats all of it (`app/api/v1/ai/chat/route.ts:38-39`,
  `136-162`), reading `auth.isPro || auth.isAdmin` instead.
- A cache hit still spends the user's daily count (`route.ts:152-167`), which is
  deliberate: the advertised "5 vragen" keeps its meaning.

There is **no monthly cap, no cost accounting, and no per-user visibility.**
`AiUsage` stores `{ userId, day, count }` and nothing else, with no TTL
(`models/AiUsage.js:3-12`), so the collection grows forever and cannot answer
"who is expensive".

### 1.4 The answer cache

`lib/aiAnswerCache.ts`. Key material (`:40-51`):

```
sha256( "v1" | version | book | chapter | normalizeQuestion(question) )
```

- `normalizeQuestion` (`:27-38`) folds case, collapses whitespace, strips
  trailing punctuation, keeps diacritics.
- Only cacheable when `historyLength === 0` and the normalised question is
  <= 300 chars (`:57-59`). So **first turns only**.
- TTL 365 days (`:10`), enforced by a Mongo TTL index
  (`models/AiAnswer.js:19`).
- Read is a `findOneAndUpdate` that also bumps `hits` (`:65-77`), so hit data
  already exists in production - it has just never been looked at.

**Three problems with the key, all of which cost money or quality:**

1. **`version` is in the key.** `public/data/manifest.json` lists 13 bible ids.
   The same question about Johannes 3 is cached separately per translation, so
   the traffic on any one key is divided by however many translations are in
   use. This is the single largest suppressor of the hit rate.
2. **The model is not in the key.** `AiAnswer.model` is stored
   (`models/AiAnswer.js:15`) but never keyed on. The moment Pro moves to Claude,
   Pro users keep being served the old Gemini answers for every cached first
   turn. This will silently cancel a large slice of the upgrade.
3. **The tier is not in the key.** Free and Pro share one cache. A free user
   whose question happens to hit a Pro-generated entry gets the Pro answer for
   free, and a Pro user can get a free-tier answer. Any tiering built on top of
   the current cache leaks in both directions.

Real hit rate is unknown from the repo. It is one aggregation away:

```js
db.aianswers.aggregate([
  { $group: { _id: null, entries: { $sum: 1 }, hits: { $sum: "$hits" } } }
])
// hit rate = hits / (hits + entries)
```

Structurally the cache should hit well on the canned starters. There are
**17 distinct starter strings**: 4 generic (`AiAssistant.tsx:40-45`) and 13
step-specific across 5 steps (`AiDock.tsx:11-36`). They are the empty state, one
tap away, and identical byte-for-byte for every user. Free-typed questions
essentially never repeat.

### 1.5 Failure and fallback

`lib/aiGemini.ts:44-64` classifies errors:

- 429 / `RESOURCE_EXHAUSTED` -> daily bucket spent, skip straight to the next
  model, no retry (`:141`).
- 503 / 500 / `UNAVAILABLE` / `INTERNAL` / "overloaded" / "high demand" ->
  transient. The **primary only** gets a second attempt after a 600 ms sleep
  (`:32`, `:132`, `:143`); fallbacks get one attempt each.
- Anything else is rethrown untouched (`:142`).
- Whole chain spent -> `AiBusyError` (`:67-72`) -> HTTP 429 with
  `code: "AI_BUSY"` and Dutch copy (`route.ts:205-213`), and the quota is
  refunded.
- Empty or safety-blocked candidate -> `BLOCKED_REPLY`, refunded, HTTP 200
  (`route.ts:218-226`).

Worst case is **7 model attempts plus one 600 ms sleep** in a single request.
`export const maxDuration = 60` exists precisely because of that, and says so
(`route.ts:23-30`).

### 1.6 Where the latency actually goes

Nothing here is a guess; it is all visible in the call path.

1. **No streaming anywhere.** Verified: no `ReadableStream`, no
   `text/event-stream`, no `generateContentStream` in any `.ts`/`.tsx` file in
   the repo. The route buffers the full answer and returns it as one JSON body
   (`route.ts:230-234`). A 200-word Dutch answer is therefore invisible until it
   is 100% complete.
2. **Four sequential IO hops before a single token is requested**, on every
   POST: `getServerSession` -> `connectMongoDB` -> `User.findOne` ->
   `AiUsage.findOneAndUpdate` -> `readCachedAnswer` (another round trip) ->
   `getChapter` (`route.ts:71-180`). None of them are parallelised, and
   `getChapter` is disk or fetch work.
3. **A blocking GET on mount.** `AiAssistant.tsx:139-157` fetches
   `/api/ai/chat` before the quota line can render; that GET does its own Mongo
   connect and user lookup (`route.ts:241-273`).
4. **The fallback chain.** Every 429 or 503 adds a full model round trip. On the
   free tier those are common, by design.

The client has an entire escalating-reassurance state machine to paper over this
(`AiAssistant.tsx:63-74`), with copy at 4 s, 10 s and 25 s. The 25-second stage
reads "Het kan nu druk zijn bij de AI-dienst." That comment block is an accurate
description of a product that does not stream.

**Perceived speed, not model quality, is most of the "feels bad".** A streamed
Sonnet 5 answer starts appearing in roughly a second. The current one appears
after the whole generation plus up to six fallback attempts.

### 1.7 Content rights - a live problem, before any provider change

`lib/mobileLicensing.ts` is the licensing gate and it is thorough. It blocks
`net` (NET Bible: "whole-text electronic distribution needs written permission
and cannot be bundled with anything sold"), `kingcomments_nl`, `hsv`,
`basisbijbel`, `schlachter`, `luther_1912`, `elberfelder_1905`, `afri`
(`:8-24`). `lib/proContent.ts` is the separate paywall gate.

The **mobile** AI route calls it before building the prompt:

```
app/api/v1/ai/chat/route.ts:132
    if (version) assertMobileAllowed('bible', version);
```

The **web** AI route does not. There is no equivalent line anywhere in
`app/api/ai/chat/route.ts`. It goes straight from the request's `version`
(`:104-107`) to `getChapter(version, book, chapter)` (`:173`) to
`buildSystemInstruction(...)` (`:197`), which embeds up to 8,000 characters of
that chapter into the system prompt (`lib/aiPrompt.ts:6`, `:55-57`).

`public/data/manifest.json` serves, among others: `net`, `nbg51`, `schlachter`,
`luther_1912`, `elberfelder_1905`.

**So today, a website user reading NET Bible or NBG51 causes up to 8 KB of
licensed text to be transmitted to Google's API on every uncached question.**
That is true of the current provider and would be equally true of any new one.
It is not a reason to prefer one vendor over another; it is a reason to stop
sending the text at all.

Related, for anything built later:

- **Never** put `kingcomments_nl` into a prompt. Licensed, and
  `lib/proContent.ts:44-48` treats it as always-free-to-read specifically
  because that is the licence basis - which is not permission to redistribute
  it to a third party.
- Matthew Henry, Dachsel and Meyer are public domain
  (`lib/mobileLicensing.ts:56-60`) and are safe to send.
- STEPBible grondtekst is CC BY 4.0 (`:64-71`). Sending it is fine; anything
  rendered from it must carry `STEPBIBLE_ATTRIBUTION`.

---

## 2. Recommended architecture

### 2.1 The jobs this app actually has

| Job | Where | Shape | Volume |
|---|---|---|---|
| A. Free-form chat about a passage | `/lezen` tab, `AiDock` | Long context (chapter), 100-300 word answer, 1-5 turns | Highest |
| B. Step-specific starter questions | `AiDock.tsx:11-36` | 17 fixed strings, first turn, no history | High, and perfectly repeatable |
| C. Topic gating ("is this about the Bible?") | Inside the system prompt, `lib/aiPrompt.ts:29` | Classification | Every request |
| D. Summarisation / commentary help | Not built | Long input, short output, not latency-critical | Zero today |

### 2.2 Model per job

| Job | Tier | Model | Config | Why |
|---|---|---|---|---|
| A | Free | `gemini-3.1-flash-lite` **on the paid tier** | as today | Cheapest verified option; the point of moving to paid is killing the quota chain, not quality |
| A | Pro | `claude-sonnet-5` | `thinking: {type:"adaptive"}`, `output_config: {effort: "low"}`, streaming, prompt caching on the system block | Best quality-per-euro for exposition of a known text |
| B | Both | Pre-generated offline via the **Batch API** on `claude-sonnet-5` (50% off) | no history, cached 365 days | Converts the highest-volume path into a one-off cost and an instant response |
| C | Both | **No separate call** | keep the instruction in the system prompt, add a cheap deny-list | See below |
| D | Pro, later | `claude-sonnet-5` via Batch API | overnight | Nobody is waiting |
| "Diepe duik" | Pro, metered | `claude-opus-5` at `effort: "medium"` | explicit button, own small cap | The visible "Pro is better" moment, bounded by design |

**Do not use `claude-opus-5` as the default Pro chat model.** It is 2.5x the
cost of Sonnet 5 for a task that is explaining a text the model already knows
well. Modelled in section 3.5: about USD 241/month at 250 subscribers instead of
USD 96. Affordable, but you would be paying it on every "wat betekent dit
hoofdstuk".

**Do not add a routing/classification call.** This is the place where "cheap
model for cheap jobs" is the *wrong* answer. A Haiku 4.5 classifier on a
60-character question costs about USD 0.0002, which is nothing - but it adds a
serial network round trip to a path whose main problem is already latency, and
the system prompt already handles off-topic refusal well (`lib/aiPrompt.ts:29`).
Cheap models earn their place on **offline, high-volume, non-interactive** work
(job D, and the batch pre-generation for job B), not in front of a user who is
waiting.

**Do not add a third provider.** OpenAI pricing was checked
(`gpt-5-mini` USD 0.25 / 2.00 per MTok, `gpt-5.5` USD 5.00 / 30.00, checked
2026-08-30 at developers.openai.com/api/docs/pricing) and is not compelling
enough to justify a third SDK, a third failure mode and a third data-processing
agreement.

### 2.3 The content-rights fix, which is also the best cache fix

**Build the AI's chapter context from one public-domain Dutch translation,
always, regardless of what the user is reading.**

Allowed sources for prompt context (public domain per
`lib/mobileLicensing.ts:32-46`): `statenvertaling`, `heilige_schrift_1917`,
`canisiusbijbel`, `kjv`, `asv`, `web`, `geneva`, `coverdale`. Recommend
`statenvertaling` as the single AI context source; it is complete, Dutch, and
already the default on the site.

Tell the model what the user is actually reading without shipping that text:

```
De gebruiker leest dit hoofdstuk in de NBG-vertaling 1951. De tekst hieronder
is de Statenvertaling; verwijs naar verzen op nummer, niet op formulering.
```

Three benefits from one change:

1. Licensed text (`net`, `nbg51`, `schlachter`) never leaves the server.
2. `version` drops out of the `AiAnswer` cache key, so all readers of a chapter
   share one entry instead of up to 13.
3. The Anthropic prompt-cache prefix becomes byte-identical across every user
   reading that chapter, so cross-user cache reads become possible rather than
   only intra-conversation ones.

Add `assertBibleAllowedForAi(version)` in `lib/aiPrompt.ts` (or reuse
`lib/mobileLicensing.ts` with a new `AI_ALLOWED_BIBLES` set) and call it from
**both** routes, so the gate cannot be forgotten again on one of them.

### 2.4 Cache key, corrected

```
sha256( "v2" | tier | model | book | chapter | normalizeQuestion(question) )
```

- `version` removed (context is now always the same translation).
- `tier` added, so free and Pro answers never leak across the paywall.
- `model` added, so a model swap invalidates naturally instead of silently
  serving stale answers to the people who paid.
- Bump `PROMPT_VERSION` to 2 (`lib/aiAnswerCache.ts:8`) in the same commit.

---

## 3. Cost model

### 3.1 Verified prices

**Anthropic** - checked 2026-08-30 at
`https://platform.claude.com/docs/en/about-claude/pricing` and
`https://platform.claude.com/docs/en/about-claude/models/overview`.
All per million tokens (MTok), USD.

| Model | Input | 5m cache write | 1h cache write | Cache read | Output | Context | Min cacheable prefix |
|---|---|---|---|---|---|---|---|
| `claude-opus-5` | 5.00 | 6.25 | 10.00 | 0.50 | 25.00 | 1M | 512 tok |
| `claude-sonnet-5` | 2.00 | 2.50 | 4.00 | 0.20 | 10.00 | 1M | 1,024 tok |
| `claude-haiku-4-5` | 1.00 | 1.25 | 2.00 | 0.10 | 5.00 | 200K | 4,096 tok |

- Batch API: **50% off both input and output**, and it stacks with caching.
- Sonnet 5's USD 2/10 is now the standard price; the increase to USD 3/15 that
  had been scheduled for 2026-09-01 was cancelled (stated on the pricing page).
- **Minimum cacheable prefix matters here.** This app's system block is about
  2,733 tokens, so it caches on Sonnet 5 (1,024) and Opus 5 (512) and
  **silently does not cache on Haiku 4.5** (4,096). No error, just
  `cache_creation_input_tokens: 0`.
- Tokenizer: Claude 4.7 and later (so Opus 5 and Sonnet 5) use a newer tokenizer
  that produces roughly **30% more tokens for the same text**. Haiku 4.5 uses
  the older one. This partly cancels Haiku's headline price advantage and is
  built into the assumptions below.

**Google Gemini** - checked 2026-08-30 at
`https://ai.google.dev/gemini-api/docs/pricing`. Per MTok, USD, paid tier.

| Model | Input | Output | Cache read |
|---|---|---|---|
| `gemini-3.7-flash` | 0.75 (to 2026-12-31; 1.50 after) | 3.75 (to 2026-12-31; 7.50 after) | 0.075 |
| `gemini-3.6-flash` | 0.75 (same schedule) | 3.75 (same schedule) | 0.075 |
| `gemini-3.5-flash` | 1.50 | 9.00 | 0.15 |
| `gemini-3.5-flash-lite` | 0.30 | 2.50 | 0.03 |
| `gemini-3.1-flash-lite` | 0.25 | 1.50 | 0.025-0.05 |

Note the **price step change on 2027-01-01**: `gemini-3.7-flash` (which
`gemini-flash-latest` currently resolves to, per `lib/aiGemini.ts:3-6`) doubles.
Anything built on the `-latest` alias will silently double in cost that day.

**OpenAI** - checked 2026-08-30 at
`https://developers.openai.com/api/docs/pricing`: `gpt-5-mini`
0.25 / 0.025 cached / 2.00; `gpt-5.5` 5.00 / 0.50 / 30.00. Listed for
completeness; not recommended.

### 3.2 Assumptions - change one number and re-read

Every figure downstream comes from this table.

| # | Assumption | Value | Source |
|---|---|---|---|
| A1 | Chars per token, Dutch, Opus 4.7+ tokenizer (Opus 5, Sonnet 5) | 2.3 | **Estimate. Not verified.** See 3.6 |
| A2 | Chars per token, Dutch, older tokenizer (Haiku 4.5, Gemini) | 3.0 | **Estimate. Not verified.** |
| A3 | System prompt base | 2,693 chars | **Measured**, `lib/aiPrompt.ts:8-32` |
| A4 | Reading-context header | 80 chars | Measured, `lib/aiPrompt.ts:52-54` |
| A5 | Chapter text after the 8,000-char cap | 3,513 chars mean | **Measured** over 1,255 Statenvertaling chapters on disk (raw mean 3,544; median 3,390; p90 6,025; only 2.9% exceed the cap) |
| A6 | User question | 60 chars | Estimate (measured starter mean is 40) |
| A7 | Visible answer | 1,350 chars (~200 Dutch words) | Derived from the 100-300 word target, `lib/aiPrompt.ts:24` |
| A8 | Thinking tokens per answer at `effort: "low"` | 260 | **Estimate. Not verified.** |
| A9 | Turns per conversation | 3 | Estimate |
| A10 | Share of messages served from `AiAnswer` | 10% | **Estimate.** Measurable today, see 1.4 |
| A11 | Messages/month: light / typical / heavy | 10 / 40 / 150 | Estimate |
| A12 | Subscriber mix: light / typical / heavy | 55% / 35% / 10% | Estimate |
| A13 | Free-tier messages/month across all free users | 20,000 | **Unknown.** See 3.6 |
| A14 | Net revenue per Pro user | EUR 5.90/month | From EUR 89,99/year (`lib/pricing.ts:33-38`) less 21% VAT and Stripe fees. Approximate |
| A15 | USD per EUR | 1.09 | **Not verified.** FX not checked |

### 3.3 Tokens per message, this app, on Sonnet 5

Using A1-A8:

| Component | Chars | Tokens |
|---|---:|---:|
| System prompt base | 2,693 | 1,171 |
| Reading-context header | 80 | 35 |
| Chapter text | 3,513 | 1,527 |
| **System block (the cacheable prefix)** | **6,286** | **2,733** |
| User question | 60 | 26 |
| Assistant answer (visible) | 1,350 | 587 |
| One prior exchange in history | 1,410 | 613 |
| **Output per message** (587 visible + 260 thinking) | | **850** |

Input by turn: T1 2,759, T2 3,372, T3 3,985.

### 3.4 Cost per message

**Without prompt caching:** T1 USD 0.01402, T2 USD 0.01524, T3 USD 0.01647.
Average **USD 0.01524**.

**With a cache breakpoint at the end of the system block** (5-minute TTL; turns
within a conversation are almost always under 5 minutes apart):

| Turn | Input | Output | Total |
|---|---|---|---|
| 1 | write 2,733 @ 2.50 = 0.006833; msgs 26 @ 2.00 = 0.000052 | 850 @ 10.00 = 0.008500 | **0.015385** |
| 2 | read 2,733 @ 0.20 = 0.000547; msgs 639 @ 2.00 = 0.001278 | 0.008500 | **0.010325** |
| 3 | read 2,733 @ 0.20 = 0.000547; msgs 1,252 @ 2.00 = 0.002504 | 0.008500 | **0.011551** |
| | | | **avg 0.012420** |

Caching saves **19%**. Applying A10 (10% of messages served free from
`AiAnswer`): **USD 0.01118 per message**.

**The important structural fact: output is 56-68% of the bill.** At USD 10/MTok
output versus USD 2/MTok input, and with the input largely cacheable at
USD 0.20/MTok, *answer length and thinking depth dominate the cost of this app*.
That is why the lever ranking in section 4 leads with output control, not with
caching.

### 3.5 Monthly bill

Per Pro user per month, at USD 0.01118/message:

| Usage level | Messages/month | Cost/user/month |
|---|---:|---:|
| Light | 10 | USD 0.11 |
| Typical | 40 | USD 0.45 |
| Heavy | 150 | USD 1.68 |

Blended at the A12 mix: **USD 0.386 per Pro subscriber per month**.

| Pro subscribers | Pro AI bill (USD) | Pro AI bill (EUR, A15) | Net revenue (A14) | AI as % of revenue |
|---:|---:|---:|---:|---:|
| 50 | 19.28 | 17.69 | EUR 295 | 6.0% |
| 250 | **96.41** | **88.45** | EUR 1,475 | **6.0%** |
| 1,000 | 385.65 | 353.81 | EUR 5,900 | 6.0% |

Free tier, if moved to paid `gemini-3.1-flash-lite` (A13 = 20,000 messages,
less 10% cache): 18,000 x USD 0.001429 = **USD 25.72/month**.

**All-in at 250 Pro subscribers: about USD 122/month (about EUR 112).**

Sensitivity - the three numbers most worth knowing:

| Scenario | Per message | Bill at 250 Pro |
|---|---:|---:|
| Recommended: Sonnet 5, `effort: "low"`, cached | 0.01118 | **USD 96** |
| Same, but shipped at Sonnet 5's **default `effort: "high"`** (thinking ~1,200 tok) | ~0.0206 | ~USD 160 |
| `claude-opus-5` as the default chat model | 0.02795 | ~USD 241 |
| `claude-haiku-4-5` for Pro (no caching - prefix too short) | 0.00435 | ~USD 38 |

Forgetting to set `effort` is a **1.7x** cost increase with no request-shape
change to notice it by. Set it explicitly and assert on it in a test.

### 3.6 Numbers I could not verify

1. **Chars per token for Dutch (A1, A2).** No `ANTHROPIC_API_KEY` and no `ant`
   profile in this environment, so `messages.count_tokens` could not be run.
   Everything in 3.3 scales linearly with these. **First action after getting a
   key:** run `count_tokens` (it is free) on three real assembled prompts and
   replace A1/A2. If A1 is really 2.0 rather than 2.3, every figure above rises
   about 15%.
2. **Thinking tokens at `effort: "low"` (A8).** Not documented as a number;
   measure `usage.output_tokens` minus visible length on the first 100 real
   answers.
3. **Free-tier message volume (A13)** and **`AiAnswer` hit rate (A10).** Both
   live in the production database, which is not reachable from here. Queries
   are given in 1.4 and 5.4.
4. **Gemini free-tier RPM/RPD.** `ai.google.dev/gemini-api/docs/rate-limits`
   no longer publishes per-tier numbers; it defers to the AI Studio dashboard.
   So the exact size of the quota the current fallback chain is farming cannot
   be stated. It does not affect the plan, which recommends leaving that tier.
5. **EUR/USD (A15)** and the exact VAT/Stripe deduction behind A14. Not checked.

---

## 4. Cost-reduction levers, ranked by saving per unit of effort

| # | Lever | Effort | Saving | Notes |
|---|---|---|---|---|
| 1 | **Set `effort: "low"` explicitly** on every Sonnet 5 call | 1 line | **~40%** vs the default | Output dominates (3.4). This is the highest-value line of code in the plan |
| 2 | **Prompt caching** on the system block, 5m TTL, breakpoint after the chapter text | ~10 lines | **19%** | Requires the system block to stay byte-stable. Verify with `usage.cache_read_input_tokens > 0` in an integration test |
| 3 | **Pin AI context to one public-domain translation** (2.3) | Small | Raises cache hits; removes the licensing exposure | Collapses up to 13 key variants into 1 |
| 4 | **Fix the `AiAnswer` key** (2.4) and pre-generate the 17 starters | Medium | Turns A10 from ~10% to ~30%: **USD 96 -> ~USD 75/month at 250** | See below |
| 5 | **Trim the chapter context** | Small | ~25% of input, ~9% of total | Chapter text is 1,527 of 2,733 system tokens. On the study flow the passage verse range is already known (`parseVerseRange`, `lib/studyFlow.ts:70-77`) - send the passage, not the whole chapter |
| 6 | **Cap output length** | 1 line of prompt | Linear in the cut | Lowering the 100-300 word target to 80-160 saves ~30% of output cost, but it directly reduces the thing Pro users are paying for. Last resort, not first |
| 7 | **Batch API for anything offline** | Medium | 50% | Only applies to pre-generation and job D. Never to live chat |
| 8 | Cheaper model for classification | Medium | ~0 | Rejected: see 2.2 |

**Lever 4, quantified.** 17 starter questions x 200 popular chapters = 3,400
answers. Pre-generated on Sonnet 5 through the Batch API (input 2,759 tok @
USD 1/MTok + output 850 tok @ USD 5/MTok = USD 0.00701 each): **USD 23.83
one-off.** Extending to all 1,189 chapters is 20,213 answers at **USD 142
one-off.** With a 365-day TTL that is a permanent conversion of the highest
volume, most latency-visible path into a database read. The recurring saving is
about USD 21/month at 250 subscribers, so payback is 1-7 months - but the real
argument is that **the study flow's most common interaction becomes instant**,
for free users too.

Levers explicitly **not** recommended:

- **1-hour cache TTL.** Write cost doubles (USD 4.00/MTok on Sonnet 5) and needs
  3+ reads to pay off. Conversation turns here are minutes apart, so the
  5-minute TTL refreshes itself for free.
- **Context editing / compaction.** Conversations here are capped at 10 history
  messages (`route.ts:35`) and never approach the context window.

---

## 5. Abuse and runaway-cost protection

### 5.1 The hole today

`PREMIUM_DAILY_CAP = 200` (`route.ts:33`). At USD 0.01118/message that is
**USD 2.24/day, USD 68/month, from one user paying EUR 7.50/month**. A single
scripted client is a 9x loss, and nothing in the system would notice.

Two smaller holes:

- `refund()` (`route.ts:132`) gives the count back on every failure. Attempts
  are therefore uncapped even though successful generations are not. Refund only
  when no tokens were consumed - `AiBusyError` yes, a completed-but-blocked
  generation no.
- The daily counter is a UTC calendar day (`route.ts:46-49`), so the cap is
  effectively 2x for anyone asking around midnight UTC.

### 5.2 Proposed Pro ceiling

A Pro tier still needs a ceiling; make it a **cost** ceiling, not a request
ceiling, so a cache hit is free and a long conversation costs what it costs.

| Tier | Daily | Monthly | Enforcement |
|---|---|---|---|
| Free | 5 messages (unchanged) | - | as today |
| Pro | 60 messages **or** USD 0.60 estimated, whichever first | 600 messages **or** USD 4.00 estimated | rolling 24 h and rolling 30 d |
| Pro "Diepe duik" (Opus 5) | 5 | 40 | separate counter |
| Admin | unlimited, but still recorded | | |

USD 4.00/month is about 60% of net revenue per user as a hard worst case, which
bounds the damage while sitting far above any genuine study habit (A11's heavy
user is 150 messages = USD 1.68).

Schema change on `AiUsage`: add `estimatedCents`, `model`, `tier`, and a TTL on
`createdAt` (400 days, matching `AnalyticsEvent`'s precedent at
`models/AnalyticsEvent.js:33`). Switch the key from `day` to a rolling window,
or keep `day` and sum the last 30 documents.

### 5.3 At the ceiling

Do not hard-refuse. Degrade to the free-tier model and say so, in Dutch:

> **Rustig aan met de AI-assistent**
> Je hebt vandaag veel vragen gesteld, meer dan een gewone studiedag. De
> assistent werkt gewoon door, maar tot morgen met het snelle basismodel in
> plaats van het uitgebreide Pro-model. Denk je dat dit niet klopt? Mail ons
> even.

(No em-dashes or en-dashes, per the house rule in `lib/aiPrompt.ts:26`.)

This keeps the product working, keeps the bill bounded, and avoids a support
ticket that starts with "ik betaal hiervoor".

### 5.4 Detecting one user burning the budget

Nothing today can answer this. Add:

1. **Record cost per call.** Write `usage.input_tokens`,
   `cache_read_input_tokens`, `cache_creation_input_tokens`, `output_tokens` and
   a computed `estimatedCents` onto the `AiUsage` document.
2. **A daily top-spenders query**, hooked to the existing cron
   (`vercel.json` already runs `/api/internal/reconcile-subscriptions` at 03:00):

```js
db.aiusages.aggregate([
  { $match: { day: { $gte: "2026-08-01" } } },
  { $group: { _id: "$userId", cents: { $sum: "$estimatedCents" }, msgs: { $sum: "$count" } } },
  { $sort: { cents: -1 } }, { $limit: 20 }
])
```

3. **Two alerts:** any user over USD 2.00 in a rolling 7 days, and total daily
   spend over 2x the trailing 7-day mean.
4. **A hard org-level backstop.** Set a spend limit in the Anthropic Console
   below the tier cap (Start tier's cap is USD 500/month; verified at
   `platform.claude.com/docs/en/api/rate-limits`). Note the failure mode: at the
   cap, requests return HTTP 429 with
   `error.details.error_code: "enforced_spend_limit_reached"` and **no
   `retry-after` header**, and SDK auto-retries will not help. Detect that code
   specifically and fall through to Gemini rather than showing `AI_BUSY`.

---

## 6. Perceived speed

Latency is most of the complaint and most of the fix is free.

| # | Change | Effect | Cost |
|---|---|---|---|
| 1 | **Stream the answer.** `client.messages.stream(...)`, SSE from the route, incremental render in `AiAssistant.tsx` | Time-to-first-token ~1 s instead of 6-25 s to full answer | Zero tokens |
| 2 | **Render the user's message and the assistant bubble instantly.** `AiAssistant.tsx:187` already appends the user turn optimistically; add an empty assistant bubble with a caret | Removes the "did that send?" gap | Zero |
| 3 | **Parallelise the pre-flight IO.** `Promise.all` the user lookup, the quota increment, the cache read and `getChapter` (`route.ts:109-180`) instead of awaiting four in series | Several hundred ms | Zero |
| 4 | **Fold the quota GET into the page payload.** `AiAssistant.tsx:139-157` currently blocks on its own round trip on mount | The composer renders immediately | Zero |
| 5 | **Shorten the fallback chain for Pro.** With paid Anthropic there is no per-model daily bucket to farm. One retry, then one Gemini fallback | Removes up to 5 wasted round trips from the worst case | Zero |
| 6 | **Keep the escalating copy** (`AiAssistant.tsx:63-74`) but retune it | With streaming, anything past 4 s means a real problem | Zero |
| 7 | Optional: `speed: "fast"` on Opus 5 for "Diepe duik" | Up to 2.5x output tok/s | 2x price (USD 10/50). Only worth it on the metered premium action |

**What to render first, in order:** the user's message (already local) ->
an assistant bubble with a caret -> the first streamed tokens -> the finished
markdown. Never a skeleton once streaming exists; a skeleton is what you show
when you have nothing, and with streaming you always have something within a
second.

One implementation warning: `export const maxDuration = 60` (`route.ts:30`)
exists because of the fallback chain. Streaming changes the failure shape - the
HTTP response starts immediately, so a mid-stream provider failure arrives after
the client has already rendered partial text. Handle a mid-stream error by
appending a Dutch note to the partial answer rather than replacing it, and do
not cache a partial answer.

---

## 7. Migration path

Each phase ships on its own and is useful on its own.

### Phase 0 - Streaming and latency (no provider change, no new cost)
Items 1-4 and 6 from section 6, against the existing Gemini path.
**Riskiest assumption:** that Vercel's Node runtime streams cleanly through the
current route setup with `maxDuration = 60`. Verify with one throwaway route
before touching `AiAssistant.tsx`.

### Phase 1 - Content rights and cache correctness
Add the AI licensing gate to **both** routes, pin context to
`statenvertaling`, rewrite the cache key (2.4), bump `PROMPT_VERSION` to 2.
**Riskiest assumption:** that users accept answers grounded in the
Statenvertaling while reading NBG51. Mitigate by naming it in the prompt (2.3)
and in a one-line UI note.

### Phase 2 - Pro on Claude, behind a flag
Add `@anthropic-ai/sdk`, a `lib/aiClaude.ts` mirroring `lib/aiGemini.ts`'s
interface, and route on `unlimited` (`route.ts:120`). Sonnet 5, adaptive
thinking, `effort: "low"`, streaming, caching on the system block. Ship to
admins first (`lib/adminEmails.ts`).
**Riskiest assumption:** that Sonnet 5 at `effort: "low"` is *noticeably* better
in Dutch on theological questions than Gemini Flash. Test it before committing:
30 real questions pulled from `AiAnswer`, blind side-by-side, judged by the
owner. If it is not clearly better, the tiering has no product to sell and the
plan should stop here.

### Phase 3 - Cost controls and visibility
Section 5 in full: token/cost recording on `AiUsage`, rolling windows, the
degrade-to-free-model ceiling with the Dutch copy, the daily top-spenders query,
the Console spend limit and the `enforced_spend_limit_reached` handler.
**Riskiest assumption:** that lowering 200/day to 60/day affects nobody. Verify
first: `db.aiusages.find({ count: { $gt: 60 } }).count()`.

### Phase 4 - Batch pre-generation
Generate the 17 starters against the top chapters via the Batch API, write
straight into `AiAnswer` with the Phase 1 key.
**Riskiest assumption:** that starter-button taps really are the dominant first
turn. Verify from `AiAnswer.hits` grouped by question before spending the
USD 24 - and note that the answer changes what to generate, not whether to.

### Phase 5 - "Diepe duik" (Opus 5), the visible Pro feature
An explicit button on the Verdieping step. Opus 5 at `effort: "medium"`,
optionally `speed: "fast"`, its own 5/day counter, its own Dutch copy.
**Riskiest assumption:** that a deeper answer converts or retains, rather than
just costing 2.5x. Ship it metered, measure with the existing
`AnalyticsEvent` pipeline (`lib/analytics.ts:73`), and be willing to remove it.

---

## 8. What could go wrong

| Risk | Signal | Fallback |
|---|---|---|
| **Anthropic rate limit (429)** | `retry-after` header present | Start tier is 1,000 RPM / 2M ITPM / 400k OTPM on Sonnet 5 - roughly 200x this app's needs at 250 subscribers. Not a realistic risk. Honour `retry-after`, then fall through to Gemini |
| **Anthropic spend cap hit** | 429 with `enforced_spend_limit_reached`, **no `retry-after`** | Different failure from a rate limit and SDK retries cannot clear it. Branch on the code, fall through to Gemini, alert the owner |
| **Anthropic outage** | 5xx after retries | Keep `lib/aiGemini.ts` wired as the Pro fallback. The existing `AiBusyError` shape already models "everything is down" |
| **Gemini price step on 2027-01-01** | `gemini-3.7-flash` doubles to 1.50/7.50 | Pin an explicit model id instead of `gemini-flash-latest` (`lib/aiGemini.ts:6`). An alias that silently reprices is a liability |
| **Cost spike from one user** | Section 5.4 alerts | Cost ceiling degrades that user to the free model; nobody is cut off |
| **Cost spike from a bug** (retry loop, cache miss regression) | Daily total > 2x trailing mean | The prompt cache regressing to 0% raises the bill 19% quietly and raises nothing else. Assert `cache_read_input_tokens > 0` in an integration test, not just at setup |
| **Quality regression after a model swap** | Cached Gemini answers served to Pro | Fixed structurally by putting `model` and `tier` in the cache key (2.4). Without that fix this **will** happen on day one of Phase 2 |
| **Streaming changes the failure shape** | Partial answer then an error | Append a Dutch note to the partial text, never replace it, never cache it |
| **Licensed text in a prompt** | No signal at all today | Phase 1's gate on both routes. Until then this is an open exposure on the website, independent of provider |
| **Safety filter refusals** | Empty candidate -> `BLOCKED_REPLY` | Already handled and refunded (`route.ts:218-226`). Claude's equivalent is `stop_reason: "refusal"` with a `stop_details.category`; check `stop_reason` before reading `content` |

---

## 9. Proposed Dutch copy

Collected here so it can be reviewed as copy rather than as code. House rule
from `lib/aiPrompt.ts:26` applies: no em-dash or en-dash anywhere.

**Pro upgrade, on the free limit prompt** (replaces the body at
`AiAssistant.tsx:381`):

> Je hebt je 5 gratis vragen voor vandaag gesteld. Met Pro krijg je een
> uitgebreidere AI-assistent die je hoofdstuk echt meeleest, sneller antwoordt
> en dieper op je vraag ingaat.

**Pro badge in the assistant header:**

> AI-assistent Pro

**Cost ceiling reached:** see 5.3.

**"Diepe duik" button (Phase 5):**

> Diepe duik
> Een uitgebreider antwoord met meer achtergrond, kruisverwijzingen en
> uitlegtradities. Je hebt er vandaag nog 3 van 5 over.

**Provider fallback, when Pro degrades to the free model:**

> De uitgebreide assistent is even niet bereikbaar. Je krijgt nu een antwoord
> van het snelle basismodel. Probeer het over een paar minuten opnieuw voor het
> volledige Pro-antwoord.

---

## 10. Answers to the five questions the owner will ask

**What does Pro actually get?** A different model (Sonnet 5 rather than Gemini
Flash-Lite), answers that stream instead of appearing after a wait, no daily
5-question wall, and a metered "Diepe duik" on Opus 5. Three of those four are
visible in the first five seconds of use.

**What does it cost?** About USD 96/month at 250 Pro subscribers, about
USD 122/month once the free tier moves to paid Gemini. Six percent of net
subscription revenue, flat as it scales.

**What if it is more than that?** The cost ceiling in section 5.2 bounds the
worst case at about USD 4.00 per Pro user per month, and the Console spend limit
bounds the org total. Both fail closed to the free model, not to an error.

**What is the cheapest thing that would help most?** Streaming. It costs no
tokens, needs no provider change, and addresses the largest part of the
complaint.

**What is the one thing that must not be skipped?** The cache key fix (2.4).
Without it, every cached first turn keeps serving Gemini answers to the people
who just started paying for Claude, and the upgrade looks like it did nothing.
