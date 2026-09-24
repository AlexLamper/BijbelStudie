# Levensboom - generation spec

The contract between `lib/levensboom/*.ts` (web) and
`lib/features/levensboom/domain/*.dart` (app). Both implementations must
produce the *same tree* for the same inputs; the parity fixtures in
`tests/levensboom.test.ts` and `test/levensboom_parity_test.dart` assert that.

Nothing about the tree's *shape* is stored - the tree is a pure function of
values the server already has, plus the species the reader picked.

---

## 1. Inputs

| Name | Type | Source |
|---|---|---|
| `seed` | string | the user's Mongo id. Stable forever, per user. |
| `level` | int ≥ 1 | `levelForXp(xp)` from `lib/gamification.ts` |
| `frac` | 0..1 | `xpIntoLevel / xpForNextLevel` |
| `health` | 0.3..1 | §5, derived from `lastStreakDate` |
| `species` | `eik \| olijf \| vijg \| palm \| amandel \| ceder \| mosterd \| appel \| granaatappel \| sycomoor \| wilg \| acacia \| cipres` | `User.levensboom.species`, after the unlock check (§9) |
| `season` | `spring \| summer \| autumn \| winter` | device month |
| `timeOfDay` | `dawn \| day \| dusk \| night` | device clock |
| `scene` | §7.2 id | `User.levensboom.scene`, after the unlock check |
| `animal` | §9 id | `User.levensboom.animal`, after the unlock check |

Only the first five reach the generator. `season`, `timeOfDay`, `scene` and
`animal` affect **palette and render-only layers** - never geometry. That
keeps the parity test independent of the clock and of the studio.

## 2. Coordinate space

A 100×100 box, `y` downwards, `y = 0` at the top of the sky.

- ground line: `y = 88`
- trunk base: `(50, 88)`
- angles in **degrees**, `-90` = straight up, `+90` = straight down.

Renderers frame the tree's own `bounds` (§4.6) into their viewport; nothing in
the generator knows about pixels.

## 3. Deterministic randomness

**Every** random choice comes from one seeded stream. No unseeded RNG anywhere,
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
Dart: mask the 64-bit product). The stream is seeded once with
`fnv1a32(seed)` and drawn from in exactly the order below.

Renderers own two more streams, `"<seed>:decor"` (motes, stars, drifters,
fireflies, butterflies, bees, the eagle's phase) and `"<seed>:scene"` (backdrop
details, where the ground animals stand: sheep, deer, fox, donkey, stork,
lion, in that order). Neither can shift a branch. New decor is only ever
appended to the end of its stream, so older decor never moves.

## 4. Geometry

### 4.1 Growth stages

```
growth   = 1 - 1 / (1 + (level - 1) / 6)    # 0 at level 1, asymptotic - never "done"
maxDepth = min(7, round(7 * growth))        # 0 at level 1 (the stem only)
trunkLen = (4 + 36 * growth) * sp.trunkLenMul
trunkW   = (0.8 + 6.2 * growth) * sp.trunkWidthMul
droopT   = (1 - health) * 0.25              # how far branch tips rotate to +90
leafCount = maxDepth == 0 ? 2 : max(2, round((3 + 7 * growth) * sp.leafCountMul))
MAX_BRANCHES = 900, MAX_LEAVES = 1400       # hard stops, see below
```

Level 1 is exactly zero growth: a 4-unit stem with one leaf either side - the
**kiem**. The named stages are level bands (`lib/levensboom/stages.ts`,
`domain/stages.dart`), served in the API as `stage`:

| id | name | from level |
|---|---|---|
| `kiem` | Kiem | 1 |
| `zaailing` | Zaailing | 2 |
| `jonge_boom` | Jonge boom | 4 |
| `volwassen_boom` | Volwassen boom | 8 |
| `eeuwenoude_boom` | Eeuwenoude boom | 16 |

`MAX_BRANCHES` is checked at the **top of `recurse`, before any random draw**,
and `MAX_LEAVES` before each leaf, so neither can desync the two streams.

### 4.2 Draw order (this *is* the RNG order)

1. `lean = (rand() * 2 - 1) * 6 * sp.leanMul` - degrees, applied to the trunk only.
2. `grow(50, 88, -90 + lean, trunkLen, trunkW, depth = 0)` - `recurse` for
   `branching` and `conical` forms, `growPalm` for `palm`.
