import Image from "next/image"
import { cn } from "../../lib/utils"

/**
 * The brand tile with a dark-mode swap.
 *
 * The normal mark is a #262626 tile, which all but disappears on a dark
 * background. In dark mode this renders /images/logo-icon-dark.svg instead:
 * the same tile and cross with a thin white outline. Light mode keeps the
 * caller's own asset (icon-192.png, app-icon.png or logo.svg) untouched.
 *
 * Both images are in the markup and CSS picks one (`dark:` is the next-themes
 * class strategy), so there is no flash and no client JS. `className` goes on
 * both; tailwind-merge drops a caller's `block` from the dark copy so `hidden`
 * wins there.
 *
 * `priority` goes on the light copy only. The dark copy is always lazy: a
 * `display: none` lazy image is never fetched, so a light-mode visitor does not
 * download it, and two preloads for one tile would compete for the LCP slot.
 *
 * `alwaysDark` is for pages drawn on the night scene whatever the theme
 * (/inloggen, /registreren, the password pages): there the outlined tile is
 * the right one in both themes, so it renders alone.
 */
export const DARK_BRAND_ICON = "/images/logo-icon-dark.svg"

export function BrandIcon({
  src,
  size,
  alt = "",
  className,
  priority,
  alwaysDark = false,
}: {
  src: string
  size: number
  alt?: string
  className?: string
  priority?: boolean
  alwaysDark?: boolean
}) {
  if (alwaysDark) {
    return (
      <Image src={DARK_BRAND_ICON} alt={alt} width={size} height={size} className={className} priority={priority} />
    )
  }
  return (
    <>
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={cn(className, "dark:hidden")}
        priority={priority}
      />
      <Image
        src={DARK_BRAND_ICON}
        alt={alt}
        width={size}
        height={size}
        className={cn(className, "hidden dark:block")}
        loading="lazy"
      />
    </>
  )
}
