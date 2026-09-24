# Levensboom - generation spec

The contract between `lib/levensboom/*.ts` (web) and
`lib/features/levensboom/domain/*.dart` (app). Both implementations must
produce the *same tree* for the same inputs; the parity fixture
`tests/fixtures/levensboom-v2.json` (§8) is asserted by
`tests/levensboomGrowth.test.ts` and the app's `test/levensboom_parity_test.dart`.

This is growth v2 (`GROWTH_MODEL = 2`): the tree grows in 20 steps, one per
level, and matures after that. Why it is built this way:
`LEVENSBOOM_GROWTH_PLAN.md`. What the reader sees step by step, and the design
numbers: §10.

Nothing about the tree's *shape* is stored. The tree is a pure function of
values the server already has, the species the reader picked, and one stored
number, `levensboom.legacyXp`, from which a legacy account's head start is
derived (§11).

| web (`lib/levensboom/`) | app (`lib/features/levensboom/domain/`) | here |
|---|---|---|
| `rng.ts` | `rng.dart` | §3 |
| `growth.ts` | `growth.dart` (without `LEGACY_EQUIV`) | §1, §4, §11 |
| `generate.ts` | `tree_generator.dart` | §4 |
| `species.ts` | `species.dart` | §4.4 |
| `stages.ts` | `stages.dart` | §4.1 |
| `traits.ts` | `traits.dart` | §6 |
| `palette.ts`, `scenes.ts` | `palette.dart`, `scenes.dart` | §7 |
| `camera.ts` | `camera.dart` | §7.4 |
| `catalog.ts` | `catalog.dart` | §9 |
| `paint.ts` | `paint_spec.dart` | §10.6 |
| `tween.ts` | `tween.dart` | §12 |