3. If the `twin` trait is unlocked (level ≥ 16), a second, smaller trunk:
   `grow(50 + side * 6, 88, -90 + lean + side * 14, trunkLen * 0.62,
   trunkW * 0.55, 1)` where `side = rand() < 0.5 ? -1 : 1` is drawn **after**
   the main tree finishes.
4. Blossom, fruit and perch placement (§4.5) - after all branches, no draws.

### 4.3 `recurse(x0, y0, angle, len, width, depth, leader = true)`

```
if branchCount >= MAX_BRANCHES: return          # before any rand()

curve     = (rand() * 2 - 1) * sp.curveAmp
endAngle  = angle + curve
midAngle  = angle + curve * 0.5
cx, cy    = x0 + cos(midAngle) * len * 0.5,  y0 + sin(midAngle) * len * 0.5
x1, y1    = x0 + cos(endAngle) * len,        y0 + sin(endAngle) * len

emit Branch { x0, y0, cx, cy, x1, y1, w0: width, w1: width * sp.childWidthRatio, depth }

if depth >= maxDepth:
    emitLeaves(x1, y1, endAngle, depth)
    return

third      = rand() < 0.15 + 0.20 * growth + sp.thirdChildBias   # always drawn
spread     = sp.spreadBase + rand() * sp.spreadJitter
spine      = sp.form == conical AND leader
childCount = spine ? 3 : depth == 0 ? 2 : (third ? 3 : 2)

for i in 0 .. childCount - 1:
    t          = (i / (childCount - 1)) * 2 - 1     # -1..1
    jitter     = (rand() * 2 - 1) * 8
    if spine and i == 1:                            # the leader
        raw = endAngle + jitter * 0.35
        childLen = len * 0.78;  childWidth = width * 0.72;  childLeader = true
    else if spine:                                  # near-flat side branches, longer low down
        raw = endAngle + t * (spread + 42) + jitter
        childLen = len * 0.62 * (1 - 0.55 * (depth / maxDepth))
        childWidth = width * 0.5;  childLeader = false
    else if sp.form == conical:                     # a tier: only a slight fan
        raw = endAngle + t * spread * 0.55 + jitter * 0.6
        childLen = len * 0.66;  childWidth = width * 0.66;  childLeader = false
    else:
        raw = endAngle + t * spread + jitter
        childLen = len * sp.childLenRatio;  childWidth = width * sp.childWidthRatio
        childLeader = false
    droop      = (droopT + sp.droopBase) * ((depth + 1) / maxDepth)
    childAngle = raw + (90 - raw) * droop        # rotate toward straight down
    recurse(x1, y1, childAngle, childLen, childWidth, depth + 1, childLeader)

if depth == maxDepth - 1:
    emitLeaves(x1, y1, endAngle, depth)          # one rank in from the tips
```

### 4.4 `emitLeaves(x, y, angle, depth)` and the species table

```
for i in 0 .. leafCount - 1:
    if leafCount_total >= MAX_LEAVES: return
    a         = angle + (rand() * 2 - 1) * 70
    d         = rand() * 2.6 * (0.5 + growth)
    size      = (0.8 + rand() * 0.7) * sp.leafSizeMul
    phase     = rand()
    hardiness = rand()
    if maxDepth == 0:                            # the kiem: the five draws are still made
        a = angle + (i == 0 ? -58 : 58);  d = 1.4;  size = 1.6 * sp.leafSizeMul
    emit Leaf { x: x + cos(a) * d, y: y + sin(a) * d, angle: a, size, phase, hardiness,
                bloomOrder: <running index>, depth }
```

Species parameters (`lib/levensboom/species.ts`, `domain/species.dart`). The
`eik` row is the old generator's constants, so an untouched account keeps its
silhouette. Renderer-only columns (leaf/fruit shape, colours, evergreen) are in
the code and not repeated here.

