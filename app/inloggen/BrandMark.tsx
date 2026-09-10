import Image from "next/image"

/**
 * The brand mark as it is drawn on the night-coloured auth pages.
 *
 * Shared on purpose: /inloggen and /registreren must show the identical
 * treatment, so /registreren imports this rather than repeating it. The file is
 * colocated in a route folder, which App Router does not turn into a route.
 *
 * There used to be a soft radial halo behind the tile to lift it off SCENE_BG
 * (the two are near-identical values in the same hue). It was removed at the
 * owner's request: the icon is a rounded square with one much rounder corner,
 * and a circular glow behind it read as a mismatch rather than a lift. The
 * green "Studie" in the wordmark beside it now does the separating.
 */
export function BrandMark() {
  return (
    <span className="relative inline-flex shrink-0">
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