Unqualified names below are `generate.ts` locals, `FormTable` fields of
`FORM_TABLES[form]`, or fields of `GEOMETRY` and `SEEDLING` in `growth.ts`;
`sp.*` is the species (§4.4). The `growth.ts` tables are design numbers and
change, so this document names them and states their role; their current
values are in the code (and, for the designer's reading, in §10). Formulas and
every constant written out here are the contract.

---

## 1. Inputs

| Name | Type | Source |
|---|---|---|
| `seed` | string | the user's Mongo id. Stable forever, per user. |
| `level` | int ≥ 1 | `levelForXp(xp)` from `lib/gamification.ts` |
| `frac` | 0..1 | `xpIntoLevel / xpForNextLevel` (`fracOf`); a public card cuts it to whole percents |
| `health` | 0.3..1 | §5, derived from `lastStreakDate`. The generator clamps to 0..1, default 1 |
| `species` | `eik \| olijf \| vijg \| palm \| amandel \| ceder \| mosterd \| appel \| granaatappel \| sycomoor \| wilg \| acacia \| cipres` | `User.levensboom.species`, after the unlock check (§9); anything else reads as `eik` |
| `floor` | `{ from, to }` or null | `growth.floor` from the API (§11); null for an account without a head start |
| `at` | `{ position, step? }` or null | the Groei ladder and the design tooling only: draw the tree at this position |
| `season` | `spring \| summer \| autumn \| winter` | device month |
| `timeOfDay` | `dawn \| day \| dusk \| night` | device clock |
| `scene` | §7.2 id | `User.levensboom.scene`, after the unlock check |
| `animal` | §9 id | `User.levensboom.animal`, after the unlock check |

The first seven reach the generator. `season`, `timeOfDay`, `scene` and
`animal` affect **palette and render-only layers** - never geometry. That
keeps the parity fixture independent of the clock and of the studio.

Three numbers say where a tree stands (`growth.ts`):

```
r = max(1, floor(level)) + clamp(frac, 0, 1)                  # raw position; a non-finite frac counts as 0
e = taper(r, floor)                                            # position (§11); e = r without a floor
k = max(1, floor(taper(max(1, floor(level)), floor) + 1e-9))   # step (structuralStep)
```

- `k` decides the **topology**: which branches and leaves exist. It changes
  only at a level-up; with a floor two levels can share a step, and a level-up
  never skips one.
- `e` decides the **continuous size**: lengths, widths, leaf size, the camera.
- `frac` also opens buds (§4.11). Neither `frac` nor `e` may change which
  branches and leaves exist, or how many values any stream yields: they only
  feed arithmetic (tested).
- Steps 1 to `STEPS_TOTAL = 20` are the named growth. `rings = max(0, k − 20)`
  counts the maturing steps (jaarringen).

With `at`: `e = max(1, at.position)`, `k = max(1, floor(at.step ?? e + 1e-9))`.
Traits, the fruit count and the blossom trait still follow `level`.

A level-gated feature arrives at `stepOfLevel(L) = min(k, at ? L :
structuralStep(L, floor))`: the twin (§4.9) and each fruit (§4.11) are anchored
to the step their level reached, which with a floor is later than `L`.

## 2. Coordinate space

A 100×100 box, `y` downwards, `y = 0` at the top of the sky.

- ground line: `GROUND_Y = 88`
- trunk base: `(TRUNK_X, GROUND_Y) = (50, 88)`
- angles in **degrees**, `-90` = straight up, `+90` = straight down. `cos` and
  `sin` take `angle · DEG`, with `DEG = π / 180` computed once.

Renderers frame the tree's own `bounds` (§4.12) with the camera (§7.4);
nothing in the generator knows about pixels.

## 3. Deterministic randomness

**Every** random choice comes from a seeded stream. No unseeded RNG anywhere,
or the two platforms drift and a user's tree changes between devices.

```
fnv1a32(s):
  h = 0x811c9dc5
  for c in s.codeUnits:
    h = u32(h XOR c)
    h = u32(h * 0x01000193)
  return h

mulberry32(state):            # returns the next double in [0, 1)
  state = u32(state + 0x6D2B79F5)
  t = state
  t = u32( u32(t XOR (t >>> 15)) * u32(t OR 1) )
  t = u32( t XOR u32( t + u32( u32(t XOR (t >>> 7)) * u32(t OR 61) ) ) )
  return u32(t XOR (t >>> 14)) / 4294967296
```

`u32(v) = v & 0xFFFFFFFF`, all multiplies wrap to 32 bits (JS: `Math.imul`,
Dart: mask the 64-bit product). `seededRng(s) = mulberry32(fnv1a32(s))`.

### 3.1 One stream per node

The tree draws from one stream **per node**, keyed by its path:

```
nodeRng(seed, path) = mulberry32(fnv1a32(seed + "|" + path))
```

Adding a branch, a leaf or a whole subtree can never shift another node's
numbers; that is what lets the tree grow instead of being redrawn at every
level-up. Paths are plain ASCII, so both platforms hash the same code units.

| path | node |
|---|---|
| `T` | the trunk (a palm's first trunk segment) |
| `<P>0`, `<P>1`, `<P>2` | the child of `<P>` in slot 0 (left), 1 (right) or 2 (middle: the third child; on a conical spine the leader). `T01`, `T012`, … |
| `T2`, `T22`, … | a palm's further trunk segments |
| `W`, `W0`, `W12`, … | the twin trunk and its subtree (a twin palm: `W`, `W2`, `W22`, …) |
| `<P>L<i>` | leaf `i` of node `<P>`'s tuft |
| `C<i>` | seed leaf (cotyledon) `i` |
| `S<j>L<i>` | leaf `i` of seedling whorl `j` (1-based) |
| `PF<i>`, `WF<i>` | palm frond `i`, twin palm frond `i` |

A node always takes `DRAWS = 10` values and a leaf `LEAF_DRAWS = 5`, whether
it uses them or not:

| slot | node vector | role |
|---|---|---|
| 0 | curve | the node's own bend (§4.5; a palm segment's too) |
| 1 | spread | the fan the node opens for its children |
| 2 | thirdU | whether, and from when, its slot-2 child exists (§4.3) |
| 3, 4, 5 | jitter | the angle jitter of its child in slot 0, 1, 2 |
| 6 | lenJitter | its own length, `× (0.9 + 0.2 · u)` |
| 7 | birthJitter | its own birth delay. The trunk `T` has no birth to jitter: its slot 7 is the **lean**. The twin root `W` is born on a fixed step: its slot 7 is its **side** |
| 8 | twigU | whether, and from when, its children at twig depth exist (maturing, §4.3). Was reserve |
| 9 | reserve | unused |

Leaf vector: `0 angle · 1 distance · 2 size · 3 phase · 4 hardiness`. A tip
leaf uses all five. A seed leaf uses only 3 and 4 (its angle, distance and
size are fixed). A whorl leaf and a palm frond use 0 (angle jitter), 2 (size
jitter), 3 and 4.

Two rankings hash instead of drawing: blossom `fnv1a32(seed + "|B|" +
leafPath)` and fruit `fnv1a32(seed + "|F|" + nodePath)` (§4.11).

**Portability.** Topology - which nodes and leaves exist - depends only on the
step, integers, table literals and per-node draws, combined by plain
arithmetic; never on a `cos`, `sin` or `pow` result. Both platforms then agree
on what exists to the last leaf, and a last-ulp difference in trig can only
move geometry, which the fixture rounds away (§8). Every `round` in topology
takes a positive argument, where JS (half up) and Dart (half away from zero)
agree; paths compare by code unit.

### 3.2 Renderer streams

Renderers own three more streams, never read by the generator:
`"<seed>:decor"` (motes, stars, drifters, fireflies, butterflies, bees, the
eagle's phase), `"<seed>:scene"` (backdrop details, then where the ground
animals stand: sheep, deer, fox, donkey, stork, lion, then the waiting bird's
side, distance and stone, in that order) and `"<seed>:mature"` (bark knots,
moss, root flare; §10.6). New decor is only ever appended to the end of its
stream, so older decor never moves.

The v1 single stream (`seededRng(seed)`, drawn in traversal order) survives
only in `lib/levensboom/v1/generateV1.ts`, for the calibration (§11).

## 4. Geometry

### 4.1 Phases

The named phases are bands of **steps** (`lib/levensboom/stages.ts`,
`domain/stages.dart`), served as `growth.phase` and, in the v1 shape, as
`stage` (§11). The ids are the v1 stage ids, so nothing that stores or
compares them breaks.

| id | name | steps |
|---|---|---|
| `kiem` | Kiem | 1-2 |
| `zaailing` | Scheut | 3-6 |
| `jonge_boom` | Jonge boom | 7-12 |
| `volwassen_boom` | Volwassen boom | 13-20 |
| `eeuwenoude_boom` | Eeuwenoude boom | 21+ |

`phaseForStep(k)` takes the step, not the level: with a floor the step runs
ahead of the level. Step 1 is the kiem: the trunk `T` alone, a green stem, with
its seed leaves (a palm: a stub and two fronds, §4.8).

### 4.2 Order of work and caps

```
tD     = draws("T")
lean   = (tD[7] · 2 − 1) · GEOMETRY.lean · sp.leanMul        # degrees, applied to the trunk
angle0 = −90 + lean
size   = sizeAt(form, e)                                     # §4.5
droopT = (1 − health) · 0.25

1. main tree - palm: growPalm("T", 50, angle0, 1, 1, 1)                        (§4.8)
               else: node T at (50, 88), heading angle0, born 1, depth 0;
                     growBranching(T) (§4.3-§4.6, §4.10), then growSeedling(T) (§4.7)
2. level ≥ 16 (trait twin): the twin                                           (§4.9)
3. open and visible, blossom, fruit, perch                                     (§4.11)
4. bounds                                                                      (§4.12)
```

`growBranching(root)` places the root, then walks a queue breadth-first: for
each node in queue order, its child slots in ascending order (a child that
exists is placed at once and appended to the queue), then the node's own tuft
(§4.10). So `branches` runs parent before child, depth by depth, siblings by
slot. `leaves` holds the main tree's tufts in that order, then the seed leaves,
then the whorls, then the twin's tufts; a palm emits its fronds after its
segments.

`MAX_BRANCHES = 900` is checked before each child slot and each palm segment,
`MAX_LEAVES = 1400` before each leaf. They are safety nets: the growth table
keeps every species, seed and step up to 60 under 80 % of both (tested). If one
ever binds, breadth-first order cuts the newest, outermost wood and never old
wood, and since every node has its own stream a cut cannot shift another node.

The scene carries `model` (2), `branches`, `leaves`, `blossoms`, `fruits`,
`perch`, `bounds`, `traits` (`traitsForLevel(level)`), `growth` (= `size`),
`maxDepth` (the deepest emitted branch depth), `level`, `frac`, `health`,
`species`, `form`, `position` (`e`), `step` (`k`), `phase`, `rings` and
`floor`. Every branch carries `path`, `birth` (its step) and `wood`; every leaf
`path`, `birth`, `kind` (`leaf`, `cotyledon`, `seedling`, `frond`) and `fade`.

### 4.3 Births: what exists

A node exists from its birth step `appear` on and never disappears. For the
child in `slot` of node `P`, with `childRel = P.rel + 1` its depth inside its
own trunk (the twin counts from 0 again):

```
spine  = form == conical and P.leader
slots  = spine ? [0, 1, 2] : (P.depth == 0 or P.twig) ? [0, 1] : [0, 1, 2]
chance = slot == 2 and not spine                            # the third, middle child
twig   = false
if P.tier >= 0:                                             # inside a conical tier, §4.6
    t = P.tier + 1
    skip if t > (P.tierBirth <= tierDeepUntil ? len(tierFork) : min(1, len(tierFork)))
    base = P.tierBirth + tierFork[t − 1];  spreadSteps = tierForkSpread
else if main tree:
    skip if childRel > len(birth)
    twig = childRel == len(birth);  skip if twig and form != branching
    base = twig ? twigFrom : birth[childRel];  spreadSteps = twig ? 1 : birthSpread[childRel]
else:                                                       # the twin, §4.9
    skip if childRel > twinMaxDepth + 1
    twig = childRel == twinMaxDepth + 1;  skip if twig and form != branching
    base = twig ? twigFrom : twinStep + childRel · twinDepthSteps
    spreadSteps = twig ? 1 : twinBirthSpread
delay  = chance ? thirdDelay : 0
skip if base + delay > k
c      = draws(P.path + slot)
appear = max(P.appear + childDelay, base + delay + floor(c[7] · spreadSteps))
if twig:   while appear <= k and not (P.d[8] < twigChanceAt(form, appear)): appear += 1
if chance: while appear <= k and not (P.d[2] < thirdChanceAt(form, appear) + sp.thirdChildBias): appear += 1
exists = appear <= k
```

```
thirdChanceAt(form, s) = thirdChance[clamp(floor(s), 1, n) − 1]
twigChanceAt(form, s)  = s < twigFrom ? 0 : twigChance[min(n − 1, floor(s) − twigFrom)]
```

- Both chance tables must be non-decreasing, so a node's `appear` is the same
  at every `k ≥ appear`: once it exists it keeps existing, with the same birth.
  Only seed leaves, whorls and a forked node's surplus leaves are temporary
  (§4.7, §4.10).
- `childDelay` makes a late limb grow out one depth per step instead of
  popping in whole.
- The trunk `T` forks in two (the house-style Y). A third child takes the
  middle slot, so its siblings never re-fan.
- **Twigs** are the maturing fork one depth past `birth` (branching form
  only). The parent's `twigU` (slot 8) decides, against `twigChance` from
  `twigFrom` on; every child at twig depth shares that draw, so a tip forks
  into twigs at one step. A twig carries a smaller tuft (§4.10) and never
  forks: it sits at the last allowed depth, so the `P.twig` case above never
  has children to cut. A fork *into* twigs uses the ordinary slots, and its
  slot 2 appears where the parent's third-child draw passes as well.

### 4.4 Species parameters

`lib/levensboom/species.ts`, `domain/species.dart`. A species never adds a draw
of its own: every number scales or biases a value the node vectors already
hold, so the same seed keeps "the same tree" across species. The `eik` row is
`BRANCHING_DEFAULTS`, the v1 generator's constants. Renderer-only columns
(leaf/fruit shape, colours, evergreen) are in the code and not repeated here.

| id | form | trunkLen | trunkW | spread | jitter | curve | childLen | childW | third | lean | droop | leafCount | leafSize | blossom |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `eik` | branching | 1 | 1 | 26 | 14 | 10 | 0.74 | 0.68 | 0 | 1 | 0 | 1 | 1 | seasonal |
| `olijf` | branching | 0.8 | 1.3 | 36 | 16 | 18 | 0.70 | 0.70 | 0.06 | 1.4 | 0 | 1.15 | 0.85 | seasonal |
| `vijg` | branching | 0.75 | 1.3 | 40 | 12 | 12 | 0.72 | 0.75 | 0.12 | 1 | 0 | 0.55 | 1.35 | never |
| `palm` | palm | 1.45 | 0.9 | – | – | 6 | – | – | – | 1.2 | – | – | 1 | never |
| `amandel` | branching | 1.05 | 0.85 | 22 | 10 | 8 | 0.76 | 0.66 | 0.05 | 0.8 | 0 | 0.9 | 0.9 | always |
| `ceder` | conical | 0.5 | 1.1 | 30 | 8 | 5 | 0.68 | 0.70 | 0.20 | 0.5 | 0 | 1.6 | 1.15 | never |
| `mosterd` | branching | 0.85 | 0.8 | 34 | 16 | 14 | 0.72 | 0.62 | 0.06 | 1.1 | 0 | 1.05 | 0.6 | always |
| `appel` | branching | 0.9 | 1.05 | 32 | 12 | 10 | 0.72 | 0.68 | 0.06 | 0.9 | 0 | 1.05 | 0.95 | seasonal |
| `granaatappel` | branching | 0.7 | 1 | 38 | 14 | 14 | 0.70 | 0.66 | 0.06 | 1 | 0 | 1.2 | 0.75 | seasonal |
| `sycomoor` | branching | 0.7 | 1.6 | 46 | 12 | 12 | 0.70 | 0.74 | 0.12 | 1 | 0 | 0.75 | 1.2 | never |
| `wilg` | branching | 1 | 1.15 | 30 | 14 | 12 | 0.80 | 0.60 | 0.06 | 1.2 | 0.5 | 1.2 | 0.9 | never |
| `acacia` | branching | 1.25 | 0.9 | 50 | 10 | 6 | 0.60 | 0.62 | 0.06 | 1.3 | 0 | 1.2 | 0.7 | seasonal |
| `cipres` | conical | 0.42 | 0.8 | 12 | 6 | 3 | 0.60 | 0.70 | 0.20 | 0.3 | 0 | 1.5 | 1.0 | never |

- `trunkLen`, `trunkW` - `trunkLenMul`, `trunkWidthMul` (§4.5).
- `spread`, `jitter` - `spreadBase`, `spreadJitter`: the fan a node opens, in degrees.
- `curve` - `curveAmp`: degrees a branch may bend along its length.
- `childLen` - `childLenRatio`: a branching child's length share, and a
  conical tier root's (§4.6). `childW` - `childWidthRatio`: a branching
  child's width share, and `w1 / w0` of every branching and conical branch.
- `third` - `thirdChildBias`, added to the third-child chance (§4.3).
- `lean` - `leanMul`, times the trunk's seeded lean.
- `droop` - `droopBase`: how far a perfectly healthy tree's tips already hang
  toward straight down (the treurwilg); it adds to the wilt droop (§4.5).
- `leafCount` - `leafCountMul`, weighted by `leafMulWeight` (§4.10).
  `leafSize` - `leafSizeMul`: tip leaves, seed leaves, whorls, fronds, fruit.
- `blossom` - `seasonal` grows blossom from level 5 (the `blossom` trait),
  `always` at every level, `never` not at all (§4.11). Renderers draw it only
  when the palette has a blossom colour (spring and summer).

`palm` reads only `trunkLen`, `trunkW`, `curve`, `lean` and `leafSize`;
`conical` reads every column. The growth v2 changes to these values, with
their reasons, are in §10.4.

### 4.5 Size, placement and angles

```
smoothstep(t) = t · t · (3 − 2t)
curveWithTail(table, e, max, half):                  # index = step − 1, n = len(table)
    p = max(1, e)
    if p >= n: top = table[n − 1]; past = p − n; return top + (max − top) · past / (past + half)
    i = floor(p); return table[i − 1] + (table[i] − table[i − 1]) · (p − i)
sizeAt(form, e)     = curveWithTail(size,  e, sizeMax, sizeMatureHalf)
widthAt(form, e)    = curveWithTail(width, e, sizeMax, sizeMatureHalf)
girthAt(e)          = 1 + matureGirth · clamp(e − 20, 0, matureGirthSteps)
sizeAtStep(form, k) = size[min(k, n) − 1]            # the only size topology reads (§4.11)
ramp(e, birth)      = minBud + (1 − minBud) · smoothstep(clamp((e − birth) / rampSteps, 0, 1))

trunkLen(p, u) = (trunkLenBase + trunkLenGrow · sizeAt(form, p)) · sp.trunkLenMul · (0.9 + 0.2 · u)
trunkWidth     = (trunkWidthBase + trunkWidthGrow · widthAt(form, e)) · sp.trunkWidthMul · girthAt(e)
```

New wood appears at `minBud` of its length at its birth step and elongates
over `rampSteps`: the crown grows with every XP. `size`, `width`, the tail,
`girthAt` and `ramp` never decrease in `e`, so no wood ever shrinks.

The trunk `T`: `baseLen = trunkLen(e, T.d[6])`, `baseWidth = trunkWidth`,
grown by 1 (no ramp: it exists from step 1, and the size curve is its growth).

An ordinary child (the branching form, and the twin in that form):

```
spread    = sp.spreadBase + P.d[1] · sp.spreadJitter
jitter    = (P.d[3 + slot] · 2 − 1) · slotJitter
raw       = P.endAngle + SLOT_OFFSET[slot] · spread + jitter        # SLOT_OFFSET = [−1, +1, 0]
baseLen   = P.baseLen · sp.childLenRatio · (0.9 + 0.2 · c[6])
baseWidth = P.baseWidth · sp.childWidthRatio
droop     = min(1, (droopT + sp.droopBase) · (P.depth + 1) / droopDepth)
angle     = raw + (90 − raw) · droop                                # toward straight down
(x0, y0)  = (P.x1, P.y1)
```

Every node is then placed at the current position:

```
curve    = (d[0] · 2 − 1) · sp.curveAmp              # a palm segment adds its lean, §4.8
endAngle = angle + curve;   mid = angle + curve / 2
len      = baseLen · grow;  w = baseWidth · grow
(x1, y1) = (x0, y0) + len · (cos endAngle, sin endAngle)
(cx, cy) = (x0, y0) + len / 2 · (cos mid, sin mid)
Branch { x0, y0, cx, cy, x1, y1, w0: w, w1: w · w1Ratio, depth, path, birth: appear, wood }
```

`grow` is `ramp(e, appear)` for every node but the main trunk (1) and the
palm's first segment (§4.8). `w1Ratio` is `sp.childWidthRatio` for branching
and conical wood, 0.9 for palm segments.

`wood` (0 = green stem, 1 = bark): the main trunk - `T`, and every segment of
the main palm - turns from `woodStart`, `clamp((e − woodStart) / woodSteps, 0,
1)`; all other wood from `woodDelay` after its birth, `clamp((e − appear −
woodDelay) / woodSteps, 0, 1)`.

**Angles are fixed per path.** A node's `angle` and `endAngle` depend only on
its ancestors' `endAngle`, its draws, `droopT` and the species - never on `e` -
so at a given health a branch never turns. Its start rides its parent's growing
tip, and `baseLen` chains through the parents' `baseLen`, not their ramped
`len`. Health turns wood through `droopT`; nothing else does.

### 4.6 Conical form: spine and tiers

The trunk `T` is the first segment of a spine. A spine node is a leader and
grows all three slots on schedule, none by chance. With `spread` and `jitter`
as in §4.5 and `R` the root of this trunk (`T`, or `W` for the twin):

```
slot 2, the next segment (leader):
    raw       = P.endAngle + jitter · leaderJitter
    baseLen   = P.baseLen · leaderLen · (0.9 + 0.2 · c[6])
    baseWidth = P.baseWidth · leaderWidth
slots 0 and 1, a tier root (tier = 0, tierBirth = appear):
    raw       = P.endAngle + SLOT_OFFSET[slot] · spread · tierAngle + jitter
    baseLen   = R.baseLen · sp.childLenRatio · tierLen · (1 − tierTaper · min(1, P.rel / conicalDepth)) · (0.9 + 0.2 · c[6])
    baseWidth = P.baseWidth · tierWidth
a tier node's children (tier = P.tier + 1, tierBirth = P.tierBirth; slot 2 by chance):
    raw       = P.endAngle + SLOT_OFFSET[slot] · spread · tierChildSpread + jitter · tierChildJitter
    baseLen   = P.baseLen · tierChildLen · (0.9 + 0.2 · c[6])
    baseWidth = P.baseWidth · tierChildWidth
```

Droop and placement are as in §4.5. In the main tree the segments and their
tier roots follow the leader schedule `birth[childRel]` (`birthSpread` is 0 for
this form), so segment `d` and the tier at its foot arrive together. A tier
forks on its own clock from `tierBirth` (§4.3): as deep as `tierFork` when it
was born at or before `tierDeepUntil`, once after that, so the top stays
pointed. The form grows no twigs, so the spine is at most `len(birth)`
segments long, `T` included.

### 4.7 Seedling: seed leaves and whorls

Branching and conical forms; a palm has neither. `along(T, t)` is the point on
the placed trunk's quadratic curve at `u = clamp(t, 0, 1)`, with heading
`T.angle + (T.endAngle − T.angle) · u`.

```
fadeAt(e, death, steps, min) = min + (1 − min) · clamp((death − e) / steps, 0, 1)
fadeShare(shrink, min)       = clamp((shrink − min) / (1 − min), 0, 1)
```

**Seed leaves** exist while `k < cotyledonDeath`. They sit where the step-1
stem ended, `along(T, trunkLen(1, T.d[6]) / T.len)`, and stay at that height as
the stem grows past them. For `i` in `0 .. cotyledons − 1` (path `C<i>`, birth
1, depth 0):

```
off    = cotyledons == 2 ? (i == 0 ? −cotyledonAngle : +cotyledonAngle)
                         : −cotyledonFan + 2 · cotyledonFan · i / (cotyledons − 1)
a      = heading + off
shrink = fadeAt(e, cotyledonDeath, cotyledonFadeSteps, cotyledonFadeMin)
Leaf { anchor + cotyledonDistance · (cos a, sin a), angle: a,
       size: cotyledonSize · sp.leafSizeMul · shrink, phase: v[3], hardiness: v[4],
       kind: cotyledon, fade: fadeShare(shrink, cotyledonFadeMin) }
```

**Whorls.** Whorl `j` (1-based; `seedlingPairs` of them, `pairLeaves` leaves
each) is born at step `j + 1` and gone from `death = pairDeath − (seedlingPairs
− j)` on, so the lowest falls first. It sits where the stem's top was at its
birth, `along(T, pairHeight · trunkLen(j + 1, T.d[6]) / T.len)`, and stays
there. For leaf `i` (path `S<j>L<i>`, birth `j + 1`, depth 0):

```
shrink = fadeAt(e, death, pairFadeSteps, pairFadeMin);   grow = ramp(e, j + 1) · shrink
fan    = pairLeaves < 2 ? 0 : 2i / (pairLeaves − 1) − 1
a      = heading + fan · pairAngle + (v[0] · 2 − 1) · pairAngleJitter
Leaf { anchor + pairDistance · grow · (cos a, sin a), angle: a,
       size: (pairSize + v[2] · pairSizeJitter) · sp.leafSizeMul · grow,
       phase: v[3], hardiness: v[4], kind: seedling, fade: fadeShare(shrink, pairFadeMin) }
```

Both shrink over their last positions before they fall. `fade` (1 fresh, 0
about to fall; 1 on every other leaf) lets a renderer fade them with it
(§10.6a); a renderer also yellows seed leaves (§10.6).

### 4.8 Palm

`growPalm(prefix, x0, angle0, lenShare, widthShare, firstStep)`, the main palm
`("T", 50, angle0, 1, 1, 1)`, the twin §4.9:

```
for i in 0 .. len(palmSegments) − 1:
    stop if len(branches) >= MAX_BRANCHES
    appear = prefix == "T" ? palmSegments[i] : firstStep + i;   stop if appear > k
    path   = prefix followed by i times "2"                       # T, T2, T22 … / W, W2 …
    d      = draws(path)
    grow   = main and i == 0 ? palmEmergeMin + (1 − palmEmergeMin) · clamp((e − 1) / palmEmergeSteps, 0, 1)
                             : ramp(e, appear)
    baseLen   = trunkLen(e, tD[6]) / len(palmSegments) · lenShare
    baseWidth = trunkWidth · widthShare · 0.9 · … · 0.9          # i factors, multiplied out (not pow)
    start at the previous segment's (x1, y1) and endAngle; segment 0 at (x0, 88), heading angle0
    curve  = (d[0] · 2 − 1) · sp.curveAmp + (angle0 + 90) · 0.35  # bends on in its own lean
    place with w1Ratio 0.9, depth (main 0, twin 1) + i
```

The crown establishes first: the first segment is a stub until it has
emerged, `palmEmergeSteps` after step 1, and the trunk rises later. Fronds hang
from the top segment `top`:

```
palmFronds(s) = palmFronds[clamp(floor(s), 1, n) − 1] + bonusLeaves(palm, s)
count = main ? palmFronds(k) : max(2, round(palmFronds(k) · 0.6))
frond i (path PF<i>, twin WF<i>):
    born  = the first step from (main 1, twin firstStep) whose count exceeds i, at most k
    a     = angle0 + PALM_FROND_FAN[i mod len] · 95 + (v[0] · 2 − 1) · 8
    a    += (90 − a) · droopT · 0.6                               # wilt lets the fronds hang
    fsize = (2.2 + 2.6 · size) · (0.85 + v[2] · 0.3) · sp.leafSizeMul · ramp(e, born) · sqrt(lenShare)
    Leaf { top.(x1, y1) + 0.3 · fsize · (cos a, sin a), angle: a, size: fsize,
           phase: v[3], hardiness: v[4], depth: top.depth, kind: frond }
```

`PALM_FROND_FAN` is a fixed order of slots in −1..1, so a new frond fills a gap
and the fronds already there never re-fan. The fan opens around the base
heading `angle0`, not the top segment's. Fronds are ordinary leaves with a
large `size`; the renderer draws the blade.

### 4.9 Twin trunk

From level 16 (trait `twin`): `twinStep = stepOfLevel(16)`, `w = draws("W")`,
`side = w[7] < 0.5 ? −1 : +1`, base `(50 + side · twinOffset, 88)`, heading
`−90 + lean + side · twinAngle`.

- Palm: `growPalm("W", …, twinLen, twinWidth, twinStep)`: a segment per step
  from `twinStep`, fronds at 0.6 of the main count.
- Branching and conical: root `W` (depth 1, `rel` 0, a leader, born
  `twinStep`), `baseLen = trunkLen(e, tD[6]) · twinLen` (the main trunk's length
  jitter), `baseWidth = trunkWidth · twinWidth`, grown by `ramp(e, twinStep)`.
  Its subtree follows the twin rule of §4.3 down to `twinMaxDepth`, then twigs
  (branching form); in the conical form `W` is a spine with tiers sized to `W`
  (§4.6).

The twin sprouts at its step and grows in. Its wood follows the non-trunk rule
of §4.5; fruit and the perch ignore it.

### 4.10 Leaves on a tip

After its child slots every node except `T` gets a tuft; a leader (a conical
spine segment, the twin root) only while it has no child yet:

```
firstChild = the smallest appear among the node's children that exist (∞ if none)
full  = firstChild > k or k < firstChild + innerKeep
tuft  = leavesPerTip(form, k, sp.leafCountMul, node.twig)
count = full ? tuft
      : not leader and innerMinDepth <= depth <= innerMaxDepth ? min(innerLeaves, tuft)
      : 0
leavesPerTip(form, s, mul, twig) =
    max(2, round(leavesPerTip[clamp(floor(s), 1, n) − 1] · (1 + (mul − 1) · leafMulWeight))
           − (twig ? twigLeafDrop : 0)) + bonusLeaves(form, s)
bonusLeaves(form, s) = the number of leafBonusAt entries <= s
```

A forked node keeps its full tuft for `innerKeep` steps, then its first
`innerLeaves` leaves for good (the foliage inside the crown) and the rest fall;
the leaves that stay are the oldest. Leaves kept this way are *inner* and never
carry blossom. Leaf `i` (path `<node>L<i>`):

```
born = the first step from node.appear whose leavesPerTip exceeds i, at most k
grow = ramp(e, born)
a    = node.endAngle + (v[0] · 2 − 1) · 70
dist = v[1] · 2.6 · (0.5 + size) · grow · leafScatter
Leaf { node.(x1, y1) + dist · (cos a, sin a), angle: a,
       size: (0.8 + v[2] · 0.7) · sp.leafSizeMul · leafSizeAtDepth(depth) · grow,
       phase: v[3], hardiness: v[4], depth, kind: leaf }
leafSizeAtDepth(d) = max(leafSizeDepthMin, leafSizeDepthBase − leafSizeDepthDrop · d)
```

### 4.11 Open, visible, ornaments and perch

Set once the whole tree exists:

- **visible** - `hardiness <= 0.55 + 0.45 · health`. A wilting tree sheds a
  scatter of leaves rather than a block, and the same leaves come back on
  recovery because `hardiness` is seeded.
- **open** - all `n` leaves sorted by `(birth, path)`; `bloomOrder` is the
  rank, and `open = rank < ceil(n · (0.5 + 0.5 · frac))`. Older leaves open first;
  the rest are drawn as buds, so earning XP visibly unfurls leaves without a
  level-up.
- **Blossom** (`always`, or `seasonal` from level 5). Candidates: visible
  leaves of kind `leaf` that are not inner, plus kind `seedling` when the
  species' blossom is `always`; sorted by `(birth, fnv1a32(seed + "|B|" +
  path), path)`. The first `min(round(6 + 10 · sizeAtStep(form, k)),
  ceil(candidates / 6))` get a blossom at the leaf, `size = min(leaf.size,
  blossomMaxSize)`, `path` = the leaf's. The ranking's prefix never changes as
  the tree grows, so a blossom stays on its leaf.
- **Fruit** - `fruitCount(level)` of them (§6). Fruit `i` is hung once, on a
  twig chosen at the step it arrived, `at = stepOfLevel(fruitLevel(i))`: among
  the main tree's nodes with `appear <= at`, a depth of at least `max(1,
  deepest − 1)` (`deepest` = the deepest such node) and no earlier fruit, the
  one with the smallest `h = fnv1a32(seed + "|F|" + path)`, ties by path; none,
  no fruit `i`. It hangs at `pick.(x1, y1) + 0.9 · (cos, sin)(60 + h mod 60)`
  with size `min((1 + ((h >>> 8) mod 100) / 200) · sp.leafSizeMul,
  MAX_FRUIT_SIZE)`, `MAX_FRUIT_SIZE = 1.6`, and `path` = the twig's. So the
  first fruit stays on its twig when the next ones arrive.
  A palm hangs dates under its main top segment instead: date `i` at `(x1 +
  dx, y1 + dy)`, `dx = (i even ? +1 : −1) · (0.6 + 0.5 · floor(i / 2))`, `dy =
  1.6 + 0.4 · (i mod 3)`, size `dateSize`, path `PD<i>`.
- **Perch** - a palm with at least 3 main segments: `top.(x1 + 1.2, y1 +
  0.6)`. Otherwise walk the right-hand chain `T1`, `T11`, `T111`, … while it
  exists; the perch is the tip of the last node on it with `depth >= 2` and `e
  − appear >= 1`, or `null` while there is none. A rule on paths, never "the
  leaf nearest a point". What sits there is the animal pick (§9).

### 4.12 Bounds

```
bounds = { minX: 50, maxX: 50, minY: 88, maxY: 88 + GROUND_PAD }      # GROUND_PAD = 8
every branch:          minX, maxX over x0, x1;  minY over y0, y1
every leaf, visible or not:
    pad = sp.leafShape == frond ? size · 2.8 : 3 · min(1, size / sp.leafSizeMul)
    minX, maxX over x ∓ pad;  minY over y − pad