| id | form | trunkLen | trunkW | spread | jitter | curve | childLen | childW | third | lean | droop | leafCount | leafSize | blossom |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `eik` | branching | 1 | 1 | 26 | 14 | 10 | 0.74 | 0.68 | 0 | 1 | 0 | 1 | 1 | seasonal |
| `olijf` | branching | 0.8 | 1.3 | 36 | 16 | 18 | 0.70 | 0.70 | 0.10 | 1.4 | 0 | 1.15 | 0.85 | seasonal |
| `vijg` | branching | 0.75 | 1.3 | 40 | 12 | 12 | 0.72 | 0.75 | 0.15 | 1 | 0 | 0.55 | 1.35 | never |
| `palm` | palm | 1.45 | 0.9 | – | – | 6 | – | – | – | 1.2 | 0 | – | 1 | never |
| `amandel` | branching | 1.05 | 0.85 | 22 | 10 | 8 | 0.76 | 0.66 | 0.05 | 0.8 | 0 | 0.9 | 0.9 | always |
| `ceder` | conical | 1.15 | 1.1 | 30 | 8 | 5 | 0.68 | 0.70 | 0.20 | 0.5 | 0 | 1.6 | 0.8 | never |
| `mosterd` | branching | 0.85 | 0.8 | 34 | 16 | 14 | 0.72 | 0.62 | 0.30 | 1.1 | 0 | 1.3 | 0.6 | always |
| `appel` | branching | 0.9 | 1.05 | 32 | 12 | 10 | 0.72 | 0.68 | 0.12 | 0.9 | 0 | 1.05 | 0.95 | seasonal |
| `granaatappel` | branching | 0.7 | 1 | 38 | 14 | 14 | 0.70 | 0.66 | 0.20 | 1 | 0 | 1.2 | 0.75 | seasonal |
| `sycomoor` | branching | 0.7 | 1.6 | 46 | 12 | 12 | 0.70 | 0.74 | 0.20 | 1 | 0 | 0.75 | 1.2 | never |
| `wilg` | branching | 1 | 1.15 | 30 | 14 | 12 | 0.80 | 0.60 | 0.15 | 1.2 | 0.5 | 1.2 | 0.9 | never |
| `acacia` | branching | 1.25 | 0.9 | 50 | 10 | 6 | 0.60 | 0.62 | 0.25 | 1.3 | 0 | 1.2 | 0.7 | seasonal |
| `cipres` | conical | 1.3 | 0.8 | 12 | 6 | 3 | 0.60 | 0.70 | 0.20 | 0.3 | 0 | 1.5 | 0.7 | never |

`seasonal` blossoms in spring from level 5 (the `blossom` trait); `always`
blossoms every spring; `never` grows no blossom ornaments. `droop` is
`droopBase`: how far a perfectly healthy tree's tips already hang toward
straight down - the treurwilg. It adds to the wilt droop of §4.3 and is zero
for every species that existed before it, so their fixtures did not move.
`palm` and `conical` ignore the columns their form does not read.

### 4.5 `growPalm(x0, y0, angle0, trunkLen, trunkW, depthBase)`

```
segments = maxDepth == 0 ? 1 : min(6, maxDepth + 1)
segLen   = trunkLen / segments
x, y, angle, width = x0, y0, angle0, trunkW
for i in 0 .. segments - 1:
    if branchCount >= MAX_BRANCHES: return
    curve    = (rand() * 2 - 1) * sp.curveAmp + (angle0 + 90) * 0.35   # bends on in its lean
    endAngle = angle + curve;  midAngle = angle + curve * 0.5
    emit Branch { ..., w0: width, w1: width * 0.9, depth: depthBase + i }
    x, y, angle, width = x1, y1, endAngle, width * 0.9

count = maxDepth == 0 ? 2 : 4 + round(8 * growth)
for i in 0 .. count - 1:
    if leafCount_total >= MAX_LEAVES: return
    t         = count == 1 ? 0 : (i / (count - 1)) * 2 - 1
    jitter    = (rand() * 2 - 1) * 8
    size      = (2.2 + 2.6 * growth) * (0.85 + rand() * 0.3) * sp.leafSizeMul
    phase     = rand();  hardiness = rand()
    a         = angle + t * 95 + jitter
    a        += (90 - a) * droopT * 0.6                                # wilt lets fronds hang
    emit Leaf { x: x + cos(a) * size * 0.3, y: y + sin(a) * size * 0.3, angle: a, size, ...,
                depth: depthBase + segments - 1 }
```

Fronds are ordinary leaves with a large `size`; the renderer draws the blade.

### 4.6 Derived flags, ornaments, perch and bounds

Set once the whole tree exists (no draws):

- **visible** - `hardiness <= 0.55 + 0.45 * health`. A wilting tree sheds a
  scatter of leaves rather than a block, and the same leaves come back on
  recovery because `hardiness` is seeded.
