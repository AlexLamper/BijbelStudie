'use client'

import { useEffect } from "react"

/** Mirrors middleware.ts's GUEST_SEEN_LANDING_COOKIE - keep both in sync. */
const GUEST_SEEN_LANDING_COOKIE = "bs_seen_landing"
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

/**
 * Marks this visitor as having seen the landing page, once.
 *
 * The page itself is `force-static` (see app/page.tsx), so there is no
 * request-time signal to hang this on server-side - it has to be a client
 * write. A few seconds' dwell (rather than marking it on mount) means a
 * visitor who bounces in a tab they never look at hasn't "seen" anything yet,
 * while anyone who actually reads past the hero gets skipped straight into
 * the app on their next visit. Not httpOnly: middleware only needs to *read*
 * it, and it carries no sensitive data - worst case a tampered value skips a
 * marketing page, it never grants access to anything gated.
 */
export function LandingSeenMarker() {
  useEffect(() => {
    if (typeof document === "undefined") return
    if (document.cookie.split("; ").some((c) => c.startsWith(`${GUEST_SEEN_LANDING_COOKIE}=`))) {
      return
    }
    const timer = window.setTimeout(() => {
      const secure = window.location.protocol === "https:" ? "; Secure" : ""
      document.cookie = `${GUEST_SEEN_LANDING_COOKIE}=1; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`
    }, 4000)
    return () => window.clearTimeout(timer)
  }, [])

  return null
}

export default LandingSeenMarker