```

Wilted leaves count, so shedding leaves never moves the camera. Blossoms,
fruit and control points do not count. `maxY` always includes a band of earth.

## 5. Health (server-derived)

```
daysSinceActive = floor((startOfToday - startOfDay(lastStreakDate)) / 1 day)
health = daysSinceActive <= 1 -> 1.0
         daysSinceActive == 2 -> 0.75
         3 <= d <= 4          -> 0.5
         d >= 5               -> 0.3
```

Never below `0.3`: no dead tree, no guilt. A user with no `lastStreakDate` at
all reads as `1.0` - a brand-new account starts healthy.

Recovery is immediate: any XP event moves `lastStreakDate` to today through the
existing streak flow, so the next `GET /api/v1/gamification` returns `1.0` and
the client animates the tree back up over ~1.5 s.

Visual mapping: `droopT` (§4.5, fronds §4.8), leaf `visible` (§4.11), plus
canopy saturation × `(0.6 + 0.4 * health)` in the renderers. `health` never
touches `xp`, `level` or what exists.

## 6. Traits

One table, three copies that must agree: `lib/levensboom/traits.ts`,
`lib/features/levensboom/domain/traits.dart`, and this document.

| id | from level | what it adds |
|---|---|---|
| `blossom` | 5 | blossoms in spring and summer (species `seasonal`) |
| `fruit` | 8 | the first vrucht van de Geest |
| `twin` | 16 | a second trunk, sprouting at its step and growing in (§4.9) |
| `seasons` | 25 | rare seasonal events (snow load, blossom storm) |

The bird and the fireflies that used to be traits are animals in the catalog
(§9) now. The old `canopy` trait is the `zaailing` → `jonge boom` phase.

`fruitCount(level) = clamp(floor((level - 8) / 2) + 1, 0, 9)` - one fruit at
level 8, then one every second level, ending at nine; fruit `i` arrives at
`fruitLevel(i) = 8 + 2i`.

The nine are Galatians 5:22–23 in order, and they are the app's language for a
milestone: **liefde, blijdschap, vrede, geduld, vriendelijkheid, goedheid,
geloof, zachtmoedigheid, zelfbeheersing**.

## 7. Palette

Pure function of `season`, `timeOfDay`, `health`, `scene` and `species` - no
RNG. Sky is a two-stop vertical gradient; every other colour is a flat hex.

| timeOfDay | sky top | sky bottom | glow | light |
|---|---|---|---|---|
| dawn | `#2E3A59` | `#F7C6A0` | `#FFD9A0` | `#FFE8CC` |
| day | `#7EC8E3` | `#DFF3F7` | `#FFF4D6` | `#FFFFFF` |
| dusk | `#4B3B6B` | `#E9906B` | `#FFC38A` | `#FFD9B3` |
| night | `#0B1027` | `#232C4D` | `#3E4E80` | `#C9D6FF` |

