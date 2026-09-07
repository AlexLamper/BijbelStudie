# Levensboom — generation spec

The contract between `lib/levensboom/*.ts` (web) and
`lib/features/levensboom/domain/*.dart` (app). Both implementations must
produce the *same tree* for the same inputs; the parity fixtures in
`tests/levensboom.test.ts` and `test/levensboom_parity_test.dart` assert that.

Feature plan: `TREE_FEATURE_PLAN.md`. Nothing here is stored — the tree is a
pure function of values the server already has.

---

## 1. Inputs

| Name | Type | Source |
|---|---|---|
| `seed` | string | the user's Mongo id. Stable forever, per user. |
| `level` | int ≥ 1 | `levelForXp(xp)` from `lib/gamification.ts` |
| `frac` | 0..1 | `xpIntoLevel / xpForNextLevel` |
| `health` | 0.3..1 | §5, derived from `lastStreakDate` |
| `season` | `spring \| summer \| autumn \| winter` | device month |
| `timeOfDay` | `dawn \| day \| dusk \| night` | device clock |

`season` and `timeOfDay` affect **palette only** — never geometry. That keeps
the parity test independent of the clock.

## 2. Coordinate space

A 100×100 box, `y` downwards, `y = 0` at the top of the sky.

- ground line: `y = 88`
- trunk base: `(50, 88)`
- angles in **degrees**, `-90` = straight up, `+90` = straight down.

Renderers letterbox this box into their own viewport; nothing in the generator
knows about pixels.

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

## 4. Geometry

```
growth   = 1 - 1 / (1 + level / 8)          # 0..1, asymptotic — never "done"
maxDepth = min(7, 2 + round(5 * growth))
trunkLen = 15 + 25 * growth
trunkW   = 2.0 + 5.0 * growth
droopT   = (1 - health) * 0.25              # how far branch tips rotate to +90
MAX_BRANCHES = 900                          # hard stop, see below
```

`growth` is why the curve needs no cap: level 40 is visibly bigger than level
20 but the difference shrinks, so the tree stays on screen forever.

`MAX_BRANCHES` is checked at the **top of `recurse`, before any random draw**,
so it can never desync the two streams. Branch count is exponential in depth
and the level curve has no ceiling; without this a level-60 account hands a
low-end Android a five-figure scene graph to repaint every frame. Past that
point growth shows up as scale, traits and fruit rather than as more twigs.

### 4.1 Draw order (this *is* the RNG order)

1. `lean = (rand() * 2 - 1) * 6` — degrees, applied to the trunk only.
2. `recurse(50, 88, -90 + lean, trunkLen, trunkW, depth = 0)`.
3. If the `twin` trait is unlocked (level ≥ 16), a second, smaller trunk:
   `recurse(50 + side * 6, 88, -90 + lean + side * 14, trunkLen * 0.62,
   trunkW * 0.55, 1)` where `side = rand() < 0.5 ? -1 : 1` is drawn **after**
   the main tree finishes.
4. Fruit, blossom, bird and firefly placement (§4.3) — after all branches.

### 4.2 `recurse(x0, y0, angle, len, width, depth)`

```
if branchCount >= MAX_BRANCHES: return          # before any rand()

curve     = (rand() * 2 - 1) * 10
endAngle  = angle + curve
midAngle  = angle + curve * 0.5
cx, cy    = x0 + cos(midAngle) * len * 0.5,  y0 + sin(midAngle) * len * 0.5
x1, y1    = x0 + cos(endAngle) * len,        y0 + sin(endAngle) * len

emit Branch { x0, y0, cx, cy, x1, y1, w0: width, w1: width * 0.68, depth }

if depth >= maxDepth:
    emitLeaves(x1, y1, endAngle, depth)
    return

childCount = depth == 0 ? 2 : (rand() < 0.15 + 0.20 * growth ? 3 : 2)
spread     = 26 + rand() * 14

for i in 0 .. childCount - 1:
    t          = childCount == 1 ? 0 : (i / (childCount - 1)) * 2 - 1   # -1..1
    jitter     = (rand() * 2 - 1) * 8
    raw        = endAngle + t * spread + jitter
    droop      = droopT * ((depth + 1) / maxDepth)
    childAngle = raw + (90 - raw) * droop        # rotate toward straight down
    recurse(x1, y1, childAngle, len * 0.74, width * 0.68, depth + 1)

if depth == maxDepth - 1:
    emitLeaves(x1, y1, endAngle, depth)          # one rank in from the tips
```

The two-child default with an occasional third is what makes a level-12 tree
read as *fuller* rather than merely taller.

### 4.3 `emitLeaves(x, y, angle, depth)`

Only runs when the `canopy` trait is unlocked (level ≥ 3); below that the tree
is a sapling with a handful of leaves on the tips only (`count = 2`).

```
count = canopy ? round(2 + 3 * growth) : 2
for i in 0 .. count - 1:
    a  = angle + (rand() * 2 - 1) * 70
    d  = rand() * 3.2 * (0.5 + growth)
    emit Leaf {
      x: x + cos(a) * d,
      y: y + sin(a) * d,
      angle: a,
      size: 0.7 + rand() * 0.6,       # multiplied by (0.6 + 0.4 * growth) at render
      phase: rand(),                  # wind offset, 0..1
      hardiness: rand(),              # 0..1 — see below
      bloomOrder: <running index across the whole tree>,
      depth: <the depth of the branch it hangs from>
    }
```

Two derived flags, set on the leaf by the generator once the whole tree exists
(both inputs are already generator inputs, so keeping this out of the renderers
means the two platforms cannot disagree about it):

