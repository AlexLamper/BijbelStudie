import Link from "next/link"
import { CTA_PRIMARY, CTA_QUIET, EYEBROW, TEAL_ON_DARK, TILE } from "../scene/tokens"

/**
 * What an account-bound page shows a visitor who has no account.
 *
 * The middleware used to bounce a guest from /dashboard, /notities, /profiel,
 * /instellingen, /groepen and /feedback straight back to "/" - which made every
 * one of those links in the rail a dead end for anyone trying the app before
 * signing up. Now the rail stays fully clickable and each of those routes
 * answers a guest with this card instead: one sentence on what the page does
 * once you are signed in, and the two ways to get there.
 *
 * Server-safe: no hooks, no state. The layout that renders it already knows
 * there is no session, and hands in the path to come back to as `next` - the
 * parameter app/inloggen and app/registreren read through lib/safeRedirect.
 *
 * Registreren is the primary action on purpose. A guest on this card has, by
 * definition, been using the product without an account; the thing they lack
 * is one, not a password they forgot.
 */
export default function GuestGate({
  title,
  description,
  next,
}: {
  /** The page's own name, as the rail shows it: "Notities", "Dashboard". */
  title: string
  /** One or two sentences on what this page does for a signed-in reader. */
  description: string
  /** The path to return to after signing in - normally the page itself. */
  next: string
}) {
  const target = encodeURIComponent(next)

  return (
    <section
      aria-labelledby="guest-gate-titel"
      className="flex min-h-[calc(100vh-3.5rem)] flex-col justify-center py-16"
    >
      <div className={`${TILE} mx-auto w-full max-w-[34rem] p-7 sm:p-9`}>
        <p className={EYEBROW} style={{ color: TEAL_ON_DARK }}>
          {title}
        </p>
        <h1
          id="guest-gate-titel"
          className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl"
        >
          Dit onderdeel werkt met een account
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-white/80">{description}</p>
        <p className="mt-2 text-[15px] leading-relaxed text-white/80">
          Een account is gratis en in een minuut gemaakt. Alles wat je daarna leest en
          studeert wordt bewaard.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href={`/registreren?next=${target}`} data-track="guest_gate_register" className={CTA_PRIMARY}>
            Gratis account maken
          </Link>
          <Link href={`/inloggen?next=${target}`} data-track="guest_gate_signin" className={CTA_QUIET}>
            Ik heb al een account
          </Link>
        </div>

        <p className="mt-6 text-[13px] leading-relaxed text-white/60">
          Zonder account kun je gewoon verder: de{" "}
          <Link href="/studies" className="font-semibold text-white/85 underline-offset-4 hover:underline">
            studies
          </Link>{" "}
          en de{" "}
          <Link href="/lezen" className="font-semibold text-white/85 underline-offset-4 hover:underline">
            Bijbel
          </Link>{" "}
          zijn voor iedereen open.
        </p>
      </div>
    </section>
  )
}