| season | leaf | leafAlt | blossom | ground |
|---|---|---|---|---|
| spring | `#6FBF73` | `#8FD694` | `#F7B8CE` | `#4E7C43` |
| summer | `#3F8F4F` | `#57A862` | `#F2A2C0` | `#43703C` |
| autumn | `#C9772E` | `#E0A03C` | - | `#6B5A32` |
| winter | `#7D8B7A` | `#9AA79A` | - | `#5B6660` |

Bark is `#4A3A2E`, lit edge `#6B5442`; night desaturates everything by mixing
25 % toward `#1B2340`. Wilt mixes the leaf colours `(1 - health) * 0.4` toward
`#8A8F7A`.

### 7.1 Species and the seasons

A species with its own leaf colour (all but `eik`) keeps it in spring and
summer. A deciduous species turns with the seasonal table in autumn and
winter. An evergreen (`olijf`, `palm`, `ceder`, `cipres`) keeps its own green
all year, mixed 10 % toward `#8A9A8A` in autumn and 30 % in winter. Fruit
colours are per species. A species may carry its own `blossomColor`, used
whenever the season has blossom at all: amandel `#FBD3E0`, mosterd `#F3D45A`,
appel `#FBE4EC`, granaatappel `#E8532F`, acacia `#F6E27A`; the rest take the
seasonal pink.