- **visible** — `hardiness <= 0.55 + 0.45 * health`. A wilting tree sheds a
  scatter of leaves rather than a block, and the same leaves come back on
  recovery because `hardiness` is seeded.
- **open** — `bloomOrder < ceil(leafCount * (0.5 + 0.5 * frac))`. The rest are
  drawn as buds. This is the in-level progress the XP bar also shows: earning
  XP visibly unfurls leaves without waiting for a level-up.

### 4.4 Ornaments

Placed by walking the leaf list with a fixed stride, so they always sit on real
branch tips and never move between renders.

- **Blossom** (`level ≥ 5`, spring/summer only): every 9th visible leaf, up to
  `round(6 + 10 * growth)`.
- **Fruit** (`level ≥ 8`): `fruitCount(level)` of them (§6), taken from the
  *highest* leaves (sort by `y` ascending, stride `floor(n / count)`), so fruit
  hangs in the canopy rather than at the trunk.
- **Bird** (`level ≥ 12`): on the leaf nearest to `(62, 40)`.
- **Fireflies** (`level ≥ 20`, night only): 12 motes, `rand()` position inside
  the canopy bounding box — drawn from the stream **after** everything else.

## 5. Health (server-derived)

```
daysSinceActive = floor((startOfToday - startOfDay(lastStreakDate)) / 1 day)
health = daysSinceActive <= 1 -> 1.0
         daysSinceActive == 2 -> 0.75
         3 <= d <= 4          -> 0.5
         d >= 5               -> 0.3
```

Never below `0.3`: no dead tree, no guilt. A user with no `lastStreakDate` at
all reads as `1.0` — a brand-new account starts healthy.

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
| `canopy` | 3 | real leaf clusters instead of tip leaves |
| `blossom` | 5 | blossoms in spring and summer |
| `fruit` | 8 | the first vrucht van de Geest |
| `bird` | 12 | a bird returns to the tree |
| `twin` | 16 | a second trunk |
| `fireflies` | 20 | fireflies at night |
| `seasons` | 25 | rare seasonal events (snow load, blossom storm) |

`fruitCount(level) = clamp(floor((level - 8) / 2) + 1, 0, 9)` — one fruit at
level 8, then one every second level, ending at nine.

The nine are Galatians 5:22–23 in order, and they are the app's language for a
milestone: **liefde, blijdschap, vrede, geduld, vriendelijkheid, goedheid,
geloof, zachtmoedigheid, zelfbeheersing**.

## 7. Palette

Pure function of `season`, `timeOfDay` and `health` — no RNG. Sky is a two-stop
vertical gradient; every other colour is a flat hex.

| timeOfDay | sky top | sky bottom | glow | light |
|---|---|---|---|---|
| dawn | `#2E3A59` | `#F7C6A0` | `#FFD9A0` | `#FFE8CC` |
| day | `#7EC8E3` | `#DFF3F7` | `#FFF4D6` | `#FFFFFF` |
| dusk | `#4B3B6B` | `#E9906B` | `#FFC38A` | `#FFD9B3` |
| night | `#0B1027` | `#232C4D` | `#3E4E80` | `#C9D6FF` |

| season | leaf | leafAlt | blossom | fruit | ground |
|---|---|---|---|---|---|
| spring | `#6FBF73` | `#8FD694` | `#F7B8CE` | `#E4572E` | `#4E7C43` |
| summer | `#3F8F4F` | `#57A862` | `#F2A2C0` | `#E0483B` | `#43703C` |
| autumn | `#C9772E` | `#E0A03C` | — | `#B8442B` | `#6B5A32` |
| winter | `#7D8B7A` | `#9AA79A` | — | `#A3452E` | `#5B6660` |

Bark is `#4A3A2E`, lit edge `#6B5442`; night desaturates everything by mixing
25 % toward `#1B2340`. Wilt mixes the leaf colours `(1 - health) * 0.4` toward
`#8A8F7A`.

The palette carries its own `season`, so a renderer can draw §7.1's seasonal
events without re-deriving the month.

### 7.1 Seasonal and celebration layers (renderer-only)

Deliberately **not** in the generator: they would make the geometry — and so
the parity fixtures — depend on the clock. Each is derived from data the
renderer already has, so both platforms stay in step without new scene fields.

| Layer | When | How |
|---|---|---|
| Falling leaves | autumn, any level | 3 of the 14 seeded drifters, tumbling down the viewport. "Occasional" is the point: a constant fall reads as the tree dying. |
| Blossom storm | spring, `seasons` trait | all 14 drifters, tinted `blossom` |
| Snow load | winter, `seasons` trait | a white cap on the upward-facing side of every branch at `depth >= maxDepth - 2` |
| Column of light | during a level-up | 22 motes rising from the trunk base to the top of the canopy |
| Fruit bloom | a level-up that unlocked a fruit | the newest fruit (`fruitCount(level) - 1`) swells on a slow sine under a radial `light` glow |

Drifters come from the `"<seed>:decor"` stream, which is separate from the
tree's own — adding one can never shift a branch.

## 8. Parity fixtures

Given `seed = "65f0c1a2b3c4d5e6f7a8b9c0"`, `health = 1`, both sides assert the
same `branches.length`, `leaves.length`, `fruits.length` and `traits` for:

| level | frac |
|---|---|
| 1 | 0.0 |
| 4 | 0.5 |
| 7 | 0.4 |
| 12 | 0.9 |
| 20 | 0.25 |

plus the first eight values of `mulberry32(fnv1a32(seed))` to nine decimals —
that catches an RNG drift before the geometry has a chance to hide it.