- **open** - `bloomOrder < ceil(leafCount * (0.5 + 0.5 * frac))`. The rest are
  drawn as buds: earning XP visibly unfurls leaves without a level-up.
- **Blossom** (species `seasonal` from level 5, or `always`): every 9th visible
  leaf, up to `round(6 + 10 * growth)`. Drawn only when the palette has a
  blossom colour (spring and summer).
- **Fruit** (`level ≥ 8`): `fruitCount(level)` of them (§6), taken from the
  *highest* visible leaves (sort by `y` ascending, ties by `bloomOrder`, stride
  `floor(n / count)`), so fruit hangs in the canopy rather than at the trunk.
- **Perch** - the visible leaf nearest `(62, 40)`. Always computed; whether a
  bird or a dove sits on it is the animal pick (§9).
- **Bounds** - `minX/maxX/minY` over all branch ends and visible leaves, each
  leaf padded by 3 (a frond by `size * 2.8`); `maxY = 88 + 8` so the frame
  always includes a band of earth.

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

Visual mapping (renderers): `droopT` above, leaf `visible` above, plus canopy
saturation × `(0.6 + 0.4 * health)`. `health` never touches `xp` or `level`.

## 6. Traits

One table, three copies that must agree: `lib/levensboom/traits.ts`,
`lib/features/levensboom/domain/traits.dart`, and this document.

| id | from level | what it adds |
|---|---|---|
| `blossom` | 5 | blossoms in spring and summer (species `seasonal`) |
| `fruit` | 8 | the first vrucht van de Geest |
| `twin` | 16 | a second trunk |
| `seasons` | 25 | rare seasonal events (snow load, blossom storm) |

The bird and the fireflies that used to be traits are animals in the catalog
(§9) now. The old `canopy` trait is the `zaailing` → `jonge boom` stage.

`fruitCount(level) = clamp(floor((level - 8) / 2) + 1, 0, 9)` - one fruit at
level 8, then one every second level, ending at nine.

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
the parity fixtures - depend on the clock.

| Layer | When | How |
|---|---|---|
| Falling leaves | autumn, deciduous species | 3 of the 14 seeded drifters, tumbling down the viewport |
| Blossom storm | spring, `seasons` trait | all 14 drifters, tinted `blossom` |
| Snow load | winter, `seasons` trait | a white cap on the upward-facing side of every branch at `depth >= maxDepth - 2` |
| Column of light | during a level-up | 22 motes rising from the trunk base to the top of the canopy |
| Fruit bloom | a level-up that unlocked a fruit | the newest fruit swells on a slow sine under a radial `light` glow |

### 7.4 Framing