### 7.2 Scenes

A scene overrides the sky per time of day (optional), the ground band, and
adds `far`, `farAlt`, `water` and `accent` for the backdrop the renderer draws
behind the tree. `forceTime` pins the time of day whatever the clock says:
`sterrennacht` and `herdersveld` are always `night`, `dageraad` is always
`dawn`. The table is `lib/levensboom/scenes.ts` / `domain/scenes.dart`:

| id | backdrop | what the renderer draws |
|---|---|---|
| `waterbeken` | meadow | a low far meadow; a stream in the earth band on the right, with reflections and stones |
| `heuvels` | hills | two hill layers, olive-grove specks |
| `meer` | lake | far shore, water to the horizon with light streaks, a boat with a sail |
| `woestijn` | dunes | two dune layers, a pool with two tufts |
| `berg` | mountain | a jagged range with two snow caps, a nearer slope |
| `stadsmuur` | wall | a crenellated wall, a tower, stone courses, a gate |
| `hof` | garden | hedge layers, a river on the left, flowers on stems |
| `sterrennacht` | stars | a dense star field, a milky-way band, a crescent moon |
| `jordaan` | river | far bank and hills, a river strip between them and the ground line, reeds on the near bank |
| `wijngaard` | vineyard | two hill layers, four receding rows of vines on posts with the odd grape |
| `graanveld` | field | two golden ridges, standing wheat on the earth band, heads nodding |
| `kust` | sea | sea to the horizon with drifting swell lines, a foam line and two shells on the sand |
| `regenboog` | rainbow | a six-band bow on a centre below the horizon, over the meadow ridge |
| `dageraad` | sunrise | a sun on the horizon with a halo and slow rays, two hill layers in front |
| `herdersveld` | shepherds | one bright four-point star with a halo, two dark hills, a small flock on the near one |

### 7.3 Seasonal and celebration layers (renderer-only)

Deliberately **not** in the generator: they would make the geometry - and so
the parity fixture - depend on the clock.

| Layer | When | How |
|---|---|---|
| Falling leaves | autumn, deciduous species | 3 of the 14 seeded drifters, tumbling down the viewport |
| Blossom storm | spring, `seasons` trait | all 14 drifters, tinted `blossom` |
| Snow load | winter, `seasons` trait | a white cap on the upward-facing side of every branch at `depth >= maxDepth - 2` |
| Column of light | during a level-up | 22 motes rising from the trunk base to the top of the canopy |
| Fruit bloom | a level-up that unlocked a fruit | the newest fruit swells on a slow sine under a radial `light` glow |

### 7.4 Framing

`measureFrame(width, height, scene, framing, extents?)` in `camera.ts` is the
one camera for every renderer: `svg.ts`, `TreeCanvas.tsx`, and the app's
`measureTreeFrame`, which delegates to `domain/camera.dart`. v1 fitted the tree
to the frame, so growth never showed as size; v2 keeps the landscape still and
gives the tree a designed share of it. With `treeH = max(1, 88 − minY)`:

**Scene** (the landscape):

```
band      = height · EARTH_BAND                    # EARTH_BAND = 0.12, never derived from the tree
groundTop = height − band
half      = max(50 − minX, maxX − 50, 1e-6)        # the crown's reach either side of the trunk
designed  = fillScene(e) · min(groundTop / treeH, width · HALF_WIDTH / half)     # HALF_WIDTH = 0.48
room      = max(half, extents.left, extents.right)
guard     = min(0.95 · groundTop / max(treeH, extents.top), width · HALF_WIDTH / room)
scale     = min(designed, guard);   guarded = designed > guard
pivotY    = groundTop + 0.6 · scale                # the trunk base stands 0.6 units into the earth
originX   = width / 2 − 50 · scale;   originY = pivotY − 88 · scale;   pivotX = width / 2
```

The tree's own bounds take `fillScene(e)` of whichever dimension binds: their
height of the room above the earth band, or their reach either side of the
trunk of `HALF_WIDTH` of the frame's width. A tall, narrow frame (the lesson
card) shows growth as width, a wide one (the dashboard strip) as height. The
share is exact for every seed, so every step is bigger on screen than the last
(tested at 320×200 and 246×470) and a level-up never zooms out past the tree.
The frame is centred on the trunk base, not on the bounds, so an asymmetric
crown never slides the tree sideways. `extents` - tree units beside the trunk
and above the ground - is what a ground animal or a waiting bird needs
(`animalExtents` in `TreeCanvas.tsx`). Without it the guard cannot fire while
`FILL_SCENE` stays below 0.95; with it the camera zooms out just enough to keep
the animal in frame.

**Portrait** (the avatar):

```
padX, padY = 0.1 · width, 0.1 · height
fit     = min((width − 2 · padX) / max(1, maxX − minX), (height − 2 · padY) / treeH)
scale   = min(width, height) >= PORTRAIT_FIT_BELOW_PX ? fit · fillPortrait(e) : fit
originX = width / 2 − (minX + maxX) / 2 · scale      # centred on the bounds
pivotY  = height − 1.15 · padY;   originY = pivotY − 88 · scale;   pivotX = originX + 50 · scale
groundTop = pivotY;   guarded = false
```

Below `PORTRAIT_FIT_BELOW_PX` (32 px) a portrait fits its own bounds: at
16-28 px legibility beats the growth story. Ground animals are not part of a
portrait's frame. A portrait is the tree on a radial sky disc, standing on a
ground disc and shadow; no backdrop, no motes.

`fillScene(e)` and `fillPortrait(e)` interpolate `FILL_SCENE` and
`FILL_PORTRAIT` (index = step − 1) linearly and hold them flat outside steps
1-20: past 20 the tree's screen size stays put, and maturing shows as girth,
twigs and bark (§10.6a). The mound, the shadow and the portrait disc are sized
to the trunk (§10.6a). `MIN_SCENE_HEIGHT` and `MIN_SCENE_WIDTH` are deprecated
v1 exports that the v2 camera does not read.

Both renderers stop animating under reduced motion, when told `still`, and
(web) when both sides are 64 CSS px or less.

## 8. Parity fixtures

`tests/fixtures/levensboom-v2.json` is the parity fixture. `npm run
tree:fixtures` (`scripts/levensboom/fixtures.tool.ts`, cases in
`fixtureCases.ts`) writes it, and the same file to the app's
`test/fixtures/levensboom_v2.json` when `bijbelstudie-app` is checked out next
to this repo. Rerun it after any change to the generator or the growth table
and commit both copies. `tests/levensboomGrowth.test.ts` and the app's
`test/levensboom_parity_test.dart` assert that the generator reproduces it.

- `seed = "65f0c1a2b3c4d5e6f7a8b9c0"`, `health = 1`.
- `streams`: the first 8 values of `nodeRng(seed, path)` for `T`, `T01L2`, `W`
  and `PF3`, as 9-decimal strings, so an RNG drift is reported as one before
  the geometry can hide it.
- `cases`: each of the 13 species at `(level, frac)` = (1, 0), (2, 0), (3, 0.5),
  (5, 0), (6, 0.99), (7, 0), (9, 0.4), (12, 0), (16, 0), (20, 0), (27, 0.5),
  (40, 0), plus (12, 0) with `floor = { from: 10, to: 13 }`: 169 cases.
- Per case: `species`, `level`, `frac`, `floor`; the counts `branches`,
  `leaves`, `open`, `visible`, `blossoms`, `fruits`; `step`, `maxDepth`,
  `perch` (whether there is one); `checksum = r3(Σ x0 + y0 + x1 + y1 over
  branches)` and `leafChecksum = r3(Σ x + y + size over leaves)`, `r3(v) =
  round(v · 1000) / 1000`.

The checksums catch geometry drift the counts would hide; the rounding absorbs
a last-ulp difference in `cos`/`sin` between V8 and Dart. Topology never
depends on trig (§3.1), so an ulp cannot change a count. `tests/levensboom.test.ts`
keeps the raw stream check: `fnv1a32(seed) = 3091915409` and the first 8
values of `mulberry32(fnv1a32(seed))`.

