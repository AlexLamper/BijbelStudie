"""Regenerate the site's favicon and PWA icons from the BijbelStudie mark.

The mark is the cross shipped as the iOS app icon in the bijbelstudie-app repo
(`bijbelstudie_mobile/assets/images/app_icon.png`). Its geometry is identical to
`public/images/logo.svg`, so that file is the source of truth here and the two
stay in step.

It is redrawn with PIL rather than rasterised with an SVG library, because
cairosvg needs a native libcairo that does not exist on this machine and the
mark is three primitives.

Run:  python tools/make_web_icons.py
"""

from __future__ import annotations

import pathlib

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parents[1]

# ── The mark, in logo.svg's 60-unit coordinate space ─────────────────────────
VIEWBOX = 60.0
SLATE = (0x26, 0x26, 0x26)
PAPER = (0xF9, 0xF9, 0xF9)

# Per-corner radii of the brand tile: top-left, top-right, bottom-right,
# bottom-left. The oversized bottom-right corner is deliberate — it is what
# makes the tile read as BijbelStudie's and not as a generic rounded square.
TILE_RADII = (10.0, 10.0, 20.0, 10.0)

# x, y, w, h, r
UPRIGHT = (26.0453, 6.69604, 7.90945, 47.7533, 1.0)
CROSSBAR = (15.4194, 16.4758, 29.0812, 7.84141, 1.0)

# Drawn at 8x then reduced, which is cheaper and sharper than anti-aliasing by
# hand and keeps 16px legible.
SUPERSAMPLE = 8

# Apple and Android both mask the icon they are handed. Baking our own corners
# in leaves dark wedges outside their mask, so those variants go edge to edge
# and the mark shrinks into the safe zone instead.
MASKABLE_SAFE = 0.62


def _tile_mask(canvas: int, radii: tuple[float, float, float, float]) -> Image.Image:
    """An alpha mask for the brand tile at `canvas` px, corners rounded per side."""
    mask = Image.new("L", (canvas, canvas), 255)
    draw = ImageDraw.Draw(mask)
    tl, tr, br, bl = (r * canvas / VIEWBOX for r in radii)
    hi = canvas - 1

    for r, (cx, cy), start in (
        (tl, (0, 0), 180),
        (tr, (hi, 0), 270),
        (br, (hi, hi), 0),
        (bl, (0, hi), 90),
    ):
        # Clear the corner's bounding square, then paint back the quarter disc.
        # The arc is centred r inside the corner, not on it.
        ax = cx + r if cx == 0 else cx - r
        ay = cy + r if cy == 0 else cy - r
        (x0, x1), (y0, y1) = sorted((cx, ax)), sorted((cy, ay))
        draw.rectangle([x0, y0, x1, y1], fill=0)
        draw.pieslice([ax - r, ay - r, ax + r, ay + r], start, start + 90, fill=255)

    return mask


def _draw_mark(canvas: int, scale: float = 1.0) -> Image.Image:
    """The cross on a slate ground, `canvas` px square, no corner rounding.

    `scale` shrinks the cross about the centre without moving the ground, which
    is how the maskable variants keep the mark inside the platform's safe zone.
    """
    img = Image.new("RGB", (canvas, canvas), SLATE)
    draw = ImageDraw.Draw(img)
    k = canvas / VIEWBOX
    mid = VIEWBOX / 2

    for x, y, w, h, r in (UPRIGHT, CROSSBAR):
        # Scale each rect about the viewbox centre.
        x0 = (mid + (x - mid) * scale) * k
        y0 = (mid + (y - mid) * scale) * k
        draw.rounded_rectangle(
            [x0, y0, x0 + w * scale * k, y0 + h * scale * k],
            radius=r * scale * k,
            fill=PAPER,
        )

    return img


def render(size: int, *, rounded: bool = True, scale: float = 1.0) -> Image.Image:
    canvas = size * SUPERSAMPLE
    mark = _draw_mark(canvas, scale)

    if not rounded:
        # RGB, no alpha: Apple rejects a touch icon that carries one.
        return mark.resize((size, size), Image.LANCZOS)

    out = mark.convert("RGBA")
    out.putalpha(_tile_mask(canvas, TILE_RADII))
    return out.resize((size, size), Image.LANCZOS)


def svg() -> str:
    """logo.svg's mark, re-emitted at the 512 viewbox `icon.svg` is served at."""
    k = 512 / VIEWBOX
    tl, tr, br, bl = TILE_RADII
    tl, tr, br, bl = tl * k, tr * k, br * k, bl * k
    w = 512.0

    path = (
        f"M0 {tl:.2f}C0 {tl * 0.4477:.2f} {tl * 0.4477:.2f} 0 {tl:.2f} 0"
        f"H{w - tr:.2f}C{w - tr * 0.4477:.2f} 0 {w:.0f} {tr * 0.4477:.2f} {w:.0f} {tr:.2f}"
        f"V{w - br:.2f}C{w:.0f} {w - br * 0.4477:.2f} {w - br * 0.4477:.2f} {w:.0f} {w - br:.2f} {w:.0f}"
        f"H{bl:.2f}C{bl * 0.4477:.2f} {w:.0f} 0 {w - bl * 0.4477:.2f} 0 {w - bl:.2f}"
        "V{:.2f}Z".format(tl)
    )

    rects = "\n".join(
        f'  <rect x="{x * k:.2f}" y="{y * k:.2f}" width="{rw * k:.2f}" '
        f'height="{rh * k:.2f}" rx="{r * k:.2f}" fill="#F9F9F9"/>'
        for x, y, rw, rh, r in (UPRIGHT, CROSSBAR)
    )

    return (
        '<svg width="512" height="512" viewBox="0 0 512 512" fill="none" '
        'xmlns="http://www.w3.org/2000/svg">\n'
        f'  <path d="{path}" fill="#262626"/>\n'
        f"{rects}\n"
        "</svg>\n"
    )


def main() -> None:
    images = ROOT / "public" / "images"
    images.mkdir(parents=True, exist_ok=True)

    # The .ico doubles as the in-app logo tile (<Image src="/images/favicon.ico">),
    # so it needs sizes well past the 48px a browser tab asks for.
    ico_sizes = [16, 32, 48, 64, 128, 256]
    frames = [render(s) for s in ico_sizes]
    ico = images / "favicon.ico"
    frames[-1].save(ico, format="ICO", sizes=[(s, s) for s in ico_sizes])
    # Next.js serves app/favicon.ico as the file-convention icon; keep it identical.
    (ROOT / "app" / "favicon.ico").write_bytes(ico.read_bytes())
    print(f"{'public/images/favicon.ico':38} {ico_sizes}")
    print(f"{'app/favicon.ico':38} (copy)")

    for name, size, kwargs in (
        ("apple-touch-icon.png", 180, {"rounded": False, "scale": MASKABLE_SAFE}),
        ("icon-192.png", 192, {}),
        ("icon-512.png", 512, {}),
        ("icon-maskable-512.png", 512, {"rounded": False, "scale": MASKABLE_SAFE}),
    ):
        render(size, **kwargs).save(images / name, "PNG", optimize=True)
        print(f"{'public/images/' + name:38} {size}x{size}")

    (ROOT / "public" / "icon.svg").write_text(svg(), encoding="utf-8")
    print(f"{'public/icon.svg':38} 512x512")


if __name__ == "__main__":
    main()