`scene`: the earth band is a fixed 12 % of the frame (never derived from the
tree's scale - for a kiem that swallowed the whole frame), the framed extent is
at least `MIN_SCENE_HEIGHT = 26` by `MIN_SCENE_WIDTH = 34` units so a small
tree stands small in a real landscape, and the trunk base sits 0.6 units
*below* the band's top edge, so the tree stands in the ground. `portrait`: the
tree's own bounds (without the ground pad, with any ground animal) centred with
10 % padding on a radial sky disc, standing on a soft shadow; no backdrop, no
motes. Fruit ornaments are capped at `MAX_FRUIT_SIZE = 1.6` so they never
inherit a frond's or a fig leaf's size.

Both renderers stop animating under reduced motion, when told `still`, and
(web) below 64 CSS px.

## 8. Parity fixtures

Given `seed = "65f0c1a2b3c4d5e6f7a8b9c0"`, `health = 1`, both sides assert the
same `branches.length`, `leaves.length`, open leaves, `blossoms.length`,
`fruits.length`, `maxDepth` and `traits` for every one of the thirteen species
at:

| level | frac |
|---|---|
| 1 | 0.0 |
| 3 | 0.5 |
| 6 | 0.4 |
| 10 | 0.9 |
| 18 | 0.25 |

plus the first eight values of `mulberry32(fnv1a32(seed))` to nine decimals -
that catches an RNG drift before the geometry has a chance to hide it. The
numbers live in the two test files; reprint them from TypeScript and paste
into Dart whenever the generator changes.

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

Where an animal sits: `vogel`, `duif`, `raaf` and `uil` take the perch (§4.6;
the owl's eyes are open only when the palette is night). `schaap`, `hert`,
`vos`, `ezel`, `ooievaar` and `leeuw` stand on the ground at the offsets the
`"<seed>:scene"` stream gives them, and the frame widens to hold them.
`vlinders` and `bijen` orbit the canopy, `vuurvliegjes` only at night, and
`adelaar` circles the top of the sky in the `scene` framing only.

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
stream per node, births, `ramp`, the taper) are in
`LEVENSBOOM_GROWTH_PLAN.md` §4-§5. Everything below is arithmetic, integer
steps, table literals and node draws, so it ports to Dart 1:1. Every number
named here lives in `growth.ts` unless it says otherwise.

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
| 8 | Depth 3 begins (8-10). First fruit on a twig of the youngest depth. |
| 9-10 | The crown forms: 12-18 branches, tufts of 5 leaves, inner foliage of 2 leaves on every forked node. |
| 11-13 | Depth 4 (11-13): a proper small crown, 20-40 branches. The last whorl falls at 11. |
| 14-19 | Depth 5 arrives over six steps (14-19), so every level-up adds twigs; the third (middle) children keep trickling in as their chance rises. The twin trunk sprouts at 16 and grows in over 17-19. |
| 20 | The finale: every tip gains a sixth leaf, the crown closes. 100-140 branches, 400-640 leaves. At least as full as today's level-20 tree. |
| 21-40 | Maturing: girth +1.5 % per step (to +30 % at 40); tips fork into fine two-armed twigs by chance (3 % of tips per step to 30 % at 30, 33 % at 40, 40 % at 60), each twig carrying one leaf fewer; bark knots from 22, moss from 26, root flare from 30 (paint). Height keeps creeping (asymptote `sizeMax`) so an old v1 tree never needs a floor. Never above 915 leaves / 288 branches at 40 on any of the 16 probe seeds. |

Width has its own curve (`WIDTH_V2`, about size^1.4): the scheut is slender
(trunk 1.05 at step 3, was 1.5), the young tree slim (2.5 at 10), and most of
the girth arrives after step 12 (5.1 at 20, 6.7 at 40 with maturing girth).

### 10.2 Storyboard: conical form (ceder, cipres)

| step | what the reader sees |
|---|---|
| 1 | A short stem with a whorl of five needle seed leaves fanned over ±70°. |
| 2-4 | A needle whorl of four per step stacks on the stem: a tiny fir. Seed leaves fade over 3.5-6, gone at 6. |
| 5 | The leader extends (segment 2) and the first side tier (two near-flat branches) leaves the stem at its foot. Whorls persist. |
| 6-12 | A segment plus a tier at 6, 8, 9, 11, 12: the spire rises one whorl at a time. Each tier forks 2 steps after it was born and again 2 steps later; tips carry 3-4 needles, forked tier nodes keep 3, so the shelves are dense. Whorls fall at 8, 9, 10. |
| 13-20 | Segments at 14, 15, 17, 18, 20. Tiers born after step 12 fork only once, so the top stays pointed while the base broadens: a cone with flat shelves (ceder, tiers at 75° off the leader) or a column (cipres, 30°). Step 20: 12 segments, 141-163 branches, 640-760 needles. |
| 21-40 | Segments at 24, 28, 34 (15 in all); girth; the spine's upper tiers keep forking. 181-201 branches, at most 915 needles. |

### 10.3 Storyboard: palm

| step | what the reader sees |
|---|---|
| 1 | Two strap leaves straight out of the ground; no trunk (the first segment is a 15 % stub). |
| 2-6 | One frond more per step (3 at 2 ... 7 at 6), the fan filling fixed slots (`PALM_FROND_FAN`). |
| 7 | The stub emerges into a first trunk segment (full at position 7); segment 2 appears. |
| 8-10, 12, 14, 16, 18 | A segment per listed step: the trunk rises. Fronds: 8 at 7, 12 at 11, 14 at 15, 16 at 19. Dates from 8 hang under the crown. |
| 16 | The twin palm sprouts beside the trunk and rises over 17-20. |
| 20 | Nine segments, 16 fronds (+ twin). |
| 25, 30, 35 | One frond more at each (19 at 35); girth. |

### 10.4 Species notes

- **wilg** weeps through `droopBase` as before: it shows from the first forks at 7 and is unmistakable from 13.
- **acacia** gets its flat crown from the wide spread and short children; it reads flat from 15 and fully at 18-20.
- **sycomoor** and **vijg** are low and wide with big leaves from step 2 (their whorls are already large blobs).
- **mosterd** and **amandel** (`blossom: 'always'`) flower on their seedling whorls from step 3; every other blossoming species flowers from level 5 on the shoot tips.
- Species values changed for v2 (`species.ts`, all commented in place): `thirdChildBias` acacia 0.25→0.06, mosterd 0.30→0.06, granaatappel 0.20→0.06, sycomoor 0.20→0.12, wilg 0.15→0.06, vijg 0.15→0.12, appel 0.12→0.06, olijf 0.10→0.06 (the leaf budget at step 40); mosterd `leafCountMul` 1.3→1.05; ceder `trunkLenMul` 1.15→0.5 and `leafSizeMul` 0.8→1.15; cipres `trunkLenMul` 1.3→0.42 and `leafSizeMul` 0.7→1.0 (the spine now supplies the height; needles were hairlines at the v2 camera scale).

### 10.5 Topology rules added by the design (portable, integers and draws only)

Names are the `FormTable` / `GEOMETRY` / `SEEDLING` fields.

- **Child delay.** `appear = max(parent.appear + childDelay, base + delay + floor(birthJitter · spread))`, `childDelay = 1`: a late limb grows out one depth per step instead of popping in whole.
- **Seedling whorls.** Whorl `j` (1-based, `seedlingPairs` of them, `pairLeaves` leaves each: 2 branching, 4 conical) is born at step `j + 1` and falls at `pairDeath − (seedlingPairs − j)` (branching: 7, 8, 9, 10, 11; conical: 8, 9, 10). Leaf `i` of a whorl sits at angle `heading + fan · pairAngle + (2·u − 1) · pairAngleJitter` with `fan = 2i/(n−1) − 1` (0 when n < 2), at `pairHeight` of the stem's length at its birth. Size and distance are multiplied by `ramp(e, born) · fade`, `fade = pairFadeMin + (1 − pairFadeMin) · clamp((death − e) / pairFadeSteps, 0, 1)` (0.45 over the last 2 positions). Seed leaves fade the same way with `cotyledonFadeSteps` 2.5 and `cotyledonFadeMin` 0.4 towards `cotyledonDeath`.
- **Leaves per tip.** `max(2, round(table[k] · (1 + (leafCountMul − 1) · leafMulWeight)) − (twig ? twigLeafDrop : 0)) + bonus`, `leafMulWeight = 0.5`. Branching table: 2 to step 4, 4.4 at 5, 4.6 at 6, 4.9 from 7, 5.85 at 20 (so 5 leaves through the young tree and 6 from step 20 for every broadleaf; vijg and sycomoor 4→5). Conical: 3 from 5 rising to 4 at 11, 4.4 at 20, times 1.25-1.3. Leaf `i` is born at the first step whose count exceeds `i`.
- **Inner foliage.** A forked node keeps its full tuft for `innerKeep` steps (3 branching, 2 conical), then its first `innerLeaves` leaves for good (2, at depths 2-4; conical 3, from depth 1), the rest fall. The trunk `T` never carries a tuft; a leader (conical spine, twin root) only while it is the top. Blossom never lands on a reduced (inner) leaf.
- **Maturing twigs (reserve draw 8).** A tip at the depth just past `birth`'s end (branching: depth 6; twin: `twinMaxDepth + 1`) forks from `twigFrom = 21` at the first step where `parent.d[8] < twigChance[k − 21]` (0.03 per step to 0.30 at 30, 0.33 at 40, 0.40 at 60). Twig forks have two children (no third), carry `twigLeafDrop = 1` leaf fewer, and never fork further.
- **Third children** keep the v1 chance shape (0.15 → 0.306 at step 20, flat after) plus the species bias; the conical table is 0 to step 10 and 0.1 at 20.
- **Conical spine and tiers.** `birth` is the leader schedule: segment `d` and the tier at its foot appear at `birth[d]` (1, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 24, 28, 34), no jitter. Segment length = parent segment × `leaderLen` (0.82) × lenJitter, width share `leaderWidth` 0.8, angle jitter share 0.35. A tier root leaves at `±spread · tierAngle` (2.5) with length `trunk.baseLen · childLenRatio · tierLen (1.1) · (1 − tierTaper (0.8) · min(1, segment / conicalDepth (12)))` and width share 0.5. Tier children (depth `t` inside the tier) are born at `tierBirth + tierFork[t − 1]` (2, 4) + `floor(jitter · tierForkSpread (2))`, fan `±spread · 0.55` with 0.6 of the slot jitter, length × 0.66, width × 0.66. A tier born at or before `tierDeepUntil` (12) forks twice, later tiers once.
- **Width and girth.** Trunk width `(0.8 + 6.2 · widthAt(e)) · trunkWidthMul · girthAt(e)`, `widthAt` interpolating `WIDTH_V2` (0, 0.016, 0.04, 0.065, 0.095, 0.125, 0.16, 0.195, 0.23, 0.27, 0.31, 0.35, 0.39, 0.43, 0.47, 0.515, 0.56, 0.605, 0.65, 0.7) with the same asymptotic tail as size; `girthAt(e) = 1 + 0.015 · clamp(e − 20, 0, 20)`.
- **Leaf size by depth.** A tuft's leaf size is multiplied by `max(0.9, 1.5 − 0.07 · depth)`: a sapling's shoots carry big leaves (1.43 at depth 1), the outer twigs of a crown small ones (1.15 at depth 5, 1.08 on twigs). Leaf scatter from the tip is × `leafScatter` (1 branching, 0.5 conical so needles bunch into tufts).
- **Blossom.** Candidates are visible leaves of kind `leaf` that are not inner-reduced, plus kind `seedling` when the species' blossom is `always`; ranked by (birth, hash) as before; the ornament size is `min(leaf.size, blossomMaxSize = 1.2)`.
- **Palm.** `palmSegments` 1, 7, 8, 9, 10, 12, 14, 16, 18; `palmFronds` 2, 3, ... 12 (steps 1-11), then 12, 13, 13, 14, 14, 15, 15, 16, 16; `palmEmergeSteps` 6; `leafBonusAt` 25, 30, 35.

### 10.6 Drawing primitives (both renderers; numbers in `lib/levensboom/paint.ts`)

- **Wood colour.** `woodColor(palette, wood) = mix(mix(leaf, bark, 0.35), bark, wood)`; bark at `wood >= 1`. A renderer buckets `wood` to tenths. The trunk turns from position 3 over 3 positions; any other branch from one position after its birth, over 3.
- **Seed leaf (kind `cotyledon`).** Drawn in the leaf's rotated frame with `s` the pixel size a species leaf would get: broad-leaved forms an ellipse at centre (0.55·s, 0), radii (0.62·s, 0.46·s); the conical form a needle at (0.75·s, 0), radii (0.85·s, 0.16·s). Colour: `base = mix(leaf or leafAlt (phase > 0.5), light, 0.14)`; from step 3 `age = clamp(0.3 + 0.25·(position − 3), 0, 0.8)` and `fill = mix(base, mix(mix(base, barkLit, 0.4), glow, 0.3), age)` - it yellows while the generator shrinks it.
- **Seedling whorl leaves (kind `seedling`)** are species leaves; the generator shrinks them before they fall (10.5). Renderer wish for CP5: fade their opacity with the same curve.
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
- `tweenEase(u) = smoothstep(u^0.75)`: 0.08 at a tenth, 0.30 at a quarter, 0.64 at half, 0.96 at 0.85 - a short wake-up, the growth through the middle, a long settle; the camera (measured on the in-between scene) eases with it.
- Newborn wood sprouts from `sproutDelay` 0.12 of the eased progress (`sprout(p) = smoothstep((p − 0.12) / 0.88)`), new leaves, blossom and fruit unfurl from `unfurlDelay` 0.4, leaving leaves are gone by `fallEnd` 0.55. So over a 1800 ms level-up: existing wood and the camera move from 0 ms, new twigs from ~250 ms, leaves open from ~600 ms, and everything settles over the last 500 ms. Filmstrip: `design/levensboom/sheets/tween-eik.png`.

### 10.7 Never-shrink calibration

`npm run tree:calibrate` with this table gives `LEGACY_EQUIV` floors for v1
levels 2-19 only (2→5.7, 5→10.1, 10→14.8, 15→17.9, 19→19.1); from level 20 on
the v2 tree at position L is at least as tall as the v1 tree was, so no
maturing account gets a floor.