Around the fixture, `tests/levensboomGrowth.test.ts` asserts this spec's
invariants: `frac` never changes a branch or leaf path; up to step 40 paths
only ever add (only seed leaves, whorls and a forked node's leaves fall); at
health 1 wood never shrinks, thins or turns as `e` grows; the caps stay under
80 % up to step 60; fruit keeps its twig; the twin sprouts small; the camera
grows every step and never needs its guard; and the taper properties of §11.

## 9. Catalog

One table, three copies that must agree: `lib/levensboom/catalog.ts`,
`lib/features/levensboom/domain/catalog.dart`, and this section. An item is
unlocked by exactly one rule; unlocks are never stored, they are evaluated from
`{ level, badges, longestStreak, isPro }` on every read and on every PATCH.

| kind | id | unlock |
|---|---|---|
| species | `eik` | free (default) |
| species | `olijf` | free |
| species | `mosterd` | level 2 |
| species | `vijg` | level 4 |
| species | `palm` | level 8 |
| species | `appel` | level 10 |
| species | `amandel` | level 12 |
| species | `granaatappel` | level 14 |
| species | `sycomoor` | level 16 |
| species | `acacia` | level 19 |
| species | `wilg` | streak 21 |
| species | `ceder` | Pro |
| species | `cipres` | Pro |
| scene | `waterbeken` | free (default) |
| scene | `heuvels` | level 3 |
| scene | `meer` | level 6 |
| scene | `jordaan` | level 9 |
| scene | `wijngaard` | level 18 |
| scene | `regenboog` | level 20 |
| scene | `woestijn` | streak 7 |
| scene | `berg` | streak 30 |
| scene | `kust` | streak 50 |
| scene | `dageraad` | streak 90 |
| scene | `stadsmuur` | badge `completed5` |
| scene | `graanveld` | badge `completed10` |
| scene | `herdersveld` | badge `anniversary` |
| scene | `hof` | Pro |
| scene | `sterrennacht` | Pro |
| animal | `geen` | free (default) |
| animal | `vogel` | level 5 |
| animal | `vlinders` | level 7 |
| animal | `vos` | level 11 |
| animal | `bijen` | level 13 |
| animal | `vuurvliegjes` | level 15 |
| animal | `ooievaar` | level 17 |
| animal | `adelaar` | level 22 |
| animal | `duif` | streak 14 |
| animal | `uil` | streak 40 |
| animal | `hert` | streak 60 |
| animal | `schaap` | badge `completed1` |
| animal | `raaf` | badge `firstlesson` |
| animal | `ezel` | badge `completed5` |
| animal | `leeuw` | Pro |
| ring | `teal` | free (default) |
| ring | `goud` | Pro |

Where an animal sits: `vogel`, `duif`, `raaf` and `uil` take the perch (§4.11;
the owl's eyes are open only when the palette is night). While the tree has no
perch they wait on the ground beside the trunk, on a stone or not, at the spot
the `"<seed>:scene"` stream gives them (scene framing only). `schaap`, `hert`,
`vos`, `ezel`, `ooievaar` and `leeuw` stand on the ground at the offsets that
stream gives them, at world size, and in the scene framing the camera's guard
keeps them in frame (§7.4). `vlinders` and `bijen` orbit the tree's bounds,
never tighter than a minimum orbit, so they visit a seedling instead of
swarming its stem; `vuurvliegjes` only at night, and `adelaar` circles the top
of the sky in the `scene` framing only.

**Default ring.** An account with no stored ring gets `goud` when it is Pro and `teal` otherwise (`defaultRingFor(isPro)`, applied in `normaliseChoice`). The server fills this in before `chosen` and `avatar` leave the API, so the app never decides it; a stored ring, either one, is a real choice and always wins.

`streak` rules read `max(User.streak, User.longestStreak)`.

**Resolution:** the avatar that is drawn is the stored choice with every item
the account is not (or no longer) entitled to replaced by that kind's default.
The stored choice is never rewritten, so a lapsed Pro item comes straight back
on renewal.

## 10. Growth v2 storyboard

Design pass 2026-09-24 (Fable). The tree grows in 20 steps, one per level, and
matures from step 21 on. This section is the design contract for
`lib/levensboom/growth.ts` (`FORM_TABLES`, `GEOMETRY`, `SEEDLING`) and the
parts of `generate.ts` the design needed; the engine's rules (one seeded
stream per node, births, `ramp`, the taper) are §3-§4 and §11 of this
document, the reasoning `LEVENSBOOM_GROWTH_PLAN.md` §4-§5. Everything below is
arithmetic, integer steps, table literals and node draws, so it ports to Dart
1:1. Every number named here lives in `growth.ts` unless it says otherwise.

The phase bands are unchanged: Kiem 1-2, Scheut 3-6, Jonge boom 7-12,
Volwassen boom 13-20, Eeuwenoude boom 21+.

### 10.1 Storyboard: branching form (eik and the other broadleaves)

| step | what the reader sees |
|---|---|
| 1 | Today's kiem, unchanged: a 4-unit green stem with two round seed leaves at its top. |
| 2 | The stem is taller (6.3); the first whorl - a pair of leaves in the species' own shape - opens at the top as two buds. The seed leaves stay where they were. |
| 3 | Second whorl at the new top. The seed leaves start to yellow (paint) and shrink. The stem starts turning woody at the base (`wood` from position 3). |
| 4 | Third whorl. Seed leaves smaller still. A slender green-brown stem: a scheut, not a tree. |
| 5 | Seed leaves gone. Fourth whorl, and the first side shoot(s) appear at the stem's top as buds (depth 1, born 5 or 6). Blossom (trait level 5) opens on the shoot tips. |
| 6 | Fifth whorl at the crotch; the second shoot if it was late; the first shoots may already fork once (depth 2, born 6-7). The stem is bark to the top. |
| 7 | The shoots fork: a small Y with tufts of 5 leaves on every tip. The lowest whorl falls (7), the others follow one per step (8, 9, 10, 11), shrinking over their last two positions before they go, so the trunk clears as the crown forms. |
| 8 | Depth 3 begins (8-10). First fruit, on a twig of one of the two youngest depths. |
| 9-10 | The crown forms: 12-18 branches, tufts of 5 leaves, inner foliage of 2 leaves on every forked node at depths 2-4. |
| 11-13 | Depth 4 (11-13): a proper small crown, 20-40 branches. The last whorl falls at 11. |
| 14-19 | Depth 5 arrives over six steps (14-19), so every level-up adds twigs; the third (middle) children keep trickling in as their chance rises. The twin trunk sprouts at 16 and grows in over 17-20. |
| 20 | The finale: every tip gains a sixth leaf, the crown closes. About 90-140 branches, 400-620 leaves (eik, 16 probe seeds). At least as full as today's level-20 tree. |
| 21-40 | Maturing: girth +1.5 % per step (to +30 % at 40); tips fork into fine twigs by chance (3 % of tips per step to 30 % at 30, 33 % at 40, 40 % at 60), two-armed, with a third arm from 23 where the third-child draw passes too; each twig carries one leaf fewer; bark knots from 22, moss from 26, root flare from 30 (paint). Height keeps creeping (asymptote `sizeMax`) so an old v1 tree never needs a floor. Never above 915 leaves / 288 branches at 40 on any of the 16 probe seeds. |

Width has its own curve (`WIDTH_V2`, about size^1.4): the scheut is slender
(trunk 1.05 at step 3, was 1.5), the young tree slim (2.5 at 10), and most of
the girth arrives after step 12 (5.1 at 20; 8.4 at 40, the tail towards
`sizeMax` times the maturing girth).

### 10.2 Storyboard: conical form (ceder, cipres)

| step | what the reader sees |
|---|---|
| 1 | A short stem with a whorl of five needle seed leaves fanned over ±70°. |
| 2-4 | A needle whorl of four per step stacks on the stem: a tiny fir. Seed leaves fade over 3.5-6, gone at 6. |
| 5 | The leader extends (segment 2) and the first side tier (two near-flat branches) leaves the stem at its foot. Whorls persist. |
| 6-12 | A segment plus a tier at 6, 8, 9, 11, 12: the spire rises one whorl at a time. Each tier forks 2 steps after it was born and again 2 steps later; tips carry 3-4 needles, forked tier nodes keep 3, so the shelves are dense. Whorls fall at 8, 9, 10. |
| 13-20 | Segments at 14, 15, 17, 18, 20. Tiers born after step 12 fork only once, so the top stays pointed while the base broadens: a cone with flat shelves (ceder, tiers at 75° off the leader) or a column (cipres, 30°). Step 20: 12 segments, 141-163 branches, 639-759 needles. |
| 21-40 | Segments at 24, 28, 34 (15 in all); girth; the spine's upper tiers keep forking. 181-201 branches, at most 915 needles. |

### 10.3 Storyboard: palm

| step | what the reader sees |
|---|---|
| 1 | Two strap leaves straight out of the ground; no trunk (the first segment is a 15 % stub). |
| 2-6 | One frond more per step (3 at 2 ... 7 at 6), the fan filling fixed slots (`PALM_FROND_FAN`). |
| 7 | The stub emerges into a first trunk segment (full at position 7); segment 2 appears. |
| 8-10, 12, 14, 16, 18 | A segment per listed step: the trunk rises. Fronds: 8 at 7, 12 at 11, 14 at 15, 16 at 19. Dates from 8 hang under the crown. |
| 16 | The twin palm sprouts beside the trunk and rises a segment per step, to nine at 24. |
| 20 | Nine segments, 16 fronds (+ twin). |
| 25, 30, 35 | One frond more at each (19 at 35); girth. |

### 10.4 Species notes

- **wilg** weeps through `droopBase` as before: it shows from the first forks at 7 and is unmistakable from 13.
- **acacia** gets its flat crown from the wide spread and short children; it reads flat from 15 and fully at 18-20.
- **sycomoor** and **vijg** are low and wide with big leaves from step 2 (their whorls are already large blobs).
- **mosterd** and **amandel** (`blossom: 'always'`) flower on their seedling whorls from step 2 (the first whorl); every other blossoming species flowers from level 5 on the shoot tips.
- Species values changed for v2 (`species.ts`, all commented in place): `thirdChildBias` acacia 0.25→0.06, mosterd 0.30→0.06, granaatappel 0.20→0.06, sycomoor 0.20→0.12, wilg 0.15→0.06, vijg 0.15→0.12, appel 0.12→0.06, olijf 0.10→0.06 (the leaf budget at step 40); mosterd `leafCountMul` 1.3→1.05; ceder `trunkLenMul` 1.15→0.5 and `leafSizeMul` 0.8→1.15; cipres `trunkLenMul` 1.3→0.42 and `leafSizeMul` 0.7→1.0 (the spine now supplies the height; needles were hairlines at the v2 camera scale).

### 10.5 Topology rules added by the design (portable, integers and draws only)

Names are the `FormTable` / `GEOMETRY` / `SEEDLING` fields. §4 has each rule
in full.

- **Child delay.** `appear = max(parent.appear + childDelay, base + delay + floor(birthJitter · spread))`, `childDelay = 1`: a late limb grows out one depth per step instead of popping in whole.
- **Seedling whorls.** Whorl `j` (1-based, `seedlingPairs` of them, `pairLeaves` leaves each: 2 branching, 4 conical) is born at step `j + 1` and falls at `pairDeath − (seedlingPairs − j)` (branching: 7, 8, 9, 10, 11; conical: 8, 9, 10). Leaf `i` of a whorl sits at angle `heading + fan · pairAngle + (2·u − 1) · pairAngleJitter` with `fan = 2i/(n−1) − 1` (0 when n < 2), at `pairHeight` of the stem's length at its birth. Size and distance are multiplied by `ramp(e, born) · fade`, `fade = pairFadeMin + (1 − pairFadeMin) · clamp((death − e) / pairFadeSteps, 0, 1)` (0.45 over the last 2 positions). Seed leaves shrink the same way (size only; their distance is fixed) with `cotyledonFadeSteps` 2.5 and `cotyledonFadeMin` 0.4 towards `cotyledonDeath`.
- **Leaves per tip.** `max(2, round(table[k] · (1 + (leafCountMul − 1) · leafMulWeight)) − (twig ? twigLeafDrop : 0)) + bonus`, `leafMulWeight = 0.5`. Branching table: 2 to step 4, 4.4 at 5, 4.6 at 6, 4.9 from 7, 5.85 at 20 (so 5 leaves through the young tree and 6 from step 20 for every broadleaf; vijg and sycomoor 4→5). Conical: 3 from 5 rising to 4 at 11, 4.4 at 20, times 1.25-1.3. Leaf `i` is born at the first step whose count exceeds `i`.
- **Inner foliage.** A forked node keeps its full tuft for `innerKeep` steps (3 branching, 2 conical), then its first `innerLeaves` leaves for good (2, at depths 2-4; conical 3, from depth 1), the rest fall. The trunk `T` never carries a tuft; a leader (conical spine, twin root) only while it is the top. Blossom never lands on a reduced (inner) leaf.
- **Maturing twigs (reserve draw 8).** A tip forks into twigs - the depth just past `birth`'s end (branching: depth 6; twin: `rel` `twinMaxDepth + 1`) - from `twigFrom = 21`, at the first step where `parent.d[8] < twigChance[k − 21]` (0.03 per step to 0.30 at 30, 0.33 at 40, 0.40 at 60). The fork uses the ordinary slots, so a third twig appears where the parent's third-child draw also passes (from step 23). Twigs carry `twigLeafDrop = 1` leaf fewer and never fork further.
- **Third children** keep the v1 chance shape (0.15 → 0.306 at step 20, flat after) plus the species bias; the conical table is 0 to step 10 and 0.1 at 20.
- **Conical spine and tiers.** `birth` is the leader schedule: segment `d` and the tier at its foot appear at `birth[d]` (1, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 24, 28, 34), no jitter. Segment length = parent segment × `leaderLen` (0.82) × lenJitter, width share `leaderWidth` 0.8, angle jitter share 0.35. A tier root leaves at `±spread · tierAngle` (2.5) with length `root.baseLen · childLenRatio · tierLen (1.1) · (1 − tierTaper (0.8) · min(1, segment / conicalDepth (12)))` (root: `T`, or `W` for the twin) and width share 0.5. Tier children (depth `t` inside the tier) are born at `tierBirth + tierFork[t − 1]` (2, 4) + `floor(jitter · tierForkSpread (2))`, fan `±spread · 0.55` with 0.6 of the slot jitter, length × 0.66, width × 0.66. A tier born at or before `tierDeepUntil` (12) forks twice, later tiers once.
- **Width and girth.** Trunk width `(0.8 + 6.2 · widthAt(e)) · trunkWidthMul · girthAt(e)`, `widthAt` interpolating `WIDTH_V2` (0, 0.016, 0.04, 0.065, 0.095, 0.125, 0.16, 0.195, 0.23, 0.27, 0.31, 0.35, 0.39, 0.43, 0.47, 0.515, 0.56, 0.605, 0.65, 0.7) with the same asymptotic tail as size; `girthAt(e) = 1 + 0.015 · clamp(e − 20, 0, 20)`.
- **Leaf size by depth.** A tuft's leaf size is multiplied by `max(0.9, 1.5 − 0.07 · depth)`: a sapling's shoots carry big leaves (1.43 at depth 1), the outer twigs of a crown small ones (1.15 at depth 5, 1.08 on twigs). Leaf scatter from the tip is × `leafScatter` (1 branching, 0.5 conical so needles bunch into tufts).
- **Blossom.** Candidates are visible leaves of kind `leaf` that are not inner-reduced, plus kind `seedling` when the species' blossom is `always`; ranked by (birth, hash) as before; the ornament size is `min(leaf.size, blossomMaxSize)`, `blossomMaxSize = 0.9` (10.6a).
- **Palm.** `palmSegments` 1, 7, 8, 9, 10, 12, 14, 16, 18; `palmFronds` 2, 3, ... 12 (steps 1-11), then 12, 13, 13, 14, 14, 15, 15, 16, 16; `palmEmergeSteps` 6; `leafBonusAt` 25, 30, 35.

### 10.6 Drawing primitives (both renderers; numbers in `lib/levensboom/paint.ts`)

- **Wood colour.** `woodColor(palette, wood) = mix(mix(leaf, bark, 0.35), bark, wood)`; bark at `wood >= 1`. A renderer may bucket `wood` (the SVG to tenths, the canvas to twentieths). The trunk turns from position 3 over 3 positions; any other branch from one position after its birth, over 3.
- **Seed leaf (kind `cotyledon`).** Drawn in the leaf's rotated frame with `s` the pixel size a species leaf would get: broad-leaved forms an ellipse at centre (0.55·s, 0), radii (0.62·s, 0.46·s); the conical form a needle at (0.75·s, 0), radii (0.85·s, 0.16·s). Colour: `base = mix(leaf or leafAlt (phase > 0.5), light, 0.14)`; from step 3 `age = clamp(0.3 + 0.25·(position − 3), 0, 0.8)` and `fill = mix(base, mix(mix(base, barkLit, 0.4), glow, 0.3), age)` - it yellows while the generator shrinks it.
- **Seedling whorl leaves (kind `seedling`)** are species leaves; the generator shrinks them before they fall (10.5), and their opacity follows `fade` (10.6a).
- **Bark knots** (from position 22, not on a palm), **moss** (from 26, not on a palm) and **root flare** (from 30, every form) are drawn from one seeded stream `"<seed>:mature"` on the trunk branch `T` exactly as `paint.ts` specifies (knot count `min(6, 1 + floor((position − 22) / 3))`, moss `min(7, 3 + floor((position − 26) / 2))`, flare amount `0.35 + 0.65·min(1, (position − 30) / 6)`); the colours are palette mixes only (`knotColors`, `mossColor`, `rootColor`).

### 10.6a Renderer primitives added in CP5 (both renderers; numbers in `paint.ts`, `tween.ts`)

- **Ground mound and shadow** (`MOUND`, `moundFor`, `portraitDiscFor`, `trunkWidthOf`). With `w` the trunk's base width in tree units (branch `T`'s `w0`; 5 when a scene has no `T`, i.e. a v1 tree), scene framing: mound `rx = clamp(3 + 2.2·w, 4, 17)`, `ry = 0.16·rx`, an upper half-ellipse centred 0.2 units below the earth band's top edge in `ground`; shadow `rx = 0.78·mound rx`, `ry = 0.115·mound rx`, centred 0.6 units below the trunk base, `bark` (SVG, alpha 0.2) or `mix(groundDeep, bark, 0.5)` (canvas, alpha 0.28). Portrait: disc `rx = max(2.4, 1.9 + 1.1·w)`, `ry = min(0.16·rx, 1.6)` on the pivot in `ground` at 0.9, shadow `0.7·rx`, `0.7·ry`, 0.4 units lower, `bark` at 0.25. All times the camera scale, never below 3 px (mound) / 2 px (shadow) / 1.2 px (portrait ry). A kiem now stands on a handful of earth (rx 4.8 units) instead of a 14-unit mound; a step-20 tree on 14.3, an old one on 17. In a tween `T.w0` lerps, so the mound eases with the trunk.
- **Fade of temporary leaves.** The generator gives every leaf `fade` (1 fresh, 0 about to fall; always 1 on crown leaves): for seed leaves `(shrink − 0.4) / 0.6`, for whorls `(shrink − 0.45) / 0.55`, with `shrink` the size factor of 10.5. A renderer multiplies the leaf's opacity by `leafFadeAlpha(fade) = 0.3 + 0.7·fade` (times the bud opacity 0.75 when the leaf is not open). The tween lerps `fade` on shared leaves and multiplies it by `fall(t)` on leaving ones.
- **Blossom size.** The ornament size is capped at `blossomMaxSize = 0.9` (was 1.2) in the generator, and both renderers draw a blossom at radius `0.7 · size · leafScale` (was 0.8): a flower is smaller than a leaf, also on a step-5 sapling.
- **Palm dates.** Fruit size `dateSize = 0.95` (was 1.36) hung at `dx = ±(0.6 + 0.5·floor(i/2))`, `dy = 1.6 + 0.4·(i mod 3)` under the top segment; both renderers draw each as a bunch of three ellipses, radii `(0.42·s, 0.6·s)` at offsets `(−0.5, 0.1)·s`, `(0.5, 0.1)·s`, `(0, 0.75)·s` with `s = max(1.4, size · leafScale · 1.15)` px.
- **Needle mass.** Canvas: needle strokes `lineWidth = max(1, 0.42·scale)` (was 0.32), fan of 5 above scale 1.6, of 3 above scale 1, else 1. SVG: needle ellipse `ry = 0.3·size` (was 0.25).
- **Camera fill curves** are unchanged from the engine's draft (`FILL_SCENE` 0.22 → 0.84 over steps 1-20, flat after; `FILL_PORTRAIT` 0.6 → 0.92; fit-to-bounds below 32 px). Judged on `sizes*.png`: a kiem at 22 % of the dashboard strip and 60 % of a 176 px disc reads as a plant, and a step-20 tree fills the strip without touching the frame. Past 20 the screen size stays put by design: maturing shows as girth, twigs, knots, moss and roots, not as size. Animals keep their world size (`animalExtents` may widen the camera by up to ~5 % at steps 2-3 with a sheep).

