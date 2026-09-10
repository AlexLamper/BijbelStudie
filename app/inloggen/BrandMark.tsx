import Image from "next/image"

/**
 * The brand mark as it is drawn on the night-coloured auth pages.
 *
 * The logo is a #262626 rounded tile with a light cross on it. On SCENE_BG the
 * tile is almost the same value as the page, so the tile reads as nothing and
 * only the cross appears to float - which is why the mark looked like a
 * white-only logo here. The fix is not a white asset: the full-colour mark
 * stays exactly as it is, and a soft light halo sits *behind* it to lift the
 * tile off the ground.
 *
 * Lifting the ground did not solve it and could not: SCENE_BG went from #081A1D
 * to #0C2429, which moved it from a hair darker than the tile to a hair
 * lighter - under 1.1:1 either way. The mark and the ground are near-identical
 * values in the same hue, so nothing but a layer between them separates the
 * two, whichever side of the tile the ground sits on.
 *
 * The halo is a plain radial gradient rather than a blurred box - it is already
 * soft, it costs no filter pass, and it fades to fully transparent before the
 * edge of its own box so there is no visible ring.
 *
 * Shared on purpose: /inloggen and /registreren must show the identical
 * treatment, so /registreren imports this rather than repeating it. The file is
 * colocated in a route folder, which App Router does not turn into a route.
 */

/**
 * Every colour on the auth pages is a literal - the reader's light/dark setting
 * must not repaint the night. This is one of those literals, not a theme token.
 */
const MARK_GLOW =
  "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.13) 42%, rgba(255,255,255,0.04) 66%, rgba(255,255,255,0) 78%)"

export function BrandMark() {
  return (
    <span className="relative inline-flex shrink-0">
      {/* Behind the mark, never over it: the halo is first in source order and
          the image is given `relative` so it stacks above without a z-index. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-[7px] rounded-full"
        style={{ background: MARK_GLOW }}
      />
      <Image
        src="/images/icon-192.png"
        alt="BijbelStudie"
        width={28}
        height={28}
        className="relative rounded-md"
        priority
      />
    </span>
  )
}
