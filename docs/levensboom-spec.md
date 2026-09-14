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