### 10.6b Tween timings (CP6, `tween.ts` `TWEEN`)

- `levelUpMs` 1800 (was 1600), `growMs` 1200.
- `tweenEase(u) = smoothstep(u^0.75)`: 0.08 at a tenth, 0.29 at a quarter, 0.64 at half, 0.96 at 0.85 - a short wake-up, the growth through the middle, a long settle; the camera (measured on the in-between scene) eases with it.
- Newborn wood sprouts from `sproutDelay` 0.12 of the eased progress (`sprout(p) = smoothstep((p − 0.12) / 0.88)`), new leaves, blossom and fruit unfurl from `unfurlDelay` 0.4, leaving leaves are gone by `fallEnd` 0.55. So over a 1800 ms level-up: existing wood and the camera move from 0 ms, new twigs from ~250 ms, leaves open from ~600 ms, and everything settles over the last 500 ms. Filmstrip: `design/levensboom/sheets/tween-eik.png`.

### 10.7 Never-shrink calibration

`npm run tree:calibrate` with this table gives `LEGACY_EQUIV` floors for v1
levels 2-19 only (2→5.7, 5→10.1, 10→14.8, 15→17.9, 19→19.1); from level 20 on
the v2 tree at position L is at least as tall as the v1 tree was, so no
maturing account gets a floor.

## 11. The never-shrink floor

v2 draws a smaller tree per level than v1 did. Every account that existed at
launch keeps a head start that tapers off, so the tree it had never shrinks.

**Stored.** `User.levensboom.legacyXp` (Number) and `legacyAt` (Date), without
defaults: the account's XP at its first read after launch, written once and
never rewritten. Everything else is derived, so a growth-table change needs no
migration.

**Capture.** `ensureLegacyXp` (`lib/levensboom/legacy.ts`), called by `GET
/api/v1/gamification` and `GET /api/v1/levensboom` before the payload is built.
`legacyCaptureUpdate` builds the write only when all of these hold:
`VERCEL_ENV === 'production'` (set by Vercel); `levensboom.legacyXp` is
undefined; `xp` is a finite number on the document. There is no launch date:
production only runs this code from the deploy that launches it. The captured
value is `xp`, or 0 for an account younger than `NEW_ACCOUNT_MS` (24 h) - a new
account never gets a floor or the announcement, even if it earned a little XP
before its first tree read. The write is `updateOne({ _id,
'levensboom.legacyXp': { $exists: false } }, { $set: { 'levensboom.legacyXp':
value, 'levensboom.legacyAt': now } }, { timestamps: false })`: two racing
requests write once, and `updatedAt` stays put. A failure is logged and
swallowed. Previews share the production database; the gate keeps a preview
from pinning a real account before launch.

**Reading.** `floorForUser` (read-only, so public cards use it too): a stored
`legacyXp` gives its floor (none for 0); nothing stored (a preview, or not read
since launch) gives the floor for the current XP, and nothing is written.
`announcesGrowth` is true only for a stored `legacyXp > 0`, so it fails closed
on previews.

**From XP to a floor** (`growth.ts`):

```
positionForXp(xp) = L + clamp((xp − xpForLevel(L)) / max(1, xpForLevel(L + 1) − xpForLevel(L)), 0, 1),  L = levelForXp(xp)
legacyEquivalent(p) = LEGACY_EQUIV interpolated linearly; slope 1 before the first and past the last entry
floorForLegacyXp(x) = null if x is missing, not finite or <= 0, else
    from = round3(positionForXp(x));   to = round3(legacyEquivalent(from))
    to > from + 0.001 ? { from, to } : null
```

`LEGACY_EQUIV` (`lib/levensboom/growthRef.ts`, generated; server-only, Dart has
no copy and clients get `floor` ready-made) maps a v1 level to the v2 position
whose median eik is as tall. `npm run tree:calibrate`
(`scripts/levensboom/calibrate.tool.ts`) writes it from the median world height
`88 − minY` of 48 seeded eiks: v1 (`lib/levensboom/v1/generateV1.ts`, frac 0.5)
at levels 1-80 against v2 on a 0.1 grid from 1 to 90, made non-decreasing. Each
entry is the first grid position at least as tall, never below the previous
entry or the level itself, rounded to 0.1. Eik is the reference for every
species, so switching species never moves a floor. Rerun it after any change
to the growth table. What it gives today: §10.7.

**Taper.** A floor is valid (`isFloor`) when both ends are finite, `from >= 1`
and `to > from`.

```
C = floorEnd(floor) = max(20, to + 3)
taper(r) = r                                          no floor, or r >= C
         = r + (to − from)                            r <= from (defensive: XP only grows)
         = to + (r − from) · (C − to) / (C − from)    otherwise
untaper  = its inverse
```

`taper(from) = to`: no shrink at launch. Continuous and strictly increasing:
the tree keeps growing from day one. `taper(r) >= r`: never behind a new
account. `= r` from `C` on: at step 20, or three steps past the floor, the head
start is gone. All tested. The step is `floor(taper(level))` (§1), so new
structure still arrives only at a level-up; with a slope below 1 an account
sometimes levels up without a new step, and the size still grows.
`levelForStep(step, floor)` is the first level that stands on a step.

**API.** `growthInfo(level, frac, floor)` is the `levensboom.growth` block:
`{ model: 2, position (e, 4 decimals), step, stepsTotal: 20, rings, phase: {
id, name, index, fromStep, toStep, blurb }, nextPhase: { id, name, fromStep } |
null, floor }`. `stage` is `phaseForStep(step)` in the v1 shape (its
`nextLevel` is a step). The public card (`publicCard.ts`) serves `growth: {
position, step, frac, floor, phase: { id, name, index } }`, computed with
`floorForUser`, never capturing. Clients keep the served `floor` and derive `e`
and `k` themselves with the same `taper` (§1).

## 12. Tween

`lib/levensboom/tween.ts`, `domain/tween.dart` line for line. A level-up and
the in-level growth after a lesson hold scene A (before) and scene B (after)
of the same seed and species, and render `lerpScenes(A, B, tweenEase(u))` for
`u` from 0 to 1 over `tweenMsFor(A, B)`: `levelUpMs` when the step changes,
`growMs` otherwise. A renderer measures its camera on the lerped scene, so the
camera eases with the tree. The timing values: §10.6b.

```
smoothstep(x) = u · u · (3 − 2u),  u = clamp(x, 0, 1)
tweenEase(u)  = smoothstep(u ^ easeBias)
sprout(t)     = smoothstep((t − sproutDelay) / (1 − sproutDelay))     # newborn wood
unfurl(t)     = smoothstep((t − unfurlDelay) / (1 − unfurlDelay))     # new leaves, blossom, fruit
fall(t)       = 1 − smoothstep(t / fallEnd)                            # what leaves
```

`lerpScenes(A, B, t)` with `p = clamp(t, 0, 1)` (non-finite: 0) returns B
itself at `p >= 1`. Items match by `path`, fruit by `path` and `index`:

- **Wood in both**: `x0, y0, cx, cy, x1, y1, w0, w1, wood` lerp; the rest from B.
- **Newborn wood** (B only), in B's order: starts at its parent's lerped tip
  (parent = its path minus the last character, already lerped because branches
  run parents first; a root `T` or `W` starts at its own `x0, y0`), with B's
  control and end vectors and both widths times `sprout(p)`. At `p = 0` it is a
  zero-length bud.
- **Wood only in A** (never in v2, but a reverse tween or a species change must
  not leave it hanging): while `fall(p) > 0`, appended after B's wood, shrunk
  toward its parent's lerped tip by `fall(p)`.
- **Leaf owners**: a frond's owner is the top segment of its chain (the last
  branch whose path starts with `T`, or `W` for `WF`); any other leaf's is the
  branch named by its path up to the last `L`, if that exists. Seed leaves and
  whorls have none.
- **Leaves only in A** (seed leaves, whorls, inner foliage falling) come first,
  so they sit under the foliage that stays, while `fall(p) > 0`: carried
  rigidly by their owner's lerped tip, `size` and `fade` times `fall(p)`.
- **Leaves in both**: with an owner in both scenes, `position = lerped tip +
  lerp(offset from A's owner tip, offset from B's)`, else a plain lerp of `x,
  y`; `size`, `angle` and `fade` lerp; the rest from B.
- **New leaves**: ride the owner's lerped tip with their offset times
  `unfurl(p)` (in place without an owner), `size` times `unfurl(p)`.
- **Blossom** (leaving ones first) sits on its leaf's lerped position with
  `size = that leaf's lerped size × presence` - presence 1 when in both,
  `unfurl(p)` when new, `fall(p)` when leaving; it is not capped by
  `blossomMaxSize` mid-tween. Without its leaf it keeps its own position, size
  × presence.
- **Fruit** rides its twig's lerped tip (a date the top of the `T` chain): in
  both, like a leaf in both, with `size` lerped; new, carried rigidly, `size ×
  unfurl(p)`; leaving (first), carried rigidly, `size × fall(p)`.
- **Perch**: in both, lerp. Only in B and `p >= 0.5`: B's perch, carried by the
  lerped tip of B's branch whose `(x1, y1)` is nearest it. Otherwise A's below
  `p = 0.5` and B's from there.
- `bounds` (all four sides), `position`, `growth` and `health` lerp; `step`,
  `phase`, `rings`, `traits`, `maxDepth` and every other field come from B.

Pure: no DOM, no clock, no random. The web memoises the per-scene path index;
Dart may rebuild it per call.
